# Error Attribution 2026-06-03

## Conclusion

CMT50 failures separate into two layers. Under fixed short time budgets, the dominant failure was `model_behavior` plus `harness`: Kimi kept reasoning on stderr and did not emit final stdout JSON before the timeout. Under no-answer-timeout probing, representative items did converge to parseable JSON, but the emitted answers were still wrong, so the remaining failure mode is `answer_accuracy`.

This attribution is the basis for the next agent iteration: first separate JSON emission from answer correctness, then improve condensed-matter reasoning or task decomposition.

## Run Context

- Benchmark: `existing-cmt-hard-stress-v0.1`
- Task: `cmt-hard-research-50`
- Original fixed-time run: `runs/20260603-204342__kimi26_code_allowed_itemwise__cmt_hard_research_50`
- Original score: `0/50`
- Original fixed-time result: `49` timeout, `1` completed wrong answer
- No-timeout slice runner: `run-kimi-cmt-hard-no-timeout-slice.ps1`
- No-timeout slice result: `0/3`, but `3/3` emitted parseable JSON

## Failure Breakdown

| Category | Count / scope | Evidence |
| --- | ---: | --- |
| `model_behavior` | dominant in fixed-time CMT50 | timeout items had nonempty stderr reasoning but empty stdout |
| `harness` | shaped the fixed-time score | fixed answer timeout killed processes before final stdout; stdout is the final answer channel |
| `answer_accuracy` | dominant after no-timeout probing | items 1, 14, and 37 emitted JSON but all missed the answer key |
| `environment` | minor | Windows file-handle race occurred during one 300 s slice wrapper read |
| `data_source` | possible for item 37 | item text appears to contain duplicated option label, but local gold still expects `g` |

## Item-Level Attribution

| Item | Observed failure | Primary category | Root cause hypothesis | Evidence | Next action |
| ---: | --- | --- | --- | --- | --- |
| 1 | Fixed `45/120/300 s` runs had empty stdout; no-timeout run emitted non-key JSON | `data_source` after deep dive, `model_behavior` under timeout | Kimi eventually commits to a physically plausible spinful triangular-CDW energy; source key may reflect a different formulation | no-timeout actual `U_0/3+2U_1`, expected `U_1/2`, runtime `420.267 s` | audit source/gold before counting as model error |
| 14 | Fixed `45 s` timeout, `300 s` and no-timeout emitted JSON but wrong answer | `answer_accuracy` | Kimi recognizes the missing-baseline argument but misses the support-mismatch choices expected by the benchmark | no-timeout actual `b`, expected `d;e`, runtime `420.271 s` | add a CMT/VMC support-condition probe and compare with source rationale |
| 37 | Fixed run emitted non-key JSON; no-timeout run also emitted non-key JSON | `data_source` | Source prompt has duplicated `(g)` option; Kimi follows common PEPS/CFT procedure options while benchmark key expects duplicated `g` | no-timeout actual `b;c;d`, expected `g`, runtime `120.134 s` | quarantine or repair option labels before using this item for agent design |
| 50 | Fixed and `300 s` runs did not emit stdout | `model_behavior` | graph/ASCII-lattice reasoning produced prolonged unresolved deliberation | `300.920 s`, stdout `0`, stderr `55939` bytes | run with no-answer-timeout if this item is needed, otherwise mark as nontermination probe |

## Probes

| Probe | Changed variable | Result | Interpretation |
| --- | --- | --- | --- |
| JSON smoke test | simple prompt only | stdout emitted `{"x":1}` immediately | Kimi CLI stdout path works |
| Item 1 `120 s` | longer timeout | stdout still `0` bytes | not merely a 45 s cutoff |
| `300 s` diagnostic slice | longer fixed timeout | items 14 and 37 emitted JSON; items 1 and 50 still did not | longer time helps but does not solve |
| no-answer-timeout slice | remove fixed answer timeout | items 1, 14, and 37 emitted JSON | JSON emission can recover with enough time |
| no-answer-timeout scoring | verify emitted JSON | `0/3` | correctness remains a separate failure mode |

## Iteration Decision

Do not optimize from the aggregate `0/50` alone. The next benchmark and agent changes should track two metrics separately:

- `json_emission_rate`: whether the model reaches a parseable final answer;
- `answer_accuracy_rate`: whether the parseable answer matches the verifier.

Recommended next iteration:

- For `model_behavior`: add no-answer-timeout or long-idle slice runs for small probes, and test a stricter answer-forcing prompt.
- For `answer_accuracy`: inspect source/gold for disputed items, then add method-specific CMT probes before changing the agent.
- For `harness`: keep stdout/stderr byte counts, captured JSON flags, and idle-time metadata in every run.
