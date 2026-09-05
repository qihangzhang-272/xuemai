import type { ChatState, Conversation } from "./types";

export const globalAssistantConversation: Conversation = {
  id: "assistant-global",
  kind: "assistant",
  name: "学脉助手",
  avatar: "脉",
  className: "全局工作台",
  subject: "自动化",
  grade: "老师",
  summary: "每日提醒、待办聚合、自动化任务",
  time: "今日",
  statusLabel: "自动化助手",
  accent: "green",
  attention: true
};

export const initialConversations: Conversation[] = [
  globalAssistantConversation,
  {
    id: "class-a",
    kind: "class",
    name: "初二数学 A 班",
    avatar: "群",
    className: "12 名学生",
    subject: "数学",
    grade: "初二",
    summary: "还没有记录",
    time: "",
    statusLabel: "本周 3 条待处理",
    accent: "green",
    members: 12
  },
  {
    id: "class-b",
    kind: "class",
    name: "初三物理 B 班",
    avatar: "群",
    className: "8 名学生",
    subject: "物理",
    grade: "初三",
    summary: "还没有记录",
    time: "",
    statusLabel: "实验报告待整理",
    accent: "orange",
    members: 8
  },
  {
    id: "student-wang",
    kind: "student",
    name: "王一路",
    avatar: "王",
    className: "初二数学 A 班",
    subject: "数学、物理、英语",
    subjectTracks: ["数学", "物理", "英语"],
    grade: "初二",
    summary: "还没有记录",
    time: "",
    statusLabel: "需要关注",
    accent: "green",
    attention: true
  },
  {
    id: "student-li",
    kind: "student",
    name: "李明轩",
    avatar: "李",
    className: "初二数学 A 班",
    subject: "数学、英语",
    subjectTracks: ["数学", "英语"],
    grade: "初二",
    summary: "还没有记录",
    time: "",
    statusLabel: "待反馈",
    accent: "blue",
    attention: true
  },
  {
    id: "student-zhang",
    kind: "student",
    name: "张子涵",
    avatar: "张",
    className: "初二数学 A 班",
    subject: "数学",
    subjectTracks: ["数学"],
    grade: "初二",
    summary: "还没有记录",
    time: "",
    statusLabel: "稳定",
    accent: "orange"
  }
];

export const initialState: ChatState = {
  conversations: initialConversations,
  messages: [],
  taskCards: [],
  timelineRecords: [],
  preferences: {
    autoAnalyzeUploadedPaper: false,
    autoArchiveLearningEvidence: false,
    feedbackTone: "温和",
    defaultTaskSet: ["学习材料分析", "微信反馈", "整理学习记录"]
  },
  teacher: null,
  currentConversationId: "assistant-global"
};
