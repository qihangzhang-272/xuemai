import type { LucideIcon } from "lucide-react";

export type DemoView = "today" | "messages" | "students" | "classes";

export type DemoTaskKind = "feedback" | "parent_reply" | "analysis" | "attention";

export type DemoTaskStatus = "pending_feedback" | "pending_reply" | "needs_review" | "needs_attention" | "done";

export type EvidenceItem = {
  id: string;
  label: string;
  detail: string;
  time: string;
  verified: boolean;
};

export type TimelineItem = {
  id: string;
  date: string;
  time: string;
  title: string;
  detail: string;
  kind: "lesson" | "material" | "feedback" | "parent";
};

export type StudentProfile = {
  id: string;
  name: string;
  grade: string;
  className: string;
  subject: string;
  parent: string;
  parentPhone: string;
  teacher: string;
  focus: string;
  progress: string;
  serviceState: "正常" | "需关注" | "待跟进";
  lastService: string;
  evidenceSummary: Array<{ label: string; count: number }>;
  timeline: TimelineItem[];
};

export type DemoTask = {
  id: string;
  kind: DemoTaskKind;
  status: DemoTaskStatus;
  studentId: string;
  title: string;
  source: string;
  preview: string;
  time: string;
  priority: "high" | "normal";
  draftTitle: string;
  draft: string;
  summary: string;
  teacherSuggestion: string;
  evidence: EvidenceItem[];
};

export type ClassProfile = {
  id: string;
  name: string;
  subject: string;
  teacher: string;
  students: number;
  pendingFeedback: number;
  needsAttention: number;
  recentRecord: string;
  focus: string;
};

export type NavigationItem = {
  id: DemoView;
  label: string;
  icon: LucideIcon;
};

export type CaptureKind = "课堂记录" | "学生材料" | "家长消息";

export type CapturePayload = {
  kind: CaptureKind;
  studentId: string;
  content: string;
  attachmentName?: string;
};
