import { createJsonChatCompletion } from "@/src/agents/shared/model/call-model";

export type PracticeImageInput = {
  fileName: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  dataUrl: string;
};

export type MonthlySummarySeed = {
  mainProblem: string;
  improvement: string;
  nextAction: string;
};

export type PracticeRecognitionInput = {
  studentName: string;
  grade?: string;
  subject: string;
  materialTitle?: string;
  images: PracticeImageInput[];
  teacherNotes?: string;
  scoreText?: string;
  nextPlan?: string;
};

export type PracticeRecognitionDraft = {
  practiceType: string;
  materialTitle: string;
  detectedScore: string;
  detectedQuestions: string[];
  strengths: string[];
  errorReasons: string[];
  suggestions: string[];
  nextPlan: string;
  confidenceNotes: string;
  monthlySummarySeed: MonthlySummarySeed;
};

function buildPrompt(input: PracticeRecognitionInput) {
  return [
    "你是一个教培老师的练习材料识别助手。",
    "输入图片可能是试卷、老师手改练习、课堂练习、英语作文、阅读题、口算题或其他作业。",
    "请识别练习类型、题目/任务要点、分数或表现、学生优势、错误原因、后续建议。",
    "不要自动批改没有明确答案的题目，不要编造分数；如果看不清或无法判断，请明确写在 confidenceNotes 里。",
    "请只返回 JSON，不要返回 Markdown。",
    "",
    "JSON 字段：",
    "{",
    '  "practiceType": "练习类型",',
    '  "materialTitle": "材料标题",',
    '  "detectedScore": "识别到的分数或表现，无法判断写暂无明确分数",',
    '  "detectedQuestions": ["识别到的题目或任务要点"],',
    '  "strengths": ["值得肯定的表现"],',
    '  "errorReasons": ["可能的错误原因"],',
    '  "suggestions": ["后续建议"],',
    '  "nextPlan": "下一步跟进安排",',
    '  "confidenceNotes": "识别置信度、模糊处和需要老师确认的地方",',
    '  "monthlySummarySeed": {',
    '    "mainProblem": "本次最主要问题",',
    '    "improvement": "本次值得肯定或进步处",',
    '    "nextAction": "后续跟进动作"',
    "  }",
    "}",
    "",
    `学生：${input.studentName}`,
    `年级：${input.grade || "未提供"}`,
    `科目：${input.subject}`,
    `老师填写的练习主题：${input.materialTitle || "未提供"}`,
    `老师填写的分数/表现：${input.scoreText || "未提供"}`,
    `老师备注：${input.teacherNotes || "未提供"}`,
    `老师计划：${input.nextPlan || "未提供"}`
  ].join("\n");
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseDraft(content: string): PracticeRecognitionDraft {
  const parsed = JSON.parse(content) as Partial<PracticeRecognitionDraft>;

  return {
    practiceType: parsed.practiceType || "未识别练习类型",
    materialTitle: parsed.materialTitle || "未命名练习",
    detectedScore: parsed.detectedScore || "暂无明确分数",
    detectedQuestions: normalizeStringArray(parsed.detectedQuestions),
    strengths: normalizeStringArray(parsed.strengths),
    errorReasons: normalizeStringArray(parsed.errorReasons),
    suggestions: normalizeStringArray(parsed.suggestions),
    nextPlan: parsed.nextPlan || "",
    confidenceNotes: parsed.confidenceNotes || "需要老师确认识别结果。",
    monthlySummarySeed: {
      mainProblem: parsed.monthlySummarySeed?.mainProblem || "",
      improvement: parsed.monthlySummarySeed?.improvement || "",
      nextAction: parsed.monthlySummarySeed?.nextAction || ""
    }
  };
}

export async function recognizePracticeMaterial(input: PracticeRecognitionInput) {
  const completion = await createJsonChatCompletion({
    messages: [
      {
        role: "system",
        content: "你只输出符合要求的 JSON。"
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildPrompt(input)
          },
          ...input.images.map((image) => ({
            type: "image_url" as const,
            image_url: {
              url: image.dataUrl
            }
          }))
        ]
      }
    ],
    temperature: 0.2
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("AI response is empty");
  }

  return parseDraft(content);
}
