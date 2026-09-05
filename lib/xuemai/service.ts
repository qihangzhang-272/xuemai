import { randomUUID } from "node:crypto";
import { AppError, db, defaults, get, list, mutateRecord, put, strings, text } from "./db";
import type { Contact, LearningRecord, Preferences, RecordKind, Snapshot } from "./types";
import type { Session } from "./auth";
import { aiModel, generate } from "./ai";

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
    services: { model: aiModel(), ai: !!process.env.QWEN_API_KEY, documents: !!process.env.MINERU_API_TOKEN, mdt: !!current.upstreamCookie } };
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
    for (const key of ["classType", "learningGoal", "frequency", "courseDay", "courseTime", "duration", "repeatSchedule", "totalLessons", "needsFeedback", "feedbackTrigger", "feedbackDeadline", "reminder", "appReminder", "wechatPush"]) {
      const value = (body.serviceRules as Record<string, unknown>)[key];
      if (value !== undefined) serviceRules[key] = typeof value === "boolean" ? value : text(value, "服务规则", 500, false);
    }
  }
  const contact: Contact = { id: previous?.id || randomUUID(), kind,
    name: text(body.name, "姓名 / 班级名", 60), subject: text(body.subject, "学科", 30), grade: text(body.grade ?? "", "年级", 30, false),
    classIds, serviceRules, createdAt: previous?.createdAt || now(), ...(previous?.mdtId ? { mdtId: previous.mdtId } : {}) };
  return put(owner, "contact", contact);
}

export function createRecord(owner: string, body: Record<string, unknown>) {
  const contact = get(owner, "contact", text(body.contactId, "学生 / 班级", 100));
  const kind = body.kind as RecordKind;
  if (!["record", "analysis", "prep", "monthly"].includes(kind)) throw new AppError("不支持的记录类型");
  if (kind === "monthly" && contact.kind !== "student") throw new AppError("请选择一位学生生成月报");
  const input = text(body.input ?? "", "记录内容", 40_000, false);
  const attachmentIds = strings(body.attachmentIds ?? [], "附件", 5);
  for (const id of attachmentIds) get(owner, "attachment", id);
  if (kind !== "monthly" && !input && !attachmentIds.length) throw new AppError("请填写课堂观察或上传材料");
  const month = kind === "monthly" ? text(body.month, "月份", 7) : "";
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new AppError("月份格式不正确");
  const date = text(body.date, "日期", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new AppError("日期格式不正确");
  const sourceIds = strings(body.sourceIds ?? [], "来源记录");
  for (const id of sourceIds) get(owner, "record", id);
  const record: LearningRecord = { id: randomUUID(), contactId: contact.id, kind,
    title: kind === "monthly" ? `${month} 学习月报` : input.slice(0, 32) || "新材料",
    input, date, attachmentIds, month, createdAt: now(), updatedAt: now(), status: "draft", error: "",
    content: "", aiContent: "", feedback: "", aiFeedback: "", feedbackStatus: "none", archivedAt: null,
    archiveContent: null, sentContent: null, model: "", evidence: kind === "prep" ? "teaching" : "insufficient", sourceIds, revision: 0 };
  return put(owner, "record", record);
}

export async function recordAction(owner: string, id: string, body: Record<string, unknown>) {
  const revision = body.revision;
  if (!Number.isInteger(revision)) throw new AppError("缺少记录版本");
  const action = body.action;
  if (["generate", "feedback"].includes(String(action))) {
    const record = mutateRecord(owner, id, revision as number, item => {
      if (item.status === "running") throw new AppError("正在处理，请稍候", 409);
      if (item.archivedAt && action === "generate") throw new AppError("已入档的正文保持不变，请另建记录");
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
          item.evidence = result.evidence; item.sourceIds = record.kind === "monthly" ? result.sourceIds : record.sourceIds;
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
        if (record.archivedAt || record.feedbackStatus === "sent") throw new AppError("已入档或已发送的正文保持不变，请另建记录");
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
      record.feedbackStatus = "sent"; record.sentContent = record.feedback;
    } else if (action === "archive") {
      if (!record.content || record.kind === "prep" || record.evidence !== "observed") throw new AppError("没有足够的学生学习事实可入档");
      if (get(owner, "contact", record.contactId).kind !== "student") throw new AppError("班级共同背景不直接进入学生档案，请先生成个人记录");
      record.archivedAt ??= now(); record.archiveContent ??= record.content;
    } else { throw new AppError("不支持的操作"); }
  });
}
