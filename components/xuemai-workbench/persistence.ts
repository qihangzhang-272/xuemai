import { globalAssistantConversation, initialConversations, initialState } from "./mock-data";
import type { ChatState, Conversation, Message, TaskCard, TimelineRecord } from "./types";
import type { SkillEditEvent, SkillId, SkillOutputVersion, SkillRunEvent, SkillRunStatus } from "../../src/skills/types";

export const workbenchStorageSchemaVersion = 2;

export type PersistedSkillRunRecord = {
  id: string;
  skill_id?: SkillId;
  conversation_id: string;
  target_name: string;
  runner_status: SkillRunStatus;
  card_status: TaskCard["status"];
  input_summary?: string;
  context_sources: TaskCard["contextSources"];
  confidence_level: TaskCard["confidenceLevel"];
  archive_target?: string;
  created_at: string;
  updated_at: string;
};

export type PersistedSkillCardRecord = {
  id: string;
  skill_run_id: string;
  skill_id?: SkillId;
  conversation_id: string;
  task_type: TaskCard["taskType"];
  title: string;
  status: TaskCard["status"];
  original_output?: SkillOutputVersion;
  current_output?: SkillOutputVersion;
  archived_output?: SkillOutputVersion;
  structured_result?: Record<string, unknown>;
  display_content?: string;
  summary?: string;
  feedback_text?: string;
  archive_target?: string;
  created_at: string;
  updated_at: string;
};

export type PersistedSkillCardEventRecord = SkillRunEvent & {
  skill_card_id: string;
};

export type PersistedSkillCardEditRecord = SkillEditEvent & {
  skill_card_id: string;
};

export type WorkbenchStoragePayload = {
  schema_version: typeof workbenchStorageSchemaVersion;
  saved_at: string;
  chat_state: ChatState;
  skill_runs: PersistedSkillRunRecord[];
  skill_cards: PersistedSkillCardRecord[];
  skill_card_events: PersistedSkillCardEventRecord[];
  skill_card_edits: PersistedSkillCardEditRecord[];
  timeline_records: TimelineRecord[];
};

export function createWorkbenchStoragePayload(state: ChatState, savedAt = new Date().toISOString()): WorkbenchStoragePayload {
  return {
    schema_version: workbenchStorageSchemaVersion,
    saved_at: savedAt,
    chat_state: toPersistableChatState(state),
    skill_runs: state.taskCards.map(toPersistedSkillRun),
    skill_cards: state.taskCards.map(toPersistedSkillCard),
    skill_card_events: state.taskCards.flatMap(toPersistedSkillCardEvents),
    skill_card_edits: state.taskCards.flatMap(toPersistedSkillCardEdits),
    timeline_records: [...state.timelineRecords]
  };
}

function toPersistableChatState(state: ChatState): ChatState {
  const normalized = normalizeChatState(state);
  return {
    ...normalized,
    messages: normalized.messages.map(stripMessageImageData)
  };
}

function stripMessageImageData(message: Message): Message {
  return {
    ...message,
    imageUrl: undefined,
    attachments: message.attachments?.map((attachment) => ({
      ...attachment,
      imageUrl: undefined
    }))
  };
}

export function stringifyWorkbenchStoragePayload(state: ChatState, savedAt?: string) {
  return JSON.stringify(createWorkbenchStoragePayload(state, savedAt));
}

export function parseWorkbenchStoragePayload(raw: string | null): ChatState {
  if (!raw) return initialState;

  try {
    const parsed = JSON.parse(raw) as Partial<WorkbenchStoragePayload & ChatState>;

    if (isWorkbenchStoragePayload(parsed)) {
      return hydrateChatStateFromPayload(parsed);
    }

    return normalizeChatState(parsed);
  } catch {
    return initialState;
  }
}

function hydrateChatStateFromPayload(payload: WorkbenchStoragePayload): ChatState {
  const chatState = normalizeChatState(payload.chat_state);
  const eventsByCardId = groupBy(payload.skill_card_events, "skill_card_id");
  const editsByCardId = groupBy(payload.skill_card_edits, "skill_card_id");
  const cardById = new Map(payload.skill_cards.map((card) => [card.id, card]));

  return {
    ...chatState,
    taskCards: chatState.taskCards.map((task) => {
      const persistedCard = cardById.get(task.id);
      return {
        ...task,
        originalOutput: task.originalOutput ?? persistedCard?.original_output,
        currentOutput: task.currentOutput ?? persistedCard?.current_output,
        archivedOutput: task.archivedOutput ?? persistedCard?.archived_output,
        actionEvents: task.actionEvents?.length ? task.actionEvents : stripCardId(eventsByCardId.get(task.id) ?? []),
        editEvents: task.editEvents?.length ? task.editEvents : stripCardId(editsByCardId.get(task.id) ?? [])
      };
    }),
    timelineRecords: chatState.timelineRecords.length ? chatState.timelineRecords : payload.timeline_records
  };
}

function normalizeChatState(state: Partial<ChatState> | undefined): ChatState {
  const taskCards = state?.taskCards ?? [];
  const conversations = normalizeConversations(state?.conversations, taskCards);

  return {
    conversations,
    messages: state?.messages ?? [],
    taskCards,
    timelineRecords: state?.timelineRecords ?? [],
    preferences: {
      ...initialState.preferences,
      ...state?.preferences
    },
    teacher: state?.teacher ?? null,
    currentConversationId: conversations.some((item) => item.id === state?.currentConversationId) ? state?.currentConversationId : initialState.currentConversationId
  };
}

function normalizeConversations(conversations?: Conversation[], taskCards: TaskCard[] = []) {
  const base = conversations?.length ? conversations : initialConversations;
  const withoutAssistant = base.filter((item) => item.id !== globalAssistantConversation.id);
  return [globalAssistantConversation, ...withoutAssistant.map((conversation) => normalizeConversationStatus(conversation, taskCards))];
}

function normalizeConversationStatus(conversation: Conversation, taskCards: TaskCard[]) {
  const conversationTasks = taskCards.filter((task) => task.conversationId === conversation.id);
  const nextStatusLabel = normalizeStatusLabel(conversation.statusLabel, conversationTasks);
  const nextSummary = normalizeSummary(conversation.summary, conversationTasks);
  return nextStatusLabel === conversation.statusLabel && nextSummary === conversation.summary ? conversation : { ...conversation, statusLabel: nextStatusLabel, summary: nextSummary };
}

function normalizeStatusLabel(statusLabel: string, conversationTasks: TaskCard[]) {
  if (statusLabel === "已反馈家长") return "已反馈";
  if (statusLabel === "课后需反馈") return "待反馈";

  if (statusLabel === "待标记反馈" || statusLabel === "任务分析完成") {
    return getTaskDerivedStatusLabel(conversationTasks) ?? "待入档";
  }

  return statusLabel;
}

function getTaskDerivedStatusLabel(conversationTasks: TaskCard[]) {
  const latestTask = getLatestCompletedTask(conversationTasks);

  if (!latestTask) return undefined;
  if (latestTask.status === "feedback_done") return "已反馈";
  if (latestTask.status === "archived") return taskHasParentFeedbackStatus(latestTask) ? "已反馈" : "已入档";
  if (latestTask.status === "copied") return "已复制";
  if (latestTask.status === "completed") return taskHasParentFeedbackStatus(latestTask) ? "待反馈" : "待入档";
  if (latestTask.status === "failed") return "分析失败";
  return "生成中";
}

function normalizeSummary(summary: string, conversationTasks: TaskCard[]) {
  if (summary !== "任务分析完成") return summary;

  const latestTask = getLatestCompletedTask(conversationTasks);
  if (!latestTask) return "结果待查看";

  const subjectPrefix = latestTask.subject ? `${latestTask.subject} · ` : "";
  if (latestTask.skillId === "monthly_report" || latestTask.taskType === "monthly_report") return `${subjectPrefix}月报草稿已生成`;
  if (latestTask.taskType === "learning_record") return `${subjectPrefix}学习记录待入档`;
  if (latestTask.taskType === "feedback") return `${subjectPrefix}家长反馈待发送`;
  if (latestTask.taskType === "learning_evidence_analysis") return `${subjectPrefix}学情分析待反馈`;
  if (latestTask.taskType === "lesson_suggestion") return `${subjectPrefix}下次课建议待查看`;
  if (latestTask.taskType === "batch_feedback") return "批量反馈待发送";
  if (latestTask.taskType === "class_analysis") return "班级分析完成";
  return "结果待查看";
}

function getLatestCompletedTask(conversationTasks: TaskCard[]) {
  return conversationTasks
    .filter((task) => task.status !== "running")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function taskHasParentFeedbackStatus(task: TaskCard) {
  return (
    task.skillId === "generate_feedback" ||
    task.skillId === "parent_communication" ||
    task.skillId === "analyze_learning_evidence" ||
    task.skillId === "batch_feedback" ||
    task.taskType === "feedback" ||
    task.taskType === "learning_evidence_analysis" ||
    task.taskType === "batch_feedback"
  );
}

function isWorkbenchStoragePayload(value: Partial<WorkbenchStoragePayload & ChatState>): value is WorkbenchStoragePayload {
  return value.schema_version === workbenchStorageSchemaVersion && Boolean(value.chat_state);
}

function toPersistedSkillRun(task: TaskCard): PersistedSkillRunRecord {
  return {
    id: task.skillRunId ?? task.id,
    skill_id: task.skillId,
    conversation_id: task.conversationId,
    target_name: task.targetName,
    runner_status: mapTaskStatusToRunnerStatus(task.status),
    card_status: task.status,
    input_summary: task.inputSummary,
    context_sources: task.contextSources,
    confidence_level: task.confidenceLevel,
    archive_target: task.archiveTarget,
    created_at: task.createdAt,
    updated_at: task.updatedAt
  };
}

function toPersistedSkillCard(task: TaskCard): PersistedSkillCardRecord {
  return {
    id: task.id,
    skill_run_id: task.skillRunId ?? task.id,
    skill_id: task.skillId,
    conversation_id: task.conversationId,
    task_type: task.taskType,
    title: task.title,
    status: task.status,
    original_output: task.originalOutput,
    current_output: task.currentOutput,
    archived_output: task.archivedOutput,
    structured_result: task.structuredResult,
    display_content: task.currentOutput?.display_content ?? task.summary ?? task.feedbackText,
    summary: task.summary,
    feedback_text: task.feedbackText,
    archive_target: task.archiveTarget,
    created_at: task.createdAt,
    updated_at: task.updatedAt
  };
}

function toPersistedSkillCardEvents(task: TaskCard): PersistedSkillCardEventRecord[] {
  return (task.actionEvents ?? []).map((event) => ({
    ...event,
    skill_card_id: task.id
  }));
}

function toPersistedSkillCardEdits(task: TaskCard): PersistedSkillCardEditRecord[] {
  return (task.editEvents ?? []).map((event) => ({
    ...event,
    skill_card_id: task.id
  }));
}

function mapTaskStatusToRunnerStatus(status: TaskCard["status"]): SkillRunStatus {
  if (status === "running") return "generating";
  if (status === "completed") return "draft_ready";
  if (status === "copied") return "copied";
  if (status === "feedback_done") return "sent";
  if (status === "archived") return "archived";
  return "failed";
}

function groupBy<T extends Record<K, string>, K extends keyof T>(items: T[], key: K) {
  return items.reduce<Map<string, T[]>>((map, item) => {
    const groupKey = item[key];
    map.set(groupKey, [...(map.get(groupKey) ?? []), item]);
    return map;
  }, new Map());
}

function stripCardId<T extends { skill_card_id: string }>(items: T[]) {
  return items.map((item) => Object.fromEntries(Object.entries(item).filter(([key]) => key !== "skill_card_id")) as Omit<T, "skill_card_id">);
}
