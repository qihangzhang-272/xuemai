import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LessonLedgerAction } from "@/src/lessonledger/types";

const storePaths: string[] = [];

async function loadIsolatedService() {
  vi.resetModules();
  const storePath = join(mkdtempSync(join(tmpdir(), "lessonledger-service-")), "store.json");
  storePaths.push(storePath);
  process.env.LESSONLEDGER_STORE_PATH = storePath;
  const service = await import("@/src/lessonledger/service");
  service.resetLessonLedgerDemo();
  return service;
}

function action(input: LessonLedgerAction) {
  return input;
}

afterEach(() => {
  vi.useRealTimers();
  delete process.env.LESSONLEDGER_STORE_PATH;
  for (const storePath of storePaths.splice(0)) {
    rmSync(dirname(storePath), { recursive: true, force: true });
  }
});

describe("LessonLedger service backend", () => {
  it("persists backend actions across service module reloads", async () => {
    const storePath = join(mkdtempSync(join(tmpdir(), "lessonledger-service-persist-")), "store.json");
    storePaths.push(storePath);
    process.env.LESSONLEDGER_STORE_PATH = storePath;

    vi.resetModules();
    const initialService = await import("@/src/lessonledger/service");
    initialService.resetLessonLedgerDemo();
    initialService.runLessonLedgerAction(
      action({
        action: "createStudent",
        payload: {
          name: "持久化学生",
          grade: "高二",
          parent: "持久化家长",
          remainingLessons: 6,
          latestScore: "暂无成绩",
          focus: "函数图像与参数范围"
        }
      })
    );

    vi.resetModules();
    const reloadedService = await import("@/src/lessonledger/service");
    const reloadedSnapshot = reloadedService.getLessonLedgerSnapshot();

    expect(existsSync(storePath)).toBe(true);
    expect(reloadedSnapshot.students.find((student) => student.name === "持久化学生")).toMatchObject({
      grade: "高二",
      parent: "持久化家长",
      remainingLessons: 6
    });
    expect(reloadedSnapshot.financeEvents[0]).toMatchObject({
      studentName: "持久化学生",
      action: "充值",
      amount: "+6 课时"
    });
  });

  it("keeps the competitor demo parent account balance aligned with the ledger", async () => {
    const service = await loadIsolatedService();
    const snapshot = service.getLessonLedgerSnapshot();

    expect(snapshot.students.find((student) => student.id === "s1")).toMatchObject({
      name: "李三",
      remainingLessons: 13
    });
    expect(snapshot.classes[0]?.members.find((member) => member.studentId === "s1")).toMatchObject({
      name: "李三",
      remainingLessons: 13
    });
    expect(snapshot.financeEvents.filter((event) => event.studentId === "s1").map((event) => event.balance)).toEqual([
      "15 课时",
      "14 课时",
      "13 课时",
      "14 课时",
      "13 课时"
    ]);
  });

  it("marks lesson status with finance and feedback side effects", async () => {
    const service = await loadIsolatedService();

    const completedSnapshot = service.runLessonLedgerAction(
      action({
        action: "markLessonStatus",
        payload: {
          lessonId: "l3",
          status: "已上课"
        }
      })
    );

    expect(completedSnapshot.lessons.find((lesson) => lesson.id === "l3")).toMatchObject({
      status: "已上课",
      feedbackStatus: "待反馈"
    });
    expect(completedSnapshot.students.find((student) => student.id === "s2")?.remainingLessons).toBe(11);
    expect(completedSnapshot.financeEvents[0]).toMatchObject({
      studentId: "s2",
      studentName: "王小满",
      action: "扣课",
      amount: "-1 课时",
      balance: "11 课时"
    });

    const repeatedSnapshot = service.runLessonLedgerAction(
      action({
        action: "markLessonStatus",
        payload: {
          lessonId: "l3",
          status: "已上课"
        }
      })
    );
    expect(repeatedSnapshot.financeEvents.filter((event) => event.note.includes("初三数学 14:30-16:00 上课确认扣课"))).toHaveLength(1);

    const draftSnapshot = service.runLessonLedgerAction(
      action({
        action: "generateFeedback",
        payload: {
          lessonId: "l3",
          content: "二次函数最值与应用题建模",
          state: "审题比上次稳定，配方步骤还需要更完整",
          homework: "五道二次函数应用题"
        }
      })
    );
    expect(draftSnapshot.feedbackDrafts.find((draft) => draft.lessonId === "l3")).toBeTruthy();

    const cancelledSnapshot = service.runLessonLedgerAction(
      action({
        action: "markLessonStatus",
        payload: {
          lessonId: "l3",
          status: "已取消"
        }
      })
    );
    expect(cancelledSnapshot.lessons.find((lesson) => lesson.id === "l3")).toMatchObject({
      status: "已取消",
      feedbackStatus: "未生成"
    });
    expect(cancelledSnapshot.feedbackDrafts.find((draft) => draft.lessonId === "l3")).toBeUndefined();
  });

  it("rejects completing a lesson when the student has insufficient balance", async () => {
    const service = await loadIsolatedService();

    service.runLessonLedgerAction(
      action({
        action: "addFinanceEvent",
        payload: {
          date: "06-21",
          studentId: "s3",
          studentName: "陈雨",
          action: "扣课",
          amount: "-9 课时",
          balance: "0 课时",
          note: "补录历史课消"
        }
      })
    );

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "markLessonStatus",
          payload: {
            lessonId: "l4",
            status: "已上课"
          }
        })
      )
    ).toThrow("课时余额不足");
  });

  it("rejects parent bookings outside teacher-opened blue slots", async () => {
    const service = await loadIsolatedService();

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "createBooking",
          payload: {
            student: "李三",
            date: "06-19",
            start: "10:30",
            end: "12:30"
          }
        })
      )
    ).toThrow("该时段暂未开放预约");
  });

  it("rejects malformed booking time before conflict detection", async () => {
    const service = await loadIsolatedService();

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "createBooking",
          payload: {
            student: "李三",
            date: "06-20",
            start: "上午十点",
            end: "12:30"
          }
        })
      )
    ).toThrow("时间格式不正确");
  });

  it("rejects duplicate parent booking submissions for the same student and time", async () => {
    const service = await loadIsolatedService();

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "createBooking",
          payload: {
            student: "王小满",
            date: "06-21",
            start: "08:00",
            end: "10:00"
          }
        })
      )
    ).toThrow("请勿重复提交");
  });

  it("marks overlapping parent booking requests as conflicts until the teacher adjusts them", async () => {
    const service = await loadIsolatedService();

    const conflictSnapshot = service.runLessonLedgerAction(
      action({
        action: "createBooking",
        payload: {
          student: "李三",
          date: "06-21",
          start: "09:00",
          end: "11:00"
        }
      })
    );
    const conflictBooking = conflictSnapshot.bookings[0]!;
    expect(conflictBooking.status).toBe("冲突");
    expect(conflictBooking.conflictNote).toContain("与预约 08:00-10:00 王小满冲突");

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "updateBooking",
          payload: {
            bookingId: conflictBooking.id,
            status: "已通过"
          }
        })
      )
    ).toThrow("请先调整时间");

    const adjustedSnapshot = service.runLessonLedgerAction(
      action({
        action: "updateBooking",
        payload: {
          bookingId: conflictBooking.id,
          start: "10:00",
          end: "12:00"
        }
      })
    );
    expect(adjustedSnapshot.bookings.find((booking) => booking.id === conflictBooking.id)?.status).toBe("待审核");

    const approvedSnapshot = service.runLessonLedgerAction(
      action({
        action: "updateBooking",
        payload: {
          bookingId: conflictBooking.id,
          status: "已通过"
        }
      })
    );

    expect(approvedSnapshot.bookings.find((booking) => booking.id === conflictBooking.id)?.status).toBe("已通过");
    expect(
      approvedSnapshot.lessons.some((lesson) => lesson.student === "李三" && lesson.date === "06-21" && lesson.start === "10:00" && lesson.end === "12:00")
    ).toBe(true);
  });

  it("keeps conflicting parent bookings in review until the teacher adjusts and approves them", async () => {
    const service = await loadIsolatedService();

    const conflictSnapshot = service.runLessonLedgerAction(
        action({
          action: "createBooking",
          payload: {
            student: "陈雨",
            date: "06-20",
            start: "10:30",
            end: "12:30"
        }
      })
    );
    const conflictBooking = conflictSnapshot.bookings[0]!;
    expect(conflictBooking.status).toBe("冲突");
    expect(conflictBooking.conflictNote).toContain("高二数学小班");

    const adjustedSnapshot = service.runLessonLedgerAction(
      action({
        action: "updateBooking",
        payload: {
          bookingId: conflictBooking.id,
          start: "12:30",
          end: "14:30"
        }
      })
    );
    expect(adjustedSnapshot.bookings.find((booking) => booking.id === conflictBooking.id)?.status).toBe("待审核");

    const approvedSnapshot = service.runLessonLedgerAction(
      action({
        action: "updateBooking",
        payload: {
          bookingId: conflictBooking.id,
          status: "已通过"
        }
      })
    );

    expect(approvedSnapshot.bookings.find((booking) => booking.id === conflictBooking.id)?.status).toBe("已通过");
    expect(
      approvedSnapshot.lessons.some((lesson) => lesson.student === "陈雨" && lesson.date === "06-20" && lesson.start === "12:30" && lesson.end === "14:30")
    ).toBe(true);
  });

  it("updates student remaining lessons when manual finance events are recorded", async () => {
    const service = await loadIsolatedService();

    const chargedSnapshot = service.runLessonLedgerAction(
      action({
        action: "addFinanceEvent",
        payload: {
          date: "06-21",
          studentId: "s2",
          studentName: "王小满",
          action: "充值",
          amount: "+10 课时",
          cashAmount: "3200",
          balance: "22 课时",
          note: "家长续费确认"
        }
      })
    );

    expect(chargedSnapshot.students.find((student) => student.id === "s2")?.remainingLessons).toBe(22);
    expect(chargedSnapshot.financeEvents[0]).toMatchObject({
      studentId: "s2",
      studentName: "王小满",
      action: "充值",
      amount: "+10 课时",
      cashAmount: "¥3,200",
      balance: "22 课时"
    });

    const deductedSnapshot = service.runLessonLedgerAction(
      action({
        action: "addFinanceEvent",
        payload: {
          date: "06-22",
          studentId: "s2",
          studentName: "王小满",
          action: "扣课",
          amount: "1 课时",
          cashAmount: "",
          balance: "21 课时",
          note: "补录扣课"
        }
      })
    );

    expect(deductedSnapshot.students.find((student) => student.id === "s2")?.remainingLessons).toBe(21);
    expect(deductedSnapshot.financeEvents[0]).toMatchObject({
      action: "扣课",
      amount: "-1 课时",
      cashAmount: undefined,
      balance: "21 课时"
    });

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "addFinanceEvent",
          payload: {
            date: "06-23",
            studentId: "s2",
            studentName: "王小满",
            action: "充值",
            amount: "+2 课时",
            balance: "23 课时",
            note: "漏填收款"
          }
        })
      )
    ).toThrow("请填写本次收款金额");

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "addFinanceEvent",
          payload: {
            date: "06-23",
            studentId: "s2",
            studentName: "王小满",
            action: "扣课",
            amount: "+1 课时",
            balance: "22 课时",
            note: "错误符号"
          }
        })
      )
    ).toThrow("扣课流水必须减少课时");

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "addFinanceEvent",
          payload: {
            date: "06-23",
            studentId: "s2",
            studentName: "王小满",
            action: "扣课",
            amount: "30 课时",
            balance: "0 课时",
            note: "余额不足"
          }
        })
      )
    ).toThrow("课时不足，请充值或确认欠费");
  });

  it("persists class attendance records and avoids duplicate roll-call ledger rows", async () => {
    const service = await loadIsolatedService();

    const savedSnapshot = service.runLessonLedgerAction(
      action({
        action: "saveAttendance",
        payload: {
          lessonId: "l2",
          attendance: {
            赵一鸣: "出勤",
            钱小夏: "缺席",
            孙子墨: "请假",
            李三: "出勤",
            周可: "迟到",
            吴越: "缺席"
          }
        }
      })
    );

    const lessonRecords = savedSnapshot.attendanceRecords.filter((record) => record.lessonId === "l2");
    expect(lessonRecords).toHaveLength(6);
    expect(lessonRecords.find((record) => record.studentName === "钱小夏")).toMatchObject({
      status: "缺席",
      deductLesson: false
    });
    expect(lessonRecords.find((record) => record.studentName === "周可")).toMatchObject({
      status: "迟到",
      deductLesson: true
    });
    expect(savedSnapshot.lessons.find((lesson) => lesson.id === "l2")).toMatchObject({
      status: "已点名",
      feedbackStatus: "待反馈"
    });
    expect(savedSnapshot.classes[0]?.members.find((member) => member.name === "钱小夏")).toMatchObject({
      lastStatus: "缺席",
      remainingLessons: 14
    });

    const rollCallFinanceCount = savedSnapshot.financeEvents.filter((event) => event.note.includes("班课点名扣课")).length;
    expect(rollCallFinanceCount).toBe(3);

    const revisedSnapshot = service.runLessonLedgerAction(
      action({
        action: "saveAttendance",
        payload: {
          lessonId: "l2",
          attendance: {
            赵一鸣: "出勤",
            钱小夏: "出勤",
            孙子墨: "请假",
            李三: "出勤",
            周可: "迟到",
            吴越: "缺席"
          }
        }
      })
    );

    expect(revisedSnapshot.attendanceRecords.filter((record) => record.lessonId === "l2")).toHaveLength(6);
    expect(revisedSnapshot.attendanceRecords.find((record) => record.lessonId === "l2" && record.studentName === "钱小夏")).toMatchObject({
      status: "出勤",
      deductLesson: true
    });
    expect(revisedSnapshot.financeEvents.filter((event) => event.note.includes("班课点名扣课"))).toHaveLength(rollCallFinanceCount);
  });

  it("resets completed class lesson artifacts when a moved lesson is reset to a future slot", async () => {
    const service = await loadIsolatedService();

    service.runLessonLedgerAction(
      action({
        action: "saveAttendance",
        payload: {
          lessonId: "l2",
          attendance: {
            赵一鸣: "出勤",
            钱小夏: "迟到",
            孙子墨: "请假",
            李三: "出勤",
            周可: "出勤",
            吴越: "缺席"
          }
        }
      })
    );
    const draftSnapshot = service.runLessonLedgerAction(
      action({
        action: "generateFeedback",
        payload: {
          lessonId: "l2",
          content: "圆锥曲线班课综合题讲评",
          state: "班级整体状态稳定",
          homework: "专题小题 6 道"
        }
      })
    );
    expect(draftSnapshot.attendanceRecords.filter((record) => record.lessonId === "l2")).toHaveLength(6);
    expect(draftSnapshot.feedbackDrafts.find((draft) => draft.lessonId === "l2")).toBeTruthy();

    const movedSnapshot = service.runLessonLedgerAction(
      action({
        action: "moveLesson",
        payload: {
          lessonId: "l2",
          date: "06-21",
          day: "周日",
          start: "12:30",
          end: "14:00",
          resetStatus: true
        }
      })
    );

    expect(movedSnapshot.lessons.find((lesson) => lesson.id === "l2")).toMatchObject({
      date: "06-21",
      start: "12:30",
      end: "14:00",
      status: "待上课",
      feedbackStatus: "未生成"
    });
    expect(movedSnapshot.attendanceRecords.filter((record) => record.lessonId === "l2")).toHaveLength(0);
    expect(movedSnapshot.feedbackDrafts.find((draft) => draft.lessonId === "l2")).toBeUndefined();
  });

  it("rejects moving a lesson into an active parent booking request", async () => {
    const service = await loadIsolatedService();

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "moveLesson",
          payload: {
            lessonId: "l3",
            date: "06-21",
            day: "周日",
            start: "08:00",
            end: "10:00",
            resetStatus: true
          }
        })
      )
    ).toThrow("请先处理预约申请");
  });

  it("validates and persists student scores and weakness records", async () => {
    const service = await loadIsolatedService();

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "addScore",
          payload: {
            studentId: "s2",
            studentName: "王小满",
            exam: "月考复盘",
            date: "06-22",
            score: "130 / 120",
            rank: "4 / 36",
            note: "成绩异常"
          }
        })
      )
    ).toThrow("得分不能大于总分");

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "addScore",
          payload: {
            studentId: "s2",
            studentName: "王小满",
            exam: "月考复盘",
            date: "06-22",
            score: "96 / 120",
            rank: "前四名",
            note: "排名异常"
          }
        })
      )
    ).toThrow("排名必须为正整数");

    const scoredSnapshot = service.runLessonLedgerAction(
      action({
        action: "addScore",
        payload: {
          studentId: "s2",
          studentName: "王小满",
          exam: "月考复盘",
          date: "06-22",
          score: "96 / 120",
          rank: "4 / 36",
          note: "二次函数压轴前两问稳定，尾问分类讨论还需继续练。"
        }
      })
    );

    expect(scoredSnapshot.scores[0]).toMatchObject({
      studentId: "s2",
      studentName: "王小满",
      exam: "月考复盘",
      date: "06-22",
      score: "96 / 120",
      rank: "4 / 36"
    });
    expect(scoredSnapshot.students.find((student) => student.id === "s2")?.latestScore).toBe("96 / 120");

    const updatedScoreSnapshot = service.runLessonLedgerAction(
      action({
        action: "addScore",
        payload: {
          studentId: "s2",
          studentName: "王小满",
          exam: "月考复盘",
          date: "06-22",
          score: "99 / 120",
          rank: "3 / 36",
          note: "同名同日期成绩更新。"
        }
      })
    );

    expect(updatedScoreSnapshot.scores.filter((score) => score.studentId === "s2" && score.exam === "月考复盘" && score.date === "06-22")).toHaveLength(1);
    expect(updatedScoreSnapshot.scores[0]).toMatchObject({
      score: "99 / 120",
      rank: "3 / 36"
    });

    const renamedScoreSnapshot = service.runLessonLedgerAction(
      action({
        action: "updateScore",
        payload: {
          previousExam: "月考复盘",
          previousDate: "06-22",
          score: {
            studentId: "s2",
            studentName: "王小满",
            exam: "月考复盘订正",
            date: "06-23",
            score: "101 / 120",
            rank: "2 / 36",
            note: "老师调整考试名称和日期后替换旧记录。"
          }
        }
      })
    );

    expect(renamedScoreSnapshot.scores.filter((score) => score.studentId === "s2" && score.exam === "月考复盘" && score.date === "06-22")).toHaveLength(0);
    expect(renamedScoreSnapshot.scores[0]).toMatchObject({
      exam: "月考复盘订正",
      date: "06-23",
      score: "101 / 120",
      rank: "2 / 36"
    });

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "addWeakness",
          payload: {
            studentId: "s2",
            studentName: "王小满",
            tag: "",
            level: "重点",
            source: "月考复盘",
            action: "补分类讨论"
          }
        })
      )
    ).toThrow("请填写薄弱点");

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "addWeakness",
          payload: {
            studentId: "s2",
            studentName: "王小满",
            tag: "二次函数分类讨论",
            level: "重点",
            source: "月考复盘",
            action: ""
          }
        })
      )
    ).toThrow("请填写加强动作");

    const weaknessSnapshot = service.runLessonLedgerAction(
      action({
        action: "addWeakness",
        payload: {
          studentId: "s2",
          studentName: "王小满",
          tag: "二次函数分类讨论",
          level: "重点",
          source: "月考复盘",
          action: "先复盘顶点式与判别式，再做压轴前两问。"
        }
      })
    );

    expect(weaknessSnapshot.weaknesses[0]).toMatchObject({
      studentId: "s2",
      studentName: "王小满",
      tag: "二次函数分类讨论",
      level: "重点",
      source: "月考复盘"
    });

    const updatedWeaknessSnapshot = service.runLessonLedgerAction(
      action({
        action: "addWeakness",
        payload: {
          studentId: "s2",
          studentName: "王小满",
          tag: "二次函数分类讨论",
          level: "高频",
          source: "专题测",
          action: "增加分类讨论专项小题。"
        }
      })
    );

    expect(updatedWeaknessSnapshot.weaknesses.filter((weakness) => weakness.studentId === "s2" && weakness.tag === "二次函数分类讨论")).toHaveLength(1);
    expect(updatedWeaknessSnapshot.weaknesses[0]).toMatchObject({
      level: "高频",
      source: "专题测",
      action: "增加分类讨论专项小题。"
    });

    const renamedWeaknessSnapshot = service.runLessonLedgerAction(
      action({
        action: "updateWeakness",
        payload: {
          previousTag: "二次函数分类讨论",
          weakness: {
            studentId: "s2",
            studentName: "王小满",
            tag: "二次函数参数分类",
            level: "重点",
            source: "错题复盘",
            action: "先标出参数范围，再判断每一种分类条件。"
          }
        }
      })
    );

    expect(renamedWeaknessSnapshot.weaknesses.filter((weakness) => weakness.studentId === "s2" && weakness.tag === "二次函数分类讨论")).toHaveLength(0);
    expect(renamedWeaknessSnapshot.weaknesses[0]).toMatchObject({
      tag: "二次函数参数分类",
      level: "重点",
      source: "错题复盘"
    });
  });

  it("generates study reports from the selected student's own scores, weaknesses, lessons, and feedback", async () => {
    const service = await loadIsolatedService();

    service.runLessonLedgerAction(
      action({
        action: "addScore",
        payload: {
          studentId: "s2",
          studentName: "王小满",
          exam: "月考复盘",
          date: "06-22",
          score: "96 / 120",
          rank: "4 / 36",
          note: "二次函数压轴前两问稳定，尾问分类讨论还需继续练。"
        }
      })
    );
    service.runLessonLedgerAction(
      action({
        action: "addWeakness",
        payload: {
          studentId: "s2",
          studentName: "王小满",
          tag: "二次函数分类讨论",
          level: "重点",
          source: "月考复盘",
          action: "先复盘顶点式与判别式，再做压轴前两问。"
        }
      })
    );

    const draftSnapshot = service.runLessonLedgerAction(
      action({
        action: "generateStudyReport",
        payload: {
          studentId: "s2",
          teacherNotes: "请结合最近三次成绩、薄弱点和课程反馈生成阶段报告。"
        }
      })
    );
    const draftReport = draftSnapshot.reports[0]!;
    const draftText = JSON.stringify(draftReport);

    expect(draftReport).toMatchObject({
      studentId: "s2",
      title: "王小满 6 月阶段学习报告",
      status: "待生成",
      visibleToParent: false
    });
    expect(draftReport.savedAt).toBeUndefined();
    expect(draftReport.sources).toEqual(expect.arrayContaining(["最近三次考试", "当前薄弱点", "最近五次课程", "老师补充要求"]));
    expect(draftReport.summary).toContain("王小满");
    expect(draftReport.summary).toContain("二次函数分类讨论");
    expect(draftReport.scoreTrend[0]).toMatchObject({
      exam: "月考复盘",
      score: "96 / 120"
    });
    expect(draftReport.weaknessSummary[0]).toMatchObject({
      tag: "二次函数分类讨论",
      action: "先复盘顶点式与判别式，再做压轴前两问。"
    });
    expect(draftText).not.toContain("取值范围专项讲解");
    expect(draftText).not.toContain("圆锥曲线综合小题");

    const savedSnapshot = service.runLessonLedgerAction(
      action({
        action: "saveStudyReport",
        payload: {
          reportId: draftReport.id,
          parentSummary: "王小满本阶段整体稳定，二次函数分类讨论需要继续通过压轴前两问巩固。"
        }
      })
    );
    const savedReport = savedSnapshot.reports.find((report) => report.id === draftReport.id)!;

    expect(savedReport).toMatchObject({
      status: "已保存",
      visibleToParent: true,
      parentSummary: "王小满本阶段整体稳定，二次函数分类讨论需要继续通过压轴前两问巩固。"
    });
    expect(savedReport.savedAt).toBeTruthy();
  });

  it("creates students as backend entities with initial lesson ledger and family invite support", async () => {
    const service = await loadIsolatedService();

    const createdSnapshot = service.runLessonLedgerAction(
      action({
        action: "createStudent",
        payload: {
          name: "赵一鸣",
          grade: "高一",
          parent: "赵一鸣家长",
          remainingLessons: 10,
          latestScore: "暂无成绩",
          focus: "函数图像与参数范围"
        }
      })
    );
    const createdStudent = createdSnapshot.students.find((student) => student.name === "赵一鸣");

    expect(createdStudent).toMatchObject({
      grade: "高一",
      parent: "赵一鸣家长",
      teacherId: createdSnapshot.teacher.id,
      remainingLessons: 10,
      focus: "函数图像与参数范围"
    });
    expect(createdSnapshot.financeEvents[0]).toMatchObject({
      studentId: createdStudent?.id,
      studentName: "赵一鸣",
      action: "充值",
      amount: "+10 课时",
      cashAmount: "¥0",
      balance: "10 课时",
      note: "新增学生建档初始课时"
    });

    const inviteSnapshot = service.runLessonLedgerAction(
      action({
        action: "createFamilyInvite",
        payload: {
          studentId: createdStudent?.id ?? ""
        }
      })
    );

    expect(inviteSnapshot.familyInvites[0]).toMatchObject({
      studentId: createdStudent?.id,
      studentName: "赵一鸣",
      parentName: "赵一鸣家长",
      status: "待激活",
      inviteLink: expect.stringMatching(/^\/portal\/invite\?token=[a-f0-9]{64}$/)
    });
    expect(inviteSnapshot.familyInvites[0]?.token).toMatch(/^[a-f0-9]{64}$/);
    expect(new Date(inviteSnapshot.familyInvites[0]!.expiresAt).getTime() - new Date(inviteSnapshot.familyInvites[0]!.createdAt).getTime()).toBe(
      48 * 60 * 60 * 1000
    );

    const activatedSnapshot = service.runLessonLedgerAction(
      action({
        action: "activateFamilyInvite",
        payload: {
          inviteId: inviteSnapshot.familyInvites[0]?.token ?? "",
          parentName: "赵一鸣妈妈",
          parentPhone: "13800000000"
        }
      })
    );

    expect(activatedSnapshot.familyInvites.find((invite) => invite.studentId === createdStudent?.id)).toMatchObject({
      parentName: "赵一鸣妈妈",
      parentPhone: "13800000000",
      status: "已激活"
    });
  });

  it("expires family invite links instead of activating stale parent accounts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T00:00:00+08:00"));
    const service = await loadIsolatedService();

    const inviteSnapshot = service.runLessonLedgerAction(
      action({
        action: "createFamilyInvite",
        payload: {
          studentId: "s1"
        }
      })
    );
    const invite = inviteSnapshot.familyInvites[0]!;

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "activateFamilyInvite",
          payload: {
            inviteId: invite.token,
            parentName: "李三妈妈",
            parentPhone: "12345"
          }
        })
      )
    ).toThrow("请输入正确手机号");

    vi.setSystemTime(new Date(new Date(invite.expiresAt).getTime() + 1000));
    const expiredSnapshot = service.runLessonLedgerAction(
        action({
          action: "activateFamilyInvite",
          payload: {
            inviteId: invite.token,
            parentName: "李三妈妈",
            parentPhone: "13800000000"
          }
      })
    );

    expect(expiredSnapshot.familyInvites.find((item) => item.id === invite.id)).toMatchObject({
      status: "已过期"
    });
    expect(expiredSnapshot.familyInvites.find((item) => item.id === invite.id)?.activatedAt).toBeUndefined();
  });

  it("rejects duplicated student records for the same parent", async () => {
    const service = await loadIsolatedService();

    const payload = {
      name: "赵一鸣",
      grade: "高一",
      parent: "赵一鸣家长",
      remainingLessons: 0,
      focus: "函数图像与参数范围"
    };

    service.runLessonLedgerAction(
      action({
        action: "createStudent",
        payload
      })
    );

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "createStudent",
          payload
        })
      )
    ).toThrow("已经存在");
  });

  it("checks and applies authorized updates while preserving demo data", async () => {
    const service = await loadIsolatedService();
    const beforeSnapshot = service.getLessonLedgerSnapshot();

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "checkUpdate",
          payload: {
            authCode: "bad"
          }
        })
      )
    ).toThrow("授权码格式不正确");

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "checkUpdate",
          payload: {
            authCode: "KIN-WRONG-2026"
          }
        })
      )
    ).toThrow("授权码无效");

    const checkedSnapshot = service.runLessonLedgerAction(
      action({
        action: "checkUpdate",
        payload: {
          authCode: beforeSnapshot.teacher.authCode
        }
      })
    );

    expect(checkedSnapshot.updateState.status).toBe("可更新");
    expect(checkedSnapshot.teacher.version).toBe(beforeSnapshot.teacher.version);
    expect(checkedSnapshot.updateState.latestVersion).toBe("1.0.12");

    const updatedSnapshot = service.runLessonLedgerAction(
      action({
        action: "applyUpdate",
        payload: {
          authCode: beforeSnapshot.teacher.authCode
        }
      })
    );

    expect(updatedSnapshot.updateState.status).toBe("已更新");
    expect(updatedSnapshot.teacher.version).toBe(updatedSnapshot.updateState.latestVersion);
    expect(updatedSnapshot.lessons).toHaveLength(beforeSnapshot.lessons.length);
    expect(updatedSnapshot.financeEvents).toHaveLength(beforeSnapshot.financeEvents.length);
    expect(updatedSnapshot.familyInvites).toHaveLength(beforeSnapshot.familyInvites.length);
    expect(updatedSnapshot.students).toHaveLength(beforeSnapshot.students.length);
  });

  it("persists authorized feature requests for the update queue", async () => {
    const service = await loadIsolatedService();

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "submitFeatureRequest",
          payload: {
            title: "",
            body: "希望预约审核支持批量通过"
          }
        })
      )
    ).toThrow("请填写功能需求标题");

    const submittedSnapshot = service.runLessonLedgerAction(
      action({
        action: "submitFeatureRequest",
        payload: {
          title: "希望预约审核支持批量通过",
          body: "假期密集排课时，希望可以对无冲突预约一键通过，并在排课总表里自动连续排课。"
        }
      })
    );

    expect(submittedSnapshot.featureRequests[0]).toMatchObject({
      title: "希望预约审核支持批量通过",
      body: "假期密集排课时，希望可以对无冲突预约一键通过，并在排课总表里自动连续排课。",
      status: "已提交",
      requester: submittedSnapshot.teacher.name
    });

    expect(service.resetLessonLedgerDemo().featureRequests).toHaveLength(0);
  });

  it("validates and persists parent communication around course feedback", async () => {
    const service = await loadIsolatedService();
    const messagePayload = {
      parent: "李三家长",
      student: "李三",
      title: "想补充讲讲取值范围",
      issueType: "反馈" as const,
      linkedLesson: "06-20 圆锥曲线离心率反馈",
      body: "孩子对离心率问题中的取值范围仍然不太会，希望下次课重点讲一下。"
    };

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "createMessageThread",
          payload: {
            ...messagePayload,
            title: ""
          }
        })
      )
    ).toThrow("请填写沟通标题");

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "createMessageThread",
          payload: {
            ...messagePayload,
            body: "不懂"
          }
        })
      )
    ).toThrow("具体情况需为 5-500 字");

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "createMessageThread",
          payload: {
            ...messagePayload,
            parent: "王小满家长"
          }
        })
      )
    ).toThrow("你无权访问该沟通");

    const createdSnapshot = service.runLessonLedgerAction(
      action({
        action: "createMessageThread",
        payload: messagePayload
      })
    );
    const createdThread = createdSnapshot.messageThreads[0]!;

    expect(createdThread).toMatchObject({
      parent: "李三家长",
      student: "李三",
      title: "想补充讲讲取值范围",
      issueType: "反馈",
      linkedLesson: "06-20 圆锥曲线离心率反馈",
      status: "已发送"
    });
    expect(createdThread.messages[0]).toMatchObject({
      from: "parent",
      body: messagePayload.body
    });

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "createMessageThread",
          payload: messagePayload
        })
      )
    ).toThrow("请勿重复提交");

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "replyMessageThread",
          payload: {
            threadId: createdThread.id,
            body: ""
          }
        })
      )
    ).toThrow("请输入回复内容");

    const repliedSnapshot = service.runLessonLedgerAction(
      action({
        action: "replyMessageThread",
        payload: {
          threadId: createdThread.id,
          body: "好的家长，下次课我们会把取值范围单独安排一段讲解。"
        }
      })
    );

    expect(repliedSnapshot.messageThreads.find((thread) => thread.id === createdThread.id)).toMatchObject({
      status: "已确认",
      messages: [
        expect.objectContaining({ from: "parent" }),
        expect.objectContaining({
          from: "teacher",
          body: "好的家长，下次课我们会把取值范围单独安排一段讲解。"
        })
      ]
    });
  });

  it("persists generated and published feedback for the parent portal", async () => {
    const service = await loadIsolatedService();

    const draftSnapshot = service.runLessonLedgerAction(
      action({
        action: "generateFeedback",
        payload: {
          lessonId: "l1",
          content: "圆锥曲线的离心率问题",
          state: "上课精神集中，解题思路清晰，计算准确率有待提高。",
          homework: "七道圆锥曲线综合小题",
          attachmentNames: ["入门小测.jpg"]
        }
      })
    );

    const draft = draftSnapshot.feedbackDrafts.find((item) => item.lessonId === "l1");
    expect(draft?.status).toBe("待反馈");
    expect(draft?.attachments[0]?.status).toBe("已分析");
    expect(draft?.body).toContain("入门小测");

    const savedDraftSnapshot = service.runLessonLedgerAction(
      action({
        action: "saveFeedbackDraft",
        payload: {
          lessonId: "l1",
          feedbackText: `${draft?.body ?? ""}\n\n老师补充：家长可以先查看这条反馈，后续我会根据练习结果继续调整。`,
          attachmentNames: ["入门小测.jpg"]
        }
      })
    );
    const savedDraft = savedDraftSnapshot.feedbackDrafts.find((item) => item.lessonId === "l1");
    expect(savedDraft?.status).toBe("待反馈");
    expect(savedDraft?.body).toContain("老师补充");
    expect(savedDraft?.attachments[0]?.name).toBe("入门小测.jpg");
    expect(savedDraftSnapshot.lessons.find((lesson) => lesson.id === "l1")).toMatchObject({
      feedbackStatus: "待反馈"
    });

    const publishedSnapshot = service.runLessonLedgerAction(
      action({
        action: "publishFeedback",
        payload: {
          lessonId: "l1",
          feedbackText: savedDraft?.body ?? ""
        }
      })
    );

    expect(publishedSnapshot.feedbackDrafts.find((item) => item.lessonId === "l1")?.status).toBe("已发送");
    expect(publishedSnapshot.lessons.find((lesson) => lesson.id === "l1")).toMatchObject({
      status: "已反馈",
      feedbackStatus: "已发送"
    });
  });

  it("uses the async AI provider for feedback and study reports when one is configured", async () => {
    const service = await loadIsolatedService();
    service.setLessonLedgerAiProviderForTest({
      async generateFeedback(input) {
        return `${input.lesson.student}家长您好，模型已结合“${input.content}”和课堂状态生成反馈：孩子本节课思路稳定，后续会继续关注计算准确率，并结合${input.attachments[0]?.name ?? "课堂记录"}安排巩固。`;
      },
      async generateStudyReport(input) {
        return {
          summary: `${input.student.name} 的模型报告摘要：近期围绕 ${input.student.focus} 持续推进，成绩、薄弱点和课程反馈已综合参考。`,
          parentSummary: "家长端摘要：本阶段学习状态稳定，建议继续配合完成课后巩固。",
          sections: [
            {
              title: "模型综合分析",
              body: "本报告已综合成绩记录、薄弱点和近期课程反馈，后续建议围绕当前高频薄弱点继续做小题巩固。"
            }
          ],
          suggestions: ["下次课继续追踪同类题的独立完成情况。"]
        };
      }
    });

    const feedbackSnapshot = await service.runLessonLedgerActionAsync(
      action({
        action: "generateFeedback",
        payload: {
          lessonId: "l1",
          content: "圆锥曲线的离心率问题",
          state: "上课精神集中，解题思路清晰，计算准确率有待提高。",
          homework: "七道圆锥曲线综合小题",
          attachmentNames: ["入门小测.jpg"]
        }
      })
    );
    expect(feedbackSnapshot.feedbackDrafts.find((draft) => draft.lessonId === "l1")?.body).toContain("模型已结合");

    const reportSnapshot = await service.runLessonLedgerActionAsync(
      action({
        action: "generateStudyReport",
        payload: {
          studentId: "s1",
          teacherNotes: "重点看离心率取值范围"
        }
      })
    );
    const report = reportSnapshot.reports.find((item) => item.studentId === "s1" && item.status === "待生成");
    expect(report?.summary).toContain("模型报告摘要");
    expect(report?.parentSummary).toContain("家长端摘要");
    expect(report?.sections[0]).toMatchObject({
      title: "模型综合分析"
    });
  });

  it("falls back to safe deterministic copy when the AI provider returns unsafe wording", async () => {
    const service = await loadIsolatedService();
    service.setLessonLedgerAiProviderForTest({
      async generateFeedback() {
        return "孩子基础很差，我保证提分。";
      },
      async generateStudyReport() {
        return {
          summary: "孩子基础很差，家长必须马上加练。",
          sections: [
            {
              title: "风险",
              body: "保证提分。"
            }
          ],
          suggestions: ["保证提分"]
        };
      }
    });

    const feedbackSnapshot = await service.runLessonLedgerActionAsync(
      action({
        action: "generateFeedback",
        payload: {
          lessonId: "l3",
          content: "二次函数最值与应用题建模",
          state: "审题比上次稳定，配方步骤还需要更完整",
          homework: "五道二次函数应用题"
        }
      })
    );
    const draft = feedbackSnapshot.feedbackDrafts.find((item) => item.lessonId === "l3");
    expect(draft?.body).toContain("二次函数最值与应用题建模");
    expect(draft?.body).not.toContain("基础很差");
    expect(draft?.body).not.toContain("保证提分");

    const reportSnapshot = await service.runLessonLedgerActionAsync(
      action({
        action: "generateStudyReport",
        payload: {
          studentId: "s1",
          teacherNotes: "继续观察"
        }
      })
    );
    const report = reportSnapshot.reports.find((item) => item.studentId === "s1" && item.status === "待生成");
    expect(report?.summary).not.toContain("基础很差");
    expect(report?.sections.map((section) => section.body).join(" ")).not.toContain("保证提分");
  });

  it("validates feedback inputs, avoids hardcoded subject copy, and blocks unsafe publish wording", async () => {
    const service = await loadIsolatedService();

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "generateFeedback",
          payload: {
            lessonId: "l3",
            content: "函数",
            state: "状态稳定",
            homework: ""
          }
        })
      )
    ).toThrow("本次上课内容需为 10-1000 字");

    const draftSnapshot = service.runLessonLedgerAction(
      action({
        action: "generateFeedback",
        payload: {
          lessonId: "l3",
          content: "二次函数最值与应用题建模",
          state: "审题比上次稳定，配方步骤还需要更完整",
          homework: "五道二次函数应用题"
        }
      })
    );
    const draft = draftSnapshot.feedbackDrafts.find((item) => item.lessonId === "l3");
    expect(draft?.body).toContain("二次函数最值与应用题建模");
    expect(draft?.body).toContain("读题审题");
    expect(draft?.body).not.toContain("离心率");
    expect(draft?.body).not.toContain("取值范围");

    expect(() =>
      service.runLessonLedgerAction(
        action({
          action: "publishFeedback",
          payload: {
            lessonId: "l3",
            feedbackText: "孩子基础很差，但只要继续上课我保证提分。"
          }
        })
      )
    ).toThrow("反馈中有不适合发给家长的表达");
  });
});
