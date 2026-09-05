import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  title: string;
  eyebrow?: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
};

export function CollapsibleSection({
  title,
  eyebrow,
  summary,
  children,
  defaultOpen = true,
  className,
  bodyClassName
}: CollapsibleSectionProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-[26px] border border-white/75 bg-[rgba(255,255,252,0.78)] p-4 shadow-[var(--app-shadow-md)] backdrop-blur-3xl",
        className
      )}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 marker:hidden">
        <div>
          {eyebrow ? <p className="text-xs font-medium text-[var(--app-text-muted)]">{eyebrow}</p> : null}
          <h2 className={cn("font-semibold tracking-tight text-[#191919]", eyebrow ? "mt-1.5 text-lg" : "text-base")}>{title}</h2>
          {summary ? <p className="mt-1.5 text-[13px] leading-5 text-[var(--app-text-muted)]">{summary}</p> : null}
        </div>
        <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[var(--app-line-strong)] bg-white/70 px-2.5 text-xs font-medium text-[var(--app-text-muted)] transition hover:bg-white">
          <span className="group-open:hidden">展开</span>
          <span className="hidden group-open:inline">收起</span>
          <ChevronDown size={15} className="transition group-open:rotate-180" />
        </span>
      </summary>
      <div className={cn("mt-4", bodyClassName)}>{children}</div>
    </details>
  );
}
