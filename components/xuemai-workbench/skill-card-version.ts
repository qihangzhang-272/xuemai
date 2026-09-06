import { archiveEditedSkillCard, createEditableSkillCardState, editSkillCardField, resetSkillCardToOriginal, skillActionLabels } from "../../src/skills/actions";
import type { EditableSkillCardState, SkillActionId, SkillOutputVersion } from "../../src/skills/types";
import type { TaskCard } from "./types";

export const defaultSkillCardDisclosureState = {
  showEditor: false,
  showOriginal: false
} as const;

export type SkillCardEditableField = {
  path: string;
  label: string;
  value: string;
};

export type SkillCardVersionMeta = {
  field: SkillCardEditableField;
  originalText: string;
  currentText: string;
  archivedText?: string;
  isEdited: boolean;
  isArchived: boolean;
  editCount: number;
  editLabel: string;
  archiveLabel: string;
};

export type TaskCardStatusCopy = {
  label: string;
  description: string;
};

export function getTaskCardStatusCopy(status: TaskCard["status"], task?: Pick<TaskCard, "skillId" | "taskType">): TaskCardStatusCopy {
  if (status === "running") {
    return {
      label: "生成中",
      description: "正在整理上下文和草稿"
    };
  }

  if (status === "copied") {
    return {
      label: "已复制",
      description: "已复制，待标记已发"
    };
  }

  if (status === "feedback_done") {
    return {
      label: "已反馈",
      description: "反馈已完成，入档可按需选择"
    };
  }

  if (status === "archived") {
    if (task && isFeedbackTask(task)) {
      return {
        label: "已反馈",
        description: "已反馈给家长，并已确认入档"
      };
    }

    return {
      label: "已入档",
      description: "已入档，将作为后续反馈和月报依据"
    };
  }

  if (status === "failed") {
    return {
      label: "生成失败",
      description: "未能整理完成，原文已保存"
    };
  }

  return {
    label: task && isFeedbackTask(task) ? "待发送" : "待确认",
    description: "请老师检查正文后再继续"
  };
}

function isFeedbackTask(task: Pick<TaskCard, "skillId" | "taskType">) {
  return task.skillId === "generate_feedback" || task.skillId === "parent_communication" || task.taskType === "feedback";
}

export function shouldMinimizeArchivedSkillCard(status: TaskCard["status"]) {
  return status === "archived";
}

export function isPrimarySkillCardAction(task: TaskCard, action: SkillActionId) {
  const actions = task.actions ?? (isFeedbackTask(task) ? ["copy_feedback", "mark_parent_sent", "archive"] : ["archive", "generate_feedback"]);
  return action === [...actions].sort((a, b) => getSkillCardActionPriority(task, a) - getSkillCardActionPriority(task, b))[0];
}

export function getSkillCardActionPriority(task: TaskCard, action: SkillActionId) {
  const feedbackOrder: SkillActionId[] = task.status === "copied"
    ? ["generate_feedback", "mark_parent_sent", "copy_feedback", "archive", "make_warmer", "make_shorter", "regenerate"]
    : ["generate_feedback", "copy_feedback", "mark_parent_sent", "archive", "make_warmer", "make_shorter", "regenerate"];
  const learningOrder: SkillActionId[] = ["generate_feedback", "archive", "generate_next_lesson", "save_note", "regenerate"];
  const evidenceOrder: SkillActionId[] = ["generate_feedback", "archive", "copy_feedback", "add_monthly_material", "generate_next_lesson", "regenerate"];

  const order =
    task.taskType === "monthly_report"
      ? ["archive", "copy_feedback", "generate_feedback", "regenerate"]
      : task.skillId === "generate_feedback" || task.skillId === "parent_communication" || task.taskType === "feedback"
      ? feedbackOrder
      : task.skillId === "update_learning_record" || task.taskType === "learning_record"
        ? learningOrder
        : task.skillId === "analyze_learning_evidence" || task.taskType === "learning_evidence_analysis"
          ? evidenceOrder
          : ["generate_feedback", "archive", "regenerate"];

  const index = order.indexOf(action);
  return index >= 0 ? index : order.length + 1;
}

export function getTaskActionLabel(task: TaskCard, action: SkillActionId) {
  if (action === "generate_feedback") return "检查并反馈";
  if (action === "copy_feedback") return task.taskType === "feedback" ? "复制家长反馈" : "复制正文";
  if (action === "mark_parent_sent") return "标记已发给家长";
  if (action === "archive") return "加入学生档案";
  return skillActionLabels[action];
}

export function getSkillCardVersionMeta(task: TaskCard): SkillCardVersionMeta {
  const state = createEditableStateFromTask(task);
  const field = getEditableField(task, state.current_output);
  const originalText = readOutputText(state.original_output, field.path);
  const currentText = readOutputText(state.current_output, field.path);
  const archivedText = state.archived_output ? readOutputText(state.archived_output, field.path) : undefined;
  const editCount = state.edit_events.length;
  const isEdited = originalText !== currentText;

  return {
    field: {
      ...field,
      value: currentText
    },
    originalText,
    currentText,
    archivedText,
    isEdited,
    isArchived: Boolean(state.archived_output),
    editCount,
    editLabel: isEdited ? (editCount ? `已编辑 · ${editCount} 次` : "老师已修改") : editCount ? `已重置为原稿 · ${editCount} 次` : "未编辑",
    archiveLabel: state.archived_output ? "已入档当前版" : "未入档"
  };
}

export function editTaskCardEditableValue(
  task: TaskCard,
  after: string,
  options: { editedAt?: string; eventId?: string } = {}
): TaskCard {
  const state = createEditableStateFromTask(task);
  const field = getEditableField(task, state.current_output);
  const nextState = editSkillCardField(state, field.path, after, options);
  const currentOutput =
    field.path === "display_content"
      ? nextState.current_output
      : {
          ...nextState.current_output,
          display_content: after
        };

  return applyEditableStateToTask(task, {
    ...nextState,
    current_output: currentOutput,
    archived_output: undefined
  });
}

export function editArchivedTaskCardEditableValue(
  task: TaskCard,
  after: string,
  options: { editedAt?: string; eventId?: string } = {}
): TaskCard {
  const state = createEditableStateFromTask(task);
  const archivedBase = state.archived_output ? cloneOutput(state.archived_output) : cloneOutput(state.current_output);
  const baseState: EditableSkillCardState = {
    ...state,
    current_output: archivedBase,
    archived_output: cloneOutput(archivedBase)
  };
  const field = getEditableField(task, baseState.current_output);
  const nextState = editSkillCardField(baseState, field.path, after, options);
  const currentOutput =
    field.path === "display_content"
      ? nextState.current_output
      : {
          ...nextState.current_output,
          display_content: after
        };

  return applyEditableStateToTask(task, {
    ...nextState,
    current_output: currentOutput,
    archived_output: cloneOutput(currentOutput)
  });
}

export function resetTaskCardEditableOutput(task: TaskCard, options: { editedAt?: string; eventId?: string } = {}): TaskCard {
  return applyEditableStateToTask(task, resetSkillCardToOriginal(createEditableStateFromTask(task), options));
}

export function archiveTaskCardCurrentOutput(task: TaskCard): TaskCard {
  return applyEditableStateToTask(task, archiveEditedSkillCard(createEditableStateFromTask(task), { teacherConfirmed: true }));
}

export function applyEditableStateToTask(task: TaskCard, state: EditableSkillCardState): TaskCard {
  const feedbackText = typeof state.current_output.structured_result.parent_message === "string" ? state.current_output.structured_result.parent_message : state.current_output.display_content;

  return {
    ...task,
    skillRunId: state.skill_run_id,
    originalOutput: cloneOutput(state.original_output),
    currentOutput: cloneOutput(state.current_output),
    archivedOutput: state.archived_output ? cloneOutput(state.archived_output) : undefined,
    editEvents: [...state.edit_events],
    structuredResult: cloneRecord(state.current_output.structured_result),
    summary: state.current_output.display_content,
    feedbackText,
    detail: JSON.stringify(state.current_output.structured_result, null, 2)
  };
}

export function createEditableStateFromTask(task: TaskCard): EditableSkillCardState {
  if (task.originalOutput && task.currentOutput) {
    return {
      skill_run_id: task.skillRunId ?? task.id,
      original_output: cloneOutput(task.originalOutput),
      current_output: cloneOutput(task.currentOutput),
      archived_output: task.archivedOutput ? cloneOutput(task.archivedOutput) : undefined,
      edit_events: task.editEvents ? [...task.editEvents] : []
    };
  }

  const displayContent = task.summary ?? task.feedbackText ?? task.detail ?? "";
  const structuredResult = task.structuredResult ?? {};

  return createEditableSkillCardState({
    skillRunId: task.skillRunId ?? task.id,
    displayContent,
    structuredResult
  });
}

function getEditableField(task: TaskCard, output: SkillOutputVersion): SkillCardEditableField {
  if (task.skillId === "generate_feedback" || task.skillId === "parent_communication" || task.taskType === "feedback") {
    return {
      path: "structured_result.parent_message",
      label: "微信反馈正文",
      value: readOutputText(output, "structured_result.parent_message")
    };
  }

  if (task.skillId === "update_learning_record" || task.taskType === "learning_record") {
    return {
      path: "structured_result.performance",
      label: "学习记录表现",
      value: readOutputText(output, "structured_result.performance")
    };
  }

  if (task.skillId === "analyze_learning_evidence" || task.taskType === "learning_evidence_analysis") {
    return {
      path: "structured_result.parent_summary",
      label: "家长可读摘要",
      value: readOutputText(output, "structured_result.parent_summary")
    };
  }

  return {
    path: "display_content",
    label: "当前版正文",
    value: output.display_content
  };
}

function readOutputText(output: SkillOutputVersion, path: string) {
  if (path === "display_content") return output.display_content;
  if (path.startsWith("structured_result.")) {
    const value = readNested(output.structured_result, path.replace("structured_result.", ""));
    return typeof value === "string" ? value : output.display_content;
  }
  return output.display_content;
}

function readNested(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

function cloneOutput(output: SkillOutputVersion): SkillOutputVersion {
  return {
    display_content: output.display_content,
    structured_result: cloneRecord(output.structured_result)
  };
}

function cloneRecord(record: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
}
