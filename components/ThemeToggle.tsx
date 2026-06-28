"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      onClick={toggle}
      title={label}
      aria-label={label}
      className={className}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
