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
        `${index + 1}. **${reference.title}** (${reference.source})\n   - Type: ${reference.type}\n   - Repository: ${reference.repository ?? reference.source}\n   - Provenance: ${reference.provenanceLabel ?? "Scientific literature source"}\n   - Venue: ${reference.venue ?? reference.source}\n   - Ref: ${reference.doi}\n   - Why relevant: ${reference.relevanceSummary ?? reference.matchRationale ?? reference.note}\n   - Link: ${reference.sourceUrl ?? "N/A"}`,
    )
    .join("\n");

  const protocol = plan.protocol
    .map(
      (step) =>
        `### ${step.step}. ${step.title}\n- Timing: ${step.time}\n- Detail: ${step.detail}${step.groundingStatus ? `\n- Grounding: ${step.groundingStatus}` : ""}${step.groundingSourceTitle ? `\n- Source: ${step.groundingSourceTitle} (${step.groundingSourceDoi ?? "No DOI"})` : ""}${step.operationalNote ? `\n- Operational cue: ${step.operationalNote}` : ""}${step.extractedParameters?.length ? `\n- Extracted parameters: ${step.extractedParameters.join(", ")}` : ""}${step.dependencies?.length ? `\n- Depends on: ${step.dependencies.join(", ")}` : ""}${step.criticalInputs?.length ? `\n- Critical inputs: ${step.criticalInputs.join(", ")}` : ""}`,
    )
    .join("\n\n");

  const materials = plan.materials
    .map(
      (item) =>
        `- **${item.name}** | ${item.supplier} | ${item.catalogNumber} | ${item.quantity} | ${item.estimatedCost} | ${item.verificationStatus === "verified" ? "verified" : "estimated"}${item.verificationSource ? ` | ${item.verificationSource}` : ""}${item.verificationUrl ? ` | ${item.verificationUrl}` : ""}${item.leadTime ? ` | Lead time: ${item.leadTime}` : ""}${item.requiredForSteps?.length ? ` | Needed for: ${item.requiredForSteps.join(", ")}` : ""}${item.usageNote ? ` | Note: ${item.usageNote}` : ""}`,
    )
    .join("\n");

  const budget = plan.budget
    .map((item) => `- **${item.item}:** ${item.amount} — ${item.note}${item.basis ? `\n  - Basis: ${item.basis}` : ""}${item.dependsOn?.length ? `\n  - Depends on: ${item.dependsOn.join(", ")}` : ""}`)
    .join("\n");

  const timeline = plan.timeline
    .map((item) => `- **${item.phase}:** ${item.action}${item.dependencies?.length ? `\n  - Depends on: ${item.dependencies.join(", ")}` : ""}${item.deliverable ? `\n  - Deliverable: ${item.deliverable}` : ""}`)
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
- **Experiment Family:** ${plan.experimentFamily ?? "Not available"}
- **Route Supported:** ${plan.routeSupported ? "Yes" : "No"}
- **Routing Confidence:** ${plan.routingConfidence ?? "N/A"}%
- **Routing Reason:** ${plan.routingReason ?? "No routing rationale available."}
- **Runnability Status:** ${plan.runnabilityStatus ?? "Not available"}
- **Runnability Summary:** ${plan.runnabilitySummary ?? "No runnability assessment available."}
- **Status:** ${plan.status}
- **Quality Bar:** ${plan.qualityBar}
- **Generation Mode:** ${plan.generationMode ?? "unknown"}

## Hypothesis

${hypothesis}

## Parsed Scientific Intent

${parsedFields}

## Literature Quality Control

- **Novelty Signal:** ${plan.noveltySignal}
- **Top Match Score:** ${plan.literatureQc?.topMatchScore ?? "N/A"}%
- **QC Rationale:** ${plan.literatureQc?.rationale ?? "No explicit QC rationale available."}

${plan.literatureQc?.decisionFactors.map((item) => `- ${item}`).join("\n") ?? ""}

${references}

## Historical Benchmark

- **Verdict:** ${plan.historicalComparison?.verdict ?? "Not available"}
- **Rationale:** ${plan.historicalComparison?.rationale ?? "No prior-study benchmark available."}

${plan.historicalComparison?.items.map((item) => `- **${item.title}** (${item.source})\n  - Outcome signal: ${item.outcomeSignal}\n  - Similarity: ${item.similarityScore}%\n  - Takeaway: ${item.takeaway}`).join("\n") ?? ""}

## Scientist Trust Checks

${plan.qualityChecks?.map((item) => `- **${item.label}** [${item.status.toUpperCase()}]: ${item.detail}`).join("\n") ?? "No deterministic trust checks available."}

## Applied Scientist Memory

${plan.memoryImpact?.summary ?? "No prior scientist memory was applied."}

${plan.memoryImpact?.items.map((item) => `- **${item.section}:** ${item.issue}\n  - Why applied: ${item.whyApplied}`).join("\n") ?? ""}

## Decision-Aware Design

- **Selected approach:** ${plan.designDecision?.selectedApproach ?? "Not available"}
- **Why this setup:** ${plan.designDecision?.rationale ?? "No design rationale available."}
- **Cost implication:** ${plan.designDecision?.costImplication ?? "No cost tradeoff summary available."}
- **Escalation trigger:** ${plan.designDecision?.escalationTrigger ?? "No escalation trigger defined."}

${plan.designDecision?.alternatives.map((item) => `- **${item.name}** [${item.type}]\n  - Rationale: ${item.rationale}\n  - Estimated savings: ${item.estimatedSavings}`).join("\n") ?? ""}

## Budget Comparison

- **Chosen design cost:** ${plan.designDecision?.budgetComparison?.selectedApproachCost ?? "Not available"}
- **Cheapest alternative:** ${plan.designDecision?.budgetComparison?.cheapestAlternativeCost ?? "Not available"}
- **Premium vs cheapest:** ${plan.designDecision?.budgetComparison?.premiumVsCheapest ?? "Not available"}
- **Summary:** ${plan.designDecision?.budgetComparison?.summary ?? "No budget comparison available."}

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
