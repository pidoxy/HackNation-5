import type {
  BudgetItem,
  ExperimentPlan,
  MaterialItem,
  ParseHypothesisResponse,
  ProtocolStep,
  Reference,
  TimelineItem,
} from "@/lib/types";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(value: string): string[] {
  return [...new Set(
    normalize(value)
      .split(/\s+/)
      .filter((token) => token.length > 3),
  )];
}

function overlapScore(left: string, right: string): number {
  const leftTokens = tokens(left);
  const normalizedRight = normalize(right);
  return leftTokens.reduce((sum, token) => sum + (normalizedRight.includes(token) ? 1 : 0), 0);
}

function protocolCandidates(references: Reference[]): Reference[] {
  return references.filter((reference) => reference.type === "protocol" || reference.type === "similarity");
}

function extractOperationalCue(reference?: Reference): string | undefined {
  if (!reference?.note) {
    return undefined;
  }

  const cleaned = reference.note
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length === 0) {
    return undefined;
  }

  return cleaned.length > 160 ? `${cleaned.slice(0, 157)}...` : cleaned;
}

function extractParameterCandidates(
  reference: Reference | undefined,
  step: ProtocolStep,
  parsed: ParseHypothesisResponse,
): string[] {
  if (!reference) {
    return [];
  }

  const sourceText = `${reference.title}. ${reference.note}. ${reference.relevanceSummary ?? ""}`;
  const snippets = new Set<string>();
  const patterns = [
    /\b\d+(?:\.\d+)?\s?(?:mM|uM|μM|nM|mg\/mL|mg\/kg|mg\/L|mmol\/L\/day|%|°C|C)\b/gi,
    /\b\d+(?:\.\d+)?\s?(?:hours?|hrs?|minutes?|mins?|days?|weeks?)\b/gi,
    /\b(?:patient-level|scan-level|train\/validation\/test|train\/test|de-identified|confidence intervals?|sensitivity analysis|ablation|baseline|label budget|coulombic efficiency|calibration curve|limit of detection)\b/gi,
    /\b(?:Poisson-Gaussian noise|FITC-dextran|Western blot|qPCR|XRD|SEM|AUROC|AUC|SSIM|PSNR|Dice|IoU)\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of sourceText.matchAll(pattern)) {
      snippets.add(match[0].trim());
      if (snippets.size >= 6) {
        break;
      }
    }
    if (snippets.size >= 6) {
      break;
    }
  }

  const fallbackTerms = [
    ...tokens(`${step.title} ${step.detail}`),
    ...tokens(parsed.parsedFields.map((field) => field.value).join(" ")),
  ]
    .filter((token) => normalize(sourceText).includes(token))
    .slice(0, 4);

  for (const term of fallbackTerms) {
    snippets.add(term);
  }

  return [...snippets].slice(0, 5);
}

function bestGroundingReference(step: ProtocolStep, references: Reference[]): { reference?: Reference; score: number } {
  const ranked = protocolCandidates(references)
    .map((reference) => ({
      reference,
      score:
        overlapScore(
          `${step.title} ${step.detail}`,
          `${reference.title} ${reference.note} ${reference.relevanceSummary ?? ""} ${reference.source}`,
        ) + (reference.type === "protocol" ? 3 : 1),
    }))
    .sort((left, right) => right.score - left.score);

  return ranked[0] ?? { score: 0 };
}

function inferLeadTime(material: MaterialItem, parsed: ParseHypothesisResponse): string {
  const text = normalize(`${material.name} ${material.supplier} ${material.catalogNumber}`);

  if (parsed.experimentFamily === "medical_imaging" || parsed.experimentFamily === "computational_ml") {
    if (text.includes("dataset") || text.includes("pytorch") || text.includes("storage")) return "same day";
    if (text.includes("gpu") || text.includes("compute")) return "same day";
  }

  if (parsed.experimentFamily === "clinical_retrospective") {
    if (text.includes("cohort") || text.includes("secure")) return "2-5 days";
  }

  if (text.includes("core facility") || text.includes("access")) return "2-7 days";
  if (text.includes("antibody") || text.includes("kit") || text.includes("culture")) return "3-7 days";
  if (text.includes("reagent") || text.includes("buffer") || text.includes("consumable")) return "2-5 days";

  return "1-5 days";
}

function stepDependencyTitles(steps: ProtocolStep[], index: number): string[] {
  if (index === 0) {
    return ["Hypothesis lock and control definition"];
  }

  return [steps[index - 1].title];
}

function ensureOperationalBackfills(
  materials: MaterialItem[],
  parsed: ParseHypothesisResponse,
  protocol: ProtocolStep[],
): MaterialItem[] {
  const combined = normalize(
    materials.map((item) => `${item.name} ${item.supplier} ${item.catalogNumber}`).join(" "),
  );
  const protocolText = normalize(protocol.map((step) => `${step.title} ${step.detail}`).join(" "));
  const next = [...materials];

  function addIfMissing(candidate: MaterialItem, needles: string[]) {
    if (needles.some((needle) => combined.includes(normalize(needle)))) {
      return;
    }

    next.push(candidate);
  }

  if (parsed.experimentFamily === "medical_imaging" || parsed.experimentFamily === "computational_ml") {
    addIfMissing(
      {
        name: "Dataset or benchmark access",
        supplier: "Public or institutional data host",
        catalogNumber: "DATA-ACCESS-01",
        quantity: "1 dataset",
        estimatedCost: "$0",
        usageNote: "Required to reproduce the benchmark split and evaluation context.",
      },
      ["dataset", "benchmark access", "data host"],
    );
    addIfMissing(
      {
        name: "GPU runtime",
        supplier: "Cloud or institutional compute",
        catalogNumber: "GPU-COMPUTE-01",
        quantity: "40-80 GPU-hours",
        estimatedCost: "$220",
        usageNote: "Required for model training, ablations, and repeated runs.",
      },
      ["gpu", "compute"],
    );
    addIfMissing(
      {
        name: "Experiment tracking and checkpoint storage",
        supplier: "Weights & Biases / MLflow / storage",
        catalogNumber: "TRACK-01",
        quantity: "1 workspace",
        estimatedCost: "$60",
        usageNote: "Required for reproducibility, checkpointing, and audit trail.",
      },
      ["tracking", "checkpoint", "storage"],
    );
  }

  if (parsed.experimentFamily === "clinical_retrospective") {
    addIfMissing(
      {
        name: "Secure analytics workspace",
        supplier: "Institutional secure compute",
        catalogNumber: "SECURE-ANALYTICS-01",
        quantity: "1 workspace",
        estimatedCost: "$120",
        usageNote: "Required for de-identified data handling and analyst audit trail.",
      },
      ["secure", "analytics workspace"],
    );
  }

  if (parsed.experimentFamily === "materials_chemistry" && protocolText.includes("character")) {
    addIfMissing(
      {
        name: "Characterization instrument access",
        supplier: "Institutional core facility",
        catalogNumber: "CHAR-ACCESS-01",
        quantity: "1 booking block",
        estimatedCost: "$280",
        usageNote: "Required for structural or morphology confirmation.",
      },
      ["xrd", "sem", "characterization"],
    );
  }

  return next;
}

function annotateProtocolSteps(
  protocol: ProtocolStep[],
  references: Reference[],
  parsed: ParseHypothesisResponse,
): ProtocolStep[] {
  return protocol.map((step, index, steps) => {
    const best = bestGroundingReference(step, references);
    const status =
      best.reference && best.score >= 5
        ? best.reference.type === "protocol"
          ? "grounded"
          : "adapted"
        : "inferred";

    return {
      ...step,
      groundingStatus: status,
      groundingSourceTitle: best.reference?.title,
      groundingSourceDoi: best.reference?.doi,
      groundingSourceUrl: best.reference?.sourceUrl,
      operationalNote: status !== "inferred" ? extractOperationalCue(best.reference) : undefined,
      extractedParameters:
        status !== "inferred"
          ? extractParameterCandidates(best.reference, step, parsed)
          : undefined,
      dependencies: step.dependencies?.length ? step.dependencies : stepDependencyTitles(steps, index),
    };
  });
}

function annotateMaterials(
  materials: MaterialItem[],
  protocol: ProtocolStep[],
  parsed: ParseHypothesisResponse,
): MaterialItem[] {
  return materials.map((material) => {
    const requiredForSteps = protocol
      .filter((step) => {
        const score = overlapScore(
          `${material.name} ${material.supplier} ${material.catalogNumber}`,
          `${step.title} ${step.detail}`,
        );
        return score > 0;
      })
      .map((step) => step.title)
      .slice(0, 3);

    return {
      ...material,
      requiredForSteps,
      leadTime: material.leadTime ?? inferLeadTime(material, parsed),
      usageNote:
        material.usageNote ??
        (requiredForSteps.length > 0
          ? `Supports ${requiredForSteps.join(", ")}.`
          : "Operational item inferred from the protocol and route-specific execution needs."),
    };
  });
}

function annotateProtocolInputs(protocol: ProtocolStep[], materials: MaterialItem[]): ProtocolStep[] {
  return protocol.map((step) => {
    const criticalInputs = materials
      .filter((material) => overlapScore(`${material.name} ${material.catalogNumber}`, `${step.title} ${step.detail}`) > 0)
      .map((material) => material.name)
      .slice(0, 4);

    return {
      ...step,
      criticalInputs,
    };
  });
}

function annotateBudget(budget: BudgetItem[], materials: MaterialItem[], protocol: ProtocolStep[]): BudgetItem[] {
  return budget.map((item) => {
    const relatedMaterials = materials
      .filter((material) => overlapScore(item.item, `${material.name} ${material.supplier}`) > 0)
      .map((material) => material.name)
      .slice(0, 3);
    const relatedSteps = protocol
      .filter((step) => overlapScore(item.item, `${step.title} ${step.detail}`) > 0)
      .map((step) => step.title)
      .slice(0, 2);

    return {
      ...item,
      basis:
        item.basis ??
        (relatedMaterials.length > 0
          ? `Cost basis: ${relatedMaterials.join(", ")}.`
          : "Cost basis: line-item estimate derived from the protocol phase and required resources."),
      dependsOn: relatedSteps,
    };
  });
}

function annotateTimeline(timeline: TimelineItem[], protocol: ProtocolStep[]): TimelineItem[] {
  return timeline.map((item, index) => ({
    ...item,
    dependencies:
      item.dependencies?.length
        ? item.dependencies
        : index === 0
          ? ["Protocol lock", protocol[0]?.title].filter(Boolean) as string[]
          : [timeline[index - 1]?.phase, protocol[Math.min(index, protocol.length - 1)]?.title].filter(Boolean) as string[],
    deliverable:
      item.deliverable ??
      (index === timeline.length - 1
        ? "Decision-ready validation package"
        : "Phase completion with required inputs ready for the next step"),
  }));
}

export function groundProtocolAndComposePlan(
  plan: ExperimentPlan,
  parsed: ParseHypothesisResponse,
  references: Reference[],
): ExperimentPlan {
  const groundedProtocol = annotateProtocolSteps(plan.protocol, references, parsed);
  const protocolAwareMaterials = ensureOperationalBackfills(plan.materials, parsed, groundedProtocol);
  const annotatedMaterials = annotateMaterials(protocolAwareMaterials, groundedProtocol, parsed);
  const protocolWithInputs = annotateProtocolInputs(groundedProtocol, annotatedMaterials);
  const annotatedBudget = annotateBudget(plan.budget, annotatedMaterials, protocolWithInputs);
  const annotatedTimeline = annotateTimeline(plan.timeline, protocolWithInputs);

  return {
    ...plan,
    protocol: protocolWithInputs,
    materials: annotatedMaterials,
    budget: annotatedBudget,
    timeline: annotatedTimeline,
  };
}
