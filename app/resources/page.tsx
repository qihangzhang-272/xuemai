import { Archive, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const resources = ["班级默认反馈模板", "家长沟通常用结束语", "一次函数错题讲解素材"];

export default function ResourcesPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-medium text-[#16A34A]">素材库</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827]">教学素材库</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6B7280]">
          当前为演示占位页，后续会沉淀老师常用模板、讲解素材和家长沟通话术。
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {resources.map((item) => (
          <article key={item} className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <Archive className="text-[#16A34A]" size={20} />
            <h2 className="mt-4 text-base font-semibold text-[#111827]">{item}</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">后续可被 Agent 调用，用于生成更贴合老师风格的内容。</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-[#6B7280]">
              <FileText size={14} />
              演示素材
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
