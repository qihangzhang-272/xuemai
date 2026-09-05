import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateGoldLabelPackageTemplateFile,
  readGoldLabelPackageTemplateFile
} from "../src/skills/student-learning-material-analyzer/gold-label-template-files";
import { validateStudentLearningMaterialGoldLabelPackage } from "../src/skills/student-learning-material-analyzer/gold-labeling";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import { buildQuestionSegmentationReview } from "../src/skills/student-learning-material-analyzer/question-segmentation-review";

describe("student learning material gold label package template file generator", () => {
  it("generates a non-claimable human labeling draft from a VisionEvidencePacket", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-gold-template-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const outputPath = path.join(tempDir, "gold-label-template.json");
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_gold_template_fixture",
      studentId: "student_gold_template_fixture"
    });

    try {
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

      const result = await generateGoldLabelPackageTemplateFile({
        visionPacketPath: packetPath,
        goldLabelTemplateOutputPath: outputPath,
        caseId: "case-gold-template-fixture",
        reviewerIds: ["teaching-researcher", "class-teacher"],
        reviewerRoles: ["教研标注员", "授课老师"],
        labeledAt: "2026-06-19T22:30:00.000Z"
      });
      const template = await readGoldLabelPackageTemplateFile(outputPath);
      const draftValidation = validateStudentLearningMaterialGoldLabelPackage(template, {
        requireAdjudication: false
      });

      expect(result).toEqual(
        expect.objectContaining({
          goldLabelTemplateOutputPath: outputPath,
          caseId: "case-gold-template-fixture",
          sourceMaterialId: packet.source_material_id,
          visionPacketId: packet.plugin_run_id,
          materialId: packet.material_id,
          questionCount: packet.questions.length,
          reviewerIds: ["teaching-researcher", "class-teacher"],
          readyForHumanLabeling: true,
          claimable99Correctness: false
        })
      );
      expect(template.labels).toHaveLength(2);
      expect(template.labels[0].question_evidence_basis.map((basis) => basis.question_id)).toEqual(packet.questions.map((question) => question.question_id));
      expect(template.anonymization).toEqual({
        student_identifiers_removed: false,
        teacher_identifiers_removed: false,
        school_identifiers_removed: false,
        raw_images_excluded_from_gold_file: false
      });
      expect(template.adjudicated_gold).toBeUndefined();
      expect(draftValidation.ok).toBe(false);
      expect(result.draftValidationErrors.join(" ")).toContain("anonymization.student_identifiers_removed");
      expect(result.draftValidationWarnings.join(" ")).toContain("annotation draft");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("carries question segmentation review status into human labeling notes", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-gold-template-segmentation-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const segmentationReviewPath = path.join(tempDir, "question-segmentation-review.json");
    const outputPath = path.join(tempDir, "gold-label-template.json");
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_gold_template_segmentation_fixture",
      studentId: "student_gold_template_fixture"
    });
    const packetWithMissingCrop = JSON.parse(JSON.stringify(packet)) as typeof packet;
    packetWithMissingCrop.questions[0]?.regions.forEach((region) => {
      delete region.crop_ref;
    });
    packetWithMissingCrop.evidences.forEach((evidence) => {
      delete evidence.crop_ref;
    });
    const segmentationReview = buildQuestionSegmentationReview(packetWithMissingCrop, {
      generatedAt: "2026-06-19T23:50:00+08:00"
    });

    try {
      await writeFile(packetPath, `${JSON.stringify(packetWithMissingCrop, null, 2)}\n`, "utf8");
      await writeFile(segmentationReviewPath, `${JSON.stringify(segmentationReview, null, 2)}\n`, "utf8");

      const result = await generateGoldLabelPackageTemplateFile({
        visionPacketPath: packetPath,
        questionSegmentationReviewPath: segmentationReviewPath,
        goldLabelTemplateOutputPath: outputPath,
        caseId: "case-gold-template-segmentation"
      });
      const template = await readGoldLabelPackageTemplateFile(outputPath);
      const notes = template.labels[0].question_evidence_basis[0].notes || [];

      expect(result).toEqual(
        expect.objectContaining({
          questionSegmentationReviewPath: segmentationReviewPath,
          segmentationReviewQuestionCount: 1,
          segmentationReviewPassCount: 0,
          segmentationReviewNeedsTeacherReviewCount: 1
        })
      );
      expect(notes).toEqual(
        expect.arrayContaining([
          "question_segmentation_review_status=needs_teacher_review",
          "question_segmentation_review_required=yes",
          "question_segmentation_definitive_judgement_allowed=no",
          "question_segmentation_issues=crop_ref_missing"
        ])
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("generates the gold label template file specified by env vars", async () => {
    const visionPacketPath = process.env.XUEMAI_VISION_PACKET;
    const questionSegmentationReviewPath = process.env.XUEMAI_QUESTION_SEGMENTATION_REVIEW;
    const goldLabelTemplateOutputPath = process.env.XUEMAI_GOLD_LABEL_TEMPLATE_OUTPUT;

    if (!visionPacketPath || !goldLabelTemplateOutputPath) {
      if (process.env.XUEMAI_GOLD_LABEL_TEMPLATE_REQUIRED === "1") {
        throw new Error(
          "Set XUEMAI_VISION_PACKET=/absolute/path/to/packet.json and XUEMAI_GOLD_LABEL_TEMPLATE_OUTPUT=/absolute/path/to/gold-label-template.json"
        );
      }
      expect(visionPacketPath || goldLabelTemplateOutputPath).toBeUndefined();
      return;
    }

    const result = await generateGoldLabelPackageTemplateFile({
      visionPacketPath,
      questionSegmentationReviewPath,
      goldLabelTemplateOutputPath,
      packageId: process.env.XUEMAI_GOLD_LABEL_TEMPLATE_PACKAGE_ID,
      caseId: process.env.XUEMAI_GOLD_LABEL_TEMPLATE_CASE_ID,
      reviewerIds: parsePair(process.env.XUEMAI_GOLD_LABEL_TEMPLATE_REVIEWER_IDS),
      reviewerRoles: parsePair(process.env.XUEMAI_GOLD_LABEL_TEMPLATE_REVIEWER_ROLES),
      labeledAt: process.env.XUEMAI_GOLD_LABEL_TEMPLATE_LABELED_AT
    });

    console.log(
      [
        "Gold label package template generated",
        `caseId=${result.caseId}`,
        `packageId=${result.packageId}`,
        `goldLabelTemplateOutputPath=${result.goldLabelTemplateOutputPath}`,
        `questionSegmentationReviewPath=${result.questionSegmentationReviewPath || "none"}`,
        `questionCount=${result.questionCount}`,
        "claimable99Correctness=no",
        `draftValidationErrors=${result.draftValidationErrors.length}`,
        `draftValidationWarnings=${result.draftValidationWarnings.length}`
      ].join("\n")
    );

    expect(result.goldLabelTemplateOutputPath).toBe(goldLabelTemplateOutputPath);
    expect(result.claimable99Correctness).toBe(false);
  });
});

function parsePair(value: string | undefined): [string, string] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length === 2 ? [parts[0], parts[1]] : undefined;
}
