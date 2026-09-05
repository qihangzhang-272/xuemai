import { SearchCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/button";
import { wrongQuestions } from "@/lib/mock/data";

export default function MistakesPage() {
  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-[#16A34A]">AI 错题</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827]">错题 Agent 工作区</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6B7280]">
            当前先展示错题分析入口和演示记录，后续会支持上传作业或试卷图片。
          </p>
        </div>
        <ButtonLink href="/tasks/demo-feedback-task" icon={<SearchCheck size={16} />}>
          分析错题
        </ButtonLink>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {wrongQuestions.map((question) => (
          <article key={question.id} className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <h2 className="text-lg font-semibold text-[#111827]">{question.point}</h2>
            <p className="mt-3 text-sm leading-6 text-[#6B7280]">{question.reason}</p>
            <p className="mt-4 rounded-[18px] bg-[#ECFDF3] p-4 text-sm leading-6 text-[#166534]">{question.suggestion}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
