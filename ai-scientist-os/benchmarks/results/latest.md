# Benchmark Results

Base URL: `http://127.0.0.1:3000`
Generated: 2026-04-26T07:11:23.790Z

Average overall score: **0.67 / 1.00**

| Study | Novelty | References | Protocol | Materials | Validation | Ops | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| diag-crp-origami-2022 | 1.00 | 0.20 | 0.20 | 0.40 | 0.40 | 1.00 | **0.53** |
| diag-crp-electrochemical-2013 | 1.00 | 0.40 | 0.60 | 0.20 | 0.20 | 1.00 | **0.57** |
| gut-lgg-permeability-2019 | 1.00 | 0.60 | 1.00 | 0.80 | 0.40 | 1.00 | **0.80** |
| cell-trehalose-cryopreservation-2016 | 1.00 | 0.60 | 0.80 | 0.40 | 0.40 | 1.00 | **0.70** |
| climate-sporomusa-2017 | 1.00 | 0.80 | 0.80 | 0.40 | 0.40 | 1.00 | **0.73** |

## Case Notes

### diag-crp-origami-2022

- Source: [Multifunctional self-driven origami paper-based integrated microfluidic chip to detect CRP and PAB in whole blood](https://pubmed.ncbi.nlm.nih.gov/35358776/)
- Generated novelty: `similar work exists`
- Generation mode: `fallback`
- Missing reference keywords: c-reactive protein, paper-based, origami, microfluidic
- Missing protocol keywords: whole blood, microfluidic, antibody, calibration
- Missing material keywords: electrode, whole blood, pbs
- Missing validation keywords: limit of detection, clinical, sensitivity
- Improvement opportunities:
  - Reference grounding is weak. Retrieval is drifting away from the target paper domain and likely needs stronger query shaping or domain-specific keyword expansion.
  - Protocol detail is missing expected operational concepts. The generation prompt should emphasize study-specific methodology and control setup more strongly.
  - Materials grounding is weak. The planner needs stronger reagent and apparatus selection cues, and possibly supplier-side retrieval before synthesis.
  - Validation does not align well with the target study readouts. Add sharper instructions for endpoint measurement, assay method, and success criteria.

### diag-crp-electrochemical-2013

- Source: [An optimised electrochemical biosensor for the label-free detection of C-reactive protein in blood](https://pubmed.ncbi.nlm.nih.gov/22809521/)
- Generated novelty: `similar work exists`
- Generation mode: `fallback`
- Missing reference keywords: c-reactive protein, label-free, gold electrode
- Missing protocol keywords: immobilization, impedance
- Missing material keywords: gold electrode, buffer, serum, impedance
- Missing validation keywords: specificity, limit of detection, linear range, impedance
- Improvement opportunities:
  - Reference grounding is weak. Retrieval is drifting away from the target paper domain and likely needs stronger query shaping or domain-specific keyword expansion.
  - Materials grounding is weak. The planner needs stronger reagent and apparatus selection cues, and possibly supplier-side retrieval before synthesis.
  - Validation does not align well with the target study readouts. Add sharper instructions for endpoint measurement, assay method, and success criteria.

### gut-lgg-permeability-2019

- Source: [Lactobacillus rhamnosus GG treatment improves intestinal permeability and modulates microbiota dysbiosis in an experimental model of sepsis](https://pubmed.ncbi.nlm.nih.gov/30628657/)
- Generated novelty: `similar work exists`
- Generation mode: `fallback`
- Missing reference keywords: c57bl/6, intestinal permeability
- Missing protocol keywords: none
- Missing material keywords: c57bl/6
- Missing validation keywords: fitc-dextran, histology, cytokine
- Improvement opportunities:
  - Validation does not align well with the target study readouts. Add sharper instructions for endpoint measurement, assay method, and success criteria.

### cell-trehalose-cryopreservation-2016

- Source: [Freezing-induced uptake of trehalose into mammalian cells facilitates cryopreservation](https://pubmed.ncbi.nlm.nih.gov/27003129/)
- Generated novelty: `similar work exists`
- Generation mode: `fallback`
- Missing reference keywords: cryopreservation, mammalian cells
- Missing protocol keywords: cryovial
- Missing material keywords: dmso, fbs, cryovial
- Missing validation keywords: post-thaw viability, trypan blue, proliferation
- Improvement opportunities:
  - Materials grounding is weak. The planner needs stronger reagent and apparatus selection cues, and possibly supplier-side retrieval before synthesis.
  - Validation does not align well with the target study readouts. Add sharper instructions for endpoint measurement, assay method, and success criteria.

### climate-sporomusa-2017

- Source: [Performance of different Sporomusa species for the microbial electrosynthesis of acetate from carbon dioxide](https://pubmed.ncbi.nlm.nih.gov/28279911/)
- Generated novelty: `similar work exists`
- Generation mode: `fallback`
- Missing reference keywords: carbon dioxide
- Missing protocol keywords: bioelectrochemical
- Missing material keywords: reactor, co2, electrolyte
- Missing validation keywords: production rate, gas chromatography, current
- Improvement opportunities:
  - Materials grounding is weak. The planner needs stronger reagent and apparatus selection cues, and possibly supplier-side retrieval before synthesis.
  - Validation does not align well with the target study readouts. Add sharper instructions for endpoint measurement, assay method, and success criteria.
