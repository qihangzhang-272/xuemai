import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateStudentLearningMaterialDatasetFile, loadStudentLearningMaterialEvaluationDatasetBundleFromFile } from "../src/skills/student-learning-material-analyzer/evaluation-files";
import {
  buildGoldLabelAgreementReport,
  createGoldLabelPackageTemplateFromVisionPacket,
  extractAdjudicatedGoldCaseFromLabelPackage,
  validateStudentLearningMaterialGoldLabelPackage,
  type StudentLearningMaterialGoldLabelPackage
} from "../src/skills/student-learning-material-analyzer/gold-labeling";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import type { StudentLearningMaterialGoldCase } from "../src/skills/student-learning-material-analyzer/evaluation";
import type { VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

describe("student learning material gold labeling", () => {
  it("validates double-labeled adjudicated gold packages for 99% evaluation", () => {
    const packageValue = createGoldLabelPackage();

    const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue);
    const extraction = extractAdjudicatedGoldCaseFromLabelPackage(packageValue);
    const agreement = buildGoldLabelAgreementReport(packageValue.labels);

    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(extraction.ok).toBe(true);
    if (extraction.ok) expect(extraction.gold.case_id).toBe("synthetic-mainland-k12-math-exam-001");
    expect(agreement.ok).toBe(true);
    expect(agreement.requiresAdjudication).toBe(false);
  });

  it("rejects gold label package notes that copy OCR text from the source VisionEvidencePacket", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_gold_label_text_leak",
      studentId: "student_gold_label"
    });
    const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
    if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");
    const packageValue = createGoldLabelPackage();

    packageValue.labels[0].notes = [`人工备注误写入原文：${leakedEvidence.raw_ocr_text}`];
    const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue, {
      sourcePacket: packet
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
    expect(validation.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
  });

  it("validates gold package identity, question coverage, and evidence basis against the source VisionEvidencePacket", () => {
    const packet = appendSecondQuestionWithTrace(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_gold_label_source_aligned",
        studentId: "student_gold_label"
      })
    );
    const packageValue = createSourcePacketAlignedGoldLabelPackage(packet);

    const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue, {
      sourcePacket: packet
    });

    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("rejects source-packet gold packages with reordered question ids", () => {
    const packet = appendSecondQuestionWithTrace(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_gold_label_reordered",
        studentId: "student_gold_label"
      })
    );
    const packageValue = createSourcePacketAlignedGoldLabelPackage(packet);
    packageValue.labels[0].gold.questions = [...packageValue.labels[0].gold.questions].reverse();

    const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue, {
      sourcePacket: packet
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("labels[0].gold.questions order must match VisionEvidencePacket questions");
  });

  it("rejects source-packet gold packages with cross-question evidence basis refs", () => {
    const packet = appendSecondQuestionWithTrace(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_gold_label_cross_question_basis",
        studentId: "student_gold_label"
      })
    );
    const packageValue = createSourcePacketAlignedGoldLabelPackage(packet);
    const q002AnswerRef = findEvidenceRefForQuestion(packet, "q002", "student_original_answer");
    packageValue.labels[0].question_evidence_basis[0].student_trace_evidence_refs = [q002AnswerRef];

    const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue, {
      sourcePacket: packet
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain(`evidence_ref=${q002AnswerRef} belongs to question_id=q002, not q001`);
  });

  it("rejects source-packet gold packages whose evidence basis refs use the wrong evidence type", () => {
    const packet = appendSecondQuestionWithTrace(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_gold_label_wrong_basis_type",
        studentId: "student_gold_label"
      })
    );
    const packageValue = createSourcePacketAlignedGoldLabelPackage(packet);
    const q001AnswerKeyRef = findEvidenceRefForQuestion(packet, "q001", "answer_key");
    const q001StudentAnswerRef = findEvidenceRefForQuestion(packet, "q001", "student_original_answer");
    packageValue.labels[0].question_evidence_basis[0].student_trace_evidence_refs = [q001AnswerKeyRef];
    packageValue.labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs = [q001StudentAnswerRef];
    packageValue.labels[0].question_evidence_basis[0].teacher_correction_evidence_refs = [q001StudentAnswerRef];

    const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue, {
      sourcePacket: packet
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain(
      `student_trace_evidence_refs[0] evidence_ref=${q001AnswerKeyRef} has evidence_type=answer_key, expected student trace evidence`
    );
    expect(validation.errors.join(" ")).toContain(
      `answer_key_or_rubric_evidence_refs[0] evidence_ref=${q001StudentAnswerRef} has evidence_type=student_original_answer, expected answer_key or rubric evidence`
    );
    expect(validation.errors.join(" ")).toContain(
      `teacher_correction_evidence_refs[0] evidence_ref=${q001StudentAnswerRef} has evidence_type=student_original_answer, expected teacher correction evidence`
    );
  });

  it("rejects source-packet gold packages with side input answer refs mapped to another question", () => {
    const packet = appendSecondQuestionWithTrace(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_gold_label_cross_question_side_input",
        studentId: "student_gold_label"
      })
    );
    const packageValue = createSourcePacketAlignedGoldLabelPackage(packet);
    packageValue.labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs = ["side_input.answer_key.q002"];

    const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue, {
      sourcePacket: packet,
      allowedExternalEvidenceRefsByQuestionId: new Map([
        ["q001", ["side_input.answer_key.q001"]],
        ["q002", ["side_input.answer_key.q002"]]
      ])
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain(
      "labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs[0] side_input evidence_ref is not mapped to question_id=q001: side_input.answer_key.q002"
    );
  });

  it("rejects source-packet gold packages that use side inputs without a declared question map", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_gold_label_unmapped_side_input",
      studentId: "student_gold_label"
    });
    const packageValue = createSourcePacketAlignedGoldLabelPackage(packet);
    packageValue.labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs = ["side_input.answer_key.q001"];

    const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue, {
      sourcePacket: packet
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain(
      "labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs[0] side_input evidence_ref requires question-mapped answer/rubric side input map for source-packet validation: side_input.answer_key.q001"
    );
  });

  it("requires adjudication when two human labels disagree", () => {
    const packageValue = createGoldLabelPackage();
    packageValue.labels[1] = {
      ...packageValue.labels[1],
      gold: cloneGold(packageValue.labels[1].gold)
    };
    packageValue.labels[1].gold.questions[0].expected_correctness = "correct";
    delete packageValue.adjudicated_gold;
    delete packageValue.adjudicated_by;

    const agreement = buildGoldLabelAgreementReport(packageValue.labels);
    const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue, { requireAdjudication: true });

    expect(agreement.ok).toBe(false);
    expect(agreement.requiresAdjudication).toBe(true);
    expect(agreement.disagreements[0].field).toContain("expected_correctness");
    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("adjudicated_gold is required");
  });

  it("rejects adjudicated definitive gold questions that are not supported by reviewer evidence basis", () => {
    const packet = appendSecondQuestionWithTrace(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_gold_label_adjudicated_unsupported",
        studentId: "student_gold_label"
      })
    );
    const packageValue = createSourcePacketAlignedGoldLabelPackage(packet);
    packageValue.adjudicated_gold!.questions[1] = {
      ...packageValue.adjudicated_gold!.questions[1],
      definitive_judgement_allowed: true,
      expected_correctness: "incorrect"
    };

    const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue, {
      sourcePacket: packet
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain(
      "adjudicated_gold.questions[1] definitive question_id=q002 requires labels[0] answer/rubric or teacher correction evidence"
    );
    expect(validation.errors.join(" ")).toContain(
      "adjudicated_gold.questions[1] definitive question_id=q002 requires labels[1] answer/rubric or teacher correction evidence"
    );
  });

  it("creates reviewer templates from VisionEvidencePacket question ids without making them evaluation-ready", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000620",
      studentId: "00000000-0000-0000-0000-000000000621"
    });

    const template = createGoldLabelPackageTemplateFromVisionPacket(packet, {
      caseId: "gold-template-case",
      labeledAt: "2026-06-19T00:00:00.000Z"
    });
    const draftValidation = validateStudentLearningMaterialGoldLabelPackage(template, { requireAdjudication: false });

    expect(template.labels).toHaveLength(2);
    expect(template.labels[0].gold.questions.map((question) => question.question_id)).toEqual(packet.questions.map((question) => question.question_id));
    expect(template.adjudicated_gold).toBeUndefined();
    expect(draftValidation.ok).toBe(false);
    expect(draftValidation.errors.join(" ")).toContain("anonymization.student_identifiers_removed");
    expect(draftValidation.warnings.join(" ")).toContain("annotation draft");
  });

  it("loads evaluation datasets that reference adjudicated gold label packages", () => {
    const { analysis } = readSyntheticSmokeCase();
    const dir = mkdtempSync(join(tmpdir(), "xuemai-gold-label-"));
    writeFileSync(join(dir, "gold-label-package.json"), JSON.stringify(createGoldLabelPackage(), null, 2), "utf8");
    writeFileSync(join(dir, "analysis.json"), JSON.stringify(analysis, null, 2), "utf8");
    writeFileSync(
      join(dir, "dataset.json"),
      JSON.stringify(
        {
          fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
          dataset_id: "gold-label-package-human-labeled-mini-gold",
          dataset_kind: "human_labeled",
          review_protocol: {
            double_labeled: true,
            adjudicated: true,
            anonymized: true,
            reviewer_roles: ["教研标注员", "授课老师"]
          },
          asset_preflight: {
            claimable99AssetReady: true,
            manifest_id: "gold-label-package-human-labeled-mini-gold",
            checked_at: "2026-06-20T00:00:00+08:00",
            blockers: []
          },
          cases: [{ asset_manifest_case_id: "gold-label-package-human-labeled-mini-gold-case-001", gold_label_package_path: "gold-label-package.json", analysis_path: "analysis.json" }]
        },
        null,
        2
      ),
      "utf8"
    );

    const loaded = loadStudentLearningMaterialEvaluationDatasetBundleFromFile(join(dir, "dataset.json"));
    const run = evaluateStudentLearningMaterialDatasetFile(join(dir, "dataset.json"), undefined, {
      minimum_case_count: 1,
      minimum_question_count: 2,
      require_human_labeled_dataset: true,
      require_double_labeled: true,
      require_adjudicated: true,
      require_anonymized: true
    });

    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.bundle.cases[0].gold.case_id).toBe("synthetic-mainland-k12-math-exam-001");
    expect(run.ok).toBe(true);
    expect(run.result?.claimable99Correctness).toBe(true);
    expect(run.report).toContain("claimable99Correctness=yes");
  });
});

function createGoldLabelPackage(): StudentLearningMaterialGoldLabelPackage {
  const { gold } = readSyntheticSmokeCase();
  return {
    fixture_schema: "student_learning_material_gold_label_package.v0.1",
    package_id: "gold-label-synthetic-mainland-k12-math-exam-001",
    case_id: gold.case_id,
    source_material_id: "synthetic_material_001",
    vision_packet_id: "synthetic_vision_packet_001",
    material_id: "synthetic_material_001",
    anonymization: {
      student_identifiers_removed: true,
      teacher_identifiers_removed: true,
      school_identifiers_removed: true,
      raw_images_excluded_from_gold_file: true
    },
    labels: [
      {
        label_id: "label-a-synthetic-mainland-k12-math-exam-001",
        reviewer_id: "reviewer-a",
        reviewer_role: "教研标注员",
        labeled_at: "2026-06-19T00:00:00.000Z",
        gold,
        question_evidence_basis: createEvidenceBasis()
      },
      {
        label_id: "label-b-synthetic-mainland-k12-math-exam-001",
        reviewer_id: "reviewer-b",
        reviewer_role: "授课老师",
        labeled_at: "2026-06-19T00:10:00.000Z",
        gold: cloneGold(gold),
        question_evidence_basis: createEvidenceBasis()
      }
    ],
    adjudicated_gold: cloneGold(gold),
    adjudicated_by: {
      reviewer_id: "reviewer-adjudicator",
      reviewer_role: "教研负责人",
      adjudicated_at: "2026-06-19T00:20:00.000Z"
    }
  };
}

function createSourcePacketAlignedGoldLabelPackage(packet: VisionEvidencePacket): StudentLearningMaterialGoldLabelPackage {
  const packageValue = createGoldLabelPackageTemplateFromVisionPacket(packet, {
    caseId: `case-${packet.material_id}`,
    labeledAt: "2026-06-19T00:00:00.000Z"
  });
  const gold = {
    ...cloneGold(packageValue.labels[0].gold),
    material_classification: {
      material_type: "exam" as const,
      subject: "数学" as const,
      education_stage: "middle" as const,
      grade_candidate: "初二",
      region_or_curriculum_candidate: "未识别"
    }
  };
  packageValue.anonymization = {
    student_identifiers_removed: true,
    teacher_identifiers_removed: true,
    school_identifiers_removed: true,
    raw_images_excluded_from_gold_file: true
  };
  packageValue.labels = packageValue.labels.map((label) => ({
    ...label,
    gold: cloneGold(gold),
    notes: []
  }));
  packageValue.adjudicated_gold = cloneGold(gold);
  packageValue.adjudicated_by = {
    reviewer_id: "reviewer-adjudicator",
    reviewer_role: "教研负责人",
    adjudicated_at: "2026-06-19T00:20:00.000Z"
  };
  return packageValue;
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

function createEvidenceBasis() {
  return [
    {
      question_id: "q001",
      student_trace_evidence_refs: ["synthetic.material_001.q001.answer"],
      answer_key_or_rubric_evidence_refs: ["synthetic.material_001.q001.answer_key"],
      teacher_correction_evidence_refs: ["synthetic.material_001.q001.teacher_mark"]
    },
    {
      question_id: "q002",
      student_trace_evidence_refs: ["synthetic.material_001.q002.stem"]
    }
  ];
}

function readSyntheticSmokeCase() {
  const dataset = JSON.parse(readFileSync("tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json", "utf8"));
  return dataset.cases[0] as { gold: StudentLearningMaterialGoldCase; analysis: unknown };
}

function cloneGold(gold: StudentLearningMaterialGoldCase): StudentLearningMaterialGoldCase {
  return JSON.parse(JSON.stringify(gold)) as StudentLearningMaterialGoldCase;
}
