import Image from "next/image";
import type React from "react";
import { useState } from "react";
import { Bell, BookOpenCheck, CalendarClock, Check, ChevronRight, Clock3, FileImage, ImagePlus, Info, Menu, MessageSquareText, Paperclip, Plus, RotateCcw, Search, Send, Sparkles, User, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionButton, IconButton } from "./shared";
import { SkillCard } from "./SkillCard";
import { cleanSubjectPlaceholderText } from "./subject-utils";
import { formatChatTimestamp, formatFullTimestamp } from "./time-format";
import type { ActiveDrawer, Conversation, Message, SkillAction, SmartInputAction, TaskCard } from "./types";

export function ChatHeader({
  conversation,
  summary,
  subjectOptions = [],
  activeSubject,
  onSubjectChange,
  onOpenDrawer,
  onOpenSideChat,
  onOpenStudentDetail,
  onOpenProfileSideChat,
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
  onOpenMobileNavigation?: () => void;
}) {
  const isAssistant = conversation.kind === "assistant";
  const canOpenStudentDetail = conversation.kind === "student" && onOpenStudentDetail;
  const openProfileContext = onOpenProfileSideChat ?? (() => onOpenDrawer("profile"));
  const showSubjectTabs = conversation.kind === "student" && subjectOptions.length > 1 && Boolean(activeSubject && onSubjectChange);

  return (
    <header className={cn("flex shrink-0 items-center justify-between border-b border-[#edf0ee] bg-white/96 px-2.5 sm:px-6", showSubjectTabs ? "h-[84px] sm:h-[70px]" : "h-[56px]")}>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
          <h1 className="truncate text-[15px] font-bold tracking-tight text-[#191c1d]">{conversation.name}</h1>
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
      <div className="flex items-center gap-1.5 text-[#3d4a3d]">
        {isAssistant ? null : (
          <IconButton label="打开侧边聊天" onClick={onOpenSideChat} className="bg-[#f2f6f3] text-[#3d4a3d] hover:bg-[#eaf8ef] hover:text-[#006e2f]">
            <MessageSquareText size={18} />
          </IconButton>
        )}
        <IconButton label="搜索记录" onClick={() => onOpenDrawer("search")}>
          <Search size={18} />
        </IconButton>
        {isAssistant ? null : (
          <IconButton label={conversation.kind === "class" ? "班级资料" : "学生详情"} onClick={openProfileContext} className="bg-[#f2f6f3] text-[#3d4a3d] hover:bg-[#eaf8ef] hover:text-[#006e2f]">
            {conversation.kind === "class" ? <UsersRound size={18} /> : <User size={18} />}
          </IconButton>
        )}
      </div>
    </header>
  );
}

export type AutomationTemplate = {
  label: string;
  prompt: string;
  description: string;
};

export function AutomationAssistantEmptyState({
  templates,
  onSelectTemplate
}: {
  templates: AutomationTemplate[];
  onSelectTemplate: (prompt: string) => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-196px)] flex-col px-2 py-5">
      <div className="max-w-[620px]">
        <h2 className="text-[32px] font-semibold tracking-tight text-[#191c1d]">自动化</h2>
        <p className="mt-2 text-[15px] font-medium text-[#7a817d]">
          按计划或按需运行教学服务任务。选择模板后会先填入输入框，你可以改完再发送。
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="relative flex h-[320px] w-[320px] items-center justify-center rounded-full border-[32px] border-[#1f2327]/42 text-[#1f2327]/42">
          <Clock3 size={160} strokeWidth={1.5} />
          <div className="absolute -bottom-7 left-1/2 w-[520px] -translate-x-1/2 text-center">
            <h3 className="text-[18px] font-bold text-[#191c1d]">创建第一个自动化</h3>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {templates.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => onSelectTemplate(template.prompt)}
                  className="inline-flex h-9 items-center gap-2 rounded-[12px] border border-[#e3e6e4] bg-white/88 px-4 text-[13px] font-bold text-[#2f3832] transition hover:bg-[#f4f7f5]"
                  title={template.description}
                >
                  {template.label === "每日简报" ? <Bell size={16} /> : template.label === "每周回顾" ? <CalendarClock size={16} /> : <Search size={16} />}
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyConversationState({ onUpload, onFeedback, onLesson }: { onUpload: () => void; onFeedback: () => void; onLesson: () => void }) {
  return (
    <div className="mx-auto mt-12 w-full max-w-[420px] rounded-[18px] bg-white/92 p-4 text-center">
      <Sparkles className="mx-auto text-[#22c55e]" size={24} />
      <h2 className="mt-3 text-xl font-bold text-[#191c1d]">还没有记录</h2>
      <p className="mt-1.5 text-[13px] font-medium leading-5 text-[#3d4a3d]">你可以上传试卷、输入要求，或点击下方快捷任务开始。</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <ActionButton onClick={onUpload} active>
          上传试卷
        </ActionButton>
        <ActionButton onClick={onFeedback} muted>
          生成微信反馈
        </ActionButton>
        <ActionButton onClick={onLesson}>下次课建议</ActionButton>
      </div>
    </div>
  );
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
  onSkillEdit?: (task: TaskCard, value: string) => void;
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
          <p className="whitespace-pre-wrap text-[14px] font-medium leading-7 text-[#26312a]">{displayContent}</p>
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
            <div key={attachment.id} className="relative flex h-[72px] w-[120px] overflow-hidden rounded-[12px] bg-white/90 text-[#3d4a3d]">
              {attachment.imageUrl ? <Image src={attachment.imageUrl} alt={attachment.fileName} fill className="object-cover" unoptimized /> : <FileImage className="m-auto text-[#22c55e]" size={30} />}
            </div>
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

export function Composer({
  value,
  onChange,
  onSend,
  onUpload,
  onRemoveAttachment,
  onQuickTask,
  onSmartAction,
  quickTasks,
  activeQuickTask,
  attachments,
  smartHintsEnabled
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onUpload: () => void;
  onRemoveAttachment: (id: string) => void;
  onQuickTask: (task: string) => void;
  onSmartAction: (action: SmartInputAction) => void;
  quickTasks: string[];
  activeQuickTask?: string;
  attachments: ComposerAttachment[];
  smartHintsEnabled?: boolean;
}) {
  const insight = smartHintsEnabled === false || activeQuickTask ? null : detectInputInsight(value);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const materialSkill = quickTasks.find((task) => task.includes("分析") || task.includes("试卷") || task.includes("材料"));
  const recordSkill = quickTasks.find((task) => task.includes("记录") || task.includes("班课"));

  function selectQuickTask(task?: string) {
    if (!task) return;
    onQuickTask(task);
    setAttachmentMenuOpen(false);
  }

  function openUploadPicker() {
    setAttachmentMenuOpen(false);
    onUpload();
  }

  return (
    <div className="shrink-0 bg-gradient-to-t from-[#f7f8f7] via-[#f7f8f7]/96 to-[#f7f8f7]/60 px-3 pb-3 pt-2 sm:px-6 sm:pb-4">
      <div className="mx-auto w-full max-w-[820px]">
        <div className="xuemai-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {quickTasks.map((task) => (
            <button key={task} type="button" aria-pressed={activeQuickTask === task} onClick={() => onQuickTask(task)} className={cn("inline-flex h-11 shrink-0 items-center rounded-full border px-3.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/35 sm:h-8", activeQuickTask === task ? "border-[#22c55e] bg-[#dcfce7] text-[#15803d]" : "border-[#e3e6e4] bg-white/92 text-[#5c665f] hover:border-[#caead6] hover:bg-[#edf8f1]")}>
              {task}
            </button>
          ))}
        </div>
        {insight ? <SmartInputHint insight={insight} onAction={onSmartAction} /> : null}
        <div className="relative rounded-[24px] border border-[#e5e8e6] bg-white px-3.5 py-2 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
          {attachmentMenuOpen ? (
            <div className="absolute bottom-[58px] left-3 z-30 w-56 overflow-hidden rounded-[16px] border border-[#e3e6e4] bg-white p-1.5 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
              <AttachmentMenuItem icon={<ImagePlus size={17} />} title="上传图片/试卷" subtitle="选择后再打开文件" onClick={openUploadPicker} />
              {materialSkill ? <AttachmentMenuItem icon={<BookOpenCheck size={17} />} title="分析学习材料" subtitle="选择后继续输入或上传" onClick={() => selectQuickTask(materialSkill)} /> : null}
              {recordSkill ? <AttachmentMenuItem icon={<Paperclip size={17} />} title="课堂记录草稿" subtitle="把输入整理成可入档记录" onClick={() => selectQuickTask(recordSkill)} /> : null}
            </div>
          ) : null}
          {attachments.length > 0 ? (
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {attachments.map((attachment) => (
                <ComposerAttachmentPreview key={attachment.id} attachment={attachment} onRemove={() => onRemoveAttachment(attachment.id)} />
              ))}
            </div>
          ) : null}
          <div className="flex min-h-[38px] items-end gap-2">
            <IconButton label="添加" onClick={() => setAttachmentMenuOpen((open) => !open)} className={attachmentMenuOpen ? "bg-[#f3f4f5]" : undefined}>
              <Plus size={22} />
            </IconButton>
            <textarea
              value={value}
              rows={1}
              aria-label="消息输入"
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              placeholder={attachments.length > 0 ? "补充说明，或直接发送学习材料..." : activeQuickTask ? `输入内容后使用「${activeQuickTask}」处理...` : "输入要求，或上传试卷让 AI 处理..."}
              className="max-h-24 min-h-9 flex-1 resize-none bg-transparent py-2 text-[13px] font-medium leading-5 text-[#191c1d] outline-none placeholder:text-[#a4aba6]"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim() && attachments.length === 0}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_10px_24px_rgba(34,197,94,0.2)] transition hover:bg-[#16a34a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/35 disabled:cursor-not-allowed disabled:bg-[#c7cec9] disabled:shadow-none sm:h-9 sm:w-9"
              aria-label="发送"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type ComposerAttachment = {
  id: string;
  fileName: string;
  imageUrl?: string;
};

function ComposerAttachmentPreview({ attachment, onRemove }: { attachment: ComposerAttachment; onRemove: () => void }) {
  return (
    <div className="group relative flex h-[68px] w-[104px] shrink-0 overflow-hidden rounded-[13px] border border-[#e3e6e4] bg-[#f3f5f4]">
      {attachment.imageUrl ? <Image src={attachment.imageUrl} alt={attachment.fileName} fill className="object-cover" unoptimized /> : <FileImage className="m-auto text-[#8a948d]" size={24} />}
      <button type="button" onClick={onRemove} className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-xs font-bold text-white opacity-90 transition hover:bg-black/70" aria-label={`移除 ${attachment.fileName}`}>
        ×
      </button>
    </div>
  );
}

function AttachmentMenuItem({
  icon,
  title,
  subtitle,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition hover:bg-[#f3f4f5]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#f3f4f5] text-[#3d4a3d]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-[#191c1d]">{title}</span>
        <span className="mt-0.5 block truncate text-[11px] font-medium text-[#8a948d]">{subtitle}</span>
      </span>
    </button>
  );
}

function SmartInputHint({
  insight,
  onAction
}: {
  insight: { label: string; icon: React.ReactNode };
  onAction: (action: SmartInputAction) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-[16px] bg-white/88 px-3 py-2 text-xs">
      <span className="flex items-center gap-1.5 font-bold text-[#15803d]">
        {insight.icon}
        检测到这可能是一条{insight.label}
      </span>
      <button type="button" onClick={() => onAction("save_learning_record")} className="rounded-full bg-[#dcfce7] px-2.5 py-1 font-bold text-[#15803d] transition hover:bg-[#caead6]">
        整理为学习记录
      </button>
      <button type="button" onClick={() => onAction("generate_feedback")} className="rounded-full bg-[#22c55e] px-2.5 py-1 font-bold text-white transition hover:bg-[#16a34a]">
        生成家长反馈
      </button>
      <button type="button" onClick={() => onAction("save_note")} className="rounded-full border border-[#bccbb9] px-2.5 py-1 font-bold text-[#3d4a3d] transition hover:bg-[#f3f4f5]">
        仅保存备注
      </button>
    </div>
  );
}

function detectInputInsight(value: string) {
  const text = value.trim();
  if (text.length < 8) return null;
  if (text.includes("家长") || text.includes("微信") || text.includes("反馈")) return { label: "家长沟通", icon: <MessageSquareText size={13} /> };
  if (text.includes("错题") || text.includes("试卷") || text.includes("卷子") || text.includes("作业") || text.includes("作文") || text.includes("阅读") || text.includes("口语") || text.includes("实验") || text.includes("作品")) return { label: "学习材料", icon: <BookOpenCheck size={13} /> };
  if (text.includes("月报") || text.includes("本月") || text.includes("总结")) return { label: "月报素材", icon: <Info size={13} /> };
  if (text.includes("课堂") || text.includes("今天") || text.includes("上课") || text.includes("课后")) return { label: "课堂记录", icon: <Sparkles size={13} /> };
  return { label: "普通备注", icon: <RotateCcw size={13} /> };
}
