"use client";

import { useState } from "react";
import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";

const PROTOCOLS = [
  {
    id: "PRT-8942-A",
    title: "Kinase Inhibitor Assay Optimization",
    version: "v4.2",
    status: "Validated",
    description:
      "High-throughput screening protocol for determining IC50 values of novel small molecules against a panel of kinase targets.",
    author: "Dr. S. Chen",
    successRate: 94.2,
    successTrend: "up",
    lastRun: "2023-10-24 14:30",
    duration: "4h 15m",
    tags: ["Cell Biology", "HTS", "Liquid Handling"],
  },
  {
    id: "PRT-7102-C",
    title: "CRISPR-Cas9 Lentiviral Transduction",
    version: "v1.0",
    status: "In Revision",
    description:
      "Generation of stable knockout cell lines using puromycin selection. Optimized for HEK293T and HeLa adherent cultures.",
    author: "J. Miller, PhD",
    successRate: 72.8,
    successTrend: "warn",
    lastRun: "2023-10-20 09:15",
    duration: "72h 00m",
    tags: ["Genomics", "Cell Culture"],
  },
  {
    id: "PRT-5521-B",
    title: "Automated RNA Extraction (MagBead)",
    version: "v3.1",
    status: "Validated",
    description:
      "96-well plate format RNA isolation using magnetic bead chemistry on Hamilton STAR liquid handling platform.",
    author: "Automation Team",
    successRate: 98.5,
    successTrend: "up",
    lastRun: "2023-10-25 08:00",
    duration: "1h 20m",
    tags: ["Automation", "Transcriptomics"],
  },
];

const STATUS_STYLE: Record<string, { text: string; dot: string }> = {
  "Validated":   { text: "text-emerald-400", dot: "bg-emerald-400" },
  "In Revision": { text: "text-amber-400",   dot: "bg-amber-400"   },
};

const TAG_COLORS = [
  "border-[var(--accent-strong)]/30 text-[var(--accent-text)] bg-[var(--accent-strong)]/08",
  "border-[var(--border-subtle)] text-[var(--text-tertiary)] bg-transparent",
];

export default function ProtocolsPage() {
  const [search, setSearch] = useState("");

  const filtered = PROTOCOLS.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto bg-[var(--content-bg)] p-5">

          {/* Header + search */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)] mb-1">Lab OS</p>
              <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)] mb-0.5">Protocol Library</h1>
              <p className="text-[12px] text-[var(--text-tertiary)]">
                Manage and version standardized experimental procedures.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-2 bg-[var(--surface-panel)] border border-[var(--border)] rounded px-3 py-2">
                <span className="material-symbols-outlined text-[var(--text-muted)] text-[14px]">search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID, tag, or author…"
                  className="bg-transparent text-[12px] text-[var(--text-primary)] placeholder-[#464555] outline-none font-mono w-48"
                />
              </div>
              <button className="flex items-center gap-1.5 bg-[var(--surface-panel)] border border-[var(--border)] rounded px-3 py-2 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                <span className="material-symbols-outlined text-[14px]">filter_list</span>
                Filters
              </button>
            </div>
          </div>

          {/* Protocol grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((p) => {
              const statusStyle = STATUS_STYLE[p.status] ?? STATUS_STYLE["Validated"];
              return (
                <div
                  key={p.id}
                  className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
                  style={{ borderLeftWidth: "2px", borderLeftColor: p.status === "Validated" ? "#34d399" : "#fbbf24" }}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">{p.id}</span>
                      <span className={`flex items-center gap-1 font-mono text-[10px] ${statusStyle.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {p.status}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] bg-[var(--surface-elevated)] text-[var(--text-tertiary)] px-1.5 py-0.5 rounded">
                      {p.version}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-1.5 leading-snug">{p.title}</h3>
                    <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed mb-4 line-clamp-3">{p.description}</p>

                    {/* Author + success */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Author</div>
                        <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                          <span className="material-symbols-outlined text-[11px] text-[var(--text-muted)]">person</span>
                          {p.author}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Success Rate</div>
                        <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${p.successTrend === "up" ? "text-emerald-400" : "text-amber-400"}`}>
                          <span className="material-symbols-outlined text-[11px]">
                            {p.successTrend === "up" ? "trending_up" : "warning"}
                          </span>
                          {p.successRate}%
                        </div>
                      </div>
                    </div>

                    {/* Last run + duration */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Last Run</div>
                        <div className="font-mono text-[10px] text-[var(--text-tertiary)]">{p.lastRun}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Est. Duration</div>
                        <div className="font-mono text-[10px] text-[var(--text-tertiary)]">{p.duration}</div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {p.tags.map((tag, i) => (
                        <span
                          key={tag}
                          className={`font-mono text-[9px] px-2 py-0.5 rounded border ${TAG_COLORS[i % TAG_COLORS.length]}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
