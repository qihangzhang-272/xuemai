import type { AgentName } from "../../types";
import type { ContextRecordRef } from "../context/context-types";
import type { AgentRunStatus } from "../run/run-status";

export type AgentRunLogRef = {
  id?: string;
};

export type AgentRunStartLog = {
  agent_name: AgentName;
  agent_version: string;
  teacher_id: string;
  student_id?: string;
  class_id?: string;
  task_id?: string;
  input?: unknown;
  context_summary?: Record<string, unknown>;
  context_record_ids?: ContextRecordRef[];
  status: Extract<AgentRunStatus, "running">;
  warnings?: string[];
};

export type AgentRunCompleteLog = {
  id?: string;
  status: Extract<AgentRunStatus, "success" | "fallback">;
  raw_model_output?: unknown;
  final_output?: unknown;
  context_summary?: Record<string, unknown>;
  context_record_ids?: ContextRecordRef[];
  quality_score?: number;
  warnings?: string[];
  latency_ms?: number;
  token_usage?: Record<string, unknown>;
};

export type AgentRunFailureLog = {
  id?: string;
  status: Extract<AgentRunStatus, "failed" | "cancelled">;
  error_code: string;
  error_message: string;
  warnings?: string[];
  latency_ms?: number;
};

export type AgentOutputLog = {
  agent_run_id?: string;
  agent_name: AgentName;
  teacher_id: string;
  student_id?: string;
  class_id?: string;
  output_type: string;
  output_text?: string;
  output_json?: unknown;
  quality_score?: number;
  status: "draft" | "edited" | "confirmed" | "discarded" | "archived";
  is_final: boolean;
};

export type AgentOutputLogRef = {
  id?: string;
};
