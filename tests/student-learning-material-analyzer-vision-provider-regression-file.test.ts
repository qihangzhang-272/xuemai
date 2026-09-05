import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateQuestionSegmentationReviewFile } from "../src/skills/student-learning-material-analyzer/question-segmentation-review-files";
import type { VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";
import {
  compareStudentLearningMaterialVisionProviderRegressionReportsFromFiles,
  type StudentLearningMaterialVisionProviderRegressionComparisonInput
} from "../src/skills/student-learning-material-analyzer/vision-provider-regression";
import {
  generateVisionEvidencePacketFile,
  readVisionEvidencePacketFile
} from "../src/skills/student-learning-material-analyzer/vision-adapter-files";
import {
  generateVisionProviderTrialReportFile,
  readVisionProviderTrialReportFile
} from "../src/skills/student-learning-material-analyzer/vision-provider-trial-report-files";
import type { StudentLearningMaterialVisionProviderTrialReport } from "../src/skills/student-learning-material-analyzer/vision-provider-trial-report";

const fixtureInputPath = path.resolve(
  "tests/fixtures/student-learning-material-evaluation/provider-adapter/paddleocr-like-external-vision-input.json"
);

describe("student learning material Vision provider regression comparison", () => {
  it("passes when candidate Provider trial report does not regress against the baseline", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-provider-regression-pass-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const reviewPath = path.join(tempDir, "question-segmentation-review.json");
    const baselineReportPath = path.join(tempDir, "baseline-provider-trial-report.json");
    const candidateReportPath = path.join(tempDir, "candidate-provider-trial-report.json");

    try {
      await generateVisionEvidencePacketFile({
        externalVisionInputPath: fixtureInputPath,
        visionPacketOutputPath: packetPath,
        failOnWarnings: true
      });
      await generateQuestionSegmentationReviewFile({
        visionPacketPath: packetPath,
        segmentationReviewOutputPath: reviewPath,
        generatedAt: "2026-06-20T11:00:00+08:00"
      });
      await generateVisionProviderTrialReportFile({
        visionPacketPath: packetPath,
        segmentationReviewPath: reviewPath,
        providerTrialReportOutputPath: baselineReportPath,
        generatedAt: "2026-06-20T11:05:00+08:00",
        requireReady: true
      });
      const baselineReport = await readVisionProviderTrialReportFile(baselineReportPath);
      baselineReport.generated_at = "2026-06-20T11:10:00+08:00";
      await writeFile(candidateReportPath, `${JSON.stringify(baselineReport, null, 2)}\n`, "utf8");

      const result = compareStudentLearningMaterialVisionProviderRegressionReportsFromFiles({
        baselineReportPath,
        candidateReportPath
      });

      expect(result.ok, result.report).toBe(true);
      expect(result.regressions).toEqual([]);
      expect(result.report).toContain("StudentLearningMaterial vision provider regression: PASS");
      expect(result.report).toContain("candidate.readiness=ready_for_human_labeling");
      expect(result.report).toContain("delta.missing_crop_ref_count=0 - 0 = 0");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when candidate Provider loses crop_ref and definitive question readiness", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-provider-regression-crop-"));
    const baselinePacketPath = path.join(tempDir, "baseline-vision-packet.json");
    const candidatePacketPath = path.join(tempDir, "candidate-vision-packet.json");
    const baselineReviewPath = path.join(tempDir, "baseline-question-segmentation-review.json");
    const baselineReportPath = path.join(tempDir, "baseline-provider-trial-report.json");
    const candidateReportPath = path.join(tempDir, "candidate-provider-trial-report.json");

    try {
      await generateVisionEvidencePacketFile({
        externalVisionInputPath: fixtureInputPath,
        visionPacketOutputPath: baselinePacketPath,
        failOnWarnings: true
      });
      await generateQuestionSegmentationReviewFile({
        visionPacketPath: baselinePacketPath,
        segmentationReviewOutputPath: baselineReviewPath,
        generatedAt: "2026-06-20T11:00:00+08:00"
      });
      await generateVisionProviderTrialReportFile({
        visionPacketPath: baselinePacketPath,
        segmentationReviewPath: baselineReviewPath,
        providerTrialReportOutputPath: baselineReportPath,
        generatedAt: "2026-06-20T11:05:00+08:00",
        requireReady: true
      });

      const degradedPacket = removeCropRefs(await readVisionEvidencePacketFile(baselinePacketPath));
      await writeFile(candidatePacketPath, `${JSON.stringify(degradedPacket, null, 2)}\n`, "utf8");
      await generateVisionProviderTrialReportFile({
        visionPacketPath: candidatePacketPath,
        providerTrialReportOutputPath: candidateReportPath,
        generatedAt: "2026-06-20T11:10:00+08:00"
      });

      const result = compareStudentLearningMaterialVisionProviderRegressionReportsFromFiles({
        baselineReportPath,
        candidateReportPath
      });

      expect(result.ok).toBe(false);
      expect(result.candidate?.readiness).toBe("needs_evidence_completion");
      expect(result.numericDeltas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ metric: "missing_crop_ref_count", baseline: 0, candidate: 1, regressed: true }),
          expect.objectContaining({ metric: "segmentation_pass_count", baseline: 1, candidate: 0, regressed: true }),
          expect.objectContaining({ metric: "definitive_allowed_count", baseline: 1, candidate: 0, regressed: true })
        ])
      );
      expect(result.regressions.join(" ")).toContain("candidate Provider trial readiness=needs_evidence_completion");
      expect(result.regressions.join(" ")).toContain("题目切分状态退步");
      expect(result.regressions.join(" ")).toContain("丢失可硬判条件");
      expect(result.report).toContain("StudentLearningMaterial vision provider regression: FAIL");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when candidate Provider changes the same-material question order", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-provider-regression-order-"));
    const baselineReportPath = path.join(tempDir, "baseline-provider-trial-report.json");
    const candidateReportPath = path.join(tempDir, "candidate-provider-trial-report.json");

    try {
      const baselineReport = createReadyProviderTrialReport(["q001", "q002"]);
      const candidateReport: StudentLearningMaterialVisionProviderTrialReport = {
        ...baselineReport,
        plugin_provider: "candidate-ocr-provider",
        plugin_model_version: "v2",
        generated_at: "2026-06-20T11:10:00+08:00",
        questions: [...baselineReport.questions].reverse()
      };
      await writeFile(baselineReportPath, `${JSON.stringify(baselineReport, null, 2)}\n`, "utf8");
      await writeFile(candidateReportPath, `${JSON.stringify(candidateReport, null, 2)}\n`, "utf8");

      const result = compareStudentLearningMaterialVisionProviderRegressionReportsFromFiles({
        baselineReportPath,
        candidateReportPath
      });

      expect(result.ok).toBe(false);
      expect(result.reorderedQuestionIds).toEqual(["q001", "q002"]);
      expect(result.regressions.join(" ")).toContain("改变 baseline 题目顺序");
      expect(result.report).toContain("reorderedQuestions=q001, q002");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when candidate Provider changes page or question-number identity for the same question id", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-provider-regression-identity-"));
    const baselineReportPath = path.join(tempDir, "baseline-provider-trial-report.json");
    const candidateReportPath = path.join(tempDir, "candidate-provider-trial-report.json");

    try {
      const baselineReport = createReadyProviderTrialReport(["q001", "q002"]);
      const candidateReport: StudentLearningMaterialVisionProviderTrialReport = {
        ...baselineReport,
        plugin_provider: "candidate-ocr-provider",
        plugin_model_version: "v2",
        generated_at: "2026-06-20T11:10:00+08:00",
        questions: baselineReport.questions.map((question) =>
          question.question_id === "q002"
            ? {
                ...question,
                page_id: "page-002",
                question_number: "3"
              }
            : question
        )
      };
      await writeFile(baselineReportPath, `${JSON.stringify(baselineReport, null, 2)}\n`, "utf8");
      await writeFile(candidateReportPath, `${JSON.stringify(candidateReport, null, 2)}\n`, "utf8");

      const result = compareStudentLearningMaterialVisionProviderRegressionReportsFromFiles({
        baselineReportPath,
        candidateReportPath
      });

      expect(result.ok).toBe(false);
      expect(result.changedQuestionIdentityIds).toEqual(["q002"]);
      expect(result.regressions.join(" ")).toContain("改变 baseline 题目页码或题号身份");
      expect(result.report).toContain("changedQuestionIdentity=q002");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when candidate Provider loses student-trace or answer-basis evidence counts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-provider-regression-evidence-count-"));
    const baselineReportPath = path.join(tempDir, "baseline-provider-trial-report.json");
    const candidateReportPath = path.join(tempDir, "candidate-provider-trial-report.json");

    try {
      const baselineReport = createReadyProviderTrialReport(["q001", "q002"]);
      const candidateReport: StudentLearningMaterialVisionProviderTrialReport = {
        ...baselineReport,
        plugin_provider: "candidate-ocr-provider",
        plugin_model_version: "v2",
        generated_at: "2026-06-20T11:10:00+08:00",
        summary: {
          ...baselineReport.summary,
          evidence_count: baselineReport.summary.evidence_count - 2,
          student_trace_evidence_count: baselineReport.summary.student_trace_evidence_count - 1,
          answer_basis_evidence_count: baselineReport.summary.answer_basis_evidence_count - 1
        }
      };
      await writeFile(baselineReportPath, `${JSON.stringify(baselineReport, null, 2)}\n`, "utf8");
      await writeFile(candidateReportPath, `${JSON.stringify(candidateReport, null, 2)}\n`, "utf8");

      const result = compareStudentLearningMaterialVisionProviderRegressionReportsFromFiles({
        baselineReportPath,
        candidateReportPath
      });

      expect(result.ok).toBe(false);
      expect(result.numericDeltas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ metric: "evidence_count", baseline: 4, candidate: 2, regressed: true }),
          expect.objectContaining({ metric: "student_trace_evidence_count", baseline: 2, candidate: 1, regressed: true }),
          expect.objectContaining({ metric: "answer_basis_evidence_count", baseline: 2, candidate: 1, regressed: true })
        ])
      );
      expect(result.regressions.join(" ")).toContain("Provider 指标退步：student_trace_evidence_count");
      expect(result.regressions.join(" ")).toContain("Provider 指标退步：answer_basis_evidence_count");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when candidate Provider shifts per-question evidence while keeping summary counts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-provider-regression-question-evidence-"));
    const baselineReportPath = path.join(tempDir, "baseline-provider-trial-report.json");
    const candidateReportPath = path.join(tempDir, "candidate-provider-trial-report.json");

    try {
      const baselineReport = createReadyProviderTrialReport(["q001", "q002"]);
      const candidateReport: StudentLearningMaterialVisionProviderTrialReport = {
        ...baselineReport,
        plugin_provider: "candidate-ocr-provider",
        plugin_model_version: "v2",
        generated_at: "2026-06-20T11:10:00+08:00",
        questions: baselineReport.questions.map((question) => {
          if (question.question_id === "q001") {
            return {
              ...question,
              evidence_type_counts: {
                student_original_answer: 0,
                answer_key: 0
              }
            };
          }
          return {
            ...question,
            evidence_type_counts: {
              student_original_answer: 2,
              answer_key: 2
            }
          };
        })
      };
      await writeFile(baselineReportPath, `${JSON.stringify(baselineReport, null, 2)}\n`, "utf8");
      await writeFile(candidateReportPath, `${JSON.stringify(candidateReport, null, 2)}\n`, "utf8");

      const result = compareStudentLearningMaterialVisionProviderRegressionReportsFromFiles({
        baselineReportPath,
        candidateReportPath
      });

      expect(result.ok).toBe(false);
      expect(result.numericDeltas.find((delta) => delta.metric === "student_trace_evidence_count")?.regressed).toBe(false);
      expect(result.numericDeltas.find((delta) => delta.metric === "answer_basis_evidence_count")?.regressed).toBe(false);
      expect(result.regressions.join(" ")).toContain("question_id=q001 逐题学生痕迹证据数量退步");
      expect(result.regressions.join(" ")).toContain("question_id=q001 逐题答案依据证据数量退步");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("runs the baseline/candidate Provider trial reports specified by env vars", () => {
    const baselineReportPath = process.env.XUEMAI_BASELINE_PROVIDER_TRIAL_REPORT;
    const candidateReportPath = process.env.XUEMAI_CANDIDATE_PROVIDER_TRIAL_REPORT;

    if (!baselineReportPath || !candidateReportPath) {
      if (process.env.XUEMAI_VISION_PROVIDER_REGRESSION_REQUIRED === "1") {
        throw new Error(
          "Set XUEMAI_BASELINE_PROVIDER_TRIAL_REPORT=/absolute/path/to/baseline-provider-trial-report.json and XUEMAI_CANDIDATE_PROVIDER_TRIAL_REPORT=/absolute/path/to/candidate-provider-trial-report.json"
        );
      }
      expect(baselineReportPath || candidateReportPath).toBeUndefined();
      return;
    }

    const input: StudentLearningMaterialVisionProviderRegressionComparisonInput = {
      baselineReportPath,
      candidateReportPath,
      requireReadyForHumanLabeling: process.env.XUEMAI_VISION_PROVIDER_REGRESSION_ALLOW_INCOMPLETE !== "1",
      confidenceDropTolerance: Number(process.env.XUEMAI_VISION_PROVIDER_REGRESSION_CONFIDENCE_DROP_TOLERANCE ?? 0.05)
    };
    const result = compareStudentLearningMaterialVisionProviderRegressionReportsFromFiles(input);
    console.log(`\n${result.report}`);

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

function createReadyProviderTrialReport(questionIds: string[]): StudentLearningMaterialVisionProviderTrialReport {
  return {
    schema_version: "student_learning_material_vision_provider_trial_report.v0.1",
    source_material_id: "source-material-001",
    material_id: "material-001",
    vision_packet_id: "vision-packet-baseline",
    plugin_provider: "baseline-ocr-provider",
    plugin_model_version: "v1",
    generated_at: "2026-06-20T11:00:00+08:00",
    readiness: "ready_for_human_labeling",
    provider_candidates: [],
    summary: {
      page_count: 1,
      question_count: questionIds.length,
      evidence_count: questionIds.length * 2,
      student_trace_evidence_count: questionIds.length,
      answer_basis_evidence_count: questionIds.length,
      gate_statuses: {},
      segmentation_pass_count: questionIds.length,
      segmentation_needs_teacher_review_count: 0,
      segmentation_blocked_count: 0,
      missing_crop_ref_count: 0,
      low_confidence_region_count: 0,
      orphan_evidence_count: 0,
      evidence_without_region_count: 0,
      definitive_allowed_count: questionIds.length,
      teacher_review_required_count: 0,
      blocked_question_count: 0
    },
    blockers: [],
    warnings: [],
    next_steps: ["Proceed to same-source human labeling artifacts."],
    questions: questionIds.map((questionId, index) => ({
      question_id: questionId,
      question_number: String(index + 1),
      page_id: "page-001",
      segmentation_status: "pass",
      readiness_status: "definitive_allowed",
      definitive_judgement_allowed: true,
      review_required: false,
      confidence: 0.99,
      issues: [],
      readiness_reasons: [],
      evidence_refs: [`${questionId}-student-answer`, `${questionId}-answer-key`],
      evidence_type_counts: {
        student_original_answer: 1,
        answer_key: 1
      }
    }))
  };
}

function removeCropRefs(packet: VisionEvidencePacket): VisionEvidencePacket {
  const clone = JSON.parse(JSON.stringify(packet)) as VisionEvidencePacket;
  clone.questions.forEach((question) => {
    question.regions.forEach((region) => {
      delete region.crop_ref;
    });
    question.risk_flags = [...new Set([...question.risk_flags, "crop_missing"])];
  });
  clone.evidences.forEach((evidence) => {
    delete evidence.crop_ref;
  });
  clone.gates = clone.gates.map((gate) =>
    gate.gate_id === "question_segmentation"
      ? {
          ...gate,
          status: "degrade",
          reason: "题目边界、crop_ref 或区域置信度不足，确定性正误判断必须进入老师复核。",
          risk_flags: ["question_segmentation"]
        }
      : gate
  );
  if (clone.pipeline_trace) {
    clone.pipeline_trace.stages = clone.pipeline_trace.stages.map((stage) =>
      stage.stage_id === "question_segmentation"
        ? {
            ...stage,
            status: "degrade",
            risk_flags: [...new Set([...stage.risk_flags, "question_segmentation"])]
          }
        : stage
    );
  }
  return clone;
}
