import type { AgentMetadata, AgentName } from "../../types";
import type { AssembledContext } from "../context/context-types";
import type { EvaluationResult } from "../evaluation/evaluator";
import type { GuardrailResult } from "../guardrails/guardrail-engine";
import type { AgentError } from "../recovery/error-map";
import type { AgentRunStatus } from "./run-status";

export type AgentRunRequest<TInput = unknown> = {
  agentName: AgentName;
  teacherId: string;
  studentId?: string;
  classId?: string;
  taskId?: string;
  input: TInput;
  context?: AssembledContext;
  metadata?: Record<string, unknown>;
};

export type AgentRunHandlerResult<TOutput = unknown> = {
  output?: TOutput;
  rawModelOutput?: unknown;
  status?: Extract<AgentRunStatus, "success" | "fallback">;
  evaluation?: EvaluationResult;
  guardrails?: GuardrailResult;
  qualityScore?: number;
  warnings?: string[];
  metadata?: Record<string, unknown>;
};

export type AgentRunFailure = {
  status: Extract<AgentRunStatus, "failed" | "cancelled">;
  error: AgentError;
  warnings?: string[];
};

export type AgentRunExecution<TOutput = unknown> = {
  agentName: AgentName;
  agentVersion: string;
  status: AgentRunStatus;
  startedAt: string;
  completedAt?: string;
  latencyMs?: number;
  output?: TOutput;
  rawModelOutput?: unknown;
  error?: AgentError;
  evaluation?: EvaluationResult;
  guardrails?: GuardrailResult;
  qualityScore?: number;
  warnings: string[];
  contextSummary?: Record<string, unknown>;
  contextRecordIds?: unknown[];
  metadata?: Record<string, unknown>;
  runLogId?: string;
};

export type AgentRunHandler<TInput = unknown, TOutput = unknown> = (
  request: AgentRunRequest<TInput>,
  helpers: AgentRunHelpers
) => Promise<AgentRunHandlerResult<TOutput>>;

export type AgentRunHelpers = {
  metadata: AgentMetadata;
  startedAt: string;
  runLogId?: string;
};
