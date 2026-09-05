import type { LearningEvidenceReport } from "../learning-evidence-report";
import type { K12MaterialType, K12Subject } from "./types";
import type {
  StudentLearningMaterialQuestionReportRow,
  StudentLearningMaterialReportSource,
  StudentLearningMaterialTeacherReportSection,
  StudentLearningMaterialUserFacingResult
} from "./user-facing-result";

export function createMockStudentLearningMaterialUserFacingResult(input: {
  analysisId: string;
  sourceMaterialId: string;
  studentId: string;
  report: LearningEvidenceReport;
}): StudentLearningMaterialUserFacingResult {
  const sourceIndex = createMockSourceIndex(input.report);
  const previousMonthEvidenceRefs = readLegacyPreviousMonthEvidenceRefs(input.report);
  const hasPreviousMonthEvidence = previousMonthEvidenceRefs.length > 0;
  const monthlyComparisonText = hasPreviousMonthEvidence ? input.report.monthly_comparison_seed.parent_readable_comparison : missingPreviousMonthEvidenceText();
  const previousMonthSourceIds = sourceIndex.toSourceIds(previousMonthEvidenceRefs);
  const questionRows: StudentLearningMaterialQuestionReportRow[] = input.report.question_analyses.map((question) => ({
    question_id: question.question_id,
    question_number: question.question_number,
    judgement: formatJudgement(question.judgement),
    basis: question.key_error || question.review_reason || "本题需结合学生作答和老师批改继续观察。",
    knowledge_points: question.knowledge_points,
    mistake_diagnosis: question.mistake_pattern ? [question.mistake_pattern] : [],
    next_action: question.correction_suggestion,
    confidence: formatConfidence(question.confidence_level),
    source_ids: sourceIndex.toSourceIds(question.evidence_refs),
    needs_teacher_review: question.teacher_review_required
  }));
  const reviewRequiredCount = questionRows.filter((row) => row.needs_teacher_review).length;
  const sections = buildMockConclusionSections(input.report, sourceIndex);
  const parentFeedback = {
    status: input.report.parent_feedback_draft.status,
    copyable: input.report.parent_feedback_draft.status === "draft" && input.report.parent_feedback_draft.safety_warnings.length === 0,
    text: input.report.parent_feedback_draft.text,
    warnings: input.report.parent_feedback_draft.safety_warnings,
    source_ids: sourceIndex.toSourceIds(input.report.parent_feedback_draft.evidence_refs)
  };

  return {
    schema_version: "student_learning_material_user_facing_result.v0.1",
    analysis_id: input.analysisId,
    source_material_id: input.sourceMaterialId,
    student_id: input.studentId,
    material_classification: {
      material_type: mapMockMaterialType(input.report.material_overview.material_type),
      subject: input.report.material_overview.subject_area as K12Subject,
      education_stage: input.report.material_overview.education_stage,
      grade_candidate: input.report.material_overview.grade_candidate,
      region_or_curriculum_candidate: input.report.material_overview.region_or_curriculum_candidate,
      classification_confidence: formatClassificationConfidence(input.report.overview_judgement.confidence_level),
      source_ids: sourceIndex.toSourceIds(input.report.data_validation.usable_evidence)
    },
    teacher_report: {
      title: input.report.teacher_professional_report.report_title,
      assessment_style: "professional_evaluation",
      status: reviewRequiredCount > 0 ? "needs_teacher_review" : "draft_ready",
      material_summary: [
        input.report.material_overview.material_label,
        input.report.material_overview.subject_area,
        `识别题目 ${input.report.material_overview.recognized_question_count} 道`,
        `可分析题目 ${input.report.material_overview.analyzable_question_count} 道`
      ].join("；"),
      data_credibility: {
        level: input.report.overview_judgement.confidence_level,
        summary: [
          `可用来源 ${input.report.data_validation.usable_evidence.length} 条`,
          `需老师复核题目 ${reviewRequiredCount} 道`,
          input.report.data_validation.missing_context.length ? `缺少：${input.report.data_validation.missing_context.join("、")}` : "暂未记录关键缺失项"
        ].join("；"),
        review_required_count: reviewRequiredCount,
        source_ids: sourceIndex.toSourceIds(input.report.data_validation.usable_evidence)
      },
      conclusion_sections: sections,
      question_rows: questionRows,
      monthly_note: {
        title: "月报素材与纵向比较",
        body: `${input.report.monthly_report_snapshot.parent_visible_summary} ${monthlyComparisonText}`,
        source_ids: sourceIndex.toSourceIds([...input.report.monthly_report_snapshot.evidence_refs, ...previousMonthEvidenceRefs])
      },
      source_map: sourceIndex.sourceMap,
      markdown: buildMockMarkdown({
        title: input.report.teacher_professional_report.report_title,
        materialSummary: input.report.material_overview.material_label,
        sections,
        questionRows,
        parentFeedbackText: parentFeedback.text
      })
    },
    parent_feedback: parentFeedback,
    monthly_result: {
      month: input.report.monthly_report_snapshot.month,
      teacher_confirmed: false,
      current_month_summary: `${input.report.monthly_report_snapshot.parent_visible_summary} 本月主要进步信号：${input.report.monthly_report_snapshot.main_progress_signal}；主要关注点：${input.report.monthly_report_snapshot.main_issue_signal}。`,
      comparison_to_previous_month: monthlyComparisonText,
      first_priority_action: input.report.monthly_report_snapshot.first_priority_action,
      previous_month_evidence_status: hasPreviousMonthEvidence ? "available" : "missing",
      previous_month_source_ids: previousMonthSourceIds,
      source_ids: sourceIndex.toSourceIds([...input.report.monthly_report_snapshot.evidence_refs, ...previousMonthEvidenceRefs])
    }
  };
}

function mapMockMaterialType(materialType: LearningEvidenceReport["material_overview"]["material_type"]): K12MaterialType {
  if (materialType === "exam") return "exam";
  if (materialType === "homework") return "homework";
  if (materialType === "classroom_record") return "practice_record";
  return "other_student_material";
}

function formatClassificationConfidence(confidence: LearningEvidenceReport["overview_judgement"]["confidence_level"]) {
  if (confidence === "high") return 0.9;
  if (confidence === "medium") return 0.7;
  return 0.45;
}

function buildMockConclusionSections(report: LearningEvidenceReport, sourceIndex: MockSourceIndex): StudentLearningMaterialTeacherReportSection[] {
  return [
    {
      title: "结论总览",
      body: report.teacher_professional_report.overall_conclusion,
      source_ids: sourceIndex.toSourceIds(report.data_validation.usable_evidence)
    },
    {
      title: "得分或完成情况概览",
      body: report.overview_judgement.current_performance,
      source_ids: sourceIndex.toSourceIds(report.data_validation.usable_evidence)
    },
    {
      title: "知识薄弱点分析",
      body: report.problem_pattern_clusters.map((cluster) => cluster.cluster).join("；") || "本次材料暂未形成稳定知识薄弱点。",
      source_ids: sourceIndex.toSourceIds(report.question_analyses.flatMap((question) => question.evidence_refs))
    },
    {
      title: "能力维度反馈",
      body: report.ability_profile.map((item) => `${item.label}：${item.evidence}`).join("；"),
      source_ids: sourceIndex.toSourceIds(report.data_validation.usable_evidence)
    },
    {
      title: "错误模式反馈",
      body: report.problem_pattern_clusters.map((cluster) => `${cluster.cluster}：${cluster.likely_cause}`).join("；"),
      source_ids: sourceIndex.toSourceIds(report.question_analyses.flatMap((question) => question.evidence_refs))
    },
    {
      title: "优先关注点",
      body: report.teacher_professional_report.priority_focus,
      source_ids: sourceIndex.toSourceIds(report.data_validation.usable_evidence)
    },
    {
      title: "近期巩固方向",
      body: report.short_cycle_plan.seven_day.join("；") || report.next_learning_checklist.join("；"),
      source_ids: sourceIndex.toSourceIds(report.data_validation.usable_evidence)
    },
    {
      title: "来源与注意事项",
      body: report.teacher_professional_report.teacher_review_boundary,
      source_ids: sourceIndex.toSourceIds(report.data_validation.usable_evidence)
    }
  ];
}

function createMockSourceIndex(report: LearningEvidenceReport): MockSourceIndex {
  const refs = uniqueStrings([
    ...report.data_validation.usable_evidence,
    ...report.question_analyses.flatMap((question) => question.evidence_refs),
    ...report.parent_feedback_draft.evidence_refs,
    ...report.monthly_report_snapshot.evidence_refs,
    ...readLegacyPreviousMonthEvidenceRefs(report)
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

function readLegacyPreviousMonthEvidenceRefs(report: LearningEvidenceReport): string[] {
  const previousMonthSnapshot = report.monthly_comparison_seed.previous_month_snapshot as unknown;
  if (!previousMonthSnapshot || typeof previousMonthSnapshot !== "object") return [];
  const record = previousMonthSnapshot as Record<string, unknown>;
  const refs = record.evidenceRefs ?? record.evidence_refs;
  if (!Array.isArray(refs)) return [];
  return uniqueStrings(refs.filter((ref): ref is string => typeof ref === "string" && Boolean(ref.trim())).map((ref) => ref.trim()));
}

function missingPreviousMonthEvidenceText() {
  return "本月已有可入月报素材；缺少上月已确认素材或上月来源证据，只能记录本月表现，不能写成明确进步或退步。";
}

type MockSourceIndex = {
  sourceMap: StudentLearningMaterialReportSource[];
  toSourceIds: (evidenceRefs: string[]) => string[];
};

function buildMockMarkdown(input: {
  title: string;
  materialSummary: string;
  sections: StudentLearningMaterialTeacherReportSection[];
  questionRows: StudentLearningMaterialQuestionReportRow[];
  parentFeedbackText: string;
}) {
  return [
    `# ${input.title}`,
    "",
    "## 材料概览",
    input.materialSummary,
    "",
    ...input.sections.flatMap((section) => [`## ${section.title}`, `${section.body} ${formatSourceLabels(section.source_ids)}`, ""]),
    "## 逐题分析",
    ...input.questionRows.map((row) => `- ${row.question_number || row.question_id}：${row.judgement}；${row.basis} ${formatSourceLabels(row.source_ids)}`),
    "",
    "## 家长反馈草稿",
    input.parentFeedbackText
  ].join("\n");
}

function formatJudgement(judgement: LearningEvidenceReport["question_analyses"][number]["judgement"]) {
  if (judgement === "correct") return "正确";
  if (judgement === "partially_correct") return "部分正确";
  if (judgement === "incorrect") return "错误";
  if (judgement === "needs_teacher_review") return "需老师确认";
  return "证据不足";
}

function formatConfidence(confidence: LearningEvidenceReport["overview_judgement"]["confidence_level"]) {
  if (confidence === "high") return 0.9;
  if (confidence === "medium") return 0.72;
  return 0.45;
}

function formatSourceLabels(sourceIds: string[]) {
  return sourceIds.length ? `（来源：${sourceIds.join("、")}）` : "（来源待老师复核）";
}

function uniqueStrings(items: Array<string | undefined>) {
  return Array.from(new Set(items.filter((item): item is string => typeof item === "string" && item.trim().length > 0)));
}
