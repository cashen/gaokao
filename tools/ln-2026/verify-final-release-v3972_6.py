#!/usr/bin/env python3
"""Verify the v3.9.72.6 active release without fabricating stable business assets."""
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
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
    "display: 'v3.9.72.6'",
    "version: 'v3.9.72.6'",
    "asset: '3972_6'",
    "assetVersion: 'v3972_6'",
    "assetReleaseVersion: 'v3.9.72.6'",
    "siteRuntimeGeneration: 'v3972_6'",
    "siteRuntimeContractVersion: 'site-runtime-coherence-v3972_6'",
    "resourceExecutionVersion: 'resource-execution-v3972_6'",
    "sharedResourceGraphVersion: 'site-resource-graph-v3972_6'",
    "uiResourceRegistryVersion: 'ui-resource-registry-v3972_6'",
    "cssResourceGraphVersion: 'css-resource-graph-v3972_6'",
    "dataResourceGraphVersion: 'data-resource-graph-v3972_6'",
    "resourceDecommissionPolicyVersion: 'resource-decommission-v3972_6'",
    "productionResourceGraphVerificationVersion: 'production-resource-graph-verification-v3972_6'",
    "uiOrchestrationVersion: 'ui-orchestration-v3972_6'",
    "uiComponentExecutionVersion: 'ui-component-execution-v3972_6'",
    "familyActionVersion: 'family-action-v3972_6'",
    "interactionVersion: 'interaction-transaction-v3972_6'",
    "nativeChooserActivationVersion: 'native-chooser-activation-integrity-v3972_6'",
    "runtimeCacheVersion: 'runtime-cache-coherence-v3972_6'",
    "selectionWorkspaceVersion: 'selection-workspace-orchestration-v3972_6'",
    "localStrengthDataVersion: 'local-strength-static-v3971_2'",
    "all211DataVersion: 'all-211-static-v3972_0'",
    "majorBandsVersion: 'major-bands-static-v3972_2'",
    "majorBandsOrchestrationVersion: 'major-bands-bounded-fanout-v3972_5'",
    "uiResourceRegistry: '/shared/ui/ui-resource-registry.v3972_6.js'",
    "familyShell: '/shared/ui/shell/family-shell.v3972_6.js'",
    "familyShellStyles: '/shared/ui/shell/family-shell.v3972_5.css'",
    "familyAction: '/shared/ui/components/family-plan-entry.v3972_6.js'",
    "familyActionStyles: '/shared/ui/components/family-plan-entry.v3972_5.css'",
    "homeRuntime: '/ln-rank/js/ux/family-home.v3972_6.js'",
    "runtimeBootstrap: '/ln-rank/js/app.v3972_6.js'",
    "runtimeSearch: '/ln-rank/js/app-runtime.v3972_6.js'",
    "searchIntentState: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3972_6.js'",
    "interactionRuntime: '/shared/ui/interaction/interaction-transaction.v3972_6.js'",
    "selectionBootstrap: '/ln-rank/js/selection-pool.v3972_6.js'",
    "selectionRuntime: '/ln-rank/js/selection-pool-runtime.v3972_6.js'",
]:
    require(marker in current, f"current release missing {marker}")

required = [
    "AGENTS.md",
    "docs/skills/unified-site-release/SKILL.md",
    "index.html",
    "_headers",
    "Public_company/index.html",
    "shared/resources/resource-registry.js",
    "shared/ui/ui-resource-registry.v3972_6.js",
    "shared/resources/release/site-runtime-contract.v3972_6.js",
    "shared/resources/release/runtime-cache-contract.v3972_6.js",
    "shared/resources/release/release-presenter.v3972_6.js",
    "shared/governance/resource-execution-contract.v3972_6.js",
    "shared/governance/production-resource-verification-contract.v3972_6.js",
    "shared/ui/shell/family-shell.v3972_6.js",
    "shared/ui/shell/family-shell.v3972_5.css",
    "shared/ui/components/family-plan-entry.v3972_6.js",
    "shared/ui/components/family-plan-entry.v3972_5.css",
    "shared/ui/interaction/interaction-transaction.v3972_6.js",
    "shared/ui/interaction/interaction-transaction.v3972_6.css",
    "ln-rank/site-active-generation.v3972_6.json",
    "ln-rank/js/ux/family-home.v3972_6.js",
    "ln-rank/js/app.v3972_6.js",
    "ln-rank/js/app-runtime.v3972_6.js",
    "ln-rank/js/workspace/selection-workspace-orchestrator.v3972_6.js",
    "ln-rank/js/selection-pool.v3972_6.js",
    "ln-rank/js/selection-pool-runtime.v3972_6.js",
    "ln-rank/self-check.html",
    "ln-rank/js/self-check.v3972_6.js",
    "tools/audit-site-runtime-generation-v3972_6.mjs",
    "tools/audit-unified-resource-graph-v3972_6.mjs",
    "tools/browser-native-chooser-activation-v3972_6.mjs",
    "tools/browser-native-chooser-activation-v3972_6-runner.mjs",
    "shared/resources/schools/school-query-contract.v3969_0.js",
    "shared/resources/schools/school-query-engine.v3969_0.js",
    "shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json",
    "ln-rank/js/local-strength/local-strength-app.v3971_2.js",
    "ln-rank/data/local-strength/local-strength-index.v3971_2.json",
    "ln-rank/js/academic-background/all211-static-app.v3972_0.js",
    "ln-rank/data/211-static/211-static-index.v3972_0.json",
    "ln-rank/data/major-bands-static-v3972_2/manifest.json",
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
    'data-release="v3.9.72.6"',
    'data-site-runtime-generation="v3972_6"',
    'family-shell.v3972_5.css?v=3972_5',
    'family-plan-entry.v3972_5.css?v=3972_5',
    'family-home.v3972_6.js?v=3972_6',
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
    'data-release="v3.9.72.6"',
    'data-site-runtime-generation="v3972_6"',
    'interaction-transaction.v3972_6.css?v=3972_6',
    'interaction-transaction.v3972_6.js?v=3972_6',
    'app.v3972_6.js?v=3972_6',
    'data-ui-interaction-version="interaction-transaction-v3972_6"',
    'data-ui-family-plan-results-footer',
    'data-ui-family-plan-live',
]:
    require(marker in index, f"main asset shell missing {marker}")
require(index.count('data-ui-navigation="auxiliary-background"') == 2, "auxiliary navigation owner count mismatch")
require('href="/ln-rank/local-mainline.html"' not in index, "local background still uses native href")
require('href="/ln-rank/211-mainline.html"' not in index, "211 background still uses native href")

selection = text("ln-rank/selection-pool.html")
for marker in [
    'data-release="v3.9.72.6"',
    'data-site-runtime-generation="v3972_6"',
    'selection-pool.v3972_6.js?v=3972_6',
    '生成家庭方案报告',
    '知道链接的人可以查看',
]:
    require(marker in selection, f"selection asset shell missing {marker}")
require("selection-pool.v3972_5.js?v=3972_5" not in selection, "selection page mounts retired bootstrap")

interaction = text("shared/ui/interaction/interaction-transaction.v3972_6.js")
for marker in [
    "const VERSION = 'interaction-transaction-v3972_6'",
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

runtime = text("ln-rank/js/app-runtime.v3972_6.js")
for marker in [
    "const INTERACTION_VERSION = 'interaction-transaction-v3972_6'",
    "const RUNTIME_VERSION = 'resource-execution-v3972_6'",
    "selection-workspace-orchestrator.v3972_6.js?v=3972_6",
    "url.searchParams.set('siteRuntimeGeneration', CURRENT_RELEASE.siteRuntimeGeneration)",
]:
    require(marker in runtime, f"selection runtime missing {marker}")
workspace = text("ln-rank/js/workspace/selection-workspace-orchestrator.v3972_6.js")
for marker in [
    "const VERSION = 'selection-workspace-orchestration-v3972_6'",
    "const INTERACTION_VERSION = 'interaction-transaction-v3972_6'",
    "selection-workspace-orchestrator.v3969_0.js?v=3969_0",
    "delegateVersion",
    "navigationOwner",
]:
    require(marker in workspace, f"workspace wrapper missing {marker}")

manifest = json.loads(text("ln-rank/site-active-generation.v3972_6.json") or "{}")
require(manifest.get("releaseVersion") == "v3.9.72.6", "active manifest release mismatch")
require(manifest.get("generation") == "v3972_6", "active manifest generation mismatch")
require(manifest.get("queryVersion") == "3972_6", "active manifest query mismatch")
graph = manifest.get("resourceGraph", {})
require(graph.get("version") == "site-resource-graph-v3972_6", "resource graph version mismatch")
require(graph.get("registry") == "/shared/resources/resource-registry.js", "resource registry owner mismatch")
require(graph.get("uiRegistry") == "/shared/ui/ui-resource-registry.v3972_6.js", "UI registry owner mismatch")
require(graph.get("cssVersion") == "css-resource-graph-v3972_6", "CSS graph version mismatch")
require(graph.get("dataVersion") == "data-resource-graph-v3972_6", "data graph version mismatch")
require(graph.get("decommissionPolicyVersion") == "resource-decommission-v3972_6", "decommission policy mismatch")
interaction_contract = manifest.get("interactionContract", {})
require(interaction_contract.get("version") == "interaction-transaction-v3972_6", "interaction manifest mismatch")
require(interaction_contract.get("activationVersion") == "native-chooser-activation-integrity-v3972_6", "activation manifest mismatch")
require(interaction_contract.get("preActivationDomMutation") == "forbidden", "pre-activation mutation policy mismatch")
require(interaction_contract.get("userAgentBranch") == "forbidden", "UA branch policy mismatch")
preserved = manifest.get("preservedBusinessResources", {})
require(preserved.get("tongxue") == "tongxue-runtime-v159-r3968", "Tongxue stable package changed")
require(preserved.get("localStrength") == "local-strength-static-v3971_2", "LocalStrength contract changed")
require(preserved.get("all211") == "all-211-static-v3972_0", "211 contract changed")
require(preserved.get("majorBands") == "major-bands-static-v3972_2", "major-bands contract changed")

self_check = text("ln-rank/self-check.html")
for marker in [
    'data-release="v3.9.72.6"',
    'data-site-runtime-generation="v3972_6"',
    'self-check.v3972_6.js?v=3972_6',
    'family-shell.v3972_6.js?v=3972_6',
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
    "version": "v3.9.72.6",
    "siteRuntimeGeneration": "v3972_6",
    "resourceGraph": "site-resource-graph-v3972_6",
    "uiRegistry": "ui-resource-registry-v3972_6",
    "interactionTransaction": "interaction-transaction-v3972_6",
    "nativeChooserActivation": "native-chooser-activation-integrity-v3972_6",
    "workspace": "selection-workspace-orchestration-v3972_6",
    "stableCss": ["family-shell.v3972_5.css", "family-plan-entry.v3972_5.css"],
    "tongxue": "tongxue-runtime-v159-r3968",
    "localStrength": "local-strength-static-v3971_2",
    "all211": "all-211-static-v3972_0",
    "majorBands": "major-bands-static-v3972_2",
    "admissionSchools": admission.get("schoolCount"),
    "admissionRecords": admission.get("admissionRecordCount"),
}, ensure_ascii=False, indent=2))
