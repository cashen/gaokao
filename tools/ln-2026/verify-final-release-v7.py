from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION = "v3.9.64.0"
ASSET = "v3964_0"


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
        result = subprocess.run(
            ["git", "for-each-ref", "--format=%(objectname)", "refs/remotes/origin/main"],
            cwd=ROOT, text=True, capture_output=True, check=True
        )
        base_sha = result.stdout.strip()
    if not base_sha:
        base_sha = subprocess.run(
            ["git", "rev-parse", "HEAD^"], cwd=ROOT, text=True, capture_output=True, check=True
        ).stdout.strip()
    changed = subprocess.run(
        ["git", "diff", "--name-only", base_sha, "HEAD", "--",
         "fenxi", "functions/fenxi", "functions/_middleware.js"],
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
        "uiOrchestrationVersion: 'ui-orchestration-v3964_0'",
        "selectionWorkspaceVersion: 'selection-workspace-orchestration-v3964_0'",
        "searchIntentVersion: 'score-school-search-v3964_0'",
        "schoolAllModeVersion: 'school-all-mode-v3964_0'",
        "runtimeCacheVersion: 'runtime-cache-coherence-v3964_0'",
        "reportHistoryPlacement: 'appendix-only'"
    )
    for path in ("ln-rank/active-assets.json", "ln-rank/release-meta.json"):
        data = json.loads(text(path))
        check(data["version"] == VERSION, f"{path} version mismatch")
        check(data["assetVersion"] == ASSET, f"{path} asset mismatch")
        for flag in (
            "staticActionReadinessContract",
            "selectionRuntimeReadinessContract",
            "singleActivePageStylesheetContract",
            "progressiveResultCardContract",
            "reportHistoryAppendixContract",
            "historyNeverParticipatesInCurrentGroupingContract",
            "fullSiteSharedShellV3964Contract"
        ):
            check(data.get(flag) is True, f"{path} missing {flag}")


def verify_ui_and_runtime() -> None:
    contains(
        "ln-rank/index.html",
        'data-release="v3.9.64.0"',
        'data-runtime-state="loading"',
        'data-ui-global-header-mount',
        'id="scoreAdvancedOptions"',
        'id="familyConditionsDetails"',
        '/ln-rank/css/ln-rank-workspace.v3964_0.css?v=3964_0',
        '/ln-rank/js/app.v3964_0.js?v=3964_0'
    )
    contains(
        "ln-rank/selection-pool.html",
        'data-runtime-state="loading"',
        'id="selectionRuntimeStatus"',
        'data-selection-runtime-control disabled',
        '/ln-rank/css/selection-pool.v3964_0.css?v=3964_0',
        '/ln-rank/js/selection-pool.v3964_0.js?v=3964_0'
    )
    main = text("ln-rank/index.html")
    selection = text("ln-rank/selection-pool.html")
    for legacy in (
        "ln-rank-main.v3949_0.css", "ln-rank-selection.v3949_0.css",
        "ln-rank-multi-terminal.v3949_4.css", "gaokao-human-ui.v3950_0.css",
        "family-human-layer.v3952_0.css", "family-decision-workspace.v3955_0.css",
        "selection-workspace.v3963_1.css", "school-all-mode.v3963_0.css"
    ):
        check(legacy not in main, f"main mounts legacy CSS {legacy}")
        check(legacy not in selection, f"selection mounts legacy CSS {legacy}")
    check("ux/multi-terminal" not in selection, "selection mounts old multi-terminal UX")
    check("ux/family-presentation" not in selection, "selection mounts old family-presentation UX")

    owners = (
        "ln-rank/js/app.v3964_0.js",
        "ln-rank/js/app-runtime.v3964_0.js",
        "ln-rank/js/workspace/selection-workspace-orchestrator.v3964_0.js",
        "ln-rank/js/feature/school-majors/school-all-mode.v3964_0.js",
        "ln-rank/js/selection-pool.v3964_0.js",
        "ln-rank/js/selection-pool-runtime.v3964_0.js",
        "shared/ui/shell/family-shell.v3964_0.js",
    )
    for path in owners:
        source = text(path)
        check("MutationObserver" not in source, f"{path} contains MutationObserver")
        check("setTimeout(" not in source, f"{path} contains delayed ownership")
    shell = text("shared/ui/shell/family-shell.v3964_0.js")
    check("queryButton" not in shell and "mobileDirtyButton" not in shell, "shared shell owns business search")
    check("results-title::before" not in text("ln-rank/css/ln-rank-workspace.v3964_0.css"), "generated result title remains")
    check("data-drag-id" not in text("ln-rank/js/selection-pool-runtime.v3964_0.js"), "custom drag owner remains")


def verify_reports_and_site() -> None:
    contains(
        "shared/resources/reports/feishu-report-contract.v3964_0.js",
        "version: 'v1.3.0'",
        "historyPlacement: 'appendix-only'",
        "historyParticipatesInCurrentGrouping: false",
        "ln-physics-report-years-v3964_0"
    )
    for path in (
        "functions/_lib/feishu-report-builder.js",
        "functions/_lib/feishu-selection-pool-report-builder.js",
        "functions/_lib/feishu-selection-pool-styled-builder.js"
    ):
        contains(path, "历史对照附录（不参与2026当前分组）")
    contains(
        "functions/_lib/release-contract.js",
        "六、历史对照附录（不参与2026当前分组）",
        "七、数据和使用边界"
    )
    for path in ("index.html", "ln2026.html", "zy2026/index.html", "zy2026.html", "tongxue/index.html"):
        contains(path, "data-ui-global-header-mount", "data-ui-family-status-mount")
    contains("tongxue/index.html", "哈尔滨工业大学", "tongxue-performance-v157.js?v=157")
    check("data-example=\"hgw\"" not in text("tongxue/index.html"), "non-human Tongxue example remains")


def main() -> None:
    verify_protected_paths()
    verify_release()
    verify_ui_and_runtime()
    verify_reports_and_site()
    print(json.dumps({
        "ok": True,
        "version": VERSION,
        "assetVersion": ASSET,
        "protectedPaths": "unchanged",
        "reportHistoryPlacement": "appendix-only",
        "uiOwnership": "static-structure/shared-shell/business-state"
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
