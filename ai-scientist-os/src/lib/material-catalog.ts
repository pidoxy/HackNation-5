import type {
  ExperimentPlan,
  MaterialItem,
  ParseHypothesisResponse,
  SignalItem,
} from "@/lib/types";

interface CatalogEntry {
  domain: "diagnostics" | "cell" | "gut" | "climate" | "imaging" | "clinical" | "materials";
  name: string;
  supplier: string;
  catalogNumber: string;
  quantity: string;
  estimatedCost: string;
  keywords: string[];
  sourceLabel: string;
  sourceUrl: string;
}

const CURATED_CATALOG: CatalogEntry[] = [
  {
    domain: "diagnostics",
    name: "Screen-printable carbon ink",
    supplier: "Metrohm",
    catalogNumber: "6.1246.020",
    quantity: "1 kit",
    estimatedCost: "$680",
    keywords: ["carbon ink", "screen printable", "electrode ink"],
    sourceLabel: "Curated diagnostics catalog",
    sourceUrl: "https://www.metrohm.com/",
  },
  {
    domain: "diagnostics",
    name: "Anti-CRP monoclonal antibody",
    supplier: "Thermo Fisher",
    catalogNumber: "MA1-81364",
    quantity: "1 vial",
    estimatedCost: "$410",
    keywords: ["crp antibody", "anti crp", "capture antibody"],
    sourceLabel: "Curated diagnostics catalog",
    sourceUrl: "https://www.thermofisher.com/us/en/home/technical-resources/application-notes.html",
  },
  {
    domain: "diagnostics",
    name: "Human CRP standard",
    supplier: "Sigma-Aldrich",
    catalogNumber: "C4063",
    quantity: "1 unit",
    estimatedCost: "$188",
    keywords: ["crp standard", "c reactive protein standard"],
    sourceLabel: "Curated diagnostics catalog",
    sourceUrl: "https://www.sigmaaldrich.com/US/en/technical-documents",
  },
  {
    domain: "diagnostics",
    name: "CRP ELISA kit",
    supplier: "Abcam",
    catalogNumber: "ab260058",
    quantity: "1 kit",
    estimatedCost: "$620",
    keywords: ["elisa kit", "crp elisa"],
    sourceLabel: "Curated diagnostics catalog",
    sourceUrl: "https://www.abcam.com/",
  },
  {
    domain: "diagnostics",
    name: "PBS running buffer",
    supplier: "Thermo Fisher",
    catalogNumber: "10010023",
    quantity: "500 mL",
    estimatedCost: "$25",
    keywords: ["pbs", "buffer", "running buffer"],
    sourceLabel: "Curated diagnostics catalog",
    sourceUrl: "https://www.thermofisher.com/us/en/home/technical-resources/application-notes.html",
  },
  {
    domain: "cell",
    name: "HeLa cell line",
    supplier: "ATCC",
    catalogNumber: "CCL-2",
    quantity: "1 vial",
    estimatedCost: "$485",
    keywords: ["hela", "hela cells", "cell line"],
    sourceLabel: "Curated cell-biology catalog",
    sourceUrl: "https://www.atcc.org/",
  },
  {
    domain: "cell",
    name: "Trehalose",
    supplier: "Sigma-Aldrich",
    catalogNumber: "T9449",
    quantity: "500 g",
    estimatedCost: "$116",
    keywords: ["trehalose"],
    sourceLabel: "Curated cell-biology catalog",
    sourceUrl: "https://www.sigmaaldrich.com/US/en/technical-documents",
  },
  {
    domain: "cell",
    name: "Sucrose",
    supplier: "Sigma-Aldrich",
    catalogNumber: "S0389",
    quantity: "500 g",
    estimatedCost: "$72",
    keywords: ["sucrose"],
    sourceLabel: "Curated cell-biology catalog",
    sourceUrl: "https://www.sigmaaldrich.com/US/en/technical-documents",
  },
  {
    domain: "cell",
    name: "Cell freezing medium base",
    supplier: "Gibco",
    catalogNumber: "12648010",
    quantity: "2 units",
    estimatedCost: "$244",
    keywords: ["freezing medium", "cryo medium", "freezing media"],
    sourceLabel: "Curated cell-biology catalog",
    sourceUrl: "https://www.thermofisher.com/us/en/home/technical-resources/application-notes.html",
  },
  {
    domain: "cell",
    name: "Trypan blue viability kit",
    supplier: "Thermo Fisher",
    catalogNumber: "T10282",
    quantity: "1 kit",
    estimatedCost: "$148",
    keywords: ["trypan blue", "viability kit", "live dead"],
    sourceLabel: "Curated cell-biology catalog",
    sourceUrl: "https://www.thermofisher.com/us/en/home/technical-resources/application-notes.html",
  },
  {
    domain: "cell",
    name: "Cryovials",
    supplier: "Thermo Fisher",
    catalogNumber: "375418",
    quantity: "50 units",
    estimatedCost: "$40",
    keywords: ["cryovial", "cryovials"],
    sourceLabel: "Curated cell-biology catalog",
    sourceUrl: "https://www.thermofisher.com/us/en/home/technical-resources/application-notes.html",
  },
  {
    domain: "gut",
    name: "Lactobacillus rhamnosus GG",
    supplier: "ATCC",
    catalogNumber: "53103",
    quantity: "2 vials",
    estimatedCost: "$420",
    keywords: ["lactobacillus rhamnosus", "lgg", "probiotic culture"],
    sourceLabel: "Curated gut-health catalog",
    sourceUrl: "https://www.atcc.org/",
  },
  {
    domain: "gut",
    name: "FITC-dextran, 4 kDa",
    supplier: "Sigma-Aldrich",
    catalogNumber: "FD4-1G",
    quantity: "1 kit",
    estimatedCost: "$168",
    keywords: ["fitc dextran", "fd4", "permeability tracer"],
    sourceLabel: "Curated gut-health catalog",
    sourceUrl: "https://www.sigmaaldrich.com/US/en/technical-documents",
  },
  {
    domain: "gut",
    name: "Claudin-1 antibody",
    supplier: "Thermo Fisher",
    catalogNumber: "37-4900",
    quantity: "1 unit",
    estimatedCost: "$312",
    keywords: ["claudin", "claudin-1", "tight junction antibody"],
    sourceLabel: "Curated gut-health catalog",
    sourceUrl: "https://www.thermofisher.com/us/en/home/technical-resources/application-notes.html",
  },
  {
    domain: "gut",
    name: "Occludin antibody",
    supplier: "Invitrogen",
    catalogNumber: "71-1500",
    quantity: "1 unit",
    estimatedCost: "$298",
    keywords: ["occludin", "tight junction antibody"],
    sourceLabel: "Curated gut-health catalog",
    sourceUrl: "https://www.thermofisher.com/us/en/home/technical-resources/application-notes.html",
  },
  {
    domain: "gut",
    name: "RNA extraction kit",
    supplier: "Qiagen",
    catalogNumber: "74104",
    quantity: "2 kits",
    estimatedCost: "$460",
    keywords: ["rna extraction", "rna kit"],
    sourceLabel: "Curated gut-health catalog",
    sourceUrl: "https://www.qiagen.com/us/resources/resourcedetail?id=protocols",
  },
  {
    domain: "climate",
    name: "Sporomusa ovata culture",
    supplier: "DSMZ",
    catalogNumber: "DSM 2662",
    quantity: "1 culture",
    estimatedCost: "$540",
    keywords: ["sporomusa", "acetogen culture"],
    sourceLabel: "Curated climate-tech catalog",
    sourceUrl: "https://www.dsmz.de/",
  },
  {
    domain: "climate",
    name: "Carbon felt cathode",
    supplier: "Fuel Cell Store",
    catalogNumber: "CFT-25",
    quantity: "4 sheets",
    estimatedCost: "$260",
    keywords: ["carbon felt", "cathode", "carbon cloth", "graphite cathode"],
    sourceLabel: "Curated climate-tech catalog",
    sourceUrl: "https://www.fuelcellstore.com/",
  },
  {
    domain: "climate",
    name: "Ag/AgCl reference electrode",
    supplier: "Metrohm",
    catalogNumber: "6.0729.100",
    quantity: "1 unit",
    estimatedCost: "$398",
    keywords: ["reference electrode", "ag/agcl", "electrode"],
    sourceLabel: "Curated climate-tech catalog",
    sourceUrl: "https://www.metrohm.com/",
  },
  {
    domain: "climate",
    name: "Acetate assay kit",
    supplier: "Megazyme",
    catalogNumber: "K-ACETRM",
    quantity: "1 kit",
    estimatedCost: "$320",
    keywords: ["acetate assay", "acetate kit"],
    sourceLabel: "Curated climate-tech catalog",
    sourceUrl: "https://www.megazyme.com/",
  },
  {
    domain: "climate",
    name: "CO2 gas cylinder",
    supplier: "Airgas",
    catalogNumber: "CD CO2",
    quantity: "1 cylinder",
    estimatedCost: "$120",
    keywords: ["co2 gas", "carbon dioxide"],
    sourceLabel: "Curated climate-tech catalog",
    sourceUrl: "https://www.airgas.com/",
  },
  {
    domain: "imaging",
    name: "Pediatric Chest X-Ray dataset access",
    supplier: "Kaggle / public dataset host",
    catalogNumber: "CHEST-XRAY-PNEUMONIA",
    quantity: "1 dataset",
    estimatedCost: "$0",
    keywords: ["pediatric chest x ray", "pneumonia dataset", "chest xray pneumonia", "kermany"],
    sourceLabel: "Curated medical-imaging catalog",
    sourceUrl: "https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia",
  },
  {
    domain: "imaging",
    name: "PyTorch training stack",
    supplier: "PyTorch",
    catalogNumber: "torch-2.x",
    quantity: "1 environment",
    estimatedCost: "$0",
    keywords: ["pytorch", "torch", "deep learning framework"],
    sourceLabel: "Curated medical-imaging catalog",
    sourceUrl: "https://pytorch.org/",
  },
  {
    domain: "imaging",
    name: "NVIDIA T4 or equivalent GPU time",
    supplier: "NVIDIA / cloud compute",
    catalogNumber: "T4-16GB",
    quantity: "50 GPU-hours",
    estimatedCost: "$180",
    keywords: ["gpu", "nvidia", "t4", "a10", "training compute"],
    sourceLabel: "Curated medical-imaging catalog",
    sourceUrl: "https://www.nvidia.com/en-us/data-center/tesla-t4/",
  },
  {
    domain: "imaging",
    name: "Experiment tracking and checkpoint storage",
    supplier: "Weights & Biases / cloud storage",
    catalogNumber: "EXP-TRACK-01",
    quantity: "1 workspace",
    estimatedCost: "$60",
    keywords: ["experiment tracking", "wandb", "storage", "checkpoint"],
    sourceLabel: "Curated medical-imaging catalog",
    sourceUrl: "https://wandb.ai/site",
  },
  {
    domain: "imaging",
    name: "scikit-image metrics and evaluation stack",
    supplier: "scikit-image",
    catalogNumber: "skimage-0.24",
    quantity: "1 environment",
    estimatedCost: "$0",
    keywords: ["ssim", "psnr", "scikit image", "metrics"],
    sourceLabel: "Curated medical-imaging catalog",
    sourceUrl: "https://scikit-image.org/",
  },
  {
    domain: "clinical",
    name: "REDCap data abstraction workspace",
    supplier: "REDCap",
    catalogNumber: "REDCAP-RETRO",
    quantity: "1 project",
    estimatedCost: "$0",
    keywords: ["redcap", "data abstraction", "retrospective cohort", "chart review"],
    sourceLabel: "Curated clinical-research catalog",
    sourceUrl: "https://projectredcap.org/",
  },
  {
    domain: "clinical",
    name: "Secure retrospective cohort extract",
    supplier: "Hospital data warehouse",
    catalogNumber: "RETRO-COHORT-01",
    quantity: "1 cohort",
    estimatedCost: "$0",
    keywords: ["retrospective cohort", "de-identified", "clinical records", "ehr"],
    sourceLabel: "Curated clinical-research catalog",
    sourceUrl: "https://www.hhs.gov/hipaa/index.html",
  },
  {
    domain: "clinical",
    name: "Statistical analysis environment",
    supplier: "R / Python",
    catalogNumber: "STATS-ENV-01",
    quantity: "1 environment",
    estimatedCost: "$0",
    keywords: ["r", "python", "statistical analysis", "survival analysis", "regression"],
    sourceLabel: "Curated clinical-research catalog",
    sourceUrl: "https://www.r-project.org/",
  },
  {
    domain: "materials",
    name: "Core precursor set",
    supplier: "Sigma-Aldrich",
    catalogNumber: "MAT-PREC-01",
    quantity: "1 lot",
    estimatedCost: "$420",
    keywords: ["precursor", "salts", "powder", "chemical precursor", "reagent grade"],
    sourceLabel: "Curated materials-chemistry catalog",
    sourceUrl: "https://www.sigmaaldrich.com/US/en/technical-documents",
  },
  {
    domain: "materials",
    name: "Substrate set",
    supplier: "FTO glass / equivalent supplier",
    catalogNumber: "SUBSTRATE-01",
    quantity: "20 units",
    estimatedCost: "$180",
    keywords: ["substrate", "fto glass", "glass slide", "wafer"],
    sourceLabel: "Curated materials-chemistry catalog",
    sourceUrl: "https://www.sigmaaldrich.com/",
  },
  {
    domain: "materials",
    name: "XRD access",
    supplier: "Institutional core facility",
    catalogNumber: "XRD-ACCESS",
    quantity: "6 hours",
    estimatedCost: "$240",
    keywords: ["xrd", "diffraction", "crystal structure"],
    sourceLabel: "Curated materials-chemistry catalog",
    sourceUrl: "https://www.nature.com/articles/s41578-021-00341-9",
  },
  {
    domain: "materials",
    name: "SEM access",
    supplier: "Institutional core facility",
    catalogNumber: "SEM-ACCESS",
    quantity: "4 hours",
    estimatedCost: "$220",
    keywords: ["sem", "microscopy", "morphology"],
    sourceLabel: "Curated materials-chemistry catalog",
    sourceUrl: "https://www.nature.com/articles/s41592-021-01127-5",
  },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function domainKey(parsed: ParseHypothesisResponse): CatalogEntry["domain"] {
  if (parsed.experimentFamily === "medical_imaging" || parsed.experimentFamily === "computational_ml") {
    return "imaging";
  }
  if (parsed.experimentFamily === "clinical_retrospective") {
    return "clinical";
  }
  if (parsed.experimentFamily === "materials_chemistry") {
    return "materials";
  }

  const domain = normalize(parsed.domain);
  if (domain.includes("diagnostic")) return "diagnostics";
  if (domain.includes("cell")) return "cell";
  if (domain.includes("climate")) return "climate";
  if (domain.includes("imaging") || domain.includes("radiology")) return "imaging";
  return "gut";
}

function scoreEntry(material: MaterialItem, entry: CatalogEntry): number {
  const haystack = normalize(
    [material.name, material.supplier, material.catalogNumber].join(" "),
  );
  const directNameMatch =
    haystack.includes(normalize(entry.name)) || normalize(entry.name).includes(haystack);
  const keywordHits = entry.keywords.filter((keyword) =>
    haystack.includes(normalize(keyword)),
  ).length;
  const supplierHit =
    material.supplier.trim().length > 0 &&
    normalize(material.supplier).includes(normalize(entry.supplier));
  const catalogHit =
    material.catalogNumber.trim().length > 0 &&
    normalize(material.catalogNumber) === normalize(entry.catalogNumber);

  return (
    (directNameMatch ? 80 : 0) +
    keywordHits * 12 +
    (supplierHit ? 10 : 0) +
    (catalogHit ? 25 : 0)
  );
}

function verifyMaterial(material: MaterialItem, entries: CatalogEntry[]): MaterialItem {
  const ranked = entries
    .map((entry) => ({ entry, score: scoreEntry(material, entry) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];

  if (!best || best.score < 24) {
    return {
      ...material,
      verificationStatus: "estimated",
      verificationSource: "Model estimate",
      verificationNote: "No curated catalog match found for this material.",
      verificationConfidence: 0,
    };
  }

  return {
    ...material,
    name: best.entry.name,
    supplier: best.entry.supplier,
    catalogNumber: best.entry.catalogNumber,
    quantity: material.quantity?.trim() || best.entry.quantity,
    estimatedCost: best.entry.estimatedCost,
    verificationStatus: "verified",
    verificationSource: best.entry.sourceLabel,
    verificationNote: `Matched curated catalog entry (${best.score}% confidence).`,
    verificationUrl: best.entry.sourceUrl,
    verificationConfidence: best.score,
  };
}

function materialText(materials: MaterialItem[]): string {
  return materials
    .map((material) => normalize(`${material.name} ${material.supplier} ${material.catalogNumber}`))
    .join("\n");
}

function addCatalogBackfills(
  materials: MaterialItem[],
  entries: CatalogEntry[],
): MaterialItem[] {
  const combined = materialText(materials);
  const backfills = entries.filter((entry) =>
    entry.keywords.some((keyword) => combined.includes(normalize(keyword))),
  );

  const additions = backfills
    .filter(
      (entry) =>
        !combined.includes(normalize(entry.name)) &&
        !combined.includes(normalize(entry.catalogNumber)),
    )
    .slice(0, 2)
    .map<MaterialItem>((entry) => ({
      name: entry.name,
      supplier: entry.supplier,
      catalogNumber: entry.catalogNumber,
      quantity: entry.quantity,
      estimatedCost: entry.estimatedCost,
      verificationStatus: "verified",
      verificationSource: entry.sourceLabel,
      verificationNote: "Added from curated catalog because it is a core assay reagent.",
      verificationUrl: entry.sourceUrl,
      verificationConfidence: 100,
    }));

  return [...materials, ...additions];
}

export function groundPlanMaterials(
  plan: ExperimentPlan,
  parsed: ParseHypothesisResponse,
): ExperimentPlan {
  const domain = domainKey(parsed);
  const catalog = CURATED_CATALOG.filter((entry) => entry.domain === domain);

  const verifiedMaterials = plan.materials.map((material) =>
    verifyMaterial(material, catalog),
  );
  const completedMaterials = addCatalogBackfills(verifiedMaterials, catalog);
  const verifiedCount = completedMaterials.filter(
    (material) => material.verificationStatus === "verified",
  ).length;
  const signal: SignalItem = {
    label: "Catalog grounding",
    value: `${verifiedCount}/${completedMaterials.length} verified`,
    hint: "Curated supplier, catalog, and cost matches applied where possible.",
  };
  const signals = [
    signal,
    ...plan.signals.filter((item) => item.label !== "Catalog grounding"),
  ].slice(0, 4);

  return {
    ...plan,
    materials: completedMaterials,
    signals,
  };
}
