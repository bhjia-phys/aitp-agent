# Benchmarks

This directory contains local benchmark lanes, run artifacts, verifiers, and baseline reports for agent evaluation.

## Required Failure Attribution

Every failed or partially failed benchmark run must include error attribution. Do not report only an aggregate score.

Follow:

- [Test Error Attribution Protocol](../specs/test-error-attribution-protocol.md)
- [Error Attribution Schema](error-attribution.schema.json)

Attribution must separate at least:

- JSON/output emission failures
- answer correctness failures
- verifier or source-data issues
- runner/environment issues

For agent iteration, use the attributed failure mode to choose the next change. A score alone is not enough.
