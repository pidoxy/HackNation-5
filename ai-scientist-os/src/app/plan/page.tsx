"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import SideNav from "@/components/SideNav";
import TopNav from "@/components/TopNav";
import type { ExperimentPlan, RegenerableSection } from "@/lib/types";

const LAST_ACTIVE_PROJECT_KEY = "ai-scientist-os:last-active-project-id";

const NOVELTY_CONFIG = {
  "not found":          { label: "QC: NOVEL",   color: "text-emerald-400", border: "border-emerald-400/40", bg: "bg-emerald-400/10" },
  "similar work exists":{ label: "QC: SIMILAR", color: "text-[#ffb785]",   border: "border-[#ffb785]/40",   bg: "bg-[#ffb785]/10"  },
  "exact match found":  { label: "QC: MATCH",   color: "text-[#ffb4ab]",   border: "border-[#ffb4ab]/40",   bg: "bg-[#ffb4ab]/10"  },
};

const REF_BADGE: Record<string, { text: string; bg: string; border: string }> = {
  similarity: { text: "text-[var(--accent-text)]", bg: "bg-[var(--accent-strong)]/10", border: "border-[var(--accent-strong)]/30" },
  protocol:   { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  supplier:   { text: "text-[#ffb785]",  bg: "bg-[#ffb785]/10",  border: "border-[#ffb785]/30"  },
  conflict:   { text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30"    },
};

const SECTIONS: { id: RegenerableSection; label: string; icon: string }[] = [
  { id: "protocol",   label: "Protocol Steps",       icon: "format_list_numbered" },
  { id: "materials",  label: "Materials & Reagents",  icon: "science"              },
  { id: "budget",     label: "Budget Estimate",       icon: "payments"             },
  { id: "timeline",   label: "Timeline",              icon: "timeline"             },
  { id: "validation", label: "Validation Criteria",   icon: "verified"             },
];

interface FeedbackState {
  section: RegenerableSection;
  issue: string;
  impact: string;
  submitting: boolean;
  submitted: boolean;
}

export default function PlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<ExperimentPlan | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const stored = sessionStorage.getItem("plan");

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as ExperimentPlan;
    } catch {
      return null;
    }
  });
  const [hypothesis, setHypothesis] = useState<string>(() =>
    typeof window === "undefined" ? "" : (sessionStorage.getItem("hypothesis") ?? ""),
  );
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "idle">("idle");
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const restore = async () => {
      if (plan) {
        setSaveStatus("saved");
        setLoading(false);
      } else {
        try {
          const preferredProjectId = localStorage.getItem(LAST_ACTIVE_PROJECT_KEY);
          const res = await fetch("/api/projects");
          const data = await res.json();
          const items = data.items ?? [];
          const latest =
            items.find((item: { id: string }) => item.id === preferredProjectId) ?? items[0];
          if (!latest) { router.push("/"); return; }
          sessionStorage.setItem("plan", JSON.stringify(latest.plan));
          sessionStorage.setItem("hypothesis", latest.hypothesis);
          sessionStorage.setItem("projectId", latest.id);
          localStorage.setItem(LAST_ACTIVE_PROJECT_KEY, latest.id);
          setPlan(latest.plan as ExperimentPlan);
          setHypothesis(latest.hypothesis);
          setSaveStatus("saved");
        } catch {
          router.push("/");
          return;
        } finally {
          setLoading(false);
        }
      }

      fetch("/api/review-memory")
        .then((r) => r.json())
        .then((d) => setFeedbackCount((d.items ?? []).length))
        .catch(() => {});
    };

    restore();
  }, [plan, router]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [plan]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const openFeedback = (section: RegenerableSection) => {
    setFeedback({ section, issue: "", impact: "", submitting: false, submitted: false });
  };

  const submitFeedback = async () => {
    if (!feedback || !plan) return;
    if (!feedback.issue.trim()) return;
    setFeedback((f) => f ? { ...f, submitting: true } : f);

    try {
      await fetch("/api/review-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: plan.domain,
          section: feedback.section,
          issue: feedback.issue.trim(),
          impact: feedback.impact.trim() || "General improvement",
          createdAt: new Date().toISOString(),
        }),
      });
      setFeedback((f) => f ? { ...f, submitting: false, submitted: true } : f);
      setFeedbackCount((c) => c + 1);
      showToast(`Correction saved for "${feedback.section}" — will apply to next ${plan.domain} plan`);
      setTimeout(() => setFeedback(null), 2000);
    } catch {
      setFeedback((f) => f ? { ...f, submitting: false } : f);
      showToast("Failed to save — please try again");
    }
  };

  const sectionLinks = SECTIONS.map((s) => ({ id: s.id, label: s.label, complete: true }));

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <span className="material-symbols-outlined text-[var(--accent-text)] text-[32px] anim-spin-slow">sync</span>
      </div>
    );
  }

  if (!plan) return null;

  const noveltyKey = plan.noveltySignal as keyof typeof NOVELTY_CONFIG;
  const novelty = NOVELTY_CONFIG[noveltyKey] ?? NOVELTY_CONFIG["not found"];

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav sectionLinks={sectionLinks} progress={100} />

        <main ref={mainRef} className="flex-1 overflow-y-auto bg-[var(--content-bg)] p-5">

          {/* Toast */}
          {toast && (
            <div className="fixed top-4 right-4 z-50 bg-[var(--surface-panel)] border border-emerald-400/30 text-emerald-400 font-mono text-[11px] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              {toast}
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-[11px] text-[var(--text-muted)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded">{plan.experimentId}</span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${novelty.bg} ${novelty.border} ${novelty.color}`}>{novelty.label}</span>
                <span className="font-mono text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded">{plan.domain}</span>
                {feedbackCount > 0 && (
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">psychology</span>
                    {feedbackCount} correction{feedbackCount > 1 ? "s" : ""} in memory
                  </span>
                )}
              </div>
              <h1 className="text-[20px] font-bold tracking-[-0.02em] text-[var(--text-primary)] leading-snug mb-1">{plan.title}</h1>
              <p className="text-[12px] text-[var(--text-tertiary)] max-w-2xl leading-relaxed line-clamp-2">{hypothesis}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saveStatus === "saved" && (
                <span className="font-mono text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">cloud_done</span>
                  Saved
                </span>
              )}
              <button onClick={() => router.push("/")}
                className="flex items-center gap-1.5 border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] px-3 py-1.5 rounded text-[11px] transition-colors">
                <span className="material-symbols-outlined text-[13px]">add</span>
                New
              </button>
            </div>
          </div>

          {/* Parsed fields */}
          {plan.parsedFields.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {plan.parsedFields.map((f) => (
                <div key={f.label} className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-lg p-3">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">{f.label}</div>
                  <div className="text-[12px] text-[var(--text-secondary)] leading-snug">{f.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Signals */}
          {plan.signals?.length > 0 && (
            <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
              {plan.signals.map((s) => (
                <div key={s.label} className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-lg p-3 shrink-0 min-w-[140px]">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">{s.label}</div>
                  <div className="text-[15px] font-bold text-[var(--text-primary)]">{s.value}</div>
                  {s.hint && <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{s.hint}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="max-w-4xl space-y-6">

            {/* Protocol */}
            <section id="protocol">
              <SectionHeader id="protocol" label="Protocol Steps" icon="format_list_numbered" onFeedback={openFeedback} />
              <div className="space-y-3">
                {plan.protocol.map((step, i) => (
                  <div key={i} className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-muted)] border-b border-[var(--border)]">
                      <span className="font-mono text-[11px] text-[var(--accent-strong)] bg-[var(--accent-strong)]/10 border border-[var(--accent-strong)]/20 px-2 py-0.5 rounded">
                        STEP {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[13px] font-semibold text-[var(--text-primary)]">{step.title}</span>
                      {step.time && (
                        <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          {step.time}
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <FeedbackForm section="protocol" state={feedback} onChange={setFeedback} onSubmit={submitFeedback} />
            </section>

            {/* Materials */}
            <section id="materials">
              <SectionHeader id="materials" label="Materials & Reagents" icon="science" onFeedback={openFeedback} />
              <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[var(--border)]">
                  {["REAGENT", "SUPPLIER", "CAT #", "QTY", "EST. COST"].map((h) => (
                    <span key={h} className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{h}</span>
                  ))}
                </div>
                {plan.materials.map((m, i) => (
                  <div key={i} className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[var(--border)] last:border-0 items-center">
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">{m.name}</span>
                    <span className="text-[12px] text-[var(--text-secondary)]">{m.supplier}</span>
                    <span className="font-mono text-[11px] text-[var(--accent-strong)]">{m.catalogNumber}</span>
                    <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{m.quantity}</span>
                    <span className="font-mono text-[11px] text-[var(--accent-text)]">{m.estimatedCost}</span>
                  </div>
                ))}
              </div>
              <FeedbackForm section="materials" state={feedback} onChange={setFeedback} onSubmit={submitFeedback} />
            </section>

            {/* Budget */}
            <section id="budget">
              <SectionHeader id="budget" label="Budget Estimate" icon="payments" onFeedback={openFeedback} />
              <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden">
                {plan.budget.map((b, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] last:border-0">
                    <div>
                      <div className="text-[13px] text-[var(--text-primary)]">{b.item}</div>
                      {b.note && <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{b.note}</div>}
                    </div>
                    <span className="font-mono text-[13px] font-semibold text-[var(--accent-text)]">{b.amount}</span>
                  </div>
                ))}
              </div>
              <FeedbackForm section="budget" state={feedback} onChange={setFeedback} onSubmit={submitFeedback} />
            </section>

            {/* Timeline */}
            <section id="timeline">
              <SectionHeader id="timeline" label="Timeline" icon="timeline" onFeedback={openFeedback} />
              <div className="space-y-2">
                {plan.timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-4 bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl px-5 py-3">
                    <div className="flex flex-col items-center shrink-0 pt-0.5">
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-strong)]/10 border border-[var(--accent-strong)]/30 flex items-center justify-center">
                        <span className="font-mono text-[10px] text-[var(--accent-strong)]">{i + 1}</span>
                      </div>
                      {i < plan.timeline.length - 1 && <div className="w-px h-6 bg-[var(--surface-elevated)] mt-1" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-0.5">{t.phase}</div>
                      <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{t.action}</div>
                    </div>
                  </div>
                ))}
              </div>
              <FeedbackForm section="timeline" state={feedback} onChange={setFeedback} onSubmit={submitFeedback} />
            </section>

            {/* Validation */}
            <section id="validation">
              <SectionHeader id="validation" label="Validation Criteria" icon="verified" onFeedback={openFeedback} />
              <div className="space-y-2">
                {plan.validation.map((v, i) => (
                  <div key={i} className="flex items-start gap-3 bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-emerald-400 text-[15px] shrink-0 mt-0.5">check_circle</span>
                    <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{v}</p>
                  </div>
                ))}
              </div>
              <FeedbackForm section="validation" state={feedback} onChange={setFeedback} onSubmit={submitFeedback} />
            </section>

            {/* References */}
            {plan.references.length > 0 && (
              <section>
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--accent-text)] text-[16px]">menu_book</span>
                  Literature References
                </h2>
                <div className="space-y-2">
                  {plan.references.map((ref, i) => {
                    const badge = REF_BADGE[ref.type] ?? REF_BADGE.similarity;
                    return (
                      <div key={i} className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${badge.bg} ${badge.border} ${badge.text}`}>
                            {ref.type.toUpperCase()}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-muted)]">{ref.source}</span>
                        </div>
                        <div className="text-[13px] font-medium text-[var(--text-primary)] mb-1">{ref.title}</div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">{ref.note}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Review Feedback (from AI self-review) */}
            {plan.reviewFeedback?.length > 0 && (
              <section>
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--accent-text)] text-[16px]">rate_review</span>
                  Review Notes
                </h2>
                <div className="space-y-2">
                  {plan.reviewFeedback.map((fb, i) => (
                    <div key={i} className="bg-[var(--surface-panel)] border border-amber-500/20 rounded-xl px-4 py-3">
                      <div className="font-mono text-[10px] text-amber-400 uppercase tracking-widest mb-1">{fb.section}</div>
                      <div className="text-[12px] text-[var(--text-secondary)] mb-1">{fb.issue}</div>
                      <div className="text-[11px] text-[var(--text-tertiary)]">{fb.impact}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Scientist Review CTA */}
            <div id="review-feedback" className="border border-[var(--accent-strong)]/25 bg-[var(--accent-strong)]/05 rounded-xl p-5 flex items-start gap-4">
              <span className="material-symbols-outlined text-[var(--accent-text)] text-[22px] shrink-0 mt-0.5">psychology</span>
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">Review this plan and improve the next run</h3>
                <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed mb-3">
                  Use the <span className="text-[var(--accent-text)]">&ldquo;Suggest correction&rdquo;</span> buttons above to flag any issue in any section. Your corrections are stored and automatically applied to future plans of the same domain.
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    {feedbackCount} correction{feedbackCount !== 1 ? "s" : ""} saved for <span className="text-[var(--accent-text)]">{plan.domain}</span> experiments
                  </span>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

function SectionHeader({
  id, label, icon, onFeedback,
}: {
  id: RegenerableSection;
  label: string;
  icon: string;
  onFeedback: (s: RegenerableSection) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--accent-text)] text-[16px]">{icon}</span>
        {label}
      </h2>
      <button
        onClick={() => onFeedback(id)}
        className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--accent-text)] border border-[var(--border)] hover:border-[var(--accent-strong)]/40 px-2.5 py-1.5 rounded transition-colors"
      >
        <span className="material-symbols-outlined text-[12px]">rate_review</span>
        Suggest correction
      </button>
    </div>
  );
}

function FeedbackForm({
  section, state, onChange, onSubmit,
}: {
  section: RegenerableSection;
  state: FeedbackState | null;
  onChange: (s: FeedbackState | null) => void;
  onSubmit: () => void;
}) {
  if (!state || state.section !== section) return null;

  if (state.submitted) {
    return (
      <div className="mt-3 flex items-center gap-2 text-emerald-400 font-mono text-[11px] p-3 bg-emerald-400/05 border border-emerald-400/20 rounded-xl animate-fade-in">
        <span className="material-symbols-outlined text-[15px]">check_circle</span>
        Correction saved — will apply to next similar plan
      </div>
    );
  }

  return (
    <div className="mt-3 bg-[var(--surface-panel)] border border-[var(--accent-strong)]/30 rounded-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--accent-text)] text-[14px]">rate_review</span>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--accent-text)]">Scientist Correction — {section}</span>
        </div>
        <button onClick={() => onChange(null)} className="text-[var(--text-muted)] hover:text-[var(--text-tertiary)] transition-colors">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
            What&apos;s wrong with this section? *
          </label>
          <textarea
            value={state.issue}
            onChange={(e) => onChange({ ...state, issue: e.target.value })}
            placeholder={`e.g. "Step 3 uses incorrect incubation temperature — should be 37°C not 4°C"`}
            rows={2}
            className="w-full bg-[var(--content-bg)] border border-[var(--border)] focus:border-[var(--accent-strong)]/50 text-[var(--text-primary)] font-mono text-[11px] rounded-lg px-3 py-2 outline-none resize-none placeholder:text-[var(--text-placeholder)] leading-relaxed transition-colors"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
            Why does it matter?
          </label>
          <textarea
            value={state.impact}
            onChange={(e) => onChange({ ...state, impact: e.target.value })}
            placeholder={`e.g. "Wrong temp will denature the enzyme and invalidate the assay"`}
            rows={2}
            className="w-full bg-[var(--content-bg)] border border-[var(--border)] focus:border-[var(--accent-strong)]/50 text-[var(--text-primary)] font-mono text-[11px] rounded-lg px-3 py-2 outline-none resize-none placeholder:text-[var(--text-placeholder)] leading-relaxed transition-colors"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => onChange(null)}
            className="font-mono text-[11px] px-3 py-1.5 border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded transition-colors">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!state.issue.trim() || state.submitting}
            className="font-mono text-[11px] px-4 py-1.5 bg-[var(--accent-strong)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-1.5"
          >
            {state.submitting ? (
              <><span className="material-symbols-outlined text-[13px] anim-spin-slow">sync</span>Saving...</>
            ) : (
              <><span className="material-symbols-outlined text-[13px]">save</span>Save correction</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
