"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SideNav from "@/components/SideNav";
import TopNav from "@/components/TopNav";
import type { ExperimentPlan, RegenerableSection } from "@/lib/types";

const LAST_ACTIVE_PROJECT_KEY = "ai-scientist-os:last-active-project-id";
const REVIEW_APPROVAL_KEY_PREFIX = "ai-scientist-os:review-approved:";

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
  correction: string;
  importance: "low" | "medium" | "high";
  submitting: boolean;
  submitted: boolean;
}

function deriveTaskLabel(plan: ExperimentPlan, hypothesis: string): string {
  const text = `${hypothesis} ${plan.parsedFields.map((field) => `${field.label} ${field.value}`).join(" ")}`.toLowerCase();
  if (text.includes("segment")) return "segmentation";
  if (text.includes("denois")) return "denoising";
  if (text.includes("classif")) return "classification";
  if (text.includes("pretrain")) return "pretraining";
  if (text.includes("mask")) return "masking";
  if (text.includes("retrospective")) return "retrospective analysis";
  if (text.includes("synthesis")) return "synthesis";
  if (text.includes("sensor")) return "sensor validation";
  return (plan.experimentFamily ?? plan.domain).replace(/_/g, " ");
}

function deriveSystemContext(plan: ExperimentPlan): string {
  return plan.parsedFields.find((field) => field.label.toLowerCase() === "model system")?.value ?? plan.domain;
}

function deriveFeedbackTags(plan: ExperimentPlan, hypothesis: string, section: RegenerableSection): string[] {
  const task = deriveTaskLabel(plan, hypothesis);
  const system = deriveSystemContext(plan);
  return [...new Set(
    [
      plan.domain,
      plan.experimentFamily?.replace(/_/g, " "),
      task,
      system,
      section,
    ].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase()),
  )];
}

function summarizeMemoryHeadline(plan: ExperimentPlan | null): string | null {
  const first = plan?.memoryImpact?.items[0];
  if (!first) {
    return null;
  }

  const detail = first.correction ?? first.issue;
  return `Applied prior ${first.section.toLowerCase()} feedback: ${detail.slice(0, 64)}${detail.length > 64 ? "..." : ""}`;
}

function buildReagentSearchUrl(material: ExperimentPlan["materials"][number]): string {
  const supplier = material.supplier.toLowerCase();
  const query = `${material.supplier} ${material.catalogNumber} ${material.name}`;
  if (supplier.includes("sigma")) {
    return `https://www.sigmaaldrich.com/US/en/search/${encodeURIComponent(material.catalogNumber || material.name)}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function extractTimelineRange(label: string, fallbackIndex: number): { start: number; end: number } {
  const weekMatches = [...label.matchAll(/week\s*(\d+)/gi)].map((match) => Number.parseInt(match[1], 10));
  if (weekMatches.length >= 2) {
    return { start: Math.min(...weekMatches), end: Math.max(...weekMatches) };
  }
  if (weekMatches.length === 1) {
    return { start: weekMatches[0], end: weekMatches[0] };
  }

  const genericNumberMatches = [...label.matchAll(/\b(\d+)\b/g)].map((match) => Number.parseInt(match[1], 10));
  if (genericNumberMatches.length >= 2) {
    return { start: Math.min(...genericNumberMatches), end: Math.max(...genericNumberMatches) };
  }
  if (genericNumberMatches.length === 1) {
    return { start: genericNumberMatches[0], end: genericNumberMatches[0] };
  }

  return { start: fallbackIndex, end: fallbackIndex };
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
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [reviewApproved, setReviewApproved] = useState(false);
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
          setReviewApproved(
            sessionStorage.getItem(`${REVIEW_APPROVAL_KEY_PREFIX}${latest.plan.experimentId}`) === "true",
          );
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

  useEffect(() => {
    if (!plan) {
      return;
    }

    const key = `${REVIEW_APPROVAL_KEY_PREFIX}${plan.experimentId}`;
    setReviewApproved(sessionStorage.getItem(key) === "true");
  }, [plan]);

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
    setFeedback({
      section,
      issue: "",
      impact: "",
      correction: "",
      importance: "high",
      submitting: false,
      submitted: false,
    });
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
          experimentFamily: plan.experimentFamily,
          taskLabel: deriveTaskLabel(plan, hypothesis),
          systemContext: deriveSystemContext(plan),
          section: feedback.section,
          issue: feedback.issue.trim(),
          impact: feedback.impact.trim() || "General improvement",
          correction: feedback.correction.trim() || undefined,
          importance: feedback.importance,
          tags: deriveFeedbackTags(plan, hypothesis, feedback.section),
          createdAt: new Date().toISOString(),
        }),
      });
      setFeedback((f) => f ? { ...f, submitting: false, submitted: true } : f);
      setFeedbackCount((c) => c + 1);
      showToast(`Correction saved for "${feedback.section}" — tagged for the next similar ${plan.domain} run`);
      setTimeout(() => setFeedback(null), 2000);
    } catch {
      setFeedback((f) => f ? { ...f, submitting: false } : f);
      showToast("Failed to save — please try again");
    }
  };

  const sectionLinks = SECTIONS.map((s) => ({ id: s.id, label: s.label, complete: true }));
  const memoryHeadline = summarizeMemoryHeadline(plan);
  const ganttRows = useMemo(() => {
    if (!plan) {
      return [];
    }

    return plan.timeline.map((item, index) => {
      const { start, end } = extractTimelineRange(`${item.phase} ${item.action}`, index);
      return { item, index, start, end };
    });
  }, [plan]);
  const availableWeeks = useMemo(() => {
    if (ganttRows.length === 0) {
      return [0, 1, 2];
    }

    const maxWeek = Math.max(...ganttRows.map((row) => row.end));
    return Array.from({ length: maxWeek + 1 }, (_, index) => index);
  }, [ganttRows]);
  const selectedWeekDetails = useMemo(() => {
    const week = selectedWeek ?? availableWeeks[0] ?? 0;
    return ganttRows.filter((row) => row.start <= week && row.end >= week);
  }, [availableWeeks, ganttRows, selectedWeek]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <span className="material-symbols-outlined text-[var(--accent-text)] text-[32px] anim-spin-slow">sync</span>
      </div>
    );
  }

  if (!plan) return null;

  const exportMarkdown = async () => {
    try {
      const storedParsed = sessionStorage.getItem("parsed");
      const parsedPayload = storedParsed
        ? JSON.parse(storedParsed)
        : {
            hypothesis,
            domain: plan.domain,
            experimentFamily: plan.experimentFamily ?? "general_research",
            routingConfidence: plan.routingConfidence ?? 0,
            routingReason: plan.routingReason ?? "No routing rationale available.",
            routeSupported: plan.routeSupported ?? false,
            readiness: plan.status ?? "ready",
            parsedFields: plan.parsedFields,
          };
      const response = await fetch("/api/export-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hypothesis,
          parsed: parsedPayload,
          plan,
          format: "markdown",
        }),
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${plan.experimentId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Markdown export failed");
    }
  };

  const exportPdf = () => {
    window.print();
  };

  const approveReview = () => {
    const key = `${REVIEW_APPROVAL_KEY_PREFIX}${plan.experimentId}`;
    sessionStorage.setItem(key, "true");
    setReviewApproved(true);
    showToast("Review approved — final lab handoff marked as ready");
  };

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
                <span className="font-mono text-[10px] text-[var(--accent-text)] bg-[var(--accent-text)]/10 border border-[var(--accent-border)]/20 px-2 py-0.5 rounded">
                  Step 3 of 3
                </span>
                <span className="font-mono text-[11px] text-[var(--text-muted)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded">{plan.experimentId}</span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${novelty.bg} ${novelty.border} ${novelty.color}`}>{novelty.label}</span>
                <span className="font-mono text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded">{plan.domain}</span>
                {plan.runnabilityStatus ? (
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                      plan.runnabilityStatus === "runnable"
                        ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                        : plan.runnabilityStatus === "scientist_review_required"
                          ? "text-[#ffb785] bg-[#ffb785]/10 border-[#ffb785]/20"
                          : "text-[#ffb4ab] bg-[#ffb4ab]/10 border-[#ffb4ab]/20"
                    }`}
                  >
                    {plan.runnabilityStatus === "runnable"
                      ? "Runnable"
                      : plan.runnabilityStatus === "scientist_review_required"
                        ? "Scientist review required"
                        : "Draft"}
                  </span>
                ) : null}
                {plan.experimentFamily ? (
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded">
                    Route {plan.experimentFamily}
                  </span>
                ) : null}
                {feedbackCount > 0 && (
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">psychology</span>
                    {memoryHeadline ?? `${feedbackCount} structured correction${feedbackCount > 1 ? "s" : ""} in memory`}
                  </span>
                )}
              </div>
              <h1 className="text-[20px] font-bold tracking-[-0.02em] text-[var(--text-primary)] leading-snug mb-1">
                Runnable experiment plan
              </h1>
              <p className="text-[12px] text-[var(--text-tertiary)] max-w-2xl leading-relaxed line-clamp-2">{hypothesis}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saveStatus === "saved" && (
                <span className="font-mono text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">cloud_done</span>
                  Saved
                </span>
              )}
              <button
                onClick={() => void exportMarkdown()}
                className="flex items-center gap-1.5 border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] px-3 py-1.5 rounded text-[11px] transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">description</span>
                Export MD
              </button>
              <button
                onClick={exportPdf}
                className="flex items-center gap-1.5 border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] px-3 py-1.5 rounded text-[11px] transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">picture_as_pdf</span>
                Export PDF
              </button>
              <button onClick={() => router.push("/")}
                className="flex items-center gap-1.5 border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] px-3 py-1.5 rounded text-[11px] transition-colors">
                <span className="material-symbols-outlined text-[13px]">add</span>
                New Run
              </button>
              <Link
                href="/literature"
                className="flex items-center gap-1.5 border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] px-3 py-1.5 rounded text-[11px] transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">library_books</span>
                Evidence
              </Link>
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

          {plan.literatureQc && (
            <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    Literature QC Decision
                  </div>
                  <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {plan.noveltySignal}
                  </h2>
                </div>
                <div className="rounded border border-[var(--accent-border)]/30 bg-[var(--accent-text)]/10 px-3 py-2 font-mono text-[11px] text-[var(--accent-text)]">
                  Top match {plan.literatureQc.topMatchScore}%
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                {plan.literatureQc.rationale}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {plan.literatureQc.decisionFactors.map((factor) => (
                  <span
                    key={factor}
                    className="rounded border border-[var(--border)] bg-[var(--content-bg)] px-2 py-1 font-mono text-[10px] text-[var(--text-tertiary)]"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {plan.historicalComparison && (
            <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    Past study benchmark
                  </div>
                  <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {plan.historicalComparison.verdict}
                  </h2>
                </div>
                <div className="rounded border border-[var(--accent-border)]/30 bg-[var(--accent-text)]/10 px-3 py-2 font-mono text-[11px] text-[var(--accent-text)]">
                  {plan.historicalComparison.items.length} study{plan.historicalComparison.items.length === 1 ? "" : "ies"}
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                {plan.historicalComparison.rationale}
              </p>
              {plan.historicalComparison.items.length > 0 ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-3">
                  {plan.historicalComparison.items.map((item) => (
                    <div key={`${item.doi}-${item.title}`} className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">{item.source}</span>
                        <span
                          className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${
                            item.outcomeSignal === "aligned"
                              ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                              : item.outcomeSignal === "mixed"
                                ? "text-[#ffb785] border-[#ffb785]/20 bg-[#ffb785]/10"
                                : "text-[#ffb4ab] border-[#ffb4ab]/20 bg-[#ffb4ab]/10"
                          }`}
                        >
                          {item.outcomeSignal}
                        </span>
                      </div>
                      <div className="mt-2 text-[12px] font-medium text-[var(--text-primary)]">
                        {item.title}
                      </div>
                      <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                        Similarity {item.similarityScore}%
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                        {item.takeaway}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {plan.memoryImpact && plan.memoryImpact.appliedCount > 0 && (
            <div className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">
                    Scientist feedback memory
                  </div>
                  <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {plan.memoryImpact.summary}
                  </h2>
                </div>
                <div className="rounded border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 font-mono text-[11px] text-emerald-400">
                  {plan.memoryImpact.appliedCount} applied
                </div>
              </div>
              {plan.memoryImpact.items.length > 0 ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-3">
                  {plan.memoryImpact.items.map((item, index) => (
                    <div key={`${item.section}-${index}`} className="rounded-lg border border-emerald-400/10 bg-[var(--surface-panel)] p-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">
                        {item.section}
                      </div>
                      <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                        {item.issue}
                      </div>
                      {item.correction ? (
                        <div className="mt-2 rounded border border-emerald-400/10 bg-emerald-400/5 px-2.5 py-2">
                          <div className="font-mono text-[9px] uppercase tracking-widest text-emerald-400 mb-1">
                            Next run adjustment
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                            {item.correction}
                          </div>
                        </div>
                      ) : null}
                      {item.tags?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.tags.slice(0, 4).map((tag) => (
                            <span
                              key={`${item.section}-${tag}`}
                              className="rounded border border-emerald-400/10 bg-emerald-400/5 px-2 py-1 font-mono text-[10px] text-emerald-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                        {item.whyApplied}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {plan.qualityChecks?.length ? (
            <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] p-4">
              {plan.runnabilitySummary ? (
                <div className={`mb-3 rounded-lg border p-3 ${
                  plan.runnabilityStatus === "runnable"
                    ? "border-emerald-400/20 bg-emerald-400/5"
                    : plan.runnabilityStatus === "scientist_review_required"
                      ? "border-[#ffb785]/30 bg-[#ffb785]/5"
                      : "border-[#ffb4ab]/30 bg-[#ffb4ab]/5"
                }`}>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    Runnability gate
                  </div>
                  <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                    {plan.runnabilitySummary}
                  </div>
                </div>
              ) : null}
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">
                Scientist trust checks
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {plan.qualityChecks.map((check) => (
                  <div key={`${check.label}-${check.detail}`} className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] font-medium text-[var(--text-primary)]">{check.label}</span>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                          check.status === "pass"
                            ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                            : check.status === "warn"
                              ? "text-[#ffb785] border-[#ffb785]/20 bg-[#ffb785]/10"
                              : "text-[#ffb4ab] border-[#ffb4ab]/20 bg-[#ffb4ab]/10"
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                      {check.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {plan.routingReason ? (
            <div className={`mb-6 rounded-xl border p-4 ${
              plan.routeSupported && (plan.routingConfidence ?? 0) >= 60
                ? "border-emerald-400/20 bg-emerald-400/5"
                : "border-[#ffb785]/30 bg-[#ffb785]/5"
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    Planner router
                  </div>
                  <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {plan.experimentFamily ?? "general_research"}
                  </h2>
                </div>
                <div className="font-mono text-[11px] text-[var(--accent-text)]">
                  {plan.routingConfidence ?? 0}% confidence
                </div>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                {plan.routingReason}
              </p>
            </div>
          ) : null}

          {plan.designDecision ? (
            <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    Decision-aware design
                  </div>
                  <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {plan.designDecision.selectedApproach}
                  </h2>
                </div>
                <div className="rounded border border-[var(--accent-border)]/30 bg-[var(--accent-text)]/10 px-3 py-2 font-mono text-[11px] text-[var(--accent-text)]">
                  {plan.designDecision.alternatives.length} alternative{plan.designDecision.alternatives.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    Why this setup
                  </div>
                  <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                    {plan.designDecision.rationale}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    Cost implication
                  </div>
                  <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                    {plan.designDecision.costImplication}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    When to escalate
                  </div>
                  <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                    {plan.designDecision.escalationTrigger}
                  </p>
                </div>
              </div>
              {plan.designDecision.budgetComparison ? (
                <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    Budget comparison
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div>
                      <div className="font-mono text-[10px] text-[var(--text-muted)]">Chosen design</div>
                      <div className="mt-1 text-[14px] font-semibold text-[var(--accent-text)]">
                        {plan.designDecision.budgetComparison.selectedApproachCost}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] text-[var(--text-muted)]">Cheapest alternative</div>
                      <div className="mt-1 text-[14px] font-semibold text-emerald-400">
                        {plan.designDecision.budgetComparison.cheapestAlternativeCost}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] text-[var(--text-muted)]">Premium vs cheapest</div>
                      <div className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">
                        {plan.designDecision.budgetComparison.premiumVsCheapest}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                    {plan.designDecision.budgetComparison.summary}
                  </p>
                </div>
              ) : null}
              <div className="mt-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Experiment alternatives
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  {plan.designDecision.alternatives.map((alternative) => (
                    <div
                      key={`${alternative.type}-${alternative.name}`}
                      className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[12px] font-medium text-[var(--text-primary)]">
                          #{alternative.rank} {alternative.name}
                        </div>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]">
                          {alternative.type}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1">
                          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Cost</div>
                          <div className="mt-1 text-[11px] text-[var(--text-primary)]">{alternative.costEstimate}</div>
                        </div>
                        <div className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1">
                          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Time</div>
                          <div className="mt-1 text-[11px] text-[var(--text-primary)]">{alternative.timeEstimate}</div>
                        </div>
                        <div className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1">
                          <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Accuracy</div>
                          <div className="mt-1 text-[11px] text-[var(--text-primary)]">{alternative.accuracyExpectation}</div>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                        {alternative.rationale}
                      </p>
                      <div className="mt-2 text-[10px] text-emerald-400">
                        Estimated savings: {alternative.estimatedSavings}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

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
              <>
                {/* Protocol */}
                <section id="protocol">
                  <SectionHeader id="protocol" label="Protocol Steps" icon="format_list_numbered" onFeedback={openFeedback} />
                  {plan.references.some((reference) => reference.type === "protocol") ? (
                    <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] p-4">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                        Protocol references
                      </div>
                      <div className="grid gap-2 lg:grid-cols-2">
                        {plan.references
                          .filter((reference) => reference.type === "protocol")
                          .slice(0, 2)
                          .map((reference) => (
                            <div key={`${reference.doi}-protocol-card`} className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-3">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                                  {reference.repository ?? reference.source}
                                </span>
                                {reference.provenanceLabel ? (
                                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]">
                                    {reference.provenanceLabel}
                                  </span>
                                ) : null}
                              </div>
                              {reference.sourceUrl ? (
                                <a
                                  href={reference.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--text-primary)] hover:text-[var(--accent-text)]"
                                >
                                  {reference.title}
                                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                </a>
                              ) : (
                                <div className="text-[12px] font-medium text-[var(--text-primary)]">
                                  {reference.title}
                                </div>
                              )}
                              <p className="mt-1 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                {reference.note}
                              </p>
                              {reference.sourceUrl ? (
                                <a
                                  href={reference.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-[10px] text-[var(--accent-text)] hover:underline"
                                >
                                  View source
                                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                </a>
                              ) : null}
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    {plan.protocol.map((step, i) => (
                      <div key={i} className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-muted)] border-b border-[var(--border)]">
                          <span className="font-mono text-[11px] text-[var(--accent-strong)] bg-[var(--accent-strong)]/10 border border-[var(--accent-strong)]/20 px-2 py-0.5 rounded">
                            STEP {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{step.title}</span>
                          {step.groundingStatus ? (
                            <span
                              className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${
                                step.groundingStatus === "grounded"
                                  ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                                  : step.groundingStatus === "adapted"
                                    ? "text-[#ffb785] bg-[#ffb785]/10 border-[#ffb785]/20"
                                    : "text-[var(--text-muted)] bg-[var(--content-bg)] border-[var(--border)]"
                              }`}
                            >
                              {step.groundingStatus}
                            </span>
                          ) : null}
                          {step.time && (
                            <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              {step.time}
                            </span>
                          )}
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{step.detail}</p>
                          {(step.groundingSourceTitle || step.operationalNote || step.extractedParameters?.length || step.criticalInputs?.length || step.dependencies?.length) ? (
                            <div className="mt-3 grid gap-2 lg:grid-cols-3">
                              {step.groundingSourceTitle ? (
                                <div className="rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2">
                                  <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Method source</div>
                                  <div className="text-[11px] text-[var(--text-secondary)] leading-snug">{step.groundingSourceTitle}</div>
                                  {step.groundingSourceDoi ? (
                                    <div className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">{step.groundingSourceDoi}</div>
                                  ) : null}
                                  {step.groundingSourceUrl ? (
                                    <a href={step.groundingSourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--accent-text)] hover:underline">
                                      Open source
                                      <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                    </a>
                                  ) : null}
                                </div>
                              ) : null}
                              {step.operationalNote || step.extractedParameters?.length ? (
                                <div className="rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2">
                                  <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Operational cues</div>
                                  {step.operationalNote ? (
                                    <div className="text-[11px] text-[var(--text-secondary)] leading-snug">{step.operationalNote}</div>
                                  ) : null}
                                  {step.extractedParameters?.length ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {step.extractedParameters.map((parameter) => (
                                        <span
                                          key={`${step.title}-${parameter}`}
                                          className="font-mono text-[10px] text-[var(--text-secondary)] px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface-muted)]"
                                        >
                                          {parameter}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              {step.criticalInputs?.length ? (
                                <div className="rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2">
                                  <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Critical inputs</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {step.criticalInputs.map((input) => (
                                      <span key={`${step.title}-${input}`} className="font-mono text-[10px] text-[var(--text-secondary)] px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface-muted)]">
                                        {input}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              {step.dependencies?.length ? (
                                <div className="rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2">
                                  <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Depends on</div>
                                  <div className="text-[11px] text-[var(--text-secondary)] leading-snug">{step.dependencies.join(" -> ")}</div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
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
                    <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                        Supply-chain grounding
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded">
                        {plan.materials.filter((material) => material.verificationStatus === "verified").length}/{plan.materials.length} verified
                      </span>
                    </div>
                    <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[var(--border)]">
                      {["REAGENT", "SUPPLIER", "CAT #", "QTY", "EST. COST"].map((h) => (
                        <span key={h} className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{h}</span>
                      ))}
                    </div>
                    {plan.materials.map((m, i) => (
                      <div key={i} className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[var(--border)] last:border-0 items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium text-[var(--text-primary)]">{m.name}</span>
                            <a
                              href={buildReagentSearchUrl(m)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded border border-[var(--border)] bg-[var(--content-bg)] px-1.5 py-1 text-[var(--text-muted)] hover:text-[var(--accent-text)] hover:border-[var(--accent-border)]/40"
                              title={`Search ${m.name}`}
                            >
                              <span className="material-symbols-outlined text-[12px]">search</span>
                            </a>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span
                              className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${
                                m.verificationStatus === "verified"
                                  ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                                  : "text-[var(--text-muted)] bg-[var(--content-bg)] border-[var(--border)]"
                              }`}
                            >
                              {m.verificationStatus === "verified" ? "Verified catalog match" : "Estimated"}
                            </span>
                            {m.leadTime ? (
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]">
                                Lead time {m.leadTime}
                              </span>
                            ) : null}
                          </div>
                          {m.requiredForSteps?.length ? (
                            <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                              Needed for: {m.requiredForSteps.join(", ")}
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <span className="text-[12px] text-[var(--text-secondary)]">{m.supplier}</span>
                          {m.verificationSource ? (
                            <div className="mt-1 text-[10px] text-[var(--text-muted)]">{m.verificationSource}</div>
                          ) : null}
                          {typeof m.verificationConfidence === "number" && m.verificationStatus === "verified" ? (
                            <div className="mt-1 text-[10px] text-emerald-400">
                              {m.verificationConfidence}% confidence
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <span className="font-mono text-[11px] text-[var(--accent-strong)]">{m.catalogNumber}</span>
                          {m.verificationNote ? (
                            <div className="mt-1 text-[10px] text-[var(--text-muted)] leading-snug">{m.verificationNote}</div>
                          ) : null}
                          {m.verificationUrl ? (
                            <a
                              href={m.verificationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--accent-text)] hover:underline"
                            >
                              Provenance source
                              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                            </a>
                          ) : null}
                        </div>
                        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{m.quantity}</span>
                        <div>
                          <span className="font-mono text-[11px] text-[var(--accent-text)]">{m.estimatedCost}</span>
                          {m.usageNote ? (
                            <div className="mt-1 text-[10px] text-[var(--text-muted)] leading-snug">{m.usageNote}</div>
                          ) : null}
                        </div>
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
                          {b.basis ? <div className="text-[10px] text-[var(--text-muted)] mt-1">{b.basis}</div> : null}
                          {b.dependsOn?.length ? (
                            <div className="text-[10px] text-[var(--text-muted)] mt-1">Depends on: {b.dependsOn.join(", ")}</div>
                          ) : null}
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
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Visual schedule</div>
                        <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                          Click a week to inspect overlapping tasks, dependencies, and expected deliverables.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableWeeks.map((week) => (
                          <button
                            key={`week-pill-${week}`}
                            type="button"
                            onClick={() => setSelectedWeek(week)}
                            className={`font-mono text-[10px] px-2.5 py-1 rounded border transition-colors ${
                              (selectedWeek ?? availableWeeks[0]) === week
                                ? "border-[var(--accent-border)]/40 bg-[var(--accent-text)]/10 text-[var(--accent-text)]"
                                : "border-[var(--border)] bg-[var(--content-bg)] text-[var(--text-muted)]"
                            }`}
                          >
                            Week {week}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <div className="min-w-[760px] space-y-2">
                        <div
                          className="grid gap-2"
                          style={{ gridTemplateColumns: `220px repeat(${availableWeeks.length}, minmax(48px, 1fr))` }}
                        >
                          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Task</div>
                          {availableWeeks.map((week) => (
                            <button
                              key={`week-header-${week}`}
                              type="button"
                              onClick={() => setSelectedWeek(week)}
                              className={`rounded border px-2 py-1 font-mono text-[10px] transition-colors ${
                                (selectedWeek ?? availableWeeks[0]) === week
                                  ? "border-[var(--accent-border)]/40 bg-[var(--accent-text)]/10 text-[var(--accent-text)]"
                                  : "border-[var(--border)] bg-[var(--content-bg)] text-[var(--text-muted)]"
                              }`}
                            >
                              {week}
                            </button>
                          ))}
                        </div>
                        {ganttRows.map((row) => {
                          const active = (selectedWeek ?? availableWeeks[0]) >= row.start && (selectedWeek ?? availableWeeks[0]) <= row.end;
                          return (
                            <div
                              key={`${row.item.phase}-${row.index}`}
                              className="grid items-center gap-2"
                              style={{ gridTemplateColumns: `220px repeat(${availableWeeks.length}, minmax(48px, 1fr))` }}
                            >
                              <div className="rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2">
                                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{row.item.phase}</div>
                                <div className="mt-1 text-[11px] text-[var(--text-primary)]">{row.item.action}</div>
                              </div>
                              {availableWeeks.map((week) => {
                                const inRange = week >= row.start && week <= row.end;
                                return (
                                  <button
                                    key={`${row.item.phase}-${week}`}
                                    type="button"
                                    onClick={() => setSelectedWeek(week)}
                                    className={`h-11 rounded border text-[10px] transition-colors ${
                                      inRange
                                        ? active
                                          ? "border-[var(--accent-border)]/40 bg-[var(--accent-text)]/15 text-[var(--accent-text)]"
                                          : "border-[var(--accent-border)]/20 bg-[var(--accent-text)]/8 text-[var(--text-primary)]"
                                        : "border-[var(--border)] bg-[var(--content-bg)] text-[var(--text-muted)]"
                                    }`}
                                  >
                                    {inRange ? "●" : ""}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                            Week {(selectedWeek ?? availableWeeks[0])}
                          </div>
                          <div className="text-[12px] text-[var(--text-secondary)]">
                            {selectedWeekDetails.length > 0
                              ? `${selectedWeekDetails.length} active task${selectedWeekDetails.length === 1 ? "" : "s"}`
                              : "No scheduled work in this week"}
                          </div>
                        </div>
                      </div>
                      {selectedWeekDetails.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {selectedWeekDetails.map((row) => (
                            <div key={`selected-${row.index}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface-panel)] px-3 py-3">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{row.item.phase}</div>
                                  <div className="mt-1 text-[12px] text-[var(--text-primary)]">{row.item.action}</div>
                                </div>
                                <span className="font-mono text-[10px] text-[var(--accent-text)]">
                                  Week {row.start}{row.end > row.start ? `-${row.end}` : ""}
                                </span>
                              </div>
                              {row.item.dependencies?.length ? (
                                <div className="mt-2 text-[10px] text-[var(--text-muted)]">Depends on: {row.item.dependencies.join(", ")}</div>
                              ) : null}
                              {row.item.deliverable ? (
                                <div className="mt-1 text-[10px] text-[var(--text-muted)]">Deliverable: {row.item.deliverable}</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
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
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${badge.bg} ${badge.border} ${badge.text}`}>
                                {ref.type.toUpperCase()}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--text-muted)]">{ref.source}</span>
                              {ref.repository ? (
                                <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--surface-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                                  {ref.repository}
                                </span>
                              ) : null}
                              {typeof ref.matchScore === "number" ? (
                                <span className="font-mono text-[10px] text-[var(--accent-text)] bg-[var(--accent-text)]/10 border border-[var(--accent-border)]/20 px-1.5 py-0.5 rounded">
                                  {ref.matchScore}% match
                                </span>
                              ) : null}
                            </div>
                            {ref.sourceUrl ? (
                              <a
                                href={ref.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--accent-text)]"
                              >
                                {ref.title}
                                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                              </a>
                            ) : (
                              <div className="text-[13px] font-medium text-[var(--text-primary)] mb-1">{ref.title}</div>
                            )}
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              {ref.venue ? (
                                <span className="font-mono text-[10px] text-[var(--text-muted)]">{ref.venue}</span>
                              ) : null}
                              {ref.publishedYear ? (
                                <span className="font-mono text-[10px] text-[var(--text-muted)]">{ref.publishedYear}</span>
                              ) : null}
                              <span className="font-mono text-[10px] text-[var(--text-muted)]">{ref.doi}</span>
                            </div>
                            <div className="mt-2 rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2">
                              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                                Why relevant
                              </div>
                              <div className="text-[11px] text-[var(--text-tertiary)]">
                                {ref.relevanceSummary ?? ref.matchRationale ?? ref.note}
                              </div>
                            </div>
                            {ref.provenanceLabel ? (
                              <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                                {ref.provenanceLabel}
                              </div>
                            ) : null}
                            {ref.sourceUrl ? (
                              <a
                                href={ref.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-[10px] text-[var(--accent-text)] hover:underline"
                              >
                                Open publication / source
                                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                              </a>
                            ) : null}
                            {ref.matchedTerms?.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {ref.matchedTerms.map((term) => (
                                  <span
                                    key={`${ref.doi}-${term}`}
                                    className="rounded border border-[var(--border)] bg-[var(--content-bg)] px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]"
                                  >
                                    {term}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                <section id="review-actions" className="rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] p-5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                        Final review
                      </div>
                      <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Approve this handoff for lab use</h2>
                      <p className="mt-2 max-w-2xl text-[12px] text-[var(--text-secondary)] leading-relaxed">
                        Review the notes, confirm the trust checks, and record a final approval once the plan is ready to leave the planning system.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={approveReview}
                      disabled={reviewApproved}
                      className={`inline-flex items-center gap-2 rounded border px-4 py-2 font-mono text-[11px] transition-colors ${
                        reviewApproved
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                          : "border-[var(--accent-border)]/40 bg-[var(--accent-text)]/10 text-[var(--accent-text)] hover:bg-[var(--accent-text)]/15"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {reviewApproved ? "verified" : "task_alt"}
                      </span>
                      {reviewApproved ? "Final approval recorded" : "Approve final handoff"}
                    </button>
                  </div>
                  <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      Approval status
                    </div>
                    <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                      {reviewApproved
                        ? "A scientist has marked this run as ready for final handoff."
                        : "No final approval has been recorded yet. Review the notes, trust checks, and corrections below before approving this plan."}
                    </div>
                  </div>
                </section>

                {plan.reviewFeedback?.length > 0 ? (
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
                ) : null}

                {plan.memoryImpact && plan.memoryImpact.appliedCount > 0 ? (
                  <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">
                          Improvement from past feedback
                        </div>
                        <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                          {plan.memoryImpact.summary}
                        </h2>
                      </div>
                      <div className="rounded border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 font-mono text-[11px] text-emerald-400">
                        {plan.memoryImpact.appliedCount} applied
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 lg:grid-cols-2">
                      {plan.memoryImpact.items.map((item, index) => (
                        <div key={`${item.section}-review-${index}`} className="rounded-lg border border-emerald-400/10 bg-[var(--surface-panel)] p-3">
                          <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-1">
                            {item.section}
                          </div>
                          <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                            {item.correction ?? item.issue}
                          </div>
                          <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                            {item.whyApplied}
                          </div>
                          {item.tags?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {item.tags.slice(0, 4).map((tag) => (
                                <span
                                  key={`${item.section}-${tag}-review`}
                                  className="rounded border border-emerald-400/10 bg-emerald-400/5 px-2 py-1 font-mono text-[10px] text-emerald-400"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] p-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                    Review this plan and improve the next run
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed mb-3">
                    Use the <span className="text-[var(--accent-text)]">&ldquo;Suggest correction&rdquo;</span> buttons in the plan tab to flag issues in protocol, materials, budget, timeline, or validation. Those corrections are stored with experiment-family and task tags, then automatically reused in future similar plans.
                  </p>
                  <div className="font-mono text-[10px] text-[var(--text-muted)]">
                    {feedbackCount} correction{feedbackCount !== 1 ? "s" : ""} saved for <span className="text-[var(--accent-text)]">{plan.domain}</span> and related experiment types
                  </div>
                </section>
              </>

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
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
            What should the next run do instead?
          </label>
          <textarea
            value={state.correction}
            onChange={(e) => onChange({ ...state, correction: e.target.value })}
            placeholder={`e.g. "Use patient-level split, add Dice and vessel-connectivity checks, and compare against a masked-autoencoder baseline."`}
            rows={2}
            className="w-full bg-[var(--content-bg)] border border-[var(--border)] focus:border-[var(--accent-strong)]/50 text-[var(--text-primary)] font-mono text-[11px] rounded-lg px-3 py-2 outline-none resize-none placeholder:text-[var(--text-placeholder)] leading-relaxed transition-colors"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">
            Importance
          </label>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onChange({ ...state, importance: level })}
                className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded border transition-colors ${
                  state.importance === level
                    ? "border-[var(--accent-strong)]/40 bg-[var(--accent-strong)]/10 text-[var(--accent-text)]"
                    : "border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
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
