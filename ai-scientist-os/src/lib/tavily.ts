import type { ParseHypothesisResponse, Reference, ReferenceType, ReviewMemoryItem } from "@/lib/types";

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

interface TavilySearchResponse {
  results?: TavilyResult[];
}

const PROTOCOL_DOMAINS = [
  "protocols.io",
  "bio-protocol.org",
  "nature.com",
  "jove.com",
  "openwetware.org",
];

const LITERATURE_DOMAINS = [
  "arxiv.org",
  "pubmed.ncbi.nlm.nih.gov",
  "pmc.ncbi.nlm.nih.gov",
  "nature.com",
  "jove.com",
];

const SUPPLIER_DOMAINS = [
  "thermofisher.com",
  "sigmaaldrich.com",
  "promega.com",
  "qiagen.com",
  "idtdna.com",
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
    url.includes("nature.com") ||
    url.includes("openwetware.org")
  ) {
    return "protocol";
  }

  if (
    url.includes("thermofisher.com") ||
    url.includes("sigmaaldrich.com") ||
    url.includes("promega.com") ||
    url.includes("qiagen.com") ||
    url.includes("idtdna.com") ||
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

function repositoryForUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (host.includes("protocols.io")) return "protocols.io";
    if (host.includes("bio-protocol.org")) return "Bio-protocol";
    if (host.includes("arxiv.org")) return "arXiv";
    if (host.includes("nature.com")) return "Nature Protocols / Nature";
    if (host.includes("jove.com")) return "JoVE";
    if (host.includes("openwetware.org")) return "OpenWetWare";
    if (host.includes("thermofisher.com")) return "Thermo Fisher technical resources";
    if (host.includes("sigmaaldrich.com")) return "Sigma-Aldrich technical documents";
    if (host.includes("promega.com")) return "Promega protocols";
    if (host.includes("qiagen.com")) return "Qiagen protocols";
    if (host.includes("idtdna.com")) return "IDT tools and qPCR resources";
    if (host.includes("atcc.org")) return "ATCC";
    if (host.includes("addgene.org")) return "Addgene protocols";

    return host;
  } catch {
    return undefined;
  }
}

function provenanceLabelForUrl(url: string): string {
  if (PROTOCOL_DOMAINS.some((domain) => url.includes(domain))) {
    return "Recommended protocol repository";
  }

  if (SUPPLIER_DOMAINS.some((domain) => url.includes(domain))) {
    return "Official supplier resource";
  }

  return "Scientific literature source";
}

function queryForHypothesis(
  hypothesis: string,
  parsedHypothesis?: ParseHypothesisResponse,
): string {
  const parsedTerms =
    parsedHypothesis?.parsedFields.map((field) => field.value).join(" ") ?? "";
  const domain = parsedHypothesis?.domain ?? "";
  const family = parsedHypothesis?.experimentFamily ?? "";
  const domainHints =
    family === "animal_study" || domain.toLowerCase().includes("gut")
      ? "FITC-dextran occludin claudin control mouse assay"
      : family === "wet_lab" && domain.toLowerCase().includes("cell")
        ? "post-thaw viability trypan blue recovery freezing thawing assay"
        : family === "materials_chemistry" || domain.toLowerCase().includes("climate")
          ? "acetate coulombic efficiency cathode reactor CO2 assay"
          : family === "medical_imaging" ||
              family === "computational_ml" ||
              domain.toLowerCase().includes("imaging") ||
              domain.toLowerCase().includes("radiology") ||
              hypothesis.toLowerCase().includes("x-ray") ||
              hypothesis.toLowerCase().includes("x ray") ||
              hypothesis.toLowerCase().includes("oct") ||
              hypothesis.toLowerCase().includes("angiography") ||
              hypothesis.toLowerCase().includes("vessel segmentation") ||
              hypothesis.toLowerCase().includes("masked autoencoder") ||
              hypothesis.toLowerCase().includes("ssim") ||
              hypothesis.toLowerCase().includes("psnr") ||
              hypothesis.toLowerCase().includes("dncnn") ||
              hypothesis.toLowerCase().includes("resunet")
            ? "medical imaging OCT OCTA vessel segmentation masked autoencoder low-label topology preservation denoising SSIM PSNR Dice IoU baseline benchmark"
          : "calibration limit of detection specificity whole blood assay";

  return `${hypothesis} ${parsedTerms} ${domain} protocol materials supplier validation ${domainHints}`.trim();
}

function termsForLabels(parsedHypothesis: ParseHypothesisResponse | undefined, needles: string[]): string[] {
  if (!parsedHypothesis) {
    return [];
  }

  return [...new Set(
    parsedHypothesis.parsedFields
      .filter((field) => needles.some((needle) => field.label.toLowerCase().includes(needle)))
      .flatMap((field) => field.value.split(/\W+/))
      .map((token) => token.trim())
      .filter((token) => token.length > 3),
  )].slice(0, 8);
}

function buildQueryVariants(
  hypothesis: string,
  parsedHypothesis?: ParseHypothesisResponse,
  reviewMemory: ReviewMemoryItem[] = [],
): {
  protocolQueries: string[];
  literatureQueries: string[];
  supplierQueries: string[];
  rankingTerms: string[];
} {
  const baseQuery = queryForHypothesis(hypothesis, parsedHypothesis);
  const interventionTerms = termsForLabels(parsedHypothesis, ["intervention"]);
  const modelTerms = termsForLabels(parsedHypothesis, ["model", "system"]);
  const outcomeTerms = termsForLabels(parsedHypothesis, ["endpoint", "readout"]);
  const controlTerms = termsForLabels(parsedHypothesis, ["control"]);
  const memoryTerms = [...new Set(
    reviewMemory.flatMap((item) => [
      ...(item.tags ?? []),
      item.taskLabel ?? "",
      item.systemContext ?? "",
      item.correction ?? "",
    ]),
  )]
    .flatMap((item) => item.split(/\W+/))
    .map((token) => token.trim())
    .filter((token) => token.length > 3)
    .slice(0, 10);

  const focusedPhrase = [...interventionTerms, ...modelTerms, ...outcomeTerms, ...controlTerms].slice(0, 12).join(" ");
  const rankingTerms = [...new Set([
    ...interventionTerms,
    ...modelTerms,
    ...outcomeTerms,
    ...controlTerms,
    ...memoryTerms,
  ])];

  return {
    protocolQueries: [
      `${baseQuery} step-by-step published protocol repository`,
      `${focusedPhrase || hypothesis} operational workflow protocol methods`,
    ],
    literatureQueries: [
      `${baseQuery} prior paper similar experiment novelty exact match`,
      `${focusedPhrase || hypothesis} nearest paper benchmark publication`,
    ],
    supplierQueries: [
      `${baseQuery} supplier application note catalog technical bulletin`,
      `${interventionTerms.slice(0, 5).join(" ")} ${outcomeTerms.slice(0, 4).join(" ")} supplier catalog official resource`,
    ],
    rankingTerms,
  };
}

async function runTavilyQuery({
  apiKey,
  query,
  domains,
  maxResults,
}: {
  apiKey: string;
  query: string;
  domains: string[];
  maxResults: number;
}): Promise<TavilyResult[]> {
  let lastError: Error | null = null;

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
          max_results: maxResults,
          chunks_per_source: 3,
          include_answer: false,
          include_raw_content: true,
          include_domains: domains,
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

      const data = (await response.json()) as TavilySearchResponse;
      return data.results ?? [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 2) {
        await delay(500 * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError ?? new Error("Tavily request failed.");
}

function relevanceScore(result: TavilyResult, query: string, rankingTerms: string[]): number {
  const text = `${result.title ?? ""} ${result.content ?? ""}`.toLowerCase();
  const overlap = query
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 4)
    .reduce((count, token) => (text.includes(token) ? count + 1 : count), 0);
  const structuredOverlap = rankingTerms.reduce(
    (count, token) => (text.includes(token.toLowerCase()) ? count + 1 : count),
    0,
  );
  const titleBoost = rankingTerms.reduce(
    (count, token) => ((result.title ?? "").toLowerCase().includes(token.toLowerCase()) ? count + 1 : count),
    0,
  );
  const url = result.url ?? "";
  const provenanceBonus = PROTOCOL_DOMAINS.some((domain) => url.includes(domain))
    ? 0.18
    : SUPPLIER_DOMAINS.some((domain) => url.includes(domain))
      ? 0.12
      : LITERATURE_DOMAINS.some((domain) => url.includes(domain))
        ? 0.08
        : 0;

  return (result.score ?? 0) + overlap * 0.05 + structuredOverlap * 0.04 + titleBoost * 0.08 + provenanceBonus;
}

export async function searchScientificReferences(
  hypothesis: string,
  parsedHypothesis?: ParseHypothesisResponse,
  reviewMemory: ReviewMemoryItem[] = [],
): Promise<Reference[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY");
  }

  const query = queryForHypothesis(hypothesis, parsedHypothesis);
  const variants = buildQueryVariants(hypothesis, parsedHypothesis, reviewMemory);
  const searchJobs = [
    ...variants.protocolQueries.map((variant) =>
      runTavilyQuery({ apiKey, query: variant, domains: PROTOCOL_DOMAINS, maxResults: 3 }),
    ),
    ...variants.literatureQueries.map((variant) =>
      runTavilyQuery({ apiKey, query: variant, domains: LITERATURE_DOMAINS, maxResults: 3 }),
    ),
    ...variants.supplierQueries.map((variant) =>
      runTavilyQuery({ apiKey, query: variant, domains: SUPPLIER_DOMAINS, maxResults: 3 }),
    ),
  ];

  const settled = await Promise.allSettled(searchJobs);
  const settledResults = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  if (settledResults.length === 0) {
    throw new Error("No scientific references could be retrieved from the configured sources.");
  }

  const deduped = new Map<string, TavilyResult>();
  for (const result of settledResults) {
    const key = result.url ?? result.title ?? JSON.stringify(result);
    if (!deduped.has(key)) {
      deduped.set(key, result);
    }
  }

  return [...deduped.values()]
    .sort((left, right) => relevanceScore(right, query, variants.rankingTerms) - relevanceScore(left, query, variants.rankingTerms))
    .slice(0, 8)
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
        sourceUrl: url,
        repository: repositoryForUrl(url),
        provenanceLabel: provenanceLabelForUrl(url),
        venue: repositoryForUrl(url) ?? sourceFromUrl(url),
        relevanceSummary:
          result.content?.slice(0, 160) ??
          "Retrieved as a potentially relevant source for protocol or literature grounding.",
      };
    });
}
