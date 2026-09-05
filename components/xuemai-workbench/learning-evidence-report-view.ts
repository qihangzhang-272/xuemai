import type { LearningEvidenceReport } from "@/src/skills/learning-evidence-report";
import type { SkillAction } from "./types";
import type { TaskCard } from "./types";

export function getLearningEvidenceReport(task: TaskCard): LearningEvidenceReport | null {
  const report = task.currentOutput?.structured_result.report ?? task.structuredResult?.report;
  if (!isRecord(report) || report.schema_version !== "learning_evidence_report_v1") return null;
  return report as LearningEvidenceReport;
}

export function getLearningEvidenceReportActions(task: TaskCard): SkillAction[] {
  const fallback: SkillAction[] = ["generate_feedback", "generate_next_lesson", "add_monthly_material", "archive"];
  const actions = task.actions?.length ? task.actions : fallback;
  if (task.status === "archived") return actions.filter((action) => action === "generate_feedback" || action === "generate_next_lesson" || action === "regenerate");
  if (task.status === "running" || task.status === "failed") return actions.filter((action) => action === "regenerate");
  return actions;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
