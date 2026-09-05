import type { LearningEvidenceReport } from "@/src/skills/learning-evidence-report";
import type { ProfileUpdateRecord, ProfileUpdateTarget, TaskCard } from "./types";

type LearningEvidenceSuggestion = LearningEvidenceReport["student_profile_update_suggestions"][number];

export function getProfileUpdateSuggestionId(suggestion: Pick<LearningEvidenceSuggestion, "target" | "label">) {
  return `${suggestion.target}:${suggestion.label}`;
}

export function getDefaultProfileUpdateSelection(report: LearningEvidenceReport) {
  return report.student_profile_update_suggestions.filter((item) => item.selected_by_default).map(getProfileUpdateSuggestionId);
}

export function getArchivedProfileUpdateSelection(task: TaskCard) {
  const selected = task.archivedOutput?.structured_result.profile_update_selection ?? task.currentOutput?.structured_result.profile_update_selection ?? task.structuredResult?.profile_update_selection;
  if (!Array.isArray(selected)) return [];
  return selected.filter((item): item is string => typeof item === "string");
}

export function getSelectedLearningEvidenceProfileUpdates(input: {
  report: LearningEvidenceReport;
  selectedIds: string[];
  sourceTaskId: string;
  confirmedAt: string;
}): ProfileUpdateRecord[] {
  const selected = new Set(input.selectedIds);

  return input.report.student_profile_update_suggestions
    .filter((suggestion) => selected.has(getProfileUpdateSuggestionId(suggestion)))
    .map((suggestion) => ({
      id: `${input.sourceTaskId}:${getProfileUpdateSuggestionId(suggestion)}`,
      target: suggestion.target,
      label: suggestion.label,
      value: suggestion.suggested_value,
      evidence: suggestion.evidence,
      sourceTaskId: input.sourceTaskId,
      confirmedAt: input.confirmedAt
    }));
}

export function buildLearningEvidenceArchiveSummary(report: LearningEvidenceReport, updates: ProfileUpdateRecord[]) {
  const base = report.parent_readable_summary || report.overview_judgement.current_performance;
  if (!updates.length) return `${base} 已确认报告入档，暂未写入学生档案更新项。`;

  const grouped = groupProfileUpdatesByTarget(updates);
  const parts = [
    grouped.ability_profile.length ? `能力画像 ${grouped.ability_profile.length} 项` : "",
    grouped.weakness_event.length ? `薄弱点 ${grouped.weakness_event.length} 项` : "",
    grouped.recurrence_risk.length ? `复发风险 ${grouped.recurrence_risk.length} 项` : "",
    grouped.action_plan.length ? `跟进计划 ${grouped.action_plan.length} 项` : "",
    grouped.monthly_report_source.length ? `月报素材 ${grouped.monthly_report_source.length} 项` : ""
  ].filter(Boolean);

  return `${base} 已写入${parts.join("、")}。`;
}

export function groupProfileUpdatesByTarget(updates: ProfileUpdateRecord[]) {
  const groups: Record<ProfileUpdateTarget, ProfileUpdateRecord[]> = {
    ability_profile: [],
    weakness_event: [],
    recurrence_risk: [],
    action_plan: [],
    monthly_report_source: []
  };

  updates.forEach((update) => {
    groups[update.target].push(update);
  });

  return groups;
}

export function formatProfileUpdateTarget(target: ProfileUpdateTarget) {
  if (target === "ability_profile") return "能力画像";
  if (target === "weakness_event") return "薄弱点";
  if (target === "recurrence_risk") return "复发风险";
  if (target === "action_plan") return "行动计划";
  return "月报素材";
}
