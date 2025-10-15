import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ className = "", variant = "primary", size = "md", ...props }: Props) {
  const base = "inline-flex items-center justify-center rounded-2xl transition border focus:outline-none";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2";
  const palette = {
    primary:   "bg-[var(--primary)] text-[var(--text-inv)] border-[var(--primary-600)] hover:opacity-90",
    secondary: "bg-[var(--bg-elev)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--card)]",
    ghost:     "bg-transparent text-[var(--text)] border-transparent hover:bg-[var(--bg-elev)]",
    danger:    "bg-[var(--danger)] text-white border-[var(--danger)] hover:opacity-90",
  }[variant];
  return <button className={`${base} ${sizes} ${palette} ${className}`} {...props} />;
}
