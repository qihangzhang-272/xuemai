"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Archive, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, ClipboardCheck, Copy, Download, FileText, LayoutDashboard, LoaderCircle, LogOut, MessageSquare, Paperclip, Plus, Search, Send, Settings, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { contactStatus, kindLabels, type Attachment, type Contact, type LearningRecord, type Preferences, type RecordKind, type Snapshot } from "@/lib/xuemai/types";
import { dateLabel as displayDate } from "@/lib/xuemai/date";
import "./workspace.css";

type Mode = "overview" | "chat" | "students" | "classes" | "settings";
const today = () => new Date().toLocaleDateString("en-CA");
async function api<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(`/api/xuemai/${path}`, body === undefined ? { cache: "no-store" } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "操作未完成，请重试");
  return data;
}
function Spinner() { return <LoaderCircle size={17} className="xm-spin" aria-hidden="true" />; }

export function Workspace() {
  const [state, setState] = useState<Snapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("overview");
  const [activeId, setActiveId] = useState("");
  const [detailId, setDetailId] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<"student" | "class" | Contact | null>(null);
  const [busy, setBusy] = useState<string[]>([]);
  const [mobileList, setMobileList] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [overviewFilter, setOverviewFilter] = useState<"pending" | "archived" | "all">("all");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/xuemai/state", { cache: "no-store" });
    if (response.status === 401) { setState(null); setLoaded(true); return; }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "加载失败");
    setState(data); setLoaded(true);
  }, []);
  useEffect(() => { void refresh().catch(e => { setError(e.message); setLoaded(true); }); }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const running = state?.records.some(record => record.status === "running");
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => { void refresh().catch(() => {}); }, 5000);
    return () => clearInterval(timer);
  }, [running, refresh]);

  async function execute<T,>(work: () => Promise<T>, success = ""): Promise<T | undefined> {
    setError("");
    try { const result = await work(); await refresh(); if (success) setNotice(success); return result; }
    catch (e) { setError(e instanceof Error ? e.message : "操作未完成"); await refresh().catch(() => {}); }
  }
  function openContact(contact: Contact, recordId = "") { setActiveId(contact.id); setMode("chat"); setDetailId(recordId); setMobileList(false); }
  async function action(record: LearningRecord, act: string, extra: Record<string, unknown> = {}) {
    if (busy.includes(record.id)) return;
    setBusy(ids => [...ids, record.id]);
    const isGeneration = act === "generate" || act === "feedback";
    if (isGeneration) setState(s => s && ({ ...s, records: s.records.map(r => r.id === record.id ? { ...r, status: "running", error: "" } : r) }));
    const result = await execute(() => api<LearningRecord>(`records/${record.id}`, { action: act, revision: record.revision, ...extra }, "PATCH"), act === "archive" ? "已确认入档，可用于学生月报" : act === "sent" ? "已标记为已反馈" : act === "edit" ? "修改已保存" : "");
    setBusy(ids => ids.filter(id => id !== record.id));
    return result;
  }
  async function create(body: Record<string, unknown>, generate = true) {
    const result = await execute(() => api<LearningRecord>("records", body));
    if (result) { if (body.contactId === (activeId || state?.contacts[0]?.id)) setDetailId(result.id); if (generate) void action(result, "generate"); else setNotice("原始内容已保存，可稍后整理"); }
    return result;
  }
  if (!loaded) return <div className="xm-loading"><Spinner /><span>正在打开学脉…</span></div>;
  if (!state) return <><Login onDone={refresh} />{error && <div className="xm-global-error" role="alert">{error}<button onClick={() => { setError(""); void refresh().catch(e => setError(e.message)); }}>重试</button></div>}</>;

  const active = state.contacts.find(contact => contact.id === activeId) || state.contacts[0];
  const selected = state.records.find(record => record.id === detailId);
  const records = state.records.filter(record => record.contactId === active?.id);
  const contacts = state.contacts.filter(contact => `${contact.name}${contact.subject}${contact.grade}`.includes(search));
  const students = state.contacts.filter(contact => contact.kind === "student");
  const classes = state.contacts.filter(contact => contact.kind === "class");
  const nav = [{ id: "overview", label: "工作台", icon: LayoutDashboard }, { id: "chat", label: "会话", icon: MessageSquare }, { id: "students", label: "学生", icon: BookOpen }, { id: "classes", label: "班级", icon: Users }, { id: "settings", label: "我的", icon: Settings }] as const;
  const pending = state.records.filter(r => r.feedbackStatus === "pending");
  const archived = state.records.filter(r => r.archivedAt);

  return <div className="xm-app">
    <nav className="xm-rail" aria-label="主导航">
      <button className="xm-brand" onClick={() => setMode("overview")} aria-label="学脉首页"><Image src="/xuemai-logo.png" alt="学脉" width={38} height={38} /></button>
      <div className="xm-nav-items">{nav.map(item => <button key={item.id} aria-current={mode === item.id ? "page" : undefined} onClick={() => { setMode(item.id); setDetailId(""); }}><item.icon size={21} /><span>{item.label}</span></button>)}</div>
      <span className="xm-teacher-avatar" title={state.teacher.name}>{state.teacher.name.slice(0, 1)}</span>
    </nav>

    {mode === "chat" && <aside className={`xm-contacts ${mobileList ? "is-open" : ""}`}>
      <div className="xm-list-title"><h1>会话</h1><button aria-label="新建学生" className="xm-icon" onClick={() => setCreating("student")}><Plus size={19} /></button></div>
      <label className="xm-search"><Search size={16} /><input placeholder="搜索学生、班级" aria-label="搜索学生、班级" value={search} onChange={e => setSearch(e.target.value)} /></label>
      {(["student", "class"] as const).map(kind => <section key={kind} className="xm-contact-group"><h2>{kind === "student" ? "我的学生" : "我的班级"}<span>{contacts.filter(c => c.kind === kind).length}</span></h2>
        {contacts.filter(c => c.kind === kind).map(contact => <button className={`xm-contact ${active?.id === contact.id ? "selected" : ""}`} key={contact.id} onClick={() => openContact(contact)}>
          <span className={`xm-avatar ${contact.kind}`}>{contact.kind === "class" ? <Users size={20} /> : contact.name.slice(-2)}</span>
          <span className="xm-contact-info"><strong>{contact.name}</strong><small>{contact.subject} · {contactStatus(state.records.filter(r => r.contactId === contact.id), contact.kind)}</small></span>
          {state.records.some(r => r.contactId === contact.id && r.feedbackStatus === "pending") && <span className="xm-dot" aria-label="有待反馈" />}
        </button>)}
      </section>)}
      {!contacts.length && <p className="xm-list-empty">还没有匹配的会话</p>}
      <button className="xm-list-footer" onClick={() => setMode("settings")}><Download size={15} />从教学后端导入<ChevronRight size={14} /></button>
    </aside>}

    <main className={`xm-main ${mode === "chat" ? "xm-chat-main" : ""}`}>
      {mode === "overview" && <div className="xm-page">
        <header className="xm-page-header"><div><p className="xm-eyebrow">{displayDate(today())} · 教学服务工作台</p><h1>{state.teacher.name}，把每一次进步留下来。</h1><p>记录课堂，整理学习证据，把具体的反馈带给家长。</p></div><Button icon={<Plus size={16} />} onClick={() => setCreating("student")}>添加学生</Button></header>
        <section className="xm-metrics" aria-label="教学概况">
          <button onClick={() => setMode("students")}><span>服务中的学生</span><strong>{students.length}<small>位</small></strong><span>查看学生<ArrowRight size={14} /></span></button>
          <button className="xm-metric-focus" onClick={() => setOverviewFilter("pending")}><span>待完成家长反馈</span><strong>{pending.length}<small>条</small></strong><span>进入检查<ArrowRight size={14} /></span></button>
          <button onClick={() => setOverviewFilter("archived")}><span>已确认的学习记录</span><strong>{archived.length}<small>条</small></strong><span>查看学生档案<ArrowRight size={14} /></span></button>
        </section>
        <div className="xm-overview-grid"><section>
          <div className="xm-section-title"><h2>{overviewFilter === "pending" ? "待反馈" : overviewFilter === "archived" ? "已入档记录" : "最近的教学服务"}</h2><button onClick={() => setOverviewFilter("all")}>全部记录</button></div>
          <div className="xm-activity-list">{[...state.records].reverse().filter(r => overviewFilter === "pending" ? r.feedbackStatus === "pending" : overviewFilter === "archived" ? !!r.archivedAt : true).slice(0, 15).map(record => {
            const contact = state.contacts.find(c => c.id === record.contactId)!;
            return <button key={record.id} onClick={() => openContact(contact, record.id)}><span className="xm-activity-icon"><FileText size={19} /></span><span><strong>{record.title}</strong><small>{contact.name} · {kindLabels[record.kind]} · {record.date}</small></span><span className="xm-tag">{record.status === "running" ? "处理中" : record.status === "failed" ? "需重试" : record.feedbackStatus === "pending" ? "待反馈" : record.archivedAt ? "已入档" : record.feedbackStatus === "sent" ? "已反馈" : "已保存"}</span><ChevronRight size={16} /></button>;
          })}{!state.records.filter(r => overviewFilter === "pending" ? r.feedbackStatus === "pending" : overviewFilter === "archived" ? !!r.archivedAt : true).length && <Empty title="从一条课堂记录开始" text="选择一位学生，写下今天的学习内容和你观察到的表现。" action={() => { if (active) openContact(active); else setCreating("student"); }} label={active ? "去记录" : "添加第一位学生"} />}</div>
        </section><aside className="xm-guide"><div className="xm-guide-icon"><BookOpen size={25} /></div><h2>让教学服务<br />顺着课堂发生。</h2><p>一次记录，逐步沉淀。每一步都由你确认。</p><ol><li><b>01</b><span>留下真实的课堂观察<small>文字、图片和教学资料</small></span></li><li><b>02</b><span>检查 AI 整理的草稿<small>补充事实，调整表达</small></span></li><li><b>03</b><span>把具体反馈带给家长<small>复制到微信，确认后入档</small></span></li></ol><span className="xm-guide-foot">学脉 · 让学习的脉络更清楚</span></aside></div>
      </div>}

      {(mode === "students" || mode === "classes") && <div className="xm-page">
        <header className="xm-page-header"><div><p className="xm-eyebrow">持续的学习关系</p><h1>{mode === "students" ? "我的学生" : "我的班级"}</h1><p>{mode === "students" ? "课堂、反馈与成长，都围绕同一位学生持续记录。" : "共同的课堂背景，独立的学生反馈。"}</p></div><Button onClick={() => setCreating(mode === "students" ? "student" : "class")} icon={<Plus size={16} />}>{mode === "students" ? "添加学生" : "新建班级"}</Button></header>
        <label className="xm-search xm-table-search"><Search size={16} /><input aria-label="搜索名单" placeholder="搜索姓名、学科或年级" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className="xm-directory">{contacts.filter(c => c.kind === (mode === "students" ? "student" : "class")).map(contact => <article key={contact.id}>
          <span className={`xm-avatar ${contact.kind}`}>{contact.kind === "class" ? <Users size={23} /> : contact.name.slice(-2)}</span><div><h2>{contact.name}</h2><p>{contact.grade || "年级待补充"} · {contact.subject}</p><small>{contact.kind === "class" ? `${students.filter(s => s.classIds.includes(contact.id)).length} 位学生` : contact.classIds.map(id => classes.find(c => c.id === id)?.name).filter(Boolean).join("、") || "独立授课"}</small></div>
          <span className="xm-tag">{contactStatus(state.records.filter(r => r.contactId === contact.id), contact.kind)}</span><div className="xm-directory-actions"><Button variant="ghost" onClick={() => setCreating(contact)}>编辑</Button><Button variant="secondary" onClick={() => openContact(contact)}>进入会话<ArrowRight size={15} /></Button></div>
        </article>)}</div>
        {!contacts.filter(c => c.kind === (mode === "students" ? "student" : "class")).length && <Empty title={mode === "students" ? "还没有学生" : "还没有班级"} text="可以手动添加，也可以从已有教学后端导入。" action={() => setCreating(mode === "students" ? "student" : "class")} label="现在添加" />}
      </div>}

      {mode === "settings" && <SettingsPanel state={state} execute={execute} onLogout={async () => { await fetch("/api/xuemai/auth", { method: "DELETE" }); setState(null); setActiveId(""); setDetailId(""); setMode("overview"); }} />}

      {mode === "chat" && (active ? <>
        <header className="xm-chat-header"><button className="xm-icon xm-mobile-only" onClick={() => setMobileList(v => !v)} aria-label="打开会话列表"><Users size={20} /></button><span className={`xm-avatar ${active.kind}`}>{active.kind === "class" ? <Users size={21} /> : active.name.slice(-2)}</span><div><h1>{active.name}</h1><p>{active.grade || ""} {active.subject} · {active.kind === "class" ? `${students.filter(s => s.classIds.includes(active.id)).length} 位学生` : "学生会话"}</p></div><button className="xm-icon" onClick={() => { setDetailId(""); setCreating(active); }} aria-label="编辑当前资料"><Settings size={18} /></button></header>
        <div className="xm-conversation" aria-label={`${active.name}的教学记录`}>
          <div className="xm-conversation-date">{records.length ? "课堂与学习记录" : "新的学习记录，从这里开始"}</div>
          {!records.length && <div className="xm-chat-welcome"><span><BookOpen size={29} /></span><h2>今天，{active.kind === "student" ? active.name : "班上同学"}学得怎么样？</h2><p>写下课堂内容与观察，或上传一份学习材料。<br />学脉会先整理草稿，后续反馈和入档由你决定。</p></div>}
          {records.map(record => <article key={record.id} className="xm-thread-record" data-record-id={record.id}>
            <div className="xm-source"><span>{record.date} · {kindLabels[record.kind]}</span>{record.input && <p>{record.input}</p>}{record.attachmentIds.map(id => <a key={id} href={`/api/xuemai/attachments/${id}`} target="_blank" rel="noreferrer"><Paperclip size={13} />{state.attachments.find(a => a.id === id)?.name || "材料"}</a>)}</div>
            <div className={`xm-result ${selected?.id === record.id ? "selected" : ""}`}>
              <div className="xm-result-label"><span><Sparkles size={15} />{kindLabels[record.kind]}</span><small>{record.status === "running" ? "正在处理" : record.status === "failed" ? "未完成" : record.archivedAt ? "已入档" : "草稿"}</small></div>
              <h2>{record.title}</h2>
              {record.status === "running" ? <p className="xm-processing"><Spinner />正在整理材料，完成后会自动更新。你可以先处理其他学生。</p> : record.status === "failed" ? <p className="xm-inline-error">{record.error}</p> : record.content ? <p className="xm-result-preview">{record.content}</p> : <p className="xm-muted">原始内容已保存，准备好后可交给 AI 整理。</p>}
              {record.content && record.evidence === "insufficient" && <p className="xm-evidence-note"><CircleHelp size={14} />目前证据不足，请检查并补充学生实际表现。</p>}
              {record.feedback && <div className="xm-feedback-preview"><span><MessageSquare size={14} />家长反馈 · {record.feedbackStatus === "sent" ? "已反馈" : "待反馈"}</span><p>{record.feedback}</p></div>}
              <div className="xm-result-actions"><Button variant="secondary" disabled={busy.includes(record.id)} onClick={() => setDetailId(record.id)}>查看与编辑<ArrowRight size={14} /></Button>{!record.content && record.status !== "running" && <Button onClick={() => void action(record, "generate")} disabled={busy.includes(record.id)}>开始整理</Button>}{record.content && record.evidence === "observed" && record.kind !== "prep" && record.feedbackStatus === "none" && <Button disabled={busy.includes(record.id) || record.status === "running"} onClick={() => { setDetailId(record.id); void action(record, "feedback"); }}>生成家长反馈</Button>}</div>
            </div>
          </article>)}
        </div>
        <Composer key={`${state.teacher.id}:${active.id}`} contact={active} owner={state.teacher.id} onCreate={create} setError={setError} onUploaded={refresh} />
      </> : <Empty title="先添加一位学生或一个班级" text="会话会保存你的课堂观察、AI 草稿和后续反馈。" action={() => setCreating("student")} label="添加学生" />)}
    </main>

    {mode === "chat" && active && <aside className={`xm-context ${selected ? "xm-context-open" : ""}`}>
      {selected ? <RecordReview key={`${selected.id}:${selected.revision}`} record={selected} contact={active} busy={busy.includes(selected.id) || selected.status === "running"} onAction={action} onClose={() => setDetailId("")} notify={setNotice} error={setError} state={state} onCreate={async body => { const created = await create(body, false); if (created) await action(created, "generate"); return created; }} /> : <>
        <div className="xm-context-heading"><h2>学习脉络</h2><Archive size={17} /></div><div className="xm-profile-block"><span className={`xm-avatar ${active.kind}`}>{active.name.slice(-2)}</span><h2>{active.name}</h2><p>{active.grade} {active.subject}</p></div>
        <div className="xm-context-counts"><div><strong>{records.length}</strong><span>教学记录</span></div><div><strong>{records.filter(r => r.archivedAt).length}</strong><span>已入档</span></div></div>
        <section className="xm-timeline"><h3>已确认的学习档案</h3>{[...records].reverse().filter(r => r.archivedAt).slice(0, 10).map(record => <button key={record.id} onClick={() => setDetailId(record.id)}><small>{record.date}</small><strong>{record.title}</strong><p>{record.archiveContent?.slice(0, 75)}</p></button>)}{!records.some(r => r.archivedAt) && <p className="xm-muted">老师确认入档的记录，会在这里形成连续的学习档案。</p>}</section>
        {active.kind === "student" && <MonthlyCreator contact={active} records={records} onCreate={create} />}
      </>}
    </aside>}
    {mode === "chat" && active?.kind === "student" && !selected && <div className="xm-mobile-monthly"><Button variant="secondary" onClick={() => setMonthlyOpen(true)}><FileText size={14} />学生月报</Button></div>}
    {monthlyOpen && active?.kind === "student" && <Dialog title="生成学生月报" onClose={() => setMonthlyOpen(false)}><MonthlyCreator contact={active} records={records} onCreate={async body => { const created = await create(body); if (created) setMonthlyOpen(false); return created; }} /></Dialog>}
    {creating && <ContactDialog value={creating} classes={classes} preferences={state.preferences} onClose={() => setCreating(null)} onSave={async body => { const saved = await execute(() => api<Contact>("contacts", body), "资料已保存"); if (saved) { setCreating(null); openContact(saved); } }} />}
    {notice && <div className="xm-toast" role="status"><Check size={17} />{notice}</div>}
    {error && <div className="xm-global-error" role="alert">{error}<button aria-label="关闭错误提示" onClick={() => setError("")}><X size={17} /></button></div>}
  </div>;
}

function Empty({ title, text, action, label }: { title: string; text: string; action: () => void; label: string }) {
  return <div className="xm-empty"><BookOpen size={31} /><h2>{title}</h2><p>{text}</p><Button variant="secondary" onClick={action}>{label}<ArrowRight size={15} /></Button></div>;
}

function Login({ onDone }: { onDone: () => Promise<void> }) {
  const [mode, setMode] = useState("local");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="xm-login"><section className="xm-login-story"><Image src="/xuemai-logo.png" alt="学脉" width={46} height={46} /><span className="xm-wordmark">学脉</span><div><p className="xm-eyebrow">给认真教学的你</p><h1>每一次课堂，<br />都有迹可循。</h1><p>让分散的学习材料，变成连续的教学记录。<br />少一点重复整理，多一点具体的关注。</p><div className="xm-story-sample"><span><Check size={17} />真实记录</span><span><Check size={17} />清晰反馈</span><span><Check size={17} />持续沉淀</span></div></div><small>学脉 · 教学服务工作台</small></section><section className="xm-login-panel"><form onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError("");
    const form = new FormData(e.currentTarget);
    try { await api("auth", { mode, identifier: form.get("identifier"), password: form.get("password"), name: form.get("name") }); await onDone(); }
    catch (err) { setError(err instanceof Error ? err.message : "登录失败"); } finally { setBusy(false); }
  }}><p className="xm-eyebrow">欢迎来到学脉</p><h2>{mode === "register" ? "创建你的教学空间" : "继续今天的教学"}</h2><p className="xm-muted">{mode === "mdt" ? "使用多维度教学助手的教师账号登录。" : "使用学脉账号，打开自己的学生与记录。"}</p><div className="xm-login-tabs">{[{ id: "local", label: "学脉账号" }, { id: "mdt", label: "教学后端账号" }].map(tab => <button type="button" key={tab.id} className={mode === tab.id ? "active" : ""} onClick={() => setMode(tab.id)}>{tab.label}</button>)}</div>
    {mode === "register" && <Field label="老师姓名"><Input name="name" required maxLength={40} autoComplete="name" placeholder="如：林老师" /></Field>}
    <Field label="账号"><Input name="identifier" required maxLength={120} autoComplete="username" placeholder={mode === "mdt" ? "教学后端账号或邮箱" : "你的账号或邮箱"} /></Field>
    <Field label="密码"><Input name="password" required type="password" minLength={mode === "register" ? 8 : 1} maxLength={72} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder={mode === "register" ? "至少 8 位" : "请输入密码"} /></Field>
    {error && <p className="xm-inline-error" role="alert">{error}</p>}
    <Button className="xm-login-submit" type="submit" disabled={busy}>{busy ? <Spinner /> : <ArrowRight size={17} />}{mode === "register" ? "创建并进入" : "登录"}</Button>
    <button className="xm-text-button" type="button" onClick={() => setMode(mode === "register" ? "local" : "register")}>{mode === "register" ? "已有账号？返回登录" : "第一次使用？创建学脉账号"}</button>
    <p className="xm-login-note">记录保存在当前学脉服务。上传材料会在你发起分析时交给配置的 AI 服务处理。</p>
  </form></section></main>;
}

function Composer({ contact, owner, onCreate, setError, onUploaded }: { contact: Contact; owner: string; onCreate: (body: Record<string, unknown>, generate?: boolean) => Promise<LearningRecord | undefined>; setError: (error: string) => void; onUploaded: () => Promise<void> }) {
  const [input, setInput] = useState("");
  const [kind, setKind] = useState<RecordKind>("record");
  const [date, setDate] = useState(today());
  const [files, setFiles] = useState<Attachment[]>([]);
  const [working, setWorking] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const draftKey = `xuemai-draft:${owner}:${contact.id}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (typeof draft.input === "string") setInput(draft.input);
        if (Array.isArray(draft.files)) setFiles(draft.files.slice(0, 5));
        if (["record", "analysis", "prep"].includes(draft.kind)) setKind(draft.kind);
        if (typeof draft.date === "string") setDate(draft.date);
      }
    } catch {} finally { setDraftLoaded(true); }
  }, [draftKey]);
  useEffect(() => { if (draftLoaded) { try { localStorage.setItem(draftKey, JSON.stringify({ input, files, kind, date })); } catch {} } }, [draftKey, draftLoaded, input, files, kind, date]);
  function changeInput(value: string) { setInput(value); }
  async function submit(generate = true) {
    if (working || (!input.trim() && !files.length)) return;
    setWorking(true);
    const result = await onCreate({ contactId: contact.id, kind, input, attachmentIds: files.map(f => f.id), date }, generate);
    if (result) { changeInput(""); setFiles([]); }
    setWorking(false);
  }
  return <section className="xm-composer" aria-label="记录输入区"><div className="xm-compose-tabs">{(["record", "analysis", "prep"] as const).map(value => <button key={value} onClick={() => setKind(value)} aria-pressed={kind === value}><span>{value === "record" ? <FileText size={15} /> : value === "analysis" ? <Search size={15} /> : <BookOpen size={15} />}</span>{kindLabels[value]}</button>)}</div>
    <textarea aria-label="课堂内容或材料说明" placeholder={kind === "prep" ? "准备讲什么？写下主题、课时和教学目标，或上传 PPT / PDF / Word。" : kind === "analysis" ? "上传带有学生作答或订正痕迹的材料；也可以直接粘贴答案与老师的观察。" : "例如：今天学习了分数乘法。能独立完成同分母计算，约分步骤有两次遗漏……"} value={input} onChange={e => changeInput(e.target.value)} maxLength={40000} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }} />
    {files.length > 0 && <div className="xm-file-chips">{files.map(file => <span key={file.id}><Paperclip size={13} />{file.name}<button aria-label={`移除${file.name}`} onClick={() => setFiles(values => values.filter(v => v.id !== file.id))}><X size={13} /></button></span>)}</div>}
    <div className="xm-composer-bottom"><input ref={fileInput} type="file" hidden multiple accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.pptx,.txt,.md" onChange={async e => {
      const selected = Array.from(e.target.files || []); e.target.value = "";
      if (files.length + selected.length > 5) { setError("一次最多添加 5 份材料"); return; }
      setWorking(true);
      try { for (const file of selected) { if (file.size > 20 * 1024 * 1024) throw new Error("单个文件最多 20 MB"); const form = new FormData(); form.set("file", file); const response = await fetch("/api/xuemai/attachments", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setFiles(previous => [...previous, data]); } await onUploaded(); } catch (err) { setError(err instanceof Error ? err.message : "上传失败"); } finally { setWorking(false); }
    }} /><button className="xm-icon" title="上传材料" aria-label="上传材料" disabled={working} onClick={() => fileInput.current?.click()}>{working ? <Spinner /> : <Paperclip size={19} />}</button><input type="date" aria-label="记录日期" value={date} onChange={e => setDate(e.target.value)} /><span className="xm-compose-spacer" /><Button variant="ghost" disabled={working || (!input.trim() && !files.length)} onClick={() => void submit(false)}>仅保存</Button><Button disabled={working || (!input.trim() && !files.length)} onClick={() => void submit()} icon={working ? <Spinner /> : <Send size={15} />}>交给 AI 整理</Button></div><small className="xm-compose-hint">AI 整理完成后，由你检查结果。Ctrl / ⌘ + Enter 提交。</small>
  </section>;
}

function MonthlyCreator({ contact, records, onCreate }: { contact: Contact; records: LearningRecord[]; onCreate: (body: Record<string, unknown>) => Promise<LearningRecord | undefined> }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const count = records.filter(r => r.archivedAt && ["record", "analysis"].includes(r.kind) && r.date.startsWith(month)).length;
  return <section className="xm-monthly"><h3>让记录成为月报</h3><label>报告月份<input type="month" value={month} onChange={e => setMonth(e.target.value)} aria-label="月报月份" /></label><p>{count} 条已入档学习记录可用</p><Button variant="secondary" disabled={!count || busy} onClick={async () => { setBusy(true); await onCreate({ contactId: contact.id, kind: "monthly", input: "", month, date: today(), attachmentIds: [] }); setBusy(false); }}>{busy ? <Spinner /> : <FileText size={14} />}生成月报</Button></section>;
}

function RecordReview({ record, contact, busy, onAction, onClose, notify, error, state, onCreate }: {
  record: LearningRecord; contact: Contact; busy: boolean; onAction: (r: LearningRecord, a: string, extra?: Record<string, unknown>) => Promise<LearningRecord | undefined>;
  onClose: () => void; notify: (message: string) => void; error: (message: string) => void; state: Snapshot; onCreate: (body: Record<string, unknown>) => Promise<LearningRecord | undefined>;
}) {
  const [content, setContent] = useState(record.content);
  const [feedback, setFeedback] = useState(record.feedback);
  const [confirmed, setConfirmed] = useState(false);
  const [archive, setArchive] = useState(false);
  const [individual, setIndividual] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const editKey = `xuemai-edit:${state.teacher.id}:${record.id}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(editKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.revision === record.revision && record.feedbackStatus !== "sent") {
          if (!record.archivedAt && typeof draft.content === "string") setContent(draft.content);
          if (typeof draft.feedback === "string") setFeedback(draft.feedback);
        }
      }
    } catch {} finally { setDraftLoaded(true); }
  }, [editKey, record.revision, record.archivedAt, record.feedbackStatus]);
  useEffect(() => {
    if (!draftLoaded) return;
    try { localStorage.setItem(editKey, JSON.stringify({ revision: record.revision, content, feedback })); } catch {}
  }, [draftLoaded, editKey, record.revision, content, feedback]);
  const contentDirty = content !== record.content || confirmed;
  const feedbackDirty = feedback !== record.feedback;
  const locked = !!record.archivedAt || record.feedbackStatus === "sent";
  async function saveFeedback() {
    if (!feedback.trim()) return undefined;
    return feedbackDirty ? onAction(record, "edit", { feedback }) : record;
  }
  return <><div className="xm-context-heading"><h2>检查与反馈</h2><button className="xm-icon" aria-label="关闭详情" onClick={onClose}><X size={19} /></button></div><div className="xm-review">
    <p className="xm-eyebrow">{contact.name} · {record.date}</p><h2>{record.title}</h2><div className="xm-status-row"><span className="xm-tag">{record.feedbackStatus === "sent" ? "已反馈" : record.feedbackStatus === "pending" ? "待反馈" : record.status === "running" ? "处理中" : "已保存"}</span><span className="xm-tag neutral">{record.archivedAt ? "已入档" : "待确认"}</span></div>
    {busy && <p className="xm-processing"><Spinner />正在处理，请稍候…</p>}{record.error && <p className="xm-inline-error">{record.error}</p>}
    <details className="xm-source-details"><summary>查看原始记录与材料</summary><p>{record.input || "未填写文字"}</p>{record.attachmentIds.map(id => <a key={id} href={`/api/xuemai/attachments/${id}`} target="_blank" rel="noreferrer"><Paperclip size={13} />{state.attachments.find(a => a.id === id)?.name || "材料"}</a>)}</details>
    <Field label="结果正文" hint={locked ? "已确认版本保留用于追溯" : "核对事实；修改正文后，已有反馈草稿需要重新生成。"}><textarea className="xm-editor" aria-label="结果正文" value={content} onChange={e => setContent(e.target.value)} disabled={busy || locked} rows={13} /></Field>
    {record.evidence === "insufficient" && !locked && <label className="xm-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} /><span>我已在正文补充并核实学生作答或课堂表现</span></label>}
    {!locked && <div className="xm-edit-actions"><Button variant="secondary" disabled={busy || !content.trim() || !contentDirty} onClick={() => void onAction(record, "edit", { content, evidenceConfirmed: confirmed })}>保存正文</Button><Button variant="ghost" disabled={busy || contentDirty} onClick={() => void onAction(record, "generate")}>{record.content ? "重新整理" : "开始整理"}</Button></div>}
    {record.kind !== "prep" && <section className="xm-feedback-editor"><h3><MessageSquare size={17} />给家长的反馈</h3>{record.feedback || feedback ? <>
      <textarea className="xm-editor" aria-label="家长反馈正文" value={feedback} disabled={busy || record.feedbackStatus === "sent"} onChange={e => setFeedback(e.target.value)} rows={9} />
      <div className="xm-edit-actions"><Button variant="secondary" disabled={busy || contentDirty || !feedback.trim()} onClick={async () => { const saved = await saveFeedback(); if (!saved) return; try { await navigator.clipboard.writeText(feedback); notify("已复制。请到微信粘贴，发送后再标记已发。"); } catch { error("未能访问剪贴板，请在反馈正文中全选并手动复制"); } }} icon={<Copy size={14} />}>复制到微信</Button>{record.feedbackStatus !== "sent" && <Button variant="ghost" disabled={busy || !feedbackDirty || !feedback.trim()} onClick={() => void saveFeedback()}>保存修改</Button>}</div>
      {record.feedbackStatus !== "sent" && <Button className="xm-full" disabled={busy || !feedback.trim() || contentDirty} onClick={async () => { const saved = await saveFeedback(); if (saved) await onAction(saved, "sent"); }} icon={<ClipboardCheck size={15} />}>我已在微信发送</Button>}
      <p className="xm-muted xm-small">复制不会自动标记已反馈，也不会向家长发送消息。</p>
    </> : <p className="xm-muted">先检查记录中的事实，再整理为一段具体、温和的家长反馈。</p>}
    {record.feedbackStatus !== "sent" && <Button variant="secondary" disabled={busy || contentDirty || feedbackDirty || record.evidence !== "observed" || !record.content} onClick={() => void onAction(record, "feedback")} icon={<Sparkles size={14} />}>{record.feedback ? "重新生成反馈" : "生成家长反馈"}</Button>}</section>}
    {contact.kind === "student" && record.kind !== "prep" && <section className="xm-archive-section"><h3>学生长期档案</h3><p>{record.archivedAt ? `已于 ${displayDate(record.archivedAt)} 确认。月报使用这次确认的正文快照。` : "只有你确认的学习事实，才会进入学生档案和后续月报。"}</p><Button variant="secondary" disabled={busy || contentDirty || record.evidence !== "observed" || !!record.archivedAt || !record.content} onClick={() => setArchive(true)} icon={<Archive size={15} />}>{record.archivedAt ? "已确认入档" : "确认入档"}</Button></section>}
    {contact.kind === "class" && record.content && record.kind !== "prep" && <section className="xm-archive-section"><h3>为学生留下独立记录</h3><p>共同课堂背景不会直接成为每位学生的表现。选择到课学生，并补充个体观察。</p><Button variant="secondary" disabled={busy || contentDirty} onClick={() => setIndividual(true)}><Users size={15} />逐学生整理</Button></section>}
    {record.aiContent && <details className="xm-source-details"><summary>查看 AI 原始草稿</summary><p>{record.aiContent}</p></details>}
    {record.sourceIds.length > 0 && <details className="xm-source-details"><summary>查看引用的 {record.sourceIds.length} 条记录</summary>{record.sourceIds.map(id => { const source = state.records.find(r => r.id === id); return source ? <p key={id}>{source.date} · {source.title}<br />{source.archiveContent || source.content}</p> : <p key={id}>来源记录未找到</p>; })}</details>}
  </div>
  {archive && <Dialog title="确认加入学生档案" onClose={() => setArchive(false)}><p className="xm-muted">将为 {contact.name} 保存当前正文的确认版本。后续月报可以引用它。</p><div className="xm-archive-preview">{record.content}</div><Button className="xm-full" onClick={async () => { await onAction(record, "archive"); setArchive(false); }}>确认当前事实并入档</Button></Dialog>}
  {individual && <IndividualDialog record={record} students={state.contacts.filter(c => c.kind === "student" && c.classIds.includes(contact.id))} onClose={() => setIndividual(false)} onCreate={onCreate} />}
  </>;
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="xm-dialog" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) onClose(); }} aria-label={title}><div className="xm-dialog-head"><h2>{title}</h2><button className="xm-icon" aria-label="关闭弹窗" onClick={onClose}><X size={20} /></button></div>{children}</dialog>;
}
function ContactDialog({ value, classes, preferences, onClose, onSave }: { value: "student" | "class" | Contact; classes: Contact[]; preferences: Preferences; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<void> }) {
  const existing = typeof value === "string" ? undefined : value;
  const kind = existing?.kind || value as "student" | "class";
  const [busy, setBusy] = useState(false);
  return <Dialog title={`${existing ? "编辑" : "添加"}${kind === "student" ? "学生" : "班级"}`} onClose={onClose}><form className="xm-form" onSubmit={async e => { e.preventDefault(); setBusy(true); const form = new FormData(e.currentTarget); await onSave({ id: existing?.id, kind, name: form.get("name"), subject: form.get("subject"), grade: form.get("grade"), classIds: form.getAll("classIds") }); setBusy(false); }}>
    <Field label={kind === "student" ? "学生姓名" : "班级名称"}><Input autoFocus name="name" required maxLength={60} defaultValue={existing?.name} /></Field><div className="xm-form-row"><Field label="学科"><Input name="subject" required maxLength={30} defaultValue={existing?.subject || preferences.subject} /></Field><Field label="年级"><Input name="grade" maxLength={30} defaultValue={existing?.grade || preferences.grade} placeholder="如：六年级" /></Field></div>
    {kind === "student" && classes.length > 0 && <fieldset><legend>所属班级（可多选）</legend>{classes.map(c => <label key={c.id} className="xm-check"><input type="checkbox" name="classIds" value={c.id} defaultChecked={existing?.classIds.includes(c.id)} />{c.name}</label>)}</fieldset>}
    <Button type="submit" className="xm-full" disabled={busy}>{busy ? <Spinner /> : <Check size={16} />}保存资料</Button>
  </form></Dialog>;
}

function IndividualDialog({ record, students, onClose, onCreate }: { record: LearningRecord; students: Contact[]; onClose: () => void; onCreate: (body: Record<string, unknown>) => Promise<LearningRecord | undefined> }) {
  const [selected, setSelected] = useState(students.map(s => s.id));
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  return <Dialog title="逐学生整理课堂记录" onClose={onClose}><p className="xm-muted">取消勾选缺席学生。没有个体观察的学生只记录共同教学内容，不推断个人表现。</p><div className="xm-individual-list">{students.map(student => <div key={student.id}><label className="xm-check"><input type="checkbox" checked={selected.includes(student.id)} disabled={busy || done.includes(student.id)} onChange={e => setSelected(values => e.target.checked ? [...values, student.id] : values.filter(v => v !== student.id))} />{student.name}{done.includes(student.id) && <span className="xm-tag">已创建</span>}</label><textarea aria-label={`${student.name}的课堂表现`} className="xm-editor" placeholder="补充观察到的个体表现（选填）" disabled={busy || !selected.includes(student.id) || done.includes(student.id)} value={observations[student.id] || ""} onChange={e => setObservations(v => ({ ...v, [student.id]: e.target.value }))} /></div>)}</div>{!students.length && <p>请先在学生资料中加入这个班级。</p>}<Button className="xm-full" disabled={busy || selected.every(id => done.includes(id))} onClick={async () => { setBusy(true); for (const id of selected.filter(id => !done.includes(id))) { const created = await onCreate({ contactId: id, kind: "record", date: record.date, attachmentIds: [], sourceIds: [record.id], input: `共同课堂背景（不代表个体表现）：\n${record.content}\n\n该学生个体观察：${observations[id] || "尚未记录，不推断"}` }); if (created) setDone(values => [...values, id]); } setBusy(false); }}>{busy ? <Spinner /> : <Users size={15} />}为选中学生生成独立草稿</Button><p className="xm-muted xm-small">{done.length} 位已创建；完成后请逐位进入会话检查、反馈与入档。</p></Dialog>;
}

function SettingsPanel({ state, execute, onLogout }: { state: Snapshot; execute: <T>(work: () => Promise<T>, success?: string) => Promise<T | undefined>; onLogout: () => Promise<void> }) {
  const [classes, setClasses] = useState<{ classId: string; name: string; _count: { students: number } }[]>([]);
  const [ranking, setRanking] = useState<{ studentId: string; name: string; total: number; correct: number; accuracy: number; sampleStatus: string }[]>([]);
  const [readingClass, setReadingClass] = useState("");
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(!state.services.mdt);
  async function loadClasses() { setBusy(true); const result = await execute(() => api<{ classes: typeof classes }>("mdt")); if (result) setClasses(result.classes); setBusy(false); }
  return <div className="xm-page"><header className="xm-page-header"><div><p className="xm-eyebrow">个人教学空间</p><h1>我的</h1><p>{state.teacher.name} · {state.teacher.identifier.startsWith("mdt:") ? "教学后端账号" : state.teacher.identifier}</p></div><Button variant="secondary" onClick={() => void onLogout()} icon={<LogOut size={15} />}>退出登录</Button></header>
    <div className="xm-settings-grid"><section className="xm-settings-card"><h2>教学与表达偏好</h2><p>让草稿更贴近日常表达，事实始终来自你的记录。</p><form className="xm-form" onSubmit={async e => { e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); await execute(() => api("settings", Object.fromEntries(form), "PATCH"), "偏好已保存"); setBusy(false); }}>
      <div className="xm-form-row"><Field label="常教学科"><Input name="subject" required defaultValue={state.preferences.subject} /></Field><Field label="常教年级"><Input name="grade" defaultValue={state.preferences.grade} /></Field></div><Field label="反馈语气"><select name="tone" defaultValue={state.preferences.tone}><option>温和、具体</option><option>简洁、专业</option><option>鼓励、克制</option></select></Field><Field label="家长称呼"><Input name="address" required defaultValue={state.preferences.address} /></Field><Button disabled={busy} type="submit">保存偏好</Button>
    </form></section><section className="xm-settings-card"><h2>教学后端</h2><p>导入已有的班级与学生；也可查看后端的真实作答统计。</p><div className="xm-service-line"><span className={`xm-service-dot ${state.services.mdt ? "connected" : ""}`} />{state.services.mdt ? "已连接教师账号" : "尚未连接"}<button onClick={() => setConnecting(v => !v)}>{connecting ? "收起" : "更换连接"}</button></div>
      {connecting && <form className="xm-form" onSubmit={async e => { e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); const result = await execute(() => api("mdt", { action: "connect", identifier: form.get("identifier"), password: form.get("password") }), "教学后端已连接"); if (result) setConnecting(false); setBusy(false); }}><Field label="教学后端账号"><Input name="identifier" required autoComplete="username" /></Field><Field label="教学后端密码"><Input name="password" type="password" required autoComplete="current-password" /></Field><Button type="submit" disabled={busy}>{busy && <Spinner />}连接教师账号</Button></form>}
      {state.services.mdt && <Button variant="secondary" disabled={busy} onClick={() => void loadClasses()}><Download size={15} />读取班级列表</Button>}
      <div className="xm-import-list">{classes.map(c => <div key={c.classId}><strong>{c.name}<small>{c._count.students} 位学生</small></strong><Button variant="ghost" disabled={busy} onClick={async () => { setBusy(true); const data = await execute(() => api<{ students: typeof ranking }>(`mdt?classId=${c.classId}`)); if (data) { setRanking(data.students); setReadingClass(c.name); } setBusy(false); }}>学情</Button><Button variant="secondary" disabled={busy} onClick={async () => { setBusy(true); await execute(() => api("mdt", { action: "import", classId: String(c.classId) }), "班级和学生已导入学脉，重复导入不会覆盖本地资料"); setBusy(false); }}>导入</Button></div>)}</div>
      <p className="xm-small xm-muted">导入后可在学脉独立维护；原教学项目的资料保持原样。</p>
    </section><section className="xm-settings-card"><h2>资料与运行状态</h2><div className="xm-service-line"><span className={`xm-service-dot ${state.services.ai ? "connected" : ""}`} />AI 整理：{state.services.ai ? "已配置" : "待配置"}</div><div className="xm-service-line"><span className={`xm-service-dot ${state.services.documents ? "connected" : ""}`} />PDF / Word / PPT 解析：{state.services.documents ? "已配置" : "待配置"}</div><p>支持下载教学记录、反馈和已确认档案，留存自己的教学资料。</p><a className="xm-download" href="/api/xuemai/export"><Download size={17} />导出我的记录</a></section></div>
    {readingClass && <section className="xm-settings-card xm-ranking"><h2>{readingClass} · 原教学后端学情</h2><p>按后端全部历史作答统计；题量不足时不能据此判断长期能力。此表不会自动写入学生档案。</p><div className="xm-table-wrap"><table><thead><tr><th>学生</th><th>作答数</th><th>答对数</th><th>正确率</th><th>样本</th></tr></thead><tbody>{ranking.map(s => <tr key={s.studentId}><td>{s.name}</td><td>{s.total}</td><td>{s.correct}</td><td>{s.total ? `${s.accuracy}%` : "暂无"}</td><td>{s.total < 5 ? "样本较少" : "历史作答"}</td></tr>)}</tbody></table></div>{!ranking.length && <p>这个班级还没有可展示的学生数据。</p>}</section>}
  </div>;
}
