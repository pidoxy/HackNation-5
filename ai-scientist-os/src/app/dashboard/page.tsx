"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";
import type { SavedProject } from "@/lib/types";

const LAST_ACTIVE_PROJECT_KEY = "ai-scientist-os:last-active-project-id";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionCount] = useState(() =>
    typeof window === "undefined" ? 0 : (sessionStorage.getItem("hypothesis") ? 1 : 0),
  );

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadPlan = (p: SavedProject) => {
    sessionStorage.setItem("plan", JSON.stringify(p.plan));
    sessionStorage.setItem("hypothesis", p.hypothesis);
    sessionStorage.setItem("projectId", p.id);
    localStorage.setItem(LAST_ACTIVE_PROJECT_KEY, p.id);
    router.push("/plan");
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto bg-[var(--content-bg)] p-5">

          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)] mb-1">Overview</p>
              <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Dashboard</h1>
              <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">Monitor your experiment pipeline and synthesis history.</p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 bg-[var(--accent-strong)] hover:bg-[var(--accent-hover)] text-white font-semibold text-[11px] uppercase tracking-widest px-3 py-2 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              New Experiment
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Experiments saved", value: String(projects.length), icon: "biotech"     },
              { label: "Plans generated",   value: String(projects.length), icon: "description" },
              { label: "This session",      value: String(sessionCount), icon: "science" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[15px] text-[var(--text-muted)]">{stat.icon}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">{stat.label}</span>
                </div>
                <div className="text-[24px] font-bold text-[var(--text-primary)]">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Saved projects */}
          <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                Saved Experiment Plans
              </span>
              <span className="font-mono text-[10px] text-[var(--text-faint)]">{projects.length} total</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 py-12 text-[var(--text-tertiary)]">
                <span className="material-symbols-outlined text-[18px] anim-spin-slow">sync</span>
                <span className="font-mono text-[12px]">Loading projects...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="material-symbols-outlined text-[32px] text-[var(--text-faint)]">science</span>
                <p className="font-mono text-[12px] text-[var(--text-tertiary)]">No saved experiments yet.</p>
                <Link href="/" className="font-mono text-[11px] text-[var(--accent-strong)] hover:underline">
                  Generate your first plan →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => loadPlan(p)}
                    className="p-4 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded">
                          {p.plan.experimentId}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded">
                          {p.plan.domain}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[var(--text-faint)]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">{p.plan.title}</h3>
                    <p className="text-[11px] text-[var(--text-muted)] leading-snug line-clamp-2">{p.hypothesis}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
