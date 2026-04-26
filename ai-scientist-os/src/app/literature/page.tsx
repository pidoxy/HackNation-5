"use client";

import { useState } from "react";
import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";

interface LitRef {
  tag: "SIMILARITY" | "CONFLICT" | "CONTEXT";
  doi: string;
  title: string;
  authors: string;
}

const DEMO_REFS: LitRef[] = [
  {
    tag: "SIMILARITY",
    doi: "10.1038/s41586-023",
    title: "Autonomous chemical research with large language models",
    authors: "Boiko, D. A., MacKnight, R., & Gomes, G.",
  },
  {
    tag: "CONFLICT",
    doi: "10.1126/science.adi2",
    title: "Hardware bottlenecks in zero-shot automated protocol execution",
    authors: "Chen, X., et al.",
  },
  {
    tag: "CONTEXT",
    doi: "10.1021/acs.jcim",
    title: "ChemCrow: Augmenting large-language models with chemistry tools",
    authors: "Bran, A. M., et al.",
  },
  {
    tag: "SIMILARITY",
    doi: "arxiv:2304.05332",
    title: "Emergent autonomous scientific research capabilities of LLMs",
    authors: "Park, J. S., et al.",
  },
];

const TAG_STYLE: Record<string, { label: string; text: string; bg: string; border: string }> = {
  SIMILARITY: { label: "SIMILARITY", text: "text-[var(--accent-text)]", bg: "bg-[var(--accent-strong)]/10", border: "border-[var(--accent-strong)]/30" },
  CONFLICT:   { label: "CONFLICT",   text: "text-red-400",   bg: "bg-red-500/10",   border: "border-red-500/30"   },
  CONTEXT:    { label: "CONTEXT",    text: "text-[var(--text-tertiary)]", bg: "bg-[var(--surface-elevated)]",    border: "border-[var(--border-subtle)]"    },
};

export default function LiteraturePage() {
  const [hypothesis] = useState<string | null>(() =>
    typeof window === "undefined" ? null : sessionStorage.getItem("hypothesis"),
  );

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-hidden bg-[var(--content-bg)]">
          <div className="flex h-full">

            {/* Left: Cited Corpus */}
            <div className="w-72 shrink-0 border-r border-[var(--border)] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">Cited Corpus</h2>
                <span className="font-mono text-[10px] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] px-2 py-0.5 rounded">
                  {DEMO_REFS.length} SOURCES
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {DEMO_REFS.map((ref, i) => {
                  const s = TAG_STYLE[ref.tag];
                  return (
                    <div
                      key={i}
                      className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${s.bg} ${s.border} ${s.text}`}>
                          {s.label}
                        </span>
                        <span className="font-mono text-[9px] text-[var(--text-faint)]">{ref.doi}</span>
                      </div>
                      <h3 className="text-[11px] font-semibold text-[var(--text-primary)] leading-snug mb-1">{ref.title}</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">{ref.authors}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Hypothesis synthesis */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl">
                {/* Run ID + title */}
                <div className="mb-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)] mb-2">
                    Hypothesis Synthesis // RUN_042
                  </p>
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-[20px] font-bold tracking-[-0.02em] text-[var(--text-primary)] leading-tight">
                      {hypothesis ?? "LLM-Driven Robotic Automation in Wet Labs"}
                    </h1>
                    <button className="flex items-center gap-1.5 bg-[var(--accent-strong)] hover:bg-[var(--accent-hover)] text-white font-semibold text-[11px] px-3 py-1.5 rounded transition-colors shrink-0">
                      <span className="material-symbols-outlined text-[13px]">refresh</span>
                      Regenerate
                    </button>
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-[var(--border)] mb-5" />

                {/* Narrative */}
                <p className="text-[13px] text-[var(--text-tertiary)] leading-relaxed mb-5">
                  The current hypothesis posits that generative Large Language Models (LLMs) can autonomously design, optimize, and execute novel biological experiments by interfacing directly with robotic lab equipment via standardized API abstractions. This represents a shift from static protocol automation to dynamic, feedback-driven synthesis.
                </p>

                {/* Supporting Evidence */}
                <div className="border border-[var(--accent-strong)]/25 bg-[var(--accent-strong)]/05 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[var(--accent-strong)] text-[15px]">verified</span>
                    <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Supporting Evidence</h3>
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
                    Our approach heavily aligns with the framework proposed by Boiko et al.{" "}
                    <span className="font-mono text-[10px] text-[var(--accent-text)] bg-[var(--accent-strong)]/15 px-1.5 py-0.5 rounded">[10.1038/s41586-023]</span>
                    , which demonstrated an LLM agent capable of searching literature, designing chemical synthesis pathways, and controlling cloud lab hardware. Similarly, the tool-use augmentation strategies in ChemCrow{" "}
                    <span className="font-mono text-[10px] text-[var(--accent-text)] bg-[var(--accent-strong)]/15 px-1.5 py-0.5 rounded">[10.1021/acs.jcim]</span>
                    {" "}validate our architecture for enabling LLMs to query external computational chemistry tools before execution.
                  </p>
                </div>

                {/* Conflict */}
                <div className="border border-amber-500/25 bg-amber-500/05 rounded-lg p-4 mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-amber-400 text-[15px]">warning</span>
                    <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Critical Hardware Disconnect</h3>
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed mb-3">
                    A significant conflict arises when reconciling our zero-shot execution goals with the limitations identified by Chen et al.{" "}
                    <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">[10.1126/science.adi2]</span>
                    . Their findings suggest that generalized LLM instructions frequently fail during physical execution due to unmodeled hardware kinematics and fluid dynamics. They note:
                  </p>
                  <blockquote className="border-l-2 border-[var(--border-subtle)] pl-3 ml-2">
                    <p className="text-[11px] italic text-[var(--text-muted)] leading-relaxed">
                      &ldquo;While semantic logic of generated protocols is &gt;95% sound, physical execution success drops below 40% when robotic handlers encounter unpredicted liquid viscosity variations not encoded in standard ML libraries.&rdquo;
                    </p>
                  </blockquote>
                </div>

                {/* Resolution */}
                <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
                  To resolve this conflict, our architecture must incorporate a robust middleware layer that translates generalized LLM intent into highly specific, hardware-aware kinematic constraints before transmitting instructions to the liquid handlers. We will implement a closed-loop validation step utilizing the{" "}
                  <span className="font-mono text-[10px] text-[var(--accent-text)] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">Opentrons API</span>
                  {" "}simulator as a pre-flight check.
                </p>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
