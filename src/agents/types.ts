import type { AgentRunStatus } from "./shared/run/run-status";

export type AgentStatus = "planned" | "experimental" | "stable" | "deprecated";

export type AgentName =
  | "parent-feedback"
  | "wrong-question-analysis"
  | "student-profile"
  | "monthly-report"
  | "batch-feedback"
  | "lesson-planning"
  | "teacher-orchestrator";

export type AgentCapability =
  | "generate_parent_feedback"
  | "analyze_wrong_question"
  | "update_student_profile"
  | "generate_monthly_report"
  | "batch_generate_feedback"
  | "plan_lesson"
  | "route_teacher_task";

export type AgentMetadata = {
  name: AgentName;
  displayName: string;
  description: string;
  capabilities: AgentCapability[];
  inputSchemaName: string;
  outputSchemaName: string;
  version: string;
  status: AgentStatus;
};

export type { AgentRunStatus };

export type AgentRunBaseInput = {
  teacherId: string;
  studentId?: string;
  classId?: string;
  taskId?: string;
};

export type AgentRunResult<TOutput> = {
  success: boolean;
  data?: TOutput;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  meta?: {
    agentRunId?: string;
    agentOutputId?: string;
    qualityScore?: number;
    warnings?: string[];
    latencyMs?: number;
  };
};
