import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareStudentLearningMaterialModelRegressionDatasetsFromFiles,
  type StudentLearningMaterialModelRegressionComparisonInput
} from "../src/skills/student-learning-material-analyzer/evaluation-regression";
import type { StudentLearningMaterialEvaluationClaimPolicy } from "../src/skills/student-learning-material-analyzer/evaluation";
import type { StudentLearningMaterialEvaluationDatasetFile } from "../src/skills/student-learning-material-analyzer/evaluation-files";
import type { StudentLearningMaterialAnalysis } from "../src/skills/student-learning-material-analyzer/types";

const smokeClaimPolicy: StudentLearningMaterialEvaluationClaimPolicy = {
  minimum_case_count: 1,
  minimum_question_count: 2,
  minimum_definitive_allowed_question_count: 1,
  minimum_teacher_review_expected_question_count: 1,
  minimum_material_type_count: 1,
  minimum_subject_count: 1,
  required_education_stages: ["middle"],
  minimum_region_or_curriculum_count: 1,
  require_human_labeled_dataset: false,
  require_double_labeled: false,
  require_adjudicated: false,
  require_anonymized: true,
  require_asset_preflight_ready: false
};

describe("student learning material model regression comparison", () => {
  it("passes when candidate metrics do not regress against the same gold dataset", () => {
    const dir = mkdtempSync(join(tmpdir(), "xuemai-model-regression-pass-"));
    const baselinePath = writeDataset(dir, "baseline.json", {
      datasetId: "synthetic-regression-baseline",
      provider: "mock",
      model: "baseline-reasoner"
    });
    const candidatePath = writeDataset(dir, "candidate.json", {
      datasetId: "synthetic-regression-candidate",
      provider: "mock",
      model: "candidate-reasoner"
    });

    const result = compareStudentLearningMaterialModelRegressionDatasetsFromFiles({
      baselineDatasetPath: baselinePath,
      candidateDatasetPath: candidatePath,
      claimPolicy: smokeClaimPolicy
    });

    expect(result.ok, result.report).toBe(true);
    expect(result.regressions).toEqual([]);
    expect(result.candidateFinalArtifactErrors).toEqual([]);
    expect(result.report).toContain("StudentLearningMaterial model regression: PASS");
    expect(result.report).toContain("candidate.model=mock/candidate-reasoner");
  });

  it("fails when a candidate model introduces a new correctness regression", () => {
    const dir = mkdtempSync(join(tmpdir(), "xuemai-model-regression-fail-"));
    const baselinePath = writeDataset(dir, "baseline.json", {
      datasetId: "synthetic-regression-baseline",
      provider: "mock",
      model: "baseline-reasoner"
    });
    const candidatePath = writeDataset(dir, "candidate.json", {
      datasetId: "synthetic-regression-candidate",
      provider: "mock",
      model: "candidate-reasoner",
      mutateAnalysis: (analysis) => {
        analysis.question_analyses[0].correctnessJudgement.status = "incorrect";
      }
    });

    const result = compareStudentLearningMaterialModelRegressionDatasetsFromFiles({
      baselineDatasetPath: baselinePath,
      candidateDatasetPath: candidatePath,
      claimPolicy: smokeClaimPolicy
    });

    expect(result.ok).toBe(false);
    expect(result.regressions.join(" ")).toContain("指标退步：highConfidenceCorrectnessAccuracy");
    expect(result.report).toContain("StudentLearningMaterial model regression: FAIL");
    expect(result.report).toContain("delta.highConfidenceCorrectnessAccuracy");
  });

  it("fails when candidate dataset changes gold labels for the same case ids", () => {
    const dir = mkdtempSync(join(tmpdir(), "xuemai-model-regression-gold-drift-"));
    const baselinePath = writeDataset(dir, "baseline.json", {
      datasetId: "synthetic-regression-baseline",
      provider: "mock",
      model: "baseline-reasoner"
    });
    const candidatePath = writeDataset(dir, "candidate.json", {
      datasetId: "synthetic-regression-candidate",
      provider: "mock",
      model: "candidate-reasoner",
      mutateGold: (gold) => {
        gold.questions[0].expected_correctness = "correct";
      }
    });

    const result = compareStudentLearningMaterialModelRegressionDatasetsFromFiles({
      baselineDatasetPath: baselinePath,
      candidateDatasetPath: candidatePath,
      claimPolicy: smokeClaimPolicy
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("gold case differs between baseline and candidate datasets");
    expect(result.errors.join(" ")).toContain("model regression must use the same human-labeled gold");
  });

  it("fails when candidate analysis can no longer produce a valid teacher-facing delivery artifact", () => {
    const dir = mkdtempSync(join(tmpdir(), "xuemai-model-regression-delivery-"));
    const baselinePath = writeDataset(dir, "baseline.json", {
      datasetId: "synthetic-regression-baseline",
      provider: "mock",
      model: "baseline-reasoner"
    });
    const candidatePath = writeDataset(dir, "candidate.json", {
      datasetId: "synthetic-regression-candidate",
      provider: "mock",
      model: "candidate-reasoner",
      mutateAnalysis: (analysis) => {
        analysis.teacher_professional_report.report_title = "";
      }
    });

    const result = compareStudentLearningMaterialModelRegressionDatasetsFromFiles({
      baselineDatasetPath: baselinePath,
      candidateDatasetPath: candidatePath,
      claimPolicy: smokeClaimPolicy
    });

    expect(result.ok).toBe(false);
    expect(result.candidateFinalArtifactErrors.join(" ")).toContain("teacher_report.title is required");
    expect(result.regressions.join(" ")).toContain("候选模型最终交付物无效");
    expect(result.report).toContain("candidateFinalArtifactErrors=case_id=synthetic-mainland-k12-math-exam-001 result:");
  });

  it("fails when candidate analysis breaks the teacher-confirmed monthly report chain", () => {
    const dir = mkdtempSync(join(tmpdir(), "xuemai-model-regression-monthly-"));
    const baselinePath = writeDataset(dir, "baseline.json", {
      datasetId: "synthetic-regression-baseline",
      provider: "mock",
      model: "baseline-reasoner"
    });
    const candidatePath = writeDataset(dir, "candidate.json", {
      datasetId: "synthetic-regression-candidate",
      provider: "mock",
      model: "candidate-reasoner",
      mutateAnalysis: (analysis) => {
        analysis.monthly_report_snapshot.parent_visible_summary = "保证提分。";
      }
    });

    const result = compareStudentLearningMaterialModelRegressionDatasetsFromFiles({
      baselineDatasetPath: baselinePath,
      candidateDatasetPath: candidatePath,
      claimPolicy: smokeClaimPolicy
    });

    expect(result.ok).toBe(false);
    expect(result.candidateFinalArtifactErrors.join(" ")).toContain("monthly_report_input");
    expect(result.candidateFinalArtifactErrors.join(" ")).toContain("monthly snapshot parent_visible_summary contains forbidden expressions");
    expect(result.regressions.join(" ")).toContain("候选模型最终交付物无效");
    expect(result.report).toContain("candidateFinalArtifactErrors=case_id=synthetic-mainland-k12-math-exam-001 monthly_report_input:");
  });

  it("fails formal comparison when datasets are not claimable even if metrics match", () => {
    const dir = mkdtempSync(join(tmpdir(), "xuemai-model-regression-not-claimable-"));
    const baselinePath = writeDataset(dir, "baseline.json", {
      datasetId: "human-baseline-without-asset-preflight",
      provider: "mock",
      model: "baseline-reasoner",
      datasetKind: "human_labeled"
    });
    const candidatePath = writeDataset(dir, "candidate.json", {
      datasetId: "human-candidate-without-asset-preflight",
      provider: "mock",
      model: "candidate-reasoner",
      datasetKind: "human_labeled"
    });

    const result = compareStudentLearningMaterialModelRegressionDatasetsFromFiles({
      baselineDatasetPath: baselinePath,
      candidateDatasetPath: candidatePath,
      claimPolicy: {
        ...smokeClaimPolicy,
        require_human_labeled_dataset: true,
        require_double_labeled: true,
        require_adjudicated: true,
        require_asset_preflight_ready: true
      },
      requireClaimable99: true
    });

    expect(result.ok).toBe(false);
    expect(result.regressions.join(" ")).toContain("baseline dataset 未达到 claimable99Correctness");
    expect(result.regressions.join(" ")).toContain("candidate dataset 未达到 claimable99Correctness");
    expect(result.report).toContain("baseline.claimable99Correctness=no");
    expect(result.report).toContain("candidate.claimable99Correctness=no");
  });

  it("runs the baseline/candidate datasets specified by env vars", () => {
    const baselineDatasetPath = process.env.XUEMAI_EVAL_BASELINE_DATASET;
    const candidateDatasetPath = process.env.XUEMAI_EVAL_CANDIDATE_DATASET;

    if (!baselineDatasetPath || !candidateDatasetPath) {
      if (process.env.XUEMAI_EVAL_REGRESSION_REQUIRED === "1") {
        throw new Error("Set XUEMAI_EVAL_BASELINE_DATASET=/absolute/path/to/baseline.json and XUEMAI_EVAL_CANDIDATE_DATASET=/absolute/path/to/candidate.json");
      }
      expect(baselineDatasetPath || candidateDatasetPath).toBeUndefined();
      return;
    }

    const input: StudentLearningMaterialModelRegressionComparisonInput = {
      baselineDatasetPath,
      candidateDatasetPath,
      requireClaimable99: process.env.XUEMAI_EVAL_REGRESSION_ALLOW_SMOKE !== "1"
    };
    const result = compareStudentLearningMaterialModelRegressionDatasetsFromFiles(input);
    console.log(`\n${result.report}`);

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

function writeDataset(
  dir: string,
  fileName: string,
  options: {
    datasetId: string;
    provider: string;
    model: string;
    datasetKind?: StudentLearningMaterialEvaluationDatasetFile["dataset_kind"];
    mutateGold?: (gold: {
      questions: Array<{
        expected_correctness?: "correct" | "partially_correct" | "incorrect" | "unknown" | "needs_teacher_review";
      }>;
    }) => void;
    mutateAnalysis?: (analysis: StudentLearningMaterialAnalysis) => void;
  }
) {
  const dataset = cloneFixture();
  dataset.dataset_id = options.datasetId;
  if (options.datasetKind) dataset.dataset_kind = options.datasetKind;
  dataset.model_under_test = {
    provider_name: options.provider,
    model_name: options.model,
    prompt_version: "regression-test"
  };
  const analysis = dataset.cases[0].analysis as StudentLearningMaterialAnalysis;
  const gold = dataset.cases[0].gold as {
    questions: Array<{
      expected_correctness?: "correct" | "partially_correct" | "incorrect" | "unknown" | "needs_teacher_review";
    }>;
  };
  options.mutateGold?.(gold);
  options.mutateAnalysis?.(analysis);
  const path = join(dir, fileName);
  writeFileSync(path, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  return path;
}

function cloneFixture(): StudentLearningMaterialEvaluationDatasetFile {
  return JSON.parse(readFileSync("tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json", "utf8")) as StudentLearningMaterialEvaluationDatasetFile;
}
