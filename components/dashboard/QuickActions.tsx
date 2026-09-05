import { Archive, ArrowRight, FileText, MessageCircle, MessagesSquare, SearchCheck, UsersRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { agentDefinitions, type AgentKind } from "@/lib/mock/data";

const agentIcons: Record<AgentKind, typeof MessagesSquare> = {
  feedback: MessagesSquare,
  "wrong-question": SearchCheck,
  "monthly-report": FileText,
  archive: Archive,
  script: MessageCircle,
  class: UsersRound
};

export function QuickActions() {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {agentDefinitions.map((agent) => {
        const Icon = agentIcons[agent.id];
        return (
          <article key={agent.id} className="rounded-[24px] border border-[var(--app-line)] bg-white/72 p-5 shadow-[var(--app-shadow-sm)]">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#22201e] text-white">
                <Icon size={18} />
              </span>
              <span className="rounded-full bg-[#ECFDF3] px-2.5 py-1 text-xs font-medium text-[#166534]">
                {agent.status === "ready" ? "可体验" : "演示"}
              </span>
            </div>
            <h2 className="mt-5 text-lg font-semibold tracking-tight text-[#191919]">{agent.name}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--app-text-muted)]">{agent.description}</p>
            <p className="mt-4 rounded-[18px] bg-[var(--app-panel-soft)] px-4 py-3 text-sm leading-6 text-[#56524b]">
              {agent.primaryTask}
            </p>
            <ButtonLink href="/tasks/demo-feedback-task" variant="secondary" className="mt-5 w-full justify-between" icon={<ArrowRight size={15} />}>
              派给{agent.shortName}
            </ButtonLink>
          </article>
        );
      })}
    </section>
  );
}
