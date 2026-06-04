# CMT50 Baseline 2026-06-03

## Conclusion

Kimi 2.6 / Kimi Code scored `0/50` on the full `cmt-hard-research-50` task.

This is now the main hard stress task for `existing-cmt-hard-stress-v0.1`: it materializes all 50 public rows from CMT-Benchmark into one deterministic local verifier. Under the tested itemwise setting, Kimi produced 49 timeouts and 1 completed but incorrect JSON answer.

## Source And Task

- Source: CMT-Benchmark (`JVRoggeveen/cmt_benchmark`)
- Local source mirror: `source-cmt_data.jsonl`
- Task id: `cmt-hard-research-50`
- Problem count: `50`
- Verifier self-check: `private/sample.correct.json` verifies as `50/50`
- Answer/check mix: `26` choice-set checks, `8` numeric-vector checks, `16` symbolic checks

## Kimi Itemwise Run

- Run directory: `runs/20260603-204342__kimi26_code_allowed_itemwise__cmt_hard_research_50`
- Output: `runs/20260603-204342__kimi26_code_allowed_itemwise__cmt_hard_research_50/outputs/cmt-hard-research-50.itemwise.json`
- Score file: `runs/20260603-204342__kimi26_code_allowed_itemwise__cmt_hard_research_50/scores/cmt-hard-research-50.itemwise.score.json`
- Runtime: `2229.822 s`
- Per-item timeout: `45 s`
- Kimi executable: `local Kimi CLI executable`
- Kimi version: `0.8.0`
- Score: `0/50`, `hard_score = 0.0`

Run status counts:

| Status | Count |
| --- | ---: |
| timeout | `49` |
| completed | `1` |

Completed non-timeout item:

| Problem | Field | Status | Actual | Expected | Passed |
| ---: | --- | --- | --- | --- | --- |
| 37 | `cmt_index_36_answer` | completed | `b;c;d` | `['g']` | false |

## Failure Breakdown

| Check type | Failed / total |
| --- | ---: |
| `choice_set` | `26/26` |
| `numeric_vector` | `8/8` |
| `symbolic` | `16/16` |

| CMT type | Failed / total |
| --- | ---: |
| HF | `5/5` |
| ED | `8/8` |
| VMC | `2/2` |
| DMRG | `4/4` |
| QMC | `6/6` |
| PEPS | `3/3` |
| SM | `6/6` |
| Other | `16/16` |

## Interpretation

The result is dominated by answer-emission failure rather than close-but-wrong physics: 49 of 50 item prompts did not produce a parseable final JSON answer before the `45 s` per-item timeout. The single completed item was a PEPS/CFT scaling-dimension procedure question; Kimi output `b;c;d`, while the local CMT-Benchmark key expects `g` for that item.

Follow-up `300 s` slice testing shows that longer time helps some items emit stdout JSON but does not solve the benchmark. In the representative slice, item 14 completed at about `245.583 s` with `b` where the key expects `d;e`, item 37 completed with `b;c;d` where the key expects `g`, and items 1 and 50 still had empty stdout after about `300 s`.

Follow-up no-answer-timeout slice testing removed the fixed per-item answer timeout and used only an idle-output guard. Items 1, 14, and 37 all naturally converged to parseable JSON, but all three were still incorrect: item 1 emitted `U_0/3+2U_1` where the key expects `U_1/2`, item 14 emitted `b` where the key expects `d;e`, and item 37 emitted `b;c;d` where the key expects `g`.

Follow-up no-answer-timeout testing on the remaining 47 items was completed on 2026-06-04 in four batches. The selected remaining slice scored `9/47`; `38/47` items emitted captured JSON. Failure attribution split the `38` failed items into `28` answer-accuracy failures, `9` environment failures, and `1` data-source failure. The environment failures were Kimi CLI auth/quota failures (`auth.login_required` and `provider.rate_limit: 429`), so they should be rerun after the account/quota state is healthy rather than counted as physics-answer failures.

Those nine environment-failed items were then rerun serially after Kimi CLI availability recovered. The rerun scored `3/9`, with `8/9` captured JSON and no remaining auth/quota failures. Three items passed on rerun (`25`, `48`, `49`), five became ordinary answer-accuracy failures, and item `26` became a model-behavior failure: it reasoned continuously for about `2401 s` without emitting stdout JSON and was manually stopped so the rest of the rerun could proceed.

The latest consolidated audit overlays the environment rerun onto the no-timeout CMT50 evidence and reviews successful items as well as failures. The latest effective score is `12/50`, with failure attribution split into `35` answer-accuracy failures, `2` data-source failures, and `1` model-behavior failure. The `12` passing items were not accepted blindly: `11` are capability-supported with varying confidence, while problem `46` is marked leakage/memory-suspect because Kimi's stderr says it recalls a similar benchmark answer key. The lower-risk capability-supported passes are problems `23`, `27`, `48`, and `49`; medium-risk passes should be paraphrase-rerun before being used as strong capability claims.

The answer-accuracy cluster audit shows that the remaining clean model failures are concentrated in answer quality rather than JSON formatting: among the `35` answer-accuracy failures, `18` are choice-set mistakes, `12` are symbolic/formula mistakes, and `5` are numeric-vector mistakes. The largest CMT-type cluster is `Other` (`13` failures), followed by `SM` (`5`), `DMRG` (`4`), and `QMC` (`4`). This gives the next iteration a concrete target: option-by-option evidence/exclusion checks for choice sets, and dimensional/limiting-case/component-wise checks for symbolic and numeric answers.

The seven medium-risk passes were then rerun with a pass-stability prompt that preserved the original problem text but instructed Kimi not to rely on memory of public benchmarks, previous runs, solution keys, or answer keys. All seven rerun items emitted JSON, and the verifier score was `4/7`. Problems `5`, `6`, and `21` passed again with item-specific reasoning and were upgraded to stronger capability-supported evidence. Problems `11`, `15`, and `36` failed after originally passing, so their original passes are unstable/lucky-hit risks. Problem `25` passed again, but stderr explicitly mentioned answer-key/solution-key context, so it remains not clean capability evidence despite the verifier pass.

This makes the 50-question task useful as a high-failure research-level stress lane. The older `cmt-hard-research-8` task remains as a compact regression probe, but the full CMT50 result is the better baseline for the user's requested question-count target.
