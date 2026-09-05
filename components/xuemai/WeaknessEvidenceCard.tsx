import { AlertTriangle } from "lucide-react";
import type { WeaknessEvidence } from "@/lib/mock/xuemai-types";

export function WeaknessEvidenceCard({ evidence }: { evidence?: WeaknessEvidence }) {
  if (!evidence) return null;

  const severityLabel = evidence.severity === "high" ? "高频" : evidence.severity === "medium" ? "持续观察" : "轻度";

  return (
    <section className="rounded-[24px] border border-[var(--app-line)] bg-white p-4 shadow-[var(--app-shadow-sm)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
            <AlertTriangle size={18} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#111827]">薄弱点证据</h2>
            <p className="text-xs text-[var(--app-text-muted)]">{severityLabel}问题，优先处理</p>
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-[#FEF2F2] px-3 py-1.5 text-xs font-bold text-[#DC2626]">
          {evidence.label} · {evidence.count}次
        </div>
      </div>
    </section>
  );
}
