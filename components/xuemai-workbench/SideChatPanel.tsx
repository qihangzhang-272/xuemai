import { useEffect, useState } from "react";
import { FileText, FolderOpen, GraduationCap, MapPin, MessageSquareText, Plus, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatChatTimestamp, formatFullTimestamp } from "./time-format";
import { StudentProfileWorkspace } from "./StudentDetailModal";
import { LearningEvidenceReportPanel } from "./LearningEvidenceReportPanel";
import { MonthlyReportPanel } from "./MonthlyReportPanel";
import { getLearningEvidenceReport } from "./learning-evidence-report-view";
import { getMonthlyReport } from "./monthly-report-view";
import { normalizeSubjectText } from "./subject-utils";
import type { Conversation, SideChatContextOption, SideChatContextType, SideChatSession, SkillAction, TaskCard, TimelineRecord } from "./types";

type SideChatPanelProps = {
  sessions: SideChatSession[];
  activeSession?: SideChatSession;
  activeSessionId: string | null;
  contextOptions: SideChatContextOption[];
  conversation: Conversation;
  classMembers?: Conversation[];
  conversationName: string;
  taskCards: TaskCard[];
  timelineRecords: TimelineRecord[];
  composerValue: string;
  onComposerChange: (value: string) => void;
  onCreateSession: (option: SideChatContextOption) => void;
  onSelectSession: (id: string) => void;
  onCloseSession: (id: string) => void;
  onSend: () => void;
  onOpenTask?: (taskId: string) => void;
  onLocateTarget?: (session: SideChatSession) => void;
  onClosePanel?: () => void;
  onTaskAction?: (task: TaskCard, action: SkillAction) => void;
  onTaskEdit?: (task: TaskCard, value: string) => void;
  onTaskReset?: (task: TaskCard) => void;
  onEditProfile?: (conversation: Conversation) => void;
  autoArchiveLearningEvidence?: boolean;
  onAutoArchiveLearningEvidenceChange?: (enabled: boolean) => void;
  onTaskConfirmProfileUpdates?: (task: TaskCard, selectedSuggestionIds: string[]) => void;
};

export function SideChatPanel({
  sessions,
  activeSession,
  activeSessionId,
  contextOptions,
  conversation,
  classMembers = [],
  conversationName,
  taskCards,
  timelineRecords,
  composerValue,
  onComposerChange,
  onCreateSession,
  onSelectSession,
  onCloseSession,
  onSend,
  onOpenTask,
  onLocateTarget,
  onClosePanel,
  onTaskAction,
  onTaskEdit,
  onTaskReset,
  onEditProfile,
  autoArchiveLearningEvidence,
  onAutoArchiveLearningEvidenceChange,
  onTaskConfirmProfileUpdates
}: SideChatPanelProps) {
  const [isCreating, setIsCreating] = useState(!activeSession);
  const showPicker = isCreating || !activeSession;
  const sourceTask = activeSession?.sourceId ? taskCards.find((task) => task.id === activeSession.sourceId) : undefined;
  const learningReportTask = sourceTask && activeSession?.contextType === "learning_material" && getLearningEvidenceReport(sourceTask) ? sourceTask : undefined;
  const monthlyReportTask = sourceTask && activeSession?.contextType === "monthly_report" && getMonthlyReport(sourceTask) ? sourceTask : undefined;

  useEffect(() => {
    if (!activeSession) {
      setIsCreating(true);
    }
  }, [activeSession]);

  return (
    <section className="flex min-h-0 w-full flex-col bg-[#f7f8f7]">
      <div className="flex h-[56px] shrink-0 items-center gap-1 border-b border-[#edf0ee] bg-white/96 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {sessions.length ? (
            sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group inline-flex h-8 max-w-[210px] shrink-0 items-center rounded-full text-[12px] font-bold transition",
                  activeSessionId === session.id ? "bg-[#f3f5f4] text-[#191c1d]" : "text-[#69736d] hover:bg-[#f7f8f7] hover:text-[#191c1d]"
                )}
                title={session.title}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    onSelectSession(session.id);
                  }}
                  className="inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-full py-1.5 pl-3 pr-1.5 text-left"
                >
                  <MessageSquareText size={14} className="shrink-0" />
                  <span className="truncate">{session.title}</span>
                </button>
                {sessions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onCloseSession(session.id)}
                    className={cn(
                      "mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition",
                      activeSessionId === session.id ? "text-[#8a918d] hover:bg-white hover:text-[#191c1d]" : "text-transparent group-hover:text-[#8a918d] group-hover:hover:bg-[#edf0ee] group-hover:hover:text-[#191c1d]"
                    )}
                    aria-label={`关闭${session.title}`}
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <div className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#f3f5f4] px-3 text-[12px] font-bold text-[#191c1d]">
              <MessageSquareText size={14} />
              侧边聊天
            </div>
          )}
          <button type="button" onClick={() => setIsCreating(true)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#69736d] transition hover:bg-[#f3f5f4] hover:text-[#191c1d]" aria-label="新增侧边聊天">
            <Plus size={18} />
          </button>
        </div>
        {onClosePanel ? (
          <button type="button" onClick={onClosePanel} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8a918d] transition hover:bg-[#f3f5f4] hover:text-[#191c1d]" aria-label="收起侧边聊天">
            <X size={16} />
          </button>
        ) : null}
      </div>

      {showPicker ? (
        <ContextPicker
          options={contextOptions}
          onCreateSession={(option) => {
            setIsCreating(false);
            onCreateSession(option);
          }}
        />
      ) : learningReportTask ? (
        <LearningReportSideChat
          conversation={conversation}
          task={learningReportTask}
          activeSession={activeSession}
          composerValue={composerValue}
          onComposerChange={onComposerChange}
          onSend={onSend}
          onAction={onTaskAction}
          onEdit={onTaskEdit}
          onReset={onTaskReset}
          autoArchiveLearningEvidence={autoArchiveLearningEvidence}
          onAutoArchiveLearningEvidenceChange={onAutoArchiveLearningEvidenceChange}
          onConfirmProfileUpdates={onTaskConfirmProfileUpdates}
        />
      ) : activeSession.contextType === "monthly_report" ? (
        <MonthlyReportSideChat
          conversation={conversation}
          classMembers={classMembers}
          task={monthlyReportTask}
          activeSession={activeSession}
          composerValue={composerValue}
          onComposerChange={onComposerChange}
          onSend={onSend}
        />
      ) : activeSession.contextType === "student_profile" && conversation.kind === "student" ? (
        <StudentProfileWorkspace student={conversation} taskCards={taskCards} timelineRecords={timelineRecords} onClose={onClosePanel} onOpenTask={onOpenTask} onEditProfile={onEditProfile} />
      ) : activeSession.contextType === "student_profile" && conversation.kind === "class" ? (
        <ClassProfileWorkspace conversation={conversation} classMembers={classMembers} taskCards={taskCards} timelineRecords={timelineRecords} onClose={onClosePanel} onEditProfile={onEditProfile} />
      ) : (
        <>
          <div className="border-b border-[#edf0ee] bg-white/90 px-6 py-3">
            <div className="mx-auto w-full max-w-[820px] space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#22c55e]">定位目标</p>
                  <h2 className="mt-1 truncate text-[15px] font-bold text-[#191c1d]">{activeSession.contextLabel}</h2>
                </div>
                {onLocateTarget ? (
                  <button
                    type="button"
                    onClick={() => onLocateTarget(activeSession)}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#f3f5f4] px-3 text-[12px] font-bold text-[#3d4a3d] transition hover:bg-[#eaf8ef] hover:text-[#15803d]"
                  >
                    <MapPin size={14} />
                    定位
                  </button>
                ) : null}
              </div>
              <p className="text-[12px] font-medium leading-5 text-[#69736d]">
                {conversationName} · {getContextTypeLabel(activeSession.contextType)}
                {activeSession.sourceId ? " · 已绑定来源卡片" : " · 当前会话上下文"}
              </p>
              <p className="text-[12px] font-medium leading-5 text-[#69736d]">只围绕这个目标继续追问；正式输出仍需回到 AI 结果卡，并由老师确认后入档。</p>
            </div>
          </div>
          <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="mx-auto w-full max-w-[820px] space-y-3">
              {activeSession.messages.map((message) => {
                const teacher = message.sender === "teacher";
                return (
                  <div key={message.id} className={cn("flex", teacher ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[86%] rounded-[16px] px-3 py-2 text-[13px] font-medium leading-6", teacher ? "rounded-br-md bg-[#22c55e] text-white" : "rounded-bl-md bg-[#f3f5f4] text-[#26312a]")}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <time dateTime={message.createdAt} title={formatFullTimestamp(message.createdAt)} className={cn("mt-1 block text-[10px] font-semibold", teacher ? "text-white/72" : "text-[#9aa19d]")}>
                        {formatChatTimestamp(message.createdAt)}
                      </time>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="shrink-0 bg-gradient-to-t from-[#f7f8f7] via-[#f7f8f7]/96 to-[#f7f8f7]/60 px-6 pb-4 pt-2">
            <div className="mx-auto w-full max-w-[820px] rounded-[22px] bg-white px-3 py-2 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <textarea
                value={composerValue}
                onChange={(event) => onComposerChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSend();
                  }
                }}
                rows={2}
                className="max-h-24 min-h-[42px] w-full resize-none bg-transparent text-[13px] font-medium leading-6 text-[#191c1d] outline-none placeholder:text-[#a7aca9]"
                placeholder="围绕当前上下文追问..."
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#9aa19d]">侧聊不会自动入档</span>
                <button type="button" onClick={onSend} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e] text-white transition hover:bg-[#16a34a]" aria-label="发送侧边聊天消息">
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ClassProfileWorkspace({
  conversation,
  classMembers,
  taskCards,
  timelineRecords,
  onClose,
  onEditProfile
}: {
  conversation: Conversation;
  classMembers: Conversation[];
  taskCards: TaskCard[];
  timelineRecords: TimelineRecord[];
  onClose?: () => void;
  onEditProfile?: (conversation: Conversation) => void;
}) {
  const pendingCards = taskCards.filter((task) => task.status !== "archived" && task.status !== "feedback_done").length;
  const monthlyCards = taskCards.filter((task) => task.taskType === "monthly_report").length;
  const attentionMembers = classMembers.filter((member) => member.attention);
  const latestRecords = [
    ...taskCards.map((task) => ({
      id: task.id,
      title: task.title,
      summary: task.summary ?? task.feedbackText ?? "待入档的教学结果。",
      time: formatChatTimestamp(task.updatedAt)
    })),
    ...timelineRecords.map((record) => ({
      id: record.id,
      title: record.title,
      summary: record.summary,
      time: formatChatTimestamp(record.createdAt)
    }))
  ].slice(0, 4);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col bg-[#f7f8f7]">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e8e6] bg-white/92 px-5 backdrop-blur-xl">
        <div>
          <h2 className="text-[17px] font-black tracking-tight text-[#191c1d]">班级资料</h2>
          <p className="mt-0.5 text-[10px] font-bold text-[#8a948d]">面向班课复盘、批量反馈和月报</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onEditProfile?.(conversation)} className="h-8 rounded-full bg-[#f3f5f4] px-3 text-[12px] font-black text-[#3d4a3d] transition hover:bg-[#eaf8ef] hover:text-[#15803d]">
            修改
          </button>
          {onClose ? (
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#8a918d] transition hover:bg-[#f3f5f4] hover:text-[#191c1d]" aria-label="关闭班级资料">
              <X size={16} />
            </button>
          ) : null}
        </div>
      </header>

      <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-4">
          <section className="rounded-[22px] bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-[#22c55e]">当前班级</p>
                <h3 className="mt-1 truncate text-[22px] font-black tracking-tight text-[#191c1d]">{conversation.name}</h3>
                <p className="mt-1 text-[12px] font-semibold text-[#6b746d]">
                  {conversation.grade} · {normalizeSubjectText(conversation.subject)} · {classMembers.length || conversation.members || 0} 名学生
                </p>
              </div>
              <span className="rounded-full bg-[#fef4d5] px-3 py-1.5 text-[11px] font-black text-[#784e1a]">{pendingCards ? `${pendingCards} 项待处理` : "暂无待处理"}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <ClassMetric label="学生" value={`${classMembers.length || conversation.members || 0}`} />
              <ClassMetric label="月报" value={`${monthlyCards}`} />
              <ClassMetric label="需关注" value={`${attentionMembers.length}`} />
            </div>
          </section>

          <section className="rounded-[22px] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-black text-[#191c1d]">班级学生</h3>
              <p className="text-[11px] font-bold text-[#8a948d]">按当前班级聚合</p>
            </div>
            <div className="space-y-2">
              {(classMembers.length ? classMembers : []).map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-[16px] bg-[#f7f8f7] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf8ef] text-[13px] font-black text-[#14883b]">{member.avatar}</div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-black text-[#191c1d]">{member.name}</p>
                      <p className="truncate text-[11px] font-semibold text-[#6b746d]">{normalizeSubjectText(member.subject)}</p>
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-black", member.attention ? "bg-[#fff1f1] text-[#dc2626]" : "bg-[#eaf8ef] text-[#14883b]")}>{member.attention ? "需关注" : member.statusLabel}</span>
                </div>
              ))}
              {!classMembers.length ? <p className="rounded-[16px] bg-[#f7f8f7] px-3 py-3 text-[12px] font-semibold text-[#6b746d]">这个班级还没有添加学生。</p> : null}
            </div>
          </section>

          <section className="rounded-[22px] bg-white p-5">
            <h3 className="text-[15px] font-black text-[#191c1d]">教学关注</h3>
            <div className="mt-3 grid gap-2">
              <ClassSignal label="共性薄弱点" value="条件提取、过程书写、答案完整性" />
              <ClassSignal label="下月重点" value="共性错因复盘，再按学生层级安排变式训练" />
              <ClassSignal label="反馈优先级" value={pendingCards ? "先处理待反馈和待入档卡片" : "当前没有阻塞项"} />
            </div>
          </section>

          <section className="rounded-[22px] bg-white p-5">
            <h3 className="text-[15px] font-black text-[#191c1d]">最近班课记录</h3>
            <div className="mt-3 space-y-3">
              {latestRecords.map((record) => (
                <div key={record.id} className="border-l-2 border-[#d9eadf] pl-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-black text-[#26312a]">{record.title}</p>
                    <time className="shrink-0 text-[10px] font-bold text-[#9aa19d]">{record.time}</time>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-[#5f6963]">{record.summary}</p>
                </div>
              ))}
              {!latestRecords.length ? <p className="text-[12px] font-semibold text-[#6b746d]">还没有班课记录。</p> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ClassMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[#f7f8f7] px-3 py-3 text-center">
      <p className="text-[17px] font-black text-[#191c1d]">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold text-[#8a948d]">{label}</p>
    </div>
  );
}

function ClassSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[#f7f8f7] px-3 py-3">
      <p className="text-[11px] font-black text-[#22c55e]">{label}</p>
      <p className="mt-1 text-[13px] font-semibold leading-5 text-[#3d4a3d]">{value}</p>
    </div>
  );
}

function LearningReportSideChat({
  conversation,
  task,
  activeSession,
  composerValue,
  onComposerChange,
  onSend,
  onAction,
  onEdit,
  onReset,
  autoArchiveLearningEvidence,
  onAutoArchiveLearningEvidenceChange,
  onConfirmProfileUpdates
}: {
  conversation: Conversation;
  task: TaskCard;
  activeSession: SideChatSession;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  onAction?: (task: TaskCard, action: SkillAction) => void;
  onEdit?: (task: TaskCard, value: string) => void;
  onReset?: (task: TaskCard) => void;
  autoArchiveLearningEvidence?: boolean;
  onAutoArchiveLearningEvidenceChange?: (enabled: boolean) => void;
  onConfirmProfileUpdates?: (task: TaskCard, selectedSuggestionIds: string[]) => void;
}) {
  return (
    <>
      <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-[980px] space-y-4">
          <LearningEvidenceReportPanel
            conversation={conversation}
            task={task}
            autoArchiveEnabled={autoArchiveLearningEvidence}
            onAction={onAction}
            onEdit={onEdit}
            onReset={onReset}
            onAutoArchivePreferenceChange={onAutoArchiveLearningEvidenceChange}
            onConfirmProfileUpdates={onConfirmProfileUpdates}
          />
          {activeSession.messages.length ? (
            <section className="space-y-2 border-t border-[#edf0ee] pt-3">
              <p className="text-[12px] font-bold text-[#69736d]">围绕这份报告的追问</p>
              {activeSession.messages.map((message) => {
                const teacher = message.sender === "teacher";
                return (
                  <div key={message.id} className={cn("flex", teacher ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[86%] rounded-[16px] px-3 py-2 text-[13px] font-medium leading-6", teacher ? "rounded-br-md bg-[#22c55e] text-white" : "rounded-bl-md bg-white text-[#26312a]")}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <time dateTime={message.createdAt} title={formatFullTimestamp(message.createdAt)} className={cn("mt-1 block text-[10px] font-semibold", teacher ? "text-white/72" : "text-[#9aa19d]")}>
                        {formatChatTimestamp(message.createdAt)}
                      </time>
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}
        </div>
      </div>
      <SideChatComposer value={composerValue} onChange={onComposerChange} onSend={onSend} placeholder="围绕这份报告继续问..." />
    </>
  );
}

function MonthlyReportSideChat({
  conversation,
  classMembers,
  task,
  activeSession,
  composerValue,
  onComposerChange,
  onSend
}: {
  conversation: Conversation;
  classMembers: Conversation[];
  task?: TaskCard;
  activeSession: SideChatSession;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <>
      <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-[980px] space-y-4">
          <MonthlyReportPanel conversation={conversation} task={task} classMembers={classMembers} />
          {activeSession.messages.length ? (
            <section className="space-y-2 border-t border-[#edf0ee] pt-3">
              <p className="text-[12px] font-bold text-[#69736d]">围绕这份月报的追问</p>
              {activeSession.messages.map((message) => {
                const teacher = message.sender === "teacher";
                return (
                  <div key={message.id} className={cn("flex", teacher ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[86%] rounded-[16px] px-3 py-2 text-[13px] font-medium leading-6", teacher ? "rounded-br-md bg-[#22c55e] text-white" : "rounded-bl-md bg-white text-[#26312a]")}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <time dateTime={message.createdAt} title={formatFullTimestamp(message.createdAt)} className={cn("mt-1 block text-[10px] font-semibold", teacher ? "text-white/72" : "text-[#9aa19d]")}>
                        {formatChatTimestamp(message.createdAt)}
                      </time>
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}
        </div>
      </div>
      <SideChatComposer value={composerValue} onChange={onComposerChange} onSend={onSend} placeholder="围绕这份月报继续问..." />
    </>
  );
}

function SideChatComposer({ value, onChange, onSend, placeholder }: { value: string; onChange: (value: string) => void; onSend: () => void; placeholder: string }) {
  return (
    <div className="shrink-0 bg-gradient-to-t from-[#f7f8f7] via-[#f7f8f7]/96 to-[#f7f8f7]/60 px-6 pb-4 pt-2">
      <div className="mx-auto w-full max-w-[980px] rounded-[22px] bg-white px-3 py-2 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          rows={2}
          className="max-h-24 min-h-[42px] w-full resize-none bg-transparent text-[13px] font-medium leading-6 text-[#191c1d] outline-none placeholder:text-[#a7aca9]"
          placeholder={placeholder}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[#9aa19d]">侧聊不会自动入档</span>
          <button type="button" onClick={onSend} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e] text-white transition hover:bg-[#16a34a]" aria-label="发送侧边聊天消息">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ContextPicker({ options, onCreateSession }: { options: SideChatContextOption[]; onCreateSession: (option: SideChatContextOption) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto w-full max-w-[720px]">
      <div className="mb-5">
        <Sparkles size={20} className="text-[#22c55e]" />
        <h2 className="mt-2 text-[18px] font-bold tracking-tight text-[#191c1d]">选择一个上下文开始侧聊</h2>
        <p className="mt-1 text-[13px] font-medium leading-6 text-[#69736d]">侧聊是独立工作界面，适合围绕档案、批改、月报素材继续追问；不会直接写入学生档案。</p>
      </div>
      <div className="space-y-1">
        {options.map((option) => (
          <button key={option.id} type="button" onClick={() => onCreateSession(option)} className="group flex w-full items-start gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-[#f7f8f7]">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0f3f1] text-[#4e5c52] transition group-hover:bg-[#dcfce7] group-hover:text-[#15803d]">{getContextIcon(option.type)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-[#191c1d]">{option.title}</span>
              <span className="mt-0.5 line-clamp-2 block text-[12px] font-medium leading-5 text-[#69736d]">{option.description}</span>
            </span>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}

function getContextIcon(type: SideChatContextType) {
  if (type === "student_profile") return <GraduationCap size={17} />;
  if (type === "grading" || type === "learning_material") return <FileText size={17} />;
  if (type === "monthly_report") return <FolderOpen size={17} />;
  return <MessageSquareText size={17} />;
}

function getContextTypeLabel(type: SideChatContextType) {
  if (type === "student_profile") return "学生/班级资料";
  if (type === "grading") return "批改与确认";
  if (type === "monthly_report") return "月报素材";
  if (type === "learning_material") return "学习材料分析";
  return "当前聊天记录";
}
