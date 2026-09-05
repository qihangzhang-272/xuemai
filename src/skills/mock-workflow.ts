import { archiveEditedSkillCard, editSkillCardField, resetSkillCardToOriginal } from "./actions";
import { createSkillRun, runSkillMock, toSkillCardViewModel, transitionSkillRun } from "./runner";
import type { SkillActionId, SkillCardViewModel, SkillId, SkillRunResult, SkillScope } from "./types";

export type MockWorkflowConversation = {
  id: string;
  scope: SkillScope;
  name: string;
};

export type MockWorkflowMessage = {
  id: string;
  conversationId: string;
  sender: "teacher" | "system";
  type: "text" | "skill_card" | "archive_log";
  content: string;
  skillRunId?: string;
};

export type MockArchiveLog = {
  id: string;
  conversationId: string;
  skillRunId: string;
  content: string;
  archiveTarget: string;
};

export type MockTimelineRecord = {
  id: string;
  conversationId: string;
  skillRunId: string;
  title: string;
  summary: string;
  archiveTarget: string;
  sourceSkillType: SkillId;
};

export type MockWorkflowState = {
  conversations: MockWorkflowConversation[];
  activeConversationId: string;
  messages: MockWorkflowMessage[];
  skillRuns: SkillRunResult[];
  skillCards: SkillCardViewModel[];
  archiveLogs: MockArchiveLog[];
  timelineRecords: MockTimelineRecord[];
};

export function createMockWorkflowState(): MockWorkflowState {
  return {
    conversations: [
      { id: "student-wang", scope: "student", name: "王一路" },
      { id: "class-a", scope: "class", name: "初二 A 班" },
      { id: "teacher-workspace", scope: "teacher", name: "老师工作台" }
    ],
    activeConversationId: "student-wang",
    messages: [],
    skillRuns: [],
    skillCards: [],
    archiveLogs: [],
    timelineRecords: []
  };
}

export function submitTeacherMessage(state: MockWorkflowState, conversationId: string, content: string): MockWorkflowState {
  const nextState = appendMessage(state, {
    conversationId,
    sender: "teacher",
    type: "text",
    content
  });

  return startSkill(nextState, conversationId, inferSkillId(content), content);
}

export function startFollowUpSkill(state: MockWorkflowState, sourceRunId: string, skillId: SkillId): MockWorkflowState {
  const sourceRun = state.skillRuns.find((run) => run.runId === sourceRunId);
  const sourceCard = state.skillCards.find((card) => card.run_id === sourceRunId);
  const conversationId = sourceRun?.subjectId ?? state.activeConversationId;
  const inputSummary = sourceCard?.current_output.display_content || sourceRun?.displayContent || sourceRun?.inputSummary || "由上一张 AI 结果卡触发";

  return startSkill(state, conversationId, skillId, inputSummary);
}

export function editWorkflowSkillCardField(state: MockWorkflowState, skillRunId: string, fieldPath: string, after: unknown): MockWorkflowState {
  const existingCard = state.skillCards.find((card) => card.run_id === skillRunId);
  if (!existingCard) return state;

  const nextEditableState = editSkillCardField(existingCard, fieldPath, after, {
    eventId: nextId("edit", existingCard.edit_events.length),
    editedAt: `mock_edit_${existingCard.edit_events.length + 1}`
  });
  const nextCard: SkillCardViewModel = {
    ...existingCard,
    display_content: nextEditableState.current_output.display_content,
    structured_result: nextEditableState.current_output.structured_result,
    current_output: nextEditableState.current_output,
    archived_output: nextEditableState.archived_output,
    edit_events: nextEditableState.edit_events
  };

  return {
    ...state,
    skillCards: state.skillCards.map((card) => (card.run_id === skillRunId ? nextCard : card))
  };
}

export function resetWorkflowSkillCardToOriginal(state: MockWorkflowState, skillRunId: string): MockWorkflowState {
  const existingCard = state.skillCards.find((card) => card.run_id === skillRunId);
  if (!existingCard) return state;

  const nextEditableState = resetSkillCardToOriginal(existingCard, {
    eventId: nextId("edit", existingCard.edit_events.length),
    editedAt: `mock_edit_${existingCard.edit_events.length + 1}`
  });
  const nextCard: SkillCardViewModel = {
    ...existingCard,
    display_content: nextEditableState.current_output.display_content,
    structured_result: nextEditableState.current_output.structured_result,
    current_output: nextEditableState.current_output,
    archived_output: nextEditableState.archived_output,
    edit_events: nextEditableState.edit_events
  };

  return {
    ...state,
    skillCards: state.skillCards.map((card) => (card.run_id === skillRunId ? nextCard : card))
  };
}

export function applySkillAction(state: MockWorkflowState, skillRunId: string, action: SkillActionId): MockWorkflowState {
  const existingRun = state.skillRuns.find((run) => run.runId === skillRunId);
  if (!existingRun) return state;

  const existingCard = state.skillCards.find((card) => card.run_id === skillRunId);
  const nextRun = transitionSkillRun(existingRun, action);
  const transitionCard = mergeCardAfterRunTransition(existingCard, nextRun);
  const nextState: MockWorkflowState = {
    ...state,
    skillRuns: state.skillRuns.map((run) => (run.runId === skillRunId ? nextRun : run)),
    skillCards: state.skillCards.map((card) => (card.run_id === skillRunId ? transitionCard : card))
  };

  if (nextRun.status !== "archived" || existingRun.status === "archived") {
    return nextState;
  }

  const archivedEditableState = archiveEditedSkillCard(transitionCard, { teacherConfirmed: true });
  const archivedCard: SkillCardViewModel = {
    ...transitionCard,
    display_content: archivedEditableState.current_output.display_content,
    structured_result: archivedEditableState.current_output.structured_result,
    current_output: archivedEditableState.current_output,
    archived_output: archivedEditableState.archived_output,
    edit_events: archivedEditableState.edit_events
  };
  const stateWithArchivedOutput: MockWorkflowState = {
    ...nextState,
    skillCards: nextState.skillCards.map((card) => (card.run_id === skillRunId ? archivedCard : card))
  };

  return appendArchive(stateWithArchivedOutput, nextRun, archivedCard);
}

function startSkill(state: MockWorkflowState, conversationId: string, skillId: SkillId, inputSummary: string): MockWorkflowState {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return state;

  const skillRun = runSkillMock(
    createSkillRun({
      skillId,
      scope: conversation.scope,
      subjectId: conversation.id,
      subjectName: conversation.name,
      inputSummary
    })
  );
  const skillCard = toSkillCardViewModel(skillRun);

  return appendMessage(
    {
      ...state,
      skillRuns: [...state.skillRuns, skillRun],
      skillCards: [...state.skillCards, skillCard]
    },
    {
      conversationId,
      sender: "system",
      type: "skill_card",
      content: skillCard.title,
      skillRunId: skillRun.runId
    }
  );
}

function appendArchive(state: MockWorkflowState, skillRun: SkillRunResult, skillCard: SkillCardViewModel): MockWorkflowState {
  const content = `已入档到「${skillRun.subjectName} > ${skillRun.archiveTarget.split(">").at(-1)?.trim() || "学习记录"}」，将作为下次备课和月报依据。`;
  const archiveLog: MockArchiveLog = {
    id: nextId("archive", state.archiveLogs.length),
    conversationId: skillRun.subjectId,
    skillRunId: skillRun.runId,
    content,
    archiveTarget: skillRun.archiveTarget
  };
  const timelineRecord: MockTimelineRecord = {
    id: nextId("timeline", state.timelineRecords.length),
    conversationId: skillRun.subjectId,
    skillRunId: skillRun.runId,
    title: skillRun.title,
    summary: skillCard.archived_output?.display_content ?? skillCard.current_output.display_content,
    archiveTarget: skillRun.archiveTarget,
    sourceSkillType: skillRun.skillType
  };

  return appendMessage(
    {
      ...state,
      archiveLogs: [...state.archiveLogs, archiveLog],
      timelineRecords: [...state.timelineRecords, timelineRecord]
    },
    {
      conversationId: skillRun.subjectId,
      sender: "system",
      type: "archive_log",
      content,
      skillRunId: skillRun.runId
    }
  );
}

function appendMessage(state: MockWorkflowState, message: Omit<MockWorkflowMessage, "id">): MockWorkflowState {
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        id: nextId("message", state.messages.length),
        ...message
      }
    ]
  };
}

function inferSkillId(content: string): SkillId {
  if (content.includes("反馈") || content.includes("微信") || content.includes("家长")) return "generate_feedback";
  if (content.includes("下次课") || content.includes("建议")) return "next_lesson_plan";
  if (content.includes("月报")) return "monthly_report";
  if (content.includes("今天") || content.includes("课堂") || content.includes("上课") || content.includes("课后")) return "update_learning_record";
  if (content.includes("分析") || content.includes("作文") || content.includes("试卷") || content.includes("卷子") || content.includes("作业") || content.includes("材料题") || content.includes("口语") || content.includes("实验") || content.includes("美术") || content.includes("音乐") || content.includes("项目") || content.includes("作品")) return "analyze_learning_evidence";
  return "update_learning_record";
}

function nextId(prefix: string, index: number) {
  return `${prefix}_${index + 1}`;
}

function mergeCardAfterRunTransition(existingCard: SkillCardViewModel | undefined, nextRun: SkillRunResult): SkillCardViewModel {
  const nextCard = toSkillCardViewModel(nextRun);

  if (!existingCard) return nextCard;

  return {
    ...nextCard,
    display_content: existingCard.current_output.display_content,
    structured_result: existingCard.current_output.structured_result,
    original_output: existingCard.original_output,
    current_output: existingCard.current_output,
    archived_output: existingCard.archived_output,
    edit_events: existingCard.edit_events
  };
}
