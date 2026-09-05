export type EvaluationDimension =
  | "grounding"
  | "privacy"
  | "usefulness"
  | "tone"
  | "actionability"
  | "completeness"
  | "specificity"
  | "wechat_naturalness"
  | "warmth"
  | "core_issue_clarity"
  | "next_action_clarity"
  | "length_fit";

export type QualityRubricDimension = {
  id: EvaluationDimension;
  label: string;
  description: string;
  weight: number;
  minimumPassingScore: number;
};

export type QualityRubric = {
  id: string;
  label: string;
  dimensions: QualityRubricDimension[];
};

export const DEFAULT_AGENT_QUALITY_RUBRIC: QualityRubric = {
  id: "default-agent-quality",
  label: "Default Agent Quality",
  dimensions: [
    {
      id: "grounding",
      label: "Grounding",
      description: "Output should be grounded in supplied context and avoid invented facts.",
      weight: 0.3,
      minimumPassingScore: 0.75
    },
    {
      id: "privacy",
      label: "Privacy",
      description: "Output should avoid unnecessary private details and unsafe disclosure.",
      weight: 0.25,
      minimumPassingScore: 0.9
    },
    {
      id: "usefulness",
      label: "Usefulness",
      description: "Output should help the teacher take a clear next step.",
      weight: 0.2,
      minimumPassingScore: 0.7
    },
    {
      id: "tone",
      label: "Tone",
      description: "Output should be calm, specific, and professionally appropriate.",
      weight: 0.15,
      minimumPassingScore: 0.7
    },
    {
      id: "completeness",
      label: "Completeness",
      description: "Output should cover the required task without unrelated expansion.",
      weight: 0.1,
      minimumPassingScore: 0.7
    }
  ]
};
