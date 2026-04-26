import type {
  BudgetComparison,
  ExperimentPlan,
  MaterialItem,
  ParseHypothesisResponse,
  Reference,
  StudyDesignDecision,
} from "@/lib/types";

function normalize(value: string): string {
  return value.toLowerCase();
}

function includesAny(text: string, keywords: string[]): boolean {
  const normalized = normalize(text);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

function planText(plan: ExperimentPlan): string {
  return [
    plan.title,
    plan.domain,
    ...plan.protocol.map((step) => `${step.title} ${step.detail}`),
    ...plan.materials.map((item) => `${item.name} ${item.supplier} ${item.catalogNumber}`),
    ...plan.validation,
  ].join("\n");
}

function appendIfMissing(
  values: string[],
  candidate: string,
  mustInclude: string[],
): string[] {
  const combined = values.join("\n");
  if (includesAny(combined, mustInclude)) {
    return values;
  }

  return [...values, candidate];
}

function addMaterialIfMissing(
  materials: MaterialItem[],
  candidate: MaterialItem,
  mustInclude: string[],
): MaterialItem[] {
  const combined = materials
    .map((item) => `${item.name} ${item.supplier} ${item.catalogNumber}`)
    .join("\n");

  if (includesAny(combined, mustInclude)) {
    return materials;
  }

  return [...materials, candidate];
}

function domainKey(parsed: ParseHypothesisResponse): string {
  if (parsed.experimentFamily === "medical_imaging" || parsed.experimentFamily === "computational_ml") {
    return "imaging";
  }

  if (parsed.experimentFamily === "clinical_retrospective") {
    return "clinical";
  }

  if (parsed.experimentFamily === "materials_chemistry") {
    return "materials";
  }

  if (parsed.experimentFamily === "animal_study") {
    return "gut";
  }

  return normalize(parsed.domain);
}

function defaultDesignDecision(parsed: ParseHypothesisResponse): StudyDesignDecision {
  const domain = domainKey(parsed);

  if (domain.includes("diagnostic")) {
    return {
      selectedApproach: "Bench-top assay validation in whole blood",
      rationale: "This is the cheapest setup that still tests the actual claim in the hypothesis: rapid whole-blood performance without preprocessing.",
      costImplication: "Stays in an assay-development budget range and avoids unnecessary animal or clinical expansion.",
      escalationTrigger: "Escalate to a broader clinical sample set only after calibration, sensitivity, and benchmark concordance all pass.",
      alternatives: [
        {
          rank: 1,
          name: "Buffer-only analytical screen",
          type: "in vitro",
          rationale: "Fastest and cheapest, but it cannot capture whole-blood interference or matrix effects.",
          estimatedSavings: "$1,000-$1,500",
          costEstimate: "$1,800",
          timeEstimate: "1 week",
          accuracyExpectation: "Low for real-world use",
        },
        {
          rank: 2,
          name: "Retrospective dataset calibration",
          type: "dataset",
          rationale: "Useful for target setting, but it does not validate the physical sensor or 10-minute workflow.",
          estimatedSavings: "$1,500-$2,000",
          costEstimate: "$1,300",
          timeEstimate: "3-4 days",
          accuracyExpectation: "Moderate for planning only",
        },
      ],
      budgetComparison: {
        selectedApproachCost: "$3,400",
        cheapestAlternativeCost: "$1,300",
        premiumVsCheapest: "$2,100",
        summary: "The extra spend is justified because the chosen design is the first option that tests the real sample matrix and turnaround claim.",
      },
    };
  }

  if (domain.includes("cell")) {
    return {
      selectedApproach: "In vitro HeLa cryopreservation comparison",
      rationale: "A cell-line assay directly measures viability and recovery while staying far cheaper than primary-cell or animal follow-up.",
      costImplication: "This keeps the first-pass experiment fast and controlled while preserving enough biological relevance for a cryopreservation screen.",
      escalationTrigger: "Escalate only if the formulation wins clearly and the team needs confirmation in a more clinically relevant cell type.",
      alternatives: [
        {
          rank: 1,
          name: "Membrane stability simulation",
          type: "in silico",
          rationale: "Cheaper for pre-screening, but it cannot replace post-thaw viability measurements.",
          estimatedSavings: "$1,000-$1,400",
          costEstimate: "$1,800",
          timeEstimate: "3-5 days",
          accuracyExpectation: "Low to moderate",
        },
        {
          rank: 2,
          name: "Primary human cell validation",
          type: "ex vivo",
          rationale: "More biologically realistic, but too expensive and variable for the first comparison.",
          estimatedSavings: "$2,000-$3,000",
          costEstimate: "$5,500",
          timeEstimate: "3-4 weeks",
          accuracyExpectation: "High but lower throughput",
        },
      ],
      budgetComparison: {
        selectedApproachCost: "$3,220",
        cheapestAlternativeCost: "$1,800",
        premiumVsCheapest: "$1,420",
        summary: "The chosen in vitro assay costs more than a simulation-only pass, but it is the first design that actually measures thaw survival.",
      },
    };
  }

  if (domain.includes("climate")) {
    return {
      selectedApproach: "Bench-scale bioelectrochemical reactor run",
      rationale: "A live reactor is required to test acetate productivity and coulombic efficiency under the stated cathode condition.",
      costImplication: "Hardware raises cost, but cheaper paper studies or datasets would not answer the production-rate claim.",
      escalationTrigger: "Escalate to parallel reactors or larger volumes only after a single reactor clears the target productivity window.",
      alternatives: [
        {
          rank: 1,
          name: "Literature benchmark reanalysis",
          type: "dataset",
          rationale: "Cheapest option for planning, but it cannot generate new performance data.",
          estimatedSavings: "$2,500-$3,000",
          costEstimate: "$3,700",
          timeEstimate: "4-5 days",
          accuracyExpectation: "Low for new claims",
        },
        {
          rank: 2,
          name: "Abiotic electrode screen",
          type: "in vitro",
          rationale: "Useful for hardware checks, but it misses the microbial fixation behavior central to the hypothesis.",
          estimatedSavings: "$1,500-$2,000",
          costEstimate: "$4,800",
          timeEstimate: "1-2 weeks",
          accuracyExpectation: "Moderate for hardware only",
        },
      ],
      budgetComparison: {
        selectedApproachCost: "$6,700",
        cheapestAlternativeCost: "$3,700",
        premiumVsCheapest: "$3,000",
        summary: "The chosen setup is more expensive because it is the first design that can generate new productivity data under the target electrochemical condition.",
      },
    };
  }

  if (domain.includes("imaging") || domain.includes("radiology")) {
    return {
      selectedApproach: "Public-dataset medical-imaging benchmark with structure-aware denoising",
      rationale: "A computational benchmark on pediatric chest X-rays is the cheapest design that still tests denoising quality and downstream diagnostic utility directly.",
      costImplication: "The experiment should be compute-bound, with modest GPU and storage costs rather than wet-lab materials.",
      escalationTrigger: "Escalate to reader studies or external clinical validation only after the benchmark consistently improves SSIM, PSNR, and downstream classification.",
      alternatives: [
        {
          rank: 1,
          name: "Baseline-only public-dataset comparison",
          type: "dataset",
          rationale: "Lowest-cost way to verify whether standard denoisers already solve the problem.",
          estimatedSavings: "$150-$250",
          costEstimate: "$400",
          timeEstimate: "1 week",
          accuracyExpectation: "Moderate",
        },
        {
          rank: 2,
          name: "Structure-aware denoiser plus downstream classifier benchmark",
          type: "in silico",
          rationale: "Best match for the hypothesis because it measures both restoration quality and downstream diagnostic impact.",
          estimatedSavings: "$0",
          costEstimate: "$650",
          timeEstimate: "2-3 weeks",
          accuracyExpectation: "High",
        },
      ],
      budgetComparison: {
        selectedApproachCost: "$650",
        cheapestAlternativeCost: "$400",
        premiumVsCheapest: "$250",
        summary: "The selected benchmark costs slightly more because it includes downstream classification, which is essential to the stated hypothesis.",
      },
    };
  }

  if (domain.includes("clinical")) {
    return {
      selectedApproach: "Retrospective cohort analysis on de-identified records",
      rationale: "This is the cheapest path when the hypothesis can be tested from existing clinical records without prospective recruitment.",
      costImplication: "Costs are driven by governance, data cleaning, and analyst time rather than wet-lab reagents.",
      escalationTrigger: "Escalate to prospective validation only after the retrospective cohort shows a stable and clinically meaningful signal.",
      alternatives: [
        {
          rank: 1,
          name: "Single-center pilot cohort",
          type: "dataset",
          rationale: "Faster and cheaper, but potentially underpowered and less generalizable.",
          estimatedSavings: "$200-$300",
          costEstimate: "$750",
          timeEstimate: "2-3 weeks",
          accuracyExpectation: "Moderate",
        },
        {
          rank: 2,
          name: "Multi-site retrospective cohort",
          type: "dataset",
          rationale: "More robust and generalizable, but slower because of harmonization and approvals.",
          estimatedSavings: "$0",
          costEstimate: "$1,050",
          timeEstimate: "3-4 weeks",
          accuracyExpectation: "High",
        },
      ],
      budgetComparison: {
        selectedApproachCost: "$1,050",
        cheapestAlternativeCost: "$750",
        premiumVsCheapest: "$300",
        summary: "The premium is justified when broader generalizability and stronger subgroup analysis matter more than speed.",
      },
    };
  }

  if (domain.includes("materials")) {
    return {
      selectedApproach: "Small-batch synthesis with characterization benchmark",
      rationale: "This is the minimum credible materials workflow because it links performance claims to verified structure and morphology.",
      costImplication: "Costs are mainly driven by precursor quality and characterization access rather than scale-up.",
      escalationTrigger: "Escalate to larger-batch synthesis or long-horizon stability only after the top candidate reproduces in repeated small-batch runs.",
      alternatives: [
        {
          rank: 1,
          name: "Characterization-light pilot screen",
          type: "in vitro",
          rationale: "Cheaper and faster, but weaker mechanistically because structure is not verified deeply.",
          estimatedSavings: "$250-$350",
          costEstimate: "$1,050",
          timeEstimate: "2 weeks",
          accuracyExpectation: "Moderate",
        },
        {
          rank: 2,
          name: "Full synthesis and characterization benchmark",
          type: "in vitro",
          rationale: "Best fit for a materials hypothesis because it ties the performance claim to real characterization evidence.",
          estimatedSavings: "$0",
          costEstimate: "$1,400",
          timeEstimate: "3 weeks",
          accuracyExpectation: "High",
        },
      ],
      budgetComparison: {
        selectedApproachCost: "$1,400",
        cheapestAlternativeCost: "$1,050",
        premiumVsCheapest: "$350",
        summary: "The premium buys structural evidence that makes the claimed mechanism far more credible.",
      },
    };
  }

  return {
    selectedApproach: "Murine probiotic dosing study with FITC-dextran readout",
    rationale: "Whole-organism permeability and tolerance are the primary endpoints, so mice are justified only because simpler assays cannot fully capture systemic barrier effects.",
    costImplication: "Animal housing is the major cost driver, so this should be used only after cheaper barrier models have been considered.",
    escalationTrigger: "Start with monolayers or organoids unless the team specifically needs organism-level permeability, dosing tolerance, and serum FITC translocation.",
    alternatives: [
      {
        rank: 1,
        name: "Intestinal epithelial monolayer screen",
        type: "in vitro",
        rationale: "Fastest and cheapest way to test barrier tightening, but it misses organism-level dosing and tolerance effects.",
        estimatedSavings: "$4,000-$5,000",
        costEstimate: "$3,200",
        timeEstimate: "1-2 weeks",
        accuracyExpectation: "Moderate for barrier directionality",
      },
      {
        rank: 2,
        name: "Gut organoid permeability model",
        type: "organoid",
        rationale: "Better epithelial realism than monolayers, but still weaker than mice for systemic permeability and host tolerance.",
        estimatedSavings: "$2,500-$3,500",
        costEstimate: "$4,900",
        timeEstimate: "2-3 weeks",
        accuracyExpectation: "Moderate to high for epithelial effects",
      },
    ],
    budgetComparison: {
      selectedApproachCost: "$8,420",
      cheapestAlternativeCost: "$3,200",
      premiumVsCheapest: "$5,220",
      summary: "The mouse study costs substantially more, so the premium is only justified when the team needs whole-animal permeability and tolerance data rather than a first-pass screen.",
    },
  };
}

function hydrateBudgetComparison(decision: StudyDesignDecision): BudgetComparison {
  if (decision.budgetComparison) {
    return decision.budgetComparison;
  }

  const cheapest = [...decision.alternatives].sort((left, right) => left.rank - right.rank)[0];
  return {
    selectedApproachCost: "See budget section",
    cheapestAlternativeCost: cheapest?.costEstimate ?? "Not specified",
    premiumVsCheapest: "See budget comparison",
    summary: "The chosen design was selected over lower-cost options because it better matches the target readout.",
  };
}

export function strengthenGeneratedPlan(
  plan: ExperimentPlan,
  parsed: ParseHypothesisResponse,
  references: Reference[],
): ExperimentPlan {
  const domain = domainKey(parsed);
  let validation = [...plan.validation];
  let materials = [...plan.materials];
  const text = planText(plan);
  const parsedText = parsed.parsedFields.map((field) => field.value).join("\n");
  const referenceText = references
    .map((reference) => `${reference.title} ${reference.note}`)
    .join("\n");
  const corpus = `${text}\n${parsedText}\n${referenceText}`;
  const hydratedReferences = references.map((reference) => ({
    ...reference,
    relevanceSummary:
      reference.relevanceSummary ??
      reference.matchRationale ??
      reference.note,
  }));

  if (domain.includes("diagnostics")) {
    validation = appendIfMissing(
      validation,
      "Establish a calibration curve and limit of detection for CRP in whole blood or a matrix-matched sample.",
      ["calibration", "limit of detection", "lod"],
    );
    validation = appendIfMissing(
      validation,
      "Benchmark assay sensitivity and specificity against an ELISA or another accepted laboratory reference method.",
      ["sensitivity", "specificity", "elisa", "reference method"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "PBS or matrix-matched running buffer",
        supplier: "Thermo Fisher",
        catalogNumber: "10010023",
        quantity: "500 mL",
        estimatedCost: "$25",
      },
      ["pbs", "buffer"],
    );
  }

  if (domain.includes("gut")) {
    validation = appendIfMissing(
      validation,
      "Use FITC-dextran translocation into serum or plasma as the primary intestinal permeability readout.",
      ["fitc-dextran", "fd4", "permeability"],
    );
    validation = appendIfMissing(
      validation,
      "Measure occludin and claudin-family tight-junction markers by immunoblotting or immunostaining.",
      ["occludin", "claudin", "tight junction"],
    );
    validation = appendIfMissing(
      validation,
      "Include histology and inflammatory cytokines as secondary gut-barrier validation outputs.",
      ["histology", "cytokine", "inflammatory"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "FITC-dextran permeability tracer",
        supplier: "Sigma-Aldrich",
        catalogNumber: "FD4",
        quantity: "1 g",
        estimatedCost: "$95",
      },
      ["fitc-dextran", "fd4"],
    );
    if (!includesAny(corpus, ["occludin antibody"])) {
      materials = addMaterialIfMissing(
        materials,
        {
          name: "Anti-occludin antibody",
          supplier: "Thermo Fisher",
          catalogNumber: "71-1500",
          quantity: "100 uL",
          estimatedCost: "$180",
        },
        ["occludin"],
      );
    }
  }

  if (domain.includes("cell")) {
    validation = appendIfMissing(
      validation,
      "Measure post-thaw viability with trypan blue exclusion or an equivalent live/dead viability assay.",
      ["post-thaw viability", "trypan blue", "live/dead"],
    );
    validation = appendIfMissing(
      validation,
      "Assess recovery after replating to distinguish immediate viability from functional post-thaw recovery.",
      ["recovery", "replating", "proliferation"],
    );
    validation = appendIfMissing(
      validation,
      "Document morphology and adherence 24 hours after thawing as a secondary recovery metric.",
      ["morphology", "adherence", "24 hours"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "Cryovials",
        supplier: "Thermo Fisher",
        catalogNumber: "375418",
        quantity: "50 units",
        estimatedCost: "$40",
      },
      ["cryovial"],
    );
  }

  if (domain.includes("climate")) {
    validation = appendIfMissing(
      validation,
      "Quantify acetate production rate over time under the specified cathode potential or current conditions.",
      ["acetate", "production rate"],
    );
    validation = appendIfMissing(
      validation,
      "Measure coulombic efficiency and carbon balance for the CO2-to-acetate conversion workflow.",
      ["coulombic efficiency", "carbon balance"],
    );
    validation = appendIfMissing(
      validation,
      "Confirm acetate concentration with HPLC, ion chromatography, or an equivalent quantitative analytical method.",
      ["hplc", "chromatography", "acetate concentration"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "CO2 gas cylinder",
        supplier: "Airgas",
        catalogNumber: "N/A",
        quantity: "1 cylinder",
        estimatedCost: "$120",
      },
      ["co2 gas", "carbon dioxide"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "Carbon cloth or graphite cathode",
        supplier: "Fuel Cell Store",
        catalogNumber: "N/A",
        quantity: "5 sheets",
        estimatedCost: "$180",
      },
      ["cathode", "carbon cloth", "graphite"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "Anaerobic bioelectrochemical reactor vessel",
        supplier: "Custom assembly",
        catalogNumber: "N/A",
        quantity: "1 reactor",
        estimatedCost: "$900",
      },
      ["reactor", "bioelectrochemical"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "Electrolyte medium and reference electrode set",
        supplier: "Gamry or equivalent",
        catalogNumber: "N/A",
        quantity: "1 set",
        estimatedCost: "$350",
      },
      ["electrolyte", "reference electrode"],
    );
  }

  if (domain.includes("imaging") || domain.includes("radiology")) {
    validation = appendIfMissing(
      validation,
      "Report SSIM, PSNR, and RMSE for each denoiser under the same Poisson-Gaussian noise settings.",
      ["ssim", "psnr", "rmse"],
    );
    validation = appendIfMissing(
      validation,
      "Measure downstream pneumonia classification accuracy or AUC on clean, noisy, and denoised images.",
      ["classification accuracy", "auc", "pneumonia"],
    );
    validation = appendIfMissing(
      validation,
      "Include qualitative anatomical edge comparisons so noise suppression is not achieved by oversmoothing lung structures.",
      ["edge", "anatomical", "qualitative"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "Pediatric Chest X-Ray dataset access",
        supplier: "Kaggle / public dataset host",
        catalogNumber: "CHEST-XRAY-PNEUMONIA",
        quantity: "1 dataset",
        estimatedCost: "$0",
      },
      ["chest x ray", "pneumonia dataset", "radiograph"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "PyTorch training stack",
        supplier: "PyTorch",
        catalogNumber: "torch-2.x",
        quantity: "1 environment",
        estimatedCost: "$0",
      },
      ["pytorch", "torch"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "NVIDIA T4 or equivalent GPU time",
        supplier: "NVIDIA / cloud compute",
        catalogNumber: "T4-16GB",
        quantity: "50 GPU-hours",
        estimatedCost: "$180",
      },
      ["gpu", "nvidia", "t4"],
    );
  }

  if (domain.includes("clinical")) {
    validation = appendIfMissing(
      validation,
      "Report adjusted effect sizes or prediction metrics with confidence intervals and sensitivity analyses.",
      ["confidence interval", "sensitivity", "adjusted", "calibration"],
    );
    validation = appendIfMissing(
      validation,
      "Document inclusion criteria, missing-data handling, and subgroup checks before interpreting the main result.",
      ["inclusion", "missing", "subgroup", "confounder"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "REDCap data abstraction workspace",
        supplier: "REDCap",
        catalogNumber: "REDCAP-RETRO",
        quantity: "1 project",
        estimatedCost: "$0",
      },
      ["redcap", "data abstraction"],
    );
  }

  if (domain.includes("materials")) {
    validation = appendIfMissing(
      validation,
      "Use at least one structural characterization method and one complementary method to support the proposed mechanism.",
      ["xrd", "sem", "ftir", "uv-vis", "characterization"],
    );
    validation = appendIfMissing(
      validation,
      "Repeat synthesis of the best candidate to verify the result is not a single-batch artifact.",
      ["repeat", "reproducibility", "stability"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "XRD access",
        supplier: "Institutional core facility",
        catalogNumber: "XRD-ACCESS",
        quantity: "6 hours",
        estimatedCost: "$240",
      },
      ["xrd", "diffraction"],
    );
    materials = addMaterialIfMissing(
      materials,
      {
        name: "SEM access",
        supplier: "Institutional core facility",
        catalogNumber: "SEM-ACCESS",
        quantity: "4 hours",
        estimatedCost: "$220",
      },
      ["sem", "microscopy", "morphology"],
    );
  }

  const designDecision = {
    ...(plan.designDecision ?? defaultDesignDecision(parsed)),
    budgetComparison: hydrateBudgetComparison(plan.designDecision ?? defaultDesignDecision(parsed)),
    alternatives: [...(plan.designDecision?.alternatives ?? defaultDesignDecision(parsed).alternatives)]
      .sort((left, right) => left.rank - right.rank),
  };

  return {
    ...plan,
    domain: parsed.domain,
    references: hydratedReferences,
    validation,
    materials,
    designDecision,
  };
}
