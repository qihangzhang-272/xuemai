import { beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dateLabel } from "../lib/xuemai/date";
import { contactStatus } from "../lib/xuemai/types";
import { parseAiOutput } from "../lib/xuemai/ai-output";
import type { LearningRecord } from "../lib/xuemai/types";

process.env.XUEMAI_DATA_DIR = mkdtempSync(path.join(tmpdir(), "xuemai-unit-"));
const { createUser, get, put, mutateRecord } = await import("../lib/xuemai/db");
const { createRecord, recordAction, saveContact, snapshot } = await import("../lib/xuemai/service");
const { monthlySources } = await import("../lib/xuemai/ai");
const { checkOrigin, readPassword } = await import("../lib/xuemai/auth");
const { POST: login } = await import("../app/api/xuemai/auth/route");
const teacher = createUser("unit", "单元老师", "unused");
const other = createUser("other", "其他老师", "unused");
let student: ReturnType<typeof saveContact>;
let klass: ReturnType<typeof saveContact>;
beforeAll(() => {
  klass = saveContact(teacher.id, { kind: "class", name: "六年级", subject: "数学", grade: "", classIds: [] });
  student = saveContact(teacher.id, { kind: "student", name: "小陈", subject: "数学", grade: "", classIds: [klass.id] });
});
function record(contactId = student.id) {
  return createRecord(teacher.id, { contactId, kind: "record", input: "老师观察：学生会计算但忘记约分", date: "2026-09-04", attachmentIds: [] });
}
async function observed(contactId = student.id) {
  const draft = record(contactId);
  return recordAction(teacher.id, draft.id, { action: "edit", revision: draft.revision, content: "学生经提示后能正确约分，这是本次课堂观察。", evidenceConfirmed: true });
}
describe("学脉独立闭环", () => {
  it("占位模板不能被当成实际课堂记录", () => {
    expect(() => createRecord(teacher.id, { contactId: student.id, kind: "record", date: "2026-09-05", input: "记录本节班课：今天讲了……学生整体表现……共性问题……" })).toThrow("省略号");
    expect(createRecord(teacher.id, { contactId: student.id, kind: "record", date: "2026-09-05", input: "今天讲了分数乘法，学生整体表现：小陈经提醒后完成约分。" }).status).toBe("draft");
  });
  it("日报要求明确学生和真实日期，不接受班级或无效日期", () => {
    const body = { contactId: student.id, kind: "daily", date: "2026-09-05" };
    expect(createRecord(teacher.id, body).title).toBe("2026-09-05 学习日报");
    expect(() => createRecord(teacher.id, { ...body, contactId: klass.id })).toThrow("请选择一位学生");
    expect(() => createRecord(teacher.id, { ...body, date: "2026-02-30" })).toThrow("日期格式");
  });
  it("原版表单的服务规则可持久保存，更新姓名不丢失规则", () => {
    const contact = saveContact(teacher.id, { kind: "student", name: "规则测试", subject: "数学", serviceRules: { learningGoal: "核对约分步骤", needsFeedback: true, arbitrary: "忽略" } });
    const updated = saveContact(teacher.id, { id: contact.id, kind: "student", name: "规则测试改名", subject: "数学" });
    expect(get(teacher.id, "contact", updated.id).serviceRules).toEqual({ learningGoal: "核对约分步骤", needsFeedback: true });
  });
  it("材料分析不能把仅用于备课的 teaching 类型保存为正常结果", () => {
    const analysis = { ...record(), kind: "analysis" } as LearningRecord;
    const result = { title: "学生订正分析", content: "学生先写出 6/20，经老师提示后订正为 3/10。", evidence: "teaching" };
    expect(() => parseAiOutput(JSON.stringify(result), analysis, false)).toThrow("证据类型");
    expect(parseAiOutput(JSON.stringify({ ...result, evidence: "observed" }), analysis, false).evidence).toBe("observed");
    expect(parseAiOutput(JSON.stringify({ ...result, content: "空白练习，无学生学习痕迹。", evidence: "insufficient" }), analysis, false).evidence).toBe("insufficient");
  });
  it("密码保留首尾空格并按字节限制，不默默更改老师凭据", () => {
    expect(readPassword(" secret123 ")).toBe(" secret123 ");
    expect(() => readPassword("密".repeat(25))).toThrow("72 字节");
    expect(() => readPassword(null)).toThrow("请输入密码");
  });
  it("反馈正文不要求模型生成不存在的标题或重复证据分类", () => {
    const draft = record();
    const parsed = parseAiOutput('{"content":"家长您好，这是本次课堂观察。"}', draft, true);
    expect(parsed.title).toBe(draft.title);
    expect(parsed.content).toContain("家长您好");
    expect(() => parseAiOutput('{"content":""}', draft, true)).toThrow();
    expect(() => parseAiOutput('{"content":"只有正文的分析"}', draft, false)).toThrow();
  });
  it("不把原始记录自动当作已反馈或已入档", () => {
    const draft = record();
    expect(draft.feedbackStatus).toBe("none"); expect(draft.archivedAt).toBeNull();
  });
  it("跨老师记录和班级不能读取或绑定", () => {
    const draft = record();
    expect(() => get(other.id, "record", draft.id)).toThrow("不属于");
    expect(() => saveContact(other.id, { kind: "student", name: "越权", subject: "数学", classIds: [klass.id] })).toThrow();
  });
  it("并发修改拒绝旧版本，不覆盖新正文", async () => {
    const draft = record();
    await recordAction(teacher.id, draft.id, { action: "edit", revision: 0, content: "新正文" });
    await expect(recordAction(teacher.id, draft.id, { action: "edit", revision: 0, content: "覆盖" })).rejects.toThrow("已在其他操作");
    expect(get(teacher.id, "record", draft.id).content).toBe("新正文");
  });
  it("生成后的新待反馈优先于历史已反馈", () => {
    const draft = record();
    expect(contactStatus([{ ...draft, feedbackStatus: "sent" }, { ...draft, feedbackStatus: "pending" }])).toBe("待反馈");
  });
  it("确认发送与确认入档保持独立", async () => {
    let draft = await observed();
    draft = await recordAction(teacher.id, draft.id, { action: "edit", revision: draft.revision, feedback: "家长您好，这是本次观察。" });
    expect(draft.archivedAt).toBeNull(); expect(draft.feedbackStatus).toBe("pending");
    draft = await recordAction(teacher.id, draft.id, { action: "sent", revision: draft.revision });
    expect(draft.archivedAt).toBeNull(); expect(draft.sentContent).toBe(draft.feedback);
    draft = await recordAction(teacher.id, draft.id, { action: "archive", revision: draft.revision });
    expect(draft.archiveContent).toBe(draft.content);
    await expect(recordAction(teacher.id, draft.id, { action: "edit", revision: draft.revision, content: "覆盖" })).rejects.toThrow("保持不变");
  });
  it("无学生证据与班级公共背景不能直接入学生档案", async () => {
    const noEvidence = record();
    await expect(recordAction(teacher.id, noEvidence.id, { action: "archive", revision: noEvidence.revision })).rejects.toThrow();
    const shared = await observed(klass.id);
    await expect(recordAction(teacher.id, shared.id, { action: "archive", revision: shared.revision })).rejects.toThrow("班级共同背景");
  });
  it("月报只取当前学生、当月、已入档的课堂及分析快照", async () => {
    let archived = await observed();
    archived = await recordAction(teacher.id, archived.id, { action: "archive", revision: archived.revision });
    const draft = record();
    const query = { ...draft, kind: "monthly", month: "2026-09" } as LearningRecord;
    const ids = monthlySources(teacher.id, query).map(r => r.id);
    expect(ids).toContain(archived.id); expect(ids).not.toContain(draft.id);
    expect(monthlySources(teacher.id, { ...query, month: "2026-08" })).toEqual([]);
  });
  it("模型失败保留原输入，记录为可重试错误", async () => {
    vi.stubEnv("QWEN_API_KEY", "");
    const draft = record();
    await expect(recordAction(teacher.id, draft.id, { action: "generate", revision: 0 })).rejects.toThrow("尚未配置");
    const failed = get(teacher.id, "record", draft.id);
    expect(failed.status).toBe("failed"); expect(failed.input).toBe(draft.input); expect(failed.content).toBe("");
    vi.unstubAllEnvs();
  });
  it("长时间中断的请求能恢复成明确失败状态", () => {
    const draft = record();
    put(teacher.id, "record", { ...draft, status: "running", updatedAt: "2020-01-01T00:00:00Z" });
    snapshot({ teacher, tokenHash: "test" });
    expect(get(teacher.id, "record", draft.id).status).toBe("failed");
  });
  it("事务失败回滚，原版本保持", () => {
    const draft = record();
    expect(() => mutateRecord(teacher.id, draft.id, 0, item => { item.content = "临时"; throw new Error("失败"); })).toThrow();
    expect(get(teacher.id, "record", draft.id).revision).toBe(0);
    expect(get(teacher.id, "record", draft.id).content).toBe("");
  });
  it("127.0.0.1 请求不被 Next 内部 localhost URL 误拒绝，跨站仍拒绝", () => {
    expect(() => checkOrigin(new Request("http://localhost:3016/api/xuemai/auth", { headers: { host: "127.0.0.1:3016", origin: "http://127.0.0.1:3016" } }))).not.toThrow();
    expect(() => checkOrigin(new Request("http://localhost:3016/api/xuemai/auth", { headers: { host: "127.0.0.1:3016", origin: "https://untrusted.example" } }))).toThrow();
  });
  it("拒绝旧项目登录方式，不发起旧服务请求", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const response = await login(new Request("http://localhost/api/xuemai/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "mdt", identifier: "retired-mode", password: "test-password" }) }));
      expect(response.status).toBe(400);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(snapshot({ teacher, tokenHash: "test" }).services).not.toHaveProperty("mdt");
    } finally { fetchSpy.mockRestore(); }
  });
  it("日期标签不会在负时区回退一天", () => { expect(dateLabel("2026-09-04")).toBe("9月4日"); });
});
