import { randomBytes } from "node:crypto";
import { getLessonLedgerAiProvider, setLessonLedgerAiProviderForTest, type LessonLedgerStudyReportAiDraft } from "./ai-provider";
import { lessonLedgerRepository } from "./repository";
import type {
  AttendanceStatus,
  BookingStatus,
  LessonLedgerAction,
  LessonLedgerAttendanceRecord,
  LessonLedgerBooking,
  LessonLedgerFeedbackAttachment,
  LessonLedgerFeedbackDraft,
  LessonLedgerFamilyInvite,
  LessonLedgerFeatureRequest,
  LessonLedgerFinanceEvent,
  LessonLedgerLesson,
  LessonLedgerMessageThread,
  ParentIssueType,
  LessonLedgerScore,
  LessonLedgerSnapshot,
  LessonLedgerStudent,
  LessonLedgerStudyReport,
  LessonLedgerWeakness,
  LessonStatus
} from "./types";

export { setLessonLedgerAiProviderForTest };

function toMinutes(time: string) {
  const match = time.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    throw new LessonLedgerServiceError("TIME_FORMAT_INVALID", "时间格式不正确，请使用 HH:mm", 400);
  }

  const [, rawHours, rawMinutes] = match;
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  return hours * 60 + minutes;
}

function isOverlapping(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}

function bookingLessonConflictNote(lesson: LessonLedgerLesson) {
  return `与 ${lesson.start}-${lesson.end} ${lesson.student}冲突`;
}

function bookingRequestConflictNote(booking: LessonLedgerBooking) {
  return `与预约 ${booking.start}-${booking.end} ${booking.student}冲突`;
}

function bookingMatchesLesson(booking: LessonLedgerBooking, lesson: LessonLedgerLesson) {
  return (
    booking.status === "已通过" &&
    booking.date === lesson.date &&
    booking.start === lesson.start &&
    booking.end === lesson.end &&
    booking.student === lesson.student
  );
}

function findLessonConflict(snapshot: LessonLedgerSnapshot, date: string, start: string, end: string, booking?: LessonLedgerBooking) {
  return snapshot.lessons.find((lesson) => {
    const isCreatedFromBooking =
      booking?.status === "已通过" && lesson.date === booking.date && lesson.start === booking.start && lesson.student === booking.student;
    return !isCreatedFromBooking && lesson.date === date && isOverlapping(start, end, lesson.start, lesson.end);
  });
}

function findBookingRequestConflict(snapshot: LessonLedgerSnapshot, date: string, start: string, end: string, currentBookingId?: string, sourceLesson?: LessonLedgerLesson) {
  return snapshot.bookings.find(
    (booking) =>
      booking.id !== currentBookingId &&
      booking.status !== "已拒绝" &&
      (!sourceLesson || !bookingMatchesLesson(booking, sourceLesson)) &&
      booking.date === date &&
      isOverlapping(start, end, booking.start, booking.end)
  );
}

function assertValidTimeRange(start: string, end: string, code: string, message: string) {
  if (toMinutes(start) >= toMinutes(end)) {
    throw new LessonLedgerServiceError(code, message, 400);
  }
}

function formatLessonCount(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function parseFinanceDelta(action: LessonLedgerFinanceEvent["action"], amount: string) {
  const match = amount.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*(?:课时|次)?$/);
  if (!match) {
    throw new LessonLedgerServiceError("FINANCE_INVALID_AMOUNT", "课时变化格式不正确，请填写例如 +10 课时 或 -1 课时", 400);
  }

  const explicitValue = Number(match[1]);
  if (!Number.isFinite(explicitValue)) {
    throw new LessonLedgerServiceError("FINANCE_INVALID_AMOUNT", "课时变化格式不正确，请填写例如 +10 课时 或 -1 课时", 400);
  }

  if (amount.trim().startsWith("+") || amount.trim().startsWith("-")) {
    return explicitValue;
  }

  return action === "扣课" ? -Math.abs(explicitValue) : Math.abs(explicitValue);
}

function assertFinanceDeltaMatchesAction(action: LessonLedgerFinanceEvent["action"], delta: number) {
  const absoluteDelta = Math.abs(delta);
  if (absoluteDelta < 0.1 || absoluteDelta > 999 || !Number.isFinite(absoluteDelta)) {
    throw new LessonLedgerServiceError("FINANCE_INVALID_AMOUNT", "请输入有效课时", 400);
  }

  const hasMoreThanOneDecimal = !Number.isInteger(absoluteDelta * 10);
  if (hasMoreThanOneDecimal) {
    throw new LessonLedgerServiceError("FINANCE_INVALID_AMOUNT", "课时数最多支持一位小数", 400);
  }

  if (action === "扣课" && delta >= 0) {
    throw new LessonLedgerServiceError("FINANCE_INVALID_AMOUNT", "扣课流水必须减少课时", 400);
  }

  if ((action === "充值" || action === "撤销") && delta <= 0) {
    throw new LessonLedgerServiceError("FINANCE_INVALID_AMOUNT", `${action}流水必须增加课时`, 400);
  }
}

function formatFinanceAmount(delta: number) {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatLessonCount(delta)} 课时`;
}

function parseCashAmount(action: LessonLedgerFinanceEvent["action"], cashAmount?: string) {
  const rawAmount = cashAmount?.trim() ?? "";
  if (!rawAmount) {
    if (action === "充值") {
      throw new LessonLedgerServiceError("FINANCE_CASH_AMOUNT_REQUIRED", "请填写本次收款金额", 400);
    }

    return 0;
  }

  const normalizedAmount = rawAmount.replace(/[￥¥,\s]/g, "");
  const match = normalizedAmount.match(/^([+-]?\d+(?:\.\d{1,2})?)$/);
  if (!match) {
    throw new LessonLedgerServiceError("FINANCE_CASH_AMOUNT_INVALID", "收款金额格式不正确，请填写例如 ¥3200", 400);
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value) || Math.abs(value) > 999999) {
    throw new LessonLedgerServiceError("FINANCE_CASH_AMOUNT_INVALID", "请输入有效收款金额", 400);
  }

  if (action === "充值" && value <= 0) {
    throw new LessonLedgerServiceError("FINANCE_CASH_AMOUNT_INVALID", "充值流水收款金额必须大于 0", 400);
  }

  return value;
}

function formatCashAmount(value: number) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
  const amountText = Number.isInteger(absoluteValue) ? absoluteValue.toLocaleString("zh-CN") : absoluteValue.toLocaleString("zh-CN", { maximumFractionDigits: 2 });

  return `${sign}¥${amountText}`;
}

function assertKnownLesson(snapshot: LessonLedgerSnapshot, lessonId: string) {
  const lesson = snapshot.lessons.find((item) => item.id === lessonId);
  if (!lesson) {
    throw new LessonLedgerServiceError("LESSON_NOT_FOUND", "课程不存在", 404);
  }

  return lesson;
}

function assertKnownStudent(snapshot: LessonLedgerSnapshot, studentId: string) {
  const student = snapshot.students.find((item) => item.id === studentId);
  if (!student) {
    throw new LessonLedgerServiceError("STUDENT_NOT_FOUND", "学生不存在", 404);
  }

  return student;
}

function assertKnownStudentByName(snapshot: LessonLedgerSnapshot, studentName: string) {
  const student = snapshot.students.find((item) => item.name === studentName);
  if (!student) {
    throw new LessonLedgerServiceError("STUDENT_NOT_FOUND", "学生不存在", 404);
  }

  return student;
}

function assertTextRange(value: string, code: string, emptyMessage: string, min: number, max: number, rangeMessage: string) {
  const text = value.trim();
  if (!text) {
    throw new LessonLedgerServiceError(code, emptyMessage, 400);
  }

  if (text.length < min || text.length > max) {
    throw new LessonLedgerServiceError(code, rangeMessage, 400);
  }

  return text;
}

function assertOptionalTextMax(value: string, code: string, max: number, rangeMessage: string) {
  const text = value.trim();
  if (text.length > max) {
    throw new LessonLedgerServiceError(code, rangeMessage, 400);
  }

  return text;
}

const unsafeFeedbackWords = ["保证提分", "完全不会", "基础很差", "不认真", "严重"];

function assertSafeFeedbackText(text: string) {
  const unsafeWord = unsafeFeedbackWords.find((word) => text.includes(word));
  if (unsafeWord) {
    throw new LessonLedgerServiceError("FEEDBACK_UNSAFE_WORDING", `反馈中有不适合发给家长的表达：${unsafeWord}，请修改`, 400);
  }
}

const attendanceStatuses: AttendanceStatus[] = ["出勤", "迟到", "请假", "缺席"];

function assertAttendanceStatus(status: AttendanceStatus) {
  if (!attendanceStatuses.includes(status)) {
    throw new LessonLedgerServiceError("ATTENDANCE_STATUS_INVALID", "请选择考勤状态", 400);
  }
}

function formatNumberText(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function normalizeScoreText(score: string) {
  const text = score.trim();
  const match = text.match(/^(\d+(?:\.\d+)?)\s*[\/／]\s*(\d+(?:\.\d+)?)$/);
  if (!match) {
    throw new LessonLedgerServiceError("SCORE_FORMAT_INVALID", "请填写有效总分", 400);
  }

  const earnedScore = Number(match[1]);
  const totalScore = Number(match[2]);
  if (!Number.isFinite(earnedScore) || !Number.isFinite(totalScore) || totalScore <= 0 || totalScore > 999) {
    throw new LessonLedgerServiceError("SCORE_TOTAL_INVALID", "请填写有效总分", 400);
  }

  if (earnedScore < 0 || earnedScore > 999 || earnedScore > totalScore) {
    throw new LessonLedgerServiceError("SCORE_EXCEEDS_TOTAL", "得分不能大于总分", 400);
  }

  return `${formatNumberText(earnedScore)} / ${formatNumberText(totalScore)}`;
}

function normalizeRankText(rank: string) {
  const text = rank.trim();
  if (!text) {
    return "未记录";
  }

  const match = text.match(/^(\d+)(?:\s*[\/／]\s*(\d+))?$/);
  if (!match) {
    throw new LessonLedgerServiceError("SCORE_RANK_INVALID", "排名必须为正整数", 400);
  }

  const rankValue = Number(match[1]);
  const totalValue = match[2] ? Number(match[2]) : undefined;
  if (rankValue <= 0 || rankValue > 9999 || (totalValue !== undefined && (totalValue <= 0 || totalValue > 9999))) {
    throw new LessonLedgerServiceError("SCORE_RANK_INVALID", "排名必须为正整数", 400);
  }

  return totalValue ? `${rankValue} / ${totalValue}` : String(rankValue);
}

function nowTimeLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai"
  }).format(new Date());
}

function todayMonthDayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai"
  })
    .format(new Date())
    .replace("/", "-");
}

export class LessonLedgerServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

export function getLessonLedgerSnapshot() {
  return lessonLedgerRepository.getSnapshot();
}

export function resetLessonLedgerDemo() {
  return lessonLedgerRepository.reset();
}

export function runLessonLedgerAction(input: LessonLedgerAction) {
  switch (input.action) {
    case "createStudent":
      return createStudent(input.payload);
    case "createLesson":
      return createLesson(input.payload);
    case "updateLesson":
      return updateLesson(input.payload);
    case "markLessonStatus":
      return markLessonStatus(input.payload.lessonId, input.payload.status);
    case "saveAttendance":
      return saveAttendance(input.payload.lessonId, input.payload.attendance);
    case "generateFeedback":
      return generateFeedback(input.payload);
    case "saveFeedbackDraft":
      return saveFeedbackDraft(input.payload.lessonId, input.payload.feedbackText, input.payload.attachmentNames);
    case "publishFeedback":
      return publishFeedback(input.payload.lessonId, input.payload.feedbackText);
    case "createFamilyInvite":
      return createFamilyInvite(input.payload.studentId);
    case "activateFamilyInvite":
      return activateFamilyInvite(input.payload.inviteId, input.payload.parentName, input.payload.parentPhone);
    case "generateStudyReport":
      return generateStudyReport(input.payload.studentId, input.payload.teacherNotes);
    case "saveStudyReport":
      return saveStudyReport(input.payload.reportId, input.payload.parentSummary);
    case "createOpenSlots":
      return createOpenSlots(input.payload);
    case "addScore":
      return addScore(input.payload);
    case "updateScore":
      return updateScore(input.payload);
    case "addWeakness":
      return addWeakness(input.payload);
    case "updateWeakness":
      return updateWeakness(input.payload);
    case "addFinanceEvent":
      return addFinanceEvent(input.payload);
    case "moveLesson":
      return moveLesson(input.payload);
    case "checkUpdate":
      return checkUpdate(input.payload.authCode);
    case "applyUpdate":
      return applyUpdate(input.payload.authCode);
    case "submitFeatureRequest":
      return submitFeatureRequest(input.payload);
    case "saveStudioProfile":
      return saveStudioProfile(input.payload);
    case "createBooking":
      return createBooking(input.payload);
    case "updateBooking":
      return updateBooking(input.payload.bookingId, {
        status: input.payload.status,
        start: input.payload.start,
        end: input.payload.end
      });
    case "createMessageThread":
      return createMessageThread(input.payload);
    case "replyMessageThread":
      return replyMessageThread(input.payload.threadId, input.payload.body);
    default:
      return assertNever(input);
  }
}

export async function runLessonLedgerActionAsync(input: LessonLedgerAction) {
  switch (input.action) {
    case "generateFeedback":
      return generateFeedbackAsync(input.payload);
    case "generateStudyReport":
      return generateStudyReportAsync(input.payload.studentId, input.payload.teacherNotes);
    default:
      return runLessonLedgerAction(input);
  }
}

function createStudent(payload: Extract<LessonLedgerAction, { action: "createStudent" }>["payload"]) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const name = payload.name.trim();
    const parent = payload.parent.trim();
    const grade = payload.grade.trim() || "未填写年级";
    const focus = payload.focus.trim() || "待补充学习重点";

    if (!name) {
      throw new LessonLedgerServiceError("STUDENT_NAME_REQUIRED", "请填写学生姓名", 400);
    }

    if (!parent) {
      throw new LessonLedgerServiceError("STUDENT_PARENT_REQUIRED", "请填写家长称呼", 400);
    }

    const duplicate = snapshot.students.find((student) => student.name === name && student.parent === parent);
    if (duplicate) {
      throw new LessonLedgerServiceError("STUDENT_DUPLICATE", "该学生和家长已经存在，请勿重复建档", 409);
    }

    const remainingLessons = Number.isFinite(payload.remainingLessons) ? Math.max(payload.remainingLessons ?? 0, 0) : 0;
    const student: LessonLedgerStudent = {
      id: `s-${Date.now()}`,
      name,
      grade,
      parent,
      teacherId: snapshot.teacher.id,
      remainingLessons,
      latestScore: payload.latestScore?.trim() || "暂无成绩",
      focus
    };
    const initialFinanceEvent: LessonLedgerFinanceEvent | null =
      remainingLessons > 0
        ? {
            date: todayMonthDayLabel(),
            studentId: student.id,
            studentName: student.name,
            action: "充值",
            amount: formatFinanceAmount(remainingLessons),
            cashAmount: "¥0",
            balance: `${formatLessonCount(remainingLessons)} 课时`,
            note: "新增学生建档初始课时"
          }
        : null;

    return {
      ...snapshot,
      students: [student, ...snapshot.students],
      financeEvents: initialFinanceEvent ? [initialFinanceEvent, ...snapshot.financeEvents] : snapshot.financeEvents
    };
  });
}

function normalizeLessonPayload(lesson: LessonLedgerLesson): LessonLedgerLesson {
  if (!lesson.student.trim()) {
    throw new LessonLedgerServiceError("LESSON_STUDENT_REQUIRED", "请填写上课学生或班级", 400);
  }

  if (!lesson.subject.trim()) {
    throw new LessonLedgerServiceError("LESSON_SUBJECT_REQUIRED", "请填写课程科目", 400);
  }

  assertValidTimeRange(lesson.start, lesson.end, "LESSON_INVALID_TIME", "开始时间必须早于结束时间");

  return {
    ...lesson,
    id: lesson.id || `l-${Date.now()}`,
    date: lesson.date.trim(),
    day: lesson.day.trim(),
    start: lesson.start.trim(),
    end: lesson.end.trim(),
    student: lesson.student.trim(),
    subject: lesson.subject.trim(),
    price: Number.isFinite(lesson.price) ? lesson.price : 0,
    balanceChange: Number.isFinite(lesson.balanceChange) ? lesson.balanceChange : -1,
    feedbackStatus: lesson.status === "已上课" || lesson.status === "已点名" ? "待反馈" : lesson.feedbackStatus
  };
}

function assertNoLessonConflict(snapshot: LessonLedgerSnapshot, lesson: LessonLedgerLesson, currentLessonId?: string) {
  const conflict = snapshot.lessons.find(
    (item) => item.id !== currentLessonId && item.date === lesson.date && isOverlapping(lesson.start, lesson.end, item.start, item.end)
  );
  if (conflict) {
    throw new LessonLedgerServiceError("LESSON_TIME_CONFLICT", `目标时段与 ${conflict.start}-${conflict.end} ${conflict.student} 冲突`, 409);
  }
}

function createLesson(payload: LessonLedgerLesson) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const lesson = normalizeLessonPayload(payload);
    assertNoLessonConflict(snapshot, lesson);

    return {
      ...snapshot,
      lessons: [...snapshot.lessons, lesson]
    };
  });
}

function updateLesson(payload: LessonLedgerLesson) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    assertKnownLesson(snapshot, payload.id);
    const lesson = normalizeLessonPayload(payload);
    assertNoLessonConflict(snapshot, lesson, lesson.id);

    return {
      ...snapshot,
      lessons: snapshot.lessons.map((item) => (item.id === lesson.id ? lesson : item)),
      feedbackDrafts: lesson.feedbackStatus === "未生成" ? snapshot.feedbackDrafts.filter((draft) => draft.lessonId !== lesson.id) : snapshot.feedbackDrafts
    };
  });
}

function hasFinanceEvent(snapshot: LessonLedgerSnapshot, event: LessonLedgerFinanceEvent) {
  return snapshot.financeEvents.some(
    (item) => item.date === event.date && item.studentId === event.studentId && item.action === event.action && item.note === event.note
  );
}

function createLessonFinanceEvent(
  lesson: LessonLedgerLesson,
  student: { id: string; name: string; remainingLessons: number } | undefined,
  note: string,
  nextBalance?: number
): LessonLedgerFinanceEvent {
  return {
    date: lesson.date,
    studentId: student?.id ?? lesson.id,
    studentName: student?.name ?? lesson.student,
    action: "扣课",
    amount: `${lesson.balanceChange} 课时`,
    balance: typeof nextBalance === "number" ? `${nextBalance} 课时` : "待核对",
    note
  };
}

function markLessonStatus(lessonId: string, status: LessonStatus) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const lesson = assertKnownLesson(snapshot, lessonId);
    const student = snapshot.students.find((item) => item.name === lesson.student);
    const shouldCharge = status === "已上课" && lesson.status !== "已上课" && lesson.status !== "已反馈";
    const nextBalance = student ? student.remainingLessons + lesson.balanceChange : undefined;
    if (shouldCharge && student && typeof nextBalance === "number" && nextBalance < 0) {
      throw new LessonLedgerServiceError("LESSON_BALANCE_INSUFFICIENT", "学生课时余额不足，请先充值或确认欠费", 409);
    }

    const financeEvent = createLessonFinanceEvent(lesson, student, `${lesson.subject} ${lesson.start}-${lesson.end} 上课确认扣课`, nextBalance);
    const shouldWriteFinanceEvent = shouldCharge && !hasFinanceEvent(snapshot, financeEvent);
    const shouldClearFeedback = status === "学生缺席" || status === "已取消" || status === "待上课";

    return {
      ...snapshot,
      students:
        shouldWriteFinanceEvent && student
          ? snapshot.students.map((item) => (item.id === student.id ? { ...item, remainingLessons: nextBalance ?? item.remainingLessons } : item))
          : snapshot.students,
      financeEvents: shouldWriteFinanceEvent ? [financeEvent, ...snapshot.financeEvents] : snapshot.financeEvents,
      lessons: snapshot.lessons.map((lesson) =>
        lesson.id === lessonId
          ? {
              ...lesson,
              status,
              feedbackStatus: status === "已上课" ? "待反馈" : shouldClearFeedback ? "未生成" : lesson.feedbackStatus
            }
          : lesson
      ),
      feedbackDrafts: shouldClearFeedback ? snapshot.feedbackDrafts.filter((draft) => draft.lessonId !== lessonId) : snapshot.feedbackDrafts
    };
  });
}

function saveAttendance(lessonId: string, attendance: Record<string, AttendanceStatus>) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const lesson = assertKnownLesson(snapshot, lessonId);
    if (lesson.kind !== "班课") {
      throw new LessonLedgerServiceError("ATTENDANCE_REQUIRES_CLASS_LESSON", "只有班课可以保存点名", 409);
    }

    const classItem = snapshot.classes.find((item) => item.name === lesson.student);
    if (!classItem) {
      throw new LessonLedgerServiceError("ATTENDANCE_CLASS_FORBIDDEN", "你无权点名该班级", 403);
    }

    if (!classItem.members.length) {
      throw new LessonLedgerServiceError("ATTENDANCE_EMPTY_CLASS", "班级暂无学生，请先添加学生", 409);
    }

    const shouldChargeAttendance = lesson.status !== "已点名" && lesson.status !== "已反馈";
    const chargedMemberBalances = new Map<string, number>();
    const financeEventsToAdd: LessonLedgerFinanceEvent[] = [];
    const savedAt = new Date().toISOString();
    const attendanceRecordsToSave: LessonLedgerAttendanceRecord[] = [];
    const classes = snapshot.classes.map((classItem) =>
      classItem.name === lesson.student
        ? {
            ...classItem,
            members: classItem.members.map((member) => {
              const lastStatus = attendance[member.name] ?? member.lastStatus;
              assertAttendanceStatus(lastStatus);
              const shouldChargeMember = shouldChargeAttendance && (lastStatus === "出勤" || lastStatus === "迟到");
              const deductLesson = lastStatus === "出勤" || lastStatus === "迟到";
              const nextBalance = shouldChargeMember ? Math.max(member.remainingLessons + lesson.balanceChange, 0) : member.remainingLessons;
              const financeEvent = createLessonFinanceEvent(
                lesson,
                { id: member.studentId, name: member.name, remainingLessons: member.remainingLessons },
                `${lesson.subject} ${lesson.start}-${lesson.end} 班课点名扣课`,
                nextBalance
              );
              const shouldWriteFinanceEvent = shouldChargeMember && !hasFinanceEvent(snapshot, financeEvent);

              if (shouldWriteFinanceEvent) {
                financeEventsToAdd.push(financeEvent);
                chargedMemberBalances.set(member.studentId, nextBalance);
              }

              attendanceRecordsToSave.push({
                id: `ar-${lesson.id}-${member.studentId}`,
                lessonId: lesson.id,
                className: lesson.student,
                studentId: member.studentId,
                studentName: member.name,
                status: lastStatus,
                deductLesson,
                savedAt
              });

              return {
                ...member,
                remainingLessons: shouldWriteFinanceEvent ? nextBalance : member.remainingLessons,
                lastStatus
              };
            })
          }
        : classItem
    );

    return {
      ...snapshot,
      classes,
      students: snapshot.students.map((student) =>
        chargedMemberBalances.has(student.id) ? { ...student, remainingLessons: chargedMemberBalances.get(student.id) ?? student.remainingLessons } : student
      ),
      attendanceRecords: [
        ...attendanceRecordsToSave,
        ...snapshot.attendanceRecords.filter((record) => record.lessonId !== lesson.id)
      ],
      financeEvents: [...financeEventsToAdd, ...snapshot.financeEvents],
      lessons: snapshot.lessons.map((item) =>
        item.id === lessonId
          ? {
              ...item,
              status: "已点名",
              feedbackStatus: "待反馈"
            }
          : item
      )
    };
  });
}

function createFeedbackAttachments(attachmentNames: string[]): LessonLedgerFeedbackAttachment[] {
  return attachmentNames
    .map((rawName) => rawName.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((name) => {
      const lowerName = name.toLowerCase();
      const kind: LessonLedgerFeedbackAttachment["kind"] = lowerName.endsWith(".pdf") ? "PDF" : lowerName.match(/\.(png|jpg|jpeg|webp)$/) ? "图片" : "文档";
      const recognized = lowerName.match(/\.(png|jpg|jpeg|webp|pdf)$/);
      const isEntranceQuiz = name.includes("入门") || name.includes("小测") || lowerName.includes("quiz");

      return {
        name,
        kind,
        status: recognized ? "已分析" : "未识别",
        analysis: recognized
          ? isEntranceQuiz
            ? "入门测已作为课前基础、答题痕迹和错题分布的补充依据，后续反馈会结合课堂记录一起判断。"
            : "附件内容已作为课堂表现补充依据，主要用于核对学生答题痕迹和课后巩固方向。"
          : "附件暂未识别，将基于课堂文字记录生成反馈。"
      };
    });
}

function inferFeedbackFollowUpFocus(content: string, state: string) {
  const text = `${content} ${state}`;
  if (text.includes("计算")) {
    return "计算过程准确率和关键步骤书写";
  }
  if (text.includes("审题") || text.includes("读题")) {
    return "读题审题、条件提取和题意转化";
  }
  if (text.includes("分类") || text.includes("讨论")) {
    return "分类讨论的完整性和边界条件";
  }
  if (text.includes("应用") || text.includes("综合")) {
    return "综合题中的方法选择和迁移能力";
  }

  return "本节课相关方法的独立迁移和表达完整度";
}

function buildFeedbackGeneration(snapshot: LessonLedgerSnapshot, payload: Extract<LessonLedgerAction, { action: "generateFeedback" }>["payload"]) {
  const lesson = assertKnownLesson(snapshot, payload.lessonId);
  const content = assertTextRange(payload.content, "FEEDBACK_CONTENT_INVALID", "请填写本次上课内容", 10, 1000, "本次上课内容需为 10-1000 字");
  const state = assertTextRange(payload.state, "FEEDBACK_STATE_INVALID", "请填写学生上课状态", 5, 800, "学生上课状态需为 5-800 字");
  const homework = assertOptionalTextMax(payload.homework, "FEEDBACK_HOMEWORK_INVALID", 500, "课后作业不能超过 500 字");
  const attachments = createFeedbackAttachments(payload.attachmentNames ?? []);
  const attachmentSection = attachments.length
    ? `\n\n另外，本次也结合了上传的课前小测或附件情况：${attachments.map((attachment) => `${attachment.name}：${attachment.analysis}`).join("；")}后续会继续关注这些细节。`
    : "";
  const greeting = lesson.kind === "班课" ? "各位家长您好" : `${lesson.student}家长您好`;
  const learner = lesson.kind === "班课" ? "孩子们" : lesson.student;
  const followUpFocus = inferFeedbackFollowUpFocus(content, state);
  const stateSentence = /[。！？.!?]$/.test(state) ? state : `${state}。`;
  const homeworkSentence = homework
    ? `课后我给孩子布置了${homework}，用于巩固本节课相关内容。`
    : `课后建议围绕“${content}”做少量针对性巩固，重点看能否独立复现课堂方法。`;
  const fallbackText = `${greeting}，今天这节课主要围绕“${content}”展开，重点梳理了相关概念、常见题型和解题思路。\n\n课堂状态方面，${learner}${stateSentence}我会结合本节课的表现，继续关注${followUpFocus}。${attachmentSection}\n\n${homeworkSentence}下次课我会根据本次反馈继续安排对应练习，帮助孩子把课堂方法真正落实到独立解题中。`;
  assertSafeFeedbackText(fallbackText);

  return {
    lesson,
    content,
    state,
    homework,
    attachments,
    fallbackText
  };
}

function normalizeGeneratedFeedbackText(generatedText: string | null | undefined, fallbackText: string) {
  const body = generatedText?.trim();
  if (!body || body.length < 20 || body.length > 1000) {
    return fallbackText;
  }

  try {
    assertSafeFeedbackText(body);
    return body;
  } catch {
    return fallbackText;
  }
}

function applyGeneratedFeedback(
  snapshot: LessonLedgerSnapshot,
  payload: Extract<LessonLedgerAction, { action: "generateFeedback" }>["payload"],
  generatedText?: string | null
) {
  const generation = buildFeedbackGeneration(snapshot, payload);
  const body = normalizeGeneratedFeedbackText(generatedText, generation.fallbackText);
  const draft: LessonLedgerFeedbackDraft = {
    id: `fd-${Date.now()}`,
    lessonId: generation.lesson.id,
    student: generation.lesson.student,
    body,
    status: "待反馈",
    attachments: generation.attachments,
    createdAt: new Date().toISOString()
  };

  return {
    ...snapshot,
    feedbackDrafts: [draft, ...snapshot.feedbackDrafts.filter((item) => item.lessonId !== generation.lesson.id)],
    lessons: snapshot.lessons.map((item) =>
      item.id === generation.lesson.id
        ? {
            ...item,
            status: item.status === "待上课" ? "已上课" : item.status,
            feedbackStatus: "待反馈" as const
          }
        : item
    )
  };
}

function generateFeedback(payload: Extract<LessonLedgerAction, { action: "generateFeedback" }>["payload"]) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => applyGeneratedFeedback(snapshot, payload));
}

async function generateFeedbackAsync(payload: Extract<LessonLedgerAction, { action: "generateFeedback" }>["payload"]) {
  const initialSnapshot = lessonLedgerRepository.getSnapshot();
  const generation = buildFeedbackGeneration(initialSnapshot, payload);
  const provider = getLessonLedgerAiProvider();
  const generatedText = provider
    ? await provider.generateFeedback({
        lesson: generation.lesson,
        content: generation.content,
        state: generation.state,
        homework: generation.homework,
        attachments: generation.attachments,
        fallbackText: generation.fallbackText
      })
    : null;

  return lessonLedgerRepository.updateSnapshot((snapshot) => applyGeneratedFeedback(snapshot, payload, generatedText));
}

function saveFeedbackDraft(lessonId: string, feedbackText: string, attachmentNames: string[] = []) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const lesson = assertKnownLesson(snapshot, lessonId);
    const body = assertTextRange(feedbackText, "FEEDBACK_TEXT_INVALID", "反馈内容不能为空", 20, 1000, "反馈内容需为 20-1000 字");
    assertSafeFeedbackText(body);
    const existingDraft = snapshot.feedbackDrafts.find((item) => item.lessonId === lessonId);
    const attachments = attachmentNames.length ? createFeedbackAttachments(attachmentNames) : existingDraft?.attachments ?? [];
    const draft: LessonLedgerFeedbackDraft = {
      id: existingDraft?.id ?? `fd-${Date.now()}`,
      lessonId,
      student: lesson.student,
      body,
      status: "待反馈",
      attachments,
      createdAt: existingDraft?.createdAt ?? new Date().toISOString()
    };

    return {
      ...snapshot,
      feedbackDrafts: [draft, ...snapshot.feedbackDrafts.filter((item) => item.lessonId !== lessonId)],
      lessons: snapshot.lessons.map((item) =>
        item.id === lessonId
          ? {
              ...item,
              status: item.status === "待上课" ? "已上课" : item.status,
              feedbackStatus: "待反馈"
            }
          : item
      )
    };
  });
}

function publishFeedback(lessonId: string, feedbackText: string) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const lesson = assertKnownLesson(snapshot, lessonId);
    const body = assertTextRange(feedbackText, "FEEDBACK_TEXT_INVALID", "反馈内容不能为空", 20, 1000, "反馈内容需为 20-1000 字");
    assertSafeFeedbackText(body);
    const existingDraft = snapshot.feedbackDrafts.find((item) => item.lessonId === lessonId);
    const draft: LessonLedgerFeedbackDraft = {
      id: `fd-${Date.now()}`,
      lessonId,
      student: lesson.student,
      body,
      status: "已发送",
      attachments: existingDraft?.attachments ?? [],
      createdAt: new Date().toISOString()
    };

    return {
      ...snapshot,
      feedbackDrafts: [draft, ...snapshot.feedbackDrafts.filter((item) => item.lessonId !== lessonId)],
      lessons: snapshot.lessons.map((item) =>
        item.id === lessonId
          ? {
              ...item,
              status: "已反馈",
              feedbackStatus: "已发送"
            }
          : item
      )
    };
  });
}

function createFamilyInvite(studentId: string) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const student = assertKnownStudent(snapshot, studentId);
    const inviteId = `fi-${student.id}`;
    const token = randomBytes(32).toString("hex");
    const createdAt = new Date();
    const invite: LessonLedgerFamilyInvite = {
      id: inviteId,
      token,
      studentId: student.id,
      studentName: student.name,
      parentName: student.parent,
      status: "待激活",
      inviteLink: `/portal/invite?token=${token}`,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000).toISOString()
    };

    return {
      ...snapshot,
      familyInvites: [invite, ...snapshot.familyInvites.filter((item) => item.studentId !== student.id)]
    };
  });
}

function activateFamilyInvite(inviteId: string, parentName: string, parentPhone: string) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const invite = snapshot.familyInvites.find((item) => item.id === inviteId || item.token === inviteId);
    if (!invite) {
      throw new LessonLedgerServiceError("INVITE_NOT_FOUND", "邀请链接不存在或已失效", 404);
    }

    const nextParentName = parentName.trim();
    const nextParentPhone = parentPhone.trim();
    if (!nextParentName) {
      throw new LessonLedgerServiceError("INVITE_PARENT_NAME_REQUIRED", "请填写家长姓名", 400);
    }

    if (!/^1\d{10}$/.test(nextParentPhone)) {
      throw new LessonLedgerServiceError("INVITE_PARENT_PHONE_INVALID", "请输入正确手机号", 400);
    }

    if (invite.status === "已激活") {
      throw new LessonLedgerServiceError("INVITE_ALREADY_ACTIVATED", "该邀请已激活，请直接登录家长端", 409);
    }

    if (invite.status === "待激活" && new Date(invite.expiresAt).getTime() < Date.now()) {
      return {
        ...snapshot,
        familyInvites: snapshot.familyInvites.map((item) => (item.id === invite.id ? { ...item, status: "已过期" } : item))
      };
    }

    if (invite.status === "已过期" || invite.status === "已失效") {
      throw new LessonLedgerServiceError("INVITE_UNAVAILABLE", "邀请链接已不可用，请联系老师重新生成", 410);
    }

    return {
      ...snapshot,
      familyInvites: snapshot.familyInvites.map((item) =>
        item.id === invite.id
          ? {
              ...item,
              parentName: nextParentName,
              parentPhone: nextParentPhone,
              status: "已激活",
              activatedAt: new Date().toISOString()
            }
          : item
      )
    };
  });
}

function buildStudyReport(snapshot: LessonLedgerSnapshot, studentId: string, teacherNotes?: string): LessonLedgerStudyReport {
  const student = assertKnownStudent(snapshot, studentId);
  const studentScores = snapshot.scores.filter((score) => (score.studentId ? score.studentId === student.id : student.id === "s1")).slice(0, 3);
  const studentWeaknesses = snapshot.weaknesses.filter((weakness) => (weakness.studentId ? weakness.studentId === student.id : student.id === "s1")).slice(0, 4);
  const studentLessons = snapshot.lessons.filter((lesson) => lesson.student === student.name).slice(0, 5);
  const feedbackHighlights = snapshot.feedbackDrafts
    .filter((draft) => draft.student === student.name)
    .slice(0, 3)
    .map((draft) => `${draft.student} 近期反馈：${draft.body.replace(/[#*\n]/g, " ").slice(0, 72)}...`);
  const sourceCount = [studentScores.length, studentWeaknesses.length, studentLessons.length || feedbackHighlights.length].filter((count) => count > 0).length;
  const hasEnoughData = sourceCount >= 2;
  const sourceLabels = [
    studentScores.length ? "最近三次考试" : null,
    studentWeaknesses.length ? "当前薄弱点" : null,
    studentLessons.length ? "最近五次课程" : null,
    feedbackHighlights.length ? "课后反馈" : null,
    teacherNotes?.trim() ? "老师补充要求" : null
  ].filter((label): label is string => Boolean(label));
  const weaknessTags = studentWeaknesses.map((weakness) => weakness.tag);
  const weaknessActions = studentWeaknesses.map((weakness) => weakness.action).filter(Boolean);
  const latestScore = studentScores[0];
  const feedbackOrLessonHighlights =
    feedbackHighlights.length > 0
      ? feedbackHighlights
      : studentLessons.length > 0
        ? studentLessons.map((lesson) => `${lesson.date} ${lesson.subject}：${lesson.status}，课时变化 ${lesson.balanceChange}，反馈状态 ${lesson.feedbackStatus}`)
        : [`暂无已发布课后反馈，报告先基于${student.name}的学生档案生成。`];
  const suggestions = [
    ...weaknessActions.slice(0, 2),
    latestScore
      ? `下一次检测后继续补充成绩与排名，观察${student.focus}是否稳定。`
      : `建议先补充${student.name}最近一次测验成绩，便于后续观察阶段波动。`,
    feedbackHighlights.length
      ? "后续课后反馈继续保持同一口径，便于家长端追踪变化。"
      : "建议下次课后生成并保存反馈，让学习报告有更具体的课堂依据。"
  ].slice(0, 3);
  const teacherNoteText = teacherNotes?.trim();
  const now = new Date().toISOString();

  return {
    id: `r-${student.id}-${Date.now()}`,
    studentId: student.id,
    title: `${student.name} 6 月阶段学习报告`,
    status: "待生成",
    period: "2026-06-10 至 2026-06-20",
    summary: `${student.name}近期围绕${student.focus}持续学习。${
      latestScore ? `最近一次记录为 ${latestScore.exam} ${latestScore.score}，排名 ${latestScore.rank}。` : "当前成绩记录较少。"
    }${weaknessTags.length ? `当前重点关注 ${weaknessTags.join("、")}。` : "暂未记录明确薄弱点。"}`,
    sources: sourceLabels.length ? sourceLabels : ["学生基础档案"],
    scoreTrend: studentScores.map((score) => ({
      exam: score.exam,
      date: score.date,
      score: score.score,
      rank: score.rank,
      note: score.note
    })),
    weaknessSummary: studentWeaknesses.map((weakness) => ({
      tag: weakness.tag,
      level: weakness.level,
      action: weakness.action
    })),
    feedbackHighlights: feedbackOrLessonHighlights,
    sections: [
      {
        title: "反馈内容综合",
        body:
          feedbackHighlights.length > 0
            ? `已纳入 ${feedbackHighlights.length} 条课后反馈，主要围绕${student.focus}和近期课堂表现整理。`
            : `当前已记录 ${studentLessons.length} 节相关课程，后续建议继续补充课后反馈，让报告依据更完整。`
      },
      {
        title: "成绩波动情况",
        body:
          studentScores.length > 0
            ? `最近 ${studentScores.length} 次成绩记录显示，最新一次为 ${latestScore?.exam ?? "最近考试"} ${latestScore?.score ?? ""}，排名 ${latestScore?.rank ?? "未记录"}。`
            : "当前成绩记录较少，本报告以课程反馈和薄弱点记录为主要依据。"
      },
      {
        title: "当前薄弱点",
        body:
          studentWeaknesses.length > 0
            ? `薄弱点主要集中在${studentWeaknesses.map((weakness) => weakness.tag).join("、")}，需要用小题限时训练和错因复盘稳定下来。`
            : "暂未记录明确薄弱点，建议老师继续补充课堂观察和练习结果。"
      },
      ...(teacherNoteText
        ? [
            {
              title: "老师补充要求",
              body: `本次生成时老师补充：${teacherNoteText.slice(0, 160)}`
            }
          ]
        : [])
    ],
    suggestions,
    dataQuality: hasEnoughData ? "数据充足" : "数据较少，仅供参考",
    visibleToParent: false,
    createdAt: now
  };
}

function safeAiText(value: string | undefined, max: number) {
  const text = value?.trim();
  if (!text || text.length > max) {
    return null;
  }

  try {
    assertSafeFeedbackText(text);
    return text;
  } catch {
    return null;
  }
}

function mergeStudyReportAiDraft(report: LessonLedgerStudyReport, draft: LessonLedgerStudyReportAiDraft | null | undefined): LessonLedgerStudyReport {
  if (!draft) {
    return report;
  }

  const summary = safeAiText(draft.summary, 500) ?? report.summary;
  const parentSummary = safeAiText(draft.parentSummary, 500) ?? report.parentSummary;
  const sections =
    draft.sections
      ?.map((section) => ({
        title: safeAiText(section.title, 40),
        body: safeAiText(section.body, 800)
      }))
      .filter((section): section is { title: string; body: string } => Boolean(section.title && section.body))
      .slice(0, 6) ?? [];
  const suggestions = draft.suggestions?.map((suggestion) => safeAiText(suggestion, 220)).filter((suggestion): suggestion is string => Boolean(suggestion)).slice(0, 5) ?? [];

  return {
    ...report,
    summary,
    parentSummary,
    sections: sections.length ? sections : report.sections,
    suggestions: suggestions.length ? suggestions : report.suggestions
  };
}

function buildStudyReportAiInput(snapshot: LessonLedgerSnapshot, report: LessonLedgerStudyReport, teacherNotes = "") {
  const student = assertKnownStudent(snapshot, report.studentId);
  const scores = snapshot.scores.filter((score) => (score.studentId ? score.studentId === student.id : student.id === "s1")).slice(0, 3);
  const weaknesses = snapshot.weaknesses.filter((weakness) => (weakness.studentId ? weakness.studentId === student.id : student.id === "s1")).slice(0, 4);
  const lessons = snapshot.lessons.filter((lesson) => lesson.student === student.name).slice(0, 5);
  const feedbackHighlights = snapshot.feedbackDrafts
    .filter((draft) => draft.student === student.name)
    .slice(0, 3)
    .map((draft) => `${draft.student} 近期反馈：${draft.body.replace(/[#*\n]/g, " ").slice(0, 72)}...`);

  return {
    student,
    scores,
    weaknesses,
    lessons,
    feedbackHighlights,
    teacherNotes: teacherNotes.trim(),
    fallbackReport: report
  };
}

function generateStudyReport(studentId: string, teacherNotes?: string) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const report = buildStudyReport(snapshot, studentId, teacherNotes);

    return {
      ...snapshot,
      reports: [report, ...snapshot.reports.filter((item) => !(item.studentId === report.studentId && item.status === "待生成"))]
    };
  });
}

async function generateStudyReportAsync(studentId: string, teacherNotes?: string) {
  const initialSnapshot = lessonLedgerRepository.getSnapshot();
  const fallbackReport = buildStudyReport(initialSnapshot, studentId, teacherNotes);
  const provider = getLessonLedgerAiProvider();
  const aiDraft = provider ? await provider.generateStudyReport(buildStudyReportAiInput(initialSnapshot, fallbackReport, teacherNotes)) : null;
  const report = mergeStudyReportAiDraft(fallbackReport, aiDraft);

  return lessonLedgerRepository.updateSnapshot((snapshot) => ({
    ...snapshot,
    reports: [report, ...snapshot.reports.filter((item) => !(item.studentId === report.studentId && item.status === "待生成"))]
  }));
}

function saveStudyReport(reportId: string, parentSummary = "") {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const report = snapshot.reports.find((item) => item.id === reportId);
    if (!report) {
      throw new LessonLedgerServiceError("REPORT_NOT_FOUND", "学习报告不存在，请重新生成", 404);
    }

    assertKnownStudent(snapshot, report.studentId);
    const nextParentSummary = assertOptionalTextMax(parentSummary, "REPORT_PARENT_SUMMARY_TOO_LONG", 500, "家长可见摘要不能超过 500 字");
    if (nextParentSummary) {
      assertSafeFeedbackText(nextParentSummary);
    }
    const now = new Date().toISOString();

    return {
      ...snapshot,
      reports: snapshot.reports.map((item) =>
        item.id === reportId
          ? {
              ...item,
              status: "已保存",
              visibleToParent: true,
              parentSummary: nextParentSummary || undefined,
              savedAt: now
            }
          : item
      )
    };
  });
}

function createOpenSlots(payload: Extract<LessonLedgerAction, { action: "createOpenSlots" }>["payload"]) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    if (payload.dates.length === 0) {
      throw new LessonLedgerServiceError("OPEN_SLOT_REQUIRES_DATE", "请选择可预约日期", 400);
    }

    assertValidTimeRange(payload.start, payload.end, "OPEN_SLOT_INVALID_TIME", "开始时间必须早于结束时间");

    const existingKeys = new Set(snapshot.openSlots.map((slot) => `${slot.date}-${slot.start}-${slot.end}`));
    const nextSlots = payload.dates
      .map((item) => ({
        date: item.date,
        day: item.day,
        start: payload.start,
        end: payload.end
      }))
      .filter((slot) => {
        const key = `${slot.date}-${slot.start}-${slot.end}`;
        if (existingKeys.has(key)) {
          return false;
        }
        existingKeys.add(key);
        return true;
      });

    return {
      ...snapshot,
      openSlots: [...snapshot.openSlots, ...nextSlots]
    };
  });
}

function upsertScore(payload: LessonLedgerScore, previous?: { exam: string; date: string }) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const student = assertKnownStudent(snapshot, payload.studentId || "s1");
    const exam = assertTextRange(payload.exam, "SCORE_REQUIRES_EXAM", "请填写考试名称", 2, 50, "考试名称需为 2-50 字");
    const score = normalizeScoreText(payload.score);
    const date = payload.date.trim();
    if (!date) {
      throw new LessonLedgerServiceError("SCORE_REQUIRES_DATE", "请选择考试日期", 400);
    }

    if (!/^(\d{2}-\d{2}|\d{4}-\d{2}-\d{2})$/.test(date)) {
      throw new LessonLedgerServiceError("SCORE_DATE_INVALID", "请选择考试日期", 400);
    }

    const rank = normalizeRankText(payload.rank);
    const note = payload.note.trim();
    if (note.length > 300) {
      throw new LessonLedgerServiceError("SCORE_NOTE_TOO_LONG", "备注不能超过 300 字", 400);
    }

    const nextScore: LessonLedgerScore = {
      ...payload,
      studentId: student.id,
      studentName: student.name,
      exam,
      date,
      score,
      rank,
      note
    };

    return {
      ...snapshot,
      students: snapshot.students.map((item) => (item.id === student.id ? { ...item, latestScore: nextScore.score } : item)),
      scores: [
        nextScore,
        ...snapshot.scores.filter((item) => {
          const sameNewKey = item.studentId === nextScore.studentId && item.exam === nextScore.exam && item.date === nextScore.date;
          const samePreviousKey =
            previous && item.studentId === nextScore.studentId && item.exam === previous.exam && item.date === previous.date;

          return !sameNewKey && !samePreviousKey;
        })
      ]
    };
  });
}

function addScore(payload: LessonLedgerScore) {
  return upsertScore(payload);
}

function updateScore(payload: Extract<LessonLedgerAction, { action: "updateScore" }>["payload"]) {
  const previousExam = assertTextRange(payload.previousExam, "SCORE_PREVIOUS_EXAM_REQUIRED", "原考试名称缺失，请重新打开编辑", 2, 50, "原考试名称缺失，请重新打开编辑");
  const previousDate = payload.previousDate.trim();
  if (!previousDate) {
    throw new LessonLedgerServiceError("SCORE_PREVIOUS_DATE_REQUIRED", "原考试日期缺失，请重新打开编辑", 400);
  }

  return upsertScore(payload.score, { exam: previousExam, date: previousDate });
}

function upsertWeakness(payload: LessonLedgerWeakness, previousTag?: string) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const student = assertKnownStudent(snapshot, payload.studentId || "s1");
    const tag = assertTextRange(payload.tag, "WEAKNESS_REQUIRES_TAG", "请填写薄弱点", 2, 50, "薄弱点名称需为 2-50 字");
    const allowedLevels: LessonLedgerWeakness["level"][] = ["高频", "重点", "中频"];
    if (!allowedLevels.includes(payload.level)) {
      throw new LessonLedgerServiceError("WEAKNESS_LEVEL_INVALID", "请选择严重程度", 400);
    }

    const source = payload.source.trim() || "课堂记录";
    const action = payload.action.trim();
    if (source.length > 50) {
      throw new LessonLedgerServiceError("WEAKNESS_SOURCE_TOO_LONG", "来源不能超过 50 字", 400);
    }

    if (!action) {
      throw new LessonLedgerServiceError("WEAKNESS_ACTION_REQUIRED", "请填写加强动作", 400);
    }

    if (action.length > 300) {
      throw new LessonLedgerServiceError("WEAKNESS_ACTION_TOO_LONG", "备注不能超过 300 字", 400);
    }

    const nextWeakness: LessonLedgerWeakness = {
      ...payload,
      studentId: student.id,
      studentName: student.name,
      tag,
      source,
      action
    };

    return {
      ...snapshot,
      weaknesses: [
        nextWeakness,
        ...snapshot.weaknesses.filter((item) => {
          const sameNewKey = item.studentId === nextWeakness.studentId && item.tag === nextWeakness.tag;
          const samePreviousKey = previousTag && item.studentId === nextWeakness.studentId && item.tag === previousTag;

          return !sameNewKey && !samePreviousKey;
        })
      ]
    };
  });
}

function addWeakness(payload: LessonLedgerWeakness) {
  return upsertWeakness(payload);
}

function updateWeakness(payload: Extract<LessonLedgerAction, { action: "updateWeakness" }>["payload"]) {
  const previousTag = assertTextRange(payload.previousTag, "WEAKNESS_PREVIOUS_TAG_REQUIRED", "原薄弱点缺失，请重新打开编辑", 2, 50, "原薄弱点缺失，请重新打开编辑");

  return upsertWeakness(payload.weakness, previousTag);
}

function addFinanceEvent(payload: LessonLedgerFinanceEvent) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const date = payload.date.trim();
    if (!date || !/^(\d{2}-\d{2}|\d{4}-\d{2}-\d{2})$/.test(date)) {
      throw new LessonLedgerServiceError("FINANCE_DATE_INVALID", "请选择流水日期", 400);
    }

    const student = assertKnownStudent(snapshot, payload.studentId || "s1");
    const delta = parseFinanceDelta(payload.action, payload.amount);
    assertFinanceDeltaMatchesAction(payload.action, delta);
    const cashDelta = parseCashAmount(payload.action, payload.cashAmount);
    const rawNextBalance = student.remainingLessons + delta;
    if (rawNextBalance < 0) {
      throw new LessonLedgerServiceError("FINANCE_INSUFFICIENT_BALANCE", "课时不足，请充值或确认欠费", 409);
    }

    const note = payload.note.trim();
    if (note.length > 300) {
      throw new LessonLedgerServiceError("FINANCE_NOTE_TOO_LONG", "备注不能超过 300 字", 400);
    }

    const nextBalance = Math.max(student.remainingLessons + delta, 0);
    const nextEvent: LessonLedgerFinanceEvent = {
      ...payload,
      date,
      studentId: student.id,
      studentName: student.name,
      amount: formatFinanceAmount(delta),
      cashAmount: payload.cashAmount?.trim() ? formatCashAmount(cashDelta) : undefined,
      balance: `${formatLessonCount(nextBalance)} 课时`,
      note
    };

    return {
      ...snapshot,
      students: snapshot.students.map((item) => (item.id === student.id ? { ...item, remainingLessons: nextBalance } : item)),
      financeEvents: [nextEvent, ...snapshot.financeEvents]
    };
  });
}

function moveLesson(payload: Extract<LessonLedgerAction, { action: "moveLesson" }>["payload"]) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const lesson = assertKnownLesson(snapshot, payload.lessonId);
    const date = payload.date.trim();
    const day = payload.day.trim();
    const start = payload.start.trim();
    const end = payload.end.trim();

    assertValidTimeRange(start, end, "LESSON_MOVE_INVALID_TIME", "开始时间必须早于结束时间");

    const conflict = snapshot.lessons.find(
      (item) => item.id !== payload.lessonId && item.date === date && isOverlapping(start, end, item.start, item.end)
    );
    if (conflict) {
      throw new LessonLedgerServiceError("LESSON_MOVE_CONFLICT", `目标时段与 ${conflict.start}-${conflict.end} ${conflict.student} 冲突`, 409);
    }

    const bookingConflict = findBookingRequestConflict(snapshot, date, start, end, undefined, lesson);
    if (bookingConflict) {
      throw new LessonLedgerServiceError("LESSON_MOVE_BOOKING_CONFLICT", `目标时段${bookingRequestConflictNote(bookingConflict)}，请先处理预约申请`, 409);
    }

    return {
      ...snapshot,
      lessons: snapshot.lessons.map((item) =>
        item.id === payload.lessonId
          ? {
              ...item,
              date,
              day,
              start,
              end,
              status: payload.resetStatus ? "待上课" : lesson.status,
              feedbackStatus: payload.resetStatus ? "未生成" : lesson.feedbackStatus
            }
          : item
      ),
      openSlots: snapshot.openSlots.filter((slot) => !(slot.date === date && slot.start === start && slot.end === end)),
      feedbackDrafts: payload.resetStatus ? snapshot.feedbackDrafts.filter((draft) => draft.lessonId !== payload.lessonId) : snapshot.feedbackDrafts,
      attendanceRecords: payload.resetStatus ? snapshot.attendanceRecords.filter((record) => record.lessonId !== payload.lessonId) : snapshot.attendanceRecords
    };
  });
}

function assertValidAuthCode(snapshot: LessonLedgerSnapshot, authCode: string) {
  const normalizedAuthCode = authCode.trim();

  if (!/^[A-Za-z0-9-]{8,64}$/.test(normalizedAuthCode)) {
    throw new LessonLedgerServiceError("AUTH_CODE_INVALID_FORMAT", "授权码格式不正确", 400);
  }

  if (normalizedAuthCode !== snapshot.teacher.authCode) {
    throw new LessonLedgerServiceError("AUTH_CODE_INVALID", "授权码无效，请检查后重试", 403);
  }
}

function checkUpdate(authCode: string) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    assertValidAuthCode(snapshot, authCode);

    const hasUpdate = snapshot.teacher.version !== snapshot.updateState.latestVersion;

    return {
      ...snapshot,
      teacher: {
        ...snapshot.teacher,
        authorizationStatus: "已授权"
      },
      updateState: {
        ...snapshot.updateState,
        status: hasUpdate ? "可更新" : "已是最新",
        checkedAt: nowTimeLabel()
      }
    };
  });
}

function applyUpdate(authCode: string) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    assertValidAuthCode(snapshot, authCode);

    return {
      ...snapshot,
      teacher: {
        ...snapshot.teacher,
        authorizationStatus: "已授权",
        version: snapshot.updateState.latestVersion
      },
      updateState: {
        ...snapshot.updateState,
        status: "已更新",
        checkedAt: snapshot.updateState.checkedAt ?? nowTimeLabel(),
        updatedAt: nowTimeLabel()
      }
    };
  });
}

function submitFeatureRequest(payload: Extract<LessonLedgerAction, { action: "submitFeatureRequest" }>["payload"]) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const title = assertTextRange(payload.title, "FEATURE_REQUEST_TITLE_REQUIRED", "请填写功能需求标题", 2, 60, "功能需求标题需为 2-60 字");
    const body = assertTextRange(payload.body, "FEATURE_REQUEST_BODY_REQUIRED", "请填写功能需求说明", 5, 500, "功能需求说明需为 5-500 字");

    const request: LessonLedgerFeatureRequest = {
      id: `fr-${Date.now()}`,
      title,
      body,
      status: "已提交",
      requester: snapshot.teacher.name,
      createdAt: new Date().toISOString()
    };

    return {
      ...snapshot,
      featureRequests: [request, ...snapshot.featureRequests]
    };
  });
}

function saveStudioProfile(payload: Extract<LessonLedgerAction, { action: "saveStudioProfile" }>["payload"]) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    if (!payload.studioName.trim()) {
      throw new LessonLedgerServiceError("STUDIO_NAME_REQUIRED", "请填写工作室名称", 400);
    }

    if (!payload.subject.trim()) {
      throw new LessonLedgerServiceError("STUDIO_SUBJECT_REQUIRED", "请填写任教学科", 400);
    }

    return {
      ...snapshot,
      teacher: {
        ...snapshot.teacher,
        studioName: payload.studioName.trim(),
        subject: payload.subject.trim(),
        city: payload.city.trim(),
        teacherIntro: payload.teacherIntro.trim(),
        parentDisplayNote: payload.parentDisplayNote.trim()
      }
    };
  });
}

function createBooking(payload: Extract<LessonLedgerAction, { action: "createBooking" }>["payload"]) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const studentName = payload.student.trim();
    const start = payload.start.trim();
    const end = payload.end.trim();

    if (!studentName) {
      throw new LessonLedgerServiceError("BOOKING_STUDENT_REQUIRED", "请填写预约学生", 400);
    }

    assertValidTimeRange(start, end, "BOOKING_INVALID_TIME", "开始时间必须早于结束时间");

    const duplicateBooking = snapshot.bookings.find(
      (booking) =>
        booking.status !== "已拒绝" &&
        booking.student === studentName &&
        booking.date === payload.date &&
        booking.start === start &&
        booking.end === end
    );
    if (duplicateBooking) {
      throw new LessonLedgerServiceError("BOOKING_DUPLICATE", "该学生已提交这个时段的预约，请勿重复提交", 409);
    }

    const slot = snapshot.openSlots.find(
      (item) => item.date === payload.date && toMinutes(start) >= toMinutes(item.start) && toMinutes(end) <= toMinutes(item.end)
    );
    if (!slot) {
      throw new LessonLedgerServiceError("BOOKING_SLOT_NOT_OPEN", "该时段暂未开放预约，请选择蓝色开放时段", 409);
    }

    const lessonConflict = findLessonConflict(snapshot, payload.date, start, end);
    const bookingConflict = findBookingRequestConflict(snapshot, payload.date, start, end);
    const conflictNote = lessonConflict ? bookingLessonConflictNote(lessonConflict) : bookingConflict ? bookingRequestConflictNote(bookingConflict) : undefined;
    const booking: LessonLedgerBooking = {
      id: `b-${Date.now()}`,
      student: studentName,
      date: payload.date,
      day: slot.day,
      start,
      end,
      status: conflictNote ? "冲突" : "待审核",
      conflictNote
    };

    return {
      ...snapshot,
      bookings: [booking, ...snapshot.bookings]
    };
  });
}

function updateBooking(bookingId: string, patch: { status?: BookingStatus; start?: string; end?: string }) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const booking = snapshot.bookings.find((item) => item.id === bookingId);
    if (!booking) {
      throw new LessonLedgerServiceError("BOOKING_NOT_FOUND", "预约申请不存在", 404);
    }

    const nextStart = (patch.start ?? booking.start).trim();
    const nextEnd = (patch.end ?? booking.end).trim();
    assertValidTimeRange(nextStart, nextEnd, "BOOKING_INVALID_TIME", "开始时间必须早于结束时间");

    const slot = snapshot.openSlots.find(
      (item) => item.date === booking.date && toMinutes(nextStart) >= toMinutes(item.start) && toMinutes(nextEnd) <= toMinutes(item.end)
    );
    if (!slot) {
      throw new LessonLedgerServiceError("BOOKING_SLOT_NOT_OPEN", "该时段暂未开放预约，请选择蓝色开放时段", 409);
    }

    const lessonConflict = findLessonConflict(snapshot, booking.date, nextStart, nextEnd, booking);
    const bookingConflict = findBookingRequestConflict(snapshot, booking.date, nextStart, nextEnd, booking.id);
    const conflictNote = lessonConflict ? bookingLessonConflictNote(lessonConflict) : bookingConflict ? bookingRequestConflictNote(bookingConflict) : undefined;
    if (patch.status === "已通过" && conflictNote) {
      throw new LessonLedgerServiceError("BOOKING_CONFLICT", `${conflictNote}，请先调整时间`, 409);
    }

    const isTimeAdjusted = patch.start !== undefined || patch.end !== undefined;
    const nextStatus = patch.status ?? (conflictNote ? "冲突" : isTimeAdjusted || booking.status === "冲突" ? "待审核" : booking.status);
    const nextBooking: LessonLedgerBooking = {
      ...booking,
      start: nextStart,
      end: nextEnd,
      status: nextStatus,
      conflictNote: nextStatus === "已拒绝" ? undefined : conflictNote
    };
    const shouldCreateLesson =
      nextStatus === "已通过" &&
      !snapshot.lessons.some(
        (lesson) => lesson.date === nextBooking.date && lesson.start === nextBooking.start && lesson.end === nextBooking.end && lesson.student === nextBooking.student
      );

    return {
      ...snapshot,
      bookings: snapshot.bookings.map((item) => (item.id === bookingId ? nextBooking : item)),
      lessons: shouldCreateLesson
        ? [
            ...snapshot.lessons,
            {
              id: `l-${Date.now()}`,
              date: nextBooking.date,
              day: nextBooking.day,
              start: nextBooking.start,
              end: nextBooking.end,
              student: nextBooking.student,
              subject: "高中数学",
              kind: "一对一",
              status: "待上课",
              price: 320,
              balanceChange: -1,
              feedbackStatus: "未生成"
            }
          ]
        : snapshot.lessons
    };
  });
}

function createMessageThread(payload: Extract<LessonLedgerAction, { action: "createMessageThread" }>["payload"]) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const title = assertTextRange(payload.title, "THREAD_TITLE_INVALID", "请填写沟通标题", 2, 50, "沟通标题需为 2-50 字");
    const body = assertTextRange(payload.body, "THREAD_BODY_INVALID", "请说明具体问题", 5, 500, "具体情况需为 5-500 字");
    const linkedLesson = payload.linkedLesson.trim();
    if (!linkedLesson) {
      throw new LessonLedgerServiceError("THREAD_LINKED_FEEDBACK_REQUIRED", "关联反馈不存在，请返回重试", 400);
    }

    const student = assertKnownStudentByName(snapshot, payload.student.trim());
    const parent = payload.parent.trim() || student.parent;
    if (parent !== student.parent) {
      throw new LessonLedgerServiceError("THREAD_PARENT_FORBIDDEN", "你无权访问该沟通", 403);
    }

    const issueType: ParentIssueType = ["排课", "请假", "反馈", "账务", "其他"].includes(payload.issueType) ? payload.issueType : "其他";
    const duplicateThread = snapshot.messageThreads.find(
      (item) =>
        item.parent === parent &&
        item.student === student.name &&
        item.title === title &&
        item.linkedLesson === linkedLesson &&
        item.messages[0]?.from === "parent" &&
        item.messages[0]?.body === body
    );
    if (duplicateThread) {
      throw new LessonLedgerServiceError("THREAD_DUPLICATE", "请勿重复提交", 409);
    }

    const thread: LessonLedgerMessageThread = {
      id: `m-${Date.now()}`,
      parent,
      student: student.name,
      title,
      issueType,
      linkedLesson,
      status: "已发送",
      messages: [
        {
          from: "parent",
          body,
          time: nowTimeLabel()
        }
      ]
    };

    return {
      ...snapshot,
      messageThreads: [thread, ...snapshot.messageThreads]
    };
  });
}

function replyMessageThread(threadId: string, body: string) {
  return lessonLedgerRepository.updateSnapshot((snapshot) => {
    const replyBody = assertTextRange(body, "THREAD_REPLY_INVALID", "请输入回复内容", 2, 500, "回复内容需为 2-500 字");
    const thread = snapshot.messageThreads.find((item) => item.id === threadId);
    if (!thread) {
      throw new LessonLedgerServiceError("THREAD_NOT_FOUND", "沟通线程不存在", 404);
    }

    return {
      ...snapshot,
      messageThreads: snapshot.messageThreads.map((item) =>
        item.id === threadId
          ? {
              ...item,
              status: "已确认",
              messages: [
                ...item.messages,
                {
                  from: "teacher",
                  body: replyBody,
                  time: nowTimeLabel()
                }
              ]
            }
          : item
      )
    };
  });
}

function assertNever(value: never): never {
  throw new LessonLedgerServiceError("UNKNOWN_ACTION", `不支持的操作：${JSON.stringify(value)}`, 400);
}
