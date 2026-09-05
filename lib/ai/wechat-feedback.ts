import type { PracticeRecognitionDraft } from "@/lib/ai/practice-recognition";
import { createJsonChatCompletion } from "@/src/agents/shared/model/call-model";

export type PracticeFeedbackInput = {
  studentName: string;
  parentName?: string;
  grade?: string;
  subject: string;
  materialTitle?: string;
  materialText?: string;
  teacherNotes?: string;
  scoreText?: string;
  nextPlan?: string;
  tone?: string;
  correctedDraft?: PracticeRecognitionDraft;
};

export type PracticeFeedbackResult = {
  detectedPracticeType: string;
  detectedQuestions: string[];
  detectedScore: string;
  errorReasons: string[];
  suggestions: string[];
  wechatFeedback: string;
  monthlySummarySeed: {
    mainProblem: string;
    improvement: string;
    nextAction: string;
  };
};

function buildPrompt(input: PracticeFeedbackInput) {
  const correctedDraftText = input.correctedDraft
    ? [
        `练习类型：${input.correctedDraft.practiceType}`,
        `材料标题：${input.correctedDraft.materialTitle}`,
        `分数/表现：${input.correctedDraft.detectedScore}`,
        `题目或任务要点：${input.correctedDraft.detectedQuestions.join("；") || "未提供"}`,
        `值得肯定：${input.correctedDraft.strengths.join("；") || "未提供"}`,
        `错误原因：${input.correctedDraft.errorReasons.join("；") || "未提供"}`,
        `后续建议：${input.correctedDraft.suggestions.join("；") || "未提供"}`,
        `下一步安排：${input.correctedDraft.nextPlan || "未提供"}`,
        `老师确认备注：${input.correctedDraft.confidenceNotes || "未提供"}`
      ].join("\n")
    : "未提供";

  return [
    "你是一个教培老师的微信反馈助手。",
    "你要基于老师已经校正过的练习识别结果，生成一段可复制给家长的微信反馈。",
    "不要输出长篇报告，不要输出标题，不要输出项目符号。",
    "语气要具体、温和、克制，不夸张，不制造不存在的事实。",
    "如果输入缺少分数或题目细节，请用“从目前记录看”等谨慎表达。",
    "请只返回 JSON，不要返回 Markdown。",
    "",
    "JSON 字段：",
    "{",
    '  "detectedPracticeType": "练习类型",',
    '  "detectedQuestions": ["识别到的题目或任务要点"],',
    '  "detectedScore": "分数或表现，无法判断时写暂无明确分数",',
    '  "errorReasons": ["错误原因"],',
    '  "suggestions": ["后续建议"],',
    '  "wechatFeedback": "可直接复制给家长的一段微信反馈，120-220字",',
    '  "monthlySummarySeed": {',
    '    "mainProblem": "本次最主要问题",',
    '    "improvement": "本次值得肯定或进步处",',
    '    "nextAction": "后续跟进动作"',
    "  }",
    "}",
    "",
    `学生：${input.studentName}`,
    `家长称呼：${input.parentName || "家长"}`,
    `年级：${input.grade || "未提供"}`,
    `科目：${input.subject}`,
    `材料标题：${input.materialTitle || "未提供"}`,
    `分数/表现补充：${input.scoreText || "未提供"}`,
    `老师备注：${input.teacherNotes || "未提供"}`,
    `后续安排：${input.nextPlan || "未提供"}`,
    `反馈语气：${input.tone || "温和、具体、鼓励式"}`,
    "",
    "老师校正后的识别结果：",
    correctedDraftText,
    "",
    "原始补充材料：",
    input.materialText || "未提供"
  ].join("\n");
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseResult(content: string): PracticeFeedbackResult {
  const parsed = JSON.parse(content) as Partial<PracticeFeedbackResult>;

  return {
    detectedPracticeType: parsed.detectedPracticeType || "未识别练习类型",
    detectedQuestions: normalizeStringArray(parsed.detectedQuestions),
    detectedScore: parsed.detectedScore || "暂无明确分数",
    errorReasons: normalizeStringArray(parsed.errorReasons),
    suggestions: normalizeStringArray(parsed.suggestions),
    wechatFeedback: parsed.wechatFeedback || "",
    monthlySummarySeed: {
      mainProblem: parsed.monthlySummarySeed?.mainProblem || "",
      improvement: parsed.monthlySummarySeed?.improvement || "",
      nextAction: parsed.monthlySummarySeed?.nextAction || ""
    }
  };
}

export async function generateWechatFeedback(input: PracticeFeedbackInput) {
  const completion = await createJsonChatCompletion({
    messages: [
      {
        role: "system",
        content: "你只输出符合要求的 JSON。"
      },
      {
        role: "user",
        content: buildPrompt(input)
      }
    ],
    temperature: 0.4
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("AI response is empty");
  }

  return parseResult(content);
}
