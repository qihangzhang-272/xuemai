import Link from "next/link";
import { ArrowRight, Clock3, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/button";
import { taskListItems } from "@/lib/mock/data";

const statusClass = {
  执行中: "bg-[#ECFDF3] text-[#166534]",
  待审核: "bg-[#FEF3C7] text-[#92400E]",
  已完成: "bg-[#F3F4F6] text-[#4B5563]"
};

export default function TasksPage() {
  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-[#16A34A]">任务记录</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827]">Agent 任务记录</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6B7280]">
            这里记录老师派给学脉 AI 的任务。当前为演示数据，后续会接入真实任务历史。
          </p>
        </div>
        <ButtonLink href="/tasks/demo-feedback-task" icon={<Plus size={16} />}>
          新建 Agent 任务
        </ButtonLink>
      </div>

      <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="space-y-3">
          {taskListItems.map((task) => (
            <Link key={task.id} href={task.href} className="group flex flex-col gap-4 rounded-[22px] border border-[#E5E7EB] bg-[#F7F8FA] p-5 transition hover:border-[#16A34A] hover:bg-white md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-base font-semibold text-[#111827]">{task.title}</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[task.status]}`}>{task.status}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                  {task.agentType} · {task.description}
                </p>
              </div>
              <span className="flex items-center gap-2 text-sm font-medium text-[#6B7280] group-hover:text-[#16A34A]">
                <Clock3 size={16} />
                查看过程
                <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
