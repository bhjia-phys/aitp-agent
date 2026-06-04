# CMT50 Environment-Failure Rerun Attribution 2026-06-04

## Conclusion

The nine items previously attributed to environment/auth/quota failure were rerun after Kimi CLI availability recovered. The rerun had no auth/quota failures: `8/9` items emitted captured JSON, `3/9` passed, `5/9` became ordinary answer-accuracy failures, and item 26 became a model-behavior failure because it kept reasoning for about `2401 s` without emitting stdout JSON and was manually stopped so the remaining items could run.

- Selected items: `9`
- Passed: `3/9`
- JSON emission rate: `0.889`
- Answer accuracy rate among emitted answers: `0.375`
- Dominant failure modes: `answer_accuracy;model_behavior`

## Run Set

| Run label | Items | Passed | Runtime s | Path |
| --- | ---: | ---: | ---: | --- |
| `env-rerun-9` | `9` | `3/9` | `9695.064` | `runs/20260604-095602__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__env_rerun_9` |

## Failure Breakdown

| Primary category | Count |
| --- | ---: |
| `answer_accuracy` | 5 |
| `model_behavior` | 1 |

## Item-Level Attribution

| Problem | Field | CMT type | Actual | Expected | JSON | Primary | Source flags | Next action |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | `cmt_index_23_answer` | `Other` | `[0.2, 0.0769, 0.0629, 0.0527, 0.0422]` | `[0.2, 0.003, 0.017, 0.027, 0.038]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 26 | `cmt_index_25_answer` | `ED` | `[]` | `["b", "c", "e"]` | `False` | `model_behavior` | `` | Improve answer-finalization/output forcing for this item class before treating it as a physics error. |
| 38 | `cmt_index_37_answer` | `Other` | `[2.0, 3.0]` | `[1.0, 3.0]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 39 | `cmt_index_38_answer` | `Other` | `["a", "d", "g"]` | `["a", "d", "i"]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 40 | `cmt_index_39_answer` | `Other` | `(2(t_2^2-t_1^2))/(t_2)((t_1)/(t_2))^n` | `2t_1(t_1/t_2)^n` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |
| 50 | `cmt_index_49_answer` | `SM` | `[0.5, 0.36]` | `[0.33, 0.27]` | `True` | `answer_accuracy` | `` | Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts. |

## Passed Items

| Problem | Field | Actual | Expected |
| ---: | --- | --- | --- |
| 25 | `cmt_index_24_answer` | `["c", "d", "e"]` | `["c", "d", "e"]` |
| 48 | `cmt_index_47_answer` | `[2.0, 2.0, 1.0]` | `[2.0, 2.0, 1.0]` |
| 49 | `cmt_index_48_answer` | `[6.0]` | `[6.0]` |

## Probes

| Probe | Changed variable | Result | Interpretation |
| --- | --- | --- | --- |
| `remaining_no_timeout_batches` | removed fixed answer timeout and used 20-minute idle-output guard | 8/9 items emitted parseable JSON; 3/9 passed. | This separates answer-finalization failures from wrong-answer and source-quality failures. |
| `batch_runner_problem_list_fix` | used ProblemList string parsing for background batch launch | Initial background launch with a comma string failed at PowerShell int[] binding; ProblemList avoids that harness-only failure. | The failed initial launch is a harness issue and is excluded from model scoring. |

## Iteration Decision

- `model_behavior`: Add a final-answer forcing step or two-phase solve-then-answer policy for CMT items that keep reasoning without stdout JSON. Why: No-timeout runs can still fail if the model never moves from reasoning to final JSON. Retest: Rerun the model-behavior items only and compare JSON emission rate.
- `answer_accuracy`: Cluster wrong-but-parseable answers by CMT type and build focused probes for the largest clusters. Why: These are clean model/domain misses once output and source quality are separated. Retest: Rerun one representative item per cluster after the reasoning intervention.
