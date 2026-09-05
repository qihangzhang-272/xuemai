import { ArrowLeft, CheckCircle2, FileText, MessageCircle, NotebookPen, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClassProfile, StudentProfile } from "./types";

export function StudentOverview({ student, onBack }: { student: StudentProfile; onBack: () => void }) {
  return (
    <article className="xuemai-scrollbar h-full overflow-y-auto bg-[#f7f8fa] px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-[860px]">
        <button type="button" onClick={onBack} className="mb-2 flex min-h-11 items-center gap-2 text-[13px] font-bold text-[#3d4a3d] md:hidden"><ArrowLeft className="h-4 w-4" />返回学生列表</button>
        <header className="flex flex-col gap-4 border-b border-[#191c1d]/[0.08] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dcfce7] text-[16px] font-black text-[#006e2f]">{student.name.slice(-1)}</span>
            <div>
              <h1 className="text-[22px] font-black text-[#191c1d]">{student.name}</h1>
              <p className="mt-1 text-[12px] text-[#6b7280]">{student.grade} · {student.className} · {student.teacher}</p>
            </div>
          </div>
          <button type="button" className="min-h-11 rounded-[11px] bg-[#22c55e] px-4 text-[13px] font-black text-white hover:bg-[#16a34a]">进入学生会话</button>
        </header>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[16px] border border-[#191c1d]/[0.08] bg-white p-4">
            <h2 className="text-[13px] font-black text-[#191c1d]">当前关注</h2>
            <p className="mt-2 text-[15px] font-black text-[#3d4a3d]">{student.focus}</p>
            <p className="mt-2 text-[12px] leading-5 text-[#6b7280]">{student.progress}</p>
          </div>
          <div className="rounded-[16px] border border-[#191c1d]/[0.08] bg-white p-4">
            <h2 className="text-[13px] font-black text-[#191c1d]">服务关系</h2>
            <dl className="mt-3 grid grid-cols-[72px_1fr] gap-y-2 text-[12px]">
              <dt className="text-[#8b9297]">家长</dt><dd className="font-bold text-[#3d4a3d]">{student.parent} · {student.parentPhone}</dd>
              <dt className="text-[#8b9297]">最近服务</dt><dd className="font-bold text-[#3d4a3d]">{student.lastService}</dd>
              <dt className="text-[#8b9297]">当前状态</dt><dd className={cn("font-black", student.serviceState === "正常" ? "text-[#16803a]" : student.serviceState === "需关注" ? "text-[#ba1a1a]" : "text-[#b45309]")}>{student.serviceState}</dd>
            </dl>
          </div>
        </section>

        <section className="mt-3 rounded-[16px] border border-[#191c1d]/[0.08] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-black text-[#191c1d]">学生连续记录</h2>
            <span className="text-[11px] font-bold text-[#16803a]">只显示有来源的记录</span>
          </div>
          <div className="mt-5 space-y-4">
            {student.timeline.map((item) => {
              const Icon = item.kind === "lesson" ? NotebookPen : item.kind === "material" ? FileText : item.kind === "parent" ? MessageCircle : CheckCircle2;
              return (
                <div key={item.id} className="grid grid-cols-[42px_1fr] gap-3 sm:grid-cols-[82px_1fr]">
                  <div className="pt-1 text-[11px] font-medium text-[#8b9297]"><div>{item.date}</div><div>{item.time}</div></div>
                  <div className="flex gap-3 border-b border-[#191c1d]/[0.07] pb-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#eefbf2] text-[#16803a]"><Icon className="h-4 w-4" /></span>
                    <div><h3 className="text-[13px] font-black text-[#191c1d]">{item.title}</h3><p className="mt-1 text-[12px] leading-5 text-[#5f6861]">{item.detail}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </article>
  );
}

export function ClassOverview({ classItem, onBack }: { classItem: ClassProfile; onBack: () => void }) {
  const students = [
    { name: "陈子轩", status: "待反馈", note: "今日课堂反馈待发送" },
    { name: "林志远", status: "正常", note: "本周记录完整" },
    { name: "吴晓彤", status: "待反馈", note: "作业分析已生成" },
    { name: "赵紫宁", status: "需关注", note: "连续两次未交作业" }
  ];
  return (
    <article className="xuemai-scrollbar h-full overflow-y-auto bg-[#f7f8fa] px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-[860px]">
        <button type="button" onClick={onBack} className="mb-2 flex min-h-11 items-center gap-2 text-[13px] font-bold text-[#3d4a3d] md:hidden"><ArrowLeft className="h-4 w-4" />返回班级列表</button>
        <header className="border-b border-[#191c1d]/[0.08] pb-5">
          <h1 className="text-[22px] font-black text-[#191c1d]">{classItem.name}</h1>
          <p className="mt-1 text-[12px] text-[#6b7280]">{classItem.students} 名学生 · {classItem.subject} · {classItem.teacher}</p>
        </header>
        <section className="mt-4 rounded-[16px] border border-[#191c1d]/[0.08] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-[15px] font-black text-[#191c1d]">本次课堂公共记录</h2><p className="mt-1 text-[12px] leading-5 text-[#6b7280]">{classItem.focus}</p></div>
            <button type="button" className="min-h-11 rounded-[11px] bg-[#22c55e] px-4 text-[13px] font-black text-white hover:bg-[#16a34a]">记录本次课堂</button>
          </div>
        </section>
        <section className="mt-3 rounded-[16px] border border-[#191c1d]/[0.08] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between"><h2 className="text-[15px] font-black text-[#191c1d]">逐学生服务状态</h2><span className="text-[11px] text-[#8b9297]">公共记录不会覆盖个体结果</span></div>
          <div className="mt-4 divide-y divide-[#191c1d]/[0.07]">
            {students.map((student) => (
              <div key={student.name} className="flex min-h-[62px] items-center gap-3 py-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f4f5] text-[12px] font-black text-[#3d4a3d]">{student.name.slice(-1)}</span>
                <div className="min-w-0 flex-1"><h3 className="text-[13px] font-black text-[#191c1d]">{student.name}</h3><p className="mt-1 truncate text-[11px] text-[#6b7280]">{student.note}</p></div>
                <span className={cn("rounded-[7px] px-2 py-1 text-[11px] font-bold", student.status === "正常" ? "bg-[#eefbf2] text-[#16803a]" : student.status === "需关注" ? "bg-[#fef2f2] text-[#ba1a1a]" : "bg-[#fff7ed] text-[#b45309]")}>{student.status}</span>
              </div>
            ))}
          </div>
          <button type="button" className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[11px] border border-[#22c55e] text-[13px] font-black text-[#006e2f] hover:bg-[#eefbf2]"><Users className="h-4 w-4" />批量生成草稿，逐个确认</button>
        </section>
      </div>
    </article>
  );
}
