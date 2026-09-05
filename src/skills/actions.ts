import type { EditableSkillCardState, SkillActionId, SkillEditEvent, SkillOutputVersion } from "./types";

export const skillActionLabels: Record<SkillActionId, string> = {
  copy_feedback: "复制微信反馈",
  make_warmer: "改温和一点",
  make_shorter: "改简洁一点",
  mark_parent_sent: "标记已发给家长",
  archive: "确认并入档",
  regenerate: "重新生成",
  update_learning_record: "整理为学习记录",
  update_weakness: "更新薄弱点",
  generate_practice: "生成针对练习",
  generate_feedback: "生成微信反馈",
  generate_next_lesson: "生成下次课建议",
  add_report_material: "加入月报素材",
  add_monthly_material: "加入月报素材",
  save_note: "仅保存备注"
};

export function createEditableSkillCardState(input: {
  skillRunId: string;
  displayContent: string;
  structuredResult: Record<string, unknown>;
}): EditableSkillCardState {
  const originalOutput = cloneOutput({
    display_content: input.displayContent,
    structured_result: input.structuredResult
  });

  return {
    skill_run_id: input.skillRunId,
    original_output: originalOutput,
    current_output: cloneOutput(originalOutput),
    edit_events: []
  };
}

export function editSkillCardField(
  state: EditableSkillCardState,
  fieldPath: string,
  after: unknown,
  options: { editedAt?: string; eventId?: string } = {}
): EditableSkillCardState {
  const before = readField(state.current_output, fieldPath);
  const currentOutput = cloneOutput(state.current_output);
  writeField(currentOutput, fieldPath, after);

  const event: SkillEditEvent = {
    id: options.eventId || `edit_${state.edit_events.length + 1}`,
    skill_run_id: state.skill_run_id,
    field_path: fieldPath,
    before,
    after,
    edited_at: options.editedAt || new Date().toISOString(),
    edited_by: "teacher",
    source: "manual_edit"
  };

  return {
    ...state,
    current_output: currentOutput,
    edit_events: [...state.edit_events, event]
  };
}

export function resetSkillCardToOriginal(
  state: EditableSkillCardState,
  options: { editedAt?: string; eventId?: string } = {}
): EditableSkillCardState {
  const before = cloneOutput(state.current_output);
  const currentOutput = cloneOutput(state.original_output);
  const event: SkillEditEvent = {
    id: options.eventId || `edit_${state.edit_events.length + 1}`,
    skill_run_id: state.skill_run_id,
    field_path: "$",
    before,
    after: currentOutput,
    edited_at: options.editedAt || new Date().toISOString(),
    edited_by: "teacher",
    source: "manual_edit"
  };

  return {
    ...state,
    current_output: currentOutput,
    archived_output: undefined,
    edit_events: [...state.edit_events, event]
  };
}

export function archiveEditedSkillCard(state: EditableSkillCardState, confirm: { teacherConfirmed: boolean }): EditableSkillCardState {
  if (!confirm.teacherConfirmed) {
    return state;
  }

  return {
    ...state,
    archived_output: cloneOutput(state.current_output)
  };
}

function readField(output: SkillOutputVersion, fieldPath: string): unknown {
  if (fieldPath === "display_content") return output.display_content;
  if (fieldPath === "structured_result") return output.structured_result;
  if (fieldPath.startsWith("structured_result.")) {
    return readNested(output.structured_result, fieldPath.replace("structured_result.", ""));
  }
  return undefined;
}

function writeField(output: SkillOutputVersion, fieldPath: string, value: unknown) {
  if (fieldPath === "display_content") {
    output.display_content = String(value);
    return;
  }
  if (fieldPath === "structured_result") {
    output.structured_result = isRecord(value) ? value : {};
    return;
  }
  if (fieldPath.startsWith("structured_result.")) {
    writeNested(output.structured_result, fieldPath.replace("structured_result.", ""), value);
  }
}

function readNested(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined;
    return current[key];
  }, source);
}

function writeNested(source: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let current: Record<string, unknown> = source;

  parts.slice(0, -1).forEach((key) => {
    const next = current[key];
    if (!isRecord(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  });

  current[parts.at(-1) ?? path] = value;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
