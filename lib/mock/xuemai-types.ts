export type StudentStatus = "stable" | "needs_attention" | "improving" | "excellent";

export type TimelineItemType =
  | "feedback"
  | "mistake"
  | "report"
  | "profile_update"
  | "class_insight"
  | "teaching_suggestion";

export type TimelineItemStatus = "draft" | "sent" | "saved" | "updated";

export type TimelineFilter = "all" | "feedback" | "mistake" | "report" | "profile_update";

export type EvidenceSeverity = "low" | "medium" | "high";

export type XuemaiTagTone = "green" | "red" | "neutral";

export interface XuemaiStudent {
  id: string;
  name: string;
  grade: string;
  subject: string;
  classId: string;
  className: string;
  status: StudentStatus;
  statusLabel: string;
  latestIssueSummary: string;
  lastUpdatedAt: string;
  profile: StudentProfile;
  timelineItems: TimelineItem[];
  weaknessEvidence?: WeaknessEvidence;
  aiSuggestion?: AISuggestion;
}

export interface StudentProfile {
  weakPoints: string[];
  recentState: string;
  homeworkStatus: string;
  parentFeedbackStyle: string;
  nextLessonFocus: string[];
}

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  summary: string;
  createdAt: string;
  displayTime: string;
  tags: string[];
  detail: TimelineItemDetail;
  status?: TimelineItemStatus;
  copyable?: boolean;
}

export type TimelineItemDetail =
  | FeedbackDetail
  | MistakeDetail
  | ReportDetail
  | ProfileUpdateDetail
  | ClassInsightDetail
  | TeachingSuggestionDetail;

export interface FeedbackDetail {
  kind: "feedback";
  fullText: string;
  tone: string;
  target: "parent";
}

export interface MistakeDetail {
  kind: "mistake";
  wrongQuestionCount: number;
  knowledgePoints: string[];
  errorPatterns: string[];
  suggestedTraining: string[];
  relatedPaperTitle: string;
}

export interface ReportDetail {
  kind: "report";
  progress: string[];
  problems: string[];
  nextMonthFocus: string[];
  summaryText: string;
}

export interface ProfileUpdateDetail {
  kind: "profile_update";
  addedWeakPoints: string[];
  statusFrom: string;
  statusTo: string;
  nextLessonFocus: string[];
  reason: string;
}

export interface ClassInsightDetail {
  kind: "class_insight";
  className: string;
  commonProblem: string;
  affectedStudentNames: string[];
  teachingSuggestion: string;
}

export interface TeachingSuggestionDetail {
  kind: "teaching_suggestion";
  suggestion: string;
  actions: string[];
}

export interface WeaknessEvidence {
  label: string;
  count: number;
  severity: EvidenceSeverity;
}

export interface AISuggestion {
  text: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
}

export interface XuemaiClassGroup {
  id: string;
  name: string;
  grade: string;
  subject: string;
  studentCount: number;
  focusProblem: string;
  attentionStudentNames: string[];
  timelineItems: TimelineItem[];
  insights: ClassInsight[];
}

export interface ClassInsight {
  id: string;
  title: string;
  summary: string;
  commonProblem: string;
  affectedStudentNames: string[];
  teachingSuggestion: string;
  createdAt: string;
}

export interface GradingResult {
  id: string;
  studentId: string;
  paperTitle: string;
  score?: number;
  wrongQuestionCount: number;
  knowledgePoints: string[];
  errorPatterns: string[];
  suggestedTraining: string[];
  createdAt: string;
}

export interface XuemaiMockState {
  student: XuemaiStudent;
  classGroup: XuemaiClassGroup;
}

export interface GeneratedProfileTag {
  label: string;
  tone: XuemaiTagTone;
}

export interface GeneratedProfileTagSection {
  title: string;
  tags: GeneratedProfileTag[];
}

export interface GeneratedProfileView {
  currentWeakness: GeneratedProfileTag[];
  currentStrengths: GeneratedProfileTag[];
  recentFocus: string;
  summarySections: GeneratedProfileTagSection[];
  nextLessonFocus: GeneratedProfileTag[];
}
