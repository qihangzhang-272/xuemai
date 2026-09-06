import Image from "next/image";
import type React from "react";
import { useState } from "react";
import type { Contact } from "@/lib/xuemai/types";
import { Bell, ClipboardCheck, MessageSquareText, Settings, Sparkles, UsersRound, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, WorkspaceMode } from "./types";

export function Rail({ mode, onModeChange, teacherName, className }: { mode: WorkspaceMode; onModeChange: (mode: WorkspaceMode) => void; teacherName: string; className?: string }) {
  const items = [
    { id: "todos" as const, label: "工作台", icon: ClipboardCheck },
    { id: "chat" as const, label: "会话", icon: MessageSquareText },
    { id: "students" as const, label: "学生", icon: UserRound },
    { id: "classes" as const, label: "班级", icon: UsersRound },
    { id: "settings" as const, label: "我的", icon: Settings }

  ];

  return (
    <nav className={cn("flex flex-col items-center border-r border-[#e3e6e4] bg-[#fbfcfb]", className)}>
      <div className="mt-3 flex h-9 w-9 items-center justify-center overflow-hidden rounded-[13px] bg-[#22c55e]">
        <Image src="/xuemai-logo.png" alt="学脉" width={36} height={36} className="h-full w-full object-cover" priority />
      </div>
      <div className="mt-7 flex w-full flex-col">
        {items.map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onModeChange(item.id)}
              aria-label={`切换到${item.label}`}
              className={cn(
                "relative flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#22c55e]/35",
                active ? "text-[#006e2f]" : "text-[#8b928c] hover:bg-[#f3f6f4] hover:text-[#3d4a3d]"
              )}
            >
              {active ? <span className="absolute left-0 top-2 h-[calc(100%-16px)] w-[3px] rounded-r-full bg-[#22c55e]" /> : null}
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-[11px]", active ? "bg-[#e9f8ef]" : "")}>
                <Icon size={19} strokeWidth={2.35} />
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="mt-auto pb-3">
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#f4d19b] text-[11px] font-bold text-[#1f2937]">
          {teacherName.slice(0, 4)}
        </div>
      </div>
    </nav>
  );
}

export function ConversationGroup({
  title,
  items,
  activeId,
  onSelect,
  onAvatarClick
}: {
  title: string;
  items: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onAvatarClick?: (conversation: Conversation) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="pt-3">
      <h2 className="px-3 text-[11px] font-bold text-[#8a948d]">{title}</h2>
      <div className="mt-1.5">
        {items.map((item) => {
          const summary = formatConversationSummary(item);

          return (
          <div
            key={item.id}
            className={cn(
              "relative grid w-full grid-cols-[36px_minmax(0,1fr)_34px] items-center gap-2 px-3 py-2.5 text-left transition",
              activeId === item.id ? "bg-[#f1faf4]" : "hover:bg-[#f7f8f7]"
            )}
          >
            {activeId === item.id ? <span className="absolute left-0 top-2 h-[calc(100%-16px)] w-[3px] rounded-r-full bg-[#22c55e]" /> : null}
            <button
              type="button"
              onClick={() => (item.kind === "student" && onAvatarClick ? onAvatarClick(item) : onSelect(item.id))}
              className="relative rounded-full outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-[#22c55e]/30"
              aria-label={item.kind === "student" ? `查看${item.name}学生档案` : `打开${item.name}群聊`}
            >
              <Avatar conversation={item} />
            </button>
            <button type="button" onClick={() => onSelect(item.id)} className="min-w-0 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/30" aria-label={item.kind === "student" ? `打开${item.name}聊天` : `打开${item.name}`}>
              <p className="truncate text-[14px] font-bold tracking-tight text-[#191c1d]">{item.name}</p>
              <p className={cn("mt-0.5 truncate text-[11px]", activeId === item.id ? "font-semibold text-[#168f42]" : "text-[#6b746d]")}>{summary}</p>
            </button>
            <button type="button" onClick={() => onSelect(item.id)} className="self-stretch rounded-md pt-0.5 text-right text-[11px] font-medium text-[#9aa19d] outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/30" aria-label={item.kind === "student" ? `打开${item.name}最近聊天` : `打开${item.name}最近记录`}>
              {item.time || "—"}
            </button>
          </div>
          );
        })}
      </div>
    </section>
  );
}

export function AssistantConversationEntry({
  conversation,
  active,
  onSelect
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="px-3 pb-2 pt-3">
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        className={cn(
          "relative flex w-full items-center gap-2 rounded-[18px] px-3 py-3 text-left transition",
          active ? "bg-[#eaf8ef]" : "bg-white/70 hover:bg-[#f3f6f4]"
        )}
      >
        {active ? <span className="absolute left-0 top-3 h-[calc(100%-24px)] w-[3px] rounded-r-full bg-[#22c55e]" /> : null}
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[#dcfce7] text-[#16a34a]">
          <Sparkles size={19} strokeWidth={2.35} />
          {conversation.attention ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#ff4d4f]" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold tracking-tight text-[#191c1d]">{conversation.name}</span>
          <span className={cn("mt-0.5 block truncate text-[11px]", active ? "font-semibold text-[#168f42]" : "text-[#6b746d]")}>{formatConversationSummary(conversation)}</span>
        </span>
        <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-white/84 px-2 text-[11px] font-bold text-[#15803d]">
          <Bell size={12} />
          今日
        </span>
      </button>
    </section>
  );
}

function formatConversationSummary(conversation: Conversation) {
  const summary = conversation.summary.trim();
  if (!summary || summary === "任务分析完成") {
    if (conversation.statusLabel === "待反馈") return "家长反馈待发送";
    if (conversation.statusLabel === "已反馈") return "家长反馈已发送";
    if (conversation.statusLabel === "待入档") return "学习记录待入档";
    if (conversation.statusLabel === "已入档") return "已确认入档";
    return conversation.kind === "class" ? "班级记录待查看" : "学习记录待查看";
  }

  return summary;
}

function Avatar({ conversation }: { conversation: Conversation }) {
  const styles = {
    green: "bg-[#dcfce7] text-[#16a34a]",
    orange: "bg-[#ffedd5] text-[#ea580c]",
    blue: "bg-[#dbeafe] text-[#2563eb]",
    red: "bg-[#fee2e2] text-[#dc2626]"
  };

  return (
    <div className={cn("relative flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold", styles[conversation.accent])}>
      {conversation.kind === "class" ? <UsersRound size={18} /> : conversation.kind === "assistant" ? <Sparkles size={17} /> : conversation.avatar}
      {conversation.attention ? <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#ff4d4f]" /> : null}
    </div>
  );
}

export function MenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-[#3d4a3d] transition hover:bg-[#edf8f1]">
      {icon}
      {label}
    </button>
  );
}

export function ContactDirectory({ kind, contacts, onOpen, onProfile, onEdit, onCreate, onNavigation }: {
  kind: Contact["kind"]; contacts: Contact[]; onOpen: (id: string) => void;
  onProfile: (id: string) => void; onEdit: (id: string) => void; onCreate: () => void; onNavigation: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const rows = contacts.filter(contact => contact.kind === kind && contact.name.includes(query.trim()) && (status === "all" || (contact.status || "active") === status));
  const label = kind === "student" ? "学生" : "班级";
  return <div className="h-full overflow-y-auto bg-[#f6f7f6] p-4 sm:p-6"><div className="mx-auto max-w-[1000px] space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><button onClick={onNavigation} className="mb-2 rounded-full bg-white px-3 py-2 text-sm lg:hidden">打开主导航</button><h1 className="text-[25px] font-bold">{label}</h1><p className="mt-1 text-sm text-[#6b746d]">{kind === "student" ? "选一位学生，开始记录课堂或上传学习材料。" : "在班级会话中记录共同内容，个体表现进入对应学生会话。"}</p></div><button onClick={onCreate} className="rounded-full bg-[#22c55e] px-4 py-3 text-sm font-bold text-white">新建{label}</button></header>
    <div className="flex gap-2"><input aria-label={`搜索${label}`} placeholder={`搜索${label}姓名或名称`} value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#e3e6e4] bg-white p-3 text-sm" /><select aria-label="服务状态筛选" value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border p-2 text-sm"><option value="active">在读</option><option value="paused">暂停</option><option value="archived">归档</option><option value="all">全部状态</option></select></div>
    <section className="divide-y divide-[#edf0ee] overflow-hidden rounded-[20px] bg-white">{rows.map(contact => <article key={contact.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="min-w-0 flex-1"><h2 className="break-words text-base font-bold">{contact.name}</h2><p className="mt-1 text-sm text-[#6b746d]">{[contact.grade, contact.subject, contact.status === "paused" ? "服务暂停" : contact.status === "archived" ? "已归档" : "在读"].filter(Boolean).join(" · ")}</p>{kind === "class" ? <p className="mt-1 text-xs text-[#6b746d]">{contacts.filter(student => student.classIds.includes(contact.id)).length} 位学生</p> : null}</div><div className="flex flex-wrap gap-2"><button onClick={() => onOpen(contact.id)} className="rounded-full bg-[#edf8f1] px-4 py-2 text-sm font-semibold text-[#15803d]">进入会话</button>{kind === "student" ? <button onClick={() => onProfile(contact.id)} className="rounded-full border border-[#bccbb9] px-3 py-2 text-sm">学生档案</button> : null}<button onClick={() => onEdit(contact.id)} className="rounded-full border border-[#bccbb9] px-3 py-2 text-sm">修改资料</button></div></article>)}{!rows.length ? <p className="p-8 text-center text-sm text-[#6b746d]">{query || status !== "active" ? "没有符合条件的结果。" : `还没有${label}，点击右上方新建。`}</p> : null}</section>
  </div></div>;
}
