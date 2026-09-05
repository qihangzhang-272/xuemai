import { CheckCircle2, Clock3, CircleDashed, MessageSquareText, Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { activeAgentTask, type AgentTaskStepStatus } from "@/lib/mock/data";

const stepStyles: Record<AgentTaskStepStatus, string> = {
  done: "border-[#d7e7d0] bg-[#f3f8ef] text-[#3f6b35]",
  active: "border-[#c7d7fb] bg-[#f3f6ff] text-[#315fa8]",
  waiting: "border-[#e4dfd4] bg-[#f8f6f2] text-[#6d665b]",
  queued: "border-[var(--app-line)] bg-white/70 text-[var(--app-text-muted)]"
};

function StepIcon({ status }: { status: AgentTaskStepStatus }) {
  if (status === "done") return <CheckCircle2 size={17} />;
  if (status === "active") return <Clock3 size={17} />;
  return <CircleDashed size={17} />;
}

export function AgentTaskPanel() {
  return (
    <section className="rounded-[30px] border border-[var(--app-line)] bg-white/76 p-6 shadow-[var(--app-shadow-sm)]">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-medium text-[#476fb8]">{activeAgentTask.agentName} 正在执行</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#191919]">{activeAgentTask.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--app-text-muted)]">{activeAgentTask.command}</p>
        </div>
        <span className="w-fit rounded-full bg-[var(--app-panel-soft)] px-3 py-1 text-xs font-medium text-[#56524b]">
          {activeAgentTask.progressLabel}
        </span>
      </div>

      <div className="mt-6 rounded-[24px] bg-[#22201e] p-5 text-white shadow-[0_16px_30px_rgba(0,0,0,0.14)]">
        <p className="text-xs font-medium text-white/50">任务上下文</p>
        <p className="mt-2 text-lg font-semibold tracking-tight">{activeAgentTask.context}</p>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-4">
        {activeAgentTask.steps.map((step) => (
          <article key={step.id} className={`rounded-[20px] border p-4 ${stepStyles[step.status]}`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <StepIcon status={step.status} />
              {step.title}
            </div>
            <p className="mt-3 text-sm leading-6 opacity-80">{step.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border border-[var(--app-line)] bg-[var(--app-panel-soft)] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#191919]">
            <MessageSquareText size={17} />
            等待老师确认
          </div>
          <div className="mt-4 space-y-4">
            {activeAgentTask.confirmations.map((item) => (
              <article key={item.id} className="rounded-[20px] bg-white/74 p-4">
                <p className="text-sm font-medium leading-6 text-[#191919]">{item.question}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.options.map((option) => (
                    <button key={option} type="button" className="rounded-full border border-[var(--app-line-strong)] bg-white px-3 py-2 text-xs text-[#56524b]">
                      {option}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--app-line)] bg-white/72 p-5">
          <p className="text-sm font-semibold text-[#191919]">结果预览</p>
          <p className="mt-4 rounded-[20px] bg-[#22201e] p-5 text-sm leading-7 text-white/76">{activeAgentTask.resultPreview}</p>
          <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs leading-5 text-[var(--app-text-muted)]">{activeAgentTask.archiveTarget}</p>
            <ButtonLink href="/tasks/demo-feedback-task" className="shrink-0" icon={<Search size={15} />}>
              查看过程
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
