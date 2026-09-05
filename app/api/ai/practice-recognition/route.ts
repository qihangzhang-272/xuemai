import { NextResponse } from "next/server";
import { recognizePracticeMaterial, type PracticeImageInput, type PracticeRecognitionInput } from "@/lib/ai/practice-recognition";

const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp"] as const;
const maxImages = 9;
const maxImageBytes = 8 * 1024 * 1024;
const maxTotalImageBytes = 24 * 1024 * 1024;

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAllowedMimeType(value: unknown): value is PracticeImageInput["mimeType"] {
  return typeof value === "string" && allowedMimeTypes.includes(value as PracticeImageInput["mimeType"]);
}

function isValidImageDataUrl(dataUrl: string, mimeType: PracticeImageInput["mimeType"]) {
  return dataUrl.startsWith(`data:${mimeType};base64,`);
}

function estimateDataUrlBytes(dataUrl: string) {
  const separatorIndex = dataUrl.indexOf(",");
  if (separatorIndex < 0) return Number.POSITIVE_INFINITY;
  const base64 = dataUrl.slice(separatorIndex + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function parseImages(value: unknown): PracticeImageInput[] {
  if (!Array.isArray(value)) {
    throw new Error("请至少上传 1 张练习图片");
  }

  if (value.length === 0) {
    throw new Error("请至少上传 1 张练习图片");
  }

  if (value.length > maxImages) {
    throw new Error("一次最多上传 9 张练习图片");
  }

  const images = value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`第 ${index + 1} 张图片格式不正确`);
    }

    const image = item as Record<string, unknown>;
    if (!isString(image.fileName)) {
      throw new Error(`第 ${index + 1} 张图片缺少文件名`);
    }

    if (!isAllowedMimeType(image.mimeType)) {
      throw new Error(`第 ${index + 1} 张图片只支持 PNG、JPG 或 WebP`);
    }

    if (!isString(image.dataUrl) || !isValidImageDataUrl(image.dataUrl, image.mimeType)) {
      throw new Error(`第 ${index + 1} 张图片内容格式不正确`);
    }
    if (estimateDataUrlBytes(image.dataUrl) > maxImageBytes) {
      throw new Error(`第 ${index + 1} 张图片超过 8 MB 限制`);
    }

    return {
      fileName: image.fileName.trim(),
      mimeType: image.mimeType,
      dataUrl: image.dataUrl.trim()
    };
  });

  if (images.reduce((total, image) => total + estimateDataUrlBytes(image.dataUrl), 0) > maxTotalImageBytes) {
    throw new Error("图片总大小不能超过 24 MB");
  }

  return images;
}

function parseInput(body: unknown): PracticeRecognitionInput {
  if (!body || typeof body !== "object") {
    throw new Error("请求体格式不正确");
  }

  const data = body as Record<string, unknown>;

  if (!isString(data.studentName)) {
    throw new Error("缺少学生姓名");
  }

  if (!isString(data.subject)) {
    throw new Error("缺少科目");
  }

  return {
    studentName: data.studentName.trim(),
    grade: isString(data.grade) ? data.grade.trim() : undefined,
    subject: data.subject.trim(),
    materialTitle: isString(data.materialTitle) ? data.materialTitle.trim() : undefined,
    images: parseImages(data.images),
    teacherNotes: isString(data.teacherNotes) ? data.teacherNotes.trim() : undefined,
    scoreText: isString(data.scoreText) ? data.scoreText.trim() : undefined,
    nextPlan: isString(data.nextPlan) ? data.nextPlan.trim() : undefined
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "这是练习材料图片识别 API，请使用 POST 调用。",
    method: "POST",
    url: "/api/ai/practice-recognition",
    requiredFields: ["studentName", "subject", "images"],
    optionalFields: ["grade", "materialTitle", "scoreText", "teacherNotes", "nextPlan"],
    imageRule: "images 最少 1 张，最多 9 张；支持 image/png、image/jpeg、image/webp；单张不超过 8 MB，总计不超过 24 MB。",
    nextStep: "识别结果返回后，请让老师校正，再调用 /api/ai/wechat-feedback。"
  });
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    const draft = await recognizePracticeMaterial(input);

    return NextResponse.json({
      ok: true,
      data: draft
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "识别练习材料失败";
    const isValidationError =
      message === "请求体格式不正确" ||
      message.startsWith("缺少") ||
      message.startsWith("请") ||
      message.startsWith("一次最多") ||
      message.startsWith("图片") ||
      message.startsWith("第 ");
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
