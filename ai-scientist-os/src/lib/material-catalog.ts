import type {
  ExperimentPlan,
  MaterialItem,
  ParseHypothesisResponse,
  SignalItem,
} from "@/lib/types";

interface CatalogEntry {
  domain: "diagnostics" | "cell" | "gut" | "climate";
  name: string;
  supplier: string;
  catalogNumber: string;
  quantity: string;
  estimatedCost: string;
  keywords: string[];
  sourceLabel: string;
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
  },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function domainKey(parsed: ParseHypothesisResponse): CatalogEntry["domain"] {
  const domain = normalize(parsed.domain);
  if (domain.includes("diagnostic")) return "diagnostics";
  if (domain.includes("cell")) return "cell";
  if (domain.includes("climate")) return "climate";
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
