import type { ContextSource, SkillActionId, SkillConfidenceLevel, SkillEditEvent, SkillId, SkillOutputVersion, SkillRunEvent } from "@/src/skills/types";

export type WorkspaceMode = "chat" | "side-chat" | "todos" | "settings";
export type ConversationKind = "student" | "class" | "assistant";
export type ActiveDrawer = "detail" | "profile" | "search" | null;
export type SideChatContextType = "student_profile" | "grading" | "monthly_report" | "conversation_records" | "learning_material";
export type CreationMode = "student" | "class" | null;
export type ChatIntent = "learning_record" | "learning_evidence_analysis" | "feedback" | "lesson_suggestion" | "class_analysis" | "monthly_report" | "batch_feedback" | "normal_chat";
export type TaskType = Exclude<ChatIntent, "normal_chat">;
export type FeedbackTone = "温和" | "严谨" | "鼓励型" | "简洁型";
export type SkillAction = SkillActionId;
export type SmartInputAction = "save_learning_record" | "generate_feedback" | "save_note";

export type Conversation = {
  id: string;
  kind: ConversationKind;
  name: string;
  avatar: string;
  className: string;
  subject: string;
  subjectTracks?: string[];
  grade: string;
  summary: string;
  time: string;
  statusLabel: string;
  accent: "green" | "orange" | "blue" | "red";
  attention?: boolean;
  members?: number;
  serviceRules?: Partial<CreationPayload>;
};

export type Message = {
  id: string;
  conversationId: string;
  sender: "teacher" | "ai" | "system";
  type: "text" | "image" | "task" | "archive";
  content?: string;
  imageUrl?: string;
  fileName?: string;
  attachments?: MessageAttachment[];
  taskCardId?: string;
  createdAt: string;
};

export type MessageAttachment = {
  id: string;
  fileName: string;
  imageUrl?: string;
};

export type SideChatContextOption = {
  id: string;
  type: SideChatContextType;
  title: string;
  description: string;
  sourceId?: string;
};

export type SideChatMessage = {
  id: string;
  sender: "teacher" | "assistant";
  content: string;
  createdAt: string;
};

export type SideChatSession = {
  id: string;
  conversationId: string;
  title: string;
  contextType: SideChatContextType;
  contextLabel: string;
  sourceId?: string;
  messages: SideChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type TimelineRecord = {
  id: string;
  conversationId: string;
  sourceTaskId: string;
  skillId?: SkillId;
  title: string;
  summary: string;
  archiveTarget: string;
  profileUpdates?: ProfileUpdateRecord[];
  createdAt: string;
};

export type ProfileUpdateTarget = "ability_profile" | "weakness_event" | "recurrence_risk" | "action_plan" | "monthly_report_source";

export type ProfileUpdateRecord = {
  id: string;
  target: ProfileUpdateTarget;
  label: string;
  value: string;
  evidence: string;
  sourceTaskId: string;
  confirmedAt: string;
};

export type TaskStep = {
  label: string;
  status: "waiting" | "running" | "completed" | "failed";
};

export type TaskCard = {
  id: string;
  conversationId: string;
  targetName: string;
  skillRunId?: string;
  skillId?: SkillId;
  taskType: TaskType;
  title: string;
  subject?: string;
  status: "running" | "completed" | "failed" | "copied" | "feedback_done" | "archived";
  currentStepIndex: number;
  steps: TaskStep[];
  inputSummary?: string;
  contextSources?: ContextSource[];
  confidenceLevel?: SkillConfidenceLevel;
  structuredResult?: Record<string, unknown>;
  archiveTarget?: string;
  actions?: SkillAction[];
  nextSuggestions?: SkillId[];
  originalOutput?: SkillOutputVersion;
  currentOutput?: SkillOutputVersion;
  archivedOutput?: SkillOutputVersion;
  editEvents?: SkillEditEvent[];
  actionEvents?: SkillRunEvent[];
  summary?: string;
  feedbackText?: string;
  detail?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserPreferences = {
  autoAnalyzeUploadedPaper: boolean;
  autoArchiveLearningEvidence: boolean;
  feedbackTone: FeedbackTone;
  defaultTaskSet: string[];
};

export type TeacherProfile = {
  contact: string;
  nickname: string;
  role?: "individual" | "organization";
  organizationName?: string;
  city?: string;
  subjects?: string[];
  teachingStages?: string[];
  teachingModes?: string[];
};

export type ChatState = {
  conversations: Conversation[];
  messages: Message[];
  taskCards: TaskCard[];
  timelineRecords: TimelineRecord[];
  preferences: UserPreferences;
  teacher: TeacherProfile | null;
  currentConversationId?: string;
};

export type CreationPayload = {
  name: string;
  grade: string;
  subject: string;
  className?: string;
  classType?: string;
  learningGoal?: string;
  frequency?: string;
  courseDay?: string;
  courseTime?: string;
  duration?: string;
  repeatSchedule?: boolean;
  totalLessons?: string;
  needsFeedback?: boolean;
  feedbackTrigger?: string;
  feedbackDeadline?: string;
  reminder?: string;
  appReminder?: boolean;
  wechatPush?: boolean;
};
