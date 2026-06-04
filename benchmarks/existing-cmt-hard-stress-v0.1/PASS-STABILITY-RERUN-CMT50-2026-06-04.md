# CMT50 Pass-Stability Rerun Audit

- Date: 2026-06-04
- Source report: `ERROR-ATTRIBUTION-CMT50-CONSOLIDATED-2026-06-04.json`
- Rerun path: `runs/20260604-135159__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__pass_review_rerun_7`
- Completed: `True`
- Rerun score: `4/7`

## Conclusion

Among the 7 medium-risk original passes, 3 stayed cleanly stable under the anti-memory pass-review prompt; 4 need caution or follow-up. The verifier rerun score was 4/7.

## Decision Counts

| Decision | Count |
| --- | ---: |
| stable_capability_supported | 3 |
| answer_key_or_gold_leakage_suspect | 2 |
| unstable_and_benchmark_context_suspect | 2 |

## Item Review

| Problem | Type | Original risk | Rerun passed | Rerun actual | Decision | Rationale |
| ---: | --- | --- | --- | --- | --- | --- |
| #5 | HF | medium | True | `c` | stable_capability_supported | The item passed again under anti-memory prompt with item-specific reasoning evidence. |
| #6 | ED | medium | True | `['a', 'b', 'd']` | stable_capability_supported | The item passed again under anti-memory prompt with item-specific reasoning evidence. |
| #11 | QMC | medium | False | `['c']` | unstable_and_benchmark_context_suspect | The rerun answer failed and reasoning references benchmark/source context, so the original pass is unstable and not clean capability evidence. |
| #15 | ED | medium | False | `['b', 'c']` | unstable_and_benchmark_context_suspect | The rerun answer failed and reasoning references benchmark/source context, so the original pass is unstable and not clean capability evidence. |
| #21 | ED | medium | True | `['a', 'c']` | stable_capability_supported | The item passed again under anti-memory prompt with item-specific reasoning evidence. |
| #25 | QMC | medium | True | `['c', 'd', 'e']` | answer_key_or_gold_leakage_suspect | Rerun reasoning mentions answer-key or gold-like phrases, so the pass is not clean capability evidence. |
| #36 | Other | medium | False | `['a', 'b', 'c', 'd']` | answer_key_or_gold_leakage_suspect | Rerun reasoning mentions answer-key or gold-like phrases, so the pass is not clean capability evidence. |

## Handling Rule

- `stable_capability_supported`: can be counted as stronger Kimi capability evidence for this benchmark slice.
- `stable_but_benchmark_context_suspect`: keep as a verifier pass, but do not count as clean capability evidence.
- `stable_but_weak_reasoning_evidence`: keep as pass, but do not use as strong capability claim without another perturbation.
- `unstable_answer_changed_or_failed` or `unstable_no_json`: treat the original pass as unstable/lucky-hit risk.
- `answer_key_or_gold_leakage_suspect` and `unstable_and_benchmark_context_suspect`: do not count as clean capability evidence.
