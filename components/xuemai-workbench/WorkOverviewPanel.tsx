import { displayTaskTitle } from "./backend-adapter";
import { useState } from "react";
import { ChevronRight, Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, TaskCard, TimelineRecord } from "./types";

export function WorkOverviewPanel({ taskCards, conversations, teacherName, onOpenNavigation, onEnter, onStudents, onReport }: {
  taskCards: TaskCard[]; conversations: Conversation[]; timelineRecords: TimelineRecord[]; teacherName: string;
  onOpenNavigation: () => void; onEnter: (conversationId: string, taskId?: string) => void;
  onStudents?: () => void; onReport?: () => void;
}) {
  const [filter, setFilter] = useState(taskCards.some(task => task.status === "failed") ? "需重试" : "待反馈");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("全部时间");
  const today = new Date().toLocaleDateString("en-CA");
  const items = taskCards.filter(task => task.structuredResult?.recordKind !== "prep" && task.structuredResult?.recordKind !== "daily").map(task => ({ task, label: task.status === "failed" ? "需重试" : task.status === "running" ? "整理中" : task.taskType === "feedback" ? task.status === "feedback_done" ? "已完成" : "待反馈" : task.taskType === "monthly_report" ? task.structuredResult?.reportStatus === "final" ? "已完成" : "月报草稿" : "课堂记录" }));
  const visible = items.filter(({ task, label }) => label === filter && (!query.trim() || `${task.targetName} ${task.title}`.includes(query.trim())) && (period === "全部时间" || String(task.structuredResult?.date) === today));
  return <div className="h-full overflow-y-auto bg-[#f6f7f6]"><div className="mx-auto flex max-w-[1180px] flex-col gap-4 p-4 sm:p-6">
    <header className="flex items-start gap-3"><button type="button" onClick={onOpenNavigation} aria-label="打开主导航" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white lg:hidden"><Menu size={19} /></button><div><h1 className="text-[25px] font-bold text-[#191c1d]">{teacherName}，开始今天的记录</h1></div></header>
    <section className="flex flex-wrap gap-3 rounded-[20px] bg-white p-5"><button onClick={onStudents} className="rounded-full bg-[#22c55e] px-5 py-3 text-sm font-bold text-white">选择学生，记录课堂</button><button onClick={onReport} className="rounded-full border border-[#bccbb9] px-4 py-3 text-sm font-semibold">查看月报素材</button><p className="self-center text-sm text-[#6b746d]">{conversations.filter(item => item.kind === "student").length} 位学生</p></section>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">{([ ["需重试", "red"], ["待反馈", "orange"], ["月报草稿", "purple"] ] as const).map(([label, tone]) => <MetricButton key={label} label={label} tone={tone} count={items.filter(item => item.label === label).length} active={filter === label} onClick={() => setFilter(label)} />)}</section>
    <section className="overflow-hidden rounded-[20px] border border-[#e7eae8] bg-white">
      <div className="space-y-3 border-b border-[#edf0ee] p-4"><h2 className="font-bold">继续处理</h2><div className="flex flex-wrap gap-2">{["需重试", "待反馈", "月报草稿", "课堂记录", "整理中", "已完成"].map(label => <button key={label} aria-pressed={filter === label} onClick={() => setFilter(label)} className={cn("rounded-full px-3 py-2 text-sm", filter === label ? "bg-[#eaf8ef] font-bold text-[#15803d]" : "text-[#6b746d]")}>{label}</button>)}</div><div className="flex flex-wrap gap-2"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#f5f7f5] px-3"><Search size={16} /><input aria-label="搜索工作记录" className="min-w-0 flex-1 bg-transparent py-3 text-sm" placeholder="学生姓名或记录标题" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="记录时间" className="rounded-xl border p-2 text-sm" value={period} onChange={e => setPeriod(e.target.value)}><option>全部时间</option><option>今天</option></select></div></div>
      <div className="divide-y divide-[#edf0ee]">{visible.length ? visible.map(({ task, label }) => <article key={task.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-bold">{displayTaskTitle(task)}</h3><p className="mt-1 text-xs text-[#6b746d]">{String(task.structuredResult?.date || "")} · {label}</p>{task.status === "failed" ? <p className="mt-2 text-sm text-red-700">{task.detail}</p> : null}</div><button onClick={() => onEnter(task.conversationId, task.id)} className="rounded-full border border-[#bccbb9] px-4 py-2 text-sm font-semibold">{label === "待反馈" ? "检查并反馈" : "打开记录"}</button></article>) : <p className="p-8 text-center text-sm leading-6 text-[#6b746d]">{query || period !== "全部时间" ? "没有符合筛选条件的记录。" : filter === "待反馈" ? "当前没有待发的反馈。" : `当前没有${filter}。`}</p>}</div>
    </section>
  </div></div>;
}

function MetricButton({ label, count, tone, active, onClick }: { label: string; count: number; tone: "orange" | "blue" | "purple" | "red"; active: boolean; onClick: () => void }) {
  const colors = { orange: "text-[#d97706]", blue: "text-[#2680d9]", purple: "text-[#7651bd]", red: "text-[#dc3f3f]" };
  return <button type="button" onClick={onClick} className={cn("flex min-h-[76px] items-center justify-between rounded-[17px] border bg-white px-4 text-left transition hover:border-[#bcdcc6] hover:shadow-[0_8px_22px_rgba(15,23,42,0.04)]", active ? "border-[#22c55e] bg-[#f6fff8]" : "border-[#e7eae8]")}><span><strong className={cn("block text-[23px] font-black", colors[tone])}>{count}</strong><span className="mt-1 block text-[12px] font-black text-[#3d4a3d]">{label}</span></span><ChevronRight size={17} className="text-[#a4aca7]" /></button>;
}
