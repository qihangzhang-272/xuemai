import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateQuestionSegmentationReviewFile,
  readQuestionSegmentationReviewFile
} from "../src/skills/student-learning-material-analyzer/question-segmentation-review-files";
import {
  buildQuestionSegmentationReview,
  validateQuestionSegmentationReview
} from "../src/skills/student-learning-material-analyzer/question-segmentation-review";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import type { VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

describe("student learning material question segmentation review file generator", () => {
  it("generates a text-safe question segmentation review from a VisionEvidencePacket", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-segmentation-review-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const outputPath = path.join(tempDir, "question-segmentation-review.json");
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_segmentation_review_fixture",
      studentId: "student_segmentation_review_fixture"
    });

    try {
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

      const result = await generateQuestionSegmentationReviewFile({
        visionPacketPath: packetPath,
        segmentationReviewOutputPath: outputPath,
        generatedAt: "2026-06-19T23:30:00+08:00"
      });
      const review = await readQuestionSegmentationReviewFile(outputPath);
      const validation = validateQuestionSegmentationReview(review, packet);

      expect(result).toEqual(
        expect.objectContaining({
          segmentationReviewOutputPath: outputPath,
          sourceMaterialId: packet.source_material_id,
          materialId: packet.material_id,
          visionPacketId: packet.plugin_run_id,
          questionCount: packet.questions.length,
          passCount: 1,
          needsTeacherReviewCount: 0,
          blockedCount: 0,
          missingCropRefCount: 0,
          orphanEvidenceCount: 0,
          validationErrors: []
        })
      );
      expect(validation.ok, validation.errors.join("；")).toBe(true);
      expect(review.schema_version).toBe("student_learning_material_question_segmentation_review.v0.1");
      expect(review.questions[0]).toEqual(
        expect.objectContaining({
          question_id: "q001",
          status: "pass",
          review_required: false,
          definitive_judgement_allowed: true
        })
      );
      expect(JSON.stringify(review)).not.toContain("raw_ocr_text");
      expect(JSON.stringify(review)).not.toContain("y=2x");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects question segmentation reviews that copy OCR text into editable fields", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_segmentation_review_text_leak",
      studentId: "student_segmentation_review_fixture"
    });
    const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
    if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");
    const review = validateSourceReviewFixture(packet);

    review.human_review_checklist.push(`人工备注误写入原文：${leakedEvidence.raw_ocr_text}`);
    const validation = validateQuestionSegmentationReview(review, packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
    expect(validation.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
  });

  it("keeps bbox-only regions reviewable and not claimable as stable segmentation", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-segmentation-review-missing-crop-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const outputPath = path.join(tempDir, "question-segmentation-review.json");
    const packet = removeCropRefs(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_segmentation_missing_crop",
        studentId: "student_segmentation_review_fixture"
      })
    );

    try {
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

      const result = await generateQuestionSegmentationReviewFile({
        visionPacketPath: packetPath,
        segmentationReviewOutputPath: outputPath
      });
      const review = await readQuestionSegmentationReviewFile(outputPath);

      expect(result.missingCropRefCount).toBeGreaterThan(0);
      expect(review.questions[0]).toEqual(
        expect.objectContaining({
          status: "needs_teacher_review",
          review_required: true,
          definitive_judgement_allowed: false,
          issues: expect.arrayContaining(["crop_ref_missing"])
        })
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps evidence without region attribution reviewable and not claimable as stable segmentation", () => {
    const packet = removeEvidenceRegionIds(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_segmentation_missing_evidence_region",
        studentId: "student_segmentation_review_fixture"
      })
    );

    const review = buildQuestionSegmentationReview(packet);
    const validation = validateQuestionSegmentationReview(review, packet);

    expect(validation.ok, validation.errors.join("；")).toBe(true);
    expect(review.summary).toEqual(
      expect.objectContaining({
        pass_count: 0,
        needs_teacher_review_count: 1,
        evidence_without_region_count: packet.evidences.length
      })
    );
    expect(review.questions[0]).toEqual(
      expect.objectContaining({
        status: "needs_teacher_review",
        review_required: true,
        definitive_judgement_allowed: false,
        readiness_status: "teacher_review_required",
        issues: expect.arrayContaining(["evidence_region_missing"])
      })
    );
  });

  it("rejects tampered reviews that mark packet-derived unstable segmentation as pass", () => {
    const packet = removeCropRefs(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_segmentation_tampered_pass",
        studentId: "student_segmentation_review_fixture"
      })
    );
    const review = buildQuestionSegmentationReview(packet);

    review.summary.pass_count = 1;
    review.summary.needs_teacher_review_count = 0;
    review.summary.missing_crop_ref_count = 0;
    review.questions[0].status = "pass";
    review.questions[0].review_required = false;
    review.questions[0].issues = [];
    review.questions[0].definitive_judgement_allowed = true;
    review.questions[0].regions[0].crop_ref = "crop://tampered/q001";
    review.questions[0].regions[0].issues = [];

    const validation = validateQuestionSegmentationReview(review, packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("summary.pass_count must match VisionEvidencePacket-derived segmentation review");
    expect(validation.errors.join(" ")).toContain("questions[0].status must match VisionEvidencePacket-derived segmentation review");
    expect(validation.errors.join(" ")).toContain("questions[0].definitive_judgement_allowed must match VisionEvidencePacket-derived evidence readiness");
    expect(validation.errors.join(" ")).toContain("questions[0].regions[0].crop_ref must match VisionEvidencePacket-derived segmentation review");
  });

  it("rejects reviews whose question order no longer matches the VisionEvidencePacket", () => {
    const packet = appendSecondQuestion(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_segmentation_reordered_questions",
        studentId: "student_segmentation_review_fixture"
      })
    );
    const review = buildQuestionSegmentationReview(packet);

    review.questions.reverse();
    const validation = validateQuestionSegmentationReview(review, packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("questions order must match VisionEvidencePacket questions: expected q001, q002 but got q002, q001");
  });

  it("generates the question segmentation review specified by env vars", async () => {
    const visionPacketPath = process.env.XUEMAI_VISION_PACKET;
    const outputPath = process.env.XUEMAI_QUESTION_SEGMENTATION_REVIEW_OUTPUT;

    if (!visionPacketPath || !outputPath) {
      if (process.env.XUEMAI_QUESTION_SEGMENTATION_REVIEW_REQUIRED === "1") {
        throw new Error(
          "Set XUEMAI_VISION_PACKET=/absolute/path/to/packet.json and XUEMAI_QUESTION_SEGMENTATION_REVIEW_OUTPUT=/absolute/path/to/question-segmentation-review.json"
        );
      }
      expect(visionPacketPath || outputPath).toBeUndefined();
      return;
    }

    const result = await generateQuestionSegmentationReviewFile({
      visionPacketPath,
      segmentationReviewOutputPath: outputPath,
      generatedAt: process.env.XUEMAI_QUESTION_SEGMENTATION_REVIEW_GENERATED_AT
    });

    console.log(
      [
        "Question segmentation review generated",
        `segmentationReviewOutputPath=${result.segmentationReviewOutputPath}`,
        `questionCount=${result.questionCount}`,
        `passCount=${result.passCount}`,
        `needsTeacherReviewCount=${result.needsTeacherReviewCount}`,
        `blockedCount=${result.blockedCount}`,
        `missingCropRefCount=${result.missingCropRefCount}`,
        `orphanEvidenceCount=${result.orphanEvidenceCount}`
      ].join("\n")
    );

    expect(result.segmentationReviewOutputPath).toBe(outputPath);
    expect(result.validationErrors).toEqual([]);
  });
});

function removeCropRefs(packet: VisionEvidencePacket): VisionEvidencePacket {
  const clone = JSON.parse(JSON.stringify(packet)) as VisionEvidencePacket;
  clone.questions.forEach((question) => {
    question.regions.forEach((region) => {
      delete region.crop_ref;
    });
  });
  clone.evidences.forEach((evidence) => {
    delete evidence.crop_ref;
  });
  return clone;
}

function removeEvidenceRegionIds(packet: VisionEvidencePacket): VisionEvidencePacket {
  const clone = JSON.parse(JSON.stringify(packet)) as VisionEvidencePacket;
  clone.evidences.forEach((evidence) => {
    delete evidence.region_id;
  });
  return clone;
}

function appendSecondQuestion(packet: VisionEvidencePacket): VisionEvidencePacket {
  const clone = JSON.parse(JSON.stringify(packet)) as VisionEvidencePacket;
  const firstQuestion = clone.questions[0];
  if (!firstQuestion) throw new Error("Expected fixture question");
  const secondQuestionId = "q002";
  const secondRegionId = "reg_p01_q002";
  clone.questions.push({
    ...firstQuestion,
    question_id: secondQuestionId,
    question_number: "2",
    regions: firstQuestion.regions.map((region) => ({
      ...region,
      region_id: secondRegionId,
      crop_ref: region.crop_ref?.replace("/q001", "/q002")
    }))
  });
  const secondEvidences = clone.evidences
    .filter((evidence) => evidence.question_id === "q001")
    .map((evidence) => ({
      ...evidence,
      evidence_id: `${evidence.evidence_id}_q002`,
      evidence_ref: evidence.evidence_ref.replace("question_q001", "question_q002").replace(evidence.evidence_id, `${evidence.evidence_id}_q002`),
      question_id: secondQuestionId,
      region_id: secondRegionId,
      crop_ref: evidence.crop_ref?.replace("/q001", "/q002")
    }));
  clone.evidences.push(...secondEvidences);
  return clone;
}

function validateSourceReviewFixture(packet: VisionEvidencePacket) {
  const review = buildQuestionSegmentationReview(packet);
  const validation = validateQuestionSegmentationReview(review, packet);
  if (!validation.ok) throw new Error(validation.errors.join("；"));
  return review;
}
