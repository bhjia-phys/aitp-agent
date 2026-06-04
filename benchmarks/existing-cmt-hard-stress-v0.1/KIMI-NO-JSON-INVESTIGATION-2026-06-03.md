# Kimi No-JSON Investigation 2026-06-03

## Conclusion

The CMT50 no-JSON failures are primarily timeout-before-final-answer failures, not verifier parse failures.

For timeout items, Kimi wrote several KB of reasoning/log text to stderr but produced empty stdout. The Kimi CLI only emits the final prompt response on stdout; on these hard CMT items the process was still reasoning when the per-item timeout killed it.

## Evidence

- CMT50 itemwise run: `20260603-204342__kimi26_code_allowed_itemwise__cmt_hard_research_50`
- Result: `0/50`
- Runtime: `2229.822 s`
- Timeout setting: `45 s` per item
- Status counts: `49` timeout, `1` completed wrong answer
- Timeout items: stdout `0` bytes, stderr usually several KB
- Completed item 37: stdout contained `{"cmt_index_36_answer":"b;c;d"}`, but expected `g`

Smoke test:

- Prompt: output exactly `{"x":1}`
- Result: stdout contained JSON immediately, stderr contained only the model's brief reasoning and resume hint
- Interpretation: the Kimi CLI stdout path works for simple final answers.

Reproduction on item 1:

- Original item 1 prompt, extended timeout to `120 s`
- Result: stdout stayed `0` bytes, stderr grew to `15581` bytes
- Tail of stderr showed Kimi still reconsidering triangular-lattice charge ordering and not reaching final answer

Long-timeout slice:

- A representative diagnostic slice was rerun with a `300 s` per-item timeout.
- Item 1 / HF: timed out at about `300.086 s`; stdout stayed `0` bytes; stderr grew to `34937` bytes.
- Item 14 / VMC: completed at about `245.583 s`; stdout contained `{"cmt_index_13_answer":"b"}`; expected answer was `d;e`, so it still failed.
- Item 24 / numeric-vector CMT item: the run produced `0` stdout bytes and about `41970` stderr bytes; the wrapper hit a Windows file-handle race while reading stdout, so metadata is incomplete, but no final JSON was captured.
- Item 37 / PEPS: completed within `300 s`; stdout contained `{"cmt_index_36_answer":"$\\boxed{b;c;d}$"}`; expected answer was `g`, so it still failed.
- Item 50 / SM/graph-style item: timed out at about `300.920 s`; stdout stayed `0` bytes; stderr grew to `55939` bytes.

Interpretation of the `300 s` slice:

- Extending the timeout does help some items reach stdout JSON.
- The answers that surfaced in this slice were still wrong under the local answer key.
- Some items still failed to emit any final JSON after five minutes.
- Therefore the failure is not only a `45 s` timeout artifact; it is a mix of slow final-answer emission, non-termination on hard prompts, and incorrect domain answers when an answer is emitted.

## Secondary Runner Issue Found

The old itemwise prompt template accidentally rendered:

```text
Use exactly this key:

- $field
```

while the problem block later said:

```text
Report `cmt_index_00_answer`.
```

This was a real prompt-quality bug, but it was not the main cause of empty stdout. After fixing the key rendering and rerunning item 1 for `60 s`, stdout was still empty and stderr still showed ongoing reasoning. The runner was patched to render the actual field name.

## Root Cause

Main cause:

- Hard research-level CMT prompts trigger long internal deliberation.
- Kimi writes this process text to stderr.
- The harness captures only stdout as the final answer channel.
- The process is killed before stdout receives a final JSON object.
- Raising the timeout from `45 s` to `300 s` reduces this for some items, but does not remove it.

Secondary contributors:

- The original per-item timeout was too short for Kimi's current behavior on these items.
- One prompt-template key-name bug made the output instruction noisier, now fixed.
- Windows redirection can add odd leading characters/encoding artifacts in captured logs, so the runner now uses best-effort text decoding and writes scorer output with explicit UTF-8.

## Implication

The `0/50` score is still valid for the tested harness: the model did not deliver parseable final JSON within the time budget. But the failure mode should be described as answer-emission / termination failure, not as 50 independent physics-answer mistakes.

Future clean reruns should use the patched runner and may compare several timeout budgets, for example `45 s`, `120 s`, and `300 s` on a small diagnostic slice before rerunning all 50 items.
