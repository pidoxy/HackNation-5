"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const primaryJourney = [
  {
    href: "/",
    label: "Hypothesis",
    icon: "edit_note",
    exact: true,
    hint: "Define the question",
  },
  {
    href: "/analyse",
    label: "Literature QC",
    icon: "menu_book",
    hint: "Check prior work",
  },
  {
    href: "/plan",
    label: "Experiment Plan",
    icon: "biotech",
    hint: "Review runnable output",
  },
];

interface SectionLink {
  id: string;
  label: string;
  complete: boolean;
}

interface SideNavProps {
  sectionLinks?: SectionLink[];
  progress?: number;
}

export default function SideNav({ sectionLinks, progress }: SideNavProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

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

  const isActive = (href: string, exact?: boolean) => {
    if (href.includes("#")) {
      const [base, anchor] = href.split("#");
      return pathname === base && hash === `#${anchor}`;
    }
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden md:flex flex-col py-4 bg-[var(--background)] border-r border-[var(--border)] w-56 shrink-0 h-full overflow-y-auto">
      {/* Brand block */}
      <div className="px-4 mb-6 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded bg-[var(--surface-elevated)] flex items-center justify-center border border-[var(--text-muted)] shrink-0">
          <span className="material-symbols-outlined text-[var(--accent-text)] text-[15px]">science</span>
        </div>
        <div>
          <h2 className="text-[var(--text-primary)] font-bold text-[12px] tracking-tight">Demo Journey</h2>
          <p className="text-[var(--text-tertiary)] font-mono text-[9px] normal-case tracking-normal">3-step flow</p>
        </div>
      </div>

      {/* New Experiment button */}
      <div className="px-3 mb-4">
        <Link
          href="/"
          className="flex items-center justify-center gap-1.5 w-full bg-[var(--accent-strong)] hover:bg-[var(--accent-hover)] text-white font-semibold text-[11px] uppercase tracking-widest px-3 py-2 rounded transition-colors"
        >
          <span className="material-symbols-outlined text-[14px] normal-case tracking-normal">add</span>
          New Run
        </Link>
      </div>

      {/* Primary journey */}
      <nav className="flex-1 flex flex-col gap-0 px-2">
        <div className="mb-4">
          <p className="px-3 mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-faint)]">
            Demo Flow
          </p>
          {primaryJourney.map((item, index) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-start gap-2.5 px-3 py-2 text-[11px] transition-colors duration-150 rounded ${
                  active
                    ? "bg-indigo-500/10 text-indigo-400 border-r-2 border-indigo-500 rounded-r-none"
                    : "text-[var(--text-tertiary)] hover:bg-[var(--surface-panel)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div className="flex flex-col items-center shrink-0 pt-0.5">
                  <span className="material-symbols-outlined text-[15px] normal-case tracking-normal">{item.icon}</span>
                  {index < primaryJourney.length - 1 && (
                    <span className="mt-1 h-4 w-px bg-[var(--border-subtle)] group-hover:bg-[var(--text-muted)]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="uppercase tracking-widest font-semibold">{item.label}</div>
                  <div className="mt-0.5 text-[10px] normal-case tracking-normal text-[var(--text-muted)] leading-snug">
                    {item.hint}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Section progress (plan viewer only) */}
      {sectionLinks && (
        <div className="px-3 mb-4 border-t border-[var(--border)] pt-3">
          <div className="text-[var(--text-tertiary)] font-mono text-[9px] uppercase tracking-widest mb-1.5">
            Section Progress
          </div>
          <div className="w-full bg-[var(--surface-subtle)] rounded-full h-1 mb-1">
            <div
              className="bg-[var(--accent-text)] h-1 rounded-full transition-all duration-500"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <div className="text-[var(--text-muted)] font-mono text-[9px] text-right mb-3">
            {sectionLinks.filter((s) => s.complete).length} of {sectionLinks.length} complete
          </div>
          <div className="flex flex-col gap-1.5">
            {sectionLinks.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 font-mono text-[10px] normal-case tracking-normal text-[var(--text-tertiary)] hover:text-[var(--accent-text)] transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.complete ? "bg-[var(--accent-text)]" : "bg-[var(--border-subtle)]"}`} />
                {s.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
