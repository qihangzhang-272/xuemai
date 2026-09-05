import type { StudentLearningMaterialUserFacingResult } from "@/src/skills/student-learning-material-analyzer/user-facing-result";
import type { SkillAction, TaskCard } from "./types";

export function getStudentLearningMaterialUserFacingResult(task: TaskCard): StudentLearningMaterialUserFacingResult | null {
  const result = task.currentOutput?.structured_result.user_facing_result ?? task.structuredResult?.user_facing_result;
  if (!isRecord(result) || result.schema_version !== "student_learning_material_user_facing_result.v0.1") return null;
  if (!isRecord(result.teacher_report) || !isRecord(result.parent_feedback) || !isRecord(result.monthly_result)) return null;
  return result as unknown as StudentLearningMaterialUserFacingResult;
}

export function getStudentLearningMaterialUserResultActions(task: TaskCard): SkillAction[] {
  const fallback: SkillAction[] = ["generate_feedback", "generate_next_lesson", "add_monthly_material", "archive"];
  const actions = task.actions?.length ? task.actions : fallback;
  if (task.status === "archived") return actions.filter((action) => action === "generate_feedback" || action === "generate_next_lesson" || action === "regenerate");
  if (task.status === "running" || task.status === "failed") return actions.filter((action) => action === "regenerate");
  return actions;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
