import type { AgentRunStatus } from "../run/run-status";
import type { AgentError } from "./error-map";

export type AgentFailure = {
  status: Extract<AgentRunStatus, "failed" | "fallback" | "cancelled">;
  error: AgentError;
  warnings: string[];
};

export type FallbackResult<TOutput = unknown> = {
  status: Extract<AgentRunStatus, "fallback">;
  output?: TOutput;
  failure: AgentFailure;
};

export function createFallbackResult<TOutput>(failure: AgentFailure, output?: TOutput): FallbackResult<TOutput> {
  return {
    status: "fallback",
    output,
    failure: {
      ...failure,
      status: "fallback"
    }
  };
}
