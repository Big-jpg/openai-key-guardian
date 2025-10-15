import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md";
};

export function Button({ className = "", variant = "default", size = "md", ...props }: Props) {
  const base = "inline-flex items-center justify-center rounded-2xl border shadow-sm transition";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2";
  const palette = {
    default: "bg-black text-white border-black hover:opacity-90",
    secondary: "bg-white text-black border-gray-300 hover:bg-gray-50",
    ghost: "bg-transparent text-black border-transparent hover:bg-gray-50",
    destructive: "bg-red-600 text-white border-red-600 hover:opacity-90",
  }[variant];
  return <button className={`${base} ${sizes} ${palette} ${className}`} {...props} />;
}
