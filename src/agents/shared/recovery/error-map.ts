export type AgentErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_INPUT"
  | "STUDENT_NOT_FOUND"
  | "CONFIRM_FAILED"
  | "SUPABASE_UNAVAILABLE"
  | "SKILL_PERSISTENCE_SYNC_DISABLED"
  | "MODEL_RESPONSE_INVALID"
  | "GUARDRAIL_BLOCKED"
  | "model_unavailable"
  | "model_output_invalid"
  | "context_unavailable"
  | "tool_unavailable"
  | "permission_required"
  | "guardrail_blocked"
  | "unknown_error";

export type AgentError = {
  code: AgentErrorCode;
  message: string;
  recoverable: boolean;
  cause?: unknown;
};

export function createAgentError(input: AgentError): AgentError {
  return input;
}

export function mapUnknownError(error: unknown): AgentError {
  if (isAgentError(error)) return error;

  if (error instanceof Error) {
    return {
      code: "unknown_error",
      message: error.message,
      recoverable: false,
      cause: error
    };
  }

  return {
    code: "unknown_error",
    message: "Unknown agent error",
    recoverable: false,
    cause: error
  };
}

export function isAgentError(error: unknown): error is AgentError {
  return typeof error === "object" && error !== null && "code" in error && "message" in error && "recoverable" in error;
}
