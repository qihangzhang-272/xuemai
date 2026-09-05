import { calculateOverallScore, findFailedDimensions, type EvaluationDimensionScore } from "./scoring";
import { DEFAULT_AGENT_QUALITY_RUBRIC, type QualityRubric } from "./quality-rubrics";

export type EvaluationResult = {
  rubricId: string;
  overallScore: number;
  dimensionScores: EvaluationDimensionScore[];
  passed: boolean;
  requiresRevision: boolean;
  warnings: string[];
};

export type EvaluationInput = {
  output: unknown;
  contextSummary?: Record<string, unknown>;
  warnings?: string[];
};

export type EvaluationScorer = (input: EvaluationInput, rubric: QualityRubric) => EvaluationDimensionScore[];

export function evaluateOutput(input: EvaluationInput, scorer: EvaluationScorer, rubric: QualityRubric = DEFAULT_AGENT_QUALITY_RUBRIC): EvaluationResult {
  const dimensionScores = scorer(input, rubric);
  const overallScore = calculateOverallScore(dimensionScores, rubric);
  const failedDimensions = findFailedDimensions(dimensionScores, rubric);
  const warnings = [...(input.warnings ?? [])];

  if (failedDimensions.length > 0) {
    warnings.push(`Evaluation failed dimensions: ${failedDimensions.map((dimension) => dimension.id).join(", ")}`);
  }

  return {
    rubricId: rubric.id,
    overallScore,
    dimensionScores,
    passed: failedDimensions.length === 0,
    requiresRevision: failedDimensions.length > 0,
    warnings
  };
}
