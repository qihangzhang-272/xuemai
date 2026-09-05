import type { ClassProfile, DemoTask, StudentProfile } from "./types";

export const demoStudents: StudentProfile[] = [
  {
    id: "student-chen",
    name: "陈子轩",
    grade: "初二",
    className: "学脉中学初二数学班",
    subject: "数学",
    parent: "陈妈妈",
    parentPhone: "138****5678",
    teacher: "李老师",
    focus: "二次函数图像与性质",
    progress: "课堂计算速度提升，应用题审题仍需提醒",
    serviceState: "正常",
    lastService: "今天 09:10",
    evidenceSummary: [
      { label: "课堂记录", count: 2 },
      { label: "课堂笔记", count: 2 },
      { label: "作业分析", count: 1 },
      { label: "家长沟通", count: 1 }
    ],
    timeline: [
      { id: "ct1", date: "今天", time: "09:10", title: "课堂记录", detail: "二次函数与方程，应用题审题步骤仍需提醒", kind: "lesson" },
      { id: "ct2", date: "昨天", time: "20:30", title: "作业分析", detail: "共 12 题，正确率 83%，错题集中在条件转换", kind: "material" },
      { id: "ct3", date: "5月18日", time: "19:45", title: "家长沟通", detail: "沟通复习计划与最近课堂表现", kind: "parent" },
      { id: "ct4", date: "5月17日", time: "10:00", title: "课堂记录", detail: "二次函数图像探索，基础题独立完成", kind: "lesson" }
    ]
  },
  {
    id: "student-wang",
    name: "王思琪",
    grade: "初一",
    className: "初一英语基础班",
    subject: "英语",
    parent: "王思琪妈妈",
    parentPhone: "139****0214",
    teacher: "周老师",
    focus: "阅读理解信息定位",
    progress: "词汇完成稳定，长文本阅读容易拖延",
    serviceState: "待跟进",
    lastService: "昨天 18:40",
    evidenceSummary: [
      { label: "课堂记录", count: 3 },
      { label: "练习材料", count: 4 },
      { label: "家长沟通", count: 2 }
    ],
    timeline: [
      { id: "wt1", date: "今天", time: "08:42", title: "家长消息", detail: "反馈近期回家写作业拖拉，想了解课堂状态", kind: "parent" },
      { id: "wt2", date: "昨天", time: "18:40", title: "课堂记录", detail: "词汇任务完成，阅读后两题未在课内完成", kind: "lesson" },
      { id: "wt3", date: "5月16日", time: "20:15", title: "练习分析", detail: "主旨题稳定，细节定位题出现重复失分", kind: "material" }
    ]
  },
  {
    id: "student-li",
    name: "李明轩",
    grade: "五年级",
    className: "五年级数学提高班",
    subject: "数学",
    parent: "李爸爸",
    parentPhone: "136****3390",
    teacher: "李老师",
    focus: "分数应用题数量关系",
    progress: "基础计算稳定，复杂关系图示不完整",
    serviceState: "正常",
    lastService: "昨天 21:30",
    evidenceSummary: [
      { label: "课堂记录", count: 2 },
      { label: "作业分析", count: 3 },
      { label: "错题订正", count: 2 }
    ],
    timeline: [
      { id: "lt1", date: "昨天", time: "21:30", title: "作业分析", detail: "分数应用题 8 题，2 题数量关系定位错误", kind: "material" },
      { id: "lt2", date: "5月18日", time: "17:20", title: "错题订正", detail: "能够根据提示补出线段图", kind: "material" },
      { id: "lt3", date: "5月16日", time: "16:00", title: "课堂反馈", detail: "已向家长反馈本周重点", kind: "feedback" }
    ]
  },
  {
    id: "student-zhou",
    name: "周梦琪",
    grade: "高一",
    className: "高一物理一对一",
    subject: "物理",
    parent: "周妈妈",
    parentPhone: "137****8850",
    teacher: "赵老师",
    focus: "受力分析与过程表达",
    progress: "最近缺少新的课堂和练习证据",
    serviceState: "需关注",
    lastService: "10天前",
    evidenceSummary: [
      { label: "课堂记录", count: 1 },
      { label: "练习材料", count: 1 },
      { label: "家长沟通", count: 0 }
    ],
    timeline: [
      { id: "zt1", date: "10天前", time: "19:00", title: "课堂记录", detail: "受力分析基本方法，需补充练习验证", kind: "lesson" },
      { id: "zt2", date: "12天前", time: "21:10", title: "练习材料", detail: "材料较少，仅记录可见错误，不形成长期判断", kind: "material" }
    ]
  }
];

export const demoTasks: DemoTask[] = [
  {
    id: "task-feedback-chen",
    kind: "feedback",
    status: "pending_feedback",
    studentId: "student-chen",
    title: "陈子轩 · 今日数学课反馈",
    source: "今日课堂记录",
    preview: "课堂表现良好，计算速度提升，需加强应用题审题。",
    time: "09:15",
    priority: "high",
    draftTitle: "家长反馈（可编辑）",
    summary: "计算速度较上次课堂提升约 12%，基础题能够独立完成；应用题仍有两处漏读条件。",
    teacherSuggestion: "下一节课继续练习审题标记和条件转换，不增加额外打卡任务。",
    draft: "陈子轩妈妈，您好！\n\n今天数学课主要学习了二次函数图像与性质。子轩整体状态不错，计算速度较上次有提升，基础题能够独立完成。应用题中还有两处条件没有完整标记，我已经在课堂上带他重新梳理了审题步骤。\n\n接下来会继续通过同类题巩固条件转换和表达完整性，我也会持续关注他的变化。",
    evidence: [
      { id: "ce1", label: "课堂记录", detail: "二次函数与方程，课堂正确率 85%", time: "09:10", verified: true },
      { id: "ce2", label: "课堂笔记", detail: "已上传 2 张，含老师批改痕迹", time: "09:11", verified: true },
      { id: "ce3", label: "历史练习", detail: "上次同类题正确率 73%", time: "5月18日", verified: true }
    ]
  },
  {
    id: "task-reply-wang",
    kind: "parent_reply",
    status: "pending_reply",
    studentId: "student-wang",
    title: "王思琪妈妈 · 等待回复",
    source: "家长微信消息",
    preview: "老师，思琪最近回家写作业比较拖拉，课堂上也是这样吗？",
    time: "08:42",
    priority: "high",
    draftTitle: "建议回复（可编辑）",
    summary: "已知事实：昨天课堂词汇任务按时完成；阅读理解后两题未在课内完成。是否属于长期拖拉，目前证据不足。",
    teacherSuggestion: "先反馈课堂事实，再说明接下来两次课会继续观察，不直接判断学习态度。",
    draft: "思琪妈妈，您好。昨天课堂上她的词汇任务能按要求完成，阅读理解做到后两题时速度有所下降。仅从这一次课堂还不能判断是习惯问题，我会在接下来两次课继续观察她开始任务和完成长文本阅读的时间，再和您同步。",
    evidence: [
      { id: "we1", label: "家长原话", detail: "最近回家写作业比较拖拉，课堂上也是这样吗？", time: "08:42", verified: true },
      { id: "we2", label: "昨日课堂", detail: "词汇完成，阅读后两题未完成", time: "昨天 18:40", verified: true },
      { id: "we3", label: "待核实", detail: "是否连续多次出现启动困难", time: "需要老师确认", verified: false }
    ]
  },
  {
    id: "task-analysis-li",
    kind: "analysis",
    status: "needs_review",
    studentId: "student-li",
    title: "李明轩 · 作业分析待检查",
    source: "作业照片 4 张",
    preview: "识别到 8 道分数应用题，其中 2 道数量关系定位错误。",
    time: "昨天 21:30",
    priority: "normal",
    draftTitle: "分析结论草稿",
    summary: "本次材料可确认 2 道题在数量关系定位处出现错误；暂不足以判断为长期薄弱点。",
    teacherSuggestion: "检查题目切分和学生答案后，再决定是否加入学生档案。",
    draft: "本次作业共识别 8 道分数应用题。基础计算过程完整；第 5、7 题在确定单位“1”和对应数量时出现偏差。建议下一次练习继续观察是否重复出现，再判断是否形成稳定薄弱点。",
    evidence: [
      { id: "le1", label: "作业照片", detail: "4 张，均有学生作答和老师批改", time: "昨天 21:28", verified: true },
      { id: "le2", label: "题目识别", detail: "8 道题，7 道识别完整，1 道需检查", time: "昨天 21:29", verified: false },
      { id: "le3", label: "历史记录", detail: "上周出现过 1 次相似错误", time: "5月18日", verified: true }
    ]
  },
  {
    id: "task-attention-zhou",
    kind: "attention",
    status: "needs_attention",
    studentId: "student-zhou",
    title: "周梦琪 · 10天无服务记录",
    source: "服务连续性提醒",
    preview: "近 10 天无课堂、作业或家长沟通记录，请确认近期安排。",
    time: "昨天 10:10",
    priority: "high",
    draftTitle: "建议跟进内容",
    summary: "系统只能确认近期没有新的服务记录，不能据此判断学生流失或家长不满。",
    teacherSuggestion: "确认是否停课、请假或记录遗漏；必要时联系家长确认后续安排。",
    draft: "周梦琪妈妈，您好。我们在整理近期学习记录时发现，梦琪最近一段时间没有新的课堂或练习记录，想和您确认一下近期的上课安排是否有调整。您方便时回复我即可。",
    evidence: [
      { id: "ze1", label: "最近课堂", detail: "10 天前：受力分析基本方法", time: "10天前", verified: true },
      { id: "ze2", label: "最近材料", detail: "12 天前：练习照片 1 张", time: "12天前", verified: true },
      { id: "ze3", label: "排课信息", detail: "当前没有可确认的新安排", time: "需人工确认", verified: false }
    ]
  },
  {
    id: "task-reply-zhao",
    kind: "parent_reply",
    status: "pending_reply",
    studentId: "student-li",
    title: "李明轩爸爸 · 等待回复",
    source: "家长微信消息",
    preview: "想了解这周分数应用题的掌握情况。",
    time: "5月18日 20:15",
    priority: "normal",
    draftTitle: "建议回复（可编辑）",
    summary: "本周两次记录显示基础计算稳定，数量关系图示仍需提醒。",
    teacherSuggestion: "使用本周真实材料说明变化，不承诺具体分数提升。",
    draft: "李明轩爸爸，您好。本周两次练习中，明轩的分数计算比较稳定，当前主要需要继续巩固的是复杂题中的数量关系表达。我会在下次课继续让他独立画出关系图，再观察是否能减少定位错误。",
    evidence: [
      { id: "lre1", label: "本周作业", detail: "8 题中 2 题数量关系定位错误", time: "昨天", verified: true },
      { id: "lre2", label: "错题订正", detail: "提示后能够补全线段图", time: "5月18日", verified: true }
    ]
  },
  {
    id: "task-analysis-chen",
    kind: "analysis",
    status: "needs_review",
    studentId: "student-chen",
    title: "陈子轩 · 单元测分析",
    source: "单元测验",
    preview: "最近一次单元测完成，待查看分析结果。",
    time: "5月18日 18:20",
    priority: "normal",
    draftTitle: "分析结论草稿",
    summary: "本次成绩较上次提高，但目前只形成一次测验证据。",
    teacherSuggestion: "检查错题来源后再生成家长反馈。",
    draft: "本次单元测中，陈子轩在基础计算和图像判断部分表现稳定，应用题条件转换仍是主要失分来源。该结论仅基于本次测验，需要结合后续课堂和练习继续观察。",
    evidence: [
      { id: "ca1", label: "单元测验", detail: "共 20 题，得分 89/120", time: "5月18日", verified: true },
      { id: "ca2", label: "老师批改", detail: "有完整批改和得分标记", time: "5月18日", verified: true }
    ]
  }
];

export const demoClasses: ClassProfile[] = [
  {
    id: "class-math-8",
    name: "初二数学提高班",
    subject: "数学",
    teacher: "李老师",
    students: 12,
    pendingFeedback: 3,
    needsAttention: 1,
    recentRecord: "今天 09:10",
    focus: "本周集中在二次函数应用题的条件转换"
  },
  {
    id: "class-english-7",
    name: "初一英语基础班",
    subject: "英语",
    teacher: "周老师",
    students: 10,
    pendingFeedback: 2,
    needsAttention: 2,
    recentRecord: "昨天 18:40",
    focus: "阅读理解细节定位和完成速度"
  }
];
