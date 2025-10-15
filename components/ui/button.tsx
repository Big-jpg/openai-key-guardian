"use client";
import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-2xl transition font-medium border focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2";
  const palette = {
    primary: `bg-[var(--primary)] text-[var(--text-inv)] border-[var(--primary-600)]
              hover:bg-[var(--primary-600)] active:scale-[0.97]`,
    secondary: `bg-[var(--bg-elev)] text-[var(--text)] border-[var(--border)]
              hover:bg-[var(--card)] active:scale-[0.97]`,
    ghost: `bg-transparent text-[var(--text)] border-transparent
              hover:bg-[var(--bg-elev)] active:scale-[0.97]`,
    danger: `bg-[var(--danger)] text-white border-[var(--danger)]
              hover:opacity-90 active:scale-[0.97]`,
  }[variant];

  return (
    <button
      className={`${base} ${sizes} ${palette} gap-2 ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="animate-spin rounded-full border-2 border-t-transparent border-white w-4 h-4" />
      )}
      {children}
    </button>
  );
}
