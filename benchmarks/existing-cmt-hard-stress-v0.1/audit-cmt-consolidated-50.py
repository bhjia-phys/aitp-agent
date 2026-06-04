import json
import re
from collections import Counter, OrderedDict
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TASK_ID = "cmt-hard-research-50"
BENCHMARK_ID = "existing-cmt-hard-stress-v0.1"

RUN_SPECS = [
    ("initial_no_timeout_item_1", "20260603-224928__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50"),
    ("initial_no_timeout_item_14", "20260603-224153__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50"),
    ("initial_no_timeout_item_37", "20260603-225658__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50"),
    ("remaining_batch_a", "20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_a"),
    ("remaining_batch_b", "20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_b"),
    ("remaining_batch_c", "20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_c"),
    ("remaining_batch_d", "20260603-233544__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__remaining_batch_d"),
    ("env_rerun_9", "20260604-095602__kimi26_code_allowed_no_answer_timeout_slice__cmt_hard_research_50__env_rerun_9"),
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


def load_source_rows():
    rows = {}
    for line in (ROOT / "source-cmt_data.jsonl").read_text(encoding="utf-8").splitlines():
        if line.strip():
            row = json.loads(line)
            rows[int(row["index"])] = row
    return rows


def load_gold():
    return read_json(ROOT / "tasks" / TASK_ID / "private" / "gold.json")


def load_summary(run_dir):
    paths = sorted((run_dir / "scores").glob("*.no-timeout-slice.summary.json"))
    if not paths:
        raise FileNotFoundError(f"summary missing: {run_dir}")
    return read_json(paths[0])


def collect_latest_records():
    records = {}
    run_summaries = []
    for order, (label, run_name) in enumerate(RUN_SPECS):
        run_dir = ROOT / "runs" / run_name
        summary = load_summary(run_dir)
        metadata = read_json(run_dir / "run-metadata.json")
        checks = {check["field"]: check for check in summary.get("checks", [])}
        run_summaries.append({
            "label": label,
            "run_id": summary.get("run_id", run_name),
            "path": rel(run_dir),
            "passed": summary.get("passed"),
            "total": summary.get("total"),
            "runtime_seconds": metadata.get("runtime_seconds"),
            "problem_numbers": summary.get("problem_numbers"),
        })
        for item_run in summary.get("item_runs", []):
            field = item_run.get("field")
            check = checks.get(field)
            if not check:
                continue
            problem = int(item_run["problem_number"])
            records[problem] = {
                "order": order,
                "run_label": label,
                "run_id": summary.get("run_id", run_name),
                "run_dir": run_dir,
                "item_run": item_run,
                "check": check,
            }
    return records, run_summaries


def parse_option_labels(prompt):
    prompt = prompt or ""
    labels = []
    labels.extend(re.findall(r"(?:^|\s)([a-i])\.\s+", prompt))
    labels.extend(re.findall(r"(?:^|\s|;)\(([a-i])\)\s+", prompt))
    counts = Counter(labels)
    return sorted(label for label, count in counts.items() if count > 1)


def source_flags(source_row, check):
    flags = []
    if not source_row:
        return flags
    dup = parse_option_labels(source_row.get("prompt", ""))
    if dup and check.get("type") == "choice_set":
        flags.append({"kind": "duplicate_option_labels", "value": dup, "severity": "high"})
    if not str(source_row.get("solution", "")).strip():
        flags.append({"kind": "missing_source_solution", "severity": "high"})
    return flags


def actual_value(check):
    if "actual_parsed" in check:
        return check["actual_parsed"]
    if "actual_normalized" in check:
        return check["actual_normalized"]
    return check.get("actual_raw")


def text_stats(text):
    lowered = text.lower()
    return {
        "bytes": len(text.encode("utf-8", errors="replace")),
        "lines": text.count("\n") + (1 if text else 0),
        "mentions_gold": any(
            phrase in lowered
            for phrase in [
                "gold answer",
                "gold key",
                "answer key",
                "verifier expected",
                "benchmark key",
                "source key",
            ]
        ),
        "mentions_uncertainty": any(x in lowered for x in ["not sure", "unclear", "guess", "maybe", "i think"]),
        "mentions_computation": any(x in lowered for x in ["derive", "compute", "calculate", "matrix", "eigen", "hamiltonian", "correlation", "determinant", "transfer", "energy", "gradient"]),
    }


def classify_failure(item_run, check, stderr, flags):
    if "auth.login_required" in stderr:
        return "environment", ["harness"], "Kimi CLI auth failure prevented answer generation.", "high"
    if "provider.rate_limit" in stderr or ("429" in stderr and "usage limit" in stderr):
        return "environment", ["harness"], "Kimi CLI quota/rate-limit failure prevented answer generation.", "high"
    if not item_run.get("captured_json"):
        if int(item_run.get("stderr_bytes") or 0) > 100000:
            return "model_behavior", ["harness"], "The model produced extensive reasoning but never finalized stdout JSON for this item.", "high"
        return "model_behavior", ["harness"], "The model did not emit parseable stdout JSON for this item.", "medium"
    if any(flag.get("severity") == "high" for flag in flags):
        return "data_source", ["answer_accuracy", "verifier"], "The item has high-severity source-quality flags, so the score is not clean model-failure evidence.", "high"
    return "answer_accuracy", [], "The model emitted parseable JSON, but the parsed answer did not match the verifier gold.", "high"


def manual_failure_override(problem, primary, secondary, hypothesis, confidence):
    if problem == 1:
        return (
            "data_source",
            ["answer_accuracy"],
            "The source prompt/gold boundary is suspect: the spinful triangular-lattice CDW prompt admits a plausible standard interpretation different from the gold U_1/2.",
            "medium",
        )
    if problem == 14:
        return (
            "answer_accuracy",
            ["data_source"],
            "The model selected the missing-baseline VMC explanation while the benchmark expects support mismatch and high variance; this is best treated as a domain-reasoning miss with a source caveat.",
            "high",
        )
    if problem == 37:
        return (
            "data_source",
            ["answer_accuracy", "verifier"],
            "The source prompt has duplicated option label g, and the gold g is ambiguous relative to the written PEPS/CFT procedure.",
            "high",
        )
    return primary, secondary, hypothesis, confidence


def classify_success(item_run, check, stderr, stdout, source_row, flags):
    stats = text_stats(stderr)
    stdout_stats = text_stats(stdout)
    notes = []
    risk = "low"
    category = "capability_supported"
    confidence = "medium"

    if flags:
        risk = "medium"
        category = "needs_source_review"
        confidence = "low"
        notes.append("source row has quality flags despite passing verifier")
    if item_run.get("stderr_bytes", 0) < 500:
        risk = "medium"
        confidence = "low"
        notes.append("little or no reasoning evidence in stderr")
    if stats["mentions_uncertainty"]:
        notes.append("reasoning contains uncertainty language")
    if not stats["mentions_computation"] and check.get("type") != "choice_set":
        risk = "medium"
        notes.append("symbolic/numeric pass lacks obvious computation keywords")
    if stdout_stats["mentions_gold"] or stats["mentions_gold"]:
        risk = "high"
        category = "leakage_suspect"
        confidence = "low"
        notes.append("output/reasoning mentions gold or answer key")
    if item_run.get("captured_json") and item_run.get("stderr_bytes", 0) >= 5000 and risk == "low":
        confidence = "high"
        notes.append("substantial item-specific reasoning before correct JSON")
    if check.get("type") == "choice_set" and risk == "low":
        risk = "medium"
        notes.append("choice-set pass still has lucky-hit risk unless validated by paraphrase rerun")
    if check.get("type") == "symbolic" and str(check.get("expected", "")).strip().lower() in {"a", "b", "c", "d", "e", "f", "g", "h", "i"} and risk == "low":
        risk = "medium"
        notes.append("single-letter symbolic pass has option-like lucky-hit risk")

    return {
        "success_category": category,
        "capability_confidence": confidence,
        "hallucination_or_lucky_hit_risk": risk,
        "reasoning_evidence_summary": notes,
        "stderr_stats": stats,
    }


def build_audit():
    source_rows = load_source_rows()
    gold = load_gold()
    records, run_summaries = collect_latest_records()
    missing = [i for i in range(1, 51) if i not in records]
    if missing:
        raise RuntimeError(f"missing latest records for problems: {missing}")

    items = []
    passed_items = []
    failures = []
    for problem in range(1, 51):
        rec = records[problem]
        item_run = rec["item_run"]
        check = rec["check"]
        field = check["field"]
        source_index = int(check.get("source_index"))
        source_row = source_rows.get(source_index)
        flags = source_flags(source_row, check)
        stderr = read_text(item_run.get("stderr", ""))
        stdout = read_text(item_run.get("stdout", ""))
        common = OrderedDict([
            ("problem_number", problem),
            ("field", field),
            ("source_index", source_index),
            ("cmt_type", check.get("cmt_type")),
            ("run_label", rec["run_label"]),
            ("run_id", rec["run_id"]),
            ("passed", bool(check.get("passed"))),
            ("json_emitted", bool(item_run.get("captured_json"))),
            ("runtime_seconds", float(item_run.get("runtime_seconds") or 0)),
            ("stdout_bytes", int(item_run.get("stdout_bytes") or 0)),
            ("stderr_bytes", int(item_run.get("stderr_bytes") or 0)),
            ("actual", actual_value(check)),
            ("expected", check.get("expected")),
            ("source_flags", flags),
            ("evidence", [
                {"kind": "file", "path": rel(item_run.get("prompt", "")), "note": "single-item prompt"},
                {"kind": "file", "path": rel(item_run.get("stdout", "")), "note": "model stdout"},
                {"kind": "file", "path": rel(item_run.get("stderr", "")), "note": "model stderr/reasoning"},
                {"kind": "source", "path": "source-cmt_data.jsonl", "value": {"index": source_index, "type": source_row.get("type") if source_row else None, "solution": source_row.get("solution") if source_row else None}},
            ]),
        ])
        if check.get("passed"):
            success = classify_success(item_run, check, stderr, stdout, source_row, flags)
            entry = OrderedDict(common)
            entry.update(success)
            entry["review_decision"] = (
                "Count as capability-supported pass"
                if success["success_category"] == "capability_supported" and success["hallucination_or_lucky_hit_risk"] == "low"
                else "Keep pass but review before using as strong capability evidence"
            )
            passed_items.append(entry)
        else:
            primary, secondary, hypothesis, confidence = classify_failure(item_run, check, stderr, flags)
            primary, secondary, hypothesis, confidence = manual_failure_override(problem, primary, secondary, hypothesis, confidence)
            entry = OrderedDict(common)
            entry.update({
                "primary_category": primary,
                "secondary_categories": secondary,
                "root_cause_hypothesis": hypothesis,
                "confidence": confidence,
                "observed_failure": f"actual={actual_value(check)!r}, expected={check.get('expected')!r}, json_emitted={bool(item_run.get('captured_json'))}",
                "recommended_action": {
                    "answer_accuracy": "Use as model/domain-reasoning feedback; inspect stderr and cluster with similar CMT type.",
                    "model_behavior": "Add answer-finalization/self-stop policy and rerun this item.",
                    "environment": "Fix CLI auth/quota and rerun; do not score as model failure.",
                    "data_source": "Audit or quarantine this source row before using it as clean model-failure evidence.",
                }.get(primary, "Collect more evidence and rerun."),
                "retest_plan": "Rerun this item after the corresponding intervention and compare JSON emission plus verifier result.",
            })
            failures.append(entry)
        items.append(common)

    failure_counts = Counter(item["primary_category"] for item in failures)
    success_counts = Counter(item["success_category"] for item in passed_items)
    risk_counts = Counter(item["hallucination_or_lucky_hit_risk"] for item in passed_items)
    score = {"passed": len(passed_items), "total": 50, "hard_score": len(passed_items) / 50}
    created = datetime.now()
    return OrderedDict([
        ("schema_version", "0.1"),
        ("benchmark_id", BENCHMARK_ID),
        ("task_id", TASK_ID),
        ("run_id", f"cmt50_consolidated_latest_audit_{created.date().isoformat()}"),
        ("created_at", created.isoformat(timespec="seconds")),
        ("score", score),
        ("summary", OrderedDict([
            ("conclusion", "Latest per-item CMT50 evidence was consolidated after env reruns; failures were attributed and passing items were reviewed for capability evidence versus lucky/hallucinated hits."),
            ("failure_category_counts", dict(failure_counts)),
            ("success_category_counts", dict(success_counts)),
            ("success_risk_counts", dict(risk_counts)),
            ("json_emission_rate", sum(1 for i in items if i["json_emitted"]) / 50),
            ("notes", [
                "Problems 1,14,37 use the initial no-timeout deep-dive runs.",
                "Problems 24,25,26,38,39,40,48,49,50 use the serial env-rerun-9 results.",
                "All other problems use the remaining-batch final runs.",
                "Passing items are not automatically treated as strong capability evidence; stderr reasoning and source quality are checked.",
            ]),
        ])),
        ("run_summaries", run_summaries),
        ("failures", failures),
        ("passed_item_reviews", passed_items),
        ("recommended_iterations", [
            {
                "target": "answer_accuracy",
                "action": "Cluster failed items by CMT type and build focused probes for each cluster.",
                "why": "Most latest failures are wrong-but-parseable answers, not JSON emission failures.",
                "retest": "Rerun one representative per cluster before rerunning CMT50.",
            },
            {
                "target": "model_behavior",
                "action": "Add final-answer forcing/self-stop after a bounded reasoning budget.",
                "why": "Item 26 showed continuous reasoning for about 2401 s without stdout JSON.",
                "retest": "Rerun item 26 and compare time-to-JSON.",
            },
            {
                "target": "success_review",
                "action": "Treat low-risk capability-supported passes as positive exemplars; manually review medium-risk passes before using them as capability claims.",
                "why": "A passed verifier result alone can hide lucky option hits or source artifacts.",
                "retest": "Rerun medium-risk passes with paraphrased prompts or stricter derivation requirements.",
            },
        ]),
    ])


def short(value, limit=90):
    text = json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else str(value)
    text = text.replace("\n", " ")
    return text if len(text) <= limit else text[: limit - 3] + "..."


def write_markdown(audit, path):
    lines = []
    lines.append("# CMT50 Consolidated Failure And Pass Audit 2026-06-04")
    lines.append("")
    lines.append("## Conclusion")
    lines.append("")
    lines.append(audit["summary"]["conclusion"])
    lines.append("")
    lines.append(f"- Latest score after env rerun overlay: `{audit['score']['passed']}/50`.")
    lines.append(f"- JSON emission rate: `{audit['summary']['json_emission_rate']:.3f}`.")
    lines.append(f"- Failure categories: `{audit['summary']['failure_category_counts']}`.")
    lines.append(f"- Pass review categories: `{audit['summary']['success_category_counts']}`.")
    lines.append(f"- Pass hallucination/lucky-hit risk: `{audit['summary']['success_risk_counts']}`.")
    lines.append("")
    lines.append("## Failed Item Attribution")
    lines.append("")
    lines.append("| Problem | Field | Type | Actual | Expected | JSON | Primary | Next action |")
    lines.append("| ---: | --- | --- | --- | --- | --- | --- | --- |")
    for item in audit["failures"]:
        lines.append(
            f"| {item['problem_number']} | `{item['field']}` | `{item['cmt_type']}` | `{short(item['actual'])}` | `{short(item['expected'])}` | `{item['json_emitted']}` | `{item['primary_category']}` | {item['recommended_action']} |"
        )
    lines.append("")
    lines.append("## Passed Item Review")
    lines.append("")
    lines.append("| Problem | Field | Type | Actual | Evidence category | Risk | Confidence | Decision |")
    lines.append("| ---: | --- | --- | --- | --- | --- | --- | --- |")
    for item in audit["passed_item_reviews"]:
        lines.append(
            f"| {item['problem_number']} | `{item['field']}` | `{item['cmt_type']}` | `{short(item['actual'])}` | `{item['success_category']}` | `{item['hallucination_or_lucky_hit_risk']}` | `{item['capability_confidence']}` | {item['review_decision']} |"
        )
    lines.append("")
    lines.append("## Pass Evidence Notes")
    lines.append("")
    for item in audit["passed_item_reviews"]:
        notes = "; ".join(item.get("reasoning_evidence_summary") or [])
        lines.append(f"- Problem `{item['problem_number']}`: {notes or 'no extra notes'}")
    lines.append("")
    lines.append("## Iteration Decision")
    lines.append("")
    for rec in audit["recommended_iterations"]:
        lines.append(f"- `{rec['target']}`: {rec['action']} Why: {rec['why']} Retest: {rec['retest']}")
    lines.append("")
    Path(path).write_text("\n".join(lines), encoding="utf-8")


def main():
    audit = build_audit()
    json_path = ROOT / "ERROR-ATTRIBUTION-CMT50-CONSOLIDATED-2026-06-04.json"
    md_path = ROOT / "ERROR-ATTRIBUTION-CMT50-CONSOLIDATED-2026-06-04.md"
    json_path.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")
    write_markdown(audit, md_path)
    print(json.dumps({
        "score": audit["score"],
        "failures": len(audit["failures"]),
        "passed_reviews": len(audit["passed_item_reviews"]),
        "failure_counts": audit["summary"]["failure_category_counts"],
        "success_counts": audit["summary"]["success_category_counts"],
        "risk_counts": audit["summary"]["success_risk_counts"],
        "outputs": [str(json_path), str(md_path)],
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
