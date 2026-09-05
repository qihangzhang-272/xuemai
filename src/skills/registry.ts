import type { SkillDefinition, SkillId, SkillSubjectType } from "./types";

export const skillRegistry: SkillDefinition[] = [
  {
    id: "update_learning_record",
    label: "学习记录草稿",
    description: "系统把老师自然语言课堂记录整理成可确认的结构化学习记录草稿。",
    subjectTypes: ["student"],
    triggerLabels: ["整理为学习记录", "仅保存备注"],
    requiredInput: ["课堂表现或课后观察"],
    contextSources: mockSources(["当前学生档案", "老师输入内容", "最近学习记录"]),
    steps: ["识别课堂记录", "提取亮点与薄弱点", "生成学习记录草稿", "待入档处理"],
    outputType: "learning_record",
    archiveTarget: "学生档案 > 学习记录",
    actions: ["archive", "generate_feedback", "generate_next_lesson", "save_note"],
    nextSuggestions: ["generate_feedback", "next_lesson_plan"],
    confidenceLevel: "medium"
  },
  {
    id: "analyze_learning_evidence",
    label: "分析学习材料",
    description: "面向全学科分析试卷、作业、作文、阅读材料、课堂记录、口语练习、实验报告、艺术作品或项目制作品。",
    subjectTypes: ["student"],
    triggerLabels: ["分析学习材料", "分析试卷", "分析卷子", "分析作业", "分析作文", "分析口语", "分析实验报告", "分析作品"],
    requiredInput: ["学习材料、课堂记录或老师摘要"],
    contextSources: mockSources(["老师提供的学习材料", "当前学生档案", "学习目标"]),
    steps: ["识别材料类型", "提取表现证据", "归纳优势与薄弱点", "生成通用分析卡片"],
    outputType: "learning_evidence_analysis",
    archiveTarget: "学生档案 > 学习材料分析",
    actions: ["generate_feedback", "generate_next_lesson", "add_monthly_material", "archive"],
    nextSuggestions: ["generate_feedback", "next_lesson_plan"],
    confidenceLevel: "medium"
  },
  {
    id: "generate_feedback",
    label: "生成微信反馈",
    description: "根据学生档案、课堂记录和家长关注点生成微信课后反馈草稿。",
    subjectTypes: ["student"],
    triggerLabels: ["生成微信反馈", "家长沟通", "生成家长反馈"],
    requiredInput: ["课堂记录或错题摘要"],
    contextSources: mockSources(["当前学生档案", "最近 3 条学习记录", "家长关注点", "老师反馈语气"]),
    steps: ["读取学生最近记录", "整理学习表现", "生成家长反馈", "优化微信表达"],
    outputType: "parent_feedback",
    archiveTarget: "学生档案 > 课后反馈",
    actions: ["copy_feedback", "make_warmer", "make_shorter", "mark_parent_sent", "archive", "regenerate"],
    nextSuggestions: ["monthly_report", "next_lesson_plan"],
    confidenceLevel: "medium"
  },
  {
    id: "next_lesson_plan",
    label: "下次课建议",
    description: "根据薄弱点和近期记录生成下次课训练重点。",
    subjectTypes: ["student"],
    triggerLabels: ["下次课建议"],
    requiredInput: ["薄弱点或本节课表现"],
    contextSources: mockSources(["当前薄弱点", "最近错题", "学习目标"]),
    steps: ["读取薄弱点", "整理错题类型", "生成训练重点", "生成下次课建议"],
    outputType: "lesson_plan",
    archiveTarget: "学生档案 > 下次跟进",
    actions: ["archive", "generate_feedback", "regenerate"],
    nextSuggestions: ["generate_feedback", "analyze_learning_evidence"],
    confidenceLevel: "medium"
  },
  {
    id: "monthly_report",
    label: "生成月报",
    description: "学生会话生成家长可读月报；班级会话生成老师看的班级复盘和服务监控月报。",
    subjectTypes: ["student", "class"],
    triggerLabels: ["生成月报", "班级月报"],
    requiredInput: ["本月已入档学习记录"],
    contextSources: mockSources(["本月学习记录", "反馈历史", "薄弱点变化"]),
    steps: ["读取本月记录", "筛选关键证据", "整理进步与问题", "生成月报摘要"],
    outputType: "monthly_report",
    archiveTarget: "月报工作台",
    actions: ["archive", "make_warmer", "regenerate"],
    nextSuggestions: ["parent_communication", "renewal_followup"],
    confidenceLevel: "low"
  },
  {
    id: "parent_communication",
    label: "家长沟通",
    description: "生成适合当前家长关注点的沟通话术。",
    subjectTypes: ["student"],
    triggerLabels: ["家长沟通"],
    requiredInput: ["沟通目的或家长关注点"],
    contextSources: mockSources(["家长关注点", "最近反馈", "老师语气偏好"]),
    steps: ["读取家长关注点", "整理沟通目的", "生成话术草稿"],
    outputType: "parent_feedback",
    archiveTarget: "学生档案 > 家长沟通",
    actions: ["copy_feedback", "make_warmer", "make_shorter", "mark_parent_sent", "archive", "regenerate"],
    nextSuggestions: ["generate_feedback"],
    confidenceLevel: "medium"
  },
  {
    id: "class_lesson_record",
    label: "记录班课",
    description: "把班课记录整理成班级共性问题和可拆分任务。",
    subjectTypes: ["class"],
    triggerLabels: ["记录班课"],
    requiredInput: ["班课记录"],
    contextSources: mockSources(["班级成员", "老师输入内容", "近期班课记录"]),
    steps: ["整理班课内容", "提取共性问题", "生成班课记录"],
    outputType: "class_record",
    archiveTarget: "班级档案 > 班课记录",
    actions: ["archive", "generate_feedback", "regenerate"],
    nextSuggestions: ["batch_feedback", "split_to_student_profiles"],
    confidenceLevel: "medium"
  },
  {
    id: "batch_feedback",
    label: "批量反馈",
    description: "按学生状态生成分组反馈草稿，等待逐条确认。",
    subjectTypes: ["class"],
    triggerLabels: ["批量反馈"],
    requiredInput: ["班级记录或待反馈名单"],
    contextSources: mockSources(["班级成员状态", "本周待办", "共性薄弱点"]),
    steps: ["读取待反馈学生", "整理共性表现", "生成分组反馈", "待反馈处理"],
    outputType: "batch_feedback",
    archiveTarget: "班级档案 > 批量反馈",
    actions: ["archive", "generate_feedback", "regenerate"],
    nextSuggestions: ["split_to_student_profiles", "monthly_report"],
    confidenceLevel: "low"
  },
  {
    id: "common_weakness",
    label: "共性薄弱点",
    description: "汇总班级共性薄弱点和重点关注学生。",
    subjectTypes: ["class"],
    triggerLabels: ["共性薄弱点"],
    requiredInput: ["班课记录或近期错题"],
    contextSources: mockSources(["班级成员", "近期错题", "班课记录"]),
    steps: ["读取班级记录", "统计共性薄弱点", "生成关注名单"],
    outputType: "class_record",
    archiveTarget: "班级档案 > 共性薄弱点",
    actions: ["archive", "generate_practice", "regenerate"],
    nextSuggestions: ["tiered_practice", "batch_feedback"],
    confidenceLevel: "medium"
  },
  {
    id: "tiered_practice",
    label: "分层练习",
    description: "根据班级共性问题生成分层练习方向。",
    subjectTypes: ["class"],
    triggerLabels: ["分层练习"],
    requiredInput: ["共性薄弱点"],
    contextSources: mockSources(["共性薄弱点", "需要关注学生", "近期班课记录"]),
    steps: ["分层学生状态", "生成练习方向", "待入档处理"],
    outputType: "lesson_plan",
    archiveTarget: "班级档案 > 分层练习",
    actions: ["archive", "regenerate"],
    nextSuggestions: ["batch_feedback"],
    confidenceLevel: "low"
  },
  {
    id: "split_to_student_profiles",
    label: "拆分到学生档案",
    description: "把班级记录拆成多个学生可确认草稿。",
    subjectTypes: ["class"],
    triggerLabels: ["拆分到学生档案"],
    requiredInput: ["班级记录"],
    contextSources: mockSources(["班级记录", "学生名单", "最近学生状态"]),
    steps: ["读取班级记录", "匹配学生", "生成拆分草稿"],
    outputType: "class_record",
    archiveTarget: "学生档案 > 待确认拆分记录",
    actions: ["archive", "regenerate"],
    nextSuggestions: ["batch_feedback"],
    confidenceLevel: "low"
  },
  {
    id: "today_todos",
    label: "今日待办",
    description: "聚合老师今日待处理事项。",
    subjectTypes: ["teacher_workspace"],
    triggerLabels: ["今日待办"],
    requiredInput: ["无"],
    contextSources: mockSources(["待处理 AI 结果卡", "学生跟进任务", "月报计划"]),
    steps: ["读取待办", "按优先级排序", "生成今日列表"],
    outputType: "note",
    archiveTarget: "老师工作台 > 今日待办",
    actions: ["archive"],
    nextSuggestions: ["batch_monthly_report", "lesson_prep"],
    confidenceLevel: "medium"
  },
  {
    id: "batch_monthly_report",
    label: "批量月报",
    description: "聚合本月待生成月报名单。",
    subjectTypes: ["teacher_workspace"],
    triggerLabels: ["批量月报"],
    requiredInput: ["已入档记录"],
    contextSources: mockSources(["学生列表", "本月记录", "待月报名单"]),
    steps: ["读取待月报学生", "检查记录完整度", "生成批量计划"],
    outputType: "monthly_report",
    archiveTarget: "老师工作台 > 批量月报",
    actions: ["archive", "regenerate"],
    nextSuggestions: ["monthly_report"],
    confidenceLevel: "low"
  },
  {
    id: "lesson_prep",
    label: "备课助手",
    description: "根据近期薄弱点生成备课建议。",
    subjectTypes: ["teacher_workspace"],
    triggerLabels: ["备课助手"],
    requiredInput: ["课程计划"],
    contextSources: mockSources(["近期薄弱点", "待上课学生", "素材库"]),
    steps: ["读取待上课对象", "聚合薄弱点", "生成备课建议"],
    outputType: "lesson_plan",
    archiveTarget: "老师工作台 > 备课建议",
    actions: ["archive", "regenerate"],
    nextSuggestions: ["materials_organize"],
    confidenceLevel: "low"
  },
  {
    id: "materials_organize",
    label: "素材整理",
    description: "整理教学素材和可复用案例。",
    subjectTypes: ["teacher_workspace"],
    triggerLabels: ["素材整理"],
    requiredInput: ["素材或记录"],
    contextSources: mockSources(["聊天记录", "上传素材", "已入档案例"]),
    steps: ["识别素材", "归类标签", "生成素材卡"],
    outputType: "note",
    archiveTarget: "素材库",
    actions: ["archive"],
    nextSuggestions: ["service_review"],
    confidenceLevel: "medium"
  },
  {
    id: "renewal_followup",
    label: "续费跟进",
    description: "基于服务过程证据生成续费沟通材料。",
    subjectTypes: ["teacher_workspace"],
    triggerLabels: ["续费跟进"],
    requiredInput: ["服务周期或学生名单"],
    contextSources: mockSources(["学习记录", "月报", "家长反馈"]),
    steps: ["读取服务证据", "整理进步与计划", "生成沟通材料"],
    outputType: "note",
    archiveTarget: "老师工作台 > 续费跟进",
    actions: ["copy_feedback", "archive", "regenerate"],
    nextSuggestions: ["service_review"],
    confidenceLevel: "low"
  },
  {
    id: "service_review",
    label: "服务复盘",
    description: "复盘近期教学服务质量和待跟进问题。",
    subjectTypes: ["teacher_workspace"],
    triggerLabels: ["服务复盘"],
    requiredInput: ["时间范围"],
    contextSources: mockSources(["反馈复制率", "入档记录", "待办完成情况"]),
    steps: ["读取关键指标", "识别遗漏事项", "生成复盘建议"],
    outputType: "note",
    archiveTarget: "老师工作台 > 服务复盘",
    actions: ["archive", "regenerate"],
    nextSuggestions: ["today_todos"],
    confidenceLevel: "medium"
  }
];

export function getSkillById(skillId: SkillId) {
  return skillRegistry.find((skill) => skill.id === skillId);
}

export function getSkillByTriggerLabel(label: string, subjectType?: SkillSubjectType) {
  return skillRegistry.find((skill) => skill.triggerLabels.includes(label) && (!subjectType || skill.subjectTypes.includes(subjectType)));
}

export function getSkillsForSubject(subjectType: SkillSubjectType) {
  return skillRegistry.filter((skill) => skill.subjectTypes.includes(subjectType));
}

function mockSources(labels: string[]) {
  return labels.map((label, index) => ({
    id: `mock_context_${index + 1}`,
    label,
    type: "mock" as const
  }));
}
