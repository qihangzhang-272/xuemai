"use client";

import {
  AlertTriangle,
  Bell,
  Bot,
  Calendar,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Home,
  Link as LinkIcon,
  MessageCircle,
  MessageSquare,
  Move,
  Plus,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Users,
  Wallet,
  X,
  type LucideIcon
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type DragEvent,
  type InputHTMLAttributes,
  type PointerEvent,
  type ReactNode,
  type TextareaHTMLAttributes
} from "react";
import { cn } from "@/lib/utils";

type Role = "teacher" | "parent";
type TeacherView = "dashboard" | "students" | "classes" | "schedule" | "messages" | "finance" | "settings" | "account" | "updates";
type ParentView = "home" | "courses" | "billing" | "feedback" | "reports" | "booking" | "notifications" | "parentMessages" | "profile";
type StudentTab = "scores" | "weakness" | "reports" | "lessons" | "payments" | "timeline" | "family";
type ScheduleSection = "table" | "holiday" | "booking";
type LessonStatus = "待上课" | "已上课" | "学生缺席" | "已取消" | "待点名" | "已点名" | "已反馈";
type AttendanceStatus = "出勤" | "迟到" | "请假" | "缺席";
type BookingStatus = "待审核" | "冲突" | "已通过" | "已拒绝";
type FeedbackStatus = "未生成" | "待反馈" | "已发送";
type ParentIssueType = "排课" | "请假" | "反馈" | "账务" | "其他";
type InitialModal = "feedback" | "attendance" | "invite" | "booking" | "parentCommunication" | null;
type FinanceFilter = "全部流水" | "充值" | "扣课" | "撤销" | "待结算";

export type LessonLedgerInitialState = {
  role: Role;
  teacherView: TeacherView;
  parentView: ParentView;
  studentTab: StudentTab;
  scheduleSection: ScheduleSection;
  modal: InitialModal;
  studentId?: string;
};

type Lesson = {
  id: string;
  date: string;
  day: string;
  start: string;
  end: string;
  student: string;
  subject: string;
  kind: "一对一" | "班课";
  status: LessonStatus;
  price: number;
  balanceChange: number;
  feedbackStatus: FeedbackStatus;
};

type Student = {
  id: string;
  name: string;
  grade: string;
  parent: string;
  teacher: string;
  remainingLessons: number;
  latestScore: string;
  focus: string;
};

type BackendStudent = Omit<Student, "teacher"> & {
  teacher?: string;
  teacherId?: string;
};

type ClassMember = {
  studentId: string;
  name: string;
  grade: string;
  remainingLessons: number;
  lastStatus: AttendanceStatus;
  focus: string;
};

type ClassGroup = {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  focus: string;
  members: ClassMember[];
};

type BookingRequest = {
  id: string;
  student: string;
  date: string;
  day: string;
  start: string;
  end: string;
  status: BookingStatus;
  conflictNote?: string;
};

type BookingConflictItem = {
  id: string;
  date: string;
  start: string;
  end: string;
  student: string;
  kind: "课程" | "预约";
  note: string;
};

type OpenSlot = {
  date: string;
  day: string;
  start: string;
  end: string;
};

type ScoreRow = {
  studentId?: string;
  studentName?: string;
  exam: string;
  date: string;
  score: string;
  rank: string;
  note: string;
};

type WeaknessRow = {
  studentId?: string;
  studentName?: string;
  tag: string;
  level: "高频" | "重点" | "中频";
  source: string;
  action: string;
};

type FinanceRow = {
  date: string;
  studentId?: string;
  studentName?: string;
  action: "充值" | "扣课" | "撤销";
  amount: string;
  cashAmount?: string;
  balance: string;
  note: string;
};

type AttendanceRecord = {
  id: string;
  lessonId: string;
  className: string;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  deductLesson: boolean;
  remark?: string;
  savedAt: string;
};

type FeedbackAttachment = {
  name: string;
  kind: "图片" | "PDF" | "文档";
  status: "已分析" | "未识别";
  analysis: string;
};

type StudyReport = {
  id: string;
  studentId: string;
  title: string;
  status: "待生成" | "已保存";
  period: string;
  summary: string;
  parentSummary?: string;
  sources: string[];
  scoreTrend: ScoreRow[];
  weaknessSummary: Array<Pick<WeaknessRow, "tag" | "level" | "action">>;
  feedbackHighlights: string[];
  sections: Array<{ title: string; body: string }>;
  suggestions: string[];
  dataQuality: "数据充足" | "数据较少，仅供参考";
  visibleToParent: boolean;
  createdAt: string;
  savedAt?: string;
};

type UploadedFeedbackAttachment = {
  name: string;
  type: string;
  sizeLabel: string;
};

type FeedbackDraft = {
  id?: string;
  lessonId: string;
  student: string;
  body: string;
  status: FeedbackStatus;
  attachments?: FeedbackAttachment[];
  createdAt?: string;
};

type ParentFeedbackItem = {
  title: string;
  course: string;
  linkedLesson: string;
  student: string;
  teacher: string;
  subject: string;
  status: FeedbackStatus;
  body: string;
  attachments: FeedbackAttachment[];
};

type FamilyInviteRecord = {
  id?: string;
  token?: string;
  studentId: string;
  studentName?: string;
  parentName?: string;
  status?: "待激活" | "已激活" | "已过期" | "已失效";
  inviteLink: string;
  expiresAt?: string;
};

type FeatureRequest = {
  id: string;
  title: string;
  body: string;
  status: "已提交" | "测试中" | "已推送";
  requester: string;
  createdAt: string;
};

type TeacherProfile = {
  id?: string;
  name: string;
  account: string;
  studioName: string;
  subject: string;
  city: string;
  teacherIntro: string;
  parentDisplayNote: string;
  authCode: string;
  authorizationStatus: "已授权" | "试用授权有效" | "授权失效";
  serviceExpiresAt: string;
  version: string;
};

type UpdateState = {
  status: "未检查" | "可更新" | "已是最新" | "已更新" | "授权失败";
  latestVersion: string;
  checkedAt?: string;
  updatedAt?: string;
  notes: string[];
};

type MessageThread = {
  id: string;
  parent: string;
  student: string;
  title: string;
  issueType?: ParentIssueType;
  linkedLesson: string;
  status: "已发送" | "已确认";
  messages: Array<{ from: "parent" | "teacher"; body: string; time: string }>;
};

type NavItem<T extends string> = { id: T; label: string; icon: LucideIcon; inset?: boolean; scheduleSection?: ScheduleSection; badge?: string };

type BackendSnapshot = {
  teacher?: TeacherProfile;
  updateState?: UpdateState;
  students?: BackendStudent[];
  classes?: ClassGroup[];
  lessons?: Lesson[];
  attendanceRecords?: AttendanceRecord[];
  openSlots?: OpenSlot[];
  bookings?: BookingRequest[];
  scores?: ScoreRow[];
  weaknesses?: WeaknessRow[];
  financeEvents?: FinanceRow[];
  messageThreads?: Array<MessageThread & { issueType?: ParentIssueType }>;
  feedbackDrafts?: FeedbackDraft[];
  familyInvites?: FamilyInviteRecord[];
  featureRequests?: FeatureRequest[];
  reports?: StudyReport[];
};

const defaultInviteToken = "b3a5f55cc8da67a1020b0e88d1126ce5716c88f4e4cf3cf69dafd4000624a047";
const defaultInviteLink = `/portal/invite?token=${defaultInviteToken}`;

const defaultTeacherProfile: TeacherProfile = {
  id: "t-qrane",
  name: "Qrane老师",
  account: "admin",
  studioName: "Kin 数学工作室",
  subject: "初高中数学",
  city: "杭州",
  teacherIntro: "专注初高中数学一对一与小班课，提供课后反馈、阶段报告和预约排课服务。",
  parentDisplayNote: "学生绑定后可查看最近反馈、学习报告、预约课程和发起家校沟通。",
  authCode: "KIN-TRY-2026",
  authorizationStatus: "已授权",
  serviceExpiresAt: "2027/6/12 16:01:00",
  version: "1.0.11"
};

const defaultUpdateState: UpdateState = {
  status: "未检查",
  latestVersion: "1.0.12",
  checkedAt: "2026/6/13 00:13:47",
  notes: ["优化假期预约冲突处理和连续排课", "新增学习报告家长端可见性控制", "更新保留课程、课时流水和家庭账号数据"]
};

const students: Student[] = [
  {
    id: "s1",
    name: "李三",
    grade: "高二",
    parent: "李三家长",
    teacher: "Qrane老师",
    remainingLessons: 13,
    latestScore: "89 / 120",
    focus: "圆锥曲线取值范围"
  },
  {
    id: "s2",
    name: "王小满",
    grade: "初三",
    parent: "王小满家长",
    teacher: "Qrane老师",
    remainingLessons: 12,
    latestScore: "105 / 120",
    focus: "二次函数压轴题"
  },
  {
    id: "s3",
    name: "陈雨",
    grade: "高一",
    parent: "陈雨家长",
    teacher: "Qrane老师",
    remainingLessons: 9,
    latestScore: "76 / 100",
    focus: "函数单调性与参数"
  }
];

const initialLessons: Lesson[] = [
  {
    id: "l1",
    date: "06-20",
    day: "周六",
    start: "08:00",
    end: "10:00",
    student: "李三",
    subject: "高中数学",
    kind: "一对一",
    status: "已上课",
    price: 320,
    balanceChange: -1,
    feedbackStatus: "待反馈"
  },
  {
    id: "l2",
    date: "06-20",
    day: "周六",
    start: "10:30",
    end: "12:00",
    student: "高二数学小班",
    subject: "圆锥曲线专题",
    kind: "班课",
    status: "待点名",
    price: 960,
    balanceChange: -1,
    feedbackStatus: "未生成"
  },
  {
    id: "l3",
    date: "06-20",
    day: "周六",
    start: "14:30",
    end: "16:00",
    student: "王小满",
    subject: "初三数学",
    kind: "一对一",
    status: "待上课",
    price: 260,
    balanceChange: -1,
    feedbackStatus: "未生成"
  },
  {
    id: "l4",
    date: "06-20",
    day: "周六",
    start: "18:00",
    end: "19:30",
    student: "陈雨",
    subject: "高中数学",
    kind: "一对一",
    status: "待上课",
    price: 300,
    balanceChange: -1,
    feedbackStatus: "未生成"
  },
  {
    id: "l5",
    date: "06-20",
    day: "周六",
    start: "16:00",
    end: "17:30",
    student: "李三",
    subject: "高中数学",
    kind: "一对一",
    status: "待上课",
    price: 320,
    balanceChange: -1,
    feedbackStatus: "未生成"
  }
];

const initialBookings: BookingRequest[] = [
  {
    id: "b1",
    student: "李三",
    date: "06-20",
    day: "周六",
    start: "10:30",
    end: "12:30",
    status: "冲突",
    conflictNote: "与 10:30-12:00 高二数学小班冲突"
  },
  {
    id: "b2",
    student: "王小满",
    date: "06-21",
    day: "周日",
    start: "08:00",
    end: "10:00",
    status: "待审核"
  }
];

const initialOpenSlots: OpenSlot[] = [
  { date: "06-20", day: "周六", start: "08:00", end: "22:00" },
  { date: "06-21", day: "周日", start: "08:00", end: "22:00" }
];

const scheduleDays = [
  { date: "06-19", day: "周五" },
  { date: "06-20", day: "周六" },
  { date: "06-21", day: "周日" },
  { date: "06-22", day: "周一" }
];

const scoreRows: ScoreRow[] = [
  { studentId: "s1", studentName: "李三", exam: "入门小测", date: "06-10", score: "82 / 100", rank: "8 / 36", note: "解析几何选择题稳定，计算题扣分较多" },
  { studentId: "s1", studentName: "李三", exam: "周测 12", date: "06-14", score: "89 / 120", rank: "6 / 36", note: "离心率模型掌握较好，取值范围仍有漏判" },
  { studentId: "s1", studentName: "李三", exam: "专题检测", date: "06-18", score: "93 / 120", rank: "5 / 36", note: "大题前两问完成度提升，压轴尾问需要拆条件" },
  { studentId: "s2", studentName: "王小满", exam: "函数综合测", date: "06-12", score: "105 / 120", rank: "3 / 32", note: "二次函数压轴题前两问稳定，分类讨论仍需压实" },
  { studentId: "s3", studentName: "陈雨", exam: "函数单调性小测", date: "06-16", score: "76 / 100", rank: "10 / 28", note: "参数题读题速度提升，符号变形还需巩固" }
];

const weaknessRows: WeaknessRow[] = [
  { studentId: "s1", studentName: "李三", tag: "圆锥曲线离心率", level: "高频", source: "最近 3 次作业", action: "先补条件转化，再做综合小题" },
  { studentId: "s1", studentName: "李三", tag: "取值范围讨论", level: "重点", source: "入门小测第 6 题", action: "下次课安排 20 分钟专项讲解" },
  { studentId: "s1", studentName: "李三", tag: "计算准确率", level: "中频", source: "课堂反馈", action: "每日 5 题限时训练" },
  { studentId: "s2", studentName: "王小满", tag: "二次函数压轴分类", level: "重点", source: "函数综合测", action: "先复盘顶点式与判别式，再做压轴前两问" },
  { studentId: "s3", studentName: "陈雨", tag: "参数与单调性", level: "高频", source: "函数单调性小测", action: "下次课补参数范围图像法，减少符号失误" }
];

const financeRows: FinanceRow[] = [
  { date: "06-02", action: "充值", amount: "+15 课时", cashAmount: "¥6,400", balance: "15 课时", note: "家长转账确认" },
  { date: "06-10", action: "扣课", amount: "-1 课时", balance: "14 课时", note: "入门小测讲评" },
  { date: "06-14", action: "扣课", amount: "-1 课时", balance: "13 课时", note: "圆锥曲线专题" },
  { date: "06-16", studentId: "s2", studentName: "王小满", action: "充值", amount: "+15 课时", cashAmount: "¥4,850", balance: "18 课时", note: "暑期续费确认" },
  { date: "06-18", action: "撤销", amount: "+1 课时", cashAmount: "¥0", balance: "14 课时", note: "临时请假未扣课" },
  { date: "06-20", action: "扣课", amount: "-1 课时", balance: "13 课时", note: "课堂完成后自动记录" }
];

const initialStudyReports: StudyReport[] = [
  {
    id: "r-s1-202606",
    studentId: "s1",
    title: "李三 6 月阶段学习报告",
    status: "待生成",
    period: "2026-06-10 至 2026-06-20",
    summary: "根据最近三次成绩、圆锥曲线专题反馈和薄弱点记录生成。",
    sources: ["最近三次考试", "圆锥曲线课堂反馈", "薄弱点记录"],
    scoreTrend: scoreRows.filter((score) => score.studentId === "s1"),
    weaknessSummary: weaknessRows.filter((weakness) => weakness.studentId === "s1").map((weakness) => ({
      tag: weakness.tag,
      level: weakness.level,
      action: weakness.action
    })),
    feedbackHighlights: ["06-20 课程反馈：离心率模型识别稳定，但取值范围讨论仍需专项巩固。"],
    sections: [
      { title: "近期表现", body: "李三近期在圆锥曲线专题上的模型识别能力有所提升，能较快找到离心率相关条件。" },
      { title: "成绩波动", body: "最近三次检测整体呈上升趋势，说明基础模型与常见题型正在稳定。" },
      { title: "当前薄弱点", body: "主要问题集中在取值范围讨论、条件拆解和计算准确率，需要继续专项练习。" }
    ],
    suggestions: ["下次课安排取值范围专项讲解。", "课后完成 7 道圆锥曲线综合小题。", "每次练习后单独复盘计算过程。"],
    dataQuality: "数据充足",
    visibleToParent: false,
    createdAt: "2026-06-20T13:40:00+08:00"
  }
];

const classMembers: ClassMember[] = [
  { studentId: "cm1", name: "赵一鸣", grade: "高二", remainingLessons: 16, lastStatus: "出勤", focus: "直线与圆综合" },
  { studentId: "cm2", name: "钱小夏", grade: "高二", remainingLessons: 14, lastStatus: "迟到", focus: "椭圆标准方程" },
  { studentId: "cm3", name: "孙子墨", grade: "高二", remainingLessons: 11, lastStatus: "请假", focus: "双曲线离心率" },
  { studentId: "s1", name: "李三", grade: "高二", remainingLessons: 13, lastStatus: "出勤", focus: "取值范围讨论" },
  { studentId: "cm5", name: "周可", grade: "高二", remainingLessons: 13, lastStatus: "出勤", focus: "计算准确率" },
  { studentId: "cm6", name: "吴越", grade: "高二", remainingLessons: 10, lastStatus: "缺席", focus: "参数分类讨论" }
];

const initialClasses: ClassGroup[] = [
  {
    id: "c1",
    name: "高二数学小班",
    subject: "圆锥曲线专题",
    teacherId: "t-qrane",
    focus: "圆锥曲线离心率",
    members: classMembers
  }
];

function buildAttendanceState(members: ClassMember[], records: AttendanceRecord[] = []) {
  const savedByStudentId = new Map(records.map((record) => [record.studentId, record.status]));
  return Object.fromEntries(members.map((member) => [member.name, savedByStudentId.get(member.studentId) ?? member.lastStatus])) as Record<string, AttendanceStatus>;
}

function mergeBackendStudents(current: Student[], backendStudents: BackendStudent[], teacherName: string) {
  const currentById = new Map(current.map((student) => [student.id, student]));
  const normalizedBackend = backendStudents.map((student) => ({
    id: student.id,
    name: student.name,
    grade: student.grade,
    parent: student.parent,
    teacher: student.teacher ?? currentById.get(student.id)?.teacher ?? teacherName,
    remainingLessons: student.remainingLessons,
    latestScore: student.latestScore,
    focus: student.focus
  }));
  const backendById = new Map(normalizedBackend.map((student) => [student.id, student]));
  const mergedCurrent = current.map((student) => backendById.get(student.id) ?? student);
  const currentIds = new Set(current.map((student) => student.id));
  const backendAdditions = normalizedBackend.filter((student) => !currentIds.has(student.id));

  return [...mergedCurrent, ...backendAdditions];
}

const teacherNavGroups: Array<{
  label: string;
  items: Array<NavItem<TeacherView>>;
}> = [
  {
    label: "OVERVIEW",
    items: [{ id: "dashboard", label: "工作台", icon: Home }]
  },
  {
    label: "OPERATIONS",
    items: [
      { id: "students", label: "学生管理", icon: Users },
      { id: "classes", label: "班级管理", icon: Users },
      { id: "schedule", label: "排课中心", icon: Calendar },
      { id: "schedule", label: "排课总表", icon: Calendar, inset: true, scheduleSection: "table" },
      { id: "schedule", label: "假期排课", icon: Calendar, inset: true, scheduleSection: "holiday" },
      { id: "schedule", label: "预约排课", icon: Calendar, inset: true, scheduleSection: "booking" },
      { id: "messages", label: "沟通中心", icon: MessageSquare },
      { id: "finance", label: "财务记录", icon: Wallet }
    ]
  },
  {
    label: "ADMIN",
    items: [
      { id: "account", label: "账号管理", icon: ShieldCheck },
      { id: "updates", label: "系统更新", icon: RotateCcw },
      { id: "settings", label: "工作室资料", icon: Settings }
    ]
  }
];

const parentNavGroups: Array<{
  label: string;
  items: Array<NavItem<ParentView>>;
}> = [
  {
    label: "家庭门户",
    items: [
      { id: "home", label: "首页", icon: Home },
      { id: "courses", label: "课程", icon: FileText },
      { id: "billing", label: "账务", icon: CreditCard },
      { id: "feedback", label: "反馈", icon: MessageSquare },
      { id: "booking", label: "预约", icon: Calendar },
      { id: "notifications", label: "通知", icon: Bell, badge: "12" },
      { id: "parentMessages", label: "留言", icon: MessageCircle },
      { id: "profile", label: "我的资料", icon: User }
    ]
  }
];

const studentTabs: Array<{ id: StudentTab; label: string; icon: LucideIcon }> = [
  { id: "scores", label: "成绩", icon: Sparkles },
  { id: "weakness", label: "薄弱点", icon: FileText },
  { id: "reports", label: "学习报告", icon: FileText },
  { id: "lessons", label: "课程", icon: Calendar },
  { id: "payments", label: "收款", icon: CreditCard },
  { id: "timeline", label: "财务时间线", icon: ShieldCheck },
  { id: "family", label: "家校", icon: MessageCircle }
];

const unsafeFeedbackWords = ["保证提分", "完全不会", "基础很差", "不认真", "严重"];

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isOverlapping(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}

function parseLessonAmount(value: string) {
  const match = value.trim().match(/^([+-]?\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function parseCashAmount(value?: string) {
  if (!value) {
    return 0;
  }

  const normalizedValue = value.replace(/[￥¥,\s]/g, "");
  const match = normalizedValue.match(/^([+-]?\d+(?:\.\d{1,2})?)$/);
  return match ? Number(match[1]) : 0;
}

function financeCashValue(row: FinanceRow) {
  const parsedCash = parseCashAmount(row.cashAmount);
  if (parsedCash || row.cashAmount) {
    return parsedCash;
  }

  if (row.action === "充值") {
    return Math.max(0, parseLessonAmount(row.amount)) * 320;
  }

  return 0;
}

function formatCurrency(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}¥${Math.abs(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function bookingTimeWithinSlot(slot: OpenSlot, start: string, end: string) {
  return toMinutes(start) >= toMinutes(slot.start) && toMinutes(end) <= toMinutes(slot.end);
}

function buildBookingTimeOptions(openSlotsForDate: OpenSlot[], conflictItemsForDate: BookingConflictItem[]) {
  const seen = new Set<string>();

  return openSlotsForDate.flatMap((slot) => {
    const startMinute = toMinutes(slot.start);
    const endMinute = toMinutes(slot.end);
    const options: Array<{ start: string; end: string; value: string; conflictItems: BookingConflictItem[] }> = [];

    for (let minute = startMinute; minute + 120 <= endMinute; minute += 30) {
      const start = minutesToTime(minute);
      const end = minutesToTime(minute + 120);
      const value = `${start}-${end}`;

      if (seen.has(value)) {
        continue;
      }

      seen.add(value);
      options.push({
        start,
        end,
        value,
        conflictItems: conflictItemsForDate.filter((item) => isOverlapping(start, end, item.start, item.end))
      });
    }

    return options;
  });
}

const bookingTimeMarks = Array.from({ length: 29 }, (_, index) => minutesToTime(8 * 60 + index * 30));

function formatConflictItem(item: BookingConflictItem) {
  return `${item.kind} ${item.start}-${item.end} ${item.student}`;
}

function bookingReviewRank(status: BookingStatus) {
  const ranks: Record<BookingStatus, number> = {
    冲突: 0,
    待审核: 1,
    已通过: 2,
    已拒绝: 3
  };

  return ranks[status];
}

function statusClass(status: LessonStatus | BookingStatus | AttendanceStatus | WeaknessRow["level"] | "未生成" | "待反馈" | "已发送" | "待回复" | "已确认") {
  const classes: Record<string, string> = {
    待上课: "border-sky-200 bg-sky-50 text-sky-700",
    已上课: "border-emerald-200 bg-emerald-50 text-emerald-700",
    学生缺席: "border-orange-200 bg-orange-50 text-orange-700",
    已取消: "border-zinc-200 bg-zinc-50 text-zinc-600",
    待点名: "border-violet-200 bg-violet-50 text-violet-700",
    已点名: "border-emerald-200 bg-emerald-50 text-emerald-700",
    已反馈: "border-emerald-200 bg-emerald-50 text-emerald-700",
    未生成: "border-zinc-200 bg-zinc-50 text-zinc-500",
    待反馈: "border-amber-200 bg-amber-50 text-amber-700",
    已发送: "border-emerald-200 bg-emerald-50 text-emerald-700",
    待回复: "border-amber-200 bg-amber-50 text-amber-700",
    已确认: "border-emerald-200 bg-emerald-50 text-emerald-700",
    待审核: "border-amber-200 bg-amber-50 text-amber-700",
    冲突: "border-rose-200 bg-rose-50 text-rose-700",
    已通过: "border-emerald-200 bg-emerald-50 text-emerald-700",
    已拒绝: "border-zinc-200 bg-zinc-50 text-zinc-500",
    出勤: "border-emerald-200 bg-emerald-50 text-emerald-700",
    迟到: "border-amber-200 bg-amber-50 text-amber-700",
    请假: "border-sky-200 bg-sky-50 text-sky-700",
    缺席: "border-rose-200 bg-rose-50 text-rose-700",
    高频: "border-rose-200 bg-rose-50 text-rose-700",
    重点: "border-amber-200 bg-amber-50 text-amber-700",
    中频: "border-blue-200 bg-blue-50 text-blue-700"
  };

  return classes[status] ?? "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function getUpdateStatusClass(status: UpdateState["status"]) {
  if (status === "可更新") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "授权失败") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "未检查") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function threadDisplayStatus(status: MessageThread["status"]) {
  return status === "已发送" ? "待回复" : status;
}

function formatInviteLink(link: string, origin: string) {
  if (!link) {
    return "";
  }

  if (/^https?:\/\//.test(link)) {
    return link;
  }

  return origin ? new URL(link, origin).toString() : link;
}

function formatDateTimeLabel(value?: string) {
  if (!value) {
    return "未生成";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "待系统确认";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai"
  })
    .format(date)
    .replace(/\//g, "-");
}

function currentDateTimeLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai"
  })
    .format(new Date())
    .replace(/\//g, "-");
}

function isAuthCodeFormatValid(value: string) {
  return /^[A-Za-z0-9-]{8,64}$/.test(value.trim());
}

function formatRetentionCount(value: number, unit: string) {
  return `${value}${unit}`;
}

function formatTeacherAlias(name: string) {
  return name.replace(/老师$/u, "");
}

function formatParentSubject(subject: string) {
  return subject.includes("数学") ? "数学" : subject;
}

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2 text-[11px] font-medium", className)}>
      {children}
    </span>
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide,
  narrow
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  narrow?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm">
      <div
        className={cn(
          "max-h-[86vh] w-full overflow-hidden rounded-[18px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.26)]",
          narrow ? "max-w-[520px]" : wide ? "max-w-5xl" : "max-w-2xl"
        )}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[calc(86vh-76px)] overflow-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-800">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100",
        props.className
      )}
    />
  );
}

function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-28 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100",
        props.className
      )}
    />
  );
}

function PrimaryButton({
  children,
  icon: Icon,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-zinc-950 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  icon: Icon,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {children}
    </button>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-lg border border-zinc-200 bg-white shadow-sm", className)}>
      <div className="flex flex-col gap-2 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="min-w-0 p-3 sm:p-4">{children}</div>
    </section>
  );
}

export function LessonLedgerApp({ initialState }: { initialState: LessonLedgerInitialState }) {
  const [role, setRole] = useState<Role>(initialState.role);
  const [teacherView, setTeacherView] = useState<TeacherView>(initialState.teacherView);
  const [parentView, setParentView] = useState<ParentView>(initialState.parentView);
  const [studentTab, setStudentTab] = useState<StudentTab>(initialState.studentTab);
  const [selectedStudentId, setSelectedStudentId] = useState(initialState.studentId ?? "s1");
  const [scheduleSection, setScheduleSection] = useState<ScheduleSection>(initialState.scheduleSection);
  const [studentList, setStudentList] = useState<Student[]>(students);
  const [classList, setClassList] = useState<ClassGroup[]>(initialClasses);
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>(initialOpenSlots);
  const [bookings, setBookings] = useState<BookingRequest[]>(initialBookings);
  const [scores, setScores] = useState<ScoreRow[]>(scoreRows);
  const [weaknesses, setWeaknesses] = useState<WeaknessRow[]>(weaknessRows);
  const [financeEvents, setFinanceEvents] = useState<FinanceRow[]>(financeRows);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState("l1");
  const [lessonStatusTarget, setLessonStatusTarget] = useState<{ lessonId: string; status: LessonStatus } | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(initialState.modal === "feedback");
  const [feedbackContent, setFeedbackContent] = useState("圆锥曲线的离心率问题");
  const [feedbackState, setFeedbackState] = useState("上课精神集中，解题思路清晰，计算准确率有待提高。");
  const [feedbackHomework, setFeedbackHomework] = useState("七道圆锥曲线综合小题");
  const [feedbackPreview, setFeedbackPreview] = useState("");
  const [feedbackGenerating, setFeedbackGenerating] = useState(false);
  const [feedbackAttachments, setFeedbackAttachments] = useState<UploadedFeedbackAttachment[]>([]);
  const [feedbackAttachmentAnalyses, setFeedbackAttachmentAnalyses] = useState<FeedbackAttachment[]>([]);
  const [feedbackDrafts, setFeedbackDrafts] = useState<FeedbackDraft[]>([]);
  const [copied, setCopied] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(initialState.modal === "attendance");
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(buildAttendanceState(initialClasses[0]?.members ?? []));
  const [inviteOpen, setInviteOpen] = useState(initialState.modal === "invite");
  const [inviteLink, setInviteLink] = useState(initialState.modal === "invite" ? defaultInviteLink : "");
  const [familyInvites, setFamilyInvites] = useState<FamilyInviteRecord[]>([]);
  const [browserOrigin, setBrowserOrigin] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportPreviewReady, setReportPreviewReady] = useState(false);
  const [reportPreviewId, setReportPreviewId] = useState<string | null>(null);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportTeacherNotes, setReportTeacherNotes] = useState("请根据最近三次成绩、圆锥曲线专题反馈、当前薄弱点和课时记录，生成一份阶段学习报告。");
  const [reportParentSummary, setReportParentSummary] = useState("");
  const [studyReports, setStudyReports] = useState<StudyReport[]>(initialStudyReports);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [bookingAuditOpen, setBookingAuditOpen] = useState(initialState.modal === "booking");
  const [openSlotModalOpen, setOpenSlotModalOpen] = useState(false);
  const [openSlotDates, setOpenSlotDates] = useState<string[]>(["06-20", "06-21"]);
  const [openSlotStart, setOpenSlotStart] = useState("10:30");
  const [openSlotEnd, setOpenSlotEnd] = useState("12:30");
  const [bookingDetailId, setBookingDetailId] = useState<string | null>(null);
  const [bookingAdjustStart, setBookingAdjustStart] = useState("12:30");
  const [bookingAdjustEnd, setBookingAdjustEnd] = useState("14:30");
  const [bookingStudent, setBookingStudent] = useState("李三");
  const [bookingDate, setBookingDate] = useState("06-20");
  const [bookingTime, setBookingTime] = useState("10:30-12:30");
  const [parentBookingPickerOpen, setParentBookingPickerOpen] = useState(false);
  const [bookingOnlyAvailable, setBookingOnlyAvailable] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState("m1");
  const [parentQuestionTitle, setParentQuestionTitle] = useState("想让老师讲讲取值范围的问题");
  const [parentQuestionBody, setParentQuestionBody] = useState("孩子的离心率问题涉及到取值范围还不太会，想请老师下次课重点讲讲。");
  const [parentIssueType, setParentIssueType] = useState<ParentIssueType>("反馈");
  const [parentContactRole, setParentContactRole] = useState<"老师" | "负责人">("老师");
  const [parentCommunicationOpen, setParentCommunicationOpen] = useState(initialState.modal === "parentCommunication");
  const [parentFeedbackDetailOpen, setParentFeedbackDetailOpen] = useState(false);
  const [selectedParentFeedbackIndex, setSelectedParentFeedbackIndex] = useState(0);
  const [teacherReplyDraft, setTeacherReplyDraft] = useState("好的家长，下次课我们会安排对应的内容。");
  const [moveTarget, setMoveTarget] = useState<{ lessonId: string; date: string; day: string; start: string; end: string } | null>(null);
  const [moveResetStatus, setMoveResetStatus] = useState(true);
  const [draggingLessonId, setDraggingLessonId] = useState<string | null>(null);
  const pointerMoveRef = useRef<{ lessonId: string; date: string; start: string; x: number; y: number } | null>(null);
  const suppressCourseClickRef = useRef(false);
  const feedbackAttachmentInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState("");
  const [lastBackendError, setLastBackendError] = useState("");
  const lastBackendErrorRef = useRef("");
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile>(defaultTeacherProfile);
  const [updateState, setUpdateState] = useState<UpdateState>(defaultUpdateState);
  const [authCode, setAuthCode] = useState(defaultTeacherProfile.authCode);
  const [studioName, setStudioName] = useState(defaultTeacherProfile.studioName);
  const [studioSubject, setStudioSubject] = useState(defaultTeacherProfile.subject);
  const [studioCity, setStudioCity] = useState(defaultTeacherProfile.city);
  const [teacherIntro, setTeacherIntro] = useState(defaultTeacherProfile.teacherIntro);
  const [parentDisplayNote, setParentDisplayNote] = useState(defaultTeacherProfile.parentDisplayNote);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [featureRequestModalOpen, setFeatureRequestModalOpen] = useState(false);
  const [featureRequestTitle, setFeatureRequestTitle] = useState("希望预约审核支持批量通过");
  const [featureRequestBody, setFeatureRequestBody] = useState("假期密集排课时，希望可以对无冲突预约一键通过，并在排课总表里自动连续排课。");
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [updateBusy, setUpdateBusy] = useState<"checking" | "updating" | null>(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("赵一鸣");
  const [newStudentGrade, setNewStudentGrade] = useState("高一");
  const [newStudentParent, setNewStudentParent] = useState("赵一鸣家长");
  const [newStudentRemaining, setNewStudentRemaining] = useState("10");
  const [newStudentFocus, setNewStudentFocus] = useState("函数图像与参数范围");
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [scoreExam, setScoreExam] = useState("月考复盘");
  const [scoreDate, setScoreDate] = useState("06-22");
  const [scoreValue, setScoreValue] = useState("96 / 120");
  const [scoreRank, setScoreRank] = useState("4 / 36");
  const [scoreNote, setScoreNote] = useState("离心率模型稳定，取值范围讨论比上次更完整。");
  const [weaknessModalOpen, setWeaknessModalOpen] = useState(false);
  const [weaknessTag, setWeaknessTag] = useState("参数取值范围");
  const [weaknessLevel, setWeaknessLevel] = useState<WeaknessRow["level"]>("重点");
  const [weaknessSource, setWeaknessSource] = useState("月考复盘");
  const [weaknessAction, setWeaknessAction] = useState("下次课安排 20 分钟专项训练，先做条件拆解再做范围讨论。");
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeDate, setFinanceDate] = useState("06-22");
  const [financeStudentId, setFinanceStudentId] = useState(initialState.studentId ?? "s1");
  const [financeAction, setFinanceAction] = useState<FinanceRow["action"]>("充值");
  const [financeAmount, setFinanceAmount] = useState("+10 课时");
  const [financeCashAmount, setFinanceCashAmount] = useState("¥3,200");
  const [financeBalance, setFinanceBalance] = useState("30 课时");
  const [financeNote, setFinanceNote] = useState("家长续费确认");
  const [financeFilter, setFinanceFilter] = useState<FinanceFilter>("全部流水");
  const [editingScoreKey, setEditingScoreKey] = useState<{ exam: string; date: string } | null>(null);
  const [editingWeaknessTag, setEditingWeaknessTag] = useState<string | null>(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [courseDate, setCourseDate] = useState("06-20");
  const [courseDay, setCourseDay] = useState("周六");
  const [courseStart, setCourseStart] = useState("20:00");
  const [courseEnd, setCourseEnd] = useState("22:00");
  const [courseStudent, setCourseStudent] = useState("李三");
  const [courseSubject, setCourseSubject] = useState("高中数学");
  const [courseKind, setCourseKind] = useState<Lesson["kind"]>("一对一");
  const [courseStatus, setCourseStatus] = useState<LessonStatus>("待上课");
  const [coursePrice, setCoursePrice] = useState("320");
  const [courseBalanceChange, setCourseBalanceChange] = useState("-1");
  const [threads, setThreads] = useState<MessageThread[]>([
    {
      id: "m1",
      parent: "李三家长",
      student: "李三",
      title: "想让老师讲讲取值范围的问题",
      issueType: "反馈",
      linkedLesson: "06-20 圆锥曲线离心率反馈",
      status: "已确认",
      messages: [
        {
          from: "parent",
          body: "孩子的离心率问题涉及到取值范围还不太会，想请老师下次课重点讲讲。",
          time: "14:12"
        },
        {
          from: "teacher",
          body: "好的家长，下次课我们会安排对应的内容。",
          time: "14:18"
        }
      ]
    }
  ]);

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? lessons[0];
  const lessonStatusPreview = lessonStatusTarget ? lessons.find((lesson) => lesson.id === lessonStatusTarget.lessonId) ?? null : null;
  const lessonStatusEffectRows =
    lessonStatusTarget && lessonStatusPreview
      ? lessonStatusTarget.status === "已上课"
        ? [
            ["今日课程", "状态改为已上课，今日课程表进入待反馈"],
            ["课时流水", `同步扣课 ${lessonStatusPreview.balanceChange} 课时，应收 ${formatCurrency(lessonStatusPreview.price)}`],
            ["反馈入口", "生成课后反馈待处理入口，可继续用 AI 生成家长反馈"]
          ]
        : [
            ["今日课程", `状态改为${lessonStatusTarget.status}，今日课程表标记已记录`],
            ["课时流水", "不会新增正常上课扣课流水"],
            ["反馈入口", "清理本节课未发送反馈草稿，家长端不会看到反馈"]
          ]
      : [];
  const selectedStudentRecord = studentList.find((student) => student.id === selectedStudentId) ?? studentList[0] ?? students[0];
  const parentThreads = threads.filter((thread) => thread.student === selectedStudentRecord.name || thread.parent === selectedStudentRecord.parent);
  const visibleThreadsForRole = role === "parent" ? parentThreads : threads;
  const activeThread = visibleThreadsForRole.find((thread) => thread.id === activeThreadId) ?? visibleThreadsForRole[0];
  const selectedScores = scores.filter((score) => (score.studentId ? score.studentId === selectedStudentRecord.id : selectedStudentRecord.id === "s1"));
  const selectedWeaknesses = weaknesses.filter((weakness) => (weakness.studentId ? weakness.studentId === selectedStudentRecord.id : selectedStudentRecord.id === "s1"));
  const financeStudent = studentList.find((student) => student.id === financeStudentId) ?? studentList[0] ?? students[0];
  const todayLessons = lessons.filter((lesson) => lesson.date === "06-20").sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const recentLessons = lessons.slice(0, 5);
  const parentStudentLessons = lessons.filter((lesson) => lesson.student === selectedStudentRecord.name).slice(0, 5);
  const parentRecentLessons = parentStudentLessons.length ? parentStudentLessons : recentLessons;
  const parentFinanceEvents = financeEvents.filter(
    (event) => event.studentId === selectedStudentRecord.id || event.studentName === selectedStudentRecord.name
  );
  const selectedFamilyInvite = familyInvites.find((invite) => invite.studentId === selectedStudentRecord.id);
  const completedLessonStatuses: LessonStatus[] = ["已上课", "已点名", "已反馈"];
  const monthlyIncome = financeEvents.reduce((sum, event) => sum + financeCashValue(event), 0);
  const receivedPaymentCount = financeEvents.filter((event) => financeCashValue(event) > 0).length;
  const refundedPaymentCount = financeEvents.filter((event) => financeCashValue(event) < 0).length;
  const deductedLessonCredits = financeEvents.filter((event) => event.action === "扣课").reduce((sum, event) => sum + Math.abs(Math.min(0, parseLessonAmount(event.amount))), 0);
  const reversedLessonCredits = financeEvents.filter((event) => event.action === "撤销").reduce((sum, event) => sum + Math.max(0, parseLessonAmount(event.amount)), 0);
  const totalRemainingLessons = studentList.reduce((sum, student) => sum + student.remainingLessons, 0);
  const pendingSettlementEvents = financeEvents.filter((event) => event.action === "扣课" && !event.cashAmount);
  const visibleFinanceEvents = financeEvents.filter((event) => {
    if (financeFilter === "全部流水") {
      return true;
    }

    if (financeFilter === "待结算") {
      return event.action === "扣课" && !event.cashAmount;
    }

    return event.action === financeFilter;
  });
  const lowBalanceStudents = studentList.filter((student) => student.remainingLessons <= 10);
  const renewalStudents = studentList.filter((student) => student.remainingLessons > 10 && student.remainingLessons <= 15);
  const accountRiskCount = new Set([...lowBalanceStudents, ...renewalStudents].map((student) => student.id)).size;
  const reversedFinanceEvents = financeEvents.filter((event) => event.action === "撤销");
  const financeTaskItems = [
    ...lowBalanceStudents.slice(0, 2).map((student) => ({
      id: `low-${student.id}`,
      studentName: student.name,
      desc: `剩余 ${student.remainingLessons} 课时`,
      action: "下次充值建议",
      tone: "border-rose-200 bg-white text-rose-700",
      click: () => {
        setSelectedStudentId(student.id);
        setFinanceStudentId(student.id);
        setFinanceFilter("全部流水");
        setFinanceModalOpen(true);
      }
    })),
    ...pendingSettlementEvents.slice(0, 2).map((event) => ({
      id: `pending-${event.studentId}-${event.date}-${event.note}`,
      studentName: event.studentName,
      desc: `${event.date} ${event.amount} 未记录收款`,
      action: "待结算",
      tone: "border-amber-200 bg-white text-amber-700",
      click: () => {
        const targetStudentId = event.studentId ?? selectedStudentRecord.id;
        setSelectedStudentId(targetStudentId);
        setFinanceStudentId(targetStudentId);
        setFinanceFilter("待结算");
      }
    })),
    ...reversedFinanceEvents.slice(0, 1).map((event) => ({
      id: `reverse-${event.studentId}-${event.date}-${event.note}`,
      studentName: event.studentName,
      desc: `${event.date} ${event.amount} · ${event.note}`,
      action: "已撤销",
      tone: "border-blue-200 bg-white text-blue-700",
      click: () => {
        const targetStudentId = event.studentId ?? selectedStudentRecord.id;
        setSelectedStudentId(targetStudentId);
        setFinanceStudentId(targetStudentId);
        setFinanceFilter("撤销");
      }
    }))
  ].slice(0, 5);
  const pendingFeedbackLessons = lessons.filter(
    (lesson) => lesson.feedbackStatus === "待反馈" || (completedLessonStatuses.includes(lesson.status) && lesson.feedbackStatus === "未生成")
  );
  const pendingBookingRequests = bookings.filter((booking) => booking.status === "待审核" || booking.status === "冲突");
  const pendingFamilyInvites = familyInvites.filter((invite) => invite.status === "待激活");
  const pendingReportStudents = studentList.filter((student) => !studyReports.some((report) => report.studentId === student.id && report.status === "已保存"));
  const approvedBookings = bookings.filter((booking) => booking.status === "已通过");
  const bookingHasLesson = (booking: BookingRequest) =>
    lessons.some((lesson) => lesson.date === booking.date && lesson.start === booking.start && lesson.student === booking.student);
  const buildBookingConflictItemsForDate = (date: string, excludeBookingId?: string): BookingConflictItem[] => [
    ...lessons
      .filter((lesson) => lesson.date === date)
      .map((lesson) => ({
        id: lesson.id,
        date: lesson.date,
        start: lesson.start,
        end: lesson.end,
        student: lesson.student,
        kind: "课程" as const,
        note: lesson.subject
      })),
    ...bookings
      .filter((booking) => booking.date === date && booking.id !== excludeBookingId && booking.status !== "已拒绝" && !bookingHasLesson(booking))
      .map((booking) => ({
        id: booking.id,
        date: booking.date,
        start: booking.start,
        end: booking.end,
        student: booking.student,
        kind: "预约" as const,
        note: booking.status
      }))
  ];
  const approvedBookingsWithoutLesson = approvedBookings.filter((booking) => !bookingHasLesson(booking));
  const activeBookingDetail = bookingDetailId ? bookings.find((booking) => booking.id === bookingDetailId) ?? null : null;
  const findBookingConflicts = (booking: BookingRequest, start = booking.start, end = booking.end) =>
    buildBookingConflictItemsForDate(booking.date, booking.id).filter((item) => {
      const isCreatedFromBooking =
        booking.status === "已通过" && item.kind === "课程" && item.date === booking.date && item.start === booking.start && item.student === booking.student;
      return !isCreatedFromBooking && isOverlapping(start, end, item.start, item.end);
    });
  const getFirstBookingSuggestion = (booking: BookingRequest) =>
    buildBookingTimeOptions(
      openSlots.filter((slot) => slot.date === booking.date),
      buildBookingConflictItemsForDate(booking.date, booking.id)
    ).find((option) => option.conflictItems.length === 0 && option.value !== `${booking.start}-${booking.end}`);
  const activeBookingConflicts = activeBookingDetail ? findBookingConflicts(activeBookingDetail) : [];
  const activeBookingAdjustedConflicts = activeBookingDetail ? findBookingConflicts(activeBookingDetail, bookingAdjustStart, bookingAdjustEnd) : [];
  const activeBookingSuggestedOptions = activeBookingDetail
    ? [
        getFirstBookingSuggestion(activeBookingDetail),
        ...buildBookingTimeOptions(
          openSlots.filter((slot) => slot.date === activeBookingDetail.date),
          buildBookingConflictItemsForDate(activeBookingDetail.date, activeBookingDetail.id)
        )
      ]
        .filter((option): option is NonNullable<typeof option> => Boolean(option))
        .filter((option) => option.conflictItems.length === 0 && option.value !== `${activeBookingDetail.start}-${activeBookingDetail.end}`)
        .filter((option, index, options) => options.findIndex((item) => item.value === option.value) === index)
        .slice(0, 4)
    : [];
  const moveLessonPreview = moveTarget ? lessons.find((lesson) => lesson.id === moveTarget.lessonId) ?? null : null;
  const moveTargetConflicts = moveTarget
    ? buildBookingConflictItemsForDate(moveTarget.date).filter(
        (item) => !(item.kind === "课程" && item.id === moveTarget.lessonId) && isOverlapping(moveTarget.start, moveTarget.end, item.start, item.end)
      )
    : [];
  const sortedBookings = [...bookings].sort((a, b) => bookingReviewRank(a.status) - bookingReviewRank(b.status));
  const bookingReviewStats = {
    conflicts: bookings.filter((booking) => booking.status === "冲突").length,
    pending: bookings.filter((booking) => booking.status === "待审核").length,
    approved: bookings.filter((booking) => booking.status === "已通过").length
  };
  const selectedOpenSlotDays = scheduleDays.filter((day) => openSlotDates.includes(day.date));
  const openSlotDurationMinutes = toMinutes(openSlotEnd) - toMinutes(openSlotStart);
  const openSlotPreviewCount =
    openSlotDurationMinutes >= 120 ? selectedOpenSlotDays.length * (Math.floor((openSlotDurationMinutes - 120) / 30) + 1) : 0;
  const openSlotExistingLessonCount = lessons.filter((lesson) => openSlotDates.includes(lesson.date) && isOverlapping(openSlotStart, openSlotEnd, lesson.start, lesson.end)).length;
  const courseDurationMinutes = toMinutes(courseEnd) - toMinutes(courseStart);
  const coursePreviewStudent = studentList.find((student) => student.name === courseStudent);
  const coursePreviewClass = classList.find((classItem) => classItem.name === courseStudent);
  const coursePreviewMemberCount = courseKind === "班课" ? coursePreviewClass?.members.length ?? 0 : 1;
  const coursePreviewConflicts =
    courseDurationMinutes > 0
      ? buildBookingConflictItemsForDate(courseDate).filter(
          (item) => !(item.kind === "课程" && item.id === editingLessonId) && isOverlapping(courseStart, courseEnd, item.start, item.end)
        )
      : [];
  const updateRetentionItems = [
    { label: "课程与排课", count: formatRetentionCount(lessons.length, "节") },
    { label: "课时流水", count: formatRetentionCount(financeEvents.length, "条") },
    { label: "家庭账号", count: formatRetentionCount(familyInvites.length, "个") },
    { label: "学习报告", count: formatRetentionCount(studyReports.length, "份") },
    { label: "预约记录", count: formatRetentionCount(bookings.length, "条") }
  ];
  const teacherNavActive = role === "teacher" ? teacherView : undefined;
  const parentNavActive = role === "parent" ? parentView : undefined;
  const fallbackStudyReport: StudyReport = {
    ...initialStudyReports[0],
    id: `r-${selectedStudentRecord.id}-draft`,
    studentId: selectedStudentRecord.id,
    title: `${selectedStudentRecord.name} 6 月阶段学习报告`,
    summary: `${selectedStudentRecord.name}近期围绕${selectedStudentRecord.focus}持续练习，报告会综合当前成绩、薄弱点、课程和课后反馈。`,
    scoreTrend: selectedScores.slice(0, 3),
    weaknessSummary: selectedWeaknesses.slice(0, 4).map((weakness) => ({
      tag: weakness.tag,
      level: weakness.level,
      action: weakness.action
    })),
    sections: [
      { title: "近期表现", body: `${selectedStudentRecord.name}近期重点围绕${selectedStudentRecord.focus}巩固，课堂反馈和练习记录会作为主要依据。` },
      { title: "成绩波动", body: selectedScores.length > 0 ? `当前已记录 ${selectedScores.length} 次成绩，可用于观察阶段波动。` : "当前成绩记录较少，建议先补充最近考试或测验结果。" },
      { title: "当前薄弱点", body: selectedWeaknesses.length > 0 ? `已记录薄弱点：${selectedWeaknesses.map((weakness) => weakness.tag).join("、")}。` : "暂未记录薄弱点，建议结合下次课或作业结果补充。" }
    ],
    suggestions: selectedWeaknesses.length > 0 ? selectedWeaknesses.slice(0, 3).map((weakness) => weakness.action) : [`围绕${selectedStudentRecord.focus}补充 1-2 条薄弱点记录。`]
  };
  const currentStudyReport =
    (selectedReportId ? studyReports.find((report) => report.id === selectedReportId && report.studentId === selectedStudentId) : null) ??
    studyReports.find((report) => report.studentId === selectedStudentId && report.status === "已保存") ??
    studyReports.find((report) => report.studentId === selectedStudentId) ??
    fallbackStudyReport;
  const reportPreviewReport = (reportPreviewId ? studyReports.find((report) => report.id === reportPreviewId) : null) ?? currentStudyReport;
  const parentVisibleReports = studyReports.filter((report) => report.status === "已保存" && report.visibleToParent && report.studentId === selectedStudentId);
  const parentLatestVisibleReport = parentVisibleReports[0] ?? null;

  const demoLatestFeedback =
    "李三家长您好，今天这节课主要围绕“圆锥曲线的离心率问题”展开，重点梳理了相关概念、常见题型和解题思路。\n\n课堂状态方面，李三上课精神比较集中，能较快找到题目中的关键条件；后续还需要继续加强计算过程准确率，以及涉及取值范围时的分类讨论。\n\n课后我给孩子布置了 7 道圆锥曲线综合小题，下次课会继续带孩子把容易漏判的条件再梳理一遍。";
  const latestFeedbackLesson = lessons.find((lesson) => lesson.id === "l1") ?? lessons[0];
  const latestFeedbackCourseDate = `2026-${latestFeedbackLesson.date}`;
  const sentFeedbackItems: ParentFeedbackItem[] = feedbackDrafts
    .filter((draft) => draft.status === "已发送")
    .map((draft) => {
      const lesson = lessons.find((item) => item.id === draft.lessonId) ?? latestFeedbackLesson;
      const courseDate = `2026-${lesson.date}`;

      return {
        title: `数学 - ${courseDate} - Qrane`,
        course: `数学 · ${courseDate} ${lesson.start}-${lesson.end} · Qrane · 已完成`,
        linkedLesson: `${lesson.date} ${lesson.subject.includes("圆锥") ? "圆锥曲线离心率" : lesson.subject}反馈`,
        student: draft.student,
        teacher: teacherProfile.name,
        subject: lesson.subject,
        status: draft.status,
        body: draft.body,
        attachments: draft.attachments ?? []
      };
    });
  const selectedSentFeedbackItems = sentFeedbackItems.filter((feedback) => feedback.student === selectedStudentRecord.name);
  const demoFeedbackItems: ParentFeedbackItem[] =
    selectedStudentRecord.id === "s1"
      ? [
          {
            title: `数学 - ${latestFeedbackCourseDate} - Qrane`,
            course: `数学 · ${latestFeedbackCourseDate} ${latestFeedbackLesson.start}-${latestFeedbackLesson.end} · Qrane · 已完成`,
            linkedLesson: `${latestFeedbackLesson.date} 圆锥曲线离心率反馈`,
            student: "李三",
            teacher: teacherProfile.name,
            subject: latestFeedbackLesson.subject,
            status: "已发送" as FeedbackStatus,
            body: demoLatestFeedback,
            attachments: [
              {
                name: "入门小测.jpg",
                kind: "图片",
                status: "已分析",
                analysis: "课前小测显示离心率定义能识别，但涉及取值范围和边界条件时容易漏判。"
              }
            ]
          },
          {
            title: "数学 - 2026-06-12 - Qrane",
            course: "数学 · 2026-06-12 10:00-12:00 · Qrane · 已完成",
            linkedLesson: "06-12 圆锥曲线基础模型反馈",
            student: "李三",
            teacher: teacherProfile.name,
            subject: "高中数学",
            status: "已发送" as FeedbackStatus,
            body: "本次课主要围绕圆锥曲线基础模型展开，课堂节奏稳定，后续继续加强计算准确率。",
            attachments: []
          }
        ]
      : [];
  const parentFeedbackItems = selectedSentFeedbackItems.length ? selectedSentFeedbackItems : demoFeedbackItems;
  const emptyParentFeedback: ParentFeedbackItem = {
    title: "暂无课程反馈",
    course: `${selectedStudentRecord.name} 暂无已发布课程反馈`,
    linkedLesson: "未关联课程",
    student: selectedStudentRecord.name,
    teacher: teacherProfile.name,
    subject: teacherProfile.subject,
    status: "未生成" as FeedbackStatus,
    body: "老师发布课后反馈后，这里会显示完整反馈正文，并可围绕本次课程发起沟通。",
    attachments: []
  };
  const selectedParentFeedback = parentFeedbackItems[selectedParentFeedbackIndex] ?? parentFeedbackItems[0] ?? emptyParentFeedback;
  const parentCommunicationReady = parentQuestionTitle.trim().length >= 2 && parentQuestionBody.trim().length >= 5;
  const selectedInviteFallbackToken = selectedFamilyInvite?.token ?? defaultInviteToken;
  const selectedInviteFallbackLink = selectedFamilyInvite?.inviteLink ?? `/portal/invite?token=${selectedInviteFallbackToken}`;
  const inviteDisplayLink = formatInviteLink(inviteLink || selectedInviteFallbackLink, browserOrigin);
  const selectedAttendanceLesson = (selectedLesson.kind === "班课" ? selectedLesson : lessons.find((lesson) => lesson.kind === "班课")) ?? selectedLesson;
  const selectedClass = classList.find((classItem) => classItem.name === selectedAttendanceLesson.student) ?? classList[0] ?? initialClasses[0];
  const selectedClassMembers = selectedClass?.members ?? [];
  const rollCallStatusOptions: Array<[AttendanceStatus, string]> = [
    ["出勤", "签到"],
    ["迟到", "迟到"],
    ["请假", "请假"],
    ["缺席", "缺席"]
  ];
  const rollCallSummary = rollCallStatusOptions.map(([status]) => [
    status,
    selectedClassMembers.filter((member) => (attendance[member.name] ?? member.lastStatus) === status).length
  ] as const);

  useEffect(() => {
    setBrowserOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (role === "parent") {
      setBookingStudent(selectedStudentRecord.name);
    }
  }, [role, selectedStudentRecord.name]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromBackend() {
      try {
        const response = await fetch("/api/workbench-v2");
        const result = (await response.json()) as { success: boolean; data?: BackendSnapshot };

        if (cancelled || !response.ok || !result.success || !result.data) {
          return;
        }

        if (result.data.lessons) {
          setLessons(result.data.lessons);
        }

        if (result.data.attendanceRecords) {
          setAttendanceRecords(result.data.attendanceRecords);
        }

        if (result.data.students) {
          setStudentList((current) => mergeBackendStudents(current, result.data?.students ?? [], result.data?.teacher?.name ?? defaultTeacherProfile.name));
        }

        if (result.data.classes) {
          setClassList(result.data.classes);
        }

        if (result.data.teacher) {
          applyTeacherProfile(result.data.teacher);
        }

        if (result.data.updateState) {
          setUpdateState(result.data.updateState);
        }

        if (result.data.openSlots) {
          setOpenSlots(result.data.openSlots);
        }

        if (result.data.bookings) {
          setBookings(result.data.bookings);
        }

        if (result.data.scores) {
          setScores(result.data.scores);
        }

        if (result.data.weaknesses) {
          setWeaknesses(result.data.weaknesses);
        }

        if (result.data.financeEvents) {
          setFinanceEvents(result.data.financeEvents);
        }

        if (result.data.messageThreads) {
          setThreads(
            result.data.messageThreads.map((thread) => ({
              id: thread.id,
              parent: thread.parent,
              student: thread.student,
              title: thread.title,
              issueType: thread.issueType,
              linkedLesson: thread.linkedLesson,
              status: thread.status,
              messages: thread.messages
            }))
          );
        }

        if (result.data.familyInvites) {
          setFamilyInvites(result.data.familyInvites);
        }

        const invite = result.data.familyInvites?.find((item) => item.studentId === selectedStudentId);
        if (invite) {
          setInviteLink(invite.inviteLink);
        }

        if (result.data.reports) {
          setStudyReports(result.data.reports);
        }

        if (result.data.feedbackDrafts) {
          setFeedbackDrafts(result.data.feedbackDrafts);
        }

        if (result.data.featureRequests) {
          setFeatureRequests(result.data.featureRequests);
        }

        const draft = result.data.feedbackDrafts?.find((item) => item.lessonId === selectedLessonId);
        if (draft) {
          setFeedbackPreview(draft.body);
          setFeedbackAttachmentAnalyses(draft.attachments ?? []);
          setFeedbackAttachments((draft.attachments ?? []).map(uploadedAttachmentFromAnalysis));
        }
      } catch (error) {
        console.warn("[LessonLedger] hydrate failed", error);
      }
    }

    void hydrateFromBackend();

    return () => {
      cancelled = true;
    };
  }, [selectedLessonId, selectedStudentId]);

  function applyTeacherProfile(teacher: TeacherProfile) {
    setTeacherProfile(teacher);
    setAuthCode(teacher.authCode);
    setStudioName(teacher.studioName);
    setStudioSubject(teacher.subject);
    setStudioCity(teacher.city);
    setTeacherIntro(teacher.teacherIntro);
    setParentDisplayNote(teacher.parentDisplayNote);
  }

  function syncBackendSnapshot(snapshot: BackendSnapshot) {
    if (snapshot.teacher) {
      applyTeacherProfile(snapshot.teacher);
    }

    if (snapshot.updateState) {
      setUpdateState(snapshot.updateState);
    }

    if (snapshot.students) {
      setStudentList((current) => mergeBackendStudents(current, snapshot.students ?? [], snapshot.teacher?.name ?? teacherProfile.name));
    }

    if (snapshot.lessons) {
      setLessons(snapshot.lessons);
    }

    if (snapshot.attendanceRecords) {
      setAttendanceRecords(snapshot.attendanceRecords);
    }

    if (snapshot.classes) {
      setClassList(snapshot.classes);
    }

    if (snapshot.openSlots) {
      setOpenSlots(snapshot.openSlots);
    }

    if (snapshot.bookings) {
      setBookings(snapshot.bookings);
    }

    if (snapshot.scores) {
      setScores(snapshot.scores);
    }

    if (snapshot.weaknesses) {
      setWeaknesses(snapshot.weaknesses);
    }

    if (snapshot.financeEvents) {
      setFinanceEvents(snapshot.financeEvents);
    }

    if (snapshot.reports) {
      setStudyReports(snapshot.reports);
    }

    if (snapshot.feedbackDrafts) {
      setFeedbackDrafts(snapshot.feedbackDrafts);
    }

    if (snapshot.familyInvites) {
      setFamilyInvites(snapshot.familyInvites);
      const invite = snapshot.familyInvites.find((item) => item.studentId === selectedStudentId);
      if (invite) {
        setInviteLink(invite.inviteLink);
      }
    }

    if (snapshot.featureRequests) {
      setFeatureRequests(snapshot.featureRequests);
    }

    if (snapshot.messageThreads) {
      setThreads(
        snapshot.messageThreads.map((thread) => ({
          id: thread.id,
          parent: thread.parent,
          student: thread.student,
          title: thread.title,
          issueType: thread.issueType,
          linkedLesson: thread.linkedLesson,
          status: thread.status,
          messages: thread.messages
        }))
      );
    }
  }

  async function runBackendAction(action: string, payload: unknown) {
    try {
      lastBackendErrorRef.current = "";
      setLastBackendError("");
      const response = await fetch("/api/workbench-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload })
      });
      const result = (await response.json()) as { success: boolean; data?: BackendSnapshot; error?: { message?: string } };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error?.message ?? "后端操作失败");
      }

      syncBackendSnapshot(result.data);
      return result.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "后端操作失败";
      lastBackendErrorRef.current = message;
      setLastBackendError(message);
      console.warn(`[LessonLedger] ${action} failed`, error);
      return null;
    }
  }

  function buildFeedbackText() {
    const greeting = selectedLesson.kind === "班课" ? "各位家长您好" : `${selectedLesson.student}家长您好`;
    const learner = selectedLesson.kind === "班课" ? "孩子们" : selectedLesson.student;
    const content = feedbackContent.trim();
    const state = feedbackState.trim();
    const homework = feedbackHomework.trim();
    const stateSentence = /[。！？.!?]$/.test(state) ? state : `${state}。`;
    const followUpFocus = `${content} ${state}`.includes("计算")
      ? "计算过程准确率和关键步骤书写"
      : `${content} ${state}`.includes("审题") || `${content} ${state}`.includes("读题")
        ? "读题审题、条件提取和题意转化"
        : `${content} ${state}`.includes("分类") || `${content} ${state}`.includes("讨论")
          ? "分类讨论的完整性和边界条件"
          : `${content} ${state}`.includes("应用") || `${content} ${state}`.includes("综合")
            ? "综合题中的方法选择和迁移能力"
            : "本节课相关方法的独立迁移和表达完整度";
    const attachmentSection = feedbackAttachments.length
      ? "\n\n另外，本次也结合了上传的课前小测或附件情况，会继续核对学生答题痕迹和课后巩固方向。"
      : "";
    const homeworkSentence = homework
      ? `课后我给孩子布置了${homework}，用于巩固本节课相关内容。`
      : `课后建议围绕“${content}”做少量针对性巩固，重点看能否独立复现课堂方法。`;

    return `${greeting}，今天这节课主要围绕“${content}”展开，重点梳理了相关概念、常见题型和解题思路。\n\n课堂状态方面，${learner}${stateSentence}我会结合本节课的表现，继续关注${followUpFocus}。${attachmentSection}\n\n${homeworkSentence}下次课我会根据本次反馈继续安排对应练习，帮助孩子把课堂方法真正落实到独立解题中。`;
  }

  function formatFileSize(size: number) {
    if (size < 1024 * 1024) {
      return `${Math.max(1, Math.round(size / 1024))}KB`;
    }

    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  }

  function uploadedAttachmentFromAnalysis(attachment: FeedbackAttachment): UploadedFeedbackAttachment {
    return {
      name: attachment.name,
      type: attachment.kind === "PDF" ? "application/pdf" : attachment.kind === "图片" ? "image/*" : "application/octet-stream",
      sizeLabel: attachment.status === "已分析" ? "已分析" : "待重新识别"
    };
  }

  function addFeedbackAttachments(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
    const incoming = Array.from(files);
    const validAttachments: UploadedFeedbackAttachment[] = [];
    const rejected = incoming.filter((file) => {
      const supportedByExt = /\.(jpe?g|png|webp|pdf)$/i.test(file.name);
      const supported = supportedTypes.has(file.type) || supportedByExt;
      const tooLarge = file.size > 20 * 1024 * 1024;

      if (supported && !tooLarge) {
        validAttachments.push({
          name: file.name,
          type: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/*"),
          sizeLabel: formatFileSize(file.size)
        });
      }

      return !supported || tooLarge;
    });

    if (validAttachments.length) {
      setFeedbackAttachments((current) => {
        const names = new Set(current.map((item) => item.name));
        return [...current, ...validAttachments.filter((item) => !names.has(item.name))];
      });
      setFeedbackPreview("");
      setFeedbackAttachmentAnalyses([]);
    }

    if (rejected.length) {
      showToast("部分附件暂未识别，将基于文字生成");
    } else {
      showToast("附件已添加，生成反馈时会参与分析");
    }
  }

  function removeFeedbackAttachment(name: string) {
    setFeedbackAttachments((current) => current.filter((item) => item.name !== name));
    setFeedbackAttachmentAnalyses((current) => current.filter((item) => item.name !== name));
    setFeedbackPreview("");
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function openParentFeedbackDetail(index: number) {
    setSelectedParentFeedbackIndex(index);
    setParentFeedbackDetailOpen(true);
  }

  function getParentFeedbackIndexForLesson(lesson: Lesson) {
    return parentFeedbackItems.findIndex((feedback) => feedback.course.includes(lesson.date) || feedback.linkedLesson.includes(lesson.date));
  }

  function openParentCommunicationFromFeedback(index = selectedParentFeedbackIndex) {
    setSelectedParentFeedbackIndex(index);
    setParentIssueType("反馈");
    setParentQuestionTitle("想让老师讲讲取值范围的问题");
    setParentQuestionBody("孩子的离心率问题涉及到取值范围还不太会，想请老师下次课重点讲讲。");
    setParentFeedbackDetailOpen(false);
    setParentCommunicationOpen(true);
  }

  function openLessonStatusConfirm(id: string, status: LessonStatus) {
    setLessonStatusTarget({ lessonId: id, status });
  }

  async function markLessonStatus(id: string, status: LessonStatus) {
    const snapshot = await runBackendAction("markLessonStatus", { lessonId: id, status });
    if (!snapshot) {
      showToast(lastBackendErrorRef.current || lastBackendError || "课程状态更新失败，请重试");
      return false;
    }

    showToast(status === "已上课" ? "课程已标记为已上课，扣课流水已同步" : `课程已标记为${status}`);
    return true;
  }

  async function confirmLessonStatusChange() {
    if (!lessonStatusTarget) {
      return;
    }

    const success = await markLessonStatus(lessonStatusTarget.lessonId, lessonStatusTarget.status);
    if (success) {
      setLessonStatusTarget(null);
    }
  }

  function openFeedback(lessonId: string) {
    const lesson = lessons.find((item) => item.id === lessonId);
    const draft = feedbackDrafts.find((item) => item.lessonId === lessonId);
    const attachments = draft?.attachments ?? [];

    setSelectedLessonId(lessonId);
    setCopied(false);
    setFeedbackPreview(draft?.body ?? "");
    setFeedbackAttachmentAnalyses(attachments);
    setFeedbackAttachments(attachments.map(uploadedAttachmentFromAnalysis));
    if (!draft && lesson) {
      setFeedbackContent(lesson.subject.includes("圆锥") ? "圆锥曲线的离心率问题" : lesson.subject);
    }
    setFeedbackGenerating(false);
    setFeedbackOpen(true);
  }

  function openAttendance(lessonId?: string) {
    const lesson = (lessonId ? lessons.find((item) => item.id === lessonId) : null) ?? selectedAttendanceLesson;
    if (!lesson || lesson.kind !== "班课") {
      showToast("请选择班课后点名");
      return;
    }

    const classItem = classList.find((item) => item.name === lesson.student) ?? selectedClass;
    const savedRecords = attendanceRecords.filter((record) => record.lessonId === lesson.id);
    setSelectedLessonId(lesson.id);
    setAttendance(buildAttendanceState(classItem?.members ?? [], savedRecords));
    setAttendanceOpen(true);
  }

  async function generateFeedback() {
    if (feedbackContent.trim().length < 10) {
      showToast("请至少填写 10 字本次上课内容");
      return null;
    }
    if (feedbackState.trim().length < 5) {
      showToast("请补充学生上课状态");
      return null;
    }
    if (feedbackHomework.trim().length > 500) {
      showToast("课后作业不能超过 500 字");
      return null;
    }

    setFeedbackGenerating(true);
    setFeedbackPreview("");
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    const text = buildFeedbackText();
    const snapshot = await runBackendAction("generateFeedback", {
      lessonId: selectedLesson.id,
      content: feedbackContent,
      state: feedbackState,
      homework: feedbackHomework,
      attachmentNames: feedbackAttachments.map((attachment) => attachment.name)
    });
    if (!snapshot) {
      setFeedbackGenerating(false);
      showToast("AI 反馈生成失败，请重试");
      return null;
    }

    const serverDraft = snapshot?.feedbackDrafts?.find((draft) => draft.lessonId === selectedLesson.id);
    setFeedbackPreview(serverDraft?.body ?? text);
    setFeedbackAttachmentAnalyses(serverDraft?.attachments ?? []);
    setFeedbackGenerating(false);
    showToast("AI 反馈已生成，可复制给家长");
    return serverDraft?.body ?? text;
  }

  async function saveFeedbackDraft() {
    const text = feedbackPreview.trim();
    if (!text) {
      showToast("请先生成或填写反馈内容");
      return;
    }

    const unsafeWord = unsafeFeedbackWords.find((word) => text.includes(word));
    if (unsafeWord) {
      showToast(`反馈中有不适合发给家长的表达：${unsafeWord}`);
      return;
    }

    const snapshot = await runBackendAction("saveFeedbackDraft", {
      lessonId: selectedLesson.id,
      feedbackText: text,
      attachmentNames: feedbackAttachments.map((attachment) => attachment.name)
    });
    if (!snapshot) {
      showToast(lastBackendErrorRef.current || lastBackendError || "反馈草稿保存失败，请重试");
      return;
    }

    const savedDraft = snapshot.feedbackDrafts?.find((draft) => draft.lessonId === selectedLesson.id);
    setFeedbackPreview(savedDraft?.body ?? text);
    setFeedbackAttachmentAnalyses(savedDraft?.attachments ?? []);
    setFeedbackAttachments((savedDraft?.attachments ?? []).map(uploadedAttachmentFromAnalysis));
    setCopied(false);
    showToast("反馈草稿已保存");
  }

  async function copyFeedbackToClipboard() {
    if (!feedbackPreview) {
      return;
    }

    try {
      await navigator.clipboard.writeText(feedbackPreview);
      setCopied(true);
      showToast("反馈已复制");
    } catch {
      showToast("复制失败，请手动复制");
    }
  }

  async function sendFeedbackToParent() {
    const text = feedbackPreview || (await generateFeedback());
    if (!text) {
      return;
    }
    const unsafeWord = unsafeFeedbackWords.find((word) => text.includes(word));
    if (unsafeWord) {
      showToast(`反馈中有不适合发给家长的表达：${unsafeWord}`);
      return;
    }

    const snapshot = await runBackendAction("publishFeedback", {
      lessonId: selectedLesson.id,
      feedbackText: text
    });
    if (!snapshot) {
      showToast("反馈同步失败，请重试");
      return;
    }

    setFeedbackOpen(false);
    setRole("parent");
    setParentView("home");
    showToast("反馈已同步到家长端");
  }

  async function saveAttendance() {
    const lesson = selectedAttendanceLesson;
    if (!lesson || lesson.kind !== "班课") {
      showToast("请选择班课后点名");
      return;
    }

    const snapshot = await runBackendAction("saveAttendance", {
      lessonId: lesson.id,
      attendance
    });
    if (!snapshot) {
      showToast("点名保存失败，请重试");
      return;
    }

    setAttendanceOpen(false);
    showToast("班课点名已保存，扣课流水已同步");
  }

  async function createInvite(targetStudentId?: string) {
    const studentId = typeof targetStudentId === "string" ? targetStudentId : selectedStudentRecord?.id;
    const targetStudent = studentList.find((student) => student.id === studentId) ?? selectedStudentRecord;
    if (!studentId) {
      showToast("请先选择学生");
      return;
    }

    setSelectedStudentId(studentId);
    setInviteLink("正在生成家庭邀请链接...");
    setInviteOpen(true);
    const snapshot = await runBackendAction("createFamilyInvite", { studentId });
    if (!snapshot) {
      setInviteLink(selectedInviteFallbackLink);
      showToast("家庭邀请生成失败，请重试");
      return;
    }

    const invite = snapshot.familyInvites?.find((item) => item.studentId === studentId);
    if (invite) {
      setInviteLink(invite.inviteLink);
    }
    showToast(`${targetStudent.name}家庭邀请已生成`);
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteDisplayLink);
      showToast("邀请链接已复制");
    } catch {
      showToast("复制失败，请手动复制链接");
    }
  }

  function openStudyReportGenerator() {
    setReportOpen(true);
    setReportGenerating(false);
    setReportPreviewReady(false);
    setReportPreviewId(null);
    setReportProgress(0);
    setReportTeacherNotes("请根据最近三次成绩、圆锥曲线专题反馈、当前薄弱点和课时记录，生成一份阶段学习报告。");
    setReportParentSummary("");
  }

  async function generateReportPreview() {
    setReportGenerating(true);
    setReportPreviewReady(false);
    setReportPreviewId(null);
    for (const value of [22, 48, 76]) {
      setReportProgress(value);
      await new Promise((resolve) => window.setTimeout(resolve, 360));
    }
    const snapshot = await runBackendAction("generateStudyReport", {
      studentId: selectedStudentId,
      teacherNotes: reportTeacherNotes
    });
    if (!snapshot) {
      setReportGenerating(false);
      setReportProgress(0);
      showToast("学习报告生成失败，请重试");
      return;
    }

    const draftReport = snapshot.reports?.find((report) => report.studentId === selectedStudentId && report.status === "待生成");
    if (draftReport) {
      setReportPreviewId(draftReport.id);
      setSelectedReportId(draftReport.id);
    }
    setReportProgress(100);
    setReportGenerating(false);
    setReportPreviewReady(true);
    showToast("学习报告预览已生成");
  }

  async function saveReport() {
    if (!reportPreviewReady || !reportPreviewId) {
      showToast("请先生成报告预览");
      return;
    }
    setReportGenerating(true);
    const snapshot = await runBackendAction("saveStudyReport", {
      reportId: reportPreviewId,
      parentSummary: reportParentSummary
    });
    setReportGenerating(false);
    if (!snapshot) {
      showToast("学习报告保存失败，请重试");
      return;
    }

    const savedReport = snapshot.reports?.find((report) => report.id === reportPreviewId);
    if (savedReport) {
      setSelectedReportId(savedReport.id);
    }
    setReportPreviewId(null);
    setReportOpen(false);
    showToast("学习报告已保存，家长端可见");
  }

  function toggleOpenSlotDate(date: string) {
    setOpenSlotDates((current) => (current.includes(date) ? current.filter((item) => item !== date) : [...current, date]));
  }

  async function createOpenSlots() {
    if (openSlotDates.length === 0) {
      showToast("请至少选择一个日期");
      return;
    }

    if (toMinutes(openSlotStart) >= toMinutes(openSlotEnd)) {
      showToast("开始时间必须早于结束时间");
      return;
    }

    const dates = scheduleDays.filter((day) => openSlotDates.includes(day.date));
    const snapshot = await runBackendAction("createOpenSlots", {
      dates,
      start: openSlotStart,
      end: openSlotEnd
    });
    if (!snapshot) {
      showToast("预约时段创建失败，请重试");
      return;
    }

    setOpenSlotModalOpen(false);
    showToast(`已创建 ${dates.map((item) => item.date).join(" / ")} 预约时段`);
  }

  function openStudentCreator() {
    setStudentModalOpen(true);
  }

  function openCourseCreator(date = "06-20", day = "周六", start = "20:00", end = "22:00") {
    const firstStudent = studentList[0]?.name ?? "李三";
    setEditingLessonId(null);
    setCourseDate(date);
    setCourseDay(day);
    setCourseStart(start);
    setCourseEnd(end);
    setCourseStudent(firstStudent);
    setCourseSubject(firstStudent.includes("班") ? "圆锥曲线专题" : "高中数学");
    setCourseKind(firstStudent.includes("班") ? "班课" : "一对一");
    setCourseStatus("待上课");
    setCoursePrice("320");
    setCourseBalanceChange("-1");
    setCourseModalOpen(true);
  }

  function openCourseEditor(lesson: Lesson) {
    setEditingLessonId(lesson.id);
    setCourseDate(lesson.date);
    setCourseDay(lesson.day);
    setCourseStart(lesson.start);
    setCourseEnd(lesson.end);
    setCourseStudent(lesson.student);
    setCourseSubject(lesson.subject);
    setCourseKind(lesson.kind);
    setCourseStatus(lesson.status);
    setCoursePrice(String(lesson.price));
    setCourseBalanceChange(String(lesson.balanceChange));
    setCourseModalOpen(true);
  }

  async function saveStudent() {
    const name = newStudentName.trim();
    if (!name) {
      showToast("请填写学生姓名");
      return;
    }

    const parent = newStudentParent.trim() || `${name}家长`;
    const remainingLessons = Number.parseFloat(newStudentRemaining);
    const snapshot = await runBackendAction("createStudent", {
      name,
      grade: newStudentGrade.trim() || "未填写年级",
      parent,
      remainingLessons: Number.isFinite(remainingLessons) ? remainingLessons : 0,
      latestScore: "暂无成绩",
      focus: newStudentFocus.trim() || "待补充学习重点"
    });

    if (!snapshot) {
      showToast("学生新增失败，请检查是否重复建档");
      return;
    }

    const backendStudents = snapshot.students ?? [];
    const createdStudent = backendStudents.find((student) => student.name === name && student.parent === parent) ?? backendStudents[0];
    if (createdStudent) {
      setSelectedStudentId(createdStudent.id);
      setFinanceStudentId(createdStudent.id);
    }
    setStudentTab("scores");
    setTeacherView("students");
    setStudentModalOpen(false);
    showToast("学生已新增");
  }

  async function saveCourse() {
    if (!courseStudent.trim() || !courseSubject.trim()) {
      showToast("请填写上课学生和课程科目");
      return;
    }

    if (toMinutes(courseStart) >= toMinutes(courseEnd)) {
      showToast("开始时间必须早于结束时间");
      return;
    }

    const price = Number.parseInt(coursePrice, 10);
    const balanceChange = Number.parseInt(courseBalanceChange, 10);
    const nextLesson: Lesson = {
      id: editingLessonId ?? `l-${Date.now()}`,
      date: courseDate.trim() || "06-20",
      day: courseDay.trim() || scheduleDays.find((day) => day.date === courseDate)?.day || "周六",
      start: courseStart,
      end: courseEnd,
      student: courseStudent.trim(),
      subject: courseSubject.trim(),
      kind: courseKind,
      status: courseStatus,
      price: Number.isFinite(price) ? price : 0,
      balanceChange: Number.isFinite(balanceChange) ? balanceChange : -1,
      feedbackStatus: courseStatus === "已上课" || courseStatus === "已点名" ? "待反馈" : "未生成"
    };

    const previousLesson = lessons.find((lesson) => lesson.id === editingLessonId);
    const payload = editingLessonId && previousLesson
      ? {
          ...nextLesson,
          feedbackStatus: previousLesson.feedbackStatus === "未生成" ? nextLesson.feedbackStatus : previousLesson.feedbackStatus
        }
      : nextLesson;
    const snapshot = await runBackendAction(editingLessonId ? "updateLesson" : "createLesson", payload);
    if (!snapshot) {
      showToast(editingLessonId ? "课程更新失败，请检查时间冲突" : "课程新增失败，请检查时间冲突");
      return;
    }

    setSelectedLessonId(nextLesson.id);
    setCourseModalOpen(false);
    showToast(editingLessonId ? "课程已更新" : "课程已新增");
  }

  function openScoreCreator() {
    setEditingScoreKey(null);
    setScoreExam("月考复盘");
    setScoreDate("06-22");
    setScoreValue("96 / 120");
    setScoreRank("4 / 36");
    setScoreNote("离心率模型稳定，取值范围讨论比上次更完整。");
    setScoreModalOpen(true);
  }

  function openScoreEditor(row: ScoreRow) {
    setEditingScoreKey({ exam: row.exam, date: row.date });
    setScoreExam(row.exam);
    setScoreDate(row.date);
    setScoreValue(row.score);
    setScoreRank(row.rank);
    setScoreNote(row.note);
    setScoreModalOpen(true);
  }

  function closeScoreModal() {
    setScoreModalOpen(false);
    setEditingScoreKey(null);
  }

  function openWeaknessCreator() {
    setEditingWeaknessTag(null);
    setWeaknessTag("参数取值范围");
    setWeaknessLevel("重点");
    setWeaknessSource("月考复盘");
    setWeaknessAction("下次课安排 20 分钟专项训练，先做条件拆解再做范围讨论。");
    setWeaknessModalOpen(true);
  }

  function openWeaknessEditor(row: WeaknessRow) {
    setEditingWeaknessTag(row.tag);
    setWeaknessTag(row.tag);
    setWeaknessLevel(row.level);
    setWeaknessSource(row.source);
    setWeaknessAction(row.action);
    setWeaknessModalOpen(true);
  }

  function closeWeaknessModal() {
    setWeaknessModalOpen(false);
    setEditingWeaknessTag(null);
  }

  async function saveScore() {
    const exam = scoreExam.trim();
    const score = scoreValue.trim();
    const rank = scoreRank.trim();
    const note = scoreNote.trim();

    if (!exam) {
      showToast("请填写考试名称");
      return;
    }

    if (exam.length < 2 || exam.length > 50) {
      showToast("考试名称需为 2-50 字");
      return;
    }

    const scoreMatch = score.match(/^(\d+(?:\.\d+)?)\s*[\/／]\s*(\d+(?:\.\d+)?)$/);
    if (!scoreMatch) {
      showToast("请填写有效总分");
      return;
    }

    if (Number(scoreMatch[1]) > Number(scoreMatch[2])) {
      showToast("得分不能大于总分");
      return;
    }

    if (rank && !/^\d+(?:\s*[\/／]\s*\d+)?$/.test(rank)) {
      showToast("排名必须为正整数");
      return;
    }

    if (note.length > 300) {
      showToast("备注不能超过 300 字");
      return;
    }

    const isEditingScore = Boolean(editingScoreKey);
    const nextScore = {
      studentId: selectedStudentId,
      studentName: studentList.find((student) => student.id === selectedStudentId)?.name ?? "李三",
      exam,
      date: scoreDate,
      score,
      rank,
      note
    };
    const snapshot = await runBackendAction(
      editingScoreKey ? "updateScore" : "addScore",
      editingScoreKey
        ? {
            previousExam: editingScoreKey.exam,
            previousDate: editingScoreKey.date,
            score: nextScore
          }
        : nextScore
    );
    if (!snapshot) {
      showToast("成绩保存失败，请重试");
      return;
    }

    closeScoreModal();
    setStudentTab("scores");
    showToast(isEditingScore ? "成绩已更新" : "成绩已保存");
  }

  async function saveWeakness() {
    const tag = weaknessTag.trim();
    const source = weaknessSource.trim();
    const action = weaknessAction.trim();

    if (!tag) {
      showToast("请填写薄弱点");
      return;
    }

    if (tag.length < 2 || tag.length > 50) {
      showToast("薄弱点名称需为 2-50 字");
      return;
    }

    if (!action) {
      showToast("请填写加强动作");
      return;
    }

    if (action.length > 300) {
      showToast("备注不能超过 300 字");
      return;
    }

    const isEditingWeakness = Boolean(editingWeaknessTag);
    const nextWeakness = {
      studentId: selectedStudentId,
      studentName: studentList.find((student) => student.id === selectedStudentId)?.name ?? "李三",
      tag,
      level: weaknessLevel,
      source,
      action
    };
    const snapshot = await runBackendAction(
      editingWeaknessTag ? "updateWeakness" : "addWeakness",
      editingWeaknessTag
        ? {
            previousTag: editingWeaknessTag,
            weakness: nextWeakness
          }
        : nextWeakness
    );
    if (!snapshot) {
      showToast("薄弱点保存失败，请重试");
      return;
    }

    closeWeaknessModal();
    setStudentTab("weakness");
    showToast(isEditingWeakness ? "薄弱点已更新" : "薄弱点已保存");
  }

  async function saveFinanceEvent() {
    const amount = financeAmount.trim();
    const cashAmount = financeCashAmount.trim();
    const note = financeNote.trim();

    if (!amount) {
      showToast("请填写课时变化");
      return;
    }

    const amountMatch = amount.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:课时|次)?$/);
    if (!amountMatch) {
      showToast("课时变化格式不正确");
      return;
    }

    const amountValue = Number(amountMatch[1]);
    const absAmount = Math.abs(amountValue);
    if (!Number.isFinite(amountValue) || absAmount < 0.1 || absAmount > 999 || !Number.isInteger(absAmount * 10)) {
      showToast("请输入有效课时");
      return;
    }

    const normalizedDelta = amount.startsWith("+") || amount.startsWith("-") ? amountValue : financeAction === "扣课" ? -Math.abs(amountValue) : Math.abs(amountValue);
    if (financeAction === "扣课" && normalizedDelta >= 0) {
      showToast("扣课流水必须减少课时");
      return;
    }

    if ((financeAction === "充值" || financeAction === "撤销") && normalizedDelta <= 0) {
      showToast(`${financeAction}流水必须增加课时`);
      return;
    }

    if (financeStudent.remainingLessons + normalizedDelta < 0) {
      showToast("课时不足，请充值或确认欠费");
      return;
    }

    if (financeAction === "充值") {
      const cashValue = parseCashAmount(cashAmount);
      if (!cashAmount || cashValue <= 0) {
        showToast("请填写本次收款金额");
        return;
      }
    }

    if (cashAmount && !/^[-+]?￥?¥?\s*\d+(?:,\d{3})*(?:\.\d{1,2})?$|^[-+]?￥?¥?\s*\d+(?:\.\d{1,2})?$/.test(cashAmount.trim())) {
      showToast("收款金额格式不正确");
      return;
    }

    if (note.length > 300) {
      showToast("备注不能超过 300 字");
      return;
    }

    const snapshot = await runBackendAction("addFinanceEvent", {
      date: financeDate,
      studentId: financeStudent.id,
      studentName: financeStudent.name,
      action: financeAction,
      amount,
      cashAmount,
      balance: financeBalance,
      note
    });
    if (!snapshot) {
      showToast("课时流水保存失败，请重试");
      return;
    }

    setFinanceModalOpen(false);
    setTeacherView("finance");
    showToast("课时流水已保存");
  }

  async function checkForUpdate() {
    if (!authCode.trim()) {
      showToast("请填写授权码");
      return;
    }

    if (!isAuthCodeFormatValid(authCode)) {
      setUpdateState((current) => ({ ...current, status: "授权失败", checkedAt: currentDateTimeLabel() }));
      showToast("授权码格式不正确");
      return;
    }

    setUpdateBusy("checking");
    const snapshot = await runBackendAction("checkUpdate", { authCode });
    setUpdateBusy(null);
    if (!snapshot) {
      setUpdateState((current) => ({ ...current, status: "授权失败", checkedAt: currentDateTimeLabel() }));
      showToast("授权码无效，请检查后重试");
      return;
    }

    showToast(snapshot.updateState?.status === "可更新" ? `发现可更新版本 ${snapshot.updateState.latestVersion}` : "已检查更新：当前为最新版本");
  }

  async function applyVersionUpdate() {
    if (!authCode.trim()) {
      showToast("请填写授权码");
      return;
    }

    if (!isAuthCodeFormatValid(authCode)) {
      setUpdateState((current) => ({ ...current, status: "授权失败", checkedAt: currentDateTimeLabel() }));
      showToast("授权码格式不正确");
      return;
    }

    setUpdateBusy("updating");
    const snapshot = await runBackendAction("applyUpdate", { authCode });
    setUpdateBusy(null);
    if (!snapshot) {
      setUpdateState((current) => ({ ...current, status: "授权失败", checkedAt: currentDateTimeLabel() }));
      showToast("更新失败，已保留当前版本和数据");
      return;
    }

    setLicenseModalOpen(false);
    showToast(`已更新到 ${snapshot.teacher?.version ?? updateState.latestVersion}，课程和课时流水已保留`);
  }

  async function refreshUpdateReport() {
    if (!authCode.trim() || !isAuthCodeFormatValid(authCode)) {
      setUpdateState((current) => ({ ...current, status: "授权失败", checkedAt: currentDateTimeLabel() }));
      showToast("请先填写有效授权码");
      return;
    }

    setUpdateBusy("checking");
    const snapshot = await runBackendAction("checkUpdate", { authCode });
    setUpdateBusy(null);
    if (!snapshot) {
      setUpdateState((current) => ({ ...current, status: "授权失败", checkedAt: currentDateTimeLabel() }));
      showToast("刷新失败，请先确认授权码");
      return;
    }

    showToast("版本更新报告已刷新");
  }

  async function submitFeatureRequest() {
    if (!featureRequestTitle.trim()) {
      showToast("请填写功能需求标题");
      return;
    }

    if (!featureRequestBody.trim()) {
      showToast("请填写功能需求说明");
      return;
    }

    const snapshot = await runBackendAction("submitFeatureRequest", {
      title: featureRequestTitle,
      body: featureRequestBody
    });
    if (!snapshot) {
      showToast("功能需求提交失败，请重试");
      return;
    }

    setFeatureRequestModalOpen(false);
    setFeatureRequestTitle("");
    setFeatureRequestBody("");
    showToast("功能需求已提交到群内需求池，测试通过后会推送更新");
  }

  async function saveStudioProfile() {
    if (!studioName.trim() || !studioSubject.trim()) {
      showToast("请填写工作室名称和任教学科");
      return;
    }

    const snapshot = await runBackendAction("saveStudioProfile", {
      studioName,
      subject: studioSubject,
      city: studioCity,
      teacherIntro,
      parentDisplayNote
    });
    if (!snapshot) {
      showToast("工作室资料保存失败");
      return;
    }

    showToast("工作室资料已保存，家长端展示已同步");
  }

  async function submitParentBooking() {
    const [start, end] = bookingTime.split("-");
    const slot = openSlots.find((item) => item.date === bookingDate && bookingTimeWithinSlot(item, start, end));

    if (!bookingStudent.trim()) {
      showToast("请填写预约学生");
      return;
    }

    if (!slot) {
      showToast("请选择老师开放的蓝色预约时段");
      return;
    }

    const snapshot = await runBackendAction("createBooking", {
      student: bookingStudent.trim(),
      date: bookingDate,
      start,
      end
    });

    if (!snapshot) {
      showToast("预约提交失败，请重试");
      return;
    }

    const createdBooking = snapshot.bookings?.[0];
    if (createdBooking) {
      setBookingDetailId(createdBooking.id);
      setBookingAdjustStart(createdBooking.status === "冲突" ? "12:30" : createdBooking.start);
      setBookingAdjustEnd(createdBooking.status === "冲突" ? "14:30" : createdBooking.end);
    }
    showToast(createdBooking?.status === "冲突" ? "预约已提交，系统检测到冲突" : "预约已提交，等待老师确认");
    setParentBookingPickerOpen(false);
    setRole("teacher");
    setTeacherView("schedule");
    setScheduleSection("booking");
    setBookingAuditOpen(true);
  }

  function openTeacherSchedule(section: ScheduleSection = "table") {
    setTeacherView("schedule");
    setScheduleSection(section);
  }

  function openBookingAudit() {
    setTeacherView("schedule");
    setScheduleSection("booking");
    setBookingAuditOpen(true);
  }

  function chooseBookingDate(date: string) {
    const options = buildBookingTimeOptions(
      openSlots.filter((slot) => slot.date === date),
      buildBookingConflictItemsForDate(date)
    );
    const nextOption = options.find((option) => option.conflictItems.length === 0) ?? options[0];

    setBookingDate(date);
    if (nextOption) {
      setBookingTime(nextOption.value);
    }
  }

  function openBookingDetail(booking: BookingRequest) {
    const suggestedOption = booking.status === "冲突" ? getFirstBookingSuggestion(booking) : null;

    setBookingDetailId(booking.id);
    setBookingAdjustStart(suggestedOption?.start ?? booking.start);
    setBookingAdjustEnd(suggestedOption?.end ?? booking.end);
  }

  async function adjustBooking(id: string, start = bookingAdjustStart, end = bookingAdjustEnd) {
    if (toMinutes(start) >= toMinutes(end)) {
      showToast("调整后的开始时间必须早于结束时间");
      return;
    }

    const snapshot = await runBackendAction("updateBooking", {
      bookingId: id,
      start,
      end
    });

    if (!snapshot) {
      showToast("调整失败，目标时段仍可能冲突");
      return;
    }

    const updatedBooking = snapshot.bookings?.find((booking) => booking.id === id);
    showToast(updatedBooking?.status === "冲突" ? "该时段仍有冲突，请继续调整" : "已调整预约时间，冲突解除");
  }

  async function approveBooking(id: string) {
    const snapshot = await runBackendAction("updateBooking", {
      bookingId: id,
      status: "已通过"
    });

    if (!snapshot) {
      showToast("通过失败，请先处理时间冲突");
      return;
    }

    setBookingDetailId(null);
    setBookingAuditOpen(false);
    setTeacherView("schedule");
    setScheduleSection("table");
    showToast("预约已通过，并写入排课总表");
  }

  async function adjustAndApproveBooking(id: string) {
    if (toMinutes(bookingAdjustStart) >= toMinutes(bookingAdjustEnd)) {
      showToast("调整后的开始时间必须早于结束时间");
      return;
    }

    const adjustedSnapshot = await runBackendAction("updateBooking", {
      bookingId: id,
      start: bookingAdjustStart,
      end: bookingAdjustEnd
    });
    const adjustedBooking = adjustedSnapshot?.bookings?.find((booking) => booking.id === id);

    if (!adjustedSnapshot || adjustedBooking?.status === "冲突") {
      showToast("调整后仍有冲突，请继续修改时间");
      return;
    }

    await approveBooking(id);
  }

  async function rejectBooking(id: string) {
    const snapshot = await runBackendAction("updateBooking", {
      bookingId: id,
      status: "已拒绝"
    });

    if (!snapshot) {
      showToast("拒绝失败，请重试");
      return;
    }

    setBookingDetailId(null);
    showToast("已拒绝该预约申请");
  }

  async function sendParentQuestion() {
    const title = parentQuestionTitle.trim();
    const body = parentQuestionBody.trim();

    if (!title) {
      showToast("请填写沟通标题");
      return;
    }

    if (title.length < 2 || title.length > 50) {
      showToast("沟通标题需为 2-50 字");
      return;
    }

    if (!body) {
      showToast("请说明具体问题");
      return;
    }

    if (body.length < 5 || body.length > 500) {
      showToast("具体情况需为 5-500 字");
      return;
    }

    const feedback = selectedParentFeedback;
    const snapshot = await runBackendAction("createMessageThread", {
      parent: selectedStudentRecord.parent,
      student: feedback.student,
      title,
      issueType: parentIssueType,
      linkedLesson: feedback.linkedLesson,
      body
    });

    if (!snapshot) {
      showToast("发送失败，请重试");
      return;
    }

    const createdThread = snapshot?.messageThreads?.[0];
    if (createdThread) {
      setActiveThreadId(createdThread.id);
    }
    setParentCommunicationOpen(false);
    setParentQuestionTitle("");
    setParentQuestionBody("");
    setRole("teacher");
    setTeacherView("messages");
    showToast("沟通已发送到教师端");
  }

  async function replyThread() {
    if (!activeThread) {
      return;
    }

    const body = teacherReplyDraft.trim();
    if (!body) {
      showToast("请输入回复内容");
      return;
    }

    if (body.length < 2 || body.length > 500) {
      showToast("回复内容需为 2-500 字");
      return;
    }

    const snapshot = await runBackendAction("replyMessageThread", {
      threadId: activeThread.id,
      body
    });
    if (!snapshot) {
      showToast("回复失败，请重试");
      return;
    }

    setTeacherReplyDraft("");
    showToast("已回复家长，沟通状态变为已确认");
  }

  function onDropSchedule(event: DragEvent<HTMLDivElement>, date: string, day: string, start: string, end: string) {
    event.preventDefault();
    const lessonId = event.dataTransfer.getData("lesson-id");
    if (!lessonId) {
      return;
    }
    setMoveResetStatus(true);
    setMoveTarget({ lessonId, date, day, start, end });
  }

  function beginPointerMove(event: PointerEvent<HTMLDivElement>, lesson: Lesson) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pointerMoveRef.current = {
      lessonId: lesson.id,
      date: lesson.date,
      start: lesson.start,
      x: event.clientX,
      y: event.clientY
    };
  }

  function updatePointerMove(event: PointerEvent<HTMLDivElement>) {
    const pendingMove = pointerMoveRef.current;
    if (!pendingMove) {
      return;
    }

    const distance = Math.hypot(event.clientX - pendingMove.x, event.clientY - pendingMove.y);
    if (distance > 8) {
      setDraggingLessonId(pendingMove.lessonId);
    }
  }

  function clearPointerMove() {
    pointerMoveRef.current = null;
    setDraggingLessonId(null);
  }

  function onPointerDropSchedule(event: PointerEvent<HTMLDivElement>, date: string, day: string, start: string, end: string) {
    const pendingMove = pointerMoveRef.current;
    if (!pendingMove) {
      return;
    }

    const distance = Math.hypot(event.clientX - pendingMove.x, event.clientY - pendingMove.y);
    const sameSlot = pendingMove.date === date && pendingMove.start === start;
    clearPointerMove();

    if (distance <= 8 || sameSlot) {
      return;
    }

    suppressCourseClickRef.current = true;
    window.setTimeout(() => {
      suppressCourseClickRef.current = false;
    }, 0);
    setMoveResetStatus(true);
    setMoveTarget({ lessonId: pendingMove.lessonId, date, day, start, end });
  }

  async function confirmMove(resetStatus: boolean) {
    if (!moveTarget) {
      return;
    }
    if (moveTargetConflicts.length) {
      showToast("目标时段已有课程或预约冲突，请重新拖动");
      return;
    }

    const snapshot = await runBackendAction("moveLesson", {
      lessonId: moveTarget.lessonId,
      date: moveTarget.date,
      day: moveTarget.day,
      start: moveTarget.start,
      end: moveTarget.end,
      resetStatus
    });
    if (!snapshot) {
      showToast("课程移动失败，请检查目标时段");
      return;
    }

    setMoveTarget(null);
    showToast(resetStatus ? "课程已移动，并重置为待上课" : "课程已移动，保留原完成状态");
  }

  function renderSidebar() {
    const groups = role === "teacher" ? teacherNavGroups : parentNavGroups;
    const isParent = role === "parent";
    const BrandIcon = isParent ? Users : ClipboardCheck;

    return (
      <aside className="flex w-full min-w-0 max-w-full shrink-0 flex-col overflow-hidden border-b border-zinc-200 bg-white lg:h-screen lg:w-[184px] lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-100 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-md bg-zinc-950 text-white shadow-sm">
              <BrandIcon className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-950">{isParent ? selectedStudentRecord.parent : "LessonLedger"}</p>
              <p className="text-xs text-zinc-500">{isParent ? "1 名绑定学生" : "教师桌面端"}</p>
            </div>
          </div>

          {!isParent ? (
            <div className="mt-3 grid grid-cols-2 rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={cn(
                  "h-7 rounded text-xs font-medium transition",
                  role === "teacher" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
                )}
              >
                教师端
              </button>
              <button
                type="button"
                onClick={() => setRole("parent")}
                className="h-7 rounded text-xs font-medium text-zinc-500 transition hover:text-zinc-900"
              >
                家长端
              </button>
            </div>
          ) : null}
        </div>

        <nav className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto px-2 py-3 lg:block lg:flex-1 lg:overflow-auto">
          {groups.map((group) => (
            <div key={group.label} className="flex shrink-0 gap-1 lg:mb-3 lg:block">
              <p className="mb-1.5 hidden px-2 text-[10px] font-semibold tracking-[0.12em] text-zinc-400 lg:block">{group.label}</p>
              <div className="flex gap-1 lg:block lg:space-y-1">
                {group.items.map((item, index) => {
                  const Icon = item.icon;
                  const active = role === "teacher" ? teacherNavActive === item.id : parentNavActive === item.id;
                  const visibleActive =
                    active &&
                    (!item.inset || (item.scheduleSection ? scheduleSection === item.scheduleSection : false));
                  return (
                    <button
                      type="button"
                      key={`${group.label}-${item.label}-${index}`}
                      onClick={() => {
                        if (role === "teacher") {
                          setTeacherView(item.id as TeacherView);
                          if (item.scheduleSection) {
                            setScheduleSection(item.scheduleSection);
                          }
                        } else {
                          setParentView(item.id as ParentView);
                        }
                      }}
                      className={cn(
                        "flex h-8 shrink-0 items-center gap-2 rounded-md border-l-2 text-xs font-medium transition lg:w-full",
                        item.inset ? "px-2 lg:px-7" : "px-2.5",
                        visibleActive && !item.inset ? "border-zinc-950 bg-zinc-100 text-zinc-950" : "border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
                        visibleActive && item.inset ? "bg-zinc-100 text-zinc-950" : ""
                      )}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
                        {item.inset ? <span className="size-3.5" /> : <Icon className="size-3.5 shrink-0" />}
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge ? (
                        <span className="ml-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-zinc-100 p-3 lg:block">
          <button
            type="button"
            onClick={() => {
              if (role === "teacher") {
                setTeacherView("account");
              } else {
                setParentView("profile");
              }
            }}
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 p-2.5 text-left transition hover:border-zinc-300 hover:bg-white"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-7 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-700">
                <User className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-950">{role === "teacher" ? "admin" : "家庭门户"}</p>
                <p className="truncate text-xs text-zinc-500">{role === "teacher" ? "Qrane" : selectedStudentRecord.parent}</p>
              </div>
              <ChevronDown className="size-4 shrink-0 text-zinc-400" />
            </div>
          </button>
        </div>
      </aside>
    );
  }

  function renderParentPortalHeader() {
    const navItems: Array<NavItem<ParentView>> = [
      { id: "home", label: "首页", icon: Home },
      { id: "courses", label: "课程", icon: FileText },
      { id: "billing", label: "账务", icon: CreditCard },
      { id: "feedback", label: "反馈", icon: MessageSquare },
      { id: "reports", label: "报告", icon: FileText },
      { id: "booking", label: "预约", icon: Calendar },
      { id: "parentMessages", label: "留言", icon: MessageCircle },
      { id: "profile", label: "我的资料", icon: User }
    ];

    return (
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <button type="button" onClick={() => setParentView("home")} className="flex min-w-0 items-center gap-3 text-left">
            <div className="grid size-8 shrink-0 place-items-center rounded-md bg-zinc-950 text-white shadow-sm">
              <Users className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-950">{selectedStudentRecord.parent}</p>
              <p className="truncate text-[11px] text-zinc-500">1 名绑定学生 · {selectedStudentRecord.name}</p>
            </div>
          </button>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <SecondaryButton icon={Calendar} className="h-8 px-3 text-xs" onClick={() => setParentView("booking")}>
              预约课程
            </SecondaryButton>
            <PrimaryButton icon={CreditCard} className="h-8 px-3 text-xs" onClick={() => setParentView("billing")}>
              查看账务
            </PrimaryButton>
            <button
              type="button"
              onClick={() => setRole("teacher")}
              className="h-8 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              教师端
            </button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[1120px] gap-1 overflow-x-auto px-3 pb-2.5 sm:px-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = parentNavActive === item.id;

            return (
              <button
                type="button"
                key={`parent-top-${item.id}`}
                onClick={() => setParentView(item.id)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition",
                  active ? "bg-zinc-950 text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                )}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>
    );
  }

  function renderDashboard() {
    const displayedDashboardTasks: Array<{
      icon: LucideIcon;
      title: string;
      desc: string;
      action: string;
      tone: string;
      click: () => void;
    }> = [];
    const firstLowBalanceStudent = lowBalanceStudents[0];
    const firstRenewalStudent = renewalStudents[0];
    const firstPendingFeedbackLesson = pendingFeedbackLessons[0];
    const firstPendingBooking = pendingBookingRequests[0];
    const firstPendingInvite = pendingFamilyInvites[0];
    const firstPendingReportStudent = pendingReportStudents[0];

    if (firstLowBalanceStudent) {
      displayedDashboardTasks.push({
        icon: AlertTriangle,
        title: "低余额提醒",
        desc: `${firstLowBalanceStudent.name}剩余 ${firstLowBalanceStudent.remainingLessons} 节课，建议提醒续费`,
        action: "去充值",
        tone: "bg-rose-50 text-rose-700",
        click: () => {
          setFinanceStudentId(firstLowBalanceStudent.id);
          setTeacherView("finance");
        }
      });
    }

    if (firstRenewalStudent) {
      displayedDashboardTasks.push({
        icon: CreditCard,
        title: "待续费学生",
        desc: `${firstRenewalStudent.name}剩余 ${firstRenewalStudent.remainingLessons} 节课，本周需关注课消`,
        action: "去续期",
        tone: "bg-amber-50 text-amber-700",
        click: () => {
          setFinanceStudentId(firstRenewalStudent.id);
          setTeacherView("finance");
        }
      });
    }

    if (firstPendingFeedbackLesson) {
      displayedDashboardTasks.push({
        icon: Sparkles,
        title: "课后反馈",
        desc: `${firstPendingFeedbackLesson.student}${firstPendingFeedbackLesson.subject}课程待生成反馈`,
        action: "去反馈",
        tone: "bg-blue-50 text-blue-700",
        click: () => openFeedback(firstPendingFeedbackLesson.id)
      });
    }

    if (firstPendingBooking) {
      displayedDashboardTasks.push({
        icon: Clock,
        title: firstPendingBooking.status === "冲突" ? "预约冲突" : "预约待审核",
        desc: `${firstPendingBooking.date} ${firstPendingBooking.start}-${firstPendingBooking.end} · ${firstPendingBooking.student}`,
        action: "处理",
        tone: "bg-slate-100 text-slate-700",
        click: openBookingAudit
      });
    }

    if (firstPendingInvite) {
      displayedDashboardTasks.push({
        icon: ShieldCheck,
        title: "家庭账号待激活",
        desc: `${firstPendingInvite.parentName ?? firstPendingInvite.studentName ?? "家长"}邀请链接尚未激活`,
        action: "复制邀请",
        tone: "bg-emerald-50 text-emerald-700",
        click: () => {
          if (firstPendingInvite.studentId) {
            void createInvite(firstPendingInvite.studentId);
          } else {
            void createInvite();
          }
        }
      });
    }

    if (displayedDashboardTasks.length < 5 && firstPendingReportStudent) {
      displayedDashboardTasks.push({
        icon: FileText,
        title: "学习报告待生成",
        desc: `${firstPendingReportStudent.name}还没有已保存学习报告`,
        action: "生成",
        tone: "bg-violet-50 text-violet-700",
        click: () => {
          setSelectedStudentId(firstPendingReportStudent.id);
          openStudyReportGenerator();
        }
      });
    }

    const dashboardTasks = displayedDashboardTasks.slice(0, 5);
    const dashboardTaskIconClass = (tone: string) => {
      if (tone.includes("rose")) return "text-rose-700";
      if (tone.includes("amber")) return "text-amber-700";
      if (tone.includes("blue")) return "text-blue-700";
      if (tone.includes("emerald")) return "text-emerald-700";
      if (tone.includes("violet")) return "text-violet-700";
      return "text-slate-600";
    };
    const pendingCount =
      lowBalanceStudents.length +
      renewalStudents.length +
      pendingFeedbackLessons.length +
      pendingBookingRequests.length +
      pendingFamilyInvites.length +
      pendingReportStudents.length;
    const stats = [
      {
        label: "本周课程",
        value: "21节",
        helper: "13时19节",
        sub: "结束2节",
        dot: "bg-blue-500"
      },
      {
        label: "本月实收",
        value: formatCurrency(monthlyIncome),
        helper: "待收 ¥3,000",
        sub: "2笔待处理",
        dot: "bg-rose-500"
      },
      {
        label: "账户风险",
        value: "3人",
        helper: "低余额1人",
        sub: "待续2人",
        dot: "bg-amber-500"
      }
    ];
    const weekBars = scheduleDays.map((day) => [day.day.replace("周", ""), lessons.filter((lesson) => lesson.date === day.date).length] as const);
    const maxWeekBarCount = Math.max(1, ...weekBars.map(([, count]) => count));

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">2026年6月13日 周六</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal text-zinc-950">您好，Qrane老师，今天有 {todayLessons.length} 节课</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton icon={Plus} onClick={openStudentCreator}>
              新建学生
            </SecondaryButton>
            <SecondaryButton icon={Calendar} onClick={() => openTeacherSchedule("table")}>
              去排课
            </SecondaryButton>
            <PrimaryButton icon={Wallet} onClick={() => setTeacherView("finance")}>
              记录收款
            </PrimaryButton>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {stats.map((item) => (
            <section key={item.label} className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold leading-none text-slate-950">{item.value}</p>
                </div>
                <span className={cn("mt-1 size-2 rounded-full", item.dot)} />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">{item.helper}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-500">{item.sub}</span>
              </div>
            </section>
          ))}
        </div>

        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_286px]">
          <Section
            title="今日日程"
            subtitle="按当前系统时间区分待确认、进行中、即将开始和稍后开始，点击可编辑确认状态。"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">共 {todayLessons.length} 节</span>
                <SecondaryButton icon={Plus} className="h-8 px-3 text-xs" onClick={() => openCourseCreator()}>
                  新增课程
                </SecondaryButton>
              </div>
            }
          >
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
              <div className="hidden grid-cols-[72px_minmax(0,1fr)_86px_auto] border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-500 xl:grid">
                <span>时间</span>
                <span>课程</span>
                <span>状态</span>
                <span className="text-right">操作</span>
              </div>
              <div className="divide-y divide-slate-100">
              {todayLessons.map((lesson) => {
                const lessonDuration = toMinutes(lesson.end) - toMinutes(lesson.start);
                const lessonClass = classList.find((classItem) => classItem.name === lesson.student);
                const lessonMemberCount = lesson.kind === "班课" ? lessonClass?.members.length ?? 0 : 1;
                const inProgress = lesson.status === "待点名";
                const isFinished = lesson.status === "已上课" || lesson.status === "已反馈" || lesson.status === "已点名";
                const isTerminalStatus = lesson.status === "已取消" || lesson.status === "学生缺席";
                const needsFeedback = (lesson.status === "已上课" || lesson.status === "已点名" || lesson.status === "已反馈") && lesson.feedbackStatus !== "已发送";
                const scheduleStatus = isTerminalStatus
                  ? lesson.status
                  : needsFeedback
                    ? "待反馈"
                    : isFinished
                      ? "已确认完成"
                      : lesson.status === "待点名"
                        ? "待点名"
                        : "稍后开始";
                const rowStart = lesson.start;
                const rowEnd = lesson.end;
                const rowStudent = lesson.student;
                const rowSubject = lesson.subject;
                const rowTag = lesson.kind === "班课" ? "小班课" : "线下机构";
                const rowDetail = `${lessonDuration}分钟 · ${lesson.kind === "班课" ? `${lessonMemberCount}人小班` : "1对1"} · ${scheduleStatus}`;
                const statusTone = scheduleStatus === "待反馈" ? "border-amber-200 bg-amber-50 text-amber-700" : inProgress ? "border-blue-200 bg-blue-50 text-blue-700" : statusClass(lesson.status);
                const statusActionClass = "inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md border px-2 text-[11px] font-medium transition";

                return (
                  <div
                    key={lesson.id}
                    className={cn(
                      "relative grid gap-2 bg-white px-3 py-1.5 transition xl:grid-cols-[72px_minmax(0,1fr)_86px_auto] xl:items-center",
                      inProgress ? "bg-blue-50/55" : "hover:bg-slate-50"
                    )}
                  >
                    {inProgress ? <div className="absolute left-0 top-2 h-[calc(100%-16px)] w-1 rounded-r-full bg-blue-500" /> : null}
                    <div className="pl-1">
                      <p className="text-[13px] font-semibold leading-tight text-slate-950">{rowStart}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{rowEnd}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[13px] font-semibold text-slate-950">{rowStudent}</h3>
                        <span className="text-xs font-medium text-blue-600">{rowSubject}</span>
                        <Pill className="h-6 border-slate-200 bg-white px-2 text-slate-600">{rowTag}</Pill>
                        {lesson.feedbackStatus !== "未生成" ? (
                          <Pill className={cn("h-6 px-2", statusClass(lesson.feedbackStatus))}>{lesson.feedbackStatus}</Pill>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{rowDetail}</p>
                    </div>
                    <div className="flex items-center justify-start xl:justify-start">
                      <Pill className={cn("h-6 px-2", statusTone)}>
                        {scheduleStatus}
                      </Pill>
                    </div>
                    <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                      {lesson.kind === "班课" && !isTerminalStatus && lesson.status !== "已点名" && lesson.status !== "已反馈" ? (
                        <PrimaryButton icon={ClipboardCheck} className="h-7 px-2 text-[11px]" onClick={() => openAttendance(lesson.id)}>
                          开始点名
                        </PrimaryButton>
                      ) : needsFeedback || lesson.feedbackStatus !== "未生成" ? (
                        <PrimaryButton icon={Sparkles} className="h-7 px-2 text-[11px]" onClick={() => openFeedback(lesson.id)}>
                          去反馈
                        </PrimaryButton>
                      ) : isTerminalStatus ? (
                        <span className="text-xs font-medium text-slate-400">已记录</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openLessonStatusConfirm(lesson.id, "已上课")}
                            className={cn(statusActionClass, "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}
                          >
                            已上课
                          </button>
                          <button
                            type="button"
                            onClick={() => openLessonStatusConfirm(lesson.id, "学生缺席")}
                            className={cn(statusActionClass, "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100")}
                          >
                            学生缺席
                          </button>
                          <button
                            type="button"
                            onClick={() => openLessonStatusConfirm(lesson.id, "已取消")}
                            className={cn(statusActionClass, "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
                          >
                            取消
                          </button>
                        </>
                      )}
                      <SecondaryButton className="h-7 px-2 text-[11px]" onClick={() => openCourseEditor(lesson)}>编辑</SecondaryButton>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </Section>

          <div className="space-y-3">
            <Section
              title="今日待处理"
              action={
                <button
                  type="button"
                  onClick={() => openTeacherSchedule("table")}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-500"
                >
                  展开 共{pendingCount}条
                </button>
              }
            >
              <div className="space-y-2">
                {dashboardTasks.map((task) => {
                  const Icon = task.icon;

                  return (
                    <button
                      type="button"
                      key={task.title}
                      onClick={task.click}
                      className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-slate-200 border-l-2 border-l-rose-300 bg-white px-2.5 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Icon className={cn("size-3.5 shrink-0", dashboardTaskIconClass(task.tone))} />
                          <p className="truncate text-[13px] font-medium text-slate-950">{task.title}</p>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{task.desc}</p>
                      </div>
                      <span className="rounded-md bg-rose-700 px-2 py-1 text-[11px] font-medium text-white">{task.action}</span>
                    </button>
                  );
                })}
                {!dashboardTasks.length ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    今日暂无待处理事项，课程、反馈、预约和家庭账号都已同步。
                  </div>
                ) : null}
              </div>
            </Section>

            <Section title="本周概览">
              <div className="flex h-36 items-end justify-between gap-2">
                {weekBars.map(([day, count]) => (
                  <div key={day} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-20 w-full items-end rounded-md bg-slate-100 px-1">
                      <div className="w-full rounded-md bg-blue-500" style={{ height: `${count === 0 ? 12 : Math.max(24, (count / maxWeekBarCount) * 100)}%` }} />
                    </div>
                    <p className="text-xs font-medium text-slate-500">{day}</p>
                    <p className="text-[11px] text-slate-400">{count}节</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    );
  }

  function renderStudyReportDetail(report: StudyReport, compact = false) {
    const visibleSummary = report.parentSummary?.trim() || report.summary;
    const latestScore = report.scoreTrend[0];
    const scorePercent = (score: string) => {
      const [valueRaw, totalRaw] = score.split("/").map((part) => Number(part.trim()));
      return Number.isFinite(valueRaw) && Number.isFinite(totalRaw) && totalRaw > 0 ? Math.round((valueRaw / totalRaw) * 100) : 0;
    };
    const reportSourceRows = [
      { label: "反馈记录", value: `${report.feedbackHighlights.length} 条`, note: report.feedbackHighlights[0] ?? "暂无反馈摘要" },
      { label: "成绩样本", value: `${report.scoreTrend.length} 次`, note: latestScore ? `${latestScore.exam} ${latestScore.score}` : "暂无成绩记录" },
      { label: "薄弱点", value: `${report.weaknessSummary.length} 项`, note: report.weaknessSummary[0]?.tag ?? "暂无薄弱点记录" },
      { label: "家长可见", value: report.visibleToParent ? "已同步" : "保存后同步", note: report.savedAt ? formatDateTimeLabel(report.savedAt) : "待老师确认保存" }
    ];

    return (
      <div className={cn("grid gap-3", compact ? "xl:grid-cols-[270px_minmax(0,1fr)]" : "xl:grid-cols-[300px_minmax(0,1fr)]")}>
        <aside className="min-w-0 space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill className={report.status === "已保存" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                {report.status}
              </Pill>
              <Pill className={report.visibleToParent ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"}>
                {report.visibleToParent ? "家长可见" : "保存后可见"}
              </Pill>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-950">{report.title}</p>
            <p className="mt-1 text-xs text-slate-500">{report.period}</p>
            <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              {report.dataQuality === "数据充足" ? "报告已综合成绩、薄弱点和课程反馈。" : "数据较少，当前报告仅供阶段沟通参考。"}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">生成依据</div>
            <div className="divide-y divide-slate-100">
              {reportSourceRows.map((row) => (
                <div key={row.label} className="px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">{row.label}</p>
                    <p className="text-sm font-semibold text-slate-950">{row.value}</p>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{row.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-500">来源标签</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {report.sources.map((source) => (
                <Pill key={source} className="border-slate-200 bg-slate-50 text-slate-600">{source}</Pill>
              ))}
            </div>
          </div>
        </aside>

        <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">阶段学习报告</p>
                <h3 className="mt-1 text-base font-semibold text-slate-950">{report.title}</h3>
              </div>
              <Pill className={report.dataQuality === "数据充足" ? "border-emerald-200 bg-white text-emerald-700" : "border-amber-200 bg-white text-amber-700"}>
                {report.dataQuality}
              </Pill>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <section className="rounded-md border border-blue-100 bg-blue-50 p-3">
              <p className="text-sm font-semibold text-slate-950">一、阶段摘要</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{visibleSummary}</p>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">二、成绩波动</p>
                {latestScore ? <span className="text-xs text-slate-500">最近一次：{latestScore.score}</span> : null}
              </div>
              {report.scoreTrend.length ? (
                <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
                  <div className="grid min-w-[640px] grid-cols-[88px_130px_92px_90px_1fr] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                    <span>日期</span>
                    <span>考试</span>
                    <span>成绩</span>
                    <span>排名</span>
                    <span>考试情况</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {report.scoreTrend.map((score) => {
                      const percent = scorePercent(score.score);

                      return (
                        <div key={`${score.exam}-${score.date}`} className="grid min-w-[640px] grid-cols-[88px_130px_92px_90px_1fr] items-center gap-0 px-3 py-2.5 text-sm">
                          <span className="font-medium text-slate-900">{score.date}</span>
                          <span className="text-slate-700">{score.exam}</span>
                          <span className="font-semibold text-blue-700">{score.score}</span>
                          <span className="text-slate-600">{score.rank}</span>
                          <span className="min-w-0 text-xs leading-5 text-slate-500">
                            <span className="mr-2 inline-block h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 align-middle">
                              <span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.max(8, Math.min(100, percent))}%` }} />
                            </span>
                            {score.note}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">暂无成绩记录，报告会先基于课程反馈和薄弱点生成。</div>
              )}
            </section>

            <section>
              <p className="text-sm font-semibold text-slate-950">三、薄弱点与后续加强</p>
              {report.weaknessSummary.length ? (
                <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
                  <div className="grid min-w-[560px] grid-cols-[170px_90px_1fr] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                    <span>薄弱点</span>
                    <span>级别</span>
                    <span>后续加强</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {report.weaknessSummary.map((weakness) => (
                      <div key={weakness.tag} className="grid min-w-[560px] grid-cols-[170px_90px_1fr] items-center px-3 py-2.5 text-sm">
                        <span className="font-medium text-slate-900">{weakness.tag}</span>
                        <Pill className={cn("w-fit", statusClass(weakness.level))}>{weakness.level}</Pill>
                        <span className="text-xs leading-5 text-slate-600">{weakness.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">暂无薄弱点记录，建议老师先补充知识点或解题方法统计。</div>
              )}
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-950">四、近期反馈综合</p>
                <div className="mt-2 space-y-2">
                  {report.feedbackHighlights.map((highlight) => (
                    <p key={highlight} className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">{highlight}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-950">五、报告结论</p>
                <div className="mt-2 space-y-2">
                  {report.sections.map((section) => (
                    <div key={section.title} className="rounded-md bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-900">{section.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{section.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-900">六、后续巩固方向</p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {report.suggestions.map((suggestion, index) => (
                  <p key={suggestion} className="rounded-md border border-emerald-100 bg-white px-3 py-2 text-xs leading-5 text-emerald-800">
                    <span className="mr-1 font-semibold">#{index + 1}</span>{suggestion}
                  </p>
                ))}
              </div>
            </section>
          </div>
        </article>
      </div>
    );
  }

  function renderStudyReportPreview(report: StudyReport) {
    const parentSummary = reportParentSummary.trim() || report.parentSummary?.trim() || report.summary;
    const latestScore = report.scoreTrend[0];

    return (
      <article className="rounded-lg border border-slate-200 bg-white text-sm leading-7 text-slate-700">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">报告预览</p>
          <p className="mt-1 text-base font-semibold text-slate-950">{report.title}</p>
          <p className="mt-1 text-xs text-slate-500">{report.period} · {report.dataQuality}</p>
        </div>

        <div className="max-h-[52vh] space-y-5 overflow-y-auto px-5 py-4">
          <section>
            <p className="font-semibold text-slate-950">一、阶段学习概况</p>
            <p className="mt-2">{report.summary}</p>
            <p className="mt-2">
              从整体趋势看，{selectedStudentRecord.name} 近期围绕{selectedStudentRecord.focus}持续学习，
              {latestScore ? `最近一次记录为 ${latestScore.exam} ${latestScore.score}，排名 ${latestScore.rank}。` : "目前成绩样本仍在持续补充。"}
              这说明当前既有稳定积累，也有需要继续巩固的关键环节。
            </p>
          </section>

          <section>
            <p className="font-semibold text-slate-950">二、近期成绩与表现</p>
            <p className="mt-2">以下是最近几次重要考试或测评的成绩记录，可以从中看到孩子数学学习的基本轨迹：</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              {report.scoreTrend.map((score) => (
                <li key={`${score.exam}-${score.date}`}>
                  <span className="font-semibold text-slate-900">{score.date} {score.exam}：</span>
                  {score.score}，班级排名 {score.rank}。{score.note}
                </li>
              ))}
            </ul>
            <p className="mt-2">
              从整体趋势看，孩子的基础知识掌握比较扎实，几次成绩虽有波动，但总体处于可继续推进的状态。
              其中最近一次成绩和排名有明显提升，是一个积极信号。
            </p>
          </section>

          <section>
            <p className="font-semibold text-slate-950">三、当前薄弱点</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              {report.weaknessSummary.map((weakness) => (
                <li key={weakness.tag}>
                  <span className="font-semibold text-slate-900">{weakness.tag}：</span>
                  {weakness.action}（关注级别：{weakness.level}）。
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="font-semibold text-slate-950">四、课堂反馈与巩固建议</p>
            <p className="mt-2">{report.feedbackHighlights.join("；")}。</p>
            <div className="mt-2 space-y-2">
              {report.sections.slice(0, 4).map((section) => (
                <p key={section.title}>
                  <span className="font-semibold text-slate-900">{section.title}：</span>{section.body}
                </p>
              ))}
            </div>
          </section>

          <section>
            <p className="font-semibold text-slate-950">五、家长可见摘要</p>
            <p className="mt-2">{parentSummary}</p>
          </section>
        </div>
      </article>
    );
  }

  function renderStudents() {
    const selectedStudent = selectedStudentRecord;
    const selectedStudentScores = selectedScores;
    const selectedStudentWeaknesses = selectedWeaknesses;
    const selectedStudentLessons = lessons.filter((lesson) => lesson.student === selectedStudent.name);
    const selectedStudentFinanceEvents = financeEvents.filter((row) => row.studentId === selectedStudent.id || row.studentName === selectedStudent.name);
    const selectedStudentReports = studyReports.filter((report) => report.studentId === selectedStudent.id);
    const selectedStudentPaidTotal = selectedStudentFinanceEvents.reduce((sum, row) => sum + financeCashValue(row), 0);
    const selectedStudentPaymentCount = selectedStudentFinanceEvents.filter((row) => financeCashValue(row) > 0).length;
    const selectedStudentDeductedLessons = selectedStudentFinanceEvents
      .filter((row) => row.action === "扣课")
      .reduce((sum, row) => sum + Math.abs(Math.min(0, parseLessonAmount(row.amount))), 0);
    type StudentServiceMeta = {
      subject: string;
      billingType: string;
      billingTone: "settle" | "stable" | "empty";
      billingLabel: string;
      billingValue: string;
      billingProgress: number;
      billingCount: string;
      billingHint: string;
      nextLabel: string;
      nextTime: string;
      nextHint: string;
      status: string;
    };
    const studentServiceMeta: Record<string, StudentServiceMeta> = {
      s1: {
        subject: "高二 · 数学",
        billingType: "按次后付",
        billingTone: "settle",
        billingLabel: "待结金额",
        billingValue: "¥1000",
        billingProgress: 40,
        billingCount: "2 / 5 次",
        billingHint: "建议尽快结算",
        nextLabel: "今天 12:00",
        nextTime: "12:00 - 14:00",
        nextHint: "可直接从卡片发起排课",
        status: "在读"
      },
      s2: {
        subject: "初三 · 数学",
        billingType: "按次后付",
        billingTone: "settle",
        billingLabel: "待结金额",
        billingValue: "¥2000",
        billingProgress: 80,
        billingCount: "4 / 5 次",
        billingHint: "建议尽快结算",
        nextLabel: "暂未排课",
        nextTime: "可直接从卡片发起排课",
        nextHint: "家长刚提交假期预约",
        status: "在读"
      },
      s3: {
        subject: "高一 · 数学",
        billingType: "预付课时",
        billingTone: "stable",
        billingLabel: "剩余课次",
        billingValue: "13 次",
        billingProgress: 100,
        billingCount: "100%",
        billingHint: "余额充足",
        nextLabel: "今天 14:00",
        nextTime: "14:00 - 16:00",
        nextHint: "账户稳定，可正常上课",
        status: "在读"
      }
    };
    const defaultServiceMeta = (student: Student): StudentServiceMeta => ({
      subject: `${student.grade} · 数学`,
      billingType: "预付课时",
      billingTone: student.remainingLessons > 3 ? "stable" : "settle",
      billingLabel: student.remainingLessons > 3 ? "剩余课次" : "课时提醒",
      billingValue: `${student.remainingLessons} 次`,
      billingProgress: Math.min(100, Math.max(10, student.remainingLessons * 8)),
      billingCount: `${student.remainingLessons} 次`,
      billingHint: student.remainingLessons > 3 ? "余额充足" : "建议尽快续课",
      nextLabel: "暂未排课",
      nextTime: "可直接从卡片发起排课",
      nextHint: "新增后可继续补充成绩、薄弱点和家庭账号",
      status: "在读"
    });
    const selectedServiceMeta = studentServiceMeta[selectedStudent.id] ?? defaultServiceMeta(selectedStudent);
    const familyAccountStatus = selectedFamilyInvite?.status ?? "未生成";
    const currentStudentTabLabel = studentTabs.find((tab) => tab.id === studentTab)?.label ?? "成绩";
    const familyStatusClass = (status: string) => {
      if (status === "已启用" || status === "已激活") return "border-emerald-200 bg-emerald-50 text-emerald-700";
      if (status === "待激活" || status === "未生成") return "border-amber-200 bg-amber-50 text-amber-700";
      if (status === "已过期") return "border-rose-200 bg-rose-50 text-rose-700";
      if (status === "已禁用" || status === "已失效") return "border-zinc-200 bg-zinc-50 text-zinc-500";
      return "border-slate-200 bg-slate-50 text-slate-600";
    };
    const selectedFamilyRows = [
      {
        id: "primary",
        account: selectedStudent.parent,
        phone: familyAccountStatus === "已激活" ? "11111111111" : "激活时填写手机号",
        student: selectedStudent.name,
        status: familyAccountStatus,
        expiresAt: selectedFamilyInvite?.expiresAt,
        action: familyAccountStatus === "已激活" ? "查看门户" : "复制邀请"
      },
      {
        id: "demo-active",
        account: "张三妈妈",
        phone: "11111111111",
        student: "李三",
        status: "已启用",
        expiresAt: undefined,
        action: "授权通知"
      },
      {
        id: "pending-demo",
        account: "待激活",
        phone: "未填写手机号",
        student: selectedStudent.name,
        status: "待激活",
        expiresAt: selectedFamilyInvite?.expiresAt,
        action: "复制邀请"
      },
      {
        id: "disabled-demo",
        account: "已禁用",
        phone: "待激活",
        student: selectedStudent.name,
        status: "已禁用",
        expiresAt: undefined,
        action: "禁用账号"
      }
    ];
    const studentTabContent: Record<StudentTab, ReactNode> = {
      scores: (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">成绩记录</h3>
              <p className="mt-0.5 text-xs text-slate-500">考试、分数、排名和情况集中记录。</p>
            </div>
            <SecondaryButton icon={Plus} className="h-8 px-3 text-xs" onClick={openScoreCreator}>新增成绩</SecondaryButton>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[120px_90px_120px_110px_1fr_74px] border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-500">
                <span>考试</span>
                <span>日期</span>
                <span>成绩</span>
                <span>排名</span>
                <span>考试情况</span>
                <span className="text-right">操作</span>
              </div>
            {selectedStudentScores.map((row) => (
              <button
                type="button"
                key={`${row.exam}-${row.date}`}
                onClick={() => openScoreEditor(row)}
                  className="grid w-full grid-cols-[120px_90px_120px_110px_1fr_74px] items-center border-b border-slate-100 px-4 py-3 text-left text-sm transition hover:bg-slate-50"
              >
                  <span className="font-medium text-slate-950">{row.exam}</span>
                  <span className="text-slate-500">{row.date}</span>
                  <span className="font-semibold text-slate-950">{row.score}</span>
                  <span className="text-slate-600">{row.rank}</span>
                  <span className="truncate text-slate-600">{row.note}</span>
                  <span className="text-right text-xs font-medium text-slate-500">编辑</span>
              </button>
            ))}
            {!selectedStudentScores.length ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                暂无成绩记录
              </div>
            ) : null}
            </div>
          </div>
        </div>
      ),
      weakness: (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">薄弱点统计</h3>
              <p className="mt-0.5 text-xs text-slate-500">知识点、来源和加强动作按行维护。</p>
            </div>
            <SecondaryButton icon={Plus} className="h-8 px-3 text-xs" onClick={openWeaknessCreator}>新增薄弱点</SecondaryButton>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[180px_90px_150px_1fr_74px] border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-500">
                <span>薄弱点</span>
                <span>级别</span>
                <span>来源</span>
                <span>后续加强</span>
                <span className="text-right">操作</span>
              </div>
            {selectedStudentWeaknesses.map((row) => (
                <div key={row.tag} className="grid grid-cols-[180px_90px_150px_1fr_74px] items-center border-b border-slate-100 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-950">{row.tag}</p>
                    <p className="mt-0.5 text-xs text-slate-500">知识点 / 解题方法</p>
                </div>
                <Pill className={row.level === "重点" ? "w-fit border-rose-200 bg-rose-50 text-rose-700" : "w-fit border-amber-200 bg-amber-50 text-amber-700"}>{row.level}</Pill>
                  <p className="text-slate-600">{row.source}</p>
                  <p className="truncate text-slate-700">{row.action}</p>
                <SecondaryButton className="h-8 w-fit px-3 text-xs" onClick={() => openWeaknessEditor(row)}>编辑</SecondaryButton>
              </div>
            ))}
            {!selectedStudentWeaknesses.length ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                暂无薄弱点记录
              </div>
            ) : null}
            </div>
          </div>
        </div>
      ),
      reports: (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">学习报告</h3>
                <p className="mt-0.5 text-xs text-slate-500">综合反馈、成绩、薄弱点和课程记录，确认保存后家长端可见。</p>
              </div>
              <PrimaryButton icon={Bot} className="h-8 px-3 text-xs" onClick={openStudyReportGenerator}>生成报告</PrimaryButton>
            </div>
            <div className="overflow-x-auto">
              <div className="grid min-w-[760px] grid-cols-[minmax(220px,1.1fr)_170px_180px_150px_88px] bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                <span>报告</span>
                <span>周期</span>
                <span>生成依据</span>
                <span>状态</span>
                <span className="text-right">操作</span>
              </div>
              <div className="divide-y divide-slate-100">
                {selectedStudentReports.map((report) => {
                  const active = report.id === currentStudyReport.id;

                  return (
                    <div key={report.id} className={cn("grid min-w-[760px] grid-cols-[minmax(220px,1.1fr)_170px_180px_150px_88px] items-center px-4 py-3 text-sm", active ? "bg-blue-50/60" : "bg-white")}>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950">{report.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{report.dataQuality}</p>
                      </div>
                      <p className="text-xs text-slate-600">{report.period}</p>
                      <p className="truncate text-xs text-slate-600">{report.sources.join(" / ") || "学生档案"}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Pill className={report.status === "待生成" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>{report.status}</Pill>
                        <Pill className={report.visibleToParent ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"}>
                          {report.visibleToParent ? "家长可见" : "保存后可见"}
                        </Pill>
                      </div>
                      <div className="text-right">
                        <SecondaryButton className="h-7 px-2.5 text-xs" onClick={() => setSelectedReportId(report.id)}>
                          {active ? "当前" : "查看"}
                        </SecondaryButton>
                      </div>
                    </div>
                  );
                })}
                {!selectedStudentReports.length ? (
                  <div className="min-w-[760px] px-4 py-8 text-center text-sm text-slate-500">
                    暂无学习报告，可基于近期记录生成。
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-slate-950">本次生成来源</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-blue-100 bg-white p-2">
                <p className="text-slate-500">成绩记录</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{selectedStudentScores.length} 次</p>
              </div>
              <div className="rounded-md border border-blue-100 bg-white p-2">
                <p className="text-slate-500">薄弱点</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{selectedStudentWeaknesses.length} 项</p>
              </div>
              <div className="rounded-md border border-blue-100 bg-white p-2">
                <p className="text-slate-500">课程记录</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{selectedStudentLessons.length} 节</p>
              </div>
              <div className="rounded-md border border-blue-100 bg-white p-2">
                <p className="text-slate-500">已保存报告</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{selectedStudentReports.filter((report) => report.status === "已保存").length} 份</p>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-xs leading-5 text-slate-700">
              <p className="rounded-md bg-white/80 px-3 py-2">最近三次考试：{selectedStudentScores.slice(0, 3).map((score) => score.score).join("、") || "暂无成绩记录"}。</p>
              <p className="rounded-md bg-white/80 px-3 py-2">当前薄弱点：{selectedStudentWeaknesses.slice(0, 4).map((weakness) => weakness.tag).join("、") || "暂无薄弱点记录"}。</p>
              <p className="rounded-md bg-white/80 px-3 py-2">最近课程反馈：{currentStudyReport.feedbackHighlights[0]}</p>
            </div>
          </div>

          <div className="min-w-0 xl:col-span-2">
            {renderStudyReportDetail(currentStudyReport, true)}
          </div>
        </div>
      ),
      lessons: (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">学生课程记录</h3>
              <p className="mt-0.5 text-xs text-slate-500">排课、状态、反馈和操作集中在同一张流水表。</p>
            </div>
            <PrimaryButton className="h-8 px-3 text-xs" onClick={() => openTeacherSchedule("table")}>全部课程</PrimaryButton>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs">
            <Pill className="border-slate-200 bg-white text-slate-600">总课次 {selectedStudentLessons.length || 9}</Pill>
            <Pill className="border-emerald-200 bg-emerald-50 text-emerald-700">已完成 {selectedStudentLessons.filter((lesson) => lesson.status === "已上课" || lesson.status === "已反馈").length || 2}</Pill>
            <Pill className="border-blue-200 bg-blue-50 text-blue-700">待上课 {selectedStudentLessons.filter((lesson) => lesson.status === "待上课" || lesson.status === "待点名").length || 7}</Pill>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[96px_120px_1fr_92px_92px_150px] border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-500">
                <span>日期</span>
                <span>时间</span>
                <span>课程</span>
                <span>类型</span>
                <span>状态</span>
                <span className="text-right">操作</span>
              </div>
            {(selectedStudentLessons.length ? selectedStudentLessons : recentLessons).map((lesson) => (
                <div key={lesson.id} className="grid grid-cols-[96px_120px_1fr_92px_92px_150px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
                <div>
                    <p className="font-medium text-slate-950">{lesson.date}</p>
                  <p className="text-xs text-slate-500">{lesson.day}</p>
                </div>
                <div>
                    <p className="font-medium text-slate-950">{lesson.start}</p>
                    <p className="text-xs text-slate-500">{lesson.end}</p>
                </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-950">{lesson.subject}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{lesson.student} · {lesson.feedbackStatus}</p>
                  </div>
                  <Pill className="w-fit border-slate-200 bg-slate-50 text-slate-600">{lesson.kind}</Pill>
                  <Pill className={statusClass(lesson.status)}>{lesson.status}</Pill>
                  <div className="flex justify-end gap-2">
                    <SecondaryButton className="h-7 px-2 text-[11px]" onClick={() => showToast("已打开课程编辑")}>编辑</SecondaryButton>
                    <button
                      type="button"
                      onClick={() => showToast("演示版不删除课程")}
                      className="inline-flex h-7 items-center rounded-md border border-rose-100 bg-white px-2 text-[11px] font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      删除
                    </button>
                </div>
              </div>
            ))}
              {!(selectedStudentLessons.length ? selectedStudentLessons : recentLessons).length ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">暂无课程记录</div>
              ) : null}
            </div>
          </div>
        </div>
      ),
      payments: (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
              <div>
              <h3 className="text-sm font-semibold text-slate-950">收款与课时流水</h3>
              <p className="mt-0.5 text-xs text-slate-500">每一次充值、扣课、撤销和余额变化都保留在同一张表。</p>
              </div>
              <SecondaryButton
                icon={Plus}
              className="h-8 px-3 text-xs"
                onClick={() => {
                  setFinanceStudentId(selectedStudent.id);
                  setFinanceModalOpen(true);
                }}
              >
                记录收款
              </SecondaryButton>
            </div>
          <div className="grid border-b border-slate-100 bg-slate-50 md:grid-cols-5">
            {[
              ["默认单价", "¥500", selectedServiceMeta.billingType],
              ["每节时长", "120 分钟", "默认扣 1 课时 / 节"],
              ["累计完成", `${Number(selectedStudentDeductedLessons.toFixed(1)) || 2} 节`, "待上课 7 节"],
              ["剩余课次", `${selectedStudent.remainingLessons} 节`, "当前余额"],
              ["已收金额", formatCurrency(selectedStudentPaidTotal), `${selectedStudentPaymentCount} 笔收款`]
            ].map(([label, value, desc]) => (
              <div key={label} className="border-b border-slate-100 px-4 py-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                <p className="text-[11px] text-slate-500">{label}</p>
                <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[96px_88px_120px_120px_120px_1fr_84px] border-b border-slate-100 bg-white px-4 py-2 text-[11px] font-medium text-slate-500">
                <span>日期</span>
                <span>类型</span>
                <span>课时变化</span>
                <span>收款金额</span>
                <span>余额</span>
                <span>备注</span>
                <span className="text-right">操作</span>
            </div>
              {selectedStudentFinanceEvents.map((row, index) => {
                const cashValue = financeCashValue(row);

                return (
                  <div key={`${row.date}-${row.action}-${row.balance}-${index}`} className="grid grid-cols-[96px_88px_120px_120px_120px_1fr_84px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
                    <span className="font-medium text-slate-950">{row.date}</span>
                    <Pill className={row.action === "充值" ? "w-fit border-emerald-200 bg-emerald-50 text-emerald-700" : row.action === "撤销" ? "w-fit border-blue-200 bg-blue-50 text-blue-700" : "w-fit border-amber-200 bg-amber-50 text-amber-700"}>{row.action}</Pill>
                    <span className={cn("font-semibold", row.amount.startsWith("+") ? "text-emerald-700" : "text-amber-700")}>{row.amount}</span>
                    <span className="font-medium text-slate-950">{row.cashAmount ?? (cashValue ? formatCurrency(cashValue) : "—")}</span>
                    <span className="text-slate-600">{row.balance}</span>
                    <span className="truncate text-slate-600">{row.note}</span>
                    <span className="text-right text-xs font-medium text-slate-500">明细</span>
                  </div>
                );
              })}
              {!selectedStudentFinanceEvents.length ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">暂无收款与课时流水</div>
              ) : null}
            </div>
          </div>
        </div>
      ),
      timeline: (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-950">财务时间线</h3>
            <p className="mt-0.5 text-xs text-slate-500">按时间倒序查看充值、扣课、撤销和余额变化。</p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[96px_100px_120px_120px_1fr_110px] border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-500">
                <span>日期</span>
                <span>事件</span>
                <span>课时变化</span>
                <span>余额</span>
                <span>说明</span>
                <span className="text-right">现金</span>
              </div>
            {selectedStudentFinanceEvents.map((row, index) => (
              <div
                key={`${row.date}-${row.action}-${row.balance}-${index}`}
                  className="grid grid-cols-[96px_100px_120px_120px_1fr_110px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
              >
                  <span className="font-medium text-slate-950">{row.date}</span>
                  <Pill className="w-fit border-slate-200 bg-white text-slate-600">{row.action}</Pill>
                  <span className={cn("font-semibold", row.amount.startsWith("+") ? "text-emerald-700" : "text-amber-700")}>{row.amount}</span>
                  <span className="text-slate-600">{row.balance}</span>
                  <span className="truncate text-slate-600">{row.note}</span>
                  <span className="text-right font-medium text-slate-950">{row.cashAmount ?? (financeCashValue(row) ? formatCurrency(financeCashValue(row)) : "—")}</span>
                </div>
              ))}
              {!selectedStudentFinanceEvents.length ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">暂无财务时间线</div>
              ) : null}
            </div>
          </div>
        </div>
      ),
      family: (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">家庭账号与邀请</h3>
                <p className="mt-0.5 text-xs text-slate-500">生成待激活账号后，把邀请链接复制给家长打开即可绑定。</p>
              </div>
              <SecondaryButton icon={LinkIcon} className="h-8 px-3 text-xs" onClick={() => createInvite()}>生成家庭邀请</SecondaryButton>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[160px_150px_120px_100px_140px_160px] border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-500">
                  <span>家庭账号</span>
                  <span>手机号 / 备注</span>
                  <span>绑定学生</span>
                  <span>状态</span>
                  <span>有效期</span>
                  <span className="text-right">操作</span>
                </div>
                {selectedFamilyRows.map((account) => (
                  <div key={account.id} className="grid grid-cols-[160px_150px_120px_100px_140px_160px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-950">{account.account}</p>
                      <p className="mt-0.5 text-xs text-slate-500">家庭门户账号</p>
                    </div>
                    <span className="truncate text-slate-600">{account.phone}</span>
                    <span className="font-medium text-slate-950">{account.student}</span>
                    <Pill className={cn("w-fit", familyStatusClass(account.status))}>{account.status}</Pill>
                    <span className="text-slate-500">{account.expiresAt ? formatDateTimeLabel(account.expiresAt) : "-"}</span>
                    <div className="flex justify-end gap-2">
                      <SecondaryButton
                        className="h-7 px-2 text-[11px]"
                        onClick={account.action === "复制邀请" ? copyInviteLink : () => showToast(account.action)}
                      >
                        {account.action}
                      </SecondaryButton>
                      <button
                        type="button"
                        onClick={() => showToast(account.status === "已禁用" ? "该账号已禁用" : "已打开家庭端状态")}
                        className="inline-flex h-7 items-center rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        查看
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">当前邀请链路</h3>
              <p className="mt-0.5 text-xs text-slate-500">家长复制到浏览器打开后激活账号。</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 text-xs">
                {[
                  ["绑定学生", selectedStudent.name],
                  ["家长账号", selectedStudent.parent],
                  ["状态", familyAccountStatus]
                ].map(([label, value]) => (
                  <div key={label} className="border-r border-slate-100 px-3 py-3 last:border-r-0">
                    <p className="text-slate-500">{label}</p>
                    <p className="mt-1 truncate font-semibold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-amber-800">邀请链接（48小时有效）</p>
                  <Pill className="border-amber-200 bg-white text-amber-700">{selectedFamilyInvite?.expiresAt ? formatDateTimeLabel(selectedFamilyInvite.expiresAt) : "待生成"}</Pill>
                </div>
                <p className="mt-3 break-all font-mono text-xs leading-5 text-amber-950">{inviteDisplayLink}</p>
              </div>
              <div className="flex gap-2">
                <PrimaryButton icon={Copy} className="h-8 flex-1 px-3 text-xs" onClick={copyInviteLink}>复制邀请链接</PrimaryButton>
                <SecondaryButton className="h-8 px-3 text-xs" onClick={() => setInviteOpen(true)}>预览</SecondaryButton>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
                <p className="font-medium text-slate-950">家长打开后的结果</p>
                <p className="mt-1">激活后绑定 {selectedStudent.name}，可查看课程反馈、学习报告、账务流水和预约入口。</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white xl:col-span-2">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">家长门户同步记录</h3>
              <p className="mt-0.5 text-xs text-slate-500">反馈、沟通和通知会在家庭账号激活后同步到家长端。</p>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-[120px_180px_1fr_120px_100px] border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-500">
                  <span>类型</span>
                  <span>标题</span>
                  <span>说明</span>
                  <span>同步状态</span>
                  <span className="text-right">操作</span>
                </div>
                {[
                  ["最近沟通", "想让老师讲讲取值范围的问题", "李三家长 · 待回复", "已同步", "发起沟通"],
                  ["课后反馈", "数学 · 已发布", "2026-06-20 · Qrane", "已同步", "前往反馈"],
                  ["通知记录", "收费新回复 · 未读", "家长端通知中心同步", "已同步", "发送通知"]
                ].map(([type, title, desc, status, action]) => (
                  <div key={type} className="grid grid-cols-[120px_180px_1fr_120px_100px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
                    <span className="font-medium text-slate-950">{type}</span>
                    <span className="truncate text-slate-800">{title}</span>
                    <span className="truncate text-slate-500">{desc}</span>
                    <Pill className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700">{status}</Pill>
                    <button
                      type="button"
                      onClick={() => showToast(action)}
                      className="text-right text-xs font-medium text-slate-500 hover:text-slate-950"
                    >
                      {action}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    };

    return (
      <div className="space-y-5">
        <Section
          title="学生切换"
          subtitle="学生列表收成横向档案栏，进入后直接处理成绩、课程和收款流水。"
          action={<SecondaryButton icon={Plus} onClick={openStudentCreator}>新增学生</SecondaryButton>}
        >
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {studentList.map((student) => {
                const meta = studentServiceMeta[student.id] ?? defaultServiceMeta(student);
                const selected = selectedStudent.id === student.id;

                return (
                  <div
                    key={student.id}
                    className={cn(
                      "w-[300px] shrink-0 rounded-lg border px-3 py-2.5 text-left text-sm transition",
                      selected ? "border-zinc-950 bg-zinc-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <button type="button" onClick={() => setSelectedStudentId(student.id)} className="w-full text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", selected ? "bg-white text-zinc-950" : "bg-slate-100 text-slate-900")}>
                          {student.name.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{student.name}</p>
                          <p className={cn("mt-0.5 truncate text-xs", selected ? "text-zinc-300" : "text-slate-500")}>{student.parent} · {meta.subject}</p>
                        </div>
                      </div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", selected ? "border-white/20 bg-white/10 text-white" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{meta.status}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                      {[
                        ["账务", meta.billingValue],
                        ["下次", meta.nextLabel],
                        ["关注", student.focus]
                      ].map(([label, value]) => (
                        <div key={label} className={cn("min-w-0 rounded-md px-2 py-1.5", selected ? "bg-white/10" : "bg-slate-50")}>
                          <p className={cn(selected ? "text-zinc-300" : "text-slate-500")}>{label}</p>
                          <p className="mt-0.5 truncate font-medium">{value}</p>
                        </div>
                      ))}
                    </div>
                    </button>
                    <div className="mt-2 flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedStudentId(student.id);
                          openTeacherSchedule("table");
                        }}
                        className={cn("inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-medium", selected ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-600")}
                      >
                        排课
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedStudentId(student.id);
                          setStudentTab("payments");
                        }}
                        className={cn("inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-medium", selected ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-600")}
                      >
                        去结算
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        <Section
          title={`${selectedStudent.name}学生档案`}
          subtitle="成绩、薄弱点、课程、课时流水、家庭邀请和学习报告集中管理。"
          action={<SecondaryButton icon={LinkIcon} onClick={() => createInvite()}>生成家庭邀请</SecondaryButton>}
        >
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="grid border-b border-slate-100 md:grid-cols-4">
              {[
                ["年级科目", selectedServiceMeta.subject, "一对一数学"],
                ["剩余课时", `${selectedStudent.remainingLessons} 节`, `计费：${selectedServiceMeta.billingType}`],
                ["最近成绩", selectedStudent.latestScore, "专题检测 5 / 36"],
                ["家庭账号", selectedFamilyInvite?.status ?? "未生成", selectedStudent.parent]
              ].map(([label, value, desc]) => (
                <div key={label} className="border-b border-slate-100 px-4 py-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                  <p className="text-[11px] text-slate-500">{label}</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-medium text-slate-950">最近学习状态</p>
                <p className="mt-1 text-xs text-slate-500">
                  最近关注：{selectedStudent.focus}。成绩记录、薄弱点和课程反馈会进入学习报告。
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <PrimaryButton icon={Bot} className="h-8 px-3 text-xs" onClick={openStudyReportGenerator}>生成学习报告</PrimaryButton>
                <SecondaryButton icon={MessageCircle} className="h-8 px-3 text-xs" onClick={() => setTeacherView("messages")}>查看沟通</SecondaryButton>
              </div>
            </div>
          </div>
        </Section>

        <Section title="学生服务记录" subtitle="横向标签切换成绩、薄弱点、学习报告、课程、收款、财务时间线和家校。">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex h-8 items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700">
              <FileText className="size-4 text-slate-500" />
              当前位置&nbsp;{currentStudentTabLabel}
            </div>
            {studentTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setStudentTab(tab.id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded border px-3 text-xs font-medium transition",
                    studentTab === tab.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          {studentTabContent[studentTab]}
        </Section>
      </div>
    );
  }

  function renderClasses() {
    const classLesson = lessons.find((lesson) => lesson.kind === "班课") ?? lessons[1] ?? lessons[0];
    const activeClass = classList.find((classItem) => classItem.name === classLesson.student) ?? classList[0] ?? initialClasses[0];
    const activeClassMembers = activeClass?.members ?? [];
    const attendanceSummary: Array<[AttendanceStatus, string, string]> = [
      ["出勤", `${activeClassMembers.filter((member) => member.lastStatus === "出勤").length} 人`, "border-emerald-200 bg-emerald-50 text-emerald-700"],
      ["迟到", `${activeClassMembers.filter((member) => member.lastStatus === "迟到").length} 人`, "border-amber-200 bg-amber-50 text-amber-700"],
      ["请假", `${activeClassMembers.filter((member) => member.lastStatus === "请假").length} 人`, "border-sky-200 bg-sky-50 text-sky-700"],
      ["缺席", `${activeClassMembers.filter((member) => member.lastStatus === "缺席").length} 人`, "border-rose-200 bg-rose-50 text-rose-700"]
    ];
    const latestClassAttendanceRecords = attendanceRecords.filter((record) => record.className === activeClass.name).slice(0, activeClassMembers.length);
    const classCards = [
      [activeClass.name, `${activeClassMembers.length} 名学生`, activeClass.focus],
      ["初三函数冲刺班", "4 名学生", "二次函数压轴"],
      ["高一基础提升班", "5 名学生", "函数单调性"]
    ];

    return (
      <div className="space-y-5">
        <div className="grid items-start gap-5 xl:grid-cols-[320px_1fr]">
          <Section title="班级列表" subtitle="小班课按班级管理成员、课程和考勤。">
            <div className="space-y-2.5">
              {classCards.map(([name, count, focus], index) => (
                <button
                  type="button"
                  key={name}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition",
                    index === 0 ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{name}</p>
                    <Pill className="border-blue-200 bg-white text-blue-700">{count}</Pill>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">最近主题：{focus}</p>
                </button>
              ))}
            </div>
          </Section>

          <Section
            title={activeClass.name}
            subtitle="班级课表、成员考勤和课后反馈集中管理。"
            action={<PrimaryButton icon={ClipboardCheck} onClick={() => openAttendance(classLesson.id)}>开始点名</PrimaryButton>}
          >
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["班级人数", `${activeClassMembers.length} 人`, activeClass.subject],
                ["下次课程", "06-20 10:30", "圆锥曲线专题"],
                ["本月班课", "8 节", "已点名 6 节"],
                ["待反馈", "1 节", "班课反馈可生成"]
              ].map(([label, value, desc]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-950">最近班课</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {classLesson.date} {classLesson.start}-{classLesson.end} · {classLesson.subject}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill className={statusClass(classLesson.status)}>{classLesson.status}</Pill>
                  <SecondaryButton icon={Sparkles} onClick={() => openFeedback(classLesson.id)}>生成反馈</SecondaryButton>
                </div>
              </div>
            </div>
          </Section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Section title="班级成员" subtitle="逐个学生记录剩余课次、最近考勤和当前关注点。">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">学生</th>
                    <th className="px-4 py-3 font-medium">年级</th>
                    <th className="px-4 py-3 font-medium">剩余课次</th>
                    <th className="px-4 py-3 font-medium">最近考勤</th>
                    <th className="px-4 py-3 font-medium">当前关注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeClassMembers.map((member) => (
                    <tr key={member.name} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4 font-medium text-slate-950">{member.name}</td>
                      <td className="px-4 py-4 text-slate-600">{member.grade}</td>
                      <td className="px-4 py-4 text-slate-600">{member.remainingLessons} 课时</td>
                      <td className="px-4 py-4">
                        <Pill className={statusClass(member.lastStatus as AttendanceStatus)}>{member.lastStatus}</Pill>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{member.focus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="space-y-5">
            <Section title="考勤摘要" subtitle="班课点名保存后同步更新。">
              <div className="grid grid-cols-2 gap-3">
                {attendanceSummary.map(([label, value, tone]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                    <Pill className={tone}>{label}</Pill>
                    <p className="mt-3 text-xl font-semibold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">最近点名明细</p>
                  {latestClassAttendanceRecords[0]?.savedAt ? <span className="text-xs text-slate-400">{latestClassAttendanceRecords[0].savedAt.slice(5, 16).replace("T", " ")}</span> : null}
                </div>
                <div className="mt-3 space-y-2">
                  {latestClassAttendanceRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-slate-600">{record.studentName}</span>
                      <Pill className={statusClass(record.status)}>{record.status}</Pill>
                    </div>
                  ))}
                  {!latestClassAttendanceRecords.length ? (
                    <p className="text-sm text-slate-500">暂无保存的本节班课点名记录。</p>
                  ) : null}
                </div>
              </div>
            </Section>

            <Section title="班课操作">
              <div className="space-y-3">
                <PrimaryButton icon={ClipboardCheck} className="w-full" onClick={() => openAttendance(classLesson.id)}>开始点名</PrimaryButton>
                <SecondaryButton icon={Sparkles} className="w-full" onClick={() => openFeedback(classLesson.id)}>生成班课反馈</SecondaryButton>
                <SecondaryButton icon={Calendar} className="w-full" onClick={() => openTeacherSchedule("table")}>查看排课</SecondaryButton>
              </div>
            </Section>
          </div>
        </div>
      </div>
    );
  }

  function renderBookingAuditList() {
    const actionableBookings = bookings.filter((booking) => booking.status === "冲突" || booking.status === "待审核");

    return (
      <div className="rounded-md border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">预约审核（{actionableBookings.length} 个待处理）</h3>
            <p className="mt-1 text-xs text-slate-500">冲突申请先调整时间，待审核申请可直接通过。</p>
          </div>
          <SecondaryButton className="h-8 px-3 text-xs" onClick={() => showToast("已显示全部申请")}>全部</SecondaryButton>
        </div>
        <div className="hidden grid-cols-[112px_1fr_88px_220px] border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500 md:grid">
          <span>时间</span>
          <span>申请</span>
          <span>状态</span>
          <span className="text-right">操作</span>
        </div>
        <div className="divide-y divide-slate-100">
          {bookings.map((booking) => (
            <div key={`audit-${booking.id}`} className="grid gap-3 px-3 py-3 md:grid-cols-[112px_1fr_88px_220px] md:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-950">{booking.date}</p>
                <p className="mt-1 text-xs text-slate-500">{booking.start}-{booking.end}</p>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-950">{booking.student}</p>
                  <span className="text-xs text-slate-500">数学 · {formatTeacherAlias(teacherProfile.name)}</span>
                </div>
                {booking.conflictNote ? (
                  <>
                    <p className="mt-1 truncate text-xs text-rose-600">{booking.conflictNote}</p>
                    {getFirstBookingSuggestion(booking) ? (
                      <p className="mt-1 text-xs text-blue-700">
                        推荐调整至 {getFirstBookingSuggestion(booking)?.value}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">家长提交预约，等待老师确认。</p>
                )}
              </div>
              <Pill className={statusClass(booking.status)}>{booking.status}</Pill>
              <div className="flex flex-wrap gap-1.5 md:justify-end">
                <SecondaryButton className="h-8 px-3 text-xs" onClick={() => openBookingDetail(booking)}>
                  {booking.status === "冲突" ? "处理冲突" : "查看"}
                </SecondaryButton>
                <PrimaryButton className="h-8 px-3 text-xs" disabled={booking.status !== "待审核"} onClick={() => approveBooking(booking.id)}>
                  {booking.status === "已通过" ? "已通过" : "通过"}
                </PrimaryButton>
                <SecondaryButton className="h-8 px-3 text-xs" disabled={booking.status === "已通过" || booking.status === "已拒绝"} onClick={() => rejectBooking(booking.id)}>拒绝</SecondaryButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderSchedule() {
    const scheduleMeta = {
      table: {
        title: "排课总表",
        subtitle: "蓝色代表开放预约时段，黄色代表已有课程；课程块可拖动到其它时间。",
        sideTitle: "预约申请审核",
        sideSubtitle: "系统自动检测冲突，老师调整后通过。"
      },
      holiday: {
        title: "假期排课",
        subtitle: "假期密集排课时可批量开放多个日期的预约时段，再由家长选择具体时间。",
        sideTitle: "已开放预约",
        sideSubtitle: "蓝色时段会同步到家长端预约页面。"
      },
      booking: {
        title: "预约排课",
        subtitle: "审核家长提交的预约申请；冲突时先调整时段，再通过并写入排课总表。",
        sideTitle: "预约申请审核",
        sideSubtitle: "冲突申请需要先处理，待审核申请可直接通过。"
      }
    }[scheduleSection];
    const times = [
      ["08:00", "10:00"],
      ["10:30", "12:30"],
      ["12:30", "14:30"],
      ["14:30", "16:00"],
      ["16:00", "18:00"],
      ["18:00", "20:00"],
      ["20:00", "22:00"]
    ];
    const sideBookings = sortedBookings.filter((booking) => booking.status !== "已拒绝");
    const sortedOpenSlots = [...openSlots].sort((a, b) => `${a.date}-${a.start}`.localeCompare(`${b.date}-${b.start}`));

    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Section
          title={scheduleMeta.title}
          subtitle={scheduleMeta.subtitle}
          action={<PrimaryButton icon={Plus} onClick={() => setOpenSlotModalOpen(true)}>新增预约时段</PrimaryButton>}
        >
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[88px_repeat(4,minmax(0,1fr))] border-b border-slate-200 bg-slate-50">
                <div className="px-3 py-2.5 text-xs font-medium text-slate-400">时间</div>
                {scheduleDays.map((day) => (
                  <div key={day.date} className="border-l border-slate-200 px-3 py-2.5">
                    <p className="text-sm font-semibold text-slate-950">{day.date}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{day.day}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {lessons.filter((lesson) => lesson.date === day.date).length + approvedBookingsWithoutLesson.filter((booking) => booking.date === day.date).length} 节课
                    </p>
                  </div>
                ))}
              </div>

              {times.map(([start, end]) => (
                <div key={`${start}-${end}`} className="grid min-h-[94px] grid-cols-[88px_repeat(4,minmax(0,1fr))] border-b border-slate-100 last:border-b-0">
                  <div className="bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-500">
                    <p>{start}</p>
                    <p className="mt-1 text-slate-400">{end}</p>
                  </div>
                  {scheduleDays.map((day) => {
                    const lessonHere = lessons.find((lesson) => lesson.date === day.date && lesson.start === start);
                    const openHere = openSlots.find((slot) => slot.date === day.date && bookingTimeWithinSlot(slot, start, end));
                    const approvedHere = approvedBookingsWithoutLesson.find((booking) => booking.date === day.date && booking.start === start);
                    const reviewBookingsHere = bookings.filter(
                      (booking) =>
                        booking.date === day.date &&
                        booking.status !== "已拒绝" &&
                        !bookingHasLesson(booking) &&
                        isOverlapping(start, end, booking.start, booking.end)
                    );

                    return (
                      <div
                        key={`${day.date}-${start}`}
                        data-schedule-cell={`${day.date}-${start}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => onDropSchedule(event, day.date, day.day, start, end)}
                        onPointerUp={(event) => onPointerDropSchedule(event, day.date, day.day, start, end)}
                        className={cn(
                          "border-l border-slate-100 p-1",
                          openHere ? "bg-blue-50/35" : "bg-white"
                        )}
                      >
                        <div className="flex min-h-[76px] flex-col gap-1">
                        {openHere ? (
                          <div className="rounded-sm border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                            开放预约 · {openHere.start === start && openHere.end === end ? `${openHere.start}-${openHere.end}` : `${start}-${end}`}
                          </div>
                        ) : null}
                        {lessonHere ? (
                          <div
                            data-lesson-id={lessonHere.id}
                            onClick={() => {
                              if (suppressCourseClickRef.current) {
                                return;
                              }
                              openCourseEditor(lessonHere);
                            }}
                            onPointerDown={(event) => beginPointerMove(event, lessonHere)}
                            onPointerMove={updatePointerMove}
                            onPointerCancel={clearPointerMove}
                            className={cn(
                              "touch-none cursor-move rounded border border-amber-200 bg-amber-50 px-2 py-1.5 transition",
                              draggingLessonId === lessonHere.id ? "scale-[0.99] border-amber-300 bg-amber-100 shadow-sm" : ""
                            )}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                              <Move className="size-3" />
                              {lessonHere.student}
                            </div>
                            <p className="mt-0.5 text-xs text-amber-700">{lessonHere.subject}</p>
                            <p className="mt-0.5 text-[11px] text-amber-700">
                              {lessonHere.start}-{lessonHere.end} · {lessonHere.status}
                            </p>
                          </div>
                        ) : approvedHere ? (
                          <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5">
                            <p className="text-xs font-semibold text-emerald-800">{approvedHere.student}</p>
                            <p className="mt-0.5 text-xs text-emerald-700">预约已通过</p>
                            <p className="mt-0.5 text-[11px] text-emerald-700">{approvedHere.start}-{approvedHere.end}</p>
                          </div>
                        ) : null}
                        {reviewBookingsHere.map((booking) => (
                          <button
                            type="button"
                            key={`${booking.id}-${start}`}
                            onClick={() => openBookingDetail(booking)}
                            className={cn(
                              "rounded border px-2 py-1 text-left text-xs transition",
                              booking.status === "冲突"
                                ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{booking.student}</span>
                              <span>{booking.status}</span>
                            </div>
                            <p className="mt-1">{booking.start}-{booking.end}</p>
                          </button>
                        ))}
                        {!lessonHere && !approvedHere && !reviewBookingsHere.length ? (
                          <button
                            type="button"
                            onClick={() => openCourseCreator(day.date, day.day, start, end)}
                            className={cn(
                              "grid min-h-[46px] w-full flex-1 place-items-center rounded-sm border border-dashed text-[11px] transition",
                              openHere
                                ? "border-blue-200 bg-white/70 text-blue-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                                : "border-slate-200 text-slate-300 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-500"
                            )}
                          >
                            {openHere ? "可排课 / 家长可约" : "+"}
                          </button>
                        ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title={scheduleMeta.sideTitle} subtitle={scheduleMeta.sideSubtitle} action={
          scheduleSection === "holiday" ? (
            <SecondaryButton onClick={() => setOpenSlotModalOpen(true)}>继续开放</SecondaryButton>
          ) : (
            <SecondaryButton onClick={() => {
              setScheduleSection("booking");
              setBookingAuditOpen(true);
            }}>显示全部</SecondaryButton>
          )
        }>
          {scheduleSection === "holiday" ? (
            <div className="space-y-3">
              {sortedOpenSlots.map((slot) => {
                const conflictItems = buildBookingConflictItemsForDate(slot.date);
                const options = buildBookingTimeOptions([slot], conflictItems);
                const availableCount = options.filter((option) => option.conflictItems.length === 0).length;

                return (
                  <div key={`${slot.date}-${slot.start}-${slot.end}`} className="rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-blue-950">
                          {slot.date} {slot.day}
                        </p>
                        <p className="mt-1 text-sm text-blue-700">
                          {slot.start}-{slot.end}
                        </p>
                      </div>
                      <Pill className="border-blue-200 bg-white text-blue-700">已开放</Pill>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-blue-700">
                      家长端可选 {options.length} 个 2 小时时间格，其中 {availableCount} 个当前无冲突。
                    </p>
                  </div>
                );
              })}
              {!sortedOpenSlots.length ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">暂无开放预约时段。</div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2">
                  <p className="text-[11px] text-rose-500">冲突</p>
                  <p className="mt-1 text-lg font-semibold text-rose-700">{bookingReviewStats.conflicts}</p>
                </div>
                <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2">
                  <p className="text-[11px] text-amber-500">待审核</p>
                  <p className="mt-1 text-lg font-semibold text-amber-700">{bookingReviewStats.pending}</p>
                </div>
                <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <p className="text-[11px] text-emerald-500">已通过</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-700">{bookingReviewStats.approved}</p>
                </div>
              </div>

              {sideBookings.map((booking) => (
                <div key={booking.id} className={cn("rounded-lg border p-3", booking.status === "冲突" ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-white")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{booking.student}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {booking.date} {booking.day} {booking.start}-{booking.end}
                      </p>
                    </div>
                    <Pill className={statusClass(booking.status)}>{booking.status}</Pill>
                  </div>
                  {booking.conflictNote ? (
                    <div className="mt-2 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs leading-5 text-rose-700">
                      <p>{booking.conflictNote}</p>
                      {getFirstBookingSuggestion(booking) ? (
                        <p className="mt-1 text-blue-700">推荐调整至 {getFirstBookingSuggestion(booking)?.value}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {booking.status === "冲突" ? (
                      <>
                        <SecondaryButton icon={RotateCcw} onClick={() => openBookingDetail(booking)}>
                          处理冲突
                        </SecondaryButton>
                        <SecondaryButton onClick={() => openBookingDetail(booking)}>查看</SecondaryButton>
                      </>
                    ) : (
                      <>
                        <PrimaryButton icon={Check} disabled={booking.status !== "待审核"} onClick={() => approveBooking(booking.id)}>
                          {booking.status === "已通过" ? "已写入排课" : "通过预约"}
                        </PrimaryButton>
                        <SecondaryButton onClick={() => openBookingDetail(booking)}>查看</SecondaryButton>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!sideBookings.length ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">暂无预约申请。</div>
              ) : null}
            </div>
          )}
        </Section>
      </div>
    );
  }

  function renderMessages(isParent = false) {
    const visibleThreads = isParent ? parentThreads : threads;
    const currentThread = visibleThreads.find((thread) => thread.id === activeThreadId) ?? visibleThreads[0];
    const activeThreadFeedback = currentThread
      ? parentFeedbackItems.find((feedback) => feedback.linkedLesson === currentThread.linkedLesson) ??
        sentFeedbackItems.find((feedback) => feedback.linkedLesson === currentThread.linkedLesson)
      : undefined;
    const activeFeedbackBody = activeThreadFeedback?.body ?? demoLatestFeedback;
    const setCurrentThreadStatus = (status: MessageThread["status"]) => {
      if (!currentThread) return;
      setThreads((previous) => previous.map((thread) => (thread.id === currentThread.id ? { ...thread, status } : thread)));
    };

    return (
      <div className={cn("grid gap-4", isParent ? "xl:grid-cols-[340px_1fr]" : "xl:grid-cols-[300px_minmax(0,1fr)_300px]")}>
        <Section title={isParent ? "我的沟通" : "家长沟通列表"} subtitle="围绕某次反馈发起，教师端实时刷新。">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {visibleThreads.map((thread) => (
              <button
                type="button"
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className={cn(
                  "w-full border-b border-slate-100 px-3 py-3 text-left transition last:border-b-0",
                  activeThreadId === thread.id ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-slate-950">{thread.title}</p>
                  <Pill className={statusClass(threadDisplayStatus(thread.status))}>{threadDisplayStatus(thread.status)}</Pill>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{thread.parent} · {thread.linkedLesson}</p>
                <p className="mt-1 text-[11px] text-slate-400">{thread.issueType ?? "反馈"} · {thread.student}</p>
                <p className="mt-2 truncate text-xs text-slate-500">{thread.messages[thread.messages.length - 1]?.body}</p>
              </button>
            ))}
            {!visibleThreads.length ? (
              <div className="p-6 text-center text-sm text-slate-500">
                暂无沟通记录
              </div>
            ) : null}
          </div>
        </Section>

        <Section
          title={currentThread?.title ?? "沟通详情"}
          subtitle={currentThread ? `自动关联：${currentThread.linkedLesson}` : undefined}
          action={!isParent && currentThread ? (
            <div className="flex rounded-md bg-slate-100 p-1 text-xs">
              {[
                ["待处理", "已发送"],
                ["已确认", "已确认"]
              ].map(([label, status]) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => setCurrentThreadStatus(status as MessageThread["status"])}
                  className={cn(
                    "h-7 rounded px-3 font-medium transition",
                    currentThread.status === status ? "bg-zinc-950 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                  )}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => showToast("已关闭当前沟通提醒")}
                className="h-7 rounded px-3 font-medium text-slate-600 transition hover:bg-white"
              >
                关闭
              </button>
            </div>
          ) : undefined}
        >
          {currentThread ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">关联反馈</p>
                  <Pill className={statusClass(threadDisplayStatus(currentThread.status))}>{threadDisplayStatus(currentThread.status)}</Pill>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{activeFeedbackBody}</p>
              </div>
              <div className="min-h-[360px] space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                {currentThread.messages.map((message, index) => {
                  const isOwn = isParent ? message.from === "parent" : message.from === "teacher";

                  return (
                    <div key={`${message.time}-${index}`} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[78%] rounded-xl px-4 py-3 text-sm leading-6 shadow-sm", isOwn ? "bg-zinc-950 text-white" : "bg-white text-slate-800")}>
                        {message.from === "parent" ? (
                          <p className={cn("mb-1 text-xs font-medium", isOwn ? "text-zinc-300" : "text-slate-400")}>关联课程：{currentThread.linkedLesson}</p>
                        ) : null}
                        <p>{message.body}</p>
                        <p className={cn("mt-1 text-[11px]", isOwn ? "text-zinc-300" : "text-slate-400")}>{message.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!isParent ? (
                <div className="flex gap-3">
                  <TextInput
                    aria-label="输入回复内容"
                    placeholder="输入回复内容"
                    value={teacherReplyDraft}
                    onChange={(event) => setTeacherReplyDraft(event.target.value)}
                  />
                  <PrimaryButton icon={Send} onClick={replyThread}>发送回复</PrimaryButton>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              暂无沟通记录，可从家长端反馈详情发起。
            </div>
          )}
        </Section>
        {!isParent ? (
          <Section title="反馈辅助" subtitle={`草稿 ${feedbackDrafts.filter((draft) => draft.status !== "已发送").length}`}>
            {currentThread ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3">
                  <p className="text-xs font-semibold text-amber-800">待确认草稿</p>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    {feedbackDrafts.find((draft) => draft.status !== "已发送")?.body.slice(0, 68) ?? "当前没有待确认的反馈草稿。"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">最近已发布</p>
                    <SecondaryButton className="h-7 px-2 text-[11px]" onClick={() => setTeacherView("dashboard")}>查看全文</SecondaryButton>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-950">{activeThreadFeedback?.course ?? currentThread.linkedLesson}</p>
                  <p className="mt-2 line-clamp-5 text-xs leading-5 text-slate-500">{activeFeedbackBody}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
                  <p className="font-medium text-slate-950">处理记录</p>
                  <p className="mt-2">当前状态：{threadDisplayStatus(currentThread.status)}</p>
                  <p>最后消息：{currentThread.messages[currentThread.messages.length - 1]?.time}</p>
                  <p>家长账号：{currentThread.parent}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                选择一条沟通后查看反馈辅助。
              </div>
            )}
          </Section>
        ) : null}
      </div>
    );
  }

  function renderSystemUpdate() {
    const isLatest = updateState.status === "已是最新" || updateState.status === "已更新";
    const updateStatusClass = getUpdateStatusClass(updateState.status);
    const updateHeroTitle =
      updateState.status === "未检查"
        ? "输入授权码检查更新"
        : updateState.status === "可更新"
          ? "发现可更新版本"
          : updateState.status === "授权失败"
            ? "授权码校验失败"
            : "您的系统已是最新版本";
    const updateHeroDescription =
      updateState.status === "未检查"
        ? "输入授权码后可检查可用版本；更新前会保留课程、学生、家长账号和课时流水。"
        : updateState.status === "可更新"
          ? "检测到可用更新，执行更新前会自动保留课程、学生、家长账号和课时流水。"
          : updateState.status === "授权失败"
            ? "请检查授权码格式或联系管理员；更新不会影响当前数据。"
            : "系统运行状况良好，所有模块均为最新状态。";

    return (
      <div className="space-y-5" data-updates-page>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">系统更新</h1>
            <p className="mt-2 text-sm text-slate-500">管理 LessonLedger 版本、更新元数据与后续发布状态。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton icon={ShieldCheck} onClick={() => setLicenseModalOpen(true)}>管理授权</SecondaryButton>
            <PrimaryButton icon={RotateCcw} disabled={updateBusy !== null} onClick={checkForUpdate}>
              {updateBusy === "checking" ? "检查中..." : "检查更新"}
            </PrimaryButton>
          </div>
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid gap-5 border-b border-zinc-100 p-5 lg:grid-cols-[1fr_360px]">
            <div className="flex items-start gap-4">
              <div className={cn("grid size-12 shrink-0 place-items-center rounded-full", isLatest ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>
                <Check className="size-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-950">{updateHeroTitle}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {updateHeroDescription}
                </p>
                <p className="mt-3 text-sm text-slate-500">上次检查时间：{updateState.checkedAt ?? "尚未检查"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">当前系统版本</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{teacherProfile.version}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">升级授权状态</p>
                <Pill className="mt-3 border-emerald-200 bg-emerald-50 text-emerald-700">
                  {teacherProfile.authorizationStatus === "授权失效" ? "未授权" : "已授权"}
                </Pill>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-sm text-slate-500">服务有效期至：{teacherProfile.serviceExpiresAt}</p>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton icon={ShieldCheck} onClick={() => setLicenseModalOpen(true)}>管理授权</SecondaryButton>
              <PrimaryButton icon={RotateCcw} disabled={updateBusy !== null} onClick={checkForUpdate}>
                {updateBusy === "checking" ? "检查中..." : "检查更新"}
              </PrimaryButton>
              <SecondaryButton icon={Upload} disabled={updateState.status !== "可更新" || updateBusy !== null} onClick={applyVersionUpdate}>
                {updateBusy === "updating" ? "更新中..." : "执行更新"}
              </SecondaryButton>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Section
            title="版本更新报告"
            subtitle="每次发布会说明功能优化、数据迁移与安全修复。"
            action={<SecondaryButton icon={RotateCcw} onClick={refreshUpdateReport}>刷新报告</SecondaryButton>}
          >
            <div className="space-y-3">
              {updateState.notes.map((desc, index) => (
                <div key={desc} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-950">更新项 {index + 1}</p>
                    <Pill className={index === 0 ? updateStatusClass : "border-slate-200 bg-white text-slate-600"}>
                      {index === 0 ? updateState.status : "已包含"}
                    </Pill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <div className="space-y-5">
            <Section title="数据保留范围" subtitle="更新前后保留老师的核心业务数据。">
              <div className="space-y-3 text-sm text-slate-600">
                {updateRetentionItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <span>{item.label}</span>
                    <span className="font-semibold text-emerald-800">{item.count}</span>
                    <Pill className="border-emerald-200 bg-white text-emerald-700">保留</Pill>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="功能需求" subtitle="授权用户可提交需求，测试通过后推送更新。">
              <div className="space-y-3">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-700">
                  后续功能需求可以在群内提交；测试通过后会尽快推送，更新会保留当前数据。
                </div>
                {featureRequests.length ? (
                  <div className="space-y-2">
                    {featureRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{request.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{request.body}</p>
                          </div>
                          <Pill
                            className={
                              request.status === "已推送"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : request.status === "测试中"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                            }
                          >
                            {request.status}
                          </Pill>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">暂无已提交需求。</div>
                )}
                <PrimaryButton icon={MessageSquare} className="w-full" onClick={() => setFeatureRequestModalOpen(true)}>
                  提交功能需求
                </PrimaryButton>
              </div>
            </Section>
          </div>
        </div>
      </div>
    );
  }

  function renderSettings() {
    const updateStatusClass = getUpdateStatusClass(updateState.status);

    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Section title="授权码与版本更新" subtitle="通过授权码检查版本；更新后保留课程、课时流水和家长账号数据。">
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <Field label="授权码">
                  <TextInput value={authCode} onChange={(event) => setAuthCode(event.target.value)} />
                </Field>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 text-emerald-700" />
                    <div>
                      <p className="font-semibold text-slate-950">{teacherProfile.authorizationStatus}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        当前授权可继续使用更新能力，数据迁移前会自动保留历史记录。
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PrimaryButton icon={RotateCcw} disabled={updateBusy !== null} onClick={checkForUpdate}>
                    {updateBusy === "checking" ? "检查中..." : "检查更新"}
                  </PrimaryButton>
                  <SecondaryButton icon={Upload} disabled={updateState.status !== "可更新" || updateBusy !== null} onClick={applyVersionUpdate}>
                    {updateBusy === "updating" ? "更新中..." : "执行更新"}
                  </SecondaryButton>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">当前版本</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{teacherProfile.version}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Pill className={updateStatusClass}>{updateState.status}</Pill>
                  <Pill className="border-slate-200 bg-white text-slate-600">最新 {updateState.latestVersion}</Pill>
                </div>
                {updateState.checkedAt ? <p className="mt-3 text-xs text-slate-500">上次检查：{updateState.checkedAt}</p> : null}
                {updateState.updatedAt ? <p className="mt-1 text-xs text-slate-500">上次更新：{updateState.updatedAt}</p> : null}
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  {updateRetentionItems.slice(0, 3).map((item) => (
                    <div key={`settings-retention-${item.label}`} className="flex items-center justify-between gap-2">
                      <span>{item.label}</span>
                      <span className="ml-auto font-semibold text-slate-800">{item.count}</span>
                      <Pill className="border-emerald-200 bg-white text-emerald-700">保留</Pill>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section title="工作室资料" subtitle="展示给家长端的老师与工作室信息。">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="工作室名称">
                <TextInput value={studioName} onChange={(event) => setStudioName(event.target.value)} />
              </Field>
              <Field label="任教学科">
                <TextInput value={studioSubject} onChange={(event) => setStudioSubject(event.target.value)} />
              </Field>
              <Field label="所在城市">
                <TextInput value={studioCity} onChange={(event) => setStudioCity(event.target.value)} />
              </Field>
              <Field label="教师介绍">
                <TextArea value={teacherIntro} onChange={(event) => setTeacherIntro(event.target.value)} />
              </Field>
              <Field label="家长端展示说明">
                <TextArea value={parentDisplayNote} onChange={(event) => setParentDisplayNote(event.target.value)} />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <SecondaryButton icon={Check} onClick={saveStudioProfile}>保存资料</SecondaryButton>
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="更新记录" subtitle="保留数据的功能更新说明。">
            <div className="space-y-3">
              {updateState.notes.map((desc, index) => (
                <div key={desc} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-950">更新项 {index + 1}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="需求池" subtitle="授权用户提交的功能需求。">
            <div className="space-y-3">
              {featureRequests.slice(0, 4).map((request) => (
                <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-950">{request.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{request.body}</p>
                    </div>
                    <Pill className="border-amber-200 bg-white text-amber-700">{request.status}</Pill>
                  </div>
                </div>
              ))}
              {!featureRequests.length ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">暂无提交记录。</div>
              ) : null}
              <PrimaryButton icon={MessageSquare} className="w-full" onClick={() => setFeatureRequestModalOpen(true)}>
                提交功能需求
              </PrimaryButton>
            </div>
          </Section>
        </div>
      </div>
    );
  }

  function renderFinance() {
    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Section
          title="财务记录"
          subtitle="按学生和课程记录充值、扣课、撤销和余额变化。"
          action={<PrimaryButton icon={Plus} onClick={() => setFinanceModalOpen(true)}>新增流水</PrimaryButton>}
        >
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            {[
              ["本月实收", formatCurrency(monthlyIncome), `${receivedPaymentCount} 笔收款${refundedPaymentCount ? ` · ${refundedPaymentCount} 笔退款` : ""}`],
              ["剩余课次", `${Number(totalRemainingLessons.toFixed(1))} 节`, `${studentList.length} 名学生`],
              ["本月扣课", `${Number(deductedLessonCredits.toFixed(1))} 节`, `撤销 ${Number(reversedLessonCredits.toFixed(1))} 节`],
              ["账务风险", `${accountRiskCount} 人`, `低余额 ${lowBalanceStudents.length} 人`]
            ].map(([label, value, desc]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(["全部流水", "充值", "扣课", "撤销", "待结算"] satisfies FinanceFilter[]).map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setFinanceFilter(item)}
                className={cn(
                  "h-9 rounded-md border px-3 text-sm font-medium transition",
                  financeFilter === item ? "border-zinc-950 bg-zinc-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">日期</th>
                  <th className="px-4 py-3 font-medium">学生</th>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">说明</th>
                  <th className="px-4 py-3 text-right font-medium">变化</th>
                  <th className="px-4 py-3 text-right font-medium">收款</th>
                  <th className="px-4 py-3 text-right font-medium">余额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visibleFinanceEvents.map((row, index) => {
                  const cashValue = financeCashValue(row);

                  return (
                    <tr key={`${row.date}-${row.action}-${row.note}-${index}`} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4 text-slate-500">{row.date}</td>
                      <td className="px-4 py-4 font-medium text-slate-950">{row.studentName ?? "李三"}</td>
                      <td className="px-4 py-4">
                        <Pill className={row.action === "充值" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : row.action === "撤销" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                          {row.action}
                        </Pill>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{row.note}</td>
                      <td className={cn("px-4 py-4 text-right font-semibold", row.amount.startsWith("+") ? "text-emerald-700" : "text-amber-700")}>{row.amount}</td>
                      <td className={cn("px-4 py-4 text-right font-semibold", cashValue > 0 ? "text-emerald-700" : cashValue < 0 ? "text-rose-700" : "text-slate-400")}>
                        {row.cashAmount ?? (cashValue ? formatCurrency(cashValue) : "—")}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-600">{row.balance}</td>
                    </tr>
                  );
                })}
                {!visibleFinanceEvents.length ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={7}>
                      暂无{financeFilter === "全部流水" ? "" : financeFilter}流水
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="space-y-5">
          <Section title="账务待处理" subtitle="低余额、待收款和异常撤销提醒。">
            <div className="space-y-3">
              {financeTaskItems.map((task) => (
                <button
                  type="button"
                  key={task.id}
                  onClick={task.click}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{task.studentName}</p>
                      <p className="mt-1 text-sm text-slate-500">{task.desc}</p>
                    </div>
                    <Pill className={task.tone}>{task.action}</Pill>
                  </div>
                </button>
              ))}
              {!financeTaskItems.length ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  当前暂无低余额、待结算或撤销提醒。
                </div>
              ) : null}
            </div>
          </Section>

          <Section title="学生账务摘要">
            <div className="space-y-3">
              {studentList.map((student) => (
                <button
                  type="button"
                  key={student.id}
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setFinanceStudentId(student.id);
                    setStudentTab("payments");
                    setTeacherView("students");
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-slate-950">{student.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{student.parent}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-950">{student.remainingLessons} 课时</p>
                </button>
              ))}
            </div>
          </Section>
        </div>
      </div>
    );
  }

  function renderAccount() {
    const activeFamilyAccountCount = familyInvites.filter((invite) => invite.status === "已激活").length;
    const pendingFamilyAccountCount = familyInvites.filter((invite) => invite.status === "待激活").length;
    const expiredFamilyAccountCount = familyInvites.filter((invite) => invite.status === "已过期").length;

    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Section title="账号管理" subtitle="教师账号、家庭端账号和授权状态集中查看。">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["教师账号", teacherProfile.account, teacherProfile.name],
                ["家庭账号", `${pendingFamilyAccountCount} 个待激活`, `${activeFamilyAccountCount} 个已绑定${expiredFamilyAccountCount ? ` · ${expiredFamilyAccountCount} 个已过期` : ""}`],
                ["授权状态", teacherProfile.authorizationStatus, teacherProfile.version]
              ].map(([label, value, desc]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="家庭端账号" subtitle="老师生成邀请，家长激活后即可查看反馈、报告、预约和沟通。">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">家长</th>
                    <th className="px-4 py-3 font-medium">绑定学生</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium">有效期</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {studentList.map((student) => {
                    const invite = familyInvites.find((item) => item.studentId === student.id);
                    const status = invite?.status ?? "未生成";

                    return (
                    <tr key={student.id}>
                      <td className="px-4 py-4 font-medium text-slate-950">{student.parent}</td>
                      <td className="px-4 py-4 text-slate-600">{student.name}</td>
                      <td className="px-4 py-4">
                        <Pill className={status === "已激活" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{status}</Pill>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{invite?.status === "待激活" ? formatDateTimeLabel(invite.expiresAt) : "-"}</td>
                      <td className="px-4 py-4 text-right">
                        <SecondaryButton
                          icon={status === "已激活" ? MessageCircle : Copy}
                          onClick={
                            status === "已激活"
                              ? () => setTeacherView("messages")
                              : () => createInvite(student.id)
                          }
                        >
                          {status === "已激活" ? "沟通" : "复制邀请"}
                        </SecondaryButton>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <Section title="授权与更新" subtitle="试用版本通过授权码获取更新，数据会保留。">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">当前账号</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{teacherProfile.account} / {teacherProfile.name}</p>
            </div>
            <Field label="授权码">
              <TextInput value={authCode} onChange={(event) => setAuthCode(event.target.value)} />
            </Field>
            <PrimaryButton icon={ShieldCheck} disabled={updateBusy !== null} onClick={checkForUpdate}>
              {updateBusy === "checking" ? "检查中..." : "检查授权"}
            </PrimaryButton>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-slate-700">
              当前版本 {teacherProfile.version}，最新版本 {updateState.latestVersion}。后续功能需求可提交到群内，测试通过后推送更新；课程、学生、家长端和课时流水数据都会保留。
            </div>
          </div>
        </Section>
      </div>
    );
  }

  function renderParentHome() {
    const parentHomeRecentLessons = (parentStudentLessons.length >= 5 ? parentStudentLessons : recentLessons).slice(0, 5);
    const nextLesson = parentHomeRecentLessons[1] ?? parentHomeRecentLessons[0] ?? recentLessons[0] ?? initialLessons[0]!;
    const parentHomeFeedbackItems = parentFeedbackItems.length >= 2
      ? parentFeedbackItems.slice(0, 2)
      : [...parentFeedbackItems, ...demoFeedbackItems.filter((item) => !parentFeedbackItems.some((feedback) => feedback.linkedLesson === item.linkedLesson))].slice(0, 2);
    const teacherAlias = formatTeacherAlias(teacherProfile.name);
    const parentSubject = formatParentSubject(teacherProfile.subject);
    const latestParentFeedback = parentHomeFeedbackItems[0];
    const parentHomeStats = [
      ["绑定学生", selectedStudentRecord.name],
      ["授课老师", teacherProfile.name],
      ["剩余课次", `${selectedStudentRecord.remainingLessons} 节`],
      ["已发反馈", `${parentFeedbackItems.length} 条`]
    ];

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">家长端首页</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">你好，{selectedStudentRecord.parent}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton icon={MessageCircle} onClick={() => latestParentFeedback ? openParentCommunicationFromFeedback(0) : setParentView("parentMessages")}>
              发起沟通
            </SecondaryButton>
            <PrimaryButton icon={Calendar} onClick={() => setParentView("booking")}>
              预约课程
            </PrimaryButton>
          </div>
        </div>

        <div className="grid gap-2.5 md:grid-cols-4">
          {parentHomeStats.map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 bg-white px-3.5 py-3">
              <p className="text-[11px] font-medium text-slate-500">{label}</p>
              <p className="mt-1.5 truncate text-lg font-semibold text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Section title="授课老师" subtitle="当前学生关联的老师信息">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-950">{teacherProfile.name}</p>
                    <Pill className="border-slate-200 bg-slate-50 text-slate-700">{parentSubject}</Pill>
                    <Pill className="border-slate-200 bg-slate-50 text-slate-700">{teacherProfile.city}</Pill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{teacherProfile.teacherIntro}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{teacherProfile.parentDisplayNote}</p>
                </div>
                <SecondaryButton className="h-8 px-3 text-xs" onClick={() => setParentView("profile")}>查看资料</SecondaryButton>
              </div>
            </Section>

            <Section
              title="学生近期课程"
              subtitle="查看下一节课和最近课程记录，反馈与沟通可以从这里继续跟进。"
              action={<PrimaryButton className="h-8 px-3 text-xs" onClick={() => setParentView("courses")}>全部课程</PrimaryButton>}
            >
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5">
                <p className="text-[11px] font-medium text-blue-600">下一节课</p>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-950">
                      {parentSubject} · {nextLesson.date} {nextLesson.day} {nextLesson.start}-{nextLesson.end}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">{teacherAlias} · 线下机构 · {nextLesson.subject}</p>
                  </div>
                  <Pill className="border-blue-200 bg-white text-blue-700">今日</Pill>
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="hidden grid-cols-[112px_minmax(0,1fr)_92px_auto] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500 md:grid">
                  <span>日期</span>
                  <span>课程</span>
                  <span>状态</span>
                  <span className="text-right">操作</span>
                </div>
                <div className="divide-y divide-slate-100">
                {parentHomeRecentLessons.map((lesson) => {
                  const feedbackIndex = getParentFeedbackIndexForLesson(lesson);
                  const hasFeedback = feedbackIndex >= 0;

                  return (
                    <div key={lesson.id} className="grid gap-2 px-3 py-2.5 md:grid-cols-[112px_minmax(0,1fr)_92px_auto] md:items-center">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{lesson.date}</p>
                        <p className="text-xs text-slate-500">{lesson.day} {lesson.start}</p>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{parentSubject}</p>
                          <p className="text-sm text-slate-500">{teacherAlias}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {lesson.start}-{lesson.end} · {lesson.subject}
                        </p>
                      </div>
                      <Pill className={statusClass(lesson.feedbackStatus === "未生成" ? lesson.status : lesson.feedbackStatus)}>
                        {lesson.feedbackStatus === "未生成" ? lesson.status : lesson.feedbackStatus}
                      </Pill>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <SecondaryButton
                          className="h-8 px-3 text-xs"
                          disabled={!hasFeedback}
                          onClick={() => openParentFeedbackDetail(feedbackIndex)}
                        >
                          {hasFeedback ? "查看反馈" : "暂无反馈"}
                        </SecondaryButton>
                        <SecondaryButton
                          icon={MessageCircle}
                          className="h-8 px-3 text-xs"
                          disabled={!hasFeedback}
                          onClick={() => openParentCommunicationFromFeedback(feedbackIndex)}
                        >
                          沟通
                        </SecondaryButton>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </Section>
          </div>

          <div className="space-y-4">
            <Section title="最新反馈">
              <div className="space-y-2.5">
                {parentHomeFeedbackItems.map((feedback, index) => (
                  <div key={feedback.linkedLesson} className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-950">{feedback.title}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{feedback.course}</p>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{feedback.body}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <PrimaryButton className="h-8 flex-1 px-3 text-xs" onClick={() => openParentFeedbackDetail(index)}>
                        查看全文
                      </PrimaryButton>
                      <SecondaryButton icon={MessageCircle} className="h-8 px-3 text-xs" onClick={() => openParentCommunicationFromFeedback(index)}>
                        沟通
                      </SecondaryButton>
                    </div>
                  </div>
                ))}
                {!parentHomeFeedbackItems.length ? (
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    老师发布 {selectedStudentRecord.name} 的课后反馈后，会同步显示在这里。
                  </div>
                ) : null}
              </div>
            </Section>

            <Section title="学习报告">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">{parentLatestVisibleReport?.period ?? "等待老师确认保存"}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {parentLatestVisibleReport?.title ?? `${selectedStudentRecord.name} 暂无已发布学习报告`}
                    </p>
                  </div>
                  <Pill className={parentLatestVisibleReport ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                    {parentLatestVisibleReport ? "已发布" : "待发布"}
                  </Pill>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {parentLatestVisibleReport?.parentSummary || parentLatestVisibleReport?.summary || "老师在学生档案中生成并确认保存后，这里会展示成绩波动、薄弱点和近期巩固方向。"}
                </p>
                <SecondaryButton icon={FileText} className="mt-4 h-8 text-xs" onClick={() => setParentView("reports")} disabled={!parentLatestVisibleReport}>
                  {parentLatestVisibleReport ? "查看报告" : "等待发布"}
                </SecondaryButton>
              </div>
            </Section>

            <Section title={`${selectedStudentRecord.name} · 账务摘要`}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">剩余课次</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{selectedStudentRecord.remainingLessons}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">流水记录</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{parentFinanceEvents.length} 笔</p>
                </div>
              </div>
            </Section>

            <Section title="通知" action={<SecondaryButton className="h-8 px-3 text-xs" onClick={() => setParentView("notifications")}>查看全部</SecondaryButton>}>
              <div className="space-y-3">
                {[
                  ["反馈", selectedStudentRecord.name, parentFeedbackItems.length ? "新课后反馈" : "暂无新反馈", parentFeedbackItems.length ? "数学课后反馈已发布" : "老师发布后会在这里提醒"],
                  ["预约", selectedStudentRecord.name, "预约状态", "预约申请提交后会同步老师端审核状态"]
                ].map(([type, student, title, desc]) => (
                  <div key={`${type}-${title}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 size-2 rounded-full bg-rose-500" />
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{type} · {student}</p>
                        <p className="mt-1 text-sm text-slate-700">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    );
  }

  function renderParentCourses() {
    const nextLesson = parentRecentLessons[1] ?? parentRecentLessons[0] ?? recentLessons[0] ?? initialLessons[0]!;
    const teacherAlias = formatTeacherAlias(teacherProfile.name);
    const parentSubject = formatParentSubject(teacherProfile.subject);

    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Section
          title="课程"
          subtitle="查看下一节课和最近课程记录，家长可直接围绕课程反馈发起沟通。"
          action={<PrimaryButton icon={Calendar} className="h-8 px-3 text-xs" onClick={() => setParentView("booking")}>预约</PrimaryButton>}
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs text-slate-500">下一节课</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{parentSubject} · {nextLesson.date} {nextLesson.day} {nextLesson.start}-{nextLesson.end}</p>
            <p className="mt-2 text-sm text-slate-500">{teacherAlias} · 线下机构 · {nextLesson.subject}</p>
          </div>

          <div className="mt-5 space-y-2">
            {parentRecentLessons.map((lesson) => {
              const feedbackIndex = getParentFeedbackIndexForLesson(lesson);
              const hasFeedback = feedbackIndex >= 0;

              return (
                <div key={lesson.id} className="grid gap-3 rounded-lg border border-slate-200 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{parentSubject}</p>
                      <p className="text-sm text-slate-500">{teacherAlias}</p>
                      <Pill className={statusClass(lesson.feedbackStatus === "未生成" ? lesson.status : lesson.feedbackStatus)}>
                        {lesson.feedbackStatus === "未生成" ? lesson.status : lesson.feedbackStatus}
                      </Pill>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{lesson.date} {lesson.day} · {lesson.start}-{lesson.end} · {lesson.subject}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <SecondaryButton className="h-8 px-3 text-xs" disabled={!hasFeedback} onClick={() => openParentFeedbackDetail(feedbackIndex)}>
                      {hasFeedback ? "查看反馈" : "暂无反馈"}
                    </SecondaryButton>
                    <SecondaryButton icon={MessageCircle} className="h-8 px-3 text-xs" disabled={!hasFeedback} onClick={() => openParentCommunicationFromFeedback(feedbackIndex)}>
                      沟通
                    </SecondaryButton>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <div className="space-y-5">
          <Section title="授课老师">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">当前关联老师</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{teacherProfile.name}</p>
              <p className="mt-2 text-sm text-slate-500">{teacherProfile.studioName} · {teacherProfile.subject}</p>
            </div>
          </Section>
          <Section title="课程摘要">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">最近课程</span><span className="font-semibold text-slate-950">{parentRecentLessons.length} 条</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">已反馈</span><span className="font-semibold text-slate-950">{parentFeedbackItems.length} 条</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">剩余课次</span><span className="font-semibold text-slate-950">{selectedStudentRecord.remainingLessons}</span></div>
            </div>
          </Section>
        </div>
      </div>
    );
  }

  function renderParentBilling() {
    const parentLedgerRows = parentFinanceEvents.slice(0, 5);
    const latestDeduction = parentFinanceEvents.find((event) => event.action === "扣课");
    const parentPaidTotal = parentFinanceEvents.reduce((sum, row) => sum + financeCashValue(row), 0);
    const parentDeductionCount = parentFinanceEvents.filter((event) => event.action === "扣课").length;

    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Section title="账务" subtitle="家长端查看当前剩余课次、已收款和每次扣课流水。">
          <div className="grid gap-2.5 md:grid-cols-3">
            {[
              ["剩余课次", `${selectedStudentRecord.remainingLessons}`, "预充值模式"],
              ["已收金额", formatCurrency(parentPaidTotal), `${parentFinanceEvents.filter((event) => financeCashValue(event) > 0).length} 笔收款`],
              ["扣课记录", `${parentDeductionCount} 笔`, latestDeduction?.date ?? "等待老师记录"]
            ].map(([label, value, desc]) => (
              <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1.5 text-xl font-semibold text-slate-950">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 font-medium">日期</th>
                  <th className="px-3 py-2.5 font-medium">类型</th>
                  <th className="px-3 py-2.5 font-medium">说明</th>
                  <th className="px-3 py-2.5 text-right font-medium">变化</th>
                  <th className="px-3 py-2.5 text-right font-medium">余额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {parentLedgerRows.map((row, index) => (
                  <tr key={`${row.date}-${row.action}-${row.amount}-${row.balance}-${index}`}>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{row.date}</td>
                    <td className="px-3 py-3">
                      <Pill className={row.action === "充值" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : row.action === "撤销" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{row.action}</Pill>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <p>{row.note}</p>
                      {row.cashAmount ? <p className="mt-1 text-xs text-emerald-700">收款 {row.cashAmount}</p> : null}
                    </td>
                    <td className={cn("whitespace-nowrap px-3 py-3 text-right font-semibold", row.amount.startsWith("+") ? "text-emerald-700" : "text-amber-700")}>{row.amount}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600">{row.balance}</td>
                  </tr>
                ))}
                {!parentLedgerRows.length ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>
                      暂无该学生的课时流水。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="付款方式">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">模式</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">预充值</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">老师端记录充值、扣课和撤销后，家长端实时查看剩余课次。</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">已收款</span><strong className="text-slate-950">{formatCurrency(parentPaidTotal)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">流水数</span><strong className="text-slate-950">{parentFinanceEvents.length} 笔</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">最近扣课</span><strong className="text-slate-950">{latestDeduction?.date ?? "暂无"}</strong></div>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  function renderParentFeedback() {
    return (
      <Section title="反馈" subtitle="查看老师最近发送的课程反馈，也可以直接围绕某次反馈发起沟通。">
        <div className="space-y-3">
          {parentFeedbackItems.map((feedback, index) => (
            <div key={feedback.linkedLesson} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{feedback.title}</p>
                    <Pill className={statusClass(feedback.status)}>{feedback.status}</Pill>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{feedback.course}</p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{feedback.body}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <PrimaryButton className="h-8 px-3 text-xs" onClick={() => openParentFeedbackDetail(index)}>查看全文</PrimaryButton>
                  <SecondaryButton icon={MessageCircle} className="h-8 px-3 text-xs" onClick={() => openParentCommunicationFromFeedback(index)}>沟通</SecondaryButton>
                </div>
              </div>
            </div>
          ))}
          {!parentFeedbackItems.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              暂无 {selectedStudentRecord.name} 的已发布课程反馈。
            </div>
          ) : null}
        </div>
      </Section>
    );
  }

  function renderParentReports() {
    const visibleReport = parentVisibleReports[0];
    const parentReportSummary = visibleReport?.parentSummary || visibleReport?.summary;
    const scorePercent = (score: string) => {
      const [valueRaw, totalRaw] = score.split("/").map((part) => Number(part.trim()));
      return Number.isFinite(valueRaw) && Number.isFinite(totalRaw) && totalRaw > 0 ? Math.round((valueRaw / totalRaw) * 100) : 0;
    };

    return (
      <Section title="学习报告" subtitle="老师确认保存后，家长端可查看阶段学习情况。">
        {visibleReport ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_290px]">
            <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-blue-50 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-blue-700">{visibleReport.period}</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">{visibleReport.title}</h3>
                    <p className="mt-1 text-xs text-blue-700">{visibleReport.dataQuality} · 家长端已同步</p>
                  </div>
                  <Pill className="border-emerald-200 bg-white text-emerald-700">已发布</Pill>
                </div>
              </div>

              <div className="space-y-4 px-4 py-4">
                <section className="rounded-md border border-blue-100 bg-blue-50 p-3">
                  <p className="text-sm font-semibold text-slate-950">阶段总结</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{parentReportSummary}</p>
                </section>

                <section>
                  <p className="text-sm font-semibold text-slate-950">近期成绩</p>
                  <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
                    <div className="grid min-w-[560px] grid-cols-[82px_126px_96px_90px_1fr] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                      <span>日期</span>
                      <span>考试</span>
                      <span>成绩</span>
                      <span>排名</span>
                      <span>情况</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {visibleReport.scoreTrend.slice(0, 4).map((score) => {
                        const percent = scorePercent(score.score);

                        return (
                          <div key={`${score.exam}-${score.date}`} className="grid min-w-[560px] grid-cols-[82px_126px_96px_90px_1fr] items-center px-3 py-2.5 text-sm">
                            <span className="font-medium text-slate-950">{score.date}</span>
                            <span className="text-slate-600">{score.exam}</span>
                            <span className="font-semibold text-blue-700">{score.score}</span>
                            <span className="text-slate-600">{score.rank}</span>
                            <span className="text-xs leading-5 text-slate-500">
                              <span className="mr-2 inline-block h-1.5 w-14 overflow-hidden rounded-full bg-slate-200 align-middle">
                                <span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.max(8, Math.min(100, percent))}%` }} />
                              </span>
                              {score.note}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section>
                  <p className="text-sm font-semibold text-slate-950">当前薄弱点</p>
                  <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
                    <div className="grid min-w-[500px] grid-cols-[160px_86px_1fr] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                      <span>薄弱点</span>
                      <span>级别</span>
                      <span>后续安排</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {visibleReport.weaknessSummary.map((weakness) => (
                        <div key={weakness.tag} className="grid min-w-[500px] grid-cols-[160px_86px_1fr] items-center px-3 py-2.5 text-sm">
                          <span className="font-medium text-slate-950">{weakness.tag}</span>
                          <Pill className={cn("w-fit", statusClass(weakness.level))}>{weakness.level}</Pill>
                          <span className="text-xs leading-5 text-slate-600">{weakness.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-950">近期课程反馈</p>
                    <div className="mt-2 space-y-2">
                      {visibleReport.sections.slice(0, 3).map((section) => (
                        <div key={section.title} className="rounded-md bg-white px-3 py-2">
                          <p className="text-xs font-semibold text-slate-900">{section.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{section.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-semibold text-emerald-900">后续巩固方向</p>
                    <div className="mt-2 space-y-2">
                      {visibleReport.suggestions.slice(0, 4).map((suggestion, index) => (
                        <p key={suggestion} className="rounded-md border border-emerald-100 bg-white px-3 py-2 text-xs leading-5 text-emerald-800">
                          <span className="mr-1 font-semibold">#{index + 1}</span>{suggestion}
                        </p>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </article>

            <aside className="min-w-0 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-950">报告概览</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["成绩", `${visibleReport.scoreTrend.length} 次`],
                    ["薄弱点", `${visibleReport.weaknessSummary.length} 项`],
                    ["反馈", `${visibleReport.sections.length} 条`],
                    ["建议", `${visibleReport.suggestions.length} 条`]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-slate-100 bg-slate-50 p-2">
                      <p className="text-slate-500">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-950">报告来源</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {visibleReport.sources.map((source) => (
                    <Pill key={source} className="border-slate-200 bg-slate-50 text-slate-600">{source}</Pill>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">报告由老师确认保存后同步，未保存草稿不会出现在家长端。</p>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-slate-950">关联课程反馈</p>
                <div className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                  {visibleReport.feedbackHighlights.map((highlight) => (
                    <p key={highlight} className="rounded-md bg-white px-3 py-2">{highlight}</p>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <FileText className="mx-auto size-10 text-slate-400" />
            <p className="mt-3 font-semibold text-slate-950">暂无已发布学习报告</p>
            <p className="mt-2 text-sm text-slate-500">老师在学生档案中生成并确认保存后，这里会展示成绩波动、薄弱点和近期巩固方向。</p>
          </div>
        )}
      </Section>
    );
  }

  function renderParentNotifications() {
    const latestBooking = bookings.find((booking) => booking.student === selectedStudentRecord.name) ?? bookings[0];
    const notificationItems: Array<{
      id: string;
      title: string;
      desc: string;
      time: string;
      status: string;
      icon: LucideIcon;
      tone: string;
      click: () => void;
    }> = [
      {
        id: "feedback",
        title: "最新反馈",
        desc: parentFeedbackItems.length ? `${parentFeedbackItems[0]?.linkedLesson} 已同步` : `${selectedStudentRecord.name} 暂无新反馈`,
        time: "今天 14:18",
        status: parentFeedbackItems.length ? "已同步" : "待发布",
        icon: MessageCircle,
        tone: parentFeedbackItems.length ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500",
        click: () => (parentFeedbackItems.length ? setParentView("feedback") : setParentView("courses"))
      },
      {
        id: "booking",
        title: "预约申请",
        desc: latestBooking ? `${latestBooking.date} ${latestBooking.start}-${latestBooking.end} · ${latestBooking.status}` : "提交预约后，老师端会审核并同步状态",
        time: latestBooking?.date ?? "待提交",
        status: latestBooking?.status ?? "待提交",
        icon: Calendar,
        tone: latestBooking?.status === "冲突" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-blue-200 bg-blue-50 text-blue-700",
        click: () => setParentView("booking")
      },
      {
        id: "report",
        title: "学习报告",
        desc: parentLatestVisibleReport ? `${parentLatestVisibleReport.title} 已发布` : `${selectedStudentRecord.name} 暂无已发布学习报告`,
        time: parentLatestVisibleReport?.period ?? "等待老师确认",
        status: parentLatestVisibleReport ? "已发布" : "待发布",
        icon: FileText,
        tone: parentLatestVisibleReport ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700",
        click: () => setParentView("reports")
      },
      {
        id: "billing",
        title: "课时流水",
        desc: `${selectedStudentRecord.name} 当前剩余 ${selectedStudentRecord.remainingLessons} 课时，最近共有 ${parentFinanceEvents.length} 笔流水。`,
        time: parentFinanceEvents[0]?.date ?? "暂无流水",
        status: "可查看",
        icon: Wallet,
        tone: "border-slate-200 bg-slate-50 text-slate-600",
        click: () => setParentView("billing")
      }
    ];

    return (
      <Section title="通知" subtitle="家长端集中查看课程、反馈、报告和预约状态提醒。">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="grid grid-cols-[88px_minmax(0,1fr)_92px] border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500">
              <span>时间</span>
              <span>提醒</span>
              <span className="text-right">状态</span>
            </div>
            <div className="divide-y divide-slate-100">
              {notificationItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.click}
                    className="grid w-full grid-cols-[88px_minmax(0,1fr)_92px] items-center gap-3 px-3 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="text-xs text-slate-500">{item.time}</span>
                    <span className="flex min-w-0 items-start gap-2.5">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-950">{item.title}</span>
                        <span className="mt-1 block truncate text-xs text-slate-500">{item.desc}</span>
                      </span>
                    </span>
                    <span className="justify-self-end">
                      <Pill className={item.tone}>{item.status}</Pill>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-950">提醒摘要</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">已发反馈</span><strong className="text-slate-950">{parentFeedbackItems.length} 条</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">学习报告</span><strong className="text-slate-950">{parentLatestVisibleReport ? "1 份" : "0 份"}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">预约记录</span><strong className="text-slate-950">{bookings.filter((booking) => booking.student === selectedStudentRecord.name).length} 条</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">课时流水</span><strong className="text-slate-950">{parentFinanceEvents.length} 笔</strong></div>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  function renderParentProfile() {
    const teacherAlias = formatTeacherAlias(teacherProfile.name);
    const parentAccessItems = [
      ["课程记录", `${parentRecentLessons.length} 条`],
      ["课后反馈", `${parentFeedbackItems.length} 条`],
      ["学习报告", parentLatestVisibleReport ? "已发布" : "待发布"],
      ["课时流水", `${parentFinanceEvents.length} 笔`],
      ["预约排课", bookings.some((booking) => booking.student === selectedStudentRecord.name) ? "有记录" : "可提交"]
    ];

    return (
      <Section title="我的资料" subtitle="家庭门户资料与绑定学生信息。">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["家长账号", selectedStudentRecord.parent],
                ["绑定学生", `${selectedStudentRecord.name} · ${selectedStudentRecord.grade}`],
                ["剩余课次", `${selectedStudentRecord.remainingLessons} 节`]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1.5 text-lg font-semibold text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
              <div className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500">
                <span>项目</span>
                <span>信息</span>
              </div>
              {[
                ["授课老师", `${teacherProfile.name} · ${teacherProfile.studioName}`],
                ["授课方向", `${teacherProfile.subject} · ${teacherProfile.city}`],
                ["绑定说明", teacherProfile.parentDisplayNote],
                ["最近课程", parentRecentLessons[0] ? `${parentRecentLessons[0].date} ${parentRecentLessons[0].start}-${parentRecentLessons[0].end} · ${parentRecentLessons[0].subject}` : "暂无课程"],
                ["最近反馈", parentFeedbackItems[0]?.linkedLesson ?? "暂无反馈"]
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-slate-100 px-3 py-3 last:border-b-0">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="min-w-0 text-sm font-medium text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">当前关联老师</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{teacherAlias}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">{teacherProfile.teacherIntro}</p>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-950">可见内容</p>
              <div className="mt-3 space-y-2 text-sm">
                {parentAccessItems.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{label}</span>
                    <strong className="text-slate-950">{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  function renderParentBooking() {
    const slotsForDate = openSlots.filter((slot) => slot.date === bookingDate);
    const conflictItemsForDate = buildBookingConflictItemsForDate(bookingDate);
    const [selectedStart, selectedEnd] = bookingTime.split("-");
    const selectedSlot = slotsForDate.find((slot) => bookingTimeWithinSlot(slot, selectedStart, selectedEnd));
    const selectedSlotConflicts = selectedSlot
      ? conflictItemsForDate.filter((item) => isOverlapping(selectedStart, selectedEnd, item.start, item.end))
      : [];
    const bookingOptions = buildBookingTimeOptions(slotsForDate, conflictItemsForDate);
    const visibleBookingOptions = bookingOnlyAvailable ? bookingOptions.filter((option) => option.conflictItems.length === 0) : bookingOptions;
    const availableBookingOptions = bookingOptions.filter((option) => option.conflictItems.length === 0);
    const conflictBookingOptions = bookingOptions.filter((option) => option.conflictItems.length > 0);
    const recommendedBookingOptions = availableBookingOptions.slice(0, 3);
    const selectedDay = scheduleDays.find((day) => day.date === bookingDate);
    const latestBooking = bookings.find((booking) => booking.student === selectedStudentRecord.name) ?? bookings[0];
    const parentBookingRows = [
      ["08:00", "10:00"],
      ["10:30", "12:30"],
      ["12:30", "14:30"],
      ["14:30", "16:00"],
      ["16:00", "18:00"],
      ["18:00", "20:00"]
    ] as const;

    return (
      <>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Section
          title="可预约时段"
          subtitle="蓝色表示老师开放预约，黄色表示已有课程；提交后若冲突，老师端会提示并可调整通过。"
        >
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[76px_repeat(4,minmax(140px,1fr))] border-b border-slate-200 bg-slate-50">
                <div className="px-3 py-2.5 text-xs font-medium text-slate-500">时间</div>
                {scheduleDays.map(({ date, day }) => {
                  const lessonCount = lessons.filter((lesson) => lesson.date === date).length;
                  const slotCount = openSlots.filter((slot) => slot.date === date).length;

                  return (
                    <button
                      type="button"
                      key={date}
                      onClick={() => chooseBookingDate(date)}
                      className={cn(
                        "border-l border-slate-200 px-3 py-2.5 text-left transition hover:bg-blue-50",
                        bookingDate === date ? "bg-blue-50" : "bg-slate-50"
                      )}
                    >
                      <p className="font-semibold text-slate-950">{date}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{day} · {lessonCount} 节 · 开放 {slotCount}</p>
                    </button>
                  );
                })}
              </div>

              {parentBookingRows.map(([start, end]) => (
                <div key={`${start}-${end}`} className="grid min-h-[94px] grid-cols-[76px_repeat(4,minmax(140px,1fr))] border-b border-slate-100 last:border-b-0">
                  <div className="bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                    <p>{start}</p>
                    <p className="mt-1">{end}</p>
                  </div>
                  {scheduleDays.map(({ date }) => {
                    const lessonHere = lessons.find((lesson) => lesson.date === date && lesson.start === start);
                    const slotHere = openSlots.find((slot) => slot.date === date && toMinutes(start) >= toMinutes(slot.start) && toMinutes(end) <= toMinutes(slot.end));
                    const isSelected = bookingDate === date && bookingTime === `${start}-${end}`;

                    return (
                      <div key={`${date}-${start}`} className={cn("border-l border-slate-100 p-1", slotHere ? "bg-blue-50/40" : undefined)}>
                        {lessonHere ? (
                          <div className="h-full rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-950">
                            <p className="text-xs font-semibold">{lessonHere.student}</p>
                            <p className="mt-1 text-xs text-amber-700">{lessonHere.subject}</p>
                            <p className="mt-1 text-[11px] text-amber-700">{lessonHere.start}-{lessonHere.end}</p>
                          </div>
                        ) : slotHere ? (
                          <button
                            type="button"
                            onClick={() => {
                              chooseBookingDate(date);
                              setBookingTime(`${start}-${end}`);
                            }}
                            className={cn(
                              "flex h-full w-full flex-col items-start rounded border px-2 py-1.5 text-left transition",
                              isSelected ? "border-blue-500 bg-blue-100 ring-2 ring-blue-100" : "border-blue-200 bg-blue-50 hover:bg-blue-100"
                            )}
                          >
                            <p className="text-xs font-semibold text-blue-700">Qrane</p>
                            <p className="mt-1 text-[11px] text-blue-600">14h · 线上</p>
                            <span className="mt-auto rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700">可预约</span>
                          </button>
                        ) : (
                          <div className="grid h-full place-items-center rounded-sm border border-dashed border-slate-200 text-xs text-slate-300">+</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Section>

        <div className="space-y-4">
          <Section title="提交预约" subtitle="选择时段后提交，老师端审核通过后会进入排课总表。">
            <div className="space-y-3">
              <Field label="学生">
                <TextInput value={bookingStudent} onChange={(event) => setBookingStudent(event.target.value)} />
              </Field>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">已选预约</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {bookingDate} {selectedDay?.day ?? ""} {bookingTime}
                </p>
                <p className="mt-1 text-xs text-slate-500">{teacherProfile.name} · 提交后等待老师审核</p>
              </div>
              <SecondaryButton icon={Calendar} className="w-full" onClick={() => setParentBookingPickerOpen(true)}>
                选择可预约时间
              </SecondaryButton>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500">冲突排除</p>
                  <Pill className="border-blue-200 bg-blue-50 text-blue-700">
                    可选 {availableBookingOptions.length}
                  </Pill>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  系统已根据黄色课程和待审核预约，自动排除 {conflictBookingOptions.length} 个冲突时间格。
                </p>
                <div className="mt-2 grid gap-1.5">
                  {recommendedBookingOptions.map((option) => (
                    <button
                      type="button"
                      key={`recommended-parent-booking-${option.value}`}
                      onClick={() => setBookingTime(option.value)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition",
                        bookingTime === option.value ? "border-zinc-950 bg-zinc-50 text-zinc-950" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                      )}
                    >
                      <span>{option.value}</span>
                      <span>{bookingTime === option.value ? "已选" : "无冲突"}</span>
                    </button>
                  ))}
                  {!recommendedBookingOptions.length ? (
                    <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      当前日期暂无无冲突时段，可查看全部时间后提交给老师调整。
                    </p>
                  ) : null}
                </div>
              </div>
              {selectedSlotConflicts.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>
                      该时段与{" "}
                      {selectedSlotConflicts.map((item) => `${item.kind} ${item.start}-${item.end} ${item.student}`).join("、")} 接近，提交后老师可在审核页调整。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">当前时段暂无明显冲突，可直接提交预约。</div>
              )}
              <PrimaryButton icon={Calendar} className="w-full" onClick={submitParentBooking}>提交预约</PrimaryButton>
            </div>
          </Section>

          <Section title="最近预约状态">
            {latestBooking ? (
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{latestBooking.date} {latestBooking.start}-{latestBooking.end}</p>
                  <Pill className={cn("shrink-0", statusClass(latestBooking.status))}>{latestBooking.status}</Pill>
                </div>
                <p className="mt-2 text-sm text-slate-500">{latestBooking.student}</p>
                {latestBooking.conflictNote ? <p className="mt-2 text-xs text-amber-700">{latestBooking.conflictNote}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">暂无预约申请。</p>
            )}
          </Section>
        </div>
      </div>
      {parentBookingPickerOpen ? (
        <Modal
          title="选择可预约的时间"
          subtitle={`2026-${bookingDate} 08:00-22:00 · ${teacherProfile.name}`}
          onClose={() => setParentBookingPickerOpen(false)}
          wide
        >
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">可选时间格</p>
                  <p className="mt-1 text-xs text-slate-500">
                    当前日期共 {bookingOptions.length} 个候选时间，其中 {availableBookingOptions.length} 个无冲突、{conflictBookingOptions.length} 个需老师调整。
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={bookingOnlyAvailable}
                    onChange={(event) => setBookingOnlyAvailable(event.target.checked)}
                    className="size-4 rounded border-slate-300 accent-zinc-950"
                  />
                  只显示可预约时间
                </label>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {visibleBookingOptions.map((option) => {
                const active = bookingTime === option.value;
                const hasConflict = option.conflictItems.length > 0;

                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setBookingTime(option.value)}
                    className={cn(
                      "min-h-[68px] rounded-md border bg-white px-3 py-2.5 text-left transition",
                      active ? "border-zinc-950 ring-2 ring-zinc-100" : hasConflict ? "border-amber-200 hover:bg-amber-50" : "border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-950">{option.value}</p>
                      {active ? <Check className="size-4 text-zinc-950" /> : null}
                    </div>
                    <p className={cn("mt-2 text-xs", hasConflict ? "text-amber-700" : "text-slate-500")}>
                      {hasConflict
                        ? `需老师调整：${option.conflictItems.map((item) => `${item.kind}${item.start}-${item.end}`).join("、")}`
                        : "可直接提交等待排课"}
                    </p>
                  </button>
                );
              })}

              {!visibleBookingOptions.length ? (
                <div className="col-span-full rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                  {bookingOptions.length ? "暂无无冲突时段，可取消勾选查看需要老师调整的时间。" : "当天暂无老师开放的预约窗口。"}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">已选：{bookingDate} {bookingTime}</p>
              <div className="flex flex-wrap justify-end gap-2">
                <SecondaryButton onClick={() => setParentBookingPickerOpen(false)}>取消</SecondaryButton>
                <PrimaryButton icon={Calendar} onClick={submitParentBooking}>提交预约</PrimaryButton>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
      </>
    );
  }

  function renderTeacherView() {
    if (teacherView === "dashboard") return renderDashboard();
    if (teacherView === "students") return renderStudents();
    if (teacherView === "classes") return renderClasses();
    if (teacherView === "schedule") return renderSchedule();
    if (teacherView === "messages") return renderMessages(false);
    if (teacherView === "finance") return renderFinance();
    if (teacherView === "account") return renderAccount();
    if (teacherView === "updates") return renderSystemUpdate();
    return renderSettings();
  }

  function renderParentView() {
    if (parentView === "home") return renderParentHome();
    if (parentView === "courses") return renderParentCourses();
    if (parentView === "billing") return renderParentBilling();
    if (parentView === "feedback") return renderParentFeedback();
    if (parentView === "reports") return renderParentReports();
    if (parentView === "booking") return renderParentBooking();
    if (parentView === "notifications") return renderParentNotifications();
    if (parentView === "parentMessages") return renderMessages(true);
    if (parentView === "profile") return renderParentProfile();
    return renderMessages(true);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {role === "teacher" ? (
        <div className="flex min-w-0 flex-col lg:flex-row">
          {renderSidebar()}
          <div className="min-w-0 max-w-full flex-1 overflow-x-hidden">
            <main className="mx-auto w-full min-w-0 max-w-[1420px] px-3 py-4 sm:px-5">{renderTeacherView()}</main>
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          {renderParentPortalHeader()}
          <main className="mx-auto w-full min-w-0 max-w-[1120px] px-3 py-4 sm:px-5">{renderParentView()}</main>
        </div>
      )}

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <Check className="size-4 text-emerald-300" />
          {toast}
        </div>
      ) : null}

      {parentFeedbackDetailOpen ? (
        <Modal title="反馈详情" subtitle="查看老师发送的完整反馈，并可围绕本次课程发起沟通。" onClose={() => setParentFeedbackDetailOpen(false)} wide>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-3">
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-slate-950">{selectedParentFeedback.title}</p>
                    <p className="mt-1 text-xs text-blue-700">自动关联：{selectedParentFeedback.linkedLesson}</p>
                  </div>
                  <Pill className={statusClass(selectedParentFeedback.status)}>{selectedParentFeedback.status}</Pill>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
                  <div className="rounded-md border border-blue-100 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">学生</p>
                    <p className="mt-1 font-semibold text-slate-950">{selectedParentFeedback.student}</p>
                  </div>
                  <div className="rounded-md border border-blue-100 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">授课老师</p>
                    <p className="mt-1 font-semibold text-slate-950">{selectedParentFeedback.teacher}</p>
                  </div>
                  <div className="rounded-md border border-blue-100 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">课程</p>
                    <p className="mt-1 font-semibold text-slate-950">{selectedParentFeedback.subject}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="font-semibold text-slate-950">反馈正文</p>
                </div>
                <div className="whitespace-pre-line px-4 py-3 text-sm leading-7 text-slate-700">
                  {selectedParentFeedback.body}
                </div>
              </div>

              {selectedParentFeedback.attachments.length ? (
                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-950">附件分析依据</p>
                  <div className="mt-2 space-y-2">
                    {selectedParentFeedback.attachments.map((attachment) => (
                      <div key={`${selectedParentFeedback.title}-${attachment.name}`} className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill className="border-blue-200 bg-white text-blue-700">{attachment.status}</Pill>
                          <span className="font-medium">{attachment.name}</span>
                          <span className="text-xs text-blue-500">{attachment.kind}</span>
                        </div>
                        <p className="mt-2 text-blue-800">{attachment.analysis}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-950">围绕本次反馈沟通</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">系统会自动带上课程和反馈上下文，老师端会在沟通中心看到。</p>
                <PrimaryButton icon={MessageCircle} className="mt-3 w-full" onClick={() => openParentCommunicationFromFeedback(selectedParentFeedbackIndex)}>
                  发起沟通
                </PrimaryButton>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">关联课程</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{selectedParentFeedback.course}</p>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                示例：孩子的离心率问题涉及到取值范围还不太会，可以请老师下次课重点讲。
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {licenseModalOpen ? (
        <Modal title="管理授权" subtitle="输入授权码后可检查更新；更新会保留课程、学生、家长账号和课时流水。" onClose={() => setLicenseModalOpen(false)} wide>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 text-emerald-700" />
                  <div>
                    <p className="font-semibold text-slate-950">升级授权状态：{teacherProfile.authorizationStatus === "授权失效" ? "未授权" : "已授权"}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">服务有效期至：{teacherProfile.serviceExpiresAt}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <Field label="授权码">
                  <TextInput value={authCode} onChange={(event) => setAuthCode(event.target.value)} />
                </Field>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs text-slate-500">当前版本</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{teacherProfile.version}</p>
                  <p className="mt-1 text-xs text-slate-500">最新 {updateState.latestVersion}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950">更新说明</div>
                <div className="divide-y divide-slate-100">
                  {updateState.notes.map((note, index) => (
                    <div key={`license-note-${note}`} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 px-3 py-2.5">
                      <Pill className={index === 0 ? getUpdateStatusClass(updateState.status) : "border-slate-200 bg-slate-50 text-slate-600"}>
                        {index === 0 ? updateState.status : "包含"}
                      </Pill>
                      <p className="text-sm leading-6 text-slate-600">{note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <SecondaryButton onClick={() => setLicenseModalOpen(false)}>取消</SecondaryButton>
                <SecondaryButton icon={Upload} disabled={updateState.status !== "可更新" || updateBusy !== null} onClick={applyVersionUpdate}>
                  {updateBusy === "updating" ? "更新中..." : "执行更新"}
                </SecondaryButton>
                <PrimaryButton icon={RotateCcw} disabled={updateBusy !== null} onClick={checkForUpdate}>
                  {updateBusy === "checking" ? "检查中..." : "检查更新"}
                </PrimaryButton>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-950">数据保留</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">执行更新前后保留当前老师的核心数据。</p>
                <div className="mt-3 space-y-2">
                  {updateRetentionItems.map((item) => (
                    <div key={`license-retain-${item.label}`} className="flex items-center justify-between gap-2 rounded-md border border-emerald-100 bg-white px-3 py-2 text-sm">
                      <span className="text-slate-600">{item.label}</span>
                      <strong className="text-emerald-700">{item.count}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-700">
                授权码校验通过后，可以检查并执行更新；如果你在群内提交功能需求，测试通过后也会通过这个更新通道推送。
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {featureRequestModalOpen ? (
        <Modal title="提交功能需求" subtitle="模拟群内需求入口：测试通过后会推送到系统更新。" onClose={() => setFeatureRequestModalOpen(false)}>
          <div className="space-y-4">
            <Field label="需求标题">
              <TextInput value={featureRequestTitle} onChange={(event) => setFeatureRequestTitle(event.target.value)} />
            </Field>
            <Field label="具体说明">
              <TextArea value={featureRequestBody} onChange={(event) => setFeatureRequestBody(event.target.value)} />
            </Field>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-700">
              提交后会进入授权用户需求池；测试通过后推送更新，历史课程、课时流水和家庭账号数据会保留。
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <SecondaryButton onClick={() => setFeatureRequestModalOpen(false)}>取消</SecondaryButton>
              <PrimaryButton icon={Send} onClick={submitFeatureRequest}>提交需求</PrimaryButton>
            </div>
          </div>
        </Modal>
      ) : null}

      {parentCommunicationOpen ? (
        <Modal
          title="发起沟通"
          subtitle="沟通会自动带上课程和反馈上下文，老师端会在沟通中心看到。"
          onClose={() => setParentCommunicationOpen(false)}
        >
          <div className="space-y-4">
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-blue-600">已关联反馈</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-950">{selectedParentFeedback.title}</p>
                  <p className="mt-1 truncate text-xs text-blue-700">{selectedParentFeedback.course}</p>
                </div>
                <Pill className={statusClass(selectedParentFeedback.status)}>{selectedParentFeedback.status}</Pill>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-800">联系对象</p>
              <div className="grid grid-cols-2 gap-2">
                {(["老师", "负责人"] as const).map((target) => (
                  <button
                    type="button"
                    key={target}
                    onClick={() => setParentContactRole(target)}
                    className={cn(
                      "h-9 rounded-md border text-sm font-semibold transition",
                      parentContactRole === target
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                  >
                    {target}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-800">问题类型</p>
              <div className="flex flex-wrap gap-2">
                {(["排课", "请假", "反馈", "账务", "其他"] as ParentIssueType[]).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setParentIssueType(type)}
                    className={cn(
                      "h-9 rounded-md border px-4 text-sm font-medium transition",
                      parentIssueType === type ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <Field label="标题">
              <TextInput value={parentQuestionTitle} onChange={(event) => setParentQuestionTitle(event.target.value)} placeholder="例如：想让老师讲讲取值范围的问题" className="h-10" />
            </Field>
            <Field label="沟通内容">
              <TextArea value={parentQuestionBody} onChange={(event) => setParentQuestionBody(event.target.value)} placeholder="把具体情况写清楚，老师或负责人会尽快回复您。" className="min-h-24" />
            </Field>
            <PrimaryButton icon={Send} className="h-10 w-full rounded-md text-sm" onClick={sendParentQuestion} disabled={!parentCommunicationReady}>
              发送沟通
            </PrimaryButton>
          </div>
        </Modal>
      ) : null}

      {lessonStatusTarget && lessonStatusPreview ? (
        <Modal
          title="确认课程状态"
          subtitle="确认后会同步今日课程、学生课程记录和课时流水。"
          onClose={() => setLessonStatusTarget(null)}
          narrow
        >
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">本节课程</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">{lessonStatusPreview.student}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {lessonStatusPreview.date} {lessonStatusPreview.start}-{lessonStatusPreview.end} · {lessonStatusPreview.subject} · {lessonStatusPreview.kind}
                  </p>
                </div>
                <Pill className={statusClass(lessonStatusTarget.status)}>{lessonStatusTarget.status}</Pill>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-white px-3 py-2 text-sm font-semibold text-slate-950">确认后影响</div>
              <div className="divide-y divide-slate-100">
                {lessonStatusEffectRows.map(([label, value]) => (
                  <div key={`lesson-status-effect-${label}`} className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 px-3 py-2.5 text-sm">
                    <span className="font-medium text-slate-500">{label}</span>
                    <span className="leading-5 text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {lessonStatusTarget.status === "已上课" ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-6 text-emerald-800">
                这一步会生成扣课流水，并把本节课变成待反馈。若课时余额不足，系统会阻止确认并提示先充值或确认欠费。
              </div>
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-800">
                缺席或取消不会自动扣课，也不会向家长端发布反馈；如需补课，可以稍后在排课总表重新安排。
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <SecondaryButton onClick={() => setLessonStatusTarget(null)}>取消</SecondaryButton>
              <PrimaryButton icon={Check} onClick={confirmLessonStatusChange}>
                {lessonStatusTarget.status === "已取消" ? "确认取消" : lessonStatusTarget.status === "学生缺席" ? "确认缺席" : "确认已上课"}
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      ) : null}

      {feedbackOpen ? (
        <Modal
          title="课后反馈"
          subtitle={`${selectedLesson.student} · ${selectedLesson.kind === "班课" ? "班课反馈" : `${selectedLesson.student}家长`} · ${selectedLesson.date} ${selectedLesson.start}-${selectedLesson.end} · ${selectedLesson.subject}`}
          onClose={() => setFeedbackOpen(false)}
          wide
        >
          <div className="-mx-6 -mb-5 -mt-5 flex h-[calc(86vh-116px)] min-h-[500px] flex-col overflow-hidden bg-slate-50">
            <div className="grid min-h-0 flex-1 gap-px bg-slate-200 lg:grid-cols-[minmax(360px,0.92fr)_minmax(420px,1.08fr)]">
              <div className="space-y-3 overflow-y-auto bg-slate-50 p-4">
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">反馈生成依据</p>
                      <p className="mt-1 text-xs text-slate-500">填写三项核心信息，附件会随草稿一起保存。</p>
                    </div>
                    <Pill className={statusClass(selectedLesson.feedbackStatus)}>{selectedLesson.feedbackStatus}</Pill>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    {[
                      ["课程", selectedLesson.subject],
                      ["对象", selectedLesson.student],
                      ["时间", `${selectedLesson.start}-${selectedLesson.end}`]
                    ].map(([label, value]) => (
                      <div key={`feedback-source-${label}`} className="rounded-md bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="mt-1 truncate font-semibold text-slate-950">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Field label="课程内容">
                  <TextArea
                    value={feedbackContent}
                    onChange={(event) => setFeedbackContent(event.target.value)}
                    className="!min-h-[68px]"
                  />
                </Field>
                <Field label="上课状态">
                  <TextArea
                    value={feedbackState}
                    onChange={(event) => setFeedbackState(event.target.value)}
                    className="!min-h-[82px]"
                  />
                </Field>
                <Field label="课后作业">
                  <TextArea
                    value={feedbackHomework}
                    onChange={(event) => setFeedbackHomework(event.target.value)}
                    className="!min-h-[68px]"
                  />
                </Field>
                <div className="rounded-md border border-dashed border-slate-300 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Upload className="size-4 shrink-0 text-slate-500" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">附件</p>
                        <p className="mt-1 truncate text-xs text-slate-500">课前小测、图片和 PDF 可参与 AI 反馈生成。</p>
                      </div>
                    </div>
                    <input
                      ref={feedbackAttachmentInputRef}
                      data-feedback-attachment-input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(event) => {
                        addFeedbackAttachments(event.currentTarget.files);
                        event.currentTarget.value = "";
                      }}
                    />
                    <SecondaryButton className="h-8 shrink-0 px-3 text-xs" onClick={() => feedbackAttachmentInputRef.current?.click()}>
                      上传附件
                    </SecondaryButton>
                  </div>
                  {feedbackAttachments.length ? (
                    <div className="mt-3 space-y-2">
                      {feedbackAttachments.map((attachment) => (
                        <div key={attachment.name} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="size-4 shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800">{attachment.name}</p>
                              <p className="text-xs text-slate-500">{attachment.sizeLabel}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFeedbackAttachment(attachment.name)}
                            className="grid size-7 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700"
                            aria-label={`移除 ${attachment.name}`}
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {feedbackAttachmentAnalyses.length ? (
                    <div className="mt-3 space-y-2">
                      {feedbackAttachmentAnalyses.map((attachment) => (
                        <div key={`${attachment.name}-analysis`} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
                          <div className="flex flex-wrap items-center gap-2">
                            <Pill className="border-blue-200 bg-white text-blue-700">{attachment.status}</Pill>
                            <span className="font-medium text-blue-950">{attachment.name}</span>
                            <span className="text-blue-500">{attachment.kind}</span>
                          </div>
                          <p className="mt-1.5 text-blue-800">{attachment.analysis}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto bg-slate-50 p-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    ["AI 状态", feedbackGenerating ? "生成中" : feedbackPreview ? "已生成" : "待生成"],
                    ["附件分析", `${feedbackAttachmentAnalyses.length || feedbackAttachments.length} 个`],
                    ["家长端", feedbackPreview ? "可复制发送" : "等待预览"]
                  ].map(([label, value]) => (
                    <div key={`feedback-preview-stat-${label}`} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-950">反馈正文</p>
                    <span className="text-xs text-slate-400">可直接编辑</span>
                  </div>
                  <div className="min-h-[188px] rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                    {feedbackGenerating ? (
                      <div className="flex items-start gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
                          <Bot className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">正在整理课程信息</p>
                          <p className="mt-1 text-sm text-slate-500">汇总学生、课次、课堂记录和当前填写内容。</p>
                          <div className="mt-4 h-1.5 w-36 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full w-2/3 rounded-full bg-slate-950" />
                          </div>
                          <p className="mt-3 text-xs text-slate-400">生成完成后会自动填入最终反馈正文。</p>
                        </div>
                      </div>
                    ) : (
                      <TextArea
                        data-feedback-preview-input
                        value={feedbackPreview}
                        onChange={(event) => {
                          setFeedbackPreview(event.target.value);
                          setCopied(false);
                        }}
                        placeholder="点击生成反馈，或直接输入反馈内容..."
                        className="min-h-[156px] border-0 bg-transparent p-0 text-slate-700 shadow-none focus:border-transparent focus:ring-0"
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-950">预览</p>
                    <span className="text-xs text-slate-400">家庭端展示效果</span>
                  </div>
                  <div className="min-h-[214px] whitespace-pre-line rounded-md border border-slate-200 bg-white p-3 text-sm leading-7 text-slate-700">
                    {feedbackGenerating ? (
                      <div className="flex items-start gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
                          <Clock className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">正在整理课程信息</p>
                          <p className="mt-1 text-sm text-slate-500">生成完成后会在这里预览家长看到的反馈内容。</p>
                        </div>
                      </div>
                    ) : (
                      feedbackPreview || "暂无可预览内容"
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-5 gap-1.5 border-t border-slate-200 bg-white px-3 py-2 sm:flex sm:items-center sm:justify-end sm:gap-2 sm:px-5 sm:py-3">
              <PrimaryButton icon={Bot} onClick={generateFeedback} disabled={feedbackGenerating} className="w-full px-2 sm:mr-auto sm:w-auto sm:px-3">
                <span className="sm:hidden">{feedbackGenerating ? "生成中" : "生成"}</span>
                <span className="hidden sm:inline">{feedbackGenerating ? "生成中..." : "生成反馈"}</span>
              </PrimaryButton>
              <SecondaryButton className="w-full px-2 sm:w-auto sm:px-3" onClick={() => setFeedbackOpen(false)} disabled={feedbackGenerating}>取消</SecondaryButton>
              <SecondaryButton
                icon={Copy}
                onClick={copyFeedbackToClipboard}
                disabled={!feedbackPreview || feedbackGenerating}
                className="w-full px-2 sm:w-auto sm:px-3"
              >
                {copied ? "已复制" : "复制"}
              </SecondaryButton>
              <SecondaryButton className="w-full px-2 sm:w-auto sm:px-3" onClick={saveFeedbackDraft} disabled={!feedbackPreview || feedbackGenerating}>
                <span className="sm:hidden">草稿</span>
                <span className="hidden sm:inline">保存草稿</span>
              </SecondaryButton>
              <PrimaryButton className="w-full px-2 sm:w-auto sm:px-3" icon={Send} onClick={sendFeedbackToParent} disabled={feedbackGenerating}>
                <span className="sm:hidden">发送</span>
                <span className="hidden sm:inline">发送给家长</span>
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      ) : null}

      {attendanceOpen ? (
        <Modal
          title="开始点名"
          subtitle={`2026-${selectedAttendanceLesson.date} ${selectedAttendanceLesson.start}-${selectedAttendanceLesson.end} · ${selectedAttendanceLesson.student} · 读取已保存点名或最近考勤，可逐个调整。`}
          onClose={() => setAttendanceOpen(false)}
        >
          <div className="-mx-6 -mb-5 -mt-5 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="grid gap-2 sm:grid-cols-4">
                {rollCallSummary.map(([status, count]) => (
                  <div key={status} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[11px] text-slate-500">{status}</p>
                    <p className="mt-1 text-base font-semibold text-slate-950">{count} 人</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_minmax(260px,auto)] border-b border-slate-200 bg-white px-5 py-2 text-xs font-medium text-slate-500">
              <span>学生</span>
              <span>考勤状态</span>
            </div>
            <div className="max-h-[48vh] overflow-auto">
            {selectedClassMembers.map((member) => {
              const currentStatus = attendance[member.name] ?? member.lastStatus;

              return (
              <div key={member.studentId} className="grid gap-3 border-b border-slate-100 px-5 py-3 sm:grid-cols-[1fr_minmax(260px,auto)] sm:items-center">
                <div>
                  <p className="text-sm font-medium text-slate-950">{member.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{member.grade} · {selectedClass.name}</p>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {rollCallStatusOptions.map(([status, label]) => (
                    <button
                      type="button"
                      key={`${member.studentId}-${status}`}
                      onClick={() => setAttendance((current) => ({ ...current, [member.name]: status }))}
                      className={cn(
                        "h-8 rounded-md border px-2 text-xs font-medium transition",
                        currentStatus === status
                          ? statusClass(status)
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              );
            })}
            </div>
            <div className="flex justify-end gap-2 bg-white px-5 py-4">
              <SecondaryButton onClick={() => setAttendanceOpen(false)}>取消</SecondaryButton>
              <PrimaryButton icon={Check} onClick={saveAttendance}>保存点名</PrimaryButton>
            </div>
          </div>
        </Modal>
      ) : null}

      {inviteOpen ? (
        <Modal title="生成家庭邀请" subtitle="系统会生成一个待激活的家庭端账号，复制链接给家长打开即可完成绑定。" onClose={() => setInviteOpen(false)}>
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              {[
                ["绑定学生", selectedStudentRecord.name],
                ["家长账号", selectedStudentRecord.parent],
                ["状态", selectedFamilyInvite?.status ?? "待激活"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={cn("mt-1 font-semibold", label === "状态" ? "text-amber-700" : "text-slate-950")}>{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">邀请链接</p>
                <Pill className="border-amber-200 bg-amber-50 text-amber-700">48小时有效</Pill>
              </div>
              <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-2">
                <p className="min-w-0 break-all font-mono text-xs leading-5 text-slate-950">{inviteDisplayLink}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                有效期至 {formatDateTimeLabel(selectedFamilyInvite?.expiresAt)}。家长打开后可查看最新反馈、学习报告、近期课程，并可发起沟通和预约申请。
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <SecondaryButton onClick={() => setInviteOpen(false)}>取消</SecondaryButton>
              <PrimaryButton icon={Copy} onClick={copyInviteLink}>复制邀请链接</PrimaryButton>
            </div>
          </div>
        </Modal>
      ) : null}

      {reportOpen ? (
        <Modal title="新建学习报告" subtitle="AI 会参考近期成绩、薄弱点和课程内容；生成后仍需老师确认保存。" onClose={() => setReportOpen(false)} wide>
          <div className="-mx-6 -mb-5 -mt-5 flex h-[calc(86vh-76px)] min-h-[560px] flex-col overflow-hidden bg-slate-50">
            <div className="grid min-h-0 flex-1 gap-px bg-slate-200 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-3 overflow-y-auto bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">报告依据</p>
                  <p className="mt-1 text-xs text-slate-500">系统会综合反馈内容、成绩记录、当前薄弱点和近期课程。</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-950">输入来源</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {reportPreviewReport.sources.map((source) => (
                      <Pill key={source} className="border-slate-200 bg-slate-50 text-slate-600">{source}</Pill>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                    <div className="rounded-md bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500">成绩记录</p>
                      <p className="mt-1 font-semibold text-slate-950">{selectedScores.length} 次</p>
                    </div>
                    <div className="rounded-md bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500">薄弱点</p>
                      <p className="mt-1 font-semibold text-slate-950">{selectedWeaknesses.length} 条</p>
                    </div>
                    <div className="rounded-md bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500">近期课程</p>
                      <p className="mt-1 font-semibold text-slate-950">{recentLessons.length} 节</p>
                    </div>
                  </div>
                </div>
                <Field label="报告生成要求">
                  <TextArea value={reportTeacherNotes} onChange={(event) => setReportTeacherNotes(event.target.value)} className="min-h-28" />
                </Field>
                <Field label="家长可见摘要" hint="可选。填写后家长端优先展示这段内容；留空则展示报告正文摘要。">
                  <TextArea value={reportParentSummary} onChange={(event) => setReportParentSummary(event.target.value)} placeholder="例如：本阶段整体稳定，取值范围讨论还需要继续巩固。" className="min-h-24" />
                </Field>
              </div>

              <div className="space-y-3 overflow-y-auto bg-slate-50 p-4">
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">预览</p>
                    <Pill className={reportPreviewReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : reportGenerating ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                      {reportPreviewReady ? "已生成" : reportGenerating ? "生成中" : "待生成"}
                    </Pill>
                  </div>
                  <div className="mt-3 min-h-[376px] rounded-md border border-slate-200 bg-slate-50 p-3">
                    {reportGenerating ? (
                      <div className="flex h-full min-h-[330px] flex-col justify-center">
                        <div className="mx-auto grid size-12 place-items-center rounded-full bg-white text-slate-700 shadow-sm">
                          <Bot className="size-5" />
                        </div>
                        <p className="mt-4 text-center font-semibold text-slate-950">正在生成学习报告</p>
                        <p className="mt-2 text-center text-sm text-slate-500">分析反馈内容、成绩波动和当前薄弱点。</p>
                        <div className="mx-auto mt-5 h-2 w-64 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-slate-950 transition-all" style={{ width: `${reportProgress}%` }} />
                        </div>
                        <p className="mt-3 text-center text-sm font-medium text-slate-600">生成 {reportProgress}%</p>
                      </div>
                    ) : reportPreviewReady ? (
                      <div className="max-h-[54vh] overflow-auto pr-1">{renderStudyReportPreview(reportPreviewReport)}</div>
                    ) : (
                      <div className="flex h-full min-h-[330px] flex-col justify-center text-center">
                        <div className="mx-auto grid size-12 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
                          <FileText className="size-5" />
                        </div>
                        <p className="mt-4 font-semibold text-slate-950">暂无生成内容</p>
                        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">点击下方“生成报告”，系统会整理成绩、薄弱点、上课反馈和课时记录，生成可保存到家长端的学习报告。</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <PrimaryButton icon={Bot} onClick={generateReportPreview} disabled={reportGenerating}>
                {reportGenerating ? `生成中 ${reportProgress}%` : reportPreviewReady ? "重新生成草稿" : "AI 生成草稿"}
              </PrimaryButton>
              <div className="flex flex-wrap justify-end gap-2">
                <SecondaryButton onClick={() => setReportOpen(false)} disabled={reportGenerating}>取消</SecondaryButton>
                <PrimaryButton icon={Check} onClick={saveReport} disabled={reportGenerating || !reportPreviewReady}>
                  确认保存
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {bookingAuditOpen ? (
        <Modal title="预约申请" subtitle="查看并处理当前账号权限范围内的预约申请。" onClose={() => setBookingAuditOpen(false)} wide>
          {renderBookingAuditList()}
        </Modal>
      ) : null}

      {courseModalOpen ? (
        <Modal
          title={editingLessonId ? "编辑课程" : "新增课程"}
          subtitle="维护课程时间、学生班级、上课状态和课时扣减，保存后同步到今日课程和排课总表。"
          onClose={() => setCourseModalOpen(false)}
          wide
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="学生 / 班级">
                  <select
                    value={courseStudent}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCourseStudent(value);
                      if (value.includes("班")) {
                        setCourseKind("班课");
                        setCourseSubject("圆锥曲线专题");
                        setCoursePrice("960");
                      } else {
                        setCourseKind("一对一");
                        setCourseSubject("高中数学");
                        setCoursePrice("320");
                      }
                    }}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  >
                    {[...studentList.map((student) => student.name), "高二数学小班"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="课程科目">
                  <TextInput value={courseSubject} onChange={(event) => setCourseSubject(event.target.value)} />
                </Field>
                <Field label="日期">
                  <TextInput value={courseDate} onChange={(event) => setCourseDate(event.target.value)} placeholder="例如：06-20" />
                </Field>
                <Field label="星期">
                  <TextInput value={courseDay} onChange={(event) => setCourseDay(event.target.value)} placeholder="例如：周六" />
                </Field>
                <Field label="开始时间">
                  <TextInput value={courseStart} onChange={(event) => setCourseStart(event.target.value)} placeholder="例如：10:30" />
                </Field>
                <Field label="结束时间">
                  <TextInput value={courseEnd} onChange={(event) => setCourseEnd(event.target.value)} placeholder="例如：12:30" />
                </Field>
                <Field label="课程类型">
                  <select
                    value={courseKind}
                    onChange={(event) => setCourseKind(event.target.value as Lesson["kind"])}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  >
                    <option>一对一</option>
                    <option>班课</option>
                  </select>
                </Field>
                <Field label="课程状态">
                  <select
                    value={courseStatus}
                    onChange={(event) => setCourseStatus(event.target.value as LessonStatus)}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  >
                    {(["待上课", "已上课", "学生缺席", "已取消", "待点名", "已点名"] as LessonStatus[]).map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </Field>
                <Field label="应收金额">
                  <TextInput value={coursePrice} onChange={(event) => setCoursePrice(event.target.value)} placeholder="例如：320" />
                </Field>
                <Field label="课时变化">
                  <TextInput value={courseBalanceChange} onChange={(event) => setCourseBalanceChange(event.target.value)} placeholder="例如：-1" />
                </Field>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <SecondaryButton onClick={() => setCourseModalOpen(false)}>取消</SecondaryButton>
                <PrimaryButton icon={Check} onClick={saveCourse}>{editingLessonId ? "保存修改" : "保存课程"}</PrimaryButton>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">排课预览</p>
                  <Pill className={statusClass(courseStatus)}>{courseStatus}</Pill>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    ["对象", courseStudent.trim() || "待选择"],
                    ["类型", courseKind],
                    ["时间", `${courseDate || "待填"} ${courseStart || "--:--"}-${courseEnd || "--:--"}`],
                    ["时长", courseDurationMinutes > 0 ? `${Math.round(courseDurationMinutes / 30) / 2} 小时` : "时间待调整"],
                    ["人数", courseKind === "班课" ? `${coursePreviewMemberCount} 人` : "1 人"],
                    ["应收", coursePrice ? `¥${coursePrice.replace(/^¥/u, "")}` : "待填写"],
                    ["课时", courseBalanceChange || "待填写"]
                  ].map(([label, value]) => (
                    <div key={`course-preview-${label}`} className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">{label}</span>
                      <strong className="text-right text-slate-950">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  "rounded-md border p-3 text-sm leading-6",
                  coursePreviewConflicts.length ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                )}
              >
                <p className="font-semibold">{coursePreviewConflicts.length ? "检测到时间冲突" : "当前时段可排课"}</p>
                <p className="mt-1">
                  {coursePreviewConflicts.length
                    ? coursePreviewConflicts.slice(0, 2).map(formatConflictItem).join("、")
                    : "保存后会同步到今日课程、排课总表和课时流水入口。"}
                </p>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-semibold text-blue-950">保存后动作</p>
                <div className="mt-2 grid gap-2 text-sm text-blue-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>今日课程表</span>
                    <strong>同步显示</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>排课总表</span>
                    <strong>{courseDate || "待填"} 时间块</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>后续入口</span>
                    <strong>{courseKind === "班课" ? "开始点名" : "去反馈"}</strong>
                  </div>
                </div>
              </div>

              {coursePreviewStudent ? (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-500">
                  {coursePreviewStudent.name} 当前剩余 {coursePreviewStudent.remainingLessons} 节课，关注点：{coursePreviewStudent.focus}。
                </div>
              ) : null}
            </div>
          </div>
        </Modal>
      ) : null}

      {studentModalOpen ? (
        <Modal title="新增学生" subtitle="录入学生基础信息，先建立档案，再补成绩、薄弱点、课时和家庭账号。" onClose={() => setStudentModalOpen(false)} wide>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="学生姓名">
                  <TextInput value={newStudentName} onChange={(event) => setNewStudentName(event.target.value)} />
                </Field>
                <Field label="年级">
                  <TextInput value={newStudentGrade} onChange={(event) => setNewStudentGrade(event.target.value)} placeholder="例如：高一" />
                </Field>
                <Field label="家长称呼">
                  <TextInput value={newStudentParent} onChange={(event) => setNewStudentParent(event.target.value)} placeholder="例如：赵一鸣家长" />
                </Field>
                <Field label="剩余课时">
                  <TextInput value={newStudentRemaining} onChange={(event) => setNewStudentRemaining(event.target.value)} placeholder="例如：10" />
                </Field>
              </div>
              <Field label="当前关注点">
                <TextArea value={newStudentFocus} onChange={(event) => setNewStudentFocus(event.target.value)} className="min-h-24" />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <SecondaryButton onClick={() => setStudentModalOpen(false)}>取消</SecondaryButton>
                <PrimaryButton icon={Check} onClick={saveStudent}>保存学生</PrimaryButton>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-950">建档后同步</p>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    ["学生列表", newStudentName.trim() || "待填写"],
                    ["家长账号", newStudentParent.trim() || "待填写"],
                    ["课时余额", `${newStudentRemaining.trim() || "0"} 节`],
                    ["后续入口", "成绩 / 薄弱点 / 家庭邀请"]
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">{label}</span>
                      <strong className="text-right text-slate-950">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-700">
                保存后会在学生卡片、账务学生选择和档案摘要里出现；家庭邀请可以继续从学生档案生成。
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {scoreModalOpen ? (
        <Modal
          title={editingScoreKey ? "编辑成绩" : "新增成绩"}
          subtitle="记录每次考试成绩、排名和考试情况。"
          onClose={closeScoreModal}
          wide
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="考试名称">
                  <TextInput value={scoreExam} onChange={(event) => setScoreExam(event.target.value)} />
                </Field>
                <Field label="考试日期">
                  <TextInput value={scoreDate} onChange={(event) => setScoreDate(event.target.value)} />
                </Field>
                <Field label="成绩">
                  <TextInput value={scoreValue} onChange={(event) => setScoreValue(event.target.value)} placeholder="例如：96 / 120" />
                </Field>
                <Field label="排名">
                  <TextInput value={scoreRank} onChange={(event) => setScoreRank(event.target.value)} placeholder="例如：4 / 36" />
                </Field>
              </div>
              <Field label="考试情况">
                <TextArea value={scoreNote} onChange={(event) => setScoreNote(event.target.value)} />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <SecondaryButton onClick={closeScoreModal}>取消</SecondaryButton>
                <PrimaryButton icon={Check} onClick={saveScore}>{editingScoreKey ? "更新成绩" : "保存成绩"}</PrimaryButton>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-950">成绩预览</p>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    ["学生", selectedStudentRecord.name],
                    ["家长", selectedStudentRecord.parent],
                    ["考试", scoreExam.trim() || "待填写"],
                    ["日期", scoreDate.trim() || "待填写"],
                    ["成绩", scoreValue.trim() || "待填写"],
                    ["排名", scoreRank.trim() || "待填写"]
                  ].map(([label, value]) => (
                    <div key={`score-preview-${label}`} className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">{label}</span>
                      <strong className="text-right text-slate-950">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-semibold text-blue-950">进入学习报告</p>
                <p className="mt-2 text-sm leading-6 text-blue-700">
                  保存后会同步到 {selectedStudentRecord.name} 的成绩列表，用于阶段学习报告里的成绩波动分析。
                </p>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-500">
                {scoreNote.trim() || "考试情况会作为老师复盘备注，家长端只在报告保存后看到汇总内容。"}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {weaknessModalOpen ? (
        <Modal
          title={editingWeaknessTag ? "编辑薄弱点" : "新增薄弱点"}
          subtitle="记录学生不会的知识点、解题方法和后续加强动作。"
          onClose={closeWeaknessModal}
          wide
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <Field label="薄弱点名称">
                <TextInput value={weaknessTag} onChange={(event) => setWeaknessTag(event.target.value)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="严重程度">
                  <select
                    value={weaknessLevel}
                    onChange={(event) => setWeaknessLevel(event.target.value as WeaknessRow["level"])}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  >
                    <option>高频</option>
                    <option>重点</option>
                    <option>中频</option>
                  </select>
                </Field>
                <Field label="来源">
                  <TextInput value={weaknessSource} onChange={(event) => setWeaknessSource(event.target.value)} />
                </Field>
              </div>
              <Field label="后续加强动作">
                <TextArea value={weaknessAction} onChange={(event) => setWeaknessAction(event.target.value)} />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <SecondaryButton onClick={closeWeaknessModal}>取消</SecondaryButton>
                <PrimaryButton icon={Check} onClick={saveWeakness}>{editingWeaknessTag ? "更新薄弱点" : "保存薄弱点"}</PrimaryButton>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">薄弱点预览</p>
                  <Pill className={statusClass(weaknessLevel)}>{weaknessLevel}</Pill>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    ["学生", selectedStudentRecord.name],
                    ["薄弱点", weaknessTag.trim() || "待填写"],
                    ["来源", weaknessSource.trim() || "待填写"],
                    ["归档位置", "学生档案 / 学习报告"]
                  ].map(([label, value]) => (
                    <div key={`weakness-preview-${label}`} className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">{label}</span>
                      <strong className="text-right text-slate-950">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-950">后续加强动作</p>
                <p className="mt-2 text-sm leading-6 text-amber-700">{weaknessAction.trim() || "待填写后续加强动作"}</p>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-500">
                保存后会同步更新薄弱点统计，并在生成学习报告时作为当前需要加强的依据。
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {financeModalOpen ? (
        <Modal title="新增课时流水" subtitle="记录充值、扣课、撤销和余额变化。" onClose={() => setFinanceModalOpen(false)} wide>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="学生">
                  <select
                    value={financeStudentId}
                    onChange={(event) => setFinanceStudentId(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  >
                    {studentList.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} · {student.parent}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="日期">
                  <TextInput value={financeDate} onChange={(event) => setFinanceDate(event.target.value)} />
                </Field>
                <Field label="流水类型">
                  <select
                    value={financeAction}
                    onChange={(event) => {
                      const nextAction = event.target.value as FinanceRow["action"];
                      setFinanceAction(nextAction);
                      if (nextAction === "充值" && !parseCashAmount(financeCashAmount)) {
                        setFinanceCashAmount("¥3,200");
                      }
                      if (nextAction === "扣课") {
                        setFinanceCashAmount("");
                      }
                      if (nextAction === "撤销" && !financeCashAmount.trim()) {
                        setFinanceCashAmount("¥0");
                      }
                    }}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                  >
                    <option>充值</option>
                    <option>扣课</option>
                    <option>撤销</option>
                  </select>
                </Field>
                <Field label="变化">
                  <TextInput value={financeAmount} onChange={(event) => setFinanceAmount(event.target.value)} placeholder="例如：+10 课时" />
                </Field>
                <Field label="收款金额" hint={financeAction === "充值" ? "充值流水必填" : "扣课可留空，撤销可填 ¥0 或退款金额"}>
                  <TextInput value={financeCashAmount} onChange={(event) => setFinanceCashAmount(event.target.value)} placeholder="例如：¥3200" />
                </Field>
                <Field label="余额">
                  <TextInput value={financeBalance} onChange={(event) => setFinanceBalance(event.target.value)} placeholder="例如：30 课时" />
                </Field>
              </div>
              <Field label="备注">
                <TextArea value={financeNote} onChange={(event) => setFinanceNote(event.target.value)} />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <SecondaryButton onClick={() => setFinanceModalOpen(false)}>取消</SecondaryButton>
                <PrimaryButton icon={Check} onClick={saveFinanceEvent}>保存流水</PrimaryButton>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-950">流水预览</p>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    ["学生", financeStudent.name],
                    ["家长", financeStudent.parent],
                    ["类型", financeAction],
                    ["变化", financeAmount || "-"],
                    ["收款", financeCashAmount || "无现金记录"],
                    ["余额", financeBalance || "-"]
                  ].map(([label, value]) => (
                    <div key={`finance-preview-${label}`} className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">{label}</span>
                      <strong className="text-right text-slate-950">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-700">
                保存后会进入 {financeStudent.name} 的学生收款页、财务记录页和时间线明细，家长端账务页也会同步看到。
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {activeBookingDetail ? (
        <Modal
          title={activeBookingConflicts.length ? "处理预约冲突" : "审核预约申请"}
          subtitle="调整到无冲突时段后，可直接通过并写入排课总表。"
          onClose={() => setBookingDetailId(null)}
          wide
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["学生", activeBookingDetail.student],
                  ["申请时段", `${activeBookingDetail.date} ${activeBookingDetail.start}-${activeBookingDetail.end}`],
                  ["当前状态", activeBookingDetail.status]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950">冲突检测</div>
                {activeBookingConflicts.length ? (
                  <div className="divide-y divide-rose-100">
                    {activeBookingConflicts.map((item) => (
                      <div key={`booking-conflict-${item.kind}-${item.id}`} className="grid gap-2 px-3 py-3 md:grid-cols-[90px_minmax(0,1fr)_96px] md:items-center">
                        <Pill className="w-fit border-rose-200 bg-rose-50 text-rose-700">{item.kind}</Pill>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{item.student}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                        </div>
                        <p className="text-sm font-semibold text-rose-700 md:text-right">{item.start}-{item.end}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-sm text-emerald-700">当前预约时段未检测到冲突，可直接通过。</div>
                )}
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-semibold text-blue-950">推荐无冲突时段</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {activeBookingSuggestedOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setBookingAdjustStart(option.start);
                        setBookingAdjustEnd(option.end);
                      }}
                      className={cn(
                        "rounded-md border px-3 py-2 text-left text-sm transition",
                        bookingAdjustStart === option.start && bookingAdjustEnd === option.end
                          ? "border-blue-500 bg-white text-blue-800 ring-2 ring-blue-100"
                          : "border-blue-200 bg-white/80 text-blue-700 hover:bg-white"
                      )}
                    >
                      <span className="font-semibold">{option.start}-{option.end}</span>
                      <span className="mt-1 block text-xs text-blue-500">点击套用</span>
                    </button>
                  ))}
                  {!activeBookingSuggestedOptions.length ? (
                    <p className="rounded-md border border-blue-200 bg-white/80 px-3 py-2 text-sm text-blue-700">当前开放时段内暂无推荐时间。</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-950">调整结果</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Field label="开始">
                    <select
                      value={bookingAdjustStart}
                      onChange={(event) => setBookingAdjustStart(event.target.value)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm outline-none transition focus:border-zinc-950"
                    >
                      {bookingTimeMarks.slice(0, -1).map((time) => (
                        <option key={time}>{time}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="结束">
                    <select
                      value={bookingAdjustEnd}
                      onChange={(event) => setBookingAdjustEnd(event.target.value)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm outline-none transition focus:border-zinc-950"
                    >
                      {bookingTimeMarks.slice(1).map((time) => (
                        <option key={time}>{time}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div
                  className={cn(
                    "mt-3 rounded-md border px-3 py-2 text-sm leading-6",
                    activeBookingAdjustedConflicts.length ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  )}
                >
                  {activeBookingAdjustedConflicts.length
                    ? `调整后仍与 ${activeBookingAdjustedConflicts.map(formatConflictItem).join("、")} 冲突`
                    : `${activeBookingDetail.date} ${bookingAdjustStart}-${bookingAdjustEnd} 无冲突`}
                </div>
              </div>

              <Field label="审核备注（可选）">
                <TextInput placeholder={`如：已调整至 ${bookingAdjustStart}-${bookingAdjustEnd}`} />
              </Field>

              <div className="rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-500">
                通过后会自动写入排课总表；若调整到未来时段，家长端预约状态会同步为已通过。
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <SecondaryButton onClick={() => setBookingDetailId(null)}>取消</SecondaryButton>
                <SecondaryButton icon={RotateCcw} onClick={() => adjustBooking(activeBookingDetail.id)}>
                  保存调整
                </SecondaryButton>
                <PrimaryButton
                  icon={Check}
                  disabled={activeBookingAdjustedConflicts.length > 0}
                  onClick={() => adjustAndApproveBooking(activeBookingDetail.id)}
                >
                  修改并通过
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {openSlotModalOpen ? (
        <Modal title="新增预约时段" subtitle="选择单日或多日开放蓝色预约时段，家长端会同步可选。" onClose={() => setOpenSlotModalOpen(false)} wide>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-950">选择日期</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {scheduleDays.map((day) => {
                    const active = openSlotDates.includes(day.date);
                    return (
                      <button
                        type="button"
                        key={day.date}
                        onClick={() => toggleOpenSlotDate(day.date)}
                        className={cn(
                          "rounded-md border px-3 py-3 text-left transition",
                          active ? "border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-100" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <p className="text-sm font-semibold">{day.date}</p>
                        <p className="mt-1 text-xs">{day.day}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="开始时间">
                  <select
                    value={openSlotStart}
                    onChange={(event) => setOpenSlotStart(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-950"
                  >
                    {["08:00", "10:30", "12:30", "14:00", "16:00"].map((time) => (
                      <option key={time}>{time}</option>
                    ))}
                  </select>
                </Field>
                <Field label="结束时间">
                  <select
                    value={openSlotEnd}
                    onChange={(event) => setOpenSlotEnd(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-950"
                  >
                    {["10:00", "12:30", "14:30", "15:30", "18:00"].map((time) => (
                      <option key={time}>{time}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-800">
                创建后，排课总表会显示为蓝色开放预约；若家长选择的时间与黄色课程冲突，系统会在预约审核中标记冲突。
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <SecondaryButton onClick={() => setOpenSlotModalOpen(false)}>取消</SecondaryButton>
                <PrimaryButton icon={Check} onClick={createOpenSlots}>创建预约时段</PrimaryButton>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-950">开放预览</p>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    ["已选日期", selectedOpenSlotDays.length ? selectedOpenSlotDays.map((day) => `${day.date} ${day.day}`).join("、") : "未选择"],
                    ["开放时间", `${openSlotStart}-${openSlotEnd}`],
                    ["家长端可选", openSlotPreviewCount > 0 ? `${openSlotPreviewCount} 个两小时起始选项` : "时间不足两小时"],
                    ["覆盖已有课程", openSlotExistingLessonCount > 0 ? `${openSlotExistingLessonCount} 节黄色课程` : "无"]
                  ].map(([label, value]) => (
                    <div key={`open-slot-preview-${label}`} className="flex items-start justify-between gap-3">
                      <span className="shrink-0 text-slate-500">{label}</span>
                      <strong className="text-right text-slate-950">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="grid grid-cols-[82px_1fr] border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                  <span>日期</span>
                  <span>状态</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedOpenSlotDays.length ? (
                    selectedOpenSlotDays.map((day) => (
                      <div key={`selected-open-slot-${day.date}`} className="grid grid-cols-[82px_1fr] items-center px-3 py-2 text-sm">
                        <span className="font-semibold text-slate-950">{day.date}</span>
                        <span className="text-blue-700">开放 {openSlotStart}-{openSlotEnd}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-slate-500">请选择至少一个日期。</div>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "rounded-md border p-3 text-sm leading-6",
                  openSlotExistingLessonCount > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                )}
              >
                {openSlotExistingLessonCount > 0
                  ? "当前开放范围内已有课程，家长提交冲突时段后会进入预约审核。"
                  : "当前开放范围没有占用，可直接同步到家长端预约页。"}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {moveTarget ? (
        <Modal title="确认调整课程时间" subtitle="拖拽只会在确认后生效，取消会保留原课程安排。" onClose={() => setMoveTarget(null)} narrow>
          <div className="space-y-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-base font-semibold text-slate-950">{moveLessonPreview?.student ?? "当前课程"}</p>
              <p className="mt-1 text-xs text-slate-500">{moveLessonPreview?.subject ?? "数学"} · {teacherProfile.name}</p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-md bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">原时间</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {moveLessonPreview ? `${moveLessonPreview.date} ${moveLessonPreview.start}-${moveLessonPreview.end}` : "未读取到原时间"}
                  </p>
                </div>
                <div className="rounded-md bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">新时间</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {moveTarget.date} {moveTarget.start}-{moveTarget.end}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-950">是否将该课程重置为“待上课”？</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                当前状态为 {moveLessonPreview?.status ?? "未知"}。移动到未来时间后，建议重置为待上课；如果保留当前状态，已有结算或状态记录会继续保留。
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMoveResetStatus(true)}
                  className={cn(
                    "h-9 rounded-md border px-3 text-sm font-semibold transition",
                    moveResetStatus ? "border-zinc-950 bg-zinc-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  重置
                </button>
                <button
                  type="button"
                  onClick={() => setMoveResetStatus(false)}
                  className={cn(
                    "h-9 rounded-md border px-3 text-sm font-semibold transition",
                    !moveResetStatus ? "border-zinc-300 bg-slate-100 text-slate-950" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  保留
                </button>
              </div>
            </div>
            {moveTargetConflicts.length ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-700">
                <p className="font-semibold">目标时段存在冲突，不能直接移动</p>
                <div className="mt-1 space-y-1">
                  {moveTargetConflicts.map((item) => (
                    <p key={`move-conflict-${item.kind}-${item.id}`}>
                      {item.kind} · {item.start}-{item.end} · {item.student} · {item.note}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">目标时段暂无课程或预约冲突。</div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <SecondaryButton onClick={() => setMoveTarget(null)}>取消</SecondaryButton>
              <PrimaryButton disabled={moveTargetConflicts.length > 0} onClick={() => confirmMove(moveResetStatus)}>确认修改</PrimaryButton>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
