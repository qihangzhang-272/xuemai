import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TeachingContent } from "../components/xuemai-workbench/TeachingContent";
import { reportSources, type LearningRecord } from "../lib/xuemai/types";
import { SkillCard } from "../components/xuemai-workbench/SkillCard";
import { TaskReviewPanel } from "../components/xuemai-workbench/ContextPanel";
import { StudentProfileWorkspace } from "../components/xuemai-workbench/StudentDetailModal";
import { LoginScreen } from "../components/xuemai-workbench/Panels";
import { toTask, nextClassroomStep } from "../components/xuemai-workbench/backend-adapter";
import { isPrimarySkillCardAction, getTaskActionLabel, getSkillCardVersionMeta } from "../components/xuemai-workbench/skill-card-version";
import type { Conversation, TimelineRecord } from "../components/xuemai-workbench/types";

const student: Conversation = { id: "student", kind: "student", name: "演示学生", avatar: "演", className: "", subject: "数学", grade: "六年级", summary: "", time: "", statusLabel: "", accent: "green" };
const lesson = (changes: Partial<LearningRecord> = {}): LearningRecord => ({ id: "lesson", contactId: "student", kind: "record", title: "本次课堂", input: "老师观察", date: "2026-09-05", attachmentIds: [], createdAt: "2026-09-05T12:00:00Z", updatedAt: "2026-09-05T12:00:00Z", status: "ready", error: "", content: "学生能完成订正。", aiContent: "学生能完成订正。", feedback: "", aiFeedback: "", feedbackStatus: "none", archivedAt: null, archiveContent: null, sentContent: null, model: "test", evidence: "observed", sourceIds: [], month: "", revision: 1, ...changes });

describe("老师阅读与报告范围", () => {
  it("标题、分段和公式正常显示，公式代码不直接露出", () => {
    const html = renderToStaticMarkup(createElement(TeachingContent, { text: "## 计算方法\n\n1. 先约分\n2. 再相乘\n\n\\(\\frac{1}{2}\\times\\frac{2}{3}\\)" }));
    expect(html).toContain("<h2");
    expect(html).toContain("<ol");
    expect(html).toContain('class="katex"');
    expect(html).not.toContain("\\(");
  });
  it("模型正文不能执行 HTML、脚本链接或加载外部图片", () => {
    const html = renderToStaticMarkup(createElement(TeachingContent, { text: '<script>alert(1)</script>\n\n[点击](javascript:alert)\n\n![图](https://example.com/tracker.png)' }));
    expect(html).not.toContain("<script");
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain("<img");
  });
  it("报告只选对应学生和时间范围的已确认学习记录", () => {
    const record = (id: string, changes = {}) => ({ id, contactId: "a", date: "2026-09-05", kind: "record", archivedAt: "2026-09-05T12:00:00Z", archiveContent: "完成订正", ...changes }) as LearningRecord;
    const records = [record("today"), record("other-day", { date: "2026-09-04" }), record("other-month", { date: "2026-08-05" }), record("other-student", { contactId: "b" }), record("draft", { archivedAt: null }), record("prep", { kind: "prep" }), record("monthly", { kind: "monthly" })];
    expect(reportSources(records, "a", "daily", "2026-09-05").map(r => r.id)).toEqual(["today"]);
    expect(reportSources(records, "a", "monthly", "2026-09").map(r => r.id)).toEqual(["today", "other-day"]);
  });
});

describe("独立演示的操作动线", () => {
  it("入档后正文最后一段与公式保留，卡片不再以固定高度裁切", () => {
    const text = "## 本次课堂\n\n" + "老师观察到学生完成订正。\n\n".repeat(12) + "\\(\\frac{6}{20}=\\frac{3}{10}\\)\n\n最后一段：下次课继续观察主动检查。";
    const task = toTask(lesson({ archivedAt: "2026-09-05T12:01:00Z", archiveContent: text, content: text }), student);
    const html = renderToStaticMarkup(createElement(SkillCard, { task, conversation: student, onAction: () => {} }));
    expect(html).toContain("最后一段：下次课继续观察主动检查。");
    expect(html).toContain('class="katex"');
    expect(html).not.toMatch(/max-h-|line-clamp-|overflow-hidden/);
    expect(html).toContain("生成家长反馈");
  });
  it("记录先入档，反馈复制后再标记已发，每个状态只突出一个操作", () => {
    const recordTask = toTask(lesson(), student);
    const feedbackTask = toTask(lesson({ feedback: "家长您好", feedbackStatus: "pending" }), student, true);
    const copiedTask = { ...feedbackTask, status: "copied" as const };
    for (const task of [recordTask, feedbackTask, copiedTask]) expect(task.actions?.filter(action => isPrimarySkillCardAction(task, action))).toHaveLength(1);
    expect(isPrimarySkillCardAction(recordTask, "archive")).toBe(true);
    expect(isPrimarySkillCardAction(feedbackTask, "copy_feedback")).toBe(true);
    expect(isPrimarySkillCardAction(copiedTask, "mark_parent_sent")).toBe(true);
  });
  it("已有反馈入口明确为查看，下一步提示随记录状态推进", () => {
    const record = lesson({ archivedAt: "2026-09-05T12:01:00Z", archiveContent: "已确认", feedback: "家长您好", feedbackStatus: "pending" });
    expect(getTaskActionLabel(toTask(record, student), "generate_feedback")).toBe("查看家长反馈");
    expect(nextClassroomStep()).toContain("整理记录");
    expect(nextClassroomStep(lesson())).toContain("确认并入档");
    expect(nextClassroomStep(record)).toContain("复制到微信");
    expect(nextClassroomStep({ ...record, feedbackStatus: "sent" })).toContain("已完成");
  });
  it("已确认的日报突出复制正文，老师修改过的版本能够对照原稿", () => {
    const report = toTask(lesson({ kind: "daily", archivedAt: "2026-09-05T12:01:00Z", archiveContent: "日报正文" }), student);
    expect(isPrimarySkillCardAction(report, "copy_feedback")).toBe(true);
    expect(getTaskActionLabel(report, "copy_feedback")).toBe("复制正文");
    const edited = toTask(lesson({ content: "老师补充的课堂表现", aiContent: "AI 整理的原文" }), student);
    expect(getSkillCardVersionMeta(edited).isEdited).toBe(true);
    expect(getSkillCardVersionMeta(edited).editLabel).toBe("老师已修改");
  });
  it("日报详情入档后仍能复制正文，提示与当前任务一致", () => {
    const draft = lesson({ kind: "daily" });
    expect(nextClassroomStep(draft)).toContain("检查学习报告");
    const archived = { ...draft, archivedAt: "2026-09-05T12:01:00Z", archiveContent: "日报正文" };
    expect(nextClassroomStep(archived)).toContain("复制正文");
    const html = renderToStaticMarkup(createElement(TaskReviewPanel, { task: toTask(archived, student) }));
    expect(html).toMatch(/<button[^>]*>复制正文<\/button>/);
    expect(html).toContain("报告已入档，可复制正文分享给家长");
    expect(html.indexOf(">复制正文</button>")).toBeLessThan(html.indexOf("更多操作"));
  });
  it("已反馈详情不再提示重复发送", () => {
    const task = toTask(lesson({ feedback: "家长您好", feedbackStatus: "sent" }), student, true);
    const html = renderToStaticMarkup(createElement(TaskReviewPanel, { task }));
    expect(html).toContain("已标记发送，正文已保存，可再次复制留用");
    expect(html).not.toContain("检查称呼与内容后，复制到微信发送");
  });
  it("档案正文也渲染标题与公式，不暴露公式代码", () => {
    const records: TimelineRecord[] = [{ id: "one", conversationId: student.id, sourceTaskId: "one", title: "课堂观察", summary: "## 本次表现\n\n计算过程：\\(\\frac{6}{20}=\\frac{3}{10}\\)", archiveTarget: "学生档案", createdAt: "2026-09-05T12:00:00Z" }];
    const html = renderToStaticMarkup(createElement(StudentProfileWorkspace, { student, taskCards: [], timelineRecords: records }));
    expect(html).toContain('class="katex"');
    expect(html).not.toContain("## 本次表现");
    expect(html).not.toContain("\\(");
  });
  it("档案保留超过六条的完整历史，不显示无效语音和画像入口", () => {
    const records: TimelineRecord[] = Array.from({ length: 8 }, (_, index) => ({ id: String(index), conversationId: student.id, sourceTaskId: String(index), skillId: "monthly_report", title: `第${index + 1}份报告`, summary: "真实课堂摘要", archiveTarget: "学生档案", createdAt: `2026-09-0${index + 1}T12:00:00Z` }));
    const html = renderToStaticMarkup(createElement(StudentProfileWorkspace, { student, taskCards: [], timelineRecords: records, onOpenTask: () => {} }));
    expect(html.match(/查看完整内容/g)).toHaveLength(8);
    expect(html).toContain("第1份报告");
    expect(html).not.toMatch(/语音|AI 沉淀标签|AI 建议下一步|询问 AI 助教/);
  });
  it("登录页只呈现学脉账号，不暴露旧项目登录或空自动化承诺", () => {
    const html = renderToStaticMarkup(createElement(LoginScreen, { onLogin: async () => {} }));
    expect(html).toContain("登录学脉");
    expect(html).not.toMatch(/多维|MDT|选择老师身份|自动化提醒|服务闭环/);
  });
});
