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
    .filter((task) => task.status !== "running" && task.status !== "archived")
    .map((task, index) => {
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
        deadline: getDeadline(status, index),
        deadlineHint: getDeadlineHint(status, index),
        status,
        owner: teacherName,
        kind: conversation?.kind === "class" ? "class" as const : "student" as const
      };
    });

  const students = conversations.filter((conversation) => conversation.kind === "student");
  const classes = conversations.filter((conversation) => conversation.kind === "class");
  const fallbackSeeds: Array<{ conversation?: Conversation; status: WorkStatus; title: string; source: string; deadline: string; hint: string }> = [
    { conversation: students[0], status: "待反馈", title: "课后反馈待发送", source: "课后课堂反馈", deadline: "今天 18:00", hint: "剩余 2 小时" },
    { conversation: students[1], status: "待回复", title: "家长消息待回复", source: "家长消息", deadline: "今天 20:00", hint: "剩余 4 小时" },
    { conversation: students[2], status: "待检查", title: "学习材料分析待检查", source: "学生作业材料", deadline: "明天 12:00", hint: "剩余 20 小时" },
    { conversation: students[3], status: "需关注", title: "10 天无新服务记录", source: "学生服务连续性", deadline: "—", hint: "建议今天确认" },
    { conversation: students[4], status: "待入档", title: "学习记录待入档", source: "课堂记录", deadline: "明天 18:00", hint: "反馈已完成" },
    { conversation: students[5], status: "已逾期", title: "家长跟进已逾期", source: "家长沟通", deadline: "昨天 18:00", hint: "已逾期 1 天" },
    { conversation: classes[0], status: "待反馈", title: "班级反馈草稿待逐项确认", source: "班级公共课堂记录", deadline: "后天 18:00", hint: "12 名学生" },
    { conversation: students[6] ?? students[0], status: "待回复", title: "学习目标待确认", source: "家长沟通", deadline: "后天 20:00", hint: "剩余 2 天" }
  ];

  const occupied = new Set(taskItems.map((item) => `${item.conversationId}-${item.status}`));
  const fallbackItems = fallbackSeeds
    .filter((seed): seed is typeof seed & { conversation: Conversation } => Boolean(seed.conversation))
    .filter((seed) => !occupied.has(`${seed.conversation.id}-${seed.status}`))
    .map((seed, index) => ({
      id: `service-${seed.conversation.id}-${index}`,
      conversationId: seed.conversation.id,
      targetName: seed.conversation.name,
      targetMeta: formatTargetMeta(seed.conversation),
      title: seed.title,
      source: seed.source,
      deadline: seed.deadline,
      deadlineHint: seed.hint,
      status: seed.status,
      owner: teacherName,
      kind: seed.conversation.kind === "class" ? "class" as const : "student" as const
    }));

  return [...taskItems, ...fallbackItems].sort((left, right) => getStatusPriority(left.status) - getStatusPriority(right.status));
}

export function countWorkItems(items: WorkItem[], status: WorkStatus) {
  return items.filter((item) => item.status === status).length;
}

function mapTaskStatus(task: TaskCard): WorkStatus {
  if (task.status === "failed") return "已逾期";
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

function getDeadline(status: WorkStatus, index: number) {
  if (status === "已逾期") return "昨天 18:00";
  if (status === "待反馈" || status === "待回复") return index % 2 === 0 ? "今天 18:00" : "今天 20:00";
  if (status === "需关注") return "—";
  return index % 2 === 0 ? "明天 12:00" : "明天 18:00";
}

function getDeadlineHint(status: WorkStatus, index: number) {
  if (status === "已逾期") return "已逾期 1 天";
  if (status === "需关注") return "建议今天确认";
  if (status === "待入档") return "反馈已完成";
  return index % 2 === 0 ? "剩余 2 小时" : "剩余 4 小时";
}

function getStatusPriority(status: WorkStatus) {
  return { 已逾期: 0, 待回复: 1, 待反馈: 2, 待检查: 3, 需关注: 4, 待入档: 5 }[status];
}
