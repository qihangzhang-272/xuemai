import { getMainlandK12SubjectReference, getStageSubjectCompatibility } from "./mainland-k12-reference";
import type { CorrectnessStatus, K12MaterialClassification, StudentLearningMaterialAnalysis, ValidationResult, VisionEvidencePacket } from "./types";
import { checkWechatFeedbackSafety } from "./validators";

export type StudentLearningMaterialReportSource = {
  source_id: string;
  internal_evidence_ref: string;
};

export type StudentLearningMaterialTeacherReportSection = {
  title: string;
  body: string;
  source_ids: string[];
};

export type StudentLearningMaterialQuestionReportRow = {
  question_id: string;
  question_number?: string;
  judgement: string;
  basis: string;
  knowledge_points: string[];
  mistake_diagnosis: string[];
  next_action: string;
  confidence: number;
  source_ids: string[];
  needs_teacher_review: boolean;
};

export type StudentLearningMaterialTeacherReportResult = {
  title: string;
  assessment_style: "professional_evaluation";
  status: "draft_ready" | "needs_teacher_review";
  material_summary: string;
  data_credibility: {
    level: "high" | "medium" | "low";
    summary: string;
    review_required_count: number;
    source_ids: string[];
  };
  conclusion_sections: StudentLearningMaterialTeacherReportSection[];
  question_rows: StudentLearningMaterialQuestionReportRow[];
  monthly_note: StudentLearningMaterialTeacherReportSection;
  source_map: StudentLearningMaterialReportSource[];
  markdown: string;
};

export type StudentLearningMaterialParentFeedbackResult = {
  status: "draft" | "blocked" | "needs_teacher_review";
  copyable: boolean;
  text: string;
  warnings: string[];
  source_ids: string[];
};

export type StudentLearningMaterialMonthlyResult = {
  month: string;
  teacher_confirmed: false;
  current_month_summary: string;
  comparison_to_previous_month: string;
  first_priority_action: string;
  previous_month_evidence_status: "available" | "missing";
  previous_month_source_ids: string[];
  source_ids: string[];
};

export type StudentLearningMaterialUserFacingClassification = Omit<K12MaterialClassification, "evidenceRefs"> & {
  source_ids: string[];
};

export type StudentLearningMaterialUserFacingResult = {
  schema_version: "student_learning_material_user_facing_result.v0.1";
  analysis_id: string;
  source_material_id: string;
  student_id: string;
  material_classification: StudentLearningMaterialUserFacingClassification;
  teacher_report: StudentLearningMaterialTeacherReportResult;
  parent_feedback: StudentLearningMaterialParentFeedbackResult;
  monthly_result: StudentLearningMaterialMonthlyResult;
};

export function createStudentLearningMaterialUserFacingResult(
  analysis: StudentLearningMaterialAnalysis
): StudentLearningMaterialUserFacingResult {
  const sourceIndex = createSourceIndex(analysis);
  const questionRows = analysis.question_analyses.map((question) => ({
    question_id: question.question_id,
    question_number: question.question_number,
    judgement: formatCorrectnessStatus(question.correctnessJudgement.status),
    basis: question.correctnessJudgement.explanation,
    knowledge_points: question.knowledgeMapping.map((item) => item.knowledge_point_label),
    mistake_diagnosis: question.mistakeDiagnosis.map((item) => item.explanation),
    next_action: question.nextActions[0]?.detail || "需老师结合课堂情况确认下一步动作。",
    confidence: question.confidence,
    source_ids: sourceIndex.toSourceIds(question.evidenceRefs),
    needs_teacher_review: question.correctnessJudgement.status === "needs_teacher_review" || question.correctnessJudgement.status === "unknown"
  }));
  const reviewRequiredCount = questionRows.filter((row) => row.needs_teacher_review).length;
  const dataCredibility = buildDataCredibility(analysis, reviewRequiredCount, sourceIndex.toSourceIds(analysis.evidence_summary.usableEvidenceRefs));
  const conclusionSections = buildConclusionSections(analysis, sourceIndex);
  const monthlyNote = buildMonthlyNote(analysis, sourceIndex);
  const parentFeedback = buildParentFeedback(analysis, sourceIndex);
  const teacherReport = {
    title: analysis.teacher_professional_report.report_title,
    assessment_style: analysis.teacher_professional_report.assessment_style,
    status: analysis.teacher_review_required || analysis.risk_flags.length > 0 || reviewRequiredCount > 0 ? "needs_teacher_review" : "draft_ready",
    material_summary: buildMaterialSummary(analysis),
    data_credibility: dataCredibility,
    conclusion_sections: conclusionSections,
    question_rows: questionRows,
    monthly_note: monthlyNote,
    source_map: sourceIndex.sourceMap,
    markdown: ""
  } satisfies StudentLearningMaterialTeacherReportResult;

  teacherReport.markdown = formatTeacherReportMarkdown(teacherReport, parentFeedback);

  return {
    schema_version: "student_learning_material_user_facing_result.v0.1",
    analysis_id: analysis.analysis_id,
    source_material_id: analysis.source_material_id,
    student_id: analysis.student_id,
    material_classification: buildUserFacingMaterialClassification(analysis.material_classification, sourceIndex),
    teacher_report: teacherReport,
    parent_feedback: parentFeedback,
    monthly_result: buildMonthlyResult(analysis, sourceIndex)
  };
}

export type ValidateStudentLearningMaterialUserFacingResultContext = {
  analysis?: StudentLearningMaterialAnalysis;
  packet?: VisionEvidencePacket;
};

export function validateStudentLearningMaterialUserFacingResult(
  value: unknown,
  context: ValidateStudentLearningMaterialUserFacingResultContext = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["user-facing result must be an object"], warnings };
  }
  const result = value as StudentLearningMaterialUserFacingResult;
  if (result.schema_version !== "student_learning_material_user_facing_result.v0.1") {
    errors.push("schema_version must be student_learning_material_user_facing_result.v0.1");
  }
  if (!readString(result.analysis_id)) errors.push("analysis_id is required");
  if (!readString(result.source_material_id)) errors.push("source_material_id is required");
  if (!readString(result.student_id)) errors.push("student_id is required");
  validateResultContext(result, context, errors);
  validateMaterialClassificationResult(result, context.analysis, errors);
  validateTeacherReportResult(result, context.analysis, errors);
  validateParentFeedbackResult(result, context.analysis, errors);
  validateMonthlyResult(result, context.analysis, errors);
  return { ok: errors.length === 0, errors, warnings };
}

function buildUserFacingMaterialClassification(
  classification: K12MaterialClassification,
  sourceIndex: SourceIndex
): StudentLearningMaterialUserFacingClassification {
  return {
    material_type: classification.material_type,
    subject: classification.subject,
    education_stage: classification.education_stage,
    grade_candidate: classification.grade_candidate,
    region_or_curriculum_candidate: classification.region_or_curriculum_candidate,
    classification_confidence: classification.classification_confidence,
    source_ids: sourceIndex.toSourceIds(classification.evidenceRefs)
  };
}

function buildConclusionSections(analysis: StudentLearningMaterialAnalysis, sourceIndex: SourceIndex): StudentLearningMaterialTeacherReportSection[] {
  const report = analysis.teacher_professional_report;
  const questionEvidenceRefs = flattenQuestionEvidenceRefs(analysis);
  const knowledgeEvidenceRefs = flattenEvidenceRefs(analysis.question_analyses.flatMap((question) => question.knowledgeMapping));
  const mistakeEvidenceRefs = flattenEvidenceRefs(analysis.question_analyses.flatMap((question) => question.mistakeDiagnosis));
  const nextActionEvidenceRefs = analysis.next_learning_actions.flatMap((action) => action.evidenceRefs);
  const previousMonthEvidenceRefs = getPreviousMonthEvidenceRefs(analysis);
  const comparisonTrendEvidenceRefs = hasPreviousMonthComparisonEvidence(analysis)
    ? analysis.monthly_comparison_seed.trend_by_error_pattern.flatMap((trend) => trend.evidenceRefs)
    : [];
  const monthlyEvidenceRefs = [...analysis.monthly_report_snapshot.evidenceRefs, ...analysis.monthly_comparison_seed.evidenceRefs, ...previousMonthEvidenceRefs];
  return [
    {
      title: "结论总览",
      body: report.overall_conclusion,
      source_ids: sourceIndex.toSourceIds(report.evidenceRefs)
    },
    {
      title: "得分或完成情况概览",
      body: report.score_or_completion_summary,
      source_ids: sourceIndex.toSourceIds(report.evidenceRefs)
    },
    {
      title: "证据充分性判定",
      body: buildEvidenceSufficiencyFeedback(analysis),
      source_ids: sourceIndex.toSourceIds(uniqueStrings([...analysis.gates.flatMap((gate) => gate.evidenceRefs), ...questionEvidenceRefs, ...analysis.evidence_summary.usableEvidenceRefs]))
    },
    {
      title: "学情传导图",
      body: buildLearningTransmissionPath(analysis),
      source_ids: sourceIndex.toSourceIds(uniqueStrings([...report.evidenceRefs, ...knowledgeEvidenceRefs, ...mistakeEvidenceRefs, ...nextActionEvidenceRefs]))
    },
    {
      title: "知识薄弱点分析",
      body: report.knowledge_mastery_summary,
      source_ids: sourceIndex.toSourceIds(knowledgeEvidenceRefs)
    },
    {
      title: "能力维度反馈",
      body: `${report.ability_dimension_summary} ${formatCurriculumReference(analysis)}`,
      source_ids: sourceIndex.toSourceIds(analysis.monthly_report_snapshot.evidenceRefs)
    },
    {
      title: "错误模式反馈",
      body: report.error_pattern_summary,
      source_ids: sourceIndex.toSourceIds(mistakeEvidenceRefs)
    },
    {
      title: "难度层表现反馈",
      body: buildDifficultyLayerFeedback(analysis),
      source_ids: sourceIndex.toSourceIds(uniqueStrings([...questionEvidenceRefs, ...analysis.evidence_summary.usableEvidenceRefs]))
    },
    {
      title: "学习策略表现反馈",
      body: buildLearningStrategyFeedback(analysis),
      source_ids: sourceIndex.toSourceIds(uniqueStrings([...mistakeEvidenceRefs, ...nextActionEvidenceRefs]))
    },
    {
      title: "学科能力反馈",
      body: buildSubjectAbilityFeedback(analysis),
      source_ids: sourceIndex.toSourceIds(uniqueStrings([...analysis.monthly_report_snapshot.evidenceRefs, ...report.evidenceRefs]))
    },
    {
      title: "重点错题成因反馈",
      body: buildKeyMistakeCauseFeedback(analysis),
      source_ids: sourceIndex.toSourceIds(uniqueStrings([...mistakeEvidenceRefs, ...questionEvidenceRefs]))
    },
    {
      title: "优先关注点",
      body: report.priority_focus,
      source_ids: sourceIndex.toSourceIds(nextActionEvidenceRefs)
    },
    {
      title: "表现空间反馈",
      body: buildPerformanceSpaceFeedback(analysis),
      source_ids: sourceIndex.toSourceIds(uniqueStrings([...analysis.monthly_report_snapshot.evidenceRefs, ...report.evidenceRefs]))
    },
    {
      title: "复发风险反馈",
      body: buildRecurrenceRiskFeedback(analysis),
      source_ids: sourceIndex.toSourceIds(
        uniqueStrings([
          ...analysis.student_profile_update_suggestions.filter((suggestion) => suggestion.suggestion_type === "recurrence_risk").flatMap((suggestion) => suggestion.evidenceRefs),
          ...monthlyEvidenceRefs,
          ...comparisonTrendEvidenceRefs
        ])
      )
    },
    {
      title: "近期巩固方向",
      body: report.consolidation_suggestions.join("；") || "需老师结合课堂安排确认巩固方向。",
      source_ids: sourceIndex.toSourceIds(report.evidenceRefs)
    },
    {
      title: "来源与注意事项",
      body: report.teacher_review_boundary,
      source_ids: sourceIndex.toSourceIds(report.evidenceRefs)
    }
  ];
}

function buildLearningTransmissionPath(analysis: StudentLearningMaterialAnalysis) {
  const report = analysis.teacher_professional_report;
  const knowledgePoints = uniqueStrings(analysis.question_analyses.flatMap((question) => question.knowledgeMapping.map((item) => item.knowledge_point_label))).slice(0, 4);
  const highPriorityActions = analysis.next_learning_actions.filter((action) => action.priority === "high").map((action) => action.title).slice(0, 3);
  return [
    `本次材料表现：${report.score_or_completion_summary}`,
    `知识点线索：${formatList(knowledgePoints)}`,
    `能力表现：${report.ability_dimension_summary}`,
    `错误模式：${report.error_pattern_summary}`,
    `优先跟进：${formatList(highPriorityActions.length ? highPriorityActions : [report.priority_focus])}`
  ].join(" -> ");
}

function buildEvidenceSufficiencyFeedback(analysis: StudentLearningMaterialAnalysis) {
  const total = analysis.question_analyses.length;
  const definitiveCount = analysis.question_analyses.filter((question) =>
    ["correct", "partially_correct", "incorrect"].includes(question.correctnessJudgement.status)
  ).length;
  const reviewCount = analysis.question_analyses.filter((question) =>
    question.correctnessJudgement.status === "needs_teacher_review" || question.correctnessJudgement.status === "unknown"
  ).length;
  const gateWarnings = analysis.gates
    .filter((gate) => gate.status !== "pass")
    .map((gate) => `${gate.gate_id}:${gate.reason}`)
    .slice(0, 4);
  const missingContext = analysis.evidence_summary.missing_context.slice(0, 4);
  return [
    `本次逐题证据充分可硬判 ${definitiveCount}/${total} 题，需老师复核 ${reviewCount} 题。`,
    "硬判仅限题目切分、学生作答、同题答案/评分点或清晰批改、OCR/Layout 置信度同时满足的题目；证据不足题只进入复核，不生成能力或错因定性。",
    gateWarnings.length ? `当前降级/阻断门：${gateWarnings.join("；")}。` : "当前关键证据门未出现阻断项。",
    missingContext.length ? `仍需补充：${missingContext.join("、")}。` : "暂无额外关键上下文缺口。"
  ].join("");
}

function buildDifficultyLayerFeedback(analysis: StudentLearningMaterialAnalysis) {
  const total = analysis.monthly_report_snapshot.question_count;
  const analyzable = analysis.monthly_report_snapshot.analyzable_question_count;
  const definitiveCount = analysis.question_analyses.filter((question) =>
    ["correct", "partially_correct", "incorrect"].includes(question.correctnessJudgement.status)
  ).length;
  const reviewCount = analysis.question_analyses.filter((question) =>
    question.correctnessJudgement.status === "needs_teacher_review" || question.correctnessJudgement.status === "unknown"
  ).length;
  return [
    `本次结构化证据可分析 ${analyzable}/${total} 题，确定性判断 ${definitiveCount} 题，需老师复核 ${reviewCount} 题。`,
    "当前证据包尚未提供稳定的题目难度分层标签，因此不硬判低/中/高难度层表现；后续需要题库难度标签或人工 gold 标注后再细分。"
  ].join("");
}

function buildLearningStrategyFeedback(analysis: StudentLearningMaterialAnalysis) {
  const strategySignals = uniqueStrings([
    ...analysis.question_analyses.flatMap((question) => question.mistakeDiagnosis.map((item) => formatMistakeDiagnosisType(item.diagnosis_type))),
    ...analysis.next_learning_actions.map((action) => action.detail)
  ]).slice(0, 5);
  const reviewBoundary = analysis.question_analyses.some((question) => question.correctnessJudgement.status === "needs_teacher_review" || question.correctnessJudgement.status === "unknown")
    ? "其中证据不足题目只提示复核，不推断学习习惯或态度。"
    : "以上仅基于本次材料证据，不扩展为长期学习习惯标签。";
  return `本次可观察的学习策略重点：${formatList(strategySignals)}。${reviewBoundary}`;
}

function buildSubjectAbilityFeedback(analysis: StudentLearningMaterialAnalysis) {
  const report = analysis.teacher_professional_report;
  return `${analysis.material_classification.subject}学科能力观察：${report.ability_dimension_summary} ${formatCurriculumReference(analysis)}`;
}

function buildKeyMistakeCauseFeedback(analysis: StudentLearningMaterialAnalysis) {
  const rows = analysis.question_analyses
    .filter((question) => question.correctnessJudgement.status !== "correct")
    .map((question) => {
      const diagnosis = question.mistakeDiagnosis[0];
      const cause = diagnosis ? diagnosis.explanation : question.correctnessJudgement.explanation;
      const reviewNote = question.correctnessJudgement.status === "needs_teacher_review" || question.correctnessJudgement.status === "unknown" ? "（需老师补证据后再定性）" : "";
      return `${question.question_number || question.question_id}：${formatCorrectnessStatus(question.correctnessJudgement.status)}，${cause}${reviewNote}`;
    })
    .slice(0, 5);
  return rows.length ? rows.join("；") : "本次材料没有形成可归因的重点错题；仍需结合更多已确认材料观察。";
}

function buildPerformanceSpaceFeedback(analysis: StudentLearningMaterialAnalysis) {
  const snapshot = analysis.monthly_report_snapshot;
  const missing = analysis.evidence_summary.missing_context.length ? `缺少 ${analysis.evidence_summary.missing_context.join("、")} 时，不估算可追回分。` : "当前不承诺分数提升，只给出可复核的表现空间。";
  return `${snapshot.score_summary} 可分析题目 ${snapshot.analyzable_question_count}/${snapshot.question_count}；本次优先表现空间是：${snapshot.first_priority_action}。${missing}`;
}

function buildRecurrenceRiskFeedback(analysis: StudentLearningMaterialAnalysis) {
  const recurrenceSuggestions = analysis.student_profile_update_suggestions
    .filter((suggestion) => suggestion.suggestion_type === "recurrence_risk")
    .map((suggestion) => suggestion.content);
  const repeatedSignals = hasPreviousMonthComparisonEvidence(analysis)
    ? uniqueStrings([
        ...analysis.monthly_comparison_seed.repeated_issues,
        ...analysis.monthly_comparison_seed.trend_by_error_pattern
          .filter((trend) => trend.trend === "repeated" || trend.trend === "new")
          .map((trend) => `${trend.pattern}:${trend.trend === "repeated" ? "反复出现" : "新出现"}`)
      ])
    : [];
  const signals = uniqueStrings([...recurrenceSuggestions, ...repeatedSignals]).slice(0, 5);
  if (signals.length === 0) {
    return "当前只基于本次材料和可用月度种子观察，暂不形成长期复发风险标签；如同类问题连续出现，需老师确认后再入档。";
  }
  return `需关注的复发风险信号：${signals.join("；")}。这些仍是 AI 草稿，需老师确认后才能进入长期档案。`;
}

function validateResultContext(
  result: StudentLearningMaterialUserFacingResult,
  context: ValidateStudentLearningMaterialUserFacingResultContext,
  errors: string[]
) {
  const expectedSourceMaterialId = context.analysis?.source_material_id ?? context.packet?.source_material_id;
  if (expectedSourceMaterialId && result.source_material_id !== expectedSourceMaterialId) {
    errors.push("source_material_id must match analysis or VisionEvidencePacket");
  }
  const expectedStudentId = context.analysis?.student_id ?? context.packet?.student_id;
  if (expectedStudentId && result.student_id !== expectedStudentId) {
    errors.push("student_id must match analysis or VisionEvidencePacket");
  }
  if (context.analysis && result.analysis_id !== context.analysis.analysis_id) {
    errors.push("analysis_id must match analysis.analysis_id");
  }
}

function validateMaterialClassificationResult(
  result: StudentLearningMaterialUserFacingResult,
  analysis: StudentLearningMaterialAnalysis | undefined,
  errors: string[]
) {
  const classification = result.material_classification;
  if (!classification || typeof classification !== "object") {
    errors.push("material_classification is required");
    return;
  }
  for (const field of ["material_type", "subject", "education_stage", "grade_candidate", "region_or_curriculum_candidate"] as const) {
    if (!readString(classification[field])) errors.push(`material_classification.${field} is required`);
  }
  if (typeof classification.classification_confidence !== "number" || classification.classification_confidence < 0 || classification.classification_confidence > 1) {
    errors.push("material_classification.classification_confidence must be a number between 0 and 1");
  }
  if (!Array.isArray(classification.source_ids) || classification.source_ids.length === 0) {
    errors.push("material_classification.source_ids must not be empty");
  }
  if ("evidenceRefs" in classification) {
    errors.push("material_classification must not expose raw evidenceRefs");
  }
  if (analysis) {
    const expected = analysis.material_classification;
    if (classification.material_type !== expected.material_type) errors.push("material_classification.material_type must match analysis");
    if (classification.subject !== expected.subject) errors.push("material_classification.subject must match analysis");
    if (classification.education_stage !== expected.education_stage) errors.push("material_classification.education_stage must match analysis");
    if (classification.grade_candidate !== expected.grade_candidate) errors.push("material_classification.grade_candidate must match analysis");
    if (classification.region_or_curriculum_candidate !== expected.region_or_curriculum_candidate) {
      errors.push("material_classification.region_or_curriculum_candidate must match analysis");
    }
  }
}

function validateTeacherReportResult(
  result: StudentLearningMaterialUserFacingResult,
  analysis: StudentLearningMaterialAnalysis | undefined,
  errors: string[]
) {
  const report = result.teacher_report;
  if (!report || typeof report !== "object") {
    errors.push("teacher_report is required");
    return;
  }
  if (report.assessment_style !== "professional_evaluation") {
    errors.push("teacher_report.assessment_style must be professional_evaluation");
  }
  if (report.status !== "draft_ready" && report.status !== "needs_teacher_review") {
    errors.push("teacher_report.status must be draft_ready or needs_teacher_review");
  }
  for (const field of ["title", "material_summary", "markdown"]) {
    if (!readString((report as unknown as Record<string, unknown>)[field])) errors.push(`teacher_report.${field} is required`);
  }
  const requiredSectionTitles = [
    "结论总览",
    "得分或完成情况概览",
    "证据充分性判定",
    "学情传导图",
    "知识薄弱点分析",
    "能力维度反馈",
    "错误模式反馈",
    "难度层表现反馈",
    "学习策略表现反馈",
    "学科能力反馈",
    "重点错题成因反馈",
    "优先关注点",
    "表现空间反馈",
    "复发风险反馈",
    "近期巩固方向",
    "来源与注意事项"
  ];
  const sectionTitles = new Set(Array.isArray(report.conclusion_sections) ? report.conclusion_sections.map((section) => section.title) : []);
  requiredSectionTitles.forEach((title) => {
    if (!sectionTitles.has(title)) errors.push(`teacher_report.conclusion_sections missing ${title}`);
  });
  const requiredMarkdownSections = [
    "## 材料概览",
    "## 数据可信度",
    "## 证据充分性判定",
    "## 学情传导图",
    "## 难度层表现反馈",
    "## 复发风险反馈",
    "## 逐题分析",
    "## 月报素材与纵向比较",
    "## 家长反馈草稿"
  ];
  requiredMarkdownSections.forEach((section) => {
    if (!report.markdown.includes(section)) errors.push(`teacher_report.markdown missing ${section}`);
  });
  if (!report.markdown.includes("来源：S")) errors.push("teacher_report.markdown must include user-visible source labels");
  if (report.markdown.includes("evidenceRefs")) errors.push("teacher_report.markdown must not expose raw evidenceRefs");
  if (report.markdown.includes("synthetic.material_001")) errors.push("teacher_report.markdown must not expose raw internal evidence refs");
  if (!Array.isArray(report.question_rows) || report.question_rows.length === 0) {
    errors.push("teacher_report.question_rows must not be empty");
  } else {
    report.question_rows.forEach((row, index) => {
      if (!readString(row.question_id)) errors.push(`teacher_report.question_rows[${index}].question_id is required`);
      if (!readString(row.judgement)) errors.push(`teacher_report.question_rows[${index}].judgement is required`);
      if (!readString(row.basis)) errors.push(`teacher_report.question_rows[${index}].basis is required`);
      if (!readString(row.next_action)) errors.push(`teacher_report.question_rows[${index}].next_action is required`);
      if (!Array.isArray(row.source_ids) || row.source_ids.length === 0) errors.push(`teacher_report.question_rows[${index}].source_ids must not be empty`);
    });
  }
  if (analysis && report.question_rows.length !== analysis.question_analyses.length) {
    errors.push("teacher_report.question_rows must cover all analysis questions");
  }
  if (analysis && Array.isArray(report.question_rows)) {
    validateQuestionRowsAgainstExpectedIds(
      report.question_rows,
      analysis.question_analyses.map((question) => question.question_id),
      "teacher_report.question_rows",
      "analysis questions",
      errors
    );
  }
  if (!report.monthly_note || report.monthly_note.title !== "月报素材与纵向比较" || !readString(report.monthly_note.body)) {
    errors.push("teacher_report.monthly_note must include 月报素材与纵向比较");
  } else if (analysis && !hasPreviousMonthComparisonEvidence(analysis)) {
    if (!includesMissingPreviousMonthEvidenceWarning(report.monthly_note.body)) {
      errors.push("teacher_report.monthly_note must warn missing previous-month evidence");
    }
    if (containsUnsafeModelComparisonText(report.monthly_note.body, analysis)) {
      errors.push("teacher_report.monthly_note must not reuse model trend text without previous-month evidence");
    }
  }
  if (!Array.isArray(report.source_map) || report.source_map.length === 0) {
    errors.push("teacher_report.source_map must not be empty");
  }
  const sourceIds = new Set<string>();
  report.source_map?.forEach((source, index) => {
    if (!readString(source.source_id)) errors.push(`teacher_report.source_map[${index}].source_id is required`);
    if (!readString(source.internal_evidence_ref)) errors.push(`teacher_report.source_map[${index}].internal_evidence_ref is required`);
    if (sourceIds.has(source.source_id)) errors.push(`teacher_report.source_map duplicate source_id=${source.source_id}`);
    sourceIds.add(source.source_id);
  });
  if (!report.data_credibility || !["high", "medium", "low"].includes(report.data_credibility.level)) {
    errors.push("teacher_report.data_credibility.level must be high, medium, or low");
  }
}

function validateParentFeedbackResult(
  result: StudentLearningMaterialUserFacingResult,
  analysis: StudentLearningMaterialAnalysis | undefined,
  errors: string[]
) {
  const feedback = result.parent_feedback;
  if (!feedback || typeof feedback !== "object") {
    errors.push("parent_feedback is required");
    return;
  }
  if (!readString(feedback.text)) errors.push("parent_feedback.text is required");
  if (typeof feedback.copyable !== "boolean") errors.push("parent_feedback.copyable must be boolean");
  if (!Array.isArray(feedback.source_ids) || feedback.source_ids.length === 0) errors.push("parent_feedback.source_ids must not be empty");
  const feedbackSafety = checkWechatFeedbackSafety({
    status: feedback.status,
    text: feedback.text,
    sentences: [{ text: feedback.text, evidenceRefs: feedback.source_ids }],
    warnings: feedback.warnings,
    forbidden_terms_found: []
  });
  errors.push(...feedbackSafety.errors.map((error) => `parent_feedback invalid: ${error}`));
  if (analysis && hasFeedbackReviewBlocker(analysis)) {
    if (feedback.status === "draft") {
      errors.push("parent_feedback.status must be needs_teacher_review or blocked when analysis still has review blockers");
    }
    if (feedback.copyable) {
      errors.push("parent_feedback.copyable must be false when analysis still has review blockers");
    }
    if (!feedback.warnings.includes("teacher_review_required")) {
      errors.push("parent_feedback.warnings must include teacher_review_required when analysis still has review blockers");
    }
  }
}

function validateMonthlyResult(result: StudentLearningMaterialUserFacingResult, analysis: StudentLearningMaterialAnalysis | undefined, errors: string[]) {
  const monthly = result.monthly_result;
  if (!monthly || typeof monthly !== "object") {
    errors.push("monthly_result is required");
    return;
  }
  if (!readString(monthly.month)) errors.push("monthly_result.month is required");
  if (monthly.teacher_confirmed !== false) errors.push("monthly_result.teacher_confirmed must remain false before teacher confirmation");
  for (const field of ["current_month_summary", "comparison_to_previous_month", "first_priority_action"]) {
    if (!readString((monthly as unknown as Record<string, unknown>)[field])) errors.push(`monthly_result.${field} is required`);
  }
  if (!/上月|纵向|相比|缺少上月/.test(monthly.comparison_to_previous_month)) {
    errors.push("monthly_result.comparison_to_previous_month must state prior-month comparison or missing previous-month evidence");
  }
  if (!Array.isArray(monthly.source_ids) || monthly.source_ids.length === 0) {
    errors.push("monthly_result.source_ids must not be empty");
  }
  if (analysis && !hasPreviousMonthComparisonEvidence(analysis)) {
    if (monthly.previous_month_evidence_status !== "missing") {
      errors.push("monthly_result.previous_month_evidence_status must be missing when previous-month evidence is absent");
    }
    if (Array.isArray(monthly.previous_month_source_ids) && monthly.previous_month_source_ids.length > 0) {
      errors.push("monthly_result.previous_month_source_ids must be empty when previous-month evidence is absent");
    }
    if (!includesMissingPreviousMonthEvidenceWarning(monthly.comparison_to_previous_month)) {
      errors.push("monthly_result.comparison_to_previous_month must warn missing previous-month evidence");
    }
    if (containsUnsafeModelComparisonText(monthly.comparison_to_previous_month, analysis)) {
      errors.push("monthly_result.comparison_to_previous_month must not reuse model trend text without previous-month evidence");
    }
  }
  if (analysis && hasPreviousMonthComparisonEvidence(analysis)) {
    const expectedSourceIds = getSourceIdsForEvidenceRefs(result.teacher_report.source_map, getPreviousMonthEvidenceRefs(analysis));
    if (monthly.previous_month_evidence_status !== "available") {
      errors.push("monthly_result.previous_month_evidence_status must be available when previous-month evidence exists");
    }
    const missingPreviousSourceIds = expectedSourceIds.filter((sourceId) => !monthly.previous_month_source_ids.includes(sourceId));
    if (missingPreviousSourceIds.length) {
      errors.push(`monthly_result.previous_month_source_ids must include previous_month_snapshot source ids: ${missingPreviousSourceIds.join(",")}`);
    }
    const missingSourceIds = expectedSourceIds.filter((sourceId) => !monthly.source_ids.includes(sourceId));
    if (missingSourceIds.length) {
      errors.push(`monthly_result.source_ids must include previous_month_snapshot source ids: ${missingSourceIds.join(",")}`);
    }
  }
}

function buildDataCredibility(
  analysis: StudentLearningMaterialAnalysis,
  reviewRequiredCount: number,
  sourceIds: string[]
): StudentLearningMaterialTeacherReportResult["data_credibility"] {
  const usableCount = analysis.evidence_summary.usableEvidenceRefs.length;
  const missingCount = analysis.evidence_summary.missing_context.length;
  const hasRisk = analysis.risk_flags.length > 0 || analysis.teacher_review_required;
  const level = hasRisk || reviewRequiredCount > 0 || usableCount < 2 ? missingCount > 0 || usableCount < 2 ? "low" : "medium" : "high";
  const summary = [
    `可用来源 ${usableCount} 条`,
    `需老师复核题目 ${reviewRequiredCount} 道`,
    analysis.evidence_summary.missing_context.length ? `缺少：${analysis.evidence_summary.missing_context.join("、")}` : "暂未记录关键缺失项",
    analysis.evidence_summary.reliability_notes.join("；")
  ]
    .filter(Boolean)
    .join("；");

  return {
    level,
    summary,
    review_required_count: reviewRequiredCount,
    source_ids: sourceIds
  };
}

function buildMonthlyNote(analysis: StudentLearningMaterialAnalysis, sourceIndex: SourceIndex): StudentLearningMaterialTeacherReportSection {
  const comparisonEvidenceRefs = getPreviousMonthEvidenceRefs(analysis);
  const comparisonText = buildMonthlyComparisonText(analysis);
  const teacherInterpretation = hasPreviousMonthComparisonEvidence(analysis)
    ? analysis.monthly_comparison_seed.teacher_interpretation
    : "老师可先把本月材料作为月报素材候选，待补充上月已确认来源后再做纵向比较。";
  return {
    title: "月报素材与纵向比较",
    body: [
      analysis.monthly_report_snapshot.parent_visible_summary,
      comparisonText,
      teacherInterpretation
    ]
      .filter(Boolean)
      .join(" "),
    source_ids: sourceIndex.toSourceIds([...analysis.monthly_report_snapshot.evidenceRefs, ...analysis.monthly_comparison_seed.evidenceRefs, ...comparisonEvidenceRefs])
  };
}

function buildParentFeedback(
  analysis: StudentLearningMaterialAnalysis,
  sourceIndex: SourceIndex
): StudentLearningMaterialParentFeedbackResult {
  const feedback = analysis.wechat_parent_feedback_draft;
  const hasReviewBlocker = hasFeedbackReviewBlocker(analysis);
  const status = feedback.status === "blocked" ? "blocked" : hasReviewBlocker ? "needs_teacher_review" : feedback.status;
  const warnings = uniqueStrings([...feedback.warnings, ...(hasReviewBlocker ? ["teacher_review_required"] : [])]);
  return {
    status,
    copyable: status === "draft" && feedback.forbidden_terms_found.length === 0,
    text: feedback.text,
    warnings,
    source_ids: sourceIndex.toSourceIds(feedback.sentences.flatMap((sentence) => sentence.evidenceRefs))
  };
}

function hasFeedbackReviewBlocker(analysis: StudentLearningMaterialAnalysis) {
  if (analysis.teacher_review_required || analysis.risk_flags.length > 0) return true;
  return analysis.question_analyses.some((question) => question.correctnessJudgement.status === "needs_teacher_review" || question.correctnessJudgement.status === "unknown");
}

function buildMonthlyResult(analysis: StudentLearningMaterialAnalysis, sourceIndex: SourceIndex): StudentLearningMaterialMonthlyResult {
  const snapshot = analysis.monthly_report_snapshot;
  const comparisonEvidenceRefs = getPreviousMonthEvidenceRefs(analysis);
  const comparison = buildMonthlyComparisonText(analysis);
  const previousMonthSourceIds = sourceIndex.toSourceIds(comparisonEvidenceRefs);

  return {
    month: snapshot.month,
    teacher_confirmed: snapshot.teacher_confirmed,
    current_month_summary: `${snapshot.parent_visible_summary} 本月主要进步信号：${snapshot.main_progress_signal}；主要关注点：${snapshot.main_issue_signal}。`,
    comparison_to_previous_month: comparison,
    first_priority_action: snapshot.first_priority_action,
    previous_month_evidence_status: hasPreviousMonthComparisonEvidence(analysis) ? "available" : "missing",
    previous_month_source_ids: hasPreviousMonthComparisonEvidence(analysis) ? previousMonthSourceIds : [],
    source_ids: sourceIndex.toSourceIds([...snapshot.evidenceRefs, ...analysis.monthly_comparison_seed.evidenceRefs, ...comparisonEvidenceRefs])
  };
}

function buildMonthlyComparisonText(analysis: StudentLearningMaterialAnalysis) {
  if (hasPreviousMonthComparisonEvidence(analysis)) {
    return analysis.monthly_comparison_seed.parent_readable_comparison;
  }
  return missingPreviousMonthEvidenceComparisonText();
}

function missingPreviousMonthEvidenceComparisonText() {
  return "本月已有可入月报素材；缺少上月已确认素材或上月来源证据，只能记录本月表现，不能写成明确进步或退步。";
}

function buildMaterialSummary(analysis: StudentLearningMaterialAnalysis) {
  const classification = analysis.material_classification;
  return [
    `${classification.grade_candidate}${classification.subject}${formatMaterialType(classification.material_type)}`,
    `学段：${formatEducationStage(classification.education_stage)}`,
    `地区/教材线索：${classification.region_or_curriculum_candidate}`,
    `识别题目：${analysis.question_analyses.length} 道`,
    `可分析题目：${analysis.monthly_report_snapshot.analyzable_question_count} 道`
  ].join("；");
}

function formatTeacherReportMarkdown(
  report: StudentLearningMaterialTeacherReportResult,
  parentFeedback: StudentLearningMaterialParentFeedbackResult
) {
  const lines = [
    `# ${report.title}`,
    "",
    `## 材料概览`,
    `${report.material_summary}`,
    "",
    `## 数据可信度`,
    `${formatCredibilityLevel(report.data_credibility.level)}：${report.data_credibility.summary} ${formatSourceLabels(report.data_credibility.source_ids)}`,
    ""
  ];

  for (const section of report.conclusion_sections) {
    lines.push(`## ${section.title}`, `${section.body} ${formatSourceLabels(section.source_ids)}`, "");
  }

  lines.push("## 逐题分析");
  for (const row of report.question_rows) {
    lines.push(
      `- ${row.question_number || row.question_id}：${row.judgement}；${row.basis}；知识点：${formatList(row.knowledge_points)}；下一步：${row.next_action} ${formatSourceLabels(row.source_ids)}`
    );
  }
  lines.push("", `## ${report.monthly_note.title}`, `${report.monthly_note.body} ${formatSourceLabels(report.monthly_note.source_ids)}`, "");
  lines.push("## 家长反馈草稿", parentFeedback.text, "");

  return lines.join("\n").trim();
}

function createSourceIndex(analysis: StudentLearningMaterialAnalysis): SourceIndex {
  const refs = uniqueStrings([
    ...analysis.material_classification.evidenceRefs,
    ...analysis.gates.flatMap((gate) => gate.evidenceRefs),
    ...analysis.evidence_summary.usableEvidenceRefs,
    ...analysis.question_analyses.flatMap((question) => [
      ...question.evidenceRefs,
      ...question.material_refs,
      ...question.correctnessJudgement.evidenceRefs,
      ...question.knowledgeMapping.flatMap((item) => item.evidenceRefs),
      ...question.mistakeDiagnosis.flatMap((item) => item.evidenceRefs),
      ...question.nextActions.flatMap((item) => item.evidenceRefs)
    ]),
    ...analysis.student_profile_update_suggestions.flatMap((suggestion) => suggestion.evidenceRefs),
    ...analysis.next_learning_actions.flatMap((action) => action.evidenceRefs),
    ...analysis.teacher_professional_report.evidenceRefs,
    ...analysis.wechat_parent_feedback_draft.sentences.flatMap((sentence) => sentence.evidenceRefs),
    ...analysis.monthly_report_snapshot.evidenceRefs,
    ...getPreviousMonthEvidenceRefs(analysis),
    ...analysis.monthly_comparison_seed.evidenceRefs,
    ...analysis.monthly_comparison_seed.trend_by_knowledge_point.flatMap((trend) => trend.evidenceRefs),
    ...analysis.monthly_comparison_seed.trend_by_ability_dimension.flatMap((trend) => trend.evidenceRefs),
    ...analysis.monthly_comparison_seed.trend_by_error_pattern.flatMap((trend) => trend.evidenceRefs)
  ]);
  const sourceMap = refs.map((ref, index) => ({
    source_id: `S${index + 1}`,
    internal_evidence_ref: ref
  }));
  const byRef = new Map(sourceMap.map((source) => [source.internal_evidence_ref, source.source_id]));
  return {
    sourceMap,
    toSourceIds(evidenceRefs: string[]) {
      return uniqueStrings(evidenceRefs.map((ref) => byRef.get(ref)).filter((sourceId): sourceId is string => Boolean(sourceId)));
    }
  };
}

function hasPreviousMonthComparisonEvidence(analysis: StudentLearningMaterialAnalysis) {
  return getPreviousMonthEvidenceRefs(analysis).length > 0;
}

function getPreviousMonthEvidenceRefs(analysis: StudentLearningMaterialAnalysis) {
  return uniqueStrings(analysis.monthly_comparison_seed.previous_month_snapshot?.evidenceRefs ?? []);
}

function includesMissingPreviousMonthEvidenceWarning(text: string) {
  return text.includes("缺少上月已确认素材") && text.includes("上月来源证据") && text.includes("不能写成明确进步或退步");
}

function containsUnsafeModelComparisonText(text: string, analysis: StudentLearningMaterialAnalysis) {
  const modelComparison = analysis.monthly_comparison_seed.parent_readable_comparison;
  return Boolean(modelComparison && modelComparison !== missingPreviousMonthEvidenceComparisonText() && text.includes(modelComparison));
}

function getSourceIdsForEvidenceRefs(sourceMap: StudentLearningMaterialReportSource[], evidenceRefs: string[]) {
  const byRef = new Map(sourceMap.map((source) => [source.internal_evidence_ref, source.source_id]));
  return uniqueStrings(evidenceRefs.map((ref) => byRef.get(ref)).filter((sourceId): sourceId is string => Boolean(sourceId)));
}

type SourceIndex = {
  sourceMap: StudentLearningMaterialReportSource[];
  toSourceIds(evidenceRefs: string[]): string[];
};

function flattenEvidenceRefs(items: Array<{ evidenceRefs: string[] }>) {
  return items.flatMap((item) => item.evidenceRefs);
}

function flattenQuestionEvidenceRefs(analysis: StudentLearningMaterialAnalysis) {
  return analysis.question_analyses.flatMap((question) => [
    ...question.evidenceRefs,
    ...question.material_refs,
    ...question.correctnessJudgement.evidenceRefs,
    ...question.knowledgeMapping.flatMap((item) => item.evidenceRefs),
    ...question.mistakeDiagnosis.flatMap((item) => item.evidenceRefs),
    ...question.nextActions.flatMap((item) => item.evidenceRefs)
  ]);
}

function formatCorrectnessStatus(status: CorrectnessStatus) {
  const labels: Record<CorrectnessStatus, string> = {
    correct: "正确",
    partially_correct: "部分正确",
    incorrect: "错误",
    unknown: "证据不足",
    needs_teacher_review: "需老师确认"
  };
  return labels[status];
}

function formatMistakeDiagnosisType(type: string) {
  const labels: Record<string, string> = {
    knowledge_gap: "知识点缺口",
    condition_extraction_error: "题干条件提取",
    process_omission: "过程步骤遗漏",
    representation_error: "表达或表征转换",
    calculation_error: "计算准确性",
    expression_incomplete: "答案表达完整性",
    review_or_checking_gap: "复查与验算",
    unknown: "错因需复核"
  };
  return labels[type] || "错因需复核";
}

function formatMaterialType(materialType: string) {
  const labels: Record<string, string> = {
    exam: "试卷",
    homework: "作业",
    wrong_question: "错题",
    wrong_question_book: "错题本",
    unit_quiz: "单元测验",
    weekly_test: "周测",
    monthly_test: "月考",
    student_notes: "学生笔记",
    practice_record: "练习记录",
    other_student_material: "学习材料"
  };
  return labels[materialType] || "学习材料";
}

function formatEducationStage(stage: string) {
  const labels: Record<string, string> = {
    primary: "小学",
    middle: "初中",
    high: "高中",
    unknown: "未识别"
  };
  return labels[stage] || "未识别";
}

function formatCurriculumReference(analysis: StudentLearningMaterialAnalysis) {
  const classification = analysis.material_classification;
  const subjectReference = getMainlandK12SubjectReference(classification.subject);
  const compatibility = getStageSubjectCompatibility({
    stage: classification.education_stage,
    subject: classification.subject
  });
  const dimensionText = subjectReference.ability_dimensions.slice(0, 6).join("、");
  const focusText = subjectReference.report_focus.slice(0, 4).join("、");
  const warning = compatibility.warning ? ` 注意：${compatibility.warning}` : "";
  return `公开课程参考维度：${dimensionText}；报告观察重点：${focusText}。${warning}`;
}

function formatCredibilityLevel(level: "high" | "medium" | "low") {
  if (level === "high") return "高";
  if (level === "medium") return "中";
  return "低";
}

function formatSourceLabels(sourceIds: string[]) {
  return sourceIds.length ? `（来源：${sourceIds.join("、")}）` : "（来源待老师复核）";
}

function formatList(items: string[]) {
  return items.length ? items.join("、") : "待补充";
}

function uniqueStrings(items: Array<string | undefined>) {
  return Array.from(new Set(items.filter((item): item is string => typeof item === "string" && item.trim().length > 0)));
}

function validateQuestionRowsAgainstExpectedIds(
  rows: StudentLearningMaterialQuestionReportRow[],
  expectedQuestionIds: string[],
  fieldName: string,
  expectedLabel: string,
  errors: string[]
) {
  const rowQuestionIds = rows.map((row) => readString(row.question_id)).filter((questionId): questionId is string => Boolean(questionId));
  const expectedSet = new Set(expectedQuestionIds);
  const rowSet = new Set(rowQuestionIds);
  const duplicateIds = findDuplicates(rowQuestionIds);
  const missingIds = expectedQuestionIds.filter((questionId) => !rowSet.has(questionId));
  const extraIds = rowQuestionIds.filter((questionId) => !expectedSet.has(questionId));

  if (duplicateIds.length > 0) {
    errors.push(`${fieldName} duplicate question_id(s): ${duplicateIds.join(", ")}`);
  }
  if (missingIds.length > 0) {
    errors.push(`${fieldName} missing question_id(s) from ${expectedLabel}: ${missingIds.join(", ")}`);
  }
  if (extraIds.length > 0) {
    errors.push(`${fieldName} contains unknown question_id(s): ${extraIds.join(", ")}`);
  }
  const preservesOrder = rowQuestionIds.length === expectedQuestionIds.length && rowQuestionIds.every((questionId, index) => questionId === expectedQuestionIds[index]);
  if (!preservesOrder) {
    errors.push(`${fieldName} must preserve question order from ${expectedLabel}`);
  }
}

function findDuplicates(items: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }
  return Array.from(duplicates);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
