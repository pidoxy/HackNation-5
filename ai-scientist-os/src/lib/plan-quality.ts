import type {
  ExperimentPlan,
  MemoryImpactSummary,
  ParseHypothesisResponse,
  QualityCheck,
  ReviewMemoryItem,
} from "@/lib/types";

export interface ReviewMemoryMatch {
  item: ReviewMemoryItem;
  score: number;
  reasons: string[];
}

export interface RunnabilityAssessment {
  status: "draft" | "scientist_review_required" | "runnable";
  summary: string;
}

function normalize(value: string): string {
  return value.toLowerCase();
}

function includesAny(text: string, keywords: string[]): boolean {
  const normalized = normalize(text);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

function totalBudget(plan: ExperimentPlan): number {
  return plan.budget.reduce((sum, item) => {
    const parsed = Number.parseFloat(item.amount.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? sum + parsed : sum;
  }, 0);
}

function joinedPlanText(plan: ExperimentPlan): string {
  return [
    plan.title,
    plan.domain,
    ...plan.protocol.map((step) => `${step.title} ${step.detail}`),
    ...plan.materials.map((item) => `${item.name} ${item.supplier} ${item.catalogNumber}`),
    ...plan.timeline.map((item) => `${item.phase} ${item.action}`),
    ...plan.validation,
  ].join("\n");
}

function protocolRepositoryCheck(plan: ExperimentPlan, parsed: ParseHypothesisResponse): QualityCheck {
  const domain =
    parsed.experimentFamily === "medical_imaging" || parsed.experimentFamily === "computational_ml"
      ? "imaging"
      : parsed.experimentFamily === "clinical_retrospective"
        ? "clinical"
        : parsed.experimentFamily === "materials_chemistry"
          ? "materials"
      : normalize(parsed.domain);
  if (domain.includes("imaging") || domain.includes("radiology")) {
    const hasMethodGrounding = plan.references.some((reference) =>
      includesAny(`${reference.source} ${reference.repository ?? ""}`, ["arxiv", "pubmed", "pmc", "nature"]),
    );

    return hasMethodGrounding
      ? {
          label: "Method grounding",
          status: "pass",
          detail: "At least one imaging-method reference comes from arXiv, PubMed, PMC, or another scientific literature source.",
        }
      : {
          label: "Method grounding",
          status: "warn",
          detail: "No imaging-method reference was tied to arXiv, PubMed, PMC, or another strong literature source.",
        };
  }

  if (domain.includes("clinical")) {
    const hasClinicalGrounding = plan.references.some((reference) =>
      includesAny(`${reference.title} ${reference.source} ${reference.repository ?? ""}`, [
        "strobe",
        "tripod",
        "bmj",
        "clinical",
        "cohort",
      ]),
    );

    return hasClinicalGrounding
      ? {
          label: "Clinical-study grounding",
          status: "pass",
          detail: "At least one reference grounds the retrospective study against accepted clinical reporting or cohort-design guidance.",
        }
      : {
          label: "Clinical-study grounding",
          status: "warn",
          detail: "Retrospective plans should reference cohort-design or reporting guidance such as STROBE or equivalent standards.",
        };
  }

  if (domain.includes("materials")) {
    const hasMaterialsGrounding = plan.references.some((reference) =>
      includesAny(`${reference.title} ${reference.source} ${reference.repository ?? ""}`, [
        "xrd",
        "sem",
        "materials",
        "characterization",
        "synthesis",
      ]),
    );

    return hasMaterialsGrounding
      ? {
          label: "Materials grounding",
          status: "pass",
          detail: "At least one reference grounds the synthesis or characterization workflow in materials-specific literature.",
        }
      : {
          label: "Materials grounding",
          status: "warn",
          detail: "Materials plans should reference synthesis or characterization literature rather than generic lab text.",
        };
  }

  const preferredRepos = ["protocols.io", "bio-protocol.org", "nature.com", "jove.com", "openwetware.org"];
  const hasPreferredProtocol = plan.references.some(
    (reference) =>
      reference.type === "protocol" &&
      preferredRepos.some((repo) =>
        normalize(reference.source).includes(repo) ||
        normalize(reference.repository ?? "").includes(repo),
      ),
  );

  return hasPreferredProtocol
    ? {
        label: "Protocol grounding",
        status: "pass",
        detail: "At least one protocol reference comes from a recommended repository.",
      }
    : {
        label: "Protocol grounding",
        status: "warn",
        detail: "No protocol reference was tied to protocols.io, Bio-protocol, Nature Protocols, JoVE, or OpenWetWare.",
      };
}

function domainCoverageChecks(plan: ExperimentPlan, parsed: ParseHypothesisResponse): QualityCheck[] {
  const domain =
    parsed.experimentFamily === "medical_imaging" || parsed.experimentFamily === "computational_ml"
      ? "imaging"
      : normalize(parsed.domain);
  const text = joinedPlanText(plan);
  const checks: QualityCheck[] = [];

  if (domain.includes("diagnostic")) {
    checks.push(
      includesAny(text, ["calibration", "limit of detection", "lod", "elisa"])
        ? { label: "Diagnostics readouts", status: "pass", detail: "Calibration and benchmark assay language are present." }
        : { label: "Diagnostics readouts", status: "fail", detail: "Diagnostics plans should include calibration / detection limit work and an ELISA or reference benchmark." },
    );
  }

  if (domain.includes("gut")) {
    checks.push(
      includesAny(text, ["fitc-dextran", "fd4", "occludin", "claudin"])
        ? { label: "Gut barrier markers", status: "pass", detail: "Barrier permeability and tight-junction markers are covered." }
        : { label: "Gut barrier markers", status: "fail", detail: "Gut-health plans should include FITC-dextran plus claudin/occludin follow-up." },
    );
  }

  if (domain.includes("cell")) {
    checks.push(
      includesAny(text, ["trypan blue", "post-thaw viability", "recovery", "cryovial"])
        ? { label: "Cryopreservation readouts", status: "pass", detail: "Immediate viability and recovery checks are present." }
        : { label: "Cryopreservation readouts", status: "fail", detail: "Cell plans should include post-thaw viability plus recovery / replating readouts." },
    );
  }

  if (domain.includes("climate")) {
    checks.push(
      includesAny(text, ["coulombic efficiency", "acetate", "reference electrode", "cathode"])
        ? { label: "Electrochemical controls", status: "pass", detail: "Core reactor hardware and electrochemical readouts are present." }
        : { label: "Electrochemical controls", status: "fail", detail: "Climate-tech plans should include cathode hardware, reference electrode, acetate output, and coulombic efficiency." },
    );
  }

  if (domain.includes("imaging") || domain.includes("radiology")) {
    const segmentationAware = includesAny(text, ["segmentation", "dice", "iou", "vessel", "topology"]);
    const denoisingAware = includesAny(text, ["ssim", "psnr", "denoising", "noise simulation", "low-dose"]);
    checks.push(
      segmentationAware || denoisingAware || includesAny(text, ["auc", "accuracy", "sensitivity", "specificity"])
        ? { label: "Imaging metrics", status: "pass", detail: "The plan covers task-appropriate imaging metrics for segmentation, denoising, or downstream prediction." }
        : { label: "Imaging metrics", status: "fail", detail: "Medical-imaging plans should include task-appropriate metrics such as Dice/IoU, SSIM/PSNR, or downstream diagnostic evaluation." },
    );
    checks.push(
      includesAny(text, ["dataset", "split", "modality", "oct", "octa", "x-ray", "x ray", "mri", "ct", "ultrasound", "label budget", "noise simulation"])
        ? { label: "Imaging realism", status: "pass", detail: "The plan includes modality, dataset, and evaluation context for a realistic imaging benchmark." }
        : { label: "Imaging realism", status: "fail", detail: "Medical-imaging plans should define modality, dataset context, and the relevant evaluation or label-budget setup explicitly." },
    );
    checks.push(
      includesAny(text, ["topology", "structure preservation", "vessel continuity", "qualitative review", "masking"])
        ? { label: "Structure preservation", status: "pass", detail: "The plan checks whether the method preserves medically relevant structure rather than only improving a scalar score." }
        : { label: "Structure preservation", status: "warn", detail: "Imaging plans should verify that improvements preserve clinically relevant structure, especially for vessel or anatomy-focused tasks." },
    );
  }

  if (domain.includes("clinical")) {
    checks.push(
      includesAny(text, ["inclusion", "exclusion", "cohort", "de-identified", "confounder"])
        ? { label: "Clinical cohort design", status: "pass", detail: "The plan defines cohort logic, de-identification, or confounder handling." }
        : { label: "Clinical cohort design", status: "fail", detail: "Retrospective plans should define cohort selection, de-identification, and confounder handling explicitly." },
    );
    checks.push(
      includesAny(text, ["confidence interval", "calibration", "sensitivity analysis", "subgroup"])
        ? { label: "Clinical validation", status: "pass", detail: "The plan includes uncertainty, calibration, or sensitivity-analysis language." }
        : { label: "Clinical validation", status: "fail", detail: "Retrospective plans should report uncertainty and sensitivity or subgroup validation." },
    );
  }

  if (domain.includes("materials")) {
    checks.push(
      includesAny(text, ["xrd", "sem", "ftir", "uv-vis", "characterization"])
        ? { label: "Characterization coverage", status: "pass", detail: "The plan includes structure or morphology characterization methods." }
        : { label: "Characterization coverage", status: "fail", detail: "Materials plans should include at least one structural and one complementary characterization method." },
    );
    checks.push(
      includesAny(text, ["repeat", "reproducibility", "stability", "baseline formulation"])
        ? { label: "Materials reproducibility", status: "pass", detail: "The plan includes repeat synthesis, baseline comparison, or stability language." }
        : { label: "Materials reproducibility", status: "fail", detail: "Materials plans should check repeat synthesis and stability rather than relying on a single batch." },
    );
  }

  return checks;
}

function concentrationChecks(plan: ExperimentPlan): QualityCheck[] {
  const text = joinedPlanText(plan);
  const pattern = /(\d+(?:\.\d+)?)\s?(mM|uM|μM|nM|%|mg\/mL|mg\/kg)/gi;
  const findings: QualityCheck[] = [];

  for (const match of text.matchAll(pattern)) {
    const value = Number.parseFloat(match[1]);
    const unit = match[2];

    if (!Number.isFinite(value)) {
      continue;
    }

    if (unit === "%" && value > 100) {
      findings.push({
        label: "Concentration sanity",
        status: "fail",
        detail: `Detected ${value}${unit}, which exceeds 100% and is likely invalid.`,
      });
    } else if ((unit === "mM" && value > 1000) || ((unit === "uM" || unit === "μM") && value > 100000)) {
      findings.push({
        label: "Concentration sanity",
        status: "fail",
        detail: `Detected ${value}${unit}, which is outside a plausible working range and needs scientist review.`,
      });
    } else if (
      (unit === "mM" && value > 500) ||
      ((unit === "uM" || unit === "μM") && value > 50000) ||
      (unit === "mg/mL" && value > 250)
    ) {
      findings.push({
        label: "Concentration sanity",
        status: "warn",
        detail: `Detected ${value}${unit}; this is unusually high and should be checked against the cited protocol.`,
      });
    }
  }

  return findings.length > 0
    ? findings.slice(0, 2)
    : [{
        label: "Concentration sanity",
        status: "pass",
        detail: "No obviously impossible concentrations were detected in the generated plan text.",
      }];
}

function timelineCheck(plan: ExperimentPlan, parsed: ParseHypothesisResponse): QualityCheck {
  const domain =
    parsed.experimentFamily === "medical_imaging" || parsed.experimentFamily === "computational_ml"
      ? "imaging"
      : parsed.experimentFamily === "clinical_retrospective"
        ? "clinical"
        : parsed.experimentFamily === "materials_chemistry"
          ? "materials"
      : normalize(parsed.domain);
  const text = plan.timeline.map((item) => `${item.phase} ${item.action}`).join(" ");
  const weekValues = [...text.matchAll(/(\d+)\s*week/gi)].map((match) => Number.parseInt(match[1], 10));
  const maxWeeks = weekValues.length > 0 ? Math.max(...weekValues) : 0;

  const minimumWeeks = domain.includes("gut")
    ? 5
    : domain.includes("climate")
      ? 3
      : domain.includes("imaging") || domain.includes("radiology")
        ? 2
      : domain.includes("clinical")
        ? 3
        : domain.includes("materials")
          ? 3
      : 2;

  return maxWeeks >= minimumWeeks
    ? {
        label: "Timeline realism",
        status: "pass",
        detail: `Timeline spans roughly ${maxWeeks} weeks, which clears the minimum planning horizon for this domain.`,
      }
    : {
        label: "Timeline realism",
        status: maxWeeks === 0 ? "warn" : "fail",
        detail: `Timeline appears shorter than expected for ${parsed.domain}. A scientist should confirm the ${minimumWeeks}-week minimum is realistic.`,
      };
}

function budgetCheck(plan: ExperimentPlan, parsed: ParseHypothesisResponse): QualityCheck {
  const domain =
    parsed.experimentFamily === "medical_imaging" || parsed.experimentFamily === "computational_ml"
      ? "imaging"
      : parsed.experimentFamily === "clinical_retrospective"
        ? "clinical"
        : parsed.experimentFamily === "materials_chemistry"
          ? "materials"
      : normalize(parsed.domain);
  const budget = totalBudget(plan);
  const minimumBudget = domain.includes("gut")
    ? 5000
    : domain.includes("climate")
      ? 4000
      : domain.includes("imaging") || domain.includes("radiology")
        ? 500
        : domain.includes("clinical")
          ? 400
          : domain.includes("materials")
            ? 900
      : 1200;

  return budget >= minimumBudget
    ? {
        label: "Budget realism",
        status: "pass",
        detail: `Budget totals about $${budget.toLocaleString()}, which is within a plausible range for ${parsed.domain}.`,
      }
    : {
        label: "Budget realism",
        status: "warn",
        detail: `Budget totals about $${budget.toLocaleString()}, which may be too low for ${parsed.domain} once consumables and repeats are included.`,
      };
}

function supplierCheck(plan: ExperimentPlan): QualityCheck {
  const estimated = plan.materials.filter((item) => item.verificationStatus !== "verified").length;
  const ratio = plan.materials.length > 0 ? estimated / plan.materials.length : 1;

  if (ratio === 0) {
    return {
      label: "Supply-chain provenance",
      status: "pass",
      detail: "Every material item is grounded to a curated or official supplier reference.",
    };
  }

  if (ratio > 0.4) {
    return {
      label: "Supply-chain provenance",
      status: "warn",
      detail: "A large share of materials are still estimated rather than grounded to a supplier source.",
    };
  }

  return {
    label: "Supply-chain provenance",
    status: "pass",
    detail: "Most material items are grounded, with a small number left as estimated placeholders.",
  };
}

function protocolGroundingCoverageCheck(plan: ExperimentPlan): QualityCheck {
  const groundedCount = plan.protocol.filter((step) => step.groundingStatus === "grounded" || step.groundingStatus === "adapted").length;
  const total = plan.protocol.length || 1;
  const ratio = groundedCount / total;

  if (ratio >= 0.75) {
    return {
      label: "Protocol grounding coverage",
      status: "pass",
      detail: `${groundedCount}/${plan.protocol.length} protocol steps are tied to source-backed methods or closely adapted references.`,
    };
  }

  if (ratio >= 0.4) {
    return {
      label: "Protocol grounding coverage",
      status: "warn",
      detail: `${groundedCount}/${plan.protocol.length} protocol steps are source-backed. More grounding is needed before the plan feels handoff-ready.`,
    };
  }

  return {
    label: "Protocol grounding coverage",
    status: "fail",
    detail: `Only ${groundedCount}/${plan.protocol.length} protocol steps are source-backed, so the procedure is still too inferred for a lab-ready handoff.`,
  };
}

function protocolOperationalDetailCheck(plan: ExperimentPlan): QualityCheck {
  const extractedCount = plan.protocol.filter(
    (step) => (step.extractedParameters?.length ?? 0) > 0 || Boolean(step.operationalNote),
  ).length;
  const total = plan.protocol.length || 1;
  const ratio = extractedCount / total;

  if (ratio >= 0.75) {
    return {
      label: "Protocol operational detail",
      status: "pass",
      detail: `${extractedCount}/${plan.protocol.length} protocol steps carry source-derived operational cues or extracted parameters.`,
    };
  }

  if (ratio >= 0.4) {
    return {
      label: "Protocol operational detail",
      status: "warn",
      detail: `${extractedCount}/${plan.protocol.length} protocol steps include source-derived operational cues. More concrete parameters are still needed for a confident handoff.`,
    };
  }

  return {
    label: "Protocol operational detail",
    status: "fail",
    detail: `Only ${extractedCount}/${plan.protocol.length} protocol steps include concrete source-derived parameters or cues, so the procedure is still too abstract for blind execution.`,
  };
}

function materialsCompositionCheck(plan: ExperimentPlan): QualityCheck {
  const mapped = plan.materials.filter((item) => (item.requiredForSteps?.length ?? 0) > 0).length;
  const total = plan.materials.length || 1;
  const ratio = mapped / total;

  if (ratio >= 0.7) {
    return {
      label: "Bill-of-materials composition",
      status: "pass",
      detail: `${mapped}/${plan.materials.length} materials are linked to specific protocol steps, which supports a runnable bill of materials.`,
    };
  }

  if (ratio >= 0.4) {
    return {
      label: "Bill-of-materials composition",
      status: "warn",
      detail: `${mapped}/${plan.materials.length} materials are tied to protocol steps. The bill of materials is usable, but still has loosely justified items.`,
    };
  }

  return {
    label: "Bill-of-materials composition",
    status: "fail",
    detail: `Only ${mapped}/${plan.materials.length} materials are tied to protocol steps, so the supply plan is not yet operationally complete.`,
  };
}

function timelineDependencyCheck(plan: ExperimentPlan): QualityCheck {
  const dependencyCount = plan.timeline.filter((item) => (item.dependencies?.length ?? 0) > 0).length;

  if (dependencyCount === plan.timeline.length && plan.timeline.length > 0) {
    return {
      label: "Timeline dependencies",
      status: "pass",
      detail: "Each timeline phase includes dependencies, which makes ordering and execution sequencing clearer.",
    };
  }

  if (dependencyCount > 0) {
    return {
      label: "Timeline dependencies",
      status: "warn",
      detail: "Some timeline phases include dependencies, but the sequencing logic is still incomplete.",
    };
  }

  return {
    label: "Timeline dependencies",
    status: "fail",
    detail: "Timeline phases do not show dependencies, which weakens runnability for a real lab handoff.",
  };
}

function designDecisionCheck(plan: ExperimentPlan): QualityCheck {
  const decision = plan.designDecision;

  if (!decision) {
    return {
      label: "Decision-aware design",
      status: "warn",
      detail: "The plan does not explain why this setup was chosen over cheaper or simpler alternatives.",
    };
  }

  if (decision.alternatives.length < 2) {
    return {
      label: "Decision-aware design",
      status: "warn",
      detail: "The plan includes too few alternatives to show real cost-aware study design tradeoffs.",
    };
  }

  if (!decision.budgetComparison) {
    return {
      label: "Decision-aware design",
      status: "warn",
      detail: "The plan explains the setup but does not compare its cost to cheaper alternatives.",
    };
  }

  return {
    label: "Decision-aware design",
    status: "pass",
    detail: "The plan explains the selected setup, its cost implication, and the alternatives that were considered first.",
  };
}

function animalUseCheck(plan: ExperimentPlan): QualityCheck {
  const text = joinedPlanText(plan);
  const mentionsAnimals = includesAny(text, [
    "mouse",
    "mice",
    "murine",
    "rat",
    "animal",
    "in vivo",
    "gavaged",
    "gavage",
    "iacuc",
  ]);

  if (!mentionsAnimals) {
    return {
      label: "Animal-use justification",
      status: "pass",
      detail: "No animal model was detected, so no extra in vivo justification is required.",
    };
  }

  const decisionText = normalize(
    [
      plan.designDecision?.selectedApproach ?? "",
      plan.designDecision?.rationale ?? "",
      plan.designDecision?.costImplication ?? "",
      plan.designDecision?.escalationTrigger ?? "",
      ...(plan.designDecision?.alternatives ?? []).map(
        (item) => `${item.name} ${item.type} ${item.rationale} ${item.estimatedSavings}`,
      ),
    ].join("\n"),
  );

  const justified = includesAny(decisionText, [
    "whole-organism",
    "systemic",
    "intestinal permeability",
    "host response",
    "animal",
    "in vivo",
    "welfare",
    "iacuc",
    "cannot capture",
    "insufficient",
  ]);
  const hasCheaperAlternative = includesAny(decisionText, [
    "in vitro",
    "organoid",
    "dataset",
    "in silico",
    "ex vivo",
  ]);

  if (justified && hasCheaperAlternative) {
    return {
      label: "Animal-use justification",
      status: "pass",
      detail: "Animal work is justified with a stated whole-organism need and cheaper alternatives were explicitly considered.",
    };
  }

  return {
    label: "Animal-use justification",
    status: "warn",
    detail: "The plan uses an animal model, but the reason it is necessary over cheaper in vitro, organoid, dataset, or in silico options is still weak.",
  };
}

export function validateExperimentPlan(
  plan: ExperimentPlan,
  parsed: ParseHypothesisResponse,
): QualityCheck[] {
  return [
    protocolRepositoryCheck(plan, parsed),
    protocolGroundingCoverageCheck(plan),
    protocolOperationalDetailCheck(plan),
    materialsCompositionCheck(plan),
    timelineDependencyCheck(plan),
    designDecisionCheck(plan),
    animalUseCheck(plan),
    ...domainCoverageChecks(plan, parsed),
    ...concentrationChecks(plan),
    timelineCheck(plan, parsed),
    budgetCheck(plan, parsed),
    supplierCheck(plan),
  ];
}

export function assessRunnability(checks: QualityCheck[]): RunnabilityAssessment {
  const criticalLabels = new Set([
    "Protocol grounding coverage",
    "Protocol operational detail",
    "Bill-of-materials composition",
    "Timeline dependencies",
    "Supply-chain provenance",
    "Route confidence",
  ]);

  const relevant = checks.filter((check) => criticalLabels.has(check.label));
  const hasFail = relevant.some((check) => check.status === "fail");
  const hasWarn = relevant.some((check) => check.status === "warn");

  if (hasFail) {
    return {
      status: "draft",
      summary: "Draft plan — more method grounding, BOM linkage, or sequencing detail is needed before a lab handoff.",
    };
  }

  if (hasWarn) {
    return {
      status: "scientist_review_required",
      summary: "Scientist review required — the plan is operationally structured, but some grounding or dependency checks still need confirmation.",
    };
  }

  return {
    status: "runnable",
    summary: "Runnable — the plan clears the current grounding, BOM, and dependency checks for a first-pass lab handoff.",
  };
}

function overlapScore(text: string, issue: string): number {
  const normalizedText = normalize(text);
  return normalize(issue)
    .split(/\W+/)
    .filter((token) => token.length > 4)
    .reduce((sum, token) => sum + (normalizedText.includes(token) ? 1 : 0), 0);
}

function uniqueMeaningfulTokens(value: string): string[] {
  return [...new Set(
    normalize(value)
      .split(/\W+/)
      .filter((token) => token.length > 3),
  )];
}

function tokenOverlap(left: string, right: string): number {
  const leftTokens = uniqueMeaningfulTokens(left);
  const rightText = normalize(right);
  return leftTokens.reduce((sum, token) => sum + (rightText.includes(token) ? 1 : 0), 0);
}

function deriveTaskLabel(parsed: ParseHypothesisResponse): string {
  const text = normalize(
    `${parsed.hypothesis} ${parsed.parsedFields.map((field) => `${field.label} ${field.value}`).join(" ")}`,
  );
  if (text.includes("segment")) return "segmentation";
  if (text.includes("denois")) return "denoising";
  if (text.includes("classif")) return "classification";
  if (text.includes("pretrain")) return "pretraining";
  if (text.includes("mask")) return "masking";
  if (text.includes("synthesis")) return "synthesis";
  if (text.includes("sensor")) return "sensor validation";
  if (text.includes("retrospective")) return "retrospective analysis";
  if (text.includes("simulation")) return "simulation";
  return parsed.experimentFamily.replace(/_/g, " ");
}

function deriveSystemContext(parsed: ParseHypothesisResponse): string {
  const modelSystem = parsed.parsedFields.find((field) => normalize(field.label) === "model system");
  return modelSystem?.value ?? parsed.domain;
}

export function selectRelevantReviewMemory({
  parsed,
  reviewMemory,
  planText,
  limit = 4,
}: {
  parsed: ParseHypothesisResponse;
  reviewMemory: ReviewMemoryItem[];
  planText?: string;
  limit?: number;
}): ReviewMemoryMatch[] {
  const domain = normalize(parsed.domain);
  const family = normalize(parsed.experimentFamily);
  const taskLabel = deriveTaskLabel(parsed);
  const systemContext = deriveSystemContext(parsed);
  const hypothesisText = normalize(`${parsed.hypothesis} ${taskLabel} ${systemContext}`);
  const tagContext = uniqueMeaningfulTokens(`${taskLabel} ${systemContext} ${parsed.domain} ${parsed.experimentFamily}`);
  const planContext = planText ? normalize(planText) : "";

  return reviewMemory
    .map((item) => {
      let score = 0;
      const reasons: string[] = [];

      if (normalize(item.domain) === domain) {
        score += 5;
        reasons.push("same domain");
      }

      if (normalize(item.experimentFamily ?? "") === family) {
        score += 8;
        reasons.push("same experiment family");
      }

      if (item.taskLabel) {
        const taskHits = tokenOverlap(item.taskLabel, taskLabel);
        if (taskHits > 0) {
          score += taskHits * 3;
          reasons.push("similar task type");
        }
      }

      if (item.systemContext) {
        const systemHits = tokenOverlap(item.systemContext, systemContext);
        if (systemHits > 0) {
          score += systemHits * 2;
          reasons.push("similar system context");
        }
      }

      const hypothesisHits = overlapScore(hypothesisText, `${item.issue} ${item.impact} ${item.correction ?? ""}`);
      if (hypothesisHits > 0) {
        score += hypothesisHits;
        reasons.push("hypothesis overlap");
      }

      const tagHits = (item.tags ?? []).filter((tag) => tagContext.includes(normalize(tag))).length;
      if (tagHits > 0) {
        score += tagHits * 2;
        reasons.push("shared tags");
      }

      if (planContext) {
        const planHits = overlapScore(planContext, `${item.issue} ${item.correction ?? ""}`);
        if (planHits > 0) {
          score += planHits;
          reasons.push("current plan overlap");
        }
      }

      if (item.importance === "high") {
        score += 1;
      }

      return { item, score, reasons: [...new Set(reasons)] };
    })
    .filter((entry) => entry.score >= 5)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function summarizeMemoryImpact({
  plan,
  parsed,
  reviewMemory,
}: {
  plan: ExperimentPlan;
  parsed: ParseHypothesisResponse;
  reviewMemory: ReviewMemoryItem[];
}): MemoryImpactSummary {
  const candidates = selectRelevantReviewMemory({
    parsed,
    reviewMemory,
    planText: joinedPlanText(plan),
    limit: 3,
  });

  if (candidates.length === 0) {
    return {
      appliedCount: 0,
      summary: "No prior scientist corrections were confidently applied to this run.",
      items: [],
    };
  }

  return {
    appliedCount: candidates.length,
    summary: `${candidates.length} prior scientist correction${candidates.length > 1 ? "s were" : " was"} used to steer this ${parsed.domain} plan.`,
    items: candidates.map(({ item, score, reasons }) => ({
      section: item.section,
      issue: item.issue,
      correction: item.correction,
      tags: item.tags,
      whyApplied: `Applied because of ${reasons.join(", ")} (${score} match score).`,
    })),
  };
}
