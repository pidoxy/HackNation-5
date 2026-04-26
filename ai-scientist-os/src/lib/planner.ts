import {
  generateExperimentPlan as generateMockPlan,
  parseHypothesis as parseMockHypothesis,
} from "@/lib/mock-engine";
import { buildSectionCitations } from "@/lib/citations";
import { getLabSettings } from "@/lib/lab-settings-store";
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
        `${index + 1}. [${reference.type}] ${reference.title} | ${reference.source} | ${reference.doi}\n${reference.note}`,
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

    const livePlan = await generatePlanWithOpenAI(
      hypothesis,
      parsed,
      normalizeReferences(references),
      reviewMemory,
      resolvedLabSettings,
      experimentPlanSchema,
    );
    const groundedReferences = references.length > 0 ? references : livePlan.references;
    const strengthenedPlan = strengthenGeneratedPlan(livePlan, parsed, groundedReferences);

    return {
      plan: {
        ...strengthenedPlan,
        parsedFields: parsed.parsedFields,
        references: groundedReferences,
        reviewFeedback:
          reviewMemory.length > 0
            ? [...reviewMemory.slice(0, 2), ...strengthenedPlan.reviewFeedback].slice(0, 4)
            : strengthenedPlan.reviewFeedback,
        sectionCitations: buildSectionCitations(
          groundedReferences,
        ),
      },
    };
  } catch {
    const filteredMemory = reviewMemory.filter(
      (item) =>
        item.domain.toLowerCase() === fallback.plan.domain.toLowerCase() ||
        item.domain.toLowerCase() === parseMockHypothesis(hypothesis).domain.toLowerCase(),
    );

    return {
      plan: {
        ...fallback.plan,
        generationMode: "fallback",
        reviewFeedback:
          filteredMemory.length > 0
            ? [...filteredMemory.slice(0, 2), ...fallback.plan.reviewFeedback].slice(0, 4)
            : fallback.plan.reviewFeedback,
        sectionCitations: buildSectionCitations(fallback.plan.references),
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
    const regeneratedSection = await regeneratePlanSectionWithOpenAI<
      GeneratePlanResponse["plan"][RegenerableSection]
    >({
      section,
      hypothesis,
      parsedHypothesis: parsed,
      currentPlan: plan,
      referencesContext: normalizeReferences(references.length > 0 ? references : plan.references),
      reviewMemory,
      labSettings: resolvedLabSettings,
      schema: sectionSchemas[section],
    });

    return {
      plan: {
        ...plan,
        [section]: regeneratedSection,
        generationMode: "live",
        sectionCitations: {
          ...plan.sectionCitations,
          [section]: buildSectionCitations(
            references.length > 0 ? references : plan.references,
          )[section],
        },
      },
    };
  } catch {
    return {
      plan: {
        ...plan,
        [section]: fallbackPlan[section],
        generationMode: "fallback",
        sectionCitations: {
          ...plan.sectionCitations,
          [section]: fallbackPlan.sectionCitations[section],
        },
      },
    };
  }
}
