# Benchmark Suite

This benchmark validates the current AI Scientist planner against five published studies that already exist in the literature.

## Goal

We want to answer one product question:

`Can a scientist give the system a real hypothesis and receive an output that is literature-aware, operational, and good enough to be a serious starting draft?`

## Benchmark Cases

The benchmark set is stored in [benchmarks/studies.json](/Users/mac/Desktop/career/code/HackNation-5/ai-scientist-os/benchmarks/studies.json).

Each case includes:

- a published study title
- a source URL and DOI
- a benchmark hypothesis prompt
- acceptable novelty outcomes
- expected keywords for references, protocol, materials, and validation

## Scoring Rubric

Each generated plan is scored on six dimensions:

- `noveltySignal`: did the app avoid incorrectly saying `not found` for an existing study?
- `referenceGrounding`: do retrieved references overlap with the target study domain?
- `protocolCoverage`: does the protocol mention expected operational concepts?
- `materialsCoverage`: do the materials reflect expected reagents or apparatus?
- `validationCoverage`: does validation mention the right readouts?
- `operationalCompleteness`: does the plan include enough protocol, materials, budget, timeline, and validation detail to feel like a handoff draft?

The harness writes:

- raw API responses
- per-study scores
- a markdown summary

## Running

Start the app locally, then run:

```bash
node scripts/run-benchmark.mjs
```

If your local app is on a different host or port, set:

```bash
BENCHMARK_BASE_URL=http://127.0.0.1:3000 node scripts/run-benchmark.mjs
```

## Output

Results are written to:

- `benchmarks/results/latest.json`
- `benchmarks/results/latest.md`

## How to Use the Results

Use failures to tighten:

- retrieval domain filters
- novelty-signal prompting
- section-level planning prompts
- validation heuristics
- supplier and materials grounding
