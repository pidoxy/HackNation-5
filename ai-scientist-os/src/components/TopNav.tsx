"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PRIMARY_FLOW = [
  { href: "/", label: "Hypothesis", match: ["/"] },
  { href: "/analyse", label: "Analysis", match: ["/analyse", "/literature"] },
  { href: "/plan", label: "Plan", match: ["/plan"] },
  { href: "/plan#review-feedback", label: "Review", match: ["/plan"], hash: "review-feedback" },
] as Array<{ href: string; label: string; match: string[]; hash?: string }>;

const SECONDARY_ROUTES = new Set([
  "/dashboard",
  "/inventory",
  "/protocols",
  "/settings",
  "/logs",
  "/results",
]);

export default function TopNav({ minimal = false }: { minimal?: boolean } = {}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof document === "undefined") {
      return "dark";
    }

    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  });
  const [hash, setHash] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const toggleTheme = () => {
    const next: "dark" | "light" = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  const showPrimaryFlow = !minimal && !SECONDARY_ROUTES.has(pathname);

  return (
    <header
      className="backdrop-blur-md border-b flex justify-between items-center px-4 h-12 w-full z-50 shrink-0 gap-4"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--background) 90%, transparent)",
      }}
    >
      <div className="flex items-center gap-2 shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--accent-text)] text-[18px]">science</span>
          <span className="text-[15px] font-bold tracking-tighter text-[var(--text-primary)]">The AI Scientist</span>
        </Link>
        {!minimal && (
          <>
            <span className="text-[var(--text-muted)] mx-2 font-mono text-[11px]">|</span>
            <span className="text-[var(--text-tertiary)] font-mono text-[11px] tracking-widest uppercase">Fulcrum Science</span>
          </>
        )}
      </div>

      {!minimal && (
        <div className="hidden lg:flex items-center justify-center flex-1 min-w-0">
          {showPrimaryFlow ? (
            <nav
              aria-label="Primary workflow"
              className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-panel)]/80 px-2 py-1"
            >
              {PRIMARY_FLOW.map((item, index) => {
                const active =
                  item.hash != null
                    ? pathname === "/plan" && hash === `#${item.hash}`
                    : item.match.includes(pathname) && (item.hash == null || hash !== `#${item.hash}`);

                return (
                  <div key={item.label} className="flex items-center gap-1">
                    <Link
                      href={item.href}
                      className={`px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                        active
                          ? "bg-[var(--accent-strong)] text-white"
                          : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                    {index < PRIMARY_FLOW.length - 1 && (
                      <span className="font-mono text-[10px] text-[var(--text-faint)] px-1">/</span>
                    )}
                  </div>
                );
              })}
            </nav>
          ) : (
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Workspace Tools
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="p-1.5 rounded transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
        >
          <span className="material-symbols-outlined text-[18px]">
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
        <button className="p-1.5 rounded transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]">
          <span className="material-symbols-outlined text-[18px]">notifications</span>
        </button>
        <button className="p-1.5 rounded transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]">
          <span className="material-symbols-outlined text-[18px]">settings</span>
        </button>
        <div
          className="w-7 h-7 rounded-full border flex items-center justify-center ml-2"
          style={{ background: "var(--surface-elevated)", borderColor: "var(--text-muted)" }}
        >
          <span className="material-symbols-outlined text-[14px] text-[var(--accent-text)]">person</span>
        </div>
      </div>
    </header>
  );
}
