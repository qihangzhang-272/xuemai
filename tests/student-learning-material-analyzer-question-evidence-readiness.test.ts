import { describe, expect, it } from "vitest";
import {
  buildQuestionEvidenceReadiness,
  validateAnalysisAgainstQuestionEvidenceReadiness
} from "../src/skills/student-learning-material-analyzer/question-evidence-readiness";
import { buildLearningMaterialAnalysisPrompt } from "../src/skills/student-learning-material-analyzer/prompt";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import type { StudentLearningMaterialAnalysis, VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

const studentId = "00000000-0000-0000-0000-000000000301";

describe("question evidence readiness", () => {
  it("allows definitive judgement only when stem, student answer, answer basis, and confidence are present", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_readiness_clear",
      studentId
    });

    const readiness = buildQuestionEvidenceReadiness(packet);

    expect(readiness.summary).toEqual(
      expect.objectContaining({
        question_count: 1,
        definitive_allowed_count: 1,
        teacher_review_required_count: 0,
        blocked_count: 0
      })
    );
    expect(readiness.questions[0]).toEqual(
      expect.objectContaining({
        question_id: "q001",
        status: "definitive_allowed",
        definitive_judgement_allowed: true,
        reasons: []
      })
    );
  });

  it("routes questions without answer key, rubric, or teacher correction to teacher review", () => {
    const packet = removeAnswerBasis(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_readiness_no_answer_basis",
        studentId
      })
    );

    const readiness = buildQuestionEvidenceReadiness(packet);

    expect(readiness.summary.definitive_allowed_count).toBe(0);
    expect(readiness.summary.teacher_review_required_count).toBe(1);
    expect(readiness.questions[0]).toEqual(
      expect.objectContaining({
        status: "teacher_review_required",
        definitive_judgement_allowed: false,
        reasons: expect.arrayContaining(["answer_basis_missing"])
      })
    );
  });

  it("uses mapped external answer keys as answer basis without exposing answer content in readiness", () => {
    const packet = removeAnswerBasis(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_readiness_external_answer_key",
        studentId
      })
    );

    const readiness = buildQuestionEvidenceReadiness(packet, {
      answerKeys: [{ question_id: "q001", answer: "外部答案内容不进入 readiness 文案" }]
    });

    expect(readiness.summary.definitive_allowed_count).toBe(1);
    expect(readiness.questions[0]).toEqual(
      expect.objectContaining({
        status: "definitive_allowed",
        definitive_judgement_allowed: true,
        reasons: [],
        evidenceRefs: expect.arrayContaining(["side_input.answer_key.q001"])
      })
    );
    expect(readiness.questions[0].evidence_summary).toEqual(
      expect.objectContaining({
        has_answer_key_or_rubric: true,
        has_external_answer_key: true,
        has_external_rubric: false
      })
    );
    expect(JSON.stringify(readiness)).not.toContain("外部答案内容");
  });

  it("uses mapped external rubrics as answer basis", () => {
    const packet = removeAnswerBasis(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_readiness_external_rubric",
        studentId
      })
    );

    const readiness = buildQuestionEvidenceReadiness(packet, {
      rubrics: [{ questionId: "q001", scoring_points: ["关系式", "取值范围"] }]
    });

    expect(readiness.summary.definitive_allowed_count).toBe(1);
    expect(readiness.questions[0]).toEqual(
      expect.objectContaining({
        status: "definitive_allowed",
        definitive_judgement_allowed: true,
        evidenceRefs: expect.arrayContaining(["side_input.rubric.q001"])
      })
    );
    expect(readiness.questions[0].evidence_summary).toEqual(
      expect.objectContaining({
        has_answer_key_or_rubric: true,
        has_external_answer_key: false,
        has_external_rubric: true
      })
    );
  });

  it("does not unlock a question when external side input is mapped to a different question_id", () => {
    const packet = removeAnswerBasis(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_readiness_external_wrong_question",
        studentId
      })
    );

    const readiness = buildQuestionEvidenceReadiness(packet, {
      answerKeys: [{ question_id: "q999", answer: "not for q001" }]
    });

    expect(readiness.summary.definitive_allowed_count).toBe(0);
    expect(readiness.questions[0]).toEqual(
      expect.objectContaining({
        status: "teacher_review_required",
        definitive_judgement_allowed: false,
        reasons: expect.arrayContaining(["answer_basis_missing"])
      })
    );
  });

  it("blocks blank templates without student answers before any ability inference", () => {
    const packet = getMockVisionEvidencePacket("blank_question_template", {
      materialId: "mat_readiness_blank",
      studentId
    });

    const readiness = buildQuestionEvidenceReadiness(packet);

    expect(readiness.summary.blocked_count).toBe(1);
    expect(readiness.questions[0].reasons).toEqual(expect.arrayContaining(["student_answer_missing", "answer_basis_missing"]));
  });

  it("routes low-confidence or unstable question segmentation to teacher review", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_readiness_unstable",
      studentId
    });
    packet.questions[0].confidence = 0.5;
    packet.questions[0].risk_flags = ["ambiguous_question_boundary"];

    const readiness = buildQuestionEvidenceReadiness(packet);

    expect(readiness.questions[0]).toEqual(
      expect.objectContaining({
        status: "teacher_review_required",
        definitive_judgement_allowed: false,
        reasons: expect.arrayContaining(["question_segmentation_unstable"])
      })
    );
  });

  it("routes bbox-only question regions without crop refs to teacher review", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_readiness_missing_crop_ref",
      studentId
    });
    delete packet.questions[0].regions[0].crop_ref;

    const readiness = buildQuestionEvidenceReadiness(packet);

    expect(readiness.questions[0]).toEqual(
      expect.objectContaining({
        status: "teacher_review_required",
        definitive_judgement_allowed: false,
        reasons: expect.arrayContaining(["question_segmentation_unstable"])
      })
    );
  });

  it("routes questions with critical evidence missing region attribution to teacher review", () => {
    const packet = removeCriticalEvidenceRegionIds(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_readiness_missing_critical_region",
        studentId
      })
    );

    const readiness = buildQuestionEvidenceReadiness(packet);

    expect(readiness.summary.definitive_allowed_count).toBe(0);
    expect(readiness.summary.teacher_review_required_count).toBe(1);
    expect(readiness.questions[0]).toEqual(
      expect.objectContaining({
        status: "teacher_review_required",
        definitive_judgement_allowed: false,
        reasons: expect.arrayContaining(["critical_evidence_region_missing"])
      })
    );
  });

  it("rejects model hard judgements that exceed per-question readiness gates", () => {
    const packet = removeAnswerBasis(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_readiness_validation",
        studentId
      })
    );
    const readiness = buildQuestionEvidenceReadiness(packet);
    const validation = validateAnalysisAgainstQuestionEvidenceReadiness(
      {
        question_analyses: [
          {
            question_id: "q001",
            correctnessJudgement: {
              status: "incorrect"
            }
          }
        ]
      } as StudentLearningMaterialAnalysis,
      readiness
    );

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("definitive judgement is not allowed");
    expect(validation.errors.join(" ")).toContain("answer_basis_missing");
  });

  it("passes question readiness into the model prompt as a deterministic gate", () => {
    const packet = removeAnswerBasis(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_readiness_prompt",
        studentId
      })
    );

    const prompt = buildLearningMaterialAnalysisPrompt({ packet });

    expect(prompt).toContain("deterministicQuestionEvidenceReadiness");
    expect(prompt).toContain("\"teacher_review_required_count\":1");
    expect(prompt).toContain("\"answer_basis_missing\"");
  });

  it("passes side-input-unlocked question readiness into the model prompt", () => {
    const packet = removeAnswerBasis(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_readiness_prompt_external_answer_key",
        studentId
      })
    );

    const prompt = buildLearningMaterialAnalysisPrompt({
      packet,
      answerKeys: [{ question_id: "q001", answer: "A" }]
    });

    expect(prompt).toContain("deterministicQuestionEvidenceReadiness");
    expect(prompt).toContain("\"definitive_allowed_count\":1");
    expect(prompt).toContain("\"has_external_answer_key\":true");
  });
});

function removeAnswerBasis(packet: VisionEvidencePacket): VisionEvidencePacket {
  const clone = JSON.parse(JSON.stringify(packet)) as VisionEvidencePacket;
  clone.evidences = clone.evidences.filter((evidence) => evidence.evidence_type !== "answer_key" && evidence.evidence_type !== "rubric" && !evidence.evidence_type.startsWith("teacher_"));
  clone.gates = clone.gates.filter((gate) => gate.gate_id !== "answer_key" && gate.gate_id !== "teacher_mark_answer_key_conflict");
  return clone;
}

function removeCriticalEvidenceRegionIds(packet: VisionEvidencePacket): VisionEvidencePacket {
  const clone = JSON.parse(JSON.stringify(packet)) as VisionEvidencePacket;
  clone.evidences.forEach((evidence) => {
    if (["question_stem", "student_original_answer", "answer_key", "rubric", "teacher_mark", "teacher_comment", "teacher_score"].includes(evidence.evidence_type)) {
      delete evidence.region_id;
    }
  });
  return clone;
}
