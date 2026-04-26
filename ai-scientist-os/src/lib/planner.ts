import {
  generateExperimentPlan as generateMockPlan,
  parseHypothesis as parseMockHypothesis,
} from "@/lib/mock-engine";
import { buildSectionCitations } from "@/lib/citations";
import { getLabSettings } from "@/lib/lab-settings-store";
import {
  assessLiteratureQuality,
  buildHistoricalComparison,
  mergeLiteratureSignals,
} from "@/lib/literature-qc";
import { groundPlanMaterials } from "@/lib/material-catalog";
import { groundProtocolAndComposePlan } from "@/lib/protocol-grounding";
import {
  selectRelevantReviewMemory,
  assessRunnability,
  summarizeMemoryImpact,
  validateExperimentPlan,
} from "@/lib/plan-quality";
import { strengthenGeneratedPlan } from "@/lib/planning-guards";
import {
  generatePlanWithOpenAI,
  parseHypothesisWithOpenAI,
  regeneratePlanSectionWithOpenAI,
} from "@/lib/openai";
import { classifyResearchRoute } from "@/lib/research-router";
import {
  experimentPlanSchema,
  parseHypothesisSchema,
  sectionSchemas,
} from "@/lib/schemas";
import { searchScientificReferences } from "@/lib/tavily";
import type {
  GeneratePlanResponse,
  LabSettings,
  ParseHypothesisResponse,
  QualityCheck,
  Reference,
  RegenerableSection,
  RegenerateSectionResponse,
  ReviewMemoryItem,
} from "@/lib/types";

function normalizeReferences(references: Reference[]): string {
  return references
    .map(
      (reference, index) =>
        `${index + 1}. [${reference.type}] ${reference.title} | ${reference.source} | ${reference.doi}\n${reference.note}\nRepository: ${reference.repository ?? reference.source}\nProvenance: ${reference.provenanceLabel ?? "Scientific literature source"}\nMatch score: ${reference.matchScore ?? "n/a"}%\nRationale: ${reference.matchRationale ?? "No QC rationale available."}`,
    )
    .join("\n\n");
}

function routeQualityCheck(parsed: ParseHypothesisResponse): QualityCheck | null {
  if (!parsed.routeSupported) {
    return {
      label: "Route confidence",
      status: "warn",
      detail: `This hypothesis was routed to ${parsed.experimentFamily}, but the planner does not yet have a strongly validated template for it. Scientist review is strongly recommended.`,
    };
  }

  if (parsed.routingConfidence < 60) {
    return {
      label: "Route confidence",
      status: "warn",
      detail: `The router selected ${parsed.experimentFamily} with ${parsed.routingConfidence}% confidence. The plan should be treated as a best-effort draft and checked carefully.`,
    };
  }

  return null;
}

export async function parseHypothesisPlanner(
  hypothesis: string,
): Promise<ParseHypothesisResponse> {
  const route = classifyResearchRoute(hypothesis);

  try {
    const parsed = await parseHypothesisWithOpenAI(hypothesis, parseHypothesisSchema, route);
    return {
      hypothesis,
      generationMode: "live",
      ...parsed,
      experimentFamily: route.family,
      routingConfidence: route.confidence,
      routingReason: route.reason,
      routeSupported: route.supported,
    };
  } catch {
    return {
      ...parseMockHypothesis(hypothesis),
      generationMode: "fallback",
      experimentFamily: route.family,
      routingConfidence: route.confidence,
      routingReason: route.reason,
      routeSupported: route.supported,
    };
  }
}

export async function generateExperimentPlanner(
  hypothesis: string,
  parsedOverride?: ParseHypothesisResponse,
  reviewMemory: ReviewMemoryItem[] = [],
  labSettings?: LabSettings,
): Promise<GeneratePlanResponse> {
  const fallback = generateMockPlan(hypothesis);

  try {
    const resolvedLabSettings = labSettings ?? (await getLabSettings());
    const parsed = parsedOverride ?? (await parseHypothesisPlanner(hypothesis));
    const relevantReviewMemory = selectRelevantReviewMemory({
      parsed,
      reviewMemory,
      limit: 4,
    }).map((entry) => entry.item);
    const references = await searchScientificReferences(hypothesis, parsed, relevantReviewMemory);
    const literatureQc = assessLiteratureQuality({
      hypothesis,
      parsed,
      references,
    });
    const historicalComparison = buildHistoricalComparison(literatureQc.references);

    const livePlan = await generatePlanWithOpenAI(
      hypothesis,
      parsed,
      normalizeReferences(literatureQc.references),
      relevantReviewMemory,
      resolvedLabSettings,
      experimentPlanSchema,
    );
    const groundedReferences =
      literatureQc.references.length > 0 ? literatureQc.references : livePlan.references;
    const strengthenedPlan = strengthenGeneratedPlan(livePlan, parsed, groundedReferences);
    const protocolGroundedPlan = groundProtocolAndComposePlan(strengthenedPlan, parsed, groundedReferences);
    const catalogGroundedPlan = groundPlanMaterials(protocolGroundedPlan, parsed);
    const memoryImpact = summarizeMemoryImpact({
      plan: catalogGroundedPlan,
      parsed,
      reviewMemory: relevantReviewMemory,
    });
    const qualityChecks = [
      ...validateExperimentPlan(catalogGroundedPlan, parsed),
      ...[routeQualityCheck(parsed)].filter((item): item is QualityCheck => Boolean(item)),
    ];
    const runnability = assessRunnability(qualityChecks);

    return {
      plan: {
        ...catalogGroundedPlan,
        parsedFields: parsed.parsedFields,
        experimentFamily: parsed.experimentFamily,
        routeSupported: parsed.routeSupported,
        routingConfidence: parsed.routingConfidence,
        routingReason: parsed.routingReason,
        noveltySignal: literatureQc.noveltySignal,
        references: groundedReferences,
        literatureQc: literatureQc.summary,
        historicalComparison,
        memoryImpact,
        qualityChecks,
        runnabilityStatus: runnability.status,
        runnabilitySummary: runnability.summary,
        reviewFeedback:
          relevantReviewMemory.length > 0
            ? [...relevantReviewMemory.slice(0, 2), ...catalogGroundedPlan.reviewFeedback].slice(0, 4)
            : catalogGroundedPlan.reviewFeedback,
        signals: mergeLiteratureSignals(
          catalogGroundedPlan.signals,
          literatureQc.summary,
          literatureQc.noveltySignal,
        ),
        sectionCitations: buildSectionCitations(
          groundedReferences,
        ),
      },
    };
  } catch {
    const parsedFallback = parsedOverride ?? parseMockHypothesis(hypothesis);
    const route = classifyResearchRoute(hypothesis);
    const filteredMemory = selectRelevantReviewMemory({
      parsed: parsedFallback,
      reviewMemory,
      limit: 4,
    }).map((entry) => entry.item);
    const literatureQc = assessLiteratureQuality({
      hypothesis,
      parsed: parsedFallback,
      references: fallback.plan.references,
    });
    const historicalComparison = buildHistoricalComparison(literatureQc.references);
    const protocolGroundedPlan = groundProtocolAndComposePlan(fallback.plan, parsedFallback, literatureQc.references);
    const catalogGroundedPlan = groundPlanMaterials(protocolGroundedPlan, parsedFallback);
    const memoryImpact = summarizeMemoryImpact({
      plan: catalogGroundedPlan,
      parsed: parsedFallback,
      reviewMemory: filteredMemory,
    });
    const qualityChecks = [
      ...validateExperimentPlan(catalogGroundedPlan, parsedFallback),
      ...[routeQualityCheck({
        ...parsedFallback,
        experimentFamily: route.family,
        routingConfidence: route.confidence,
        routingReason: route.reason,
        routeSupported: route.supported,
      })].filter((item): item is QualityCheck => Boolean(item)),
    ];
    const runnability = assessRunnability(qualityChecks);

    return {
      plan: {
        ...catalogGroundedPlan,
        generationMode: "fallback",
        experimentFamily: route.family,
        routeSupported: route.supported,
        routingConfidence: route.confidence,
        routingReason: route.reason,
        noveltySignal: literatureQc.noveltySignal,
        references: literatureQc.references,
        literatureQc: literatureQc.summary,
        historicalComparison,
        memoryImpact,
        qualityChecks,
        runnabilityStatus: runnability.status,
        runnabilitySummary: runnability.summary,
        reviewFeedback:
          filteredMemory.length > 0
            ? [...filteredMemory.slice(0, 2), ...catalogGroundedPlan.reviewFeedback].slice(0, 4)
            : catalogGroundedPlan.reviewFeedback,
        signals: mergeLiteratureSignals(
          catalogGroundedPlan.signals,
          literatureQc.summary,
          literatureQc.noveltySignal,
        ),
        sectionCitations: buildSectionCitations(literatureQc.references),
      },
    };
  }
}

export async function regenerateSectionPlanner({
  section,
  hypothesis,
  parsed,
  plan,
  reviewMemory = [],
  labSettings,
}: {
  section: RegenerableSection;
  hypothesis: string;
  parsed: ParseHypothesisResponse;
  plan: GeneratePlanResponse["plan"];
  reviewMemory?: ReviewMemoryItem[];
  labSettings?: LabSettings;
}): Promise<RegenerateSectionResponse> {
  const fallbackPlan = generateMockPlan(hypothesis).plan;

  try {
    const resolvedLabSettings = labSettings ?? (await getLabSettings());
    const relevantReviewMemory = selectRelevantReviewMemory({
      parsed,
      reviewMemory,
      limit: 4,
    }).map((entry) => entry.item);
    const references = await searchScientificReferences(hypothesis, parsed, relevantReviewMemory);
    const literatureQc = assessLiteratureQuality({
      hypothesis,
      parsed,
      references: references.length > 0 ? references : plan.references,
    });
    const historicalComparison = buildHistoricalComparison(literatureQc.references);
    const regeneratedSection = await regeneratePlanSectionWithOpenAI<
      GeneratePlanResponse["plan"][RegenerableSection]
    >({
        section,
        hypothesis,
        parsedHypothesis: parsed,
        currentPlan: plan,
        referencesContext: normalizeReferences(literatureQc.references),
        reviewMemory: relevantReviewMemory,
        labSettings: resolvedLabSettings,
        schema: sectionSchemas[section],
    });
    const nextPlan = groundPlanMaterials(
      groundProtocolAndComposePlan(
        {
          ...plan,
          [section]: regeneratedSection,
        },
        parsed,
        literatureQc.references,
      ),
      parsed,
    );
    const memoryImpact = summarizeMemoryImpact({
      plan: nextPlan,
      parsed,
      reviewMemory: relevantReviewMemory,
    });
    const qualityChecks = [
      ...validateExperimentPlan(nextPlan, parsed),
      ...[routeQualityCheck(parsed)].filter((item): item is QualityCheck => Boolean(item)),
    ];
    const runnability = assessRunnability(qualityChecks);

    return {
      plan: {
        ...nextPlan,
        generationMode: "live",
        experimentFamily: parsed.experimentFamily,
        routeSupported: parsed.routeSupported,
        routingConfidence: parsed.routingConfidence,
        routingReason: parsed.routingReason,
        noveltySignal: literatureQc.noveltySignal,
        references: literatureQc.references,
        literatureQc: literatureQc.summary,
        historicalComparison,
        memoryImpact,
        qualityChecks,
        runnabilityStatus: runnability.status,
        runnabilitySummary: runnability.summary,
        signals: mergeLiteratureSignals(
          nextPlan.signals,
          literatureQc.summary,
          literatureQc.noveltySignal,
        ),
        sectionCitations: {
          ...plan.sectionCitations,
          [section]: buildSectionCitations(literatureQc.references)[section],
        },
      },
    };
  } catch {
    const relevantReviewMemory = selectRelevantReviewMemory({
      parsed,
      reviewMemory,
      limit: 4,
    }).map((entry) => entry.item);
    const literatureQc = assessLiteratureQuality({
      hypothesis,
      parsed,
      references: fallbackPlan.references,
    });
    const historicalComparison = buildHistoricalComparison(literatureQc.references);
    const nextPlan = groundPlanMaterials(
      groundProtocolAndComposePlan(
        {
          ...plan,
          [section]: fallbackPlan[section],
        },
        parsed,
        literatureQc.references,
      ),
      parsed,
    );
    const memoryImpact = summarizeMemoryImpact({
      plan: nextPlan,
      parsed,
      reviewMemory: relevantReviewMemory,
    });
    const qualityChecks = [
      ...validateExperimentPlan(nextPlan, parsed),
      ...[routeQualityCheck(parsed)].filter((item): item is QualityCheck => Boolean(item)),
    ];
    const runnability = assessRunnability(qualityChecks);
    return {
      plan: {
        ...nextPlan,
        generationMode: "fallback",
        experimentFamily: parsed.experimentFamily,
        routeSupported: parsed.routeSupported,
        routingConfidence: parsed.routingConfidence,
        routingReason: parsed.routingReason,
        noveltySignal: literatureQc.noveltySignal,
        references: literatureQc.references,
        literatureQc: literatureQc.summary,
        historicalComparison,
        memoryImpact,
        qualityChecks,
        runnabilityStatus: runnability.status,
        runnabilitySummary: runnability.summary,
        signals: mergeLiteratureSignals(
          nextPlan.signals,
          literatureQc.summary,
          literatureQc.noveltySignal,
        ),
        sectionCitations: {
          ...plan.sectionCitations,
          [section]: buildSectionCitations(literatureQc.references)[section],
        },
      },
    };
  }
}
