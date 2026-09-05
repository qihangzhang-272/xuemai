import { ArrowLeft, Check, ChevronDown, ClipboardPaste, FileSearch, ImagePlus, Info, MessageSquareText, PenLine, Send, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoTask, StudentProfile } from "./types";

export function QuickCaptureBar({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-h-[58px] w-full items-center gap-3 rounded-[14px] border border-[#191c1d]/[0.1] bg-white px-4 text-left transition hover:border-[#22c55e]/55 hover:shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#f3f4f5] text-[#3d4a3d] transition group-hover:bg-[#eefbf2] group-hover:text-[#006e2f]">
        <PenLine className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#8b9297]">记录课堂、上传学生材料或粘贴家长消息…</span>
      <span className="hidden items-center gap-2 sm:flex">
        <span className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#191c1d]/[0.08] px-3 text-[12px] font-bold text-[#3d4a3d]"><Upload className="h-3.5 w-3.5" />上传</span>
        <span className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#191c1d]/[0.08] px-3 text-[12px] font-bold text-[#3d4a3d]"><ClipboardPaste className="h-3.5 w-3.5" />粘贴</span>
        <span className="flex h-9 items-center gap-1.5 rounded-[10px] bg-[#22c55e] px-3 text-[12px] font-bold text-white"><PenLine className="h-3.5 w-3.5" />记录</span>
      </span>
    </button>
  );
}

export function TaskWorkspace({
  task,
  student,
  draft,
  archived,
  onDraftChange,
  onToggleArchive,
  onComplete,
  onOpenAnalysis,
  onBack
}: {
  task: DemoTask;
  student: StudentProfile;
  draft: string;
  archived: boolean;
  onDraftChange: (value: string) => void;
  onToggleArchive: () => void;
  onComplete: () => void;
  onOpenAnalysis: () => void;
  onBack: () => void;
}) {
  const isDone = task.status === "done";
  const actionLabel = task.kind === "analysis" ? "确认检查" : task.kind === "attention" ? "安排跟进" : "标记已发";

  return (
    <article className="flex h-full min-h-0 flex-col bg-[#f7f8fa]">
      <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
        <div className="mx-auto max-w-[820px]">
          <button type="button" onClick={onBack} className="mb-2 flex min-h-11 items-center gap-2 text-[13px] font-bold text-[#3d4a3d] hover:text-[#006e2f] md:hidden">
            <ArrowLeft className="h-4 w-4" /> 返回列表
          </button>

          <header className="flex flex-col gap-3 border-b border-[#191c1d]/[0.08] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[19px] font-black tracking-[-0.02em] text-[#191c1d] sm:text-[21px]">{task.title}</h1>
                <span className={cn("rounded-[7px] px-2 py-1 text-[11px] font-bold", isDone ? "bg-[#eefbf2] text-[#16803a]" : "bg-[#dcfce7] text-[#16803a]")}>{isDone ? "已完成" : task.kind === "parent_reply" ? "待回复" : task.kind === "attention" ? "需关注" : "待处理"}</span>
              </div>
              <p className="mt-1.5 text-[12px] font-medium text-[#6b7280]">{student.grade} · {student.subject} · 来源：{task.source}</p>
            </div>
            <span className="text-[11px] font-medium text-[#8b9297]">创建时间：{task.time}</span>
          </header>

          <section className="mt-4 rounded-[16px] border border-[#191c1d]/[0.09] bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-black text-[#191c1d]">来源与证据摘要</h2>
              <span className="text-[11px] font-bold text-[#16803a]">{task.evidence.filter((item) => item.verified).length}/{task.evidence.length} 已核实</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {task.evidence.map((item) => (
                <div key={item.id} className={cn("rounded-[12px] border p-3", item.verified ? "border-[#191c1d]/[0.08] bg-[#fafcfb]" : "border-[#f59e0b]/25 bg-[#fffaf2]")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-black text-[#3d4a3d]">{item.label}</span>
                    {item.verified ? <Check className="h-3.5 w-3.5 text-[#16a34a]" /> : <Info className="h-3.5 w-3.5 text-[#b45309]" />}
                  </div>
                  <p className="mt-2 text-[11px] font-medium leading-4 text-[#5f6861]">{item.detail}</p>
                  <p className="mt-2 text-[10px] text-[#9ca3af]">{item.time}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-[#191c1d]/[0.07] pt-4 text-[13px] leading-6 text-[#3d4a3d]">
              <p><strong className="text-[#191c1d]">当前可确认：</strong>{task.summary}</p>
              <p><strong className="text-[#191c1d]">教师建议：</strong>{task.teacherSuggestion}</p>
            </div>
          </section>

          <section className="mt-3 rounded-[16px] border border-[#191c1d]/[0.09] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-black text-[#191c1d]">{task.draftTitle}</h2>
                <span className="rounded-[6px] bg-[#f3f4f5] px-2 py-1 text-[10px] font-bold text-[#6b7280]">基于已核实证据</span>
              </div>
              <button type="button" className="flex h-9 items-center gap-1.5 rounded-[10px] px-2 text-[12px] font-bold text-[#3d4a3d] hover:bg-[#f3f4f5]">
                常用语 <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              value={draft}
              disabled={isDone}
              onChange={(event) => onDraftChange(event.target.value)}
              className="mt-3 min-h-[210px] w-full resize-none rounded-[12px] border border-[#191c1d]/[0.1] bg-white p-3.5 text-[13px] font-medium leading-6 text-[#303733] outline-none transition focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e]/10 disabled:bg-[#f8f9fa] sm:min-h-[230px]"
              aria-label={task.draftTitle}
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[#8b9297]">
              <span>{draft.length} 字</span>
              <span>发送前由老师完成最终检查</span>
            </div>
          </section>
        </div>
      </div>

      <footer className="border-t border-[#191c1d]/[0.08] bg-white px-3 py-3 sm:px-5">
        <div className="mx-auto flex max-w-[820px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[11px] px-2 text-[12px] font-bold text-[#3d4a3d] hover:bg-[#f3f4f5]">
            <input type="checkbox" checked={archived} disabled={isDone} onChange={onToggleArchive} className="h-4 w-4 accent-[#22c55e]" />
            同时加入学生档案
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={onOpenAnalysis} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[11px] border border-[#22c55e] px-4 text-[13px] font-black text-[#006e2f] transition hover:bg-[#eefbf2] sm:flex-none">
              <FileSearch className="h-4 w-4" />查看完整分析
            </button>
            <button type="button" disabled={isDone || draft.trim().length < 10} onClick={onComplete} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[11px] bg-[#22c55e] px-5 text-[13px] font-black text-white transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:bg-[#a7dcb8] sm:flex-none">
              {isDone ? <Check className="h-4 w-4" /> : task.kind === "analysis" ? <FileSearch className="h-4 w-4" /> : task.kind === "attention" ? <MessageSquareText className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {isDone ? "已完成" : actionLabel}
            </button>
          </div>
        </div>
      </footer>
    </article>
  );
}

export function EmptyWorkspace({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-[#f7f8fa] p-6 text-center">
      <div>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eefbf2] text-[#006e2f]"><ImagePlus className="h-5 w-5" /></span>
        <h2 className="mt-4 text-[17px] font-black text-[#191c1d]">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[#6b7280]">{description}</p>
      </div>
    </div>
  );
}
