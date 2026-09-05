import type React from "react";
import { cn } from "@/lib/utils";

export function ActionButton({
  children,
  onClick,
  active,
  muted
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-full px-4 text-[12px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/35 sm:h-9",
        active
          ? "bg-[#22c55e] text-white shadow-[0_10px_22px_rgba(34,197,94,0.18)] hover:bg-[#16a34a]"
          : muted
            ? "bg-[#dcfce7] text-[#22c55e] hover:bg-[#caead6]"
            : "border border-[#bccbb9] bg-white text-[#3d4a3d] hover:bg-[#f3f4f5]"
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  onClick,
  className,
  disabled,
  children
}: {
  label: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-[#f3f4f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/35 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9",
        className
      )}
    >
      {children}
    </button>
  );
}

export function InfoBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section className="rounded-[20px] bg-[#f8f9fa] p-3">
      <h3 className="text-[13px] font-bold text-[#191c1d]">{title}</h3>
      <div className="mt-1.5 space-y-1">
        {lines.map((line) => (
          <p key={line} className="text-[13px] font-medium leading-5 text-[#3d4a3d]">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
