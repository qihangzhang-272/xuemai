import Link from "next/link";
import { ArrowRight, Bell, BookOpenCheck, Brain, CheckCircle2 } from "lucide-react";
import { agentContextItems, students } from "@/lib/mock/data";

export function AgentContextPanel() {
  const focusStudents = students.filter((student) => student.wechatFeedbackStatus !== "feedback_done").slice(0, 2);

  return (
    <aside className="space-y-5">
      <section className="rounded-[30px] border border-[var(--app-line)] bg-white/76 p-5 shadow-[var(--app-shadow-sm)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
          <Bell size={17} />
          今日提醒
        </div>
        <div className="mt-4 space-y-3">
          {["2 个反馈待生成", "1 个错题待分析", "1 个月报待确认"].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-[18px] bg-[#ECFDF3] px-4 py-3 text-sm font-medium text-[#166534]">
              <CheckCircle2 size={15} />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-[var(--app-line)] bg-white/76 p-5 shadow-[var(--app-shadow-sm)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#111827]">重点学生</h2>
          <Link href="/students" className="flex items-center gap-1 text-xs font-medium text-[var(--app-text-muted)] hover:text-[#191919]">
            全部
            <ArrowRight size={13} />
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {focusStudents.map((student) => (
            <Link key={student.id} href={`/students/${student.id}`} className="block rounded-[20px] border border-transparent bg-[var(--app-panel-soft)] p-4 transition hover:border-[var(--app-line-strong)] hover:bg-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{student.name}</p>
                  <p className="mt-1 text-xs text-[var(--app-text-soft)]">
                    {student.grade} · {student.subject}
                  </p>
                </div>
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-[#56524b]">{student.coreIssue}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--app-text-muted)]">{student.nextAction}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-[var(--app-line)] bg-white/76 p-5 shadow-[var(--app-shadow-sm)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
          <BookOpenCheck size={17} />
          待确认事项
        </div>
        <div className="mt-4 space-y-3">
          {["李明轩今天作业是否完成？", "王一路反馈是否保存到档案？", "陈思远月报是否导出？"].map((item) => (
            <div key={item} className="rounded-[18px] bg-[#F7F8FA] px-4 py-3 text-sm leading-6 text-[#6B7280]">{item}</div>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-[var(--app-line)] bg-white/76 p-5 shadow-[var(--app-shadow-sm)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
          <Brain size={17} />
          Agent 记忆
        </div>
        <div className="mt-4 space-y-3">
          {agentContextItems.map((item) => (
            <article key={item.label} className="rounded-[20px] bg-[var(--app-panel-soft)] p-4">
              <p className="text-xs text-[var(--app-text-soft)]">{item.label}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#111827]">{item.value}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--app-text-muted)]">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}
