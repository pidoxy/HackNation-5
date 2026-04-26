"use client";

import { useEffect, useMemo, useState } from "react";
import { hypothesisTemplates } from "@/lib/mock-engine";
import type {
  ExperimentPlan,
  GeneratePlanRequest,
  GeneratePlanResponse,
  LabSettings,
  ParseHypothesisResponse,
  Reference,
  ReviewMemoryItem,
  SavedProject,
  RegenerableSection,
  RegenerateSectionRequest,
  RegenerateSectionResponse,
} from "@/lib/types";

type Screen =
  | "input"
  | "analysis"
  | "literature"
  | "plan"
  | "dashboard"
  | "results"
  | "inventory"
  | "protocols"
  | "settings"
  | "logs";

const aiNav = [
  { id: "dashboard", label: "Dashboard" },
  { id: "literature", label: "Literature" },
  { id: "input", label: "Hypothesis" },
  { id: "plan", label: "Experiment Plan" },
  { id: "results", label: "Results" },
] as const;

const labNav = [
  { id: "dashboard", label: "Dashboard" },
  { id: "literature", label: "Literature" },
  { id: "results", label: "Results" },
] as const;

const labSideNav = [
  { id: "inventory", label: "Inventory" },
  { id: "protocols", label: "Protocols" },
  { id: "settings", label: "Lab Settings" },
  { id: "logs", label: "System Logs" },
] as const;

const defaultLabSettings: LabSettings = {
  organizationName: "LAB_OS v2.4",
  preferredSuppliers: ["Thermo Fisher", "Sigma-Aldrich", "Abcam"],
  budgetCurrency: "USD",
  defaultTeamSize: 4,
  turnaroundDays: 21,
  complianceNotes: "BSL-2 handling for mammalian assays. Cold-chain validation required.",
};

const analysisBootLogs = [
  "[14:02:11] Initializing synthesis engine...",
  "[14:02:12] Parsing hypothesis constraints...",
  "[14:02:14] Establishing baseline control parameters...",
  "[14:02:15] Querying reagent database...",
  "[14:02:18] Generating primary protocol sequence...",
];

const LAST_ACTIVE_PROJECT_KEY = "ai-scientist-os:last-active-project-id";
const ANALYSIS_MIN_DURATION_MS = 4000;

const fallbackReferences: Reference[] = [
  {
    type: "similarity",
    title: "Attention-based Molecular Generation with Geometric Constraints",
    source: "Semantic Scholar",
    doi: "10.1101/2023.77821",
    note: "Strong architectural overlap with the current planning target.",
  },
  {
    type: "protocol",
    title: "Temporal Graph Networks for Dynamic Protein Folding",
    source: "arXiv",
    doi: "arxiv:2404.01922",
    note: "Relevant preprocessing pipeline and normalization recommendations.",
  },
];

function surfaceClass() {
  return "border border-[var(--border-soft)] bg-[var(--surface-panel)]";
}

function parseMoney(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value.toLocaleString()}`;
  }
}

function classForReference(type: Reference["type"]) {
  switch (type) {
    case "conflict":
      return "border-[#ffb4ab]/40 bg-[#93000a]/10 text-[#ffb4ab]";
    case "supplier":
      return "border-[var(--accent-strong)]/40 bg-[var(--accent-strong)]/10 text-[var(--accent-text)]";
    case "protocol":
      return "border-[var(--accent-border)]/40 bg-[var(--accent-text)]/10 text-[#e3e0f7]";
    case "similarity":
    default:
      return "border-[#ffb785]/40 bg-[#ffb785]/10 text-[#ffb785]";
  }
}

function postJson<T>(url: string, payload: unknown): Promise<T> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Request failed: ${url}`);
    }
    return (await response.json()) as T;
  });
}

function StatusDot({ active = false, tone = "primary" }: { active?: boolean; tone?: "primary" | "danger" | "success"; }) {
  const color =
    tone === "danger" ? "#ff6b6b" : tone === "success" ? "#2ee6a6" : "#c4c0ff";
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{
        backgroundColor: color,
        boxShadow: active ? `0 0 10px ${color}` : "none",
      }}
    />
  );
}

function AppAvatar() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-elevated)] text-[11px] font-mono text-[var(--text-secondary)]">
      SR
    </div>
  );
}

export function AiScientistWorkspace({
  initialHypothesis,
}: {
  initialHypothesis: string;
}) {
  const [screen, setScreen] = useState<Screen>("input");
  const [hypothesis, setHypothesis] = useState(initialHypothesis);
  const [selectedTemplate, setSelectedTemplate] = useState(hypothesisTemplates[1].id);
  const [parsed, setParsed] = useState<ParseHypothesisResponse | null>(null);
  const [plan, setPlan] = useState<ExperimentPlan | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [reviewMemory, setReviewMemory] = useState<ReviewMemoryItem[]>([]);
  const [labSettings, setLabSettings] = useState<LabSettings>(defaultLabSettings);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [annotationOpen, setAnnotationOpen] = useState(false);
  const [reviewSection, setReviewSection] = useState("Protocol");
  const [reviewIssue, setReviewIssue] = useState("Step 3 concentration is wrong — should be 50µM not 100µM");
  const [reviewImpact, setReviewImpact] = useState("This correction prevents overstimulation and improves downstream viability.");
  const [regeneratingSection, setRegeneratingSection] = useState<RegenerableSection | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadWorkspace = async () => {
      try {
        const [projectsResponse, memoryResponse, settingsResponse] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/review-memory", { cache: "no-store" }),
          fetch("/api/lab-settings", { cache: "no-store" }),
        ]);

        if (!projectsResponse.ok || !memoryResponse.ok || !settingsResponse.ok) {
          throw new Error("Failed to load workspace");
        }

        const projectData = (await projectsResponse.json()) as { items: SavedProject[] };
        const memoryData = (await memoryResponse.json()) as { items: ReviewMemoryItem[] };
        const settingsData = (await settingsResponse.json()) as { settings: LabSettings };

        if (!cancelled) {
          setProjects(projectData.items);
          setReviewMemory(memoryData.items);
          setLabSettings(settingsData.settings);

          const preferredProjectId =
            typeof window !== "undefined"
              ? window.localStorage.getItem(LAST_ACTIVE_PROJECT_KEY)
              : null;
          const restoreProject =
            projectData.items.find((item) => item.id === preferredProjectId) ??
            projectData.items[0] ??
            null;

          if (restoreProject) {
            setHypothesis(restoreProject.hypothesis);
            setParsed(restoreProject.parsed);
            setPlan(restoreProject.plan);
            setActiveProjectId(restoreProject.id);
            setScreen("dashboard");
          }
        }
      } catch {
        if (!cancelled) {
          setProjects([]);
          setReviewMemory([]);
          setLabSettings(defaultLabSettings);
        }
      }
    };

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!analysisRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setAnalysisProgress((current) => (current >= 92 ? current : current + 4));
    }, 220);

    return () => {
      window.clearInterval(timer);
    };
  }, [analysisRunning]);

  useEffect(() => {
    if (!activeProjectId || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LAST_ACTIVE_PROJECT_KEY, activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    if (screen !== "plan" || typeof window === "undefined") {
      return;
    }

    window.scrollTo(0, 0);
  }, [screen, activeProjectId]);

  const references = plan?.references ?? fallbackReferences;
  const savedProject = projects.find((item) => item.id === activeProjectId) ?? projects[0] ?? null;
  const planBudgetTotal = useMemo(
    () => (plan ? plan.budget.reduce((sum, item) => sum + parseMoney(item.amount), 0) : 5550),
    [plan],
  );
  const reagentsBudget = useMemo(() => {
    if (!plan) {
      return 3450;
    }
    return plan.materials.reduce((sum, item) => sum + parseMoney(item.estimatedCost), 0);
  }, [plan]);
  const equipmentBudget = Math.max(planBudgetTotal - reagentsBudget, 0);
  const sectionCitations = plan?.sectionCitations ?? null;
  const protocolTarget = plan?.protocol[2] ?? plan?.protocol[0] ?? null;
  const protocolCards = savedProject
    ? projects.slice(0, 3).map((item, index) => ({
        id: `${item.id}-${index}`,
        title: item.plan.title,
        domain: item.plan.domain,
        status: index === 1 ? "In Revision" : "Validated",
        duration: item.plan.timeline[0]?.phase ?? "4h 15m",
        success: index === 1 ? "72.8%" : `${94 + index * 2}.2%`,
      }))
    : [
        { id: "PRT-8942-A", title: "Kinase Inhibitor Assay Optimization", domain: "Cell Biology", status: "Validated", duration: "4h 15m", success: "94.2%" },
        { id: "PRT-7102-C", title: "CRISPR-Cas9 Lentiviral Transduction", domain: "Genomics", status: "In Revision", duration: "72h 00m", success: "72.8%" },
        { id: "PRT-5521-B", title: "Automated RNA Extraction (MagBead)", domain: "Automation", status: "Validated", duration: "1h 20m", success: "98.5%" },
      ];

  async function saveProjectRecord(
    nextHypothesis: string,
    nextParsed: ParseHypothesisResponse,
    nextPlan: ExperimentPlan,
  ) {
    const now = new Date().toISOString();
    const project: SavedProject = {
      id: nextPlan.experimentId,
      hypothesis: nextHypothesis,
      parsed: nextParsed,
      plan: nextPlan,
      createdAt: savedProject?.createdAt ?? now,
      updatedAt: now,
    };

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });

    if (!response.ok) {
      throw new Error("Failed to save project");
    }

    const data = (await response.json()) as { items: SavedProject[] };
    setProjects(data.items);
    setActiveProjectId(project.id);
  }

  async function handleAnalyse() {
    setError(null);
    setScreen("analysis");
    setAnalysisRunning(true);
    setAnalysisProgress(16);
    const analysisStartedAt = Date.now();

    try {
      const parsedResponse = await postJson<ParseHypothesisResponse>("/api/parse-hypothesis", {
        hypothesis,
      });
      setParsed(parsedResponse);

      const domainMemory = reviewMemory.filter(
        (item) => item.domain.toLowerCase() === parsedResponse.domain.toLowerCase(),
      );

      const generatePayload: GeneratePlanRequest = {
        hypothesis,
        reviewMemory: domainMemory,
        labSettings,
      };

      const generated = await postJson<GeneratePlanResponse>("/api/generate-plan", generatePayload);
      setPlan(generated.plan);
      await saveProjectRecord(hypothesis, parsedResponse, generated.plan);

      const remainingAnalysisTime = Math.max(
        0,
        ANALYSIS_MIN_DURATION_MS - (Date.now() - analysisStartedAt),
      );

      if (remainingAnalysisTime > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingAnalysisTime));
      }

      setAnalysisProgress(100);
    } catch {
      setError("The synthesis engine could not complete this run. Please retry.");
    } finally {
      setAnalysisRunning(false);
    }
  }

  async function handleRegenerate(section: RegenerableSection) {
    if (!plan || !parsed) {
      return;
    }

    setRegeneratingSection(section);
    setError(null);

    try {
      const payload: RegenerateSectionRequest = {
        section,
        hypothesis,
        parsed,
        plan,
        reviewMemory: reviewMemory.filter(
          (item) => item.domain.toLowerCase() === plan.domain.toLowerCase(),
        ),
        labSettings,
      };

      const response = await postJson<RegenerateSectionResponse>("/api/regenerate-section", payload);
      setPlan(response.plan);
      await saveProjectRecord(hypothesis, parsed, response.plan);
    } catch {
      setError(`Could not regenerate ${section}.`);
    } finally {
      setRegeneratingSection(null);
    }
  }

  async function handleSaveReview() {
    if (!plan || !reviewIssue.trim() || !reviewImpact.trim()) {
      return;
    }

    const item: ReviewMemoryItem = {
      domain: plan.domain,
      section: reviewSection,
      issue: reviewIssue.trim(),
      impact: reviewImpact.trim(),
      createdAt: new Date().toISOString(),
    };

    const response = await fetch("/api/review-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      setError("Could not save scientist annotation.");
      return;
    }

    const data = (await response.json()) as { items: ReviewMemoryItem[] };
    setReviewMemory(data.items);
    setAnnotationOpen(false);
    setScreen("plan");
  }

  async function handleExport() {
    if (!plan || !parsed) {
      return;
    }

    const response = await fetch("/api/export-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hypothesis,
        parsed,
        plan,
        format: "markdown",
      }),
    });

    if (!response.ok) {
      setError("Could not export plan.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${plan.experimentId}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openProject(project: SavedProject, nextScreen: Screen = "plan") {
    setHypothesis(project.hypothesis);
    setParsed(project.parsed);
    setPlan(project.plan);
    setActiveProjectId(project.id);
    setScreen(nextScreen);
  }

  function renderAiTopNav(active: Screen) {
    return (
      <header className="flex h-12 items-center justify-between border-b border-[var(--border-soft)] bg-black/90 px-5">
        <div className="flex min-w-0 items-center gap-3 md:gap-6">
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <span className="font-mono text-base text-[var(--accent-strong)]">⚗</span>
            <span className="text-[12px] font-semibold tracking-tight text-white md:text-[13px]">The AI Scientist</span>
            {active === "input" ? (
              <span className="ml-2 border-l border-[var(--border-soft)] pl-3 font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--text-tertiary)] md:ml-3 md:pl-4 md:text-[11px] md:tracking-[0.3em]">
                Fulcrum Science
              </span>
            ) : null}
          </div>
          <nav className="hidden items-center gap-5 text-[13px] text-[var(--text-tertiary)] md:flex">
            {aiNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className={`h-12 border-b-2 px-1 transition-colors ${
                  active === item.id
                    ? "border-[var(--accent-strong)] text-[var(--accent-text)]"
                    : "border-transparent hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[var(--text-tertiary)] md:gap-3">
          {active !== "input" ? (
            <div className={`hidden h-8 w-60 items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 md:flex`}>
              <span className="mr-2 font-mono text-xs">⌕</span>
              <span className="text-xs">Search...</span>
            </div>
          ) : null}
          <span className="text-sm">⚗</span>
          <span className="text-sm">🔔</span>
          <span className="text-sm">⚙</span>
          <AppAvatar />
        </div>
      </header>
    );
  }

  function renderAiSidebar(active: Screen) {
    return (
      <aside className="hidden w-80 flex-col border-r border-[var(--border-soft)] bg-black md:flex">
        <div className="px-7 py-7">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--accent-text)]">
              ⚗
            </div>
            <div>
              <div className="text-[15px] font-semibold text-white">Core Engine</div>
              <div className="font-mono text-[11px] text-[var(--text-tertiary)]">v2.4.0-alpha</div>
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          {aiNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                active === item.id
                  ? "border-r-2 border-[var(--accent-strong)] bg-[rgba(108,99,255,0.12)] text-[var(--accent-text)]"
                  : "hover:bg-[var(--surface-panel)] hover:text-white"
              }`}
            >
              <span className="text-[12px]">
                {item.id === "dashboard" ? "◫" : item.id === "literature" ? "▤" : item.id === "input" ? "◉" : item.id === "plan" ? "⚗" : "◧"}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mx-5 border-t border-[var(--border-soft)] pt-5">
          <button className="flex w-full items-center gap-3 px-4 py-3 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--text-tertiary)] hover:bg-[var(--surface-panel)]">
            ? Docs
          </button>
          <button className="flex w-full items-center gap-3 px-4 py-3 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--text-tertiary)] hover:bg-[var(--surface-panel)]">
            ? Support
          </button>
        </div>
      </aside>
    );
  }

  function renderLabTopNav(active: Screen) {
    return (
      <header className="flex h-14 items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-panel)] px-6">
        <div className="flex items-center gap-10">
          <div className="font-mono text-[20px] font-bold tracking-tight text-[var(--accent-strong)]">LABCORE // AI</div>
          {(active === "literature" || active === "logs") ? (
            <div className="hidden w-80 items-center border border-[var(--border-soft)] bg-black px-3 py-2 lg:flex">
              <span className="mr-3 font-mono text-xs text-[var(--text-tertiary)]">⌕</span>
              <span className="text-[13px] text-[var(--text-tertiary)]">
                {active === "literature" ? "Search parameters..." : "Global Search..."}
              </span>
            </div>
          ) : null}
        </div>
        <nav className="hidden h-full items-center gap-7 text-[15px] text-[var(--text-tertiary)] md:flex">
          {labNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`h-full border-b-2 px-1 ${
                active === item.id
                  ? "border-[var(--accent-strong)] text-[var(--accent-strong)]"
                  : "border-transparent hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-[var(--text-tertiary)]">
          {(active === "inventory" || active === "settings" || active === "protocols" || active === "logs") ? (
            <>
              <button className="border border-[var(--border-soft)] px-5 py-2 text-[13px] text-white">
                Export Logs
              </button>
              <button className="bg-[var(--accent-strong)] px-5 py-2 text-[15px] font-medium text-white shadow-[0_0_12px_rgba(108,99,255,0.22)]">
                Deploy API
              </button>
            </>
          ) : null}
          <span>🔔</span>
          <span>▦</span>
          <span>⚙</span>
          <AppAvatar />
        </div>
      </header>
    );
  }

  function renderLabSidebar(active: Screen) {
    return (
      <aside className="hidden w-80 flex-col border-r border-[var(--border-soft)] bg-black md:flex">
        <div className="px-7 py-8">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--accent-text)]">
              ⚗
            </div>
            <div>
              <div className="font-mono text-[14px] font-bold tracking-tight text-[var(--accent-strong)]">
                {labSettings.organizationName}
              </div>
              <div className="text-[13px] text-[var(--text-secondary)]">Precision Instrumentation</div>
            </div>
          </div>
          <button
            onClick={() => setScreen("input")}
            className="w-full bg-[var(--accent-strong)] px-5 py-4 text-[15px] font-medium text-white shadow-[0_0_12px_rgba(108,99,255,0.22)]"
          >
            + New Experiment
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 text-[15px] text-[var(--text-secondary)]">
          {labSideNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex items-center gap-4 px-6 py-4 text-left ${
                active === item.id
                  ? "border border-[var(--accent-strong)] bg-[rgba(108,99,255,0.08)] text-[var(--accent-text)]"
                  : "hover:bg-[var(--surface-panel)] hover:text-white"
              }`}
            >
              <span className="font-mono text-xs">
                {item.id === "inventory" ? "▣" : item.id === "protocols" ? "▤" : item.id === "settings" ? "▥" : "▹"}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mx-5 border-t border-[var(--border-soft)] pt-5">
          <button className="flex w-full items-center gap-4 px-4 py-3 text-[14px] text-[var(--text-tertiary)] hover:bg-[var(--surface-panel)]">
            {"</>"} API Docs
          </button>
          <button className="flex w-full items-center gap-4 px-4 py-3 text-[14px] text-[var(--text-tertiary)] hover:bg-[var(--surface-panel)]">
            ? Support
          </button>
        </div>
      </aside>
    );
  }

  function renderInputScreen() {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {renderAiTopNav("input")}
        <main className="relative flex min-h-[calc(100vh-48px)] items-center justify-center px-6">
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="h-[42rem] w-[42rem] rounded-full bg-[rgba(108,99,255,0.08)] blur-[120px]" />
          </div>
          <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
            <div className="mb-8 text-center md:mb-10">
              <h1 className="mx-auto max-w-[16ch] text-[clamp(2.25rem,8vw,5rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[var(--text-primary)]">
                Turn a hypothesis into a runnable experiment plan.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[clamp(0.98rem,2.8vw,1.12rem)] leading-[1.8] text-[var(--text-secondary)] md:max-w-2xl">
                Define your variables, constraints, and objectives. The engine will synthesize a structured protocol.
              </p>
            </div>
            <div className={`w-full rounded-xl ${surfaceClass()} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:p-6`}>
              <div className="mb-4 flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.28em] text-[var(--accent-text)]">
                <span>✎</span>
                <span>Hypothesis Definition</span>
              </div>
              <textarea
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
                className="h-32 w-full resize-none bg-transparent font-mono text-[clamp(1rem,3.6vw,1.55rem)] leading-[1.5] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] md:h-36"
                placeholder="e.g., If we introduce compound X to cell line Y..."
              />
              <div className="mt-4 flex items-center justify-between border-t border-[var(--border-soft)] pt-4">
                <span className="font-mono text-[12px] text-[var(--text-tertiary)]">{hypothesis.length} / 1024</span>
                <span className="font-mono text-[14px] text-[var(--accent-text)]">✦</span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {hypothesisTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setHypothesis(template.value);
                  }}
                  className={`border px-5 py-2 font-mono text-[13px] uppercase tracking-[0.18em] ${
                    selectedTemplate === template.id
                      ? "border-[var(--accent-strong)] bg-[rgba(108,99,255,0.12)] text-[var(--accent-text)]"
                      : "border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-secondary)]"
                  }`}
                >
                  {template.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => void handleAnalyse()}
              className="mt-8 flex w-full max-w-xl items-center justify-center gap-3 bg-[var(--accent-strong)] px-8 py-4 text-[clamp(1rem,2.5vw,1.15rem)] font-semibold text-white shadow-[0_0_20px_rgba(108,99,255,0.35)] md:mt-10 md:py-5"
            >
              Analyse Hypothesis
              <span className="font-mono text-xl">→</span>
            </button>
            {error ? <p className="mt-5 text-sm text-[#ffb4ab]">{error}</p> : null}
          </div>
        </main>
      </div>
    );
  }

  function renderAnalysisScreen() {
    const statusText = analysisRunning ? "SEARCHING" : "COMPLETE";

    return (
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        {renderAiTopNav("input")}
        <div className="flex flex-1 overflow-hidden">
          {renderAiSidebar("input")}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <header className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <span className="border border-[var(--border-soft)] bg-[rgba(108,99,255,0.1)] px-3 py-2 font-mono text-[14px] uppercase tracking-[0.28em] text-[var(--accent-text)]">
                  ID: {plan?.experimentId ?? "HYP-8924"}
                </span>
                <span className="font-mono text-[14px] uppercase tracking-[0.32em] text-[var(--text-tertiary)]">
                  / Analysis Stage
                </span>
              </div>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="text-[clamp(2.4rem,7vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[var(--text-primary)]">
                    Synthesis Engine Active
                  </h1>
                  <p className="mt-4 max-w-4xl text-[clamp(1rem,2.5vw,1.125rem)] leading-[1.9] text-[var(--text-secondary)]">
                    Correlating proposed methodology against existing literature and generating preliminary protocol structures.
                  </p>
                </div>
                <div className={`hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-8 py-6 lg:flex`}>
                  <div className="grid grid-cols-3 gap-7">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-2">
                          <StatusDot active={step <= (analysisRunning ? 2 : 3)} />
                          <span className={`font-mono text-[12px] uppercase tracking-[0.22em] ${step <= (analysisRunning ? 2 : 3) ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                            Stage {step}
                          </span>
                        </div>
                        {step < 3 ? <div className="h-px w-10 bg-[var(--border-soft)]" /> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </header>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.98fr]">
              <section className={`rounded-lg ${surfaceClass()} overflow-hidden`}>
                <div className="flex h-12 items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5">
                  <div className="font-mono text-[13px] uppercase tracking-[0.28em] text-[var(--text-primary)]">
                    1. Literature.Check
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusDot active={analysisRunning} />
                    <span className="font-mono text-[13px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                      {statusText}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="mb-5 flex items-center gap-4 border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-4 py-5">
                    <span className="font-mono text-[20px] text-[var(--accent-text)]">
                      {analysisRunning ? "↻" : "✓"}
                    </span>
                    <span className="font-mono text-[15px] text-[var(--text-primary)]">
                      Scanning Semantic Scholar & ArXiv...
                    </span>
                    <span className="ml-auto font-mono text-[15px] text-[var(--text-primary)]">
                      {analysisProgress}%
                    </span>
                  </div>
                  <div className="space-y-4">
                    {references.slice(0, 2).map((reference, index) => (
                      <article key={`${reference.doi}-${index}`} className="border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <span className="bg-[var(--surface-elevated)] px-3 py-1 font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                            {index === 0 ? "2023" : "2024"}
                          </span>
                          <span className={`border px-3 py-1 font-mono text-[12px] uppercase tracking-[0.16em] ${classForReference(reference.type)}`}>
                            {reference.type === "similarity" ? "Similar work exists" : "Partial methodology"}
                          </span>
                        </div>
                        <h3 className="max-w-2xl text-[clamp(1.6rem,3.2vw,2rem)] font-medium leading-[1.28] text-[var(--text-primary)]">
                          {reference.title}
                        </h3>
                        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)]">
                          {reference.note}
                        </p>
                        <div className="mt-4 flex gap-5 font-mono text-[12px] text-[var(--text-tertiary)]">
                          <span>Match: {index === 0 ? "82%" : "65%"}</span>
                          <span>Citations: {index === 0 ? "142" : "18"}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
              <section className={`rounded-lg ${surfaceClass()} overflow-hidden`}>
                <div className="flex h-12 items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5">
                  <div className="font-mono text-[13px] uppercase tracking-[0.28em] text-[var(--text-primary)]">
                    2. Protocol.Generation
                  </div>
                  <div className="font-mono text-[13px] uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                    Node: Alpha-7
                  </div>
                </div>
                <div className="flex h-full min-h-[36rem] md:min-h-[44rem] flex-col justify-between p-5 md:p-7">
                  <div className="flex flex-1 flex-col items-center justify-center">
                    <div className="relative mb-10 flex h-56 w-56 items-center justify-center">
                      <div className="absolute inset-0 rounded-full border border-dashed border-[rgba(196,192,255,0.18)]" />
                      <div className="absolute inset-6 rounded-full border border-[rgba(196,192,255,0.12)]" />
                      <div className="absolute inset-12 rounded-full border border-[rgba(196,192,255,0.08)]" />
                      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[rgba(108,99,255,0.5)] bg-[rgba(108,99,255,0.12)] text-3xl text-[var(--accent-text)] shadow-[0_0_18px_rgba(108,99,255,0.18)]">
                        ⚗
                      </div>
                    </div>
                    <div className="font-mono text-[clamp(1rem,2.4vw,1.125rem)] tracking-[0.18em] text-[var(--accent-text)]">
                      Retrieving protocols...
                    </div>
                    <div className="mt-8 h-px w-full bg-[var(--border-soft)]">
                      <div
                        className="h-px bg-[var(--accent-strong)]"
                        style={{ width: `${Math.max(18, analysisProgress)}%` }}
                      />
                    </div>
                  </div>
                  <div className="border border-[var(--border-soft)] bg-black/40 p-5 font-mono text-[13px] leading-7 text-[var(--text-tertiary)]">
                    {analysisBootLogs.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                    {error ? <div className="text-[#ffb4ab]">{error}</div> : null}
                    <div className="text-[var(--accent-text)]">{">"} ▉</div>
                  </div>
                  <div className="mt-7 flex items-center justify-end gap-4">
                    <button className="border border-[var(--border-soft)] px-6 py-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      Abort
                    </button>
                    <button
                      disabled={!plan}
                      onClick={() => setScreen("plan")}
                      className="bg-[rgba(108,99,255,0.22)] px-8 py-3 font-mono text-[13px] uppercase tracking-[0.2em] text-[var(--accent-text)] disabled:opacity-40"
                    >
                      Review Plan →
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    );
  }

  function renderLiteratureScreen() {
    const similarityRefs = references.slice(0, 4);
    const conflict = references.find((item) => item.type === "conflict") ?? references[1] ?? references[0];
    const supportive = references.find((item) => item.type === "similarity") ?? references[0];

    return (
      <div className="flex min-h-screen bg-[var(--background)]">
        {renderLabSidebar("inventory")}
        <div className="flex flex-1 flex-col md:ml-0">
          {renderLabTopNav("literature")}
          <main className="flex flex-1 gap-4 overflow-hidden p-4 md:p-4">
            <section className={`flex w-[35%] min-w-[22rem] flex-col ${surfaceClass()}`}>
              <header className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5 py-4">
                <h2 className="text-[clamp(1.25rem,2.5vw,1.4rem)] font-semibold text-[var(--text-primary)]">Cited Corpus</h2>
                <span className="border border-[var(--border-soft)] px-3 py-2 font-mono text-[12px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  {similarityRefs.length} Sources
                </span>
              </header>
              <div className="flex-1 overflow-y-auto">
                {similarityRefs.map((reference) => (
                  <article key={reference.doi} className="border-b border-[var(--border-soft)] px-5 py-5 hover:bg-[var(--surface-elevated)]">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <span className={`border px-2 py-1 font-mono text-[12px] uppercase tracking-[0.16em] ${classForReference(reference.type)}`}>
                        {reference.type}
                      </span>
                      <span className="font-mono text-[12px] text-[var(--text-tertiary)]">{reference.doi}</span>
                    </div>
                    <h3 className="text-[clamp(1rem,2.2vw,1.15rem)] font-medium leading-7 text-[var(--text-primary)]">{reference.title}</h3>
                    <p className="mt-2 text-[15px] text-[var(--text-secondary)]">{reference.source}</p>
                  </article>
                ))}
              </div>
            </section>
            <section className={`flex-1 overflow-y-auto ${surfaceClass()}`}>
              <header className="flex items-start justify-between border-b border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5 py-5 md:px-7 md:py-6">
                <div>
                  <p className="font-mono text-[12px] uppercase tracking-[0.24em] text-[var(--accent-text)]">
                    Hypothesis Synthesis // {plan?.experimentId ?? "RUN_042"}
                  </p>
                  <h1 className="mt-2 max-w-3xl text-[clamp(2rem,4.8vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--text-primary)]">
                    {hypothesis.slice(0, 72)}
                    {hypothesis.length > 72 ? "..." : ""}
                  </h1>
                </div>
                <button
                  onClick={() => void handleRegenerate("validation")}
                  className="bg-[rgba(108,99,255,0.18)] px-5 py-3 font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--accent-text)]"
                >
                  {regeneratingSection === "validation" ? "Regenerating..." : "Regenerate"}
                </button>
              </header>
              <div className="space-y-7 p-5 md:p-7 text-[clamp(1rem,2.2vw,1.125rem)] leading-[1.9] text-[var(--text-primary)]">
                <p>
                  The current hypothesis proposes a structured experimental intervention with measurable outcomes, explicit controls, and an operationally realistic validation path. The literature synthesis below surfaces the strongest supporting and conflicting signals before protocol execution.
                </p>
                <div className="border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-6">
                  <h3 className="mb-4 flex items-center gap-3 text-[clamp(1.1rem,2.5vw,1.25rem)] font-semibold text-[var(--text-primary)]">
                    ✺ Supporting Evidence
                  </h3>
                  <p className="text-[clamp(1rem,2.2vw,1.125rem)] leading-[1.9] text-[var(--text-secondary)]">
                    Our approach aligns most closely with <span className="font-mono text-[var(--accent-text)]">[{supportive.doi}]</span>, which provides the nearest operational match on assay framing, baseline controls, and reagent handling. This source is the primary scaffold for the proposed run design.
                  </p>
                </div>
                <div className="border border-[rgba(255,180,171,0.35)] bg-[rgba(255,180,171,0.06)] p-6">
                  <h3 className="mb-4 flex items-center gap-3 text-[clamp(1.1rem,2.5vw,1.25rem)] font-semibold text-[#ffd1cb]">
                    ⚠ Critical Conflict
                  </h3>
                  <p className="text-[clamp(1rem,2.2vw,1.125rem)] leading-[1.9] text-[var(--text-secondary)]">
                    A significant conflict appears in <span className="font-mono text-[#ffd1cb]">[{conflict.doi}]</span>, where the authors report execution risks related to concentration control, hardware constraints, or matrix variability. We surface that conflict directly so the plan can compensate before ordering begins.
                  </p>
                  <blockquote className="mt-5 border-l-2 border-[#ffb4ab] bg-black/35 px-5 py-4 font-mono text-[16px] leading-8 text-[#f3ddd7]">
                    &ldquo;{conflict.note}&rdquo;
                  </blockquote>
                </div>
                <p className="text-[clamp(1rem,2.2vw,1.125rem)] leading-[1.9] text-[var(--text-secondary)]">
                  To resolve this conflict, the plan below adds stronger sourcing constraints, tighter protocol details, and explicit validation checkpoints before full execution.
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  function renderPlanScreen() {
    const progressItems = ["Protocol", "Materials", "Budget", "Timeline", "Validation"];

    return (
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        {renderAiTopNav("plan")}
        <div className="flex flex-1 overflow-hidden">
          {renderAiSidebar("plan")}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className={`${annotationOpen ? "opacity-35 blur-[2px]" : ""} transition-all`}>
              <div className="mx-auto flex max-w-7xl gap-5 md:gap-8">
                <div className="min-w-0 flex-1 space-y-8">
                  <section className={`rounded-lg ${surfaceClass()} p-5 md:p-7`}>
                    <div className="mb-7 flex items-start justify-between">
                      <div>
                        <h2 className="text-[clamp(1.35rem,2.6vw,1.5rem)] font-semibold text-[var(--text-primary)]">Protocol Execution</h2>
                        <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
                          Step-by-step methodology for experiment setup.
                        </p>
                      </div>
                      <button
                        onClick={() => setAnnotationOpen(true)}
                        className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--accent-text)]"
                      >
                        ✚ Annotate
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(plan?.protocol ?? []).slice(0, 4).map((step) => (
                        <div key={step.step} className="border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
                          <div className="flex gap-6">
                            <div className="font-mono text-[clamp(1.6rem,4vw,2rem)] leading-none text-[var(--accent-text)]">
                              {step.step}
                            </div>
                            <div>
                              <h3 className="text-[clamp(1.05rem,2.5vw,1.25rem)] font-medium text-[var(--text-primary)]">{step.title}</h3>
                              <p className="mt-2 text-[16px] leading-8 text-[var(--text-secondary)]">{step.detail}</p>
                              <div className="mt-4 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                                Source: {sectionCitations?.protocol?.[0]?.doi ?? "Ref-22.A"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className={`overflow-hidden rounded-lg ${surfaceClass()}`}>
                    <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5 py-5 md:px-7">
                      <h2 className="flex items-center gap-3 text-[clamp(1.35rem,2.6vw,1.5rem)] font-semibold text-[var(--text-primary)]">
                        ⚗ Materials & Reagents
                      </h2>
                      <span className="font-mono text-[14px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                        ID: MAT-992
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[55rem]">
                        <thead className="border-b border-[var(--border-soft)] bg-[var(--surface-panel)]">
                          <tr className="font-mono text-[14px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                            <th className="px-5 py-4 text-left">Reagent</th>
                            <th className="px-5 py-4 text-left">Supplier</th>
                            <th className="px-5 py-4 text-left">Cat #</th>
                            <th className="px-5 py-4 text-right">Qty</th>
                            <th className="px-5 py-4 text-right">Unit $</th>
                            <th className="px-5 py-4 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(plan?.materials ?? []).map((material, index) => {
                            const estimated = parseMoney(material.estimatedCost);
                            return (
                              <tr
                                key={`${material.catalogNumber}-${index}`}
                                className="border-b border-[var(--border-soft)] text-[var(--text-primary)]"
                              >
                                <td className="px-5 py-5 font-mono text-[18px]">{material.name}</td>
                                <td className="px-5 py-5 font-mono text-[18px]">{material.supplier}</td>
                                <td className="px-5 py-5 font-mono text-[18px] text-[var(--text-secondary)]">
                                  {material.catalogNumber}
                                </td>
                                <td className="px-5 py-5 text-right font-mono text-[18px]">{material.quantity}</td>
                                <td className="px-5 py-5 text-right font-mono text-[18px]">{material.estimatedCost}</td>
                                <td className="px-5 py-5 text-right font-mono text-[18px]">
                                  {formatMoney(estimated, labSettings.budgetCurrency)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[var(--surface-panel)]">
                            <td colSpan={4} />
                            <td className="px-5 py-5 text-right font-mono text-[20px] text-[var(--accent-text)]">Subtotal</td>
                            <td className="px-5 py-5 text-right font-mono text-[20px] text-[var(--accent-text)]">
                              {formatMoney(reagentsBudget, labSettings.budgetCurrency)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </section>
                </div>
                <aside className="w-72 shrink-0 space-y-6">
                  <div className={`rounded-lg ${surfaceClass()} p-6`}>
                  <div className="mb-4 text-[clamp(1.25rem,2.5vw,1.4rem)] font-semibold text-[var(--text-primary)]">Budget Summary</div>
                    <div className="space-y-5 font-mono text-[16px]">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[var(--text-primary)]">Reagents</span>
                          <span className="text-[var(--text-primary)]">
                            {formatMoney(reagentsBudget, labSettings.budgetCurrency)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-black">
                          <div className="h-1.5 bg-[var(--accent-text)]" style={{ width: "65%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[var(--text-primary)]">Equipment</span>
                          <span className="text-[var(--text-primary)]">
                            {formatMoney(equipmentBudget, labSettings.budgetCurrency)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-black">
                          <div className="h-1.5 bg-[#ffb785]" style={{ width: "42%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--border-soft)] bg-black p-5">
                    <div className="mb-3 font-mono text-[12px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                      Section Progress
                    </div>
                    <div className="mb-3 h-2 bg-[var(--surface-panel)]">
                      <div className="h-2 bg-[var(--accent-strong)]" style={{ width: "80%" }} />
                    </div>
                    <div className="mb-4 text-right font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                      4 of 5 complete
                    </div>
                    <div className="space-y-2 font-mono text-[16px] text-[var(--text-primary)]">
                      {progressItems.map((item, index) => (
                        <div key={item} className={index === 4 ? "text-[var(--text-tertiary)]" : ""}>
                          • {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={`rounded-lg ${surfaceClass()} p-5`}>
                    <button
                      onClick={() => void handleExport()}
                      className="mb-3 w-full bg-[rgba(108,99,255,0.18)] px-4 py-3 font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--accent-text)]"
                    >
                      Export Markdown
                    </button>
                    <button
                      onClick={() => setScreen("results")}
                      className="w-full border border-[var(--border-soft)] px-4 py-3 font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                    >
                      View Results
                    </button>
                  </div>
                </aside>
              </div>
            </div>
            {annotationOpen ? (
              <div className="absolute inset-0 flex justify-end bg-black/40">
                <div className="h-full w-[24rem] border-l border-[var(--border-soft)] bg-[var(--surface-panel)] shadow-[-20px_0_50px_rgba(0,0,0,0.28)]">
                  <div className="border-b border-[var(--border-soft)] px-5 py-5 md:px-6 md:py-7">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">Annotate: Protocol</h3>
                        <p className="mt-1 text-[15px] text-[var(--text-tertiary)]">Feedback & Peer Review</p>
                      </div>
                      <button onClick={() => setAnnotationOpen(false)} className="text-2xl text-[var(--text-tertiary)]">
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="space-y-8 px-6 py-6">
                    <div className="border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
                      <div className="mb-2 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                        Target: Step {protocolTarget?.step ?? "3"}
                      </div>
                      <div className="text-[16px] leading-7 text-[var(--text-secondary)]">
                        &ldquo;{protocolTarget?.detail ?? "Add compound 4A using acoustic dispenser..."}&rdquo;
                      </div>
                    </div>
                    <div>
                      <label className="mb-3 block text-[16px] font-medium text-[var(--text-primary)]">
                        What needs correcting?
                      </label>
                      <textarea
                        value={reviewIssue}
                        onChange={(event) => setReviewIssue(event.target.value)}
                        className="h-40 w-full resize-none border border-[var(--accent-strong)] bg-black/35 p-4 text-[16px] leading-8 text-[var(--text-primary)] outline-none"
                      />
                      <div className="mt-2 text-right text-[13px] text-[var(--text-tertiary)]">Auto-saving...</div>
                    </div>
                    <div>
                      <div className="mb-3 text-[16px] font-medium text-[var(--text-primary)]">Section quality</div>
                      <div className="text-[32px] text-[var(--accent-strong)]">★★★☆☆</div>
                    </div>
                    <div>
                      <div className="mb-3 text-[16px] font-medium text-[var(--text-primary)]">Tags</div>
                      <div className="flex gap-3">
                        <span className="border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-3 py-2 font-mono text-[13px] uppercase tracking-[0.16em] text-[#ffb4ab]">
                          Critical ×
                        </span>
                        <select
                          value={reviewSection}
                          onChange={(event) => setReviewSection(event.target.value)}
                          className="border border-[var(--border-soft)] bg-transparent px-3 py-2 font-mono text-[13px] uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                        >
                          <option>Protocol</option>
                          <option>Materials</option>
                          <option>Budget</option>
                          <option>Timeline</option>
                          <option>Validation</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-3 block text-[16px] font-medium text-[var(--text-primary)]">
                        Why does this matter?
                      </label>
                      <textarea
                        value={reviewImpact}
                        onChange={(event) => setReviewImpact(event.target.value)}
                        className="h-28 w-full resize-none border border-[var(--border-soft)] bg-black/35 p-4 text-[15px] leading-7 text-[var(--text-primary)] outline-none"
                      />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-3 border-t border-[var(--border-soft)] bg-[var(--surface-panel)] px-6 py-5">
                    <button
                      onClick={() => setAnnotationOpen(false)}
                      className="border border-[var(--border-soft)] px-6 py-3 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleSaveReview()}
                      className="bg-[var(--accent-strong)] px-7 py-3 font-mono text-[12px] uppercase tracking-[0.18em] text-white"
                    >
                      Save Annotation
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    );
  }

  function renderDashboardScreen() {
    return (
      <div className="flex min-h-screen bg-[var(--background)]">
        {renderLabSidebar("inventory")}
        <div className="flex flex-1 flex-col">
          {renderLabTopNav("dashboard")}
          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 flex items-start justify-between gap-8">
                <div>
                  <h1 className="text-[clamp(2.2rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)]">
                    Active Experiment Plans
                  </h1>
                  <p className="mt-3 text-[clamp(1rem,2.2vw,1.125rem)] leading-[1.9] text-[var(--text-secondary)]">
                    Monitoring automated synthesis and literature analysis queues.
                  </p>
                </div>
                <button onClick={() => setScreen("input")} className="bg-[var(--accent-strong)] px-7 py-4 font-mono text-[14px] uppercase tracking-[0.18em] text-white">
                  + New Experiment
                </button>
              </div>
              <div className="grid grid-cols-[1.4fr_0.7fr] gap-5">
                <div className="space-y-5">
                  {projects.slice(0, 2).map((project, index) => (
                    <button
                      key={project.id}
                      onClick={() => openProject(project, "plan")}
                      className={`block w-full text-left ${surfaceClass()} p-5`}
                    >
                      <div className="mb-5 flex items-center justify-between font-mono text-[13px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                        <div className="flex items-center gap-4">
                          <span>{project.id}</span>
                          <span className="border border-[var(--border-soft)] bg-[rgba(196,192,255,0.12)] px-3 py-1 text-[var(--accent-text)]">
                            {index === 0 ? "Running" : "Completed"}
                          </span>
                        </div>
                        <span>{index === 0 ? "Started 2h ago" : new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <h2 className="max-w-4xl text-[clamp(1.35rem,2.8vw,1.5rem)] font-medium leading-[1.4] text-[var(--text-primary)]">
                        {project.plan.title}
                      </h2>
                      <p className="mt-3 text-[clamp(1rem,2.1vw,1.125rem)] leading-[1.8] text-[var(--text-secondary)]">
                        Hypothesis: {project.hypothesis.slice(0, 120)}
                        {project.hypothesis.length > 120 ? "..." : ""}
                      </p>
                      <div className="mt-6 grid grid-cols-3 gap-4">
                        <div>
                          <div className="font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Iteration</div>
                          <div className="mt-2 font-mono text-[18px] text-[var(--text-primary)]">{index === 0 ? "44 / 100" : "Validated"}</div>
                        </div>
                        <div>
                          <div className="font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Compute</div>
                          <div className="mt-2 font-mono text-[18px] text-[var(--text-primary)]">{index === 0 ? "14.2 TFlops" : project.plan.status}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Novelty Score</div>
                          <div className="mt-2 font-mono text-[18px] text-[#ffb785]">
                            {index === 0 ? "0.87 (High)" : "0.62 (Med)"}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="space-y-5">
                  <div className={`${surfaceClass()} p-5`}>
                    <div className="mb-4 font-mono text-[12px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                      Drafting & Planning
                    </div>
                    <div className="inline-flex border border-[#ffb785]/40 bg-[#ffb785]/10 px-3 py-1 font-mono text-[12px] uppercase tracking-[0.16em] text-[#ffb785]">
                      Drafting
                    </div>
                    <h3 className="mt-5 text-[clamp(1.35rem,2.8vw,1.5rem)] font-medium leading-[1.35] text-[var(--text-primary)]">
                      Exploratory Synthesis of Carbon Nanotube Variants
                    </h3>
                    <p className="mt-3 text-[17px] leading-8 text-[var(--text-secondary)]">
                      AI agent currently reviewing 1,402 related papers to formalize hypothesis parameters.
                    </p>
                    <div className="mt-6 border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-4">
                      <div className="mb-2 flex items-center justify-between font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        <span>Lit Review Progress</span>
                        <span>78%</span>
                      </div>
                      <div className="h-1.5 bg-black">
                        <div className="h-1.5 bg-[#ffb785]" style={{ width: "78%" }} />
                      </div>
                    </div>
                  </div>
                  <div className={`${surfaceClass()} p-5`}>
                    <div className="inline-flex border border-[#ffb785]/40 bg-[#ffb785]/10 px-3 py-1 font-mono text-[12px] uppercase tracking-[0.16em] text-[#ffb785]">
                      Drafting
                    </div>
                    <h3 className="mt-5 text-[clamp(1.35rem,2.8vw,1.5rem)] font-medium leading-[1.35] text-[var(--text-primary)]">
                      CRISPR Off-Target Prediction Model Tuning
                    </h3>
                    <p className="mt-3 text-[17px] leading-8 text-[var(--text-secondary)]">
                      Awaiting user input on base-pair penalty weights before final simulation setup.
                    </p>
                    <button className="mt-6 w-full border border-[var(--border-soft)] px-4 py-3 font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--text-primary)]">
                      Provide Parameters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  function renderResultsScreen() {
    const chartPath = "M0 380 C80 360 130 250 200 170 C240 120 290 180 340 320 C395 450 460 280 520 120 C560 20 610 140 650 360 C700 580 760 290 810 80 C850 -40 900 130 940 460 C980 650 1030 300 1080 90";
    const terminalLogs = [
      "[10:42:01] SYS: Injector pump P1 engaged. Flow rate 0.5mL/m.",
      "[10:42:05] SENS: Optic sensor array calibrating... OK.",
      "[10:42:10] SYS: Thermal cycler ramping to 37C.",
      "[10:45:00] ACQ: Data acquisition started.",
      "[10:50:00] ACQ: T+5m checkpoint passed.",
      "[10:56:00] WARN: Minor fluctuation in P1 flow detected. Compensating...",
    ];

    return (
      <div className="flex min-h-screen bg-[var(--background)]">
        {renderLabSidebar("inventory")}
        <div className="flex flex-1 flex-col">
          {renderLabTopNav("results")}
          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h1 className="text-[clamp(2.2rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)]">
                    Experiment Readout
                  </h1>
                  <div className="mt-3 font-mono text-[18px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    ID: RUN_77A_F2 // LIVE
                  </div>
                </div>
                <div className="flex gap-4">
                  <button className="border border-[var(--border-soft)] px-6 py-3 font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--text-primary)]">
                    ⤓ Export CSV
                  </button>
                  <button className="bg-[rgba(108,99,255,0.18)] px-6 py-3 font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--accent-text)]">
                    ⦿ Abort Run
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.48fr]">
                <section className={`overflow-hidden rounded-lg ${surfaceClass()}`}>
                  <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5 py-4">
                    <div className="font-mono text-[13px] uppercase tracking-[0.2em] text-[var(--text-primary)]">
                      Fluorescence vs Time (ms)
                    </div>
                    <div className="font-mono text-[13px] uppercase tracking-[0.18em] text-[#ffb785]">
                      ● Live acquisition
                    </div>
                  </div>
                  <div className="relative h-[28rem] md:h-[40rem] xl:h-[56rem] bg-[var(--surface-panel)]">
                    <svg viewBox="0 0 1080 600" className="h-full w-full">
                      <path d={chartPath} fill="none" stroke="rgba(196,192,255,0.18)" strokeWidth="3" />
                      <path d={chartPath} fill="none" stroke="var(--accent-strong)" strokeWidth="4" />
                    </svg>
                    <div className="absolute right-6 top-6 space-y-3">
                      <div className={`rounded ${surfaceClass()} px-4 py-3 font-mono text-[16px] text-[var(--text-primary)]`}>
                        CH_1 MAX <span className="text-[var(--accent-text)]">8.42e4</span>
                      </div>
                      <div className={`rounded ${surfaceClass()} px-4 py-3 font-mono text-[16px] text-[var(--text-primary)]`}>
                        TEMP <span className="text-white">37.2°C</span>
                      </div>
                    </div>
                  </div>
                </section>
                <div className="space-y-5">
                  <section className={`rounded-lg ${surfaceClass()} p-5`}>
                    <div className="mb-4 font-mono text-[13px] uppercase tracking-[0.2em] text-[var(--text-primary)]">
                      AI Observations
                    </div>
                    <div className="space-y-3">
                      <div className="border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-4">
                        <div className="text-[18px] leading-8 text-[var(--text-primary)]">
                          ⚠ Anomalous spike detected in CH_1 at T+14m.
                        </div>
                        <div className="mt-2 font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                          Confidence: 94%
                        </div>
                      </div>
                      <div className="border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-4">
                        <div className="text-[18px] leading-8 text-[var(--text-primary)]">
                          ⓘ Reaction rate stabilizing according to protocol nominals.
                        </div>
                        <div className="mt-2 font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                          Confidence: 88%
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className={`rounded-lg ${surfaceClass()} overflow-hidden`}>
                    <div className="border-b border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5 py-4 font-mono text-[13px] uppercase tracking-[0.2em] text-[var(--text-primary)]">
                      Equipment Terminal
                    </div>
                    <div className="space-y-2 bg-black/40 p-5 font-mono text-[14px] leading-8 text-[var(--text-tertiary)]">
                      {terminalLogs.map((line) => (
                        <div key={line} className={line.includes("WARN") ? "text-[#ffb785]" : ""}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  function renderInventoryScreen() {
    const materials = plan?.materials ?? [];

    return (
      <div className="flex min-h-screen bg-[var(--background)]">
        {renderLabSidebar("inventory")}
        <div className="flex flex-1 flex-col">
          {renderLabTopNav("inventory")}
          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
              <h1 className="text-[clamp(2.2rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)]">
                Reagent Inventory
              </h1>
              <p className="mt-3 text-[clamp(1rem,2.2vw,1.125rem)] leading-[1.9] text-[var(--text-secondary)]">
                Manage real-time stock levels and automated procurement.
              </p>
              <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-[1.18fr_0.34fr]">
                <section className={`rounded-lg ${surfaceClass()} overflow-hidden`}>
                  <div className="flex items-center justify-between px-5 py-5">
                    <div className="flex gap-4">
                      <div className="flex w-80 items-center border border-[var(--border-soft)] bg-black px-4 py-3">
                        <span className="mr-3 font-mono text-xs text-[var(--text-tertiary)]">⌕</span>
                        <span className="font-mono text-[16px] text-[var(--text-tertiary)]">Search CAS, Name...</span>
                      </div>
                      <button className="border border-[var(--border-soft)] px-6 py-3 font-mono text-[14px] text-[var(--text-primary)]">
                        ☰ Filter
                      </button>
                    </div>
                  </div>
                  <table className="w-full">
                    <thead className="border-y border-[var(--border-soft)] bg-[var(--surface-elevated)]">
                      <tr className="font-mono text-[14px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        <th className="px-5 py-4 text-left">Compound / CAS</th>
                        <th className="px-5 py-4 text-left">Supplier / Cat #</th>
                        <th className="px-5 py-4 text-left">Stock Level</th>
                        <th className="px-5 py-4 text-left">Location</th>
                        <th className="px-5 py-4 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.slice(0, 3).map((material, index) => (
                        <tr key={material.catalogNumber} className="border-b border-[var(--border-soft)] align-top">
                          <td className="px-5 py-6">
                            <div className="flex items-start gap-3">
                              <span className={`mt-2 inline-block h-3 w-3 rounded-full ${index === 1 ? "bg-[#ff6b6b]" : index === 2 ? "bg-[#ffb72a]" : "bg-[#2ee6a6]"}`} />
                              <div>
                                <div className="text-[18px] font-medium text-[var(--text-primary)]">{material.name}</div>
                                <div className="mt-1 font-mono text-[13px] text-[var(--text-tertiary)]">CAS: {index === 0 ? "60842-46-8" : index === 1 ? "N/A" : "28718-90-3"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-6">
                            <div className="text-[18px] text-[var(--text-primary)]">{material.supplier}</div>
                            <div className="mt-1 font-mono text-[13px] text-[var(--text-tertiary)]">#{material.catalogNumber}</div>
                          </td>
                          <td className="px-5 py-6">
                            <div className="flex items-center gap-4">
                              <div className="h-2 w-28 bg-black">
                                <div
                                  className={`h-2 ${index === 1 ? "bg-[#ff5d73]" : index === 2 ? "bg-[#ffb72a]" : "bg-[#2ee6a6]"}`}
                                  style={{ width: index === 1 ? "18%" : index === 2 ? "42%" : "78%" }}
                                />
                              </div>
                              <div className="font-mono text-[18px] text-[var(--text-primary)]">
                                {index === 1 ? "12 µL" : index === 2 ? "3.5 mL" : "850 mg"}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-6 font-mono text-[18px] text-[var(--text-primary)]">
                            {index === 1 ? "-80°C Freezer • Box 4" : index === 2 ? "4°C Fridge B" : "Cold Rm A • Shelf 2"}
                          </td>
                          <td className="px-5 py-6">
                            {index === 1 ? (
                              <button className="bg-[var(--accent-strong)] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.18em] text-white">
                                Order
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-5 py-4 font-mono text-[14px] text-[var(--text-tertiary)]">
                    <span>Showing 1-3 of 1,248 records</span>
                    <span>{"< >"}</span>
                  </div>
                </section>
                <div className="space-y-5">
                  <section className="rounded-lg border border-[#ff4b5c]/55 bg-[rgba(147,0,10,0.06)]">
                    <div className="flex items-center justify-between border-b border-[#ff4b5c]/35 px-5 py-4">
                      <div className="font-mono text-[14px] uppercase tracking-[0.2em] text-[#ff8e97]">
                        ⚠ Critical Low
                      </div>
                      <div className="border border-[#ff4b5c]/35 px-4 py-2 font-mono text-[18px] text-[#ff8e97]">2 Items</div>
                    </div>
                    <div className="space-y-4 p-5">
                      {["Claudin-1 Antibody", "HEPES Buffer"].map((item, index) => (
                        <div key={item} className="border border-[#ff4b5c]/25 bg-black/20 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-[18px] font-medium leading-8 text-[var(--text-primary)]">{item}</div>
                            <div className="font-mono text-[18px] text-[#ff8e97]">{index === 0 ? "12 µL" : "50 mL"}</div>
                          </div>
                          <div className="mt-2 font-mono text-[13px] text-[var(--text-tertiary)]">
                            Est. depletion: {index === 0 ? "2 days" : "Today"}
                          </div>
                          <button className="mt-5 w-full border border-[var(--border-soft)] px-4 py-3 font-mono text-[13px] uppercase tracking-[0.18em] text-[var(--text-primary)]">
                            🛒 Draft Order
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className={`rounded-lg ${surfaceClass()} p-5`}>
                    <div className="mb-4 font-mono text-[14px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Active Procurement
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center border border-[var(--border-soft)] bg-black text-[var(--accent-text)]">
                        ⛟
                      </div>
                      <div>
                        <div className="font-mono text-[18px] text-[var(--text-primary)]">PO-2023-884</div>
                        <div className="text-[14px] text-[var(--text-tertiary)]">
                          Fisher Scientific • Arriving Tomorrow
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  function renderProtocolsScreen() {
    return (
      <div className="flex min-h-screen bg-[var(--background)]">
        {renderLabSidebar("protocols")}
        <div className="flex flex-1 flex-col">
          {renderLabTopNav("protocols")}
          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 flex items-start justify-between gap-8">
                <div>
                  <h1 className="text-[clamp(2.2rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)]">
                    Protocol Library
                  </h1>
                  <p className="mt-3 max-w-4xl text-[clamp(1rem,2.2vw,1.125rem)] leading-[1.9] text-[var(--text-secondary)]">
                    Manage and version standardized experimental procedures. Ensure reproducibility across team members and automated liquid handling systems.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="flex w-80 items-center border border-[var(--border-soft)] bg-black px-4 py-3">
                    <span className="mr-3 font-mono text-xs text-[var(--text-tertiary)]">⌕</span>
                    <span className="font-mono text-[16px] text-[var(--text-tertiary)]">Search ID, tag, or author...</span>
                  </div>
                  <button className="border border-[var(--border-soft)] px-6 py-3 font-mono text-[14px] text-[var(--text-primary)]">
                    ☰ Filters
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {protocolCards.map((item, index) => (
                  <article
                    key={item.id}
                    className={`border ${
                      item.status === "In Revision"
                        ? "border-[#ffb72a]/55"
                        : "border-[#2ee6a6]/55"
                    } bg-[var(--surface-panel)] p-5`}
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <span className="font-mono text-[14px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                        {item.id}
                      </span>
                      <span
                        className={`font-mono text-[14px] uppercase tracking-[0.16em] ${
                          item.status === "In Revision" ? "text-[#ffb72a]" : "text-[#2ee6a6]"
                        }`}
                      >
                        ● {item.status}
                      </span>
                    </div>
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <h3 className="text-[24px] font-medium leading-9 text-[var(--text-primary)]">{item.title}</h3>
                      <span className="border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-3 py-2 font-mono text-[16px] text-[var(--text-secondary)]">
                        v{index === 0 ? "4.2" : index === 1 ? "1.0" : "3.1"}
                      </span>
                    </div>
                    <p className="text-[18px] leading-8 text-[var(--text-secondary)]">
                      {item.status === "In Revision"
                        ? "Generation of stable knockout cell lines using puromycin selection. Optimized for HEK293T and HeLa adherent cultures."
                        : "High-throughput screening protocol for determining IC50 values in novel compound series and stabilized assay matrices."}
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-6">
                      <div>
                        <div className="font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Author</div>
                        <div className="mt-2 text-[18px] text-[var(--text-primary)]">
                          {index === 2 ? "Automation Team" : index === 1 ? "J. Miller, PhD" : "Dr. S. Chen"}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Success Rate</div>
                        <div className={`mt-2 text-[18px] ${item.status === "In Revision" ? "text-[#ffb72a]" : "text-[#2ee6a6]"}`}>
                          ↗ {item.success}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Last Run</div>
                        <div className="mt-2 text-[18px] text-[var(--text-primary)]">2023-10-24 14:30</div>
                      </div>
                      <div>
                        <div className="font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Est. Duration</div>
                        <div className="mt-2 text-[18px] text-[var(--text-primary)]">{item.duration}</div>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className="border border-[var(--border-soft)] bg-[rgba(108,99,255,0.12)] px-3 py-2 font-mono text-[13px] text-[var(--accent-text)]">
                        {item.domain}
                      </span>
                      <span className="border border-[var(--border-soft)] bg-[rgba(255,183,42,0.1)] px-3 py-2 font-mono text-[13px] text-[#ffb785]">
                        Automation
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  function renderSettingsScreen() {
    const supplierCount = labSettings.preferredSuppliers.length;

    return (
      <div className="flex min-h-screen bg-[var(--background)]">
        {renderLabSidebar("settings")}
        <div className="flex flex-1 flex-col">
          {renderLabTopNav("settings")}
          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
              <h1 className="text-[clamp(2.2rem,6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)]">
                Lab Settings & Integrations
              </h1>
              <p className="mt-3 max-w-4xl text-[clamp(1rem,2.2vw,1.125rem)] leading-[1.9] text-[var(--text-secondary)]">
                Manage laboratory access controls, configure external scientific API pipelines, and monitor computational usage limits.
              </p>
              <div className="mt-10 grid grid-cols-1 gap-7 xl:grid-cols-[0.45fr_0.85fr]">
                <section className={`rounded-lg ${surfaceClass()} overflow-hidden`}>
                  <div className="flex items-start justify-between border-b border-[var(--border-soft)] px-5 py-5">
                    <h2 className="text-[24px] font-semibold leading-8 text-[var(--text-primary)]">
                      Compute
                      <br />
                      Usage
                    </h2>
                    <span className="border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-3 py-2 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Billing-cycle-92
                    </span>
                  </div>
                  <div className="space-y-7 p-5">
                    <div>
                      <div className="mb-3 flex items-center justify-between text-[18px] text-[var(--text-primary)]">
                        <span>API Requests</span>
                        <span className="font-mono">845,021 / 1M</span>
                      </div>
                      <div className="h-3 bg-black">
                        <div className="h-3 bg-[var(--accent-strong)]" style={{ width: "84%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-3 flex items-center justify-between text-[18px] text-[var(--text-primary)]">
                        <span>Storage</span>
                        <span className="font-mono">1.2 TB / 5 TB</span>
                      </div>
                      <div className="h-3 bg-black">
                        <div className="h-3 bg-[var(--accent-strong)]/70" style={{ width: "24%" }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-end gap-4 pt-4">
                      <div>
                        <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                          Current Charges
                        </div>
                        <div className="mt-3 font-mono text-[clamp(2rem,5vw,2.5rem)] text-[var(--text-primary)]">$1,240.50</div>
                      </div>
                      <button className="border border-[var(--border-soft)] px-5 py-3 text-[18px] text-[var(--text-primary)]">
                        View Invoice
                      </button>
                    </div>
                  </div>
                </section>
                <section className={`rounded-lg ${surfaceClass()} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-5">
                    <h2 className="text-[24px] font-semibold text-[var(--text-primary)]">Active Integrations</h2>
                    <button className="text-[18px] text-[var(--accent-strong)]">+ Add Endpoint</button>
                  </div>
                  <div>
                    {[
                      { name: "PubMed API", state: "ONLINE", latency: "42ms", errorRate: "0.01%", tone: "text-[#2ee6a6]" },
                      { name: "Tavily Search", state: "ONLINE", latency: "112ms", errorRate: "0.00%", tone: "text-[#2ee6a6]" },
                      { name: "OpenAI Models", state: "DEGRADED", latency: "1450ms", errorRate: "4.20%", tone: "text-[#ff8e97]" },
                    ].map((item, index) => (
                      <div key={item.name} className="border-b border-[var(--border-soft)] p-5 last:border-b-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-5">
                            <div className="flex h-12 w-12 items-center justify-center border border-[var(--border-soft)] bg-black text-[var(--accent-text)]">
                              {index === 0 ? "⚗" : index === 1 ? "⟳" : "🤖"}
                            </div>
                            <div>
                              <div className="flex items-center gap-4">
                                <h3 className="text-[22px] font-medium text-[var(--text-primary)]">{item.name}</h3>
                                <span className={`border px-2 py-1 font-mono text-[12px] uppercase tracking-[0.16em] ${item.tone} border-current/40 bg-current/10`}>
                                  ● {item.state}
                                </span>
                              </div>
                              <p className="mt-2 text-[18px] leading-8 text-[var(--text-secondary)]">
                                {index === 0
                                  ? "Literature search & citation extraction pipeline."
                                  : index === 1
                                    ? "Real-time external data gathering for protocol generation."
                                    : "LLM inference for data analysis and summarization."}
                              </p>
                              <div className="mt-5 flex gap-8 font-mono text-[14px] uppercase tracking-[0.18em]">
                                <span>
                                  Latency: <span className="text-[#2ee6a6]">{item.latency}</span>
                                </span>
                                <span>
                                  Err_Rate: <span className={item.tone}>{item.errorRate}</span>
                                </span>
                                <span>Suppliers: {supplierCount}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-[var(--text-tertiary)]">↺ ⋮</div>
                        </div>
                        {index === 2 ? (
                          <div className="mt-5 border border-[#ffb785]/35 bg-[rgba(255,183,42,0.08)] p-4 text-[17px] leading-8 text-[var(--text-secondary)]">
                            ⚠ Rate limits exceeded for model gpt-4-turbo. Falling back to cached results where applicable.
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  function renderLogsScreen() {
    const lines = [
      "[2023-10-27 14:32:01.442] [INFO] [Synth_Core] Initialization sequence complete. Thermal parameters nominal at 37.2°C.",
      "[2023-10-27 14:32:15.891] [WARN] [HW_Ctrl_04] Micro-fluidic pump pressure dropping below optimal threshold (P=1.2atm). Compensating...",
      "[2023-10-27 14:32:18.005] [INFO] [AI_Agent_2] Analyzing structural variance in sample batch X-99. Confidence interval: 94%.",
      "[2023-10-27 14:32:22.114] [FAIL] [Spectro_V1] Calibration matrix mismatch detected. Halting diagnostic laser array to prevent optical damage. Code: ERR_OPT_0x4A",
      "[2023-10-27 14:32:22.115] [DBUG] [Sys_Monitor] Dump: { addr: 0x7fff5fbff688, sz: 1024, flags: 0x01 }",
      "[2023-10-27 14:32:25.330] [INFO] [AI_Agent_2] Rerouting processing node to fallback cluster B.",
      "[2023-10-27 14:32:30.000] [ OK ] [Sys_Core] Heartbeat acknowledged. System state stable.",
    ];

    return (
      <div className="flex min-h-screen bg-[var(--background)]">
        {renderLabSidebar("logs")}
        <div className="flex flex-1 flex-col">
          {renderLabTopNav("logs")}
          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8">
                <h1 className="text-[clamp(2rem,5.5vw,3.4rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--text-primary)]">
                  System Diagnostics
                </h1>
                <p className="mt-3 text-[clamp(1rem,2.2vw,1.125rem)] leading-[1.9] text-[var(--text-secondary)]">
                  Real-time telemetry and event logging from active modules.
                </p>
              </div>
              <div className={`rounded-lg ${surfaceClass()} overflow-hidden`}>
                <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-elevated)] px-5 py-5">
                  <div className="grid grid-cols-3 gap-6">
                    {["Synthesis Engine", "Hardware Controller", "AI Agent"].map((item, index) => (
                      <div
                        key={item}
                        className={`flex items-center justify-center border px-8 py-4 font-mono text-[14px] uppercase tracking-[0.18em] ${
                          index === 0
                            ? "border-[var(--border-soft)] bg-[rgba(196,192,255,0.08)] text-[var(--text-primary)]"
                            : "border-[var(--border-soft)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {index === 0 ? <span className="mr-3 text-[var(--accent-text)]">●</span> : null}
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button className="border border-[var(--border-soft)] px-5 py-4 font-mono text-[14px] text-[var(--text-primary)]">☰</button>
                    <button className="border border-[var(--border-soft)] px-5 py-4 font-mono text-[14px] text-[var(--text-primary)]">❚❚</button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 font-mono text-[16px] text-[var(--text-secondary)]">
                    <span>◉ ◉ ◉</span>
                    <span>▹ tty_lab_core_01</span>
                    <span>LIVE</span>
                  </div>
                  <div className="space-y-3 bg-black/25 p-4 md:p-5 font-mono text-[clamp(0.95rem,2vw,1.25rem)] leading-[1.9] text-[var(--text-primary)]">
                    {lines.map((line) => (
                      <div
                        key={line}
                        className={
                          line.includes("[FAIL]")
                            ? "border border-[rgba(255,75,92,0.35)] bg-[rgba(147,0,10,0.16)] px-3 py-2 text-[#ff6b6b]"
                            : line.includes("[WARN]")
                              ? "text-[#ffb72a]"
                              : line.includes("[INFO]")
                                ? "text-[#76a7ff]"
                                : line.includes("[ OK ]")
                                  ? "text-[#2ee6a6]"
                                  : "text-[var(--text-secondary)]"
                        }
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-5 font-mono text-[18px] text-[var(--text-secondary)]">
                    admin@lab_os:~$ <span className="text-[var(--text-tertiary)]">Enter diagnostic command...</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  switch (screen) {
    case "analysis":
      return renderAnalysisScreen();
    case "literature":
      return renderLiteratureScreen();
    case "plan":
      return renderPlanScreen();
    case "dashboard":
      return renderDashboardScreen();
    case "results":
      return renderResultsScreen();
    case "inventory":
      return renderInventoryScreen();
    case "protocols":
      return renderProtocolsScreen();
    case "settings":
      return renderSettingsScreen();
    case "logs":
      return renderLogsScreen();
    case "input":
    default:
      return renderInputScreen();
  }
}
