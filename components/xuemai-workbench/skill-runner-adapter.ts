import { transitionSkillRun } from "../../src/skills/runner";
import type { SkillActionId, SkillRunResult, SkillRunStatus } from "../../src/skills/types";
import type { TaskCard } from "./types";

export type TaskSkillActionResult = {
  ok: boolean;
  task: TaskCard;
  message?: string;
};

export function applyTaskSkillRunnerAction(task: TaskCard, action: SkillActionId): TaskSkillActionResult {
  const currentRun = taskCardToSkillRun(task);
  const nextRun = transitionSkillRun(currentRun, action);

  if (nextRun.status === "failed") {
    return {
      ok: false,
      task,
      message: nextRun.error?.error_message ?? "当前状态不能执行这个操作。"
    };
  }

  return {
    ok: true,
    task: {
      ...task,
      status: skillRunStatusToTaskStatus(nextRun.status),
      actionEvents: nextRun.events,
      updatedAt: new Date().toISOString()
    }
  };
}

export function taskCardToSkillRun(task: TaskCard): SkillRunResult {
  return {
    runId: task.skillRunId ?? task.id,
    skillId: task.skillId ?? "update_learning_record",
    skillType: task.skillId ?? "update_learning_record",
    title: task.title,
    scope: "student",
    subjectId: task.conversationId,
    subjectName: task.targetName,
    status: taskStatusToSkillRunStatus(task.status),
    inputSummary: task.inputSummary ?? task.summary ?? "",
    context: {
      inputSummary: task.inputSummary ?? task.summary ?? "",
      contextSources: task.contextSources ?? []
    },
    contextSources: task.contextSources ?? [],
    confidenceLevel: task.confidenceLevel ?? "medium",
    structuredResult: task.structuredResult ?? task.currentOutput?.structured_result ?? {},
    displayContent: task.currentOutput?.display_content ?? task.summary ?? task.feedbackText ?? task.detail ?? "",
    archiveTarget: task.archiveTarget ?? "",
    actions: task.actions ?? [],
    nextSuggestions: task.nextSuggestions ?? [],
    steps: task.steps.map((step) => step.label),
    events: task.actionEvents ?? []
  };
}

export function taskStatusToSkillRunStatus(status: TaskCard["status"]): SkillRunStatus {
  if (status === "running") return "generating";
  if (status === "completed") return "draft_ready";
  if (status === "copied") return "copied";
  if (status === "feedback_done") return "sent";
  if (status === "archived") return "archived";
  return "failed";
}

export function skillRunStatusToTaskStatus(status: SkillRunStatus): TaskCard["status"] {
  if (status === "copied") return "copied";
  if (status === "sent") return "feedback_done";
  if (status === "archived") return "archived";
  if (status === "failed") return "failed";
  if (status === "draft_ready") return "completed";
  return "running";
}
