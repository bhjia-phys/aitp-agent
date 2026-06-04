# CMT50 Run Evidence Manifest

- Date: 2026-06-04
- Benchmark: `existing-cmt-hard-stress-v0.1`
- Task: `cmt-hard-research-50`

## Publication boundary

Raw stdout, stderr, and prompt logs are intentionally omitted from this public fork package. The manifest keeps run-level evidence: run ids, scores, item status, runtime, stdout/stderr byte counts, JSON-capture status, and failure previews. This avoids publishing local absolute paths and long model reasoning traces while preserving the audit trail needed to interpret the first baseline.

## Runs

| Run id | Problems | Score | JSON captured | Runtime seconds | Prompt variant |
| --- | --- | ---: | ---: | ---: | --- |
| `20260603-204342__kimi26_code_allowed_itemwise__cmt_hard_research_50` |  | `0/50` | `0/50` | `2229.822` | `default` |
| `20260603-224928__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50` | 1 | `0/1` | `1/1` | `420.44` | `default` |
| `20260603-224153__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50` | 14 | `0/1` | `1/1` | `420.445` | `default` |
| `20260603-225658__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50` | 37 | `0/1` | `1/1` | `120.328` | `default` |
| `20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_a` | 12 items | `3/12` | `12/12` | `7654.557` | `default` |
| `20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_b` | 12 items | `3/12` | `9/12` | `8495.088` | `default` |
| `20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_c` | 12 items | `2/12` | `10/12` | `8584.913` | `default` |
| `20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_d` | 11 items | `1/11` | `7/11` | `7744.523` | `default` |
| `20260604-095602__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__env_rerun_9` | 24, 25, 26, 38, 39, 40, 48, 49, 50 | `3/9` | `8/9` | `9695.064` | `default` |
| `20260604-135159__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__pass_review_rerun_7` | 5, 6, 11, 15, 21, 25, 36 | `4/7` | `7/7` | `6663.928` | `pass-review` |
