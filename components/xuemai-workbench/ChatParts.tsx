import { cn } from "@/lib/utils";
import { BookOpenCheck, Check, ChevronRight, FileImage, ImagePlus, Menu, Paperclip, Search, Send, Sparkles, UsersRound } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { ActionButton, IconButton } from "./shared";
import { SkillCard } from "./SkillCard";
import { cleanSubjectPlaceholderText } from "./subject-utils";
import { TeachingContent } from "./TeachingContent";
import { formatChatTimestamp, formatFullTimestamp } from "./time-format";
import type { ActiveDrawer, Conversation, Message, SkillAction, TaskCard } from "./types";

export function ChatHeader({
  conversation,
  summary,
  subjectOptions = [],
  activeSubject,
  onSubjectChange,
  onOpenDrawer,
  onOpenStudentDetail,
  onOpenProfileSideChat,
  onOpenReport,
  onOpenMobileNavigation
}: {
  conversation: Conversation;
  summary: string;
  subjectOptions?: string[];
  activeSubject?: string;
  onSubjectChange?: (subject: string) => void;
  onOpenDrawer: (drawer: ActiveDrawer) => void;
  onOpenSideChat: () => void;
  onOpenStudentDetail?: () => void;
  onOpenProfileSideChat?: () => void;
  onOpenReport?: () => void;
  onOpenMobileNavigation?: () => void;
}) {
  const isAssistant = conversation.kind === "assistant";
  const canOpenStudentDetail = conversation.kind === "student" && onOpenStudentDetail;
  const openProfileContext = onOpenProfileSideChat ?? (() => onOpenDrawer("profile"));
  const showSubjectTabs = conversation.kind === "student" && subjectOptions.length > 1 && Boolean(activeSubject && onSubjectChange);

  return (
    <header className={cn("flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-[#edf0ee] bg-white/96 px-2.5 py-2 sm:flex-nowrap sm:px-6", showSubjectTabs ? "min-h-[84px] sm:min-h-[70px]" : "min-h-[56px]")}>
      <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1 sm:gap-3">
        {onOpenMobileNavigation ? (
          <IconButton label="打开会话列表" onClick={onOpenMobileNavigation} className="lg:hidden">
            <Menu size={20} />
          </IconButton>
        ) : null}
        <button
          type="button"
          onClick={canOpenStudentDetail ? onOpenStudentDetail : undefined}
          className={cn(
            "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition",
            conversation.kind === "class" ? "bg-[#e8f2ff] text-[#2563eb]" : "bg-[#eaf8ef] text-[#14883b]",
            canOpenStudentDetail ? "hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-[#22c55e]/30" : "cursor-default"
          )}
          aria-label={canOpenStudentDetail ? `查看${conversation.name}学生档案` : conversation.name}
        >
          {conversation.kind === "class" ? <UsersRound size={18} /> : isAssistant ? <Sparkles size={18} /> : conversation.avatar}
          {conversation.attention ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#ff4d4f]" /> : null}
        </button>
        <div className="min-w-0">
          <h1 className="break-words text-[15px] font-bold tracking-tight text-[#191c1d]">{isAssistant ? "学脉" : conversation.name}</h1>
          <p className="mt-0.5 truncate text-[11px] font-medium text-[#6b746d]">{summary}</p>
          {showSubjectTabs ? (
            <div className="mt-1 flex max-w-[460px] items-center gap-1.5 overflow-x-auto">
              {subjectOptions.map((subject) => {
                const active = subject === activeSubject;
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => onSubjectChange?.(subject)}
                    className={cn(
                      "h-8 shrink-0 rounded-full px-3 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/35",
                      active ? "bg-[#22c55e] text-white" : "bg-[#f3f5f4] text-[#5f6963] hover:bg-[#eaf8ef] hover:text-[#14883b]"
                    )}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 text-[#3d4a3d]">
        <IconButton label="搜索记录" onClick={() => onOpenDrawer("search")}>
          <Search size={18} />
        </IconButton>
        {isAssistant ? null : (
          <button type="button" onClick={openProfileContext} className="min-h-9 shrink-0 rounded-full bg-[#f2f6f3] px-2.5 text-[12px] font-bold hover:bg-[#eaf8ef]">{conversation.kind === "class" ? "班级资料" : "学生档案"}</button>
        )}
        {!isAssistant && onOpenReport ? <button type="button" onClick={onOpenReport} className="min-h-9 shrink-0 rounded-full bg-[#f2f6f3] px-2.5 text-[12px] font-bold hover:bg-[#eaf8ef]">学习报告</button> : null}
      </div>
    </header>
  );
}

export function EmptyConversationState({ name, onUpload, onStart, firstStudent = false }: { name: string; onUpload: () => void; onStart: () => void; firstStudent?: boolean }) {
  return <div className="mx-auto mt-12 w-full max-w-[420px] rounded-[18px] bg-white/92 p-4 text-center">
    <BookOpenCheck className="mx-auto text-[#22c55e]" size={24} />
    <h2 className="mt-3 text-xl font-bold text-[#191c1d]">{firstStudent ? "从第一位学生开始" : "记下" + name + "的这节课"}</h2>
    <p className="mt-2 text-[13px] font-medium leading-6 text-[#3d4a3d]">{firstStudent ? "建立学生档案后，就能记录课堂表现、准备家长反馈。" : "写下学了什么、学生怎样完成。学脉帮你整理，检查后就能生成家长反馈。"}</p>
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      <ActionButton active onClick={onStart}>{firstStudent ? "建立第一位学生档案" : "开始记录课堂"}</ActionButton>
      {!firstStudent ? <ActionButton onClick={onUpload}>添加学习材料</ActionButton> : null}
    </div>
  </div>;
}

export function MessageRow({
  message,
  task,
  conversation,
  onSkillAction,
  onSkillEdit,
  onSkillReview,
  highlighted
}: {
  message: Message;
  task?: TaskCard;
  conversation: Conversation;
  onSkillAction: (task: TaskCard, action: SkillAction) => void;
  onSkillEdit?: (task: TaskCard, value: string) => void | Promise<boolean>;
  onSkillReview?: (task: TaskCard) => void;
  highlighted?: boolean;
}) {
  if (message.type === "task" && task) {
    return (
      <div id={`task-card-${task.id}`} className={cn("rounded-[18px] transition-shadow duration-300", highlighted ? "ring-2 ring-[#22c55e]/35 ring-offset-2 ring-offset-[#f7f8f7]" : "")}>
        <SkillCard task={task} conversation={conversation} onAction={onSkillAction} onEdit={onSkillEdit} onReview={onSkillReview} />
      </div>
    );
  }

  if (message.type === "archive") {
    return null;
  }

  if (message.type === "image") {
    return <ImageMessage message={message} />;
  }

  return <TextMessage message={message} />;
}

function TextMessage({ message }: { message: Message }) {
  const teacher = message.sender === "teacher";
  const timeLabel = formatChatTimestamp(message.createdAt);
  const fullTimeLabel = formatFullTimestamp(message.createdAt);
  const displayContent = cleanSubjectPlaceholderText(message.content ?? "");

  if (!teacher) {
    return (
      <div className="flex justify-start">
        <div className="w-full max-w-[700px] px-1 py-1">
          <div className="mb-2 flex items-center gap-1 border-b border-[#e7e8e9] pb-1.5 text-[11px] font-semibold text-[#8a948d]">
            <span>学脉助手 · 已处理</span>
            <span>·</span>
            <time dateTime={message.createdAt} title={fullTimeLabel}>
              {timeLabel}
            </time>
            <ChevronRight size={12} />
          </div>
          <TeachingContent text={displayContent} className="text-[14px] font-medium leading-7 text-[#26312a]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="flex max-w-[460px] flex-col items-end gap-1">
        <div className="rounded-[16px] rounded-br-md bg-[#22c55e] px-3.5 py-2 text-[13px] font-semibold leading-6 text-white shadow-[0_8px_18px_rgba(34,197,94,0.12)]">
          {displayContent}
        </div>
        <time dateTime={message.createdAt} title={fullTimeLabel} className="pr-1 text-[10px] font-semibold text-[#9aa19d]">
          {timeLabel}
        </time>
      </div>
    </div>
  );
}

function ImageMessage({ message }: { message: Message }) {
  const attachments =
    message.attachments && message.attachments.length > 0
      ? message.attachments
      : [
          {
            id: message.id,
            fileName: message.fileName ?? "上传图片",
            imageUrl: message.imageUrl
          }
        ];
  const multiImage = attachments.length > 1;

  const timeLabel = formatChatTimestamp(message.createdAt);
  const fullTimeLabel = formatFullTimestamp(message.createdAt);

  return (
    <div className="ml-auto flex w-fit max-w-[260px] flex-col items-end gap-1">
      <div className="rounded-[18px_18px_6px_18px] bg-[#22c55e] p-2 text-white shadow-[0_10px_24px_rgba(34,197,94,0.18)]">
        <div className={cn(multiImage ? "flex max-w-[244px] flex-wrap gap-1.5" : "block")}>
          {attachments.map((attachment) => (
            <a key={attachment.id} href={`/api/xuemai/attachments/${encodeURIComponent(attachment.id)}`} download={attachment.fileName} title={`下载 ${attachment.fileName}`} className="relative flex h-[72px] w-[120px] overflow-hidden rounded-[12px] bg-white/90 text-[#3d4a3d]">
              {attachment.imageUrl ? <Image src={attachment.imageUrl} alt={attachment.fileName} fill className="object-cover" unoptimized /> : <span className="m-auto min-w-0 px-2 text-center"><FileImage className="mx-auto text-[#22c55e]" size={24} /><span className="mt-1 block truncate text-[11px]">{attachment.fileName}</span></span>}
            </a>
          ))}
        </div>
        {message.content ? <p className="mt-2 whitespace-pre-wrap px-1 pb-0.5 text-sm font-semibold leading-6">{cleanSubjectPlaceholderText(message.content)}</p> : null}
      </div>
      <time dateTime={message.createdAt} title={fullTimeLabel} className="pr-1 text-[10px] font-semibold text-[#9aa19d]">
        {timeLabel}
      </time>
    </div>
  );
}

export function ConfirmTaskCard({ onCancel, onStart, onRemember }: { onCancel: () => void; onStart: () => void; onRemember: () => void }) {
  return (
    <article className="w-full max-w-[420px] rounded-[18px] bg-white p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#dcfce7] text-[#16a34a]">
          <ImagePlus size={19} />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#191c1d]">检测到你上传了学习材料，是否开始分析？</h2>
          <p className="mt-1 text-xs text-[#3d4a3d]">默认执行：学习材料分析、生成微信反馈、整理学习记录。</p>
        </div>
      </div>
      <div className="mt-3 space-y-2 rounded-[14px] bg-[#f3f5f4] p-3">
        {["学习材料分析", "生成微信反馈", "整理学习记录"].map((item) => (
          <div key={item} className="flex items-center gap-2 text-[13px] font-semibold text-[#191c1d]">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#22c55e] text-white">
              <Check size={14} />
            </span>
            {item}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton active onClick={onStart}>
          开始分析
        </ActionButton>
        <ActionButton onClick={onRemember} muted>
          以后默认这样处理
        </ActionButton>
        <ActionButton onClick={onCancel}>取消</ActionButton>
      </div>
    </article>
  );
}

export function Composer({ value, onChange, onSend, onUpload, onRemoveAttachment, onQuickTask, quickTasks, activeQuickTask, attachments, busy = false, recordDate, onRecordDateChange }: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onUpload: () => void;
  onRemoveAttachment: (id: string) => void;
  onQuickTask: (task: string) => void;
  quickTasks: string[];
  activeQuickTask?: string;
  attachments: ComposerAttachment[];
  busy?: boolean;
  recordDate?: string;
  onRecordDateChange?: (value: string) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const element = inputRef.current; if (element) { element.style.height = "auto"; element.style.height = Math.min(element.scrollHeight, 144) + "px"; } }, [value]);
  const submitLabel = busy ? "正在整理…" : activeQuickTask || (attachments.length ? "分析材料" : "整理记录");
  return <div className="shrink-0 bg-gradient-to-t from-[#f7f8f7] via-[#f7f8f7]/96 to-[#f7f8f7]/60 px-3 pb-3 pt-2 sm:px-6 sm:pb-4">
    <div className="mx-auto w-full max-w-[820px]">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2 text-[12px] font-semibold text-[#5c665f]">
        <label className="flex min-h-8 items-center gap-2">课堂日期<input aria-label="记录日期" type="date" required max={new Date().toLocaleDateString("en-CA")} value={recordDate} onChange={event => onRecordDateChange?.(event.target.value)} className="min-w-0 rounded-full border border-[#e3e6e4] bg-white px-2 py-1" /></label>
        {quickTasks.length ? <details className="max-w-full">
          <summary className="cursor-pointer py-2">{activeQuickTask ? "当前：" + activeQuickTask : "更多教学工具"}</summary>
          <div className="flex max-w-[420px] flex-wrap gap-2 py-2">{quickTasks.map(task => <button key={task} type="button" aria-pressed={activeQuickTask === task} onClick={() => onQuickTask(task)} className={cn("rounded-full border px-3 py-2", activeQuickTask === task ? "border-[#22c55e] bg-[#dcfce7] text-[#15803d]" : "border-[#e3e6e4] bg-white")}>{task}</button>)}</div>
        </details> : null}
      </div>
      <div className="relative rounded-[24px] border border-[#e5e8e6] bg-white px-3.5 py-2 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        {attachments.length > 0 ? <div className="mb-2 flex gap-2 overflow-x-auto pb-1">{attachments.map(attachment => <ComposerAttachmentPreview key={attachment.id} attachment={attachment} onRemove={() => onRemoveAttachment(attachment.id)} />)}</div> : null}
        <label htmlFor="classroom-input" className="sr-only">课堂内容与学生表现</label>
        <textarea ref={inputRef} id="classroom-input" value={value} rows={2} aria-label="消息输入" onChange={event => onChange(event.target.value)} onKeyDown={event => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !busy) { event.preventDefault(); onSend(); }
        }} placeholder={attachments.length ? "可补充学生作答、订正或老师观察到的表现…" : activeQuickTask ? "填写" + activeQuickTask + "需要的内容…" : "例如：今天学习分数约分，提醒后能独立订正，下次课留意是否主动检查。"} className="block max-h-36 min-h-12 w-full resize-none bg-transparent py-2 text-[13px] font-medium leading-6 text-[#191c1d] outline-none placeholder:text-[#6b746d]" />
        <div className="flex items-center justify-between gap-2">
          <button type="button" disabled={busy} onClick={onUpload} className="inline-flex min-h-9 items-center gap-1.5 text-[12px] font-semibold text-[#5c665f] disabled:opacity-50"><Paperclip size={17} />添加材料</button>
          <button type="button" onClick={onSend} disabled={busy || (!value.trim() && !attachments.length)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#22c55e] px-3 text-[12px] font-bold text-white transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:bg-[#c7cec9]" aria-label={submitLabel}><Send size={15} />{submitLabel}</button>
        </div>
      </div>
    </div>
  </div>;
}

export type ComposerAttachment = {
  id: string;
  fileName: string;
  imageUrl?: string;
};

function ComposerAttachmentPreview({ attachment, onRemove }: { attachment: ComposerAttachment; onRemove: () => void }) {
  return (
    <div title={attachment.fileName} className="group relative flex h-[68px] w-[104px] shrink-0 overflow-hidden rounded-[13px] border border-[#e3e6e4] bg-[#f3f5f4]">
      {attachment.imageUrl ? <Image src={attachment.imageUrl} alt={attachment.fileName} fill className="object-cover" unoptimized /> : <span className="m-auto min-w-0 px-2 text-center"><FileImage className="mx-auto text-[#8a948d]" size={22} /><span className="mt-1 block truncate text-[11px]">{attachment.fileName}</span></span>}
      <button type="button" onClick={onRemove} className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-xs font-bold text-white opacity-90 transition hover:bg-black/70" aria-label={`移除 ${attachment.fileName}`}>
        ×
      </button>
    </div>
  );
}
