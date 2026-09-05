export type ContextSource =
  | "teacher_input"
  | "student_profile"
  | "learning_record"
  | "wrong_question"
  | "feedback_history"
  | "teacher_preference"
  | "class_context"
  | "agent_output"
  | "system_rule";

export type ContextPriority = "required" | "high" | "medium" | "low";

export type ContextRecordRef = {
  source: ContextSource;
  id: string;
  table?: string;
};

export type ContextBlock = {
  id: string;
  source: ContextSource;
  title: string;
  content: string;
  priority: ContextPriority;
  metadata?: Record<string, unknown>;
  recordIds?: ContextRecordRef[];
  sensitive?: boolean;
};

export type AssembledContext = {
  blocks: ContextBlock[];
  contextSummary: Record<string, unknown>;
  contextRecordIds: ContextRecordRef[];
  warnings: string[];
  tokenEstimate?: number;
  metadata?: Record<string, unknown>;
};
