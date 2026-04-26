export type NoveltySignal = "not found" | "similar work exists" | "exact match found";

export type ReferenceType = "similarity" | "protocol" | "supplier" | "conflict";

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
}

export interface MaterialItem {
  name: string;
  supplier: string;
  catalogNumber: string;
  quantity: string;
  estimatedCost: string;
  verificationStatus?: "verified" | "estimated";
  verificationSource?: string;
  verificationNote?: string;
}

export interface BudgetItem {
  item: string;
  amount: string;
  note: string;
}

export interface TimelineItem {
  phase: string;
  action: string;
}

export interface ReviewFeedbackItem {
  section: string;
  issue: string;
  impact: string;
}

export interface ReviewMemoryItem {
  domain: string;
  section: string;
  issue: string;
  impact: string;
  createdAt: string;
}

export interface SignalItem {
  label: string;
  value: string;
  hint: string;
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
  sectionCitations: Record<RegenerableSection, CitationItem[]>;
  literatureQc?: LiteratureQcSummary;
}

export interface ParseHypothesisResponse {
  hypothesis: string;
  domain: string;
  readiness: string;
  generationMode?: "live" | "fallback";
  parsedFields: ParsedField[];
}

export interface GeneratePlanResponse {
  plan: ExperimentPlan;
}

export interface GeneratePlanRequest {
  hypothesis: string;
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
