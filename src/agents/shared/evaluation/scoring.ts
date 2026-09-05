import type { EvaluationDimension, QualityRubric } from "./quality-rubrics";

export type EvaluationDimensionScore = {
  dimension: EvaluationDimension;
  score: number;
  reasons: string[];
};

export function clampScore(score: number) {
  if (Number.isNaN(score)) return 0;
  return Math.min(1, Math.max(0, score));
}

export function calculateOverallScore(scores: EvaluationDimensionScore[], rubric: QualityRubric) {
  if (scores.length === 0) return 0;

  const scoreMap = new Map(scores.map((score) => [score.dimension, clampScore(score.score)]));
  const totalWeight = rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);

  if (totalWeight <= 0) return 0;

  return rubric.dimensions.reduce((sum, dimension) => {
    const dimensionScore = scoreMap.get(dimension.id) ?? 0;
    return sum + dimensionScore * (dimension.weight / totalWeight);
  }, 0);
}

export function findFailedDimensions(scores: EvaluationDimensionScore[], rubric: QualityRubric) {
  const scoreMap = new Map(scores.map((score) => [score.dimension, clampScore(score.score)]));

  return rubric.dimensions.filter((dimension) => (scoreMap.get(dimension.id) ?? 0) < dimension.minimumPassingScore);
}
