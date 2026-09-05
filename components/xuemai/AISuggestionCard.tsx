import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AISuggestion } from "@/lib/mock/xuemai-types";

export function AISuggestionCard({
  suggestion,
  onPrimaryAction,
  onSecondaryAction
}: {
  suggestion?: AISuggestion;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  if (!suggestion) return null;

  return (
    <section className="rounded-[24px] bg-[#16A34A] p-4 text-white shadow-[0_14px_30px_rgba(22,163,74,0.18)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/18">
            <Bot size={19} />
          </span>
          <div>
            <p className="text-xs font-semibold text-white/70">AI 建议</p>
            <h2 className="mt-1 max-w-2xl text-base font-bold leading-6">{suggestion.text}</h2>
          </div>
        </div>
        <div className="flex shrink-0 gap-2 md:flex-col">
          <Button type="button" variant="secondary" className="h-9 bg-white px-3 text-[#15803D] hover:bg-white/90" onClick={onPrimaryAction}>
            {suggestion.primaryActionLabel}
          </Button>
          <Button type="button" className="h-9 bg-white/16 px-3 text-white shadow-none hover:bg-white/24" onClick={onSecondaryAction}>
            {suggestion.secondaryActionLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
