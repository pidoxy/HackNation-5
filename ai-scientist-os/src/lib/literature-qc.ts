import type {
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
  switch (reference.type) {
    case "similarity":
      return 12;
    case "protocol":
      return 8;
    case "conflict":
      return 5;
    case "supplier":
    default:
      return 2;
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

  return {
    ...reference,
    matchScore,
    matchedTerms: matchedTerms.slice(0, 6),
    matchRationale,
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

  const noveltySignal = classifyNovelty(scoredReferences);
  const topReference = scoredReferences[0];
  const decisionFactors = [
    `Top literature overlap: ${topReference?.matchScore ?? 0}%`,
    `Similar threshold: ${SIMILAR_MATCH_THRESHOLD}%`,
    `Exact threshold: ${EXACT_MATCH_THRESHOLD}%`,
  ];

  if (topReference?.matchedTerms?.length) {
    decisionFactors.push(`Matched terms: ${topReference.matchedTerms.join(", ")}`);
  }

  return {
    noveltySignal,
    references: scoredReferences,
    summary: {
      query:
        query ??
        trimTerms([
          ...hydratedBuckets.intervention,
          ...hydratedBuckets.model,
          ...hydratedBuckets.outcome,
          ...hydratedBuckets.control,
        ], 10).join(" "),
      rationale: buildQcRationale(noveltySignal, scoredReferences),
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
