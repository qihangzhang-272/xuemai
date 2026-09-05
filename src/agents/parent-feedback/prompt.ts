import { PARENT_FEEDBACK_SYSTEM_PROMPT } from "./constants";
import type { ParentFeedbackContextData, ParentFeedbackInput, ParentFeedbackModelOutput } from "./types";

export function buildParentFeedbackMessages(input: ParentFeedbackInput, context: ParentFeedbackContextData) {
  return [
    {
      role: "system" as const,
      content: PARENT_FEEDBACK_SYSTEM_PROMPT
    },
    {
      role: "user" as const,
      content: buildUserPrompt(input, context)
    }
  ];
}

export function buildParentFeedbackRevisionMessages(
  input: ParentFeedbackInput,
  context: ParentFeedbackContextData,
  draft: ParentFeedbackModelOutput,
  warnings: string[]
) {
  return [
    {
      role: "system" as const,
      content: PARENT_FEEDBACK_SYSTEM_PROMPT
    },
    {
      role: "user" as const,
      content: [
        buildUserPrompt(input, context),
        "",
        "上一版草稿没有通过质量检查，请只基于同一份上下文修订一次。",
        "不要新增未提供事实。",
        "需要修正的问题：",
        warnings.join("\n") || "质量分低于阈值。",
        "",
        "上一版 JSON：",
        JSON.stringify(draft)
      ].join("\n")
    }
  ];
}

function buildUserPrompt(input: ParentFeedbackInput, context: ParentFeedbackContextData) {
  return [
    "请根据以下信息生成家长微信反馈 JSON。",
    "",
    "输出 JSON schema：",
    "{",
    '  "feedbackText": "120-220字，适合直接微信发送，不要标题，不要 Markdown",',
    '  "studentStatus": "excellent | stable | needs_attention",',
    '  "coreIssue": "本次最核心问题",',
    '  "nextAction": "下一步训练方向",',
    '  "relatedKnowledgePoints": ["相关知识点"],',
    '  "shouldUpdateStudentProfile": true | false,',
    '  "suggestedProfileUpdate": {',
    '    "weaknesses": ["建议老师确认后写入的薄弱点"],',
    '    "learningHabits": ["建议老师确认后写入的学习习惯观察"],',
    '    "nextFocus": "建议老师确认后的下一步重点",',
    '    "riskSignals": ["需要持续观察的风险信号"]',
    "  }",
    "}",
    "",
    "当前输入：",
    `课堂表现：${input.classNote || "未提供"}`,
    `错题摘要：${input.wrongQuestionSummary || "未提供"}`,
    `知识点：${input.knowledgePoints?.join("、") || "未提供"}`,
    `老师额外要求：${input.teacherInstruction || "未提供"}`,
    `输出偏好：${JSON.stringify(input.outputPreference ?? {})}`,
    "",
    "学生档案：",
    formatStudentProfile(context),
    "",
    "近期学习记录：",
    formatLearningRecords(context),
    "",
    "近期错题：",
    formatWrongQuestions(context),
    "",
    "老师偏好：",
    formatTeacherPreferences(context),
    "",
    "注意：suggestedProfileUpdate 只是建议，不代表已更新学生画像。"
  ].join("\n");
}

function formatStudentProfile(context: ParentFeedbackContextData) {
  const student = context.student;

  return [
    `姓名：${student.name}`,
    `年级：${student.grade || "未提供"}`,
    `默认科目：${student.default_subject || "未提供"}`,
    `状态：${student.status || "未提供"}`,
    `画像摘要：${student.profile_summary || "未提供"}`,
    `优势：${student.strengths?.join("、") || "未提供"}`,
    `薄弱点：${student.weaknesses?.join("、") || "未提供"}`,
    `学习习惯：${student.learning_habits?.join("、") || "未提供"}`,
    `风险信号：${student.risk_signals?.join("、") || "未提供"}`,
    `下一步重点：${student.next_focus || "未提供"}`
  ].join("\n");
}

function formatLearningRecords(context: ParentFeedbackContextData) {
  if (context.learningRecords.length === 0) return "暂无已确认学习记录。";

  return context.learningRecords
    .map((record) =>
      [
        `- ${record.title || record.record_type}`,
        `内容：${record.content || "未提供"}`,
        `知识点：${record.knowledge_points?.join("、") || "未提供"}`,
        `老师备注：${record.teacher_note || "未提供"}`
      ].join("\n")
    )
    .join("\n");
}

function formatWrongQuestions(context: ParentFeedbackContextData) {
  if (context.wrongQuestions.length === 0) return "暂无错题记录。";

  return context.wrongQuestions
    .map((question) =>
      [
        `- ${question.question_text || "未记录题干"}`,
        `知识点：${question.knowledge_points?.join("、") || "未提供"}`,
        `错误类型：${question.mistake_type || "未提供"}`,
        `错误原因：${question.mistake_reason || "未提供"}`,
        `分析：${question.analysis_text || "未提供"}`
      ].join("\n")
    )
    .join("\n");
}

function formatTeacherPreferences(context: ParentFeedbackContextData) {
  const preferences = context.teacherPreferences;
  if (!preferences) return "暂无老师偏好记录。";

  return [
    `反馈语气：${preferences.feedback_tone || "未提供"}`,
    `反馈长度：${preferences.feedback_length || "未提供"}`,
    `禁用表达：${preferences.banned_phrases?.join("、") || "未提供"}`,
    `偏好结构：${preferences.preferred_structure || "未提供"}`,
    `自定义风格：${preferences.custom_style_note || "未提供"}`
  ].join("\n");
}
