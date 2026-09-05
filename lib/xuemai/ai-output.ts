import { AppError } from "./db";
import type { LearningRecord } from "./types";

export function parseAiOutput(raw: string, record: LearningRecord, feedback: boolean) {
  let value;
  try { value = JSON.parse(raw); } catch { throw new AppError("AI 返回格式不完整，请重试", 502); }
  if (!value || typeof value.content !== "string" || !value.content.trim() || value.content.length > 20_000) throw new AppError("AI 返回正文不完整，请重试", 502);
  // 家长反馈只需要正文，沿用已检查记录的标题和证据类型。
  if (feedback) return { title: record.title, content: value.content as string, evidence: record.evidence };
  if (typeof value.title !== "string" || !value.title.trim() || value.title.length > 150 || !["observed", "insufficient", "teaching"].includes(value.evidence)) throw new AppError("AI 返回格式不完整，请重试", 502);
  if (record.kind !== "prep" && value.evidence === "teaching") throw new AppError("AI 返回的学习证据类型不符合当前任务，请重试或由老师补充确认", 502);
  return { title: value.title as string, content: value.content as string, evidence: (record.kind === "prep" ? "teaching" : value.evidence) as LearningRecord["evidence"] };
}
