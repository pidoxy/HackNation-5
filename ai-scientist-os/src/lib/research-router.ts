import type { ExperimentFamily } from "@/lib/types";

export interface ResearchRoute {
  family: ExperimentFamily;
  label: string;
  confidence: number;
  supported: boolean;
  reason: string;
  guidance: string;
}

type RouteCandidate = {
  family: ExperimentFamily;
  label: string;
  supported: boolean;
  keywords: string[];
  guidance: string;
};

const ROUTES: RouteCandidate[] = [
  {
    family: "medical_imaging",
    label: "Medical imaging",
    supported: true,
    keywords: [
      "x-ray",
      "x ray",
      "radiograph",
      "radiology",
      "ct",
      "mri",
      "ultrasound",
      "oct",
      "octa",
      "oct angiography",
      "angiography",
      "retina",
      "retinal",
      "vessel segmentation",
      "topology",
      "masked autoencoder",
      "mae",
      "ssim",
      "psnr",
      "denoising",
      "segmentation",
      "pneumonia classification",
      "dicom",
      "poisson-gaussian",
    ],
    guidance:
      "Plan as a computational medical-imaging study: datasets, splits, annotation or label setup, baselines, metrics, ablations, GPU budget, and modality-specific validation such as denoising, segmentation, or classification.",
  },
  {
    family: "computational_ml",
    label: "Computational ML",
    supported: true,
    keywords: [
      "transformer",
      "cnn",
      "unet",
      "resunet",
      "dncnn",
      "classification",
      "regression",
      "dataset",
      "benchmark",
      "fine-tuning",
      "training",
      "ablation",
      "inference",
      "auc",
      "f1",
    ],
    guidance:
      "Plan as a machine-learning benchmark: datasets, train/validation/test splits, baseline models, compute, evaluation metrics, ablations, and reproducibility controls.",
  },
  {
    family: "clinical_retrospective",
    label: "Clinical / retrospective",
    supported: true,
    keywords: [
      "retrospective",
      "electronic health record",
      "ehr",
      "patient cohort",
      "chart review",
      "hospital records",
      "clinical outcome",
      "survival",
      "cohort",
      "irb",
      "de-identified",
    ],
    guidance:
      "Plan as a retrospective clinical study: cohort definition, inclusion/exclusion criteria, de-identification, IRB/privacy, endpoints, confounders, and statistical validation.",
  },
  {
    family: "wet_lab",
    label: "Wet lab",
    supported: true,
    keywords: [
      "cell line",
      "western blot",
      "qpcr",
      "crispr",
      "antibody",
      "assay",
      "culture",
      "reagent",
      "microscopy",
      "elisa",
      "organoid",
      "plasmid",
    ],
    guidance:
      "Plan as a bench experiment: protocol steps, reagents, instruments, concentrations, controls, timeline, and supplier grounding.",
  },
  {
    family: "animal_study",
    label: "Animal study",
    supported: true,
    keywords: [
      "mouse",
      "mice",
      "murine",
      "rat",
      "animal model",
      "in vivo",
      "gavage",
      "iacuc",
      "cohort",
      "housing",
    ],
    guidance:
      "Plan as an animal study only when whole-organism validation is essential. Include ethics, group sizes, welfare checks, and cheaper alternatives considered first.",
  },
  {
    family: "materials_chemistry",
    label: "Materials / chemistry",
    supported: true,
    keywords: [
      "synthesis",
      "catalyst",
      "polymer",
      "battery",
      "electrolyte",
      "ftir",
      "xrd",
      "sem",
      "nmr",
      "photocatal",
      "solar cell",
      "thin film",
      "perovskite",
    ],
    guidance:
      "Plan as a materials experiment: synthesis workflow, characterization instruments, precursor sourcing, safety, and benchmark properties.",
  },
  {
    family: "device_sensor",
    label: "Device / sensor",
    supported: true,
    keywords: [
      "sensor",
      "biosensor",
      "electrochemical",
      "device",
      "prototype",
      "microfluidic",
      "detector",
      "calibration curve",
      "limit of detection",
    ],
    guidance:
      "Plan as a device-validation study: fabrication, calibration, signal benchmarking, reference standards, and hardware bill of materials.",
  },
  {
    family: "simulation_modeling",
    label: "Simulation / modeling",
    supported: true,
    keywords: [
      "simulation",
      "finite element",
      "agent-based",
      "monte carlo",
      "dynamics",
      "modeling",
      "ode",
      "pde",
      "parameter sweep",
    ],
    guidance:
      "Plan as a modeling study: equations or simulation setup, parameter ranges, compute budget, benchmark scenarios, and validation against reference data.",
  },
];

function normalize(value: string): string {
  return value.toLowerCase();
}

function scoreCandidate(text: string, candidate: RouteCandidate): number {
  const baseScore = candidate.keywords.reduce(
    (sum, keyword) => sum + (text.includes(normalize(keyword)) ? 1 : 0),
    0,
  );

  const specificityBonus =
    candidate.family === "medical_imaging" &&
    ["x-ray", "radiograph", "dicom", "mri", "ct", "ultrasound", "oct", "octa", "retina"].some((keyword) =>
      text.includes(keyword),
    )
      ? 2
      : candidate.family === "clinical_retrospective" &&
          ["retrospective", "ehr", "patient cohort", "chart review", "hospital records"].some((keyword) =>
            text.includes(keyword),
          )
        ? 2
        : candidate.family === "animal_study" &&
            ["mouse", "mice", "murine", "rat", "in vivo", "iacuc"].some((keyword) => text.includes(keyword))
          ? 2
          : candidate.family === "wet_lab" &&
              ["cell line", "western blot", "qpcr", "crispr", "elisa", "assay"].some((keyword) =>
                text.includes(keyword),
              )
            ? 2
            : candidate.family === "materials_chemistry" &&
                ["xrd", "sem", "nmr", "perovskite", "thin film", "solar cell"].some((keyword) =>
                  text.includes(keyword),
                )
              ? 2
              : candidate.family === "device_sensor" &&
                  ["biosensor", "electrochemical", "microfluidic", "limit of detection", "calibration curve"].some(
                    (keyword) => text.includes(keyword),
                  )
                ? 2
                : candidate.family === "simulation_modeling" &&
                    ["simulation", "monte carlo", "pde", "ode", "finite element", "agent-based"].some((keyword) =>
                      text.includes(keyword),
                    )
                  ? 2
                  : candidate.family === "computational_ml" &&
                      ["transformer", "fine-tuning", "benchmark", "inference", "ablation"].some((keyword) =>
                        text.includes(keyword),
                      )
                    ? 1
                    : 0;

  return baseScore + specificityBonus;
}

function defaultReason(text: string): string {
  if (text.trim().length === 0) {
    return "No hypothesis text was provided for route classification.";
  }

  return "The hypothesis does not match a strong specialized route, so the planner should stay conservative and ask for scientist review.";
}

export function classifyResearchRoute(hypothesis: string): ResearchRoute {
  const text = normalize(hypothesis);
  const ranked = ROUTES
    .map((candidate) => ({ candidate, score: scoreCandidate(text, candidate) }))
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  const second = ranked[1];

  if (!best || best.score === 0) {
    return {
      family: "general_research",
      label: "General research",
      confidence: 18,
      supported: false,
      reason: defaultReason(text),
      guidance:
        "Use a conservative general planner. Do not assume a wet-lab workflow unless the hypothesis explicitly requires one.",
    };
  }

  const margin = best.score - (second?.score ?? 0);
  const confidence = Math.min(96, 42 + best.score * 10 + margin * 6);

  return {
    family: best.candidate.family,
    label: best.candidate.label,
    confidence,
    supported: best.candidate.supported,
    reason:
      margin <= 1
        ? `The hypothesis partially matches multiple routes, but ${best.candidate.label} is the strongest current fit.`
        : `The hypothesis strongly matches the ${best.candidate.label} route based on its intervention, resources, and evaluation language.`,
    guidance: best.candidate.guidance,
  };
}

export function routePlannerGuidance(route: ResearchRoute): string {
  return route.guidance;
}
