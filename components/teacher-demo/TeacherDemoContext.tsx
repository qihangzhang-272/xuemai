import { BookOpenCheck, Check, FileText, MessageCircle, NotebookPen, Phone, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentProfile, TimelineItem } from "./types";

const timelineIcons = {
  lesson: NotebookPen,
  material: FileText,
  feedback: Check,
  parent: MessageCircle
};

export function TeacherDemoContext({ student, onOpenStudent }: { student: StudentProfile; onOpenStudent: () => void }) {
  return (
    <aside className="xuemai-scrollbar h-full min-h-0 overflow-y-auto border-l border-[#191c1d]/[0.08] bg-white p-3.5">
      <section className="rounded-[14px] border border-[#191c1d]/[0.08] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[14px] font-black text-[#006e2f]">{student.name.slice(-1)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[15px] font-black text-[#191c1d]">{student.name}</h2>
              <span className="rounded-[6px] bg-[#eefbf2] px-1.5 py-0.5 text-[10px] font-bold text-[#16803a]">{student.grade}</span>
            </div>
            <p className="mt-1 truncate text-[11px] font-medium text-[#6b7280]">{student.className}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-[12px] font-medium text-[#5f6861]">
          <p className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5 text-[#8b9297]" />家长：{student.parent}（{student.parentPhone}）</p>
          <p className="flex items-center gap-2"><BookOpenCheck className="h-3.5 w-3.5 text-[#8b9297]" />负责老师：{student.teacher}</p>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#191c1d]/[0.08] text-[12px] font-bold text-[#3d4a3d] hover:bg-[#f3f4f5]"><Phone className="h-3.5 w-3.5" />联系家长</button>
          <button type="button" onClick={onOpenStudent} className="min-h-11 flex-1 rounded-[10px] bg-[#eefbf2] px-3 text-[12px] font-bold text-[#006e2f] hover:bg-[#dcfce7]">学生档案</button>
        </div>
      </section>

      <section className="mt-3 rounded-[14px] border border-[#191c1d]/[0.08] p-4">
        <h3 className="text-[14px] font-black text-[#191c1d]">当前重点</h3>
        <p className="mt-2 text-[13px] font-bold leading-5 text-[#3d4a3d]">{student.focus}</p>
        <p className="mt-2 text-[12px] leading-5 text-[#6b7280]">{student.progress}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf0ee]">
          <div className={cn("h-full rounded-full", student.serviceState === "正常" ? "w-3/4 bg-[#22c55e]" : student.serviceState === "需关注" ? "w-1/3 bg-[#ef4444]" : "w-1/2 bg-[#f59e0b]")} />
        </div>
        <p className="mt-2 text-[10px] font-medium text-[#8b9297]">最近服务：{student.lastService}</p>
      </section>

      <section className="mt-3 rounded-[14px] border border-[#191c1d]/[0.08] p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-black text-[#191c1d]">近期时间线</h3>
          <button type="button" onClick={onOpenStudent} className="text-[11px] font-bold text-[#16803a] hover:text-[#006e2f]">查看全部</button>
        </div>
        <div className="mt-4 space-y-0">
          {student.timeline.slice(0, 4).map((item, index) => <TimelineRow key={item.id} item={item} last={index === Math.min(student.timeline.length, 4) - 1} />)}
        </div>
      </section>

      <section className="mt-3 rounded-[14px] border border-[#191c1d]/[0.08] p-4">
        <h3 className="text-[14px] font-black text-[#191c1d]">本月证据来源</h3>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {student.evidenceSummary.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="font-medium text-[#6b7280]">{item.label}</span>
              <strong className="text-[#191c1d]">{item.count}</strong>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function TimelineRow({ item, last }: { item: TimelineItem; last: boolean }) {
  const Icon = timelineIcons[item.kind];
  return (
    <div className="grid grid-cols-[42px_18px_1fr] gap-x-2">
      <div className="pt-0.5 text-right text-[10px] font-medium text-[#8b9297]">
        <div>{item.date}</div>
        <div className="mt-0.5">{item.time}</div>
      </div>
      <div className="relative flex justify-center">
        <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full border border-[#d8e4d7] bg-[#eefbf2] text-[#16803a]"><Icon className="h-2.5 w-2.5" /></span>
        {!last ? <span className="absolute bottom-0 top-5 w-px bg-[#dfe5e1]" /> : null}
      </div>
      <div className={cn("pb-4", last && "pb-0")}>
        <h4 className="text-[11px] font-black text-[#3d4a3d]">{item.title}</h4>
        <p className="mt-1 text-[10px] leading-4 text-[#6b7280]">{item.detail}</p>
      </div>
    </div>
  );
}
