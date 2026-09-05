export type LessonLedgerRole = "teacher" | "parent";

export type LessonStatus = "待上课" | "已上课" | "学生缺席" | "已取消" | "待点名" | "已点名" | "已反馈";
export type AttendanceStatus = "出勤" | "迟到" | "请假" | "缺席";
export type BookingStatus = "待审核" | "冲突" | "已通过" | "已拒绝";
export type FeedbackStatus = "未生成" | "待反馈" | "已发送";
export type MessageStatus = "已发送" | "已确认";
export type ParentIssueType = "排课" | "请假" | "反馈" | "账务" | "其他";

export type LessonLedgerTeacher = {
  id: string;
  name: string;
  account: string;
  studioName: string;
  subject: string;
  city: string;
  teacherIntro: string;
  parentDisplayNote: string;
  authCode: string;
  authorizationStatus: "已授权" | "试用授权有效" | "授权失效";
  serviceExpiresAt: string;
  version: string;
};

export type LessonLedgerUpdateState = {
  status: "未检查" | "可更新" | "已是最新" | "已更新" | "授权失败";
  latestVersion: string;
  checkedAt?: string;
  updatedAt?: string;
  notes: string[];
};

export type LessonLedgerFeatureRequest = {
  id: string;
  title: string;
  body: string;
  status: "已提交" | "测试中" | "已推送";
  requester: string;
  createdAt: string;
};

export type LessonLedgerStudent = {
  id: string;
  name: string;
  grade: string;
  parent: string;
  teacherId: string;
  remainingLessons: number;
  latestScore: string;
  focus: string;
};

export type LessonLedgerCreateStudentPayload = {
  name: string;
  grade: string;
  parent: string;
  remainingLessons?: number;
  latestScore?: string;
  focus: string;
};

export type LessonLedgerClassMember = {
  studentId: string;
  name: string;
  grade: string;
  remainingLessons: number;
  lastStatus: AttendanceStatus;
  focus: string;
};

export type LessonLedgerClass = {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  focus: string;
  members: LessonLedgerClassMember[];
};

export type LessonLedgerLesson = {
  id: string;
  date: string;
  day: string;
  start: string;
  end: string;
  student: string;
  subject: string;
  kind: "一对一" | "班课";
  status: LessonStatus;
  price: number;
  balanceChange: number;
  feedbackStatus: FeedbackStatus;
};

export type LessonLedgerAttendanceRecord = {
  id: string;
  lessonId: string;
  className: string;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  deductLesson: boolean;
  remark?: string;
  savedAt: string;
};

export type LessonLedgerOpenSlot = {
  date: string;
  day: string;
  start: string;
  end: string;
};

export type LessonLedgerBooking = {
  id: string;
  student: string;
  date: string;
  day: string;
  start: string;
  end: string;
  status: BookingStatus;
  conflictNote?: string;
};

export type LessonLedgerScore = {
  studentId?: string;
  studentName?: string;
  exam: string;
  date: string;
  score: string;
  rank: string;
  note: string;
};

export type LessonLedgerWeakness = {
  studentId?: string;
  studentName?: string;
  tag: string;
  level: "高频" | "重点" | "中频";
  source: string;
  action: string;
};

export type LessonLedgerFinanceEvent = {
  date: string;
  studentId: string;
  studentName: string;
  action: "充值" | "扣课" | "撤销";
  amount: string;
  cashAmount?: string;
  balance: string;
  note: string;
};

export type LessonLedgerMessage = {
  from: "parent" | "teacher";
  body: string;
  time: string;
};

export type LessonLedgerMessageThread = {
  id: string;
  parent: string;
  student: string;
  title: string;
  issueType: ParentIssueType;
  linkedLesson: string;
  status: MessageStatus;
  messages: LessonLedgerMessage[];
};

export type LessonLedgerFamilyInvite = {
  id: string;
  token: string;
  studentId: string;
  studentName: string;
  parentName: string;
  status: "待激活" | "已激活" | "已过期" | "已失效";
  inviteLink: string;
  createdAt: string;
  expiresAt: string;
  activatedAt?: string;
  parentPhone?: string;
};

export type LessonLedgerStudyReport = {
  id: string;
  studentId: string;
  title: string;
  status: "待生成" | "已保存";
  period: string;
  summary: string;
  parentSummary?: string;
  sources: string[];
  scoreTrend: Array<{
    exam: string;
    date: string;
    score: string;
    rank: string;
    note: string;
  }>;
  weaknessSummary: Array<{
    tag: string;
    level: LessonLedgerWeakness["level"];
    action: string;
  }>;
  feedbackHighlights: string[];
  sections: Array<{
    title: string;
    body: string;
  }>;
  suggestions: string[];
  dataQuality: "数据充足" | "数据较少，仅供参考";
  visibleToParent: boolean;
  createdAt: string;
  savedAt?: string;
};

export type LessonLedgerFeedbackDraft = {
  id: string;
  lessonId: string;
  student: string;
  body: string;
  status: FeedbackStatus;
  attachments: LessonLedgerFeedbackAttachment[];
  createdAt: string;
};

export type LessonLedgerFeedbackAttachment = {
  name: string;
  kind: "图片" | "PDF" | "文档";
  status: "已分析" | "未识别";
  analysis: string;
};

export type LessonLedgerSnapshot = {
  teacher: LessonLedgerTeacher;
  updateState: LessonLedgerUpdateState;
  students: LessonLedgerStudent[];
  classes: LessonLedgerClass[];
  lessons: LessonLedgerLesson[];
  attendanceRecords: LessonLedgerAttendanceRecord[];
  openSlots: LessonLedgerOpenSlot[];
  bookings: LessonLedgerBooking[];
  scores: LessonLedgerScore[];
  weaknesses: LessonLedgerWeakness[];
  financeEvents: LessonLedgerFinanceEvent[];
  messageThreads: LessonLedgerMessageThread[];
  familyInvites: LessonLedgerFamilyInvite[];
  reports: LessonLedgerStudyReport[];
  feedbackDrafts: LessonLedgerFeedbackDraft[];
  featureRequests: LessonLedgerFeatureRequest[];
};

export type LessonLedgerAction =
  | { action: "createStudent"; payload: LessonLedgerCreateStudentPayload }
  | { action: "createLesson"; payload: LessonLedgerLesson }
  | { action: "updateLesson"; payload: LessonLedgerLesson }
  | { action: "markLessonStatus"; payload: { lessonId: string; status: LessonStatus } }
  | { action: "saveAttendance"; payload: { lessonId: string; attendance: Record<string, AttendanceStatus> } }
  | { action: "generateFeedback"; payload: { lessonId: string; content: string; state: string; homework: string; attachmentNames?: string[] } }
  | { action: "saveFeedbackDraft"; payload: { lessonId: string; feedbackText: string; attachmentNames?: string[] } }
  | { action: "publishFeedback"; payload: { lessonId: string; feedbackText: string } }
  | { action: "createFamilyInvite"; payload: { studentId: string } }
  | { action: "activateFamilyInvite"; payload: { inviteId: string; parentName: string; parentPhone: string } }
  | { action: "generateStudyReport"; payload: { studentId: string; teacherNotes?: string } }
  | { action: "saveStudyReport"; payload: { reportId: string; parentSummary?: string } }
  | { action: "createOpenSlots"; payload: { dates: Array<{ date: string; day: string }>; start: string; end: string } }
  | { action: "addScore"; payload: LessonLedgerScore }
  | { action: "updateScore"; payload: { previousExam: string; previousDate: string; score: LessonLedgerScore } }
  | { action: "addWeakness"; payload: LessonLedgerWeakness }
  | { action: "updateWeakness"; payload: { previousTag: string; weakness: LessonLedgerWeakness } }
  | { action: "addFinanceEvent"; payload: LessonLedgerFinanceEvent }
  | { action: "moveLesson"; payload: { lessonId: string; date: string; day: string; start: string; end: string; resetStatus: boolean } }
  | { action: "checkUpdate"; payload: { authCode: string } }
  | { action: "applyUpdate"; payload: { authCode: string } }
  | { action: "submitFeatureRequest"; payload: { title: string; body: string } }
  | { action: "saveStudioProfile"; payload: { studioName: string; subject: string; city: string; teacherIntro: string; parentDisplayNote: string } }
  | { action: "createBooking"; payload: { student: string; date: string; start: string; end: string } }
  | { action: "updateBooking"; payload: { bookingId: string; status?: BookingStatus; start?: string; end?: string } }
  | { action: "createMessageThread"; payload: { parent: string; student: string; title: string; issueType: ParentIssueType; linkedLesson: string; body: string } }
  | { action: "replyMessageThread"; payload: { threadId: string; body: string } };
