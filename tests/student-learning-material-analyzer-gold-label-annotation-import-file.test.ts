import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createGoldLabelPackageFromAnnotationImport,
  type StudentLearningMaterialGoldLabelAnnotationImport
} from "../src/skills/student-learning-material-analyzer/gold-label-annotation-import";
import {
  generateGoldLabelPackageFromAnnotationImportFile,
  readGoldLabelPackageFromAnnotationImportFile
} from "../src/skills/student-learning-material-analyzer/gold-label-annotation-import-files";
import { validateStudentLearningMaterialGoldLabelPackage } from "../src/skills/student-learning-material-analyzer/gold-labeling";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import { buildQuestionSegmentationReview } from "../src/skills/student-learning-material-analyzer/question-segmentation-review";
import type { VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

describe("student learning material gold label annotation import", () => {
  it("converts a double-labeled adjudicated annotation import into a claimable gold package", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_import",
      studentId: "student_annotation_import"
    });
    const annotationImport = createAnnotationImport(packet);

    const result = createGoldLabelPackageFromAnnotationImport(annotationImport, packet);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.validation.ok).toBe(true);
    expect(result.package).toEqual(
      expect.objectContaining({
        fixture_schema: "student_learning_material_gold_label_package.v0.1",
        case_id: "case-annotation-import",
        source_material_id: packet.source_material_id,
        vision_packet_id: packet.plugin_run_id,
        material_id: packet.material_id
      })
    );
    expect(result.package.labels).toHaveLength(2);
    expect(result.package.labels[0].question_evidence_basis[0]).toEqual(
      expect.objectContaining({
        question_id: "q001",
        student_trace_evidence_refs: expect.arrayContaining([findEvidenceRef(packet, "student_original_answer")]),
        answer_key_or_rubric_evidence_refs: expect.arrayContaining([findEvidenceRef(packet, "answer_key")])
      })
    );
  });

  it("rejects annotation imports that do not match the VisionEvidencePacket", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_import_mismatch",
      studentId: "student_annotation_import"
    });
    const annotationImport = {
      ...createAnnotationImport(packet),
      source_material_id: "other-source-material"
    };

    const result = createGoldLabelPackageFromAnnotationImport(annotationImport, packet);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toContain("source_material_id must match VisionEvidencePacket");
  });

  it("rejects annotation imports that would copy OCR text into final gold package notes", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_import_text_leak",
      studentId: "student_annotation_import"
    });
    const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
    if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");
    const annotationImport = createAnnotationImport(packet);
    annotationImport.labels[0].notes = [`人工备注误写入原文：${leakedEvidence.raw_ocr_text}`];

    const result = createGoldLabelPackageFromAnnotationImport(annotationImport, packet);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
    expect(result.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
  });

  it("rejects annotation imports whose generated gold package fails source-evidence validation", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_import_invalid_basis_type",
      studentId: "student_annotation_import"
    });
    const studentAnswerRef = findEvidenceRef(packet, "student_original_answer");
    const annotationImport = createAnnotationImport(packet);
    annotationImport.labels[0].questions[0].answer_key_or_rubric_evidence_refs = [studentAnswerRef];

    const result = createGoldLabelPackageFromAnnotationImport(annotationImport, packet);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toContain(
      `labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs[0] evidence_ref=${studentAnswerRef} has evidence_type=student_original_answer, expected answer_key or rubric evidence`
    );
  });

  it("rejects annotation imports that cite side-input answer refs without a question map", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_import_unmapped_side_input",
      studentId: "student_annotation_import"
    });
    const annotationImport = createAnnotationImport(packet);
    annotationImport.labels[0].questions[0].answer_key_or_rubric_evidence_refs = ["side_input.answer_key.q001"];

    const result = createGoldLabelPackageFromAnnotationImport(annotationImport, packet);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toContain(
      "labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs[0] side_input evidence_ref requires question-mapped answer/rubric side input map for source-packet validation: side_input.answer_key.q001"
    );
  });

  it("rejects annotation imports that copy OCR text into tool notes", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_import_tool_text_leak",
      studentId: "student_annotation_import"
    });
    const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
    if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");
    const annotationImport = createAnnotationImport(packet);
    if (!annotationImport.annotation_tool) throw new Error("expected annotation tool metadata");
    annotationImport.annotation_tool.notes = [`工具导出备注误写入原文：${leakedEvidence.raw_ocr_text}`];

    const result = createGoldLabelPackageFromAnnotationImport(annotationImport, packet);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toContain("annotation import notes must not include OCR/text content copied");
    expect(result.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
    expect(result.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
  });

  it("rejects definitive gold judgements when the question segmentation review is not pass", () => {
    const packet = removeCropRefs(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_annotation_import_segmentation_review",
        studentId: "student_annotation_import"
      })
    );
    const annotationImport = createAnnotationImport(packet);
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-19T23:55:00+08:00"
    });

    const result = createGoldLabelPackageFromAnnotationImport(annotationImport, packet, {
      questionSegmentationReview: segmentationReview
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toContain("must pass question segmentation review before definitive gold judgement");
  });

  it("writes incomplete annotation drafts without marking them claimable for 99% evaluation", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-annotation-import-draft-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const annotationImportPath = path.join(tempDir, "annotation-import-draft.json");
    const outputPath = path.join(tempDir, "gold-label-package-draft.json");
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_import_draft",
      studentId: "student_annotation_import"
    });
    const annotationImport = createAnnotationImport(packet);
    delete annotationImport.adjudication;

    try {
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await writeFile(annotationImportPath, `${JSON.stringify(annotationImport, null, 2)}\n`, "utf8");

      const result = await generateGoldLabelPackageFromAnnotationImportFile({
        annotationImportPath,
        visionPacketPath: packetPath,
        goldLabelPackageOutputPath: outputPath,
        allowIncomplete: true
      });
      const packageValue = await readGoldLabelPackageFromAnnotationImportFile(outputPath);
      const draftValidation = validateStudentLearningMaterialGoldLabelPackage(packageValue, { requireAdjudication: false, sourcePacket: packet });
      const claimValidation = validateStudentLearningMaterialGoldLabelPackage(packageValue, { sourcePacket: packet });

      expect(result.claimable99Correctness).toBe(false);
      expect(result.validationWarnings.join(" ")).toContain("annotation draft");
      expect(packageValue.adjudicated_gold).toBeUndefined();
      expect(draftValidation.ok).toBe(true);
      expect(draftValidation.warnings.join(" ")).toContain("annotation draft");
      expect(claimValidation.ok).toBe(false);
      expect(claimValidation.errors.join(" ")).toContain("adjudicated_gold is required for 99% evaluation");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("writes the final gold package file specified by env vars or local paths", async () => {
    const envAnnotationImportPath = process.env.XUEMAI_GOLD_LABEL_ANNOTATION_IMPORT;
    const envVisionPacketPath = process.env.XUEMAI_VISION_PACKET;
    const envQuestionSegmentationReviewPath = process.env.XUEMAI_QUESTION_SEGMENTATION_REVIEW;
    const envGoldLabelPackageOutputPath = process.env.XUEMAI_GOLD_LABEL_PACKAGE_OUTPUT;

    if (envAnnotationImportPath || envVisionPacketPath || envGoldLabelPackageOutputPath) {
      if (!envAnnotationImportPath || !envVisionPacketPath || !envGoldLabelPackageOutputPath) {
        throw new Error(
          "Set XUEMAI_GOLD_LABEL_ANNOTATION_IMPORT=/absolute/path/to/annotation-import.json, XUEMAI_VISION_PACKET=/absolute/path/to/packet.json, and XUEMAI_GOLD_LABEL_PACKAGE_OUTPUT=/absolute/path/to/gold-label-package.json"
        );
      }
      const result = await generateGoldLabelPackageFromAnnotationImportFile({
        annotationImportPath: envAnnotationImportPath,
        visionPacketPath: envVisionPacketPath,
        questionSegmentationReviewPath: envQuestionSegmentationReviewPath,
        answerKeysPath: process.env.XUEMAI_ANSWER_KEYS,
        rubricsPath: process.env.XUEMAI_RUBRICS,
        goldLabelPackageOutputPath: envGoldLabelPackageOutputPath,
        allowIncomplete: process.env.XUEMAI_GOLD_LABEL_ANNOTATION_ALLOW_INCOMPLETE === "1"
      });
      console.log(formatResult(result));
      expect(result.goldLabelPackageOutputPath).toBe(envGoldLabelPackageOutputPath);
      return;
    }

    if (process.env.XUEMAI_GOLD_LABEL_ANNOTATION_IMPORT_REQUIRED === "1") {
      throw new Error(
        "Set XUEMAI_GOLD_LABEL_ANNOTATION_IMPORT=/absolute/path/to/annotation-import.json, XUEMAI_VISION_PACKET=/absolute/path/to/packet.json, and XUEMAI_GOLD_LABEL_PACKAGE_OUTPUT=/absolute/path/to/gold-label-package.json"
      );
    }

    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-annotation-import-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const annotationImportPath = path.join(tempDir, "annotation-import.json");
    const outputPath = path.join(tempDir, "gold-label-package.json");
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_annotation_import_file",
      studentId: "student_annotation_import"
    });

    try {
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await writeFile(annotationImportPath, `${JSON.stringify(createAnnotationImport(packet), null, 2)}\n`, "utf8");

      const result = await generateGoldLabelPackageFromAnnotationImportFile({
        annotationImportPath,
        visionPacketPath: packetPath,
        goldLabelPackageOutputPath: outputPath
      });
      const packageValue = await readGoldLabelPackageFromAnnotationImportFile(outputPath);
      const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue);

      expect(result.claimable99Correctness).toBe(true);
      expect(validation.ok).toBe(true);
      expect(packageValue.adjudicated_gold?.case_id).toBe("case-annotation-import");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

function createAnnotationImport(packet: VisionEvidencePacket): StudentLearningMaterialGoldLabelAnnotationImport {
  const baseQuestion = {
    question_id: "q001",
    definitive_judgement_allowed: true,
    expected_correctness: "partially_correct" as const,
    expected_knowledge_points: ["一次函数应用"],
    expected_mistake_types: ["condition_extraction_error"]
  };
  const materialClassification = {
    material_type: "exam" as const,
    subject: "数学" as const,
    education_stage: "middle" as const,
    grade_candidate: "初二",
    region_or_curriculum_candidate: "未识别"
  };
  return {
    fixture_schema: "student_learning_material_gold_label_annotation_import.v0.1",
    package_id: "gold-label-case-annotation-import",
    case_id: "case-annotation-import",
    source_material_id: packet.source_material_id,
    vision_packet_id: packet.plugin_run_id,
    material_id: packet.material_id,
    annotation_tool: {
      name: "label_studio",
      export_ref: "label-studio-export-001.json",
      imported_at: "2026-06-19T22:45:00.000Z"
    },
    anonymization: {
      student_identifiers_removed: true,
      teacher_identifiers_removed: true,
      school_identifiers_removed: true,
      raw_images_excluded_from_gold_file: true
    },
    labels: [
      {
        label_id: "case-annotation-import-label-a",
        reviewer_id: "reviewer-a",
        reviewer_role: "教研标注员",
        labeled_at: "2026-06-19T22:45:00.000Z",
        material_classification: materialClassification,
        questions: [baseQuestion]
      },
      {
        label_id: "case-annotation-import-label-b",
        reviewer_id: "reviewer-b",
        reviewer_role: "授课老师",
        labeled_at: "2026-06-19T22:55:00.000Z",
        material_classification: materialClassification,
        questions: [baseQuestion]
      }
    ],
    adjudication: {
      reviewer_id: "reviewer-adjudicator",
      reviewer_role: "教研负责人",
      adjudicated_at: "2026-06-19T23:00:00.000Z",
      material_classification: materialClassification,
      questions: [baseQuestion]
    }
  };
}

function findEvidenceRef(packet: VisionEvidencePacket, evidenceType: string) {
  const found = packet.evidences.find((evidence) => evidence.evidence_type === evidenceType);
  if (!found) throw new Error(`Missing evidence type ${evidenceType}`);
  return found.evidence_ref;
}

function formatResult(result: Awaited<ReturnType<typeof generateGoldLabelPackageFromAnnotationImportFile>>) {
  return [
    "Gold label package generated from annotation import",
    `caseId=${result.caseId}`,
    `packageId=${result.packageId}`,
    `questionSegmentationReviewPath=${result.questionSegmentationReviewPath || "none"}`,
    `goldLabelPackageOutputPath=${result.goldLabelPackageOutputPath}`,
    `labelCount=${result.labelCount}`,
    `questionCount=${result.questionCount}`,
    `claimable99Correctness=${result.claimable99Correctness ? "yes" : "no"}`,
    `validationErrors=${result.validationErrors.length}`,
    `validationWarnings=${result.validationWarnings.length}`
  ].join("\n");
}

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
