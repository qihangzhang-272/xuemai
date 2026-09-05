import type { AgentErrorCode } from "./error-map";
import { mapUnknownError } from "./error-map";

export type RetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrorCodes: AgentErrorCode[];
};

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 2,
  baseDelayMs: 300,
  maxDelayMs: 1500,
  retryableErrorCodes: ["model_unavailable", "tool_unavailable"]
};

export async function withRetry<T>(operation: () => Promise<T>, policy: RetryPolicy = DEFAULT_RETRY_POLICY): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      const agentError = mapUnknownError(error);
      const shouldRetry = attempt < policy.maxAttempts && agentError.recoverable && policy.retryableErrorCodes.includes(agentError.code);

      if (!shouldRetry) {
        throw agentError;
      }

      await delay(Math.min(policy.baseDelayMs * attempt, policy.maxDelayMs));
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
