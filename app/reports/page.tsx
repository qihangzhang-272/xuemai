import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { reports } from "@/lib/mock/data";

const statusLabels = {
  ready: "可查看",
  draft: "待整理",
  empty: "占位"
};

export default function ReportsPage() {
  return (
    <AppShell>
      <div className="mb-10">
        <p className="text-sm font-medium text-[var(--app-text-muted)]">月度总结</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[#191919]">月度总结集中管理</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--app-text-muted)]">
          这里仅展示月度总结入口和列表空壳。正式总结后续会基于学生档案、微信反馈、练习记录和错题沉淀生成。
        </p>
      </div>

      <CollapsibleSection title="月度总结列表空壳" summary="本次不实现生成、导出或分享。">
        <div className="mb-5 flex justify-end">
          <span className="w-fit rounded-full bg-[#f1efeb] px-3 py-1 text-xs font-medium text-[var(--app-text-muted)]">
            {reports.length} 份演示总结
          </span>
        </div>

        <div className="divide-y divide-[var(--app-line)]">
          {reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`} className="group flex flex-col gap-4 rounded-[22px] px-3 py-5 transition hover:bg-[var(--app-panel-soft)] md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold text-[#191919]">{report.title}</h3>
                  <span className="rounded-full bg-[#f1efeb] px-2.5 py-1 text-xs text-[var(--app-text-muted)]">{statusLabels[report.status]}</span>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-text-muted)]">{report.summary}</p>
              </div>
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--app-text-muted)] group-hover:text-[#191919]">
                查看详情
                <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </CollapsibleSection>
    </AppShell>
  );
}
