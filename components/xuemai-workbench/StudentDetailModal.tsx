import { TeachingContent } from "./TeachingContent";
import { cn } from "@/lib/utils";
import { ArrowLeft, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Conversation, TaskCard, TimelineRecord } from "./types";

type StudentDetailModalProps = {
  student: Conversation;
  taskCards: TaskCard[];
  timelineRecords: TimelineRecord[];
  onClose: () => void;
  onOpenTask?: (taskId: string) => void;
  onEditProfile?: (student: Conversation) => void;
  activeSubject?: string;
  onSubjectChange?: (subject: string) => void;
};

type StudentProfileWorkspaceProps = {
  composerValue?: string;
  onComposerChange?: (value: string) => void;
  onSend?: () => void;
  student: Conversation;
  taskCards: TaskCard[];
  timelineRecords: TimelineRecord[];
  onClose?: () => void;
  onOpenTask?: (taskId: string) => void;
  onEditProfile?: (student: Conversation) => void;
  activeSubject?: string;
  onSubjectChange?: (subject: string) => void;
};

type TimelineFilter = "全部" | "反馈" | "错题" | "报告" | "更新";


export function StudentDetailModal(props: StudentDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialogRef.current?.showModal(); }, []);
  return (
    <dialog ref={dialogRef} aria-label="学生档案" onCancel={event => { event.preventDefault(); props.onClose(); }} className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[560px] overflow-hidden rounded-[26px] bg-[#f7f8f7] p-0 backdrop:bg-[#111827]/24">
      <section className="relative flex h-[min(900px,calc(100vh-32px))] w-full max-w-[560px] overflow-hidden rounded-[26px] bg-[#f7f8f7] shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <StudentProfileWorkspace {...props} />
      </section>
    </dialog>
  );
}

export function StudentProfileWorkspace({ student, taskCards, timelineRecords, onClose, onOpenTask, onEditProfile }: StudentProfileWorkspaceProps) {
  const [filter, setFilter] = useState<TimelineFilter>("全部");
  const studentTasks = taskCards.filter(task => task.conversationId === student.id);
  const studentRecords = timelineRecords.filter(record => record.conversationId === student.id);
  const timelineItems = buildTimelineItems(studentTasks, studentRecords);
  const filteredItems = filter === "全部" ? timelineItems : timelineItems.filter(item => item.type === filter);
  return <div className="relative flex min-h-0 w-full flex-1 flex-col bg-[#f7f8f7]">
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-[#e5e8e6] bg-white/92 px-5 py-2">
      <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center rounded-full text-[#26312a] hover:bg-[#f3f5f4]" aria-label="返回"><ArrowLeft size={22} /></button>
      <h2 className="text-[17px] font-bold text-[#191c1d]">学生档案</h2>
      <button type="button" onClick={() => onEditProfile?.(student)} className="flex h-10 items-center gap-1.5 rounded-full bg-[#f3f5f4] px-3 text-[12px] font-bold text-[#3d4a3d] hover:bg-[#eaf8ef]"><Pencil size={14} />修改资料</button>
    </header>
    <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
      <section className="rounded-[22px] bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaf8ef] text-[20px] font-bold text-[#14883b]">{student.avatar}</div>
          <div className="min-w-0"><h3 className="break-words text-[21px] font-bold text-[#191c1d]">{student.name}</h3><p className="mt-1 text-[12px] text-[#6b746d]">{[student.grade, student.subject, student.className].filter(Boolean).join(" · ")}</p></div>
        </div>
        <p className="mt-4 text-[13px] leading-6 text-[#4e5c52]">已保存 {studentRecords.length} 条记录。课堂表现与学习报告，按时间留在这里。</p>
      </section>
      <section className="mt-4 rounded-[22px] bg-white p-5">
        <h3 className="text-[15px] font-bold text-[#191c1d]">学习记录</h3>
        <div className="my-3 flex flex-wrap gap-2">{(["全部", "报告", "反馈"] as TimelineFilter[]).map(item => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={cn("rounded-full px-3 py-2 text-[12px] font-semibold", filter === item ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#f3f5f4] text-[#5c665f]")}>{item}</button>)}</div>
        {filteredItems.length ? <div className="divide-y divide-[#edf0ee]">{filteredItems.map(item => <article key={item.id} className="py-4">
          <h4 className="break-words text-[14px] font-bold text-[#191c1d]">{item.title}</h4>
          <p className="mt-1 text-[11px] text-[#6b746d]">{item.time}</p>
          <TeachingContent text={item.summary} className="mt-2 text-[13px] leading-6 text-[#4e5c52]" />
          {item.taskId ? <button type="button" onClick={() => onOpenTask?.(item.taskId)} className="mt-2 min-h-9 rounded-full bg-[#edf8f1] px-3 text-[12px] font-semibold text-[#15803d]">查看完整内容</button> : null}
        </article>)}</div> : <p className="py-4 text-[13px] leading-6 text-[#6b746d]">{filter === "全部" ? "还没有已确认的记录。回到课堂页，记录学生表现并确认入档。" : "这个分类下还没有内容。"}</p>}
      </section>
    </div>
  </div>;
}

function buildTimelineItems(tasks: TaskCard[], records: TimelineRecord[]) {
  const taskItems = tasks
    .filter((task) => task.status === "feedback_done")
    .map((task) => ({
      id: task.id,
      taskId: task.id,
      title: getTimelineTitle(task),
      summary: cleanProfileSummary(task.summary ?? task.feedbackText ?? task.currentOutput?.display_content ?? ""),
      type: getTimelineType(task),
      time: formatRelativeDay(task.updatedAt),
      sortAt: task.updatedAt
    }));
  const recordItems = records.map((record) => ({
    id: record.id,
    taskId: record.sourceTaskId,
    title: record.skillId === "generate_feedback" ? "微信反馈" : record.title.replace(/^.*? · /u, ""),
    summary: cleanProfileSummary(record.summary),
    type: record.skillId === "monthly_report" ? ("报告" as TimelineFilter) : ("更新" as TimelineFilter),
    time: formatRelativeDay(record.createdAt),
    sortAt: record.createdAt
  }));

  return [...taskItems, ...recordItems].sort((a, b) => b.sortAt.localeCompare(a.sortAt));
}

function getTimelineTitle(task: TaskCard) {
  if (task.taskType === "learning_evidence_analysis") return "学习材料分析";
  if (task.taskType === "feedback") return "微信反馈";
  if (task.taskType === "monthly_report") return task.structuredResult?.recordKind === "daily" ? "日报" : "月报";
  if (task.taskType === "learning_record") return "学习记录";
  return task.title.replace(/^.*? · /u, "");
}

function getTimelineType(task: TaskCard): TimelineFilter {
  if (task.taskType === "feedback") return "反馈";
  if (task.taskType === "learning_evidence_analysis") return "错题";
  if (task.taskType === "monthly_report") return "报告";
  return "更新";
}

function formatRelativeDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "暂无";
  return date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function cleanProfileSummary(text: string) {
  return text
    .replace(/^已整理为学习记录草稿：/u, "")
    .replace(/^已生成学习证据分析草稿：/u, "")
    .replace(/^已生成一条可审核的 AI 工作流结果，?/u, "")
    .trim();
}
