"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--app-line-strong)] bg-white/70 px-4 text-sm font-medium text-[var(--app-text-muted)] shadow-[var(--app-shadow-sm)] transition hover:bg-white hover:text-[#191919]"
    >
      <ArrowLeft size={16} />
      返回
    </button>
  );
}
