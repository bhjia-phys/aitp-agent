import argparse
import importlib.util
import json
import re
from collections import Counter, OrderedDict
from datetime import datetime
from pathlib import Path


BENCHMARK_ID = "existing-cmt-hard-stress-v0.1"
TASK_ID = "cmt-hard-research-50"
SCHEMA_VERSION = "0.1"


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


def rel(path, root):
    try:
        return str(Path(path).resolve().relative_to(Path(root).resolve())).replace("\\", "/")
    except Exception:
        return str(path).replace("\\", "/")


def extract_json_object(text):
    match = re.search(r"\{.*\}", text or "", flags=re.S)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None


def parse_source_rows(path):
    rows = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        rows[int(row["index"])] = row
    return rows


def load_verifier(root):
    verifier_path = root / "tasks" / TASK_ID / "verify.py"
    spec = importlib.util.spec_from_file_location("cmt_verify", verifier_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def parse_choice_labels(prompt):
    labels = re.findall(r"\(([a-i])\)", prompt or "", flags=re.I)
    return [label.lower() for label in labels]


def parse_solution_choices(value):
    raw = str(value or "").lower()
    boxed = re.search(r"\\boxed\{([^{}]*)\}", raw)
    if boxed:
        raw = boxed.group(1)
    return sorted(set(re.findall(r"\b[a-i]\b", raw)))


def classify_source_flags(source_row, check):
    flags = []
    prompt = source_row.get("prompt", "") if source_row else ""
    labels = parse_choice_labels(prompt)
    counts = Counter(labels)
    duplicates = sorted([label for label, count in counts.items() if count > 1])
    if duplicates:
        flags.append({
            "kind": "duplicate_option_labels",
            "value": duplicates,
            "severity": "high",
        })

    if check.get("type") == "choice_set":
        expected = sorted(check.get("expected") or [])
        source_solution = parse_solution_choices(source_row.get("solution", "") if source_row else "")
        label_set = set(labels)
        if labels and any(choice not in label_set for choice in expected):
            flags.append({
                "kind": "expected_choice_not_in_prompt_labels",
                "value": expected,
                "severity": "high",
            })
        if source_solution and source_solution != expected:
            flags.append({
                "kind": "source_solution_verifier_expected_mismatch",
                "value": {"source_solution": source_solution, "verifier_expected": expected},
                "severity": "high",
            })
        if duplicates and any(choice in duplicates for choice in expected):
            flags.append({
                "kind": "expected_choice_uses_duplicated_label",
                "value": expected,
                "severity": "high",
            })

    if source_row and not str(source_row.get("solution", "")).strip():
        flags.append({
            "kind": "missing_source_solution",
            "value": None,
            "severity": "high",
        })
    return flags


def item_id_from_field(field):
    match = re.search(r"cmt_index_(\d+)_answer", field or "")
    if not match:
        return field or "unknown"
    return f"cmt_index_{match.group(1)}"


def normalize_check_actual(check):
    if "actual_parsed" in check:
        return check.get("actual_parsed")
    if "actual_normalized" in check:
        return check.get("actual_normalized")
    return check.get("actual_raw")


def classify_failure(item_run, check, source_flags, stderr_text=""):
    status = item_run.get("status")
    captured = bool(item_run.get("captured_json"))
    stdout_bytes = int(item_run.get("stdout_bytes") or 0)
    stderr_bytes = int(item_run.get("stderr_bytes") or 0)
    high_source = [flag for flag in source_flags if flag.get("severity") == "high"]

    if "auth.login_required" in stderr_text:
        return (
            "environment",
            ["harness"],
            "The Kimi CLI exited with auth.login_required before producing a final stdout JSON object.",
            "high",
        )
    if "provider.rate_limit" in stderr_text or "429" in stderr_text and "usage limit" in stderr_text:
        return (
            "environment",
            ["harness"],
            "The Kimi CLI exited with provider.rate_limit/429 before producing a final stdout JSON object.",
            "high",
        )

    if not captured:
        if status == "idle_timeout":
            return (
                "model_behavior",
                ["harness"],
                "The model did not emit a parseable final JSON object before the idle-output guard stopped the item.",
                "high" if stderr_bytes > 0 else "medium",
            )
        if stdout_bytes == 0 and stderr_bytes > 0:
            return (
                "model_behavior",
                [],
                "The model produced reasoning or progress logs but did not write a final answer to stdout.",
                "high",
            )
        if stdout_bytes > 0:
            return (
                "model_behavior",
                ["harness"],
                "The model wrote stdout, but the runner could not extract a JSON object with the expected field.",
                "medium",
            )
        return (
            "environment",
            ["harness"],
            "The item produced no captured answer and little evidence; inspect process and file-capture state.",
            "low",
        )

    if high_source:
        return (
            "data_source",
            ["answer_accuracy", "verifier"],
            "The model emitted a parseable answer, but the source row has high-severity prompt/gold/option-label flags.",
            "high",
        )

    secondary = []
    if check.get("type") == "symbolic":
        secondary.append("verifier")
    return (
        "answer_accuracy",
        secondary,
        "The model emitted parseable JSON and the verifier compared it against the gold answer, but the parsed answer did not match.",
        "high",
    )


def build_item_attribution(root, run_dir, item_run, check, source_row, source_flags):
    field = item_run.get("field") or check.get("field")
    source_index = check.get("source_index")
    actual = normalize_check_actual(check)
    expected = check.get("expected")
    stderr_text = read_text(item_run.get("stderr", ""))
    primary, secondary, hypothesis, confidence = classify_failure(item_run, check, source_flags, stderr_text)

    status = item_run.get("status")
    captured = bool(item_run.get("captured_json"))
    if captured:
        observed = f"Emitted parseable JSON for {field}, but verifier failed: actual={actual!r}, expected={expected!r}."
    elif status == "idle_timeout":
        observed = f"No parseable JSON for {field}; item stopped by idle-output guard after {item_run.get('runtime_seconds')} s."
    else:
        observed = f"No parseable JSON for {field}; status={status}, stdout_bytes={item_run.get('stdout_bytes')}, stderr_bytes={item_run.get('stderr_bytes')}."

    evidence = [
        {
            "kind": "score",
            "value": {
                "passed": bool(check.get("passed")),
                "actual": actual,
                "expected": expected,
                "check_type": check.get("type"),
            },
        },
        {
            "kind": "metric",
            "value": {
                "status": status,
                "runtime_seconds": item_run.get("runtime_seconds"),
                "stdout_bytes": int(item_run.get("stdout_bytes") or 0),
                "stderr_bytes": int(item_run.get("stderr_bytes") or 0),
                "captured_json": captured,
            },
        },
        {"kind": "file", "path": rel(item_run.get("prompt", ""), root), "note": "single-item prompt"},
        {"kind": "file", "path": rel(item_run.get("stdout", ""), root), "note": "model stdout"},
        {"kind": "file", "path": rel(item_run.get("stderr", ""), root), "note": "model stderr/reasoning"},
        {"kind": "file", "path": rel(run_dir, root), "note": "run directory"},
    ]
    if source_row:
        evidence.append({
            "kind": "source",
            "path": "source-cmt_data.jsonl",
            "value": {
                "index": source_row.get("index"),
                "type": source_row.get("type"),
                "solution": source_row.get("solution"),
            },
        })
    if source_flags:
        evidence.append({"kind": "source_quality", "value": source_flags})
    if "auth.login_required" in stderr_text:
        evidence.append({
            "kind": "stderr",
            "value": "auth.login_required: OAuth provider managed:kimi-code requires login before it can be used.",
            "note": "environment/auth failure, not a physics answer failure",
        })
    if "provider.rate_limit" in stderr_text or "429" in stderr_text and "usage limit" in stderr_text:
        evidence.append({
            "kind": "stderr",
            "value": "provider.rate_limit: 429 usage limit reached.",
            "note": "environment/quota failure, not a physics answer failure",
        })

    if primary == "answer_accuracy":
        action = "Use this item as model/domain reasoning feedback; inspect stderr reasoning for the missed physics mechanism before changing prompts."
        retest = "Rerun a small focused probe for this item's method family, then rerun the item with the same verifier."
    elif primary == "data_source":
        action = "Audit or quarantine this source row before using it as clean model-failure evidence."
        retest = "Repair the prompt/gold/options or mark the item ambiguous, then rerun only this item."
    elif primary == "model_behavior":
        action = "Improve answer-finalization/output forcing for this item class before treating it as a physics error."
        retest = "Rerun with a stricter final-answer contract or periodic self-stop instruction, preserving leakage boundary."
    elif primary == "environment":
        if "auth.login_required" in stderr_text:
            action = "Restore Kimi CLI authentication, then rerun this item; do not count it as a model-answer failure."
            retest = "Rerun the same item after `kimi` login state is healthy and verify stdout JSON is captured."
        elif "provider.rate_limit" in stderr_text or "429" in stderr_text and "usage limit" in stderr_text:
            action = "Wait for Kimi quota reset or use an available quota lane, then rerun this item; do not count it as a model-answer failure."
            retest = "Rerun the same item after quota is refreshed and verify stdout JSON is captured."
        else:
            action = "Inspect runner/process/file-capture evidence and rerun the item."
            retest = "Rerun the same item once after confirming Kimi CLI and stdout/stderr capture are healthy."
    else:
        action = "Define a smaller probe before iteration."
        retest = "Rerun after collecting missing evidence."

    return OrderedDict([
        ("item_id", item_id_from_field(field)),
        ("field", field),
        ("source_index", source_index),
        ("problem_number", item_run.get("problem_number")),
        ("cmt_type", check.get("cmt_type")),
        ("observed_failure", observed),
        ("primary_category", primary),
        ("secondary_categories", secondary),
        ("root_cause_hypothesis", hypothesis),
        ("confidence", confidence),
        ("evidence", evidence),
        ("actual", actual),
        ("expected", expected),
        ("passed", bool(check.get("passed"))),
        ("json_emitted", captured),
        ("runtime_seconds", float(item_run.get("runtime_seconds") or 0)),
        ("stdout_bytes", int(item_run.get("stdout_bytes") or 0)),
        ("stderr_bytes", int(item_run.get("stderr_bytes") or 0)),
        ("source_flags", source_flags),
        ("recommended_action", action),
        ("retest_plan", retest),
    ])


def collect_runs(root, run_globs):
    run_root = root / "runs"
    dirs = []
    for pattern in run_globs:
        dirs.extend(run_root.glob(pattern))
    unique = []
    seen = set()
    for path in sorted(dirs):
        if not path.is_dir():
            continue
        resolved = path.resolve()
        if resolved not in seen:
            unique.append(path)
            seen.add(resolved)
    return unique


def load_run_summary(run_dir, root, verifier=None, gold=None):
    summary_paths = sorted((run_dir / "scores").glob("*.no-timeout-slice.summary.json"))
    if not summary_paths:
        partial_path = run_dir / "run-metadata.partial.json"
        if not partial_path.exists():
            return None
        metadata = read_json(partial_path)
        item_runs = metadata.get("item_runs", [])
        actual = {}
        fields = []
        for item_run in item_runs:
            field = item_run.get("field")
            if field:
                fields.append(field)
            if item_run.get("captured_json"):
                obj = extract_json_object(read_text(item_run.get("stdout", "")))
                if isinstance(obj, dict) and field in obj:
                    actual[field] = obj[field]
        verifier = verifier or load_verifier(root)
        gold = gold or read_json(root / "tasks" / TASK_ID / "private" / "gold.json")
        score = verifier.grade(gold, actual)
        checks = [check for check in score.get("checks", []) if check.get("field") in set(fields)]
        return {
            "benchmark_id": BENCHMARK_ID,
            "task_id": TASK_ID,
            "run_id": metadata.get("run_id", run_dir.name),
            "run_label": metadata.get("run_label"),
            "problem_numbers": [item_run.get("problem_number") for item_run in item_runs],
            "passed": sum(1 for check in checks if check.get("passed")),
            "total": len(checks),
            "hard_score": (sum(1 for check in checks if check.get("passed")) / len(checks)) if checks else 0.0,
            "item_runs": item_runs,
            "checks": checks,
            "partial": True,
        }
    return read_json(summary_paths[0])


def build_audit(root, run_dirs, include_driver_logs):
    created = datetime.now()
    created_date = created.date().isoformat()
    source_rows = parse_source_rows(root / "source-cmt_data.jsonl")
    verifier = load_verifier(root)
    gold = read_json(root / "tasks" / TASK_ID / "private" / "gold.json")
    items = []
    passed_items = []
    run_summaries = []
    all_item_runs = 0
    emitted = 0
    passed = 0

    for run_dir in run_dirs:
        summary = load_run_summary(run_dir, root, verifier=verifier, gold=gold)
        metadata_path = run_dir / "run-metadata.json"
        metadata = read_json(metadata_path) if metadata_path.exists() else {}
        if not summary:
            run_summaries.append({
                "run_id": run_dir.name,
                "status": "missing_summary",
                "path": rel(run_dir, root),
            })
            continue
        checks = {check.get("field"): check for check in summary.get("checks", [])}
        run_summaries.append({
            "run_id": summary.get("run_id", run_dir.name),
            "run_label": summary.get("run_label") or metadata.get("run_label"),
            "path": rel(run_dir, root),
            "passed": summary.get("passed"),
            "total": summary.get("total"),
            "runtime_seconds": metadata.get("runtime_seconds"),
            "problem_numbers": summary.get("problem_numbers", []),
        })
        for item_run in summary.get("item_runs", []):
            field = item_run.get("field")
            check = checks.get(field) or {"field": field, "passed": False, "expected": None}
            source_index = check.get("source_index")
            source_row = source_rows.get(int(source_index)) if source_index is not None else None
            source_flags = classify_source_flags(source_row, check)
            all_item_runs += 1
            if item_run.get("captured_json"):
                emitted += 1
            if check.get("passed"):
                passed += 1
                passed_items.append({
                    "field": field,
                    "problem_number": item_run.get("problem_number"),
                    "source_index": source_index,
                    "actual": normalize_check_actual(check),
                    "expected": check.get("expected"),
                })
            else:
                items.append(build_item_attribution(root, run_dir, item_run, check, source_row, source_flags))

    category_counts = Counter(item["primary_category"] for item in items)
    source_flag_counts = Counter(flag["kind"] for item in items for flag in item.get("source_flags", []))
    json_emission_rate = emitted / all_item_runs if all_item_runs else 0.0
    answer_accuracy_rate = passed / emitted if emitted else 0.0
    dominant = [cat for cat, _count in category_counts.most_common()]

    evidence_files = [
        "source-cmt_data.jsonl",
        "tasks/cmt-hard-research-50/private/gold.json",
        "tasks/cmt-hard-research-50/verify.py",
    ]
    evidence_files.extend(summary["path"] for summary in run_summaries if summary.get("path"))
    evidence_files.extend(rel(path, root) for path in include_driver_logs if Path(path).exists())

    recommendations = []
    if category_counts.get("model_behavior"):
        recommendations.append({
            "target": "model_behavior",
            "action": "Add a final-answer forcing step or two-phase solve-then-answer policy for CMT items that keep reasoning without stdout JSON.",
            "why": "No-timeout runs can still fail if the model never moves from reasoning to final JSON.",
            "retest": "Rerun the model-behavior items only and compare JSON emission rate.",
        })
    if category_counts.get("answer_accuracy"):
        recommendations.append({
            "target": "answer_accuracy",
            "action": "Cluster wrong-but-parseable answers by CMT type and build focused probes for the largest clusters.",
            "why": "These are clean model/domain misses once output and source quality are separated.",
            "retest": "Rerun one representative item per cluster after the reasoning intervention.",
        })
    if category_counts.get("data_source"):
        recommendations.append({
            "target": "data_source",
            "action": "Quarantine high-severity source-flag items from capability scoring until prompt/gold/options are audited.",
            "why": "Source defects produce misleading negative signal for agent iteration.",
            "retest": "Repair or exclude flagged items, then regenerate clean-subset score.",
        })
    if not recommendations:
        recommendations.append({
            "target": "unknown",
            "action": "No failed items were found in the selected run set.",
            "why": "Attribution is only required for failures.",
            "retest": "Run the next larger suite.",
        })

    return OrderedDict([
        ("schema_version", SCHEMA_VERSION),
        ("benchmark_id", BENCHMARK_ID),
        ("task_id", TASK_ID),
        ("run_id", f"cmt50_no_timeout_remaining_audit_{created_date}"),
        ("created_at", created.isoformat(timespec="seconds")),
        ("created_date", created_date),
        ("score", OrderedDict([
            ("passed", passed),
            ("total", all_item_runs),
            ("hard_score", passed / all_item_runs if all_item_runs else 0.0),
        ])),
        ("summary", OrderedDict([
            ("conclusion", "Remaining no-timeout CMT50 items were audited item-by-item with emission, verifier, source-quality, and answer-accuracy evidence separated."),
            ("dominant_failure_modes", dominant),
            ("json_emission_rate", json_emission_rate),
            ("answer_accuracy_rate", answer_accuracy_rate),
            ("notes", [
                f"Selected run set contains {all_item_runs} item runs.",
                f"{emitted} items emitted parseable JSON captured by the runner.",
                f"{passed} captured answers passed the verifier.",
                f"Primary category counts: {dict(category_counts)}.",
                f"Source flag counts among failed items: {dict(source_flag_counts)}.",
            ]),
            ("category_counts", dict(category_counts)),
            ("source_flag_counts", dict(source_flag_counts)),
        ])),
        ("run_summaries", run_summaries),
        ("evidence_files", evidence_files),
        ("probes", [
            {
                "name": "remaining_no_timeout_batches",
                "changed_variable": "removed fixed answer timeout and used 20-minute idle-output guard",
                "result": f"{emitted}/{all_item_runs} items emitted parseable JSON; {passed}/{all_item_runs} passed.",
                "interpretation": "This separates answer-finalization failures from wrong-answer and source-quality failures.",
                "evidence_files": [summary["path"] for summary in run_summaries if summary.get("path")],
            },
            {
                "name": "batch_runner_problem_list_fix",
                "changed_variable": "used ProblemList string parsing for background batch launch",
                "result": "Initial background launch with a comma string failed at PowerShell int[] binding; ProblemList avoids that harness-only failure.",
                "interpretation": "The failed initial launch is a harness issue and is excluded from model scoring.",
                "evidence_files": [rel(path, root) for path in include_driver_logs if Path(path).exists()],
            },
        ]),
        ("items", items),
        ("passed_items", passed_items),
        ("recommended_iterations", recommendations),
    ])


def markdown_value(value, limit=80):
    text = json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else str(value)
    text = text.replace("\n", " ")
    if len(text) > limit:
        return text[: limit - 3] + "..."
    return text


def write_markdown(audit, path):
    lines = []
    lines.append(f"# CMT50 No-Timeout Remaining Attribution Audit {audit.get('created_date', '')}")
    lines.append("")
    lines.append("## Conclusion")
    lines.append("")
    lines.append(audit["summary"]["conclusion"])
    lines.append("")
    score = audit["score"]
    lines.append(f"- Selected items: `{score['total']}`")
    lines.append(f"- Passed: `{score['passed']}/{score['total']}`")
    lines.append(f"- JSON emission rate: `{audit['summary']['json_emission_rate']:.3f}`")
    lines.append(f"- Answer accuracy rate among emitted answers: `{audit['summary']['answer_accuracy_rate']:.3f}`")
    lines.append(f"- Dominant failure modes: `{';'.join(audit['summary']['dominant_failure_modes']) or 'none'}`")
    lines.append("")
    lines.append("## Run Set")
    lines.append("")
    lines.append("| Run label | Items | Passed | Runtime s | Path |")
    lines.append("| --- | ---: | ---: | ---: | --- |")
    for run in audit["run_summaries"]:
        label = run.get("run_label") or run.get("run_id")
        lines.append(
            f"| `{label}` | `{len(run.get('problem_numbers', []))}` | `{run.get('passed')}/{run.get('total')}` | `{run.get('runtime_seconds')}` | `{run.get('path')}` |"
        )
    lines.append("")
    lines.append("## Failure Breakdown")
    lines.append("")
    lines.append("| Primary category | Count |")
    lines.append("| --- | ---: |")
    for category, count in sorted(audit["summary"]["category_counts"].items()):
        lines.append(f"| `{category}` | {count} |")
    lines.append("")
    lines.append("## Item-Level Attribution")
    lines.append("")
    lines.append("| Problem | Field | CMT type | Actual | Expected | JSON | Primary | Source flags | Next action |")
    lines.append("| ---: | --- | --- | --- | --- | --- | --- | --- | --- |")
    for item in audit["items"]:
        flags = ";".join(flag["kind"] for flag in item.get("source_flags", [])) or ""
        lines.append(
            "| {problem} | `{field}` | `{cmt}` | `{actual}` | `{expected}` | `{json}` | `{primary}` | `{flags}` | {action} |".format(
                problem=item.get("problem_number"),
                field=item.get("field"),
                cmt=item.get("cmt_type"),
                actual=markdown_value(item.get("actual")),
                expected=markdown_value(item.get("expected")),
                json=item.get("json_emitted"),
                primary=item.get("primary_category"),
                flags=flags,
                action=item.get("recommended_action"),
            )
        )
    lines.append("")
    lines.append("## Passed Items")
    lines.append("")
    if audit["passed_items"]:
        lines.append("| Problem | Field | Actual | Expected |")
        lines.append("| ---: | --- | --- | --- |")
        for item in audit["passed_items"]:
            lines.append(
                f"| {item.get('problem_number')} | `{item.get('field')}` | `{markdown_value(item.get('actual'))}` | `{markdown_value(item.get('expected'))}` |"
            )
    else:
        lines.append("No selected items passed.")
    lines.append("")
    lines.append("## Probes")
    lines.append("")
    lines.append("| Probe | Changed variable | Result | Interpretation |")
    lines.append("| --- | --- | --- | --- |")
    for probe in audit["probes"]:
        lines.append(
            f"| `{probe['name']}` | {probe['changed_variable']} | {probe['result']} | {probe['interpretation']} |"
        )
    lines.append("")
    lines.append("## Iteration Decision")
    lines.append("")
    for rec in audit["recommended_iterations"]:
        lines.append(f"- `{rec['target']}`: {rec['action']} Why: {rec['why']} Retest: {rec['retest']}")
    lines.append("")
    Path(path).write_text("\n".join(lines), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--benchmark-root", default=".")
    parser.add_argument("--run-glob", action="append", required=True)
    parser.add_argument("--json-out", required=True)
    parser.add_argument("--md-out", required=True)
    parser.add_argument("--driver-log", action="append", default=[])
    args = parser.parse_args()

    root = Path(args.benchmark_root).resolve()
    run_dirs = collect_runs(root, args.run_glob)
    if not run_dirs:
        raise SystemExit("No run directories matched")
    audit = build_audit(root, run_dirs, [root / path for path in args.driver_log])
    Path(args.json_out).write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")
    write_markdown(audit, args.md_out)
    print(json.dumps({
        "runs": len(run_dirs),
        "items": audit["score"]["total"],
        "passed": audit["score"]["passed"],
        "failures": len(audit["items"]),
        "json_emission_rate": audit["summary"]["json_emission_rate"],
        "outputs": [args.json_out, args.md_out],
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
