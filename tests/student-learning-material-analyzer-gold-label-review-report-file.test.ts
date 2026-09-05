import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildGoldLabelReviewReport,
  validateGoldLabelReviewReport
} from "../src/skills/student-learning-material-analyzer/gold-label-review-report";
import {
  generateGoldLabelReviewReportFile,
  readGoldLabelReviewReportFile
} from "../src/skills/student-learning-material-analyzer/gold-label-review-report-files";
import type { StudentLearningMaterialGoldCase } from "../src/skills/student-learning-material-analyzer/evaluation";
import type { StudentLearningMaterialGoldLabelPackage } from "../src/skills/student-learning-material-analyzer/gold-labeling";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import type { VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

describe("student learning material gold label review report", () => {
  it("builds a 99%-ready agreement report from double-labeled adjudicated gold", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_gold_review_ready",
      studentId: "student_gold_review"
    });
    const packageValue = createGoldLabelPackage(packet);

    const report = buildGoldLabelReviewReport(packageValue, {
      generatedAt: "2026-06-20T16:00:00+08:00",
      sourcePacket: packet
    });
    const validation = validateGoldLabelReviewReport(report, packageValue, packet);

    expect(validation.ok, validation.errors.join("；")).toBe(true);
    expect(report).toEqual(
      expect.objectContaining({
        schema_version: "student_learning_material_gold_label_review_report.v0.1",
        package_id: packageValue.package_id,
        case_id: packageValue.case_id,
        label_count: 2,
        reviewer_count: 2,
        adjudication_status: "not_required_no_disagreement"
      })
    );
    expect(report.agreement).toEqual(
      expect.objectContaining({
        disagreement_count: 0,
        agreement_rate: 1,
        requires_adjudication: false
      })
    );
    expect(report.readiness.ready_for_99_evaluation).toBe(true);
  });

  it("redacts disagreement values and records adjudicated reviewer disagreement", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_gold_review_disagreement",
      studentId: "student_gold_review"
    });
    const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
    if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");
    const packageValue = createGoldLabelPackage(packet);
    packageValue.labels[1].gold.questions[0].expected_knowledge_points = [leakedEvidence.raw_ocr_text];
    packageValue.adjudicated_gold = cloneGold(packageValue.labels[0].gold);

    const report = buildGoldLabelReviewReport(packageValue, {
      generatedAt: "2026-06-20T16:00:00+08:00",
      sourcePacket: packet
    });
    const serialized = JSON.stringify(report);
    const validation = validateGoldLabelReviewReport(report, packageValue, packet);

    expect(validation.ok, validation.errors.join("；")).toBe(true);
    expect(report.adjudication_status).toBe("required_and_present");
    expect(report.agreement.disagreement_count).toBeGreaterThan(0);
    expect(report.agreement.requires_adjudication).toBe(true);
    expect(report.disagreements[0].reviewer_value_hashes[0]).toMatch(/^[a-f0-9]{16}$/);
    expect(serialized).not.toContain(leakedEvidence.raw_ocr_text);
    expect(report.readiness.ready_for_99_evaluation).toBe(true);
  });

  it("rejects tampered disagreement details even when aggregate counts still match", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_gold_review_tampered_disagreements",
      studentId: "student_gold_review"
    });
    const packageValue = createGoldLabelPackage(packet);
    packageValue.labels[1].gold.questions[0].expected_correctness = "incorrect";
    packageValue.adjudicated_gold = cloneGold(packageValue.labels[0].gold);

    const report = buildGoldLabelReviewReport(packageValue, {
      generatedAt: "2026-06-20T16:05:00+08:00",
      sourcePacket: packet
    });
    const tamperedReport = JSON.parse(JSON.stringify(report));
    tamperedReport.disagreements[0] = {
      ...tamperedReport.disagreements[0],
      field: "questions.q001.expected_knowledge_points",
      reviewer_value_hashes: ["0000000000000000", "1111111111111111"]
    };

    const validation = validateGoldLabelReviewReport(tamperedReport, packageValue, packet);

    expect(report.agreement.disagreement_count).toBeGreaterThan(0);
    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("disagreements must match gold label package agreement report");
  });

  it("keeps unadjudicated disagreements out of 99%-ready review", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_gold_review_unadjudicated",
      studentId: "student_gold_review"
    });
    const packageValue = createGoldLabelPackage(packet);
    packageValue.labels[1].gold.questions[0].expected_correctness = "incorrect";
    delete packageValue.adjudicated_gold;
    delete packageValue.adjudicated_by;

    const report = buildGoldLabelReviewReport(packageValue, {
      generatedAt: "2026-06-20T16:00:00+08:00",
      sourcePacket: packet
    });
    const validation = validateGoldLabelReviewReport(report, packageValue, packet);

    expect(validation.ok, validation.errors.join("；")).toBe(true);
    expect(report.adjudication_status).toBe("required_missing");
    expect(report.readiness.ready_for_99_evaluation).toBe(false);
    expect(report.readiness.blockers.join(" ")).toContain("adjudicated_gold is required");
    expect(report.readiness.blockers.join(" ")).toContain("labels disagree and adjudication is not complete");
  });

  it("writes the gold label review report specified by env vars or local paths", async () => {
    const envGoldLabelPackagePath = process.env.XUEMAI_GOLD_LABEL_PACKAGE;
    const envVisionPacketPath = process.env.XUEMAI_VISION_PACKET;
    const envOutputPath = process.env.XUEMAI_GOLD_LABEL_REVIEW_REPORT_OUTPUT;

    if (envGoldLabelPackagePath || envOutputPath) {
      if (!envGoldLabelPackagePath || !envOutputPath) {
        throw new Error(
          "Set XUEMAI_GOLD_LABEL_PACKAGE=/absolute/path/to/gold-label-package.json and XUEMAI_GOLD_LABEL_REVIEW_REPORT_OUTPUT=/absolute/path/to/gold-label-review-report.json"
        );
      }
      const result = await generateGoldLabelReviewReportFile({
        goldLabelPackagePath: envGoldLabelPackagePath,
        visionPacketPath: envVisionPacketPath,
        answerKeysPath: process.env.XUEMAI_ANSWER_KEYS,
        rubricsPath: process.env.XUEMAI_RUBRICS,
        goldLabelReviewReportOutputPath: envOutputPath,
        generatedAt: process.env.XUEMAI_GOLD_LABEL_REVIEW_REPORT_GENERATED_AT,
        allowIncomplete: process.env.XUEMAI_GOLD_LABEL_REVIEW_REPORT_ALLOW_INCOMPLETE === "1"
      });
      console.log(formatResult(result));
      expect(result.goldLabelReviewReportOutputPath).toBe(envOutputPath);
      return;
    }

    if (process.env.XUEMAI_GOLD_LABEL_REVIEW_REPORT_REQUIRED === "1") {
      throw new Error(
        "Set XUEMAI_GOLD_LABEL_PACKAGE=/absolute/path/to/gold-label-package.json and XUEMAI_GOLD_LABEL_REVIEW_REPORT_OUTPUT=/absolute/path/to/gold-label-review-report.json"
      );
    }

    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-gold-review-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const packagePath = path.join(tempDir, "gold-label-package.json");
    const outputPath = path.join(tempDir, "gold-label-review-report.json");
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_gold_review_file",
      studentId: "student_gold_review"
    });

    try {
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await writeFile(packagePath, `${JSON.stringify(createGoldLabelPackage(packet), null, 2)}\n`, "utf8");
      const result = await generateGoldLabelReviewReportFile({
        goldLabelPackagePath: packagePath,
        visionPacketPath: packetPath,
        goldLabelReviewReportOutputPath: outputPath,
        generatedAt: "2026-06-20T16:00:00+08:00"
      });
      const report = await readGoldLabelReviewReportFile(outputPath);

      expect(result.readyFor99Evaluation).toBe(true);
      expect(report.readiness.ready_for_99_evaluation).toBe(true);
      expect(report.package_id).toBe(`gold-label-${packet.material_id}`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects file generation when source-packet evidence basis crosses question ids", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-gold-review-cross-question-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const packagePath = path.join(tempDir, "gold-label-package.json");
    const outputPath = path.join(tempDir, "gold-label-review-report.json");
    const packet = appendSecondQuestionWithTrace(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_gold_review_cross_question",
        studentId: "student_gold_review"
      })
    );
    const packageValue = createTwoQuestionGoldLabelPackage(packet);
    const q002AnswerRef = findEvidenceRefForQuestion(packet, "q002", "student_original_answer");
    packageValue.labels[0].question_evidence_basis[0].student_trace_evidence_refs = [q002AnswerRef];

    try {
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await writeFile(packagePath, `${JSON.stringify(packageValue, null, 2)}\n`, "utf8");

      await expect(
        generateGoldLabelReviewReportFile({
          goldLabelPackagePath: packagePath,
          visionPacketPath: packetPath,
          goldLabelReviewReportOutputPath: outputPath,
          generatedAt: "2026-06-20T16:00:00+08:00"
        })
      ).rejects.toThrow(`evidence_ref=${q002AnswerRef} belongs to question_id=q002, not q001`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("validates review reports against missing and cross-question side-input maps", () => {
    const packet = appendSecondQuestionWithTrace(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_gold_review_side_input_scope",
        studentId: "student_gold_review"
      })
    );
    const packageValue = createTwoQuestionGoldLabelPackage(packet);
    packageValue.labels.forEach((label) => {
      label.question_evidence_basis[0].answer_key_or_rubric_evidence_refs = ["side_input.answer_key.q002"];
    });
    const allowedExternalEvidenceRefsByQuestionId = new Map([
      ["q001", ["side_input.answer_key.q001"]],
      ["q002", ["side_input.answer_key.q002"]]
    ]);
    const staleReadyReport = buildGoldLabelReviewReport(packageValue, {
      generatedAt: "2026-06-20T16:00:00+08:00",
      sourcePacket: packet
    });

    const staleValidation = validateGoldLabelReviewReport(staleReadyReport, packageValue, packet, {
      allowedExternalEvidenceRefsByQuestionId
    });
    const regeneratedReport = buildGoldLabelReviewReport(packageValue, {
      generatedAt: "2026-06-20T16:00:00+08:00",
      sourcePacket: packet,
      allowedExternalEvidenceRefsByQuestionId
    });
    const regeneratedValidation = validateGoldLabelReviewReport(regeneratedReport, packageValue, packet, {
      allowedExternalEvidenceRefsByQuestionId
    });

    expect(staleReadyReport.readiness.ready_for_99_evaluation).toBe(false);
    expect(staleReadyReport.readiness.blockers.join(" ")).toContain("requires question-mapped answer/rubric side input map");
    expect(staleValidation.ok).toBe(false);
    expect(staleValidation.errors.join(" ")).toContain("readiness.blockers must match gold label package validation");
    expect(regeneratedReport.readiness.ready_for_99_evaluation).toBe(false);
    expect(regeneratedReport.readiness.blockers.join(" ")).toContain(
      "labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs[0] side_input evidence_ref is not mapped to question_id=q001: side_input.answer_key.q002"
    );
    expect(regeneratedValidation.ok, regeneratedValidation.errors.join("；")).toBe(true);
  });

  it("rejects file generation when side-input answer basis crosses question ids", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-gold-review-cross-side-input-"));
    const packetPath = path.join(tempDir, "vision-packet.json");
    const answerKeysPath = path.join(tempDir, "answer-keys.json");
    const packagePath = path.join(tempDir, "gold-label-package.json");
    const outputPath = path.join(tempDir, "gold-label-review-report.json");
    const packet = appendSecondQuestionWithTrace(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_gold_review_cross_side_input",
        studentId: "student_gold_review"
      })
    );
    const packageValue = createTwoQuestionGoldLabelPackage(packet);
    packageValue.labels.forEach((label) => {
      label.question_evidence_basis[0].answer_key_or_rubric_evidence_refs = ["side_input.answer_key.q002"];
    });

    try {
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await writeFile(answerKeysPath, `${JSON.stringify([{ question_id: "q002", answer: "第二题外部答案依据。" }], null, 2)}\n`, "utf8");
      await writeFile(packagePath, `${JSON.stringify(packageValue, null, 2)}\n`, "utf8");

      await expect(
        generateGoldLabelReviewReportFile({
          goldLabelPackagePath: packagePath,
          visionPacketPath: packetPath,
          answerKeysPath,
          goldLabelReviewReportOutputPath: outputPath,
          generatedAt: "2026-06-20T16:00:00+08:00"
        })
      ).rejects.toThrow("side_input evidence_ref is not mapped to question_id=q001: side_input.answer_key.q002");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

function createGoldLabelPackage(packet: VisionEvidencePacket): StudentLearningMaterialGoldLabelPackage {
  const caseId = `case-${packet.material_id}`;
  const gold = createGold(caseId);
  const evidenceBasis = [
    {
      question_id: "q001",
      student_trace_evidence_refs: [findEvidenceRef(packet, "student_original_answer")],
      answer_key_or_rubric_evidence_refs: [findEvidenceRef(packet, "answer_key")],
      teacher_correction_evidence_refs: [findEvidenceRef(packet, "teacher_mark")]
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
        gold: cloneGold(gold),
        question_evidence_basis: evidenceBasis
      }
    ],
    adjudicated_gold: cloneGold(gold),
    adjudicated_by: {
      reviewer_id: "reviewer-adjudicator",
      reviewer_role: "教研负责人",
      adjudicated_at: "2026-06-20T15:55:00+08:00"
    }
  };
}

function createTwoQuestionGoldLabelPackage(packet: VisionEvidencePacket): StudentLearningMaterialGoldLabelPackage {
  const packageValue = createGoldLabelPackage(packet);
  const q002Gold = {
    question_id: "q002",
    definitive_judgement_allowed: false,
    expected_knowledge_points: ["待老师复核"]
  };
  const q002Basis = {
    question_id: "q002",
    student_trace_evidence_refs: [findEvidenceRefForQuestion(packet, "q002", "student_original_answer")]
  };

  packageValue.labels = packageValue.labels.map((label) => ({
    ...label,
    gold: {
      ...cloneGold(label.gold),
      questions: [...label.gold.questions, q002Gold]
    },
    question_evidence_basis: [...label.question_evidence_basis, q002Basis]
  }));
  if (!packageValue.adjudicated_gold) throw new Error("expected adjudicated gold");
  packageValue.adjudicated_gold = {
    ...cloneGold(packageValue.adjudicated_gold),
    questions: [...packageValue.adjudicated_gold.questions, q002Gold]
  };
  return packageValue;
}

function createGold(caseId: string): StudentLearningMaterialGoldCase {
  return {
    case_id: caseId,
    material_classification: {
      material_type: "exam",
      subject: "数学",
      education_stage: "middle",
      grade_candidate: "初二",
      region_or_curriculum_candidate: "未识别"
    },
    questions: [
      {
        question_id: "q001",
        definitive_judgement_allowed: true,
        expected_correctness: "partially_correct",
        expected_knowledge_points: ["一次函数应用"],
        expected_mistake_types: ["condition_extraction_error"]
      }
    ],
    require_safe_parent_feedback: true,
    require_teacher_professional_report: true,
    require_monthly_snapshot: true,
    require_model_contract: true
  };
}

function cloneGold(gold: StudentLearningMaterialGoldCase): StudentLearningMaterialGoldCase {
  return JSON.parse(JSON.stringify(gold)) as StudentLearningMaterialGoldCase;
}

function findEvidenceRef(packet: VisionEvidencePacket, evidenceType: string) {
  const evidence = packet.evidences.find((item) => item.evidence_type === evidenceType);
  if (!evidence) throw new Error(`Missing evidence type ${evidenceType}`);
  return evidence.evidence_ref;
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

function formatResult(result: Awaited<ReturnType<typeof generateGoldLabelReviewReportFile>>) {
  return [
    "Gold label review report generated",
    `caseId=${result.caseId}`,
    `packageId=${result.packageId}`,
    `goldLabelReviewReportOutputPath=${result.goldLabelReviewReportOutputPath}`,
    `labelCount=${result.labelCount}`,
    `reviewerCount=${result.reviewerCount}`,
    `questionCount=${result.questionCount}`,
    `disagreementCount=${result.disagreementCount}`,
    `agreementRate=${result.agreementRate}`,
    `adjudicationStatus=${result.adjudicationStatus}`,
    `readyFor99Evaluation=${result.readyFor99Evaluation ? "yes" : "no"}`,
    `blockers=${result.blockers.length}`,
    `warnings=${result.warnings.length}`
  ].join("\n");
}
