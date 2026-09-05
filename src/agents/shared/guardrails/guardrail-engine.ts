export type GuardrailSeverity = "info" | "warning" | "block";

export type GuardrailFinding = {
  ruleId: string;
  severity: GuardrailSeverity;
  message: string;
  matchedText?: string;
};

export type GuardrailInput = {
  content: string;
  metadata?: Record<string, unknown>;
};

export type GuardrailRule = {
  id: string;
  description: string;
  severity: GuardrailSeverity;
  check: (input: GuardrailInput) => GuardrailFinding[];
};

export type GuardrailResult = {
  passed: boolean;
  findings: GuardrailFinding[];
  warnings: string[];
};

export function evaluateGuardrails(input: GuardrailInput, rules: GuardrailRule[]): GuardrailResult {
  const findings = rules.flatMap((rule) => rule.check(input));

  return {
    passed: findings.every((finding) => finding.severity !== "block"),
    findings,
    warnings: findings.filter((finding) => finding.severity !== "info").map((finding) => finding.message)
  };
}

export function createPatternGuardrailRule(rule: Omit<GuardrailRule, "check"> & { patterns: RegExp[] }): GuardrailRule {
  return {
    id: rule.id,
    description: rule.description,
    severity: rule.severity,
    check: (input) =>
      rule.patterns.flatMap((pattern) => {
        const matches = input.content.match(pattern);
        if (!matches) return [];

        return matches.map((matchedText) => ({
          ruleId: rule.id,
          severity: rule.severity,
          message: rule.description,
          matchedText
        }));
      })
  };
}
