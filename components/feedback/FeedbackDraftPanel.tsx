import { CollapsibleSection } from "@/components/ui/collapsible-section";

export function FeedbackDraftPanel() {
  return (
    <aside className="space-y-5">
      <CollapsibleSection title="可复制草稿占位" eyebrow="微信反馈" summary="当前未调用 AI，仅展示演示输出结构。">
        <div className="space-y-4">
          <CollapsibleSection
            title="微信反馈草稿"
            className="rounded-[26px] border-[#22201e] bg-[#22201e] p-5 text-white shadow-[0_16px_30px_rgba(0,0,0,0.14)] [&_h2]:text-white [&_summary>span]:border-white/15 [&_summary>span]:bg-white/10 [&_summary>span]:text-white/70"
            bodyClassName="mt-3 text-sm leading-7 text-white/75"
          >
            <p>林一诺妈妈您好，本次练习主要反映出分数应用题中的单位 1 判断问题。</p>
            <p className="mt-4">
              从练习表现看，孩子基础计算比较稳定，主要需要继续加强读题时先找比较对象，再进行列式。
            </p>
            <p className="mt-4">课后建议：完成 3 道同类型题，并用一句话写出每题的单位 1。</p>
          </CollapsibleSection>
        </div>

        <button className="mt-5 h-11 w-full rounded-full border border-[var(--app-line-strong)] bg-white/70 text-sm font-medium text-[var(--app-text-muted)] transition hover:bg-white hover:text-[#191919]">
          复制按钮占位
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-[var(--app-text-soft)]">
          保存后，本次记录会作为月度总结素材沉淀。
        </p>
      </CollapsibleSection>
    </aside>
  );
}
