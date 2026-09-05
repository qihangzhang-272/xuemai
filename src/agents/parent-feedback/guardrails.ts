import { evaluateGuardrails, createPatternGuardrailRule, type GuardrailResult, type GuardrailRule } from "../shared/guardrails/guardrail-engine";
import { PARENT_COMMUNICATION_GUARDRAIL_RULES } from "../shared/guardrails/parent-communication-rules";
import { PRIVACY_GUARDRAIL_RULES } from "../shared/guardrails/privacy-rules";
import { PARENT_FEEDBACK_BANNED_PHRASES } from "./constants";
import type { ParentFeedbackModelOutput } from "./types";

export const PARENT_FEEDBACK_GUARDRAIL_RULES: GuardrailRule[] = [
  ...PRIVACY_GUARDRAIL_RULES,
  ...PARENT_COMMUNICATION_GUARDRAIL_RULES,
  ...PARENT_FEEDBACK_BANNED_PHRASES.map((phrase) =>
    createPatternGuardrailRule({
      id: `parent-feedback.banned-phrase.${phrase}`,
      description: `Parent feedback must avoid the phrase: ${phrase}`,
      severity: "warning",
      patterns: [new RegExp(escapeRegExp(phrase), "g")]
    })
  )
];

export function runParentFeedbackGuardrails(output: ParentFeedbackModelOutput): GuardrailResult {
  return evaluateGuardrails(
    {
      content: [output.feedbackText, output.coreIssue, output.nextAction, JSON.stringify(output.suggestedProfileUpdate ?? {})].join("\n")
    },
    PARENT_FEEDBACK_GUARDRAIL_RULES
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
