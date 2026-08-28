#!/usr/bin/env python3
"""Verify the v3.9.90.0 active release without fabricating stable business assets."""
from pathlib import Path
import json
import os
import re
import sys

_SCRIPT_PATH = Path(__file__).resolve()
ROOT = (_SCRIPT_PATH.parents[2] if len(_SCRIPT_PATH.parents) > 2
        else Path(os.environ.get('GITHUB_WORKSPACE') or Path.cwd()).resolve())
errors = []


def text(rel):
    path = ROOT / rel
    if not path.exists():
        errors.append(f"missing {rel}")
        return ""
    return path.read_text(encoding="utf-8")


def require(condition, message):
    if not condition:
        errors.append(message)


def header_block(headers, route):
    match = re.search(rf"(?m)^{re.escape(route)}\n((?:  .*(?:\n|$))+)", headers)
    return match.group(1) if match else ""


current = text("shared/resources/release/current-release.js")
for marker in [
    "display: 'v3.9.90.0'",
    "version: 'v3.9.90.0'",
    "asset: '3990_0'",
    "assetVersion: 'v3990_0'",
    "assetReleaseVersion: 'v3.9.90.0'",
    "siteRuntimeGeneration: 'v3990_0'",
    "siteRuntimeContractVersion: 'site-runtime-coherence-v3990_0'",
    "resourceExecutionVersion: 'resource-execution-v3990_0'",
    "sharedResourceGraphVersion: 'site-resource-graph-v3990_0'",
    "uiResourceRegistryVersion: 'ui-resource-registry-v3990_0'",
    "cssResourceGraphVersion: 'css-resource-graph-v3990_0'",
    "dataResourceGraphVersion: 'data-resource-graph-v3990_0'",
    "resourceDecommissionPolicyVersion: 'resource-decommission-v3990_0'",
    "productionResourceGraphVerificationVersion: 'production-resource-graph-verification-v3990_0'",
    "uiOrchestrationVersion: 'ui-orchestration-v3990_0'",
    "uiComponentExecutionVersion: 'ui-component-execution-v3990_0'",
    "familyActionVersion: 'family-action-v3990_0'",
    "interactionVersion: 'interaction-transaction-v3990_0'",
    "nativeChooserActivationVersion: 'native-chooser-activation-integrity-v3990_0'",
    "runtimeCacheVersion: 'runtime-cache-coherence-v3990_0'",
    "selectionWorkspaceVersion: 'selection-workspace-orchestration-v3990_0'",
    "localStrengthDataVersion: 'local-strength-static-v3971_2'",
    "all211DataVersion: 'all-211-static-v3972_0'",
    "majorBandsVersion: 'major-bands-static-v3972_2'",
    "majorBandsOrchestrationVersion: 'major-bands-single-worker-rank-window-v3990_0'",
    "majorBandsRankIndexVersion: 'major-bands-rank-index-v3990_0'",
    "majorBandsQueryKernelVersion: 'major-bands-rank-query-kernel-v3990_0'",
    "majorBandsPaginationVersion: 'stable-full-id-snapshot-v3990_0'",
    "majorBandsStableWorkerVersion: 'major-bands-bounded-fanout-v3972_5'",
    "uiResourceRegistry: '/shared/ui/ui-resource-registry.v3990_0.js'",
    "familyShell: '/shared/ui/shell/family-shell.v3990_0.js'",
    "familyShellStyles: '/shared/ui/shell/family-shell.v3972_5.css'",
    "familyAction: '/shared/ui/components/family-plan-entry.v3990_0.js'",
    "familyActionStyles: '/shared/ui/components/family-plan-entry.v3972_5.css'",
    "homeRuntime: '/ln-rank/js/ux/family-home.v3990_0.js'",
    "runtimeBootstrap: '/ln-rank/js/app.v3990_0.js'",
    "runtimeSearch: '/ln-rank/js/app-runtime.v3990_0.js'",
    "searchIntentState: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3990_0.js'",
    "interactionRuntime: '/shared/ui/interaction/interaction-transaction.v3990_0.js'",
    "selectionBootstrap: '/ln-rank/js/selection-pool.v3990_0.js'",
    "selectionRuntime: '/ln-rank/js/selection-pool-runtime.v3990_0.js'",
]:
    require(marker in current, f"current release missing {marker}")

required = [
    "AGENTS.md",
    "docs/skills/unified-site-release/SKILL.md",
    "index.html",
    "_headers",
    "Public_company/index.html",
    "shared/resources/resource-registry.js",
    "shared/ui/ui-resource-registry.v3990_0.js",
    "shared/resources/release/site-runtime-contract.v3990_0.js",
    "shared/resources/release/runtime-cache-contract.v3990_0.js",
    "shared/resources/release/release-presenter.v3990_0.js",
    "shared/governance/resource-execution-contract.v3990_0.js",
    "shared/governance/production-resource-verification-contract.v3990_0.js",
    "shared/ui/shell/family-shell.v3990_0.js",
    "shared/ui/shell/family-shell.v3972_5.css",
    "shared/ui/components/family-plan-entry.v3990_0.js",
    "shared/ui/components/family-plan-entry.v3972_5.css",
    "shared/ui/interaction/interaction-transaction.v3990_0.js",
    "shared/ui/interaction/interaction-transaction.v3990_0.css",
    "ln-rank/site-active-generation.v3990_0.json",
    "ln-rank/js/ux/family-home.v3990_0.js",
    "ln-rank/js/app.v3990_0.js",
    "ln-rank/js/app-runtime.v3990_0.js",
    "ln-rank/js/workspace/selection-workspace-orchestrator.v3990_0.js",
    "ln-rank/js/selection-pool.v3990_0.js",
    "ln-rank/js/selection-pool-runtime.v3990_0.js",
    "ln-rank/self-check.html",
    "ln-rank/js/self-check.v3990_0.js",
    "tools/audit-site-runtime-generation-v3990_0.mjs",
    "tools/audit-unified-resource-graph-v3990_0.mjs",
    "tools/browser-native-chooser-activation-v3990_0.mjs",
    "tools/browser-native-chooser-activation-v3990_0-runner.mjs",
    "shared/resources/schools/school-query-contract.v3969_0.js",
    "shared/resources/schools/school-query-engine.v3969_0.js",
    "shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json",
    "ln-rank/js/local-strength/local-strength-app.v3971_2.js",
    "ln-rank/data/local-strength/local-strength-index.v3971_2.json",
    "ln-rank/js/academic-background/all211-static-app.v3972_0.js",
    "ln-rank/data/211-static/211-static-index.v3972_0.json",
    "ln-rank/data/major-bands-static-v3972_2/manifest.json",
    "functions/_lib/major-bands-rank-index.v3990_0.js",
    "functions/_lib/major-bands-rank-bucket-loader.v3990_0.js",
    "functions/_lib/major-bands-rank-query-kernel.v3990_0.js",
    "functions/_lib/major-bands-result-order.v3990_0.js",
    "functions/_lib/major-bands-response-transport.v3990_0.js",
    "tools/audit-major-bands-rank-kernel-v3990_0.mjs",
    "tools/verify-major-bands-preview-concurrency-v3990_0.mjs",
]
for rel in required:
    require((ROOT / rel).exists(), f"missing required {rel}")
for retired in [
    "ln-rank/active-assets.json",
    "ln-rank/release-meta.json",
    ".github/workflows/write-v3969-active-metadata.yml",
]:
    require(not (ROOT / retired).exists(), f"retired active owner remains: {retired}")

home = text("index.html")
for marker in [
    'data-release="v3.9.90.0"',
    'data-site-runtime-generation="v3990_0"',
    'family-shell.v3972_5.css?v=3972_5',
    'family-plan-entry.v3972_5.css?v=3972_5',
    'family-home.v3990_0.js?v=3990_0',
    '家庭方案与逐项复核',
    'data-home-industry-map-entry',
    'href="/Public_company/"',
    '全国上市公司产业落地图',
]:
    require(marker in home, f"home missing {marker}")
require(home.count("data-home-industry-map-entry") == 1, "home industry map entry must have one owner")
for forbidden in [
    "family-home.v3972_5.js?v=3972_5",
    "family-shell.v3972_5.js?v=3972_5",
    'data-release="v3.9.72.5"',
]:
    require(forbidden not in home, f"retired current home resource remains: {forbidden}")

headers = text("_headers")
for route in ["/", "/index.html", "/ln-rank/", "/ln-rank/index.html", "/ln-rank/selection-pool.html"]:
    block = header_block(headers, route)
    require(block, f"headers missing {route}")
    require("Cache-Control: no-cache, max-age=0, must-revalidate" in block, f"{route} must revalidate")

index = text("ln-rank/index.html")
for marker in [
    'data-release="v3.9.90.0"',
    'data-site-runtime-generation="v3990_0"',
    'interaction-transaction.v3990_0.css?v=3990_0',
    'interaction-transaction.v3990_0.js?v=3990_0',
    'app.v3990_0.js?v=3990_0',
    'data-ui-interaction-version="interaction-transaction-v3990_0"',
    'data-ui-family-plan-results-footer',
    'data-ui-family-plan-live',
]:
    require(marker in index, f"main asset shell missing {marker}")
require(index.count('data-ui-navigation="auxiliary-background"') == 2, "auxiliary navigation owner count mismatch")
require('href="/ln-rank/local-mainline.html"' not in index, "local background still uses native href")
require('href="/ln-rank/211-mainline.html"' not in index, "211 background still uses native href")

selection = text("ln-rank/selection-pool.html")
for marker in [
    'data-release="v3.9.90.0"',
    'data-site-runtime-generation="v3990_0"',
    'selection-pool.v3990_0.js?v=3990_0',
    '生成家庭方案报告',
    '知道链接的人可以查看',
]:
    require(marker in selection, f"selection asset shell missing {marker}")
require("selection-pool.v3972_5.js?v=3972_5" not in selection, "selection page mounts retired bootstrap")

interaction = text("shared/ui/interaction/interaction-transaction.v3990_0.js")
for marker in [
    "const VERSION = 'interaction-transaction-v3990_0'",
    "const HAS_POINTER_EVENTS = typeof globalThis.PointerEvent === 'function'",
    "state.activationTimer = globalThis.setTimeout(() => commitNativeActivation(sequence), 0)",
    "preActivationDomMutationPolicy: 'forbidden'",
    "tailGuardStartsAfterOutcome: true",
    "bindPhysicalEvents()",
]:
    require(marker in interaction, f"interaction transaction missing {marker}")
for forbidden in [
    "navigator.userAgent",
    "Alook",
    "action.disabled =",
    "container.inert =",
    "setNavigationAvailability(",
]:
    require(forbidden not in interaction, f"interaction transaction contains forbidden coupling {forbidden}")

runtime = text("ln-rank/js/app-runtime.v3990_0.js")
for marker in [
    "const INTERACTION_VERSION = 'interaction-transaction-v3990_0'",
    "const RUNTIME_VERSION = 'resource-execution-v3990_0'",
    "selection-workspace-orchestrator.v3990_0.js?v=3990_0",
    "url.searchParams.set('siteRuntimeGeneration', CURRENT_RELEASE.siteRuntimeGeneration)",
]:
    require(marker in runtime, f"selection runtime missing {marker}")
workspace = text("ln-rank/js/workspace/selection-workspace-orchestrator.v3990_0.js")
for marker in [
    "const VERSION = 'selection-workspace-orchestration-v3990_0'",
    "const INTERACTION_VERSION = 'interaction-transaction-v3990_0'",
    "selection-workspace-orchestrator.v3969_0.js?v=3969_0",
    "delegateVersion",
    "navigationOwner",
]:
    require(marker in workspace, f"workspace wrapper missing {marker}")

manifest = json.loads(text("ln-rank/site-active-generation.v3990_0.json") or "{}")
require(manifest.get("releaseVersion") == "v3.9.90.0", "active manifest release mismatch")
require(manifest.get("generation") == "v3990_0", "active manifest generation mismatch")
require(manifest.get("queryVersion") == "3990_0", "active manifest query mismatch")
graph = manifest.get("resourceGraph", {})
require(graph.get("version") == "site-resource-graph-v3990_0", "resource graph version mismatch")
require(graph.get("registry") == "/shared/resources/resource-registry.js", "resource registry owner mismatch")
require(graph.get("uiRegistry") == "/shared/ui/ui-resource-registry.v3990_0.js", "UI registry owner mismatch")
require(graph.get("cssVersion") == "css-resource-graph-v3990_0", "CSS graph version mismatch")
require(graph.get("dataVersion") == "data-resource-graph-v3990_0", "data graph version mismatch")
require(graph.get("decommissionPolicyVersion") == "resource-decommission-v3990_0", "decommission policy mismatch")
interaction_contract = manifest.get("interactionContract", {})
require(interaction_contract.get("version") == "interaction-transaction-v3990_0", "interaction manifest mismatch")
require(interaction_contract.get("activationVersion") == "native-chooser-activation-integrity-v3990_0", "activation manifest mismatch")
require(interaction_contract.get("preActivationDomMutation") == "forbidden", "pre-activation mutation policy mismatch")
require(interaction_contract.get("userAgentBranch") == "forbidden", "UA branch policy mismatch")
preserved = manifest.get("preservedBusinessResources", {})
require(preserved.get("tongxue") == "tongxue-runtime-v159-r3968", "Tongxue stable package changed")
require(preserved.get("localStrength") == "local-strength-static-v3971_2", "LocalStrength contract changed")
require(preserved.get("all211") == "all-211-static-v3972_0", "211 contract changed")
require(preserved.get("majorBands") == "major-bands-static-v3972_2", "major-bands contract changed")

self_check = text("ln-rank/self-check.html")
for marker in [
    'data-release="v3.9.90.0"',
    'data-site-runtime-generation="v3990_0"',
    'self-check.v3990_0.js?v=3990_0',
    'family-shell.v3990_0.js?v=3990_0',
]:
    require(marker in self_check, f"self-check missing {marker}")

release_contract = text("functions/_lib/release-contract.js")
for marker in [
    "familyActionSingleOwnerContract: true",
    "familyPlanEntryDocumentFlowContract: true",
    "noFixedMobileFamilyPlanActionContract: true",
    "feishuPublicSharePreservedContract: true",
    "export const LN_RANK_RELEASE_CONTRACT",
    "export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT",
]:
    require(marker in release_contract, f"release contract missing {marker}")

admission = json.loads(text("shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json") or "{}")
require(admission.get("admissionRecordCount") == 11628, "admission record count mismatch")
require(int(admission.get("schoolCount", 0)) >= 900, "admission school count too small")
local_strength = json.loads(text("ln-rank/data/local-strength/local-strength-index.v3971_2.json") or "{}")
require(local_strength.get("version") == "local-strength-static-v3971_2", "LocalStrength version mismatch")
require(len(local_strength.get("records", [])) == 243, "LocalStrength record count mismatch")
all211 = json.loads(text("ln-rank/data/211-static/211-static-index.v3972_0.json") or "{}")
require(len(all211.get("records", [])) == 2494, "211 static record count mismatch")
require(len(all211.get("scoreBands", [])) == 8, "211 score band count mismatch")
major_bands = json.loads(text("ln-rank/data/major-bands-static-v3972_2/manifest.json") or "{}")
require(major_bands.get("version") == "major-bands-static-v3972_2", "major-bands static version mismatch")
require(major_bands.get("recordCount") == 11628, "major-bands record count mismatch")

if errors:
    print("\n".join("ERROR: " + error for error in errors), file=sys.stderr)
    sys.exit(1)

print(json.dumps({
    "ok": True,
    "version": "v3.9.90.0",
    "siteRuntimeGeneration": "v3990_0",
    "resourceGraph": "site-resource-graph-v3990_0",
    "uiRegistry": "ui-resource-registry-v3990_0",
    "interactionTransaction": "interaction-transaction-v3990_0",
    "nativeChooserActivation": "native-chooser-activation-integrity-v3990_0",
    "workspace": "selection-workspace-orchestration-v3990_0",
    "stableCss": ["family-shell.v3972_5.css", "family-plan-entry.v3972_5.css"],
    "tongxue": "tongxue-runtime-v159-r3968",
    "localStrength": "local-strength-static-v3971_2",
    "all211": "all-211-static-v3972_0",
    "majorBands": "major-bands-static-v3972_2",
    "admissionSchools": admission.get("schoolCount"),
    "admissionRecords": admission.get("admissionRecordCount"),
}, ensure_ascii=False, indent=2))
