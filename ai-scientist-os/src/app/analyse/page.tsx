"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";
import type {
  GeneratePlanResponse,
  LiteratureQcSummary,
  ParseHypothesisResponse,
  Reference,
  ReviewMemoryItem,
} from "@/lib/types";

const STATUS_MESSAGES = [
  "Analysing hypothesis...",
  "Retrieving protocols...",
  "Querying reagent database...",
  "Building materials list...",
  "Generating timeline...",
  "Finalising experiment plan...",
];

const LOG_MESSAGES = [
  "> Establishing baseline control parameters...",
  "> Querying reagent database...",
  "> Generating primary protocol sequence...",
  "> Estimating materials cost...",
  "> Building timeline phases...",
  "> Validating output schema...",
];

const NOVELTY_CONFIG = {
  "not found": {
    label: "Not found — Novel work",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    dot: "bg-emerald-400",
  },
  "similar work exists": {
    label: "Similar work exists",
    color: "text-[#ffb785]",
    bg: "bg-[#ffb785]/10",
    border: "border-[#ffb785]/20",
    dot: "bg-[#ffb785]",
  },
  "exact match found": {
    label: "Exact match found",
    color: "text-[#ffb4ab]",
    bg: "bg-[#ffb4ab]/10",
    border: "border-[#ffb4ab]/20",
    dot: "bg-[#ffb4ab]",
  },
};

const MIN_DISPLAY_MS = 5000;
const LAST_ACTIVE_PROJECT_KEY = "ai-scientist-os:last-active-project-id";

function generateHypId() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function summarizeMemoryMessage(items: ReviewMemoryItem[]): string | null {
  const first = items[0];
  if (!first) {
    return null;
  }

  const detail = first.correction ?? first.issue;
  return `Applied prior ${first.section.toLowerCase()} feedback: ${detail.slice(0, 56)}${detail.length > 56 ? "..." : ""}`;
}

export default function AnalysePage() {
  const router = useRouter();
  const [hypothesis] = useState(() =>
    typeof window === "undefined" ? "" : sessionStorage.getItem("hypothesis") ?? "",
  );
  const [hypId] = useState(generateHypId);
  const [loading, setLoading] = useState(true);
  const [planReady, setPlanReady] = useState(false);
  const [novelty, setNovelty] = useState<keyof typeof NOVELTY_CONFIG | null>(null);
  const [refCount, setRefCount] = useState(0);
  const [references, setReferences] = useState<Reference[]>([]);
  const [literatureQc, setLiteratureQc] = useState<LiteratureQcSummary | null>(null);
  const [experimentFamily, setExperimentFamily] = useState<string | null>(null);
  const [routingConfidence, setRoutingConfidence] = useState<number | null>(null);
  const [routingReason, setRoutingReason] = useState<string | null>(null);
  const [routeSupported, setRouteSupported] = useState<boolean>(true);
  const [memoryCount, setMemoryCount] = useState(0);
  const [memoryMessage, setMemoryMessage] = useState<string | null>(null);
  const [statusIdx, setStatusIdx] = useState(0);
  const [logLines, setLogLines] = useState<{ time: string; text: string }[]>([
    { time: new Date().toLocaleTimeString(), text: "> Initialising synthesis engine..." },
    { time: new Date().toLocaleTimeString(), text: "> Parsing hypothesis constraints..." },
  ]);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const ranRef = useRef(false);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hypothesis) {
      router.push("/");
    }
  }, [hypothesis, router]);

  useEffect(() => {
    if (startRef.current === null) {
      startRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < LOG_MESSAGES.length) {
        setLogLines((prev) => [...prev, { time: new Date().toLocaleTimeString(), text: LOG_MESSAGES[i] }]);
        i++;
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  useEffect(() => {
    if (!hypothesis || ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      try {
        const storedParsed =
          typeof window !== "undefined" ? sessionStorage.getItem("parsed") : null;
        const parsed =
          storedParsed ? (JSON.parse(storedParsed) as ParseHypothesisResponse) : undefined;

        // Fetch prior review memory to incorporate into plan generation
        let reviewMemory: ReviewMemoryItem[] = [];
        try {
          const memRes = await fetch("/api/review-memory");
          const memData = await memRes.json();
          reviewMemory = memData.items ?? [];
          setMemoryCount(reviewMemory.length);
          setMemoryMessage(summarizeMemoryMessage(reviewMemory));
          if (reviewMemory.length > 0) {
            setLogLines((prev) => [...prev, {
              time: new Date().toLocaleTimeString(),
              text: `> Loaded ${reviewMemory.length} scientist correction${reviewMemory.length > 1 ? "s" : ""} from memory...`,
            }]);
          }
        } catch { /* memory fetch failure is non-fatal */ }

        const res = await fetch("/api/generate-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hypothesis, parsed, reviewMemory }),
        });
        const data = (await res.json()) as GeneratePlanResponse & { error?: string };

        if (!res.ok || data.error) {
          const msg = data.error ?? "Plan generation failed. Please try again.";
          const isAuth = res.status === 401 || msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("openai");
          setError(isAuth ? "Invalid or missing OpenAI API key — add OPENAI_API_KEY to .env.local and restart." : msg);
          return;
        }

        const plan = data.plan;
        setNovelty(plan.noveltySignal as keyof typeof NOVELTY_CONFIG);
        setRefCount(plan.references.length);
        setReferences(plan.references.slice(0, 3));
        setLiteratureQc(plan.literatureQc ?? null);
        setExperimentFamily(plan.experimentFamily ?? null);
        setRoutingConfidence(plan.routingConfidence ?? null);
        setRoutingReason(plan.routingReason ?? null);
        setRouteSupported(plan.routeSupported ?? true);

        // Store plan and hypothesis for plan page
        sessionStorage.setItem("plan", JSON.stringify(plan));
        sessionStorage.setItem("hypothesis", hypothesis);

        // Auto-save to projects store so Dashboard shows real history
        const now = new Date().toISOString();
        const parsedForProject: ParseHypothesisResponse = parsed ?? {
          hypothesis,
          domain: plan.domain,
          experimentFamily: plan.experimentFamily ?? "general_research",
          routingConfidence: plan.routingConfidence ?? 0,
          routingReason: plan.routingReason ?? "No routing rationale available.",
          routeSupported: plan.routeSupported ?? false,
          readiness: plan.status ?? "ready",
          parsedFields: plan.parsedFields,
        };
        const projectId = plan.experimentId;
        fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: projectId,
            hypothesis,
            parsed: parsedForProject,
            plan,
            createdAt: now,
            updatedAt: now,
          }),
        }).catch(() => {});
        sessionStorage.setItem("projectId", projectId);
        localStorage.setItem(LAST_ACTIVE_PROJECT_KEY, projectId);

        // Enforce minimum display time so users see the animation
        const elapsed = Date.now() - (startRef.current ?? Date.now());
        const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
        await new Promise((r) => setTimeout(r, remaining));

        setPlanReady(true);
      } catch {
        setError("Network error — is the dev server running?");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [hypothesis]);

  const noveltyConfig = novelty ? NOVELTY_CONFIG[novelty] : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--background)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col p-5 overflow-y-auto bg-[var(--surface-muted)]">
          <header className="mb-5">
            <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] text-[var(--accent-text)] px-2 py-0.5 bg-[var(--accent-text)]/10 border border-[var(--accent-border)]/20 rounded">
                  Step 2 of 3
                </span>
                <span className="font-mono text-[11px] text-[var(--text-tertiary)] bg-[var(--surface-panel)] px-2 py-0.5 rounded">
                  ID: HYP-{hypId}
                </span>
                {memoryCount > 0 && (
                  <span className="font-mono text-[11px] text-emerald-400 px-2 py-0.5 bg-emerald-400/10 border border-emerald-400/20 rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">psychology</span>
                    {memoryMessage ?? `${memoryCount} correction${memoryCount > 1 ? "s" : ""} applied`}
                  </span>
                )}
                {experimentFamily ? (
                  <span className="font-mono text-[11px] text-[var(--text-tertiary)] bg-[var(--surface-panel)] px-2 py-0.5 rounded">
                    Route: {experimentFamily}
                  </span>
                ) : null}
              </div>
            </div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)] leading-[1.2]">
              Literature QC and plan generation
            </h1>
            <p className="text-[13px] text-[var(--text-tertiary)] mt-1 max-w-2xl leading-[1.6] line-clamp-2">
              We first run a fast literature novelty check, return 1–3 follow-up references, and then generate the experiment plan.
            </p>
          </header>

          {error && (
            <div className="mb-4 p-4 rounded border border-[#ffb4ab]/30 bg-[#ffb4ab]/5 text-[#ffb4ab] text-[13px] font-mono flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
              <button onClick={() => router.push("/")} className="ml-auto underline hover:no-underline">Go back</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[500px]">

            {/* Left: Literature Check */}
            <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl flex flex-col overflow-hidden">
              <div className="h-10 bg-[var(--surface-muted)] border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--text-tertiary)] text-[16px]">library_books</span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-primary)]">Literature QC</span>
                </div>
                <div className="flex items-center gap-2">
                  {loading ? (
                    <><span className="w-2 h-2 rounded-full bg-[var(--accent-text)] anim-glow" /><span className="font-mono text-[11px] text-[var(--accent-text)]">SEARCHING</span></>
                  ) : (
                    <><span className="w-2 h-2 rounded-full bg-emerald-400" /><span className="font-mono text-[11px] text-emerald-400">COMPLETE</span></>
                  )}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center gap-3 p-3 bg-[var(--surface-subtle)] rounded border border-[var(--text-muted)]/30">
                    <span className="material-symbols-outlined text-[var(--accent-text)] anim-spin-slow text-[20px]">sync</span>
                    <span className="font-mono text-[13px] text-[var(--text-secondary)]">Scanning PubMed, arXiv & protocols.io...</span>
                  </div>
                ) : noveltyConfig ? (
                  <>
                    <div className={`flex items-center gap-2 p-3 rounded border ${noveltyConfig.bg} ${noveltyConfig.border}`}>
                      <span className={`w-2 h-2 rounded-full ${noveltyConfig.dot}`} />
                      <span className={`font-mono text-[11px] uppercase tracking-widest ${noveltyConfig.color}`}>{noveltyConfig.label}</span>
                    </div>
                    {literatureQc ? (
                      <div className="rounded border border-[var(--border)] bg-[var(--content-bg)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                            Explicit QC
                          </span>
                          <span className="font-mono text-[11px] text-[var(--accent-text)]">
                            Top match {literatureQc.topMatchScore}%
                          </span>
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                          {literatureQc.rationale}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {literatureQc.decisionFactors.map((factor) => (
                            <span
                              key={factor}
                              className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-[10px] text-[var(--text-tertiary)]"
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {planReady && routingConfidence !== null ? (
                      <div className={`rounded border p-3 ${
                        routeSupported && routingConfidence >= 60
                          ? "border-emerald-400/20 bg-emerald-400/5"
                          : "border-[#ffb785]/30 bg-[#ffb785]/5"
                      }`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                            Experiment route
                          </span>
                          <span className="font-mono text-[11px] text-[var(--accent-text)]">
                            {routingConfidence}% confidence
                          </span>
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                          {routingReason ?? "No route rationale available."}
                        </p>
                      </div>
                    ) : null}
                    {planReady && (() => {
                      const storedPlan =
                        typeof window !== "undefined"
                          ? sessionStorage.getItem("plan")
                          : null;
                      if (!storedPlan) return null;
                      try {
                        const parsedPlan = JSON.parse(storedPlan) as GeneratePlanResponse["plan"];
                        const comparison = parsedPlan.historicalComparison;
                        if (!comparison) return null;
                        return (
                          <div className="rounded border border-[var(--border)] bg-[var(--content-bg)] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                                Past study benchmark
                              </span>
                              <span className="font-mono text-[10px] text-[var(--accent-text)] bg-[var(--accent-text)]/10 border border-[var(--accent-border)]/20 px-1.5 py-0.5 rounded">
                                {comparison.verdict}
                              </span>
                            </div>
                            <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                              {comparison.rationale}
                            </p>
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                    {references.some((reference) => reference.type === "protocol") ? (
                      <div className="rounded border border-[var(--border)] bg-[var(--content-bg)] p-3">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                          Protocol grounding
                        </div>
                        <div className="mt-2 space-y-2">
                        {references
                          .filter((reference) => reference.type === "protocol")
                          .slice(0, 2)
                          .map((reference) => (
                            <div key={`${reference.doi}-protocol`} className="rounded border border-[var(--border)] bg-[var(--surface-muted)] p-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-[11px] font-medium text-[var(--text-primary)]">
                                    {reference.repository ?? reference.source}
                                  </span>
                                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded">
                                    {reference.provenanceLabel ?? "Protocol source"}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                                  {reference.title}
                                </p>
                                {reference.sourceUrl ? (
                                  <a
                                    href={reference.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-[10px] text-[var(--accent-text)] hover:underline"
                                  >
                                    Open source
                                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                  </a>
                                ) : null}
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : null}
                    {refCount > 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2">
                          <p className="font-mono text-[12px] text-[var(--text-tertiary)]">
                            {refCount} reference{refCount > 1 ? "s" : ""} surfaced
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] font-mono">Ranked by overlap</p>
                        </div>
                        {references.map((reference) => (
                          <article
                            key={`${reference.doi}-${reference.title}`}
                            className="rounded border border-[var(--border)] bg-[var(--content-bg)] p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                                  {reference.type}
                                </div>
                                {reference.sourceUrl ? (
                                  <a
                                    href={reference.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold leading-snug text-[var(--text-primary)] hover:text-[var(--accent-text)]"
                                  >
                                    {reference.title}
                                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                  </a>
                                ) : (
                                  <h3 className="mt-1 text-[12px] font-semibold leading-snug text-[var(--text-primary)]">
                                    {reference.title}
                                  </h3>
                                )}
                              </div>
                              <span className="rounded border border-[var(--accent-border)]/30 bg-[var(--accent-text)]/10 px-2 py-1 font-mono text-[10px] text-[var(--accent-text)]">
                                {reference.matchScore ?? 0}%
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {reference.venue ? (
                                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                  {reference.venue}
                                </span>
                              ) : null}
                              {reference.publishedYear ? (
                                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                  {reference.publishedYear}
                                </span>
                              ) : null}
                              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                {reference.doi}
                              </span>
                            </div>
                            <div className="mt-3 rounded border border-[var(--border)] bg-[var(--surface-muted)] p-2">
                              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                                Why relevant
                              </div>
                              <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                                {reference.relevanceSummary ?? reference.matchRationale ?? reference.note}
                              </p>
                            </div>
                            {reference.provenanceLabel || reference.repository ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {reference.provenanceLabel ? (
                                  <span className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]">
                                    {reference.provenanceLabel}
                                  </span>
                                ) : null}
                                {reference.repository ? (
                                  <span className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]">
                                    {reference.repository}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {reference.sourceUrl ? (
                                <a
                                  href={reference.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-[var(--accent-text)] hover:underline"
                                >
                                  Open publication / source
                                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                </a>
                              ) : null}
                            </div>
                            {reference.matchedTerms?.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {reference.matchedTerms.map((term) => (
                                  <span
                                    key={`${reference.doi}-${term}`}
                                    className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-[10px] text-[var(--text-tertiary)]"
                                  >
                                    {term}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                        <span className="material-symbols-outlined text-[var(--accent-text)] text-[32px]">verified</span>
                        <p className="text-[13px] font-mono text-[var(--text-tertiary)]">No closely matching literature found.</p>
                        <p className="text-[12px] text-[var(--text-muted)] font-mono">This appears to be novel work.</p>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            {/* Right: Plan Generation */}
            <div className="bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl flex flex-col overflow-hidden relative">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-[var(--accent-text)]/5 rounded-full blur-[60px] pointer-events-none" />
              <div className="h-10 bg-[var(--surface-muted)] border-b border-[var(--border)] flex items-center justify-between px-4 z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--text-tertiary)] text-[16px]">biotech</span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-primary)]">Experiment Plan</span>
                </div>
                <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                  {planReady ? "Ready to review" : "Generating"}
                </span>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-center items-center relative z-10">
                <div className="w-full max-w-sm flex flex-col items-center">
                  <div className="w-24 h-24 mb-8 relative flex items-center justify-center">
                    <div className="absolute inset-0 border-2 border-[var(--accent-border)]/20 rounded-full" />
                    <div className="absolute inset-2 border border-[var(--accent-border)]/40 rounded-full border-t-[#c4c0ff] anim-spin-slow" />
                    <div className="absolute inset-4 border border-[var(--accent-border)]/30 rounded-full border-b-[#c6c4da] anim-spin-slow spin-reverse" />
                    <span className={`material-symbols-outlined text-[32px] anim-glow rounded-full transition-all duration-500 ${
                      loading ? "text-[var(--accent-text)]" : planReady ? "text-emerald-400" : "text-[#ffb4ab]"
                    }`}>
                      {loading ? "memory" : planReady ? "check_circle" : "error"}
                    </span>
                  </div>

                  <div className="font-mono text-[13px] text-[var(--accent-text)] mb-6 h-5 text-center">
                    {loading ? STATUS_MESSAGES[statusIdx] : planReady ? "Plan generated — review the QC results below." : error ?? ""}
                  </div>

                  <div className="w-full h-px bg-[var(--border-subtle)] rounded-full overflow-hidden relative mb-8">
                    {loading ? (
                      <div className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-[#c4c0ff] to-transparent progress-bar-anim" />
                    ) : (
                      <div className={`absolute inset-0 rounded-full ${planReady ? "bg-emerald-400" : "bg-[#ffb4ab]"}`} />
                    )}
                  </div>

                  <div ref={logRef} className="w-full bg-[var(--background)] border border-[var(--border)] rounded p-3 font-mono text-[10px] leading-relaxed h-28 overflow-y-auto relative">
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0A0A0F] to-transparent z-10 pointer-events-none" />
                    {logLines.map((line, i) => (
                      <div key={i} style={{ opacity: Math.min(1, 0.4 + i * 0.1) }}
                        className={i === logLines.length - 1 ? "text-[var(--accent-text)]" : "text-[var(--text-tertiary)]"}>
                        [{line.time}] {line.text}
                      </div>
                    ))}
                    {loading && (
                      <div className="text-[var(--accent-text)] flex items-center gap-1 mt-1">
                        &gt;<span className="w-1.5 h-3 bg-[var(--accent-text)] animate-pulse inline-block ml-0.5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[var(--border)] bg-[var(--content-bg)] flex justify-end gap-3 z-10 shrink-0">
                <button onClick={() => router.push("/")}
                  className="font-mono text-[11px] px-4 py-2 rounded border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors">
                  Back
                </button>
                <button onClick={() => planReady && router.push("/plan")} disabled={loading || !planReady}
                  className="font-mono text-[11px] px-4 py-2 rounded bg-[var(--accent-text)] text-[#2000a4] font-semibold disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-[#8781ff] hover:text-white transition-colors">
                  Open Experiment Plan
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
                <button onClick={() => router.push("/literature")} disabled={loading}
                  className="font-mono text-[11px] px-4 py-2 rounded border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Open Evidence Workspace
                </button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
