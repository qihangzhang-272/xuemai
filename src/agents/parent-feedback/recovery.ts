import { createAgentError } from "../shared/recovery/error-map";

export function createInvalidParentFeedbackInputError(message: string) {
  return createAgentError({
    code: "INVALID_INPUT",
    message,
    recoverable: true
  });
}

export function createInvalidModelResponseError(message = "模型输出格式不正确，请稍后重试。") {
  return createAgentError({
    code: "MODEL_RESPONSE_INVALID",
    message,
    recoverable: true
  });
}

export function createGuardrailBlockedError(message = "生成内容未通过安全检查，请调整输入后重试。") {
  return createAgentError({
    code: "GUARDRAIL_BLOCKED",
    message,
    recoverable: true
  });
}
