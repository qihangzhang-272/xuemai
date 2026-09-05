import { NextResponse } from "next/server";
import { generateWechatFeedback, type PracticeFeedbackInput } from "@/lib/ai/wechat-feedback";
import type { PracticeRecognitionDraft } from "@/lib/ai/practice-recognition";

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseCorrectedDraft(value: unknown): PracticeRecognitionDraft | undefined {
  if (!value || typeof value !== "object") return undefined;

  const data = value as Record<string, unknown>;

  return {
    practiceType: isString(data.practiceType) ? data.practiceType.trim() : "未识别练习类型",
    materialTitle: isString(data.materialTitle) ? data.materialTitle.trim() : "未命名练习",
    detectedScore: isString(data.detectedScore) ? data.detectedScore.trim() : "暂无明确分数",
    detectedQuestions: readStringArray(data.detectedQuestions),
    strengths: readStringArray(data.strengths),
    errorReasons: readStringArray(data.errorReasons),
    suggestions: readStringArray(data.suggestions),
    nextPlan: isString(data.nextPlan) ? data.nextPlan.trim() : "",
    confidenceNotes: isString(data.confidenceNotes) ? data.confidenceNotes.trim() : "",
    monthlySummarySeed: {
      mainProblem:
        data.monthlySummarySeed && typeof data.monthlySummarySeed === "object" && isString((data.monthlySummarySeed as Record<string, unknown>).mainProblem)
          ? String((data.monthlySummarySeed as Record<string, unknown>).mainProblem).trim()
          : "",
      improvement:
        data.monthlySummarySeed && typeof data.monthlySummarySeed === "object" && isString((data.monthlySummarySeed as Record<string, unknown>).improvement)
          ? String((data.monthlySummarySeed as Record<string, unknown>).improvement).trim()
          : "",
      nextAction:
        data.monthlySummarySeed && typeof data.monthlySummarySeed === "object" && isString((data.monthlySummarySeed as Record<string, unknown>).nextAction)
          ? String((data.monthlySummarySeed as Record<string, unknown>).nextAction).trim()
          : ""
    }
  };
}

function parseInput(body: unknown): PracticeFeedbackInput {
  if (!body || typeof body !== "object") {
    throw new Error("请求体格式不正确");
  }

  const data = body as Record<string, unknown>;
  const correctedDraft = parseCorrectedDraft(data.correctedDraft);

  if (!isString(data.studentName)) {
    throw new Error("缺少学生姓名");
  }

  if (!isString(data.subject)) {
    throw new Error("缺少科目");
  }

  if (!correctedDraft && !isString(data.materialText)) {
    throw new Error("缺少练习材料内容或校正后的识别结果");
  }

  return {
    studentName: data.studentName.trim(),
    parentName: isString(data.parentName) ? data.parentName.trim() : undefined,
    grade: isString(data.grade) ? data.grade.trim() : undefined,
    subject: data.subject.trim(),
    materialTitle: isString(data.materialTitle) ? data.materialTitle.trim() : undefined,
    materialText: isString(data.materialText) ? data.materialText.trim() : undefined,
    teacherNotes: isString(data.teacherNotes) ? data.teacherNotes.trim() : undefined,
    scoreText: isString(data.scoreText) ? data.scoreText.trim() : undefined,
    nextPlan: isString(data.nextPlan) ? data.nextPlan.trim() : undefined,
    tone: isString(data.tone) ? data.tone.trim() : undefined,
    correctedDraft
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "这是微信反馈生成 API，请使用 POST 调用。浏览器直接打开会发送 GET，只用于查看这段说明。",
    method: "POST",
    url: "/api/ai/wechat-feedback",
    requiredFields: ["studentName", "subject", "correctedDraft"],
    optionalFields: ["parentName", "grade", "materialTitle", "scoreText", "teacherNotes", "nextPlan", "tone"],
    fallbackFields: ["materialText"],
    uiEntry: "/students/demo-student-1/feedback/new"
  });
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    const result = await generateWechatFeedback(input);

    return NextResponse.json({
      ok: true,
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成微信反馈失败";
    const isValidationError = message === "请求体格式不正确" || message.startsWith("缺少");
    const status = isValidationError ? 400 : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status }
    );
  }
}
