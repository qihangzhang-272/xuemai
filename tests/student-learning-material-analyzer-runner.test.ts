import { describe, expect, it } from "vitest";
import { getMockVisionEvidencePacket, mockVisionFixtureIds } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import { MemoryLearningMaterialAnalyzerRepository } from "../src/skills/student-learning-material-analyzer/memory-repository";
import {
  createLearningMaterialAnalysisModel,
  parseStudentLearningMaterialAnalysisJson
} from "../src/skills/student-learning-material-analyzer/model";
import { runAnalyzeLearningEvidence } from "../src/skills/student-learning-material-analyzer/runner";
import { validateVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/validators";
import type {
  AnalysisJob,
  LearningMaterialAnalysisModel,
  MaterialState,
  StudentLearningMaterialAnalysis,
  VisionEvidencePacket
} from "../src/skills/student-learning-material-analyzer/types";

const teacherContext = {
  teacherId: "00000000-0000-0000-0000-000000000101",
  tenantId: "00000000-0000-0000-0000-000000000201"
};

const studentId = "00000000-0000-0000-0000-000000000301";

describe("student learning material analyzer runner", () => {
  it("validates all mock VisionEvidencePacket fixtures", () => {
    for (const fixtureId of mockVisionFixtureIds) {
      const packet = getMockVisionEvidencePacket(fixtureId, {
        materialId: `00000000-0000-0000-0000-00000000${fixtureId.length.toString().padStart(4, "0")}`,
        studentId,
        teacherId: teacherContext.teacherId,
        tenantId: teacherContext.tenantId
      });

      expect(validateVisionEvidencePacket(packet)).toEqual(
        expect.objectContaining({
          ok: true,
          errors: []
        })
      );
      expect(packet.evidences.every((evidence) => evidence.page_id && evidence.question_id && evidence.evidence_type && evidence.confidence)).toBe(true);
      expect(packet.evidences.every((evidence) => evidence.bbox || evidence.crop_ref)).toBe(true);
      expect(packet.gates.length).toBeGreaterThan(0);
    }
  });

  it("keeps bbox-only visual evidence valid but warns that teacher review is required", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000420",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    delete packet.questions[0].regions[0].crop_ref;
    delete packet.evidences[0].crop_ref;

    const validation = validateVisionEvidencePacket(packet);

    expect(validation.ok).toBe(true);
    expect(validation.warnings.join(" ")).toContain("missing crop_ref");
  });

  it("does not generate student ability judgement for blank question templates", async () => {
    const packet = getMockVisionEvidencePacket("blank_question_template", {
      materialId: "00000000-0000-0000-0000-000000000401",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        throw new Error("Model should not be called for blocked blank template.");
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_blank",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.analysis.student_profile_update_suggestions).toHaveLength(0);
    expect(result.analysis.risk_flags).toContain("no_student_trace");
    expect(result.analysis.wechat_parent_feedback_draft.status).toBe("needs_teacher_review");
  });

  it("routes unsupported material states to teacher review before any model call", async () => {
    const cases: Array<{ materialState: MaterialState; expectedReason: string }> = [
      { materialState: "insufficient_student_trace", expectedReason: "no_student_trace" },
      { materialState: "teacher_resource", expectedReason: "unsupported_material_state" },
      { materialState: "needs_review", expectedReason: "unsupported_material_state" },
      { materialState: "low_quality", expectedReason: "low_image_quality" }
    ];

    for (const item of cases) {
      const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: `00000000-0000-0000-0000-000000${item.materialState.length.toString().padStart(6, "0")}`,
        studentId,
        teacherId: teacherContext.teacherId,
        tenantId: teacherContext.tenantId
      });
      packet.material_state = item.materialState;
      let modelCalled = false;
      const model: LearningMaterialAnalysisModel = {
        async generateAnalysis() {
          modelCalled = true;
          throw new Error(`Model should not be called for material_state=${item.materialState}.`);
        }
      };

      const result = await runAnalyzeLearningEvidence({
        analysisJobId: `job_${item.materialState}`,
        materialId: packet.material_id,
        studentId,
        visionEvidencePacket: packet,
        teacherContext,
        model
      });

      expect(modelCalled, item.materialState).toBe(false);
      expect(result.status, item.materialState).toBe("degraded");
      expect(result.analysis.risk_flags, item.materialState).toContain(item.expectedReason);
      expect(result.analysis.teacher_review_required, item.materialState).toBe(true);
      expect(result.analysis.student_profile_update_suggestions, item.materialState).toHaveLength(0);
      expect(result.analysis.monthly_report_snapshot.teacher_confirmed, item.materialState).toBe(false);
      expect(result.analysis.wechat_parent_feedback_draft.status, item.materialState).toBe("needs_teacher_review");
    }
  });

  it("routes notes-only materials to teacher review without calling the model", async () => {
    const packet = getMockVisionEvidencePacket("student_notes_only", {
      materialId: "00000000-0000-0000-0000-000000000423",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    let modelCalled = false;
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        modelCalled = true;
        throw new Error("Model should not be called for notes-only material.");
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_notes_only",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(modelCalled).toBe(false);
    expect(result.status).toBe("degraded");
    expect(result.analysis.risk_flags).toContain("notes_only");
    expect(result.analysis.evidence_summary.missing_context).toContain("题目、学生作答、标准答案或老师批改依据");
    expect(result.analysis.student_profile_update_suggestions).toHaveLength(0);
    expect(result.analysis.monthly_report_snapshot.teacher_confirmed).toBe(false);
    expect(result.analysis.wechat_parent_feedback_draft.status).toBe("needs_teacher_review");
  });

  it("routes teacher-mark-only materials to teacher review without calling the model", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000424",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    packet.evidences = packet.evidences.filter((evidence) => evidence.evidence_type === "teacher_mark");
    keepOnlyExistingGateEvidenceRefs(packet);
    let modelCalled = false;
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        modelCalled = true;
        throw new Error("Model should not be called for teacher-mark-only material.");
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_teacher_mark_only",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(modelCalled).toBe(false);
    expect(result.status).toBe("degraded");
    expect(result.analysis.risk_flags).toContain("teacher_mark_only");
    expect(result.analysis.evidence_summary.missing_context).toContain("学生原始作答、订正内容或解题过程");
    expect(result.analysis.student_profile_update_suggestions).toHaveLength(0);
    expect(result.analysis.monthly_report_snapshot.teacher_confirmed).toBe(false);
    expect(result.analysis.wechat_parent_feedback_draft.status).toBe("needs_teacher_review");
  });

  it("routes explicit non-K12 materials to teacher review even when material_state is valid", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000422",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    packet.evidences[0] = {
      ...packet.evidences[0],
      evidence_type: "material_metadata",
      text: "大学高等数学期末试卷 学生作答后老师批改，内容为线性代数与极限计算。",
      raw_ocr_text: "大学高等数学期末试卷 学生作答后老师批改，内容为线性代数与极限计算。",
      normalized_text: "大学高等数学期末试卷 学生作答后老师批改，内容为线性代数与极限计算。"
    };
    let modelCalled = false;
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        modelCalled = true;
        throw new Error("Model should not be called for explicit non-K12 material.");
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_out_of_k12_scope",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(modelCalled).toBe(false);
    expect(result.status).toBe("degraded");
    expect(result.analysis.risk_flags).toContain("out_of_k12_scope");
    expect(result.analysis.teacher_review_required).toBe(true);
    expect(result.analysis.student_profile_update_suggestions).toHaveLength(0);
    expect(result.analysis.wechat_parent_feedback_draft.status).toBe("needs_teacher_review");
  });

  it("blocks model conclusions without evidenceRefs", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000402",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const invalidAnalysis = createValidAnalysis(packet);
    invalidAnalysis.question_analyses[0].correctnessJudgement.evidenceRefs = [];
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return invalidAnalysis;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_missing_evidence",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.some((error) => error.includes("evidenceRefs"))).toBe(true);
    expect(result.analysis.risk_flags).toContain("missing_evidenceRefs");
  });

  it("blocks model conclusions that cite evidence refs outside the same packet or allowed side inputs", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000421",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const invalidAnalysis = createValidAnalysis(packet);
    invalidAnalysis.next_learning_actions[0].evidenceRefs = ["model.hallucinated.evidence_ref"];
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return invalidAnalysis;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_unknown_evidence_ref",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.join(" ")).toContain("next_learning_actions[0].evidenceRefs[0] references unknown evidenceRef");
    expect(result.analysis.risk_flags).toContain("missing_evidenceRefs");
  });

  it("blocks per-question analysis refs that use side inputs mapped to a different question", async () => {
    const packet = appendReviewOnlyQuestion(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "00000000-0000-0000-0000-000000000431",
        studentId,
        teacherId: teacherContext.teacherId,
        tenantId: teacherContext.tenantId
      })
    );
    const invalidAnalysis = createValidAnalysis(packet);
    invalidAnalysis.question_analyses.push(createTeacherReviewQuestionAnalysisForPacketQuestion(invalidAnalysis, packet, "q002"));
    invalidAnalysis.question_analyses[0].correctnessJudgement.evidenceRefs = ["side_input.answer_key.q002"];
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return invalidAnalysis;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_cross_question_side_input",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      answerKeys: [
        { question_id: "q001", answer: "第一题答案依据。" },
        { question_id: "q002", answer: "第二题答案依据。" }
      ],
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.join(" ")).toContain(
      "question_analyses[0].correctnessJudgement.evidenceRefs[0] references side input evidenceRef=side_input.answer_key.q002 not mapped to question_id=q001"
    );
  });

  it("blocks process-based mistake diagnosis when same-question student process evidence is absent", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000432",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const invalidAnalysis = createValidAnalysis(packet);
    invalidAnalysis.question_analyses[0].mistakeDiagnosis[0] = {
      ...invalidAnalysis.question_analyses[0].mistakeDiagnosis[0],
      diagnosis_type: "review_or_checking_gap",
      explanation: "学生这题主要是检查习惯不足，属于粗心漏看条件。"
    };
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return invalidAnalysis;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_process_mistake_without_process_evidence",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.join(" ")).toContain(
      "question_analyses[0].mistakeDiagnosis[0] diagnosis_type=review_or_checking_gap requires same-question student_process or student_note evidenceRefs"
    );
  });

  it("degrades model outputs that omit any question from the VisionEvidencePacket", async () => {
    const packet = appendReviewOnlyQuestion(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "00000000-0000-0000-0000-000000000423",
        studentId,
        teacherId: teacherContext.teacherId,
        tenantId: teacherContext.tenantId
      })
    );
    const incompleteAnalysis = createValidAnalysis(packet);
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return incompleteAnalysis;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_missing_packet_question",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.join(" ")).toContain("question_analyses missing VisionEvidencePacket question_id=q002");
    expect(result.analysis.risk_flags).toContain("model_output_invalid");
  });

  it("degrades model outputs with duplicate question analyses", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000424",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const duplicateAnalysis = createValidAnalysis(packet);
    duplicateAnalysis.question_analyses.push(JSON.parse(JSON.stringify(duplicateAnalysis.question_analyses[0])));
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return duplicateAnalysis;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_duplicate_question_analysis",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.join(" ")).toContain("question_analyses duplicate question_id=q001");
    expect(result.analysis.risk_flags).toContain("model_output_invalid");
  });

  it("degrades model outputs whose question order does not match the VisionEvidencePacket", async () => {
    const packet = appendReviewOnlyQuestion(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "00000000-0000-0000-0000-000000000425",
        studentId,
        teacherId: teacherContext.teacherId,
        tenantId: teacherContext.tenantId
      })
    );
    const reorderedAnalysis = createValidAnalysis(packet);
    const q002 = createTeacherReviewQuestionAnalysisForPacketQuestion(reorderedAnalysis, packet, "q002");
    reorderedAnalysis.question_analyses = [q002, reorderedAnalysis.question_analyses[0]];
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return reorderedAnalysis;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_reordered_question_analysis",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.join(" ")).toContain("question_analyses order must match VisionEvidencePacket questions");
    expect(result.analysis.risk_flags).toContain("model_output_invalid");
  });

  it("keeps every packet question as a teacher-review row in degraded output", async () => {
    const packet = appendReviewOnlyQuestion(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "00000000-0000-0000-0000-000000000426",
        studentId,
        teacherId: teacherContext.teacherId,
        tenantId: teacherContext.tenantId
      })
    );
    packet.evidences = packet.evidences.filter((evidence) => evidence.evidence_type !== "answer_key" && evidence.evidence_type !== "rubric" && !evidence.evidence_type.startsWith("teacher_"));
    keepOnlyExistingGateEvidenceRefs(packet);
    packet.gates = packet.gates.filter((gate) => gate.gate_id !== "answer_key" && gate.gate_id !== "teacher_mark_answer_key_conflict");
    packet.gates.push({
      gate_id: "answer_key",
      status: "degrade",
      reason: "No answer key or rubric evidence is available.",
      evidenceRefs: [],
      risk_flags: ["answer_key_missing"]
    });
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        throw new Error("Model should not be called when pre-model evidence gates degrade.");
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_degraded_all_questions",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.analysis.question_analyses.map((question) => question.question_id)).toEqual(["q001", "q002"]);
    expect(result.analysis.question_analyses.every((question) => question.correctnessJudgement.status === "needs_teacher_review")).toBe(true);
  });

  it("degrades low-confidence definitive correctness judgements under the 99% policy", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000407",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const unsafeJudgement = createValidAnalysis(packet);
    unsafeJudgement.question_analyses[0].correctnessJudgement.status = "incorrect";
    unsafeJudgement.question_analyses[0].correctnessJudgement.source_basis = "insufficient";
    unsafeJudgement.question_analyses[0].correctnessJudgement.confidence = 0.42;
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return unsafeJudgement;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_low_confidence_hard_judgement",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.join(" ")).toContain("confidence below 0.65");
    expect(result.analysis.risk_flags).toContain("model_output_invalid");
  });

  it("degrades model hard judgements that bypass per-question evidence readiness", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000410",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    packet.evidences = packet.evidences.filter((evidence) => evidence.evidence_type !== "answer_key" && !evidence.evidence_type.startsWith("teacher_"));
    keepOnlyExistingGateEvidenceRefs(packet);
    packet.gates = packet.gates.filter((gate) => gate.gate_id !== "answer_key");
    const hardJudgement = createValidAnalysis(packet);
    hardJudgement.question_analyses[0].correctnessJudgement.status = "incorrect";
    hardJudgement.question_analyses[0].correctnessJudgement.source_basis = "mixed";
    hardJudgement.question_analyses[0].correctnessJudgement.confidence = 0.86;
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return hardJudgement;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_readiness_hard_judgement",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.join(" ")).toContain("definitive judgement is not allowed");
    expect(result.validationErrors.join(" ")).toContain("answer_basis_missing");
    expect(result.analysis.risk_flags).toContain("model_output_invalid");
  });

  it("accepts hard judgements when mapped external answer keys satisfy per-question readiness", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000411",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    packet.evidences = packet.evidences.filter((evidence) => evidence.evidence_type !== "answer_key" && evidence.evidence_type !== "rubric" && !evidence.evidence_type.startsWith("teacher_"));
    keepOnlyExistingGateEvidenceRefs(packet);
    packet.gates = [
      ...packet.gates.filter((gate) => gate.gate_id !== "answer_key"),
      {
        gate_id: "answer_key",
        status: "degrade",
        reason: "Vision packet did not include answer key; external side input may satisfy per-question basis.",
        evidenceRefs: [],
        risk_flags: []
      }
    ];
    const hardJudgement = createValidAnalysis(packet);
    hardJudgement.question_analyses[0].correctnessJudgement.status = "incorrect";
    hardJudgement.question_analyses[0].correctnessJudgement.source_basis = "answer_key";
    hardJudgement.question_analyses[0].correctnessJudgement.confidence = 0.86;
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return hardJudgement;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_readiness_external_answer_key",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      answerKeys: [{ question_id: "q001", answer: "external answer basis" }],
      teacherContext,
      model
    });

    expect(result.status).toBe("draft_ready");
    expect(result.validationErrors).toEqual([]);
  });

  it("keeps professional report, monthly snapshot, and model contract in draft-ready output", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000408",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return createValidAnalysis(packet);
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_professional_report_monthly",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("draft_ready");
    expect(result.analysis.material_classification).toEqual(
      expect.objectContaining({
        material_type: "exam",
        subject: "数学",
        education_stage: "middle"
      })
    );
    expect(result.analysis.accuracy_policy).toEqual(
      expect.objectContaining({
        high_confidence_target: ">=99%",
        unsupported_definitive_judgement_allowed: false
      })
    );
    expect(result.analysis.teacher_professional_report.assessment_style).toBe("professional_evaluation");
    expect(result.analysis.monthly_report_snapshot).toEqual(
      expect.objectContaining({
        question_count: 1,
        analyzable_question_count: 1,
        teacher_confirmed: false
      })
    );
    expect(result.analysis.monthly_comparison_seed.parent_readable_comparison).toContain("和上月相比");
    expect(result.analysis.model_contract).toEqual(
      expect.objectContaining({
        input_schema: "VisionEvidencePacket",
        output_schema: "StudentLearningMaterialAnalysis",
        reasoning_model_replaceable: true
      })
    );
  });

  it("keeps profile updates as review drafts before teacher confirmation", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000403",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return createValidAnalysis(packet);
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_profile_draft",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("draft_ready");
    expect(result.analysis.student_profile_update_suggestions).toHaveLength(1);
    expect(result.analysis.student_profile_update_suggestions[0]).toEqual(
      expect.objectContaining({
        teacher_confirmation_required: true,
        status: "draft"
      })
    );
    expect(result.reviewItems.some((item) => item.itemType === "profile_update")).toBe(true);
  });

  it("degrades profile update drafts that cite teacher-review questions", async () => {
    const packet = appendReviewOnlyQuestion(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "00000000-0000-0000-0000-000000000433",
        studentId,
        teacherId: teacherContext.teacherId,
        tenantId: teacherContext.tenantId
      })
    );
    const invalidAnalysis = createValidAnalysis(packet);
    invalidAnalysis.question_analyses.push(createTeacherReviewQuestionAnalysisForPacketQuestion(invalidAnalysis, packet, "q002"));
    invalidAnalysis.student_profile_update_suggestions[0].evidenceRefs = ["synthetic.material_001.q002.stem"];
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return invalidAnalysis;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_profile_draft_teacher_review_question",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.join(" ")).toContain("student_profile_update_suggestions[0] status=draft cannot cite teacher-review question_id=q002");
  });

  it("degrades profile update drafts that use side-input answer keys as profile evidence", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000434",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const invalidAnalysis = createValidAnalysis(packet);
    invalidAnalysis.student_profile_update_suggestions[0].evidenceRefs = ["side_input.answer_key.q001"];
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return invalidAnalysis;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_profile_draft_side_input",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      answerKeys: [{ question_id: "q001", answer: "第一题答案依据。" }],
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.join(" ")).toContain(
      "student_profile_update_suggestions[0].evidenceRefs[0] references side input evidenceRef=side_input.answer_key.q001 outside question_analyses"
    );
  });

  it("blocks unsafe WeChat feedback with forbidden expressions", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000404",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const unsafe = createValidAnalysis(packet);
    unsafe.wechat_parent_feedback_draft.text = "孩子基础很差，需要马上纠正。";
    unsafe.wechat_parent_feedback_draft.sentences = [{ text: "孩子基础很差，需要马上纠正。", evidenceRefs: [packet.evidences[0].evidence_ref] }];
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return unsafe;
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_unsafe_feedback",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.validationErrors.some((error) => error.includes("Forbidden feedback"))).toBe(true);
    expect(result.analysis.wechat_parent_feedback_draft.status).toBe("blocked");
    expect(result.analysis.risk_flags).toContain("wechat_feedback_unsafe");
  });

  it("degrades when the text reasoning model returns an invalid schema", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000405",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return { schema_version: "student_learning_material_analysis.v0.4", analysis_id: "invalid" };
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: "job_invalid_schema",
      materialId: packet.material_id,
      studentId,
      visionEvidencePacket: packet,
      teacherContext,
      model
    });

    expect(result.status).toBe("degraded");
    expect(result.analysis.risk_flags).toContain("model_output_invalid");
    expect(result.analysis.student_profile_update_suggestions).toHaveLength(0);
  });

  it("moves analysis job through running to draft_ready in repository", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000406",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const job: AnalysisJob = {
      id: "job_success",
      materialId: packet.material_id,
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId,
      status: "queued"
    };
    const repository = new MemoryLearningMaterialAnalyzerRepository({ jobs: [job], packets: [packet] });
    const model: LearningMaterialAnalysisModel = {
      async generateAnalysis() {
        return createValidAnalysis(packet);
      }
    };

    const result = await runAnalyzeLearningEvidence({
      analysisJobId: job.id,
      materialId: packet.material_id,
      studentId,
      teacherContext,
      repository,
      model
    });

    expect(result.status).toBe("draft_ready");
    expect(repository.jobStatusEvents.map((event) => event.status)).toEqual(["running", "draft_ready"]);
    expect(repository.jobs.get(job.id)?.status).toBe("draft_ready");
    expect(repository.analyses.size).toBe(1);
    expect(repository.reviewItems.size).toBeGreaterThan(0);
  });

  it("parses provider-agnostic model JSON and annotates runtime provider metadata", async () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000409",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const analysis = createValidAnalysis(packet);
    delete analysis.model_contract.provider_name;
    delete analysis.model_contract.model_name;
    analysis.audit.runtime_model = "";
    const model = createLearningMaterialAnalysisModel({
      config: {
        provider: "openai-compatible",
        baseUrl: "https://example.invalid/v1",
        apiKey: "test-key",
        model: "xuemai-compatible-reasoner",
        capabilities: {
          jsonObjectResponseFormat: true,
          strictStructuredOutputs: false,
          toolCalling: false
        }
      },
      completionCaller: async (request) => {
        expect(request.model).toBeUndefined();
        expect(request.config?.provider).toBe("openai-compatible");
        expect(request.messages.at(0)?.role).toBe("system");
        return {
          choices: [
            {
              message: {
                content: JSON.stringify(analysis)
              }
            }
          ]
        };
      }
    });

    const output = await model.generateAnalysis({
      packet,
      prompt: "Return StudentLearningMaterialAnalysis JSON"
    });

    expect(output).toEqual(
      expect.objectContaining({
        schema_version: "student_learning_material_analysis.v0.4"
      })
    );
    const parsedOutput = output as StudentLearningMaterialAnalysis;
    expect(parsedOutput.model_contract).toEqual(
      expect.objectContaining({
        input_schema: "VisionEvidencePacket",
        output_schema: "StudentLearningMaterialAnalysis",
        reasoning_model_replaceable: true,
        provider_name: "openai-compatible",
        model_name: "xuemai-compatible-reasoner"
      })
    );
    expect(parsedOutput.audit.runtime_model).toBe("xuemai-compatible-reasoner");
  });

  it("fails fast when provider output is not strict JSON", () => {
    expect(() => parseStudentLearningMaterialAnalysisJson("```json\n{}\n```")).toThrow("StudentLearningMaterialAnalysis JSON parse failed");
  });
});

function createValidAnalysis(packet: VisionEvidencePacket): StudentLearningMaterialAnalysis {
  const evidenceRef = packet.evidences[0].evidence_ref;
  return {
    schema_version: "student_learning_material_analysis.v0.4",
    analysis_id: `analysis_${packet.material_id}`,
    source_material_id: packet.source_material_id,
    student_id: packet.student_id,
    material_state: packet.material_state,
    material_classification: {
      material_type: "exam",
      subject: "数学",
      education_stage: "middle",
      grade_candidate: "初二",
      region_or_curriculum_candidate: "未识别",
      classification_confidence: 0.86,
      evidenceRefs: [evidenceRef]
    },
    gates: packet.gates,
    accuracy_policy: {
      high_confidence_target: ">=99%",
      auto_judgement_rule: "证据齐全且置信度达标时才允许确定性判断。",
      refusal_rule: "证据不足时进入老师确认，不能硬判。",
      unsupported_definitive_judgement_allowed: false
    },
    evidence_summary: {
      usableEvidenceRefs: packet.evidences.map((evidence) => evidence.evidence_ref),
      missing_context: [],
      reliability_notes: ["mock model output for tests"]
    },
    question_analyses: [
      {
        question_id: "q001",
        question_number: "1",
        material_refs: [evidenceRef],
        correctnessJudgement: {
          status: "partially_correct",
          source_basis: "mixed",
          explanation: "学生能列出主体关系，但遗漏条件范围。",
          evidenceRefs: [evidenceRef],
          confidence: 0.84
        },
        knowledgeMapping: [
          {
            knowledge_point_label: "一次函数应用",
            mapping_reason: "题干和学生作答均指向一次函数关系建模。",
            evidenceRefs: [evidenceRef],
            confidence: 0.82
          }
        ],
        mistakeDiagnosis: [
          {
            diagnosis_type: "condition_extraction_error",
            explanation: "遗漏取值范围，属于条件提取不完整。",
            evidenceRefs: [evidenceRef],
            confidence: 0.8
          }
        ],
        nextActions: [
          {
            action_type: "targeted_practice",
            title: "训练条件标注",
            detail: "先圈取值范围，再列关系式。",
            priority: "high",
            verification_method: "同类题能写出条件范围。",
            evidenceRefs: [evidenceRef]
          }
        ],
        confidence: 0.82,
        evidenceRefs: [evidenceRef]
      }
    ],
    student_profile_update_suggestions: [
      {
        suggestion_type: "weakness_event",
        content: "一次函数应用题中条件范围提取不稳定。",
        evidenceRefs: [evidenceRef],
        confidence: 0.8,
        teacher_confirmation_required: true,
        status: "draft"
      }
    ],
    next_learning_actions: [
      {
        action_type: "next_lesson_focus",
        title: "下次课先练条件提取",
        detail: "用 3 道同类题训练取值范围标注。",
        priority: "high",
        verification_method: "学生能独立标出关键条件。",
        evidenceRefs: [evidenceRef]
      }
    ],
    teacher_professional_report: {
      report_title: "王一路数学试卷专业测评型学情报告",
      assessment_style: "professional_evaluation",
      material_overview: "本次材料为初中数学试卷，包含学生作答和老师批改。",
      overall_conclusion: "学生能抓住一次函数应用题主关系，但条件范围提取不稳定。",
      score_or_completion_summary: "老师批改显示存在可追回分点，需结合完整卷面确认总分。",
      question_table_summary: "第 1 题部分正确，主要问题为漏取值范围。",
      knowledge_mastery_summary: "一次函数应用有基础，条件约束表达需加强。",
      ability_dimension_summary: "审题信息提取和自我检查是下次优先观察维度。",
      error_pattern_summary: "复杂应用题中容易遗漏限制条件。",
      priority_focus: "先训练条件标注，再训练答案回看。",
      consolidation_suggestions: ["用 3 道同类题训练取值范围标注。"],
      teacher_review_boundary: "本报告仍为 AI 草稿，老师确认后才可入档。",
      evidenceRefs: [evidenceRef]
    },
    wechat_parent_feedback_draft: {
      status: "draft",
      text: "这次能抓住主要关系式，后续重点练习条件范围的提取和表达完整性。",
      sentences: [
        {
          text: "这次能抓住主要关系式，后续重点练习条件范围的提取和表达完整性。",
          evidenceRefs: [evidenceRef]
        }
      ],
      warnings: [],
      forbidden_terms_found: []
    },
    monthly_report_snapshot: {
      source_analysis_id: `analysis_${packet.material_id}`,
      student_id: packet.student_id,
      month: "2026-06",
      subject: "数学",
      material_type: "exam",
      material_date: "2026-06-15",
      score_summary: "本次可见一处条件范围扣分点。",
      question_count: 1,
      analyzable_question_count: 1,
      knowledge_points: ["一次函数应用"],
      ability_dimensions: ["审题信息提取", "步骤表达"],
      error_patterns: ["条件范围遗漏"],
      main_progress_signal: "能抓住主要关系式。",
      main_issue_signal: "条件范围提取不稳定。",
      first_priority_action: "训练条件标注。",
      parent_visible_summary: "本次能抓住主要关系式，后续重点练条件范围表达。",
      teacher_only_notes: ["只使用老师确认后的快照进入月报正式素材。"],
      confidence: 0.82,
      evidenceRefs: [evidenceRef],
      teacher_confirmed: false
    },
    monthly_comparison_seed: {
      previous_month_snapshot: {
        month: "2026-05",
        main_issue_signal: "读题条件整理不稳定。",
        first_priority_action: "训练题干标注。",
        confidence: 0.78,
        evidenceRefs: ["synthetic.previous_month.2026-05.report_001"]
      },
      current_month_snapshot: {
        month: "2026-06",
        main_progress_signal: "能抓住主要关系式。",
        main_issue_signal: "条件范围提取不稳定。",
        first_priority_action: "训练条件标注。",
        confidence: 0.82
      },
      trend_by_knowledge_point: [
        {
          knowledge_point: "一次函数应用",
          trend: "stable",
          evidenceRefs: [evidenceRef]
        }
      ],
      trend_by_ability_dimension: [
        {
          dimension: "审题信息提取",
          trend: "watch",
          evidenceRefs: [evidenceRef]
        }
      ],
      trend_by_error_pattern: [
        {
          pattern: "条件范围遗漏",
          trend: "repeated",
          evidenceRefs: [evidenceRef]
        }
      ],
      new_issues: [],
      improved_issues: ["主要关系式识别更稳定"],
      repeated_issues: ["条件范围遗漏"],
      confidence_change: "本月证据可与上月谨慎比较。",
      teacher_interpretation: "本月可强调基础关系识别稳定，同时继续跟进条件表达。",
      parent_readable_comparison: "和上月相比，孩子在主要关系式识别上更稳定，但条件范围表达仍需继续练习。",
      evidenceRefs: [evidenceRef, "synthetic.previous_month.2026-05.report_001"]
    },
    model_contract: {
      input_schema: "VisionEvidencePacket",
      output_schema: "StudentLearningMaterialAnalysis",
      vision_provider_replaceable: true,
      reasoning_model_replaceable: true,
      strict_json_schema_preferred: true,
      provider_name: "mock",
      model_name: "mock-reasoner"
    },
    teacher_review_required: true,
    risk_flags: [],
    audit: {
      runtime_model: "deepseek-v4-pro",
      vision_plugin_run_id: packet.plugin_run_id,
      created_at: "2026-06-15T00:00:00+08:00",
      error_sources: []
    }
  };
}

function createTeacherReviewQuestionAnalysisForPacketQuestion(
  analysis: StudentLearningMaterialAnalysis,
  packet: VisionEvidencePacket,
  questionId: string
): StudentLearningMaterialAnalysis["question_analyses"][number] {
  const row = JSON.parse(JSON.stringify(analysis.question_analyses[0])) as StudentLearningMaterialAnalysis["question_analyses"][number];
  const evidenceRef = packet.evidences.find((evidence) => evidence.question_id === questionId)?.evidence_ref ?? packet.evidences[0].evidence_ref;
  row.question_id = questionId;
  row.question_number = packet.questions.find((question) => question.question_id === questionId)?.question_number;
  row.material_refs = [evidenceRef];
  row.correctnessJudgement = {
    ...row.correctnessJudgement,
    status: "needs_teacher_review",
    source_basis: "insufficient",
    explanation: "题目证据不足，需老师复核。",
    evidenceRefs: [evidenceRef],
    confidence: 0.3
  };
  row.knowledgeMapping = [];
  row.mistakeDiagnosis = row.mistakeDiagnosis.map((item) => ({
    ...item,
    evidenceRefs: [evidenceRef],
    confidence: 0.3
  }));
  row.nextActions = row.nextActions.map((item) => ({
    ...item,
    action_type: "teacher_review",
    evidenceRefs: [evidenceRef]
  }));
  row.confidence = 0.3;
  row.evidenceRefs = [evidenceRef];
  return row;
}

function appendReviewOnlyQuestion(packet: VisionEvidencePacket): VisionEvidencePacket {
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
    evidence_id: "ev_q002_stem_001",
    evidence_ref: "synthetic.material_001.q002.stem",
    source_material_id: clone.material_id,
    page_id: "p01",
    question_id: "q002",
    region_id: "reg_p01_q002",
    evidence_type: "question_stem",
    text: "第 2 题题干可见，但缺少学生答案或答案依据。",
    raw_ocr_text: "第 2 题题干可见，但缺少学生答案或答案依据。",
    normalized_text: "第 2 题题干可见，但缺少学生答案或答案依据。",
    bbox: { x1: 0.12, y1: 0.56, x2: 0.82, y2: 0.68, coord_space: "normalized" },
    crop_ref: `crop://${clone.material_id}/p01/q002/stem`,
    confidence: 0.86,
    teacher_verified: false,
    risk_flags: []
  });
  return clone;
}

function keepOnlyExistingGateEvidenceRefs(packet: VisionEvidencePacket) {
  const evidenceRefs = new Set(packet.evidences.map((evidence) => evidence.evidence_ref));
  packet.gates = packet.gates.map((gate) => ({
    ...gate,
    evidenceRefs: gate.evidenceRefs.filter((evidenceRef) => evidenceRefs.has(evidenceRef))
  }));
}
