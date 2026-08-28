from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION = "v3.9.65.0"
ASSET = "v3965_0"


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def contains(path: str, *phrases: str) -> None:
    source = text(path)
    for phrase in phrases:
        check(phrase in source, f"{path} missing {phrase}")


def verify_protected_paths() -> None:
    base_sha = os.environ.get("LN_RELEASE_BASE_SHA", "").strip()
    if not base_sha:
        base_sha = subprocess.run(
            ["git", "rev-parse", "origin/main"], cwd=ROOT, text=True, capture_output=True, check=True
        ).stdout.strip()
    changed = subprocess.run(
        ["git", "diff", "--name-only", base_sha, "HEAD", "--", "fenxi", "functions/fenxi", "functions/_middleware.js"],
        cwd=ROOT, text=True, capture_output=True, check=True
    ).stdout.strip()
    check(not changed, f"protected paths changed:\n{changed}")
    contract = text("functions/_lib/release-contract.js")
    check("export const LN_RANK_RELEASE_CONTRACT" in contract, "LN_RANK_RELEASE_CONTRACT export missing")
    check("export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT" in contract, "RELEASE_CONTRACT alias missing")


def verify_release() -> None:
    check(text("VERSION.txt").strip() == VERSION, "root VERSION mismatch")
    check(text("ln-rank/VERSION.txt").strip() == VERSION, "ln-rank VERSION mismatch")
    contains(
        "shared/resources/release/current-release.js",
        f"display: '{VERSION}'",
        f"assetVersion: '{ASSET}'",
        "uiOrchestrationVersion: 'ui-orchestration-v3965_0'",
        "selectionWorkspaceVersion: 'selection-workspace-orchestration-v3965_0'",
        "runtimeCacheVersion: 'runtime-cache-coherence-v3965_0'",
        "reportFrontendVersion: 'feishu-browser-v3965_0'",
        "tongxueRuntimeVersion: 'tongxue-runtime-v159'",
    )
    flags = (
        "feishuOperationSingleOwnerContract",
        "feishuCopyStateRecoveryContract",
        "feishuRepeatedActionLockContract",
        "tongxueSingleRuntimeOwnerContract",
        "tongxueNoSelfMutationObserverContract",
        "tongxueRegionSchoolDirectUnifiedStateContract",
        "tongxueHistoryRefreshContract",
        "tongxueDuplicateBindingGuardContract",
        "tongxueLongTaskRegressionContract",
    )
    for path in ("ln-rank/active-assets.json", "ln-rank/release-meta.json"):
        data = json.loads(text(path))
        check(data["version"] == VERSION, f"{path} version mismatch")
        check(data["assetVersion"] == ASSET, f"{path} asset mismatch")
        check(data.get("selectionWorkspaceVersion") == "selection-workspace-orchestration-v3965_0", f"{path} workspace mismatch")
        check(data.get("runtimeCacheContractVersion") == "runtime-cache-coherence-v3965_0", f"{path} cache mismatch")
        for flag in flags:
            check(data.get(flag) is True, f"{path} missing {flag}")


def verify_active_graph() -> None:
    contains("ln-rank/index.html", 'data-release="v3.9.65.0"', '/ln-rank/js/app.v3965_0.js?v=3965_0')
    contains("ln-rank/selection-pool.html", 'data-release="v3.9.65.0"', '/ln-rank/js/selection-pool.v3965_0.js?v=3965_0')
    contains(
        "ln-rank/js/app-runtime.v3965_0.js",
        "runtime-cache-contract.v3965_0.js?v=3965_0",
        "selection-workspace-orchestrator.v3965_0.js?v=3965_0",
        "family-shell.v3965_0.js?v=3965_0",
    )
    contains(
        "ln-rank/js/workspace/selection-workspace-orchestrator.v3965_0.js",
        "feature/feishu/index.v3965_0.js?v=3965_0",
        "selection-workspace-orchestration-v3965_0",
    )
    contains(
        "tongxue/index.html",
        "tongxue-v159-single-runtime-owner-20260726",
        "tongxue-runtime-v159.js?v=159",
        "同学你好 v1.5.9",
        "data-change-school",
    )
    active = json.loads(text("ln-rank/active-assets.json"))
    for asset in (
        "js/app.v3965_0.js",
        "js/app-runtime.v3965_0.js",
        "js/workspace/selection-workspace-orchestrator.v3965_0.js",
        "js/feature/feishu/index.v3965_0.js",
        "js/feature/feishu/report-state.v3965_0.js",
        "js/feature/feishu/report-render.v3965_0.js",
        "js/feature/feishu/report-controller.v3965_0.js",
        "../tongxue/app/tongxue-runtime-v159.js",
        "../tongxue/app/tongxue-runtime-controller-v159.js",
    ):
        check(asset in active["jsEntry"], f"active JS missing {asset}")
    for legacy in (
        "js/app.v3964_1.js",
        "js/workspace/selection-workspace-orchestrator.v3964_0.js",
        "js/feature/feishu/index.v3964_0.js",
        "../tongxue/app/tongxue-performance-v158.js",
    ):
        check(legacy not in active["jsEntry"], f"legacy active JS remains {legacy}")


def verify_ownership() -> None:
    feishu = text("ln-rank/js/feature/feishu/report-controller.v3965_0.js")
    check("generationPromise" in feishu and "copyPromise" in feishu, "Feishu locks missing")
    check("event.currentTarget" not in feishu, "Feishu retains event object across await")
    tongxue_files = (
        "tongxue/app/tongxue-runtime-v159.js",
        "tongxue/app/tongxue-runtime-controller-v159.js",
        "tongxue/app/tongxue-runtime-search-view-v159.js",
        "tongxue/app/tongxue-runtime-result-view-v159.js",
    )
    for path in tongxue_files:
        source = text(path)
        check("MutationObserver" not in source, f"{path} contains MutationObserver")
        check("setInterval(" not in source, f"{path} contains polling")
        check("setTimeout(" not in source, f"{path} contains delayed ownership")
    controller = text("tongxue/app/tongxue-runtime-controller-v159.js")
    check("observerCount: 0" in controller, "Tongxue observer contract missing")
    check(controller.count("function bindEvents") == 1, "Tongxue binding owner duplicated")
    contract = text("functions/_lib/release-contract.js")
    for flag in (
        "feishuOperationSingleOwnerContract",
        "feishuCopyStateRecoveryContract",
        "feishuRepeatedActionLockContract",
        "tongxueSingleRuntimeOwnerContract",
        "tongxueNoSelfMutationObserverContract",
    ):
        check(f"{flag}: true" in contract, f"release contract missing {flag}")


def verify_years() -> None:
    contains(
        "shared/resources/reports/feishu-report-contract.v3964_0.js",
        "const HISTORICAL_YEARS = Object.freeze([2025, 2024])",
        "primaryDataYear: EXAM.dataYear",
        "rankTableYear: EXAM.rankYear",
        "audienceYear: EXAM.audienceYear",
        "dataYear: EXAM.dataYear",
        "rankYear: EXAM.rankYear",
        "historicalYears: FEISHU_YEAR_CALIBER.historicalYears",
        "historyPlacement: 'appendix-only'",
        "historyParticipatesInCurrentGrouping: false",
    )
    exam = text("shared/resources/exam/liaoning-physics.js")
    for phrase in ("dataYear: 2026", "rankYear: 2026", "audienceYear: 2027"):
        check(phrase in exam, f"shared exam contract missing {phrase}")


def main() -> None:
    verify_protected_paths()
    verify_release()
    verify_active_graph()
    verify_ownership()
    verify_years()
    print(json.dumps({
        "ok": True,
        "version": VERSION,
        "assetVersion": ASSET,
        "protectedPaths": "unchanged",
        "reportOwner": "feishu-operation-owner-v3965_0",
        "tongxueOwner": "tongxue-runtime-v159",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
