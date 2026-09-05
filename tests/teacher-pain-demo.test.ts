import { describe, expect, it } from "vitest";
import { demoTasks } from "@/components/teacher-demo/demo-data";
import { completeDemoTask, filterTasksForView, getNextPendingTask, getTaskStatusCount, getTaskStatusLabel } from "@/components/teacher-demo/demo-state";

describe("teacher pain demo state", () => {
  it("uses teacher-facing status labels", () => {
    expect(getTaskStatusLabel("pending_feedback")).toBe("待反馈");
    expect(getTaskStatusLabel("pending_reply")).toBe("待回复");
    expect(getTaskStatusLabel("needs_review")).toBe("待检查");
  });

  it("keeps parent replies in the message view", () => {
    const messages = filterTasksForView(demoTasks, "messages");
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.every((task) => task.kind === "parent_reply")).toBe(true);
  });

  it("completes only the selected task and advances to pending work", () => {
    const firstId = demoTasks[0].id;
    const updated = completeDemoTask(demoTasks, firstId);
    expect(updated.find((task) => task.id === firstId)?.status).toBe("done");
    expect(getTaskStatusCount(updated, "done")).toBe(1);
    expect(getNextPendingTask(updated, firstId)?.id).not.toBe(firstId);
  });
});
