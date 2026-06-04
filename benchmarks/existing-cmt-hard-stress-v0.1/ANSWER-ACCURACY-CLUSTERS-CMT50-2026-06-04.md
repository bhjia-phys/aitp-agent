# CMT50 Answer-Accuracy Cluster Audit

- Date: 2026-06-04
- Source report: `ERROR-ATTRIBUTION-CMT50-CONSOLIDATED-2026-06-04.json`
- Latest effective score context: 12/50
- Failures audited: 38 total; 35 answer-accuracy failures

## Conclusion

The dominant failure is not JSON emission. The latest consolidated run emitted JSON on 49/50 items; the main remaining problem is physics/math answer quality.
Among the 35 answer-accuracy failures, 18 are choice-set mistakes, 12 are symbolic/formula mistakes, and 5 are numeric-vector mistakes.

## Failure Category Counts

| Category | Count | Meaning |
| --- | ---: | --- |
| answer_accuracy | 35 | Model produced parseable JSON, but verifier answer was wrong. |
| data_source | 2 | Problem/gold/source boundary is suspect; do not use as clean model-failure evidence. |
| model_behavior | 1 | Model did not converge to final JSON in the run evidence. |

## Answer-Accuracy By CMT Type

| CMT type | Count | Problems | Dominant surface |
| --- | ---: | --- | --- |
| Other | 13 | #18, #24, #30, #31, #32, #33, #34, #35, #38, #39, #40, #41, #42 | choice_set:7, symbolic:4, numeric_vector:2 |
| SM | 5 | #43, #44, #45, #47, #50 | symbolic:4, numeric_vector:1 |
| DMRG | 4 | #8, #12, #13, #29 | choice_set:3, symbolic:1 |
| QMC | 4 | #9, #10, #19, #28 | choice_set:4 |
| ED | 3 | #16, #17, #20 | choice_set:2, numeric_vector:1 |
| HF | 3 | #2, #3, #4 | symbolic:2, numeric_vector:1 |
| VMC | 2 | #7, #14 | choice_set:2 |
| PEPS | 1 | #22 | symbolic:1 |

## Answer-Accuracy By Failure Mode

| Failure mode | Count | Problems | Recommended next probe |
| --- | ---: | --- | --- |
| symbolic formula or normalization mismatch | 8 | #2, #4, #18, #22, #40, #42, #43, #47 | Check intermediate quantities, limits, dimensions, prefactors, and signs. |
| choice-set mixed substitution | 5 | #10, #16, #19, #30, #39 | Separate support evidence from exclusion evidence for every option. |
| choice-set under-selection | 5 | #7, #9, #28, #31, #41 | Force option-by-option necessity checks before emitting the answer set. |
| choice-set no overlap | 4 | #8, #13, #14, #29 | Treat as concept or prompt-semantics failure, not as formatting trouble. |
| choice-set over-selection | 4 | #20, #32, #34, #35 | Add an exclusion pass; every selected label needs positive evidence. |
| numeric vector partial component errors | 3 | #3, #24, #38 | Recompute each component and use geometry/symmetry sanity checks. |
| symbolic expression missing physical terms | 3 | #12, #33, #45 | Use dimensional and limiting-case checks to catch collapsed expressions. |
| numeric vector all components wrong | 2 | #17, #50 | Recheck interpretation, units, substitutions, and formula selection. |
| option-like symbolic mismatch | 1 | #44 | Handle as a choice-style item, not as strong symbolic-reasoning evidence. |

## Representative Evidence

| Problem | Type | Check | Mode | Actual | Expected | Note |
| ---: | --- | --- | --- | --- | --- | --- |
| #7 | VMC | choice_set | choice-set under-selection | `['a']` | `['a', 'b', 'd']` | Force option-by-option necessity checks before emitting the answer set. |
| #20 | ED | choice_set | choice-set over-selection | `['a', 'c', 'e', 'g']` | `['a']` | Add an exclusion pass; every selected label needs positive evidence. |
| #10 | QMC | choice_set | choice-set mixed substitution | `['b', 'c']` | `['b', 'e']` | Separate support evidence from exclusion evidence for every option. |
| #8 | DMRG | choice_set | choice-set no overlap | `['a']` | `['d']` | Treat as concept or prompt-semantics failure, not as formatting trouble. |
| #2 | HF | symbolic | symbolic formula or normalization mismatch | `c_↑dagger(k)c_↑(k);c_↓dagger(k)c_↓(k);c_↑dagger(k)c_↓(k);c_↓dagger(k)c_↑(k)` | `\langle c_\uparrow^\dagger(k) c_\uparrow(k) \rangle; \langle c_\downarrow^\dagger(k) c_\do` | Check intermediate quantities, limits, dimensions, prefactors, and signs. |
| #12 | DMRG | symbolic | symbolic expression missing physical terms | `2^cn` | `2^{N/2-1}; c=1/2` | Use dimensional and limiting-case checks to catch collapsed expressions. |
| #3 | HF | numeric_vector | numeric vector partial component errors | `[2.09, 0.56, 0.56, 2.09, -1.53, 1.53, -2.09, -0.56, -0.56, -2.09, 1.53, -1.53]` | `[2.09, 1.21, 0.0, 2.41, -2.09, 1.21, -2.09, -1.21, 0.0, -2.41, 2.09, -1.21]` | Recompute each component and use geometry/symmetry sanity checks. |
| #17 | ED | numeric_vector | numeric vector all components wrong | `[5.0]` | `[7.0]` | Recheck interpretation, units, substitutions, and formula selection. |

## Non-Answer-Accuracy Items

| Problem | Category | Type | Evidence-based handling |
| ---: | --- | --- | --- |
| #1 | data_source | HF | Quarantine or repair before counting as model capability evidence. |
| #26 | model_behavior | ED | Treat as convergence/termination failure; inspect prompt and long stderr separately. |
| #37 | data_source | PEPS | Quarantine or repair before counting as model capability evidence. |

## Iteration Implications

1. For choice-set failures, the next agent loop should force option-by-option evidence and exclusion checks before final JSON.
2. For symbolic and numeric failures, the loop should require dimensional, limiting-case, and component-wise sanity checks before finalization.
3. Data-source suspects (#1 and #37) should be quarantined from capability scoring until the prompt/gold boundary is repaired.
4. Model-behavior failure (#26) should be handled by convergence controls, not by answer-accuracy feedback.
