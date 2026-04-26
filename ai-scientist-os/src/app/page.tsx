"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import type { ParseHypothesisResponse } from "@/lib/types";

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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParseHypothesisResponse | null>(null);

  const trimmedHypothesis = hypothesis.trim();
  const isParsedStale = useMemo(
    () => Boolean(parsedPreview && parsedPreview.hypothesis !== trimmedHypothesis),
    [parsedPreview, trimmedHypothesis],
  );

  const persistParsedPreview = (value: ParseHypothesisResponse | null) => {
    if (typeof window === "undefined") {
      return;
    }

    if (value) {
      sessionStorage.setItem("parsed", JSON.stringify(value));
    } else {
      sessionStorage.removeItem("parsed");
    }
  };

  const requestParsedPreview = async (showPanel = true) => {
    if (!trimmedHypothesis) {
      return null;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const response = await fetch("/api/parse-hypothesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hypothesis: trimmedHypothesis }),
      });
      const data = (await response.json()) as ParseHypothesisResponse & { error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Unable to parse hypothesis.");
      }

      setParsedPreview(data);
      persistParsedPreview(data);
      if (showPanel) {
        setPreviewVisible(true);
      }
      return data;
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Unable to parse hypothesis.");
      if (showPanel) {
        setPreviewVisible(true);
      }
      return null;
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!trimmedHypothesis || loading) return;
    setLoading(true);
    sessionStorage.setItem("hypothesis", trimmedHypothesis);

    let parsed = parsedPreview;
    if (!parsed || isParsedStale) {
      parsed = await requestParsedPreview(false);
    } else {
      persistParsedPreview(parsed);
    }

    if (!parsed) {
      sessionStorage.removeItem("parsed");
    }

    router.push("/analyse");
  };

  const updateParsedField = (index: number, key: "label" | "value", value: string) => {
    setParsedPreview((current) => {
      if (!current) {
        return current;
      }

      const next = {
        ...current,
        hypothesis: trimmedHypothesis,
        parsedFields: current.parsedFields.map((field, fieldIndex) =>
          fieldIndex === index ? { ...field, [key]: value } : field,
        ),
      };
      persistParsedPreview(next);
      return next;
    });
  };

  const addParsedField = () => {
    setParsedPreview((current) => {
      if (!current) {
        return current;
      }

      const next = {
        ...current,
        hypothesis: trimmedHypothesis,
        parsedFields: [...current.parsedFields, { label: "Additional field", value: "" }],
      };
      persistParsedPreview(next);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <TopNav minimal />

      <main className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex justify-center items-center">
          <div className="w-[600px] h-[400px] rounded-full bg-[var(--accent-strong)]/[0.06] blur-[120px]" />
        </div>

        <div className="max-w-2xl w-full z-10 flex flex-col items-center text-center">
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
            {["1. Hypothesis", "2. Literature QC", "3. Experiment Plan"].map((step) => (
              <span
                key={step}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-panel)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]"
              >
                {step}
              </span>
            ))}
          </div>

          <h1 className="text-[44px] font-bold leading-[1.15] tracking-[-0.03em] text-[var(--text-primary)] mb-4 max-w-xl">
            From scientific question to demo-ready experiment plan.
          </h1>
          <p className="text-[15px] leading-[1.7] text-[var(--text-tertiary)] max-w-lg mb-10">
            Enter a hypothesis, check whether similar work already exists, then generate a structured protocol a scientist can review.
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
              onChange={(e) => {
                setHypothesis(e.target.value);
                setPreviewError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  void handleSubmit();
                }
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
                onClick={() => {
                  setHypothesis(ex.text);
                  setPreviewError(null);
                }}
                className={`px-3 py-1 border font-mono text-[11px] transition-all duration-150 rounded ${ex.color}`}
              >
                {ex.label}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => void requestParsedPreview(true)}
              disabled={!trimmedHypothesis || previewLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-panel)] px-4 py-2 font-mono text-[11px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              <span className={`material-symbols-outlined text-[15px] ${previewLoading ? "anim-spin-slow" : ""}`}>
                {previewLoading ? "sync" : "tooltip"}
              </span>
              Review extracted fields
            </button>
            {parsedPreview && !isParsedStale ? (
              <>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-400">
                  Route {parsedPreview.experimentFamily.replace(/_/g, " ")}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-panel)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  {parsedPreview.routingConfidence}% confidence
                </span>
              </>
            ) : null}
            {isParsedStale ? (
              <span className="rounded-full border border-[#ffb785]/20 bg-[#ffb785]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffb785]">
                Hypothesis changed, refresh parse
              </span>
            ) : null}
          </div>

          {previewVisible ? (
            <div className="mb-8 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] p-5 text-left">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent-text)] mb-1">
                    Confirm extracted fields
                  </div>
                  <p className="text-[13px] leading-[1.6] text-[var(--text-tertiary)] max-w-2xl">
                    This is optional. Refine these fields if the parser missed the intervention, system, endpoint, threshold, or control. Your edits will improve routing, retrieval, and plan specificity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewVisible(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {previewError ? (
                <div className="mt-4 rounded-lg border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 px-4 py-3 text-[12px] text-[#ffb4ab]">
                  {previewError}
                </div>
              ) : null}

              {parsedPreview ? (
                <>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-4 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Domain</div>
                      <div className="mt-1 text-[13px] text-[var(--text-primary)]">{parsedPreview.domain}</div>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-4 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Experiment family</div>
                      <div className="mt-1 text-[13px] text-[var(--text-primary)]">{parsedPreview.experimentFamily.replace(/_/g, " ")}</div>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-4 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Route confidence</div>
                      <div className="mt-1 text-[13px] text-[var(--text-primary)]">{parsedPreview.routingConfidence}%</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-4 py-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Route reason</div>
                    <div className="mt-1 text-[12px] leading-[1.6] text-[var(--text-secondary)]">{parsedPreview.routingReason}</div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {parsedPreview.parsedFields.map((field, index) => (
                      <div key={`${field.label}-${index}`} className="grid gap-3 md:grid-cols-[180px_1fr]">
                        <input
                          value={field.label}
                          onChange={(e) => updateParsedField(index, "label", e.target.value)}
                          className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 font-mono text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-border)]/40"
                        />
                        <input
                          value={field.value}
                          onChange={(e) => updateParsedField(index, "value", e.target.value)}
                          className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-border)]/40"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={addParsedField}
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 font-mono text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Add field
                    </button>
                    <span className="text-[12px] text-[var(--text-tertiary)]">
                      Leave this collapsed if you’re happy with the automatic parse.
                    </span>
                  </div>
                </>
              ) : previewLoading ? (
                <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-4 py-6 text-center font-mono text-[12px] text-[var(--text-tertiary)]">
                  Extracting hypothesis structure...
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            onClick={() => void handleSubmit()}
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
                Run QC and Generate Plan
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
