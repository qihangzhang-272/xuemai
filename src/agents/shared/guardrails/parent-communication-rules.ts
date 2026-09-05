import { createPatternGuardrailRule, type GuardrailRule } from "./guardrail-engine";

export const PARENT_COMMUNICATION_GUARDRAIL_RULES: GuardrailRule[] = [
  createPatternGuardrailRule({
    id: "parent-communication.absolute-promise",
    description: "Parent communication should avoid absolute promises or guaranteed outcomes.",
    severity: "warning",
    patterns: [/保证/g, /一定能/g, /肯定会/g]
  }),
  createPatternGuardrailRule({
    id: "parent-communication.diagnosis",
    description: "Parent communication should not make medical or psychological diagnoses.",
    severity: "block",
    patterns: [/多动症/g, /抑郁症/g, /心理疾病/g]
  }),
  createPatternGuardrailRule({
    id: "parent-communication.shame",
    description: "Parent communication should avoid shaming, blaming, or anxiety-inducing wording.",
    severity: "warning",
    patterns: [/太差/g, /很糟糕/g, /不努力/g, /家长必须/g]
  })
];
