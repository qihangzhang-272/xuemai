import type { Conversation } from "./types";

export const allSubjectsLabel = "全部";
export const crossSubjectLabel = "综合";
const emptySubjectLabels = new Set(["未选科目", "未选学科", "全部科目"]);

export function splitSubjectText(value: string) {
  return value
    .split(/[、,，/｜|]/)
    .map((item) => item.trim())
    .filter((item) => Boolean(item) && !emptySubjectLabels.has(item));
}

export function normalizeSubjectText(value: string, fallback = "未选科目") {
  const subjects = splitSubjectText(value);
  return subjects.length ? subjects.join("、") : fallback;
}

export function cleanSubjectPlaceholderText(value: string) {
  return value
    .replace(/未选科目[、,，/｜|]\s*/g, "")
    .replace(/[、,，/｜|]\s*未选科目/g, "")
    .replace(/\s*·\s*未选科目\s*·\s*/g, " · ")
    .replace(/未选科目\s*·\s*/g, "")
    .replace(/\s*·\s*未选科目/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getSubjectTracks(conversation: Conversation) {
  if (conversation.kind !== "student") return [conversation.subject || "未选科目"];

  const subjects = (conversation.subjectTracks?.length ? conversation.subjectTracks : splitSubjectText(conversation.subject))
    .map((item) => item.trim())
    .filter((item) => Boolean(item) && !emptySubjectLabels.has(item));
  const uniqueSubjects = Array.from(new Set(subjects.length ? subjects : ["未选科目"]));

  return uniqueSubjects.length > 1 ? [allSubjectsLabel, ...uniqueSubjects] : uniqueSubjects;
}

export function getSelectedSubjectTrack(conversation: Conversation, selected?: string) {
  const tracks = getSubjectTracks(conversation);
  if (selected && tracks.includes(selected)) return selected;
  return tracks[0] ?? conversation.subject;
}

export function getSkillSubjectLabel(conversation: Conversation, selected?: string) {
  if (conversation.kind !== "student") return conversation.subject;
  const track = getSelectedSubjectTrack(conversation, selected);
  return track === allSubjectsLabel ? crossSubjectLabel : track;
}

export function getSubjectSummaryLabel(conversation: Conversation, selected?: string) {
  if (conversation.kind !== "student") return conversation.subject;
  const track = getSelectedSubjectTrack(conversation, selected);
  if (track !== allSubjectsLabel) return track;
  const subjects = getSubjectTracks(conversation).filter((item) => item !== allSubjectsLabel);
  return subjects.length > 1 ? `多科目：${subjects.join(" / ")}` : subjects[0] ?? conversation.subject;
}
