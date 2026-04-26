"use client";

import { useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => {
        const currentTheme =
          document.documentElement.dataset.theme === "light" ? "light" : "dark";
        const updatedTheme: Theme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = updatedTheme;
        localStorage.setItem("theme", updatedTheme);
        setTheme(updatedTheme);
      }}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--text-secondary)] transition hover:border-[var(--accent-strong)] hover:text-[var(--text-primary)]"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs">
        {theme === "dark" ? "☾" : "◐"}
      </span>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
