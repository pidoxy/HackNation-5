"use client";

import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";

const INTEGRATIONS = [
  {
    id: "pubmed",
    icon: "menu_book",
    name: "PubMed API",
    status: "online",
    desc: "Literature search & citation extraction pipeline.",
    latency: "42ms",
    errRate: "0.01%",
    warning: null,
  },
  {
    id: "tavily",
    icon: "travel_explore",
    name: "Tavily Search",
    status: "online",
    desc: "Real-time external data gathering for protocol generation.",
    latency: "112ms",
    errRate: "0.00%",
    warning: null,
  },
  {
    id: "anthropic",
    icon: "psychology",
    name: "Anthropic Claude",
    status: "online",
    desc: "LLM inference for protocol synthesis and hypothesis analysis.",
    latency: "820ms",
    errRate: "0.12%",
    warning: null,
  },
  {
    id: "openai",
    icon: "smart_toy",
    name: "OpenAI Models",
    status: "degraded",
    desc: "LLM inference for data analysis and summarization.",
    latency: "1450ms",
    errRate: "4.20%",
    warning: "Rate limits exceeded for model gpt-4-turbo. Falling back to cached results where applicable.",
  },
];

const STATUS_STYLE: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  online:   { dot: "bg-emerald-400", label: "ONLINE",   bg: "bg-emerald-400/10", text: "text-emerald-400" },
  degraded: { dot: "bg-red-400",     label: "DEGRADED", bg: "bg-red-400/10",     text: "text-red-400"     },
  offline:  { dot: "bg-[var(--text-muted)]",   label: "OFFLINE",  bg: "bg-[var(--text-muted)]/10",   text: "text-[var(--text-muted)]"  },
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto bg-[var(--content-bg)] p-5">
          <div className="max-w-4xl mx-auto">

            {/* Header */}
            <div className="pb-4 mb-5 border-b border-[var(--border)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)] mb-1">Lab OS</p>
              <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)] mb-0.5">
                Lab Settings & Integrations
              </h1>
              <p className="text-[12px] text-[var(--text-tertiary)]">
                Manage laboratory access controls, configure external scientific API pipelines, and monitor computational usage limits.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">

              {/* Compute usage card */}
              <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl p-5 h-fit">
                <h2 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">Compute Usage</h2>
                <div className="font-mono text-[10px] text-[var(--text-muted)] mb-4">BILLING-CYCLE-92</div>

                {/* API Requests */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-[var(--text-tertiary)]">API Requests</span>
                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">845,021 / 1M</span>
                  </div>
                  <div className="h-1.5 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent-strong)] rounded-full" style={{ width: "84.5%" }} />
                  </div>
                </div>

                {/* Storage */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-[var(--text-tertiary)]">Storage</span>
                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">1.2 TB / 5 TB</span>
                  </div>
                  <div className="h-1.5 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent-strong)] rounded-full" style={{ width: "24%" }} />
                  </div>
                </div>

                {/* Charges */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Current Charges</div>
                  <div className="flex items-center justify-between">
                    <div className="text-[20px] font-bold text-[var(--text-primary)]">$1,240.50</div>
                    <button className="text-[11px] border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] px-3 py-1.5 rounded transition-colors">
                      View Invoice
                    </button>
                  </div>
                </div>
              </div>

              {/* Active integrations */}
              <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
                  <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">Active Integrations</h2>
                  <button className="flex items-center gap-1 text-[11px] text-[var(--accent-strong)] hover:text-[var(--accent-text)] transition-colors">
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Add Endpoint
                  </button>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {INTEGRATIONS.map((intg) => {
                    const s = STATUS_STYLE[intg.status];
                    return (
                      <div key={intg.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded bg-[var(--surface-elevated)] flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[var(--accent-text)] text-[16px]">{intg.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[13px] font-semibold text-[var(--text-primary)]">{intg.name}</span>
                              <span className={`flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                {s.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-tertiary)] mb-2">{intg.desc}</p>
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                LATENCY: <span className="text-[var(--text-secondary)]">{intg.latency}</span>
                              </span>
                              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                ERR_RATE: <span className={parseFloat(intg.errRate) > 1 ? "text-red-400" : "text-emerald-400"}>{intg.errRate}</span>
                              </span>
                            </div>
                            {intg.warning && (
                              <div className="mt-3 flex items-start gap-2 bg-amber-400/05 border border-amber-400/20 rounded px-3 py-2">
                                <span className="material-symbols-outlined text-amber-400 text-[13px] mt-0.5 shrink-0">warning</span>
                                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{intg.warning}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-tertiary)] transition-colors">
                              <span className="material-symbols-outlined text-[15px]">sync</span>
                            </button>
                            <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-tertiary)] transition-colors">
                              <span className="material-symbols-outlined text-[15px]">more_vert</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
