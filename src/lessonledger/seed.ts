import type { LessonLedgerSnapshot } from "./types";

export function createLessonLedgerSeed(): LessonLedgerSnapshot {
  return {
    teacher: {
      id: "t-qrane",
      name: "Qrane老师",
      account: "admin",
      studioName: "Kin 数学工作室",
      subject: "初高中数学",
      city: "杭州",
      teacherIntro: "专注初高中数学一对一与小班课，提供课后反馈、阶段报告和预约排课服务。",
      parentDisplayNote: "学生绑定后可查看最近反馈、学习报告、预约课程和发起家校沟通。",
      authCode: "KIN-TRY-2026",
      authorizationStatus: "已授权",
      serviceExpiresAt: "2027/6/12 16:01:00",
      version: "1.0.11"
    },
    updateState: {
      status: "未检查",
      latestVersion: "1.0.12",
      checkedAt: "2026/6/13 00:13:47",
      notes: ["优化假期预约冲突处理和连续排课", "新增学习报告家长端可见性控制", "更新保留课程、课时流水和家庭账号数据"]
    },
    students: [
      {
        id: "s1",
        name: "李三",
        grade: "高二",
        parent: "李三家长",
        teacherId: "t-qrane",
        remainingLessons: 13,
        latestScore: "89 / 120",
        focus: "圆锥曲线取值范围"
      },
      {
        id: "s2",
        name: "王小满",
        grade: "初三",
        parent: "王小满家长",
        teacherId: "t-qrane",
        remainingLessons: 12,
        latestScore: "105 / 120",
        focus: "二次函数压轴题"
      },
      {
        id: "s3",
        name: "陈雨",
        grade: "高一",
        parent: "陈雨家长",
        teacherId: "t-qrane",
        remainingLessons: 9,
        latestScore: "76 / 100",
        focus: "函数单调性与参数"
      }
    ],
    classes: [
      {
        id: "c1",
        name: "高二数学小班",
        subject: "圆锥曲线专题",
        teacherId: "t-qrane",
        focus: "圆锥曲线离心率",
        members: [
          { studentId: "cm1", name: "赵一鸣", grade: "高二", remainingLessons: 16, lastStatus: "出勤", focus: "直线与圆综合" },
          { studentId: "cm2", name: "钱小夏", grade: "高二", remainingLessons: 14, lastStatus: "迟到", focus: "椭圆标准方程" },
          { studentId: "cm3", name: "孙子墨", grade: "高二", remainingLessons: 11, lastStatus: "请假", focus: "双曲线离心率" },
          { studentId: "s1", name: "李三", grade: "高二", remainingLessons: 13, lastStatus: "出勤", focus: "取值范围讨论" },
          { studentId: "cm5", name: "周可", grade: "高二", remainingLessons: 13, lastStatus: "出勤", focus: "计算准确率" },
          { studentId: "cm6", name: "吴越", grade: "高二", remainingLessons: 10, lastStatus: "缺席", focus: "参数分类讨论" }
        ]
      }
    ],
    lessons: [
      {
        id: "l1",
        date: "06-20",
        day: "周六",
        start: "08:00",
        end: "10:00",
        student: "李三",
        subject: "高中数学",
        kind: "一对一",
        status: "已上课",
        price: 320,
        balanceChange: -1,
        feedbackStatus: "待反馈"
      },
      {
        id: "l2",
        date: "06-20",
        day: "周六",
        start: "10:30",
        end: "12:00",
        student: "高二数学小班",
        subject: "圆锥曲线专题",
        kind: "班课",
        status: "待点名",
        price: 960,
        balanceChange: -1,
        feedbackStatus: "未生成"
      },
      {
        id: "l3",
        date: "06-20",
        day: "周六",
        start: "14:30",
        end: "16:00",
        student: "王小满",
        subject: "初三数学",
        kind: "一对一",
        status: "待上课",
        price: 260,
        balanceChange: -1,
        feedbackStatus: "未生成"
      },
      {
        id: "l4",
        date: "06-20",
        day: "周六",
        start: "18:00",
        end: "19:30",
        student: "陈雨",
        subject: "高中数学",
        kind: "一对一",
        status: "待上课",
        price: 300,
        balanceChange: -1,
        feedbackStatus: "未生成"
      },
      {
        id: "l5",
        date: "06-20",
        day: "周六",
        start: "16:00",
        end: "17:30",
        student: "李三",
        subject: "高中数学",
        kind: "一对一",
        status: "待上课",
        price: 320,
        balanceChange: -1,
        feedbackStatus: "未生成"
      }
    ],
    attendanceRecords: [],
    openSlots: [
      { date: "06-20", day: "周六", start: "08:00", end: "22:00" },
      { date: "06-21", day: "周日", start: "08:00", end: "22:00" }
    ],
    bookings: [
      {
        id: "b1",
        student: "李三",
        date: "06-20",
        day: "周六",
        start: "10:30",
        end: "12:30",
        status: "冲突",
        conflictNote: "与 10:30-12:00 高二数学小班冲突"
      },
      {
        id: "b2",
        student: "王小满",
        date: "06-21",
        day: "周日",
        start: "08:00",
        end: "10:00",
        status: "待审核"
      }
    ],
    scores: [
      { studentId: "s1", studentName: "李三", exam: "入门小测", date: "06-10", score: "82 / 100", rank: "8 / 36", note: "解析几何选择题稳定，计算题扣分较多" },
      { studentId: "s1", studentName: "李三", exam: "周测 12", date: "06-14", score: "89 / 120", rank: "6 / 36", note: "离心率模型掌握较好，取值范围仍有漏判" },
      { studentId: "s1", studentName: "李三", exam: "专题检测", date: "06-18", score: "93 / 120", rank: "5 / 36", note: "大题前两问完成度提升，压轴尾问需要拆条件" },
      { studentId: "s2", studentName: "王小满", exam: "函数综合测", date: "06-12", score: "105 / 120", rank: "3 / 32", note: "二次函数压轴题前两问稳定，分类讨论仍需压实" },
      { studentId: "s3", studentName: "陈雨", exam: "函数单调性小测", date: "06-16", score: "76 / 100", rank: "10 / 28", note: "参数题读题速度提升，符号变形还需巩固" }
    ],
    weaknesses: [
      { studentId: "s1", studentName: "李三", tag: "圆锥曲线离心率", level: "高频", source: "最近 3 次作业", action: "先补条件转化，再做综合小题" },
      { studentId: "s1", studentName: "李三", tag: "取值范围讨论", level: "重点", source: "入门小测第 6 题", action: "下次课安排 20 分钟专项讲解" },
      { studentId: "s1", studentName: "李三", tag: "计算准确率", level: "中频", source: "课堂反馈", action: "每日 5 题限时训练" },
      { studentId: "s2", studentName: "王小满", tag: "二次函数压轴分类", level: "重点", source: "函数综合测", action: "先复盘顶点式与判别式，再做压轴前两问" },
      { studentId: "s3", studentName: "陈雨", tag: "参数与单调性", level: "高频", source: "函数单调性小测", action: "下次课补参数范围图像法，减少符号失误" }
    ],
    financeEvents: [
      { date: "06-02", studentId: "s1", studentName: "李三", action: "充值", amount: "+15 课时", cashAmount: "¥6,400", balance: "15 课时", note: "家长转账确认" },
      { date: "06-10", studentId: "s1", studentName: "李三", action: "扣课", amount: "-1 课时", balance: "14 课时", note: "入门小测讲评" },
      { date: "06-14", studentId: "s1", studentName: "李三", action: "扣课", amount: "-1 课时", balance: "13 课时", note: "圆锥曲线专题" },
      { date: "06-16", studentId: "s2", studentName: "王小满", action: "充值", amount: "+15 课时", cashAmount: "¥4,850", balance: "18 课时", note: "暑期续费确认" },
      { date: "06-18", studentId: "s1", studentName: "李三", action: "撤销", amount: "+1 课时", cashAmount: "¥0", balance: "14 课时", note: "临时请假未扣课" },
      { date: "06-20", studentId: "s1", studentName: "李三", action: "扣课", amount: "-1 课时", balance: "13 课时", note: "课堂完成后自动记录" }
    ],
    messageThreads: [
      {
        id: "m1",
        parent: "李三家长",
        student: "李三",
        title: "想让老师讲讲取值范围的问题",
        issueType: "反馈",
        linkedLesson: "06-20 圆锥曲线离心率反馈",
        status: "已确认",
        messages: [
          {
            from: "parent",
            body: "孩子的离心率问题涉及到取值范围还不太会，想请老师下次课重点讲讲。",
            time: "14:12"
          },
          {
            from: "teacher",
            body: "好的家长，下次课我们会安排对应的内容。",
            time: "14:18"
          }
        ]
      }
    ],
    familyInvites: [
      {
        id: "fi-s1",
        token: "b3a5f55cc8da67a1020b0e88d1126ce5716c88f4e4cf3cf69dafd4000624a047",
        studentId: "s1",
        studentName: "李三",
        parentName: "李三家长",
        status: "待激活",
        inviteLink: "/portal/invite?token=b3a5f55cc8da67a1020b0e88d1126ce5716c88f4e4cf3cf69dafd4000624a047",
        createdAt: "2026-06-20T13:20:00+08:00",
        expiresAt: "2026-06-22T13:20:00+08:00"
      }
    ],
    reports: [
      {
        id: "r-s1-202606",
        studentId: "s1",
        title: "李三 6 月阶段学习报告",
        status: "已保存",
        period: "2026-06-10 至 2026-06-20",
        summary: "根据最近三次成绩、圆锥曲线专题反馈和薄弱点记录生成。",
        parentSummary: "李三本阶段圆锥曲线模型识别有进步，成绩整体向上；当前主要卡点是离心率题里的取值范围讨论和计算准确率。后续会把取值范围拆条件、综合小题限时训练作为重点。",
        sources: ["最近三次考试", "圆锥曲线课堂反馈", "薄弱点记录"],
        scoreTrend: [
          { exam: "入门小测", date: "06-10", score: "82 / 100", rank: "8 / 36", note: "解析几何选择题稳定，计算题扣分较多" },
          { exam: "周测 12", date: "06-14", score: "89 / 120", rank: "6 / 36", note: "离心率模型掌握较好，取值范围仍有漏判" },
          { exam: "专题检测", date: "06-18", score: "93 / 120", rank: "5 / 36", note: "大题前两问完成度提升，压轴尾问需要拆条件" }
        ],
        weaknessSummary: [
          { tag: "圆锥曲线离心率", level: "高频", action: "先补条件转化，再做综合小题" },
          { tag: "取值范围讨论", level: "重点", action: "下次课安排 20 分钟专项讲解" },
          { tag: "计算准确率", level: "中频", action: "每日 5 题限时训练" }
        ],
        feedbackHighlights: ["06-20 课程反馈：离心率模型识别稳定，但取值范围讨论仍需专项巩固。"],
        sections: [
          { title: "近期表现", body: "李三近期在圆锥曲线专题上的模型识别能力有所提升，能较快找到离心率相关条件。" },
          { title: "成绩波动", body: "最近三次检测整体呈上升趋势，说明基础模型与常见题型正在稳定。" },
          { title: "当前薄弱点", body: "主要问题集中在取值范围讨论、条件拆解和计算准确率，需要继续专项练习。" }
        ],
        suggestions: ["下次课安排取值范围专项讲解。", "课后完成 7 道圆锥曲线综合小题。", "每次练习后单独复盘计算过程。"],
        dataQuality: "数据充足",
        visibleToParent: true,
        createdAt: "2026-06-20T13:40:00+08:00",
        savedAt: "2026-06-20T13:45:00+08:00"
      }
    ],
    feedbackDrafts: [],
    featureRequests: []
  };
}
