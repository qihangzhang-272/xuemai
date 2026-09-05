import type { MonthlyReport } from "@/src/skills/monthly-report";
import type { TaskCard } from "./types";

export function getMonthlyReport(task?: TaskCard): MonthlyReport | null {
  const report = task?.currentOutput?.structured_result.report ?? task?.structuredResult?.report;
  if (!isRecord(report)) return null;
  if (report.schema_version === "student_monthly_report_v1" || report.schema_version === "class_monthly_report_v1") {
    return report as MonthlyReport;
  }
  return null;
}

export function isMonthlyReportTask(task?: TaskCard) {
  return Boolean(task && (task.skillId === "monthly_report" || task.taskType === "monthly_report") && getMonthlyReport(task));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
