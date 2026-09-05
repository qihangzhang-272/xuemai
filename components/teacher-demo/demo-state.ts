import type { DemoTask, DemoTaskStatus } from "./types";

export function getTaskStatusLabel(status: DemoTaskStatus) {
  const labels: Record<DemoTaskStatus, string> = {
    pending_feedback: "待反馈",
    pending_reply: "待回复",
    needs_review: "待检查",
    needs_attention: "需关注",
    done: "已完成"
  };
  return labels[status];
}

export function getTaskStatusCount(tasks: DemoTask[], status: DemoTaskStatus) {
  return tasks.filter((task) => task.status === status).length;
}

export function completeDemoTask(tasks: DemoTask[], taskId: string) {
  return tasks.map((task) => (task.id === taskId ? { ...task, status: "done" as const } : task));
}

export function getNextPendingTask(tasks: DemoTask[], currentTaskId: string) {
  const currentIndex = tasks.findIndex((task) => task.id === currentTaskId);
  const ordered = [...tasks.slice(currentIndex + 1), ...tasks.slice(0, Math.max(currentIndex, 0))];
  return ordered.find((task) => task.status !== "done") ?? null;
}

export function filterTasksForView(tasks: DemoTask[], view: "today" | "messages") {
  if (view === "messages") return tasks.filter((task) => task.kind === "parent_reply");
  return tasks;
}
