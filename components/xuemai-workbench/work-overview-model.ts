import type { Conversation, TaskCard } from "./types";

export type WorkStatus = "待反馈" | "待回复" | "待检查" | "待入档" | "需关注" | "已逾期";

export type WorkScope = "mine" | "all" | "classes";

export type WorkItem = {
  id: string;
  conversationId: string;
  taskId?: string;
  targetName: string;
  targetMeta: string;
  title: string;
  source: string;
  deadline: string;
  deadlineHint: string;
  status: WorkStatus;
  owner: string;
  kind: "student" | "class";
};

export const workStatuses: WorkStatus[] = ["待反馈", "待回复", "待检查", "待入档", "需关注", "已逾期"];

export function buildWorkItems(conversations: Conversation[], taskCards: TaskCard[], teacherName: string): WorkItem[] {
  const conversationById = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  const taskItems = taskCards
    .filter((task) => task.status !== "running" && task.status !== "archived" && task.status !== "feedback_done")
    .map((task) => {
      const conversation = conversationById.get(task.conversationId);
      const status = mapTaskStatus(task);
      return {
        id: `task-${task.id}`,
        conversationId: task.conversationId,
        taskId: task.id,
        targetName: conversation?.name ?? task.targetName,
        targetMeta: conversation ? formatTargetMeta(conversation) : task.targetName,
        title: buildTaskTitle(task, status),
        source: buildTaskSource(task),
        deadline: "未设置",
        deadlineHint: "",
        status,
        owner: teacherName,
        kind: conversation?.kind === "class" ? "class" as const : "student" as const
      };
    });

  return taskItems.sort((left, right) => getStatusPriority(left.status) - getStatusPriority(right.status));
}

export function countWorkItems(items: WorkItem[], status: WorkStatus) {
  return items.filter((item) => item.status === status).length;
}

function mapTaskStatus(task: TaskCard): WorkStatus {
  if (task.status === "failed") return "需关注";
  if (task.status === "feedback_done") return "待入档";
  if (task.status === "copied") return "待反馈";
  if (task.taskType === "feedback" || task.taskType === "batch_feedback") return "待反馈";
  return "待检查";
}

function buildTaskTitle(task: TaskCard, status: WorkStatus) {
  if (status === "待反馈") return task.title.includes("反馈") ? task.title : `${task.title}反馈待发送`;
  if (status === "待入档") return task.title.includes("入档") ? task.title : `${task.title}待入档`;
  if (status === "已逾期") return `${task.title}处理超时`;
  return task.title;
}

function buildTaskSource(task: TaskCard) {
  if (task.taskType === "monthly_report") return "月报草稿";
  if (task.taskType === "learning_evidence_analysis") return "学生学习材料";
  if (task.taskType === "learning_record") return "课堂记录";
  if (task.taskType === "feedback" || task.taskType === "batch_feedback") return "家长反馈草稿";
  return "会话结果卡片";
}

function formatTargetMeta(conversation: Conversation) {
  if (conversation.kind === "class") return `${conversation.members ?? 0} 名学生 · ${conversation.subject || "综合"}`;
  return [conversation.grade, conversation.subject, conversation.className].filter(Boolean).slice(0, 2).join(" · ");
}

function getStatusPriority(status: WorkStatus) {
  return { 已逾期: 0, 待回复: 1, 待反馈: 2, 待检查: 3, 需关注: 4, 待入档: 5 }[status];
}
