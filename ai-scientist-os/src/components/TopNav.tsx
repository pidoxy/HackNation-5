"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PRIMARY_FLOW = [
  { href: "/", label: "Hypothesis", match: ["/"] },
  { href: "/analyse", label: "Literature QC", match: ["/analyse", "/literature"] },
  { href: "/plan", label: "Experiment Plan", match: ["/plan"] },
] as Array<{ href: string; label: string; match: string[]; hash?: string }>;

export default function TopNav({ minimal = false }: { minimal?: boolean } = {}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [hash, setHash] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTheme = localStorage.getItem("theme");
    const resolvedTheme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : document.documentElement.dataset.theme === "light"
          ? "light"
          : "dark";
    document.documentElement.dataset.theme = resolvedTheme;
    setTheme(resolvedTheme);

    const syncHash = () => {
      setHash(window.location.hash);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, [pathname]);

  const toggleTheme = () => {
    const next: "dark" | "light" = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setTheme(next);
  };
  const currentStep =
    pathname === "/analyse" || pathname === "/literature"
      ? "Step 2 of 3"
      : pathname === "/plan"
        ? "Step 3 of 3"
        : "Step 1 of 3";

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
            <span className="text-[var(--text-tertiary)] font-mono text-[11px] tracking-widest uppercase">Demo Flow</span>
          </>
        )}
      </div>

      {!minimal && (
        <div className="hidden lg:flex items-center justify-center flex-1 min-w-0">
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
        </div>
      )}

      <div className="flex items-center gap-2 shrink-0">
        {!minimal && (
          <span className="hidden md:block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {currentStep}
          </span>
        )}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="p-1.5 rounded transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
        >
          <span className="material-symbols-outlined text-[18px]">
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>
      </div>
    </header>
  );
}
