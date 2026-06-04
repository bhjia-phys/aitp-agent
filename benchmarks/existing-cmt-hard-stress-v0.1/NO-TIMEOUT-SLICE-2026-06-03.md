# No-Timeout Slice 2026-06-03

## Conclusion

When the fixed per-item answer timeout is removed, Kimi can naturally converge to stdout JSON on a small CMT50 slice. In the three items tested here, all three emitted parseable JSON, but all three answers were wrong under the local CMT-Benchmark answer key.

This means the earlier empty-output result was strongly affected by timeout pressure, but correctness remains a separate and serious issue.

## Harness

- Runner: `run-kimi-cmt-hard-no-timeout-slice.ps1`
- Task: `cmt-hard-research-50`
- Model alias: `kimi-code/kimi-for-coding`
- Answer timeout: none
- Safety stop: idle timeout only, `20 min` with `30 s` polling
- Final-answer channel: stdout
- Process/reasoning log channel: stderr

## Results

| Problem | CMT type | Runtime | JSON captured | Actual | Expected | Passed |
| ---: | --- | ---: | --- | --- | --- | --- |
| 1 | HF | `420.267 s` | yes | `U_0/3+2U_1` | `U_1/2` | no |
| 14 | VMC | `420.271 s` | yes | `b` | `d;e` | no |
| 37 | PEPS | `120.134 s` | yes | `b;c;d` | `g` | no |

## Run Directories

- Item 14: `runs/20260603-224153__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50`
- Item 1: `runs/20260603-224928__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50`
- Item 37: `runs/20260603-225658__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50`

## Interpretation

- Removing the answer timeout changes the failure mode: these representative items no longer fail because stdout is empty.
- The natural convergence time is long: around seven minutes for items 1 and 14, and around two minutes for item 37.
- The emitted answers are still incorrect, so a no-timeout run should not be expected to turn CMT50 into an easy pass.
- The best next diagnostic is to run more items with this no-timeout harness and separate `json_emission_rate` from `answer_accuracy`.
