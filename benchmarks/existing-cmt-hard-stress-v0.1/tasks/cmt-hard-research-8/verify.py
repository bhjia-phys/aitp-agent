import json
import math
import re
import sys
from pathlib import Path


TASK_ROOT = Path(__file__).resolve().parent
GOLD_PATH = TASK_ROOT / "private" / "gold.json"


def load_output(path: Path):
    raw = path.read_bytes()
    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff") or b"\x00" in raw[:64]:
        text = raw.decode("utf-16", errors="replace").strip()
    else:
        text = raw.decode("utf-8", errors="replace").strip()
    text = text.lstrip("\ufeff").strip()
    text = text.lstrip("\u2022*- \t\r\n").strip()

    def parse_jsonish(candidate: str):
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            repaired = re.sub(r"\\(?![\"\\/bfnrtu])", r"\\\\", candidate)
            return json.loads(repaired)

    try:
        return parse_jsonish(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.S)
        if not match:
            raise
        return parse_jsonish(match.group(0))


def unbox(value):
    text = str(value).strip()
    match = re.search(r"\\boxed\s*\{(.+)\}\s*$", text, flags=re.S)
    if match:
        return match.group(1).strip()
    return text


def parse_choice_set(value):
    if isinstance(value, list):
        raw = ";".join(str(v) for v in value)
    else:
        raw = unbox(value)
    tokens = re.findall(r"\b[a-i]\b", raw.lower())
    if not tokens and ";" in raw:
        tokens = [part.strip().lower() for part in raw.split(";") if part.strip()]
    return sorted(set(tokens))


def parse_numeric_vector(value):
    if isinstance(value, list):
        return [float(x) for x in value]
    raw = unbox(value)
    return [float(x) for x in re.findall(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?", raw)]


def norm_symbol(value):
    text = unbox(value)
    text = re.sub(r"\^\{([^{}]+)\}", r"^\1", text)
    text = re.sub(r"\\frac\{1\}\{2\}", "1/2", text)
    text = re.sub(r"\\frac\{([^{}]+)\}\{([^{}]+)\}", r"(\1)/(\2)", text)
    replacements = {
        "\\dagger": "dag",
        "^\\dag": "dag",
        "^dagger": "dag",
        "^dag": "dag",
        "\\uparrow": "up",
        "\\downarrow": "down",
        "\\sigma": "sigma",
        "\\mu": "mu",
        "\\left": "",
        "\\right": "",
        "\\,": "",
        "\\ ": "",
        " ": "",
        "{": "",
        "}": "",
        "\\": "",
        "*": "",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = text.lower()
    text = text.replace("pdaggeri,sigma", "pdag_i_sigma")
    text = text.replace("pdaggerj,sigma", "pdag_j_sigma")
    text = text.replace("pdag_i,sigma", "pdag_i_sigma")
    text = text.replace("pdag_j,sigma", "pdag_j_sigma")
    text = text.replace("pdag_i_sigma", "pdag_i_sigma")
    text = text.replace("pdag_j_sigma", "pdag_j_sigma")
    text = text.replace("p_i,sigma", "p_i_sigma")
    text = text.replace("p_j,sigma", "p_j_sigma")
    text = text.replace("m_i,up", "m_i_up")
    text = text.replace("m_i,down", "m_i_down")
    return text


def grade(gold, actual):
    checks = []
    passed = 0
    for item in gold["checks"]:
        field = item["field"]
        result = {
            "field": field,
            "type": item["type"],
            "source": item.get("source"),
            "source_index": item.get("source_index"),
            "domain": item.get("domain"),
            "difficulty": item.get("difficulty"),
            "passed": False,
            "expected": item.get("expected"),
            "actual_raw": actual.get(field),
        }
        try:
            if item["type"] == "choice_set":
                actual_set = parse_choice_set(actual.get(field))
                expected_set = sorted(item["expected"])
                result.update({"actual_parsed": actual_set, "expected": expected_set, "passed": actual_set == expected_set})
            elif item["type"] == "numeric_vector":
                parsed = parse_numeric_vector(actual.get(field))
                expected = [float(x) for x in item["expected"]]
                abs_tol = item.get("abs_tol", 0.0)
                errors = [abs(a - e) for a, e in zip(parsed, expected)] if len(parsed) == len(expected) else []
                ok = len(parsed) == len(expected) and all(error <= abs_tol for error in errors)
                result.update({"actual_parsed": parsed, "abs_errors": errors, "abs_tol": abs_tol, "passed": ok})
            elif item["type"] == "symbolic":
                actual_norm = norm_symbol(actual.get(field))
                expected_norms = [norm_symbol(item["expected"])]
                expected_norms.extend(norm_symbol(x) for x in item.get("alternatives", []))
                ok = actual_norm in expected_norms
                result.update({"actual_normalized": actual_norm, "expected_normalized": sorted(set(expected_norms)), "passed": ok})
            else:
                result["error"] = f"unknown check type {item['type']!r}"
        except Exception as exc:
            result["error"] = str(exc)
        if result["passed"]:
            passed += 1
        checks.append(result)
    total = len(checks)
    return {
        "benchmark_id": gold["benchmark_id"],
        "task_id": gold["task_id"],
        "hard_score": passed / total if total else math.nan,
        "passed": passed,
        "total": total,
        "checks": checks,
    }


def failed_parse_score(gold, exc):
    checks = []
    for item in gold["checks"]:
        checks.append(
            {
                "field": item["field"],
                "type": item["type"],
                "source": item.get("source"),
                "source_index": item.get("source_index"),
                "domain": item.get("domain"),
                "difficulty": item.get("difficulty"),
                "passed": False,
                "expected": item.get("expected"),
                "actual_raw": None,
                "error": f"no parseable JSON output: {exc}",
            }
        )
    return {
        "benchmark_id": gold["benchmark_id"],
        "task_id": gold["task_id"],
        "hard_score": 0.0,
        "passed": 0,
        "total": len(checks),
        "status": "no_parseable_json_output",
        "checks": checks,
    }


def main(argv):
    if len(argv) != 2:
        print("usage: verify.py OUTPUT_JSON_OR_MD", file=sys.stderr)
        return 2
    gold = json.loads(GOLD_PATH.read_text(encoding="utf-8"))
    try:
        actual = load_output(Path(argv[1]))
        score = grade(gold, actual)
    except Exception as exc:
        score = failed_parse_score(gold, exc)
    print(json.dumps(score, indent=2, ensure_ascii=False))
    return 0 if score["passed"] == score["total"] else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
