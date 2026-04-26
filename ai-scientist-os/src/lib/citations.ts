import type {
  CitationItem,
  Reference,
  ReferenceType,
  RegenerableSection,
} from "@/lib/types";

const sectionPriority: Record<RegenerableSection, ReferenceType[]> = {
  protocol: ["protocol", "similarity", "conflict", "supplier"],
  materials: ["supplier", "protocol", "similarity", "conflict"],
  budget: ["supplier", "similarity", "protocol", "conflict"],
  timeline: ["protocol", "similarity", "supplier", "conflict"],
  validation: ["similarity", "protocol", "conflict", "supplier"],
};

function toCitation(reference: Reference): CitationItem {
  return {
    title: reference.title,
    source: reference.source,
    doi: reference.doi,
    type: reference.type,
  };
}

function citationsForSection(
  references: Reference[],
  section: RegenerableSection,
): CitationItem[] {
  const priority = sectionPriority[section];
  const sorted = [...references].sort(
    (left, right) => priority.indexOf(left.type) - priority.indexOf(right.type),
  );

  return sorted.slice(0, 3).map(toCitation);
}

export function buildSectionCitations(references: Reference[]) {
  return {
    protocol: citationsForSection(references, "protocol"),
    materials: citationsForSection(references, "materials"),
    budget: citationsForSection(references, "budget"),
    timeline: citationsForSection(references, "timeline"),
    validation: citationsForSection(references, "validation"),
  };
}
