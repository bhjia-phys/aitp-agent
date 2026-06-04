# Existing CMT Hard Stress Benchmark v0.1

This benchmark is a hard stress suite materialized from the public CMT-Benchmark dataset. It is intentionally harder than `existing-open-physics-diverse-v0.1`: all items are research-level condensed matter theory questions, and the target is to expose failures rather than maximize pass rate.

## Included Source

- CMT-Benchmark: expert-authored condensed matter theory benchmark, MIT licensed on Hugging Face.

## Tasks

- Default task id: `cmt-hard-research-50`
- Full task: `cmt-hard-research-50`
- Compact regression task: `cmt-hard-research-8`
- Full problem count: 50
- Full check count: 50
- Format: one JSON object with answer strings or numeric-vector values.
- Local grading: exact choice-set matching, numeric vector tolerance, and symbolic normalization.
- Current full CMT50 status: Kimi scored `0/50`; itemwise run had 49 timeouts and 1 completed wrong answer.
- CMT50 baseline report: [BASELINE-CMT50-2026-06-03.md](BASELINE-CMT50-2026-06-03.md)
- No-timeout slice: [NO-TIMEOUT-SLICE-2026-06-03.md](NO-TIMEOUT-SLICE-2026-06-03.md)
- No-timeout remaining 47-item final attribution: [ERROR-ATTRIBUTION-CMT50-REMAINING-FINAL-2026-06-04.md](ERROR-ATTRIBUTION-CMT50-REMAINING-FINAL-2026-06-04.md)
- Environment-failure rerun attribution: [ERROR-ATTRIBUTION-CMT50-ENV-RERUN-9-2026-06-04.md](ERROR-ATTRIBUTION-CMT50-ENV-RERUN-9-2026-06-04.md)
- Consolidated latest failure/pass audit: [ERROR-ATTRIBUTION-CMT50-CONSOLIDATED-2026-06-04.md](ERROR-ATTRIBUTION-CMT50-CONSOLIDATED-2026-06-04.md)
- Answer-accuracy cluster audit: [ANSWER-ACCURACY-CLUSTERS-CMT50-2026-06-04.md](ANSWER-ACCURACY-CLUSTERS-CMT50-2026-06-04.md)
- Medium-risk pass stability rerun: [PASS-STABILITY-RERUN-CMT50-2026-06-04.md](PASS-STABILITY-RERUN-CMT50-2026-06-04.md)
- Public run evidence manifest: [RUN-EVIDENCE-MANIFEST-CMT50-2026-06-04.md](RUN-EVIDENCE-MANIFEST-CMT50-2026-06-04.md)
- Error attribution: [ERROR-ATTRIBUTION-2026-06-03.md](ERROR-ATTRIBUTION-2026-06-03.md)
- No-timeout 3-item deep attribution: [ERROR-ATTRIBUTION-CMT50-NOTIMEOUT-3ITEM-DEEPDIVE-2026-06-03.md](ERROR-ATTRIBUTION-CMT50-NOTIMEOUT-3ITEM-DEEPDIVE-2026-06-03.md)
- Compact 8-item baseline report: [BASELINE-2026-06-03.md](BASELINE-2026-06-03.md)

## Publication Boundary

This fork package includes the benchmark source rows, task prompts, gold files, verifiers, runners, audit scripts, attribution reports, JSON summaries, and a public run evidence manifest. It intentionally omits raw `runs/` stdout, stderr, and prompt logs because those files contain local absolute paths and long model reasoning traces. Historical reports may still cite `runs/...` ids as original evidence references; use the run evidence manifest for the public run-level evidence included here.

## No-Timeout Remaining Run 2026-06-04

After the fixed-timeout diagnosis, the remaining `47` CMT50 items were rerun in four no-answer-timeout batches with a `20 min` idle-output guard. Final result:

- Score on the selected remaining items: `9/47`.
- JSON captured: `38/47`.
- Primary attribution counts among failed items: `28` answer-accuracy, `9` environment, `1` data-source.
- Environment failures are not model-capability failures: one early item hit `auth.login_required`; later items hit `provider.rate_limit: 429`.
- Clean next iteration target: cluster the `answer_accuracy` failures by CMT type and build focused probes; rerun environment-failed items after auth/quota is healthy.

The nine environment-failed items were rerun serially after Kimi CLI availability recovered:

- Rerun score: `3/9`.
- Captured JSON: `8/9`.
- No auth/quota failures remained.
- Rerun attribution: `5` answer-accuracy failures and `1` model-behavior failure.
- Passed on rerun: problems `25`, `48`, and `49`.
- Item `26` was manually stopped after about `2401 s` of continuous reasoning without stdout JSON so the remaining rerun items could proceed.

The latest consolidated 50-item audit overlays the env rerun onto the earlier no-timeout runs and also reviews passing items:

- Latest score: `12/50`.
- Latest failure attribution: `35` answer-accuracy, `2` data-source, `1` model-behavior.
- Passing item review: `11` capability-supported passes and `1` leakage/memory-suspect pass.
- Stronger low-risk pass evidence: problems `23`, `27`, `48`, and `49`.
- Answer-accuracy clusters: `18` choice-set mistakes, `12` symbolic/formula mistakes, and `5` numeric-vector mistakes.
- The `7` medium-risk passes were rerun with an anti-memory pass-review prompt that preserved the original problem text. Rerun score was `4/7`: problems `5`, `6`, and `21` upgraded to stable capability-supported evidence; problems `11`, `15`, `25`, and `36` remain unstable or leakage/context-suspect.
- Problem `46` passed but is high-risk as capability evidence because Kimi's stderr says it recalls a similar benchmark answer key.

## Selection Policy

The full task uses all 50 public CMT-Benchmark rows. The compact 8-item task keeps a smaller regression slice from harder CMT-Benchmark modalities:

- VMC estimator bias and variance
- fractional quantum Hall / exact diagonalization spectrum scaling
- interacting Hubbard-ring adiabatic connectivity
- particle-hole transformed Hubbard Hamiltonian
- strongly interacting dimerized Hubbard-chain correlations
- determinant QMC sign-problem criteria
- long-range-interaction DQMC sign-problem criteria
- triangular hardcore-boson transport/compressibility

This deliberately removes the easy ThermoQA and graduate-basic CMPhysBench items from the previous diverse suite.
