"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { ImagePlus, Plus, Search, UserRound, UsersRound, X } from "lucide-react";
import { AutomationAssistantEmptyState, ChatHeader, Composer, ConfirmTaskCard, EmptyConversationState, MessageRow } from "./ChatParts";
import type { AutomationTemplate } from "./ChatParts";
import type { ComposerAttachment } from "./ChatParts";
import { ContextPanel } from "./ContextPanel";
import { CreateDialog } from "./CreateDialog";
import { ProfileDrawer, SearchDrawer, SideDrawer, TaskDetailDrawer, drawerTitle } from "./Drawers";
import type { SearchDrawerResultTarget } from "./Drawers";
import { AssistantConversationEntry, ConversationGroup, MenuButton, Rail } from "./Navigation";
import { LoginScreen, SettingsPanel } from "./Panels";
import { WorkOverviewPanel } from "./WorkOverviewPanel";
import { SideChatPanel } from "./SideChatPanel";
import { StudentDetailModal } from "./StudentDetailModal";
import { TaskReviewWorkspace } from "./TaskReviewWorkspace";
import { detectIntent, nowIso, uid } from "./chat-engine";
import { backend, emptyState as initialState, isFeedback, recordId, toChatState } from "./backend-adapter";
import type { Attachment, Contact, LearningRecord, Snapshot } from "@/lib/xuemai/types";
import type { ActiveDrawer, Conversation, CreationMode, CreationPayload, Message, SideChatContextOption, SideChatContextType, SideChatSession, SkillAction, SmartInputAction, TaskCard, TaskType, TeacherProfile, TimelineRecord, UserPreferences, WorkspaceMode } from "./types";




import { getSkillByTriggerLabel, getSkillsForSubject } from "@/src/skills/registry";


import type { SkillId, SkillSubjectType } from "@/src/skills/types";
import { cn } from "@/lib/utils";

import { allSubjectsLabel, cleanSubjectPlaceholderText, getSelectedSubjectTrack, getSkillSubjectLabel, getSubjectSummaryLabel, getSubjectTracks, normalizeSubjectText } from "./subject-utils";

const sideWorkspaceMinWidth = 360;
const sideWorkspaceMaxWidth = 1080;
const sideWorkspaceDefaultWidth = 560;




const automationTemplates: AutomationTemplate[] = [
  {
    label: "每日简报",
    description: "汇总今天最需要先处理的学生、反馈和入档事项。",
    prompt: "帮我生成今天的教学服务简报：列出待反馈学生、待确认入档卡片、本周需要跟进的风险点，并按优先级给出处理顺序。"
  },
  {
    label: "每周回顾",
    description: "整理本周服务进展、遗漏事项和下周安排。",
    prompt: "帮我做一版本周教学服务回顾：总结本周已完成的反馈和入档记录，找出还没闭环的学生，并给出下周优先跟进计划。"
  },
  {
    label: "服务监控",
    description: "检查月报、续费、家长沟通和学习材料分析是否有遗漏。",
    prompt: "帮我检查当前工作台是否有服务遗漏：包括未处理学习材料、未生成微信反馈、未入档记录、月报素材不足和需要续费跟进的学生。"
  }
];

export function XuemaiWorkbenchApp() {
  const [mode, setMode] = useState<WorkspaceMode>("chat");
  const [conversations, setConversations] = useState<Conversation[]>(initialState.conversations);
  const [messages, setMessages] = useState<Message[]>(initialState.messages);
  const [taskCards, setTaskCards] = useState<TaskCard[]>(initialState.taskCards);
  const [timelineRecords, setTimelineRecords] = useState<TimelineRecord[]>(initialState.timelineRecords);
  const [preferences, setPreferences] = useState<UserPreferences>(initialState.preferences);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(initialState.teacher);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [activeId, setActiveId] = useState(initialState.currentConversationId ?? "student-wang");
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<CreationMode>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [locatedTaskId, setLocatedTaskId] = useState<string | null>(null);
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [activeSkillId, setActiveSkillId] = useState<SkillId | null>(null);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachment[]>([]);
  const [pendingUploadConversationId, setPendingUploadConversationId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [searchFilter, setSearchFilter] = useState("全部");
  const [searchDrawerQuery, setSearchDrawerQuery] = useState("");
  const [searchDrawerScope, setSearchDrawerScope] = useState<"global" | "conversation">("conversation");
  const [isContextOpen, setIsContextOpen] = useState(true);
  const [sideChats, setSideChats] = useState<SideChatSession[]>([]);
  const [activeSideChatId, setActiveSideChatId] = useState<string | null>(null);
  const [sideChatInput, setSideChatInput] = useState("");
  const [sideWorkspaceWidth, setSideWorkspaceWidth] = useState(sideWorkspaceDefaultWidth);
  const [subjectContextByConversationId, setSubjectContextByConversationId] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const pendingRef = useRef(new Set<string>());
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const refreshBackend = useCallback(async () => {
    const response = await fetch("/api/xuemai/state", { cache: "no-store" });
    if (response.status === 401) {
      snapshotRef.current = null; setTeacher(null); setConversations(initialState.conversations);
      setMessages([]); setTaskCards([]); setTimelineRecords([]); setHasLoadedStorage(true); return;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "加载失败，请重试");
    snapshotRef.current = data;
    const view = toChatState(data);
    setConversations(view.conversations); setMessages(view.messages); setTaskCards(view.taskCards);
    setTimelineRecords(view.timelineRecords); setTeacher(view.teacher);
    setPreferences(previous => ({ ...view.preferences, autoAnalyzeUploadedPaper: previous.autoAnalyzeUploadedPaper }));
    setHasLoadedStorage(true);
  }, []);
  useEffect(() => { void refreshBackend().catch(error => { setToast(error.message); setHasLoadedStorage(true); }); }, [refreshBackend]);
  const hasRunningTask = taskCards.some(task => task.status === "running");
  useEffect(() => {
    if (!hasRunningTask) return;
    const timer = window.setInterval(() => { void refreshBackend().catch(error => setToast(error.message)); }, 4000);
    return () => window.clearInterval(timer);
  }, [hasRunningTask, refreshBackend]);

  async function performBackend<T,>(work: () => Promise<T>, success = "") {
    try { const result = await work(); await refreshBackend(); if (success) showToast(success); return result; }
    catch (error) { showToast(error instanceof Error ? error.message : "操作未完成，请重试"); await refreshBackend().catch(() => {}); }
  }
  async function runRecordAction(task: TaskCard, action: string, extra: Record<string, unknown> = {}) {
    const id = recordId(task);
    const record = snapshotRef.current?.records.find(r => r.id === id);
    if (!record || pendingRef.current.has(id)) return;
    pendingRef.current.add(id);
    if (action === "generate" || action === "feedback") {
      setTaskCards(items => items.map(item => recordId(item) === id ? { ...item, status: "running", steps: [{ label: "正在处理，请稍候", status: "running" }] } : item));
    }
    try { return await performBackend(() => backend<LearningRecord>(`records/${id}`, { action, revision: record.revision, ...extra }, "PATCH")); }
    finally { pendingRef.current.delete(id); }
  }
  function latestRecord(conversationId: string) {
    return [...(snapshotRef.current?.records || [])].reverse().find(r => r.contactId === conversationId && r.content && r.evidence === "observed" && r.kind !== "prep");
  }
  useEffect(() => {
    if (!isMobileNavigationOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMobileNavigationOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMobileNavigationOpen]);

  useEffect(() => {
    if (!conversations.some((item) => item.id === activeId) && conversations[0]) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations]);

  const activeConversation = conversations.find((item) => item.id === activeId) ?? conversations[0] ?? initialState.conversations[0];
  const isAutomationAssistant = activeConversation.kind === "assistant";
  const detailStudent = detailStudentId ? conversations.find((item) => item.id === detailStudentId && item.kind === "student") : undefined;
  const currentMessages = messages.filter((item) => item.conversationId === activeConversation.id);
  const taskById = useMemo(() => new Map(taskCards.map((task) => [task.id, task])), [taskCards]);
  const displayMessages = useMemo(() => dedupeRepeatedTaskMessages(currentMessages, taskById), [currentMessages, taskById]);
  const selectedTask = selectedTaskId ? taskById.get(selectedTaskId) : undefined;
  const reviewTask = reviewTaskId ? taskById.get(reviewTaskId) : undefined;
  const currentTaskCards = useMemo(() => taskCards.filter((task) => task.conversationId === activeConversation.id), [activeConversation.id, taskCards]);
  const currentTimelineRecords = useMemo(() => timelineRecords.filter((record) => record.conversationId === activeConversation.id), [activeConversation.id, timelineRecords]);
  const currentClassMembers = conversations.filter((item) => item.kind === "student" && item.className === activeConversation.name);
  const activeSubjectOptions = useMemo(() => getSubjectTracks(activeConversation), [activeConversation]);
  const activeSubjectTrack = getSelectedSubjectTrack(activeConversation, subjectContextByConversationId[activeConversation.id]);
  const subjectType = getSubjectType(activeConversation);
  const quickSkills = useMemo(() => getSkillsForSubject(subjectType).slice(0, 6), [subjectType]);
  const quickTasks = useMemo(() => quickSkills.map((skill) => getSkillDisplayLabel(skill, activeConversation)), [activeConversation, quickSkills]);
  const activeSkill = activeSkillId ? quickSkills.find((skill) => skill.id === activeSkillId) : undefined;
  const activeQuickTaskLabel = activeSkill ? getSkillDisplayLabel(activeSkill, activeConversation) : undefined;
  const currentSideChats = useMemo(() => sideChats.filter((session) => session.conversationId === activeConversation.id), [activeConversation.id, sideChats]);
  const activeSideChat = currentSideChats.find((session) => session.id === activeSideChatId) ?? currentSideChats[0];
  const sideChatContextOptions = useMemo(
    () => buildSideChatContextOptions(activeConversation, currentTaskCards, currentTimelineRecords),
    [activeConversation, currentTaskCards, currentTimelineRecords]
  );
  const workspaceColumns =
    mode === "todos"
      ? "56px minmax(0,1fr)"
      : mode === "side-chat" || mode === "settings" || isAutomationAssistant
      ? "56px clamp(260px,21vw,320px) minmax(0,1fr)"
      : isContextOpen
        ? reviewTask
          ? "56px clamp(260px,20vw,320px) minmax(0,1fr) clamp(380px,31vw,500px)"
          : "56px clamp(260px,21vw,320px) minmax(0,1fr) clamp(280px,21vw,340px)"
        : "56px clamp(260px,21vw,320px) minmax(0,1fr) 42px";
  const workspaceStyle = { "--workspace-columns": workspaceColumns } as CSSProperties;

  useEffect(() => {
    if (!reviewTask) return;
    if (reviewTask.conversationId !== activeConversation.id) {
      setReviewTaskId(null);
    }
  }, [activeConversation.id, reviewTask]);

  useEffect(() => {
    if (!activeSkillId) return;
    if (!quickSkills.some((skill) => skill.id === activeSkillId)) {
      setActiveSkillId(null);
    }
  }, [activeSkillId, quickSkills]);

  useEffect(() => {
    if (mode !== "side-chat") return;
    if (activeSideChat && activeSideChat.id !== activeSideChatId) {
      setActiveSideChatId(activeSideChat.id);
      return;
    }
    if (!activeSideChat && activeSideChatId) {
      setActiveSideChatId(null);
    }
  }, [activeSideChat, activeSideChatId, mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeId, currentMessages.length, taskCards]);

  useEffect(() => {
    setActiveSkillId(null);
    setInput("");
    setComposerAttachments([]);
    setPendingUploadConversationId(null);
  }, [activeId]);

  const isGlobalSearchActive = query.trim().length > 0;
  const globalSearchResults = useMemo(() => buildSidebarGlobalSearchResults({ query, conversations, messages, taskCards, timelineRecords }), [conversations, messages, query, taskCards, timelineRecords]);
  const assistantConversation = conversations.find((item) => item.kind === "assistant");
  const classConversations = conversations.filter((item) => item.kind === "class");
  const studentConversations = conversations.filter((item) => item.kind === "student");
  const editingConversation = editingConversationId ? conversations.find((item) => item.id === editingConversationId) : undefined;

  const statusSummary = useMemo(() => {
    const displayStatusLabel = getHeaderStatusLabel(activeConversation.statusLabel, currentTaskCards, currentTimelineRecords);
    if (activeConversation.kind === "assistant") {
      return "每日提醒 · 自动化任务 · 全局工作台";
    }
    if (activeConversation.kind === "class") {
      return joinHeaderParts([`${activeConversation.members ?? currentClassMembers.length} 名学生`, activeConversation.subject, displayStatusLabel]);
    }
    return joinHeaderParts([activeConversation.className, getSubjectSummaryLabel(activeConversation, subjectContextByConversationId[activeConversation.id]), displayStatusLabel]);
  }, [activeConversation, currentClassMembers.length, currentTaskCards, currentTimelineRecords, subjectContextByConversationId]);

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 6000);
  }

  function openDrawer(drawer: ActiveDrawer) {
    if (drawer === "search") {
      setSearchDrawerScope("conversation");
    }
    setActiveDrawer(drawer);
  }

  function openGlobalSearch() {
    setSearchDrawerScope("global");
    setSearchDrawerQuery(query);
    setActiveDrawer("search");
  }

  function handleActiveSubjectChange(subject: string) {
    setSubjectContextByConversationId((value) => ({ ...value, [activeConversation.id]: subject }));
    showToast(subject === allSubjectsLabel ? "已切换到多科目总览" : `已切换到${subject}`);
  }

  function openSideChatPanel() {
    setReviewTaskId(null);
    setActiveDrawer(null);
    setMode("side-chat");
    const existingSession = currentSideChats[0];
    setActiveSideChatId((value) => (value && currentSideChats.some((session) => session.id === value) ? value : existingSession?.id ?? null));
  }

  function openSideChatForContext(type: SideChatContextType) {
    const option = sideChatContextOptions.find((item) => item.type === type) ?? sideChatContextOptions[0];
    if (!option) {
      openSideChatPanel();
      return;
    }
    const existingSession = currentSideChats.find((session) => session.contextType === option.type && session.sourceId === option.sourceId);
    setReviewTaskId(null);
    setActiveDrawer(null);
    setMode("side-chat");
    setSideChatInput("");
    if (existingSession) {
      setActiveSideChatId(existingSession.id);
      return;
    }
    createSideChatSession(option);
  }

  function closeSideChatPanel() {
    setReviewTaskId(null);
    setActiveSideChatId(null);
    setSideChatInput("");
    setMode("chat");
  }

  function locateSideChatTarget(session: SideChatSession) {
    if (session.contextType === "student_profile") {
      setActiveDrawer("profile");
      showToast(activeConversation.kind === "class" ? "已打开班级资料" : "已打开学生资料");
      return;
    }

    const sourceTaskId =
      session.sourceId && taskById.has(session.sourceId)
        ? session.sourceId
        : timelineRecords.find((record) => record.id === session.sourceId)?.sourceTaskId;

    if (sourceTaskId) {
      setActiveDrawer(null);
      setSelectedTaskId(sourceTaskId);
      setLocatedTaskId(sourceTaskId);
      window.setTimeout(() => {
        document.getElementById(`task-card-${sourceTaskId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      window.setTimeout(() => {
        setLocatedTaskId((current) => (current === sourceTaskId ? null : current));
      }, 1800);
      showToast("已定位到主聊天中的来源卡片");
      return;
    }

    showToast("这个侧聊绑定的是当前会话，没有单独来源卡片");
  }

  function startSideWorkspaceResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sideWorkspaceWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function handlePointerMove(moveEvent: PointerEvent) {
      const delta = moveEvent.clientX - startX;
      setSideWorkspaceWidth(clampSideWorkspaceWidth(startWidth - delta));
    }

    function stopResize() {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function handleSideWorkspaceResizeKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSideWorkspaceWidth((width) => clampSideWorkspaceWidth(width + 24));
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setSideWorkspaceWidth((width) => clampSideWorkspaceWidth(width - 24));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setSideWorkspaceWidth(sideWorkspaceMaxWidth);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setSideWorkspaceWidth(sideWorkspaceMinWidth);
    }
  }

  function selectConversation(conversationId: string) {
    setActiveId(conversationId);
    setIsMobileNavigationOpen(false);
    setMode("chat");
    setReviewTaskId(null);
    setSelectedTaskId(null);
    setActiveSideChatId(null);
    setSideChatInput("");
    setActiveDrawer(null);
    setDetailStudentId(null);
  }

  function openSearchResult(target: SearchDrawerResultTarget) {
    selectConversation(target.conversationId);
    setQuery("");
    setSearchDrawerQuery("");
    window.setTimeout(() => {
      if (target.taskId) {
        setSelectedTaskId(target.taskId);
        setLocatedTaskId(target.taskId);
        document.getElementById(`task-card-${target.taskId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        showToast("已定位到相关卡片");
        window.setTimeout(() => setLocatedTaskId((current) => (current === target.taskId ? null : current)), 1800);
        return;
      }
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      showToast(target.resultType === "conversation" ? "已打开相关会话" : "已定位到相关记录");
    }, 0);
  }

  function openStudentProfileSideChat(studentId: string) {
    selectConversation(studentId);
    window.setTimeout(() => {
      setMode("side-chat");
      setReviewTaskId(null);
      setActiveDrawer(null);
      setSideChatInput("");
      const student = conversations.find((item) => item.id === studentId);
      if (!student) return;
      const option: SideChatContextOption = {
        id: `${student.id}-profile`,
        type: "student_profile",
        title: `${student.name} 学生档案`,
        description: `${student.grade} · ${student.subject} · 可追问薄弱点、家长关注点和下次跟进。`
      };
      const existingSession = sideChats.find((session) => session.conversationId === student.id && session.contextType === "student_profile");
      if (existingSession) {
        setActiveSideChatId(existingSession.id);
        return;
      }
      const createdAt = nowIso();
      const session: SideChatSession = {
        id: uid("side_chat"),
        conversationId: student.id,
        title: option.title,
        contextType: option.type,
        contextLabel: option.title,
        messages: [
          {
            id: uid("side_msg"),
            sender: "assistant",
            content: buildSideChatWelcome(student, option),
            createdAt
          }
        ],
        createdAt,
        updatedAt: createdAt
      };
      setSideChats((items) => [...items, session]);
      setActiveSideChatId(session.id);
    }, 0);
  }

  function openStudentDetail(conversation: Conversation) {
    if (conversation.kind !== "student") return;
    openStudentProfileSideChat(conversation.id);
  }

function openStudentDetailTask(taskId: string) {
    const task = taskById.get(taskId);
    if (task) { setDetailStudentId(null); openSkillReview(task); }
  }

  function createSideChatSession(option: SideChatContextOption) {
    createSideChatSessionForConversation(activeConversation, option);
  }

  function createSideChatSessionForConversation(conversation: Conversation, option: SideChatContextOption) {
    const createdAt = nowIso();
    const session: SideChatSession = {
      id: uid("side_chat"),
      conversationId: conversation.id,
      title: option.title,
      contextType: option.type,
      contextLabel: option.title,
      sourceId: option.sourceId,
      messages: [
        {
          id: uid("side_msg"),
          sender: "assistant",
          content: buildSideChatWelcome(conversation, option),
          createdAt
        }
      ],
      createdAt,
      updatedAt: createdAt
    };

    setSideChats((items) => [...items, session]);
    setActiveSideChatId(session.id);
    setMode("side-chat");
    setSideChatInput("");
  }

  function closeSideChatSession(sessionId: string) {
    const remaining = currentSideChats.filter((session) => session.id !== sessionId);
    setSideChats((items) => items.filter((session) => session.id !== sessionId));
    setActiveSideChatId(remaining[0]?.id ?? null);
    if (!remaining.length) {
      setMode("chat");
    }
  }

async function sendSideChatMessage() {
    const text = sideChatInput.trim();
    const session = activeSideChat;
    if (!text || !session || pendingRef.current.has(session.id)) return;
    pendingRef.current.add(session.id);
    showToast("正在根据当前记录回答…");
    try {
      const result = await backend<{ content: string }>("chat", {
        question: text, contactId: session.conversationId,
        sourceId: session.sourceId ? recordId({ id: session.sourceId.replace(/:archive$/, "") }) : undefined,
      });
      setSideChats(items => items.map(item => item.id === session.id ? {
        ...item, messages: [...item.messages, { id: uid("side_msg"), sender: "teacher", content: text, createdAt: nowIso() },
        { id: uid("side_msg"), sender: "assistant", content: result.content, createdAt: nowIso() }], updatedAt: nowIso(),
      } : item));
      setSideChatInput(""); showToast("回答已生成，供老师参考。");
    } catch (error) { showToast(error instanceof Error ? error.message : "回答未完成，请重试"); }
    finally { pendingRef.current.delete(session.id); }
  }

  function updateConversation(conversationId: string, patch: Partial<Conversation>) {
    setConversations((items) => items.map((item) => (item.id === conversationId ? { ...item, ...patch } : item)));
  }

  function addMessage(message: Message, latestSummary?: string) {
    setMessages((items) => [...items, message]);
    updateConversation(message.conversationId, {
      summary: latestSummary ?? message.content ?? (message.type === "image" ? "上传了一张图片" : "任务已创建"),
      time: "刚刚"
    });
  }

  function addAiText(conversation: Conversation, content: string) {
    addMessage(
      {
        id: uid("msg"),
        conversationId: conversation.id,
        sender: "ai",
        type: "text",
        content,
        createdAt: nowIso()
      },
      content
    );
  }









  async function createRunningSkill(skillId: SkillId, conversation = activeConversation, inputSummary = "", subjectOverride?: string, attachmentIds: string[] = []) {
    if (conversation.kind === "assistant") {
      showToast("请先选择学生或班级，再生成教学记录。"); return;
    }
    if (sending) return;
    setSending(true);
    try {
      const source = latestRecord(conversation.id);
      if (skillId === "generate_feedback" || skillId === "parent_communication") {
        if (!source) { showToast("请先提交课堂表现或学习材料，完成记录后再生成反馈。"); return; }
        await runRecordAction({ id: source.id } as TaskCard, "feedback"); return;
      }
      if (skillId === "split_to_student_profiles") {
        const classRecord = source;
        if (!classRecord) { showToast("请先完成本次班级课堂记录。"); return; }
        setInput("请逐位记录到课学生的表现，再进入对应学生会话整理入档。");
        showToast("请在学生会话中补充个体观察，班级内容不能代替个人表现。"); return;
      }
      const kind = skillId === "monthly_report" ? "monthly" : skillId === "analyze_learning_evidence" ? "analysis"
        : ["next_lesson_plan", "lesson_prep", "tiered_practice"].includes(skillId) ? "prep" : "record";
      const now = new Date().toLocaleDateString("en-CA");
      const month = inputSummary.match(/(20\d{2})[-年](0?[1-9]|1[0-2])(?:月|\b)/);
      const body = { contactId: conversation.id, kind, date: now,
        month: month ? `${month[1]}-${month[2].padStart(2, "0")}` : now.slice(0, 7),
        input: inputSummary || (kind === "prep" ? source ? `根据近期记录备课：\n${source.archiveContent || source.content}` : "" : ""),
        attachmentIds, sourceIds: kind === "prep" && source ? [source.id] : [] };
      const created = await performBackend(() => backend<LearningRecord>("records", body));
      if (!created) return;
      setInput(""); setComposerAttachments([]); setActiveSkillId(null);
      await runRecordAction({ id: created.id } as TaskCard, "generate");
    } finally { setSending(false); }
  }



  async function handleSendMessage() {
    const text = input.trim();
    if ((!text && !composerAttachments.length) || sending || uploading) return;
    if (activeConversation.kind === "assistant") {
      addMessage({ id: uid("msg"), conversationId: activeConversation.id, sender: "teacher", type: "text", content: text, createdAt: nowIso() });
      addAiText(activeConversation, buildAutomationAssistantReply(taskCards, conversations));
      setInput(""); return;
    }
    const skill = activeSkillId || (composerAttachments.length ? "analyze_learning_evidence" : intentToSkillId(detectIntent(text) === "normal_chat" ? "learning_record" : detectIntent(text) as TaskType, activeConversation));
    await createRunningSkill(skill, activeConversation, text, undefined, composerAttachments.map(a => a.id));
  }

  async function handleUpload(file?: File) {
    if (!file || uploading) return;
    if (file.size > 20 * 1024 * 1024) { showToast("单个文件不能超过 20 MB"); return; }
    if (composerAttachments.length >= 5) { showToast("一次最多添加 5 份材料"); return; }
    setUploading(true);
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/xuemai/attachments", { method: "POST", body: form });
      const data: Attachment & { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || "上传失败");
      setComposerAttachments(items => [...items, { id: data.id, fileName: data.name, imageUrl: data.type.startsWith("image/") ? `/api/xuemai/attachments/${data.id}` : undefined }]);
      showToast("材料已上传，点击发送开始整理。");
    } catch (error) { showToast(error instanceof Error ? error.message : "上传失败"); }
    finally { setUploading(false); }
  }

  function startPendingUploadTask() { void handleSendMessage(); }

  async function copyFeedback(task: TaskCard) {
    const record = snapshotRef.current?.records.find(r => r.id === recordId(task));
    const value = isFeedback(task) ? record?.feedback : record?.content;
    if (!value) { showToast("请等待结果生成后再复制。"); return; }
    try { await navigator.clipboard.writeText(value); showToast("已复制，请到微信粘贴发送。"); }
    catch { showToast("无法访问剪贴板，请手动复制正文。"); }
  }

  async function markFeedback(task: TaskCard) {
    if (await runRecordAction(task, "sent")) showToast("已标记为已发送。");
  }

  async function archiveTask(task: TaskCard) {
    if (await runRecordAction(task, "archive")) showToast("已确认入档。");
  }

  function archiveTaskWithProfileUpdates(task: TaskCard) { void archiveTask(task); }

  function regenerateTask(task: TaskCard) {
    void runRecordAction(task, isFeedback(task) ? "feedback" : "generate");
  }

  function reviseTask(task: TaskCard, mode: "warmer" | "shorter") {
    void runRecordAction(task, "feedback", { tone: mode === "warmer" ? "温和、具体" : "简洁、专业" });
  }

  async function handleSkillEdit(task: TaskCard, value: string) {
    const result = await runRecordAction(task, "edit", isFeedback(task) ? { feedback: value } : { content: value });
    if (result) showToast("修改已保存。");
  }

  function handleSkillReset(task: TaskCard) {
    const record = snapshotRef.current?.records.find(r => r.id === recordId(task));
    if (record) void handleSkillEdit(task, isFeedback(task) ? record.aiFeedback : record.aiContent);
  }

function openSkillReview(task: TaskCard) {
    setActiveId(task.conversationId); setReviewTaskId(task.id); setSelectedTaskId(task.id);
    setActiveDrawer(null); setMode("side-chat"); setIsContextOpen(true);
  }





  function handleSkillAction(task: TaskCard, action: SkillAction) {
    if (action === "copy_feedback") return void copyFeedback(task);
    if (action === "mark_parent_sent") return void markFeedback(task);
    if (action === "archive" || action === "add_monthly_material" || action === "add_report_material") return void archiveTask(task);
    if (action === "regenerate") return regenerateTask(task);
    if (action === "make_warmer" || action === "make_shorter") return reviseTask(task, action === "make_warmer" ? "warmer" : "shorter");
    if (action === "generate_feedback") return void runRecordAction(task, "feedback");
    if (action === "generate_next_lesson") {
      const conversation = conversations.find(c => c.id === task.conversationId);
      if (conversation) void createRunningSkill("next_lesson_plan", conversation, `根据本次记录备课：\n${task.currentOutput?.display_content || task.summary}`);
      return;
    }
    if (action === "update_learning_record" || action === "save_note") {
      const conversation = conversations.find(c => c.id === task.conversationId);
      if (conversation) void createRunningSkill("update_learning_record", conversation, task.currentOutput?.display_content || task.summary);
      return;
    }
    showToast("请先检查记录，在学生会话中补充事实后继续。");
  }



  function handleQuickTask(task: string) {
    if (activeConversation.kind === "assistant") {
      setInput(buildAutomationPromptTemplate(task));
      setActiveSkillId(null);
      showToast("已填入模板，可继续修改后发送");
      return;
    }

    const skill = getSkillByTriggerLabel(task, subjectType) ?? getSkillsForSubject(subjectType).find((item) => item.label === task);
    if (!skill) {
      showToast("这个教学任务还没有注册到当前会话");
      return;
    }

    const selecting = activeSkillId !== skill.id;
    const promptTemplate = buildConversationSkillPromptTemplate(skill.id, getSkillDisplayLabel(skill, activeConversation), activeConversation);
    setActiveSkillId(selecting ? skill.id : null);
    if (selecting) {
      setInput(promptTemplate);
      showToast(`已填入「${getSkillDisplayLabel(skill, activeConversation)}」模板，可修改后发送`);
      return;
    }
    if (input.trim() === promptTemplate.trim()) setInput("");
    showToast(`已取消「${getSkillDisplayLabel(skill, activeConversation)}」`);
  }

  function handleSmartInputAction(action: SmartInputAction) {
    if (!input.trim() || sending) return;
    if (action === "save_note") {
      const text = input.trim();
      void performBackend(() => backend("records", { contactId: activeConversation.id, kind: "record", input: text, date: new Date().toLocaleDateString("en-CA"), attachmentIds: [] }), "原文已保存，可稍后整理。").then(result => { if (result) setInput(""); });
      return;
    }
    void createRunningSkill(action === "generate_feedback" ? "generate_feedback" : "update_learning_record", activeConversation, input);
  }

  async function handleCreate(kind: Exclude<CreationMode, null>, payload: CreationPayload) {
    const selectedClass = conversations.find(c => c.kind === "class" && c.name === payload.className);
    const saved = await performBackend(() => backend<Contact>("contacts", {
      kind, name: payload.name, grade: payload.grade || selectedClass?.grade || "", subject: payload.subject || selectedClass?.subject || "数学",
      classIds: selectedClass ? [selectedClass.id] : [], serviceRules: payload,
    }), "资料已保存。");
    if (saved) { selectConversation(saved.id); setCreationMode(null); }
  }

  function handleAddStudentToClass(classId: string, studentName: string) {
    const classroom = conversations.find(c => c.id === classId);
    if (classroom) void handleCreate("student", { name: studentName, grade: classroom.grade, subject: classroom.subject, className: classroom.name });
  }

  function handleEditProfileRequest(conversation: Conversation) {
    if (conversation.kind === "assistant") return;
    setActiveDrawer(null);
    setDetailStudentId(null);
    setEditingConversationId(conversation.id);
    setCreationMode(conversation.kind);
  }

  async function handleUpdateProfile(conversation: Conversation, payload: CreationPayload) {
    const selectedClass = conversations.find(c => c.kind === "class" && c.name === payload.className);
    const saved = await performBackend(() => backend<Contact>("contacts", {
      id: conversation.id, kind: conversation.kind, name: payload.name, grade: payload.grade, subject: payload.subject,
      classIds: selectedClass ? [selectedClass.id] : [], serviceRules: payload,
    }), "资料已更新。");
    if (saved) { setCreationMode(null); setEditingConversationId(null); }
  }

  function handleClearLocalData() { window.location.href = "/api/xuemai/export"; }

  async function handleLogout() {
    await performBackend(() => backend("auth", {}, "DELETE"));
    setSideChats([]); setInput(""); setComposerAttachments([]); setMode("chat");
  }

  async function handleLogin(profile: TeacherProfile, credentials: { mode: string; password: string }) {
    await backend("auth", { mode: credentials.mode, identifier: profile.contact, password: credentials.password, name: profile.nickname });
    await refreshBackend();
    setActiveId(snapshotRef.current?.contacts[0]?.id || initialState.currentConversationId!);
    showToast("欢迎回来");
  }
  function handlePreferences(value: UserPreferences) {
    if (value.autoArchiveLearningEvidence) { showToast("学习档案需要老师逐项确认，不能自动入档。"); return; }
    setPreferences(value);
    const previous = snapshotRef.current?.preferences;
    if (previous) void performBackend(() => backend("settings", { ...previous, tone: value.feedbackTone }, "PATCH"), "偏好已保存。");
  }

  if (!hasLoadedStorage) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f7f8f7] text-sm font-bold text-[#3d4a3d]">正在打开学脉工作台...</main>;
  }

  if (!teacher) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const chatPane = (
    <>
      <ChatHeader
        conversation={activeConversation}
        summary={statusSummary}
        subjectOptions={activeSubjectOptions}
        activeSubject={activeSubjectTrack}
        onSubjectChange={handleActiveSubjectChange}
        onOpenDrawer={openDrawer}
        onOpenSideChat={openSideChatPanel}
        onOpenStudentDetail={() => openStudentDetail(activeConversation)}
        onOpenProfileSideChat={() => openSideChatForContext("student_profile")}
        onOpenMobileNavigation={() => setIsMobileNavigationOpen(true)}
      />
      <div className="xuemai-chat-bg relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[820px] flex-col gap-3 px-3 pb-5 pt-4 sm:px-6">
            {displayMessages.length === 0 ? (
              isAutomationAssistant ? (
                <AutomationAssistantEmptyState templates={automationTemplates} onSelectTemplate={(prompt) => (setInput(prompt), showToast("已填入模板，可继续修改后发送"))} />
              ) : (
                <EmptyConversationState onUpload={() => fileInputRef.current?.click()} onFeedback={() => createRunningSkill("generate_feedback")} onLesson={() => createRunningSkill("next_lesson_plan")} />
              )
            ) : (
              displayMessages.map((item) => {
                const task = item.taskCardId ? taskById.get(item.taskCardId) : undefined;
                return (
                  <MessageRow
                    key={item.id}
                    message={item}
                    task={task}
                    conversation={activeConversation}
                    onSkillAction={handleSkillAction}
                    onSkillEdit={handleSkillEdit}
                    onSkillReview={openSkillReview}
                    highlighted={task ? locatedTaskId === task.id : false}
                  />
                );
              })
            )}
            {pendingUploadConversationId === activeConversation.id ? <ConfirmTaskCard onCancel={() => setPendingUploadConversationId(null)} onStart={() => startPendingUploadTask()} onRemember={() => startPendingUploadTask()} /> : null}
            <div ref={bottomRef} />
          </div>
        </div>
        <Composer
          value={input}
          onChange={setInput}
          onSend={handleSendMessage}
          onUpload={() => fileInputRef.current?.click()}
          onRemoveAttachment={(id) => setComposerAttachments((items) => items.filter((item) => item.id !== id))}
          onQuickTask={handleQuickTask}
          onSmartAction={handleSmartInputAction}
          quickTasks={quickTasks}
          activeQuickTask={activeQuickTaskLabel}
          attachments={composerAttachments}
          smartHintsEnabled={!isAutomationAssistant}
          busy={sending || uploading}
        />
      </div>
    </>
  );

  const sideWorkspace = reviewTask ? (
    <TaskReviewWorkspace
      task={reviewTask}
      autoArchiveLearningEvidence={preferences.autoArchiveLearningEvidence}
      onBack={() => (setReviewTaskId(null), setMode("chat"))}
      onAction={handleSkillAction}
      onEdit={handleSkillEdit}
      onReset={handleSkillReset}
      onAutoArchiveLearningEvidenceChange={(enabled) => handlePreferences({ ...preferences, autoArchiveLearningEvidence: enabled })}
      onConfirmProfileUpdates={archiveTaskWithProfileUpdates}
    />
  ) : (
    <SideChatPanel
      sessions={currentSideChats}
      activeSession={activeSideChat}
      activeSessionId={activeSideChatId}
      contextOptions={sideChatContextOptions}
      conversation={activeConversation}
      classMembers={currentClassMembers}
      conversationName={activeConversation.name}
      taskCards={taskCards}
      timelineRecords={timelineRecords}
      composerValue={sideChatInput}
      onComposerChange={setSideChatInput}
      onCreateSession={createSideChatSession}
      onSelectSession={(id) => setActiveSideChatId(id || null)}
      onCloseSession={closeSideChatSession}
      onSend={sendSideChatMessage}
      onOpenTask={openStudentDetailTask}
      onLocateTarget={locateSideChatTarget}
      onClosePanel={closeSideChatPanel}
      onTaskAction={handleSkillAction}
      onTaskEdit={handleSkillEdit}
      onTaskReset={handleSkillReset}
      onEditProfile={handleEditProfileRequest}
      autoArchiveLearningEvidence={preferences.autoArchiveLearningEvidence}
      onAutoArchiveLearningEvidenceChange={(enabled) => handlePreferences({ ...preferences, autoArchiveLearningEvidence: enabled })}
      onTaskConfirmProfileUpdates={archiveTaskWithProfileUpdates}
    />
  );

  return (
    <main className="h-screen h-[100dvh] min-h-0 overflow-hidden bg-[#f7f8f7] text-[#191c1d]">
      <div className={cn("grid h-full min-h-0 grid-cols-1 xl:[grid-template-columns:var(--workspace-columns)]", mode === "todos" ? "lg:grid-cols-[56px_minmax(0,1fr)]" : "lg:grid-cols-[56px_clamp(260px,21vw,320px)_minmax(0,1fr)]")} style={workspaceStyle}>
        {isMobileNavigationOpen ? (
          <button type="button" className="fixed inset-0 z-40 bg-[#101712]/28 backdrop-blur-[1px] lg:hidden" onClick={() => setIsMobileNavigationOpen(false)} aria-label="关闭导航" />
        ) : null}
        <Rail
          mode={mode}
          onModeChange={(nextMode) => {
            setMode(nextMode);
            setIsMobileNavigationOpen(false);
          }}
          teacherName={teacher.nickname}
          className={isMobileNavigationOpen ? "fixed inset-y-0 left-0 z-50 w-14 shadow-xl lg:static lg:z-auto lg:w-auto lg:shadow-none" : "hidden lg:flex"}
        />

        {mode !== "todos" ? <aside className={cn("min-h-0 border-r border-[#e3e6e4] bg-[#fbfcfb]", isMobileNavigationOpen ? "fixed inset-y-0 left-14 z-50 block w-[min(calc(100vw-56px),320px)] shadow-xl lg:static lg:w-auto lg:shadow-none" : "hidden lg:block")}>
          <div className="flex h-[56px] items-center gap-2 px-3">
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#f3f5f4] px-3 text-xs text-[#8a918d] ring-1 ring-transparent transition focus-within:ring-[#d7e8dc]">
              <button type="button" onClick={openGlobalSearch} className="-ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8a918d] transition hover:bg-white hover:text-[#168f42]" aria-label="打开全局搜索">
                <Search size={16} />
              </button>
              <input value={query} onFocus={openGlobalSearch} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9ba19d]" placeholder="搜索学生、班级、任务记录" />
            </label>
            <div className="relative">
              <button type="button" onClick={() => setIsCreateMenuOpen((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f5f4] text-[#3d4a3d] transition hover:bg-[#e7ece8]" aria-label="新建">
                <Plus size={20} />
              </button>
              {isCreateMenuOpen ? (
                <div className="absolute right-0 top-10 z-30 w-36 overflow-hidden rounded-2xl border border-[#e1e3e4] bg-white p-1 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                  <MenuButton onClick={() => (setCreationMode("student"), setIsCreateMenuOpen(false))} icon={<UserRound size={16} />} label="新建学生" />
                  <MenuButton onClick={() => (setCreationMode("class"), setIsCreateMenuOpen(false))} icon={<UsersRound size={16} />} label="新建班级" />
                  <MenuButton onClick={() => (fileInputRef.current?.click(), setIsCreateMenuOpen(false))} icon={<ImagePlus size={16} />} label="上传试卷" />
                </div>
              ) : null}
            </div>
            <button type="button" onClick={() => setIsMobileNavigationOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6b746d] transition hover:bg-[#edf8f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/35 lg:hidden" aria-label="关闭导航">
              <X size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.pptx,.txt,.md"
              className="hidden"
              onChange={(event) => {
                handleUpload(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </div>

          <div className="h-[calc(100vh-56px)] overflow-y-auto pb-4">
            {isGlobalSearchActive ? (
              <SidebarGlobalSearchResults query={query} results={globalSearchResults} onOpen={openSearchResult} onClear={() => setQuery("")} />
            ) : (
              <>
                {assistantConversation ? <AssistantConversationEntry conversation={assistantConversation} active={activeId === assistantConversation.id} onSelect={selectConversation} /> : null}
                <ConversationGroup title="班级群聊" items={classConversations} activeId={activeId} onSelect={selectConversation} onAvatarClick={openStudentDetail} />
                <ConversationGroup title="最近处理学生" items={studentConversations} activeId={activeId} onSelect={selectConversation} onAvatarClick={openStudentDetail} />
              </>
            )}
          </div>
        </aside> : null}

        <section className="relative flex min-h-0 min-w-0 flex-col bg-[#f7f8f7]">
          {mode === "todos" ? (
            <WorkOverviewPanel
              taskCards={taskCards}
              conversations={conversations}
              timelineRecords={timelineRecords}
              teacherName={teacher.nickname}
              onOpenNavigation={() => setIsMobileNavigationOpen(true)}
              onEnter={(conversationId, taskId) => {
                selectConversation(conversationId);
                setSelectedTaskId(taskId ?? null);
                if (taskId) { setReviewTaskId(taskId); setMode("side-chat"); }
                showToast("已定位到对应聊天");
              }}
            />
          ) : mode === "settings" ? (
            <SettingsPanel
              preferences={preferences}
              onChange={handlePreferences}
              onClearData={handleClearLocalData}
              onLogout={handleLogout}
              services={snapshotRef.current?.services}
              onRefresh={refreshBackend}
              teacherName={teacher.nickname}
              teacherProfile={teacher}
              conversations={conversations}
              taskCards={taskCards}
            />
          ) : (
            <div className={`flex min-h-0 flex-1 ${mode === "side-chat" && !isAutomationAssistant ? "flex-row" : "flex-col"}`}>
              <div className={`${mode === "side-chat" ? "hidden lg:flex" : "flex"} min-h-0 min-w-0 flex-1 flex-col`}>{chatPane}</div>
              {mode === "side-chat" && !isAutomationAssistant ? (
                <>
                  <div
                    role="separator"
                    aria-label="调整侧边聊天宽度"
                    aria-orientation="vertical"
                    aria-valuemin={sideWorkspaceMinWidth}
                    aria-valuemax={sideWorkspaceMaxWidth}
                    aria-valuenow={sideWorkspaceWidth}
                    tabIndex={0}
                    title="拖动调整侧边聊天宽度"
                    onPointerDown={startSideWorkspaceResize}
                    onDoubleClick={() => setSideWorkspaceWidth(sideWorkspaceDefaultWidth)}
                    onKeyDown={handleSideWorkspaceResizeKey}
                    className="group relative z-10 hidden w-2 shrink-0 cursor-col-resize items-stretch justify-center outline-none lg:flex"
                  >
                    <span className="my-3 w-px rounded-full bg-[#dfe5e1] transition group-hover:bg-[#22c55e] group-focus-visible:bg-[#22c55e]" />
                  </div>
                  <aside className="flex min-h-0 max-w-full shrink-0 bg-[#f7f8f7]" style={{ width: sideWorkspaceWidth }}>
                    {sideWorkspace}
                  </aside>
                </>
              ) : null}
            </div>
          )}
        </section>

        {mode === "chat" && !isAutomationAssistant ? (
          <ContextPanel
            conversation={activeConversation}
            members={currentClassMembers}
            messages={currentMessages}
            taskCards={taskCards}
            timelineRecords={timelineRecords}
            activeSubject={activeSubjectTrack}
            open={isContextOpen}
            onToggle={() => setIsContextOpen((value) => !value)}
            onSelectStudent={openStudentProfileSideChat}
            onCloseReview={() => setReviewTaskId(null)}
            onTaskAction={handleSkillAction}
            onTaskEdit={handleSkillEdit}
            onTaskReset={handleSkillReset}
            autoArchiveLearningEvidence={preferences.autoArchiveLearningEvidence}
            onAutoArchiveLearningEvidenceChange={(enabled) => handlePreferences({ ...preferences, autoArchiveLearningEvidence: enabled })}
            onTaskConfirmProfileUpdates={archiveTaskWithProfileUpdates}
          />
        ) : null}
      </div>

      {creationMode ? (
        <CreateDialog
          mode={creationMode}
          classOptions={conversations.filter((item) => item.kind === "class").map((item) => item.name)}
          initialPayload={editingConversation ? toCreationPayload(editingConversation) : undefined}
          eyebrow={editingConversation ? (editingConversation.kind === "class" ? "修改班级" : "修改学生档案") : undefined}
          title={editingConversation ? (editingConversation.kind === "class" ? "修改班级资料与服务规则" : "修改学生基础信息与服务规则") : undefined}
          primaryLabel={editingConversation ? "保存修改" : undefined}
          onClose={() => {
            setCreationMode(null);
            setEditingConversationId(null);
          }}
          onCreate={(payload) => (editingConversation ? handleUpdateProfile(editingConversation, payload) : handleCreate(creationMode, payload))}
        />
      ) : null}
      {activeDrawer ? (
        <SideDrawer title={activeDrawer === "search" && searchDrawerScope === "global" ? "全局搜索" : drawerTitle(activeDrawer, activeConversation)} onClose={() => setActiveDrawer(null)}>
          {activeDrawer === "detail" && selectedTask ? (
            <TaskDetailDrawer task={selectedTask} onCopy={copyFeedback} onMark={markFeedback} />
          ) : activeDrawer === "profile" ? (
            <ProfileDrawer conversation={activeConversation} members={currentClassMembers} onAddStudentToClass={handleAddStudentToClass} onSelectStudent={(id) => (openStudentProfileSideChat(id), setActiveDrawer(null))} onEditProfile={handleEditProfileRequest} />
          ) : (
            <SearchDrawer conversation={activeConversation} conversations={conversations} messages={messages} taskCards={taskCards} timelineRecords={timelineRecords} scope={searchDrawerScope} filter={searchFilter} query={searchDrawerQuery} onFilterChange={setSearchFilter} onQueryChange={setSearchDrawerQuery} onOpenResult={openSearchResult} />
          )}
        </SideDrawer>
      ) : null}
      {detailStudent ? (
        <StudentDetailModal
          student={detailStudent}
          taskCards={taskCards}
          timelineRecords={timelineRecords}
          activeSubject={getSelectedSubjectTrack(detailStudent, subjectContextByConversationId[detailStudent.id])}
          onSubjectChange={(subject) => setSubjectContextByConversationId((value) => ({ ...value, [detailStudent.id]: subject }))}
          onClose={() => setDetailStudentId(null)}
          onOpenTask={openStudentDetailTask}
          onEditProfile={handleEditProfileRequest}
        />
      ) : null}
      {toast ? <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#191c1d] px-4 py-2 text-sm font-medium text-white shadow-2xl">{toast}</div> : null}
    </main>
  );
}

function clampSideWorkspaceWidth(width: number) {
  return Math.min(sideWorkspaceMaxWidth, Math.max(sideWorkspaceMinWidth, Math.round(width)));
}



function dedupeRepeatedTaskMessages(messages: Message[], taskById: Map<string, TaskCard>) {
  const seen = new Set<string>();
  const archivedBySignature = new Map<string, number>();

  messages.forEach((message) => {
    if (message.type !== "task" || !message.taskCardId) return;
    const task = taskById.get(message.taskCardId);
    const signature = task ? getSupersededTaskSignature(task) : "";
    if (!task || !signature || task.status !== "archived") return;
    archivedBySignature.set(signature, Math.max(archivedBySignature.get(signature) ?? 0, new Date(task.updatedAt || task.createdAt).getTime()));
  });

  return [...messages]
    .reverse()
    .filter((message) => {
      if (message.type !== "task" || !message.taskCardId) return true;
      const task = taskById.get(message.taskCardId);
      if (!task || task.status === "running") return true;
      const signature = getSupersededTaskSignature(task);
      const archivedAt = signature ? archivedBySignature.get(signature) : undefined;
      if (archivedAt && task.status !== "archived" && new Date(task.updatedAt || task.createdAt).getTime() < archivedAt) return false;
      const key = [task.conversationId, task.taskType, task.status, task.summary ?? "", task.feedbackText ?? ""].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .reverse();
}

function getSupersededTaskSignature(task: TaskCard) {
  const input = normalizeTaskInputSignature(task.inputSummary || task.detail || "");
  if (!input) return "";
  return [task.conversationId, task.skillId ?? task.taskType, task.taskType, input].join("|");
}

function normalizeTaskInputSignature(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

function buildAutomationPromptTemplate(label: string) {
  const matched = automationTemplates.find((template) => template.label === label);
  if (matched) return matched.prompt;

  if (label.includes("待办")) {
    return "帮我整理今天最应该先处理的待办，按紧急程度分成：必须今天处理、这周处理、可以稍后处理。";
  }
  if (label.includes("月报")) {
    return "帮我整理本月待生成月报的学生名单，指出每个学生还缺哪些可写入月报的学习证据。";
  }
  if (label.includes("备课")) {
    return "帮我根据近期学生薄弱点生成今天的备课优先级，先列学生，再列每个学生下次课重点。";
  }
  if (label.includes("素材")) {
    return "帮我整理最近可以复用的教学素材和案例，按学生反馈、月报素材、下次课练习三个用途分类。";
  }
  if (label.includes("续费")) {
    return "帮我筛选需要续费跟进的学生，整理可以给家长看的过程证据和后续学习计划。";
  }
  if (label.includes("复盘")) {
    return "帮我复盘最近一周的教学服务质量：哪些学生反馈及时，哪些记录没有入档，哪些家长沟通需要补充。";
  }

  return `帮我围绕「${label}」生成一个可执行的自动化任务计划，先列依据，再列处理顺序，最后给出需要老师确认的事项。`;
}

function buildConversationSkillPromptTemplate(skillId: SkillId, label: string, conversation: Conversation) {
  const subjectLabel = getSkillSubjectLabel(conversation);
  const studentName = conversation.kind === "student" ? conversation.name : "这个学生";
  const className = conversation.kind === "class" ? conversation.name : "这个班";

  if (conversation.kind === "class") {
    switch (skillId) {
      case "monthly_report":
        return `请为「${className}」整理一份本月班级复盘月报，重点看班课推进、共性薄弱点、需要关注学生、反馈完成情况和下月分层安排。`;
      case "class_lesson_record":
        return `记录「${className}」本节班课：今天讲了……学生整体表现……共性问题……需要单独跟进的学生……后续训练重点……`;
      case "batch_feedback":
        return `请根据「${className}」本次班课记录，生成分组课后反馈草稿。先按学生状态分组，再分别给出可发给家长的简短反馈。`;
      case "common_weakness":
        return `请从「${className}」最近班课记录和学生表现中整理共性薄弱点，区分知识点、解题方法、审题习惯和表达规范。`;
      case "tiered_practice":
        return `请根据「${className}」当前共性薄弱点，设计基础组、提升组、挑战组三层练习方向，并说明每组适合哪些学生。`;
      case "split_to_student_profiles":
        return `请把「${className}」这条班课记录拆成每个学生可入档的学习记录草稿，只保留有依据的事实，待我确认后再写入学生档案。`;
      default:
        return `请围绕「${className}」执行「${label}」，先说明依据，再给出老师可以直接处理的结果。`;
    }
  }

  switch (skillId) {
    case "update_learning_record":
      return `帮我把「${studentName}」这段课堂表现整理为学习记录草稿，保留事实依据，不夸大、不贴标签：`;
    case "analyze_learning_evidence":
      return `我将上传或描述「${studentName}」的一份${subjectLabel}学习材料。请先判断材料类型、学生作答痕迹和可分析范围，再生成学情分析草稿。`;
    case "generate_feedback":
      return `根据「${studentName}」最近的学习记录，生成一段可发给家长的微信反馈。语气温和、具体，不制造焦虑，不承诺提分。`;
    case "next_lesson_plan":
      return `根据「${studentName}」最近的${subjectLabel}表现，整理下次课建议，优先给出训练重点、课堂安排和需要观察的问题。`;
    case "monthly_report":
      return `整理「${studentName}」本月${subjectLabel}月报草稿，只使用已确认记录，突出本月表现、主要进步、仍需巩固和下月重点。`;
    case "parent_communication":
      return `帮我整理一段关于「${studentName}」的家长沟通建议。先说明事实依据，再给出温和、可直接发送的表达。`;
    default:
      return `请围绕「${studentName}」执行「${label}」，先说明依据，再输出老师可确认的草稿。`;
  }
}

function buildAutomationAssistantReply(taskCards: TaskCard[], conversations: Conversation[]) {
  const feedback = taskCards.filter(task => task.taskType === "feedback" && ["completed", "copied"].includes(task.status)).length;
  const failed = taskCards.filter(task => task.status === "failed").length;
  const archived = taskCards.filter(task => task.status === "archived").length;
  const students = conversations.filter(item => item.kind === "student").length;
  return `当前工作台有 ${students} 位学生、${feedback} 条待发送反馈、${failed} 条处理失败记录、${archived} 条已入档记录。请从左侧选择学生或班级继续处理。当前模板按需查看记录，不会创建定时任务或自动联系家长。`;
}

function getSkillDisplayLabel(skill: { id: SkillId; label: string }, conversation: Conversation) {
  if (skill.id === "monthly_report" && conversation.kind === "class") return "班级月报";
  return skill.label;
}



function getSubjectType(conversation: Conversation): SkillSubjectType {
  if (conversation.kind === "assistant") return "teacher_workspace";
  return conversation.kind;
}

function intentToSkillId(intent: Exclude<ReturnType<typeof detectIntent>, "normal_chat">, conversation: Conversation): SkillId {
  if (intent === "learning_record") return conversation.kind === "class" ? "class_lesson_record" : "update_learning_record";
  if (intent === "learning_evidence_analysis") return "analyze_learning_evidence";
  if (intent === "feedback") return "generate_feedback";
  if (intent === "lesson_suggestion") return "next_lesson_plan";
  if (intent === "monthly_report") return "monthly_report";
  if (intent === "batch_feedback") return "batch_feedback";
  return conversation.kind === "class" ? "class_lesson_record" : "update_learning_record";
}



function toCreationPayload(conversation: Conversation): Partial<CreationPayload> {
  return {
    name: conversation.name,
    grade: conversation.grade,
    subject: conversation.subject,
    className: conversation.kind === "student" ? conversation.className : "",
    learningGoal: conversation.kind === "student" ? extractLearningGoal(conversation.summary) : "",
    needsFeedback: conversation.statusLabel.includes("反馈"),
    repeatSchedule: true,
    ...conversation.serviceRules
  };
}

function extractLearningGoal(summary: string) {
  const normalized = summary.trim();
  if (!normalized.startsWith("学习目标：")) return "";
  return normalized.replace(/^学习目标：/u, "").split(" · ")[0]?.trim() ?? "";
}



















type SidebarSearchResult = SearchDrawerResultTarget & {
  id: string;
  label: string;
  title: string;
  context: string;
  snippet: string;
  createdAt?: string;
};

function SidebarGlobalSearchResults({
  query,
  results,
  onOpen,
  onClear
}: {
  query: string;
  results: SidebarSearchResult[];
  onOpen: (target: SearchDrawerResultTarget) => void;
  onClear: () => void;
}) {
  return (
    <section className="px-3 pt-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black text-[#22c55e]">全局搜索</p>
          <h2 className="mt-0.5 text-[14px] font-black text-[#191c1d]">“{query.trim()}”</h2>
        </div>
        <button type="button" onClick={onClear} className="rounded-full bg-[#f1f3f2] px-2.5 py-1.5 text-[11px] font-bold text-[#6b746d] transition hover:bg-[#e7ece8]">
          清空
        </button>
      </div>
      <div className="mt-3 space-y-1">
        {results.length ? (
          results.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpen(item)} className="block w-full rounded-2xl px-3 py-2.5 text-left transition hover:bg-[#f1faf4]">
              <span className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-[#edf8f1] px-2 py-0.5 text-[10px] font-black text-[#168f42]">{item.label}</span>
                {item.createdAt ? <span className="text-[10px] font-bold text-[#a0a7a2]">{formatSidebarSearchTime(item.createdAt)}</span> : null}
              </span>
              <strong className="mt-1.5 block truncate text-[13px] font-black text-[#191c1d]">{item.title}</strong>
              <span className="mt-0.5 block truncate text-[11px] font-bold text-[#7a837c]">{item.context}</span>
              <span className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-[#4e5c52]">{item.snippet}</span>
            </button>
          ))
        ) : (
          <div className="rounded-2xl bg-[#f8f9fa] p-3">
            <p className="text-[13px] font-black text-[#191c1d]">没找到结果</p>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-[#6b746d]">可以试试学生姓名、班级、科目、待反馈、错题或月报。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function buildSidebarGlobalSearchResults({
  query,
  conversations,
  messages,
  taskCards,
  timelineRecords
}: {
  query: string;
  conversations: Conversation[];
  messages: Message[];
  taskCards: TaskCard[];
  timelineRecords: TimelineRecord[];
}) {
  const terms = normalizeSidebarSearch(query)
    .split(/\s+/)
    .filter(Boolean);
  if (!terms.length) return [];

  const conversationById = new Map(conversations.map((item) => [item.id, item]));
  const taskById = new Map(taskCards.map((item) => [item.id, item]));
  const results: SidebarSearchResult[] = [];

  conversations.forEach((item) => {
    if (item.kind === "assistant") return;
    const subjectLabel = normalizeSubjectText(item.subject);
    const haystack = [item.name, item.className, item.grade, item.subject, item.subjectTracks?.join(" "), item.summary, item.statusLabel, item.kind === "class" ? "班级" : "学生"].join(" ");
    if (!sidebarSearchMatches(haystack, terms)) return;
    results.push({
      id: `sidebar-conversation-${item.id}`,
      resultType: "conversation",
      conversationId: item.id,
      label: item.kind === "class" ? "班级" : "学生",
      title: item.kind === "class" ? `${item.name} 班级` : `${item.name} 学生档案`,
      context: [item.grade, subjectLabel, item.className].filter(Boolean).join(" · "),
      snippet: cleanSubjectPlaceholderText(item.summary || item.statusLabel || "打开会话查看记录")
    });
  });

  taskCards.forEach((task) => {
    const conversation = conversationById.get(task.conversationId);
    const label = task.taskType === "monthly_report" ? "月报" : task.taskType === "learning_evidence_analysis" ? "报告" : "卡片";
    const haystack = [conversation?.name, task.title, task.subject, task.inputSummary, task.summary, task.feedbackText, task.detail, task.status].join(" ");
    if (!sidebarSearchMatches(haystack, terms)) return;
    const subjectLabel = task.subject ? normalizeSubjectText(task.subject) : "";
    results.push({
      id: `sidebar-task-${task.id}`,
      resultType: "task",
      conversationId: task.conversationId,
      taskId: task.id,
      label,
      title: task.title,
      context: [conversation?.name, subjectLabel, formatSidebarTaskStatus(task)].filter(Boolean).join(" · "),
      snippet: cleanSubjectPlaceholderText(task.feedbackText || task.summary || task.inputSummary || "打开查看 AI 结果卡"),
      createdAt: task.updatedAt
    });
  });

  timelineRecords.forEach((record) => {
    const conversation = conversationById.get(record.conversationId);
    const haystack = [conversation?.name, record.title, record.summary, record.archiveTarget, record.profileUpdates?.map((item) => `${item.label} ${item.value}`).join(" ")].join(" ");
    if (!sidebarSearchMatches(haystack, terms)) return;
    results.push({
      id: `sidebar-timeline-${record.id}`,
      resultType: "timeline",
      conversationId: record.conversationId,
      taskId: record.sourceTaskId,
      timelineRecordId: record.id,
      label: "入档",
      title: record.title,
      context: [conversation?.name, record.archiveTarget].filter(Boolean).join(" · "),
      snippet: cleanSubjectPlaceholderText(record.summary),
      createdAt: record.createdAt
    });
  });

  messages.forEach((message) => {
    const conversation = conversationById.get(message.conversationId);
    const task = message.taskCardId ? taskById.get(message.taskCardId) : undefined;
    const attachmentText = message.attachments?.map((item) => item.fileName).join(" ") ?? "";
    const snippet = cleanSubjectPlaceholderText(message.content ?? message.fileName ?? attachmentText);
    const haystack = [conversation?.name, snippet, attachmentText, task?.title, task?.summary, task?.feedbackText].join(" ");
    if (!sidebarSearchMatches(haystack, terms)) return;
    results.push({
      id: `sidebar-message-${message.id}`,
      resultType: "message",
      conversationId: message.conversationId,
      messageId: message.id,
      taskId: message.taskCardId,
      label: message.type === "image" ? "材料" : "聊天",
      title: task?.title ?? (message.type === "image" ? "学习材料图片" : "聊天记录"),
      context: conversation ? `${conversation.name} · ${message.sender === "teacher" ? "老师输入" : message.sender === "system" ? "系统记录" : "AI 回复"}` : "聊天记录",
      snippet: snippet || "图片或任务消息",
      createdAt: message.createdAt
    });
  });

  return results
    .sort((a, b) => getSidebarSearchWeight(b) - getSidebarSearchWeight(a) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 20);
}

function sidebarSearchMatches(value: string, terms: string[]) {
  const normalized = normalizeSidebarSearch(value);
  return terms.every((term) => normalized.includes(term));
}

function normalizeSidebarSearch(value: string) {
  return value.trim().toLowerCase();
}

function getSidebarSearchWeight(item: SidebarSearchResult) {
  if (item.resultType === "conversation") return 90;
  if (item.resultType === "task") return 75;
  if (item.resultType === "timeline") return 70;
  return 55;
}

function formatSidebarSearchTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function formatSidebarTaskStatus(task: TaskCard) {
  const feedbackTask = taskHasParentFeedbackStatus(task);
  const status = task.status;
  if (status === "feedback_done") return "已反馈";
  if (status === "archived") return feedbackTask ? "已反馈" : "已入档";
  if (status === "copied") return "已复制";
  if (status === "completed") return feedbackTask ? "待反馈" : "待入档";
  if (status === "failed") return "失败";
  return "生成中";
}



function getDisplayStatusLabel(statusLabel: string) {
  if (statusLabel === "课后需反馈") return "待反馈";
  if (statusLabel === "已反馈家长") return "已反馈";
  if (statusLabel === "待标记反馈" || statusLabel === "任务分析完成") return "待入档";
  if (statusLabel === "新建档案" || statusLabel === "新建班级" || statusLabel === "已添加学生" || statusLabel === "还没有记录") return "还没有记录";
  return statusLabel;
}

function getHeaderStatusLabel(statusLabel: string, taskCards: TaskCard[], timelineRecords: TimelineRecord[]) {
  const displayStatusLabel = getDisplayStatusLabel(statusLabel);
  const hasRecordStatus = taskCards.some((task) => task.status !== "running") || timelineRecords.length > 0;
  if (!hasRecordStatus && (displayStatusLabel === "待反馈" || displayStatusLabel === "待入档" || displayStatusLabel === "还没有记录")) return "";
  return displayStatusLabel;
}

function joinHeaderParts(parts: Array<string | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(" · ");
}

function taskHasParentFeedbackStatus(task: TaskCard) {
  return (
    task.skillId === "generate_feedback" ||
    task.skillId === "parent_communication" ||
    task.skillId === "analyze_learning_evidence" ||
    task.skillId === "batch_feedback" ||
    task.taskType === "feedback" ||
    task.taskType === "learning_evidence_analysis" ||
    task.taskType === "batch_feedback"
  );
}



function buildSideChatContextOptions(conversation: Conversation, tasks: TaskCard[], timelineRecords: TimelineRecord[]): SideChatContextOption[] {
  const sortedTasks = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latestTask = sortedTasks.find((task) => task.status !== "running") ?? sortedTasks[0];
  const latestEvidenceTask = sortedTasks.find((task) => task.taskType === "learning_evidence_analysis") ?? latestTask;
  const latestTimeline = [...timelineRecords].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const monthlyMaterialCount = timelineRecords.filter((record) => record.profileUpdates?.some((update) => update.target === "monthly_report_source")).length;

  return [
    {
      id: `${conversation.id}-profile`,
      type: "student_profile",
      title: conversation.kind === "class" ? `${conversation.name} 班级资料` : `${conversation.name} 学生档案`,
      description:
        conversation.kind === "class"
          ? `${conversation.members ?? 0} 名学生 · ${normalizeSubjectText(conversation.subject)} · 可追问共性问题、分层跟进和班课安排。`
          : `${conversation.grade} · ${normalizeSubjectText(conversation.subject)} · 可追问薄弱点、家长关注点和下次跟进。`
    },
    {
      id: `${conversation.id}-grading-${latestTask?.id ?? "mock"}`,
      type: "grading",
      title: latestTask ? `最近一次处理：${getSideChatTaskLabel(latestTask)}` : "某一次批改 / 分析",
      description: shortenSideChatText(latestTask?.summary ?? latestTask?.feedbackText ?? "当前还没有明确批改记录，可先按最近课堂记录做审阅草稿。"),
      sourceId: latestTask?.id
    },
    {
      id: `${conversation.id}-monthly`,
      type: "monthly_report",
      title: conversation.kind === "class" ? "班级月报（老师视角）" : "学生月报素材",
      description:
        conversation.kind === "class"
          ? "用于老师复盘班课节奏、共性薄弱点、重点学生和下月分层安排，不作为家长群发内容。"
          : monthlyMaterialCount
            ? `${monthlyMaterialCount} 条素材已沉淀，可追问本月亮点、风险和家长可读总结。`
            : "还没有明确月报素材，可从已入档记录里先整理可复用线索。"
    },
    {
      id: `${conversation.id}-records-${latestTimeline?.id ?? "mock"}`,
      type: "conversation_records",
      title: "当前会话记录",
      description: latestTimeline ? `最近入档：${shortenSideChatText(latestTimeline.summary)}` : "围绕当前聊天流追问，适合整理遗漏信息和下一步动作。",
      sourceId: latestTimeline?.id
    },
    {
      id: `${conversation.id}-material-${latestEvidenceTask?.id ?? "mock"}`,
      type: "learning_material",
      title: latestEvidenceTask ? "最近学习材料分析" : "学习材料 / 作业图片",
      description: shortenSideChatText(latestEvidenceTask?.summary ?? "适合围绕试卷、作业、作文、笔记等材料继续追问。"),
      sourceId: latestEvidenceTask?.id
    }
  ];
}

function buildSideChatWelcome(conversation: Conversation, option: SideChatContextOption) {
  if (option.type === "student_profile") {
    return conversation.kind === "class"
      ? `已打开「${option.title}」。你可以问我这个班的共性薄弱点、待反馈学生或下次班课怎么分层。`
      : `已打开「${option.title}」。你可以问我这个学生最近的学习状态、家长关注点、薄弱点或下次课安排。`;
  }
  if (option.type === "grading") {
    return `已把侧聊上下文限定在「${option.title}」。可以继续问：这次批改最该看什么、怎么转成微信反馈、哪些内容适合入档。`;
  }
  if (option.type === "monthly_report") {
    return conversation.kind === "class"
      ? `已打开「${option.title}」。可以让我帮你复盘本月班课节奏、共性薄弱点、重点学生和下月分层安排。`
      : `已打开「${option.title}」。可以让我帮你先梳理本月亮点、问题线索和家长可读的总结方向。`;
  }
  if (option.type === "learning_material") {
    return `已打开「${option.title}」。可以继续追问材料里的核心问题、证据是否充分、下一步训练怎么排。`;
  }
  return `已打开「${option.title}」。我会只围绕当前会话记录帮你整理，不会自动入档。`;
}



function getSideChatTaskLabel(task: TaskCard) {
  if (task.taskType === "learning_evidence_analysis") return "学习材料分析";
  if (task.taskType === "feedback") return "微信反馈";
  if (task.taskType === "learning_record") return "学习记录";
  if (task.taskType === "monthly_report") return task.structuredResult?.audience === "teacher" ? "班级月报" : "月报素材";
  return task.title;
}

function shortenSideChatText(text: string, maxLength = 52) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}
