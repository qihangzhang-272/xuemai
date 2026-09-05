import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildGoldLabelAnnotationTask,
  validateGoldLabelAnnotationTask
} from "../src/skills/student-learning-material-analyzer/gold-label-annotation-task";
import {
  generateGoldLabelAnnotationTaskFile,
  readGoldLabelAnnotationTaskFile
} from "../src/skills/student-learning-material-analyzer/gold-label-annotation-task-files";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import { buildQuestionSegmentationReview } from "../src/skills/student-learning-material-analyzer/question-segmentation-review";
import type { VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

describe("student learning material gold label annotation task", () => {
  it("builds a redacted annotation task from VisionEvidencePacket and question segmentation review", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_task",
      studentId: "student_annotation_task"
    });
    const review = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T10:10:00+08:00"
    });

    const task = buildGoldLabelAnnotationTask(packet, {
      caseId: "case-annotation-task",
      generatedAt: "2026-06-20T10:20:00+08:00",
      targetTool: "label_studio",
      questionSegmentationReview: review
    });
    const validation = validateGoldLabelAnnotationTask(task, packet);
    const serializedTask = JSON.stringify(task);

    expect(validation.ok).toBe(true);
    expect(task).toEqual(
      expect.objectContaining({
        schema_version: "student_learning_material_gold_label_annotation_task.v0.1",
        case_id: "case-annotation-task",
        source_material_id: packet.source_material_id,
        vision_packet_id: packet.plugin_run_id,
        target_tool: "label_studio"
      })
    );
    expect(task.privacy).toEqual({
      raw_ocr_text_excluded: true,
      normalized_text_excluded: true,
      raw_images_embedded: false,
      crop_refs_only: true,
      requires_anonymized_source_material: true
    });
    expect(task.questions[0]).toEqual(
      expect.objectContaining({
        question_id: "q001",
        segmentation_status: "pass",
        definitive_judgement_allowed_suggestion: true,
        evidence_summaries: expect.arrayContaining([
          expect.objectContaining({
            evidence_type: "student_original_answer",
            evidence_ref: expect.stringContaining("ev_exam_answer_001")
          })
        ])
      })
    );
    expect(task.annotation_import_skeleton.fixture_schema).toBe("student_learning_material_gold_label_annotation_import.v0.1");
    expect(task.annotation_import_skeleton.labels).toHaveLength(2);
    expect(task.tool_payloads.label_studio?.config_xml).toContain("question_labels_json");
    expect(serializedTask).not.toContain("\"raw_ocr_text\":");
    expect(serializedTask).not.toContain("\"normalized_text\":");
    expect(serializedTask).not.toContain("y=2x+1");
    expect(serializedTask).not.toContain("漏取值范围");
  });

  it("rejects annotation tasks that copy OCR text into any redacted field", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_task_text_leak",
      studentId: "student_annotation_task"
    });
    const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
    if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");
    const task = buildGoldLabelAnnotationTask(packet, {
      caseId: "case-annotation-task-text-leak"
    });

    task.human_review_checklist.push(`人工备注误写入原文：${leakedEvidence.raw_ocr_text}`);
    const validation = validateGoldLabelAnnotationTask(task, packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
    expect(validation.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
  });

  it("marks non-pass segmentation questions as non-definitive annotation suggestions", () => {
    const packet = removeCropRefs(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_annotation_task_needs_review",
        studentId: "student_annotation_task"
      })
    );
    const review = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T10:30:00+08:00"
    });

    const task = buildGoldLabelAnnotationTask(packet, {
      questionSegmentationReview: review
    });

    expect(task.questions[0]).toEqual(
      expect.objectContaining({
        segmentation_status: "needs_teacher_review",
        review_required: true,
        definitive_judgement_allowed_suggestion: false,
        issues: ["crop_ref_missing"]
      })
    );
    expect(task.annotation_import_skeleton.labels[0].questions[0]).toEqual(
      expect.objectContaining({
        definitive_judgement_allowed: false,
        notes: expect.arrayContaining([
          "segmentation_status=needs_teacher_review",
          "review_required=yes",
          "definitive_judgement_allowed_suggestion=no",
          "segmentation_issues=crop_ref_missing"
        ])
      })
    );
  });

  it("rejects annotation tasks whose segmentation fields no longer match the packet-derived review", () => {
    const packet = removeCropRefs(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_annotation_task_tampered_segmentation",
        studentId: "student_annotation_task"
      })
    );
    const task = buildGoldLabelAnnotationTask(packet, {
      caseId: "case-annotation-task-tampered-segmentation"
    });

    task.questions[0].segmentation_status = "pass";
    task.questions[0].review_required = false;
    task.questions[0].definitive_judgement_allowed_suggestion = true;
    task.questions[0].issues = [];
    const validation = validateGoldLabelAnnotationTask(task, packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("questions[0].segmentation_status must match VisionEvidencePacket-derived annotation task");
    expect(validation.errors.join(" ")).toContain("questions[0].review_required must match VisionEvidencePacket-derived annotation task");
    expect(validation.errors.join(" ")).toContain(
      "questions[0].definitive_judgement_allowed_suggestion must match VisionEvidencePacket-derived annotation task"
    );
    expect(validation.errors.join(" ")).toContain("questions[0].issues must match VisionEvidencePacket-derived annotation task");
  });

  it("rejects annotation tasks whose evidence summaries or basis suggestions drift from the packet", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_task_tampered_evidence",
      studentId: "student_annotation_task"
    });
    const task = buildGoldLabelAnnotationTask(packet, {
      caseId: "case-annotation-task-tampered-evidence"
    });

    task.questions[0].evidence_summaries = task.questions[0].evidence_summaries.slice(1);
    task.questions[0].evidence_basis_suggestion.student_trace_evidence_refs = [];
    const validation = validateGoldLabelAnnotationTask(task, packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("questions[0].evidence_summaries length must match VisionEvidencePacket-derived annotation task");
    expect(validation.errors.join(" ")).toContain(
      "questions[0].evidence_basis_suggestion.student_trace_evidence_refs must match VisionEvidencePacket-derived annotation task"
    );
  });

  it("rejects annotation import skeleton drift inside redacted annotation tasks", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_task_tampered_skeleton",
      studentId: "student_annotation_task"
    });
    const task = buildGoldLabelAnnotationTask(packet, {
      caseId: "case-annotation-task-tampered-skeleton"
    });

    task.annotation_import_skeleton.labels[0].questions[0].student_trace_evidence_refs = [];
    task.annotation_import_skeleton.labels[0].questions[0].notes = [];
    const validation = validateGoldLabelAnnotationTask(task, packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain(
      "annotation_import_skeleton.labels[0].questions[0].student_trace_evidence_refs must match VisionEvidencePacket-derived annotation task skeleton"
    );
    expect(validation.errors.join(" ")).toContain(
      "annotation_import_skeleton.labels[0].questions[0].notes must match VisionEvidencePacket-derived annotation task skeleton"
    );
  });

  it("rejects Label Studio task payload drift inside redacted annotation tasks", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_task_tampered_label_studio",
      studentId: "student_annotation_task"
    });
    const task = buildGoldLabelAnnotationTask(packet, {
      caseId: "case-annotation-task-tampered-label-studio"
    });

    if (!task.tool_payloads.label_studio) throw new Error("expected Label Studio payload");
    task.tool_payloads.label_studio.task_data.questions[0].evidence_refs = "";
    task.tool_payloads.label_studio.task_data.questions[0].crop_refs = "";
    const validation = validateGoldLabelAnnotationTask(task, packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain(
      "tool_payloads.label_studio.task_data.questions[0].evidence_refs must match VisionEvidencePacket-derived annotation task payload"
    );
    expect(validation.errors.join(" ")).toContain(
      "tool_payloads.label_studio.task_data.questions[0].crop_refs must match VisionEvidencePacket-derived annotation task payload"
    );
  });

  it("rejects annotation tasks whose question order no longer matches the VisionEvidencePacket", () => {
    const packet = appendSecondQuestion(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_annotation_task_reordered_questions",
        studentId: "student_annotation_task"
      })
    );
    const task = buildGoldLabelAnnotationTask(packet, {
      caseId: "case-annotation-task-reordered"
    });

    task.questions.reverse();
    task.annotation_import_skeleton.labels.forEach((label) => {
      label.questions.reverse();
    });
    task.tool_payloads.label_studio?.task_data.questions.reverse();
    const validation = validateGoldLabelAnnotationTask(task, packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("questions order must match VisionEvidencePacket questions: expected q001, q002 but got q002, q001");
    expect(validation.errors.join(" ")).toContain("annotation_import_skeleton.labels[0].questions order must match VisionEvidencePacket questions");
    expect(validation.errors.join(" ")).toContain("tool_payloads.label_studio.task_data.questions order must match VisionEvidencePacket questions");
  });

  it("writes the annotation task file specified by env vars or local paths", async () => {
    const envVisionPacketPath = process.env.XUEMAI_VISION_PACKET;
    const envQuestionSegmentationReviewPath = process.env.XUEMAI_QUESTION_SEGMENTATION_REVIEW;
    const envAnnotationTaskOutputPath = process.env.XUEMAI_GOLD_LABEL_ANNOTATION_TASK_OUTPUT;

    if (envVisionPacketPath || envAnnotationTaskOutputPath) {
      if (!envVisionPacketPath || !envAnnotationTaskOutputPath) {
        throw new Error(
          "Set XUEMAI_VISION_PACKET=/absolute/path/to/packet.json and XUEMAI_GOLD_LABEL_ANNOTATION_TASK_OUTPUT=/absolute/path/to/annotation-task.json"
        );
      }
      const result = await generateGoldLabelAnnotationTaskFile({
        visionPacketPath: envVisionPacketPath,
        questionSegmentationReviewPath: envQuestionSegmentationReviewPath,
        annotationTaskOutputPath: envAnnotationTaskOutputPath,
        caseId: process.env.XUEMAI_GOLD_LABEL_ANNOTATION_TASK_CASE_ID,
        generatedAt: process.env.XUEMAI_GOLD_LABEL_ANNOTATION_TASK_GENERATED_AT,
        targetTool: parseTargetTool(process.env.XUEMAI_GOLD_LABEL_ANNOTATION_TASK_TARGET_TOOL),
        reviewerIds: parsePair(process.env.XUEMAI_GOLD_LABEL_ANNOTATION_TASK_REVIEWER_IDS),
        reviewerRoles: parsePair(process.env.XUEMAI_GOLD_LABEL_ANNOTATION_TASK_REVIEWER_ROLES)
      });
      console.log(formatResult(result));
      expect(result.annotationTaskOutputPath).toBe(envAnnotationTaskOutputPath);
      expect(result.claimable99Correctness).toBe(false);
      return;
    }

    if (process.env.XUEMAI_GOLD_LABEL_ANNOTATION_TASK_REQUIRED === "1") {
      throw new Error(
        "Set XUEMAI_VISION_PACKET=/absolute/path/to/packet.json and XUEMAI_GOLD_LABEL_ANNOTATION_TASK_OUTPUT=/absolute/path/to/annotation-task.json"
      );
    }

    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-annotation-task-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const reviewPath = path.join(tempDir, "question-segmentation-review.json");
    const outputPath = path.join(tempDir, "annotation-task.json");
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_task_file",
      studentId: "student_annotation_task"
    });
    const review = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T10:40:00+08:00"
    });

    try {
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await writeFile(reviewPath, `${JSON.stringify(review, null, 2)}\n`, "utf8");

      const result = await generateGoldLabelAnnotationTaskFile({
        visionPacketPath: packetPath,
        questionSegmentationReviewPath: reviewPath,
        annotationTaskOutputPath: outputPath,
        caseId: "case-annotation-task-file",
        targetTool: "cvat"
      });
      const task = await readGoldLabelAnnotationTaskFile(outputPath);
      const validation = validateGoldLabelAnnotationTask(task, packet);

      expect(result).toEqual(
        expect.objectContaining({
          annotationTaskOutputPath: outputPath,
          caseId: "case-annotation-task-file",
          targetTool: "cvat",
          questionCount: 1,
          passCount: 1,
          annotationImportSkeletonLabelCount: 2,
          rawTextExcluded: true,
          claimable99Correctness: false
        })
      );
      expect(validation.ok).toBe(true);
      expect(task.tool_payloads.cvat?.labels.map((label) => label.name)).toContain("question_region");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
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

function parseTargetTool(value: string | undefined) {
  return value === "label_studio" || value === "cvat" || value === "manual" ? value : undefined;
}

function parsePair(value: string | undefined): [string, string] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length === 2 ? [parts[0], parts[1]] : undefined;
}

function formatResult(result: Awaited<ReturnType<typeof generateGoldLabelAnnotationTaskFile>>) {
  return [
    "Gold label annotation task generated",
    `caseId=${result.caseId}`,
    `annotationTaskOutputPath=${result.annotationTaskOutputPath}`,
    `targetTool=${result.targetTool}`,
    `questionSegmentationReviewPath=${result.questionSegmentationReviewPath || "none"}`,
    `questionCount=${result.questionCount}`,
    `passCount=${result.passCount}`,
    `needsTeacherReviewCount=${result.needsTeacherReviewCount}`,
    "rawTextExcluded=yes",
    "claimable99Correctness=no"
  ].join("\n");
}
