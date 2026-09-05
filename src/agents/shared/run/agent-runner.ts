import type { AgentMetadata } from "../../types";
import type { RunLogger } from "../logging/run-logger";
import { createNoopRunLogger } from "../logging/run-logger";
import { mapUnknownError } from "../recovery/error-map";
import type { AgentRunExecution, AgentRunHandler, AgentRunRequest } from "./run-types";

export type AgentRunnerOptions = {
  logger?: RunLogger;
  now?: () => Date;
};

export function createAgentRunner<TInput, TOutput>(
  metadata: AgentMetadata,
  handler: AgentRunHandler<TInput, TOutput>,
  options: AgentRunnerOptions = {}
) {
  const logger = options.logger ?? createNoopRunLogger();
  const now = options.now ?? (() => new Date());

  return async function runAgent(request: Omit<AgentRunRequest<TInput>, "agentName">): Promise<AgentRunExecution<TOutput>> {
    const started = now();
    const startedAt = started.toISOString();
    const warnings = [...(request.context?.warnings ?? [])];

    const runLog = await logger.startRun({
      agent_name: metadata.name,
      agent_version: metadata.version,
      teacher_id: request.teacherId,
      student_id: request.studentId,
      class_id: request.classId,
      task_id: request.taskId,
      context_summary: request.context?.contextSummary,
      context_record_ids: request.context?.contextRecordIds,
      status: "running",
      warnings
    });

    try {
      const result = await handler(
        {
          ...request,
          agentName: metadata.name
        },
        {
          metadata,
          startedAt,
          runLogId: runLog.id
        }
      );
      const completedAt = now().toISOString();
      const latencyMs = new Date(completedAt).getTime() - started.getTime();
      const status = result.status ?? "success";
      const allWarnings = [...warnings, ...(result.warnings ?? [])];

      await logger.completeRun({
        id: runLog.id,
        status,
        raw_model_output: result.rawModelOutput,
        final_output: result.output,
        quality_score: result.qualityScore ?? result.evaluation?.overallScore,
        warnings: allWarnings,
        latency_ms: latencyMs
      });

      return {
        agentName: metadata.name,
        agentVersion: metadata.version,
        status,
        startedAt,
        completedAt,
        latencyMs,
        output: result.output,
        rawModelOutput: result.rawModelOutput,
        evaluation: result.evaluation,
        guardrails: result.guardrails,
        qualityScore: result.qualityScore ?? result.evaluation?.overallScore,
        warnings: allWarnings,
        contextSummary: request.context?.contextSummary,
        contextRecordIds: request.context?.contextRecordIds,
        metadata: result.metadata,
        runLogId: runLog.id
      };
    } catch (error) {
      const agentError = mapUnknownError(error);
      const completedAt = now().toISOString();
      const latencyMs = new Date(completedAt).getTime() - started.getTime();

      await logger.failRun({
        id: runLog.id,
        status: "failed",
        error_code: agentError.code,
        error_message: agentError.message,
        warnings,
        latency_ms: latencyMs
      });

      return {
        agentName: metadata.name,
        agentVersion: metadata.version,
        status: "failed",
        startedAt,
        completedAt,
        latencyMs,
        error: agentError,
        warnings,
        contextSummary: request.context?.contextSummary,
        contextRecordIds: request.context?.contextRecordIds,
        runLogId: runLog.id
      };
    }
  };
}
