import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractAdjudicatedGoldCaseFromLabelPackage,
  loadStudentLearningMaterialGoldLabelPackageFromFile,
  type StudentLearningMaterialGoldLabelPackage,
  validateStudentLearningMaterialGoldLabelPackage
} from "../src/skills/student-learning-material-analyzer/gold-labeling";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import { buildQuestionEvidenceReadiness } from "../src/skills/student-learning-material-analyzer/question-evidence-readiness";
import type { VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

describe("manual gold label package validation command", () => {
  it("validates a human gold label package when XUEMAI_GOLD_LABEL_PACKAGE is provided", () => {
    const packagePath = process.env.XUEMAI_GOLD_LABEL_PACKAGE;
    if (!packagePath) {
      if (process.env.XUEMAI_GOLD_LABEL_REQUIRED === "1") {
        throw new Error("XUEMAI_GOLD_LABEL_PACKAGE is required when XUEMAI_GOLD_LABEL_REQUIRED=1");
      }
      return;
    }

    const result = validateGoldLabelPackageCommandInput({
      packagePath,
      visionPacketPath: process.env.XUEMAI_VISION_PACKET,
      answerKeysPath: process.env.XUEMAI_ANSWER_KEYS,
      rubricsPath: process.env.XUEMAI_RUBRICS
    });

    expect(result.loadedOk, result.loadErrors.join("；")).toBe(true);
    expect(result.validationOk, result.validationErrors.join("；")).toBe(true);
    expect(result.extractionOk, result.extractionErrors.join("；")).toBe(true);
  });

  it("rejects cross-question side-input answer basis when standalone validation declares answer keys", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-gold-package-validate-side-input-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const answerKeysPath = path.join(tempDir, "answer-keys.json");
    const packagePath = path.join(tempDir, "gold-label-package.json");
    const packet = appendSecondQuestionWithTrace(
      removeAnswerBasis(
        getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
          materialId: "mat_validate_gold_side_input",
          studentId: "student_validate_gold_side_input"
        })
      )
    );
    const packageValue = createTwoQuestionGoldLabelPackage(packet, ["side_input.answer_key.q002"]);

    try {
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await writeFile(answerKeysPath, `${JSON.stringify([{ question_id: "q002", answer: "第二题外部答案依据。" }], null, 2)}\n`, "utf8");
      await writeFile(packagePath, `${JSON.stringify(packageValue, null, 2)}\n`, "utf8");

      const result = validateGoldLabelPackageCommandInput({
        packagePath,
        visionPacketPath: packetPath,
        answerKeysPath
      });

      expect(result.loadedOk, result.loadErrors.join("；")).toBe(true);
      expect(result.validationOk).toBe(false);
      expect(result.validationErrors.join(" ")).toContain(
        "labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs[0] side_input evidence_ref is not mapped to question_id=q001: side_input.answer_key.q002"
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects side-input answer basis when standalone validation omits side-input files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-gold-package-missing-side-input-map-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const packagePath = path.join(tempDir, "gold-label-package.json");
    const packet = appendSecondQuestionWithTrace(
      removeAnswerBasis(
        getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
          materialId: "mat_validate_gold_missing_side_input_map",
          studentId: "student_validate_gold_missing_side_input_map"
        })
      )
    );
    const packageValue = createTwoQuestionGoldLabelPackage(packet, ["side_input.answer_key.q001"]);

    try {
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await writeFile(packagePath, `${JSON.stringify(packageValue, null, 2)}\n`, "utf8");

      const result = validateGoldLabelPackageCommandInput({
        packagePath,
        visionPacketPath: packetPath
      });

      expect(result.loadedOk, result.loadErrors.join("；")).toBe(true);
      expect(result.validationOk).toBe(false);
      expect(result.validationErrors.join(" ")).toContain(
        "labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs[0] side_input evidence_ref requires question-mapped answer/rubric side input map for source-packet validation: side_input.answer_key.q001"
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

function validateGoldLabelPackageCommandInput(input: {
  packagePath: string;
  visionPacketPath?: string;
  answerKeysPath?: string;
  rubricsPath?: string;
}) {
  const loaded = loadStudentLearningMaterialGoldLabelPackageFromFile(input.packagePath);
  if (!loaded.ok) {
    return {
      loadedOk: false,
      loadErrors: loaded.errors,
      validationOk: false,
      validationErrors: [],
      extractionOk: false,
      extractionErrors: []
    };
  }

  const sourcePacket = input.visionPacketPath ? (JSON.parse(readFileSync(input.visionPacketPath, "utf8")) as VisionEvidencePacket) : undefined;
  const answerKeys = readOptionalJsonArray(input.answerKeysPath);
  const rubrics = readOptionalJsonArray(input.rubricsPath);
  const allowedExternalEvidenceRefsByQuestionId = sourcePacket ? buildExternalSideInputRefsByQuestionId(sourcePacket, { answerKeys, rubrics }) : undefined;
  const validation = validateStudentLearningMaterialGoldLabelPackage(loaded.package, {
    sourcePacket,
    allowedExternalEvidenceRefsByQuestionId
  });
  const extraction = extractAdjudicatedGoldCaseFromLabelPackage(loaded.package);
  return {
    loadedOk: true,
    loadErrors: [],
    validationOk: validation.ok,
    validationErrors: validation.errors,
    extractionOk: extraction.ok,
    extractionErrors: extraction.ok ? [] : extraction.errors
  };
}

function buildExternalSideInputRefsByQuestionId(
  packet: VisionEvidencePacket,
  sideInputs: { answerKeys?: unknown[]; rubrics?: unknown[] }
) {
  if (!sideInputs.answerKeys?.length && !sideInputs.rubrics?.length) return undefined;
  const readiness = buildQuestionEvidenceReadiness(packet, sideInputs);
  return new Map(readiness.questions.map((question) => [question.question_id, question.evidenceRefs.filter((ref) => ref.startsWith("side_input."))]));
}

function readOptionalJsonArray(filePath: string | undefined) {
  if (!filePath) return undefined;
  const value = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  return Array.isArray(value) ? value : [value];
}

function createTwoQuestionGoldLabelPackage(packet: VisionEvidencePacket, q001AnswerBasisRefs: string[]): StudentLearningMaterialGoldLabelPackage {
  const caseId = `case-${packet.material_id}`;
  const gold = {
    case_id: caseId,
    material_classification: {
      material_type: "exam" as const,
      subject: "数学" as const,
      education_stage: "middle" as const,
      grade_candidate: "初二",
      region_or_curriculum_candidate: "未识别"
    },
    questions: [
      {
        question_id: "q001",
        definitive_judgement_allowed: true,
        expected_correctness: "partially_correct" as const,
        expected_knowledge_points: ["一次函数应用"],
        expected_mistake_types: ["condition_extraction_error"]
      },
      {
        question_id: "q002",
        definitive_judgement_allowed: false,
        expected_knowledge_points: ["待老师复核"]
      }
    ],
    require_safe_parent_feedback: true,
    require_teacher_professional_report: true,
    require_monthly_snapshot: true,
    require_model_contract: true
  };
  const evidenceBasis = [
    {
      question_id: "q001",
      student_trace_evidence_refs: [findEvidenceRefForQuestion(packet, "q001", "student_original_answer")],
      answer_key_or_rubric_evidence_refs: q001AnswerBasisRefs
    },
    {
      question_id: "q002",
      student_trace_evidence_refs: [findEvidenceRefForQuestion(packet, "q002", "student_original_answer")],
      answer_key_or_rubric_evidence_refs: ["side_input.answer_key.q002"]
    }
  ];
  return {
    fixture_schema: "student_learning_material_gold_label_package.v0.1",
    package_id: `gold-label-${packet.material_id}`,
    case_id: caseId,
    source_material_id: packet.source_material_id,
    vision_packet_id: packet.plugin_run_id,
    material_id: packet.material_id,
    anonymization: {
      student_identifiers_removed: true,
      teacher_identifiers_removed: true,
      school_identifiers_removed: true,
      raw_images_excluded_from_gold_file: true
    },
    labels: [
      {
        label_id: `${caseId}-label-a`,
        reviewer_id: "reviewer-a",
        reviewer_role: "教研标注员",
        labeled_at: "2026-06-20T15:40:00+08:00",
        gold,
        question_evidence_basis: evidenceBasis
      },
      {
        label_id: `${caseId}-label-b`,
        reviewer_id: "reviewer-b",
        reviewer_role: "授课老师",
        labeled_at: "2026-06-20T15:50:00+08:00",
        gold: JSON.parse(JSON.stringify(gold)),
        question_evidence_basis: evidenceBasis
      }
    ],
    adjudicated_gold: JSON.parse(JSON.stringify(gold)),
    adjudicated_by: {
      reviewer_id: "reviewer-adjudicator",
      reviewer_role: "教研负责人",
      adjudicated_at: "2026-06-20T15:55:00+08:00"
    }
  };
}

function removeAnswerBasis(packet: VisionEvidencePacket): VisionEvidencePacket {
  const clone = JSON.parse(JSON.stringify(packet)) as VisionEvidencePacket;
  clone.evidences = clone.evidences.filter((evidence) => evidence.evidence_type !== "answer_key" && evidence.evidence_type !== "rubric" && !evidence.evidence_type.startsWith("teacher_"));
  clone.gates = clone.gates.filter((gate) => gate.gate_id !== "answer_key" && gate.gate_id !== "teacher_mark_answer_key_conflict");
  const evidenceRefs = new Set(clone.evidences.map((evidence) => evidence.evidence_ref));
  clone.gates = clone.gates.map((gate) => ({
    ...gate,
    evidenceRefs: gate.evidenceRefs.filter((evidenceRef) => evidenceRefs.has(evidenceRef))
  }));
  return clone;
}

function appendSecondQuestionWithTrace(packet: VisionEvidencePacket): VisionEvidencePacket {
  const clone = JSON.parse(JSON.stringify(packet)) as VisionEvidencePacket;
  clone.questions.push({
    question_id: "q002",
    question_number: "2",
    question_type_candidate: "open_response",
    page_id: "p01",
    regions: [
      {
        region_id: "reg_p01_q002",
        region_role: "question_region",
        page_id: "p01",
        bbox: { x1: 0.1, y1: 0.55, x2: 0.88, y2: 0.72, coord_space: "normalized" },
        crop_ref: `crop://${clone.material_id}/p01/q002`,
        confidence: 0.88
      }
    ],
    confidence: 0.88,
    risk_flags: []
  });
  clone.evidences.push({
    evidence_id: "ev_q002_answer_001",
    evidence_ref: `material.${clone.material_id}.page_p01.question_q002.ev_q002_answer_001`,
    source_material_id: clone.material_id,
    page_id: "p01",
    question_id: "q002",
    region_id: "reg_p01_q002",
    evidence_type: "student_original_answer",
    text: "第 2 题学生作答可见，但暂未判定正误。",
    raw_ocr_text: "第 2 题学生作答可见，但暂未判定正误。",
    normalized_text: "第 2 题学生作答可见，但暂未判定正误。",
    bbox: { x1: 0.12, y1: 0.56, x2: 0.82, y2: 0.68, coord_space: "normalized" },
    crop_ref: `crop://${clone.material_id}/p01/q002/answer`,
    confidence: 0.86,
    teacher_verified: false,
    risk_flags: []
  });
  return clone;
}

function findEvidenceRefForQuestion(packet: VisionEvidencePacket, questionId: string, evidenceType: string) {
  const evidence = packet.evidences.find((item) => item.question_id === questionId && item.evidence_type === evidenceType);
  if (!evidence) throw new Error(`Missing evidence type ${evidenceType} for ${questionId}`);
  return evidence.evidence_ref;
}
