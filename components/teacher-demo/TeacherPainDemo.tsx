"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Menu, Plus } from "lucide-react";
import { TeacherDemoAnalysisDrawer } from "./TeacherDemoAnalysisDrawer";
import { TeacherDemoCaptureDialog } from "./TeacherDemoCaptureDialog";
import { TeacherDemoContext } from "./TeacherDemoContext";
import { TeacherDemoNavigation, TeacherDemoBottomNavigation } from "./TeacherDemoNavigation";
import { ClassOverview, StudentOverview } from "./TeacherDemoOverview";
import { TeacherDemoQueue } from "./TeacherDemoQueue";
import { EmptyWorkspace, QuickCaptureBar, TaskWorkspace } from "./TeacherDemoWorkspace";
import { demoClasses, demoStudents, demoTasks } from "./demo-data";
import { completeDemoTask, filterTasksForView, getNextPendingTask } from "./demo-state";
import type { CapturePayload, DemoTask, DemoView } from "./types";

const STORAGE_KEY = "xuemai-teacher-pain-demo-v2";

type PersistedDemoState = {
  tasks: DemoTask[];
  drafts: Record<string, string>;
  archived: Record<string, boolean>;
};

export function TeacherPainDemo() {
  const [view, setView] = useState<DemoView>("today");
  const [tasks, setTasks] = useState<DemoTask[]>(demoTasks);
  const [activeId, setActiveId] = useState(demoTasks[0].id);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(demoTasks.map((task) => [task.id, task.draft])));
  const [archived, setArchived] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PersistedDemoState;
        if (Array.isArray(saved.tasks) && saved.tasks.length > 0) setTasks(saved.tasks);
        if (saved.drafts) setDrafts(saved.drafts);
        if (saved.archived) setArchived(saved.archived);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, drafts, archived } satisfies PersistedDemoState));
  }, [archived, drafts, hydrated, tasks]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeTask = tasks.find((task) => task.id === activeId) ?? null;
  const activeStudent = useMemo(() => {
    if (view === "students") return demoStudents.find((student) => student.id === activeId) ?? demoStudents[0];
    return demoStudents.find((student) => student.id === activeTask?.studentId) ?? demoStudents[0];
  }, [activeId, activeTask?.studentId, view]);
  const activeClass = demoClasses.find((item) => item.id === activeId) ?? demoClasses[0];
  const visibleTasks = view === "today" || view === "messages" ? filterTasksForView(tasks, view) : tasks;

  const handleViewChange = (nextView: DemoView) => {
    setView(nextView);
    setMobileDetailOpen(false);
    setAnalysisOpen(false);
    if (nextView === "students") setActiveId(demoStudents[0].id);
    else if (nextView === "classes") setActiveId(demoClasses[0].id);
    else {
      const first = filterTasksForView(tasks, nextView).find((task) => task.status !== "done") ?? filterTasksForView(tasks, nextView)[0];
      if (first) setActiveId(first.id);
    }
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    setMobileDetailOpen(true);
  };

  const handleTaskComplete = () => {
    if (!activeTask) return;
    const updatedTasks = completeDemoTask(tasks, activeTask.id);
    const nextTask = getNextPendingTask(updatedTasks, activeTask.id);
    setTasks(updatedTasks);
    setToast(archived[activeTask.id] ? "已完成处理，并加入学生档案" : "已完成处理");
    if (nextTask && view === "today") window.setTimeout(() => setActiveId(nextTask.id), 360);
  };

  const handleCapture = (payload: CapturePayload) => {
    const student = demoStudents.find((item) => item.id === payload.studentId) ?? demoStudents[0];
    const now = new Date();
    const time = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
    const id = `task-captured-${now.getTime()}`;
    const kind = payload.kind === "家长消息" ? "parent_reply" : payload.kind === "学生材料" ? "analysis" : "feedback";
    const status = kind === "parent_reply" ? "pending_reply" : kind === "analysis" ? "needs_review" : "pending_feedback";
    const title = kind === "parent_reply" ? `${student.parent} · 等待回复` : kind === "analysis" ? `${student.name} · 新材料待检查` : `${student.name} · 课堂反馈待处理`;
    const draft = kind === "parent_reply"
      ? `${student.parent}，您好。您的消息我收到了。关于您提到的情况，我会先结合近期课堂和练习记录核实，再向您反馈。`
      : kind === "analysis"
        ? "已收到本次学生材料。请先检查材料是否包含学生作答、订正或老师批改痕迹，再形成可反馈结论。"
        : `${student.parent}，您好！今天的课堂情况已经记录。我会结合本次课堂中的真实表现整理重点，检查后再向您同步。`;
    const task: DemoTask = {
      id,
      kind,
      status,
      studentId: student.id,
      title,
      source: payload.kind + (payload.attachmentName ? ` · ${payload.attachmentName}` : ""),
      preview: payload.content || `已添加 ${payload.attachmentName}`,
      time,
      priority: kind === "parent_reply" ? "high" : "normal",
      draftTitle: kind === "parent_reply" ? "建议回复（可编辑）" : kind === "analysis" ? "分析结论草稿" : "家长反馈（可编辑）",
      draft,
      summary: payload.content || "已保存材料，等待老师补充背景后再形成结论。",
      teacherSuggestion: "只基于已核实事实表达；发送或入档前由老师完成最终检查。",
      evidence: [{ id: `${id}-evidence`, label: payload.kind, detail: payload.content || payload.attachmentName || "老师新建记录", time, verified: true }]
    };
    setTasks((current) => [task, ...current]);
    setDrafts((current) => ({ ...current, [id]: draft }));
    setView(kind === "parent_reply" ? "messages" : "today");
    setActiveId(id);
    setMobileDetailOpen(true);
    setCaptureOpen(false);
    setToast("已生成一条待处理事项");
  };

  const mainContent = view === "students"
    ? <StudentOverview student={activeStudent} onBack={() => setMobileDetailOpen(false)} />
    : view === "classes"
      ? <ClassOverview classItem={activeClass} onBack={() => setMobileDetailOpen(false)} />
      : activeTask
        ? (
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-[#f7f8fa]">
            <div className="border-b border-[#191c1d]/[0.08] bg-white px-3 py-3 sm:px-5"><QuickCaptureBar onOpen={() => setCaptureOpen(true)} /></div>
            <TaskWorkspace
              task={activeTask}
              student={activeStudent}
              draft={drafts[activeTask.id] ?? activeTask.draft}
              archived={Boolean(archived[activeTask.id])}
              onDraftChange={(value) => setDrafts((current) => ({ ...current, [activeTask.id]: value }))}
              onToggleArchive={() => setArchived((current) => ({ ...current, [activeTask.id]: !current[activeTask.id] }))}
              onComplete={handleTaskComplete}
              onOpenAnalysis={() => setAnalysisOpen(true)}
              onBack={() => setMobileDetailOpen(false)}
            />
          </div>
        )
        : <EmptyWorkspace title="当前没有待处理事项" description="可以从上方快速记录课堂、材料或家长消息。" />;

  return (
    <main className="flex h-[100dvh] min-h-[640px] overflow-hidden bg-[#f7f8fa] text-[#191c1d]">
      <TeacherDemoNavigation view={view} onChange={handleViewChange} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col pb-[68px] lg:pb-0">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#191c1d]/[0.08] bg-white px-3 lg:hidden">
          <button type="button" aria-label="打开导航" onClick={() => setMobileNavOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#f3f4f5]"><Menu className="h-5 w-5" /></button>
          <strong className="text-[15px]">{view === "today" ? "今日工作" : view === "messages" ? "家长消息" : view === "students" ? "学生档案" : "班级服务"}</strong>
          <button type="button" aria-label="快速记录" onClick={() => setCaptureOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eefbf2] text-[#006e2f]"><Plus className="h-5 w-5" /></button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)_294px]">
          <div className={mobileDetailOpen ? "hidden min-h-0 lg:block" : "min-h-0"}>
            <TeacherDemoQueue view={view} tasks={visibleTasks} students={demoStudents} classes={demoClasses} activeId={activeId} onSelect={handleSelect} />
          </div>
          <div className={mobileDetailOpen ? "min-h-0" : "hidden min-h-0 lg:block"}>{mainContent}</div>
          <div className="hidden min-h-0 xl:block">
            {view !== "classes" ? <TeacherDemoContext student={activeStudent} onOpenStudent={() => { setView("students"); setActiveId(activeStudent.id); }} /> : null}
          </div>
        </div>
      </div>

      <TeacherDemoBottomNavigation view={view} onChange={handleViewChange} />
      <TeacherDemoCaptureDialog open={captureOpen} students={demoStudents} defaultStudentId={activeStudent?.id} onClose={() => setCaptureOpen(false)} onSubmit={handleCapture} />
      <TeacherDemoAnalysisDrawer task={activeTask} student={activeStudent} open={analysisOpen} onClose={() => setAnalysisOpen(false)} />

      {toast ? (
        <div role="status" className="fixed bottom-20 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#191c1d] px-4 py-2.5 text-[12px] font-bold text-white shadow-lg lg:bottom-6">
          <CheckCircle2 className="h-4 w-4 text-[#86efac]" />{toast}
        </div>
      ) : null}
    </main>
  );
}
