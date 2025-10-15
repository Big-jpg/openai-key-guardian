"use client";
import { useEffect, useState } from "react";
import { Button } from "./button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(
    (typeof window !== "undefined" && (localStorage.getItem("guardian:theme") as any)) || "dark"
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    localStorage.setItem("guardian:theme", theme);
  }, [theme]);
  return (
    <Button variant="secondary" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </Button>
  );
}
