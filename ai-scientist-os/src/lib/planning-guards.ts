import type {
  ExperimentPlan,
  MaterialItem,
  ParseHypothesisResponse,
  Reference,
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
  return normalize(parsed.domain);
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

  return {
    ...plan,
    domain: parsed.domain,
    validation,
    materials,
  };
}
