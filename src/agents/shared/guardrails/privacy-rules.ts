import { createPatternGuardrailRule, type GuardrailRule } from "./guardrail-engine";

export const PRIVACY_GUARDRAIL_RULES: GuardrailRule[] = [
  createPatternGuardrailRule({
    id: "privacy.phone-number",
    description: "Output appears to include a phone number. Avoid unnecessary private contact details.",
    severity: "warning",
    patterns: [/(?:\+?86[- ]?)?1[3-9]\d{9}/g]
  }),
  createPatternGuardrailRule({
    id: "privacy.national-id",
    description: "Output appears to include a national ID-like number. Do not expose sensitive identity data.",
    severity: "block",
    patterns: [/\b\d{17}[\dXx]\b/g]
  }),
  createPatternGuardrailRule({
    id: "privacy.full-context-leak",
    description: "Output appears to mention full private context dumps. Summarize safely instead.",
    severity: "warning",
    patterns: [/完整上下文/g, /全部学生档案/g]
  })
];
