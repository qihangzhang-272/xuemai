export type Contact = {
  id: string;
  kind: "student" | "class";
  name: string;
  subject: string;
  grade: string;
  classIds: string[];
  mdtId?: string;
  createdAt: string;
  serviceRules?: Record<string, string | boolean>;
};

export type RecordKind = "record" | "analysis" | "prep" | "monthly" | "daily";
export const kindLabels: Record<RecordKind, string> = {
  record: "课堂记录", analysis: "材料分析", prep: "AI 备课", monthly: "学生月报", daily: "学生日报"
};

export type LearningRecord = {
  id: string;
  contactId: string;
  kind: RecordKind;
  title: string;
  input: string;
  date: string;
  attachmentIds: string[];
  createdAt: string;
  updatedAt: string;
  status: "draft" | "running" | "ready" | "failed";
  error: string;
  content: string;
  aiContent: string;
  feedback: string;
  aiFeedback: string;
  feedbackStatus: "none" | "pending" | "sent";
  archivedAt: string | null;
  archiveContent: string | null;
  sentContent: string | null;
  model: string;
  evidence: "observed" | "insufficient" | "teaching";
  sourceIds: string[];
  month: string;
  revision: number;
};

export type Attachment = {
  id: string; name: string; type: string; size: number;
  createdAt: string; text: string; providerTaskId?: string;
};

export function reportSources(records: LearningRecord[], contactId: string, kind: "daily" | "monthly", period: string) {
  return records.filter(item => item.contactId === contactId && item.archivedAt && item.archiveContent &&
    ["record", "analysis"].includes(item.kind) && (kind === "daily" ? item.date === period : item.date.startsWith(`${period}-`)));
}
export type Preferences = { subject: string; grade: string; tone: string; address: string };
export type Teacher = { id: string; name: string; identifier: string };
export type Snapshot = {
  teacher: Teacher;
  contacts: Contact[];
  records: LearningRecord[];
  attachments: Attachment[];
  preferences: Preferences;
  services: { model: string; ai: boolean; documents: boolean; mdt: boolean };
};

export function contactStatus(records: LearningRecord[], kind: Contact["kind"] = "student") {
  if (records.some(r => r.status === "failed")) return "需处理";
  if (records.some(r => r.status === "running")) return "处理中";
  if (records.some(r => r.feedbackStatus === "pending")) return "待反馈";
  if (records.some(r => r.status === "draft")) return "待整理";
  if (kind === "student" && records.some(r => r.status === "ready" && r.evidence === "observed" && !r.archivedAt && r.kind !== "prep")) return "待入档";
  return records.length ? "已完成" : "尚无记录";
}
