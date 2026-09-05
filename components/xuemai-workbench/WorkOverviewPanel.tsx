import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Check, ChevronRight, ClipboardCheck, Filter, Menu, Search, Send, UserRoundCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, TaskCard, TimelineRecord } from "./types";
import { buildWorkItems, countWorkItems, workStatuses } from "./work-overview-model";
import type { WorkItem, WorkScope, WorkStatus } from "./work-overview-model";

type BatchAction = "feedback" | "followup" | "assign";

const statusTone: Record<WorkStatus, string> = {
  待反馈: "bg-[#fff7e8] text-[#b96b00]",
  待回复: "bg-[#edf5ff] text-[#2673c9]",
  待检查: "bg-[#f4efff] text-[#7651bd]",
  待入档: "bg-[#eefbf2] text-[#16803a]",
  需关注: "bg-[#fff0f0] text-[#c33d3d]",
  已逾期: "bg-[#fee2e2] text-[#b91c1c]"
};

const batchCopy: Record<BatchAction, { title: string; description: string; confirm: string }> = {
  feedback: { title: "批量生成反馈草稿", description: "为每位学生分别生成独立反馈草稿，生成后进入逐项检查。", confirm: "开始生成草稿" },
  followup: { title: "批量安排跟进", description: "为所选学生建立普通跟进事项，不会直接联系家长。", confirm: "确认安排跟进" },
  assign: { title: "批量分配负责人", description: "修改所选事项的处理负责人，保留原处理记录。", confirm: "确认分配" }
};

export function WorkOverviewPanel({
  taskCards,
  conversations,
  timelineRecords,
  teacherName,
  onOpenNavigation,
  onEnter
}: {
  taskCards: TaskCard[];
  conversations: Conversation[];
  timelineRecords: TimelineRecord[];
  teacherName: string;
  onOpenNavigation: () => void;
  onEnter: (conversationId: string, taskId?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<WorkScope>("mine");
  const [status, setStatus] = useState<WorkStatus | "全部">("全部");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [batchAction, setBatchAction] = useState<BatchAction | null>(null);
  const [notice, setNotice] = useState("");
  const teacherLabel = formatTeacherName(teacherName);
  const items = useMemo(() => buildWorkItems(conversations, taskCards, teacherLabel), [conversations, taskCards, teacherLabel]);
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim();
    return items.filter((item) => {
      const matchesScope = scope !== "classes" || item.kind === "class";
      const matchesStatus = status === "全部" || item.status === status;
      const matchesQuery = !normalizedQuery || `${item.targetName}${item.targetMeta}${item.title}${item.source}${item.owner}`.includes(normalizedQuery);
      return matchesScope && matchesStatus && matchesQuery;
    });
  }, [items, query, scope, status]);
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const previewItem = items.find((item) => item.id === previewId) ?? selectedItems[0] ?? visibleItems[0];
  const visibleSelectedCount = visibleItems.filter((item) => selectedIds.includes(item.id)).length;
  const allVisibleSelected = visibleItems.length > 0 && visibleSelectedCount === visibleItems.length;
  const todayLessons = buildOverviewLessons();
  const archivedThisMonth = timelineRecords.filter(record => record.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7)).length;

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setPreviewId(id);
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleItems.map((item) => item.id));
      setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...visibleItems.map((item) => item.id)])));
  }

  function completeBatch() {
    setBatchAction(null);
    setNotice("请进入学生会话逐项处理；当前尚未接入批量跟进和负责人分配。");
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f6f7f6]">
      <div className="mx-auto flex max-w-[1420px] flex-col gap-3 px-4 py-4 sm:px-5">
        <header className="flex flex-col gap-3 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <button type="button" onClick={onOpenNavigation} aria-label="打开主导航" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#3d4a3d] lg:hidden"><Menu size={19} /></button>
            <div className="min-w-0">
              <h1 className="text-[25px] font-black tracking-tight text-[#191c1d]">日安，{teacherLabel}</h1>
              <p className="mt-1 text-[13px] font-medium text-[#6b7280]">先处理影响家长反馈和学生服务连续性的事项。</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ScopeSwitch value={scope} onChange={(value) => { setScope(value); setSelectedIds([]); }} />
            <button type="button" className="flex h-10 items-center gap-2 rounded-[12px] border border-[#e5e9e6] bg-white px-3 text-[12px] font-bold text-[#3d4a3d]"><CalendarDays size={15} />今天</button>
            <button type="button" className="flex h-10 items-center gap-2 rounded-[12px] border border-[#e5e9e6] bg-white px-3 text-[12px] font-bold text-[#3d4a3d]"><Filter size={15} />筛选</button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <MetricButton label="待反馈" count={countWorkItems(items, "待反馈")} tone="orange" active={status === "待反馈"} onClick={() => setStatus(status === "待反馈" ? "全部" : "待反馈")} />
          <MetricButton label="待回复" count={countWorkItems(items, "待回复")} tone="blue" active={status === "待回复"} onClick={() => setStatus(status === "待回复" ? "全部" : "待回复")} />
          <MetricButton label="待检查" count={countWorkItems(items, "待检查")} tone="purple" active={status === "待检查"} onClick={() => setStatus(status === "待检查" ? "全部" : "待检查")} />
          <MetricButton label="需关注" count={countWorkItems(items, "需关注") + countWorkItems(items, "已逾期")} tone="red" active={status === "需关注" || status === "已逾期"} onClick={() => setStatus(status === "需关注" ? "全部" : "需关注")} />
        </section>

        {notice ? <div role="status" className="flex items-center gap-2 rounded-[12px] border border-[#bde8c9] bg-[#eefbf2] px-3 py-2.5 text-[12px] font-bold text-[#16803a]"><Check size={15} />{notice}</div> : null}

        <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="min-w-0 overflow-hidden rounded-[18px] border border-[#e7eae8] bg-white">
            <div className="border-b border-[#edf0ee] px-3 py-3 sm:px-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-[17px] font-black text-[#191c1d]">待处理工作</h2>
                  <p className="mt-0.5 text-[11px] font-medium text-[#7b847e]">所有数字都能进入具体学生或班级处理。</p>
                </div>
                <label className="flex h-9 w-full items-center gap-2 rounded-[11px] bg-[#f5f7f5] px-3 text-[#8a948d] lg:w-[240px]">
                  <Search size={15} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学生、班级或事项" className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold outline-none placeholder:text-[#9aa3ad]" />
                </label>
              </div>
              <div className="mt-3 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {["全部", ...workStatuses].map((item) => (
                  <button key={item} type="button" onClick={() => setStatus(item as WorkStatus | "全部")} className={cn("h-8 shrink-0 rounded-[9px] px-3 text-[11px] font-bold transition", status === item ? "bg-[#eaf8ef] text-[#006e2f]" : "text-[#6b746d] hover:bg-[#f3f5f4]")}>{item}</button>
                ))}
              </div>
            </div>

            {selectedIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-[#cdebd6] bg-[#f3fcf6] px-3 py-2.5 sm:px-4">
                <span className="mr-1 text-[12px] font-black text-[#16803a]">已选择 {selectedIds.length} 项</span>
                <BatchButton icon={<Send size={14} />} label="批量生成反馈草稿" onClick={() => setBatchAction("feedback")} />
                <BatchButton icon={<ClipboardCheck size={14} />} label="批量安排跟进" onClick={() => setBatchAction("followup")} />
                <BatchButton icon={<UserRoundCheck size={14} />} label="批量分配负责人" onClick={() => setBatchAction("assign")} />
                <span className="ml-auto text-[10px] font-semibold text-[#6b746d]">个性化内容仍需逐个确认</span>
              </div>
            ) : null}

            <div className="hidden grid-cols-[32px_minmax(130px,1.05fr)_minmax(170px,1.45fr)_94px_76px_74px] items-center gap-2 border-b border-[#edf0ee] bg-[#fafbfa] px-3 py-2 text-[10px] font-black text-[#7b847e] lg:grid sm:px-4">
              <input type="checkbox" aria-label="选择当前全部事项" checked={allVisibleSelected} onChange={toggleAllVisible} className="h-4 w-4 accent-[#22c55e]" />
              <span>学生 / 班级</span><span>事项 / 来源</span><span>截止时间</span><span>状态</span><span>下一步</span>
            </div>

            <div className="divide-y divide-[#edf0ee]">
              {visibleItems.map((item) => (
                <WorkRow key={item.id} item={item} selected={selectedIds.includes(item.id)} previewing={previewItem?.id === item.id} onToggle={() => toggleSelected(item.id)} onPreview={() => setPreviewId(item.id)} onEnter={() => onEnter(item.conversationId, item.taskId)} />
              ))}
              {visibleItems.length === 0 ? <div className="px-5 py-14 text-center"><p className="text-[14px] font-black text-[#3d4a3d]">当前没有符合条件的事项</p><p className="mt-1 text-[12px] text-[#8a948d]">换一个范围或清除筛选后再看。</p></div> : null}
            </div>
            <footer className="flex items-center justify-between border-t border-[#edf0ee] bg-[#fafbfa] px-4 py-2.5 text-[11px] font-semibold text-[#7b847e]"><span>共 {visibleItems.length} 项</span><span>本月已形成 {archivedThisMonth} 条连续记录</span></footer>
          </section>

          <aside className="space-y-3">
            <SelectedWorkCard item={previewItem} selectedCount={selectedIds.length} onEnter={() => previewItem && onEnter(previewItem.conversationId, previewItem.taskId)} />
            <TodaySchedule lessons={todayLessons} onEnter={onEnter} />
            <section className="rounded-[18px] border border-[#e7eae8] bg-white p-4">
              <h2 className="text-[14px] font-black text-[#191c1d]">批量操作边界</h2>
              <ul className="mt-3 space-y-2 text-[11px] font-medium leading-5 text-[#66716a]">
                <li>• 可以批量生成草稿、安排跟进和分配负责人。</li>
                <li>• 家长反馈必须按学生逐项检查后发送。</li>
                <li>• 学生长期档案不能一键批量确认。</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>

      {batchAction ? <BatchOperationDialog action={batchAction} items={selectedItems} onClose={() => setBatchAction(null)} onConfirm={() => completeBatch()} /> : null}
    </div>
  );
}

function WorkRow({ item, selected, previewing, onToggle, onPreview, onEnter }: { item: WorkItem; selected: boolean; previewing: boolean; onToggle: () => void; onPreview: () => void; onEnter: () => void }) {
  return (
    <div className={cn("grid gap-2 px-3 py-3 transition sm:px-4 lg:grid-cols-[32px_minmax(130px,1.05fr)_minmax(170px,1.45fr)_94px_76px_74px] lg:items-center", selected ? "bg-[#f4fcf6]" : previewing ? "bg-[#fafcfb]" : "hover:bg-[#fafcfb]")}>
      <input type="checkbox" aria-label={`选择${item.targetName}${item.title}`} checked={selected} onChange={onToggle} className="absolute h-4 w-4 accent-[#22c55e] lg:static" />
      <button type="button" onClick={onPreview} className="ml-7 min-w-0 text-left lg:ml-0">
        <strong className="block truncate text-[13px] text-[#191c1d]">{item.targetName}</strong>
        <span className="mt-0.5 block truncate text-[10px] font-medium text-[#8a948d]">{item.targetMeta}</span>
      </button>
      <button type="button" onClick={onPreview} className="ml-7 min-w-0 text-left lg:ml-0">
        <strong className="block truncate text-[12px] text-[#3d4a3d]">{item.title}</strong>
        <span className="mt-0.5 block truncate text-[10px] font-medium text-[#8a948d]">来源：{item.source}</span>
      </button>
      <span className="ml-7 text-[11px] font-bold text-[#3d4a3d] lg:ml-0"><span className={item.status === "已逾期" ? "text-[#c33d3d]" : ""}>{item.deadline}</span><small className="mt-0.5 block text-[9px] font-semibold text-[#9aa3ad]">{item.deadlineHint}</small></span>
      <span className={cn("ml-7 w-fit rounded-[7px] px-2 py-1 text-[10px] font-black lg:ml-0", statusTone[item.status])}>{item.status}</span>
      <button type="button" onClick={onEnter} className="ml-7 flex h-9 items-center justify-center gap-1 rounded-[10px] border border-[#e1e6e2] bg-white px-2 text-[11px] font-black text-[#3d4a3d] hover:border-[#22c55e] hover:text-[#16803a] lg:ml-0">去处理<ChevronRight size={13} /></button>
    </div>
  );
}

function MetricButton({ label, count, tone, active, onClick }: { label: string; count: number; tone: "orange" | "blue" | "purple" | "red"; active: boolean; onClick: () => void }) {
  const colors = { orange: "text-[#d97706]", blue: "text-[#2680d9]", purple: "text-[#7651bd]", red: "text-[#dc3f3f]" };
  return <button type="button" onClick={onClick} className={cn("flex min-h-[76px] items-center justify-between rounded-[17px] border bg-white px-4 text-left transition hover:border-[#bcdcc6] hover:shadow-[0_8px_22px_rgba(15,23,42,0.04)]", active ? "border-[#22c55e] bg-[#f6fff8]" : "border-[#e7eae8]")}><span><strong className={cn("block text-[23px] font-black", colors[tone])}>{count}</strong><span className="mt-1 block text-[12px] font-black text-[#3d4a3d]">{label}</span></span><ChevronRight size={17} className="text-[#a4aca7]" /></button>;
}

function ScopeSwitch({ value, onChange }: { value: WorkScope; onChange: (value: WorkScope) => void }) {
  return <div className="flex h-10 items-center rounded-[12px] border border-[#e5e9e6] bg-white p-1">{([{ id: "mine", label: "我的" }, { id: "all", label: "全部学生" }, { id: "classes", label: "班级" }] as const).map((item) => <button key={item.id} type="button" onClick={() => onChange(item.id)} className={cn("h-8 rounded-[9px] px-3 text-[11px] font-black transition", value === item.id ? "bg-[#eaf8ef] text-[#16803a]" : "text-[#6b746d] hover:bg-[#f3f5f4]")}>{item.label}</button>)}</div>;
}

function BatchButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex h-8 items-center gap-1.5 rounded-[9px] border border-[#bde8c9] bg-white px-2.5 text-[10px] font-black text-[#16803a] hover:bg-[#eaf8ef]">{icon}{label}</button>;
}

function SelectedWorkCard({ item, selectedCount, onEnter }: { item?: WorkItem; selectedCount: number; onEnter: () => void }) {
  if (!item) return null;
  return <section className="rounded-[18px] border border-[#e7eae8] bg-white p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-black text-[#16803a]">{selectedCount > 0 ? `已选择 ${selectedCount} 项` : "当前事项"}</p><h2 className="mt-1 text-[15px] font-black text-[#191c1d]">{item.targetName}</h2></div><span className={cn("rounded-[7px] px-2 py-1 text-[10px] font-black", statusTone[item.status])}>{item.status}</span></div><p className="mt-3 text-[12px] font-bold leading-5 text-[#3d4a3d]">{item.title}</p><dl className="mt-3 grid grid-cols-[52px_1fr] gap-y-2 text-[10px]"><dt className="text-[#9aa3ad]">来源</dt><dd className="font-semibold text-[#66716a]">{item.source}</dd><dt className="text-[#9aa3ad]">负责人</dt><dd className="font-semibold text-[#66716a]">{item.owner}</dd><dt className="text-[#9aa3ad]">截止</dt><dd className="font-semibold text-[#66716a]">{item.deadline}</dd></dl><button type="button" onClick={onEnter} className="mt-4 flex h-9 w-full items-center justify-center gap-1 rounded-[10px] bg-[#22c55e] text-[11px] font-black text-white hover:bg-[#16a34a]">进入会话处理<ChevronRight size={14} /></button></section>;
}

function TodaySchedule({ lessons, onEnter }: { lessons: ReturnType<typeof buildOverviewLessons>; onEnter: (conversationId: string) => void }) {
  return <section className="rounded-[18px] border border-[#e7eae8] bg-white p-4"><div className="flex items-center justify-between"><h2 className="text-[14px] font-black text-[#191c1d]">今日日程</h2><span className="text-[10px] font-bold text-[#8a948d]">共 {lessons.length} 节</span></div><div className="mt-3 space-y-2">{lessons.map((lesson) => <button key={lesson.id} type="button" onClick={() => onEnter(lesson.id)} className="flex w-full items-start gap-2 rounded-[11px] bg-[#f7f9f7] p-2.5 text-left hover:bg-[#eef8f1]"><strong className="w-10 shrink-0 text-[12px] text-[#191c1d]">{lesson.time}</strong><span className="min-w-0"><span className="block truncate text-[11px] font-black text-[#3d4a3d]">{lesson.name}</span><span className="mt-0.5 block truncate text-[9px] font-semibold text-[#8a948d]">{lesson.meta}</span></span></button>)}</div></section>;
}

function BatchOperationDialog({ action, items, onClose, onConfirm }: { action: BatchAction; items: WorkItem[]; onClose: () => void; onConfirm: () => void }) {
  const copy = batchCopy[action];
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#101712]/30 p-0 backdrop-blur-[1px] sm:items-center sm:p-5" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-label={copy.title} onMouseDown={(event) => event.stopPropagation()} className="w-full rounded-t-[22px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:max-w-[560px] sm:rounded-[20px]"><header className="flex items-start justify-between border-b border-[#edf0ee] px-5 py-4"><div><h2 className="text-[17px] font-black text-[#191c1d]">{copy.title}</h2><p className="mt-1 text-[11px] leading-5 text-[#6b746d]">{copy.description}</p></div><button type="button" aria-label="关闭批量操作" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#f3f5f4]"><X size={18} /></button></header><div className="px-5 py-4"><div className="flex items-center gap-2 rounded-[12px] bg-[#fff8e8] p-3 text-[11px] font-semibold leading-5 text-[#8a5a00]"><AlertTriangle size={16} className="shrink-0" />本次影响 {items.length} 个对象，不会自动发送家长消息，也不会批量写入学生档案。</div><div className="mt-3 max-h-[220px] overflow-y-auto rounded-[12px] border border-[#edf0ee]">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-[#edf0ee] px-3 py-2.5 last:border-0"><span className="min-w-0"><strong className="block truncate text-[12px] text-[#191c1d]">{item.targetName}</strong><span className="mt-0.5 block truncate text-[10px] text-[#8a948d]">{item.title}</span></span><span className={cn("shrink-0 rounded-[7px] px-2 py-1 text-[10px] font-black", statusTone[item.status])}>{item.status}</span></div>)}</div></div><footer className="flex justify-end gap-2 border-t border-[#edf0ee] px-5 py-4"><button type="button" onClick={onClose} className="h-10 rounded-[10px] px-4 text-[12px] font-black text-[#6b746d] hover:bg-[#f3f5f4]">取消</button><button type="button" onClick={onConfirm} className="h-10 rounded-[10px] bg-[#22c55e] px-5 text-[12px] font-black text-white hover:bg-[#16a34a]">{copy.confirm}</button></footer></section></div>;
}

function buildOverviewLessons(): { id: string; time: string; name: string; meta: string }[] { return []; }

function formatTeacherName(value: string) {
  const name = value.trim() || "老师";
  return name.endsWith("老师") ? name : `${name}老师`;
}
