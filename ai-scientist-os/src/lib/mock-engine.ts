import {
  type ExperimentPlan,
  type GeneratePlanResponse,
  type ParseHypothesisResponse,
  type ParsedField,
} from "@/lib/types";
import { buildSectionCitations } from "@/lib/citations";

const sampleHypotheses = {
  diagnostics:
    "A paper-based electrochemical biosensor functionalized with anti-CRP antibodies will detect C-reactive protein in whole blood at concentrations below 0.5 mg/L within 10 minutes, matching laboratory ELISA sensitivity without requiring sample preprocessing.",
  gut:
    "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls, measured by FITC-dextran assay, due to upregulation of tight junction proteins claudin-1 and occludin.",
  cell:
    "Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol, due to trehalose's superior membrane stabilization at low temperatures.",
  climate:
    "Introducing Sporomusa ovata into a bioelectrochemical system at a cathode potential of -400mV vs SHE will fix CO2 into acetate at a rate of at least 150 mmol/L/day, outperforming current biocatalytic carbon capture benchmarks by at least 20%.",
} as const;

type DomainKey = keyof typeof sampleHypotheses;

function inferDomain(hypothesis: string): DomainKey {
  const normalized = hypothesis.toLowerCase();

  if (
    normalized.includes("c-reactive protein") ||
    normalized.includes("biosensor") ||
    normalized.includes("elisa") ||
    normalized.includes("whole blood")
  ) {
    return "diagnostics";
  }

  if (
    normalized.includes("hela") ||
    normalized.includes("cryoprotectant") ||
    normalized.includes("trehalose") ||
    normalized.includes("post-thaw")
  ) {
    return "cell";
  }

  if (
    normalized.includes("co2") ||
    normalized.includes("acetate") ||
    normalized.includes("sporomusa") ||
    normalized.includes("cathode potential")
  ) {
    return "climate";
  }

  return "gut";
}

function baseParseFields(domain: DomainKey): ParsedField[] {
  switch (domain) {
    case "diagnostics":
      return [
        { label: "Intervention", value: "Paper-based electrochemical CRP biosensor with anti-CRP capture antibodies" },
        { label: "Model system", value: "Whole blood samples, no preprocessing workflow" },
        { label: "Primary endpoint", value: "Detection limit below 0.5 mg/L within 10 minutes" },
        { label: "Mechanism", value: "Electrochemical signal amplification from antibody-antigen binding event" },
        { label: "Controls", value: "Blank blood matrix, known CRP spike-ins, ELISA benchmark comparison" },
        { label: "Readouts", value: "Current response, calibration curve, time-to-result, ELISA concordance" },
      ];
    case "cell":
      return [
        { label: "Intervention", value: "Trehalose-substituted freezing medium versus standard DMSO + sucrose" },
        { label: "Model system", value: "HeLa cells under matched cryopreservation and thawing workflow" },
        { label: "Primary endpoint", value: "Post-thaw viability improvement of at least 15 percentage points" },
        { label: "Mechanism", value: "Improved membrane stabilization during freezing stress" },
        { label: "Controls", value: "Standard DMSO freezing protocol and matched thaw timing" },
        { label: "Readouts", value: "Viability count, recovery at 24 hours, morphology, membrane integrity" },
      ];
    case "climate":
      return [
        { label: "Intervention", value: "Sporomusa ovata introduced into bioelectrochemical cathode system" },
        { label: "Model system", value: "Bench-scale electrochemical reactor at -400mV vs SHE" },
        { label: "Primary endpoint", value: "Acetate production >= 150 mmol/L/day and 20% above benchmark" },
        { label: "Mechanism", value: "Microbial CO2 fixation enhanced by electron uptake at cathode" },
        { label: "Controls", value: "Abiotic cathode, benchmark biocatalyst condition, open-circuit control" },
        { label: "Readouts", value: "Acetate titer, coulombic efficiency, current density, stability over time" },
      ];
    case "gut":
    default:
      return [
        { label: "Intervention", value: "Lactobacillus rhamnosus GG, oral gavage for 4 weeks" },
        { label: "Model system", value: "C57BL/6 mice, 8 weeks old" },
        { label: "Primary endpoint", value: "FITC-dextran intestinal permeability reduction >= 30%" },
        { label: "Mechanism", value: "Upregulation of claudin-1 and occludin tight junction proteins" },
        { label: "Controls", value: "Vehicle control and baseline permeability readout" },
        { label: "Readouts", value: "FITC assay, qPCR, Western blot, body weight, stool score" },
      ];
  }
}

type BasePlan = Omit<ExperimentPlan, "generationMode" | "sectionCitations">;

function basePlan(domain: DomainKey): BasePlan {
  switch (domain) {
    case "diagnostics":
      return {
        title: "Rapid CRP paper-sensor validation package",
        experimentId: "EXP-DX-1042",
        domain: "Diagnostics",
        status: "Ready for materials ordering",
        qualityBar: "CRO-style assay feasibility",
        parsedFields: baseParseFields(domain),
        noveltySignal: "similar work exists",
        references: [
          {
            type: "similarity",
            title: "Electrochemical paper biosensors for inflammatory marker detection in blood",
            source: "Biosensors & Bioelectronics, 2025",
            doi: "10.1016/j.bios.2025.118839",
            note: "Strong overlap on paper-electrode format and CRP target, but requires preprocessed plasma rather than raw whole blood.",
          },
          {
            type: "protocol",
            title: "Fabrication workflow for wax-patterned electrochemical paper devices",
            source: "Nature Protocol Exchange, 2024",
            doi: "nprot-ex-2024-771",
            note: "Useful scaffold for electrode printing, blocking, and capture antibody immobilization.",
          },
          {
            type: "supplier",
            title: "High-sensitivity CRP antibody pair application note",
            source: "Thermo Fisher",
            doi: "AN-CRP-288",
            note: "Supports reagent selection and calibration range assumptions used in the materials list.",
          },
        ],
        protocol: [
          {
            step: "01",
            title: "Fabricate paper electrode strips",
            detail:
              "Print working, reference, and counter electrodes on wax-patterned cellulose substrate, then cure and verify baseline resistance before functionalization.",
            time: "Days 1-2",
          },
          {
            step: "02",
            title: "Immobilize CRP capture chemistry",
            detail:
              "Apply anti-CRP antibodies and blocking buffer to the sensing zone, then store under desiccation for overnight stabilization.",
            time: "Day 2",
          },
          {
            step: "03",
            title: "Run whole-blood spike-in panel",
            detail:
              "Challenge strips with whole-blood samples across the expected CRP range without preprocessing and record electrochemical response at 2, 5, and 10 minutes.",
            time: "Days 3-4",
          },
          {
            step: "04",
            title: "Benchmark against ELISA",
            detail:
              "Run matched CRP concentrations through a laboratory ELISA kit to estimate concordance, false negative rate, and lower limit of detection.",
            time: "Day 5",
          },
        ],
        materials: [
          { name: "Screen-printable carbon ink", supplier: "Metrohm", catalogNumber: "6.1246.020", quantity: "1 kit", estimatedCost: "$680" },
          { name: "Anti-CRP monoclonal antibody", supplier: "Thermo Fisher", catalogNumber: "MA1-81364", quantity: "1 vial", estimatedCost: "$410" },
          { name: "Cellulose paper substrate", supplier: "Whatman", catalogNumber: "1442-090", quantity: "2 packs", estimatedCost: "$92" },
          { name: "Human CRP standard", supplier: "Sigma-Aldrich", catalogNumber: "C4063", quantity: "1 unit", estimatedCost: "$188" },
          { name: "CRP ELISA kit", supplier: "Abcam", catalogNumber: "ab260058", quantity: "1 kit", estimatedCost: "$620" },
        ],
        budget: [
          { item: "Sensor fabrication", amount: "$1,180", note: "Paper, carbon ink, wax patterning, blocking reagents" },
          { item: "Antibody and standards", amount: "$820", note: "Capture chemistry and calibration standards" },
          { item: "Benchmark assay", amount: "$620", note: "ELISA comparison kit and consumables" },
          { item: "Instrumentation time", amount: "$540", note: "Potentiostat access and lab technician setup" },
          { item: "Contingency", amount: "$240", note: "Re-run buffer for strip defects or failed blocking" },
        ],
        timeline: [
          { phase: "Week 0", action: "Finalize strip geometry, order antibodies, confirm potentiostat access" },
          { phase: "Week 1", action: "Fabricate and functionalize strips, verify baseline electrical behavior" },
          { phase: "Week 2", action: "Run CRP whole-blood spike-in matrix and optimize blocking chemistry" },
          { phase: "Week 3", action: "Benchmark against ELISA and prepare sensitivity summary" },
        ],
        validation: [
          "Detection limit below 0.5 mg/L in whole blood within 10 minutes.",
          "Signal-to-noise ratio must remain stable across at least three fabrication batches.",
          "ELISA concordance target above 0.9 for matched calibration samples.",
        ],
        reviewFeedback: [
          {
            section: "Materials",
            issue: "Include anticoagulant-treated control blood source and transport constraints.",
            impact: "Improves realism for same-day validation runs with fresh matrix samples.",
          },
          {
            section: "Protocol",
            issue: "Specify humidity storage conditions for pre-functionalized strips.",
            impact: "Reduces risk of degraded assay performance before testing.",
          },
          {
            section: "Validation",
            issue: "Add a hemolysis sensitivity check to whole-blood acceptance criteria.",
            impact: "Makes the readout more trustworthy for real sample conditions.",
          },
        ],
        signals: [
          { label: "Novelty signal", value: "Similar work exists", hint: "Whole-blood requirement is still differentiating" },
          { label: "Planning horizon", value: "15 working days", hint: "Rapid prototyping with assay comparison" },
          { label: "Estimated budget", value: "$3,400", hint: "Assay development plus benchmark ELISA" },
        ],
      };
    case "cell":
      return {
        title: "Trehalose cryopreservation viability study",
        experimentId: "EXP-CB-2871",
        domain: "Cell biology",
        status: "Ready for freezer workflow review",
        qualityBar: "Cell-line protocol readiness",
        parsedFields: baseParseFields(domain),
        noveltySignal: "similar work exists",
        references: [
          {
            type: "similarity",
            title: "Trehalose-based cryoprotection improves mammalian cell recovery after thaw",
            source: "Cryobiology, 2024",
            doi: "10.1016/j.cryobiol.2024.104122",
            note: "Relevant for trehalose substitution, but not specific to HeLa cells or direct sucrose comparison.",
          },
          {
            type: "protocol",
            title: "Standardized thaw-recovery viability assay for adherent cell lines",
            source: "protocols.io",
            doi: "dx.doi.org/10.17504/protocols.io.hela-recovery",
            note: "Useful reference for matched freezing, thawing, and 24-hour recovery assessment.",
          },
          {
            type: "supplier",
            title: "Cryoprotectant formulation considerations for DMSO alternatives",
            source: "Sigma technical bulletin",
            doi: "TB-CRYO-44",
            note: "Supports media composition choices and thaw handling assumptions.",
          },
        ],
        protocol: [
          {
            step: "01",
            title: "Prepare matched HeLa cultures",
            detail:
              "Expand HeLa cells to log-phase growth, normalize passage number, and split into matched cryopreservation batches for each medium condition.",
            time: "Days 1-2",
          },
          {
            step: "02",
            title: "Formulate freezing media",
            detail:
              "Prepare control medium with standard DMSO + sucrose and experimental medium with trehalose replacement at matched osmolarity.",
            time: "Day 2",
          },
          {
            step: "03",
            title: "Controlled-rate freezing",
            detail:
              "Freeze equal-density aliquots using a controlled-rate freezing container, then transfer to long-term storage after the initial cooldown.",
            time: "Day 2",
          },
          {
            step: "04",
            title: "Thaw and assess recovery",
            detail:
              "Thaw matched vials rapidly, plate standardized cell counts, and measure immediate viability and 24-hour recovery morphology.",
            time: "Days 7-8",
          },
        ],
        materials: [
          { name: "HeLa cell line", supplier: "ATCC", catalogNumber: "CCL-2", quantity: "1 vial", estimatedCost: "$485" },
          { name: "Trehalose", supplier: "Sigma-Aldrich", catalogNumber: "T9449", quantity: "500 g", estimatedCost: "$116" },
          { name: "Sucrose", supplier: "Sigma-Aldrich", catalogNumber: "S0389", quantity: "500 g", estimatedCost: "$72" },
          { name: "Cell freezing medium base", supplier: "Gibco", catalogNumber: "12648010", quantity: "2 units", estimatedCost: "$244" },
          { name: "Trypan blue viability kit", supplier: "Thermo Fisher", catalogNumber: "T10282", quantity: "1 kit", estimatedCost: "$148" },
        ],
        budget: [
          { item: "Cell culture setup", amount: "$1,220", note: "Cell line, media, flasks, and incubator use" },
          { item: "Cryoprotectant reagents", amount: "$460", note: "Trehalose, sucrose, DMSO, and freezing containers" },
          { item: "Viability readouts", amount: "$540", note: "Cell counter, dyes, and imaging support" },
          { item: "Labor", amount: "$780", note: "Bench time across prep, freeze, and thaw stages" },
          { item: "Contingency", amount: "$220", note: "Repeat vials for failed thaw conditions" },
        ],
        timeline: [
          { phase: "Week 0", action: "Lock osmolarity targets, expand matched cell stock" },
          { phase: "Week 1", action: "Freeze both media conditions with controlled-rate handling" },
          { phase: "Week 2", action: "Thaw, count viability, and capture 24-hour recovery" },
          { phase: "Week 3", action: "Compare conditions, prepare recovery summary and review notes" },
        ],
        validation: [
          "Immediate viability improvement of at least 15 percentage points versus control.",
          "24-hour adherent recovery must not degrade despite higher initial viability.",
          "Cell morphology and membrane integrity need to trend consistently with count data.",
        ],
        reviewFeedback: [
          {
            section: "Protocol",
            issue: "Specify whether trehalose is extracellular only or also introduced via pre-loading.",
            impact: "Clarifies a critical mechanistic assumption that affects reproducibility.",
          },
          {
            section: "Validation",
            issue: "Add recovery at 72 hours to detect delayed growth penalties.",
            impact: "Prevents overestimating success from short-window viability alone.",
          },
          {
            section: "Budget",
            issue: "Include controlled-rate freezing consumables explicitly.",
            impact: "Improves budget realism for labs that do not already stock them.",
          },
        ],
        signals: [
          { label: "Novelty signal", value: "Similar work exists", hint: "HeLa + direct sucrose swap remains useful and testable" },
          { label: "Planning horizon", value: "14 working days", hint: "Short cycle with delayed recovery checks" },
          { label: "Estimated budget", value: "$3,220", hint: "Cell culture and cryo workflow only" },
        ],
      };
    case "climate":
      return {
        title: "Sporomusa ovata carbon-fixation reactor plan",
        experimentId: "EXP-CT-5198",
        domain: "Climate tech",
        status: "Awaiting reactor hardware confirmation",
        qualityBar: "Bench-scale carbon conversion realism",
        parsedFields: baseParseFields(domain),
        noveltySignal: "similar work exists",
        references: [
          {
            type: "similarity",
            title: "Microbial electrosynthesis of acetate by Sporomusa ovata at poised cathodes",
            source: "Environmental Science & Technology, 2025",
            doi: "10.1021/acs.est.5b02117",
            note: "Strong mechanistic overlap, but benchmark rate target here is more aggressive than published median values.",
          },
          {
            type: "protocol",
            title: "Bench-scale bioelectrochemical reactor setup for acetogenic organisms",
            source: "JoVE, 2024",
            doi: "10.3791/64188",
            note: "Operational reference for reactor assembly, gas handling, and startup sequence.",
          },
          {
            type: "supplier",
            title: "Carbon felt cathode handling and pretreatment guidance",
            source: "Metrohm Autolab note",
            doi: "AUTOLAB-CF-19",
            note: "Supports material selection and electrode pretreatment assumptions.",
          },
        ],
        protocol: [
          {
            step: "01",
            title: "Assemble anaerobic reactor hardware",
            detail:
              "Configure bench reactor with carbon felt cathode, reference electrode, gas-tight headspace, and potentiostat capable of stable -400mV vs SHE control.",
            time: "Week 1",
          },
          {
            step: "02",
            title: "Prepare inoculum and medium",
            detail:
              "Revive Sporomusa ovata under anaerobic conditions, prepare bicarbonate-buffered medium, and confirm baseline growth before reactor inoculation.",
            time: "Week 1",
          },
          {
            step: "03",
            title: "Start electrosynthesis run",
            detail:
              "Inoculate reactor, begin cathode poising, flow CO2 continuously, and monitor current density and acetate accumulation daily.",
            time: "Weeks 2-3",
          },
          {
            step: "04",
            title: "Benchmark productivity and stability",
            detail:
              "Compare acetate rate, coulombic efficiency, and current stability against literature benchmark runs and abiotic controls.",
            time: "Week 4",
          },
        ],
        materials: [
          { name: "Sporomusa ovata culture", supplier: "DSMZ", catalogNumber: "DSM 2662", quantity: "1 culture", estimatedCost: "$540" },
          { name: "Carbon felt cathode", supplier: "Fuel Cell Store", catalogNumber: "CFT-25", quantity: "4 sheets", estimatedCost: "$260" },
          { name: "Ag/AgCl reference electrode", supplier: "Metrohm", catalogNumber: "6.0729.100", quantity: "1 unit", estimatedCost: "$398" },
          { name: "Anaerobic medium reagents", supplier: "Sigma-Aldrich", catalogNumber: "mixed set", quantity: "1 lot", estimatedCost: "$520" },
          { name: "Acetate assay kit", supplier: "Megazyme", catalogNumber: "K-ACETRM", quantity: "1 kit", estimatedCost: "$320" },
        ],
        budget: [
          { item: "Reactor hardware", amount: "$2,880", note: "Electrodes, seals, reference electrode, tubing" },
          { item: "Biological setup", amount: "$1,260", note: "Culture acquisition and anaerobic media preparation" },
          { item: "Analytical readouts", amount: "$1,100", note: "Acetate kit, GC support, sampling consumables" },
          { item: "Potentiostat usage", amount: "$940", note: "Instrument access across multi-day runs" },
          { item: "Contingency", amount: "$520", note: "Leaks, failed inoculation, and additional seals" },
        ],
        timeline: [
          { phase: "Week 0", action: "Confirm hardware availability and anaerobic workflow slots" },
          { phase: "Week 1", action: "Assemble reactor, pretreat electrodes, revive culture" },
          { phase: "Weeks 2-3", action: "Run electrosynthesis and capture daily productivity data" },
          { phase: "Week 4", action: "Benchmark output, assess stability, prepare decision memo" },
        ],
        validation: [
          "Acetate productivity must meet or exceed 150 mmol/L/day.",
          "Coulombic efficiency should remain within acceptable variance for at least three days of steady operation.",
          "Abiotic control should confirm that acetate production is biologically mediated.",
        ],
        reviewFeedback: [
          {
            section: "Protocol",
            issue: "Include startup lag expectations before declaring the run underperforming.",
            impact: "Prevents premature failure calls during inoculum adaptation.",
          },
          {
            section: "Materials",
            issue: "Add gas manifold fittings and anaerobic sampling syringes.",
            impact: "Closes a common operational gap in reactor planning.",
          },
          {
            section: "Validation",
            issue: "Track pH drift as a cofactor for acetate productivity interpretation.",
            impact: "Improves diagnosis of low-yield runs.",
          },
        ],
        signals: [
          { label: "Novelty signal", value: "Similar work exists", hint: "Rate target is ambitious but grounded" },
          { label: "Planning horizon", value: "20 working days", hint: "Hardware and inoculum setup dominate" },
          { label: "Estimated budget", value: "$6,700", hint: "Includes hardware-heavy setup" },
        ],
      };
    case "gut":
    default:
      return {
        title: "Gut barrier reinforcement in murine probiotic dosing study",
        experimentId: "EXP-GH-3814",
        domain: "Gut health",
        status: "Ready for materials ordering",
        qualityBar: "Lab-trustworthy in vivo package",
        parsedFields: baseParseFields(domain),
        noveltySignal: "similar work exists",
        references: [
          {
            type: "similarity",
            title: "Lactobacillus rhamnosus GG reduces epithelial barrier dysfunction in murine colitis models",
            source: "Gut Microbes, 2024",
            doi: "10.1080/19490976.2024.11842",
            note: "Matches intervention and barrier-focused endpoint, but uses DSS injury instead of healthy mice.",
          },
          {
            type: "protocol",
            title: "FITC-dextran permeability assay in murine gut barrier studies",
            source: "Bio-protocol, 2023",
            doi: "bio-protocol-4493",
            note: "Provides the closest operational protocol for dosing, fasting, and sample timing.",
          },
          {
            type: "supplier",
            title: "Mouse tight junction protein quantification workflow for claudin-1 and occludin",
            source: "Thermo Fisher application note",
            doi: "AN-INT-443",
            note: "Useful for validating antibody panel, extraction workflow, and storage assumptions.",
          },
        ],
        protocol: [
          {
            step: "01",
            title: "Cohort setup and acclimation",
            detail:
              "Randomize 24 female C57BL/6 mice into control and probiotic arms, then acclimate for 7 days under identical housing and chow conditions.",
            time: "Days -7 to 0",
          },
          {
            step: "02",
            title: "Daily probiotic administration",
            detail:
              "Administer 1e9 CFU Lactobacillus rhamnosus GG in sterile PBS by oral gavage once daily for 28 consecutive days. Vehicle arm receives matched PBS volume.",
            time: "Days 1 to 28",
          },
          {
            step: "03",
            title: "Barrier challenge and serum collection",
            detail:
              "Fast animals for 4 hours, dose FITC-dextran orally at 600 mg/kg, and collect serum 4 hours post dose for fluorescence quantification.",
            time: "Day 29",
          },
          {
            step: "04",
            title: "Mechanistic validation",
            detail:
              "Harvest ileum and proximal colon, isolate RNA and protein, and quantify claudin-1 and occludin via qPCR and Western blot against GAPDH.",
            time: "Days 29 to 31",
          },
        ],
        materials: [
          { name: "Lactobacillus rhamnosus GG", supplier: "ATCC", catalogNumber: "53103", quantity: "2 vials", estimatedCost: "$420" },
          { name: "FITC-dextran, 4 kDa", supplier: "Sigma-Aldrich", catalogNumber: "FD4-1G", quantity: "1 kit", estimatedCost: "$168" },
          { name: "Claudin-1 antibody", supplier: "Thermo Fisher", catalogNumber: "37-4900", quantity: "1 unit", estimatedCost: "$312" },
          { name: "Occludin antibody", supplier: "Invitrogen", catalogNumber: "71-1500", quantity: "1 unit", estimatedCost: "$298" },
          { name: "RNA extraction kit", supplier: "Qiagen", catalogNumber: "74104", quantity: "2 kits", estimatedCost: "$460" },
          { name: "Western blot reagents", supplier: "Bio-Rad", catalogNumber: "1705061", quantity: "1 set", estimatedCost: "$540" },
        ],
        budget: [
          { item: "Animals + housing", amount: "$3,100", note: "Vendor order + 5 week husbandry" },
          { item: "Reagents + antibodies", amount: "$2,198", note: "Includes 10% contingency on disposables" },
          { item: "Assay readouts", amount: "$1,640", note: "Plate reader, qPCR consumables, imaging" },
          { item: "Labor", amount: "$1,120", note: "0.25 FTE research associate" },
          { item: "Buffer", amount: "$362", note: "Cold chain and rush shipping reserve" },
        ],
        timeline: [
          { phase: "Week 0", action: "Protocol lock, supplier ordering, IACUC check" },
          { phase: "Week 1", action: "Cohort arrival, acclimation, baseline metadata capture" },
          { phase: "Weeks 2-5", action: "Daily probiotic dosing and welfare monitoring" },
          { phase: "Week 5", action: "FITC permeability assay and sample harvest" },
          { phase: "Week 6", action: "qPCR, Western blot, interpretation, review pack" },
        ],
        validation: [
          "Primary success metric: serum FITC signal reduced by at least 30% versus control at day 29.",
          "Mechanistic confirmation: claudin-1 and occludin expression trends move in the same direction by qPCR and Western blot.",
          "Safety guardrails: no adverse body-weight trend beyond 10% and no worsening stool score.",
        ],
        reviewFeedback: [
          {
            section: "Protocol",
            issue: "Dose concentration should be expressed per CFU per mouse, not per mL suspension.",
            impact: "Prevents ambiguity during handoff to animal facility staff.",
          },
          {
            section: "Budget",
            issue: "Add frozen backup stock and shipping risk for live probiotic culture.",
            impact: "Improves operational realism and avoids underpricing.",
          },
          {
            section: "Validation",
            issue: "Include stool score and body-weight trend as secondary tolerance checks.",
            impact: "Strengthens interpretation if permeability improves but health markers worsen.",
          },
        ],
        signals: [
          { label: "Novelty signal", value: "Similar work exists", hint: "3 close studies, 1 protocol scaffold" },
          { label: "Planning horizon", value: "19 working days", hint: "Lead times already included" },
          { label: "Estimated budget", value: "$8,420", hint: "Consumables + assay kits + sequencing" },
        ],
      };
  }
}

export function parseHypothesis(hypothesis: string): ParseHypothesisResponse {
  const trimmed = hypothesis.trim() || sampleHypotheses.gut;
  const domain = inferDomain(trimmed);

  return {
    hypothesis: trimmed,
    generationMode: "fallback",
    domain:
      domain === "gut"
        ? "Gut health"
        : domain === "cell"
          ? "Cell biology"
          : domain === "diagnostics"
            ? "Diagnostics"
            : "Climate tech",
    readiness:
      "Specific intervention, measurable outcome, mechanistic rationale, and control condition detected.",
    parsedFields: baseParseFields(domain),
  };
}

export function generateExperimentPlan(hypothesis: string): GeneratePlanResponse {
  const trimmed = hypothesis.trim() || sampleHypotheses.gut;
  const domain = inferDomain(trimmed);
  const plan = basePlan(domain);

  return {
    plan: {
      ...plan,
      generationMode: "fallback",
      parsedFields: parseHypothesis(trimmed).parsedFields,
      sectionCitations: buildSectionCitations(plan.references),
    },
  };
}

export const hypothesisTemplates = [
  { id: "diagnostics", label: "Diagnostics", value: sampleHypotheses.diagnostics },
  { id: "gut", label: "Gut health", value: sampleHypotheses.gut },
  { id: "cell", label: "Cell biology", value: sampleHypotheses.cell },
  { id: "climate", label: "Climate tech", value: sampleHypotheses.climate },
];
