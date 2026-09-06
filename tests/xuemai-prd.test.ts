import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { archiveOptions, cardSummary } from "../lib/xuemai/record-content";

process.env.XUEMAI_DATA_DIR = mkdtempSync(path.join(tmpdir(), "xuemai-prd-"));
const { createUser, get } = await import("../lib/xuemai/db");
const { saveContact, createRecord, recordAction } = await import("../lib/xuemai/service");
const teacher = createUser("prd", "PRD老师", "unused");
const student = saveContact(teacher.id, { kind: "student", name: "验收学生", grade: "六年级", subject: "数学" });
async function observed() {
  const draft = createRecord(teacher.id, { contactId: student.id, kind: "record", input: "今天学习约分，提醒后完成订正。", date: "2026-09-06" });
  return recordAction(teacher.id, draft.id, { action: "edit", revision: draft.revision, evidenceConfirmed: true, content: "## 本次学习\n\n分数约分。\n\n## 课堂表现\n\n提醒后能独立订正。" });
}

describe("PRD 反馈与入档", () => {
  it("学生年级必填，备课和日报不再创建", () => {
    expect(() => saveContact(teacher.id, { kind: "student", name: "缺年级", subject: "数学" })).toThrow("年级");
    for (const kind of ["prep", "daily"]) expect(() => createRecord(teacher.id, { contactId: student.id, kind, input: "范围外", date: "2026-09-06" })).toThrow("当前产品");
  });
  it("同一次提交重试返回原记录，不重复插入", () => {
    const body = { contactId: student.id, kind: "record", input: "老师观察到学生完成订正。", date: "2026-09-06", requestId: "repeat-one" };
    expect(createRecord(teacher.id, body).id).toBe(createRecord(teacher.id, body).id);
  });
  it("未选内容不能入档；只选部分时不保存其余段落", async () => {
    const record = await observed();
    await expect(recordAction(teacher.id, record.id, { action: "archive", revision: record.revision })).rejects.toThrow("选择");
    const options = archiveOptions(record);
    const archived = await recordAction(teacher.id, record.id, { action: "archive", revision: record.revision, archiveIds: [options[1].id] });
    expect(archived.archiveContent).toBe(options[1].text);
    expect(archived.archiveContent).not.toContain("本次学习");
  });
  it("反馈不要求先入档，并保存实际标记时间", async () => {
    let record = await observed();
    record = await recordAction(teacher.id, record.id, { action: "edit", revision: record.revision, feedback: "家长您好，今天学习了约分，经提示完成订正。" });
    record = await recordAction(teacher.id, record.id, { action: "sent", revision: record.revision });
    expect(record.archivedAt).toBeNull();
    expect(record.sentAt).toBeTruthy();
    expect(record.sentContent).toBe(record.feedback);
  });
  it("同时入档按老师选择保存反馈，错误选项不会先标记已发", async () => {
    let record = await observed();
    record = await recordAction(teacher.id, record.id, { action: "edit", revision: record.revision, feedback: "家长您好，今天的课堂表现如下。" });
    await expect(recordAction(teacher.id, record.id, { action: "sent", revision: record.revision, archiveIds: ["unknown"] })).rejects.toThrow("入档内容");
    expect(get(teacher.id, "record", record.id).feedbackStatus).toBe("pending");
    record = await recordAction(teacher.id, record.id, { action: "sent", revision: record.revision, archiveIds: ["feedback"] });
    expect(record.archiveContent).toBe(record.feedback);
    expect(record.feedbackStatus).toBe("sent");
  });
  it("含效果保证的反馈不能标记已发", async () => {
    let record = await observed();
    record = await recordAction(teacher.id, record.id, { action: "edit", revision: record.revision, feedback: "我们保证提分二十分。" });
    await expect(recordAction(teacher.id, record.id, { action: "sent", revision: record.revision })).rejects.toThrow("承诺");
    expect(get(teacher.id, "record", record.id).feedbackStatus).toBe("pending");
  });
  it("卡片摘要按完整句子展示，原始正文不被改写", () => {
    const text = "## 学习内容\n\n今天学习分数约分。\n\n## 表现\n\n" + "提示后完成订正。".repeat(50);
    expect(cardSummary(text)).toBe("今天学习分数约分。");
    expect(text).toContain("提示后完成订正。".repeat(50));
  });
});


describe("月报素材与更正历史", () => {
  it("更正生成不重复，确认前保留原快照，确认后原记录可追溯", async () => {
    let original = await observed();
    original = await recordAction(teacher.id, original.id, { action: "archive", revision: original.revision, archiveIds: ["content:1"] });
    let correction = await recordAction(teacher.id, original.id, { action: "correct", revision: original.revision });
    expect((await recordAction(teacher.id, original.id, { action: "correct", revision: original.revision })).id).toBe(correction.id);
    expect(get(teacher.id, "record", original.id).correctedBy).toBeUndefined();
    correction = await recordAction(teacher.id, correction.id, { action: "edit", revision: correction.revision, content: "更正：在两次提醒后完成订正。" });
    correction = await recordAction(teacher.id, correction.id, { action: "archive", revision: correction.revision, archiveIds: ["content:0"] });
    const saved = get(teacher.id, "record", original.id);
    expect(saved.archiveContent).toBe(original.archiveContent);
    expect(saved.correctedBy).toBe(correction.id);
    expect(saved.revision).toBe(original.revision + 1);
  });
  it("月报只能选择本学生当月入档记录，定稿不能覆盖正文", async () => {
    let source = await observed();
    source = await recordAction(teacher.id, source.id, { action: "archive", revision: source.revision, archiveIds: ["content:1"] });
    const second = saveContact(teacher.id, { kind: "student", name: "另一位", grade: "六年级", subject: "数学" });
    const body = { contactId: student.id, kind: "monthly", month: "2026-09", date: "2026-09-06", selectedSourceIds: [source.id] };
    expect(() => createRecord(teacher.id, { ...body, contactId: second.id })).toThrow("没有已入档");
    expect(() => createRecord(teacher.id, { ...body, selectedSourceIds: ["unknown"] })).toThrow("有效月报素材");
    let monthly = createRecord(teacher.id, body);
    monthly = await recordAction(teacher.id, monthly.id, { action: "edit", revision: monthly.revision, content: "本月记录较少，以下仅反映已入档的课堂表现。", evidenceConfirmed: true });
    monthly = await recordAction(teacher.id, monthly.id, { action: "finalize", revision: monthly.revision });
    expect(monthly.reportStatus).toBe("final");
    expect(monthly.feedbackStatus).toBe("none");
    await expect(recordAction(teacher.id, monthly.id, { action: "edit", revision: monthly.revision, content: "覆盖" })).rejects.toThrow("保持不变");
    await expect(recordAction(teacher.id, monthly.id, { action: "generate", revision: monthly.revision })).rejects.toThrow("保持不变");
    expect(get(teacher.id, "record", monthly.id).status).toBe("ready");
  });
});
