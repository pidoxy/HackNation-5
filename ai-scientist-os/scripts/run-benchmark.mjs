import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const repoRoot = path.resolve(process.cwd());
const benchmarksDir = path.join(repoRoot, "benchmarks");
const resultsDir = path.join(benchmarksDir, "results");
const studiesPath = path.join(benchmarksDir, "studies.json");
const baseUrl = process.env.BENCHMARK_BASE_URL ?? "http://127.0.0.1:3000";
const execFileAsync = promisify(execFile);

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function includesKeyword(haystack, keyword) {
  return normalize(haystack).includes(normalize(keyword));
}

function keywordCoverage(text, keywords) {
  const matches = keywords.filter((keyword) => includesKeyword(text, keyword));
  return {
    score: keywords.length === 0 ? 1 : matches.length / keywords.length,
    matches,
    missing: keywords.filter((keyword) => !matches.includes(keyword)),
  };
}

function flattenPlan(plan) {
  return {
    references: plan.references
      .map((reference) => `${reference.title} ${reference.source} ${reference.doi} ${reference.note}`)
      .join("\n"),
    protocol: plan.protocol
      .map((step) => `${step.step} ${step.title} ${step.detail} ${step.time}`)
      .join("\n"),
    materials: plan.materials
      .map(
        (item) =>
          `${item.name} ${item.supplier} ${item.catalogNumber} ${item.quantity} ${item.estimatedCost}`,
      )
      .join("\n"),
    validation: plan.validation.join("\n"),
  };
}

function scoreOperationalCompleteness(plan) {
  const checks = [
    plan.protocol.length >= 4,
    plan.materials.length >= 5,
    plan.budget.length >= 3,
    plan.timeline.length >= 3,
    plan.validation.length >= 3,
    plan.materials.every((item) => item.supplier && item.catalogNumber),
  ];

  const passed = checks.filter(Boolean).length;
  return {
    score: passed / checks.length,
    passed,
    total: checks.length,
  };
}

function scoreCase(study, payload) {
  const plan = payload.plan;
  const flattened = flattenPlan(plan);
  const noveltyPass = study.expectedNoveltySignals.includes(plan.noveltySignal);
  const referenceCoverage = keywordCoverage(
    flattened.references,
    study.expectedReferenceKeywords,
  );
  const protocolCoverage = keywordCoverage(
    flattened.protocol,
    study.expectedProtocolKeywords,
  );
  const materialsCoverage = keywordCoverage(
    flattened.materials,
    study.expectedMaterialsKeywords,
  );
  const validationCoverage = keywordCoverage(
    flattened.validation,
    study.expectedValidationKeywords,
  );
  const operationalCompleteness = scoreOperationalCompleteness(plan);

  const scores = {
    noveltySignal: noveltyPass ? 1 : 0,
    referenceGrounding: referenceCoverage.score,
    protocolCoverage: protocolCoverage.score,
    materialsCoverage: materialsCoverage.score,
    validationCoverage: validationCoverage.score,
    operationalCompleteness: operationalCompleteness.score,
  };

  const overall =
    Object.values(scores).reduce((total, value) => total + value, 0) /
    Object.values(scores).length;

  return {
    studyId: study.id,
    studyTitle: study.title,
    hypothesis: study.hypothesis,
    sourceUrl: study.url,
    doi: study.doi,
    generated: {
      title: plan.title,
      experimentId: plan.experimentId,
      domain: plan.domain,
      generationMode: plan.generationMode,
      noveltySignal: plan.noveltySignal,
      referencesCount: plan.references.length,
      protocolSteps: plan.protocol.length,
      materialsCount: plan.materials.length,
      budgetItems: plan.budget.length,
      timelineItems: plan.timeline.length,
      validationItems: plan.validation.length,
    },
    scores,
    overall,
    diagnostics: {
      referenceCoverage,
      protocolCoverage,
      materialsCoverage,
      validationCoverage,
      operationalCompleteness,
    },
    rawPlan: plan,
  };
}

function summarizeFailures(result) {
  const notes = [];

  if (result.scores.noveltySignal === 0) {
    notes.push(
      "Novelty signal missed an already-published study. Tighten prompt instructions so existing work is not labeled `not found` when related references are present.",
    );
  }

  if (result.scores.referenceGrounding < 0.6) {
    notes.push(
      "Reference grounding is weak. Retrieval is drifting away from the target paper domain and likely needs stronger query shaping or domain-specific keyword expansion.",
    );
  }

  if (result.scores.protocolCoverage < 0.6) {
    notes.push(
      "Protocol detail is missing expected operational concepts. The generation prompt should emphasize study-specific methodology and control setup more strongly.",
    );
  }

  if (result.scores.materialsCoverage < 0.6) {
    notes.push(
      "Materials grounding is weak. The planner needs stronger reagent and apparatus selection cues, and possibly supplier-side retrieval before synthesis.",
    );
  }

  if (result.scores.validationCoverage < 0.6) {
    notes.push(
      "Validation does not align well with the target study readouts. Add sharper instructions for endpoint measurement, assay method, and success criteria.",
    );
  }

  if (result.scores.operationalCompleteness < 0.85) {
    notes.push(
      "Operational completeness is thin. The plan should consistently include enough protocol steps, catalog-backed materials, budget lines, and timeline phases to feel like a handoff.",
    );
  }

  return notes;
}

function renderMarkdown(results) {
  const average =
    results.reduce((total, result) => total + result.overall, 0) / results.length;

  const lines = [
    "# Benchmark Results",
    "",
    `Base URL: \`${baseUrl}\``,
    `Generated: ${new Date().toISOString()}`,
    "",
    `Average overall score: **${average.toFixed(2)} / 1.00**`,
    "",
    "| Study | Novelty | References | Protocol | Materials | Validation | Ops | Overall |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const result of results) {
    lines.push(
      `| ${result.studyId} | ${result.scores.noveltySignal.toFixed(2)} | ${result.scores.referenceGrounding.toFixed(2)} | ${result.scores.protocolCoverage.toFixed(2)} | ${result.scores.materialsCoverage.toFixed(2)} | ${result.scores.validationCoverage.toFixed(2)} | ${result.scores.operationalCompleteness.toFixed(2)} | **${result.overall.toFixed(2)}** |`,
    );
  }

  lines.push("", "## Case Notes", "");

  for (const result of results) {
    lines.push(`### ${result.studyId}`);
    lines.push("");
    lines.push(`- Source: [${result.studyTitle}](${result.sourceUrl})`);
    lines.push(`- Generated novelty: \`${result.generated.noveltySignal}\``);
    lines.push(`- Generation mode: \`${result.generated.generationMode}\``);
    lines.push(`- Missing reference keywords: ${result.diagnostics.referenceCoverage.missing.join(", ") || "none"}`);
    lines.push(`- Missing protocol keywords: ${result.diagnostics.protocolCoverage.missing.join(", ") || "none"}`);
    lines.push(`- Missing material keywords: ${result.diagnostics.materialsCoverage.missing.join(", ") || "none"}`);
    lines.push(`- Missing validation keywords: ${result.diagnostics.validationCoverage.missing.join(", ") || "none"}`);
    const failures = summarizeFailures(result);
    if (failures.length > 0) {
      lines.push("- Improvement opportunities:");
      for (const failure of failures) {
        lines.push(`  - ${failure}`);
      }
    } else {
      lines.push("- Improvement opportunities: none flagged by the heuristic scorer.");
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function postPlan(hypothesis) {
  const { stdout, stderr } = await execFileAsync("curl", [
    "--max-time",
    "180",
    "-sS",
    "-X",
    "POST",
    `${baseUrl}/api/generate-plan`,
    "-H",
    "Content-Type: application/json",
    "--data",
    JSON.stringify({ hypothesis }),
  ]);

  if (stderr?.trim()) {
    throw new Error(`curl benchmark request failed: ${stderr.trim()}`);
  }

  return JSON.parse(stdout);
}

async function main() {
  const studies = JSON.parse(await fs.readFile(studiesPath, "utf8"));
  await fs.mkdir(resultsDir, { recursive: true });

  const results = [];

  for (const study of studies) {
    process.stdout.write(`Running ${study.id}...\n`);
    const payload = await postPlan(study.hypothesis);
    results.push(scoreCase(study, payload));
  }

  const markdown = renderMarkdown(results);
  const jsonPath = path.join(resultsDir, "latest.json");
  const markdownPath = path.join(resultsDir, "latest.md");

  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        baseUrl,
        generatedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
  await fs.writeFile(markdownPath, markdown);

  process.stdout.write(`Wrote ${jsonPath}\n`);
  process.stdout.write(`Wrote ${markdownPath}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
