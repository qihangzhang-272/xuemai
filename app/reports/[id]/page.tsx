import { AppShell } from "@/components/layout/AppShell";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { getReportById } from "@/lib/mock/data";

export default async function ReportDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = getReportById(id);

  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-medium text-[var(--app-text-muted)]">月度总结详情</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[#191919]">{report.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--app-text-muted)]">
          单个月度总结详情占位。当前不生成正式总结、不导出文件、不分享链接。
        </p>
      </div>

      <article className="space-y-5">
        <CollapsibleSection title="月度总结摘要" eyebrow={`${report.month} · ${report.studentName}`} summary={report.summary}>
          <div className="mb-5 flex justify-end">
          <span className="w-fit rounded-full bg-[#f1efeb] px-3 py-1 text-xs font-medium text-[var(--app-text-muted)]">详情占位</span>
          </div>

          <section className="grid gap-3 md:grid-cols-3">
          {report.highlights.map((highlight) => (
            <div key={highlight} className="rounded-[18px] bg-[var(--app-panel-soft)] p-4 text-sm leading-6 text-[#56524b]">
              {highlight}
            </div>
          ))}
          </section>
        </CollapsibleSection>

        <CollapsibleSection title="月度总结正文">
          <section className="space-y-4">
          {report.sections.map((section) => (
            <div key={section.title} className="rounded-[22px] border border-[var(--app-line)] bg-white/45 p-5">
              <h3 className="text-base font-semibold text-[#191919]">{section.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">{section.content}</p>
            </div>
          ))}
          </section>
        </CollapsibleSection>
      </article>
    </AppShell>
  );
}
