import { useState } from "react";
import { ChevronRight, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTaskStatusCount, getTaskStatusLabel } from "./demo-state";
import type { ClassProfile, DemoTask, DemoTaskStatus, DemoView, StudentProfile } from "./types";

type QueueFilter = "all" | DemoTaskStatus;

const statusStyles: Record<DemoTaskStatus, string> = {
  pending_feedback: "bg-[#eefbf2] text-[#16803a]",
  pending_reply: "bg-[#fff7ed] text-[#b45309]",
  needs_review: "bg-[#f3f4f5] text-[#4b5563]",
  needs_attention: "bg-[#fef2f2] text-[#ba1a1a]",
  done: "bg-[#eefbf2] text-[#16803a]"
};

export function TeacherDemoQueue({
  view,
  tasks,
  students,
  classes,
  activeId,
  onSelect
}: {
  view: DemoView;
  tasks: DemoTask[];
  students: StudentProfile[];
  classes: ClassProfile[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  if (view === "students") return <StudentQueue students={students} activeId={activeId} onSelect={onSelect} />;
  if (view === "classes") return <ClassQueue classes={classes} activeId={activeId} onSelect={onSelect} />;
  return <TaskQueue view={view} tasks={tasks} activeId={activeId} onSelect={onSelect} />;
}

function TaskQueue({ view, tasks, activeId, onSelect }: { view: "today" | "messages"; tasks: DemoTask[]; activeId: string; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<QueueFilter>("all");
  const visible = tasks.filter((task) => filter === "all" || task.status === filter);
  const pending = tasks.filter((task) => task.status !== "done").length;
  const completed = tasks.filter((task) => task.status === "done").length + (view === "today" ? 2 : 0);
  const allFilterOptions: Array<{ id: QueueFilter; label: string; count: number }> = [
    { id: "all", label: "全部", count: tasks.length },
    { id: "pending_reply", label: "待回复", count: getTaskStatusCount(tasks, "pending_reply") },
    { id: "pending_feedback", label: "待反馈", count: getTaskStatusCount(tasks, "pending_feedback") },
    { id: "needs_attention", label: "需关注", count: getTaskStatusCount(tasks, "needs_attention") }
  ];
  const filterOptions = allFilterOptions.filter((item) => item.id === "all" || item.count > 0);

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <header className="border-b border-[#191c1d]/[0.08] px-4 pb-4 pt-5 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-black tracking-[-0.02em] text-[#191c1d]">{view === "today" ? `今天先处理 ${pending} 件事` : `${pending} 条家长消息待处理`}</h1>
            <p className="mt-1 text-[12px] font-medium text-[#6b7280]">已完成 {completed} · 每项都能直接处理</p>
          </div>
          <button type="button" aria-label="筛选事项" className="flex h-11 w-11 items-center justify-center rounded-full text-[#3d4a3d] hover:bg-[#f3f4f5] sm:h-9 sm:w-9">
            <Filter className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "h-9 shrink-0 rounded-[11px] border px-3 text-[12px] font-bold transition",
                filter === item.id ? "border-[#22c55e] bg-[#eefbf2] text-[#006e2f]" : "border-[#191c1d]/[0.08] bg-white text-[#6b7280] hover:bg-[#f3f4f5]"
              )}
            >
              {item.label} {item.count}
            </button>
          ))}
        </div>
      </header>

      <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="space-y-2.5">
          {visible.map((task) => {
            const active = task.id === activeId;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelect(task.id)}
                className={cn(
                  "w-full rounded-[14px] border p-3.5 text-left transition",
                  active ? "border-[#22c55e] bg-[#f6fff8] shadow-[0_8px_24px_rgba(34,197,94,0.06)]" : "border-[#191c1d]/[0.09] bg-white hover:border-[#22c55e]/45 hover:bg-[#fafcfb]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 text-[14px] font-black leading-5 text-[#191c1d]">{task.title}</h2>
                  <span className={cn("shrink-0 rounded-[7px] px-2 py-1 text-[11px] font-bold", statusStyles[task.status])}>{getTaskStatusLabel(task.status)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-medium text-[#8b9297]">
                  <span className="rounded-md bg-[#f3f4f5] px-1.5 py-0.5">来源：{task.source}</span>
                  <span>{task.time}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-[12px] font-medium leading-5 text-[#5f6861]">{task.preview}</p>
              </button>
            );
          })}
        </div>
        {visible.length === 0 ? <p className="py-12 text-center text-[13px] font-medium text-[#9ca3af]">当前没有这类事项</p> : null}
      </div>
    </section>
  );
}

function StudentQueue({ students, activeId, onSelect }: { students: StudentProfile[]; activeId: string; onSelect: (id: string) => void }) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <header className="border-b border-[#191c1d]/[0.08] px-5 pb-4 pt-5">
        <h1 className="text-[20px] font-black text-[#191c1d]">学生服务档案</h1>
        <label className="mt-4 flex h-10 items-center gap-2 rounded-[12px] bg-[#f3f4f5] px-3 text-[#6b7280]">
          <Search className="h-4 w-4" />
          <input className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#9ca3af]" placeholder="搜索学生、班级或关注点" />
        </label>
      </header>
      <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-2.5">
          {students.map((student) => (
            <button key={student.id} type="button" onClick={() => onSelect(student.id)} className={cn("flex w-full items-center gap-3 rounded-[14px] border p-3 text-left transition", student.id === activeId ? "border-[#22c55e] bg-[#f6fff8]" : "border-[#191c1d]/[0.08] hover:bg-[#fafcfb]")}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[13px] font-black text-[#006e2f]">{student.name.slice(-1)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-[14px] text-[#191c1d]">{student.name}</strong>
                  <span className={cn("text-[11px] font-bold", student.serviceState === "正常" ? "text-[#16803a]" : student.serviceState === "需关注" ? "text-[#ba1a1a]" : "text-[#b45309]")}>{student.serviceState}</span>
                </span>
                <span className="mt-1 block truncate text-[12px] text-[#6b7280]">{student.grade} · {student.subject} · {student.lastService}</span>
                <span className="mt-1 block truncate text-[12px] font-medium text-[#3d4a3d]">{student.focus}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClassQueue({ classes, activeId, onSelect }: { classes: ClassProfile[]; activeId: string; onSelect: (id: string) => void }) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <header className="border-b border-[#191c1d]/[0.08] px-5 pb-4 pt-5">
        <h1 className="text-[20px] font-black text-[#191c1d]">班级服务状态</h1>
        <p className="mt-1 text-[12px] font-medium text-[#6b7280]">公共课堂记录，逐学生独立反馈</p>
      </header>
      <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {classes.map((classItem) => (
            <button key={classItem.id} type="button" onClick={() => onSelect(classItem.id)} className={cn("w-full rounded-[14px] border p-4 text-left transition", classItem.id === activeId ? "border-[#22c55e] bg-[#f6fff8]" : "border-[#191c1d]/[0.08] hover:bg-[#fafcfb]")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-black text-[#191c1d]">{classItem.name}</h2>
                  <p className="mt-1 text-[12px] text-[#6b7280]">{classItem.students} 名学生 · {classItem.teacher}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
              </div>
              <div className="mt-3 flex gap-2 text-[11px] font-bold">
                <span className="rounded-md bg-[#eefbf2] px-2 py-1 text-[#16803a]">待反馈 {classItem.pendingFeedback}</span>
                <span className="rounded-md bg-[#fef2f2] px-2 py-1 text-[#ba1a1a]">需关注 {classItem.needsAttention}</span>
              </div>
              <p className="mt-3 text-[12px] leading-5 text-[#3d4a3d]">{classItem.focus}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
