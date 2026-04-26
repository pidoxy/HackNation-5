import type { ExportPlanRequest } from "@/lib/types";

export function exportPlanAsMarkdown({
  hypothesis,
  parsed,
  plan,
}: Omit<ExportPlanRequest, "format">) {
  const parsedFields = parsed.parsedFields
    .map((field) => `- **${field.label}:** ${field.value}`)
    .join("\n");

  const references = plan.references
    .map(
      (reference, index) =>
        `${index + 1}. **${reference.title}** (${reference.source})\n   - Type: ${reference.type}\n   - Ref: ${reference.doi}\n   - Note: ${reference.note}`,
    )
    .join("\n");

  const protocol = plan.protocol
    .map(
      (step) =>
        `### ${step.step}. ${step.title}\n- Timing: ${step.time}\n- Detail: ${step.detail}`,
    )
    .join("\n\n");

  const materials = plan.materials
    .map(
      (item) =>
        `- **${item.name}** | ${item.supplier} | ${item.catalogNumber} | ${item.quantity} | ${item.estimatedCost}`,
    )
    .join("\n");

  const budget = plan.budget
    .map((item) => `- **${item.item}:** ${item.amount} — ${item.note}`)
    .join("\n");

  const timeline = plan.timeline
    .map((item) => `- **${item.phase}:** ${item.action}`)
    .join("\n");

  const validation = plan.validation.map((item) => `- ${item}`).join("\n");

  const reviewFeedback = plan.reviewFeedback
    .map(
      (item) =>
        `- **${item.section}:** ${item.issue}\n  - Impact: ${item.impact}`,
    )
    .join("\n");

  return `# ${plan.title}

## Experiment Metadata

- **Experiment ID:** ${plan.experimentId}
- **Domain:** ${plan.domain}
- **Status:** ${plan.status}
- **Quality Bar:** ${plan.qualityBar}
- **Generation Mode:** ${plan.generationMode ?? "unknown"}

## Hypothesis

${hypothesis}

## Parsed Scientific Intent

${parsedFields}

## Literature Quality Control

- **Novelty Signal:** ${plan.noveltySignal}

${references}

## Protocol

${plan.sectionCitations.protocol
  .map((citation) => `- Citation: ${citation.title} (${citation.source}, ${citation.doi})`)
  .join("\n")}

${protocol}

## Materials and Supply Chain

${plan.sectionCitations.materials
  .map((citation) => `- Citation: ${citation.title} (${citation.source}, ${citation.doi})`)
  .join("\n")}

${materials}

## Budget

${plan.sectionCitations.budget
  .map((citation) => `- Citation: ${citation.title} (${citation.source}, ${citation.doi})`)
  .join("\n")}

${budget}

## Timeline

${plan.sectionCitations.timeline
  .map((citation) => `- Citation: ${citation.title} (${citation.source}, ${citation.doi})`)
  .join("\n")}

${timeline}

## Validation Approach

${plan.sectionCitations.validation
  .map((citation) => `- Citation: ${citation.title} (${citation.source}, ${citation.doi})`)
  .join("\n")}

${validation}

## Scientist Review Memory

${reviewFeedback}
`;
}
