"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";
import type { ExperimentPlan, Reference } from "@/lib/types";

type EvidenceFilter = "all" | "papers" | "protocols" | "supplier_notes" | "reviews";

function referenceFilterKey(reference: Reference): EvidenceFilter {
  if (reference.type === "protocol") {
    return "protocols";
  }
  if (reference.type === "supplier") {
    return "supplier_notes";
  }
  return "papers";
}

export default function LiteraturePage() {
  const [hypothesis] = useState<string>(() =>
    typeof window === "undefined" ? "" : sessionStorage.getItem("hypothesis") ?? "",
  );
  const [plan] = useState<ExperimentPlan | null>(() => {
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
  const [activeFilter, setActiveFilter] = useState<EvidenceFilter>("all");

  const evidenceItems = useMemo(() => {
    if (!plan) {
      return [];
    }

    const referenceItems = plan.references.map((reference, index) => ({
      id: `${reference.type}-${reference.doi}-${index}`,
      kind: referenceFilterKey(reference),
      title: reference.title,
      subtitle: [reference.source, reference.venue, reference.publishedYear].filter(Boolean).join(" • "),
      detail: reference.relevanceSummary ?? reference.matchRationale ?? reference.note,
      matchScore: reference.matchScore,
      tags: reference.matchedTerms ?? [],
      href: reference.sourceUrl,
      metadata: reference.doi,
      badge: reference.type === "protocol" ? "Protocol" : reference.type === "supplier" ? "Supplier note" : "Paper",
    }));

    const supplierItems = plan.materials
      .filter((material) => material.verificationUrl || material.verificationSource || material.verificationNote)
      .map((material, index) => ({
        id: `supplier-${material.catalogNumber}-${index}`,
        kind: "supplier_notes" as const,
        title: material.name,
        subtitle: [material.supplier, material.catalogNumber].filter(Boolean).join(" • "),
        detail: material.verificationNote ?? material.verificationSource ?? "Supplier verification source available for this material.",
        matchScore: material.verificationConfidence,
        tags: material.requiredForSteps ?? [],
        href: material.verificationUrl,
        metadata: material.verificationSource ?? "Verified supplier context",
        badge: "Supplier note",
      }));

    const reviewItems = [
      ...(plan.reviewFeedback ?? []).map((item, index) => ({
        id: `review-feedback-${index}`,
        kind: "reviews" as const,
        title: item.section,
        subtitle: "Plan review note",
        detail: `${item.issue} ${item.impact}`.trim(),
        matchScore: undefined,
        tags: [],
        href: "/plan#review-actions",
        metadata: "Review note",
        badge: "Review",
      })),
      ...(plan.memoryImpact?.items ?? []).map((item, index) => ({
        id: `memory-review-${index}`,
        kind: "reviews" as const,
        title: item.section,
        subtitle: "Applied scientist memory",
        detail: item.correction ?? item.issue,
        matchScore: undefined,
        tags: item.tags ?? [],
        href: "/plan#review-actions",
        metadata: item.whyApplied,
        badge: "Memory",
      })),
    ];

    return [...referenceItems, ...supplierItems, ...reviewItems];
  }, [plan]);

  const filteredItems = evidenceItems.filter((item) => activeFilter === "all" || item.kind === activeFilter);
  const featured = filteredItems[0] ?? evidenceItems[0];

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-hidden bg-[var(--content-bg)]">
          <div className="flex h-full">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl">
                <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)] mb-2">
                      Evidence Workspace
                    </div>
                    <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)] leading-tight">
                      Literature, protocols, supplier notes, and review context
                    </h1>
                    <p className="mt-2 text-[13px] text-[var(--text-tertiary)] leading-relaxed max-w-3xl">
                      Review the supporting evidence for the current run, open original sources directly, and jump back into the plan or review step without losing context.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/analyse"
                      className="rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      Back to QC
                    </Link>
                    <Link
                      href="/plan"
                      className="rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      Open plan
                    </Link>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] p-4 mb-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    Current hypothesis
                  </div>
                  <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                    {hypothesis || "No hypothesis loaded for this session yet."}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    { key: "all", label: `All (${evidenceItems.length})` },
                    { key: "papers", label: `Papers (${evidenceItems.filter((item) => item.kind === "papers").length})` },
                    { key: "protocols", label: `Protocols (${evidenceItems.filter((item) => item.kind === "protocols").length})` },
                    { key: "supplier_notes", label: `Supplier Notes (${evidenceItems.filter((item) => item.kind === "supplier_notes").length})` },
                    { key: "reviews", label: `Reviews (${evidenceItems.filter((item) => item.kind === "reviews").length})` },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setActiveFilter(filter.key as EvidenceFilter)}
                      className={`rounded-lg border px-3 py-2 font-mono text-[11px] transition-colors ${
                        activeFilter === filter.key
                          ? "border-[var(--accent-border)]/40 bg-[var(--accent-text)]/10 text-[var(--accent-text)]"
                          : "border-[var(--border)] bg-[var(--surface-panel)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <article key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="rounded border border-[var(--border)] bg-[var(--content-bg)] px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]">
                              {item.badge}
                            </span>
                            {item.metadata ? (
                              <span className="font-mono text-[10px] text-[var(--text-muted)]">{item.metadata}</span>
                            ) : null}
                          </div>
                          <div className="text-[14px] font-semibold text-[var(--text-primary)] leading-snug">
                            {item.title}
                          </div>
                          {item.subtitle ? (
                            <div className="mt-1 text-[11px] text-[var(--text-muted)]">{item.subtitle}</div>
                          ) : null}
                        </div>
                        {typeof item.matchScore === "number" ? (
                          <span className="rounded border border-[var(--accent-border)]/30 bg-[var(--accent-text)]/10 px-2 py-1 font-mono text-[10px] text-[var(--accent-text)]">
                            {item.matchScore}% match
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-3 py-3 text-[12px] text-[var(--text-secondary)] leading-relaxed">
                        {item.detail}
                      </div>
                      {item.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.tags.slice(0, 6).map((tag) => (
                            <span
                              key={`${item.id}-${tag}`}
                              className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 flex items-center gap-3">
                        {item.href ? (
                          item.href.startsWith("/") ? (
                            <Link
                              href={item.href}
                              className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-text)] hover:underline"
                            >
                              Open in app
                              <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                            </Link>
                          ) : (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-text)] hover:underline"
                            >
                              Open source
                              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                            </a>
                          )
                        ) : (
                          <span className="font-mono text-[10px] text-[var(--text-muted)]">No direct source link available for this item.</span>
                        )}
                      </div>
                    </article>
                  ))}
                  {filteredItems.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-panel)] px-4 py-6 text-[12px] text-[var(--text-tertiary)]">
                      No evidence items available for this filter yet.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <aside className="hidden xl:flex w-80 shrink-0 border-l border-[var(--border)] bg-[var(--surface-panel)] p-5 flex-col gap-4 overflow-y-auto">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  Evidence & context
                </div>
                <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
                  {featured?.title ?? "No evidence selected"}
                </h2>
                {featured?.subtitle ? (
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">{featured.subtitle}</p>
                ) : null}
              </div>

              {featured ? (
                <>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--content-bg)] p-4">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                      Why this matters
                    </div>
                    <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                      {featured.detail}
                    </div>
                  </div>

                  {featured.tags.length > 0 ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--content-bg)] p-4">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                        Matched context
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {featured.tags.map((tag) => (
                          <span
                            key={`featured-${tag}`}
                            className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--content-bg)] p-4">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
                      Quick actions
                    </div>
                    <div className="flex flex-col gap-2">
                      {featured.href ? (
                        featured.href.startsWith("/") ? (
                          <Link href={featured.href} className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-text)] hover:underline">
                            Open in app
                            <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                          </Link>
                        ) : (
                          <a href={featured.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-text)] hover:underline">
                            Open original source
                            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                          </a>
                        )
                      ) : null}
                      <Link href="/plan" className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-text)] hover:underline">
                        Return to plan
                        <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                      </Link>
                      <Link href="/plan#review-actions" className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-text)] hover:underline">
                        Open review section
                        <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--content-bg)] p-4 text-[12px] text-[var(--text-tertiary)]">
                  Generate a plan first to populate this workspace with live evidence.
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
