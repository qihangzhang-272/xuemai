import { useState } from "react";
import type React from "react";
import { Archive, ChevronRight, FileText, MessageSquareText, Pencil, Plus, Search, UserRound, UsersRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionButton, IconButton, InfoBlock } from "./shared";
import { cleanSubjectPlaceholderText, normalizeSubjectText } from "./subject-utils";
import type { ActiveDrawer, Conversation, Message, TaskCard, TimelineRecord } from "./types";

export type SearchDrawerResultTarget = {
  conversationId: string;
  taskId?: string;
  messageId?: string;
  timelineRecordId?: string;
  resultType: "conversation" | "message" | "task" | "timeline";
};

type SearchFilter = "全部" | "学生班级" | "聊天记录" | "AI 结果卡" | "入档记录" | "报告月报";

type SearchResult = SearchDrawerResultTarget & {
  id: string;
  filter: Exclude<SearchFilter, "全部">;
  title: string;
  context: string;
  snippet: string;
  priority: number;
  createdAt?: string;
};

export function SideDrawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-[#191c1d]/18">
      <aside className="ml-auto h-full w-full max-w-[420px] overflow-y-auto border-l border-[#e1e3e4] bg-white shadow-[0_0_60px_rgba(15,23,42,0.16)]">
        <div className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-[#edeef0] bg-white px-6">
          <h2 className="text-xl font-bold text-[#191c1d]">{title}</h2>
          <IconButton label="关闭" onClick={onClose}>
            <X size={22} />
          </IconButton>
        </div>
        <div className="p-6">{children}</div>
      </aside>
    </div>
  );
}

export function TaskDetailDrawer({ task, onCopy, onMark }: { task: TaskCard; onCopy: (task: TaskCard) => void; onMark: (task: TaskCard) => void }) {
  return (
    <div className="space-y-5">
      <InfoBlock title={task.title} lines={[`创建时间：${new Date(task.createdAt).toLocaleString("zh-CN")}`, `当前状态：${formatTaskStatus(task.status)}`]} />
      <InfoBlock title="一、结果摘要" lines={[task.summary ?? "任务仍在处理中。"]} />
      <InfoBlock title="二、微信反馈" lines={[task.feedbackText ?? "完成后生成微信反馈文案。"]} />
      <InfoBlock title="三、错题归因 / 分析详情" lines={[task.detail ?? "完成后展示错题归因与分析详情。"]} />
      <InfoBlock title="四、下次课建议" lines={["围绕当前薄弱点复盘，再做同类题变式训练，最后生成学习记录。"]} />
      <div className="flex gap-3">
        <ActionButton active onClick={() => onCopy(task)}>
          复制微信反馈
        </ActionButton>
        <ActionButton onClick={() => onMark(task)}>标记已发给家长</ActionButton>
      </div>
    </div>
  );
}

export function ProfileDrawer({
  conversation,
  members,
  onAddStudentToClass,
  onSelectStudent,
  onEditProfile
}: {
  conversation: Conversation;
  members: Conversation[];
  onAddStudentToClass?: (classId: string, studentName: string) => void;
  onSelectStudent: (id: string) => void;
  onEditProfile?: (conversation: Conversation) => void;
}) {
  const isClass = conversation.kind === "class";
  const subjectLabel = normalizeSubjectText(conversation.subject);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-[#f8f9fa] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-[#191c1d]">{conversation.name}</h3>
            <div className="mt-2 space-y-1 text-sm font-semibold leading-6 text-[#4e5c52]">
              <p>科目：{subjectLabel}</p>
              <p>年级：{conversation.grade}</p>
              <p>{isClass ? `学生人数：${conversation.members ?? members.length}` : `所属班级：${conversation.className}`}</p>
            </div>
          </div>
          <button type="button" onClick={() => onEditProfile?.(conversation)} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-black text-[#3d4a3d] transition hover:bg-[#eaf8ef] hover:text-[#15803d]">
            <Pencil size={13} />
            修改
          </button>
        </div>
      </section>
      {isClass ? (
        <>
          <AddStudentToClassForm classId={conversation.id} onAddStudent={onAddStudentToClass} />
          <section>
            <h3 className="text-sm font-bold text-[#191c1d]">成员</h3>
            <div className="mt-3 space-y-2">
              {members.length ? (
                members.map((student) => (
                  <button key={student.id} type="button" onClick={() => onSelectStudent(student.id)} className="flex w-full items-center justify-between rounded-2xl bg-[#f8f9fa] p-3 text-left transition hover:bg-[#edf8f1]">
                    <span>
                      <strong className="block text-sm text-[#191c1d]">{student.name}</strong>
                      <span className="mt-1 block text-xs font-medium text-[#3d4a3d]">
                        {student.statusLabel} · {student.summary}
                      </span>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                ))
              ) : (
                <p className="rounded-2xl bg-[#f8f9fa] p-3 text-sm font-medium leading-6 text-[#6b746d]">这个班级还没有学生。先添加学生，后续班课记录和批量反馈才有对象。</p>
              )}
            </div>
          </section>
          <InfoBlock title="班级共性薄弱点" lines={["一次函数图像理解", "应用题建模", "计算稳定性"]} />
          <InfoBlock title="最近班级记录" lines={["本周班级分析", "下周单元测验提醒"]} />
        </>
      ) : (
        <>
          <InfoBlock title="学习目标" lines={["期末数学稳定 90+，减少应用题读题失误。"]} />
          <InfoBlock title="固定上课时间" lines={["每周三、周日 19:00 · 90 分钟"]} />
          <InfoBlock title="反馈规则" lines={["下课后立即生成课后反馈任务，文案风格：温和鼓励。"]} />
        </>
      )}
    </div>
  );
}

function AddStudentToClassForm({
  classId,
  onAddStudent
}: {
  classId: string;
  onAddStudent?: (classId: string, studentName: string) => void;
}) {
  const [name, setName] = useState("");
  const trimmedName = name.trim();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedName) return;
    onAddStudent?.(classId, trimmedName);
    setName("");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-[#f8f9fa] p-3">
      <label className="block">
        <span className="text-sm font-bold text-[#191c1d]">添加学生到班级</span>
        <span className="mt-1 block text-xs font-medium leading-5 text-[#6b746d]">先创建学生会话，并自动归入当前班级。</span>
        <span className="mt-3 flex h-10 items-center gap-2 rounded-full bg-white px-3">
          <input value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#191c1d] outline-none placeholder:text-[#9aa19d]" placeholder="输入学生姓名" />
          <button type="submit" disabled={!trimmedName} className="flex h-7 items-center gap-1 rounded-full bg-[#22c55e] px-3 text-xs font-bold text-white transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:bg-[#c2c8c3]">
            <Plus size={13} />
            添加
          </button>
        </span>
      </label>
    </form>
  );
}

export function SearchDrawer({
  conversation,
  conversations,
  messages,
  taskCards,
  timelineRecords,
  scope = "global",
  filter,
  query,
  onFilterChange,
  onQueryChange,
  onOpenResult
}: {
  conversation: Conversation;
  messages: Message[];
  conversations: Conversation[];
  taskCards: TaskCard[];
  timelineRecords: TimelineRecord[];
  scope?: "global" | "conversation";
  filter: string;
  query: string;
  onFilterChange: (filter: string) => void;
  onQueryChange: (query: string) => void;
  onOpenResult: (target: SearchDrawerResultTarget) => void;
}) {
  const filters: SearchFilter[] = scope === "conversation" ? ["全部", "聊天记录", "AI 结果卡", "入档记录", "报告月报"] : ["全部", "学生班级", "聊天记录", "AI 结果卡", "入档记录", "报告月报"];
  const normalizedQuery = normalizeSearchText(query);
  const taskById = new Map(taskCards.map((task) => [task.id, task]));
  const conversationById = new Map(conversations.map((item) => [item.id, item]));
  const results = buildSearchResults({
    query,
    filter: filters.includes(filter as SearchFilter) ? (filter as SearchFilter) : "全部",
    activeConversationId: conversation.id,
    conversations,
    messages,
    taskCards,
    timelineRecords,
    taskById,
    conversationById,
    scope
  });
  const groupedResults = groupSearchResults(results);
  const suggestions = buildSearchSuggestions(conversation, taskCards, timelineRecords);

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div>
          <p className="text-[12px] font-black text-[#22c55e]">{scope === "conversation" ? "会话搜索" : "全局检索"}</p>
          <h3 className="mt-1 text-lg font-black text-[#191c1d]">{scope === "conversation" ? "搜索当前会话" : "查找学生、记录和 AI 结果"}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#6b746d]">{scope === "conversation" ? `只搜索「${conversation.name}」这条会话里的聊天、卡片和入档记录。` : "当前为本地工作台搜索，不会访问外部网络或上传学生资料。"}</p>
        </div>
        <label className="flex h-12 items-center gap-2 rounded-2xl bg-[#f3f4f5] px-4 text-sm font-semibold text-[#3d4a3d]">
          <Search size={18} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9ba19d]" placeholder={scope === "conversation" ? "搜索当前会话里的反馈、错题、报告" : "搜索学生、班级、反馈、错题、月报"} />
          {query ? (
            <button type="button" onClick={() => onQueryChange("")} className="rounded-full p-1 text-[#879089] transition hover:bg-white hover:text-[#191c1d]" aria-label="清空搜索">
              <X size={15} />
            </button>
          ) : null}
        </label>
      </section>
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button key={item} type="button" onClick={() => onFilterChange(item)} className={cn("rounded-full px-3 py-2 text-xs font-bold transition", filter === item ? "bg-[#22c55e] text-white" : "bg-[#f3f4f5] text-[#3d4a3d] hover:bg-[#edf8f1]")}>
            {item}
          </button>
        ))}
      </div>

      {!normalizedQuery ? (
        <section className="space-y-3">
          <p className="text-xs font-black text-[#191c1d]">建议搜索</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <button key={item} type="button" onClick={() => onQueryChange(item)} className="rounded-full bg-[#f3f4f5] px-3 py-2 text-xs font-bold text-[#3d4a3d] transition hover:bg-[#e7f7ed] hover:text-[#15803d]">
                {item}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-4">
        {groupedResults.length ? (
          groupedResults.map((group) => (
            <section key={group.filter} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#191c1d]">{group.filter}</h4>
                <span className="text-[11px] font-bold text-[#8a928d]">{group.items.length} 条</span>
              </div>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button key={item.id} type="button" onClick={() => onOpenResult(item)} className="group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-[#f3f5f4]">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef7f2] text-[#16833d]">
                      <SearchResultIcon filter={item.filter} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <strong className="truncate text-sm font-black text-[#191c1d]">{renderHighlightedText(item.title, query)}</strong>
                        {item.createdAt ? <span className="shrink-0 text-[11px] font-bold text-[#9aa19d]">{formatSearchTime(item.createdAt)}</span> : null}
                      </span>
                      <span className="mt-1 block truncate text-xs font-bold text-[#7a837c]">{item.context}</span>
                      <span className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#4e5c52]">{renderHighlightedText(item.snippet, query)}</span>
                    </span>
                    <ChevronRight className="mt-2 shrink-0 text-[#a4aaa6] transition group-hover:translate-x-0.5 group-hover:text-[#22c55e]" size={16} />
                  </button>
                ))}
              </div>
            </section>
          ))
        ) : normalizedQuery ? (
          <section className="rounded-3xl bg-[#f8f9fa] p-4">
            <h4 className="text-sm font-black text-[#191c1d]">没有找到相关结果</h4>
            <p className="mt-2 text-xs font-semibold leading-5 text-[#6b746d]">可以换成学生姓名、科目、反馈状态、错题关键词或报告类型再试。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["待反馈", "已入档", "错题", "月报"].map((item) => (
                <button key={item} type="button" onClick={() => onQueryChange(item)} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#3d4a3d] transition hover:bg-[#edf8f1]">
                  {item}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <InfoBlock title="搜索提示" lines={["输入关键词后，可跨学生、班级、聊天记录、AI 结果卡和入档记录检索。"]} />
        )}
      </div>
    </div>
  );
}

function buildSearchResults({
  query,
  filter,
  activeConversationId,
  conversations,
  messages,
  taskCards,
  timelineRecords,
  taskById,
  conversationById,
  scope
}: {
  query: string;
  filter: SearchFilter;
  activeConversationId: string;
  conversations: Conversation[];
  messages: Message[];
  taskCards: TaskCard[];
  timelineRecords: TimelineRecord[];
  taskById: Map<string, TaskCard>;
  conversationById: Map<string, Conversation>;
  scope: "global" | "conversation";
}) {
  const terms = splitSearchTerms(query);
  if (!terms.length) return [];

  const results: SearchResult[] = [];

  conversations.forEach((item) => {
    if (scope === "conversation" && item.id !== activeConversationId) return;
    if (item.kind === "assistant") return;
    const haystack = [item.name, item.kind === "class" ? "班级 群聊" : "学生 档案", item.className, item.subject, item.subjectTracks?.join(" "), item.grade, item.summary, item.statusLabel].join(" ");
    if (!matchesSearch(haystack, terms)) return;
    results.push({
      id: `conversation-${item.id}`,
      resultType: "conversation",
      filter: "学生班级",
      conversationId: item.id,
      title: item.kind === "class" ? `${item.name} 班级` : `${item.name} 学生档案`,
      context: [item.grade, normalizeSubjectText(item.subject), item.className].filter(Boolean).join(" · "),
      snippet: cleanSubjectPlaceholderText(item.summary || item.statusLabel || "打开会话查看最近记录"),
      priority: item.id === activeConversationId ? 95 : item.attention ? 90 : 70
    });
  });

  messages.forEach((message) => {
    if (scope === "conversation" && message.conversationId !== activeConversationId) return;
    const conversation = conversationById.get(message.conversationId);
    const task = message.taskCardId ? taskById.get(message.taskCardId) : undefined;
    const attachmentText = message.attachments?.map((item) => item.fileName).join(" ") ?? "";
    const title = task ? `${task.title} 相关消息` : message.type === "image" ? "学习材料图片" : "聊天记录";
    const snippet = cleanSubjectPlaceholderText(message.content ?? message.fileName ?? attachmentText);
    const haystack = [conversation?.name, title, snippet, attachmentText, task?.title, task?.summary, task?.feedbackText].join(" ");
    if (!matchesSearch(haystack, terms)) return;
    results.push({
      id: `message-${message.id}`,
      resultType: "message",
      filter: "聊天记录",
      conversationId: message.conversationId,
      messageId: message.id,
      taskId: message.taskCardId,
      title,
      context: conversation ? `${conversation.name} · ${message.sender === "teacher" ? "老师输入" : message.sender === "system" ? "系统记录" : "AI 回复"}` : "聊天记录",
      snippet: snippet || "图片或任务消息",
      createdAt: message.createdAt,
      priority: message.conversationId === activeConversationId ? 75 : 55
    });
  });

  taskCards.forEach((task) => {
    if (scope === "conversation" && task.conversationId !== activeConversationId) return;
    const conversation = conversationById.get(task.conversationId);
    const taskFilter = isReportLikeTask(task) ? "报告月报" : "AI 结果卡";
    const haystack = [
      conversation?.name,
      task.title,
      task.subject,
      task.inputSummary,
      task.summary,
      task.feedbackText,
      task.detail,
      task.status,
      task.currentOutput?.display_content,
      task.archivedOutput?.display_content,
      task.contextSources?.map((item) => item.label).join(" ")
    ].join(" ");
    if (!matchesSearch(haystack, terms)) return;
    results.push({
      id: `task-${task.id}`,
      resultType: "task",
      filter: taskFilter,
      conversationId: task.conversationId,
      taskId: task.id,
      title: task.title,
      context: [conversation?.name, task.subject, formatTaskStatus(task.status)].filter(Boolean).join(" · "),
      snippet: cleanSubjectPlaceholderText(task.feedbackText || task.summary || task.detail || task.inputSummary || "打开查看 AI 结果卡详情"),
      createdAt: task.createdAt,
      priority: task.conversationId === activeConversationId ? 85 : 65
    });
  });

  timelineRecords.forEach((record) => {
    if (scope === "conversation" && record.conversationId !== activeConversationId) return;
    const conversation = conversationById.get(record.conversationId);
    const haystack = [conversation?.name, record.title, record.summary, record.archiveTarget, record.profileUpdates?.map((item) => `${item.label} ${item.value}`).join(" ")].join(" ");
    if (!matchesSearch(haystack, terms)) return;
    results.push({
      id: `timeline-${record.id}`,
      resultType: "timeline",
      filter: "入档记录",
      conversationId: record.conversationId,
      taskId: record.sourceTaskId,
      timelineRecordId: record.id,
      title: record.title,
      context: [conversation?.name, record.archiveTarget].filter(Boolean).join(" · "),
      snippet: cleanSubjectPlaceholderText(record.summary),
      createdAt: record.createdAt,
      priority: record.conversationId === activeConversationId ? 80 : 60
    });
  });

  return results
    .filter((item) => filter === "全部" || item.filter === filter)
    .sort((a, b) => b.priority - a.priority || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 24);
}

function groupSearchResults(results: SearchResult[]) {
  const order: Exclude<SearchFilter, "全部">[] = ["学生班级", "聊天记录", "AI 结果卡", "报告月报", "入档记录"];
  return order
    .map((filter) => ({ filter, items: results.filter((item) => item.filter === filter).slice(0, 6) }))
    .filter((group) => group.items.length);
}

function buildSearchSuggestions(conversation: Conversation, taskCards: TaskCard[], timelineRecords: TimelineRecord[]) {
  const suggestions = [conversation.name, "待反馈", "已入档", "错题", "月报"];
  const latestTask = [...taskCards].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const latestRecord = [...timelineRecords].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (latestTask?.subject) suggestions.splice(1, 0, `${conversation.name} ${normalizeSubjectText(latestTask.subject)}`);
  if (latestRecord?.title) suggestions.push(latestRecord.title);
  return Array.from(new Set(suggestions)).slice(0, 7);
}

function SearchResultIcon({ filter }: { filter: SearchResult["filter"] }) {
  if (filter === "学生班级") return <UserRound size={16} />;
  if (filter === "聊天记录") return <MessageSquareText size={16} />;
  if (filter === "入档记录") return <Archive size={16} />;
  if (filter === "报告月报") return <FileText size={16} />;
  return <UsersRound size={16} />;
}

function renderHighlightedText(text: string, query: string) {
  const terms = splitSearchTerms(query);
  const normalizedText = normalizeSearchText(text);
  const matchedTerm = terms.find((term) => normalizedText.includes(term));
  if (!matchedTerm) return text;

  const start = normalizedText.indexOf(matchedTerm);
  const end = start + matchedTerm.length;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-[#dff8e8] px-0.5 text-[#0b7a34]">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function splitSearchTerms(query: string) {
  return normalizeSearchText(query)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchesSearch(value: string, terms: string[]) {
  const normalizedValue = normalizeSearchText(value);
  return terms.every((term) => normalizedValue.includes(term));
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function isReportLikeTask(task: TaskCard) {
  return task.taskType === "learning_evidence_analysis" || task.taskType === "monthly_report" || /报告|月报|分析/.test(`${task.title} ${task.summary ?? ""}`);
}

function formatSearchTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function drawerTitle(drawer: ActiveDrawer, conversation: Conversation) {
  if (drawer === "detail") return "任务详情";
  if (drawer === "profile") return conversation.kind === "class" ? "班级资料 / 成员" : "学生资料";
  return "搜索当前会话";
}

function formatTaskStatus(status: TaskCard["status"]) {
  if (status === "feedback_done") return "已反馈";
  if (status === "archived") return "已入档";
  if (status === "copied") return "已复制";
  if (status === "completed") return "待确认";
  if (status === "failed") return "运行失败";
  return "运行中";
}
