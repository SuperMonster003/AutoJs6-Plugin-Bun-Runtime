#!/usr/bin/env python3
"""Project archived compatibility JSON into a deterministic, source-bound matrix.

This is an index, not a replacement for the original validators. Adapters read only
their registered report families; they never consult current runtime locks or infer
acceptance from a successful command, a diagnostic control, or a later report.
"""

import argparse
import hashlib
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORT_DIR = Path("docs/compatibility")
REGISTRY = Path("tools/compatibility/matrix-sources.json")
JSON_OUTPUT = REPORT_DIR / "matrix.generated.json"
MARKDOWN_OUTPUT = REPORT_DIR / "MATRIX.md"
ABI_MACHINE = {"arm64-v8a": "aarch64", "x86_64": "x86_64"}
CATEGORIES = {
    "official": "官方运行时的设备记录",
    "experimental": "实验运行时的设备记录",
    "shell": "ADB shell 冒烟记录",
    "diagnostic": "诊断与未接受的尝试",
    "build": "构建证据",
    "supplement": "补充记录",
}
UNITS = {"tests": "测试", "probes": "探针", "modes": "压力模式", "groups": "验收组", "observations": "观测"}


class MatrixError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise MatrixError(message)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def canonical_bytes(path):
    # Match Git's text eol=lf on both Windows and Linux. Do not rewrite sources.
    return path.read_bytes().replace(b"\r\n", b"\n")


def read_json(data):
    return json.loads(data.decode("utf-8"), object_pairs_hook=unique_object)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def first(obj, *keys):
    return next((obj[k] for k in keys if obj.get(k) is not None), None)


def integer(value):
    if value is None:
        return None
    require(type(value) is int or isinstance(value, str) and value.isdecimal(), f"Not an integer: {value!r}")
    value = int(value)
    require(value >= 0, "Negative count or environment measurement")
    return value


def same(values, label):
    require(bool(values), f"Missing {label}")
    require(all(x == values[0] for x in values), f"Drift within one environment: {label}")
    return values[0]


def selected_records(doc, collection):
    if collection == "root":
        return [("", doc)]
    value = doc[collection]
    if isinstance(value, list):
        return [(f"/{collection}/{i}", item) for i, item in enumerate(value)]
    require(isinstance(value, dict), f"Invalid collection {collection}")
    return [(f"/{collection}", value)]


def resolve_pointer(doc, pointer):
    for token in pointer.split("/")[1:]:
        token = token.replace("~1", "/").replace("~0", "~")
        doc = doc[int(token)] if isinstance(doc, list) else doc[token]
    return doc


def environment(raw, runtime_abi=None):
    abi = first(raw, "abi", "nativeAbi", "primaryAbi")
    machine = first(raw, "kernelMachine", "machine")
    mode = "unrecorded"
    basis = None
    if raw.get("nativeExecution") is True:
        require(not runtime_abi or abi in (None, runtime_abi), "Native execution contradicts device ABI")
        require(not runtime_abi or machine in (None, ABI_MACHINE.get(runtime_abi)), "Native execution contradicts machine")
        mode = "native"
        basis = "explicit nativeExecution"
    elif raw.get("nativeExecution") is False or runtime_abi == "arm64-v8a" and raw.get("nativeArm64Execution") is False:
        mode = "translated"
        basis = "explicit non-native execution"
    elif runtime_abi and abi:
        # An installed x86 payload is native even if an ARM bridge is available.
        if runtime_abi == abi and (machine is None or ABI_MACHINE.get(abi) == machine):
            mode = "native"
            basis = "matching recorded device/payload ABI and machine when available"
        elif runtime_abi != abi or machine and ABI_MACHINE.get(runtime_abi) != machine:
            mode = "translated"
            basis = "recorded device/payload ABI or machine mismatch"
    return {
        "manufacturer": raw.get("manufacturer"), "model": raw.get("model"),
        "api": integer(first(raw, "apiLevel", "api")), "kernel": raw.get("kernel"), "fingerprint": raw.get("fingerprint"),
        "deviceAbi": abi, "runtimeAbi": runtime_abi, "machine": machine,
        "execution": mode, "executionBasis": basis, "bridge": first(raw, "nativeBridge", "bridge", "translation"),
        "pages": integer(first(raw, "pageSizeBytes", "pages", "pageSize")),
        "pageSizeSource": first(raw, "pageSizeSource", "pageSizeMeasurement"),
        "kernelMappingPages": None, "userPageSizeEmulated": None,
    }


def runtime_info(doc, record=None, run=None, abi=None):
    record, run = record or {}, run or {}
    build = record.get("build", doc.get("build")) or {}
    info = doc.get("runtime", {})
    candidate = build.get("jscCandidate") or {}
    source = build.get("source", {})
    revision = first(doc, "bunRevision", "runtimeRevision") or info.get("revision") or candidate.get("revision")
    version = first(doc, "bunVersion", "officialBunVersion") or info.get("version")
    for probe in run.get("probes", []):
        if probe["id"] in ("version", "revision") and probe.get("passed") is True:
            value = probe["stdout"].strip()
            if probe["id"] == "revision":
                require(revision in (None, value), "Runtime revision disagrees with probe")
                revision = value
            else:
                require(version in (None, value), "Runtime version disagrees with probe")
                version = value
    payloads = record.get("payloads", [])
    if not isinstance(payloads, list):
        payloads = []
    payload = next((p for p in payloads if p["abi"] == abi), {})
    build_runtimes = build.get("runtimes", {})
    if isinstance(build_runtimes, list):
        build_runtime = next((p for p in build_runtimes if p["abi"] == abi), {})
    else:
        build_runtime = build_runtimes.get(abi, {})
    hashes = [run.get("runtimeSha256"), payload.get("sha256"), build_runtime.get("sha256")]
    known_hashes = [h for h in hashes if h is not None]
    sha = same(known_hashes, "runtime payload hash") if known_hashes else None
    hash_key = {"arm64-v8a": "arm64Sha256", "x86_64": "x86_64Sha256"}.get(abi)
    sha = sha or info.get(hash_key)
    if abi is not None and abi == info.get("abi"):
        sha = sha or info.get("sha256")
    for item in doc.get("installedPayloads", []):
        if item.get("name") == "libbun_exec.so":
            sha = sha or item["sha256"]
    require(sha is None or isinstance(sha, str) and re.fullmatch(r"[0-9a-f]{64}", sha), "Invalid runtime SHA-256")
    return {
        "version": version, "revision": revision,
        "commit": first(doc, "downstreamBunCommit") or source.get("downstreamHeadCommit")
        or first(info, "downstreamCommit", "downstreamHeadCommit", "commit", "bunCommit", "upstreamCommit"),
        "variant": run.get("variant") or build.get("runtime", {}).get("variant") or build.get("variant") or info.get("variant"),
        "sha256": sha,
        "bytes": run.get("runtimeBytes") or payload.get("bytes") or build_runtime.get("bytes") or info.get("bytes"),
        "jscCandidateKind": candidate.get("kind"), "webkitCommit": candidate.get("webkitCommit"),
    }


def result_round(unit, passed, total, outcome=None, failed_ids=None):
    passed, total = integer(passed), integer(total)
    require(passed is None or total is None or passed <= total, "Passed count exceeds total")
    require(outcome is None or type(outcome) is bool, "Outcome must be boolean or null")
    if outcome is True and total is not None:
        require(passed == total, "Passing round has incomplete counts")
    return {"unit": unit, "passed": passed, "total": total, "reportedPassed": outcome, "failedIds": failed_ids or []}


def row(doc, entry, pointer, env, runtime, rounds, outcome=None, apk=None, env_pointer=None):
    require(outcome is None or type(outcome) is bool, "Report outcome must be boolean or null")
    record = resolve_pointer(doc, pointer)
    veto = outcome is False or any(r["reportedPassed"] is False for r in rounds)
    complete = bool(rounds) and all(r["reportedPassed"] is True for r in rounds)
    status = "failed" if veto else "passed" if complete else "unrecorded"
    excluded = entry["category"] in ("diagnostic", "build", "supplement") or any(
        item.get(key) is False for item in (doc, record) for key in ("compatibilityAcceptance", "countedInAcceptance", "passed")
    )
    return {
        "source": entry["file"], "pointer": pointer, "environmentPointer": env_pointer or pointer,
        "category": entry["category"], "scope": entry["label"],
        "environment": env, "runtime": runtime, "apkSha256": apk, "apkVariant": record.get("apkKind"),
        "rounds": rounds, "recordedOutcome": outcome, "status": status,
        "sourceReportedPassed": doc.get("passed"),
        "acceptedForRecordedScope": status == "passed" and not excluded,
    }


def probe_rows(doc, entry):
    for pointer, record in selected_records(doc, entry["collection"]):
        runs = record.get("runs", record.get("rounds"))
        require(bool(runs), "Probe record has no rounds")
        envs, runtimes, apks, rounds, definitions = [], [], [], [], []
        for run in runs:
            raw_env = run.get("environment", record.get("environment"))
            require(isinstance(raw_env, dict), "Probe environment is missing")
            abi = raw_env["abi"]
            envs.append(environment(raw_env, abi))
            runtimes.append(runtime_info(doc, record, run, abi))
            apks.append(run.get("installedApkSha256"))
            probes = run["probes"]
            require(bool(probes), "Probe round is empty")
            ids = [p["id"] for p in probes]
            require(len(ids) == len(set(ids)), "Duplicate probe ID")
            definitions.append(ids)
            if "probes" in doc:
                require(ids == [p["id"] for p in doc["probes"]], "Probe definitions differ from report")
            require(all(type(p.get("passed")) is bool for p in probes), "Probe outcome is missing")
            failed = [p["id"] for p in probes if not p["passed"]]
            rounds.append(result_round("probes", len(probes) - len(failed), len(probes), run["passed"], failed))
        same(definitions, "probe definitions")
        env_pointer = pointer + ("/runs/0/environment" if "runs" in record else "/environment")
        yield row(doc, entry, pointer, same(envs, "environment"), same(runtimes, "runtime"), rounds,
                  record.get("passed"), same(apks, "APK"), env_pointer)


def binder_rows(doc, entry):
    pressure = entry["adapter"] == "pressure"
    for pointer, record in selected_records(doc, entry["collection"]):
        raw_env = record.get("device") or {}
        payloads = record.get("payloads", [])
        abi = payloads[0]["abi"] if len(payloads) == 1 else None
        # Preliminary records sometimes have no installed payload. Preserve unknown.
        env = environment(raw_env, abi)
        rounds, page_facts = [], []
        for run in record["rounds"]:
            if pressure:
                observations = run.get("pressure")
                passed = sum(p["evidence"]["passed"] is True for p in observations) if observations is not None else None
                total = len(doc["modes"])
                if observations:
                    mode_names = [p["evidence"]["mode"] for p in observations]
                    require(len(mode_names) == len(set(mode_names)), "Duplicate pressure mode")
                    require(set(mode_names) <= set(doc["modes"]), "Unknown pressure mode")
                    for p in observations:
                        fact = p["evidence"]
                        page_facts.append((fact["pages"], fact.get("kernelMappingPages"), fact.get("userPageSizeEmulated")))
            else:
                passed = len(run["passedTests"]) if "passedTests" in run else None
                total = len(doc["tests"]) if "tests" in doc else None
                if passed is not None:
                    require(len(set(run["passedTests"])) == passed, "Duplicate Binder test")
                    if "tests" in doc:
                        require(set(run["passedTests"]) <= set(doc["tests"]), "Unknown Binder test")
            outcome = None if passed is None else (not run.get("error") and run.get("status") == 0 and (total is None or passed == total))
            rounds.append(result_round("modes" if pressure else "tests", passed, total, outcome))
        if page_facts:
            pages, kernel, emulated = same(page_facts, "pressure page observations")
            require(env["pages"] == pages, "Pressure pages disagree with device")
            env["kernelMappingPages"], env["userPageSizeEmulated"] = kernel, emulated
        yield row(doc, entry, pointer, env, runtime_info(doc, record, abi=abi), rounds,
                  record.get("passed"), (record.get("apk") or {}).get("sha256"), pointer + "/device")


def official_rows(doc, entry):
    adapter = entry["adapter"]
    for pointer, record in selected_records(doc, entry["collection"]):
        raw_env = record.get("device", record.get("environment", record))
        if adapter == "execution":
            raw_env = doc["environment"]
        abi = first(record, "packagePrimaryCpuAbi", "installedAbi") or first(raw_env, "packagedRuntimeAbi", "abi")
        env = environment(raw_env, abi)
        if adapter == "execution":
            env["execution"] = "native" if record["executionMode"] == "native" else "translated"
            env["executionBasis"] = "explicit executionMode: " + record["executionMode"]
        if adapter == "official-rounds" and raw_env.get("nativeExecution") is True:
            env["deviceAbi"] = env["deviceAbi"] or abi
        rounds = []
        if adapter == "official-rounds":
            for run in record["rounds"]:
                rounds.append(result_round("tests", run["tests"] - run["failures"], run["tests"], run["passed"]))
        elif adapter == "release":
            # The archive records passed acceptance groups, not JUnit denominators.
            rounds = [result_round("groups", record[k], None, True) for k in ("initialGroupsPassed", "restartGroupsPassed")]
        elif adapter == "platform":
            counts = record["instrumentation"]
            rounds = [result_round("tests", counts["passed"], counts["tests"], counts["failed"] == 0)]
        else:
            counts = record["fullInstrumentation"] if adapter == "execution" else record
            passed, failed = counts["testsPassed"], counts["testsFailed"]
            rounds = [result_round("tests", passed, passed + failed, counts["result"] == "passed")]
        runtime = runtime_info(doc, record, abi=abi)
        if adapter == "platform":
            runtime["sha256"] = record.get("installedRuntimeSha256")
        env_pointer = "/environment" if adapter == "execution" else pointer + (
            "/device" if "device" in record else "/environment" if "environment" in record else "")
        yield row(doc, entry, pointer, env, runtime, rounds, record.get("passed"), env_pointer=env_pointer)


def shell_rows(doc, entry):
    for pointer, record in selected_records(doc, entry["collection"]):
        count = record["probeCount"]
        codes = record["exitCodes"]
        require(len(codes) == count, "Shell exit count differs from probe count")
        rounds = [result_round("probes", sum(c == 0 for c in codes), count, record["result"] == "passed")]
        yield row(doc, entry, pointer, environment(record, doc["runtime"]["abi"]),
                  runtime_info(doc, abi=doc["runtime"]["abi"]), rounds)


def trace_rows(doc, entry):
    for pointer, record in selected_records(doc, entry["collection"]):
        runs = record["runs"]
        envs = [environment(r["report"], r["report"]["abi"]) for r in runs]
        rounds = [result_round("observations", None, len(r["report"]["rows"])) for r in runs]
        build = record["build"]
        payload = build["payloads"][build["abi"]]["libbun_exec.so"]
        runtime = runtime_info(doc)
        runtime.update(commit=build["runtimeSourceCommit"], sha256=payload["sha256"], bytes=payload["bytes"])
        yield row(doc, entry, pointer, same(envs, "trace environment"), runtime, rounds,
                  outcome=False if record.get("completed") is False else None,
                  apk=build["apk"]["sha256"], env_pointer=pointer + "/runs/0/report")


ADAPTERS = {
    "probes": probe_rows, "binder": binder_rows, "pressure": binder_rows,
    "legacy-tests": official_rows, "official-rounds": official_rows, "execution": official_rows,
    "platform": official_rows, "release": official_rows, "shell": shell_rows, "trace": trace_rows,
    "index": lambda doc, entry: [],
}


def project_source(doc, entry):
    require(entry["category"] in CATEGORIES, "Unknown source category")
    require(entry["adapter"] in ADAPTERS, "Unknown report adapter")
    if entry["adapter"] == "index":
        require(entry["category"] in ("build", "supplement", "diagnostic"), "Device acceptance cannot use an index-only adapter")
    schema = first(doc, "schemaVersion", "schema")
    require(type(schema) is int and schema == entry["schema"], "Report schema changed")
    require(doc.get("kind") == entry["kind"], "Report kind changed")
    rows = list(ADAPTERS[entry["adapter"]](doc, entry))
    require(bool(rows) or entry["adapter"] == "index", "Report has no device records")
    summary = doc.get("summary")
    if rows and isinstance(summary, dict):
        rounds = [r for item in rows for r in item["rounds"]]
        checks = {"deviceCount": len(rows), "environments": len(rows), "roundCount": len(rounds), "rounds": len(rounds)}
        for unit, suffix in (("tests", "Tests"), ("probes", "Probes"), ("modes", "PressureModes")):
            relevant = [r for r in rounds if r["unit"] == unit]
            if relevant and all(r["passed"] is not None and r["total"] is not None for r in relevant):
                passed = sum(r["passed"] for r in relevant)
                total = sum(r["total"] for r in relevant)
                checks.update({"passed" + suffix: passed, "total" + suffix: total, "failed" + suffix: total - passed})
        for key, value in checks.items():
            if key in summary:
                require(type(summary[key]) is int and summary[key] == value, f"Report summary mismatch: {key}")
    return rows


def build_matrix(root=ROOT):
    registry = read_json(canonical_bytes(root / REGISTRY))
    require(registry["schemaVersion"] == 1, "Unsupported matrix registry schema")
    entries = registry["sources"]
    names = [e["file"] for e in entries]
    require(len(names) == len(set(names)), "Duplicate registered source")
    require(names == sorted(names), "Registry sources must be sorted")
    require(all(re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9.-]+\.json", n) for n in names), "Unsafe source filename")
    actual = {p.name for p in (root / REPORT_DIR).glob("*.json") if p.name != JSON_OUTPUT.name}
    require(actual == set(names), f"Unregistered or missing reports: {sorted(actual.symmetric_difference(names))}")
    sources, rows = [], []
    for entry in entries:
        data = canonical_bytes(root / REPORT_DIR / entry["file"])
        require(digest(data) == entry["sha256"], f"Archived source changed: {entry['file']}")
        doc = read_json(data)
        try:
            projected = project_source(doc, entry)
        except (KeyError, TypeError, AttributeError, MatrixError) as exc:
            raise MatrixError(f"{entry['file']}: {exc}") from exc
        rows.extend(projected)
        sources.append({**entry, "bytesUtf8Lf": len(data), "rows": len(projected),
                        "reportedScope": first(doc, "scope", "note"),
                        "reportedOutcome": first(doc, "passed", "overallResult", "status"),
                        "distributionReady": doc.get("distributionReady"),
                        "summary": doc.get("summary")})
    return {"schemaVersion": 1, "kind": "generated-compatibility-evidence-index",
            "sourceEncoding": "utf8-lf", "crossReportTotalsComputed": False,
            "sources": sources, "rows": rows}


def cell(value):
    if value is None:
        return "未记录"
    return html.escape(str(value), quote=False).replace("|", "&#124;").replace("\r\n", "<br>").replace("\n", "<br>")


def runtime_cell(info):
    values = []
    if info["revision"]:
        values.append(cell(info["revision"]))
    elif info["commit"]:
        values.append("commit " + info["commit"][:12])
    elif info["version"]:
        values.append("Bun " + cell(info["version"]))
    if info["jscCandidateKind"]:
        values.append("大页 JSC 候选")
    if info["sha256"]:
        values.append("SHA " + info["sha256"][:12])
    return "<br>".join(values) or "未记录"


def render_markdown(matrix):
    lines = [
        "# 兼容性证据矩阵", "",
        "<!-- Generated by .python/generate_compatibility_matrix.py. Do not edit. -->", "",
        "本页从已归档 JSON 生成, 用于查找设备、API、执行 ABI、页大小和测试范围. "
        "每行只说明其来源报告和所绑定字节的结果, 不是产品支持清单.", "",
        "官方插件仍要求 Android 13 / API 33+. 实验报告不扩大正式支持范围; "
        "大页 JSC 候选不是已发布的官方替代品. 通过固定套件不等于完整 syscall/API/FD/OEM、长时压力或 Release 验收.", "",
        "- 数字按原报告的各轮分别列出, 不跨报告、APK、运行时或套件求和. 同名套件的重复归档保留独立来源.",
        "- `未记录` 表示该结构化字段缺失, 不从当前 lock、后续设备补充或原始日志猜填. 完整 hash/JSON pointer 见机器索引.",
        "- `页` 是报告记录的应用/用户空间页大小; `内核映射页` 只有该报告直接记录时才列出. "
        "x86 16 KiB 用户页不等于 ARM64 硬件 16 KiB, 也不能证明内核映射页为 16 KiB.",
        "- ABI 栏依次显示设备与执行 payload. 设备存在 ARM bridge 不表示已验证的 x86 ELF 通过它执行. "
        "ADB shell、诊断和补充记录不构成应用完整兼容性验收.",
        "- `通过` 限定于行内套件; `未通过` 保留部分成功计数. 诊断中即使有成功观测也不纳入接受结果. "
        "计数未知的失败不能写成 0/N; Release 验收组不换算为 JUnit 测试.", "",
        f"已索引 {len(matrix['sources'])} 份源报告, {len(matrix['rows'])} 条设备/尝试记录. "
        "[机器索引](matrix.generated.json) 保留完整运行时 hash、每轮结果和源文件 UTF-8/LF SHA-256. "
        "[维护说明](../../tools/compatibility/README.md) 说明新增报告和同步检查方法.", "",
    ]
    for category, title in CATEGORIES.items():
        lines += [f"## {title}", ""]
        for source in matrix["sources"]:
            if source["category"] != category:
                continue
            name = source["file"]
            lines += [f"### {cell(source['label'])}", "", f"来源: [{name}]({name}).", ""]
            if source.get("note"):
                lines += [cell(source["note"]), ""]
            rows = [r for r in matrix["rows"] if r["source"] == name]
            if not rows:
                lines += ["仅列入证据索引, 不生成新的测试通过数. 具体结论及限制见来源.", ""]
                continue
            lines += ["| 来源位置 | 设备 / API | 设备 ABI → payload / 执行 | 页 / 内核映射页 (bytes) | 运行时 | 各轮通过 / 总数 | 结论 |",
                      "| --- | --- | --- | --- | --- | --- | --- |"]
            for r in rows:
                env = r["environment"]
                mode = {"native": "原生", "translated": "翻译", "unrecorded": "执行方式未记录"}[env["execution"]]
                pages = f"{cell(env['pages'])} / {cell(env['kernelMappingPages'])}"
                if env["userPageSizeEmulated"] is True:
                    pages += "<br>用户页 ABI 模拟"
                counts = "; ".join(f"{cell(x['passed'])}/{cell(x['total'])} {UNITS[x['unit']]}" for x in r["rounds"]) or "未运行或未记录轮次"
                status = {"passed": "通过 (限定范围)", "failed": "未通过", "unrecorded": "无通过结论"}[r["status"]]
                if r["status"] == "passed" and not r["acceptedForRecordedScope"]:
                    status = "观测通过, 未接受"
                if category == "diagnostic":
                    status = "诊断, 不计入接受结果" + {"passed": "; 观测通过", "failed": "; 记录失败", "unrecorded": ""}[r["status"]]
                if category == "shell":
                    status += "; 仅 shell UID"
                values = [r["pointer"] or "/", f"{cell(env['model'])}<br>API {cell(env['api'])}",
                          f"{cell(env['deviceAbi'])} → {cell(env['runtimeAbi'])}<br>{mode}", pages,
                          runtime_cell(r["runtime"]), counts, status]
                lines.append("| " + " | ".join(values) + " |")
            lines.append("")
    return "\n".join(lines)


def artifacts(root=ROOT):
    matrix = build_matrix(root)
    return {JSON_OUTPUT: json.dumps(matrix, ensure_ascii=False, indent=2) + "\n",
            MARKDOWN_OUTPUT: render_markdown(matrix)}


def generate(root=ROOT, check=False):
    outputs = artifacts(root)  # Validate every source before writing either output.
    stale = [str(p) for p, text in outputs.items()
             if not (root / p).is_file() or canonical_bytes(root / p) != text.encode("utf-8")]
    if check:
        require(not stale, "Stale compatibility matrix: " + ", ".join(stale))
    else:
        for path, text in outputs.items():
            (root / path).write_text(text, encoding="utf-8", newline="\n")
    return stale


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate sources and outputs without writing")
    args = parser.parse_args()
    try:
        generate(check=args.check)
    except (MatrixError, OSError, json.JSONDecodeError) as exc:
        print(f"Compatibility matrix: {exc}", file=sys.stderr)
        return 1
    print("Compatibility matrix: sources and both generated artifacts verified" if args.check else "Compatibility matrix: generated both artifacts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
