import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[14px] border border-[var(--app-line-strong)] bg-white/70 px-3 text-sm text-[#191919] outline-none transition placeholder:text-[var(--app-text-soft)] focus:border-[#c8c1b8] focus:ring-4 focus:ring-black/[0.04]",
        className
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-zinc-900">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-zinc-500">{hint}</span> : null}
    </label>
  );
}
