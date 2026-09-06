import { randomUUID } from "node:crypto";
import { AppError, db, defaults, get, list, mutateRecord, put, strings, text } from "./db";
import { reportSources } from "./types";
import type { Contact, LearningRecord, Preferences, RecordKind, Snapshot } from "./types";
import type { Session } from "./auth";
import { aiModel, generate } from "./ai";
import { archiveOptions, hasOutcomePromise } from "./record-content";

const now = () => new Date().toISOString();
export function preferences(owner: string): Preferences {
  const row = db().prepare("SELECT preferences FROM users WHERE id = ?").get(owner);
  return row ? JSON.parse(String(row.preferences)) : defaults;
}
export function snapshot(current: Session): Snapshot {
  const owner = current.teacher.id;
  const records = list(owner, "record");
  for (const record of records) {
    if (record.status === "running" && Date.now() - new Date(record.updatedAt).getTime() > 12 * 60_000) {
      const recovered = mutateRecord(owner, record.id, record.revision, item => { item.status = "failed"; item.error = "上次处理已中断，原始材料仍在，请重试"; });
      Object.assign(record, recovered);
    }
  }
  return { teacher: current.teacher, contacts: list(owner, "contact"), records,
    attachments: list(owner, "attachment").map(a => ({ ...a, text: "", providerTaskId: undefined })), preferences: preferences(owner),
    services: { model: aiModel(), ai: !!process.env.QWEN_API_KEY, documents: !!process.env.MINERU_API_TOKEN } };
}

export function saveContact(owner: string, body: Record<string, unknown>) {
  const kind = body.kind;
  if (kind !== "student" && kind !== "class") throw new AppError("请选择学生或班级");
  const classIds = kind === "student" ? strings(body.classIds ?? [], "班级") : [];
  for (const id of classIds) if (get(owner, "contact", id).kind !== "class") throw new AppError("班级无效");
  const previous = body.id ? get(owner, "contact", text(body.id, "对象", 100)) : undefined;
  if (previous && previous.kind !== kind) throw new AppError("不能更改对象类型");
  const serviceRules: Record<string, string | boolean> = { ...previous?.serviceRules };
  if (body.serviceRules && typeof body.serviceRules === "object" && !Array.isArray(body.serviceRules)) {
    for (const key of ["learningGoal"]) {
      const value = (body.serviceRules as Record<string, unknown>)[key];
      if (value !== undefined) serviceRules[key] = typeof value === "boolean" ? value : text(value, "服务规则", 500, false);
    }
  }
  const status = body.status ?? previous?.status ?? "active";
  if (!["active", "paused", "archived"].includes(String(status))) throw new AppError("学生服务状态不正确");
  if (status === "archived" && list(owner, "record").some(record => record.contactId === previous?.id && (record.status === "running" || record.feedbackStatus === "pending"))) throw new AppError("还有待处理或待反馈记录，暂不能归档学生");
  let parents = previous?.parents || [];
  if (body.parents !== undefined) {
    if (!Array.isArray(body.parents) || body.parents.length > 6) throw new AppError("家长关系最多 6 位");
    parents = body.parents.map(parent => ({ id: typeof parent?.id === "string" ? text(parent.id, "家长编号", 100) : randomUUID(), name: text(parent?.name, "家长称呼", 40), relation: text(parent?.relation, "关系", 20), contact: text(parent?.contact ?? "", "联系方式", 100, false) }));
  }
  const contact: Contact = { ...previous, id: previous?.id || randomUUID(), kind,
    name: text(body.name, "姓名 / 班级名", 60), subject: text(body.subject, "学科", 60), grade: text(body.grade ?? previous?.grade ?? "", "年级", 30, kind === "student"),
    classIds: body.classIds === undefined ? previous?.classIds || [] : classIds, serviceRules, status: status as Contact["status"], parents, createdAt: previous?.createdAt || now() };
  return put(owner, "contact", contact);
}

export function createRecord(owner: string, body: Record<string, unknown>) {
  const contact = get(owner, "contact", text(body.contactId, "学生 / 班级", 100));
  const kind = body.kind as RecordKind;
  if (!["record", "analysis", "monthly"].includes(kind)) throw new AppError("当前产品只支持课堂记录、材料分析和月报");
  if (contact.status === "archived" || contact.status === "paused") throw new AppError("请先恢复学生或班级服务，再添加记录");
  const isReport = kind === "monthly" || kind === "daily";
  if (isReport && contact.kind !== "student") throw new AppError("请选择一位学生生成报告");
  const input = text(body.input ?? "", "记录内容", 40_000, false);
  const attachmentIds = strings(body.attachmentIds ?? [], "附件", 5);
  for (const id of attachmentIds) get(owner, "attachment", id);
  if (!isReport && !input && !attachmentIds.length) throw new AppError("请填写课堂观察或上传材料");
  if (!attachmentIds.length && /今天讲了[…\.]+学生整体表现[…\.]+/.test(input)) throw new AppError("请把提示中的省略号替换为这节课的实际内容和表现");
  const month = kind === "monthly" ? text(body.month, "月份", 7) : "";
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new AppError("月份格式不正确");
  const date = text(body.date, "日期", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new AppError("日期格式不正确");
  const sourceIds = strings(body.sourceIds ?? [], "来源记录");
  for (const id of sourceIds) get(owner, "record", id);
  const requestId = body.requestId === undefined ? undefined : text(body.requestId, "提交编号", 100);
  if (requestId) {
    const existing = list(owner, "record").find(record => record.requestId === requestId);
    if (existing) {
      if (existing.contactId !== contact.id || existing.kind !== kind || existing.input !== input || existing.date !== date || JSON.stringify(existing.attachmentIds) !== JSON.stringify(attachmentIds)) throw new AppError("同次提交内容已改变，请重新提交", 409);
      return existing;
    }
  }
  const selectedSourceIds = body.selectedSourceIds === undefined ? undefined : strings(body.selectedSourceIds, "月报素材", 200);
  if (isReport) {
    const available = reportSources(list(owner, "record"), contact.id, "monthly", month);
    if (!available.length) throw new AppError("本月没有已入档记录，暂不能生成月报");
    if (selectedSourceIds && (!selectedSourceIds.length || selectedSourceIds.some(id => !available.some(item => item.id === id)))) throw new AppError("请选择本学生、本月份的有效月报素材");
  }
  const record: LearningRecord = { id: randomUUID(), contactId: contact.id, kind,
    title: kind === "monthly" ? `${month} 学习月报` : kind === "daily" ? `${date} 学习日报` : input.slice(0, 32) || "新材料",
    input, date, attachmentIds, month, createdAt: now(), updatedAt: now(), status: "draft", error: "",
    content: "", aiContent: "", feedback: "", aiFeedback: "", feedbackStatus: "none", archivedAt: null,
    archiveContent: null, sentContent: null, model: "", evidence: "insufficient", sourceIds, revision: 0,
    requestId, selectedSourceIds, subject: text(body.subject || contact.subject, "本次学科", 60), createdBy: owner, ...(isReport ? { reportStatus: "draft" as const } : {}) };
  return put(owner, "record", record);
}

export async function recordAction(owner: string, id: string, body: Record<string, unknown>) {
  const revision = body.revision;
  if (!Number.isInteger(revision)) throw new AppError("缺少记录版本");
  const action = body.action;
  if (action === "correct") {
    const original = get(owner, "record", id);
    if (original.revision !== revision) throw new AppError("记录已更新，请刷新", 409);
    if (original.correctedBy) return get(owner, "record", original.correctedBy);
    const pendingCorrection = list(owner, "record").find(item => item.correctionOf === id);
    if (pendingCorrection) return pendingCorrection;
    if (!original.archivedAt && original.feedbackStatus !== "sent" && original.reportStatus !== "final") throw new AppError("未确认的草稿可直接编辑");
    const correction = createRecord(owner, { contactId: original.contactId, kind: original.kind === "daily" ? "monthly" : original.kind, date: original.date, month: original.month || original.date.slice(0, 7), input: original.input, attachmentIds: original.attachmentIds, selectedSourceIds: original.selectedSourceIds });
    correction.correctionOf = id; correction.content = original.archiveContent || original.content; correction.aiContent = correction.content; correction.status = "ready"; correction.evidence = original.evidence; correction.title = `${original.title}（更正草稿）`;
    put(owner, "record", correction);
    // 草稿完成确认前，原记录仍是有效月报素材。
    return correction;
  }
  if (["generate", "feedback"].includes(String(action))) {
    const record = mutateRecord(owner, id, revision as number, item => {
      if (item.status === "running") throw new AppError("正在处理，请稍候", 409);
      if ((item.archivedAt || item.reportStatus === "final") && action === "generate") throw new AppError("已入档的正文保持不变，请另建记录");
      if (item.feedbackStatus === "sent") throw new AppError("已发送内容保持不变，请另建记录");
      if (action === "feedback" && (!item.content || item.evidence !== "observed" || item.kind === "prep")) throw new AppError("请先补充并检查学生学习事实，再生成家长反馈");
      item.status = "running"; item.error = "";
    });
    try {
      const tone = action === "feedback" && body.tone !== undefined ? text(body.tone, "反馈语气", 80) : undefined;
      const result = await generate(owner, record, get(owner, "contact", record.contactId), { ...preferences(owner), ...(tone ? { tone } : {}) }, action === "feedback");
      return mutateRecord(owner, id, record.revision, item => {
        if (action === "feedback") { item.feedback = result.content; item.aiFeedback = result.content; item.feedbackStatus = "pending"; }
        else {
          item.content = result.content; item.aiContent = result.content; item.title = result.title;
          item.evidence = result.evidence; item.sourceIds = ["monthly", "daily"].includes(record.kind) ? result.sourceIds : record.sourceIds;
          item.feedback = ""; item.aiFeedback = ""; item.feedbackStatus = "none";
        }
        item.model = result.model; item.status = "ready"; item.error = "";
      });
    } catch (error) {
      const failed = get(owner, "record", id);
      if (failed.revision === record.revision) mutateRecord(owner, id, record.revision, item => { item.status = "failed"; item.error = error instanceof AppError ? error.message : "处理未完成，请重试"; });
      throw error;
    }
  }
  return mutateRecord(owner, id, revision as number, record => {
    if (record.status === "running") throw new AppError("正在处理，请稍候", 409);
    if (action === "edit") {
      if (body.content !== undefined) {
        if (record.archivedAt || record.feedbackStatus === "sent" || record.reportStatus === "final") throw new AppError("已入档或已发送的正文保持不变，请另建记录");
        record.content = text(body.content, "结果正文", 20_000);
        if (body.evidenceConfirmed === true && record.kind !== "prep") record.evidence = "observed";
        record.feedback = ""; record.aiFeedback = ""; record.feedbackStatus = "none";
      }
      if (body.feedback !== undefined) {
        if (record.feedbackStatus === "sent") throw new AppError("已发出的反馈保留历史版本，请另建记录");
        if (record.evidence !== "observed" || record.kind === "prep") throw new AppError("请先补充学生学习事实");
        record.feedback = text(body.feedback, "家长反馈", 6000); record.feedbackStatus = "pending";
      }
      record.status = "ready"; record.error = "";
    } else if (action === "sent") {
      if (!record.feedback || record.feedbackStatus === "none") throw new AppError("还没有家长反馈草稿");
      if (hasOutcomePromise(record.feedback)) throw new AppError("反馈含有结果保证或过度承诺，请修改后再确认");
      if (body.archiveIds !== undefined) archiveSelected(owner, record, body.archiveIds);
      record.feedbackStatus = "sent"; record.sentContent = record.feedback; record.sentAt ??= now();
    } else if (action === "archive") {
      archiveSelected(owner, record, body.archiveIds);
    } else if (action === "finalize") {
      if (record.kind !== "monthly" || !record.content) throw new AppError("请先完成月报正文");
      record.reportStatus = "final";
      if (record.correctionOf) confirmCorrection(owner, record);
    } else { throw new AppError("不支持的操作"); }
    record.lastActor = owner;
  });
}

function archiveSelected(owner: string, record: LearningRecord, value: unknown) {
  if (record.archivedAt) return;
  if (!record.content || !["record", "analysis"].includes(record.kind) || record.evidence !== "observed") throw new AppError("没有足够的学生学习事实可入档");
  if (get(owner, "contact", record.contactId).kind !== "student") throw new AppError("班级共同背景不直接进入学生档案，请先生成个人记录");
  if (value === undefined) throw new AppError("请选择本次入档内容");
  const ids = strings(value, "入档内容", 100);
  const options = archiveOptions(record);
  if (!ids.length || ids.some(id => !options.some(option => option.id === id))) throw new AppError("请选择有效的入档内容");
  record.archiveIds = ids; record.archiveContent = options.filter(option => ids.includes(option.id)).map(option => option.text).join("\n\n"); record.archivedAt = now();
  if (record.correctionOf) confirmCorrection(owner, record);
}
function confirmCorrection(owner: string, record: LearningRecord) {
  const original = get(owner, "record", record.correctionOf!);
  if (original.correctedBy && original.correctedBy !== record.id) throw new AppError("已有另一份更正记录，请重新检查", 409);
  original.correctedBy = record.id;
  if (original.kind === "monthly") original.reportStatus = "corrected";
  original.revision++; original.updatedAt = now(); put(owner, "record", original);
}
