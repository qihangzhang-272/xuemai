import { CalendarDays, MessageSquareText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/button";
import { students } from "@/lib/mock/data";

export default function BatchFeedbackPage() {
  const batchStudents = students.slice(0, 5);

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <main className="space-y-6">
          <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-medium text-[#16A34A]">AI 反馈</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827]">批量反馈</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6B7280]">
              一次性给一个班多个学生生成家长微信反馈。当前为演示页面，点击批量生成会进入任务执行详情。
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {[
                ["选择班级", "初二数学 A 班"],
                ["上课日期", "今天"],
                ["反馈模板", "课后微信短反馈"],
                ["反馈语气", "温和、具体、带鼓励"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-[18px] border border-[#E5E7EB] bg-[#F7F8FA] p-4">
                  <p className="text-xs text-[#6B7280]">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#111827]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            {batchStudents.map((student) => (
              <article key={student.id} className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#111827]">{student.name}</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">{student.currentState}</p>
                  </div>
                  <span className="rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#166534]">{student.coreIssue}</span>
                </div>
                <div className="mt-4 space-y-2 text-sm leading-6 text-[#6B7280]">
                  <p>本节课表现：等待老师补充。</p>
                  <p>作业情况：待老师补充或入档。</p>
                  <p>错题情况：{student.nextAction}</p>
                </div>
                <div className="mt-5 flex gap-2">
                  <ButtonLink href="/tasks/demo-feedback-task" variant="secondary" className="flex-1">
                    单独生成
                  </ButtonLink>
                  <ButtonLink href={`/students/${student.id}`} variant="ghost" className="flex-1">
                    查看档案
                  </ButtonLink>
                </div>
              </article>
            ))}
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <h2 className="text-lg font-semibold text-[#111827]">反馈设置</h2>
            <div className="mt-4 space-y-3">
              {["反馈长度：标准", "反馈语气：温和", "加入学习建议", "加入家长配合建议", "保留老师口吻"].map((item) => (
                <div key={item} className="rounded-[16px] bg-[#F7F8FA] px-4 py-3 text-sm text-[#4B5563]">{item}</div>
              ))}
            </div>
            <ButtonLink href="/tasks/demo-feedback-task" className="mt-5 w-full" icon={<MessageSquareText size={16} />}>
              批量生成
            </ButtonLink>
          </section>

          <section className="rounded-[24px] border border-[#DCFCE7] bg-[#ECFDF3] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#166534]">
              <CalendarDays size={16} />
              生成结果
            </div>
            <p className="mt-3 text-sm leading-6 text-[#166534]/80">点击批量生成后，会进入 Agent 任务执行页查看过程和结果。</p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
