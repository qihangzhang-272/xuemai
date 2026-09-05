import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateQuestionSegmentationReviewFile
} from "../src/skills/student-learning-material-analyzer/question-segmentation-review-files";
import type { VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";
import {
  generateVisionEvidencePacketFile,
  readVisionEvidencePacketFile
} from "../src/skills/student-learning-material-analyzer/vision-adapter-files";
import {
  generateVisionProviderTrialReportFile,
  readVisionProviderTrialReportFile
} from "../src/skills/student-learning-material-analyzer/vision-provider-trial-report-files";
import { validateVisionProviderTrialReport } from "../src/skills/student-learning-material-analyzer/vision-provider-trial-report";

const fixtureInputPath = path.resolve(
  "tests/fixtures/student-learning-material-evaluation/provider-adapter/paddleocr-like-external-vision-input.json"
);

describe("student learning material Vision provider trial report file generator", () => {
  it("generates a raw-text-safe trial report from a VisionEvidencePacket", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-provider-trial-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const reviewPath = path.join(tempDir, "question-segmentation-review.json");
    const reportPath = path.join(tempDir, "provider-trial-report.json");

    try {
      await generateVisionEvidencePacketFile({
        externalVisionInputPath: fixtureInputPath,
        visionPacketOutputPath: packetPath,
        failOnWarnings: true
      });
      await generateQuestionSegmentationReviewFile({
        visionPacketPath: packetPath,
        segmentationReviewOutputPath: reviewPath,
        generatedAt: "2026-06-20T10:00:00+08:00"
      });

      const result = await generateVisionProviderTrialReportFile({
        visionPacketPath: packetPath,
        segmentationReviewPath: reviewPath,
        providerTrialReportOutputPath: reportPath,
        generatedAt: "2026-06-20T10:05:00+08:00",
        requireReady: true
      });
      const packet = await readVisionEvidencePacketFile(packetPath);
      const report = await readVisionProviderTrialReportFile(reportPath);
      const validation = validateVisionProviderTrialReport(report, packet);

      expect(result).toEqual(
        expect.objectContaining({
          providerTrialReportOutputPath: reportPath,
          provider: "paddleocr",
          readiness: "ready_for_human_labeling",
          questionCount: 1,
          definitiveAllowedCount: 1,
          blockers: [],
          warnings: []
        })
      );
      expect(validation.ok, validation.errors.join("；")).toBe(true);
      expect(report.summary).toEqual(
        expect.objectContaining({
          page_count: 1,
          question_count: 1,
          evidence_count: 4,
          student_trace_evidence_count: 2,
          answer_basis_evidence_count: 1,
          segmentation_pass_count: 1,
          definitive_allowed_count: 1
        })
      );
      expect(report.provider_candidates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "paddleocr", fit: "primary_candidate" }),
          expect.objectContaining({ name: "paddlex", fit: "fallback_candidate" })
        ])
      );
      expect(JSON.stringify(report)).not.toContain("raw_ocr_text");
      expect(JSON.stringify(report)).not.toContain("normalized_text");
      expect(JSON.stringify(report)).not.toContain("y=2x");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects provider trial reports that copy OCR text into editable fields", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-provider-trial-text-leak-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const reviewPath = path.join(tempDir, "question-segmentation-review.json");
    const reportPath = path.join(tempDir, "provider-trial-report.json");

    try {
      await generateVisionEvidencePacketFile({
        externalVisionInputPath: fixtureInputPath,
        visionPacketOutputPath: packetPath,
        failOnWarnings: true
      });
      await generateQuestionSegmentationReviewFile({
        visionPacketPath: packetPath,
        segmentationReviewOutputPath: reviewPath,
        generatedAt: "2026-06-20T10:00:00+08:00"
      });
      await generateVisionProviderTrialReportFile({
        visionPacketPath: packetPath,
        segmentationReviewPath: reviewPath,
        providerTrialReportOutputPath: reportPath,
        generatedAt: "2026-06-20T10:05:00+08:00"
      });

      const packet = await readVisionEvidencePacketFile(packetPath);
      const report = await readVisionProviderTrialReportFile(reportPath);
      const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
      if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");

      report.next_steps.push(`人工备注误写入原文：${leakedEvidence.raw_ocr_text}`);
      const validation = validateVisionProviderTrialReport(report, packet);

      expect(validation.ok).toBe(false);
      expect(validation.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
      expect(validation.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("marks bbox-only provider output as needing evidence completion before gold assets", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-provider-trial-missing-crop-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const reportPath = path.join(tempDir, "provider-trial-report.json");

    try {
      await generateVisionEvidencePacketFile({
        externalVisionInputPath: fixtureInputPath,
        visionPacketOutputPath: packetPath
      });
      const packet = removeCropRefs(await readVisionEvidencePacketFile(packetPath));
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

      const result = await generateVisionProviderTrialReportFile({
        visionPacketPath: packetPath,
        providerTrialReportOutputPath: reportPath
      });
      const report = await readVisionProviderTrialReportFile(reportPath);

      expect(result.readiness).toBe("needs_evidence_completion");
      expect(result.warnings.join(" ")).toContain("missing crop_ref");
      expect(report.summary.missing_crop_ref_count).toBeGreaterThan(0);
      expect(report.questions[0]).toEqual(
        expect.objectContaining({
          segmentation_status: "needs_teacher_review",
          readiness_status: "teacher_review_required",
          definitive_judgement_allowed: false,
          issues: expect.arrayContaining(["crop_ref_missing"]),
          readiness_reasons: expect.arrayContaining(["question_segmentation_unstable"])
        })
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects tampered provider trial reports that mark packet-derived evidence gaps as ready", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-provider-trial-tampered-ready-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const reportPath = path.join(tempDir, "provider-trial-report.json");

    try {
      await generateVisionEvidencePacketFile({
        externalVisionInputPath: fixtureInputPath,
        visionPacketOutputPath: packetPath
      });
      const packet = removeCropRefs(await readVisionEvidencePacketFile(packetPath));
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await generateVisionProviderTrialReportFile({
        visionPacketPath: packetPath,
        providerTrialReportOutputPath: reportPath,
        generatedAt: "2026-06-20T10:15:00+08:00"
      });

      const report = await readVisionProviderTrialReportFile(reportPath);
      report.readiness = "ready_for_human_labeling";
      report.warnings = [];
      report.summary.missing_crop_ref_count = 0;
      report.summary.segmentation_pass_count = 1;
      report.summary.segmentation_needs_teacher_review_count = 0;
      report.summary.definitive_allowed_count = 1;
      report.summary.teacher_review_required_count = 0;
      report.questions[0].segmentation_status = "pass";
      report.questions[0].readiness_status = "definitive_allowed";
      report.questions[0].definitive_judgement_allowed = true;
      report.questions[0].review_required = false;
      report.questions[0].issues = [];
      report.questions[0].readiness_reasons = [];

      const validation = validateVisionProviderTrialReport(report, packet);

      expect(validation.ok).toBe(false);
      expect(validation.errors.join(" ")).toContain("readiness must match VisionEvidencePacket-derived provider trial report");
      expect(validation.errors.join(" ")).toContain("summary.missing_crop_ref_count must match VisionEvidencePacket-derived provider trial report");
      expect(validation.errors.join(" ")).toContain("questions[0].segmentation_status must match VisionEvidencePacket-derived provider trial report");
      expect(validation.errors.join(" ")).toContain("questions[0].definitive_judgement_allowed must match VisionEvidencePacket-derived provider trial report");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("generates the provider trial report specified by env vars", async () => {
    const visionPacketPath = process.env.XUEMAI_VISION_PACKET;
    const outputPath = process.env.XUEMAI_PROVIDER_TRIAL_REPORT_OUTPUT;

    if (!visionPacketPath || !outputPath) {
      if (process.env.XUEMAI_PROVIDER_TRIAL_REPORT_REQUIRED === "1") {
        throw new Error(
          "Set XUEMAI_VISION_PACKET=/absolute/path/to/packet.json and XUEMAI_PROVIDER_TRIAL_REPORT_OUTPUT=/absolute/path/to/provider-trial-report.json"
        );
      }
      expect(visionPacketPath || outputPath).toBeUndefined();
      return;
    }

    const result = await generateVisionProviderTrialReportFile({
      visionPacketPath,
      segmentationReviewPath: process.env.XUEMAI_QUESTION_SEGMENTATION_REVIEW,
      providerTrialReportOutputPath: outputPath,
      generatedAt: process.env.XUEMAI_PROVIDER_TRIAL_REPORT_GENERATED_AT,
      requireReady: process.env.XUEMAI_PROVIDER_TRIAL_REPORT_REQUIRE_READY === "1"
    });

    console.log(
      [
        "Vision provider trial report generated",
        `providerTrialReportOutputPath=${result.providerTrialReportOutputPath}`,
        `provider=${result.provider}`,
        `readiness=${result.readiness}`,
        `questionCount=${result.questionCount}`,
        `definitiveAllowedCount=${result.definitiveAllowedCount}`,
        `blockers=${result.blockers.length}`,
        `warnings=${result.warnings.length}`
      ].join("\n")
    );

    expect(result.providerTrialReportOutputPath).toBe(outputPath);
  });
});

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
