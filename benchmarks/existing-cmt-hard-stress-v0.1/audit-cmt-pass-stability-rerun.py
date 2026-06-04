import json
import re
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TASK_ID = "cmt-hard-research-50"
REPORT_DATE = "2026-06-04"
RUN_LABEL = "pass-review-rerun-7"
CONSOLIDATED_PATH = ROOT / f"ERROR-ATTRIBUTION-CMT50-CONSOLIDATED-{REPORT_DATE}.json"
OUT_JSON = ROOT / f"PASS-STABILITY-RERUN-CMT50-{REPORT_DATE}.json"
OUT_MD = ROOT / f"PASS-STABILITY-RERUN-CMT50-{REPORT_DATE}.md"

TARGET_PROBLEMS = [5, 6, 11, 15, 21, 25, 36]

KEY_OR_GOLD_PATTERNS = [
    "gold answer",
    "gold key",
    "answer key",
    "solution key",
    "benchmark key",
    "known benchmark answer",
    "expected answer",
]

BENCHMARK_CONTEXT_PATTERNS = [
    "public benchmark",
    "previous run",
    "looks familiar",
    "similar benchmark",
    "cmt-benchmark",
    "cmt benchmark",
    "known benchmark",
]

MEMORY_LANGUAGE_PATTERNS = [
    "i remember",
    "i recall",
    "recall a result",
    "recall now",
]


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def read_text(path):
    path = Path(path)
    if not path.exists():
        return ""
    raw = path.read_bytes()
    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff") or b"\x00" in raw[:64]:
        return raw.decode("utf-16", errors="replace")
    return raw.decode("utf-8", errors="replace")


def rel(path):
    try:
        return str(Path(path).resolve().relative_to(ROOT.resolve())).replace("\\", "/")
    except Exception:
        return str(path).replace("\\", "/")


def latest_run_dir():
    candidates = []
    for run_dir in (ROOT / "runs").glob(f"*{RUN_LABEL.replace('-', '_')}"):
        metadata_path = run_dir / "run-metadata.json"
        partial_path = run_dir / "run-metadata.partial.json"
        if metadata_path.exists() or partial_path.exists():
            candidates.append(run_dir)
    if not candidates:
        # The run label is sanitized by the runner; keep a broader fallback.
        candidates = [
            run_dir
            for run_dir in (ROOT / "runs").glob("*pass_review_rerun_7*")
            if (run_dir / "run-metadata.json").exists() or (run_dir / "run-metadata.partial.json").exists()
        ]
    if not candidates:
        raise FileNotFoundError(f"No run directory found for label {RUN_LABEL}")
    return max(candidates, key=lambda p: p.stat().st_mtime)


def load_summary(run_dir):
    paths = sorted((run_dir / "scores").glob("*.no-timeout-slice.summary.json"))
    if not paths:
        return None
    return read_json(paths[0])


def load_metadata(run_dir):
    metadata_path = run_dir / "run-metadata.json"
    if metadata_path.exists():
        return read_json(metadata_path)
    partial_path = run_dir / "run-metadata.partial.json"
    if partial_path.exists():
        data = read_json(partial_path)
        data["partial"] = True
        return data
    return {}


def actual_value(check):
    if not check:
        return None
    if "actual_parsed" in check:
        return check["actual_parsed"]
    if "actual_normalized" in check:
        return check["actual_normalized"]
    return check.get("actual_raw")


def text_flags(text):
    lowered = text.lower()
    key_or_gold = sorted(pattern for pattern in KEY_OR_GOLD_PATTERNS if pattern in lowered)
    benchmark_context = sorted(pattern for pattern in BENCHMARK_CONTEXT_PATTERNS if pattern in lowered)
    memory_language = sorted(pattern for pattern in MEMORY_LANGUAGE_PATTERNS if pattern in lowered)
    return {
        "bytes": len(text.encode("utf-8", errors="replace")),
        "lines": text.count("\n") + (1 if text else 0),
        "key_or_gold_phrases": key_or_gold,
        "benchmark_context_phrases": benchmark_context,
        "memory_language_phrases": memory_language,
        "mentions_uncertainty": bool(re.search(r"\b(not sure|unclear|guess|maybe|i think)\b", lowered)),
        "mentions_computation": any(
            token in lowered
            for token in [
                "derive",
                "compute",
                "calculate",
                "hamiltonian",
                "matrix",
                "determinant",
                "energy",
                "correlation",
                "variance",
                "eigen",
                "symmetry",
            ]
        ),
    }


def decision(original, item_run, check, stderr_flags):
    if not item_run:
        return "missing_rerun_evidence", "No rerun item record is available."
    if stderr_flags["key_or_gold_phrases"]:
        return (
            "answer_key_or_gold_leakage_suspect",
            "Rerun reasoning mentions answer-key or gold-like phrases, so the pass is not clean capability evidence.",
        )
    if not item_run.get("captured_json"):
        return "unstable_no_json", "The original item passed, but the pass-review rerun did not emit parseable JSON."
    if check and check.get("passed"):
        if stderr_flags["benchmark_context_phrases"]:
            return (
                "stable_but_benchmark_context_suspect",
                "The item passed again, but reasoning references benchmark/source context, so keep it as pass but not strong clean capability evidence.",
            )
        if stderr_flags["mentions_computation"]:
            return "stable_capability_supported", "The item passed again under anti-memory prompt with item-specific reasoning evidence."
        return "stable_but_weak_reasoning_evidence", "The item passed again, but stderr has limited computation signals."
    if stderr_flags["benchmark_context_phrases"]:
        return (
            "unstable_and_benchmark_context_suspect",
            "The rerun answer failed and reasoning references benchmark/source context, so the original pass is unstable and not clean capability evidence.",
        )
    return "unstable_answer_changed_or_failed", "The original item passed, but the pass-review rerun answer did not match the verifier."


def main():
    consolidated = read_json(CONSOLIDATED_PATH)
    original_by_problem = {
        int(item["problem_number"]): item
        for item in consolidated["passed_item_reviews"]
        if int(item["problem_number"]) in TARGET_PROBLEMS
    }
    missing_original = sorted(set(TARGET_PROBLEMS) - set(original_by_problem))
    if missing_original:
        raise RuntimeError(f"Missing original pass-review rows for problems: {missing_original}")

    run_dir = latest_run_dir()
    metadata = load_metadata(run_dir)
    summary = load_summary(run_dir)
    completed = summary is not None and not metadata.get("partial")

    checks = {}
    if summary:
        checks = {check["field"]: check for check in summary.get("checks", [])}

    item_runs = {int(item["problem_number"]): item for item in metadata.get("item_runs", [])}
    if summary:
        item_runs.update({int(item["problem_number"]): item for item in summary.get("item_runs", [])})

    rows = []
    for problem in TARGET_PROBLEMS:
        original = original_by_problem[problem]
        item_run = item_runs.get(problem)
        check = checks.get(original["field"])
        stderr = read_text(item_run.get("stderr", "")) if item_run else ""
        flags = text_flags(stderr)
        verdict, rationale = decision(original, item_run, check, flags)
        rows.append({
            "problem_number": problem,
            "field": original["field"],
            "cmt_type": original["cmt_type"],
            "original_actual": original.get("actual"),
            "original_expected": original.get("expected"),
            "original_risk": original.get("hallucination_or_lucky_hit_risk"),
            "original_confidence": original.get("capability_confidence"),
            "rerun_status": item_run.get("status") if item_run else None,
            "rerun_json_emitted": item_run.get("captured_json") if item_run else False,
            "rerun_passed": check.get("passed") if check else False,
            "rerun_actual": actual_value(check),
            "rerun_expected": check.get("expected") if check else original.get("expected"),
            "rerun_runtime_seconds": item_run.get("runtime_seconds") if item_run else None,
            "rerun_stderr_bytes": item_run.get("stderr_bytes") if item_run else 0,
            "rerun_stdout_bytes": item_run.get("stdout_bytes") if item_run else 0,
            "rerun_stderr_flags": flags,
            "stability_decision": verdict,
            "decision_rationale": rationale,
            "evidence": {
                "prompt": rel(item_run.get("prompt", "")) if item_run else None,
                "stdout": rel(item_run.get("stdout", "")) if item_run else None,
                "stderr": rel(item_run.get("stderr", "")) if item_run else None,
            },
        })

    decision_counts = {}
    for row in rows:
        decision_counts[row["stability_decision"]] = decision_counts.get(row["stability_decision"], 0) + 1

    payload = {
        "schema_version": "0.1",
        "benchmark_id": consolidated["benchmark_id"],
        "task_id": TASK_ID,
        "run_id": "cmt50_pass_stability_rerun_audit_2026-06-04",
        "created_at": datetime.now().replace(microsecond=0).isoformat(),
        "source_report": CONSOLIDATED_PATH.name,
        "rerun": {
            "label": RUN_LABEL,
            "path": rel(run_dir),
            "completed": completed,
            "prompt_variant": metadata.get("prompt_variant"),
            "passed": summary.get("passed") if summary else None,
            "total": summary.get("total") if summary else None,
            "problem_numbers": metadata.get("problem_numbers"),
        },
        "summary": {
            "target_problems": TARGET_PROBLEMS,
            "decision_counts": decision_counts,
            "stable_clean_passes": [
                row["problem_number"]
                for row in rows
                if row["stability_decision"] == "stable_capability_supported"
            ],
            "unstable_or_suspect": [
                row["problem_number"]
                for row in rows
                if row["stability_decision"] != "stable_capability_supported"
            ],
            "rerun_passed_but_not_clean": [
                row["problem_number"]
                for row in rows
                if row["rerun_passed"] and row["stability_decision"] != "stable_capability_supported"
            ],
            "rerun_failed_after_original_pass": [
                row["problem_number"]
                for row in rows
                if not row["rerun_passed"]
            ],
        },
        "items": rows,
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "# CMT50 Pass-Stability Rerun Audit",
        "",
        f"- Date: {REPORT_DATE}",
        f"- Source report: `{CONSOLIDATED_PATH.name}`",
        f"- Rerun path: `{rel(run_dir)}`",
        f"- Completed: `{completed}`",
        f"- Rerun score: `{summary.get('passed') if summary else 'partial'}/{summary.get('total') if summary else 'partial'}`",
        "",
        "## Conclusion",
        "",
    ]
    if completed:
        stable = payload["summary"]["stable_clean_passes"]
        suspect = payload["summary"]["unstable_or_suspect"]
        lines.append(
            f"Among the 7 medium-risk original passes, {len(stable)} stayed cleanly stable under the anti-memory pass-review prompt; "
            f"{len(suspect)} need caution or follow-up. The verifier rerun score was {summary.get('passed')}/{summary.get('total')}."
        )
    else:
        lines.append("The rerun is not complete yet; this report records the currently available partial evidence.")

    lines.extend([
        "",
        "## Decision Counts",
        "",
        "| Decision | Count |",
        "| --- | ---: |",
    ])
    for key, count in sorted(decision_counts.items(), key=lambda kv: (-kv[1], kv[0])):
        lines.append(f"| {key} | {count} |")

    lines.extend([
        "",
        "## Item Review",
        "",
        "| Problem | Type | Original risk | Rerun passed | Rerun actual | Decision | Rationale |",
        "| ---: | --- | --- | --- | --- | --- | --- |",
    ])
    for row in rows:
        actual = str(row["rerun_actual"]).replace("\n", " ")[:80]
        lines.append(
            f"| #{row['problem_number']} | {row['cmt_type']} | {row['original_risk']} | "
            f"{row['rerun_passed']} | `{actual}` | {row['stability_decision']} | {row['decision_rationale']} |"
        )

    lines.extend([
        "",
        "## Handling Rule",
        "",
        "- `stable_capability_supported`: can be counted as stronger Kimi capability evidence for this benchmark slice.",
        "- `stable_but_benchmark_context_suspect`: keep as a verifier pass, but do not count as clean capability evidence.",
        "- `stable_but_weak_reasoning_evidence`: keep as pass, but do not use as strong capability claim without another perturbation.",
        "- `unstable_answer_changed_or_failed` or `unstable_no_json`: treat the original pass as unstable/lucky-hit risk.",
        "- `answer_key_or_gold_leakage_suspect` and `unstable_and_benchmark_context_suspect`: do not count as clean capability evidence.",
        "",
    ])
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_MD}")


if __name__ == "__main__":
    main()
