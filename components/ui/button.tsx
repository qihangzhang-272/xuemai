import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-[#16A34A] text-white shadow-[0_10px_22px_rgba(22,163,74,0.18)] hover:bg-[#15803D]",
  secondary: "border border-[var(--app-line-strong)] bg-white/70 text-[#191919] shadow-[var(--app-shadow-sm)] hover:bg-white",
  ghost: "text-[#56524b] hover:bg-[#f0eee9]"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  icon?: ReactNode;
};

export function Button({ className, variant = "primary", icon, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: keyof typeof variants;
  icon?: ReactNode;
};

export function ButtonLink({ className, variant = "primary", icon, children, href, ...props }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition",
        variants[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </Link>
  );
}
