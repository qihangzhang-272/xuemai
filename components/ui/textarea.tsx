import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-[14px] border border-[var(--app-line-strong)] bg-white/70 px-3 py-2.5 text-sm leading-6 text-[#191919] outline-none transition placeholder:text-[var(--app-text-soft)] focus:border-[#c8c1b8] focus:ring-4 focus:ring-black/[0.04]",
        className
      )}
      {...props}
    />
  );
}
