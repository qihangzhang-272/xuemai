import { displayTaskTitle } from "./backend-adapter";
import { ArrowLeft, FileSearch } from "lucide-react";
import { useState } from "react";
import type { LearningRecord } from "@/lib/xuemai/types";
import { archiveOptions, hasOutcomePromise } from "@/lib/xuemai/record-content";
import { TeachingContent } from "./TeachingContent";
import { TaskReviewPanel } from "./ContextPanel";
import type { SkillAction, TaskCard } from "./types";

type TaskReviewWorkspaceProps = {
  task: TaskCard;
  record?: LearningRecord;
  isStudent?: boolean;
  intent?: "detail" | "feedback" | "archive";
  onRecordAction?: (action: string, extra?: Record<string, unknown>) => Promise<LearningRecord | undefined>;
  autoArchiveLearningEvidence: boolean;
  onBack: () => void;
  onAction?: (task: TaskCard, action: SkillAction) => void;
  onEdit?: (task: TaskCard, value: string) => void | Promise<boolean>;
  onReset?: (task: TaskCard) => void;
  onAutoArchiveLearningEvidenceChange?: (enabled: boolean) => void;
  onConfirmProfileUpdates?: (task: TaskCard, selectedSuggestionIds: string[]) => void;
};

export function TaskReviewWorkspace({
  task,
  record,
  isStudent,
  intent,
  onRecordAction,
  autoArchiveLearningEvidence,
  onBack,
  onAction,
  onEdit,
  onReset,
  onAutoArchiveLearningEvidenceChange,
  onConfirmProfileUpdates
}: TaskReviewWorkspaceProps) {
  return (
    <section className="flex min-h-0 w-full flex-1 flex-col bg-[#f7f8f7]">
      <header className="flex min-h-[64px] shrink-0 items-center justify-between gap-2 border-b border-[#edf0ee] bg-white/96 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={onBack} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#5c665f] transition hover:bg-[#f3f4f5]" aria-label="返回聊天">
            <ArrowLeft size={18} />
          </button>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-[#edf8f1] text-[#15803d]">
            <FileSearch size={17} />
          </span>
          <div className="min-w-0">
            <h1 className="break-words text-[15px] font-bold text-[#191c1d]">{displayTaskTitle(task)}</h1>
          </div>
        </div>
      </header>

      <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto w-full max-w-[760px]">
          {record && onRecordAction ? <RecordReview key={`${record.id}:${intent}`} record={record} isStudent={!!isStudent} intent={intent || "detail"} onAction={onRecordAction} /> : <TaskReviewPanel
            task={task}
            autoArchiveLearningEvidence={autoArchiveLearningEvidence}
            onAction={onAction}
            onEdit={onEdit}
            onReset={onReset}
            onAutoArchiveLearningEvidenceChange={onAutoArchiveLearningEvidenceChange}
            onConfirmProfileUpdates={onConfirmProfileUpdates}
          />}
        </div>
      </div>
    </section>
  );
}

function RecordReview({ record, isStudent, intent, onAction }: { record: LearningRecord; isStudent: boolean; intent: string; onAction: NonNullable<TaskReviewWorkspaceProps["onRecordAction"]> }) {
  const [editing, setEditing] = useState<"content" | "feedback" | null>(null);
  const [draft, setDraft] = useState("");
  const [factsConfirmed, setFactsConfirmed] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(intent === "feedback" || !!record.feedback);
  const [includeArchive, setIncludeArchive] = useState(intent === "archive");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<"archive" | "sent" | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const locked = !!record.archivedAt || record.feedbackStatus === "sent" || record.reportStatus === "final";
  const historical = record.kind === "prep" || record.kind === "daily";
  const canArchive = isStudent && !record.archivedAt && record.kind !== "monthly" && !historical && record.evidence === "observed";
  const options = archiveOptions(record);
  const button = "rounded-full border border-[#bccbb9] px-4 py-2 text-sm font-bold disabled:opacity-40";
  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(true); setNotice("");
    try { const result = await onAction(action, extra); if (result) { setEditing(null); setConfirm(null); setNotice(action === "sent" ? "已标记发送" : action === "archive" ? "已入档" : "已保存"); } return result; }
    finally { setBusy(false); }
  }
  async function copy(value: string) {
    if (hasOutcomePromise(value)) { setNotice("正文含有结果保证或过度承诺，请修改后再复制发送。"); return; }
    try { await navigator.clipboard.writeText(value); setNotice("已复制"); }
    catch { setNotice("未能复制，请手动选中下方正文复制。"); }
  }
  return <div className="space-y-4 pb-10">
    <p className="text-sm leading-6 text-[#6b746d]">{record.date} · {record.subject} · {record.archivedAt ? "已入档" : record.kind === "monthly" ? record.reportStatus === "final" ? "月报已定稿" : "月报草稿" : "待确认"}{record.feedbackStatus !== "none" ? ` · ${record.feedbackStatus === "sent" ? "反馈已发" : "反馈待发"}` : ""}{record.correctedBy ? " · 已有更正版" : record.correctionOf ? " · 更正草稿" : ""}</p>
    <section className="rounded-[20px] bg-white p-5">
      <h2 className="mb-3 font-bold">{record.kind === "monthly" ? "月报正文" : "课堂结果"}</h2>
      {editing === "content" ? <textarea aria-label="课堂结果正文" className="min-h-64 w-full rounded-xl border p-3 text-sm leading-7" value={draft} onChange={e => setDraft(e.target.value)} /> : <TeachingContent text={record.content || record.error || "尚未整理"} />}
      {editing === "content" && record.evidence !== "observed" ? <label className="mt-3 flex items-start gap-2 text-sm leading-6"><input type="checkbox" checked={factsConfirmed} onChange={event => setFactsConfirmed(event.target.checked)} />我已补充并核实本次学生的实际作答、订正或课堂表现</label> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {editing === "content" ? <><button className={button} disabled={busy || !draft.trim()} onClick={() => void act("edit", { content: draft, evidenceConfirmed: factsConfirmed })}>保存正文</button><button className={button} onClick={() => setEditing(null)}>取消编辑</button></> : !historical && !locked ? <><button className={button} disabled={busy || !!editing} onClick={() => { setDraft(record.content); setEditing("content"); }}>修改正文</button><button className={button} disabled={busy || !!editing} onClick={() => void act("generate")}>{record.content ? "重新整理" : "整理记录"}</button></> : null}
        {historical && record.content ? <button className={button} onClick={() => void copy(record.content)}>复制正文</button> : null}
        {locked && !historical && !record.correctedBy ? <button className={button} disabled={busy} onClick={() => void act("correct")}>另建更正记录</button> : null}
        {record.kind === "monthly" && record.content ? <><button className={button} onClick={() => void copy(record.content)}>复制月报</button>{record.reportStatus !== "final" ? <button className={button} disabled={busy || !!editing} onClick={() => void act("finalize")}>确认月报定稿</button> : null}</> : null}
      </div>
    </section>
    {!historical && record.evidence === "observed" && isStudent ? <section className="rounded-[20px] bg-white p-5">
      <h2 className="font-bold">家长反馈</h2>
      {!feedbackOpen ? <button className={`${button} mt-3 bg-[#22c55e] text-white`} disabled={busy || !!editing} onClick={() => setFeedbackOpen(true)}>检查并反馈</button> : <>
        {record.feedback ? editing === "feedback" ? <textarea aria-label="家长反馈正文" className="mt-3 min-h-48 w-full rounded-xl border p-3 text-sm leading-7" value={draft} onChange={e => setDraft(e.target.value)} /> : <TeachingContent text={record.sentContent || record.feedback} className="mt-3" /> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {editing === "feedback" ? <><button className={button} disabled={busy || !draft.trim()} onClick={() => void act("edit", { feedback: draft })}>保存反馈</button><button className={button} onClick={() => setEditing(null)}>取消编辑</button></> : <>
            {record.feedbackStatus !== "sent" ? <button className={button} disabled={busy || !!editing} onClick={() => void act("feedback")}>{record.feedback ? "重新整理反馈" : "整理家长反馈"}</button> : null}
            {record.feedback ? <><button className={`${button} bg-[#22c55e] text-white`} disabled={busy || !!editing} onClick={() => void copy(record.sentContent || record.feedback)}>复制家长反馈</button>{record.feedbackStatus !== "sent" ? <><button className={button} disabled={busy || !!editing} onClick={() => { setDraft(record.feedback); setEditing("feedback"); }}>修改反馈</button><button className={button} disabled={busy || !!editing || (canArchive && includeArchive && !selected.length)} onClick={() => { if (canArchive && includeArchive) setConfirm("sent"); else void act("sent"); }}>我已发给家长</button></> : null}</> : null}
          </>}
        </div>
        {record.sentAt ? <p className="mt-2 text-sm text-[#15803d]">已标记发送：{new Date(record.sentAt).toLocaleString("zh-CN")}</p> : null}
      </>}
    </section> : null}
    {canArchive ? <section className="rounded-[20px] bg-white p-5">
      <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={includeArchive} onChange={e => { setIncludeArchive(e.target.checked); setConfirm(null); }} />{feedbackOpen ? "同时加入学生档案" : "加入学生档案"}</label>
      <p className="mt-2 text-sm text-[#6b746d]">入档内容可用于学生月报。</p>
      {includeArchive ? <div className="mt-4 space-y-3">{options.map(option => <label key={option.id} className="flex items-start gap-2 text-sm leading-6"><input className="mt-1" type="checkbox" checked={selected.includes(option.id)} onChange={e => { setSelected(ids => e.target.checked ? [...ids, option.id] : ids.filter(id => id !== option.id)); setConfirm(null); }} /><span>{option.label}<details className="text-[#6b746d]"><summary className="cursor-pointer">展开核对</summary><TeachingContent text={option.text} /></details></span></label>)}<button className={button} disabled={busy || !!editing || !selected.length} onClick={() => setConfirm("archive")}>确认所选入档内容</button></div> : null}
    </section> : null}
    {confirm ? <section role="alert" className="rounded-[20px] border border-[#22c55e] bg-[#edf8f1] p-5"><p className="text-sm leading-6">{confirm === "sent" ? "确认反馈已发给家长，并将所选内容入档？" : "确认将所选内容入档？"}{includeArchive && canArchive ? ` 共 ${selected.length} 项，入档后需另建记录更正。` : ""}</p><div className="mt-3 flex gap-2"><button className={`${button} bg-[#22c55e] text-white`} disabled={busy || !!editing} onClick={() => void act(confirm, (confirm === "archive" || includeArchive && canArchive) ? { archiveIds: selected } : {})}>{confirm === "sent" ? "确认标记已发" : "确认入档"}</button><button className={button} disabled={busy} onClick={() => setConfirm(null)}>返回检查</button></div></section> : null}
    {record.archiveContent ? <details className="rounded-[20px] bg-white p-5 text-sm"><summary className="cursor-pointer font-semibold">查看本次入档内容</summary><TeachingContent text={record.archiveContent} className="mt-3" /></details> : null}
    <details className="rounded-[20px] bg-white p-5 text-sm"><summary className="cursor-pointer font-semibold">查看本次提交的原文</summary><p className="mt-3 whitespace-pre-wrap break-words leading-7">{record.input || "本次使用上传的学习材料。"}</p></details>
    {busy ? <p role="status" className="text-sm text-[#15803d]">正在处理，请稍候…</p> : null}
    {notice ? <p role="status" className="text-sm leading-6 text-[#15803d]">{notice}</p> : null}
  </div>;
}
