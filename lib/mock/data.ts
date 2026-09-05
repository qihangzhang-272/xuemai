export type Student = {
  id: string;
  name: string;
  grade: string;
  subject: string;
  classId?: string;
  className: string;
  level: string;
  coreIssue: string;
  currentState: string;
  wechatFeedbackStatus: WechatFeedbackStatus;
  latestScoreSummary: string;
  goal: string;
  parent: string;
  lastLesson: string;
  nextAction: string;
  tags: string[];
};

export type WechatFeedbackStatus = "needs_feedback" | "feedback_done" | "no_submission";

export type ClassGroup = {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  studentCount: number;
  focus: string;
  taskSummary: string;
  studentIds: string[];
};

export type Activity = {
  id: string;
  title: string;
  description: string;
  time: string;
};

export type LessonRecord = {
  id: string;
  date: string;
  topic: string;
  summary: string;
};

export type WrongQuestion = {
  id: string;
  point: string;
  reason: string;
  suggestion: string;
};

export type ReportSummary = {
  id: string;
  studentId: string;
  studentName: string;
  month: string;
  title: string;
  status: "ready" | "draft" | "empty";
  summary: string;
};

export type ReportDetail = ReportSummary & {
  highlights: string[];
  sections: {
    title: string;
    content: string;
  }[];
};

export type AgentKind = "feedback" | "wrong-question" | "monthly-report" | "archive" | "script" | "class";

export type AgentDefinition = {
  id: AgentKind;
  name: string;
  shortName: string;
  description: string;
  primaryTask: string;
  href: string;
  status: "ready" | "demo";
};

export type AgentTaskStepStatus = "done" | "active" | "waiting" | "queued";

export type AgentTaskStep = {
  id: string;
  title: string;
  description: string;
  status: AgentTaskStepStatus;
};

export type ActiveAgentTask = {
  id: string;
  title: string;
  agentName: string;
  command: string;
  context: string;
  progressLabel: string;
  steps: AgentTaskStep[];
  confirmations: {
    id: string;
    question: string;
    options: string[];
  }[];
  resultPreview: string;
  archiveTarget: string;
};

export type AgentArtifact = {
  id: string;
  title: string;
  agentName: string;
  studentName: string;
  time: string;
  summary: string;
  status: "ready" | "saved" | "needs-review";
};

export type AgentContextItem = {
  label: string;
  value: string;
  detail: string;
};

export type DemoTaskStatus = "执行中" | "待审核" | "已完成";

export type DemoExecutionStatus = "已完成" | "进行中" | "等待中";

export type DemoAgentTask = {
  id: string;
  title: string;
  status: DemoTaskStatus;
  agentType: string;
  className: string;
  courseTopic: string;
  relatedStudents: string[];
  goal: string;
  outputFormat: string;
  currentProgress: string;
  usedMaterials: string[];
  steps: {
    id: string;
    title: string;
    status: DemoExecutionStatus;
  }[];
  logs: {
    id: string;
    time: string;
    content: string;
  }[];
  confirmationQuestions: {
    id: string;
    question: string;
    options: string[];
  }[];
  generatedResults: {
    studentName: string;
    content: string;
  }[];
};

export const students: Student[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "测试学生A",
    grade: "初二",
    subject: "数学",
    className: "Phase 4.5 测试班",
    classId: "22222222-2222-4222-8222-222222222222",
    level: "能理解课堂讲解，独立做题时需要加强条件整理",
    coreIssue: "一次函数应用题容易漏掉取值范围",
    currentState: "待生成微信反馈",
    wechatFeedbackStatus: "needs_feedback",
    latestScoreSummary: "核心问题：一次函数取值范围 · 当前状态：待生成微信反馈",
    goal: "稳定一次函数应用题审题和取值范围表达",
    parent: "测试家长",
    lastLesson: "2026-06-08",
    nextAction: "训练审题时先圈出限制条件，再列式解决",
    tags: ["一次函数", "审题条件", "取值范围"]
  },
  {
    id: "demo-student-1",
    name: "林一诺",
    grade: "五年级",
    subject: "数学",
    className: "周三数学提升班",
    level: "基础稳定，应用题易漏条件",
    coreIssue: "审题弱",
    currentState: "待生成微信反馈",
    wechatFeedbackStatus: "needs_feedback",
    latestScoreSummary: "核心问题：审题弱 · 当前状态：待生成微信反馈",
    goal: "提升分数应用题读题和列式能力",
    parent: "林妈妈",
    lastLesson: "2026-05-28",
    nextAction: "下次课继续训练单位 1 判断",
    tags: ["应用题", "审题", "计算"]
  },
  {
    id: "demo-student-2",
    name: "周予安",
    grade: "初一",
    subject: "英语",
    className: "一对一英语阅读",
    level: "词汇量尚可，长难句拆分不稳",
    coreIssue: "定位慢",
    currentState: "已生成微信反馈",
    wechatFeedbackStatus: "feedback_done",
    latestScoreSummary: "核心问题：定位慢 · 当前状态：已生成微信反馈",
    goal: "提升阅读细节定位和段落主旨判断",
    parent: "周爸爸",
    lastLesson: "2026-05-26",
    nextAction: "复盘阅读错题中的定位依据",
    tags: ["阅读", "长难句", "词汇"]
  },
  {
    id: "demo-student-3",
    name: "陈星河",
    grade: "四年级",
    subject: "数学",
    className: "周三数学提升班",
    level: "计算速度快，但步骤表达不完整",
    coreIssue: "书写散",
    currentState: "暂无练习提交",
    wechatFeedbackStatus: "no_submission",
    latestScoreSummary: "核心问题：书写散 · 当前状态：暂无练习提交",
    goal: "养成规范书写和检查习惯",
    parent: "陈妈妈",
    lastLesson: "2026-05-24",
    nextAction: "建立错题订正模板",
    tags: ["计算", "书写", "订正"]
  },
  {
    id: "demo-student-4",
    name: "许知夏",
    grade: "五年级",
    subject: "数学",
    className: "周三数学提升班",
    level: "概念理解较快，步骤检查不够稳定",
    coreIssue: "检查少",
    currentState: "已生成微信反馈",
    wechatFeedbackStatus: "feedback_done",
    latestScoreSummary: "核心问题：检查少 · 当前状态：已生成微信反馈",
    goal: "提高应用题步骤完整度",
    parent: "许妈妈",
    lastLesson: "2026-05-29",
    nextAction: "保留错题复盘中的检查步骤",
    tags: ["应用题", "检查", "表达"]
  },
  {
    id: "demo-student-5",
    name: "顾清越",
    grade: "五年级",
    subject: "数学",
    className: "周三数学提升班",
    level: "计算基础较好，读题速度偏快",
    coreIssue: "漏条件",
    currentState: "待生成微信反馈",
    wechatFeedbackStatus: "needs_feedback",
    latestScoreSummary: "核心问题：漏条件 · 当前状态：待生成微信反馈",
    goal: "稳定多条件题读题流程",
    parent: "顾爸爸",
    lastLesson: "2026-05-29",
    nextAction: "本次微信反馈待生成",
    tags: ["读题", "条件", "应用题"]
  },
  {
    id: "demo-student-6",
    name: "沈南星",
    grade: "五年级",
    subject: "数学",
    className: "周三数学提升班",
    level: "课堂互动积极，订正需要更细",
    coreIssue: "订正浅",
    currentState: "暂无练习提交",
    wechatFeedbackStatus: "no_submission",
    latestScoreSummary: "核心问题：订正浅 · 当前状态：暂无练习提交",
    goal: "建立错题订正和复述习惯",
    parent: "沈妈妈",
    lastLesson: "2026-05-22",
    nextAction: "等待本次练习记录",
    tags: ["订正", "表达", "复盘"]
  },
  {
    id: "demo-student-7",
    name: "陆景行",
    grade: "初一",
    subject: "英语",
    className: "一对一英语阅读",
    level: "词汇记忆稳定，推断题需要训练",
    coreIssue: "推断弱",
    currentState: "暂无练习提交",
    wechatFeedbackStatus: "no_submission",
    latestScoreSummary: "核心问题：推断弱 · 当前状态：暂无练习提交",
    goal: "提升阅读推断和选项辨析",
    parent: "陆妈妈",
    lastLesson: "2026-05-18",
    nextAction: "下次课补充测验记录",
    tags: ["阅读", "推断", "选项"]
  },
  {
    id: "demo-student-8",
    name: "叶安然",
    grade: "初一",
    subject: "英语",
    className: "一对一英语阅读",
    level: "课堂表达主动，细节题易受干扰项影响",
    coreIssue: "辨析弱",
    currentState: "待生成微信反馈",
    wechatFeedbackStatus: "needs_feedback",
    latestScoreSummary: "核心问题：辨析弱 · 当前状态：待生成微信反馈",
    goal: "提升细节定位和干扰项排除能力",
    parent: "叶爸爸",
    lastLesson: "2026-05-30",
    nextAction: "整理本次阅读测验错题",
    tags: ["阅读", "细节", "干扰项"]
  }
];

export const classes: ClassGroup[] = [
  {
    id: "class-1",
    name: "周三数学提升班",
    subject: "数学",
    schedule: "每周三 19:00",
    studentCount: 5,
    focus: "分数应用题、计算稳定性",
    taskSummary: "2 人待生成反馈 · 2 人暂无练习提交",
    studentIds: ["demo-student-1", "demo-student-3", "demo-student-4", "demo-student-5", "demo-student-6"]
  },
  {
    id: "class-2",
    name: "一对一英语阅读",
    subject: "英语",
    schedule: "每周六 10:00",
    studentCount: 3,
    focus: "阅读理解、词汇复盘",
    taskSummary: "1 人待生成反馈 · 1 人暂无练习提交",
    studentIds: ["demo-student-2", "demo-student-7", "demo-student-8"]
  }
];

export const agentDefinitions: AgentDefinition[] = [
  {
    id: "feedback",
    name: "反馈 Agent",
    shortName: "反馈",
    description: "根据课堂表现、作业和错题，生成家长微信反馈。",
    primaryTask: "给今天上课的学生生成微信反馈",
    href: "/students/demo-student-1/feedback/new",
    status: "ready"
  },
  {
    id: "wrong-question",
    name: "错题 Agent",
    shortName: "错题",
    description: "整理错题知识点、错误原因和后续训练建议。",
    primaryTask: "分析本次练习里的薄弱知识点",
    href: "/students/demo-student-1",
    status: "demo"
  },
  {
    id: "monthly-report",
    name: "月报 Agent",
    shortName: "月报",
    description: "汇总一个月的记录，生成学习报告和下月建议。",
    primaryTask: "生成本月学生学习报告",
    href: "/reports",
    status: "demo"
  },
  {
    id: "archive",
    name: "档案 Agent",
    shortName: "档案",
    description: "把课堂记录、反馈和错题整理进学生长期档案。",
    primaryTask: "整理最近一周学生学习记录",
    href: "/students",
    status: "demo"
  },
  {
    id: "script",
    name: "话术 Agent",
    shortName: "话术",
    description: "把老师判断转成家长更容易接受的微信话术。",
    primaryTask: "润色一段家长沟通话术",
    href: "/settings",
    status: "demo"
  },
  {
    id: "class",
    name: "班级 Agent",
    shortName: "班级",
    description: "批量处理班级反馈、月报和重点学生跟进。",
    primaryTask: "处理周三数学提升班待反馈学生",
    href: "/classes",
    status: "demo"
  }
];

export const activeAgentTask: ActiveAgentTask = {
  id: "task-feedback-class-1",
  title: "给周三数学提升班生成家长反馈",
  agentName: "反馈 Agent",
  command: "帮我给周三数学提升班今天上课的学生生成家长反馈，语气专业一点，但不要太像报告。",
  context: "周三数学提升班 · 5 位学生 · 2 位待生成反馈",
  progressLabel: "正在等待老师确认 2 条课堂信息",
  steps: [
    {
      id: "step-1",
      title: "读取班级名单",
      description: "已匹配周三数学提升班 5 位学生和本次待处理状态。",
      status: "done"
    },
    {
      id: "step-2",
      title: "调用学生档案",
      description: "已读取最近练习记录、错题沉淀和上次微信反馈语气。",
      status: "done"
    },
    {
      id: "step-3",
      title: "确认课堂细节",
      description: "有 2 位学生缺少作业完成情况，需要老师补一句判断。",
      status: "active"
    },
    {
      id: "step-4",
      title: "生成反馈草稿",
      description: "确认后生成可复制到微信的家长反馈，并保留档案素材。",
      status: "queued"
    }
  ],
  confirmations: [
    {
      id: "confirm-1",
      question: "林一诺今天作业订正是否完成？",
      options: ["已完成，但单位 1 判断还需提醒", "未完成，先不写进反馈"]
    },
    {
      id: "confirm-2",
      question: "顾清越本次课堂表现更适合怎么描述？",
      options: ["读题有进步，但仍会漏条件", "表现稳定，反馈重点放在训练安排"]
    }
  ],
  resultPreview:
    "林一诺妈妈您好，今天这节课我们重点处理分数应用题里的单位 1 判断。孩子基础计算比较稳定，但遇到多条件题时仍需要先圈关键词，再确认比较对象。后面我会继续带她把读题流程固定下来，避免直接列式导致漏条件。",
  archiveTarget: "将保存为：林一诺 · 2026-06-05 课堂反馈记录"
};

export const demoAgentTasks: DemoAgentTask[] = [
  {
    id: "demo-feedback-task",
    title: "初二数学 A 班课后反馈生成",
    status: "执行中",
    agentType: "反馈 Agent",
    className: "初二数学 A 班",
    courseTopic: "一次函数应用题",
    relatedStudents: ["王一路", "李明轩", "张子涵", "陈思远", "刘雨桐", "赵若溪", "孙嘉禾", "何沐阳"],
    goal: "为初二数学 A 班今天上课的 8 位学生生成家长微信反馈。要求语气温和、具体、有鼓励，不要太官方。",
    outputFormat: "微信短反馈，每位学生 80 - 120 字，包含表现、问题、建议、鼓励。",
    currentProgress: "正在分析学生近期薄弱点",
    usedMaterials: ["今日课堂记录", "历史错题记录", "上次家长反馈", "老师补充备注", "班级默认反馈模板"],
    steps: [
      { id: "task-step-1", title: "已读取班级学生名单", status: "已完成" },
      { id: "task-step-2", title: "已整理今日课堂记录", status: "已完成" },
      { id: "task-step-3", title: "已匹配每位学生历史错题", status: "已完成" },
      { id: "task-step-4", title: "正在分析学生近期薄弱点", status: "进行中" },
      { id: "task-step-5", title: "正在生成个性化家长反馈", status: "等待中" },
      { id: "task-step-6", title: "等待老师审核", status: "等待中" }
    ],
    logs: [
      { id: "log-1", time: "10:21", content: "已读取初二数学 A 班 8 位学生。" },
      { id: "log-2", time: "10:22", content: "发现王一路近期一次函数错误较多。" },
      { id: "log-3", time: "10:22", content: "发现陈思远作业完成率下降。" },
      { id: "log-4", time: "10:23", content: "正在生成每位学生的个性化反馈。" }
    ],
    confirmationQuestions: [
      {
        id: "question-homework",
        question: "李明轩今天作业是否完成？",
        options: ["已完成", "部分完成", "未完成", "跳过"]
      },
      {
        id: "question-performance",
        question: "王一路今天课堂表现如何？",
        options: ["积极", "一般", "走神", "自定义输入"]
      }
    ],
    generatedResults: [
      {
        studentName: "王一路",
        content:
          "今天王一路整体表现不错，能跟上课堂节奏，但在一次函数应用题中仍然容易漏掉题干条件。建议这周重点练习“读题标条件”和“建立函数关系”两类题型。整体状态比上次更稳定，继续保持。"
      },
      {
        studentName: "李明轩",
        content:
          "今天李明轩课堂状态比较稳定，作业完成情况较好，对一次函数基础题的掌握比较扎实。接下来可以适当增加应用题训练，重点关注题干条件和变量关系的表达。"
      },
      {
        studentName: "张子涵",
        content:
          "今天张子涵课堂参与度比之前更好，能够主动回答问题，这是一个很好的进步。一次函数应用题还需要继续加强审题和关系式建立，建议本周保持基础题训练。"
      },
      {
        studentName: "陈思远",
        content:
          "今天陈思远需要重点关注作业完成情况。课堂上能理解基本方法，但课后练习跟进不足，容易导致知识点不稳定。建议家长这周帮助关注作业完成节奏。"
      },
      {
        studentName: "刘雨桐",
        content:
          "今天刘雨桐整体表现稳定，计算准确率有所提升。一次函数基础题完成较好，后续可以适当加强应用题中的条件提取和表达能力。"
      }
    ]
  },
  {
    id: "demo-report-task",
    title: "王一路 5 月学习报告",
    status: "待审核",
    agentType: "月报 Agent",
    className: "初二数学 A 班",
    courseTopic: "5 月学习总结",
    relatedStudents: ["王一路"],
    goal: "基于王一路 5 月课堂记录、错题分析和家长反馈，生成家长版月度学习报告。",
    outputFormat: "家长版月度学习报告，包含学习表现、薄弱点、进步点和下月建议。",
    currentProgress: "已生成，等待老师审核",
    usedMaterials: ["5 月课堂记录", "历史错题记录", "家长反馈历史", "老师备注"],
    steps: [
      { id: "report-step-1", title: "已读取学生 5 月学习记录", status: "已完成" },
      { id: "report-step-2", title: "已整理错题和薄弱点", status: "已完成" },
      { id: "report-step-3", title: "等待老师审核月报草稿", status: "进行中" }
    ],
    logs: [
      { id: "report-log-1", time: "11:04", content: "已读取王一路 5 月课堂记录。" },
      { id: "report-log-2", time: "11:05", content: "已生成月度报告草稿。" }
    ],
    confirmationQuestions: [
      {
        id: "report-question-1",
        question: "是否把本月一次函数错题作为月报重点？",
        options: ["作为重点", "只简单提及", "暂不写入"]
      }
    ],
    generatedResults: [
      {
        studentName: "王一路",
        content:
          "王一路 5 月整体学习状态稳定，但一次函数应用题中的条件提取仍需重点训练。建议下月继续围绕读题标注、函数关系建模和表达完整度进行短频练习。"
      }
    ]
  }
];

export const taskListItems = demoAgentTasks.map((task) => ({
  id: task.id,
  title: task.title,
  status: task.status,
  agentType: task.agentType,
  description: task.currentProgress,
  href: `/tasks/${task.id}`
}));

export const recentAgentArtifacts: AgentArtifact[] = [
  {
    id: "artifact-1",
    title: "林一诺微信反馈草稿",
    agentName: "反馈 Agent",
    studentName: "林一诺",
    time: "今天 20:10",
    summary: "已沉淀为课堂记录，并作为 6 月月报素材。",
    status: "saved"
  },
  {
    id: "artifact-2",
    title: "周予安阅读错题分析",
    agentName: "错题 Agent",
    studentName: "周予安",
    time: "昨天 18:30",
    summary: "定位句和选项改写关系需要继续训练。",
    status: "needs-review"
  },
  {
    id: "artifact-3",
    title: "陈星河 5 月月报",
    agentName: "月报 Agent",
    studentName: "陈星河",
    time: "周一",
    summary: "等待老师审核后发送给家长。",
    status: "ready"
  }
];

export const agentContextItems: AgentContextItem[] = [
  {
    label: "当前班级",
    value: "周三数学提升班",
    detail: "5 位学生，2 位待反馈，2 位暂无练习提交。"
  },
  {
    label: "档案记忆",
    value: "18 条记录",
    detail: "包含课堂记录、错题、反馈和月度总结素材。"
  },
  {
    label: "常用语气",
    value: "专业、克制、给家长可执行建议",
    detail: "后续会进入老师 AI 输出偏好。"
  }
];

export const activities: Activity[] = [
  {
    id: "activity-1",
    title: "林一诺完成微信反馈草稿",
    description: "本次练习围绕分数应用题的单位 1 判断展开。",
    time: "今天 20:10"
  },
  {
    id: "activity-2",
    title: "周予安新增阅读错题",
    description: "微信反馈素材占位：定位句和选项改写关系需要加强。",
    time: "昨天 18:30"
  },
  {
    id: "activity-3",
    title: "陈星河月度总结等待生成",
    description: "本月已沉淀 4 次练习记录和 6 条错题。",
    time: "周一"
  }
];

export const lessonRecords: LessonRecord[] = [
  {
    id: "lesson-1",
    date: "2026-05-28",
    topic: "分数应用题：单位 1 判断",
    summary: "能说出基础题思路，遇到多条件题时需要先圈关键词再列式。"
  },
  {
    id: "lesson-2",
    date: "2026-05-21",
    topic: "分数乘除混合应用",
    summary: "计算正确率提升，题意转换仍需要老师提示。"
  }
];

export const wrongQuestions: WrongQuestion[] = [
  {
    id: "wrong-1",
    point: "单位 1 判断",
    reason: "看到分数后直接计算，没有先确认比较对象。",
    suggestion: "每道题先写出“谁是单位 1”，再进入列式。"
  },
  {
    id: "wrong-2",
    point: "条件筛选",
    reason: "题目里有多个数量关系时容易漏读后半句。",
    suggestion: "用划线法标出已知量、问题和隐藏条件。"
  }
];

export const reports: ReportDetail[] = [
  {
    id: "report-2026-05-linyi",
    studentId: "demo-student-1",
    studentName: "林一诺",
    month: "2026-05",
    title: "林一诺 5 月月度总结",
    status: "draft",
    summary: "基于 6 次练习记录和 8 条错题沉淀，等待整理为正式反馈。",
    highlights: ["分数应用题读题意识开始建立", "计算稳定性保持良好", "单位 1 判断仍需专项复盘"],
    sections: [
      {
        title: "练习表现",
        content: "本月练习基础题表现稳定。遇到多条件应用题时，需要继续训练先圈关键词再列式。"
      },
      {
        title: "错题沉淀",
        content: "主要集中在单位 1 判断和条件筛选，建议下月保留固定订正模板。"
      },
      {
        title: "下月建议",
        content: "继续围绕分数应用题做短频训练，每次反馈保留 1 个核心问题，避免任务过散。"
      }
    ]
  },
  {
    id: "report-2026-05-zhouyuan",
    studentId: "demo-student-2",
    studentName: "周予安",
    month: "2026-05",
    title: "周予安 5 月月度总结",
    status: "empty",
    summary: "月度总结入口占位，后续将基于阅读测验错题、微信反馈和练习记录生成。",
    highlights: ["阅读细节定位需要持续复盘", "长难句拆分已有记录", "等待月底统一整理"],
    sections: [
      {
        title: "月度总结占位",
        content: "当前仅展示月度总结详情页结构，不调用 AI，不生成正式总结。"
      }
    ]
  }
];

export function getStudentById(id: string) {
  return students.find((student) => student.id === id) ?? students[0];
}

export function getStudentsByClass(classGroup: ClassGroup) {
  return classGroup.studentIds
    .map((studentId) => students.find((student) => student.id === studentId))
    .filter((student): student is Student => Boolean(student));
}

export function getReportById(id: string) {
  return reports.find((report) => report.id === id) ?? reports[0];
}

export function getDemoAgentTaskById(id: string) {
  return demoAgentTasks.find((task) => task.id === id) ?? demoAgentTasks[0];
}
