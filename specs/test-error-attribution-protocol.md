# Test Error Attribution Protocol

## Purpose

Every failed or partially failed agent test must produce an attribution record. Error attribution is not optional bookkeeping; it is the feedback signal for agent iteration.

Scores answer "how many passed." Attribution answers "what should change next."

## Required Trigger

Create or update an attribution artifact whenever any of these occur:

- deterministic score is below full pass;
- model output is empty, malformed, late, or violates the output contract;
- verifier fails, crashes, or gives a surprising score;
- runner, environment, network, tool, file-lock, or encoding behavior affects a run;
- source data, gold answers, or prompt wording may be ambiguous.

## Required Artifacts

For each benchmark run with failures, store:

- a human-readable attribution note, usually `ERROR-ATTRIBUTION-<date>.md` or a run-local `attribution.md`;
- a machine-readable JSON summary when practical, usually `attribution.json`;
- links to run metadata, stdout, stderr, score files, prompt files, and verifier outputs.

The artifact should live as close as possible to the failed run or benchmark:

```text
benchmarks/<benchmark-id>/
  runs/<run-id>/
    attribution.md
    attribution.json
```

For cross-run or baseline-level analysis, also add a benchmark-level note:

```text
benchmarks/<benchmark-id>/ERROR-ATTRIBUTION-<date>.md
```

## Attribution Categories

Each failure should be assigned one primary category and any useful secondary categories.

| Category | Meaning | Typical evidence |
| --- | --- | --- |
| `harness` | Runner, process management, stdout/stderr capture, timeout, schema extraction, or encoding caused or shaped the failure. | logs, process metadata, reproduced smoke test |
| `model_behavior` | The model failed to terminate, overthought, ignored instructions, emitted malformed output, or used the wrong channel. | stderr reasoning, stdout shape, runtime trace |
| `answer_accuracy` | The model emitted a parseable answer, but the answer was wrong. | verifier check with actual vs expected |
| `verifier` | The checker, normalization rule, tolerance, or schema may be wrong or too brittle. | self-check failures, equivalent answer rejected |
| `data_source` | The source question, options, labels, gold answer, or imported fields are ambiguous or inconsistent. | source row, prompt text, option mismatch |
| `environment` | OS, process lock, CLI, permissions, network, dependency, or local state affected the run. | system logs, file lock, CLI version, retries |
| `leakage_or_policy` | The run used forbidden information or violated the benchmark boundary. | command metadata, browser/network/tool logs |
| `unknown` | Evidence is insufficient; must define next probe. | missing logs, non-reproducible behavior |

## Minimal Attribution Record

Every attribution entry must contain:

- `run_id`
- `task_id`
- `item_id` or `field`
- `observed_failure`
- `primary_category`
- `evidence`
- `root_cause_hypothesis`
- `confidence`
- `recommended_action`
- `retest_plan`

Use concrete evidence, not vibes. A valid attribution should cite file paths and, where possible, exact values such as stdout bytes, stderr bytes, runtime, actual answer, expected answer, and verifier result.

## Workflow

1. **Separate emission from correctness.**
   Record whether the model produced parseable output before judging physics or math correctness.

2. **Inspect channels.**
   Check stdout, stderr, run metadata, exit code, runtime, score file, and prompt file. Do not assume empty score means model did nothing.

3. **Classify failure.**
   Assign primary and secondary categories. A timeout with ongoing stderr reasoning is usually `model_behavior` plus `harness`, not `answer_accuracy`.

4. **Check verifier and data boundaries.**
   Run verifier self-checks. Inspect source/gold only for attribution, never in a live model run that should be leakage-free.

5. **Run a minimal probe.**
   Change one variable at a time: longer timeout, no-answer-timeout, stricter prompt, simpler item, smoke JSON prompt, or verifier sample.

6. **Write recommended iteration.**
   The next agent change should be tied to the root cause: prompt contract, time budget, output forcing, verifier normalization, task split, retrieval/tool use, or source cleanup.

7. **Retest.**
   After a fix, rerun a small probe first, then the full suite only when the failure mode is improved.

## Report Template

```markdown
# Error Attribution <date>

## Conclusion

<one paragraph: what failed and what category dominates>

## Run

- Benchmark:
- Task:
- Run id:
- Score:
- Runner:
- Model:
- Boundary:

## Failure Breakdown

| Category | Count | Evidence |
| --- | ---: | --- |

## Item-Level Attribution

| Item | Observed failure | Primary category | Root cause hypothesis | Evidence | Next action |
| --- | --- | --- | --- | --- | --- |

## Probes

| Probe | Changed variable | Result | Interpretation |
| --- | --- | --- | --- |

## Iteration Decision

<what should change next, and what should not change yet>
```

## Agent Iteration Rule

Do not use aggregate score alone to guide agent design. For every failed test, choose the next iteration from the dominant attributed failure mode:

- `harness` -> fix runner or benchmark contract before judging the agent;
- `model_behavior` -> change prompt contract, stopping behavior, output forcing, or planning policy;
- `answer_accuracy` -> improve domain reasoning, tools, retrieval, or verifier-guided decomposition;
- `verifier` -> repair checker or add equivalence handling;
- `data_source` -> clean prompt/gold/options or mark the item ambiguous;
- `environment` -> stabilize CLI/process/dependency behavior before rerunning.
