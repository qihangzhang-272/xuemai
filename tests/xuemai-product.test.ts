import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TeachingContent } from "../components/xuemai-workbench/TeachingContent";
import { reportSources, type LearningRecord } from "../lib/xuemai/types";

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
