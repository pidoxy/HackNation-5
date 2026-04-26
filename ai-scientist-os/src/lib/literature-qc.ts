import type {
  HistoricalComparisonSummary,
  LiteratureQcSummary,
  NoveltySignal,
  ParseHypothesisResponse,
  Reference,
  SignalItem,
} from "@/lib/types";

const STOPWORDS = new Set([
  "about",
  "after",
  "against",
  "already",
  "also",
  "among",
  "because",
  "been",
  "between",
  "both",
  "compared",
  "could",
  "does",
  "done",
  "during",
  "each",
  "exists",
  "from",
  "have",
  "improve",
  "improved",
  "improving",
  "into",
  "just",
  "measured",
  "method",
  "methods",
  "might",
  "more",
  "most",
  "other",
  "over",
  "real",
  "same",
  "should",
  "show",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "using",
  "will",
  "with",
  "would",
]);

const EXACT_MATCH_THRESHOLD = 78;
const SIMILAR_MATCH_THRESHOLD = 45;

type TermBuckets = {
  intervention: string[];
  model: string[];
  outcome: string[];
  control: string[];
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9%+\-./\s]/g, " ");
}

function uniqueTerms(text: string, minLength = 4): string[] {
  return [...new Set(
    normalize(text)
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= minLength && !STOPWORDS.has(token)),
  )];
}

function trimTerms(values: string[], count: number): string[] {
  return [...new Set(values)].slice(0, count);
}

function termsForField(parsed: ParseHypothesisResponse, labelNeedles: string[]): string[] {
  return trimTerms(
    parsed.parsedFields
      .filter((field) =>
        labelNeedles.some((needle) => field.label.toLowerCase().includes(needle)),
      )
      .flatMap((field) => uniqueTerms(field.value)),
    6,
  );
}

function buildTermBuckets(
  hypothesis: string,
  parsed: ParseHypothesisResponse,
): TermBuckets {
  return {
    intervention: termsForField(parsed, ["intervention"]).slice(0, 5),
    model: termsForField(parsed, ["model", "system"]).slice(0, 4),
    outcome: termsForField(parsed, ["endpoint", "readout"]).slice(0, 5),
    control: termsForField(parsed, ["control"]).slice(0, 4),
  };
}

function bucketEntries(buckets: TermBuckets) {
  const entries = [
    { label: "intervention", terms: buckets.intervention },
    { label: "model", terms: buckets.model },
    { label: "outcome", terms: buckets.outcome },
    { label: "control", terms: buckets.control },
  ].filter((entry) => entry.terms.length > 0);

  return entries.length > 0
    ? entries
    : [{ label: "hypothesis", terms: trimTerms([
      ...buckets.intervention,
      ...buckets.model,
      ...buckets.outcome,
      ...buckets.control,
    ], 8) }];
}

function includesTerm(text: string, term: string): boolean {
  return text.includes(term.toLowerCase());
}

function referenceTypeBonus(reference: Reference): number {
  const provenanceBonus =
    reference.provenanceLabel === "Recommended protocol repository"
      ? 8
      : reference.provenanceLabel === "Official supplier resource"
        ? 5
        : 0;
  switch (reference.type) {
    case "similarity":
      return 12 + provenanceBonus;
    case "protocol":
      return 8 + provenanceBonus;
    case "conflict":
      return 5 + provenanceBonus;
    case "supplier":
    default:
      return 2 + provenanceBonus;
  }
}

function scoreReference(
  reference: Reference,
  buckets: TermBuckets,
): Reference {
  const titleText = normalize(reference.title);
  const bodyText = normalize(
    [reference.title, reference.note, reference.source, reference.doi].join(" "),
  );
  const entries = bucketEntries(buckets);

  const matchedByBucket = entries.map((entry) => ({
    label: entry.label,
    matched: entry.terms.filter((term) => includesTerm(bodyText, term)),
  }));

  const matchedTerms = [...new Set(
    matchedByBucket.flatMap((entry) => entry.matched),
  )];
  const totalTerms = entries.reduce((sum, entry) => sum + entry.terms.length, 0) || 1;
  const termCoverage = matchedTerms.length / totalTerms;
  const bucketCoverage =
    matchedByBucket.filter((entry) => entry.matched.length > 0).length /
    matchedByBucket.length;
  const titleMatches = matchedTerms.filter((term) => includesTerm(titleText, term)).length;

  const matchScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        termCoverage * 55 +
          bucketCoverage * 25 +
          Math.min(titleMatches, 4) * 3 +
          referenceTypeBonus(reference),
      ),
    ),
  );

  const matchedLabels = matchedByBucket
    .filter((entry) => entry.matched.length > 0)
    .map((entry) => entry.label);
  const matchRationale =
    matchedLabels.length > 0
      ? `Matches ${matchedLabels.join(", ")} terms from the hypothesis.`
      : "Low direct overlap with the hypothesis terms.";
  const relevanceSummary =
    matchedLabels.length > 0
      ? `Relevant because it overlaps with the hypothesis ${matchedLabels.join(", ")} and can inform the proposed design.`
      : reference.relevanceSummary ?? reference.note;

  return {
    ...reference,
    matchScore,
    matchedTerms: matchedTerms.slice(0, 6),
    matchRationale,
    relevanceSummary,
  };
}

function classifyNovelty(scoredReferences: Reference[]): NoveltySignal {
  const top = scoredReferences[0]?.matchScore ?? 0;
  const strongCount = scoredReferences.filter(
    (reference) => (reference.matchScore ?? 0) >= SIMILAR_MATCH_THRESHOLD,
  ).length;
  const exactCandidate = scoredReferences.find(
    (reference) =>
      (reference.matchScore ?? 0) >= EXACT_MATCH_THRESHOLD &&
      reference.type !== "supplier",
  );

  if (exactCandidate) {
    return "exact match found";
  }

  if (top >= SIMILAR_MATCH_THRESHOLD || strongCount >= 2) {
    return "similar work exists";
  }

  return "not found";
}

function selectQcReferences(scoredReferences: Reference[]): Reference[] {
  const ranked = [...scoredReferences].sort(
    (left, right) => (right.matchScore ?? 0) - (left.matchScore ?? 0),
  );
  const primary = ranked.filter((reference) => reference.type !== "supplier");
  const fallback = ranked.filter((reference) => reference.type === "supplier");

  const picks = (primary.length > 0 ? primary : fallback).slice(0, 3);

  return picks.length > 0 ? picks : ranked.slice(0, 3);
}

function buildQcRationale(signal: NoveltySignal, scoredReferences: Reference[]): string {
  const topReference = scoredReferences[0];
  const topScore = topReference?.matchScore ?? 0;

  if (!topReference) {
    return "No relevant literature references were surfaced for the current hypothesis.";
  }

  if (signal === "exact match found") {
    return `The top reference overlaps strongly with the intervention, model, and outcome terms, exceeding the exact-match threshold at ${topScore}%.`;
  }

  if (signal === "similar work exists") {
    return `Related literature was found, but the overlap stays below the exact-match threshold. The strongest nearby study scored ${topScore}% similarity.`;
  }

  return `The retrieved references do not clear the similar-work threshold. The strongest nearby study scored ${topScore}% similarity, which keeps this hypothesis in the novel-work bucket.`;
}

function outcomeSignalForReference(
  reference: Reference,
): "aligned" | "mixed" | "conflicting" {
  const text = normalize(`${reference.title} ${reference.note}`);

  if (reference.type === "conflict" || includesTerm(text, "conflict") || includesTerm(text, "underperform") || includesTerm(text, "fails")) {
    return "conflicting";
  }

  if (
    includesTerm(text, "but") ||
    includesTerm(text, "however") ||
    includesTerm(text, "not specific") ||
    includesTerm(text, "different") ||
    includesTerm(text, "more aggressive")
  ) {
    return "mixed";
  }

  return "aligned";
}

export function buildHistoricalComparison(
  references: Reference[],
): HistoricalComparisonSummary {
  const candidates = references
    .filter((reference) => reference.type === "similarity" || reference.type === "conflict")
    .slice(0, 3)
    .map((reference) => {
      const outcomeSignal = outcomeSignalForReference(reference);
      const takeaway =
        outcomeSignal === "aligned"
          ? "Past study points in the same directional outcome as the current hypothesis."
          : outcomeSignal === "mixed"
            ? "Past study is related, but key conditions or outcomes differ enough to reduce confidence."
            : "Past study suggests the result may diverge from the current hypothesis unless conditions are changed.";

      return {
        title: reference.title,
        source: reference.source,
        doi: reference.doi,
        similarityScore: reference.matchScore ?? 0,
        outcomeSignal,
        takeaway,
      };
    });

  if (candidates.length === 0) {
    return {
      verdict: "limited precedent",
      rationale: "No closely related past study was strong enough to benchmark expected results against.",
      items: [],
    };
  }

  const alignedCount = candidates.filter((item) => item.outcomeSignal === "aligned").length;
  const conflictingCount = candidates.filter((item) => item.outcomeSignal === "conflicting").length;

  if (alignedCount >= 2 && conflictingCount === 0) {
    return {
      verdict: "likely similar",
      rationale: "The strongest prior studies point in a similar direction, so the expected result should broadly resemble published precedent if the protocol is executed well.",
      items: candidates,
    };
  }

  if (conflictingCount > 0 || candidates.some((item) => item.outcomeSignal === "mixed")) {
    return {
      verdict: "mixed precedent",
      rationale: "There is relevant prior work, but the published outcomes are mixed or condition-dependent, so the result may not fully match earlier studies.",
      items: candidates,
    };
  }

  return {
    verdict: "limited precedent",
    rationale: "There is some related literature, but not enough tightly matched precedent to predict that the result will closely mirror prior researchers' outcomes.",
    items: candidates,
  };
}

export function assessLiteratureQuality({
  hypothesis,
  parsed,
  references,
  query,
}: {
  hypothesis: string;
  parsed: ParseHypothesisResponse;
  references: Reference[];
  query?: string;
}): {
  noveltySignal: NoveltySignal;
  references: Reference[];
  summary: LiteratureQcSummary;
} {
  const buckets = buildTermBuckets(hypothesis, parsed);
  const fallbackTerms = trimTerms(uniqueTerms(hypothesis), 8);
  const hydratedBuckets = bucketEntries(buckets)[0]?.terms.length
    ? buckets
    : {
        intervention: fallbackTerms,
        model: [],
        outcome: [],
        control: [],
      };

  const scoredReferences = references
    .map((reference) => scoreReference(reference, hydratedBuckets))
    .sort((left, right) => (right.matchScore ?? 0) - (left.matchScore ?? 0));
  const qcReferences = selectQcReferences(scoredReferences);

  const noveltySignal = classifyNovelty(qcReferences);
  const topReference = qcReferences[0];
  const decisionFactors = [
    `Top literature overlap: ${topReference?.matchScore ?? 0}%`,
    `Similar threshold: ${SIMILAR_MATCH_THRESHOLD}%`,
    `Exact threshold: ${EXACT_MATCH_THRESHOLD}%`,
    `QC references returned: ${qcReferences.length}`,
  ];

  if (topReference?.matchedTerms?.length) {
    decisionFactors.push(`Matched terms: ${topReference.matchedTerms.join(", ")}`);
  }

  return {
    noveltySignal,
    references: qcReferences,
    summary: {
      query:
        query ??
        trimTerms([
          ...hydratedBuckets.intervention,
          ...hydratedBuckets.model,
          ...hydratedBuckets.outcome,
          ...hydratedBuckets.control,
        ], 10).join(" "),
      rationale: buildQcRationale(noveltySignal, qcReferences),
      topMatchScore: topReference?.matchScore ?? 0,
      exactMatchThreshold: EXACT_MATCH_THRESHOLD,
      similarMatchThreshold: SIMILAR_MATCH_THRESHOLD,
      decisionFactors,
    },
  };
}

export function mergeLiteratureSignals(
  signals: SignalItem[],
  summary: LiteratureQcSummary,
  noveltySignal: NoveltySignal,
): SignalItem[] {
  const noveltyLabel =
    noveltySignal === "exact match found"
      ? "Exact match found"
      : noveltySignal === "similar work exists"
        ? "Similar work exists"
        : "Not found";

  const replacements: SignalItem[] = [
    {
      label: "Novelty signal",
      value: noveltyLabel,
      hint: `Thresholded with explicit literature QC scoring.`,
    },
    {
      label: "Top literature match",
      value: `${summary.topMatchScore}%`,
      hint: `Exact >= ${summary.exactMatchThreshold}% | Similar >= ${summary.similarMatchThreshold}%`,
    },
  ];

  const remainder = signals.filter(
    (signal) =>
      signal.label !== "Novelty signal" && signal.label !== "Top literature match",
  );

  return [...replacements, ...remainder].slice(0, 3);
}
