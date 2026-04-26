import {
  type ExperimentPlan,
  type GeneratePlanResponse,
  type ParseHypothesisResponse,
  type ParsedField,
} from "@/lib/types";
import { buildSectionCitations } from "@/lib/citations";
import { classifyResearchRoute, type ResearchRoute } from "@/lib/research-router";

const sampleHypotheses = {
  diagnostics:
    "A paper-based electrochemical biosensor functionalized with anti-CRP antibodies will detect C-reactive protein in whole blood at concentrations below 0.5 mg/L within 10 minutes, matching laboratory ELISA sensitivity without requiring sample preprocessing.",
  gut:
    "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls, measured by FITC-dextran assay, due to upregulation of tight junction proteins claudin-1 and occludin.",
  cell:
    "Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol, due to trehalose's superior membrane stabilization at low temperatures.",
  climate:
    "Introducing Sporomusa ovata into a bioelectrochemical system at a cathode potential of -400mV vs SHE will fix CO2 into acetate at a rate of at least 150 mmol/L/day, outperforming current biocatalytic carbon capture benchmarks by at least 20%.",
  imaging:
    "Will incorporating structure-aware inductive biases into a deep learning denoising architecture improve SSIM and downstream pneumonia classification accuracy on low-dose pediatric chest X-rays by at least 3–5% compared to standard ResUNet and DnCNN baselines under simulated Poisson–Gaussian noise?",
} as const;

type DomainKey = keyof typeof sampleHypotheses;

function inferDomain(hypothesis: string): DomainKey | null {
  const normalized = hypothesis.toLowerCase();

  if (
    normalized.includes("x-ray") ||
    normalized.includes("x ray") ||
    normalized.includes("chest xray") ||
    normalized.includes("chest x-ray") ||
    normalized.includes("radiograph") ||
    normalized.includes("radiology") ||
    normalized.includes("denoising") ||
    normalized.includes("ssim") ||
    normalized.includes("psnr") ||
    normalized.includes("pneumonia classification") ||
    normalized.includes("poisson-gaussian") ||
    normalized.includes("dncnn") ||
    normalized.includes("resunet") ||
    normalized.includes("laplacian")
  ) {
    return "imaging";
  }

  if (
    normalized.includes("c-reactive protein") ||
    normalized.includes("biosensor") ||
    normalized.includes("elisa") ||
    normalized.includes("whole blood")
  ) {
    return "diagnostics";
  }

  if (
    normalized.includes("hela") ||
    normalized.includes("cryoprotectant") ||
    normalized.includes("trehalose") ||
    normalized.includes("post-thaw")
  ) {
    return "cell";
  }

  if (
    normalized.includes("co2") ||
    normalized.includes("acetate") ||
    normalized.includes("sporomusa") ||
    normalized.includes("cathode potential")
  ) {
    return "climate";
  }

  if (
    normalized.includes("lactobacillus") ||
    normalized.includes("fitc-dextran") ||
    normalized.includes("claudin") ||
    normalized.includes("occludin") ||
    normalized.includes("intestinal permeability")
  ) {
    return "gut";
  }

  return null;
}

function baseParseFields(domain: DomainKey): ParsedField[] {
  switch (domain) {
    case "diagnostics":
      return [
        { label: "Intervention", value: "Paper-based electrochemical CRP biosensor with anti-CRP capture antibodies" },
        { label: "Model system", value: "Whole blood samples, no preprocessing workflow" },
        { label: "Primary endpoint", value: "Detection limit below 0.5 mg/L within 10 minutes" },
        { label: "Mechanism", value: "Electrochemical signal amplification from antibody-antigen binding event" },
        { label: "Controls", value: "Blank blood matrix, known CRP spike-ins, ELISA benchmark comparison" },
        { label: "Readouts", value: "Current response, calibration curve, time-to-result, ELISA concordance" },
      ];
    case "cell":
      return [
        { label: "Intervention", value: "Trehalose-substituted freezing medium versus standard DMSO + sucrose" },
        { label: "Model system", value: "HeLa cells under matched cryopreservation and thawing workflow" },
        { label: "Primary endpoint", value: "Post-thaw viability improvement of at least 15 percentage points" },
        { label: "Mechanism", value: "Improved membrane stabilization during freezing stress" },
        { label: "Controls", value: "Standard DMSO freezing protocol and matched thaw timing" },
        { label: "Readouts", value: "Viability count, recovery at 24 hours, morphology, membrane integrity" },
      ];
    case "climate":
      return [
        { label: "Intervention", value: "Sporomusa ovata introduced into bioelectrochemical cathode system" },
        { label: "Model system", value: "Bench-scale electrochemical reactor at -400mV vs SHE" },
        { label: "Primary endpoint", value: "Acetate production >= 150 mmol/L/day and 20% above benchmark" },
        { label: "Mechanism", value: "Microbial CO2 fixation enhanced by electron uptake at cathode" },
        { label: "Controls", value: "Abiotic cathode, benchmark biocatalyst condition, open-circuit control" },
        { label: "Readouts", value: "Acetate titer, coulombic efficiency, current density, stability over time" },
      ];
    case "imaging":
      return [
        { label: "Intervention", value: "Structure-aware denoising model with Laplacian-based edge enhancement and dual-decoder fusion" },
        { label: "Model system", value: "Pediatric chest X-ray images with simulated low-dose Poisson-Gaussian noise" },
        { label: "Primary endpoint", value: "SSIM and PSNR improvement plus downstream pneumonia classification accuracy gain of at least 3-5%" },
        { label: "Mechanism", value: "Structure-aware inductive biases preserve diagnostically relevant anatomical edges while suppressing noise" },
        { label: "Controls", value: "Standard convolutional denoisers such as DnCNN and ResUNet baselines under matched noise settings" },
        { label: "Readouts", value: "SSIM, PSNR, RMSE, edge preservation, classifier AUC/accuracy, and inference efficiency" },
      ];
    case "gut":
    default:
      return [
        { label: "Intervention", value: "Lactobacillus rhamnosus GG, oral gavage for 4 weeks" },
        { label: "Model system", value: "C57BL/6 mice, 8 weeks old" },
        { label: "Primary endpoint", value: "FITC-dextran intestinal permeability reduction >= 30%" },
        { label: "Mechanism", value: "Upregulation of claudin-1 and occludin tight junction proteins" },
        { label: "Controls", value: "Vehicle control and baseline permeability readout" },
        { label: "Readouts", value: "FITC assay, qPCR, Western blot, body weight, stool score" },
      ];
  }
}

function genericParseFields(route: ResearchRoute, hypothesis: string): ParsedField[] {
  switch (route.family) {
    case "computational_ml":
    case "simulation_modeling":
      return [
        { label: "Intervention", value: hypothesis.slice(0, 180) },
        { label: "Model system", value: "Computational benchmark, dataset, or simulation environment implied by the hypothesis" },
        { label: "Primary endpoint", value: "Performance improvement against explicit baselines and metrics named in the hypothesis" },
        { label: "Mechanism", value: "Algorithmic inductive bias, model change, or simulation assumption described in the hypothesis" },
        { label: "Controls", value: "Baseline models, matched seeds, matched data splits, and ablations" },
        { label: "Readouts", value: "Task metrics, robustness checks, compute cost, and reproducibility artifacts" },
      ];
    case "clinical_retrospective":
      return [
        { label: "Intervention", value: hypothesis.slice(0, 180) },
        { label: "Model system", value: "Retrospective patient cohort or de-identified clinical record set" },
        { label: "Primary endpoint", value: "Clinical outcome, risk stratification, or association endpoint stated in the hypothesis" },
        { label: "Mechanism", value: "Clinical rationale or hypothesized explanatory pathway" },
        { label: "Controls", value: "Inclusion/exclusion criteria, confounder adjustment, and baseline subgroup comparisons" },
        { label: "Readouts", value: "Primary clinical metric, calibration/discrimination, and sensitivity analyses" },
      ];
    case "materials_chemistry":
      return [
        { label: "Intervention", value: hypothesis.slice(0, 180) },
        { label: "Model system", value: "Material formulation, synthesis route, or device stack implied by the hypothesis" },
        { label: "Primary endpoint", value: "Benchmark material property or performance target named in the hypothesis" },
        { label: "Mechanism", value: "Structure-property or chemistry-based rationale described in the hypothesis" },
        { label: "Controls", value: "Baseline formulation, standard synthesis route, and characterization benchmark" },
        { label: "Readouts", value: "Yield, characterization results, and benchmark performance metrics" },
      ];
    case "device_sensor":
      return [
        { label: "Intervention", value: hypothesis.slice(0, 180) },
        { label: "Model system", value: "Prototype device or sensing platform under controlled benchmark conditions" },
        { label: "Primary endpoint", value: "Sensitivity, specificity, limit of detection, or throughput target named in the hypothesis" },
        { label: "Mechanism", value: "Device-design or signal-transduction rationale stated in the hypothesis" },
        { label: "Controls", value: "Reference standard, blank or negative control, and baseline hardware design" },
        { label: "Readouts", value: "Signal quality, calibration behavior, benchmark comparison, and failure modes" },
      ];
    case "general_research":
    default:
      return [
        { label: "Intervention", value: hypothesis.slice(0, 180) },
        { label: "Model system", value: "Research system or benchmark setting implied by the hypothesis and follow-up literature" },
        { label: "Primary endpoint", value: "The main measurable outcome and threshold implied by the hypothesis" },
        { label: "Mechanism", value: "The causal or explanatory rationale stated by the researcher or prior work" },
        { label: "Controls", value: "Baseline comparison, matched control condition, and a fairness check for confounding setup changes" },
        { label: "Readouts", value: "Primary outcome metric, secondary diagnostics, and feasibility or robustness checks" },
      ];
  }
}

function uniqueStrings(values: string[]): string[] {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function cleanFragment(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/[.;,:]+$/, "");
}

function extractComparator(hypothesis: string): string {
  const match = hypothesis.match(
    /\b(?:compared to|compared with|versus|vs\.?|relative to|against|outperform(?:ing)?)\b\s+([^.;,\n]+)/i,
  );

  return cleanFragment(match?.[1] ?? "standard baseline or current practice");
}

function extractThreshold(hypothesis: string): string {
  const thresholdPatterns = [
    /\b(?:at least|at most|below|under|within|above|over)\s+([^.;,\n]+)/i,
    /\b(?:>=|<=|>|<)\s*([^.;,\n]+)/i,
    /\b\d+(?:\.\d+)?\s*(?:%|percent|percentage points|mg\/L|mg\/mL|mmol\/L\/day|days?|weeks?|hours?)\b/i,
  ];

  for (const pattern of thresholdPatterns) {
    const match = hypothesis.match(pattern);
    if (match?.[0]) {
      return cleanFragment(match[0]);
    }
  }

  return "Predefine a measurable success threshold before execution.";
}

function extractSystemContext(hypothesis: string): string {
  const match = hypothesis.match(/\b(?:in|on|using|with|for)\b\s+([^.;,\n]+)/i);
  return cleanFragment(match?.[1] ?? "system implied by the hypothesis");
}

function extractMetrics(hypothesis: string, route: ResearchRoute): string[] {
  const normalized = hypothesis.toLowerCase();
  const candidates = [
    "ssim",
    "psnr",
    "rmse",
    "mae",
    "dice",
    "iou",
    "auc",
    "auroc",
    "f1",
    "accuracy",
    "precision",
    "recall",
    "specificity",
    "sensitivity",
    "bleu",
    "rouge",
    "perplexity",
    "calibration",
    "limit of detection",
    "yield",
    "stability",
    "survival",
    "hazard ratio",
  ];

  const matched = uniqueStrings(
    candidates.filter((candidate) => normalized.includes(candidate)).map((candidate) => {
      switch (candidate) {
        case "ssim":
          return "SSIM";
        case "psnr":
          return "PSNR";
        case "rmse":
          return "RMSE";
        case "mae":
          return "MAE";
        case "dice":
          return "Dice";
        case "iou":
          return "IoU";
        case "auc":
        case "auroc":
          return "AUROC";
        case "f1":
          return "F1";
        case "limit of detection":
          return "limit of detection";
        default:
          return candidate;
      }
    }),
  );

  if (matched.length > 0) {
    return matched;
  }

  switch (route.family) {
    case "medical_imaging":
      return ["task-specific imaging metric", "robustness check", "qualitative structure review"];
    case "computational_ml":
      return ["primary benchmark metric", "variance across seeds", "efficiency"];
    case "clinical_retrospective":
      return ["primary clinical endpoint", "confidence interval", "sensitivity analysis"];
    case "materials_chemistry":
      return ["target property", "characterization result", "reproducibility"];
    case "wet_lab":
    case "animal_study":
      return ["primary assay readout", "mechanistic follow-up", "tolerance or QC check"];
    default:
      return ["primary endpoint", "secondary diagnostic", "robustness check"];
  }
}

function detectTaskLabel(route: ResearchRoute, hypothesis: string): string {
  const normalized = hypothesis.toLowerCase();
  if (normalized.includes("segment")) return "segmentation study";
  if (normalized.includes("denois")) return "denoising study";
  if (normalized.includes("classif")) return "classification study";
  if (normalized.includes("pretrain")) return "pretraining study";
  if (normalized.includes("mask")) return "masking strategy study";
  if (normalized.includes("retriev")) return "retrieval study";
  if (normalized.includes("generation") || normalized.includes("generate")) return "generation study";
  if (normalized.includes("simulation")) return "simulation study";
  if (normalized.includes("synthesis")) return "synthesis study";
  if (normalized.includes("biosensor") || normalized.includes("sensor")) return "sensor-validation study";

  switch (route.family) {
    case "medical_imaging":
      return "medical-imaging benchmark";
    case "computational_ml":
      return "computational benchmark";
    case "clinical_retrospective":
      return "retrospective clinical study";
    case "materials_chemistry":
      return "materials optimization study";
    case "device_sensor":
      return "device-validation study";
    case "wet_lab":
      return "bench experiment";
    case "animal_study":
      return "animal study";
    case "simulation_modeling":
      return "modeling study";
    default:
      return "research study";
  }
}

function adaptiveParseFields(route: ResearchRoute, hypothesis: string): ParsedField[] {
  const comparator = extractComparator(hypothesis);
  const threshold = extractThreshold(hypothesis);
  const context = extractSystemContext(hypothesis);
  const metrics = extractMetrics(hypothesis, route).join(", ");
  const task = detectTaskLabel(route, hypothesis);

  return [
    { label: "Intervention", value: hypothesis.slice(0, 180) },
    { label: "Model system", value: `Primary setting: ${context}. Study type: ${task}.` },
    { label: "Primary endpoint", value: `Primary endpoint should be measured against ${comparator} with success threshold ${threshold}.` },
    { label: "Mechanism", value: "Use the stated mechanistic or architectural rationale from the hypothesis and test whether it actually explains the observed gain." },
    { label: "Controls", value: `Controls should include ${comparator}, matched resource settings, and a fairness check that isolates the proposed intervention.` },
    { label: "Readouts", value: `Primary readouts: ${metrics}. Also include error analysis, robustness checks, and failure-case review.` },
  ];
}

function adaptiveResources(route: ResearchRoute, hypothesis: string): ExperimentPlan["materials"] {
  const task = detectTaskLabel(route, hypothesis);
  const context = extractSystemContext(hypothesis);

  switch (route.family) {
    case "medical_imaging":
    case "computational_ml":
      return [
        { name: `Dataset or benchmark access for ${context}`, supplier: "Public or institutional data source", catalogNumber: "DATA-ACCESS-01", quantity: "1 dataset", estimatedCost: "$0" },
        { name: "Training and evaluation environment", supplier: "PyTorch / JAX / equivalent framework", catalogNumber: "ML-STACK-01", quantity: "1 environment", estimatedCost: "$0" },
        { name: "GPU runtime", supplier: "Cloud or institutional compute", catalogNumber: "GPU-COMPUTE-01", quantity: "40-80 GPU-hours", estimatedCost: "$220" },
        { name: `Experiment tracking for ${task}`, supplier: "Weights & Biases / MLflow / storage", catalogNumber: "TRACK-01", quantity: "1 workspace", estimatedCost: "$60" },
      ];
    case "clinical_retrospective":
      return [
        { name: `De-identified cohort for ${context}`, supplier: "Institutional data source", catalogNumber: "CLIN-COHORT-01", quantity: "1 cohort", estimatedCost: "$0" },
        { name: "Secure analytics workspace", supplier: "Institutional secure compute", catalogNumber: "SECURE-ANALYTICS-01", quantity: "1 workspace", estimatedCost: "$120" },
        { name: "Statistical analysis environment", supplier: "R / Python", catalogNumber: "STATS-ENV-01", quantity: "1 environment", estimatedCost: "$0" },
      ];
    case "materials_chemistry":
      return [
        { name: `Core precursors for ${task}`, supplier: "Laboratory chemical supplier", catalogNumber: "PREC-SET-01", quantity: "1 lot", estimatedCost: "$420" },
        { name: "Characterization access", supplier: "Institutional core facility", catalogNumber: "CHAR-ACCESS-01", quantity: "1 booking block", estimatedCost: "$280" },
        { name: "Consumables and substrates", supplier: "Lab supplier", catalogNumber: "MAT-CONS-01", quantity: "1 lot", estimatedCost: "$180" },
      ];
    case "device_sensor":
      return [
        { name: `Prototype components for ${task}`, supplier: "Electronics or laboratory supplier", catalogNumber: "DEVICE-COMP-01", quantity: "1 build set", estimatedCost: "$280" },
        { name: "Calibration and benchmark standards", supplier: "Reference material supplier", catalogNumber: "CAL-STDS-01", quantity: "1 set", estimatedCost: "$160" },
        { name: "Signal acquisition setup", supplier: "Instrumentation provider", catalogNumber: "DAQ-SETUP-01", quantity: "1 setup", estimatedCost: "$240" },
      ];
    case "simulation_modeling":
      return [
        { name: `Modeling environment for ${task}`, supplier: "Python / MATLAB / simulation stack", catalogNumber: "SIM-ENV-01", quantity: "1 environment", estimatedCost: "$0" },
        { name: "Compute runtime", supplier: "Institutional or cloud compute", catalogNumber: "SIM-COMPUTE-01", quantity: "1 compute block", estimatedCost: "$120" },
      ];
    case "animal_study":
      return [
        { name: `Primary biological system for ${context}`, supplier: "Approved animal or biological source", catalogNumber: "BIO-SYSTEM-01", quantity: "1 cohort", estimatedCost: "$2200" },
        { name: "Assay and monitoring reagents", supplier: "Laboratory supplier", catalogNumber: "ANIMAL-ASSAY-01", quantity: "1 lot", estimatedCost: "$680" },
        { name: "Housing and welfare support", supplier: "Animal facility", catalogNumber: "ANIMAL-HOUSING-01", quantity: "1 study block", estimatedCost: "$1200" },
      ];
    case "wet_lab":
      return [
        { name: `Core assay reagents for ${context}`, supplier: "Relevant supplier", catalogNumber: "ASSAY-CORE-01", quantity: "1 lot", estimatedCost: "$480" },
        { name: "Consumables and controls", supplier: "Laboratory supplier", catalogNumber: "CONTROL-SET-01", quantity: "1 lot", estimatedCost: "$220" },
        { name: "Instrument access", supplier: "Institutional core facility", catalogNumber: "INSTRUMENT-01", quantity: "1 booking block", estimatedCost: "$180" },
      ];
    default:
      return [
        { name: `Evidence pack for ${task}`, supplier: "Scientific literature and researcher input", catalogNumber: "EVIDENCE-01", quantity: "1 bundle", estimatedCost: "$0" },
        { name: "Execution workspace", supplier: "Project environment", catalogNumber: "WORKSPACE-01", quantity: "1 workspace", estimatedCost: "$100" },
      ];
  }
}

function familySpecificParseFields(route: ResearchRoute, hypothesis: string): ParsedField[] {
  switch (route.family) {
    case "medical_imaging":
      return [
        { label: "Intervention", value: hypothesis.slice(0, 180) },
        { label: "Model system", value: "Medical-imaging dataset and modality implied by the hypothesis, with reproducible train/validation/test splits" },
        { label: "Primary endpoint", value: "Improvement on task-specific imaging metrics such as SSIM/PSNR, Dice/IoU, or downstream classification performance" },
        { label: "Mechanism", value: "Imaging inductive bias, masking strategy, architecture change, or representation-learning rationale described in the hypothesis" },
        { label: "Controls", value: "Matched baseline models, label budget, preprocessing pipeline, and modality-consistent evaluation splits" },
        { label: "Readouts", value: "Task metrics, topology or structure preservation, qualitative review, compute cost, and reproducibility artifacts" },
      ];
    case "clinical_retrospective":
      return [
        { label: "Intervention", value: hypothesis.slice(0, 180) },
        { label: "Model system", value: "Retrospective de-identified clinical cohort drawn from existing hospital records or imaging archives" },
        { label: "Primary endpoint", value: "Outcome discrimination, risk stratification, or association strength against a predefined clinical endpoint" },
        { label: "Mechanism", value: "Clinical rationale and confounder-aware relationship implied by the hypothesis" },
        { label: "Controls", value: "Matched inclusion criteria, baseline comparator cohort, and multivariable confounder adjustment" },
        { label: "Readouts", value: "AUROC, calibration, sensitivity analyses, subgroup checks, and missing-data robustness" },
      ];
    case "materials_chemistry":
      return [
        { label: "Intervention", value: hypothesis.slice(0, 180) },
        { label: "Model system", value: "Material formulation, synthesis route, and benchmark device or substrate context implied by the hypothesis" },
        { label: "Primary endpoint", value: "Target material property or performance gain relative to a standard formulation" },
        { label: "Mechanism", value: "Structure-property or reaction-pathway rationale stated in the hypothesis" },
        { label: "Controls", value: "Baseline formulation, standard annealing or synthesis route, and matched characterization workflow" },
        { label: "Readouts", value: "XRD/SEM/FTIR or relevant characterization plus benchmark property measurements and stability" },
      ];
    case "computational_ml":
      return [
        { label: "Intervention", value: hypothesis.slice(0, 180) },
        { label: "Model system", value: "Public or internal benchmark dataset with reproducible train/validation/test splits" },
        { label: "Primary endpoint", value: "Improvement on named task metrics relative to explicit baseline models" },
        { label: "Mechanism", value: "Architectural inductive bias, optimization change, or representation-learning hypothesis" },
        { label: "Controls", value: "Matched data splits, seeds, baselines, compute budget, and ablations" },
        { label: "Readouts", value: "Task metrics, calibration or robustness, inference efficiency, and reproducibility artifacts" },
      ];
    default:
      return genericParseFields(route, hypothesis);
  }
}

function imagingTaskProfile(hypothesis: string): {
  modality: string;
  task: string;
  metrics: string;
  baselines: string;
  resources: Array<{
    name: string;
    supplier: string;
    catalogNumber: string;
    quantity: string;
    estimatedCost: string;
  }>;
} {
  const normalized = hypothesis.toLowerCase();
  const modality = normalized.includes("oct")
    ? "OCT / OCT angiography"
    : normalized.includes("mri")
      ? "MRI"
      : normalized.includes("ct")
        ? "CT"
        : normalized.includes("ultrasound")
          ? "Ultrasound"
          : normalized.includes("x-ray") || normalized.includes("x ray") || normalized.includes("radiograph")
            ? "X-ray / radiograph"
            : "Medical imaging modality";

  const segmentationTask = normalized.includes("segment") || normalized.includes("dice") || normalized.includes("iou");
  const denoisingTask = normalized.includes("denois") || normalized.includes("ssim") || normalized.includes("psnr") || normalized.includes("noise");
  const classificationTask = normalized.includes("classification") || normalized.includes("auc") || normalized.includes("accuracy");
  const lowLabel = normalized.includes("low-label") || normalized.includes("few-shot") || normalized.includes("few shot") || normalized.includes("limited label");

  const task = segmentationTask
    ? "segmentation benchmark"
    : denoisingTask
      ? "denoising benchmark"
      : classificationTask
        ? "classification benchmark"
        : "medical-imaging benchmark";

  const metrics = segmentationTask
    ? "Dice, IoU, sensitivity, topology-aware vessel continuity, and calibration where relevant"
    : denoisingTask
      ? "SSIM, PSNR, RMSE, and downstream task performance"
      : "AUROC, accuracy, sensitivity/specificity, and robustness";

  const baselines = segmentationTask
    ? "U-Net-style segmentation baselines and pretrained representation baselines under the same label budget"
    : denoisingTask
      ? "standard denoising baselines and modality-matched restoration models"
      : "standard supervised baselines and pretrained representation baselines";

  const resources = [
    {
      name: `${modality} dataset access`,
      supplier: "Public or institutional imaging dataset host",
      catalogNumber: "IMAGING-DATA-01",
      quantity: "1 dataset",
      estimatedCost: "$0",
    },
    {
      name: "PyTorch / MONAI imaging stack",
      supplier: "PyTorch / MONAI",
      catalogNumber: "IMAGING-STACK-01",
      quantity: "1 environment",
      estimatedCost: "$0",
    },
    {
      name: lowLabel ? "Annotation subset and label-management workspace" : "Experiment tracking and checkpoint storage",
      supplier: lowLabel ? "Label studio / annotation tooling" : "Weights & Biases / cloud storage",
      catalogNumber: lowLabel ? "LABEL-SET-01" : "EXP-TRACK-01",
      quantity: "1 workspace",
      estimatedCost: lowLabel ? "$120" : "$60",
    },
    {
      name: "NVIDIA T4 or equivalent GPU time",
      supplier: "NVIDIA / cloud compute",
      catalogNumber: "T4-16GB",
      quantity: segmentationTask ? "80 GPU-hours" : "60 GPU-hours",
      estimatedCost: segmentationTask ? "$260" : "$220",
    },
  ];

  return { modality, task, metrics, baselines, resources };
}

function familySpecificPlan(route: ResearchRoute, hypothesis: string): ExperimentPlan | null {
  if (route.family === "medical_imaging") {
    const profile = imagingTaskProfile(hypothesis);
    const normalized = hypothesis.toLowerCase();
    const segmentationTask = normalized.includes("segment") || normalized.includes("dice") || normalized.includes("iou");
    const lowLabel = normalized.includes("low-label") || normalized.includes("few-shot") || normalized.includes("few shot") || normalized.includes("limited label");
    const references = [
      {
        type: "similarity" as const,
        title: "Medical-imaging benchmark and evaluation scaffold",
        source: "arXiv / medical imaging literature",
        doi: "MI-BENCH-01",
        note: "Supports reproducible dataset splits, baseline comparison, and modality-aware evaluation in imaging research.",
        relevanceSummary: "Provides a general scaffold for turning an imaging hypothesis into a fair benchmark rather than an ad hoc experiment.",
      },
      {
        type: "protocol" as const,
        title: "MONAI / PyTorch imaging training workflow",
        source: "MONAI / PyTorch docs",
        doi: "MONAI-TRAIN-01",
        note: "Operational reference for dataset transforms, reproducible training, checkpointing, and modality-aware evaluation.",
        relevanceSummary: "Useful for implementing a robust imaging pipeline with standard tooling and reproducible training practices.",
      },
      {
        type: "similarity" as const,
        title: segmentationTask
          ? "Topology-aware vessel segmentation and low-label representation-learning literature"
          : "Task-specific medical-imaging baseline literature",
        source: "Medical imaging literature",
        doi: segmentationTask ? "VESSEL-SEG-01" : "IMAGING-TASK-01",
        note: segmentationTask
          ? "Anchors topology-aware evaluation, vessel-structure preservation, and label-efficient segmentation design."
          : "Anchors the task-specific baseline and evaluation setup for the stated imaging objective.",
        relevanceSummary: segmentationTask
          ? "Directly supports segmentation tasks where preserving vascular topology matters more than only pixel overlap."
          : "Provides a task-matched baseline reference for the proposed imaging study.",
      },
    ];

    return {
      title: `${profile.modality} ${profile.task} plan`,
      experimentId: "EXP-MI-GEN",
      domain: "Medical imaging",
      experimentFamily: route.family,
      routeSupported: route.supported,
      routingConfidence: route.confidence,
      routingReason: route.reason,
      status: "Ready for modality-aware benchmark setup",
      qualityBar: "Generalizable imaging-study realism",
      generationMode: "fallback",
      parsedFields: familySpecificParseFields(route, hypothesis),
      noveltySignal: "similar work exists",
      references,
      protocol: [
        {
          step: "01",
          title: "Freeze modality, dataset split, and label budget",
          detail: `Define the ${profile.modality} dataset version, patient- or scan-level split strategy, preprocessing, and label budget before training begins.`,
          time: "Days 1-2",
        },
        {
          step: "02",
          title: "Implement baselines and pretraining strategy",
          detail: `Set up ${profile.baselines}, matched augmentation, and any pretraining strategy such as masked autoencoder variants under reproducible settings.`,
          time: "Days 2-4",
        },
        {
          step: "03",
          title: "Train under matched compute and label constraints",
          detail: `Train all models with fixed splits, tracked seeds, and the same compute budget${lowLabel ? " while enforcing the stated low-label regime" : ""}.`,
          time: "Week 1",
        },
        {
          step: "04",
          title: "Evaluate structure preservation and downstream utility",
          detail: `Report ${profile.metrics}, add qualitative review, and run ablations to show whether the proposed inductive bias helps preserve clinically relevant structure.`,
          time: "Week 2",
        },
      ],
      materials: profile.resources,
      budget: [
        { item: "Dataset access and preprocessing", amount: "$0", note: "Public or already licensed imaging data" },
        { item: "GPU compute", amount: segmentationTask ? "$260" : "$220", note: "Matched benchmark budget for baselines and proposed imaging model" },
        { item: lowLabel ? "Annotation and label management" : "Tracking and storage", amount: lowLabel ? "$120" : "$60", note: lowLabel ? "Low-label subset curation and annotation workspace" : "Metrics, checkpoints, and experiment artifacts" },
        { item: "Engineering and evaluation setup", amount: "$260", note: "Benchmark harness, modality transforms, and ablation scripts" },
      ],
      timeline: [
        { phase: "Week 0", action: "Lock dataset split, preprocessing, baselines, and evaluation metrics" },
        { phase: "Week 1", action: "Run training and baseline comparisons" },
        { phase: "Week 2", action: "Complete ablations, qualitative review, and structure-preservation analysis" },
      ],
      validation: [
        segmentationTask
          ? "Primary success metric should include Dice or IoU plus a topology-aware measure when vessel continuity or structure preservation matters."
          : "Primary success metric should match the imaging task and be reported against explicit modality-relevant baselines.",
        lowLabel
          ? "Low-label performance should be reported at the exact label budget promised in the hypothesis, not only in the full-label setting."
          : "Performance should be reported under matched data and compute settings to keep baseline comparisons fair.",
        "Qualitative review should verify that the claimed gain preserves diagnostically relevant structure rather than only optimizing a single scalar metric.",
      ],
      reviewFeedback: [
        {
          section: "Protocol",
          issue: "Freeze the split and label budget before tuning so the low-label or structure-aware claim stays fair.",
          impact: "Improves trust that gains come from the proposed method rather than evaluation drift.",
        },
        {
          section: "Validation",
          issue: segmentationTask
            ? "Add a topology-aware score or vessel continuity check rather than relying on Dice alone."
            : "Add qualitative structure review alongside scalar metrics.",
          impact: "Makes the imaging claim more clinically and scientifically meaningful.",
        },
      ],
      signals: [
        { label: "Novelty signal", value: "Similar work exists", hint: "Imaging claims should benchmark against prior modality-matched baselines" },
        { label: "Planning horizon", value: "2 weeks", hint: "Mostly compute and evaluation time" },
        { label: "Estimated budget", value: segmentationTask ? "$640" : "$540", hint: "Public data plus modest compute and tooling" },
      ],
      designDecision: {
        selectedApproach: `${profile.modality} ${profile.task} with matched baselines`,
        rationale: "This family-level imaging benchmark is the minimum credible design because it tests the hypothesis under fixed splits, matched baselines, and modality-appropriate metrics.",
        costImplication: "Costs remain compute- and tooling-bound rather than laboratory-bound, which keeps the plan general across imaging subfields.",
        escalationTrigger: "Escalate to reader studies, external validation, or larger curated labels only after the benchmark shows stable gains.",
        alternatives: [
          {
            rank: 1,
            name: "Single-baseline pilot benchmark",
            type: "in silico",
            rationale: "Cheaper and faster, but too weak to support a strong imaging-method claim across baselines.",
            estimatedSavings: "$100-$180",
            costEstimate: "$420",
            timeEstimate: "1 week",
            accuracyExpectation: "Moderate",
          },
          {
            rank: 2,
            name: "Full modality-aware benchmark",
            type: "in silico",
            rationale: "Best fit for a general imaging hypothesis because it compares against matched baselines and tracks structure-preservation effects.",
            estimatedSavings: "$0",
            costEstimate: segmentationTask ? "$640" : "$540",
            timeEstimate: "2 weeks",
            accuracyExpectation: "High",
          },
        ],
        budgetComparison: {
          selectedApproachCost: segmentationTask ? "$640" : "$540",
          cheapestAlternativeCost: "$420",
          premiumVsCheapest: segmentationTask ? "$220" : "$120",
          summary: "The premium pays for proper baseline coverage and structure-aware validation, which is necessary for a trustworthy imaging claim.",
        },
      },
      sectionCitations: buildSectionCitations(references),
    };
  }

  if (route.family === "clinical_retrospective") {
    const references = [
      {
        type: "similarity" as const,
        title: "STROBE Statement: guidelines for reporting observational studies",
        source: "EQUATOR / observational research guidance",
        doi: "10.1016/S0140-6736(07)61602-X",
        note: "Essential reporting and design scaffold for retrospective cohort studies with clear endpoints and confounder handling.",
        relevanceSummary: "Provides the structure needed to design and report a trustworthy retrospective study.",
      },
      {
        type: "protocol" as const,
        title: "REDCap workflow for retrospective cohort data abstraction",
        source: "REDCap Consortium",
        doi: "REDCAP-RETRO-01",
        note: "Operational scaffold for data dictionary design, abstraction, and audit logging in retrospective clinical review.",
        relevanceSummary: "Useful for setting up reproducible extraction and audit trails for a retrospective cohort.",
      },
      {
        type: "similarity" as const,
        title: "TRIPOD+AI / model evaluation guidance for clinical prediction studies",
        source: "BMJ / clinical prediction reporting",
        doi: "10.1136/bmj-2023-078378",
        note: "Supports evaluation design when retrospective analysis includes predictive modeling or risk scoring.",
        relevanceSummary: "Keeps model validation, calibration, and reporting aligned with accepted clinical-prediction standards.",
      },
    ];

    return {
      title: "Retrospective clinical cohort study plan",
      experimentId: "EXP-CL-4201",
      domain: "Clinical retrospective",
      experimentFamily: route.family,
      routeSupported: route.supported,
      routingConfidence: route.confidence,
      routingReason: route.reason,
      status: "Ready for IRB and data-access review",
      qualityBar: "Retrospective study rigor",
      generationMode: "fallback",
      parsedFields: familySpecificParseFields(route, hypothesis),
      noveltySignal: "similar work exists",
      references,
      protocol: [
        {
          step: "01",
          title: "Define cohort and endpoint",
          detail: "Lock inclusion and exclusion criteria, index date, follow-up window, outcome definition, and minimum data completeness rules before extraction begins.",
          time: "Days 1-3",
        },
        {
          step: "02",
          title: "Approve data access and abstraction schema",
          detail: "Secure IRB or equivalent review if needed, build a de-identified data dictionary, and map all predictors, confounders, and endpoint labels before chart abstraction.",
          time: "Week 1",
        },
        {
          step: "03",
          title: "Extract and clean retrospective cohort",
          detail: "Pull records into a locked analytic dataset, document missingness, apply pre-specified exclusions, and generate a patient flow diagram.",
          time: "Weeks 2-3",
        },
        {
          step: "04",
          title: "Run adjusted analysis and subgroup validation",
          detail: "Estimate the primary association or prediction performance using adjusted models, then run sensitivity analyses and clinically relevant subgroup checks.",
          time: "Week 4",
        },
      ],
      materials: [
        { name: "De-identified retrospective cohort extract", supplier: "Hospital data warehouse", catalogNumber: "RETRO-COHORT-01", quantity: "1 cohort", estimatedCost: "$0" },
        { name: "REDCap data abstraction project", supplier: "REDCap", catalogNumber: "REDCAP-RETRO", quantity: "1 project", estimatedCost: "$0" },
        { name: "Statistical analysis environment", supplier: "R / Python", catalogNumber: "STATS-ENV-01", quantity: "1 environment", estimatedCost: "$0" },
        { name: "Secure storage and audit log", supplier: "Institutional secure compute", catalogNumber: "SECURE-DATA-01", quantity: "1 workspace", estimatedCost: "$120" },
      ],
      budget: [
        { item: "IRB / governance preparation", amount: "$150", note: "Protocol drafting, compliance review, and data-request overhead" },
        { item: "Data abstraction time", amount: "$480", note: "Chart review or cohort variable cleanup for a moderate retrospective study" },
        { item: "Secure compute and storage", amount: "$120", note: "Protected workspace and audit logging" },
        { item: "Statistical analysis and reporting", amount: "$300", note: "Modeling, calibration, subgroup analyses, and reporting artifacts" },
      ],
      timeline: [
        { phase: "Week 0", action: "Finalize cohort definition, endpoint, and governance checklist" },
        { phase: "Weeks 1-2", action: "Abstract, de-identify, and clean retrospective records" },
        { phase: "Week 3", action: "Run primary adjusted analysis and calibration checks" },
        { phase: "Week 4", action: "Complete subgroup analyses, flow diagram, and reporting tables" },
      ],
      validation: [
        "Primary endpoint and cohort definition must be fixed before any outcome analysis begins.",
        "Report adjusted effect sizes or prediction metrics with confidence intervals and calibration where relevant.",
        "Include missing-data handling, sensitivity analyses, and subgroup checks to show the result is not driven by extraction artifacts.",
      ],
      reviewFeedback: [
        {
          section: "Protocol",
          issue: "Lock inclusion criteria and missing-data policy before the first extract to avoid target leakage and cohort drift.",
          impact: "Improves retrospective-study credibility and reproducibility.",
        },
        {
          section: "Validation",
          issue: "Add calibration and subgroup performance rather than relying on a single global metric.",
          impact: "Makes the clinical interpretation stronger and less brittle.",
        },
      ],
      signals: [
        { label: "Novelty signal", value: "Similar work exists", hint: "Retrospective observational studies should benchmark prior cohorts and reporting standards" },
        { label: "Planning horizon", value: "3-4 weeks", hint: "Governance and cohort cleaning dominate timeline" },
        { label: "Estimated budget", value: "$1,050", hint: "Mostly analyst time and secure data handling" },
      ],
      designDecision: {
        selectedApproach: "Retrospective cohort analysis on de-identified clinical data",
        rationale: "This is the lowest-cost path when the question can be answered from existing patient records without new recruitment or prospective data collection.",
        costImplication: "Most cost comes from governance, data cleaning, and analyst time rather than reagents or compute.",
        escalationTrigger: "Escalate to prospective validation only if the retrospective signal is strong enough to justify new data collection.",
        alternatives: [
          {
            rank: 1,
            name: "Single-center pilot cohort",
            type: "dataset",
            rationale: "Cheaper and faster, but potentially underpowered and vulnerable to center-specific bias.",
            estimatedSavings: "$200-$300",
            costEstimate: "$750",
            timeEstimate: "2-3 weeks",
            accuracyExpectation: "Moderate",
          },
          {
            rank: 2,
            name: "Multi-site retrospective cohort",
            type: "dataset",
            rationale: "More robust and generalizable, but slower because of harmonization and governance.",
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
          summary: "The premium is justified when better generalizability and subgroup stability matter more than raw speed.",
        },
      },
      sectionCitations: buildSectionCitations(references),
    };
  }

  if (route.family === "materials_chemistry") {
    const references = [
      {
        type: "similarity" as const,
        title: "Standard thin-film and precursor optimization workflows for laboratory materials screening",
        source: "Nature / materials methods",
        doi: "MAT-SCREEN-01",
        note: "Provides a practical scaffold for iterative formulation, deposition, annealing, and characterization loops.",
        relevanceSummary: "Useful for structuring a materials optimization study around repeatable synthesis and characterization.",
      },
      {
        type: "protocol" as const,
        title: "XRD and SEM characterization workflow for materials benchmarking",
        source: "JoVE / characterization protocol",
        doi: "CHAR-WORKFLOW-01",
        note: "Operational reference for phase verification, morphology assessment, and benchmark comparison after synthesis.",
        relevanceSummary: "Supports the characterization side needed to connect synthesis changes to material performance.",
      },
      {
        type: "supplier" as const,
        title: "Precursor and substrate sourcing guide for lab-scale materials studies",
        source: "Sigma-Aldrich / technical documents",
        doi: "SIGMA-MAT-01",
        note: "Supports practical precursor selection, purity assumptions, and lab-scale sourcing realism.",
        relevanceSummary: "Anchors the supply-chain side of a materials experiment so the plan remains operationally plausible.",
      },
    ];

    return {
      title: "Materials synthesis and characterization benchmark",
      experimentId: "EXP-MC-3302",
      domain: "Materials chemistry",
      experimentFamily: route.family,
      routeSupported: route.supported,
      routingConfidence: route.confidence,
      routingReason: route.reason,
      status: "Ready for synthesis planning",
      qualityBar: "Repeatable materials-screening realism",
      generationMode: "fallback",
      parsedFields: familySpecificParseFields(route, hypothesis),
      noveltySignal: "similar work exists",
      references,
      protocol: [
        {
          step: "01",
          title: "Lock formulation matrix and controls",
          detail: "Define precursor ratios, solvent system, substrate, and baseline formulation before any synthesis work begins.",
          time: "Days 1-2",
        },
        {
          step: "02",
          title: "Run small-batch synthesis screen",
          detail: "Prepare replicate small batches across the candidate formulation space using a fixed deposition or synthesis workflow and documented annealing conditions.",
          time: "Week 1",
        },
        {
          step: "03",
          title: "Characterize structure and morphology",
          detail: "Use XRD, SEM, and at least one complementary method such as FTIR or UV-Vis to confirm phase, morphology, and material consistency.",
          time: "Week 2",
        },
        {
          step: "04",
          title: "Benchmark performance and stability",
          detail: "Measure the target property under matched benchmark conditions, then repeat the best candidates to confirm reproducibility and short-term stability.",
          time: "Week 3",
        },
      ],
      materials: [
        { name: "Core precursor set", supplier: "Sigma-Aldrich", catalogNumber: "MAT-PREC-01", quantity: "1 lot", estimatedCost: "$420" },
        { name: "Substrate or device substrate", supplier: "FTO glass / equivalent supplier", catalogNumber: "SUBSTRATE-01", quantity: "20 units", estimatedCost: "$180" },
        { name: "Solvent and cleaning reagents", supplier: "Sigma-Aldrich", catalogNumber: "SOLVENT-SET-01", quantity: "1 lot", estimatedCost: "$140" },
        { name: "XRD access", supplier: "Institutional core facility", catalogNumber: "XRD-ACCESS", quantity: "6 hours", estimatedCost: "$240" },
        { name: "SEM access", supplier: "Institutional core facility", catalogNumber: "SEM-ACCESS", quantity: "4 hours", estimatedCost: "$220" },
      ],
      budget: [
        { item: "Precursors and substrates", amount: "$600", note: "Core chemicals, purity-controlled precursors, and substrates" },
        { item: "Synthesis consumables", amount: "$160", note: "Solvents, pipette tips, filters, and cleaning reagents" },
        { item: "Characterization access", amount: "$460", note: "XRD and SEM core-facility time" },
        { item: "Repeat runs and contingency", amount: "$180", note: "Best-candidate repeats and failed batch buffer" },
      ],
      timeline: [
        { phase: "Week 0", action: "Lock formulation matrix, order precursors, and reserve characterization instruments" },
        { phase: "Week 1", action: "Run synthesis batches and record process conditions" },
        { phase: "Week 2", action: "Complete XRD, SEM, and supporting characterization" },
        { phase: "Week 3", action: "Benchmark target property, repeat top candidates, and summarize stability" },
      ],
      validation: [
        "Top candidates must outperform the baseline formulation on the target property under matched test conditions.",
        "At least one structural characterization method and one morphology or complementary method must support the claimed mechanism.",
        "Repeat synthesis of the best candidate should produce comparable performance to show the effect is not a single-batch artifact.",
      ],
      reviewFeedback: [
        {
          section: "Protocol",
          issue: "Limit the first-pass formulation matrix to a tractable number of candidates before expanding the search.",
          impact: "Prevents budget burn from an unnecessarily broad synthesis screen.",
        },
        {
          section: "Validation",
          issue: "Require repeat synthesis of the best candidate before claiming a true material improvement.",
          impact: "Improves trust that the gain is reproducible and not batch noise.",
        },
      ],
      signals: [
        { label: "Novelty signal", value: "Similar work exists", hint: "Materials studies should position against baseline formulation and benchmark characterization literature" },
        { label: "Planning horizon", value: "3 weeks", hint: "Instrument booking and repeat batches dominate timing" },
        { label: "Estimated budget", value: "$1,400", hint: "Precursors plus characterization access" },
      ],
      designDecision: {
        selectedApproach: "Small-batch synthesis plus characterization benchmark",
        rationale: "This is the cheapest route that still tests both material formation and the target performance claim under repeatable laboratory conditions.",
        costImplication: "Most cost comes from precursor quality and instrument access, not large-scale production.",
        escalationTrigger: "Escalate to larger-scale synthesis or long-horizon stability testing only after the best lab-scale candidate reproduces reliably.",
        alternatives: [
          {
            rank: 1,
            name: "Characterization-light pilot screen",
            type: "in vitro",
            rationale: "Cheaper and faster, but risks missing whether performance gains are caused by real structural changes.",
            estimatedSavings: "$250-$350",
            costEstimate: "$1,050",
            timeEstimate: "2 weeks",
            accuracyExpectation: "Moderate",
          },
          {
            rank: 2,
            name: "Full synthesis and characterization benchmark",
            type: "in vitro",
            rationale: "Best fit for a materials hypothesis because it links synthesis conditions to verified structure and benchmark performance.",
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
          summary: "The premium buys structural characterization that makes the claimed mechanism far more trustworthy.",
        },
      },
      sectionCitations: buildSectionCitations(references),
    };
  }

  if (route.family === "computational_ml") {
    const references = [
      {
        type: "similarity" as const,
        title: "Reproducible deep learning benchmark design",
        source: "arXiv / ML systems guidance",
        doi: "ML-BENCH-01",
        note: "Covers fixed data splits, seed control, ablation logic, and fair baseline comparison for model claims.",
        relevanceSummary: "Supports a benchmark-style ML experiment with matched baselines and reproducibility controls.",
      },
      {
        type: "protocol" as const,
        title: "PyTorch experiment management and checkpointing workflow",
        source: "PyTorch docs",
        doi: "PYTORCH-EXP-01",
        note: "Operational scaffold for training loops, checkpointing, logging, and deterministic evaluation.",
        relevanceSummary: "Useful for turning a model hypothesis into a reproducible computational experiment.",
      },
      {
        type: "supplier" as const,
        title: "Cloud GPU runtime planning guide",
        source: "NVIDIA / cloud compute",
        doi: "GPU-RUN-01",
        note: "Supports realistic budgeting for benchmark training and ablations.",
        relevanceSummary: "Anchors the cost model for compute-heavy ML experiments.",
      },
    ];

    return {
      title: "Computational ML benchmark plan",
      experimentId: "EXP-ML-5104",
      domain: "Computational ML",
      experimentFamily: route.family,
      routeSupported: route.supported,
      routingConfidence: route.confidence,
      routingReason: route.reason,
      status: "Ready for benchmark execution",
      qualityBar: "Reproducible benchmark realism",
      generationMode: "fallback",
      parsedFields: familySpecificParseFields(route, hypothesis),
      noveltySignal: "similar work exists",
      references,
      protocol: [
        {
          step: "01",
          title: "Freeze benchmark split and baselines",
          detail: "Define the dataset version, train/validation/test split, preprocessing, and baseline models before tuning begins.",
          time: "Days 1-2",
        },
        {
          step: "02",
          title: "Implement model and reproducibility controls",
          detail: "Set deterministic seeds where possible, lock optimizer settings, and instrument training with checkpointing and metric logging.",
          time: "Days 2-4",
        },
        {
          step: "03",
          title: "Train baselines and proposed method",
          detail: "Run baseline models and the proposed approach under matched compute budgets, reporting mean and variance across repeated seeds if feasible.",
          time: "Week 1",
        },
        {
          step: "04",
          title: "Ablate and stress-test the claim",
          detail: "Run ablations, robustness checks, and inference-cost comparisons so the claimed gain can be attributed to the proposed intervention rather than training noise.",
          time: "Week 2",
        },
      ],
      materials: [
        { name: "Benchmark dataset access", supplier: "Public dataset host", catalogNumber: "ML-DATA-01", quantity: "1 dataset", estimatedCost: "$0" },
        { name: "PyTorch training stack", supplier: "PyTorch", catalogNumber: "torch-2.x", quantity: "1 environment", estimatedCost: "$0" },
        { name: "GPU runtime", supplier: "NVIDIA / cloud compute", catalogNumber: "GPU-RUNTIME-01", quantity: "60 GPU-hours", estimatedCost: "$220" },
        { name: "Experiment tracking", supplier: "Weights & Biases / equivalent", catalogNumber: "ML-TRACK-01", quantity: "1 workspace", estimatedCost: "$60" },
      ],
      budget: [
        { item: "GPU compute", amount: "$220", note: "Matched training budget for baselines and proposed model" },
        { item: "Tracking and storage", amount: "$60", note: "Metrics, checkpoints, and artifact storage" },
        { item: "Engineering setup", amount: "$240", note: "Benchmark harness, scripts, and reproducibility checks" },
        { item: "Ablation contingency", amount: "$120", note: "Extra runs for failed seeds or critical ablations" },
      ],
      timeline: [
        { phase: "Week 0", action: "Freeze split, baselines, metrics, and logging stack" },
        { phase: "Week 1", action: "Run training and baseline comparisons" },
        { phase: "Week 2", action: "Complete ablations, robustness checks, and efficiency summary" },
      ],
      validation: [
        "The proposed method must outperform named baselines under matched splits and compute budgets.",
        "Ablations should show which component drives the gain rather than relying on a monolithic architecture claim.",
        "Report both task performance and efficiency so the improvement is not achieved at an unrealistic computational cost.",
      ],
      reviewFeedback: [
        {
          section: "Protocol",
          issue: "Lock the split and baselines before tuning to avoid benchmark drift.",
          impact: "Improves trust that the gain is real and not an evaluation artifact.",
        },
        {
          section: "Validation",
          issue: "Add repeated seeds or variance reporting where compute permits.",
          impact: "Prevents overclaiming from a single favorable run.",
        },
      ],
      signals: [
        { label: "Novelty signal", value: "Similar work exists", hint: "ML claims should be benchmarked against explicit baselines" },
        { label: "Planning horizon", value: "2 weeks", hint: "Mostly compute and ablation time" },
        { label: "Estimated budget", value: "$640", hint: "GPU usage plus setup and ablation buffer" },
      ],
      designDecision: {
        selectedApproach: "Matched benchmark with ablations and compute tracking",
        rationale: "This is the minimum credible design for an ML hypothesis because it tests gains against fixed baselines rather than isolated cherry-picked runs.",
        costImplication: "Costs stay modest if the study remains on public data and commodity GPU time.",
        escalationTrigger: "Escalate to larger benchmarks or private data only after the public benchmark shows stable gains.",
        alternatives: [
          {
            rank: 1,
            name: "Single-run baseline comparison",
            type: "in silico",
            rationale: "Cheaper, but too weak to support a strong ML performance claim.",
            estimatedSavings: "$120-$180",
            costEstimate: "$460",
            timeEstimate: "1 week",
            accuracyExpectation: "Moderate",
          },
          {
            rank: 2,
            name: "Full reproducible benchmark with ablations",
            type: "in silico",
            rationale: "Best fit for a general ML research claim because it separates real gains from tuning noise.",
            estimatedSavings: "$0",
            costEstimate: "$640",
            timeEstimate: "2 weeks",
            accuracyExpectation: "High",
          },
        ],
        budgetComparison: {
          selectedApproachCost: "$640",
          cheapestAlternativeCost: "$460",
          premiumVsCheapest: "$180",
          summary: "The premium pays for ablations and variance checks that make the result far more trustworthy.",
        },
      },
      sectionCitations: buildSectionCitations(references),
    };
  }

  return null;
}

function genericPlanForRoute(hypothesis: string, route: ResearchRoute): ExperimentPlan {
  const parsedFields = adaptiveParseFields(route, hypothesis);
  const comparator = extractComparator(hypothesis);
  const threshold = extractThreshold(hypothesis);
  const metrics = extractMetrics(hypothesis, route);
  const task = detectTaskLabel(route, hypothesis);
  const context = extractSystemContext(hypothesis);
  const materials = adaptiveResources(route, hypothesis);
  const totalEstimatedCost = materials.reduce((sum, item) => {
    const numeric = Number.parseFloat(item.estimatedCost.replace(/[^0-9.]/g, ""));
    return Number.isFinite(numeric) ? sum + numeric : sum;
  }, 0);
  const roundedCost = totalEstimatedCost > 0 ? `$${Math.round(totalEstimatedCost + 180)}` : "$300";
  const domainLabel = route.family === "general_research" ? "General research" : route.label;
  const reviewWindow =
    route.family === "medical_imaging" || route.family === "computational_ml"
      ? "2 weeks"
      : route.family === "clinical_retrospective" || route.family === "materials_chemistry"
        ? "3-4 weeks"
        : route.family === "animal_study"
          ? "4-6 weeks"
          : "2-3 weeks";

  return {
    title: `${task[0].toUpperCase()}${task.slice(1)} plan`,
    experimentId: "EXP-GEN-1000",
    domain: domainLabel,
    experimentFamily: route.family,
    routeSupported: route.supported,
    routingConfidence: route.confidence,
    routingReason: route.reason,
    status: route.supported ? "Ready for evidence-grounded review" : "Scientist review required before execution",
    qualityBar: "Adaptive first-pass planning",
    generationMode: "fallback",
    parsedFields,
    noveltySignal: "not found",
    references: [
      {
        type: "similarity",
        title: `${domainLabel} evidence scaffold`,
        source: "Route-aware hypothesis extraction",
        doi: `adaptive-${route.family}`,
        note: `This fallback plan was composed from the hypothesis structure itself: context ${context}, comparator ${comparator}, threshold ${threshold}, and metrics ${metrics.join(", ")}.`,
        relevanceSummary: `Keeps the plan aligned to the hypothesis even before stronger literature grounding is available for ${domainLabel.toLowerCase()}.`,
      },
    ],
    protocol: [
      {
        step: "01",
        title: "Lock scope, comparator, and success threshold",
        detail: `Freeze the study scope for ${context}, confirm ${comparator} as the baseline, and register success as ${threshold} before any execution begins.`,
        time: "Days 1-2",
      },
      {
        step: "02",
        title: "Assemble matched baselines and resources",
        detail: `Set up the resources required for a ${task}, keep the comparator matched to the proposed intervention, and make sure the evaluation stack can measure ${metrics.join(", ")}.`,
        time: "Days 2-4",
      },
      {
        step: "03",
        title: "Run pilot or benchmark execution",
        detail: "Execute a first-pass run under locked conditions, confirm that the primary endpoint is measurable, and document failure modes before expanding the study.",
        time: "Week 1",
      },
      {
        step: "04",
        title: "Stress-test the claim",
        detail: `Repeat or ablate the most important components so the claimed gain can be attributed to the intervention rather than uncontrolled setup changes.`,
        time: route.family === "animal_study" ? "Weeks 2-4" : "Week 2",
      },
    ],
    materials,
    budget: [
      { item: "Core setup", amount: roundedCost, note: `First-pass setup for ${task} using the inferred resource profile.` },
      { item: "Scientist review", amount: "$150", note: "Review to verify that the extracted comparator, threshold, and controls match the actual study intent." },
      { item: "Contingency", amount: "$120", note: "Buffer for missing controls, reruns, or additional evidence-grounding work." },
      { item: "Documentation and reproducibility", amount: "$80", note: "Protocol notes, seeds, logs, and failure-case tracking." },
    ],
    timeline: [
      { phase: "Week 0", action: "Freeze task, comparator, metrics, and execution environment" },
      { phase: "Week 1", action: "Run first-pass execution and verify that the endpoint is measurable" },
      { phase: reviewWindow, action: "Expand, repeat, or ablate once the first-pass design is stable" },
    ],
    validation: [
      `Primary validation should report ${metrics.join(", ")} against ${comparator}.`,
      `The claimed gain should only be accepted if it clears ${threshold} under matched conditions.`,
      "A repeat run, ablation, or robustness check should confirm that the result is not driven by a hidden setup change.",
    ],
    reviewFeedback: [
      {
        section: "Protocol",
        issue: "Confirm that the extracted comparator and task framing match the real study intent before scaling the plan.",
        impact: "Prevents a concrete-looking plan from drifting away from the actual scientific question.",
      },
      {
        section: "Validation",
        issue: "Keep one explicit fairness or robustness check so the observed gain can be attributed to the intervention itself.",
        impact: "Improves trust across unfamiliar fields where hidden setup changes can mimic progress.",
      },
    ],
    signals: [
      { label: "Novelty signal", value: "Evidence review needed", hint: "Fallback plan is aligned to the hypothesis structure, but stronger literature grounding should still refine it." },
      { label: "Planning horizon", value: reviewWindow, hint: "Based on the inferred experiment family and execution model" },
      { label: "Estimated budget", value: roundedCost, hint: "Resource estimate inferred from the experiment family rather than a fixed demo template" },
    ],
    designDecision: {
      selectedApproach: `Adaptive ${task} benchmark`,
      rationale: `The plan is built around the hypothesis's own comparator (${comparator}), success threshold (${threshold}), and task-specific metrics (${metrics.join(", ")}), which is safer than forcing it into a narrow demo template.`,
      costImplication: "Costs are kept proportional to the inferred execution model and should only grow once literature grounding or scientist review confirms the next level of detail.",
      escalationTrigger: "Escalate to a richer, more specialized plan only after the first-pass benchmark shows that the extracted task framing and endpoint are correct.",
      alternatives: [
        {
          rank: 1,
          name: "Minimal pilot using extracted endpoint",
          type: route.family === "wet_lab" || route.family === "animal_study" ? "in vitro" : "in silico",
          rationale: "Fastest way to verify that the endpoint and comparator are measurable before committing more resources.",
          estimatedSavings: "$100-$300",
          costEstimate: "$180-$320",
          timeEstimate: "1-2 days",
          accuracyExpectation: "Moderate",
        },
        {
          rank: 2,
          name: "Full first-pass adaptive plan",
          type: route.family === "clinical_retrospective" ? "dataset" : "in silico",
          rationale: "Balanced option that stays hypothesis-aligned while still producing an operational plan.",
          estimatedSavings: "$0",
          costEstimate: roundedCost,
          timeEstimate: reviewWindow,
          accuracyExpectation: "High",
        },
      ],
      budgetComparison: {
        selectedApproachCost: roundedCost,
        cheapestAlternativeCost: "$180-$320",
        premiumVsCheapest: "Context-dependent",
        summary: "The premium pays for matched controls, explicit metrics, and a reproducible setup instead of a vague one-shot pilot.",
      },
    },
    sectionCitations: buildSectionCitations([
      {
        type: "similarity",
        title: `${domainLabel} evidence scaffold`,
        source: "Route-aware hypothesis extraction",
        doi: `adaptive-${route.family}`,
        note: "Adaptive fallback plan derived from the hypothesis structure rather than a fixed demo template.",
      },
    ]),
  };
}

type BasePlan = Omit<ExperimentPlan, "generationMode" | "sectionCitations">;

function basePlan(domain: DomainKey): BasePlan {
  switch (domain) {
    case "diagnostics":
      return {
        title: "Rapid CRP paper-sensor validation package",
        experimentId: "EXP-DX-1042",
        domain: "Diagnostics",
        status: "Ready for materials ordering",
        qualityBar: "CRO-style assay feasibility",
        parsedFields: baseParseFields(domain),
        noveltySignal: "similar work exists",
        references: [
          {
            type: "similarity",
            title: "Electrochemical paper biosensors for inflammatory marker detection in blood",
            source: "Biosensors & Bioelectronics, 2025",
            doi: "10.1016/j.bios.2025.118839",
            note: "Strong overlap on paper-electrode format and CRP target, but requires preprocessed plasma rather than raw whole blood.",
          },
          {
            type: "protocol",
            title: "Fabrication workflow for wax-patterned electrochemical paper devices",
            source: "Nature Protocol Exchange, 2024",
            doi: "nprot-ex-2024-771",
            note: "Useful scaffold for electrode printing, blocking, and capture antibody immobilization.",
          },
          {
            type: "supplier",
            title: "High-sensitivity CRP antibody pair application note",
            source: "Thermo Fisher",
            doi: "AN-CRP-288",
            note: "Supports reagent selection and calibration range assumptions used in the materials list.",
          },
        ],
        protocol: [
          {
            step: "01",
            title: "Fabricate paper electrode strips",
            detail:
              "Print working, reference, and counter electrodes on wax-patterned cellulose substrate, then cure and verify baseline resistance before functionalization.",
            time: "Days 1-2",
          },
          {
            step: "02",
            title: "Immobilize CRP capture chemistry",
            detail:
              "Apply anti-CRP antibodies and blocking buffer to the sensing zone, then store under desiccation for overnight stabilization.",
            time: "Day 2",
          },
          {
            step: "03",
            title: "Run whole-blood spike-in panel",
            detail:
              "Challenge strips with whole-blood samples across the expected CRP range without preprocessing and record electrochemical response at 2, 5, and 10 minutes.",
            time: "Days 3-4",
          },
          {
            step: "04",
            title: "Benchmark against ELISA",
            detail:
              "Run matched CRP concentrations through a laboratory ELISA kit to estimate concordance, false negative rate, and lower limit of detection.",
            time: "Day 5",
          },
        ],
        materials: [
          { name: "Screen-printable carbon ink", supplier: "Metrohm", catalogNumber: "6.1246.020", quantity: "1 kit", estimatedCost: "$680" },
          { name: "Anti-CRP monoclonal antibody", supplier: "Thermo Fisher", catalogNumber: "MA1-81364", quantity: "1 vial", estimatedCost: "$410" },
          { name: "Cellulose paper substrate", supplier: "Whatman", catalogNumber: "1442-090", quantity: "2 packs", estimatedCost: "$92" },
          { name: "Human CRP standard", supplier: "Sigma-Aldrich", catalogNumber: "C4063", quantity: "1 unit", estimatedCost: "$188" },
          { name: "CRP ELISA kit", supplier: "Abcam", catalogNumber: "ab260058", quantity: "1 kit", estimatedCost: "$620" },
        ],
        budget: [
          { item: "Sensor fabrication", amount: "$1,180", note: "Paper, carbon ink, wax patterning, blocking reagents" },
          { item: "Antibody and standards", amount: "$820", note: "Capture chemistry and calibration standards" },
          { item: "Benchmark assay", amount: "$620", note: "ELISA comparison kit and consumables" },
          { item: "Instrumentation time", amount: "$540", note: "Potentiostat access and lab technician setup" },
          { item: "Contingency", amount: "$240", note: "Re-run buffer for strip defects or failed blocking" },
        ],
        timeline: [
          { phase: "Week 0", action: "Finalize strip geometry, order antibodies, confirm potentiostat access" },
          { phase: "Week 1", action: "Fabricate and functionalize strips, verify baseline electrical behavior" },
          { phase: "Week 2", action: "Run CRP whole-blood spike-in matrix and optimize blocking chemistry" },
          { phase: "Week 3", action: "Benchmark against ELISA and prepare sensitivity summary" },
        ],
        validation: [
          "Detection limit below 0.5 mg/L in whole blood within 10 minutes.",
          "Signal-to-noise ratio must remain stable across at least three fabrication batches.",
          "ELISA concordance target above 0.9 for matched calibration samples.",
        ],
        reviewFeedback: [
          {
            section: "Materials",
            issue: "Include anticoagulant-treated control blood source and transport constraints.",
            impact: "Improves realism for same-day validation runs with fresh matrix samples.",
          },
          {
            section: "Protocol",
            issue: "Specify humidity storage conditions for pre-functionalized strips.",
            impact: "Reduces risk of degraded assay performance before testing.",
          },
          {
            section: "Validation",
            issue: "Add a hemolysis sensitivity check to whole-blood acceptance criteria.",
            impact: "Makes the readout more trustworthy for real sample conditions.",
          },
        ],
        signals: [
          { label: "Novelty signal", value: "Similar work exists", hint: "Whole-blood requirement is still differentiating" },
          { label: "Planning horizon", value: "15 working days", hint: "Rapid prototyping with assay comparison" },
          { label: "Estimated budget", value: "$3,400", hint: "Assay development plus benchmark ELISA" },
        ],
        designDecision: {
          selectedApproach: "Paper-based whole-blood electrochemical assay validation",
          rationale: "A bench-top strip workflow is the lowest-cost setup that still tests the exact claim: sub-10-minute CRP detection in whole blood without preprocessing.",
          costImplication: "This avoids animal work and keeps the study in a rapid assay-development budget range.",
          escalationTrigger: "Escalate to larger clinical validation only if strip-to-strip variance and ELISA concordance both clear the acceptance targets.",
          alternatives: [
            {
              rank: 1,
              name: "Buffer-only spike-in assay",
              type: "in vitro",
              rationale: "Cheaper and faster, but it would not capture matrix interference from whole blood and would overstate real performance.",
              estimatedSavings: "$1,000-$1,500",
              costEstimate: "$1,800",
              timeEstimate: "1 week",
              accuracyExpectation: "Low for real samples",
            },
            {
              rank: 2,
              name: "Retrospective ELISA dataset comparison",
              type: "dataset",
              rationale: "Useful for calibration planning, but it cannot validate the actual electrochemical strip or time-to-result claim.",
              estimatedSavings: "$1,800-$2,200",
              costEstimate: "$1,300",
              timeEstimate: "3-4 days",
              accuracyExpectation: "Moderate for planning only",
            },
          ],
          budgetComparison: {
            selectedApproachCost: "$3,400",
            cheapestAlternativeCost: "$1,300",
            premiumVsCheapest: "$2,100",
            summary: "The premium is justified because the chosen setup is the first one that actually tests whole-blood performance and turnaround time.",
          },
        },
      };
    case "cell":
      return {
        title: "Trehalose cryopreservation viability study",
        experimentId: "EXP-CB-2871",
        domain: "Cell biology",
        status: "Ready for freezer workflow review",
        qualityBar: "Cell-line protocol readiness",
        parsedFields: baseParseFields(domain),
        noveltySignal: "similar work exists",
        references: [
          {
            type: "similarity",
            title: "Trehalose-based cryoprotection improves mammalian cell recovery after thaw",
            source: "Cryobiology, 2024",
            doi: "10.1016/j.cryobiol.2024.104122",
            note: "Relevant for trehalose substitution, but not specific to HeLa cells or direct sucrose comparison.",
          },
          {
            type: "protocol",
            title: "Standardized thaw-recovery viability assay for adherent cell lines",
            source: "protocols.io",
            doi: "dx.doi.org/10.17504/protocols.io.hela-recovery",
            note: "Useful reference for matched freezing, thawing, and 24-hour recovery assessment.",
          },
          {
            type: "supplier",
            title: "Cryoprotectant formulation considerations for DMSO alternatives",
            source: "Sigma technical bulletin",
            doi: "TB-CRYO-44",
            note: "Supports media composition choices and thaw handling assumptions.",
          },
        ],
        protocol: [
          {
            step: "01",
            title: "Prepare matched HeLa cultures",
            detail:
              "Expand HeLa cells to log-phase growth, normalize passage number, and split into matched cryopreservation batches for each medium condition.",
            time: "Days 1-2",
          },
          {
            step: "02",
            title: "Formulate freezing media",
            detail:
              "Prepare control medium with standard DMSO + sucrose and experimental medium with trehalose replacement at matched osmolarity.",
            time: "Day 2",
          },
          {
            step: "03",
            title: "Controlled-rate freezing",
            detail:
              "Freeze equal-density aliquots using a controlled-rate freezing container, then transfer to long-term storage after the initial cooldown.",
            time: "Day 2",
          },
          {
            step: "04",
            title: "Thaw and assess recovery",
            detail:
              "Thaw matched vials rapidly, plate standardized cell counts, and measure immediate viability and 24-hour recovery morphology.",
            time: "Days 7-8",
          },
        ],
        materials: [
          { name: "HeLa cell line", supplier: "ATCC", catalogNumber: "CCL-2", quantity: "1 vial", estimatedCost: "$485" },
          { name: "Trehalose", supplier: "Sigma-Aldrich", catalogNumber: "T9449", quantity: "500 g", estimatedCost: "$116" },
          { name: "Sucrose", supplier: "Sigma-Aldrich", catalogNumber: "S0389", quantity: "500 g", estimatedCost: "$72" },
          { name: "Cell freezing medium base", supplier: "Gibco", catalogNumber: "12648010", quantity: "2 units", estimatedCost: "$244" },
          { name: "Trypan blue viability kit", supplier: "Thermo Fisher", catalogNumber: "T10282", quantity: "1 kit", estimatedCost: "$148" },
        ],
        budget: [
          { item: "Cell culture setup", amount: "$1,220", note: "Cell line, media, flasks, and incubator use" },
          { item: "Cryoprotectant reagents", amount: "$460", note: "Trehalose, sucrose, DMSO, and freezing containers" },
          { item: "Viability readouts", amount: "$540", note: "Cell counter, dyes, and imaging support" },
          { item: "Labor", amount: "$780", note: "Bench time across prep, freeze, and thaw stages" },
          { item: "Contingency", amount: "$220", note: "Repeat vials for failed thaw conditions" },
        ],
        timeline: [
          { phase: "Week 0", action: "Lock osmolarity targets, expand matched cell stock" },
          { phase: "Week 1", action: "Freeze both media conditions with controlled-rate handling" },
          { phase: "Week 2", action: "Thaw, count viability, and capture 24-hour recovery" },
          { phase: "Week 3", action: "Compare conditions, prepare recovery summary and review notes" },
        ],
        validation: [
          "Immediate viability improvement of at least 15 percentage points versus control.",
          "24-hour adherent recovery must not degrade despite higher initial viability.",
          "Cell morphology and membrane integrity need to trend consistently with count data.",
        ],
        reviewFeedback: [
          {
            section: "Protocol",
            issue: "Specify whether trehalose is extracellular only or also introduced via pre-loading.",
            impact: "Clarifies a critical mechanistic assumption that affects reproducibility.",
          },
          {
            section: "Validation",
            issue: "Add recovery at 72 hours to detect delayed growth penalties.",
            impact: "Prevents overestimating success from short-window viability alone.",
          },
          {
            section: "Budget",
            issue: "Include controlled-rate freezing consumables explicitly.",
            impact: "Improves budget realism for labs that do not already stock them.",
          },
        ],
        signals: [
          { label: "Novelty signal", value: "Similar work exists", hint: "HeLa + direct sucrose swap remains useful and testable" },
          { label: "Planning horizon", value: "14 working days", hint: "Short cycle with delayed recovery checks" },
          { label: "Estimated budget", value: "$3,220", hint: "Cell culture and cryo workflow only" },
        ],
        designDecision: {
          selectedApproach: "HeLa cryopreservation comparison in vitro",
          rationale: "An in vitro cell-line model directly measures post-thaw viability and recovery without the cost or ethical overhead of animal work.",
          costImplication: "This is the lowest-cost design that still tests the membrane-stabilization hypothesis under controlled freezing conditions.",
          escalationTrigger: "Escalate to primary cells only if HeLa results are positive but translational relevance to a target cell type becomes a gating concern.",
          alternatives: [
            {
              rank: 2,
              name: "Primary human cell panel",
              type: "ex vivo",
              rationale: "Closer to real-world applications, but much more expensive and variable for an initial formulation screen.",
              estimatedSavings: "$2,000-$3,000",
              costEstimate: "$5,500",
              timeEstimate: "3-4 weeks",
              accuracyExpectation: "High but low throughput",
            },
            {
              rank: 1,
              name: "Membrane simulation study",
              type: "in silico",
              rationale: "Can suggest osmotic behavior, but cannot replace empirical post-thaw viability and replating measurements.",
              estimatedSavings: "$1,000-$1,400",
              costEstimate: "$1,800",
              timeEstimate: "3-5 days",
              accuracyExpectation: "Low to moderate",
            },
          ],
          budgetComparison: {
            selectedApproachCost: "$3,220",
            cheapestAlternativeCost: "$1,800",
            premiumVsCheapest: "$1,420",
            summary: "The extra spend over simulation-only work is justified because the chosen assay directly measures thaw survival and recovery.",
          },
        },
      };
    case "climate":
      return {
        title: "Sporomusa ovata carbon-fixation reactor plan",
        experimentId: "EXP-CT-5198",
        domain: "Climate tech",
        status: "Awaiting reactor hardware confirmation",
        qualityBar: "Bench-scale carbon conversion realism",
        parsedFields: baseParseFields(domain),
        noveltySignal: "similar work exists",
        references: [
          {
            type: "similarity",
            title: "Microbial electrosynthesis of acetate by Sporomusa ovata at poised cathodes",
            source: "Environmental Science & Technology, 2025",
            doi: "10.1021/acs.est.5b02117",
            note: "Strong mechanistic overlap, but benchmark rate target here is more aggressive than published median values.",
          },
          {
            type: "protocol",
            title: "Bench-scale bioelectrochemical reactor setup for acetogenic organisms",
            source: "JoVE, 2024",
            doi: "10.3791/64188",
            note: "Operational reference for reactor assembly, gas handling, and startup sequence.",
          },
          {
            type: "supplier",
            title: "Carbon felt cathode handling and pretreatment guidance",
            source: "Metrohm Autolab note",
            doi: "AUTOLAB-CF-19",
            note: "Supports material selection and electrode pretreatment assumptions.",
          },
        ],
        protocol: [
          {
            step: "01",
            title: "Assemble anaerobic reactor hardware",
            detail:
              "Configure bench reactor with carbon felt cathode, reference electrode, gas-tight headspace, and potentiostat capable of stable -400mV vs SHE control.",
            time: "Week 1",
          },
          {
            step: "02",
            title: "Prepare inoculum and medium",
            detail:
              "Revive Sporomusa ovata under anaerobic conditions, prepare bicarbonate-buffered medium, and confirm baseline growth before reactor inoculation.",
            time: "Week 1",
          },
          {
            step: "03",
            title: "Start electrosynthesis run",
            detail:
              "Inoculate reactor, begin cathode poising, flow CO2 continuously, and monitor current density and acetate accumulation daily.",
            time: "Weeks 2-3",
          },
          {
            step: "04",
            title: "Benchmark productivity and stability",
            detail:
              "Compare acetate rate, coulombic efficiency, and current stability against literature benchmark runs and abiotic controls.",
            time: "Week 4",
          },
        ],
        materials: [
          { name: "Sporomusa ovata culture", supplier: "DSMZ", catalogNumber: "DSM 2662", quantity: "1 culture", estimatedCost: "$540" },
          { name: "Carbon felt cathode", supplier: "Fuel Cell Store", catalogNumber: "CFT-25", quantity: "4 sheets", estimatedCost: "$260" },
          { name: "Ag/AgCl reference electrode", supplier: "Metrohm", catalogNumber: "6.0729.100", quantity: "1 unit", estimatedCost: "$398" },
          { name: "Anaerobic medium reagents", supplier: "Sigma-Aldrich", catalogNumber: "mixed set", quantity: "1 lot", estimatedCost: "$520" },
          { name: "Acetate assay kit", supplier: "Megazyme", catalogNumber: "K-ACETRM", quantity: "1 kit", estimatedCost: "$320" },
        ],
        budget: [
          { item: "Reactor hardware", amount: "$2,880", note: "Electrodes, seals, reference electrode, tubing" },
          { item: "Biological setup", amount: "$1,260", note: "Culture acquisition and anaerobic media preparation" },
          { item: "Analytical readouts", amount: "$1,100", note: "Acetate kit, GC support, sampling consumables" },
          { item: "Potentiostat usage", amount: "$940", note: "Instrument access across multi-day runs" },
          { item: "Contingency", amount: "$520", note: "Leaks, failed inoculation, and additional seals" },
        ],
        timeline: [
          { phase: "Week 0", action: "Confirm hardware availability and anaerobic workflow slots" },
          { phase: "Week 1", action: "Assemble reactor, pretreat electrodes, revive culture" },
          { phase: "Weeks 2-3", action: "Run electrosynthesis and capture daily productivity data" },
          { phase: "Week 4", action: "Benchmark output, assess stability, prepare decision memo" },
        ],
        validation: [
          "Acetate productivity must meet or exceed 150 mmol/L/day.",
          "Coulombic efficiency should remain within acceptable variance for at least three days of steady operation.",
          "Abiotic control should confirm that acetate production is biologically mediated.",
        ],
        reviewFeedback: [
          {
            section: "Protocol",
            issue: "Include startup lag expectations before declaring the run underperforming.",
            impact: "Prevents premature failure calls during inoculum adaptation.",
          },
          {
            section: "Materials",
            issue: "Add gas manifold fittings and anaerobic sampling syringes.",
            impact: "Closes a common operational gap in reactor planning.",
          },
          {
            section: "Validation",
            issue: "Track pH drift as a cofactor for acetate productivity interpretation.",
            impact: "Improves diagnosis of low-yield runs.",
          },
        ],
        signals: [
          { label: "Novelty signal", value: "Similar work exists", hint: "Rate target is ambitious but grounded" },
          { label: "Planning horizon", value: "20 working days", hint: "Hardware and inoculum setup dominate" },
          { label: "Estimated budget", value: "$6,700", hint: "Includes hardware-heavy setup" },
        ],
        designDecision: {
          selectedApproach: "Bench-scale bioelectrochemical reactor run",
          rationale: "The core claim depends on real cathode potential control, living culture behavior, and measured acetate productivity, which requires an operating reactor rather than a purely analytical surrogate.",
          costImplication: "Hardware raises upfront cost, but it is still the smallest setup that can test productivity and coulombic efficiency credibly.",
          escalationTrigger: "Escalate to parallel reactors or larger volumes only if a single-reactor run meets acetate and stability targets.",
          alternatives: [
            {
              rank: 2,
              name: "Abiotic electrochemistry screen",
              type: "in vitro",
              rationale: "Cheaper for electrode checks, but it cannot answer the microbial CO2-fixation question.",
              estimatedSavings: "$1,500-$2,000",
              costEstimate: "$4,800",
              timeEstimate: "1-2 weeks",
              accuracyExpectation: "Moderate for hardware only",
            },
            {
              rank: 1,
              name: "Published benchmark reanalysis",
              type: "dataset",
              rationale: "Helpful for target-setting, but it does not produce new productivity data for the proposed cathode condition.",
              estimatedSavings: "$2,500-$3,000",
              costEstimate: "$3,700",
              timeEstimate: "4-5 days",
              accuracyExpectation: "Low for new claims",
            },
          ],
          budgetComparison: {
            selectedApproachCost: "$6,700",
            cheapestAlternativeCost: "$3,700",
            premiumVsCheapest: "$3,000",
            summary: "The premium is justified because only the selected reactor run can generate new productivity data under the stated electrochemical conditions.",
          },
        },
      };
    case "imaging":
      return {
        title: "SharpXR-style pediatric chest X-ray denoising benchmark",
        experimentId: "EXP-MI-2508",
        domain: "Medical imaging",
        status: "Ready for reproducible compute run",
        qualityBar: "Reproducible radiology-model validation",
        parsedFields: baseParseFields(domain),
        noveltySignal: "similar work exists",
        references: [
          {
            type: "similarity",
            title: "SharpXR: Structure-Aware Denoising for Pediatric Chest X-Rays",
            source: "arXiv",
            doi: "10.48550/arXiv.2508.08518",
            note: "Direct overlap with pediatric chest X-ray denoising, Laplacian-guided edge preservation, dual-decoder design, Poisson-Gaussian noise simulation, and downstream pneumonia classification.",
            sourceUrl: "https://arxiv.org/abs/2508.08518",
            repository: "arXiv",
            provenanceLabel: "Scientific literature source",
            venue: "CoRR / arXiv",
            authors: [
              "Ilerioluwakiiye Abolade",
              "Emmanuel Idoko",
              "Solomon Odelola",
              "Promise Omoigui",
              "Adetola Adebanwo",
              "Aondana Iorumbur",
              "Udunna Anazodo",
              "Alessandro Crimi",
              "Raymond Confidence",
            ],
            publishedYear: "2025",
            relevanceSummary: "This is an exact conceptual match for the proposed hypothesis, including the same imaging modality, noise model, architectural inductive biases, and downstream classification evaluation.",
          },
          {
            type: "similarity",
            title: "Beyond a Gaussian Denoiser: Residual Learning of Deep CNN for Image Denoising",
            source: "IEEE TIP",
            doi: "10.1109/TIP.2017.2662206",
            note: "Canonical DnCNN baseline for comparing structure-aware denoising gains against a standard convolutional denoiser.",
            venue: "IEEE Transactions on Image Processing",
            publishedYear: "2017",
            relevanceSummary: "Provides a standard denoising baseline that your proposed structure-aware model should outperform on SSIM and PSNR.",
          },
          {
            type: "protocol",
            title: "Pediatric Chest X-Ray Pneumonia dataset evaluation workflow",
            source: "Kaggle / public dataset host",
            doi: "CHEST-XRAY-PNEUMONIA",
            note: "Operational scaffold for dataset splits, classifier evaluation, and reproducible low-dose noise simulation on pediatric chest radiographs.",
            sourceUrl: "https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia",
            repository: "Public imaging dataset",
            provenanceLabel: "Scientific literature source",
            venue: "Public dataset host",
            publishedYear: "2018",
            relevanceSummary: "Provides the pediatric chest X-ray data needed to reproduce denoising and downstream pneumonia-classification experiments.",
          },
        ],
        protocol: [
          {
            step: "01",
            title: "Assemble dataset and deterministic splits",
            detail:
              "Download the Pediatric Chest X-Ray Pneumonia dataset, create patient-level train/validation/test splits, and normalize image size and intensity handling for all baselines.",
            time: "Days 1-2",
          },
          {
            step: "02",
            title: "Simulate low-dose degradation",
            detail:
              "Generate noisy inputs with a Poisson-Gaussian noise model using exposure and Gaussian parameters sampled across a clinically plausible range, while preserving the original clean image as supervision target.",
            time: "Days 2-3",
          },
          {
            step: "03",
            title: "Train denoising baselines and SharpXR-style model",
            detail:
              "Train DnCNN, ResUNet, and the structure-aware dual-decoder model under matched optimization settings, recording SSIM, PSNR, RMSE, and inference time per epoch.",
            time: "Week 1",
          },
          {
            step: "04",
            title: "Run downstream diagnostic validation",
            detail:
              "Train or reuse a pneumonia classifier on clean, noisy, and denoised outputs to quantify whether denoising preserves or improves downstream classification accuracy and AUC.",
            time: "Week 2",
          },
          {
            step: "05",
            title: "Perform ablations and reporting",
            detail:
              "Ablate Laplacian edge enhancement and the dual-decoder fusion module, then summarize where structure-aware inductive biases improve anatomy preservation over standard denoisers.",
            time: "Week 2",
          },
        ],
        materials: [
          { name: "Pediatric Chest X-Ray dataset access", supplier: "Kaggle / public dataset host", catalogNumber: "CHEST-XRAY-PNEUMONIA", quantity: "1 dataset", estimatedCost: "$0" },
          { name: "PyTorch training stack", supplier: "PyTorch", catalogNumber: "torch-2.x", quantity: "1 environment", estimatedCost: "$0" },
          { name: "NVIDIA T4 or equivalent GPU time", supplier: "NVIDIA / cloud compute", catalogNumber: "T4-16GB", quantity: "50 GPU-hours", estimatedCost: "$180" },
          { name: "Experiment tracking and checkpoint storage", supplier: "Weights & Biases / cloud storage", catalogNumber: "EXP-TRACK-01", quantity: "1 workspace", estimatedCost: "$60" },
          { name: "scikit-image metrics and evaluation stack", supplier: "scikit-image", catalogNumber: "skimage-0.24", quantity: "1 environment", estimatedCost: "$0" },
        ],
        budget: [
          { item: "Dataset acquisition", amount: "$0", note: "Public pediatric chest X-ray dataset" },
          { item: "GPU compute", amount: "$180", note: "Approximate cloud cost for denoiser and classifier training on T4-class hardware" },
          { item: "Storage and experiment tracking", amount: "$60", note: "Checkpoints, logs, and reproducibility artifacts" },
          { item: "Engineering time", amount: "$320", note: "Pipeline setup, metric validation, and ablation scripts" },
          { item: "Contingency", amount: "$90", note: "Repeat runs and hyperparameter sweeps" },
        ],
        timeline: [
          { phase: "Week 0", action: "Lock dataset splits, noise parameters, and baseline model definitions" },
          { phase: "Week 1", action: "Train DnCNN, ResUNet, and SharpXR-style denoisers under matched settings" },
          { phase: "Week 2", action: "Run pneumonia-classification transfer evaluation and architecture ablations" },
          { phase: "Week 3", action: "Aggregate SSIM, PSNR, RMSE, classification metrics, and qualitative examples into a report" },
        ],
        validation: [
          "Primary success metric: SSIM improves over DnCNN and ResUNet by at least 3-5% under matched Poisson-Gaussian noise settings.",
          "PSNR and RMSE must improve without visually erasing diagnostically relevant lung structures and boundaries.",
          "Downstream pneumonia classification accuracy should improve relative to noisy and baseline-denoised inputs, with AUC reported alongside accuracy.",
        ],
        reviewFeedback: [
          {
            section: "Protocol",
            issue: "Make the noise simulation range explicit and reuse fixed seeds across all baselines.",
            impact: "Improves reproducibility and prevents unfair baseline comparisons.",
          },
          {
            section: "Validation",
            issue: "Report both classification accuracy and AUC to avoid overinterpreting class-balance artifacts.",
            impact: "Makes the downstream clinical-value claim more robust.",
          },
          {
            section: "Budget",
            issue: "Keep compute costs tied to public-cloud GPU hours instead of vague infrastructure estimates.",
            impact: "Prevents the plan from looking like an unnecessary wet-lab spend.",
          },
        ],
        signals: [
          { label: "Novelty signal", value: "Similar work exists", hint: "Structure-aware pediatric X-ray denoising literature is directly relevant here" },
          { label: "Planning horizon", value: "10-15 working days", hint: "Mostly compute and evaluation time" },
          { label: "Estimated budget", value: "$650", hint: "Public data plus modest GPU usage" },
        ],
        designDecision: {
          selectedApproach: "Public-dataset computational benchmark with structure-aware denoising and downstream classifier validation",
          rationale: "This is the lowest-cost design that still tests the exact hypothesis on pediatric chest X-rays using the intended low-dose noise model and diagnostic endpoint.",
          costImplication: "The study is compute-bound rather than reagent-bound, so costs should stay modest and should not include wet-lab materials or animal work.",
          escalationTrigger: "Escalate to reader studies, external hospital validation, or prospective data only after the public-dataset benchmark shows consistent gains over DnCNN and ResUNet.",
          alternatives: [
            {
              rank: 1,
              name: "Baseline-only denoiser comparison on public chest X-rays",
              type: "dataset",
              rationale: "Cheapest first-pass validation using the same dataset and metrics, but without the full ablation depth or downstream classifier study.",
              estimatedSavings: "$150-$250",
              costEstimate: "$400",
              timeEstimate: "1 week",
              accuracyExpectation: "Moderate",
            },
            {
              rank: 2,
              name: "Full SharpXR-style benchmark with classifier transfer",
              type: "in silico",
              rationale: "Best fit for the hypothesis because it tests both denoising quality and downstream diagnostic value.",
              estimatedSavings: "$0",
              costEstimate: "$650",
              timeEstimate: "2-3 weeks",
              accuracyExpectation: "High",
            },
            {
              rank: 3,
              name: "Radiologist reader study on denoised outputs",
              type: "ex vivo",
              rationale: "Stronger clinical validation, but more expensive and unnecessary before the computational benchmark shows clear gains.",
              estimatedSavings: "N/A",
              costEstimate: "$2,000+",
              timeEstimate: "4-6 weeks",
              accuracyExpectation: "Very high clinical relevance",
            },
          ],
          budgetComparison: {
            selectedApproachCost: "$650",
            cheapestAlternativeCost: "$400",
            premiumVsCheapest: "$250",
            summary: "The extra spend is justified because the selected design measures both image quality and downstream pneumonia classification, which is central to the hypothesis.",
          },
        },
      };
    case "gut":
    default:
      return {
        title: "Gut barrier reinforcement in murine probiotic dosing study",
        experimentId: "EXP-GH-3814",
        domain: "Gut health",
        status: "Ready for materials ordering",
        qualityBar: "Lab-trustworthy in vivo package",
        parsedFields: baseParseFields(domain),
        noveltySignal: "similar work exists",
        references: [
          {
            type: "similarity",
            title: "Lactobacillus rhamnosus GG reduces epithelial barrier dysfunction in murine colitis models",
            source: "Gut Microbes, 2024",
            doi: "10.1080/19490976.2024.11842",
            note: "Matches intervention and barrier-focused endpoint, but uses DSS injury instead of healthy mice.",
          },
          {
            type: "protocol",
            title: "FITC-dextran permeability assay in murine gut barrier studies",
            source: "Bio-protocol, 2023",
            doi: "bio-protocol-4493",
            note: "Provides the closest operational protocol for dosing, fasting, and sample timing.",
          },
          {
            type: "supplier",
            title: "Mouse tight junction protein quantification workflow for claudin-1 and occludin",
            source: "Thermo Fisher application note",
            doi: "AN-INT-443",
            note: "Useful for validating antibody panel, extraction workflow, and storage assumptions.",
          },
        ],
        protocol: [
          {
            step: "01",
            title: "Cohort setup and acclimation",
            detail:
              "Randomize 24 female C57BL/6 mice into control and probiotic arms, then acclimate for 7 days under identical housing and chow conditions.",
            time: "Days -7 to 0",
          },
          {
            step: "02",
            title: "Daily probiotic administration",
            detail:
              "Administer 1e9 CFU Lactobacillus rhamnosus GG in sterile PBS by oral gavage once daily for 28 consecutive days. Vehicle arm receives matched PBS volume.",
            time: "Days 1 to 28",
          },
          {
            step: "03",
            title: "Barrier challenge and serum collection",
            detail:
              "Fast animals for 4 hours, dose FITC-dextran orally at 600 mg/kg, and collect serum 4 hours post dose for fluorescence quantification.",
            time: "Day 29",
          },
          {
            step: "04",
            title: "Mechanistic validation",
            detail:
              "Harvest ileum and proximal colon, isolate RNA and protein, and quantify claudin-1 and occludin via qPCR and Western blot against GAPDH.",
            time: "Days 29 to 31",
          },
        ],
        materials: [
          { name: "Lactobacillus rhamnosus GG", supplier: "ATCC", catalogNumber: "53103", quantity: "2 vials", estimatedCost: "$420" },
          { name: "FITC-dextran, 4 kDa", supplier: "Sigma-Aldrich", catalogNumber: "FD4-1G", quantity: "1 kit", estimatedCost: "$168" },
          { name: "Claudin-1 antibody", supplier: "Thermo Fisher", catalogNumber: "37-4900", quantity: "1 unit", estimatedCost: "$312" },
          { name: "Occludin antibody", supplier: "Invitrogen", catalogNumber: "71-1500", quantity: "1 unit", estimatedCost: "$298" },
          { name: "RNA extraction kit", supplier: "Qiagen", catalogNumber: "74104", quantity: "2 kits", estimatedCost: "$460" },
          { name: "Western blot reagents", supplier: "Bio-Rad", catalogNumber: "1705061", quantity: "1 set", estimatedCost: "$540" },
        ],
        budget: [
          { item: "Animals + housing", amount: "$3,100", note: "Vendor order + 5 week husbandry" },
          { item: "Reagents + antibodies", amount: "$2,198", note: "Includes 10% contingency on disposables" },
          { item: "Assay readouts", amount: "$1,640", note: "Plate reader, qPCR consumables, imaging" },
          { item: "Labor", amount: "$1,120", note: "0.25 FTE research associate" },
          { item: "Buffer", amount: "$362", note: "Cold chain and rush shipping reserve" },
        ],
        timeline: [
          { phase: "Week 0", action: "Protocol lock, supplier ordering, IACUC check" },
          { phase: "Week 1", action: "Cohort arrival, acclimation, baseline metadata capture" },
          { phase: "Weeks 2-5", action: "Daily probiotic dosing and welfare monitoring" },
          { phase: "Week 5", action: "FITC permeability assay and sample harvest" },
          { phase: "Week 6", action: "qPCR, Western blot, interpretation, review pack" },
        ],
        validation: [
          "Primary success metric: serum FITC signal reduced by at least 30% versus control at day 29.",
          "Mechanistic confirmation: claudin-1 and occludin expression trends move in the same direction by qPCR and Western blot.",
          "Safety guardrails: no adverse body-weight trend beyond 10% and no worsening stool score.",
        ],
        reviewFeedback: [
          {
            section: "Protocol",
            issue: "Dose concentration should be expressed per CFU per mouse, not per mL suspension.",
            impact: "Prevents ambiguity during handoff to animal facility staff.",
          },
          {
            section: "Budget",
            issue: "Add frozen backup stock and shipping risk for live probiotic culture.",
            impact: "Improves operational realism and avoids underpricing.",
          },
          {
            section: "Validation",
            issue: "Include stool score and body-weight trend as secondary tolerance checks.",
            impact: "Strengthens interpretation if permeability improves but health markers worsen.",
          },
        ],
        signals: [
          { label: "Novelty signal", value: "Similar work exists", hint: "3 close studies, 1 protocol scaffold" },
          { label: "Planning horizon", value: "19 working days", hint: "Lead times already included" },
          { label: "Estimated budget", value: "$8,420", hint: "Consumables + assay kits + sequencing" },
        ],
        designDecision: {
          selectedApproach: "Murine probiotic dosing study with FITC-dextran readout",
          rationale: "Whole-organism intestinal permeability, gavage tolerance, and systemic barrier effects cannot be captured fully in a simple cell assay, so an in vivo model is justified for the primary endpoint.",
          costImplication: "Animal housing is the main cost driver, so the plan should only use mice because the hypothesis explicitly depends on organism-level permeability and tolerance.",
          escalationTrigger: "Stay with organoids or epithelial monolayers unless the team needs a whole-animal permeability and tolerance readout tied to probiotic dosing.",
          alternatives: [
            {
              rank: 1,
              name: "Caco-2 or intestinal epithelial monolayer assay",
              type: "in vitro",
              rationale: "Much cheaper for early barrier screening, but it misses host-level dosing, microbiome interaction, and serum FITC translocation.",
              estimatedSavings: "$4,000-$5,000",
              costEstimate: "$3,200",
              timeEstimate: "1-2 weeks",
              accuracyExpectation: "Moderate for barrier directionality",
            },
            {
              rank: 2,
              name: "Gut organoid permeability model",
              type: "organoid",
              rationale: "Better than monolayers for epithelial complexity, but still weaker than mice for systemic permeability and probiotic tolerance signals.",
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
            summary: "The mouse study is substantially more expensive, so the premium is only justified when whole-animal permeability and tolerance are required.",
          },
        },
      };
  }
}

export function parseHypothesis(hypothesis: string): ParseHypothesisResponse {
  const trimmed = hypothesis.trim() || sampleHypotheses.gut;
  const domain = inferDomain(trimmed);
  const route = classifyResearchRoute(trimmed);
  const specializedDomain = domain !== null;
  const parsedFields = specializedDomain
    ? baseParseFields(domain)
    : route.supported
      ? familySpecificParseFields(route, trimmed)
      : adaptiveParseFields(route, trimmed);
  const routedDomainLabel =
    route.family === "general_research"
      ? "General research"
      : route.label;

  return {
    hypothesis: trimmed,
    generationMode: "fallback",
    domain: specializedDomain
      ? domain === "gut"
        ? "Gut health"
        : domain === "imaging"
          ? "Medical imaging"
          : domain === "cell"
            ? "Cell biology"
            : domain === "diagnostics"
              ? "Diagnostics"
              : "Climate tech"
      : routedDomainLabel,
    experimentFamily: route.family,
    routingConfidence: route.confidence,
    routingReason: route.reason,
    routeSupported: route.supported,
    readiness:
      "Specific intervention, measurable outcome, mechanistic rationale, and control condition detected.",
    parsedFields,
  };
}

export function generateExperimentPlan(hypothesis: string): GeneratePlanResponse {
  const trimmed = hypothesis.trim() || sampleHypotheses.gut;
  const domain = inferDomain(trimmed);
  const route = classifyResearchRoute(trimmed);
  const specializedDomain = domain !== null;
  const familyPlan = familySpecificPlan(route, trimmed);
  const plan = specializedDomain
    ? basePlan(domain)
    : familyPlan ?? genericPlanForRoute(trimmed, route);

  return {
    plan: {
      ...plan,
      generationMode: "fallback",
      parsedFields: parseHypothesis(trimmed).parsedFields,
      sectionCitations: buildSectionCitations(plan.references),
    },
  };
}

export const hypothesisTemplates = [
  { id: "diagnostics", label: "Diagnostics", value: sampleHypotheses.diagnostics },
  { id: "gut", label: "Gut health", value: sampleHypotheses.gut },
  { id: "cell", label: "Cell biology", value: sampleHypotheses.cell },
  { id: "climate", label: "Climate tech", value: sampleHypotheses.climate },
];
