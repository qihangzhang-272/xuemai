import { describe, expect, it, vi } from "vitest";
import { backend, displayTaskTitle, emptyState, isFeedback, recordId, toChatState } from "../components/xuemai-workbench/backend-adapter";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkOverviewPanel } from "../components/xuemai-workbench/WorkOverviewPanel";
const workMarkup = (state: ReturnType<typeof toChatState>) => renderToStaticMarkup(createElement(WorkOverviewPanel, { conversations: state.conversations, taskCards: state.taskCards, timelineRecords: state.timelineRecords, teacherName: "测试老师", onOpenNavigation: () => {}, onEnter: () => {} }));
import type { LearningRecord, Snapshot } from "../lib/xuemai/types";

const fixture = (): Snapshot => ({
  teacher: { id: "teacher-a", name: "测试老师", identifier: "qa" },
  contacts: [{ id: "student-a", kind: "student", name: "测试学生", subject: "数学", grade: "六年级", classIds: [], createdAt: "2026-09-04T12:00:00Z" }],
  records: [], attachments: [], preferences: { subject: "数学", grade: "六年级", tone: "温和", address: "家长" },
  services: { ai: true, documents: true, model: "test" },
});
const record = (patch: Partial<LearningRecord> = {}): LearningRecord => ({
  id: "record-a", contactId: "student-a", kind: "record", title: "课堂观察", input: "学生完成订正",
  date: "2026-09-04", attachmentIds: [], createdAt: "2026-09-04T12:00:00Z", updatedAt: "2026-09-04T12:00:00Z",
  status: "ready", error: "", content: "经提醒后完成约分", aiContent: "经提醒后完成约分",
  feedback: "今天完成了约分订正", aiFeedback: "今天完成了约分订正", feedbackStatus: "pending",
  archivedAt: null, archiveContent: null, sentContent: null, model: "test", evidence: "observed", sourceIds: [], month: "", revision: 1, ...patch,
});
describe("原版前端的真实数据适配", () => {
  it("处理入口保留学生上下文，不重复姓名", () => {
    expect(displayTaskTitle({ targetName: "小雨", title: "小雨 · 家长反馈" })).toBe("小雨 · 家长反馈");
    expect(displayTaskTitle({ targetName: "小雨", title: "课堂记录" })).toBe("小雨 · 课堂记录");
  });
  it("连接失败时提示下一步，不向老师暴露英文浏览器错误", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(backend("records", {})).rejects.toThrow("连接暂时中断，请检查连接后重试");
  });
  it("空账号不补演示学生、待办或档案", () => {
    const state = toChatState({ ...fixture(), contacts: [] });
    expect(state.conversations).toEqual(emptyState.conversations);
    expect(workMarkup(state)).toContain("当前没有待发的反馈");
    expect(workMarkup(state)).not.toMatch(/批量分配|今日日程|待回复/);
    expect(state.timelineRecords).toEqual([]);
  });
  it("反馈与学习正文分卡展示，发送状态不能代替入档", () => {
    const state = toChatState({ ...fixture(), records: [record({ feedbackStatus: "sent", sentContent: "已发送版本" })] });
    const [content, feedback] = state.taskCards;
    expect(content.status).toBe("completed");
    expect(feedback.status).toBe("feedback_done");
    expect(isFeedback(feedback)).toBe(true);
    expect(recordId(feedback)).toBe("record-a");
    expect(content.structuredResult?.locked).toBe(true);
    expect(state.timelineRecords).toHaveLength(0);
  });
  it("归档展示确认快照，不能混用后来生成的反馈", () => {
    const state = toChatState({ ...fixture(), records: [record({ archivedAt: "2026-09-04T13:00:00Z", archiveContent: "老师确认版本" })] });
    expect(state.taskCards[0].archivedOutput?.display_content).toBe("老师确认版本");
    expect(state.timelineRecords[0].summary).toBe("老师确认版本");
    expect(state.taskCards[1].status).toBe("completed");
  });
  it("无学习证据不提供反馈或入档操作，失败不伪造逾期", () => {
    const state = toChatState({ ...fixture(), records: [record({ feedback: "", feedbackStatus: "none", evidence: "insufficient" })] });
    expect(state.taskCards[0].actions).not.toContain("archive");
    expect(state.taskCards[0].actions).not.toContain("generate_feedback");
    const failed = toChatState({ ...fixture(), records: [record({ status: "failed", error: "解析失败", feedback: "" })] });
    const work = workMarkup(failed);
    expect(work).toContain("需重试");
    expect(work).toContain("解析失败");
    expect(work).not.toContain("逾期");
    expect(failed.taskCards[0].detail).toBe("解析失败");
  });
});
