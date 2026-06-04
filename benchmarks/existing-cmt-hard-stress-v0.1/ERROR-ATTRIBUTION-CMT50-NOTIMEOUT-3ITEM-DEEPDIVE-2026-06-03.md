# CMT50 No-Timeout 3-Item Deep Attribution 2026-06-03

## Conclusion

The three no-timeout failures are not the same kind of error.

- Item 1 is primarily a `data_source` / gold-boundary problem with a secondary model-interpretation issue. Kimi gave a physically standard three-sublattice CDW energy, while the source key expects `U_1/2`.
- Item 14 is primarily `answer_accuracy`: Kimi locked onto a standard missing-baseline VMC argument, but the benchmark key expects the support-mismatch choices `d;e`.
- Item 37 is primarily `data_source`: the source prompt contains a duplicated `(g)` option and the gold key is `g`, while Kimi chose the standard tensor-network/CFT procedure `b;c;d`.

For agent iteration, items 1 and 37 should be source-audited before being used as clean model-failure evidence. Item 14 is the cleanest of the three as a model/domain-reasoning failure.

## Shared Run Context

- Benchmark: `existing-cmt-hard-stress-v0.1`
- Task: `cmt-hard-research-50`
- Harness: `run-kimi-cmt-hard-no-timeout-slice.ps1`
- Timeout policy: no fixed answer timeout; `20 min` idle-output guard
- Source file: `source-cmt_data.jsonl`
- Gold file: `tasks/cmt-hard-research-50/private/gold.json`

## Item 1 / Source Index 0 / HF

### What Happened

- Source prompt asks for the ground-state energy per site of a spinful triangular-lattice system with onsite `U_0`, nearest-neighbor `U_1`, half filling, strong coupling, and a commensurate CDW.
- Source solution: `\boxed{U_1/2}`.
- Kimi output after natural convergence: `{"cmt_index_00_answer":"U_0/3+2U_1"}`.
- Runtime: `420.267 s`.
- Score: failed.

### Evidence

Kimi explicitly considered the benchmark key boundary. Its reasoning tail says the known triangular-lattice extended-Hubbard CDW energy is `U_0/3+2U_1`, with a uniform energy `3U_1` and boundary `U_0=3U_1`. It also considered whether the global ground state should be a `min(...)` expression.

The source key `U_1/2` looks more like a spinless or hard-core triangular-lattice nearest-neighbor occupancy energy than the spinful half-filled onsite-plus-nearest-neighbor CDW energy implied by Kimi's interpretation.

### Attribution

- Primary category: `data_source`
- Secondary categories: `answer_accuracy`, `model_behavior`
- Confidence: `medium`

The item should not yet be used as clean model-failure evidence. The prompt has enough ambiguity that the expected answer needs a source/gold audit.

### Next Action

Audit the original CMT-Benchmark rationale or generation source for item 0. Decide whether the local gold should remain `U_1/2`, whether the prompt should be reinterpreted as a hard-core/spinless occupancy problem, or whether this item should be marked ambiguous/excluded from agent-iteration score.

## Item 14 / Source Index 13 / VMC

### What Happened

- Source prompt presents a VMC gradient estimator for an RNN wavefunction.
- Options include:
  - `b`: biased because it misses a baseline involving average energy.
  - `d`: biased because RNN and gradients may have non-identical support.
  - `e`: biased and high variance.
- Source solution: `\boxed{d;e}`.
- Kimi output after natural convergence: `{"cmt_index_13_answer":"b"}`.
- Runtime: `420.271 s`.
- Score: failed.

### Evidence

Kimi derived the standard VMC gradient identity with a covariance/baseline term:

```text
dE/dalpha = 2[ <O E_L> - <O><E_L> ]
```

It then explicitly considered option `d` but rejected it as "usually not the issue." This is a domain-reasoning miss relative to the benchmark key. The source key does not include `b`, so the benchmark is testing a more specific RNN-support pathology and high-variance conclusion, not the generic covariance-baseline correction Kimi focused on.

### Attribution

- Primary category: `answer_accuracy`
- Secondary categories: `data_source`
- Confidence: `high` for mismatch with gold; `medium` for source interpretation.

This is the cleanest of the three as a model failure, because Kimi chose a plausible but non-key VMC explanation and explicitly missed the expected support-mismatch failure mode.

### Next Action

Create a simplified VMC/RNN support probe:

- one version that isolates the missing-baseline estimator;
- one version that isolates support mismatch where `psi(sigma)=0` but derivative support is nonzero;
- one version asking for both mechanisms.

Use that probe to decide whether the agent needs better method-specific recall or whether the CMT-Benchmark item's options are mixing distinct estimator defects.

## Item 37 / Source Index 36 / PEPS

### What Happened

- Source prompt asks for the operation sequence to find CFT primary-field scaling dimensions in a 2D classical spin model.
- Source options include standard tensor-network operations:
  - `b`: iteratively coarse-grain a tensor network until convergence.
  - `c`: build a transfer matrix.
  - `d`: analyze the eigenvalue spectrum.
- Source prompt also includes both `(g) compute the magnetic susceptibility` and `(g) do not make further operations`.
- Source parameters list only `a;b;c;d;e;f;g;h`.
- Source solution: `\boxed{g}`.
- Kimi output after natural convergence: `{"cmt_index_36_answer":"b;c;d"}`.
- Runtime: `120.134 s`.
- Score: failed.

### Evidence

Kimi's reasoning noticed the duplicated `(g)` label and called it a typo. It then selected the standard PEPS/tensor-network procedure for extracting scaling dimensions:

```text
coarse-grain -> build transfer matrix -> analyze eigenvalue spectrum
```

This is a reasonable physics-method answer to the written problem. The gold answer `g` appears to select the duplicated "do not make further operations" option rather than the method sequence implied by the question.

### Attribution

- Primary category: `data_source`
- Secondary categories: `answer_accuracy`, `verifier`
- Confidence: `high`

This item should be marked ambiguous or quarantined until source options are repaired. It is not clean evidence that the model lacks PEPS/CFT method knowledge.

### Next Action

Inspect original source generation for item 36. If the final `(g)` is meant to be an option, relabel options and clarify whether the expected answer is "do not make further operations" or a method sequence. Until then, exclude this item from agent-iteration scoring or keep it only as a data-quality test.

## Summary Table

| Item | Actual | Expected | Primary category | Clean model-failure evidence? | Recommended handling |
| ---: | --- | --- | --- | --- | --- |
| 1 | `U_0/3+2U_1` | `U_1/2` | `data_source` | no | audit gold/prompt; possibly ambiguous |
| 14 | `b` | `d;e` | `answer_accuracy` | yes, with source caveat | build VMC support/baseline probes |
| 37 | `b;c;d` | `g` | `data_source` | no | quarantine or repair option labels |

## Iteration Implication

The agent should not blindly optimize against all three failures as if they were equal. The next useful iteration is:

1. Improve attribution tooling so ambiguous source/gold items are separated from model errors.
2. Add focused VMC/RNN probes around item 14's failure mode.
3. Audit CMT-Benchmark items 0 and 36 before rerunning full CMT50 as a model-capability score.
