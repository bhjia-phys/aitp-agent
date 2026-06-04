import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TASK_ID = "cmt-hard-research-50"
REPORT_DATE = "2026-06-04"
CONSOLIDATED_PATH = ROOT / f"ERROR-ATTRIBUTION-CMT50-CONSOLIDATED-{REPORT_DATE}.json"
GOLD_PATH = ROOT / "tasks" / TASK_ID / "private" / "gold.json"
OUT_JSON = ROOT / f"ANSWER-ACCURACY-CLUSTERS-CMT50-{REPORT_DATE}.json"
OUT_MD = ROOT / f"ANSWER-ACCURACY-CLUSTERS-CMT50-{REPORT_DATE}.md"


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def as_list(value):
    if isinstance(value, list):
        return [str(v) for v in value]
    if value is None:
        return []
    text = str(value).strip()
    if not text:
        return []
    return [part.strip() for part in text.split(";") if part.strip()]


def as_numbers(value):
    if not isinstance(value, list):
        return None
    nums = []
    for item in value:
        try:
            nums.append(float(item))
        except (TypeError, ValueError):
            return None
    return nums


def classify_choice(actual, expected):
    actual_set = set(as_list(actual))
    expected_set = set(as_list(expected))
    missing = sorted(expected_set - actual_set)
    extra = sorted(actual_set - expected_set)
    overlap = sorted(actual_set & expected_set)
    if missing and not extra:
        mode = "choice_set_under_selection"
    elif extra and not missing:
        mode = "choice_set_over_selection"
    elif missing and extra and overlap:
        mode = "choice_set_mixed_substitution"
    elif missing and extra:
        mode = "choice_set_no_overlap"
    else:
        mode = "choice_set_other"
    return mode, {
        "actual_labels": sorted(actual_set),
        "expected_labels": sorted(expected_set),
        "missing_labels": missing,
        "extra_labels": extra,
        "overlap_labels": overlap,
    }


def classify_numeric(actual, expected):
    actual_nums = as_numbers(actual)
    expected_nums = as_numbers(expected)
    detail = {
        "actual_length": len(actual) if isinstance(actual, list) else None,
        "expected_length": len(expected) if isinstance(expected, list) else None,
    }
    if actual_nums is None or expected_nums is None:
        return "numeric_vector_non_numeric_or_malformed", detail
    if len(actual_nums) != len(expected_nums):
        return "numeric_vector_length_mismatch", detail
    diffs = [round(a - e, 6) for a, e in zip(actual_nums, expected_nums)]
    abs_diffs = [abs(x) for x in diffs]
    close_count = sum(1 for d in abs_diffs if d <= 0.01)
    detail.update({
        "max_abs_error": round(max(abs_diffs), 6) if abs_diffs else 0.0,
        "mean_abs_error": round(sum(abs_diffs) / len(abs_diffs), 6) if abs_diffs else 0.0,
        "close_component_count_abs_tol_0_01": close_count,
        "component_count": len(abs_diffs),
        "diffs": diffs,
    })
    if close_count == 0:
        return "numeric_vector_all_components_wrong", detail
    return "numeric_vector_partial_components_wrong", detail


def is_option_letter(text):
    return str(text).strip().lower() in set("abcdefghi") and len(str(text).strip()) == 1


def classify_symbolic(actual, expected):
    actual_text = str(actual or "").strip()
    expected_text = str(expected or "").strip()
    lowered = actual_text.lower()
    detail = {
        "actual_preview": actual_text[:120],
        "expected_preview": expected_text[:120],
    }
    if is_option_letter(actual_text) or is_option_letter(expected_text):
        return "symbolic_option_like_mismatch", detail
    if "¡" in actual_text or "�" in actual_text:
        return "symbolic_notation_or_encoding_mismatch", detail
    if actual_text in {"0", "1"} or len(actual_text) < max(6, len(expected_text) // 4):
        return "symbolic_missing_physical_terms", detail
    return "symbolic_formula_derivation_mismatch", detail


def classify_item(item, check_type):
    primary = item.get("primary_category")
    if primary == "data_source":
        return "data_source_ambiguous_or_defective", {}
    if primary == "model_behavior":
        return "model_behavior_no_final_json", {}
    if check_type == "choice_set":
        return classify_choice(item.get("actual"), item.get("expected"))
    if check_type == "numeric_vector":
        return classify_numeric(item.get("actual"), item.get("expected"))
    if check_type == "symbolic":
        return classify_symbolic(item.get("actual"), item.get("expected"))
    return "unclassified", {}


MODE_LABELS = {
    "choice_set_under_selection": "choice-set under-selection",
    "choice_set_over_selection": "choice-set over-selection",
    "choice_set_mixed_substitution": "choice-set mixed substitution",
    "choice_set_no_overlap": "choice-set no overlap",
    "symbolic_formula_derivation_mismatch": "symbolic formula or normalization mismatch",
    "symbolic_notation_or_encoding_mismatch": "symbolic notation or encoding mismatch",
    "symbolic_missing_physical_terms": "symbolic expression missing physical terms",
    "symbolic_option_like_mismatch": "option-like symbolic mismatch",
    "numeric_vector_partial_components_wrong": "numeric vector partial component errors",
    "numeric_vector_all_components_wrong": "numeric vector all components wrong",
    "numeric_vector_length_mismatch": "numeric vector length mismatch",
    "data_source_ambiguous_or_defective": "data-source or gold-boundary issue",
    "model_behavior_no_final_json": "model behavior: no final JSON",
}

MODE_RECOMMENDATIONS = {
    "choice_set_under_selection": "Force option-by-option necessity checks before emitting the answer set.",
    "choice_set_over_selection": "Add an exclusion pass; every selected label needs positive evidence.",
    "choice_set_mixed_substitution": "Separate support evidence from exclusion evidence for every option.",
    "choice_set_no_overlap": "Treat as concept or prompt-semantics failure, not as formatting trouble.",
    "symbolic_formula_derivation_mismatch": "Check intermediate quantities, limits, dimensions, prefactors, and signs.",
    "symbolic_notation_or_encoding_mismatch": "Normalize to LaTeX-like notation and check stdout encoding/normalization.",
    "symbolic_missing_physical_terms": "Use dimensional and limiting-case checks to catch collapsed expressions.",
    "symbolic_option_like_mismatch": "Handle as a choice-style item, not as strong symbolic-reasoning evidence.",
    "numeric_vector_partial_components_wrong": "Recompute each component and use geometry/symmetry sanity checks.",
    "numeric_vector_all_components_wrong": "Recheck interpretation, units, substitutions, and formula selection.",
    "numeric_vector_length_mismatch": "Check output schema and component ordering.",
    "data_source_ambiguous_or_defective": "Quarantine or repair before using as clean model-failure evidence.",
    "model_behavior_no_final_json": "Handle with convergence controls rather than answer-accuracy feedback.",
}


def main():
    consolidated = read_json(CONSOLIDATED_PATH)
    gold = read_json(GOLD_PATH)
    check_by_field = {check["field"]: check for check in gold["checks"]}

    rows = []
    for item in consolidated["failures"]:
        check = check_by_field[item["field"]]
        check_type = check["type"]
        mode, detail = classify_item(item, check_type)
        rows.append({
            "problem_number": item["problem_number"],
            "field": item["field"],
            "source_index": item["source_index"],
            "cmt_type": item["cmt_type"],
            "check_type": check_type,
            "primary_category": item["primary_category"],
            "failure_mode": mode,
            "failure_mode_label": MODE_LABELS.get(mode, mode),
            "actual": item.get("actual"),
            "expected": item.get("expected"),
            "json_emitted": item.get("json_emitted"),
            "runtime_seconds": item.get("runtime_seconds"),
            "stderr_bytes": item.get("stderr_bytes"),
            "run_label": item.get("run_label"),
            "detail": detail,
        })

    answer_rows = [row for row in rows if row["primary_category"] == "answer_accuracy"]
    by_cmt = defaultdict(list)
    by_mode = defaultdict(list)
    by_check_type = defaultdict(list)
    for row in answer_rows:
        by_cmt[row["cmt_type"]].append(row)
        by_mode[row["failure_mode"]].append(row)
        by_check_type[row["check_type"]].append(row)

    payload = {
        "schema_version": "0.1",
        "benchmark_id": consolidated["benchmark_id"],
        "task_id": consolidated["task_id"],
        "run_id": "cmt50_answer_accuracy_cluster_audit_2026-06-04",
        "created_at": datetime.now().replace(microsecond=0).isoformat(),
        "source_report": CONSOLIDATED_PATH.name,
        "summary": {
            "total_failures": len(rows),
            "answer_accuracy_failures": len(answer_rows),
            "failure_category_counts": dict(Counter(row["primary_category"] for row in rows)),
            "answer_accuracy_by_cmt_type": {
                cmt: len(items)
                for cmt, items in sorted(by_cmt.items(), key=lambda kv: (-len(kv[1]), kv[0]))
            },
            "answer_accuracy_by_check_type": {
                check_type: len(items)
                for check_type, items in sorted(by_check_type.items(), key=lambda kv: (-len(kv[1]), kv[0]))
            },
            "answer_accuracy_by_failure_mode": {
                mode: len(items)
                for mode, items in sorted(by_mode.items(), key=lambda kv: (-len(kv[1]), kv[0]))
            },
        },
        "failure_rows": rows,
        "clusters_by_cmt_type": {
            cmt: [row["problem_number"] for row in items]
            for cmt, items in sorted(by_cmt.items(), key=lambda kv: (-len(kv[1]), kv[0]))
        },
        "clusters_by_failure_mode": {
            mode: [row["problem_number"] for row in items]
            for mode, items in sorted(by_mode.items(), key=lambda kv: (-len(kv[1]), kv[0]))
        },
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "# CMT50 Answer-Accuracy Cluster Audit",
        "",
        f"- Date: {REPORT_DATE}",
        f"- Source report: `{CONSOLIDATED_PATH.name}`",
        f"- Latest effective score context: {consolidated['score']['passed']}/{consolidated['score']['total']}",
        f"- Failures audited: {len(rows)} total; {len(answer_rows)} answer-accuracy failures",
        "",
        "## Conclusion",
        "",
        "The dominant failure is not JSON emission. The latest consolidated run emitted JSON on 49/50 items; the main remaining problem is physics/math answer quality.",
        "Among the 35 answer-accuracy failures, 18 are choice-set mistakes, 12 are symbolic/formula mistakes, and 5 are numeric-vector mistakes.",
        "",
        "## Failure Category Counts",
        "",
        "| Category | Count | Meaning |",
        "| --- | ---: | --- |",
    ]
    category_meaning = {
        "answer_accuracy": "Model produced parseable JSON, but verifier answer was wrong.",
        "data_source": "Problem/gold/source boundary is suspect; do not use as clean model-failure evidence.",
        "model_behavior": "Model did not converge to final JSON in the run evidence.",
    }
    for category, count in sorted(payload["summary"]["failure_category_counts"].items(), key=lambda kv: (-kv[1], kv[0])):
        lines.append(f"| {category} | {count} | {category_meaning.get(category, '')} |")

    lines.extend([
        "",
        "## Answer-Accuracy By CMT Type",
        "",
        "| CMT type | Count | Problems | Dominant surface |",
        "| --- | ---: | --- | --- |",
    ])
    for cmt, items in sorted(by_cmt.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        type_counts = Counter(row["check_type"] for row in items)
        dominant = ", ".join(f"{name}:{count}" for name, count in sorted(type_counts.items(), key=lambda kv: (-kv[1], kv[0])))
        problems = ", ".join(f"#{row['problem_number']}" for row in items)
        lines.append(f"| {cmt} | {len(items)} | {problems} | {dominant} |")

    lines.extend([
        "",
        "## Answer-Accuracy By Failure Mode",
        "",
        "| Failure mode | Count | Problems | Recommended next probe |",
        "| --- | ---: | --- | --- |",
    ])
    for mode, items in sorted(by_mode.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        problems = ", ".join(f"#{row['problem_number']}" for row in items)
        label = MODE_LABELS.get(mode, mode)
        recommendation = MODE_RECOMMENDATIONS.get(mode, "")
        lines.append(f"| {label} | {len(items)} | {problems} | {recommendation} |")

    lines.extend([
        "",
        "## Representative Evidence",
        "",
        "| Problem | Type | Check | Mode | Actual | Expected | Note |",
        "| ---: | --- | --- | --- | --- | --- | --- |",
    ])
    representative_modes = [
        "choice_set_under_selection",
        "choice_set_over_selection",
        "choice_set_mixed_substitution",
        "choice_set_no_overlap",
        "symbolic_formula_derivation_mismatch",
        "symbolic_notation_or_encoding_mismatch",
        "symbolic_missing_physical_terms",
        "numeric_vector_partial_components_wrong",
        "numeric_vector_all_components_wrong",
    ]
    used = set()
    for mode in representative_modes:
        if mode not in by_mode:
            continue
        row = by_mode[mode][0]
        used.add(row["problem_number"])
        actual = str(row["actual"]).replace("\n", " ")[:90]
        expected = str(row["expected"]).replace("\n", " ")[:90]
        note = MODE_RECOMMENDATIONS.get(mode, "")
        lines.append(
            f"| #{row['problem_number']} | {row['cmt_type']} | {row['check_type']} | "
            f"{MODE_LABELS.get(mode, mode)} | `{actual}` | `{expected}` | {note} |"
        )

    lines.extend([
        "",
        "## Non-Answer-Accuracy Items",
        "",
        "| Problem | Category | Type | Evidence-based handling |",
        "| ---: | --- | --- | --- |",
    ])
    for row in rows:
        if row["primary_category"] == "answer_accuracy":
            continue
        if row["primary_category"] == "data_source":
            handling = "Quarantine or repair before counting as model capability evidence."
        elif row["primary_category"] == "model_behavior":
            handling = "Treat as convergence/termination failure; inspect prompt and long stderr separately."
        else:
            handling = "Review separately."
        lines.append(f"| #{row['problem_number']} | {row['primary_category']} | {row['cmt_type']} | {handling} |")

    lines.extend([
        "",
        "## Iteration Implications",
        "",
        "1. For choice-set failures, the next agent loop should force option-by-option evidence and exclusion checks before final JSON.",
        "2. For symbolic and numeric failures, the loop should require dimensional, limiting-case, and component-wise sanity checks before finalization.",
        "3. Data-source suspects (#1 and #37) should be quarantined from capability scoring until the prompt/gold boundary is repaired.",
        "4. Model-behavior failure (#26) should be handled by convergence controls, not by answer-accuracy feedback.",
        "",
    ])
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_MD}")


if __name__ == "__main__":
    main()
