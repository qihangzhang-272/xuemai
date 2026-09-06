import type { LearningRecord } from "./types";

export type ArchiveOption = { id: string; label: string; text: string };

export function archiveOptions(record: Pick<LearningRecord, "content" | "feedback">): ArchiveOption[] {
  const blocks = record.content.trim().split(/\n(?=#{1,3}\s|【[^】]+】)/u);
  const sections = blocks.length > 1 ? blocks : record.content.trim().split(/\n\s*\n/u);
  const options = sections.filter(text => text.trim()).map((text, index) => ({
    id: `content:${index}`, label: text.split("\n")[0].replace(/^#+\s*|[【】]/gu, "").slice(0, 60), text: text.trim(),
  }));
  if (record.feedback.trim()) options.push({ id: "feedback", label: "家长反馈正文", text: record.feedback.trim() });
  return options;
}

export function cardSummary(text: string): string {
  const paragraphs = text.trim().split(/\n\s*\n/u).filter(part => part.trim() && !/^#{1,3}\s[^\n]+$/u.test(part));
  const first = paragraphs[0] || text.trim();
  if (first.length <= 180) return first;
  const sentences = first.match(/[^。！？\n]+[。！？]?/gu) || [first];
  let summary = "";
  for (const sentence of sentences) { if (summary && summary.length + sentence.length > 180) break; summary += sentence; }
  return summary;
}

export function hasOutcomePromise(text: string) {
  return /(?:保证|确保|包)(?:.{0,6})(?:提分|提高.{0,4}分|考上|满分|报名|续费)|(?:肯定|一定|必然)(?:会)?(?:续费|退费|提分)|百分之百(?:提分|有效)/u.test(text);
}
