"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";

const EXAMPLES = [
  {
    label: "Diagnostics",
    color: "text-[var(--accent-text)] border-[var(--accent-border)]/30 hover:border-[var(--accent-border)]/60",
    text: "A paper-based electrochemical biosensor functionalized with anti-CRP antibodies will detect C-reactive protein in whole blood at concentrations below 0.5 mg/L within 10 minutes, matching laboratory ELISA sensitivity without requiring sample preprocessing.",
  },
  {
    label: "Gut Health",
    color: "text-[#ffb785] border-[#ffb785]/30 hover:border-[#ffb785]/60",
    text: "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls, measured by FITC-dextran assay, due to upregulation of tight junction proteins claudin-1 and occludin.",
  },
  {
    label: "Cell Biology",
    color: "text-[#c6c4da] border-[var(--accent-border)]/30 hover:border-[var(--accent-border)]/60",
    text: "Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol, due to trehalose's superior membrane stabilization at low temperatures.",
  },
  {
    label: "CO₂",
    color: "text-[var(--text-secondary)] border-[var(--text-secondary)]/30 hover:border-[var(--text-secondary)]/60",
    text: "Introducing Sporomusa ovata into a bioelectrochemical system at a cathode potential of −400mV vs SHE will fix CO₂ into acetate at a rate of at least 150 mmol/L/day, outperforming current biocatalytic carbon capture benchmarks by at least 20%.",
  },
];

export default function InputPage() {
  const router = useRouter();
  const [hypothesis, setHypothesis] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!hypothesis.trim() || loading) return;
    setLoading(true);
    sessionStorage.setItem("hypothesis", hypothesis.trim());
    router.push("/analyse");
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <TopNav minimal />

      <main className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex justify-center items-center">
          <div className="w-[600px] h-[400px] rounded-full bg-[var(--accent-strong)]/[0.06] blur-[120px]" />
        </div>

        <div className="max-w-2xl w-full z-10 flex flex-col items-center text-center">

          <h1 className="text-[44px] font-bold leading-[1.15] tracking-[-0.03em] text-[var(--text-primary)] mb-4 max-w-xl">
            Turn a hypothesis into a runnable experiment plan.
          </h1>
          <p className="text-[15px] leading-[1.7] text-[var(--text-tertiary)] max-w-lg mb-10">
            Define your variables, constraints, and objectives. The engine will synthesize a structured protocol.
          </p>

          <div className="w-full bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden mb-4 transition-all duration-200 focus-within:border-[var(--accent-strong)]/50 focus-within:shadow-[0_0_0_3px_rgba(108,99,255,0.08)]">
            <div className="flex items-center gap-2 px-5 pt-4 pb-2">
              <span className="material-symbols-outlined text-[var(--text-tertiary)] text-[15px]">edit_note</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-tertiary)]">
                Hypothesis Definition
              </span>
            </div>

            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              placeholder="e.g., If we introduce compound X to cell line Y under hypoxic conditions, then the expression of protein Z will increase due to pathway activation..."
              rows={5}
              maxLength={1024}
              className="w-full bg-transparent border-none text-[var(--text-primary)] font-mono text-[13px] leading-[1.7] focus:ring-0 resize-none placeholder:text-[var(--text-placeholder)] outline-none px-5"
            />

            <div className="flex justify-between items-center px-5 py-3 border-t border-[var(--border)]">
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {hypothesis.length} / 1024
              </span>
              <button
                onClick={() => setHypothesis("")}
                title="Clear"
                className="text-[var(--text-muted)] hover:text-[var(--accent-text)] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-2 mb-8">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => setHypothesis(ex.text)}
                className={`px-3 py-1 border font-mono text-[11px] transition-all duration-150 rounded ${ex.color}`}
              >
                {ex.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!hypothesis.trim() || loading}
            className="w-full max-w-lg bg-[var(--accent-strong)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-[15px] py-4 rounded-lg shadow-[0_0_24px_rgba(108,99,255,0.25)] hover:shadow-[0_0_32px_rgba(108,99,255,0.4)] transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] anim-spin-slow">sync</span>
                Initialising...
              </>
            ) : (
              <>
                Analyse Hypothesis
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
