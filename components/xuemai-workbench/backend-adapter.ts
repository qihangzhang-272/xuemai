import type { ChatState, Conversation, Message, SkillAction, TaskCard, TaskType } from "./types";
import { contactStatus, type LearningRecord, type Snapshot } from "@/lib/xuemai/types";
import type { SkillId } from "@/src/skills/types";

export const assistantConversation: Conversation = {
  id: "xuemai-assistant", kind: "assistant", name: "学脉助手", avatar: "脉", className: "", subject: "", grade: "",
  summary: "教学记录、反馈与入档事项", time: "", statusLabel: "", accent: "green",
};
export const emptyState: ChatState = {
  conversations: [assistantConversation], messages: [], taskCards: [], timelineRecords: [], teacher: null,
  preferences: { autoAnalyzeUploadedPaper: false, autoArchiveLearningEvidence: false, feedbackTone: "温和", defaultTaskSet: [] },
  currentConversationId: assistantConversation.id,
};

export async function backend<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(`/api/xuemai/${path}`, body === undefined ? { cache: "no-store" } : {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }).catch(() => { throw new Error("连接暂时中断，请检查连接后重试。"); });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "操作未完成，请重试");
  return data;
}
export function recordId(task: Pick<TaskCard, "id">) { return task.id.replace(/:feedback$/, ""); }
export function isFeedback(task: Pick<TaskCard, "id">) { return task.id.endsWith(":feedback"); }
export const recordSkill: Record<LearningRecord["kind"], SkillId> = {
  record: "update_learning_record", analysis: "analyze_learning_evidence", prep: "next_lesson_plan", monthly: "monthly_report", daily: "monthly_report",
};
const taskType: Record<LearningRecord["kind"], TaskType> = {
  record: "learning_record", analysis: "learning_evidence_analysis", prep: "lesson_suggestion", monthly: "monthly_report", daily: "monthly_report",
};
export function toTask(record: LearningRecord, contact: Conversation, feedback = false): TaskCard {
  const text = feedback ? record.feedback : record.content;
  const original = feedback ? record.aiFeedback : record.aiContent;
  const status = record.status === "running" ? "running" : record.status === "failed" ? "failed"
    : feedback ? record.feedbackStatus === "sent" ? "feedback_done" : "completed"
    : record.archivedAt ? "archived" : "completed";
  const locked = !!record.archivedAt || record.feedbackStatus === "sent";
  const actions: SkillAction[] = status === "running" ? [] : status === "failed" ? ["regenerate"]
    : feedback ? record.feedbackStatus === "sent" ? ["copy_feedback"] : ["copy_feedback", "mark_parent_sent", "make_warmer", "make_shorter", "regenerate"]
    : !text ? ["regenerate"] : [
      ...(!locked ? ["regenerate" as const] : []),
      ...(record.evidence === "observed" && record.kind !== "prep" ? [
        ...(record.feedbackStatus !== "sent" ? ["generate_feedback" as const] : []),
        ...(contact.kind === "student" && !record.archivedAt ? ["archive" as const] : []),
      ] : []),
      "generate_next_lesson",
    ];
  return {
    id: feedback ? `${record.id}:feedback` : record.id, conversationId: record.contactId, targetName: contact.name,
    skillId: feedback ? "generate_feedback" : record.kind === "record" && contact.kind === "class" ? "class_lesson_record" : recordSkill[record.kind],
    taskType: feedback ? "feedback" : taskType[record.kind], title: feedback ? `${contact.name} · 家长反馈` : record.title,
    subject: contact.subject, status, currentStepIndex: 0,
    steps: [{ label: record.error || (status === "running" ? "正在处理材料，请稍候" : text ? "整理完成" : "原始内容已保存，点击重新生成"), status: status === "running" ? "running" : status === "failed" ? "failed" : "completed" }],
    inputSummary: record.input, summary: record.error || text || "原始内容已保存", feedbackText: feedback ? text : undefined,
    detail: record.error || text, originalOutput: { display_content: original, structured_result: {} },
    currentOutput: { display_content: text, structured_result: {} },
    archivedOutput: !feedback && record.archiveContent ? { display_content: record.archiveContent, structured_result: {} } : undefined,
    structuredResult: { evidence: record.evidence, recordKind: record.kind, date: record.date, month: record.month, sourceIds: record.sourceIds, locked: feedback ? record.feedbackStatus === "sent" : locked }, actions, nextSuggestions: [],
    contextSources: [{ id: record.id, label: "老师提交的课堂记录与材料", type: "teacher_input" }],
    archiveTarget: contact.kind === "class" ? "班级课堂记录" : "学生档案 > 学习记录",
    createdAt: record.createdAt, updatedAt: record.updatedAt,
  };
}
export function toChatState(snapshot: Snapshot): ChatState {
  const conversations: Conversation[] = snapshot.contacts.map((contact, index) => {
    const records = snapshot.records.filter(r => r.contactId === contact.id);
    const latest = records.at(-1);
    return {
      id: contact.id, kind: contact.kind, name: contact.name, avatar: contact.name.slice(0, 1),
      subject: contact.subject, grade: contact.grade,
      className: contact.classIds.map(id => snapshot.contacts.find(c => c.id === id)?.name).filter(Boolean).join("、"),
      summary: latest?.title || "还没有记录", time: latest ? new Date(latest.updatedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : "",
      statusLabel: contactStatus(records, contact.kind), accent: (["green", "blue", "orange"] as const)[index % 3],
      attention: records.some(r => r.feedbackStatus === "pending" || r.status === "failed"),
      members: contact.kind === "class" ? snapshot.contacts.filter(c => c.classIds.includes(contact.id)).length : undefined,
      serviceRules: contact.serviceRules,
    };
  });
  const cards: TaskCard[] = [];
  const messages: Message[] = [];
  for (const record of snapshot.records) {
    const contact = conversations.find(c => c.id === record.contactId);
    if (!contact) continue;
    const attachments = record.attachmentIds.map(id => {
      const attachment = snapshot.attachments.find(a => a.id === id);
      return { id, fileName: attachment?.name || "学习材料", imageUrl: attachment?.type.startsWith("image/") ? `/api/xuemai/attachments/${id}` : undefined };
    });
    messages.push({ id: `${record.id}:input`, conversationId: record.contactId, sender: "teacher",
      type: attachments.length ? "image" : "text", content: record.input || (record.kind === "monthly" ? `生成 ${record.month} 学生月报` : attachments.map(a => a.fileName).join("、")), attachments, createdAt: record.createdAt });
    const task = toTask(record, contact);
    cards.push(task);
    messages.push({ id: `${record.id}:result`, conversationId: record.contactId, sender: "ai", type: "task", taskCardId: task.id, createdAt: record.createdAt });
    if (record.feedback) {
      const feedback = toTask(record, contact, true);
      cards.push(feedback);
      messages.push({ id: feedback.id, conversationId: record.contactId, sender: "ai", type: "task", taskCardId: feedback.id, createdAt: record.updatedAt });
    }
  }
  return {
    conversations: [assistantConversation, ...conversations], messages, taskCards: cards,
    timelineRecords: snapshot.records.filter(r => r.archivedAt).map(r => ({
      id: `${r.id}:archive`, conversationId: r.contactId, sourceTaskId: r.id, skillId: recordSkill[r.kind],
      title: r.title, summary: r.archiveContent || "", archiveTarget: "学生档案 > 学习记录", createdAt: r.archivedAt!,
    })),
    teacher: { contact: snapshot.teacher.identifier, nickname: snapshot.teacher.name, subjects: [snapshot.preferences.subject].filter(Boolean), teachingStages: [snapshot.preferences.grade].filter(Boolean), role: "individual" },
    preferences: { ...emptyState.preferences, feedbackTone: (["温和", "严谨", "鼓励型", "简洁型"] as const).find(t => snapshot.preferences.tone.includes(t)) || "温和" },
    currentConversationId: conversations[0]?.id || assistantConversation.id,
  };
}
