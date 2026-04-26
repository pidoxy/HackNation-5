import type {
  ExperimentPlan,
  ExperimentFamily,
  LabSettings,
  ParsedHypothesisCore,
  ParseHypothesisResponse,
  RegenerableSection,
  ReviewMemoryItem,
} from "@/lib/types";

interface OpenAIResponsesResult {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonText(payload: OpenAIResponsesResult): string {
  if (payload.output_text) {
    return payload.output_text;
  }

  const message = payload.output?.find((item) => item.type === "message");
  const text = message?.content?.find((item) => item.type === "output_text")?.text;

  if (!text) {
    throw new Error("OpenAI response did not include structured text.");
  }

  return text;
}

async function callOpenAIStructured<T>({
  schemaName,
  schema,
  input,
}: {
  schemaName: string;
  schema: object;
  input: Array<{ role: "system" | "user"; content: string }>;
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
          input,
          text: {
            format: {
              type: "json_schema",
              name: schemaName,
              strict: true,
              schema,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(
          `OpenAI request failed with status ${response.status}: ${errorText}`,
        );

        if (response.status === 429 || response.status >= 500) {
          lastError = error;
          await delay(600 * (attempt + 1));
          continue;
        }

        throw error;
      }

      const payload = (await response.json()) as OpenAIResponsesResult;
      return JSON.parse(extractJsonText(payload)) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < 2) {
        await delay(600 * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError ?? new Error("OpenAI request failed.");
}

export async function parseHypothesisWithOpenAI(
  hypothesis: string,
  schema: object,
  routeContext?: {
    family: ExperimentFamily;
    label: string;
    reason: string;
    guidance: string;
  },
): Promise<ParsedHypothesisCore> {
  return callOpenAIStructured<ParsedHypothesisCore>({
    schemaName: "parsed_hypothesis",
    schema,
    input: [
      {
        role: "system",
        content:
          "You are a scientific operations analyst. Extract the user's hypothesis into clear, practical experiment-planning fields. Prefer concrete, route-aware phrasing that matches the actual experiment family.",
      },
      {
        role: "user",
        content: [
          `Hypothesis:\n${hypothesis}`,
          routeContext
            ? `\nRouter family: ${routeContext.label} (${routeContext.family})\nRouter reason: ${routeContext.reason}\nRoute guidance: ${routeContext.guidance}`
            : "",
          "\nInstructions:\n- Set the domain to a scientist-friendly label that matches the routed family.\n- For computational or imaging work, parsed fields should mention datasets, baselines, metrics, or simulation context rather than wet-lab reagents.\n- For wet-lab work, parsed fields should mention biological system, controls, and readouts rather than generic software terms.",
        ].join("\n"),
      },
    ],
  });
}

export async function generatePlanWithOpenAI(
  hypothesis: string,
  parsedHypothesis: ParseHypothesisResponse,
  referencesContext: string,
  reviewMemory: ReviewMemoryItem[],
  labSettings: LabSettings,
  schema: object,
): Promise<ExperimentPlan> {
  const plan = await callOpenAIStructured<ExperimentPlan>({
    schemaName: "experiment_plan",
    schema,
    input: [
      {
        role: "system",
        content:
          "You are an expert scientific project planner. Produce an operationally realistic experiment plan grounded in the provided evidence. Keep materials, budget, timeline, and validation practical enough for a real lab handoff. Return only structured JSON.",
      },
      {
        role: "user",
        content: [
          `Hypothesis:\n${hypothesis}`,
          `\nParsed fields:\n${JSON.stringify(parsedHypothesis.parsedFields, null, 2)}`,
          `\nDomain: ${parsedHypothesis.domain}`,
          `\nExperiment family: ${parsedHypothesis.experimentFamily}`,
          `\nRoute confidence: ${parsedHypothesis.routingConfidence}%`,
          `\nRoute rationale: ${parsedHypothesis.routingReason}`,
          `\nEvidence:\n${referencesContext}`,
          `\nPrior scientist review memory:\n${
            reviewMemory.length > 0
              ? JSON.stringify(reviewMemory, null, 2)
              : "No prior review memory for this experiment type."
          }`,
          `\nLab settings:\n${JSON.stringify(labSettings, null, 2)}`,
          "\nRequirements:\n- Include realistic suppliers or source names when possible.\n- Budget and timeline must feel operational, not abstract.\n- Novelty signal should reflect the closeness of the supplied references.\n- Review feedback should sound like corrections a scientist would actually leave.\n- Preserve the exact biological system, matrix, organism, reactor, imaging modality, or dataset context from the hypothesis and evidence.\n- Validation must mirror the readouts implied by the evidence when available, such as FITC-dextran permeability, tight-junction markers, post-thaw viability, acetate production rate, coulombic efficiency, calibration curves, SSIM, PSNR, RMSE, Dice, AUC, or downstream classifier accuracy.\n- Materials must include the core assay-specific reagents and apparatus, not only generic consumables.\n- If the hypothesis is computational, medical-imaging, radiology, computer-vision, or model-evaluation focused, do not invent animals, wet-lab assays, antibodies, or reagents. Use datasets, model baselines, GPUs, storage, annotation/review steps, and evaluation pipelines instead.\n- Prefer protocol grounding from protocols.io, Bio-protocol, Nature Protocols, JoVE, or OpenWetWare when wet-lab evidence is present.\n- Prefer method grounding from arXiv, PubMed, PMC, peer-reviewed venues, or official framework docs when the hypothesis is computational or imaging-focused.\n- Prefer supplier grounding from Thermo Fisher technical notes, Sigma-Aldrich technical bulletins, Promega, Qiagen, ATCC, Addgene, IDT, NVIDIA, PyTorch, MONAI, Kaggle, or other relevant official resources when appropriate.\n- For references, include a short relevanceSummary that explains in one sentence why each source matters to this hypothesis.\n- Add a designDecision section that explicitly justifies the selected model or assay setup.\n- Include multiple concrete alternatives ranked by rank=1,2,3... where lower rank is preferred as a first-pass experiment.\n- For each alternative, include costEstimate, timeEstimate, accuracyExpectation, estimatedSavings, and a rationale.\n- Include a budgetComparison showing the chosen approach cost, the cheapest alternative cost, the premium versus the cheapest option, and a short summary of why the premium is or is not justified.\n- If the plan uses animals, explain why cheaper options such as in vitro, organoid, ex vivo, dataset, or in silico approaches are insufficient for the primary endpoint.\n- Avoid defaulting to animal work unless the hypothesis or evidence truly requires whole-organism validation.\n- Avoid unrealistic concentrations, impossible timelines, incompatible assay readouts, or domain-mismatched materials.",
        ].join("\n"),
      },
    ],
  });

  return {
    ...plan,
    generationMode: "live",
  };
}

export async function regeneratePlanSectionWithOpenAI<T>({
  section,
  hypothesis,
  parsedHypothesis,
  currentPlan,
  referencesContext,
  reviewMemory,
  labSettings,
  schema,
}: {
  section: RegenerableSection;
  hypothesis: string;
  parsedHypothesis: ParseHypothesisResponse;
  currentPlan: ExperimentPlan;
  referencesContext: string;
  reviewMemory: ReviewMemoryItem[];
  labSettings: LabSettings;
  schema: object;
}): Promise<T> {
  return callOpenAIStructured<T>({
    schemaName: `${section}_regeneration`,
    schema,
    input: [
      {
        role: "system",
        content:
          "You are an expert scientific project planner. Regenerate only the requested section of the experiment plan while keeping it consistent with the rest of the plan and the supplied evidence. Return only structured JSON for that section.",
      },
      {
        role: "user",
        content: [
          `Section to regenerate: ${section}`,
          `\nHypothesis:\n${hypothesis}`,
          `\nParsed fields:\n${JSON.stringify(parsedHypothesis.parsedFields, null, 2)}`,
          `\nExperiment family: ${parsedHypothesis.experimentFamily}`,
          `\nRoute rationale: ${parsedHypothesis.routingReason}`,
          `\nCurrent plan context:\n${JSON.stringify(currentPlan, null, 2)}`,
          `\nEvidence:\n${referencesContext}`,
          `\nPrior scientist review memory:\n${
            reviewMemory.length > 0
              ? JSON.stringify(reviewMemory, null, 2)
              : "No prior review memory for this experiment type."
          }`,
          `\nLab settings:\n${JSON.stringify(labSettings, null, 2)}`,
          "\nRequirements:\n- Keep the regenerated section consistent with the rest of the plan.\n- Preserve operational realism.\n- Prefer concrete supplier, cost, and sequencing details where relevant.\n- When regenerating validation or materials, preserve the assay-specific readouts and apparatus implied by the evidence rather than substituting generic laboratory text.\n- If the experiment is computational or imaging-focused, keep materials and budget centered on datasets, compute, storage, baselines, and evaluation rather than wet-lab items.\n- Prefer protocol grounding from the recommended protocol repositories when relevant wet-lab evidence is present.\n- Prefer arXiv, PubMed, PMC, and official framework documentation when the experiment is computational or medical-imaging focused.\n- Avoid unrealistic concentrations or impossible timing assumptions.\n- Preserve any design-decision logic already present in the current plan, especially any animal-model justification and cheaper alternatives considered.",
        ].join("\n"),
      },
    ],
  });
}
