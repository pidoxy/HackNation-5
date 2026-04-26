"use client";

import Link from "next/link";
import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";

const OBSERVATIONS = [
  {
    type: "warning",
    icon: "warning",
    color: "text-amber-400",
    bg: "bg-amber-400/05",
    border: "border-amber-400/20",
    conf: 87,
    text: "Fluorescence plateau detected at T=420ms. Consider extending acquisition window by 15%.",
  },
  {
    type: "info",
    icon: "info",
    color: "text-[var(--accent-text)]",
    bg: "bg-[var(--accent-strong)]/05",
    border: "border-[var(--accent-strong)]/20",
    conf: 94,
    text: "CH_1 signal consistent with anticipated FITC-Dextran binding kinetics. Protocol step 3 validated.",
  },
  {
    type: "info",
    icon: "check_circle",
    color: "text-emerald-400",
    bg: "bg-emerald-400/05",
    border: "border-emerald-400/20",
    conf: 99,
    text: "Temperature stable at 37.2°C throughout acquisition. No thermal drift detected.",
  },
];

const TERMINAL_LOG = [
  { ts: "14:32:01", level: "INFO",  msg: "Acquisition started. Channel: CH_1. Integration: 10ms." },
  { ts: "14:32:15", level: "WARN",  msg: "Signal approaching saturation threshold at T=380ms." },
  { ts: "14:32:18", level: "INFO",  msg: "Auto-gain adjusted. New gain: 42.8 dB." },
  { ts: "14:32:30", level: "OK",    msg: "Run segment 1 complete. Saving buffer to disk." },
  { ts: "14:32:45", level: "INFO",  msg: "Segment 2 initiated. Cooling cycle active." },
];

const LEVEL_COLOR: Record<string, string> = {
  INFO: "text-[var(--accent-strong)]",
  WARN: "text-amber-400",
  OK:   "text-emerald-400",
  FAIL: "text-red-400",
};

// Simple SVG sparkline for the chart
const chartPoints = [10,18,30,45,62,74,82,89,92,93,93.5,94,93.8,93.2].map((y, i, arr) => {
  const x = (i / (arr.length - 1)) * 100;
  const scaledY = 100 - y;
  return `${x},${scaledY}`;
}).join(" ");

export default function ResultsPage() {
  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto bg-[var(--content-bg)] p-5">

          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)] mb-1">
                Post-experiment
              </p>
              <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                Experiment Readout
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[11px] text-[var(--text-muted)]">ID: RUN_77A_F2</span>
                <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 anim-glow" />
                  LIVE
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] px-3 py-1.5 rounded text-[11px] transition-colors">
                <span className="material-symbols-outlined text-[13px]">download</span>
                Export CSV
              </button>
              <button className="flex items-center gap-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded text-[11px] transition-colors">
                <span className="material-symbols-outlined text-[13px]">stop_circle</span>
                Abort Run
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">

            {/* Left: Chart */}
            <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--accent-text)] text-[14px]">show_chart</span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-primary)]">
                    Fluorescence vs Time (ms)
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 anim-glow" />
                  Live Acquisition
                </span>
              </div>

              <div className="p-4">
                {/* Channel readouts */}
                <div className="flex gap-6 mb-4">
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5">CH_1 MAX</div>
                    <div className="font-mono text-[18px] font-bold text-[var(--accent-text)]">94.2%</div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5">TEMP</div>
                    <div className="font-mono text-[18px] font-bold text-emerald-400">37.2°C</div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5">T ELAPSED</div>
                    <div className="font-mono text-[18px] font-bold text-[var(--text-tertiary)]">520ms</div>
                  </div>
                </div>

                {/* Chart area */}
                <div className="relative bg-[var(--background)] border border-[var(--border)] rounded-lg p-4 h-52">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-4 bottom-4 flex flex-col justify-between pointer-events-none">
                    {["100%","75%","50%","25%","0%"].map(l => (
                      <span key={l} className="font-mono text-[9px] text-[var(--text-faint)] w-8 text-right pr-2">{l}</span>
                    ))}
                  </div>
                  {/* Grid lines */}
                  <div className="absolute left-10 right-4 top-4 bottom-8">
                    {[0,25,50,75,100].map(pct => (
                      <div
                        key={pct}
                        className="absolute left-0 right-0 border-t border-[var(--border)]"
                        style={{ top: `${pct}%` }}
                      />
                    ))}
                    {/* SVG chart line */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <polyline
                        points={chartPoints}
                        fill="none"
                        stroke="#6C63FF"
                        strokeWidth="0.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points={`${chartPoints} 100,100 0,100`}
                        fill="url(#grad)"
                        stroke="none"
                        opacity="0.15"
                      />
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6C63FF" />
                          <stop offset="100%" stopColor="#6C63FF" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  {/* X-axis labels */}
                  <div className="absolute left-10 right-4 bottom-0 flex justify-between">
                    {["0ms","130ms","260ms","390ms","520ms"].map(l => (
                      <span key={l} className="font-mono text-[9px] text-[var(--text-faint)]">{l}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">

              {/* AI Observations */}
              <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
                  <span className="material-symbols-outlined text-[var(--accent-text)] text-[14px]">psychology</span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-primary)]">AI Observations</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {OBSERVATIONS.map((obs, i) => (
                    <div key={i} className={`p-3 ${obs.bg} border-l-2 ${obs.border}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`material-symbols-outlined text-[13px] ${obs.color}`}>{obs.icon}</span>
                        </div>
                        <span className={`font-mono text-[10px] ${obs.color}`}>CONF: {obs.conf}%</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{obs.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment Terminal */}
              <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden flex-1">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-hover)]">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-primary)]">Equipment Terminal</span>
                  <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                </div>
                <div className="p-3 font-mono text-[10px] space-y-1.5">
                  {TERMINAL_LOG.map((entry, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[var(--text-faint)] shrink-0">[{entry.ts}]</span>
                      <span className={`shrink-0 ${LEVEL_COLOR[entry.level] ?? "text-[var(--text-tertiary)]"}`}>[{entry.level}]</span>
                      <span className="text-[var(--text-tertiary)] leading-relaxed">{entry.msg}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Feedback loop explainer (when no active run) */}
          <div className="mt-4 bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-[var(--accent-text)]">rate_review</span>
              Scientist Review Loop
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { step: "01", icon: "add_comment",   title: "Annotate a plan",   desc: "Flag corrections — wrong concentrations, missing steps, incorrect suppliers." },
                { step: "02", icon: "storage",        title: "Feedback is stored", desc: "Corrections saved in structured form, tagged by domain." },
                { step: "03", icon: "auto_fix_high",  title: "Next plan improves", desc: "Prior corrections injected as few-shot examples in future plan generation." },
              ].map((row) => (
                <div key={row.step} className="flex gap-3 border border-[var(--border)] rounded-lg p-3">
                  <div className="font-mono text-[10px] text-[var(--accent-strong)] bg-[var(--accent-strong)]/10 border border-[var(--accent-strong)]/20 rounded px-1.5 py-0.5 h-fit shrink-0">
                    {row.step}
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-0.5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px] text-[var(--accent-text)]">{row.icon}</span>
                      {row.title}
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">{row.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Link
                href="/"
                className="flex items-center gap-1.5 bg-[var(--accent-strong)] hover:bg-[var(--accent-hover)] text-white font-semibold text-[11px] px-4 py-2 rounded transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">science</span>
                New Experiment
              </Link>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
