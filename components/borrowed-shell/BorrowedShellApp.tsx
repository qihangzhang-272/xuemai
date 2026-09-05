"use client";

import {
  Archive,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Copy,
  FileText,
  Home,
  Inbox,
  Layers3,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Wallet,
  type LucideIcon
} from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ShellView = "dashboard" | "students" | "lessons" | "feedback" | "archive" | "settings";
type FeedbackStatus = "待反馈" | "已反馈";
type ArchiveStatus = "待入档" | "已入档";
type LessonStatus = "待上课" | "已上课" | "已反馈" | "已取消";

type Student = {
  id: string;
  name: string;
  grade: string;
  parent: string;
  subject: string;
  focus: string;
  risk: "稳定" | "需跟进" | "高优先";
  balance: number;
  tags: string[];
  nextLesson: string;
};

type Lesson = {
  id: string;
  studentId: string;
  date: string;
  time: string;
  subject: string;
  topic: string;
  kind: "一对一" | "小班课";
  status: LessonStatus;
  feedbackId?: string;
};

type FeedbackCard = {
  id: string;
  studentId: string;
  lessonId: string;
  title: string;
  source: string;
  body: string;
  feedbackStatus: FeedbackStatus;
  archiveStatus: ArchiveStatus;
  confidence: "证据充足" | "需要补充";
  copied: boolean;
  sentAt?: string;
  archivedAt?: string;
};

type TimelineEvent = {
  id: string;
  studentId: string;
  title: string;
  body: string;
  time: string;
};

const navItems: Array<{ id: ShellView; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "工作台", icon: Home },
  { id: "students", label: "学生", icon: UserRound },
  { id: "lessons", label: "课时", icon: CalendarDays },
  { id: "feedback", label: "反馈", icon: MessageSquareText },
  { id: "archive", label: "入档", icon: Archive },
  { id: "settings", label: "设置", icon: Settings }
];

const seedStudents: Student[] = [
  {
    id: "stu-wang",
    name: "王一路",
    grade: "初二",
    parent: "王妈妈",
    subject: "数学",
    focus: "读题漏条件，几何辅助线思路需要稳定。",
    risk: "高优先",
    balance: 9.5,
    tags: ["待反馈", "几何", "月报素材"],
    nextLesson: "今天 19:00"
  },
  {
    id: "stu-lin",
    name: "林可",
    grade: "五年级",
    parent: "林爸爸",
    subject: "英语",
    focus: "阅读主旨能抓住，证据句表达还不够完整。",
    risk: "需跟进",
    balance: 14,
    tags: ["阅读", "待入档"],
    nextLesson: "明天 18:30"
  },
  {
    id: "stu-chen",
    name: "陈知远",
    grade: "高一",
    parent: "陈妈妈",
    subject: "物理",
    focus: "受力分析步骤有进步，但独立建模时容易跳步。",
    risk: "稳定",
    balance: 6,
    tags: ["力学", "已反馈"],
    nextLesson: "周五 20:00"
  }
];

const seedLessons: Lesson[] = [
  {
    id: "lesson-wang-1",
    studentId: "stu-wang",
    date: "07-01",
    time: "19:00-20:30",
    subject: "数学",
    topic: "几何综合题复盘",
    kind: "一对一",
    status: "已上课",
    feedbackId: "feedback-wang-1"
  },
  {
    id: "lesson-lin-1",
    studentId: "stu-lin",
    date: "07-02",
    time: "18:30-20:00",
    subject: "英语",
    topic: "阅读理解证据句",
    kind: "一对一",
    status: "待上课"
  },
  {
    id: "lesson-class-1",
    studentId: "stu-chen",
    date: "07-03",
    time: "20:00-21:30",
    subject: "物理",
    topic: "受力分析小班",
    kind: "小班课",
    status: "待上课"
  }
];

const seedFeedbacks: FeedbackCard[] = [
  {
    id: "feedback-wang-1",
    studentId: "stu-wang",
    lessonId: "lesson-wang-1",
    title: "几何综合题课后反馈",
    source: "课堂记录 + 错题订正",
    body:
      "家长您好，王一路今天主要复盘了几何综合题。孩子能跟上辅助线思路，列式比上次更完整，但读题时仍会漏掉隐藏条件。我已经把这类题的审题顺序单独整理出来，下次课会继续用相似题巩固。",
    feedbackStatus: "待反馈",
    archiveStatus: "待入档",
    confidence: "证据充足",
    copied: false
  }
];

const seedTimeline: TimelineEvent[] = [
  {
    id: "timeline-chen-1",
    studentId: "stu-chen",
    title: "受力分析阶段反馈已入档",
    body: "能按步骤画受力图，但遇到斜面模型时需要提醒分解方向。",
    time: "06-28"
  }
];

const riskStyles: Record<Student["risk"], string> = {
  稳定: "border-emerald-200 bg-emerald-50 text-emerald-700",
  需跟进: "border-amber-200 bg-amber-50 text-amber-700",
  高优先: "border-rose-200 bg-rose-50 text-rose-700"
};

export function BorrowedShellApp() {
  const [activeView, setActiveView] = useState<ShellView>("dashboard");
  const [students, setStudents] = useState(seedStudents);
  const [lessons, setLessons] = useState(seedLessons);
  const [feedbacks, setFeedbacks] = useState(seedFeedbacks);
  const [timeline, setTimeline] = useState(seedTimeline);
  const [activeStudentId, setActiveStudentId] = useState(seedStudents[0]?.id ?? "");
  const [activeFeedbackId, setActiveFeedbackId] = useState(seedFeedbacks[0]?.id ?? "");
  const [recordText, setRecordText] = useState("今天几何题能跟上辅助线思路，但读题漏了角平分线条件。下次继续练同类题。");
  const [studentDraft, setStudentDraft] = useState({ name: "", grade: "", parent: "", subject: "数学" });
  const [toast, setToast] = useState("");

  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const activeStudent = studentById.get(activeStudentId) ?? students[0];
  const activeFeedback = feedbacks.find((feedback) => feedback.id === activeFeedbackId) ?? feedbacks[0];
  const pendingFeedbacks = feedbacks.filter((feedback) => feedback.feedbackStatus === "待反馈");
  const archiveQueue = feedbacks.filter((feedback) => feedback.archiveStatus === "待入档");
  const todayLessons = lessons.filter((lesson) => lesson.status !== "已取消");
  const activeStudentLessons = lessons.filter((lesson) => lesson.studentId === activeStudent?.id);
  const activeStudentTimeline = timeline.filter((item) => item.studentId === activeStudent?.id);

  const stats = [
    { label: "今日课程", value: todayLessons.length, icon: CalendarDays, tone: "text-sky-700 bg-sky-50 border-sky-100" },
    { label: "待反馈", value: pendingFeedbacks.length, icon: MessageSquareText, tone: "text-amber-700 bg-amber-50 border-amber-100" },
    { label: "待入档", value: archiveQueue.length, icon: Archive, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
    { label: "学生数", value: students.length, icon: UsersRound, tone: "text-violet-700 bg-violet-50 border-violet-100" }
  ];

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function getStudentName(studentId: string) {
    return studentById.get(studentId)?.name ?? "未命名学生";
  }

  function getDisplayStatus(feedback: FeedbackCard) {
    return feedback.feedbackStatus === "已反馈" ? "已反馈" : feedback.feedbackStatus === "待反馈" ? "待反馈" : feedback.archiveStatus;
  }

  function addStudent() {
    const name = studentDraft.name.trim();
    if (!name) {
      showToast("请先填写学生姓名");
      return;
    }
    const id = `stu-${Date.now()}`;
    const nextStudent: Student = {
      id,
      name,
      grade: studentDraft.grade.trim() || "未设置年级",
      parent: studentDraft.parent.trim() || "家长",
      subject: studentDraft.subject.trim() || "数学",
      focus: "新建学生，等待课堂记录沉淀。",
      risk: "稳定",
      balance: 0,
      tags: ["新建"],
      nextLesson: "待排课"
    };
    setStudents((items) => [nextStudent, ...items]);
    setActiveStudentId(id);
    setStudentDraft({ name: "", grade: "", parent: "", subject: "数学" });
    setActiveView("students");
    showToast("学生已加入壳内联系人");
  }

  function markLessonDone(lessonId: string) {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;
    const existing = feedbacks.find((item) => item.lessonId === lessonId);
    if (existing) {
      setLessons((items) => items.map((item) => (item.id === lessonId ? { ...item, status: "已上课", feedbackId: existing.id } : item)));
      setActiveFeedbackId(existing.id);
      setActiveView("feedback");
      showToast("课程已进入待反馈");
      return;
    }
    const nextFeedback = buildFeedbackFromLesson(lesson, studentById.get(lesson.studentId));
    setFeedbacks((items) => [nextFeedback, ...items]);
    setLessons((items) => items.map((item) => (item.id === lessonId ? { ...item, status: "已上课", feedbackId: nextFeedback.id } : item)));
    setActiveFeedbackId(nextFeedback.id);
    setActiveStudentId(lesson.studentId);
    setActiveView("feedback");
    showToast("已生成反馈卡");
  }

  function generateFeedbackFromRecord() {
    if (!activeStudent) return;
    if (!recordText.trim()) {
      showToast("请先输入课堂记录");
      return;
    }
    const lesson = activeStudentLessons[0] ?? {
      id: `lesson-${Date.now()}`,
      studentId: activeStudent.id,
      date: "07-01",
      time: "手动记录",
      subject: activeStudent.subject,
      topic: "课堂记录整理",
      kind: "一对一" as const,
      status: "已上课" as const
    };
    if (!activeStudentLessons[0]) {
      setLessons((items) => [lesson, ...items]);
    }
    const nextFeedback: FeedbackCard = {
      id: `feedback-${Date.now()}`,
      studentId: activeStudent.id,
      lessonId: lesson.id,
      title: `${activeStudent.name}${activeStudent.subject}课后反馈`,
      source: "老师课堂记录",
      body: `家长您好，${activeStudent.name}本次课的主要表现是：${recordText.trim()} 我会把这个点继续放进后续练习和月报素材里，避免只停留在一次性反馈。`,
      feedbackStatus: "待反馈",
      archiveStatus: "待入档",
      confidence: "证据充足",
      copied: false
    };
    setFeedbacks((items) => [nextFeedback, ...items]);
    setLessons((items) => items.map((item) => (item.id === lesson.id ? { ...item, status: "已上课", feedbackId: nextFeedback.id } : item)));
    setActiveFeedbackId(nextFeedback.id);
    setActiveView("feedback");
    showToast("反馈卡已生成");
  }

  function copyFeedback(feedbackId: string) {
    const feedback = feedbacks.find((item) => item.id === feedbackId);
    if (!feedback) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(feedback.body).catch(() => undefined);
    }
    setFeedbacks((items) => items.map((item) => (item.id === feedbackId ? { ...item, copied: true } : item)));
    showToast("反馈已复制");
  }

  function markFeedbackSent(feedbackId: string) {
    const feedback = feedbacks.find((item) => item.id === feedbackId);
    if (!feedback) return;
    setFeedbacks((items) =>
      items.map((item) =>
        item.id === feedbackId
          ? {
              ...item,
              copied: true,
              feedbackStatus: "已反馈",
              sentAt: "刚刚"
            }
          : item
      )
    );
    setLessons((items) => items.map((item) => (item.id === feedback.lessonId ? { ...item, status: "已反馈", feedbackId } : item)));
    setActiveFeedbackId(feedbackId);
    showToast("已标记反馈");
  }

  function archiveFeedback(feedbackId: string) {
    const feedback = feedbacks.find((item) => item.id === feedbackId);
    if (!feedback || feedback.archiveStatus === "已入档") return;
    const student = studentById.get(feedback.studentId);
    setFeedbacks((items) =>
      items.map((item) =>
        item.id === feedbackId
          ? {
              ...item,
              archiveStatus: "已入档",
              archivedAt: "刚刚"
            }
          : item
      )
    );
    setTimeline((items) => [
      {
        id: `timeline-${Date.now()}`,
        studentId: feedback.studentId,
        title: `${feedback.title}已入档`,
        body: feedback.body,
        time: "刚刚"
      },
      ...items
    ]);
    if (student) {
      setStudents((items) => items.map((item) => (item.id === student.id ? { ...item, tags: Array.from(new Set(["已入档", ...item.tags])) } : item)));
    }
    showToast("已确认入档");
  }

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-[#17201b]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[78px_minmax(0,1fr)]">
        <aside className="border-b border-black/10 bg-white px-3 py-3 lg:border-b-0 lg:border-r lg:py-4">
          <div className="flex items-center gap-2 lg:flex-col">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f6b3f] text-white shadow-sm">
              <Layers3 className="h-5 w-5" />
            </div>
            <nav className="flex flex-1 gap-1 overflow-x-auto lg:mt-5 lg:flex-col lg:overflow-visible">
              {navItems.map((item) => (
                <NavButton key={item.id} item={item} active={activeView === item.id} onClick={() => setActiveView(item.id)} />
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-4 sm:px-5 lg:px-6">
          <header className="flex flex-col gap-3 border-b border-black/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5d6b61]">
                <span>学脉 Shell</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span>教培 CRM 壳</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span>AI 反馈内核</span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#142017] sm:text-3xl">借壳版课后服务工作台</h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex h-10 min-w-[240px] items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm text-[#66736a]">
                <Search className="h-4 w-4" />
                <span>搜索学生、反馈、课时</span>
              </div>
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-medium text-[#17201b] transition hover:bg-[#f0f4f1]">
                <Bell className="h-4 w-4" />
                {pendingFeedbacks.length + archiveQueue.length} 项待处理
              </button>
            </div>
          </header>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <StatCard key={stat.label} {...stat} />
                ))}
              </div>

              {activeView === "dashboard" ? (
                <DashboardView
                  lessons={lessons}
                  feedbacks={feedbacks}
                  studentById={studentById}
                  onViewFeedback={(id) => {
                    setActiveFeedbackId(id);
                    setActiveView("feedback");
                  }}
                  onMarkLessonDone={markLessonDone}
                />
              ) : null}

              {activeView === "students" ? (
                <StudentsView
                  students={students}
                  activeStudentId={activeStudent?.id}
                  studentDraft={studentDraft}
                  onDraftChange={setStudentDraft}
                  onAddStudent={addStudent}
                  onSelectStudent={(id) => {
                    setActiveStudentId(id);
                    setActiveView("students");
                  }}
                />
              ) : null}

              {activeView === "lessons" ? <LessonsView lessons={lessons} studentById={studentById} onMarkLessonDone={markLessonDone} /> : null}

              {activeView === "feedback" ? (
                <FeedbackView
                  feedbacks={feedbacks}
                  activeFeedbackId={activeFeedback?.id}
                  studentById={studentById}
                  onSelectFeedback={setActiveFeedbackId}
                  onCopy={copyFeedback}
                  onMarkSent={markFeedbackSent}
                  onArchive={archiveFeedback}
                />
              ) : null}

              {activeView === "archive" ? <ArchiveView feedbacks={feedbacks} timeline={timeline} studentById={studentById} onArchive={archiveFeedback} /> : null}

              {activeView === "settings" ? <SettingsView /> : null}
            </section>

            <aside className="space-y-4">
              <ActiveStudentPanel
                student={activeStudent}
                lessons={activeStudentLessons}
                timeline={activeStudentTimeline}
                recordText={recordText}
                onRecordTextChange={setRecordText}
                onGenerateFeedback={generateFeedbackFromRecord}
              />
              {activeFeedback ? (
                <FeedbackDetailPanel
                  feedback={activeFeedback}
                  studentName={getStudentName(activeFeedback.studentId)}
                  displayStatus={getDisplayStatus(activeFeedback)}
                  onCopy={() => copyFeedback(activeFeedback.id)}
                  onMarkSent={() => markFeedbackSent(activeFeedback.id)}
                  onArchive={() => archiveFeedback(activeFeedback.id)}
                />
              ) : null}
            </aside>
          </div>
        </main>
      </div>
      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#17201b] px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick
}: {
  item: { id: ShellView; label: string; icon: LucideIcon };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      aria-label={item.label}
      onClick={onClick}
      className={cn(
        "flex h-10 min-w-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition lg:w-12 lg:px-0",
        active ? "bg-[#0f6b3f] text-white shadow-sm" : "text-[#66736a] hover:bg-[#f0f4f1] hover:text-[#17201b]"
      )}
      title={item.label}
    >
      <Icon className="h-4 w-4" />
      <span className="lg:hidden">{item.label}</span>
    </button>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#66736a]">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", tone)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-normal text-[#17201b]">{value}</p>
    </div>
  );
}

function DashboardView({
  lessons,
  feedbacks,
  studentById,
  onViewFeedback,
  onMarkLessonDone
}: {
  lessons: Lesson[];
  feedbacks: FeedbackCard[];
  studentById: Map<string, Student>;
  onViewFeedback: (id: string) => void;
  onMarkLessonDone: (id: string) => void;
}) {
  const pendingFeedbacks = feedbacks.filter((item) => item.feedbackStatus === "待反馈");
  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <Panel title="今日课时" icon={Clock3}>
        <div className="overflow-hidden rounded-lg border border-black/10">
          {lessons.map((lesson) => (
            <LessonLine key={lesson.id} lesson={lesson} student={studentById.get(lesson.studentId)} onMarkLessonDone={onMarkLessonDone} />
          ))}
        </div>
      </Panel>
      <Panel title="待处理反馈" icon={Inbox}>
        <div className="space-y-2">
          {pendingFeedbacks.length ? (
            pendingFeedbacks.map((feedback) => (
              <button
                key={feedback.id}
                type="button"
                onClick={() => onViewFeedback(feedback.id)}
                className="w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-left transition hover:border-amber-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[#17201b]">{feedback.title}</span>
                  <StatusPill label={feedback.feedbackStatus} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#66736a]">{feedback.body}</p>
              </button>
            ))
          ) : (
            <EmptyLine icon={CheckCircle2} text="暂无待反馈" />
          )}
        </div>
      </Panel>
    </div>
  );
}

function StudentsView({
  students,
  activeStudentId,
  studentDraft,
  onDraftChange,
  onAddStudent,
  onSelectStudent
}: {
  students: Student[];
  activeStudentId?: string;
  studentDraft: { name: string; grade: string; parent: string; subject: string };
  onDraftChange: (draft: { name: string; grade: string; parent: string; subject: string }) => void;
  onAddStudent: () => void;
  onSelectStudent: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <Panel title="学生联系人" icon={UserRound}>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => onSelectStudent(student.id)}
              className={cn(
                "rounded-lg border bg-white p-4 text-left transition hover:border-[#0f6b3f]/40",
                activeStudentId === student.id ? "border-[#0f6b3f] shadow-sm" : "border-black/10"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[#17201b]">{student.name}</p>
                  <p className="mt-1 text-xs text-[#66736a]">
                    {student.grade} · {student.subject} · {student.parent}
                  </p>
                </div>
                <span className={cn("rounded-md border px-2 py-1 text-xs font-medium", riskStyles[student.risk])}>{student.risk}</span>
              </div>
              <p className="mt-3 min-h-10 text-sm leading-5 text-[#46534a]">{student.focus}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {student.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-[#eef4ef] px-2 py-1 text-xs text-[#526257]">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="新增学生" icon={Plus}>
        <div className="space-y-3">
          <ShellInput value={studentDraft.name} placeholder="学生姓名" onChange={(value) => onDraftChange({ ...studentDraft, name: value })} />
          <ShellInput value={studentDraft.grade} placeholder="年级" onChange={(value) => onDraftChange({ ...studentDraft, grade: value })} />
          <ShellInput value={studentDraft.parent} placeholder="家长称呼" onChange={(value) => onDraftChange({ ...studentDraft, parent: value })} />
          <ShellInput value={studentDraft.subject} placeholder="学科" onChange={(value) => onDraftChange({ ...studentDraft, subject: value })} />
          <button type="button" onClick={onAddStudent} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0f6b3f] px-3 text-sm font-semibold text-white transition hover:bg-[#0d5b35]">
            <Plus className="h-4 w-4" />
            添加到联系人
          </button>
        </div>
      </Panel>
    </div>
  );
}

function LessonsView({
  lessons,
  studentById,
  onMarkLessonDone
}: {
  lessons: Lesson[];
  studentById: Map<string, Student>;
  onMarkLessonDone: (id: string) => void;
}) {
  return (
    <Panel title="课时壳" icon={CalendarDays}>
      <div className="overflow-hidden rounded-lg border border-black/10">
        {lessons.map((lesson) => (
          <LessonLine key={lesson.id} lesson={lesson} student={studentById.get(lesson.studentId)} onMarkLessonDone={onMarkLessonDone} />
        ))}
      </div>
    </Panel>
  );
}

function FeedbackView({
  feedbacks,
  activeFeedbackId,
  studentById,
  onSelectFeedback,
  onCopy,
  onMarkSent,
  onArchive
}: {
  feedbacks: FeedbackCard[];
  activeFeedbackId?: string;
  studentById: Map<string, Student>;
  onSelectFeedback: (id: string) => void;
  onCopy: (id: string) => void;
  onMarkSent: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  return (
    <Panel title="微信反馈卡" icon={MessageSquareText}>
      <div className="grid gap-3 xl:grid-cols-2">
        {feedbacks.map((feedback) => (
          <button
            key={feedback.id}
            type="button"
            onClick={() => onSelectFeedback(feedback.id)}
            className={cn(
              "rounded-lg border bg-white p-4 text-left transition hover:border-[#0f6b3f]/40",
              activeFeedbackId === feedback.id ? "border-[#0f6b3f] shadow-sm" : "border-black/10"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-[#17201b]">{feedback.title}</p>
              <div className="flex gap-1">
                <StatusPill label={feedback.feedbackStatus} />
                <StatusPill label={feedback.archiveStatus} />
              </div>
            </div>
            <p className="mt-1 text-xs text-[#66736a]">
              {studentById.get(feedback.studentId)?.name ?? "学生"} · {feedback.source}
            </p>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#46534a]">{feedback.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <MiniAction icon={Copy} label={feedback.copied ? "已复制" : "复制"} onClick={(event) => { event.stopPropagation(); onCopy(feedback.id); }} />
              <MiniAction icon={Send} label="标记已发" disabled={feedback.feedbackStatus === "已反馈"} onClick={(event) => { event.stopPropagation(); onMarkSent(feedback.id); }} />
              <MiniAction icon={Archive} label="确认入档" disabled={feedback.archiveStatus === "已入档"} onClick={(event) => { event.stopPropagation(); onArchive(feedback.id); }} />
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function ArchiveView({
  feedbacks,
  timeline,
  studentById,
  onArchive
}: {
  feedbacks: FeedbackCard[];
  timeline: TimelineEvent[];
  studentById: Map<string, Student>;
  onArchive: (id: string) => void;
}) {
  const queue = feedbacks.filter((feedback) => feedback.archiveStatus === "待入档");
  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Panel title="待入档" icon={ClipboardCheck}>
        <div className="space-y-2">
          {queue.length ? (
            queue.map((feedback) => (
              <div key={feedback.id} className="rounded-lg border border-black/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#17201b]">{feedback.title}</p>
                    <p className="mt-1 text-xs text-[#66736a]">{studentById.get(feedback.studentId)?.name}</p>
                  </div>
                  <button type="button" onClick={() => onArchive(feedback.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0f6b3f] px-2.5 text-xs font-semibold text-white">
                    <Archive className="h-3.5 w-3.5" />
                    入档
                  </button>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#46534a]">{feedback.body}</p>
              </div>
            ))
          ) : (
            <EmptyLine icon={ShieldCheck} text="没有待入档卡片" />
          )}
        </div>
      </Panel>
      <Panel title="学生时间线" icon={FileText}>
        <div className="space-y-2">
          {timeline.map((event) => (
            <div key={event.id} className="rounded-lg border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#17201b]">{event.title}</p>
                <span className="text-xs text-[#66736a]">{event.time}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#46534a]">{event.body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="grid gap-4 2xl:grid-cols-2">
      <Panel title="白标空间" icon={Settings}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingRow label="工作室名称" value="学脉演示工作室" />
          <SettingRow label="老师账号" value="teacher@xuemai.local" />
          <SettingRow label="反馈风格" value="温和、具体、可复制" />
          <SettingRow label="数据策略" value="AI 草稿与入档结果分离" />
        </div>
      </Panel>
      <Panel title="保留内核" icon={ShieldCheck}>
        <div className="space-y-2 text-sm leading-6 text-[#46534a]">
          <CheckLine text="SkillCard 作为正式 AI 输出节点" />
          <CheckLine text="反馈状态优先于入档状态展示" />
          <CheckLine text="老师确认后才写入学生时间线" />
          <CheckLine text="不自动发送微信，不自动最终诊断" />
        </div>
      </Panel>
    </div>
  );
}

function ActiveStudentPanel({
  student,
  lessons,
  timeline,
  recordText,
  onRecordTextChange,
  onGenerateFeedback
}: {
  student?: Student;
  lessons: Lesson[];
  timeline: TimelineEvent[];
  recordText: string;
  onRecordTextChange: (value: string) => void;
  onGenerateFeedback: () => void;
}) {
  if (!student) return null;
  return (
    <Panel title="当前学生" icon={UserRound}>
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-[#17201b]">{student.name}</p>
              <p className="mt-1 text-sm text-[#66736a]">
                {student.grade} · {student.subject} · {student.parent}
              </p>
            </div>
            <span className={cn("rounded-md border px-2 py-1 text-xs font-medium", riskStyles[student.risk])}>{student.risk}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#46534a]">{student.focus}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="课时余额" value={`${student.balance}`} icon={Wallet} />
          <Metric label="下次课" value={student.nextLesson} icon={Clock3} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#17201b]">课堂记录</p>
          <textarea
            value={recordText}
            onChange={(event) => onRecordTextChange(event.target.value)}
            className="min-h-[118px] w-full resize-none rounded-lg border border-black/10 bg-white p-3 text-sm leading-6 outline-none transition focus:border-[#0f6b3f]"
          />
          <button type="button" onClick={onGenerateFeedback} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0f6b3f] px-3 text-sm font-semibold text-white transition hover:bg-[#0d5b35]">
            <Sparkles className="h-4 w-4" />
            生成反馈卡
          </button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#17201b]">最近记录</p>
          {timeline.length ? (
            timeline.slice(0, 2).map((item) => (
              <div key={item.id} className="rounded-lg bg-[#f4f7f5] p-3">
                <p className="text-sm font-medium text-[#17201b]">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#66736a]">{item.body}</p>
              </div>
            ))
          ) : (
            <EmptyLine icon={BookOpen} text={lessons.length ? "等待确认入档" : "暂无课时记录"} />
          )}
        </div>
      </div>
    </Panel>
  );
}

function FeedbackDetailPanel({
  feedback,
  studentName,
  displayStatus,
  onCopy,
  onMarkSent,
  onArchive
}: {
  feedback: FeedbackCard;
  studentName: string;
  displayStatus: string;
  onCopy: () => void;
  onMarkSent: () => void;
  onArchive: () => void;
}) {
  return (
    <Panel title="分析详情" icon={FileText}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-[#17201b]">{studentName}</p>
            <p className="mt-1 text-xs text-[#66736a]">{feedback.source}</p>
          </div>
          <StatusPill label={displayStatus} />
        </div>
        <div className="rounded-lg border border-black/10 bg-[#fbfcfb] p-3 text-sm leading-6 text-[#46534a]">{feedback.body}</div>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="反馈状态" value={feedback.feedbackStatus} icon={Send} />
          <Metric label="入档状态" value={feedback.archiveStatus} icon={Archive} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={onCopy} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white px-2 text-xs font-semibold text-[#17201b]">
            <Copy className="h-3.5 w-3.5" />
            {feedback.copied ? "已复制" : "复制"}
          </button>
          <button type="button" disabled={feedback.feedbackStatus === "已反馈"} onClick={onMarkSent} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white px-2 text-xs font-semibold text-[#17201b] disabled:opacity-45">
            <Send className="h-3.5 w-3.5" />
            标记已发
          </button>
          <button type="button" disabled={feedback.archiveStatus === "已入档"} onClick={onArchive} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0f6b3f] px-2 text-xs font-semibold text-white disabled:opacity-45">
            <Archive className="h-3.5 w-3.5" />
            入档
          </button>
        </div>
      </div>
    </Panel>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef4ef] text-[#0f6b3f]">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-base font-semibold tracking-normal text-[#17201b]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function LessonLine({ lesson, student, onMarkLessonDone }: { lesson: Lesson; student?: Student; onMarkLessonDone: (id: string) => void }) {
  return (
    <div className="grid gap-3 border-b border-black/10 bg-white p-3 last:border-b-0 md:grid-cols-[112px_minmax(0,1fr)_120px_116px] md:items-center">
      <div>
        <p className="text-sm font-semibold text-[#17201b]">{lesson.date}</p>
        <p className="text-xs text-[#66736a]">{lesson.time}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#17201b]">
          {student?.name ?? "未命名"} · {lesson.topic}
        </p>
        <p className="mt-1 text-xs text-[#66736a]">
          {lesson.kind} · {lesson.subject}
        </p>
      </div>
      <StatusPill label={lesson.status} />
      <button
        type="button"
        disabled={lesson.status === "已反馈" || lesson.status === "已取消"}
        onClick={() => onMarkLessonDone(lesson.id)}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white px-2 text-xs font-semibold text-[#17201b] transition hover:bg-[#f4f7f5] disabled:opacity-45"
      >
        <Check className="h-3.5 w-3.5" />
        已上课
      </button>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  const tone =
    label === "已反馈" || label === "已入档" || label === "已上课"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : label === "待反馈" || label === "待入档" || label === "待上课"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={cn("inline-flex h-7 items-center justify-center rounded-md border px-2 text-xs font-semibold", tone)}>{label}</span>;
}

function MiniAction({
  icon: Icon,
  label,
  disabled,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-xs font-semibold text-[#17201b] transition hover:bg-[#f4f7f5] disabled:opacity-45"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#fbfcfb] p-3">
      <div className="flex items-center gap-2 text-xs text-[#66736a]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-[#17201b]">{value}</p>
    </div>
  );
}

function ShellInput({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa5a0] focus:border-[#0f6b3f]"
    />
  );
}

function EmptyLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex min-h-20 items-center justify-center gap-2 rounded-lg border border-dashed border-black/15 bg-[#fbfcfb] text-sm text-[#66736a]">
      <Icon className="h-4 w-4" />
      {text}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#fbfcfb] p-3">
      <p className="text-xs text-[#66736a]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#17201b]">{value}</p>
    </div>
  );
}

function CheckLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-[#f4f7f5] p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-[#0f6b3f]" />
      <span>{text}</span>
    </div>
  );
}

function buildFeedbackFromLesson(lesson: Lesson, student?: Student): FeedbackCard {
  const studentName = student?.name ?? "学生";
  const focus = student?.focus ?? "本次课表现已记录，后续需要继续观察。";
  return {
    id: `feedback-${lesson.id}-${Date.now()}`,
    studentId: lesson.studentId,
    lessonId: lesson.id,
    title: `${lesson.topic}课后反馈`,
    source: "课时状态 + 老师记录",
    body: `家长您好，${studentName}本次${lesson.subject}课围绕「${lesson.topic}」进行了复盘。${focus} 我会把今天暴露的问题放入后续巩固，并在下次课继续观察是否稳定改善。`,
    feedbackStatus: "待反馈",
    archiveStatus: "待入档",
    confidence: "证据充足",
    copied: false
  };
}
