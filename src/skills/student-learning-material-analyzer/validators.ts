import type {
  StudentLearningMaterialAnalysis,
  ValidationResult,
  VisionEvidencePacket,
  WeChatParentFeedbackDraft
} from "./types";

const forbiddenFeedbackTerms = ["严重", "很差", "完全不会", "保证提分", "不认真", "基础很差", "一定能提高", "一定提升", "孩子不行", "家长必须"];

export function validateVisionEvidencePacket(packet: VisionEvidencePacket): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const pages = Array.isArray(packet.pages) ? packet.pages : [];
  const questions = Array.isArray(packet.questions) ? packet.questions : [];
  const evidences = Array.isArray(packet.evidences) ? packet.evidences : [];
  const gates = Array.isArray(packet.gates) ? packet.gates : [];

  if (packet.schema_version !== "vision_evidence_packet.v0.4") {
    errors.push("schema_version must be vision_evidence_packet.v0.4");
  }

  for (const [field, value] of Object.entries({
    plugin_run_id: packet.plugin_run_id,
    material_id: packet.material_id,
    source_material_id: packet.source_material_id,
    student_id: packet.student_id,
    plugin_provider: packet.plugin_provider,
    plugin_model_version: packet.plugin_model_version,
    material_state: packet.material_state,
    created_at: packet.created_at
  })) {
    if (!value) errors.push(`Missing root field: ${field}`);
  }

  if (!Array.isArray(packet.pages)) errors.push("pages must be an array");
  if (!Array.isArray(packet.questions)) errors.push("questions must be an array");
  if (!Array.isArray(packet.evidences)) errors.push("evidences must be an array");
  if (!Array.isArray(packet.gates)) errors.push("gates must be an array");
  if (!pages.length) errors.push("pages must not be empty");
  if (!gates.length) errors.push("gates must not be empty");

  const pageIds = new Set<string>();
  const questionIds = new Set<string>();
  const regionIds = new Set<string>();
  const regionQuestionIds = new Map<string, string>();
  const regionPageIds = new Map<string, string>();
  const evidenceIds = new Set<string>();
  const evidenceRefs = new Set<string>();

  pages.forEach((page, index) => {
    if (!page.page_id) {
      errors.push(`pages[${index}] missing page_id`);
      return;
    }
    if (pageIds.has(page.page_id)) errors.push(`pages duplicate page_id=${page.page_id}`);
    pageIds.add(page.page_id);
  });

  questions.forEach((question, index) => {
    if (!question.question_id) errors.push(`questions[${index}] missing question_id`);
    if (question.question_id) {
      if (questionIds.has(question.question_id)) errors.push(`questions duplicate question_id=${question.question_id}`);
      questionIds.add(question.question_id);
    }
    if (question.page_id && !pageIds.has(question.page_id)) errors.push(`questions[${index}].page_id=${question.page_id} missing from pages`);
    if (!question.regions.length) warnings.push(`questions[${index}] has no regions`);
    for (const region of question.regions) {
      if (!region.region_id) errors.push(`questions[${index}].regions missing region_id`);
      if (region.region_id) {
        if (regionIds.has(region.region_id)) errors.push(`questions duplicate region_id=${region.region_id}`);
        regionIds.add(region.region_id);
        if (question.question_id) regionQuestionIds.set(region.region_id, question.question_id);
        if (region.page_id) regionPageIds.set(region.region_id, region.page_id);
      }
      if (!region.page_id) errors.push(`questions[${index}].regions missing page_id`);
      if (region.page_id && !pageIds.has(region.page_id)) errors.push(`questions[${index}].regions page_id=${region.page_id} missing from pages`);
      if (!hasVisualGeometry(region) && !region.crop_ref) errors.push(`questions[${index}].regions missing bbox/polygon/crop_ref`);
      if (!region.crop_ref) warnings.push(`questions[${index}].regions missing crop_ref; downstream conclusions must route to teacher review`);
    }
  });

  evidences.forEach((evidence, index) => {
    const prefix = `evidences[${index}]`;
    if (!evidence.evidence_id) errors.push(`${prefix} missing evidence_id`);
    if (evidence.evidence_id) {
      if (evidenceIds.has(evidence.evidence_id)) errors.push(`evidences duplicate evidence_id=${evidence.evidence_id}`);
      evidenceIds.add(evidence.evidence_id);
    }
    if (!evidence.page_id) errors.push(`${prefix} missing page_id`);
    if (evidence.page_id && !pageIds.has(evidence.page_id)) errors.push(`${prefix} page_id=${evidence.page_id} missing from pages`);
    if (!evidence.question_id) errors.push(`${prefix} missing question_id`);
    if (evidence.question_id && !questionIds.has(evidence.question_id)) errors.push(`${prefix} question_id=${evidence.question_id} missing from questions`);
    if (evidence.region_id && !regionIds.has(evidence.region_id)) {
      errors.push(`${prefix} region_id=${evidence.region_id} missing from question regions`);
    } else if (evidence.region_id) {
      const regionQuestionId = regionQuestionIds.get(evidence.region_id);
      if (evidence.question_id && regionQuestionId && regionQuestionId !== evidence.question_id) {
        errors.push(`${prefix} region_id=${evidence.region_id} belongs to question_id=${regionQuestionId}, not evidence.question_id=${evidence.question_id}`);
      }
      const regionPageId = regionPageIds.get(evidence.region_id);
      if (evidence.page_id && regionPageId && regionPageId !== evidence.page_id) {
        errors.push(`${prefix} region_id=${evidence.region_id} belongs to page_id=${regionPageId}, not evidence.page_id=${evidence.page_id}`);
      }
    }
    if (!evidence.evidence_type) errors.push(`${prefix} missing evidence_type`);
    if (!evidence.evidence_ref) errors.push(`${prefix} missing evidence_ref`);
    if (evidence.evidence_ref) {
      if (evidenceRefs.has(evidence.evidence_ref)) errors.push(`evidences duplicate evidence_ref=${evidence.evidence_ref}`);
      evidenceRefs.add(evidence.evidence_ref);
    }
    if (!hasVisualGeometry(evidence) && !evidence.crop_ref) errors.push(`${prefix} missing bbox/polygon/crop_ref`);
    if (!evidence.crop_ref) warnings.push(`${prefix} missing crop_ref; downstream conclusions must route to teacher review`);
    if (typeof evidence.confidence !== "number") errors.push(`${prefix} missing confidence`);
    if (typeof evidence.confidence === "number" && evidence.confidence < 0.65) {
      warnings.push(`${prefix} confidence below 0.65; downstream conclusions must degrade`);
    }
  });

  gates.forEach((gate, index) => {
    const prefix = `gates[${index}]`;
    if (!gate.gate_id) errors.push(`${prefix}.gate_id is required`);
    if (!isValidGateStatus(gate.status)) errors.push(`${prefix}.status must be pass, degrade, block, or needs_teacher_review`);
    if (!Array.isArray(gate.evidenceRefs)) {
      errors.push(`${prefix}.evidenceRefs must be an array`);
    } else {
      gate.evidenceRefs.forEach((evidenceRef, refIndex) => {
        if (!evidenceRefs.has(evidenceRef)) errors.push(`${prefix}.evidenceRefs[${refIndex}]=${evidenceRef} missing from evidences`);
      });
    }
    if (gate.risk_flags && !Array.isArray(gate.risk_flags)) errors.push(`${prefix}.risk_flags must be an array when present`);
  });

  if (packet.pipeline_trace) {
    if (!packet.pipeline_trace.selected_provider) errors.push("pipeline_trace.selected_provider is required when pipeline_trace is present");
    if (packet.pipeline_trace.selected_provider && packet.pipeline_trace.selected_provider !== packet.plugin_provider) {
      errors.push("pipeline_trace.selected_provider must match plugin_provider");
    }
    if (packet.pipeline_trace.provider_candidates) {
      if (!Array.isArray(packet.pipeline_trace.provider_candidates) || !packet.pipeline_trace.provider_candidates.length) {
        errors.push("pipeline_trace.provider_candidates must not be empty when present");
      } else {
        const primaryCandidates = packet.pipeline_trace.provider_candidates.filter((candidate) => candidate.fit === "primary_candidate");
        if (!primaryCandidates.some((candidate) => candidate.name === packet.pipeline_trace?.selected_provider)) {
          errors.push("pipeline_trace.provider_candidates must include selected_provider as primary_candidate");
        }
        packet.pipeline_trace.provider_candidates.forEach((candidate, index) => {
          const prefix = `pipeline_trace.provider_candidates[${index}]`;
          if (!candidate.name) errors.push(`${prefix}.name is required`);
          if (!candidate.role) errors.push(`${prefix}.role is required`);
          if (!candidate.fit) errors.push(`${prefix}.fit is required`);
          if (!candidate.evidence_source_url) warnings.push(`${prefix}.evidence_source_url should be recorded before provider benchmarking`);
          if (!candidate.license_note) warnings.push(`${prefix}.license_note should be recorded before provider benchmarking`);
        });
      }
    }
    if (!Array.isArray(packet.pipeline_trace.stages) || !packet.pipeline_trace.stages.length) {
      errors.push("pipeline_trace.stages must not be empty when pipeline_trace is present");
    } else {
      packet.pipeline_trace.stages.forEach((stage, index) => {
        const prefix = `pipeline_trace.stages[${index}]`;
        if (!stage.stage_id) errors.push(`${prefix}.stage_id is required`);
        if (!stage.provider) errors.push(`${prefix}.provider is required`);
        if (!stage.status) errors.push(`${prefix}.status is required`);
        if (typeof stage.confidence !== "number") errors.push(`${prefix}.confidence is required`);
        if (!Array.isArray(stage.output_refs)) {
          errors.push(`${prefix}.output_refs must be an array`);
        } else {
          const traceOutputRefs = new Set([...pageIds, ...questionIds, ...regionIds, ...evidenceRefs]);
          stage.output_refs.forEach((outputRef, refIndex) => {
            if (!traceOutputRefs.has(outputRef)) errors.push(`${prefix}.output_refs[${refIndex}]=${outputRef} missing from packet pages/questions/regions/evidences`);
          });
        }
        if (!Array.isArray(stage.risk_flags)) errors.push(`${prefix}.risk_flags must be an array`);
      });
    }
    if (!packet.pipeline_trace.question_segmentation_policy?.definitive_question_requires_crop_ref) {
      errors.push("pipeline_trace.question_segmentation_policy.definitive_question_requires_crop_ref must be true");
    }
    if (!packet.pipeline_trace.question_segmentation_policy?.uncertain_boundary_routes_to_review) {
      errors.push("pipeline_trace.question_segmentation_policy.uncertain_boundary_routes_to_review must be true");
    }
    if (!packet.pipeline_trace.question_segmentation_policy?.question_id_namespace) {
      errors.push("pipeline_trace.question_segmentation_policy.question_id_namespace is required");
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateStudentLearningMaterialAnalysis(analysis: StudentLearningMaterialAnalysis): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (analysis.schema_version !== "student_learning_material_analysis.v0.4") {
    errors.push("schema_version must be student_learning_material_analysis.v0.4");
  }

  for (const [field, value] of Object.entries({
    analysis_id: analysis.analysis_id,
    source_material_id: analysis.source_material_id,
    student_id: analysis.student_id,
    material_state: analysis.material_state
  })) {
    if (!value) errors.push(`Missing root field: ${field}`);
  }

  if (!analysis.material_classification) {
    errors.push("material_classification is required");
  } else {
    if (!analysis.material_classification.material_type) errors.push("material_classification.material_type is required");
    if (!analysis.material_classification.subject) errors.push("material_classification.subject is required");
    if (!hasEvidenceRefs(analysis.material_classification)) errors.push("material_classification missing evidenceRefs");
  }

  if (!analysis.accuracy_policy) {
    errors.push("accuracy_policy is required");
  } else if (analysis.accuracy_policy.unsupported_definitive_judgement_allowed !== false) {
    errors.push("accuracy_policy.unsupported_definitive_judgement_allowed must be false");
  }

  const questionAnalyses = Array.isArray(analysis.question_analyses) ? analysis.question_analyses : [];
  if (!Array.isArray(analysis.question_analyses)) errors.push("question_analyses must be an array");

  questionAnalyses.forEach((question, index) => {
    const prefix = `question_analyses[${index}]`;
    if (!question.question_id) errors.push(`${prefix} missing question_id`);
    if (!hasEvidenceRefs(question)) errors.push(`${prefix} missing evidenceRefs`);
    if (!hasEvidenceRefs(question.correctnessJudgement)) errors.push(`${prefix}.correctnessJudgement missing evidenceRefs`);
    if (isDefinitiveJudgement(question.correctnessJudgement.status) && question.correctnessJudgement.source_basis === "insufficient") {
      errors.push(`${prefix}.correctnessJudgement cannot be definitive when source_basis is insufficient`);
    }
    if (isDefinitiveJudgement(question.correctnessJudgement.status) && question.correctnessJudgement.confidence < 0.65) {
      errors.push(`${prefix}.correctnessJudgement confidence below 0.65 must be needs_teacher_review or unknown`);
    }
    question.knowledgeMapping.forEach((item, itemIndex) => {
      if (!hasEvidenceRefs(item)) errors.push(`${prefix}.knowledgeMapping[${itemIndex}] missing evidenceRefs`);
    });
    question.mistakeDiagnosis.forEach((item, itemIndex) => {
      if (!hasEvidenceRefs(item)) errors.push(`${prefix}.mistakeDiagnosis[${itemIndex}] missing evidenceRefs`);
    });
    question.nextActions.forEach((item, itemIndex) => {
      if (!hasEvidenceRefs(item)) errors.push(`${prefix}.nextActions[${itemIndex}] missing evidenceRefs`);
    });
  });

  const profileSuggestions = Array.isArray(analysis.student_profile_update_suggestions) ? analysis.student_profile_update_suggestions : [];
  if (!Array.isArray(analysis.student_profile_update_suggestions)) errors.push("student_profile_update_suggestions must be an array");

  profileSuggestions.forEach((item, index) => {
    if (!hasEvidenceRefs(item)) errors.push(`student_profile_update_suggestions[${index}] missing evidenceRefs`);
    if (item.teacher_confirmation_required !== true) {
      errors.push(`student_profile_update_suggestions[${index}] must require teacher confirmation`);
    }
    if (item.status === "confirmed") {
      errors.push(`student_profile_update_suggestions[${index}] cannot be confirmed by AI runner`);
    }
  });

  const nextLearningActions = Array.isArray(analysis.next_learning_actions) ? analysis.next_learning_actions : [];
  if (!Array.isArray(analysis.next_learning_actions)) errors.push("next_learning_actions must be an array");

  nextLearningActions.forEach((item, index) => {
    if (!hasEvidenceRefs(item)) errors.push(`next_learning_actions[${index}] missing evidenceRefs`);
  });

  if (!analysis.teacher_professional_report) {
    errors.push("teacher_professional_report is required");
  } else {
    if (analysis.teacher_professional_report.assessment_style !== "professional_evaluation") {
      errors.push("teacher_professional_report.assessment_style must be professional_evaluation");
    }
    if (!hasEvidenceRefs(analysis.teacher_professional_report)) errors.push("teacher_professional_report missing evidenceRefs");
  }

  if (analysis.wechat_parent_feedback_draft) {
    const feedbackSafety = checkWechatFeedbackSafety(analysis.wechat_parent_feedback_draft);
    errors.push(...feedbackSafety.errors);
    warnings.push(...feedbackSafety.warnings);
  } else {
    errors.push("wechat_parent_feedback_draft is required");
  }

  if (!analysis.monthly_report_snapshot) {
    errors.push("monthly_report_snapshot is required");
  } else {
    if (analysis.monthly_report_snapshot.teacher_confirmed !== false) {
      errors.push("monthly_report_snapshot.teacher_confirmed must be false before teacher confirmation");
    }
    if (!hasEvidenceRefs(analysis.monthly_report_snapshot)) errors.push("monthly_report_snapshot missing evidenceRefs");
  }

  if (!analysis.monthly_comparison_seed) {
    errors.push("monthly_comparison_seed is required");
  } else {
    if (!analysis.monthly_comparison_seed.current_month_snapshot) {
      errors.push("monthly_comparison_seed.current_month_snapshot is required");
    }
    if (!hasEvidenceRefs(analysis.monthly_comparison_seed)) errors.push("monthly_comparison_seed missing evidenceRefs");
    if (analysis.monthly_comparison_seed.previous_month_snapshot && !hasEvidenceRefs(analysis.monthly_comparison_seed.previous_month_snapshot)) {
      errors.push("monthly_comparison_seed.previous_month_snapshot missing evidenceRefs");
    }
  }

  if (!analysis.model_contract) {
    errors.push("model_contract is required");
  } else {
    if (analysis.model_contract.input_schema !== "VisionEvidencePacket") errors.push("model_contract.input_schema must be VisionEvidencePacket");
    if (analysis.model_contract.output_schema !== "StudentLearningMaterialAnalysis") errors.push("model_contract.output_schema must be StudentLearningMaterialAnalysis");
    if (analysis.model_contract.reasoning_model_replaceable !== true) errors.push("model_contract.reasoning_model_replaceable must be true");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateStudentLearningMaterialAnalysisEvidenceRefsAgainstPacket(
  analysis: StudentLearningMaterialAnalysis,
  packet: VisionEvidencePacket,
  options: { allowedExternalEvidenceRefs?: string[]; allowedExternalEvidenceRefsByQuestionId?: Map<string, string[]> } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const packetEvidenceRefs = new Set((Array.isArray(packet.evidences) ? packet.evidences : []).map((evidence) => evidence.evidence_ref).filter(Boolean));
  const packetEvidenceQuestionIds = new Map((Array.isArray(packet.evidences) ? packet.evidences : []).map((evidence) => [evidence.evidence_ref, evidence.question_id]));
  const allowedExternalEvidenceRefs = new Set(options.allowedExternalEvidenceRefs ?? []);
  const allowedExternalEvidenceRefsByQuestionId = normalizeAllowedExternalRefsByQuestionId(options.allowedExternalEvidenceRefsByQuestionId);
  const previousMonthEvidenceRefs = new Set(analysis.monthly_comparison_seed?.previous_month_snapshot?.evidenceRefs ?? []);

  for (const item of collectAnalysisEvidenceRefs(analysis)) {
    item.refs.forEach((ref, index) => {
      const path = `${item.path}[${index}]`;
      const scopedQuestionId = getQuestionAnalysisIdForPath(analysis, item.path);
      if (packetEvidenceRefs.has(ref)) {
        const evidenceQuestionId = packetEvidenceQuestionIds.get(ref);
        if (scopedQuestionId && evidenceQuestionId && evidenceQuestionId !== scopedQuestionId) {
          errors.push(`${path} references evidenceRef=${ref} from different question_id=${evidenceQuestionId}`);
        }
        return;
      }
      if (allowedExternalEvidenceRefs.has(ref)) {
        const allowedForQuestion = scopedQuestionId ? allowedExternalEvidenceRefsByQuestionId.get(scopedQuestionId) : undefined;
        if (!scopedQuestionId) {
          errors.push(`${path} references side input evidenceRef=${ref} outside question_analyses`);
          return;
        }
        if (scopedQuestionId && options.allowedExternalEvidenceRefsByQuestionId && !allowedForQuestion?.has(ref)) {
          errors.push(`${path} references side input evidenceRef=${ref} not mapped to question_id=${scopedQuestionId}`);
        }
        return;
      }
      if (previousMonthEvidenceRefs.has(ref) && item.path.startsWith("monthly_comparison_seed.")) return;
      errors.push(`${path} references unknown evidenceRef=${ref}`);
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

const profileSuggestionTypesRequiringDefinitiveQuestion = new Set([
  "weakness_event",
  "ability_snapshot",
  "recurrence_risk",
  "action_plan",
  "monthly_report_source"
]);

export function validateStudentLearningMaterialAnalysisProfileUpdateSuggestionsAgainstPacket(
  analysis: StudentLearningMaterialAnalysis,
  packet: VisionEvidencePacket
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const evidenceQuestionIds = new Map((Array.isArray(packet.evidences) ? packet.evidences : []).map((evidence) => [evidence.evidence_ref, evidence.question_id]));
  const definitiveQuestionIds = new Set(
    safeArray(analysis.question_analyses)
      .filter((question) => isDefinitiveJudgement(question.correctnessJudgement?.status))
      .map((question) => question.question_id)
      .filter(Boolean)
  );

  safeArray(analysis.student_profile_update_suggestions).forEach((suggestion, index) => {
    if (suggestion.status !== "draft") return;

    const packetQuestionIds = new Set(
      safeArray(suggestion.evidenceRefs)
        .map((ref) => evidenceQuestionIds.get(ref))
        .filter((questionId): questionId is string => Boolean(questionId))
    );
    const definitivePacketQuestionIds = [...packetQuestionIds].filter((questionId) => definitiveQuestionIds.has(questionId));
    const reviewQuestionIds = [...packetQuestionIds].filter((questionId) => !definitiveQuestionIds.has(questionId));

    reviewQuestionIds.forEach((questionId) => {
      errors.push(`student_profile_update_suggestions[${index}] status=draft cannot cite teacher-review question_id=${questionId}`);
    });

    if (profileSuggestionTypesRequiringDefinitiveQuestion.has(suggestion.suggestion_type) && definitivePacketQuestionIds.length === 0) {
      errors.push(`student_profile_update_suggestions[${index}] status=draft requires at least one definitive same-packet question evidenceRef`);
    }
  });

  return { ok: errors.length === 0, errors, warnings };
}

const processEvidenceTypes = new Set(["student_process", "student_note"]);
const processEvidenceRequiredMistakeTypes = new Set(["knowledge_gap", "process_omission", "review_or_checking_gap"]);
const processEvidenceRequiredTextPattern = /粗心|不认真|概念混淆|概念不清|方法不熟|方法错误|思路混乱|没有检查|检查不足|检查习惯/;

export function validateStudentLearningMaterialAnalysisMistakeDiagnosisEvidenceAgainstPacket(
  analysis: StudentLearningMaterialAnalysis,
  packet: VisionEvidencePacket
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const processEvidenceRefsByQuestionId = new Map<string, Set<string>>();

  packet.evidences.forEach((evidence) => {
    if (!processEvidenceTypes.has(evidence.evidence_type)) return;
    const refs = processEvidenceRefsByQuestionId.get(evidence.question_id) ?? new Set<string>();
    refs.add(evidence.evidence_ref);
    processEvidenceRefsByQuestionId.set(evidence.question_id, refs);
  });

  safeArray(analysis.question_analyses).forEach((question, questionIndex) => {
    const processEvidenceRefs = processEvidenceRefsByQuestionId.get(question.question_id) ?? new Set<string>();
    safeArray(question.mistakeDiagnosis).forEach((diagnosis, diagnosisIndex) => {
      if (!mistakeDiagnosisRequiresProcessEvidence(diagnosis)) return;
      const diagnosisEvidenceRefs = Array.isArray(diagnosis.evidenceRefs) ? diagnosis.evidenceRefs : [];
      const hasSameQuestionProcessEvidence = diagnosisEvidenceRefs.some((ref) => processEvidenceRefs.has(ref));
      if (!hasSameQuestionProcessEvidence) {
        errors.push(
          `question_analyses[${questionIndex}].mistakeDiagnosis[${diagnosisIndex}] diagnosis_type=${diagnosis.diagnosis_type} requires same-question student_process or student_note evidenceRefs for question_id=${question.question_id}`
        );
      }
    });
  });

  return { ok: errors.length === 0, errors, warnings };
}

function mistakeDiagnosisRequiresProcessEvidence(diagnosis: StudentLearningMaterialAnalysis["question_analyses"][number]["mistakeDiagnosis"][number]) {
  if (processEvidenceRequiredMistakeTypes.has(diagnosis.diagnosis_type)) return true;
  return processEvidenceRequiredTextPattern.test([diagnosis.explanation, diagnosis.suggested_verification].filter(Boolean).join(" "));
}

function normalizeAllowedExternalRefsByQuestionId(value: Map<string, string[]> | undefined) {
  const normalized = new Map<string, Set<string>>();
  value?.forEach((refs, questionId) => {
    normalized.set(questionId, new Set(refs));
  });
  return normalized;
}

function getQuestionAnalysisIdForPath(analysis: StudentLearningMaterialAnalysis, path: string) {
  const match = /^question_analyses\[(\d+)\]/.exec(path);
  if (!match) return undefined;
  const index = Number(match[1]);
  if (!Number.isInteger(index)) return undefined;
  return analysis.question_analyses[index]?.question_id;
}

export function validateStudentLearningMaterialAnalysisQuestionCoverageAgainstPacket(
  analysis: StudentLearningMaterialAnalysis,
  packet: VisionEvidencePacket
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const expectedQuestionIds = Array.isArray(packet.questions) ? packet.questions.map((question) => question.question_id).filter(Boolean) : [];
  const actualQuestions = Array.isArray(analysis.question_analyses) ? analysis.question_analyses : [];
  const actualQuestionIds = actualQuestions.map((question) => question.question_id).filter(Boolean);
  const expectedQuestionIdSet = new Set(expectedQuestionIds);
  const actualQuestionIdSet = new Set(actualQuestionIds);
  const duplicateActualQuestionIds = findDuplicates(actualQuestionIds);

  duplicateActualQuestionIds.forEach((questionId) => {
    errors.push(`question_analyses duplicate question_id=${questionId}`);
  });

  expectedQuestionIds.forEach((questionId) => {
    if (!actualQuestionIdSet.has(questionId)) {
      errors.push(`question_analyses missing VisionEvidencePacket question_id=${questionId}`);
    }
  });

  actualQuestions.forEach((question, index) => {
    if (question.question_id && !expectedQuestionIdSet.has(question.question_id)) {
      errors.push(`question_analyses[${index}].question_id=${question.question_id} missing from VisionEvidencePacket questions`);
    }
  });

  const sameQuestionSet =
    duplicateActualQuestionIds.length === 0 &&
    expectedQuestionIds.length === actualQuestionIds.length &&
    expectedQuestionIds.every((questionId) => actualQuestionIdSet.has(questionId));
  if (sameQuestionSet && expectedQuestionIds.some((questionId, index) => actualQuestionIds[index] !== questionId)) {
    errors.push(`question_analyses order must match VisionEvidencePacket questions: expected ${expectedQuestionIds.join(", ")} but got ${actualQuestionIds.join(", ")}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function checkEvidenceCoverage(analysis: StudentLearningMaterialAnalysis): ValidationResult {
  const validation = validateStudentLearningMaterialAnalysis(analysis);
  return {
    ok: !validation.errors.some((error) => error.includes("evidenceRefs")),
    errors: validation.errors.filter((error) => error.includes("evidenceRefs")),
    warnings: validation.warnings
  };
}

export function checkWechatFeedbackSafety(feedback: WeChatParentFeedbackDraft | undefined): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!feedback) {
    return { ok: false, errors: ["wechat_parent_feedback_draft is required"], warnings };
  }
  const text = [feedback.text, ...feedback.sentences.map((sentence) => sentence.text)].join("\n");
  const forbiddenTerms = forbiddenFeedbackTerms.filter((term) => text.includes(term));

  if (forbiddenTerms.length) {
    errors.push(`Forbidden feedback expressions found: ${forbiddenTerms.join(", ")}`);
  }

  if (feedback.status !== "draft" && feedback.status !== "blocked" && feedback.status !== "needs_teacher_review") {
    errors.push("WeChat feedback status must remain draft/blocked/needs_teacher_review before teacher confirmation");
  }

  feedback.sentences.forEach((sentence, index) => {
    if (!hasEvidenceRefs(sentence)) {
      warnings.push(`wechat_parent_feedback_draft.sentences[${index}] missing evidenceRefs`);
    }
  });

  return { ok: errors.length === 0, errors, warnings };
}

function hasEvidenceRefs(value: { evidenceRefs?: string[] }) {
  return Array.isArray(value.evidenceRefs) && value.evidenceRefs.length > 0;
}

function collectAnalysisEvidenceRefs(analysis: StudentLearningMaterialAnalysis) {
  const items: Array<{ path: string; refs: string[] }> = [];
  const add = (path: string, refs: unknown) => {
    if (!Array.isArray(refs)) return;
    const stringRefs = refs.filter((ref): ref is string => typeof ref === "string" && ref.trim().length > 0);
    if (stringRefs.length) items.push({ path, refs: stringRefs });
  };

  add("material_classification.evidenceRefs", analysis.material_classification?.evidenceRefs);
  safeArray(analysis.gates).forEach((gate, index) => add(`gates[${index}].evidenceRefs`, gate.evidenceRefs));
  add("evidence_summary.usableEvidenceRefs", analysis.evidence_summary?.usableEvidenceRefs);

  safeArray(analysis.question_analyses).forEach((question, questionIndex) => {
    const prefix = `question_analyses[${questionIndex}]`;
    add(`${prefix}.material_refs`, question.material_refs);
    add(`${prefix}.evidenceRefs`, question.evidenceRefs);
    add(`${prefix}.correctnessJudgement.evidenceRefs`, question.correctnessJudgement?.evidenceRefs);
    safeArray(question.knowledgeMapping).forEach((item, itemIndex) => add(`${prefix}.knowledgeMapping[${itemIndex}].evidenceRefs`, item.evidenceRefs));
    safeArray(question.mistakeDiagnosis).forEach((item, itemIndex) => add(`${prefix}.mistakeDiagnosis[${itemIndex}].evidenceRefs`, item.evidenceRefs));
    safeArray(question.nextActions).forEach((item, itemIndex) => add(`${prefix}.nextActions[${itemIndex}].evidenceRefs`, item.evidenceRefs));
  });

  safeArray(analysis.student_profile_update_suggestions).forEach((suggestion, index) =>
    add(`student_profile_update_suggestions[${index}].evidenceRefs`, suggestion.evidenceRefs)
  );
  safeArray(analysis.next_learning_actions).forEach((action, index) => add(`next_learning_actions[${index}].evidenceRefs`, action.evidenceRefs));
  add("teacher_professional_report.evidenceRefs", analysis.teacher_professional_report?.evidenceRefs);
  safeArray(analysis.wechat_parent_feedback_draft?.sentences).forEach((sentence, index) =>
    add(`wechat_parent_feedback_draft.sentences[${index}].evidenceRefs`, sentence.evidenceRefs)
  );
  add("monthly_report_snapshot.evidenceRefs", analysis.monthly_report_snapshot?.evidenceRefs);
  add("monthly_comparison_seed.previous_month_snapshot.evidenceRefs", analysis.monthly_comparison_seed?.previous_month_snapshot?.evidenceRefs);
  safeArray(analysis.monthly_comparison_seed?.trend_by_knowledge_point).forEach((trend, index) =>
    add(`monthly_comparison_seed.trend_by_knowledge_point[${index}].evidenceRefs`, trend.evidenceRefs)
  );
  safeArray(analysis.monthly_comparison_seed?.trend_by_ability_dimension).forEach((trend, index) =>
    add(`monthly_comparison_seed.trend_by_ability_dimension[${index}].evidenceRefs`, trend.evidenceRefs)
  );
  safeArray(analysis.monthly_comparison_seed?.trend_by_error_pattern).forEach((trend, index) =>
    add(`monthly_comparison_seed.trend_by_error_pattern[${index}].evidenceRefs`, trend.evidenceRefs)
  );
  add("monthly_comparison_seed.evidenceRefs", analysis.monthly_comparison_seed?.evidenceRefs);

  return items;
}

function safeArray<T>(value: T[] | undefined) {
  return Array.isArray(value) ? value : [];
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
}

function hasVisualGeometry(value: { bbox?: unknown; polygon?: unknown }) {
  return Boolean(value.bbox || value.polygon);
}

function isValidGateStatus(status: string) {
  return status === "pass" || status === "degrade" || status === "block" || status === "needs_teacher_review";
}

function isDefinitiveJudgement(status: string) {
  return status === "correct" || status === "partially_correct" || status === "incorrect";
}
