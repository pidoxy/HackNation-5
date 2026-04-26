export type NoveltySignal = "not found" | "similar work exists" | "exact match found";

export type ReferenceType = "similarity" | "protocol" | "supplier" | "conflict";

export type ExperimentFamily =
  | "wet_lab"
  | "animal_study"
  | "medical_imaging"
  | "computational_ml"
  | "clinical_retrospective"
  | "materials_chemistry"
  | "device_sensor"
  | "simulation_modeling"
  | "general_research";

export interface ParsedField {
  label: string;
  value: string;
}

export interface Reference {
  type: ReferenceType;
  title: string;
  source: string;
  doi: string;
  note: string;
  sourceUrl?: string;
  repository?: string;
  provenanceLabel?: string;
  venue?: string;
  authors?: string[];
  publishedYear?: string;
  relevanceSummary?: string;
  matchScore?: number;
  matchedTerms?: string[];
  matchRationale?: string;
}

export interface LiteratureQcSummary {
  query: string;
  rationale: string;
  topMatchScore: number;
  exactMatchThreshold: number;
  similarMatchThreshold: number;
  decisionFactors: string[];
}

export interface HistoricalComparisonItem {
  title: string;
  source: string;
  doi: string;
  similarityScore: number;
  outcomeSignal: "aligned" | "mixed" | "conflicting";
  takeaway: string;
}

export interface HistoricalComparisonSummary {
  verdict: "likely similar" | "mixed precedent" | "limited precedent";
  rationale: string;
  items: HistoricalComparisonItem[];
}

export interface CitationItem {
  title: string;
  source: string;
  doi: string;
  type: ReferenceType;
}

export interface ProtocolStep {
  step: string;
  title: string;
  detail: string;
  time: string;
  groundingStatus?: "grounded" | "adapted" | "inferred";
  groundingSourceTitle?: string;
  groundingSourceDoi?: string;
  groundingSourceUrl?: string;
  operationalNote?: string;
  extractedParameters?: string[];
  dependencies?: string[];
  criticalInputs?: string[];
}

export interface MaterialItem {
  name: string;
  supplier: string;
  catalogNumber: string;
  quantity: string;
  estimatedCost: string;
  requiredForSteps?: string[];
  leadTime?: string;
  usageNote?: string;
  verificationStatus?: "verified" | "estimated";
  verificationSource?: string;
  verificationNote?: string;
  verificationUrl?: string;
  verificationConfidence?: number;
}

export interface QualityCheck {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface MemoryImpactItem {
  section: string;
  issue: string;
  whyApplied: string;
  tags?: string[];
  correction?: string;
}

export interface MemoryImpactSummary {
  appliedCount: number;
  summary: string;
  items: MemoryImpactItem[];
}

export interface BudgetItem {
  item: string;
  amount: string;
  note: string;
  basis?: string;
  dependsOn?: string[];
}

export interface TimelineItem {
  phase: string;
  action: string;
  dependencies?: string[];
  deliverable?: string;
}

export interface ReviewFeedbackItem {
  section: string;
  issue: string;
  impact: string;
}

export interface ReviewMemoryItem {
  domain: string;
  experimentFamily?: ExperimentFamily;
  taskLabel?: string;
  systemContext?: string;
  section: string;
  issue: string;
  impact: string;
  correction?: string;
  importance?: "low" | "medium" | "high";
  tags?: string[];
  createdAt: string;
}

export interface SignalItem {
  label: string;
  value: string;
  hint: string;
}

export interface StudyDesignAlternative {
  name: string;
  type: "in vitro" | "organoid" | "in vivo" | "in silico" | "dataset" | "ex vivo";
  rationale: string;
  estimatedSavings: string;
  rank: number;
  costEstimate: string;
  timeEstimate: string;
  accuracyExpectation: string;
}

export interface BudgetComparison {
  selectedApproachCost: string;
  cheapestAlternativeCost: string;
  premiumVsCheapest: string;
  summary: string;
}

export interface StudyDesignDecision {
  selectedApproach: string;
  rationale: string;
  costImplication: string;
  escalationTrigger: string;
  alternatives: StudyDesignAlternative[];
  budgetComparison?: BudgetComparison;
}

export type RegenerableSection =
  | "protocol"
  | "materials"
  | "budget"
  | "timeline"
  | "validation";

export interface ExperimentPlan {
  title: string;
  experimentId: string;
  domain: string;
  experimentFamily?: ExperimentFamily;
  routeSupported?: boolean;
  routingConfidence?: number;
  routingReason?: string;
  runnabilityStatus?: "draft" | "scientist_review_required" | "runnable";
  runnabilitySummary?: string;
  status: string;
  qualityBar: string;
  generationMode?: "live" | "fallback";
  parsedFields: ParsedField[];
  noveltySignal: NoveltySignal;
  references: Reference[];
  protocol: ProtocolStep[];
  materials: MaterialItem[];
  budget: BudgetItem[];
  timeline: TimelineItem[];
  validation: string[];
  reviewFeedback: ReviewFeedbackItem[];
  signals: SignalItem[];
  designDecision?: StudyDesignDecision;
  sectionCitations: Record<RegenerableSection, CitationItem[]>;
  literatureQc?: LiteratureQcSummary;
  historicalComparison?: HistoricalComparisonSummary;
  qualityChecks?: QualityCheck[];
  memoryImpact?: MemoryImpactSummary;
}

export interface ParsedHypothesisCore {
  domain: string;
  readiness: string;
  parsedFields: ParsedField[];
}

export interface ParseHypothesisResponse {
  hypothesis: string;
  domain: string;
  experimentFamily: ExperimentFamily;
  routingConfidence: number;
  routingReason: string;
  routeSupported: boolean;
  readiness: string;
  generationMode?: "live" | "fallback";
  parsedFields: ParsedField[];
}

export interface GeneratePlanResponse {
  plan: ExperimentPlan;
}

export interface GeneratePlanRequest {
  hypothesis: string;
  parsed?: ParseHypothesisResponse;
  reviewMemory?: ReviewMemoryItem[];
  labSettings?: LabSettings;
}

export interface RegenerateSectionRequest {
  section: RegenerableSection;
  hypothesis: string;
  parsed: ParseHypothesisResponse;
  plan: ExperimentPlan;
  reviewMemory?: ReviewMemoryItem[];
  labSettings?: LabSettings;
}

export interface RegenerateSectionResponse {
  plan: ExperimentPlan;
}

export interface ExportPlanRequest {
  hypothesis: string;
  parsed: ParseHypothesisResponse;
  plan: ExperimentPlan;
  format: "markdown";
}

export interface SavedProject {
  id: string;
  hypothesis: string;
  parsed: ParseHypothesisResponse;
  plan: ExperimentPlan;
  createdAt: string;
  updatedAt: string;
}

export interface LabSettings {
  organizationName: string;
  preferredSuppliers: string[];
  budgetCurrency: string;
  defaultTeamSize: number;
  turnaroundDays: number;
  complianceNotes: string;
}
