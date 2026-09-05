import { recentAgentArtifacts } from "@/lib/mock/data";

const statusLabels = {
  ready: "待审核",
  saved: "已入档",
  "needs-review": "需确认"
};

export function RecentActivity() {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#191919]">最近产物</h2>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">AI 生成后必须经过老师审核，再保存到学生档案。</p>
        </div>
      </div>
      <div className="divide-y divide-[var(--app-line)] rounded-[24px] border border-[var(--app-line)] bg-white/72 shadow-[var(--app-shadow-sm)]">
        {recentAgentArtifacts.map((artifact) => (
          <article key={artifact.id} className="px-5 py-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row">
              <div>
                <h3 className="text-sm font-semibold text-[#191919]">{artifact.title}</h3>
                <p className="mt-1 text-xs text-[var(--app-text-soft)]">
                  {artifact.agentName} · {artifact.studentName}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--app-text-soft)]">
                <span className="rounded-full bg-[var(--app-panel-soft)] px-2.5 py-1 text-[#56524b]">{statusLabels[artifact.status]}</span>
                {artifact.time}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--app-text-muted)]">{artifact.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
