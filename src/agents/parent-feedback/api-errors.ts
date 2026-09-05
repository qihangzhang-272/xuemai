import type { AgentError } from "../shared/recovery/error-map";

export function getParentFeedbackApiStatus(error: AgentError) {
  if (error.code === "AUTH_REQUIRED") return 401;
  if (error.code === "permission_required") return 403;
  if (error.code === "INVALID_INPUT") return 400;
  if (error.code === "STUDENT_NOT_FOUND") return 404;
  return error.recoverable ? 400 : 500;
}

export function toParentFeedbackApiError(error: AgentError) {
  return {
    code: error.code,
    message: error.message,
    recoverable: error.recoverable
  };
}
