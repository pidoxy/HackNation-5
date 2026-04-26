import {
  generateExperimentPlan as generateMockPlan,
  parseHypothesis as parseMockHypothesis,
} from "@/lib/mock-engine";
import { buildSectionCitations } from "@/lib/citations";
import { getLabSettings } from "@/lib/lab-settings-store";
import {
  assessLiteratureQuality,
  mergeLiteratureSignals,
} from "@/lib/literature-qc";
import { groundPlanMaterials } from "@/lib/material-catalog";
import { strengthenGeneratedPlan } from "@/lib/planning-guards";
import {
  generatePlanWithOpenAI,
  parseHypothesisWithOpenAI,
  regeneratePlanSectionWithOpenAI,
} from "@/lib/openai";
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
  Reference,
  RegenerableSection,
  RegenerateSectionResponse,
  ReviewMemoryItem,
} from "@/lib/types";

function normalizeReferences(references: Reference[]): string {
  return references
    .map(
      (reference, index) =>
        `${index + 1}. [${reference.type}] ${reference.title} | ${reference.source} | ${reference.doi}\n${reference.note}\nMatch score: ${reference.matchScore ?? "n/a"}%\nRationale: ${reference.matchRationale ?? "No QC rationale available."}`,
    )
    .join("\n\n");
}

export async function parseHypothesisPlanner(
  hypothesis: string,
): Promise<ParseHypothesisResponse> {
  try {
    return await parseHypothesisWithOpenAI(hypothesis, parseHypothesisSchema);
  } catch {
    return {
      ...parseMockHypothesis(hypothesis),
      generationMode: "fallback",
    };
  }
}

export async function generateExperimentPlanner(
  hypothesis: string,
  reviewMemory: ReviewMemoryItem[] = [],
  labSettings?: LabSettings,
): Promise<GeneratePlanResponse> {
  const fallback = generateMockPlan(hypothesis);

  try {
    const resolvedLabSettings = labSettings ?? (await getLabSettings());
    const parsed = await parseHypothesisPlanner(hypothesis);
    const references = await searchScientificReferences(hypothesis, parsed);
    const literatureQc = assessLiteratureQuality({
      hypothesis,
      parsed,
      references,
    });

    const livePlan = await generatePlanWithOpenAI(
      hypothesis,
      parsed,
      normalizeReferences(literatureQc.references),
      reviewMemory,
      resolvedLabSettings,
      experimentPlanSchema,
    );
    const groundedReferences =
      literatureQc.references.length > 0 ? literatureQc.references : livePlan.references;
    const strengthenedPlan = strengthenGeneratedPlan(livePlan, parsed, groundedReferences);
    const catalogGroundedPlan = groundPlanMaterials(strengthenedPlan, parsed);

    return {
      plan: {
        ...catalogGroundedPlan,
        parsedFields: parsed.parsedFields,
        noveltySignal: literatureQc.noveltySignal,
        references: groundedReferences,
        literatureQc: literatureQc.summary,
        reviewFeedback:
          reviewMemory.length > 0
            ? [...reviewMemory.slice(0, 2), ...catalogGroundedPlan.reviewFeedback].slice(0, 4)
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
    const parsedFallback = parseMockHypothesis(hypothesis);
    const filteredMemory = reviewMemory.filter(
      (item) =>
        item.domain.toLowerCase() === fallback.plan.domain.toLowerCase() ||
        item.domain.toLowerCase() === parsedFallback.domain.toLowerCase(),
    );
    const literatureQc = assessLiteratureQuality({
      hypothesis,
      parsed: parsedFallback,
      references: fallback.plan.references,
    });
    const catalogGroundedPlan = groundPlanMaterials(fallback.plan, parsedFallback);

    return {
      plan: {
        ...catalogGroundedPlan,
        generationMode: "fallback",
        noveltySignal: literatureQc.noveltySignal,
        references: literatureQc.references,
        literatureQc: literatureQc.summary,
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
    const references = await searchScientificReferences(hypothesis, parsed);
    const literatureQc = assessLiteratureQuality({
      hypothesis,
      parsed,
      references: references.length > 0 ? references : plan.references,
    });
    const regeneratedSection = await regeneratePlanSectionWithOpenAI<
      GeneratePlanResponse["plan"][RegenerableSection]
    >({
      section,
      hypothesis,
      parsedHypothesis: parsed,
      currentPlan: plan,
      referencesContext: normalizeReferences(literatureQc.references),
      reviewMemory,
      labSettings: resolvedLabSettings,
      schema: sectionSchemas[section],
    });
    const nextPlan = groundPlanMaterials(
      {
        ...plan,
        [section]: regeneratedSection,
      },
      parsed,
    );

    return {
      plan: {
        ...nextPlan,
        generationMode: "live",
        noveltySignal: literatureQc.noveltySignal,
        references: literatureQc.references,
        literatureQc: literatureQc.summary,
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
    const literatureQc = assessLiteratureQuality({
      hypothesis,
      parsed,
      references: fallbackPlan.references,
    });
    const nextPlan = groundPlanMaterials(
      {
        ...plan,
        [section]: fallbackPlan[section],
      },
      parsed,
    );
    return {
      plan: {
        ...nextPlan,
        generationMode: "fallback",
        noveltySignal: literatureQc.noveltySignal,
        references: literatureQc.references,
        literatureQc: literatureQc.summary,
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
