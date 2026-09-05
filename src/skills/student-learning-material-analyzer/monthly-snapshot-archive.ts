import type { MonthlyReportSnapshot, StudentLearningMaterialAnalysis } from "./types";
import { validateStudentLearningMaterialAnalysis } from "./validators";

const forbiddenParentVisibleTerms = ["严重", "很差", "完全不会", "保证提分", "不认真", "基础很差", "一定能提高", "一定提升", "孩子不行", "家长必须"];

export type ConfirmedMonthlyReportSnapshotCopy = Omit<MonthlyReportSnapshot, "teacher_confirmed"> & {
  teacher_confirmed: true;
  teacher_id: string;
  confirmed_at: string;
  source_skill_run_id: string;
  archive_record_id: string;
  source_material_id: string;
  feedback_sent?: boolean;
  archive_audit: {
    source: "student_learning_material_analysis";
    source_analysis_id: string;
    source_material_id: string;
    source_material_state: StudentLearningMaterialAnalysis["material_state"];
    confirmed_by_teacher_id: string;
    confirmation_mode: "teacher_selected_monthly_snapshot";
  };
};

export type CreateConfirmedMonthlyReportSnapshotCopyInput = {
  analysis: StudentLearningMaterialAnalysis;
  reviewedSnapshot?: MonthlyReportSnapshot;
  teacherId: string;
  sourceSkillRunId: string;
  archiveRecordId: string;
  confirmedAt: string;
  feedbackSent?: boolean;
};

export type CreateConfirmedMonthlyReportSnapshotCopyResult =
  | {
      ok: true;
      snapshot: ConfirmedMonthlyReportSnapshotCopy;
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    };

export function createConfirmedMonthlyReportSnapshotCopy(
  input: CreateConfirmedMonthlyReportSnapshotCopyInput
): CreateConfirmedMonthlyReportSnapshotCopyResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const snapshot = input.reviewedSnapshot || input.analysis.monthly_report_snapshot;
  const validation = validateStudentLearningMaterialAnalysis(input.analysis);
  errors.push(...validation.errors.map((error) => `analysis invalid: ${error}`));
  warnings.push(...validation.warnings.map((warning) => `analysis warning: ${warning}`));

  if (!input.teacherId.trim()) errors.push("teacherId is required for monthly snapshot archive");
  if (!input.sourceSkillRunId.trim()) errors.push("sourceSkillRunId is required for monthly snapshot archive");
  if (!input.archiveRecordId.trim()) errors.push("archiveRecordId is required for monthly snapshot archive");
  if (!input.confirmedAt.trim()) errors.push("confirmedAt is required for monthly snapshot archive");
  if (input.analysis.material_state !== "valid_student_material") {
    errors.push(`monthly snapshot cannot be archived from material_state=${input.analysis.material_state}`);
  }

  if (!snapshot) {
    errors.push("monthly_report_snapshot is required");
  } else {
    validateSnapshotAgainstAnalysis(snapshot, input.analysis, errors, warnings);
  }

  if (errors.length > 0 || !snapshot) {
    return { ok: false, errors, warnings };
  }

  return {
    ok: true,
    warnings,
    snapshot: {
      ...snapshot,
      teacher_confirmed: true,
      teacher_id: input.teacherId,
      confirmed_at: input.confirmedAt,
      source_skill_run_id: input.sourceSkillRunId,
      archive_record_id: input.archiveRecordId,
      source_material_id: input.analysis.source_material_id,
      feedback_sent: input.feedbackSent,
      archive_audit: {
        source: "student_learning_material_analysis",
        source_analysis_id: input.analysis.analysis_id,
        source_material_id: input.analysis.source_material_id,
        source_material_state: input.analysis.material_state,
        confirmed_by_teacher_id: input.teacherId,
        confirmation_mode: "teacher_selected_monthly_snapshot"
      }
    }
  };
}

function validateSnapshotAgainstAnalysis(
  snapshot: MonthlyReportSnapshot,
  analysis: StudentLearningMaterialAnalysis,
  errors: string[],
  warnings: string[]
) {
  if (snapshot.teacher_confirmed !== false) {
    errors.push("reviewedSnapshot.teacher_confirmed must remain false before creating the confirmed archive copy");
  }
  if (snapshot.source_analysis_id !== analysis.analysis_id) {
    errors.push(`monthly snapshot source_analysis_id must match analysis.analysis_id: ${snapshot.source_analysis_id} != ${analysis.analysis_id}`);
  }
  if (snapshot.student_id !== analysis.student_id) {
    errors.push(`monthly snapshot student_id must match analysis.student_id: ${snapshot.student_id} != ${analysis.student_id}`);
  }
  if (!/^\d{4}-\d{2}$/.test(snapshot.month)) errors.push("monthly snapshot month must use YYYY-MM");
  if (snapshot.question_count < snapshot.analyzable_question_count) {
    errors.push("monthly snapshot question_count cannot be lower than analyzable_question_count");
  }
  if (!Array.isArray(snapshot.evidenceRefs) || snapshot.evidenceRefs.length === 0) {
    errors.push("monthly snapshot evidenceRefs are required");
  }
  const forbiddenTerms = forbiddenParentVisibleTerms.filter((term) => snapshot.parent_visible_summary.includes(term));
  if (forbiddenTerms.length > 0) {
    errors.push(`monthly snapshot parent_visible_summary contains forbidden expressions: ${forbiddenTerms.join(", ")}`);
  }

  if (snapshot.subject !== analysis.material_classification.subject) {
    warnings.push(`monthly snapshot subject differs from material classification: ${snapshot.subject} != ${analysis.material_classification.subject}`);
  }
  if (snapshot.material_type !== analysis.material_classification.material_type) {
    warnings.push(`monthly snapshot material_type differs from material classification: ${snapshot.material_type} != ${analysis.material_classification.material_type}`);
  }
}
