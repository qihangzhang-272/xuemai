"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { createSteps, createTaskResult, detectIntent, getTaskTitle, nowIso, uid } from "./chat-engine";
import { initialState } from "./mock-data";
import { loadStoredState, saveStoredState, storageKey } from "./storage";
import type { ActiveDrawer, Conversation, CreationMode, CreationPayload, Message, ProfileUpdateRecord, SideChatContextOption, SideChatContextType, SideChatSession, SkillAction, SmartInputAction, TaskCard, TaskStep, TaskType, TeacherProfile, TimelineRecord, UserPreferences, WorkspaceMode } from "./types";
import { archiveTaskCardCurrentOutput, editArchivedTaskCardEditableValue, editTaskCardEditableValue, getSkillCardVersionMeta, resetTaskCardEditableOutput } from "./skill-card-version";
import { applyTaskSkillRunnerAction } from "./skill-runner-adapter";
import { getLearningEvidenceReport } from "./learning-evidence-report-view";
import { buildLearningEvidenceArchiveSummary, getDefaultProfileUpdateSelection, getSelectedLearningEvidenceProfileUpdates } from "./learning-evidence-profile-updates";
import { getSkillByTriggerLabel, getSkillsForSubject } from "@/src/skills/registry";
import { mapSkillToTaskType, runMockSkill } from "@/src/skills/runner";
import { createEditableSkillCardState } from "@/src/skills/actions";
import type { SkillId, SkillSubjectType } from "@/src/skills/types";
import { cn } from "@/lib/utils";
import { getMonthlyReport, isMonthlyReportTask } from "./monthly-report-view";
import { allSubjectsLabel, cleanSubjectPlaceholderText, getSelectedSubjectTrack, getSkillSubjectLabel, getSubjectSummaryLabel, getSubjectTracks, normalizeSubjectText, splitSubjectText } from "./subject-utils";

const sideWorkspaceMinWidth = 360;
const sideWorkspaceMaxWidth = 1080;
const sideWorkspaceDefaultWidth = 560;
const maxComposerAttachments = 9;
const maxComposerFileSizeBytes = 8 * 1024 * 1024;
const allowedComposerFileTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

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
  const taskTimersRef = useRef<Record<string, number>>({});
  const finalizedTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = loadStoredState();
      const conversationsWithSubjectTracks = hydrateSeedSubjectTracks(stored.conversations);
      setConversations(conversationsWithSubjectTracks);
      setMessages(stored.messages);
      setTaskCards(stored.taskCards);
      setTimelineRecords(stored.timelineRecords);
      setPreferences(stored.preferences);
      setTeacher(stored.teacher);
      if (stored.currentConversationId && conversationsWithSubjectTracks.some((item) => item.id === stored.currentConversationId)) {
        setActiveId(stored.currentConversationId);
      }
    } catch {
      setConversations(initialState.conversations);
      setMessages(initialState.messages);
      setTaskCards(initialState.taskCards);
      setTimelineRecords(initialState.timelineRecords);
      setPreferences(initialState.preferences);
      setTeacher(initialState.teacher);
      setActiveId(initialState.currentConversationId ?? "student-wang");
    } finally {
      setHasLoadedStorage(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    saveStoredState({ conversations, messages, taskCards, timelineRecords, preferences, teacher, currentConversationId: activeId });
  }, [activeId, conversations, messages, taskCards, timelineRecords, preferences, teacher, hasLoadedStorage]);

  useEffect(() => {
    const timers = taskTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => window.clearInterval(timer));
    };
  }, []);

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
    window.setTimeout(() => setToast(""), 1600);
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
    if (!task) return;
    if (isLearningEvidenceReportTask(task)) {
      openLearningReportSideChat(task);
      return;
    }
    if (isMonthlyReportTask(task)) {
      openMonthlyReportSideChat(task);
      return;
    }
    setDetailStudentId(null);
    setMode("side-chat");
    setActiveId(task.conversationId);
    setReviewTaskId(task.id);
    setSelectedTaskId(task.id);
    setActiveDrawer(null);
    setIsContextOpen(true);
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

  function sendSideChatMessage() {
    const text = sideChatInput.trim();
    const session = activeSideChat;
    if (!text || !session) return;

    const teacherMessage = {
      id: uid("side_msg"),
      sender: "teacher" as const,
      content: text,
      createdAt: nowIso()
    };
    const assistantMessage = {
      id: uid("side_msg"),
      sender: "assistant" as const,
      content: buildSideChatMockReply(session, text),
      createdAt: nowIso()
    };

    setSideChats((items) =>
      items.map((item) =>
        item.id === session.id
          ? {
              ...item,
              messages: [...item.messages, teacherMessage, assistantMessage],
              updatedAt: assistantMessage.createdAt
            }
          : item
      )
    );
    setSideChatInput("");
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

  function completeTask(taskId: string) {
    setTaskCards((items) =>
      items.map((task) => {
        if (task.id !== taskId) return task;
        const resultPatch = task.skillId ? {} : createTaskResult(task, conversations.find((item) => item.id === task.conversationId) ?? activeConversation);
        const completedTask: TaskCard = {
          ...task,
          ...resultPatch,
          status: "completed",
          currentStepIndex: task.steps.length - 1,
          steps: task.steps.map((step): TaskStep => ({ ...step, status: "completed" })),
          updatedAt: nowIso()
        };
        window.setTimeout(() => finalizeCompletedTask(completedTask), 0);
        return completedTask;
      })
    );
  }

  function finalizeCompletedTask(completedTask: TaskCard) {
    if (finalizedTaskIdsRef.current.has(completedTask.id)) return;
    finalizedTaskIdsRef.current.add(completedTask.id);
    updateConversation(completedTask.conversationId, {
      summary: getCompletedConversationSummary(completedTask, conversations),
      statusLabel: getCompletedConversationStatusLabel(completedTask),
      attention: true,
      time: "刚刚"
    });
    showToast("任务已完成");
    if (shouldAutoArchiveLearningEvidence(completedTask, preferences.autoArchiveLearningEvidence)) {
      window.setTimeout(() => {
        archiveTaskWithProfileUpdates(completedTask, getDefaultLearningEvidenceArchiveSelection(completedTask));
      }, 120);
    }
  }

  function startTaskProgress(taskId: string, stepCount: number) {
    if (taskTimersRef.current[taskId]) window.clearInterval(taskTimersRef.current[taskId]);
    let stepIndex = 0;
    taskTimersRef.current[taskId] = window.setInterval(() => {
      stepIndex += 1;

      if (stepIndex >= stepCount) {
        window.clearInterval(taskTimersRef.current[taskId]);
        delete taskTimersRef.current[taskId];
        completeTask(taskId);
        return;
      }

      setTaskCards((items) =>
        items.map((item) =>
          item.id === taskId
            ? {
                ...item,
                currentStepIndex: stepIndex,
                steps: item.steps.map((step, index): TaskStep => ({
                  ...step,
                  status: index < stepIndex ? "completed" : index === stepIndex ? "running" : "waiting"
                })),
                updatedAt: nowIso()
              }
            : item
        )
      );
    }, 1000);
  }

  function createRunningTask(taskType: TaskType, conversation = activeConversation) {
    const createdAt = nowIso();
    const task: TaskCard = {
      id: uid("task"),
      conversationId: conversation.id,
      targetName: conversation.name,
      taskType,
      title: getTaskTitle(taskType, conversation),
      subject: getSkillSubjectLabel(conversation, subjectContextByConversationId[conversation.id]),
      status: "running",
      currentStepIndex: 0,
      steps: createSteps(taskType),
      createdAt,
      updatedAt: createdAt
    };
    const taskMessage: Message = {
      id: uid("msg"),
      conversationId: conversation.id,
      sender: "ai",
      type: "task",
      taskCardId: task.id,
      createdAt
    };

    setTaskCards((items) => [...items, task]);
    addMessage(taskMessage, `${getUserFacingTaskTitle(task)}中`);
    startTaskProgress(task.id, task.steps.length);
  }

  function createRunningSkill(skillId: SkillId, conversation = activeConversation, inputSummary?: string, subjectOverride?: string) {
    const subject = getSubjectType(conversation);
    const skillSubjectLabel = subjectOverride ?? getSkillSubjectLabel(conversation, subjectContextByConversationId[conversation.id]);
    const result = runMockSkill({
      skillId,
      subjectType: subject,
      subjectId: conversation.id,
      subjectName: conversation.name,
      subjectGrade: conversation.grade,
      subject: skillSubjectLabel,
      inputSummary
    });
    const createdAt = nowIso();
    const taskId = uid("task");
    const editableState = createEditableSkillCardState({
      skillRunId: taskId,
      displayContent: result.displayContent,
      structuredResult: result.structuredResult
    });
    const task: TaskCard = {
      id: taskId,
      conversationId: conversation.id,
      targetName: conversation.name,
      skillRunId: editableState.skill_run_id,
      skillId,
      taskType: mapSkillToTaskType(skillId),
      title: getSkillTaskTitle(skillId, conversation, result.title),
      subject: skillSubjectLabel,
      status: "running",
      currentStepIndex: 0,
      steps: result.steps.map((label, index) => ({ label, status: index === 0 ? "running" : "waiting" })),
      inputSummary: result.inputSummary,
      contextSources: result.contextSources,
      confidenceLevel: result.confidenceLevel,
      structuredResult: result.structuredResult,
      archiveTarget: getSkillArchiveTarget(skillId, conversation, result.archiveTarget),
      actions: result.actions,
      nextSuggestions: result.nextSuggestions,
      originalOutput: editableState.original_output,
      currentOutput: editableState.current_output,
      editEvents: editableState.edit_events,
      summary: result.displayContent,
      feedbackText: typeof result.structuredResult.parent_message === "string" ? result.structuredResult.parent_message : result.displayContent,
      detail: JSON.stringify(result.structuredResult, null, 2),
      createdAt,
      updatedAt: createdAt
    };
    const taskMessage: Message = {
      id: uid("msg"),
      conversationId: conversation.id,
      sender: "ai",
      type: "task",
      taskCardId: task.id,
      createdAt
    };

    setTaskCards((items) => [...items, task]);
    addMessage(taskMessage, `${result.title}中`);
    startTaskProgress(task.id, task.steps.length);
  }

  function handleUserMessage(text: string, conversation = activeConversation) {
    if (conversation.kind === "assistant") {
      addAiText(conversation, buildAutomationAssistantReply(text, taskCards, conversations));
      return;
    }

    const intent = detectIntent(text);

    if (intent === "normal_chat") {
      addAiText(conversation, "我已收到你的要求。你可以继续补充学生情况，或上传试卷让我生成分析卡片。");
      return;
    }

    createRunningSkill(intentToSkillId(intent, conversation), conversation, text);
  }

  function handleSendMessage() {
    const text = input.trim();
    const attachments = composerAttachments;
    if (!text && attachments.length === 0) return;
    const conversation = activeConversation;
    const selectedSkillId = activeSkillId;
    if (attachments.length > 0) {
      addMessage(
        {
          id: uid("msg"),
          conversationId: conversation.id,
          sender: "teacher",
          type: "image",
          content: text || undefined,
          attachments,
          imageUrl: attachments[0]?.imageUrl,
          fileName: attachments[0]?.fileName,
          createdAt: nowIso()
        },
        text || `${attachments.length} 张学习材料图片`
      );
    } else {
      addMessage(
        {
          id: uid("msg"),
          conversationId: conversation.id,
          sender: "teacher",
          type: "text",
          content: text,
          createdAt: nowIso()
        },
        text
      );
    }
    setInput("");
    setComposerAttachments([]);

    if (conversation.kind === "assistant") {
      addAiText(conversation, buildAutomationAssistantReply(text || `${attachments.length} 张材料`, taskCards, conversations));
      return;
    }

    if (attachments.length > 0) {
      const inputSummary = text || "上传学习材料图片";
      if (selectedSkillId) {
        createRunningSkill(selectedSkillId, conversation, inputSummary);
        setActiveSkillId(null);
        return;
      }
      if (preferences.autoAnalyzeUploadedPaper) {
        createRunningSkill("analyze_learning_evidence", conversation, inputSummary);
      } else {
        setPendingUploadConversationId(conversation.id);
      }
      return;
    }

    if (selectedSkillId) {
      createRunningSkill(selectedSkillId, conversation, text);
      setActiveSkillId(null);
      return;
    }
    handleUserMessage(text, conversation);
  }

  function handleUpload(file?: File) {
    if (!file) return;
    if (!allowedComposerFileTypes.has(file.type)) {
      showToast("只支持 PNG、JPG 或 WebP 图片");
      return;
    }
    if (file.size > maxComposerFileSizeBytes) {
      showToast("单张图片不能超过 8 MB");
      return;
    }
    if (composerAttachments.length >= maxComposerAttachments) {
      showToast("一次最多添加 9 张图片");
      return;
    }
    setPendingUploadConversationId(null);
    const reader = new FileReader();
    reader.onload = () => {
      setComposerAttachments((items) => [
        ...items,
        {
          id: uid("attachment"),
          fileName: file.name,
          imageUrl: typeof reader.result === "string" ? reader.result : undefined
        }
      ]);
    };
    reader.onerror = () => showToast("图片读取失败，请重新选择");
    reader.readAsDataURL(file);
  }

  function startPendingUploadTask(remember = false) {
    const conversation = conversations.find((item) => item.id === pendingUploadConversationId) ?? activeConversation;
    if (remember) setPreferences((value) => ({ ...value, autoAnalyzeUploadedPaper: true }));
    setPendingUploadConversationId(null);
    createRunningSkill("analyze_learning_evidence", conversation, "上传学习材料图片");
  }

  async function copyFeedback(task: TaskCard) {
    const transition = applyTaskSkillRunnerAction(task, "copy_feedback");
    if (!transition.ok) {
      showToast(transition.message ?? "请等待草稿生成后再复制");
      return;
    }

    try {
      await navigator.clipboard.writeText(getSkillCardVersionMeta(task).currentText || task.feedbackText || "");
      showToast("已复制微信反馈");
    } catch {
      showToast("当前浏览器不允许自动复制，请手动复制后继续标记");
    }
    setTaskCards((items) => items.map((item) => (item.id === task.id ? transition.task : item)));
  }

  function markFeedback(task: TaskCard) {
    const transition = applyTaskSkillRunnerAction(task, "mark_parent_sent");
    if (!transition.ok) {
      showToast(transition.message ?? "请先复制微信反馈");
      return;
    }

    setTaskCards((items) => items.map((item) => (item.id === task.id ? transition.task : item)));
    updateConversation(task.conversationId, {
      summary: "已反馈",
      statusLabel: "已反馈",
      attention: false,
      time: "刚刚"
    });
    showToast("已标记为反馈完成");
  }

  function archiveTask(task: TaskCard) {
    archiveTaskWithProfileUpdates(task, []);
  }

function archiveTaskWithProfileUpdates(task: TaskCard, selectedProfileUpdateIds: string[]) {
    const conversation = conversations.find((item) => item.id === task.conversationId) ?? activeConversation;
    const learningEvidenceArchive = task.skillId === "analyze_learning_evidence" || task.taskType === "learning_evidence_analysis";
    const feedbackArchive = task.skillId === "generate_feedback" || task.skillId === "parent_communication" || task.taskType === "feedback";
    const transition = applyTaskSkillRunnerAction(task, "archive");
    if (!transition.ok) {
      showToast(transition.message ?? (learningEvidenceArchive ? "请等待分析完成后再确认入档" : "请等待草稿生成后再确认入档"));
      return;
    }

    const archivedAt = transition.task.updatedAt;
    const report = getLearningEvidenceReport(transition.task);
    const profileUpdates = report
      ? getSelectedLearningEvidenceProfileUpdates({
          report,
          selectedIds: selectedProfileUpdateIds,
          sourceTaskId: task.id,
          confirmedAt: archivedAt
        })
      : [];
    const taskForArchive = report ? attachProfileUpdatesToTask(transition.task, selectedProfileUpdateIds, profileUpdates) : transition.task;
    const archivedTask: TaskCard = {
      ...archiveTaskCardCurrentOutput(taskForArchive),
      status: "archived",
      updatedAt: archivedAt
    };
    const archivedSummary = report
      ? buildLearningEvidenceArchiveSummary(report, profileUpdates)
      : archivedTask.archivedOutput?.display_content ?? archivedTask.currentOutput?.display_content ?? archivedTask.summary ?? archivedTask.feedbackText ?? archivedTask.detail ?? "已确认入档";

    setTaskCards((items) => items.map((item) => (item.id === task.id ? archivedTask : item)));
    setTimelineRecords((items) => [
      ...items,
      {
        id: uid("timeline"),
        conversationId: task.conversationId,
        sourceTaskId: task.id,
        skillId: task.skillId,
        title: getUserFacingTaskTitle(task),
        summary: archivedSummary,
        archiveTarget: task.archiveTarget ?? (conversation.kind === "class" ? "班级档案 > 班课记录" : "学生档案 > 学习记录"),
        profileUpdates,
        createdAt: archivedAt
      }
    ]);
    updateConversation(task.conversationId, {
      summary: feedbackArchive ? "已反馈" : learningEvidenceArchive ? "学习材料分析已入档" : "已确认入档",
      statusLabel: feedbackArchive ? "已反馈" : "已入档",
      attention: false,
      time: "刚刚"
    });
    showToast(
      learningEvidenceArchive
        ? profileUpdates.length
          ? `已入档，并写入 ${profileUpdates.length} 项学生档案`
          : "已确认报告入档"
        : profileUpdates.length
          ? `已入档，并写入 ${profileUpdates.length} 项学生档案`
          : "已确认入档"
    );
  }

  function regenerateTask(task: TaskCard) {
    const conversation = conversations.find((item) => item.id === task.conversationId) ?? activeConversation;
    if (task.skillId) {
      createRunningSkill(task.skillId, conversation, task.inputSummary, task.subject);
      return;
    }
    createRunningTask(task.taskType, conversation);
  }

  function reviseTask(task: TaskCard, mode: "warmer" | "shorter") {
    const action: SkillAction = mode === "warmer" ? "make_warmer" : "make_shorter";
    const transition = applyTaskSkillRunnerAction(task, action);
    if (!transition.ok) {
      showToast(transition.message ?? "请等待草稿生成后再调整表达");
      return;
    }

    setTaskCards((items) =>
      items.map((item) => {
        if (item.id !== task.id) return item;
        const currentText = getSkillCardVersionMeta(item).currentText || item.feedbackText || item.summary || "";
        const suffix = mode === "warmer" ? "我会继续帮他把方法练稳，整体不用着急。" : "后续重点练习条件提取和分步表达。";
        const revisedText = mode === "warmer" ? `${currentText}${suffix}` : suffix;
        const nextTask = editTaskCardEditableValue(item, revisedText, {
          eventId: uid("edit"),
          editedAt: nowIso()
        });
        return {
          ...nextTask,
          actionEvents: transition.task.actionEvents,
          summary: mode === "warmer" ? "已调整为更温和的家长沟通表达。" : "已压缩为更简洁的微信反馈版本。",
          status: transition.task.status,
          updatedAt: nowIso()
        };
      })
    );
    showToast(mode === "warmer" ? "已改得更温和" : "已改得更简洁");
  }

  function handleSkillEdit(task: TaskCard, value: string) {
    if (task.status === "archived") {
      const editedAt = nowIso();
      const updatedTask = {
        ...editArchivedTaskCardEditableValue(task, value, {
          eventId: uid("edit"),
          editedAt
        }),
        status: "archived" as const,
        updatedAt: editedAt
      };
      const updatedSummary = updatedTask.archivedOutput?.display_content ?? updatedTask.currentOutput?.display_content ?? updatedTask.summary ?? value;

      setTaskCards((items) => items.map((item) => (item.id === task.id ? updatedTask : item)));
      setTimelineRecords((items) => items.map((item) => (item.sourceTaskId === task.id ? { ...item, summary: updatedSummary } : item)));
      showToast("已更新入档内容");
      return;
    }

    setTaskCards((items) =>
      items.map((item) =>
        item.id === task.id
          ? {
              ...editTaskCardEditableValue(item, value, {
                eventId: uid("edit"),
                editedAt: nowIso()
              }),
              status: item.status === "running" ? item.status : "completed",
              updatedAt: nowIso()
            }
          : item
      )
    );
    showToast("已保存当前编辑版");
  }

  function handleSkillReset(task: TaskCard) {
    if (task.status === "archived") {
      showToast("已入档卡片不能重置，请重新生成新草稿");
      return;
    }

    setTaskCards((items) =>
      items.map((item) =>
        item.id === task.id
          ? {
              ...resetTaskCardEditableOutput(item, {
                eventId: uid("edit"),
                editedAt: nowIso()
              }),
              status: item.status === "running" ? item.status : "completed",
              updatedAt: nowIso()
            }
          : item
      )
    );
    showToast("已重置为 AI 原稿");
  }

  function openSkillReview(task: TaskCard) {
    if (isLearningEvidenceReportTask(task)) {
      openLearningReportSideChat(task);
      return;
    }
    if (isMonthlyReportTask(task)) {
      openMonthlyReportSideChat(task);
      return;
    }
    setReviewTaskId(task.id);
    setSelectedTaskId(task.id);
    setActiveDrawer(null);
    setMode("side-chat");
  }

  function openLearningReportSideChat(task: TaskCard) {
    const conversation = conversations.find((item) => item.id === task.conversationId) ?? activeConversation;
    const option = buildLearningReportSideChatOption(conversation, task);
    const existingSession = sideChats.find((session) => session.conversationId === conversation.id && session.contextType === "learning_material" && session.sourceId === task.id);

    setActiveId(conversation.id);
    setReviewTaskId(null);
    setSelectedTaskId(task.id);
    setActiveDrawer(null);
    setDetailStudentId(null);
    setMode("side-chat");
    setSideChatInput("");

    if (existingSession) {
      setActiveSideChatId(existingSession.id);
      return;
    }

    createSideChatSessionForConversation(conversation, option);
  }

  function openMonthlyReportSideChat(task: TaskCard) {
    const conversation = conversations.find((item) => item.id === task.conversationId) ?? activeConversation;
    const option = buildMonthlyReportSideChatOption(conversation, task);
    const existingSession = sideChats.find((session) => session.conversationId === conversation.id && session.contextType === "monthly_report" && session.sourceId === task.id);

    setActiveId(conversation.id);
    setReviewTaskId(null);
    setSelectedTaskId(task.id);
    setActiveDrawer(null);
    setDetailStudentId(null);
    setMode("side-chat");
    setSideChatInput("");

    if (existingSession) {
      setActiveSideChatId(existingSession.id);
      return;
    }

    createSideChatSessionForConversation(conversation, option);
  }

  function handleSkillAction(task: TaskCard, action: SkillAction) {
    if (action === "copy_feedback") return void copyFeedback(task);
    if (action === "make_warmer") return reviseTask(task, "warmer");
    if (action === "make_shorter") return reviseTask(task, "shorter");
    if (action === "mark_parent_sent") return markFeedback(task);
    if (action === "archive") return archiveTask(task);
    if (action === "regenerate") return regenerateTask(task);
    if (action === "generate_feedback") {
      const conversation = conversations.find((item) => item.id === task.conversationId) ?? activeConversation;
      const transition = recordSkillActionEvent(task, action);
      if (!transition.ok) return;
      createRunningSkill("generate_feedback", conversation, task.summary, task.subject);
      return;
    }
    if (action === "update_learning_record") {
      const conversation = conversations.find((item) => item.id === task.conversationId) ?? activeConversation;
      const transition = recordSkillActionEvent(task, action);
      if (!transition.ok) return;
      createRunningSkill("update_learning_record", conversation, task.summary, task.subject);
      return;
    }
    if (action === "generate_next_lesson") {
      const conversation = conversations.find((item) => item.id === task.conversationId) ?? activeConversation;
      const transition = recordSkillActionEvent(task, action);
      if (!transition.ok) return;
      createRunningSkill("next_lesson_plan", conversation, task.summary, task.subject);
      return;
    }
    if (action === "update_weakness") {
      recordSkillActionEvent(task, action, "已更新薄弱点草稿");
      return;
    }
    if (action === "generate_practice") {
      recordSkillActionEvent(task, action, "已生成针对练习入口");
      return;
    }
    if (action === "add_report_material" || action === "add_monthly_material") {
      recordSkillActionEvent(task, action, "已加入月报素材");
      return;
    }
    if (action === "save_note") {
      recordSkillActionEvent(task, action, "已记录为普通备注");
    }
  }

  function recordSkillActionEvent(task: TaskCard, action: SkillAction, successToast?: string) {
    const transition = applyTaskSkillRunnerAction(task, action);
    if (!transition.ok) {
      showToast(transition.message ?? "当前状态不能执行这个操作");
      return transition;
    }

    setTaskCards((items) => items.map((item) => (item.id === task.id ? transition.task : item)));
    if (successToast) showToast(successToast);
    return transition;
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
    const text = input.trim();
    if (!text) return;
    const conversation = activeConversation;
    addMessage(
      {
        id: uid("msg"),
        conversationId: conversation.id,
        sender: "teacher",
        type: "text",
        content: text,
        createdAt: nowIso()
      },
      text
    );
    setInput("");

    if (action === "generate_feedback") {
      createRunningSkill("generate_feedback", conversation, text);
      return;
    }
    if (action === "save_learning_record") {
      createRunningSkill("update_learning_record", conversation, text);
      return;
    }
    addAiText(conversation, "已作为普通备注保存在当前会话，不进入长期档案。");
  }

  function handleCreate(kind: Exclude<CreationMode, null>, payload: CreationPayload) {
    const name = payload.name.trim() || (kind === "student" ? "新学生" : "新班级");
    const createdAt = nowIso();
    const selectedClass =
      kind === "student" && payload.className
        ? conversations.find((item) => item.kind === "class" && item.name === payload.className)
        : undefined;
    const resolvedPayload =
      kind === "student"
        ? {
            ...payload,
            grade: payload.grade.trim() || selectedClass?.grade || "",
            subject: normalizeSubjectText(payload.subject.trim() || selectedClass?.subject || "")
          }
        : payload;
    const createSummary = kind === "student" ? buildStudentCreateSummary(resolvedPayload) : buildClassCreateSummary(resolvedPayload);
    const next: Conversation =
      kind === "student"
        ? {
            id: uid("student"),
            kind: "student",
            name,
            avatar: name.slice(0, 1),
            className: resolvedPayload.className?.trim() || "未分班",
            subject: normalizeSubjectText(resolvedPayload.subject),
            subjectTracks: splitSubjectText(normalizeSubjectText(resolvedPayload.subject)),
            grade: resolvedPayload.grade.trim() || "未选年级",
            summary: createSummary,
            time: "刚刚",
            statusLabel: "还没有记录",
            accent: "green"
          }
        : {
            id: uid("class"),
            kind: "class",
            name,
            avatar: "群",
            className: "0 名学生",
            subject: normalizeSubjectText(resolvedPayload.subject),
            grade: resolvedPayload.grade.trim() || "未选年级",
            summary: createSummary,
            time: "刚刚",
            statusLabel: "还没有记录",
            accent: "green",
            members: 0
          };

    setConversations((items) => {
      if (kind !== "student" || !next.className) return [next, ...items];
      return [
        next,
        ...items.map((item) => {
          if (item.kind !== "class" || item.name !== next.className) return item;
          const members = (item.members ?? 0) + 1;
          return { ...item, members, className: `${members} 名学生`, statusLabel: "还没有记录" };
        })
      ];
    });
    setMessages((items) => [
      ...items,
      {
        id: uid(kind === "student" ? "student_profile_created" : "class_created"),
        conversationId: next.id,
        sender: "system",
        type: "text",
        content:
          kind === "student"
            ? buildStudentCreateMessage(name, resolvedPayload)
            : buildClassCreateMessage(name, resolvedPayload),
        createdAt
      }
    ]);
    selectConversation(next.id);
    setCreationMode(null);
    showToast(kind === "student" ? "学生聊天已创建" : "班级群聊已创建");
  }

  function handleAddStudentToClass(classId: string, studentName: string) {
    const classConversation = conversations.find((item) => item.id === classId && item.kind === "class");
    const name = studentName.trim();
    if (!classConversation || !name) return;

    if (conversations.some((item) => item.kind === "student" && item.className === classConversation.name && item.name === name)) {
      showToast("这个学生已经在当前班级");
      return;
    }

    const newStudent: Conversation = {
      id: uid("student"),
      kind: "student",
      name,
      avatar: name.slice(0, 1),
      className: classConversation.name,
      subject: classConversation.subject,
      subjectTracks: splitSubjectText(classConversation.subject),
      grade: classConversation.grade,
      summary: "还没有记录",
      time: "",
      statusLabel: "还没有记录",
      accent: "green"
    };

    setConversations((items) => {
      const nextMemberCount = items.filter((item) => item.kind === "student" && item.className === classConversation.name).length + 1;
      return [
        newStudent,
        ...items.map((item) =>
          item.id === classConversation.id
            ? {
                ...item,
                className: `${nextMemberCount} 名学生`,
                members: nextMemberCount,
                statusLabel: "还没有记录",
                summary: `${name} 已加入班级`,
                time: "刚刚"
              }
            : item
        )
      ];
    });
    showToast(`${name} 已加入 ${classConversation.name}`);
  }

  function handleEditProfileRequest(conversation: Conversation) {
    if (conversation.kind === "assistant") return;
    setActiveDrawer(null);
    setDetailStudentId(null);
    setEditingConversationId(conversation.id);
    setCreationMode(conversation.kind);
  }

  function handleUpdateProfile(conversation: Conversation, payload: CreationPayload) {
    const selectedClass =
      conversation.kind === "student" && payload.className
        ? conversations.find((item) => item.kind === "class" && item.name === payload.className)
        : undefined;
    const resolvedPayload =
      conversation.kind === "student"
        ? {
            ...payload,
            grade: payload.grade.trim() || selectedClass?.grade || conversation.grade,
            subject: normalizeSubjectText(payload.subject.trim() || selectedClass?.subject || conversation.subject)
          }
        : payload;
    const nextName = resolvedPayload.name.trim() || conversation.name;
    const nextGrade = resolvedPayload.grade.trim() || conversation.grade;
    const nextSubject = normalizeSubjectText(resolvedPayload.subject, conversation.subject);
    const nextClassName = resolvedPayload.className?.trim() || conversation.className;

    setConversations((items) =>
      items.map((item) => {
        if (item.id === conversation.id) {
          return {
            ...item,
            name: nextName,
            avatar: conversation.kind === "student" ? nextName.slice(0, 1) : item.avatar,
            grade: nextGrade,
            subject: nextSubject,
            subjectTracks: conversation.kind === "student" ? splitSubjectText(nextSubject) : item.subjectTracks,
            className: conversation.kind === "student" ? nextClassName : item.className,
            summary: conversation.kind === "student" ? buildStudentCreateSummary(resolvedPayload) : buildClassCreateSummary(resolvedPayload),
            time: "刚刚"
          };
        }

        if (conversation.kind === "class" && item.kind === "student" && item.className === conversation.name) {
          return { ...item, className: nextName };
        }

        return item;
      })
    );
    setCreationMode(null);
    setEditingConversationId(null);
    showToast(conversation.kind === "class" ? "班级资料已更新" : "学生档案已更新");
  }

  function handleClearLocalData() {
    window.localStorage.removeItem(storageKey);
    Object.values(taskTimersRef.current).forEach((timer) => window.clearInterval(timer));
    taskTimersRef.current = {};
    setConversations(initialState.conversations);
    setMessages(initialState.messages);
    setTaskCards(initialState.taskCards);
    setTimelineRecords(initialState.timelineRecords);
    setPreferences(initialState.preferences);
    setTeacher(null);
    setActiveId(initialState.currentConversationId ?? "student-wang");
    setMode("chat");
    setDetailStudentId(null);
    setSideChats([]);
    setActiveSideChatId(null);
    showToast("本地数据已清空");
  }

  function handleLogout() {
    setTeacher(null);
    setMode("chat");
    showToast("已退出登录");
  }

  function handleLogin(profile: TeacherProfile) {
    setTeacher(profile);
    showToast("欢迎回来");
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
            {pendingUploadConversationId === activeConversation.id ? <ConfirmTaskCard onCancel={() => setPendingUploadConversationId(null)} onStart={() => startPendingUploadTask(false)} onRemember={() => startPendingUploadTask(true)} /> : null}
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
      onAutoArchiveLearningEvidenceChange={(enabled) => setPreferences((value) => ({ ...value, autoArchiveLearningEvidence: enabled }))}
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
      onAutoArchiveLearningEvidenceChange={(enabled) => setPreferences((value) => ({ ...value, autoArchiveLearningEvidence: enabled }))}
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
              accept="image/png,image/jpeg,image/webp"
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
                showToast("已定位到对应聊天");
              }}
            />
          ) : mode === "settings" ? (
            <SettingsPanel
              preferences={preferences}
              onChange={setPreferences}
              onClearData={handleClearLocalData}
              onLogout={handleLogout}
              teacherName={teacher.nickname}
              teacherProfile={teacher}
              conversations={conversations}
              taskCards={taskCards}
            />
          ) : (
            <div className={`flex min-h-0 flex-1 ${mode === "side-chat" && !isAutomationAssistant ? "flex-row" : "flex-col"}`}>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">{chatPane}</div>
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
                    className="group relative z-10 flex w-2 shrink-0 cursor-col-resize items-stretch justify-center outline-none"
                  >
                    <span className="my-3 w-px rounded-full bg-[#dfe5e1] transition group-hover:bg-[#22c55e] group-focus-visible:bg-[#22c55e]" />
                  </div>
                  <aside className="flex min-h-0 shrink-0 bg-[#f7f8f7]" style={{ width: sideWorkspaceWidth }}>
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
            onAutoArchiveLearningEvidenceChange={(enabled) => setPreferences((value) => ({ ...value, autoArchiveLearningEvidence: enabled }))}
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

function hydrateSeedSubjectTracks(conversations: Conversation[]) {
  return conversations.map((conversation) => {
    if (conversation.kind !== "student" || conversation.subjectTracks?.length) return conversation;
    const seedConversation = initialState.conversations.find((item) => item.id === conversation.id && item.kind === "student");
    if (!seedConversation?.subjectTracks?.length) return conversation;
    return {
      ...conversation,
      subject: seedConversation.subject,
      subjectTracks: seedConversation.subjectTracks
    };
  });
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

function buildAutomationAssistantReply(text: string, taskCards: TaskCard[], conversations: Conversation[]) {
  const pendingTasks = taskCards.filter((task) => task.status !== "archived" && task.status !== "failed");
  const pendingStudents = conversations.filter((conversation) => conversation.kind === "student" && conversation.attention);
  const waitingArchiveCount = taskCards.filter((task) => task.status === "completed" || task.status === "copied" || task.status === "feedback_done").length;

  if (text.includes("周") || text.includes("回顾")) {
    return `我按“本周服务回顾”来整理：当前有 ${pendingTasks.length} 张未完全闭环的卡片，${pendingStudents.length} 个学生带关注标记，${waitingArchiveCount} 条结果适合优先确认入档。建议先处理已生成但未入档的反馈，再补齐月报素材。`;
  }
  if (text.includes("监控") || text.includes("遗漏") || text.includes("续费")) {
    return `我先做一版服务监控：重点看三类风险，未确认入档、未反馈家长、月报素材不足。当前 mock 数据里最该先看的，是带关注标记的学生和已完成但未入档的 AI 结果卡。`;
  }
  if (text.includes("月报")) {
    return `月报相关建议：先从已入档记录里筛选“进步证据、薄弱点证据、下月计划”三类素材。没有老师确认的 AI 草稿不要直接进入月报。`;
  }

  return `我先按“今日简报”处理：当前有 ${pendingStudents.length} 个学生需要关注，${waitingArchiveCount} 条卡片结果可检查是否入档。建议今天先做三件事：确认已完成卡片、补齐家长反馈、把可复用内容加入月报素材。`;
}

function shouldAutoArchiveLearningEvidence(task: TaskCard, enabled: boolean) {
  if (!enabled) return false;
  return task.status === "completed" && (task.skillId === "analyze_learning_evidence" || task.taskType === "learning_evidence_analysis") && Boolean(getLearningEvidenceReport(task));
}

function getDefaultLearningEvidenceArchiveSelection(task: TaskCard) {
  const report = getLearningEvidenceReport(task);
  return report ? getDefaultProfileUpdateSelection(report) : [];
}

function getCompletedConversationSummary(task: TaskCard, conversations: Conversation[]) {
  const conversation = conversations.find((item) => item.id === task.conversationId);
  const subjectPrefix = task.subject ? `${task.subject} · ` : "";

  if (task.skillId === "monthly_report" && conversation?.kind === "class") return "班级月报已生成";
  if (task.taskType === "monthly_report") return `${subjectPrefix}月报草稿已生成`;
  if (task.taskType === "learning_record") return `${subjectPrefix}学习记录待入档`;
  if (task.taskType === "feedback") return `${subjectPrefix}家长反馈待发送`;
  if (task.taskType === "learning_evidence_analysis") return `${subjectPrefix}学情分析待反馈`;
  if (task.taskType === "lesson_suggestion") return `${subjectPrefix}下次课建议待查看`;
  if (task.taskType === "batch_feedback") return "批量反馈待发送";
  if (task.taskType === "class_analysis") return "班级分析完成";
  return "结果待查看";
}

function getSkillTaskTitle(skillId: SkillId, conversation: Conversation, fallback: string) {
  if (skillId === "monthly_report" && conversation.kind === "class") return "班级月报";
  return fallback;
}

function getSkillDisplayLabel(skill: { id: SkillId; label: string }, conversation: Conversation) {
  if (skill.id === "monthly_report" && conversation.kind === "class") return "班级月报";
  return skill.label;
}

function getSkillArchiveTarget(skillId: SkillId, conversation: Conversation, fallback?: string) {
  if (skillId === "monthly_report") {
    return conversation.kind === "class" ? "老师工作台 > 班级月报" : "学生档案 > 月报";
  }
  if (skillId === "analyze_learning_evidence") return "学生档案 > 学习材料分析";
  return fallback;
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

function attachProfileUpdatesToTask(task: TaskCard, selectedProfileUpdateIds: string[], profileUpdates: ProfileUpdateRecord[]): TaskCard {
  const currentOutput = task.currentOutput ?? {
    display_content: task.summary ?? task.feedbackText ?? task.detail ?? "",
    structured_result: task.structuredResult ?? {}
  };
  const structuredResult = {
    ...currentOutput.structured_result,
    profile_update_selection: selectedProfileUpdateIds,
    confirmed_profile_updates: profileUpdates
  };

  return {
    ...task,
    currentOutput: {
      ...currentOutput,
      structured_result: structuredResult
    },
    structuredResult,
    detail: JSON.stringify(structuredResult, null, 2),
    actionEvents: (task.actionEvents ?? []).map((event, index, events) => {
      if (index !== events.length - 1 || event.action !== "archive") return event;
      return {
        ...event,
        message: profileUpdates.length ? `老师确认学习材料分析入档，并写入 ${profileUpdates.length} 项学生档案建议。` : "老师确认报告入档，未写入新的学生档案建议。",
        metadata: {
          ...event.metadata,
          profile_update_count: profileUpdates.length,
          profile_update_targets: profileUpdates.map((item) => item.target)
        }
      };
    })
  };
}

function toCreationPayload(conversation: Conversation): Partial<CreationPayload> {
  return {
    name: conversation.name,
    grade: conversation.grade,
    subject: conversation.subject,
    className: conversation.kind === "student" ? conversation.className : "",
    learningGoal: conversation.kind === "student" ? extractLearningGoal(conversation.summary) : "",
    needsFeedback: conversation.statusLabel.includes("反馈"),
    repeatSchedule: true
  };
}

function extractLearningGoal(summary: string) {
  const normalized = summary.trim();
  if (!normalized.startsWith("学习目标：")) return "";
  return normalized.replace(/^学习目标：/u, "").split(" · ")[0]?.trim() ?? "";
}

function buildStudentCreateSummary(payload: CreationPayload) {
  const goal = payload.learningGoal?.trim();
  const schedule = buildStudentScheduleText(payload);
  if (goal && schedule) return `学习目标：${goal} · ${schedule}`;
  if (goal) return `学习目标：${goal}`;
  if (schedule) return schedule;
  return "新建档案，等待课堂记录和学习材料补充。";
}

function buildStudentCreateMessage(name: string, payload: CreationPayload) {
  const basic = `${name} · ${payload.grade || "未选年级"} · ${payload.subject || "未选科目"}${payload.className ? ` · ${payload.className}` : ""}`;
  const goal = payload.learningGoal?.trim() ? `学习目标：${payload.learningGoal.trim()}。` : "学习目标稍后补充。";
  const schedule = buildStudentScheduleText(payload) || "固定上课时间稍后设置";
  const feedbackRule = payload.needsFeedback
    ? `课后反馈规则：${payload.feedbackTrigger || "下课后自动生成"}，截止 ${payload.feedbackDeadline || "当天 22:00 前"}，提醒方式弹窗通知。`
    : "课后反馈规则稍后设置，暂不自动生成待反馈任务。";

  return `已完成学生建档：${basic}。\n${goal}\n上课节奏：${schedule}。\n${feedbackRule}\n后续课堂记录、学习材料分析和微信反馈会沉淀到这个学生档案，正式入档仍需要老师确认。`;
}

function buildClassCreateSummary(payload: CreationPayload) {
  const schedule = buildStudentScheduleText(payload);
  const classType = payload.classType?.trim();
  if (schedule && classType) return `${classType} · ${schedule}`;
  if (schedule) return schedule;
  return "新建班级，等待班课记录和学生加入。";
}

function buildClassCreateMessage(name: string, payload: CreationPayload) {
  const basic = `${name} · ${payload.grade || "未选年级"} · ${payload.subject || "未选科目"} · ${payload.classType || "未选班型"}`;
  const schedule = buildStudentScheduleText(payload) || "固定上课时间稍后设置";
  const feedbackRule = payload.needsFeedback
    ? `课后反馈规则：${payload.feedbackTrigger || "下课后立即"}，截止 ${payload.feedbackDeadline || "下次课前 24H"}，提醒方式弹窗通知。`
    : "课后反馈规则稍后设置，暂不自动生成班级待反馈任务。";

  return `已创建班级群聊：${basic}。\n上课节奏：${schedule}。\n${feedbackRule}\n后续可在这里记录班课、批量反馈、共性薄弱点和班级月报素材；正式入档仍需要老师确认。`;
}

function buildStudentScheduleText(payload: CreationPayload) {
  const days = splitCreationCourseDays(payload.courseDay)
    .map((day) => `周${day}`)
    .join("、");
  const frequency = payload.frequency?.trim();
  const courseTime = payload.courseTime?.trim();
  const duration = payload.duration?.trim();
  const totalLessons = payload.totalLessons?.trim();
  const repeat = payload.repeatSchedule === false ? "不重复" : "重复";
  const scheduleParts = [
    frequency,
    days,
    courseTime,
    duration ? `${duration} 分钟` : ""
  ].filter(Boolean);

  if (!scheduleParts.length) return totalLessons ? `${totalLessons} 课时` : "";

  const parts = [...scheduleParts, totalLessons ? `${totalLessons} 课时` : "", repeat].filter(Boolean);
  return parts.join(" · ");
}

function splitCreationCourseDays(value?: string) {
  if (!value) return [];
  return value
    .replace(/周/g, "")
    .split(/[、,，\s]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLearningEvidenceReportTask(task: TaskCard) {
  return (task.skillId === "analyze_learning_evidence" || task.taskType === "learning_evidence_analysis") && Boolean(getLearningEvidenceReport(task));
}

function buildLearningReportSideChatOption(conversation: Conversation, task: TaskCard): SideChatContextOption {
  const title = conversation.kind === "class" ? `${conversation.name} 学习材料报告` : `${conversation.name} 学情报告`;
  return {
    id: `${conversation.id}-material-${task.id}`,
    type: "learning_material",
    title,
    description: shortenSideChatText(task.summary ?? task.feedbackText ?? task.inputSummary ?? "查看本次学习材料分析报告。"),
    sourceId: task.id
  };
}

function buildMonthlyReportSideChatOption(conversation: Conversation, task: TaskCard): SideChatContextOption {
  const report = getMonthlyReport(task);
  const title = report?.report_type === "class" || conversation.kind === "class" ? `${conversation.name} 班级月报` : `${conversation.name} 学生月报`;
  return {
    id: `${conversation.id}-monthly-${task.id}`,
    type: "monthly_report",
    title,
    description: shortenSideChatText(task.summary ?? task.feedbackText ?? task.inputSummary ?? "查看本月月报草稿。"),
    sourceId: task.id
  };
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

function getCompletedConversationStatusLabel(task: TaskCard) {
  return taskHasParentFeedbackStatus(task) ? "待反馈" : "待入档";
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

function getUserFacingTaskTitle(task: Pick<TaskCard, "skillId" | "taskType" | "title" | "structuredResult">) {
  if (task.skillId === "generate_feedback" || task.skillId === "parent_communication" || task.taskType === "feedback") return "微信反馈";
  if (task.skillId === "update_learning_record" || task.taskType === "learning_record") return "学习记录";
  if (task.skillId === "analyze_learning_evidence" || task.taskType === "learning_evidence_analysis") return "学情报告";
  if (task.skillId === "monthly_report" || task.taskType === "monthly_report") return task.structuredResult?.audience === "teacher" ? "班级月报" : "学生月报";
  return task.title.replace(/^生成/u, "");
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

function buildSideChatMockReply(session: SideChatSession, text: string) {
  const context = `「${session.contextLabel}」`;
  if (text.includes("微信") || text.includes("家长") || text.includes("反馈")) {
    return `基于${context}，建议反馈只保留三点：先肯定当前状态，再说明一个可训练问题，最后给出下次课动作。正式发送前仍建议回到主聊天生成微信反馈 AI 结果卡。`;
  }
  if (text.includes("入档") || text.includes("档案")) {
    return `${context}里可以入档的是可复用事实，例如已确认的薄弱点、复发风险和下一步训练安排。侧聊里的判断只是草稿，不能直接成为长期档案。`;
  }
  if (text.includes("月报")) {
    if (session.contextLabel.includes("班级")) {
      return `从${context}看，班级月报应该先服务老师决策：本月班课节奏、共性薄弱点、重点学生、下月分层动作。这里不建议写成家长群发口吻。`;
    }
    return `从${context}看，学生月报里更适合写“本月表现证据 + 一个主要进步 + 一个下月跟进点”。不要堆太多诊断词，保持家长能读懂。`;
  }
  if (text.includes("下次") || text.includes("训练") || text.includes("安排")) {
    return `围绕${context}，下次课可以按“复盘一个典型问题 → 做同类变式 → 让学生复述步骤”来排。正式计划建议再生成下次课建议卡片。`;
  }
  return `我会先把${context}里的信息当成参考，不扩展成正式结论。当前更稳妥的处理是：确认已有证据、标出不确定点，再决定是否生成 AI 结果卡。`;
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
