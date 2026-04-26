"use client";

import { useState } from "react";
import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";

type LogLevel = "INFO" | "WARN" | "FAIL" | "DBUG" | "OK";

interface LogEntry {
  ts: string;
  level: LogLevel;
  source: string;
  message: string;
}

const LOG_DATA: Record<string, LogEntry[]> = {
  "Synthesis Engine": [
    { ts: "2023-10-27 14:32:01.442", level: "INFO", source: "Synth_Core",  message: "Initialization sequence complete. Thermal parameters nominal at 37.2°C." },
    { ts: "2023-10-27 14:32:15.891", level: "WARN", source: "HW_Ctrl_04",  message: "Micro-fluidic pump pressure dropping below optimal threshold (P=1.2atm). Compensating..." },
    { ts: "2023-10-27 14:32:18.005", level: "INFO", source: "AI_Agent_2",  message: "Analyzing structural variance in sample batch X-99. Confidence interval: 94%." },
    { ts: "2023-10-27 14:32:22.114", level: "FAIL", source: "Spectro_V1",  message: "Calibration matrix mismatch detected. Halting diagnostic laser array to prevent optical damage. Code: ERR_OPT_0x4A" },
    { ts: "2023-10-27 14:32:22.115", level: "DBUG", source: "Sys_Monitor", message: "Dump: { addr: 0x7fff5fbff688, sz: 1024, flags: 0x01 }" },
    { ts: "2023-10-27 14:32:25.330", level: "INFO", source: "AI_Agent_2",  message: "Rerouting processing node to fallback cluster B." },
    { ts: "2023-10-27 14:32:30.000", level: "OK",   source: "Sys_Core",    message: "Heartbeat acknowledged. System state stable." },
  ],
  "Hardware Controller": [
    { ts: "2023-10-27 14:30:00.000", level: "INFO", source: "HW_Init",    message: "Hardware controller boot sequence initiated. Firmware v3.2.1." },
    { ts: "2023-10-27 14:30:05.200", level: "OK",   source: "Pump_01",    message: "Peristaltic pump P01 online. Flow rate calibrated: 0.5 mL/min." },
    { ts: "2023-10-27 14:30:12.441", level: "WARN", source: "Temp_02",    message: "Incubator Temp_02 reporting ±0.8°C variance. Within acceptable range." },
    { ts: "2023-10-27 14:31:03.009", level: "INFO", source: "Robo_Arm_A", message: "Pipetting arm calibration complete. 96-well plate loaded." },
  ],
  "AI Agent": [
    { ts: "2023-10-27 14:29:00.000", level: "INFO", source: "Claude_API",  message: "Session token initialized. Model: claude-sonnet-4-6. Context: 128k tokens." },
    { ts: "2023-10-27 14:29:12.550", level: "INFO", source: "Plan_Gen",    message: "Plan generation request received. Hypothesis: Kinase inhibitor dose-response." },
    { ts: "2023-10-27 14:29:45.882", level: "OK",   source: "Plan_Gen",    message: "Protocol generation complete. 7 steps synthesized. Budget: $3,450." },
    { ts: "2023-10-27 14:30:01.114", level: "INFO", source: "Tavily_QC",   message: "Literature QC initiated. Querying PubMed, arXiv, protocols.io." },
    { ts: "2023-10-27 14:30:08.003", level: "OK",   source: "Tavily_QC",   message: "Novelty check complete. Signal: similar_exists. 3 references surfaced." },
  ],
};

const LEVEL_STYLE: Record<LogLevel, { text: string; bg: string; row?: string }> = {
  INFO: { text: "text-[var(--accent-strong)]",    bg: "bg-transparent" },
  WARN: { text: "text-amber-400",    bg: "bg-transparent" },
  FAIL: { text: "text-red-400",      bg: "bg-red-500/08",  row: "border-l-2 border-red-500/50" },
  DBUG: { text: "text-[var(--text-muted)]",    bg: "bg-transparent" },
  OK:   { text: "text-emerald-400",  bg: "bg-transparent" },
};

const TABS = ["Synthesis Engine", "Hardware Controller", "AI Agent"] as const;
type Tab = typeof TABS[number];

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Synthesis Engine");
  const [cmd, setCmd] = useState("");
  const [paused, setPaused] = useState(false);

  const logs = LOG_DATA[activeTab] ?? [];

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-hidden bg-[var(--content-bg)] p-5 flex flex-col">

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)] mb-1">Lab OS</p>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--accent-text)] text-[16px]">monitor_heart</span>
                <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">System Diagnostics</h1>
              </div>
              <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                Real-time telemetry and event logging from active modules.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button className="flex items-center gap-1.5 border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] px-3 py-1.5 rounded text-[11px] transition-colors">
                <span className="material-symbols-outlined text-[13px]">download</span>
                Export Logs
              </button>
              <button className="flex items-center gap-1.5 bg-[var(--accent-strong)] hover:bg-[var(--accent-hover)] text-white px-3 py-1.5 rounded text-[11px] font-semibold transition-colors">
                <span className="material-symbols-outlined text-[13px]">rocket_launch</span>
                Deploy API
              </button>
            </div>
          </div>

          {/* Tab bar + controls */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-0 bg-[var(--surface-panel)] border border-[var(--border)] rounded-lg p-0.5">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-colors ${
                    activeTab === tab
                      ? "bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"
                  }`}
                >
                  {activeTab === tab && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 flex items-center justify-center border border-[var(--border)] rounded text-[var(--text-muted)] hover:text-[var(--text-tertiary)] transition-colors">
                <span className="material-symbols-outlined text-[14px]">filter_list</span>
              </button>
              <button
                onClick={() => setPaused((p) => !p)}
                className={`w-7 h-7 flex items-center justify-center border rounded transition-colors ${
                  paused ? "border-amber-400/40 text-amber-400" : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{paused ? "play_arrow" : "pause"}</span>
              </button>
            </div>
          </div>

          {/* Terminal panel */}
          <div className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl flex flex-col overflow-hidden font-mono">
            {/* Terminal title bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-panel)]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--surface-elevated)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--surface-elevated)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--surface-elevated)]" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <span className="material-symbols-outlined text-[12px]">terminal</span>
                tty_lab_core_01
              </div>
              <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 anim-glow" />
                LIVE
              </span>
            </div>

            {/* Log entries */}
            <div className="flex-1 overflow-y-auto">
              {logs.map((entry, i) => {
                const s = LEVEL_STYLE[entry.level];
                return (
                  <div
                    key={i}
                    className={`grid grid-cols-[200px_64px_120px_1fr] gap-3 px-4 py-2.5 text-[11px] border-b border-[var(--content-bg)] hover:bg-[var(--surface-panel)] transition-colors ${s.row ?? ""}`}
                  >
                    <span className="text-[var(--text-faint)]">[{entry.ts}]</span>
                    <span className={`font-bold ${s.text}`}>[{entry.level.padEnd(4)}]</span>
                    <span className="text-[var(--text-muted)]">[{entry.source}]</span>
                    <span className={entry.level === "FAIL" ? "text-red-300" : entry.level === "WARN" ? "text-amber-300" : entry.level === "DBUG" ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]"}>
                      {entry.message}
                    </span>
                  </div>
                );
              })}
              {/* Cursor */}
              <div className="px-4 py-2">
                <span className="text-[var(--text-secondary)] text-[11px]">▐</span>
              </div>
            </div>

            {/* Command input */}
            <div className="border-t border-[var(--border)] px-4 py-2.5 flex items-center gap-2 bg-[var(--surface-panel)]">
              <span className="text-[11px] text-[var(--accent-strong)] shrink-0">admin@lab_os:~$</span>
              <input
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setCmd(""); }}
                placeholder="Enter diagnostic command…"
                className="flex-1 bg-transparent text-[11px] text-[var(--text-secondary)] placeholder-[#35343e] outline-none"
              />
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
