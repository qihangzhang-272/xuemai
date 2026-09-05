import type {
  LessonLedgerFeedbackAttachment,
  LessonLedgerLesson,
  LessonLedgerScore,
  LessonLedgerStudent,
  LessonLedgerStudyReport,
  LessonLedgerWeakness
} from "./types";

export type LessonLedgerFeedbackAiInput = {
  lesson: LessonLedgerLesson;
  content: string;
  state: string;
  homework: string;
  attachments: LessonLedgerFeedbackAttachment[];
  fallbackText: string;
};

export type LessonLedgerStudyReportAiInput = {
  student: LessonLedgerStudent;
  scores: LessonLedgerScore[];
  weaknesses: LessonLedgerWeakness[];
  lessons: LessonLedgerLesson[];
  feedbackHighlights: string[];
  teacherNotes: string;
  fallbackReport: LessonLedgerStudyReport;
};

export type LessonLedgerStudyReportAiDraft = {
  summary?: string;
  parentSummary?: string;
  sections?: Array<{
    title: string;
    body: string;
  }>;
  suggestions?: string[];
};

export type LessonLedgerAiProvider = {
  generateFeedback(input: LessonLedgerFeedbackAiInput): Promise<string | null>;
  generateStudyReport(input: LessonLedgerStudyReportAiInput): Promise<LessonLedgerStudyReportAiDraft | null>;
};

let testProvider: LessonLedgerAiProvider | null | undefined;

export function setLessonLedgerAiProviderForTest(provider: LessonLedgerAiProvider | null) {
  testProvider = provider;
}

export function getLessonLedgerAiProvider() {
  if (testProvider !== undefined) {
    return testProvider;
  }

  return createDeepSeekCompatibleProviderFromEnv();
}

function createDeepSeekCompatibleProviderFromEnv(): LessonLedgerAiProvider | null {
  if (process.env.LESSONLEDGER_AI_PROVIDER !== "deepseek") {
    return null;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.LESSONLEDGER_AI_API_KEY;
  const model = process.env.DEEPSEEK_MODEL ?? process.env.LESSONLEDGER_AI_MODEL ?? "deepseek-chat";
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? process.env.LESSONLEDGER_AI_BASE_URL ?? "https://api.deepseek.com";
  if (!apiKey) {
    return null;
  }

  return {
    async generateFeedback(input) {
      return postChatCompletion({
        apiKey,
        baseUrl,
        model,
        messages: [
          {
            role: "system",
            content:
              "你是独立老师的课后反馈助手。只根据输入生成给家长看的中文反馈，不编造事实，不承诺提分，不使用基础很差、完全不会、不认真、严重、保证提分等表达。"
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "generate_parent_feedback",
              lesson: input.lesson,
              content: input.content,
              state: input.state,
              homework: input.homework,
              attachments: input.attachments,
              fallback_style_example: input.fallbackText
            })
          }
        ]
      });
    },
    async generateStudyReport(input) {
      const text = await postChatCompletion({
        apiKey,
        baseUrl,
        model,
        messages: [
          {
            role: "system",
            content:
              "你是教培老师的学习报告助手。必须只根据输入资料生成 JSON，不编造长期诊断，不承诺提分。JSON 字段为 summary、parentSummary、sections、suggestions。sections 是 title/body 数组，suggestions 是字符串数组。"
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "generate_study_report",
              student: input.student,
              scores: input.scores,
              weaknesses: input.weaknesses,
              lessons: input.lessons,
              feedbackHighlights: input.feedbackHighlights,
              teacherNotes: input.teacherNotes,
              fallbackReport: input.fallbackReport
            })
          }
        ],
        json: true
      });

      return parseReportDraft(text);
    }
  };
}

async function postChatCompletion({
  apiKey,
  baseUrl,
  model,
  messages,
  json
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  json?: boolean;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/u, "")}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        ...(json ? { response_format: { type: "json_object" } } : {})
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    return body.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseReportDraft(text: string | null): LessonLedgerStudyReportAiDraft | null {
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as LessonLedgerStudyReportAiDraft;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
      parentSummary: typeof parsed.parentSummary === "string" ? parsed.parentSummary : undefined,
      sections: Array.isArray(parsed.sections)
        ? parsed.sections
            .filter((section) => typeof section?.title === "string" && typeof section?.body === "string")
            .map((section) => ({
              title: section.title,
              body: section.body
            }))
        : undefined,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((suggestion): suggestion is string => typeof suggestion === "string") : undefined
    };
  } catch {
    return null;
  }
}
