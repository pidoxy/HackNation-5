import type { ParseHypothesisResponse, Reference, ReferenceType } from "@/lib/types";

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

interface TavilySearchResponse {
  results?: TavilyResult[];
}

const SCIENCE_DOMAINS = [
  "pubmed.ncbi.nlm.nih.gov",
  "pmc.ncbi.nlm.nih.gov",
  "protocols.io",
  "bio-protocol.org",
  "nature.com",
  "jove.com",
  "thermofisher.com",
  "sigmaaldrich.com",
  "qiagen.com",
  "atcc.org",
  "addgene.org",
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function referenceTypeForUrl(url: string): ReferenceType {
  if (
    url.includes("protocols.io") ||
    url.includes("bio-protocol.org") ||
    url.includes("jove.com") ||
    url.includes("nature.com")
  ) {
    return "protocol";
  }

  if (
    url.includes("thermofisher.com") ||
    url.includes("sigmaaldrich.com") ||
    url.includes("qiagen.com") ||
    url.includes("atcc.org") ||
    url.includes("addgene.org")
  ) {
    return "supplier";
  }

  return "similarity";
}

function doiFromResult(url: string, content?: string): string {
  const doiMatch = content?.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i);
  if (doiMatch?.[0]) {
    return doiMatch[0];
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "") + parsed.pathname.slice(0, 28);
  } catch {
    return url.slice(0, 32);
  }
}

function sourceFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "");
  } catch {
    return "web source";
  }
}

function queryForHypothesis(
  hypothesis: string,
  parsedHypothesis?: ParseHypothesisResponse,
): string {
  const parsedTerms =
    parsedHypothesis?.parsedFields.map((field) => field.value).join(" ") ?? "";
  const domain = parsedHypothesis?.domain ?? "";
  const domainHints =
    domain.toLowerCase().includes("gut")
      ? "FITC-dextran occludin claudin control mouse assay"
      : domain.toLowerCase().includes("cell")
        ? "post-thaw viability trypan blue recovery freezing thawing assay"
        : domain.toLowerCase().includes("climate")
          ? "acetate coulombic efficiency cathode reactor CO2 assay"
          : "calibration limit of detection specificity whole blood assay";

  return `${hypothesis} ${parsedTerms} ${domain} protocol materials supplier validation ${domainHints}`.trim();
}

function relevanceScore(result: TavilyResult, query: string): number {
  const text = `${result.title ?? ""} ${result.content ?? ""}`.toLowerCase();
  const overlap = query
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 4)
    .reduce((count, token) => (text.includes(token) ? count + 1 : count), 0);

  return (result.score ?? 0) + overlap * 0.05;
}

export async function searchScientificReferences(
  hypothesis: string,
  parsedHypothesis?: ParseHypothesisResponse,
): Promise<Reference[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY");
  }

  const query = queryForHypothesis(hypothesis, parsedHypothesis);

  let lastError: Error | null = null;
  let data: TavilySearchResponse | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          topic: "general",
          search_depth: "advanced",
          max_results: 5,
          chunks_per_source: 2,
          include_answer: false,
          include_raw_content: false,
          include_domains: SCIENCE_DOMAINS,
        }),
      });

      if (!response.ok) {
        const error = new Error(`Tavily request failed with status ${response.status}`);
        if (response.status === 429 || response.status >= 500) {
          lastError = error;
          await delay(500 * (attempt + 1));
          continue;
        }
        throw error;
      }

      data = (await response.json()) as TavilySearchResponse;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < 2) {
        await delay(500 * (attempt + 1));
        continue;
      }
    }
  }

  if (!data) {
    throw lastError ?? new Error("Tavily request failed.");
  }

  const results = data.results ?? [];

  return [...results]
    .sort((left, right) => relevanceScore(right, query) - relevanceScore(left, query))
    .slice(0, 4)
    .map((result) => {
    const url = result.url ?? "";
    const type = referenceTypeForUrl(url);

    return {
      type,
      title: result.title ?? "Untitled source",
      source: sourceFromUrl(url),
      doi: doiFromResult(url, result.content),
      note:
        result.content?.slice(0, 280) ??
        "Source retrieved via Tavily for literature grounding.",
    };
    });
}
