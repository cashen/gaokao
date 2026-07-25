from __future__ import annotations

import importlib.util
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('ln2026_verify_v5', HERE / 'verify-final-release-v5.py')
v5 = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(v5)
v3 = v5.v3
base = v5.base
base.VERSION = 'v3.9.63.1'


def contains(path: str, *phrases: str) -> None:
    source = base.text(path)
    for phrase in phrases:
        base.check(phrase in source, f'{path} missing {phrase}')


def verify_protected_paths_v3963_1() -> None:
    base_sha = os.environ.get('LN_RELEASE_BASE_SHA', '').strip()
    if not base_sha:
        base_sha = base.git('for-each-ref', '--format=%(objectname)', 'refs/remotes/origin/main').strip()
    if not base_sha:
        base_sha = base.git('rev-parse', 'HEAD^')
    protected = ('fenxi', 'functions/fenxi', 'functions/_middleware.js')
    changed = base.git('diff', '--name-only', base_sha, 'HEAD', '--', *protected)
    base.check(not changed, f'protected paths changed:\n{changed}')
    release_contract = base.text('functions/_lib/release-contract.js')
    base.check('export const LN_RANK_RELEASE_CONTRACT' in release_contract, 'LN_RANK_RELEASE_CONTRACT export missing')
    base.check('export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT' in release_contract, 'RELEASE_CONTRACT compatibility export missing')


def verify_family_and_ui_v3963_1() -> None:
    contains('index.html', '辽宁高考家庭决策工作台', 'data-release="v3.9.63.1"', 'data-current-release')
    contains(
        'ln-rank/index.html',
        'data-release="v3.9.63.1"',
        'data-runtime-state="loading"',
        'id="runtimeStatusPanel"',
        'data-runtime-control disabled',
        '/ln-rank/js/app.v3963_1.js?v=3963_1',
        '/ln-rank/css/selection-workspace.v3963_1.css?v=3963_1',
        '/ln-rank/css/school-all-mode.v3963_0.css?v=3963_0',
        '/shared/ui/components/mode-switch.v3963_0.css?v=3963_0',
        'id="schoolViewModeMount"',
        'id="schoolAllResultsPanel"'
    )
    contains(
        'ln-rank/selection-pool.html',
        'data-release="v3.9.63.1"',
        '/ln-rank/js/selection-pool.v3963_1.js?v=3963_1',
        'id="selected-list"',
        'id="family-review"',
        '主要依据2026最低投档分和位次'
    )
    contains(
        'ln-rank/js/app.v3963_1.js',
        "await import('./app-runtime.v3963_1.js?v=3963_1')",
        "setRuntimeState('error')",
        'unlockRuntimeControls',
        '筛选功能没有完整加载'
    )
    contains(
        'ln-rank/js/app-runtime.v3963_1.js',
        'runtime-cache-contract.v3963_1.js?v=3963_1',
        "selection-workspace-orchestrator.v3963_1.js?v=3963_1",
        "school-all-mode.v3963_1.js?v=3963_1",
        'selectionWorkspaceReady',
        'schoolAllModeReady'
    )
    contains(
        'ln-rank/js/workspace/selection-workspace-orchestrator.v3963_1.js',
        "version: 'selection-workspace-orchestration-v3963_1'",
        'submitActiveSearch',
        'SCHOOL_FLOW_STEPS',
        'selectionWorkspaceReady'
    )
    contains(
        'ln-rank/js/feature/school-majors/school-all-mode.v3963_1.js',
        "version: 'school-all-mode-v3963_1'",
        "sharedControlOwner: 'selection-workspace-orchestration-v3963_1'",
        "mountPolicy: 'static-result-owner'",
        'schoolAllModeReady'
    )
    for path in (
        'ln-rank/js/app.v3963_1.js',
        'ln-rank/js/app-runtime.v3963_1.js',
        'ln-rank/js/workspace/selection-workspace-orchestrator.v3963_1.js',
        'ln-rank/js/feature/school-majors/school-all-mode.v3963_1.js'
    ):
        source = base.text(path)
        base.check('MutationObserver' not in source, f'{path} introduced MutationObserver')
    base.check('setTimeout' not in base.text('ln-rank/js/app.v3963_1.js'), 'runtime bootstrap introduced delayed ownership')
    contains(
        'shared/ui/ui-registry.v3963_1.js',
        "UI_ORCHESTRATION_VERSION = 'v3963_1'",
        "workspaceJs: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3963_1.js'",
        "runtimeBootstrap: '/ln-rank/js/app.v3963_1.js'",
        "changedInterfaceCachePolicy: 'new-immutable-url'"
    )
    contains('tools/browser-dual-search-journey-v3963_1.mjs', 'pc-1366', 'pad-820', 'android-390', 'currentReportRequests', 'selectionReportRequests')
    contains('tools/browser-runtime-cache-journey-v3963_1.mjs', 'legacy-cache-isolated', 'runtime-failure-honest')


def verify_shared_resources_v3963_1() -> None:
    contains(
        'shared/resources/release/current-release.js',
        "display: 'v3.9.63.1'",
        "assetVersion: 'v3963_1'",
        "uiOrchestrationVersion: 'ui-orchestration-v3963_1'",
        "selectionWorkspaceVersion: 'selection-workspace-orchestration-v3963_1'",
        "searchIntentVersion: 'score-school-search-v3963_1'",
        "schoolAllModeVersion: 'school-all-mode-v3963_1'",
        "runtimeCacheVersion: 'runtime-cache-coherence-v3963_1'",
        "reports: '/shared/resources/reports/feishu-report-contract.v3963_1.js'"
    )
    contains(
        'shared/resources/release/runtime-cache-contract.v3963_1.js',
        "version: 'runtime-cache-coherence-v3963_1'",
        'changed-interface-gets-new-immutable-url',
        'bootstrap-catches-the-complete-runtime-graph',
        'runtime-failure-is-visible-and-retryable'
    )
    contains(
        'shared/resources/reports/feishu-report-contract.v3963_1.js',
        "version: 'v1.2.0'",
        "version: 'ln-physics-report-years-v3963_1'",
        'primaryDataYear',
        'historicalYears',
        'unpublishedYear',
        'reportCopy'
    )
    contains('shared/resources/reports/feishu-report-contract.js', "export * from './feishu-report-contract.v3963_1.js'")
    contains('shared/resources/release/release-presenter.v3963_1.js', "current-release.js?v=3963_1", 'syncCurrentRelease', 'mountCurrentRelease')
    contains('shared/resources/exam/liaoning-physics.js', 'specialControlScore: 508', 'undergraduateControlScore: 344', 'audienceYear: 2027')


def verify_reports_and_ai_v3963_1() -> None:
    store = base.text('ln-rank/js/feature/selection-pool/store.v3963_1.js')
    for name in ('getPoolItems', 'savePoolItems', 'addPoolItem', 'removePoolItem', 'clearPoolItems', 'movePoolItem', 'movePoolItemTo', 'sortPoolItems', 'getPoolStats'):
        base.check(f'export function {name}' in store, f'selection store lost {name}')
    report = base.text('functions/_lib/feishu-selection-pool-report-builder.js')
    styled = base.text('functions/_lib/feishu-selection-pool-styled-builder.js')
    combined = report + styled
    for key in ('score2026', 'rank2026', 'score2025', 'rank2025', 'score2024', 'rank2024'):
        base.check(key in combined, f'report missing {key}')
    base.check('2026最低投档分' in combined, 'Feishu report missing 2026 primary fields')
    for stale in ('基于 2025 年历史数据生成', '数据口径：辽宁2025', '正式填报以 2026 年'):
        base.check(stale not in combined, f'Feishu report contains stale primary wording: {stale}')
    contains(
        'shared/resources/reports/feishu-report-contract.v3963_1.js',
        'CURRENT_RELEASE',
        '/api/feishu-create-report',
        '/api/feishu-create-selection-pool-report',
        'FEISHU_YEAR_CALIBER',
        "historicalYears: HISTORICAL_YEARS"
    )
    contains(
        'functions/api/path-analysis.js',
        'FEISHU_REPORT_CONTRACT.dataYear',
        'FEISHU_REPORT_CONTRACT.rankYear',
        'FEISHU_REPORT_CONTRACT.audienceYear',
        'FEISHU_YEAR_CALIBER.reportCopy'
    )
    contains(
        'functions/api/feishu-create-selection-pool-report.js',
        'year: FEISHU_REPORT_CONTRACT.dataYear',
        'yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion'
    )
    contains('tools/verify-feishu-report-v3956.mjs', 'FEISHU_REPORT_V3963_1_OK', 'analysisResult.facts.config.year', 'referenceRank')
    contains('tongxue/index.html', 'tongxue-performance-v156.js?v=156', '同学你好 v1.5.6')
    contains('functions/_lib/ai-card-prompt.js', 'score2026', 'rank2026', '2026专业最低投档分和位次为主事实', 'checks中的年份必须面向2027正式填报')
    history = base.text('functions/_lib/history-score-engine.js')
    base.check('最低投档所需位次' in history and '录取所需位次' not in history, 'history engine wording')


def verify_zy2026_v3963_1() -> None:
    summary = base.data('data/zy2026/summary.json')
    audit = base.data('analysis/2026/zy2026-audit.json')
    base.check(summary['records2026'] == 11628, 'zy2026 record count')
    base.check(audit['coverage']['records2026'] == audit['coverage']['assigned2026'], 'zy2026 coverage')
    page = base.text('zy2026/index.html')
    alias = base.text('zy2026.html')
    contains('zy2026/index.html', 'zy2026.v3963_1.js?v=3963_1', 'data-current-release')
    contains('zy2026/assets/zy2026.v3963_1.js', 'family-shell.v3963_1.js?v=3963_1', 'zy2026.v3955_0.js?v=3955_0')
    base.check(alias == page, 'zy2026 alias mismatch')
    contains('ln2026.html', 'major-difficulty-2026.v3963_1.js?v=3963_1', 'data-current-release')
    contains('ln-rank/js/major-difficulty-2026.v3963_1.js', 'family-shell.v3963_1.js?v=3963_1', 'major-difficulty-2026.v3953_0.js?v=3953_0')


def verify_release_meta_v3963_1() -> None:
    required = (
        'familyLanguageTrustContract', 'cardAi2026FirstContract', 'zy2026RecordLanguageContract',
        'sharedResourceCenterContract', 'sharedExamResourceContract', 'sharedRegionResourceContract',
        'sharedSchoolResourceContract', 'feishuSharedResourceContract', 'feishuThreeEntryRegressionContract',
        'unifiedResourceOwnershipContract', 'sharedReleaseOwnerContract', 'resourceOwnershipAuditContract',
        'sharedUiOwnershipContract', 'algorithmOrchestrationContract', 'selectionWorkspaceOrchestrationContract',
        'schoolAllModeContract', 'schoolModeStaticMountContract', 'dualSearchIntentContract',
        'runtimeCacheCoherenceContract', 'immutableChangedInterfaceContract',
        'singleRuntimeBootstrapOwnerContract', 'runtimeControlReadinessContract',
        'runtimeFailureHonestyContract', 'runtimeCacheMismatchBrowserRegressionContract',
        'scoreSchoolFeishuBrowserJourneyContract', 'previousImmutableAssetsPreservedContract',
        'feishuYearCaliberContract',
        'feishuServerAuthoritativeYearContract', 'feishuPathAnalysisYearContract',
        'feishu2026PrimaryBrowserPayloadContract'
    )
    for path in ('ln-rank/release-meta.json', 'ln-rank/active-assets.json'):
        meta = base.data(path)
        base.check(meta['version'] == 'v3.9.63.1', f'{path} release version')
        base.check(meta['assetVersion'] == 'v3963_1', f'{path} asset version')
        base.check(meta['sharedResourceCenterVersion'] == 'v3963_1', f'{path} resource center')
        base.check(meta['uiOrchestrationVersion'] == 'ui-orchestration-v3963_1', f'{path} UI version')
        base.check(meta['selectionWorkspaceVersion'] == 'selection-workspace-orchestration-v3963_1', f'{path} workspace version')
        base.check(meta['searchIntentVersion'] == 'score-school-search-v3963_1', f'{path} search version')
        base.check(meta['schoolAllModeVersion'] == 'school-all-mode-v3963_1', f'{path} school version')
        base.check(meta['runtimeCacheContractVersion'] == 'runtime-cache-coherence-v3963_1', f'{path} cache version')
        for key in required:
            base.check(meta.get(key) is True, f'{path} missing contract {key}')
    active = base.data('ln-rank/active-assets.json')
    base.check(active['mainJs'] == 'js/app.v3963_1.js', 'active main JS')
    base.check(active['selectionPoolJs'] == 'js/selection-pool.v3963_1.js', 'active selection JS')
    for entry in (
        'js/app.v3963_1.js',
        'js/app-runtime.v3963_1.js',
        'js/selection-pool.v3963_1.js',
        'js/selection-pool-runtime.v3963_1.js',
        'js/workspace/selection-workspace-orchestrator.v3963_1.js',
        'js/feature/school-majors/school-all-mode.v3963_1.js',
        '../shared/resources/release/runtime-cache-contract.v3963_1.js',
        '../shared/resources/reports/feishu-report-contract.v3963_1.js'
    ):
        base.check(entry in active['jsEntry'], f'missing active entry {entry}')
    base.check('css/selection-workspace.v3963_1.css' in active['cssEntry'], 'workspace CSS not active')
    base.check('css/school-all-mode.v3963_0.css' in active['cssEntry'], 'school result CSS not active')
    base.check(active['structure2026']['js'] == '../zy2026/assets/zy2026.v3963_1.js', 'zy2026 active JS')


base.verify_protected_paths = verify_protected_paths_v3963_1
v3.verify_family_and_ui = verify_family_and_ui_v3963_1
v3.verify_reports_and_ai = verify_reports_and_ai_v3963_1
v3.verify_shared_resources = verify_shared_resources_v3963_1
v3.verify_zy2026 = verify_zy2026_v3963_1
v3.verify_release_meta = verify_release_meta_v3963_1

if __name__ == '__main__':
    base.verify_protected_paths()
    base.verify_rank_table()
    v3.verify_manifest_and_chunks()
    base.verify_centered_analysis()
    v3.verify_runtime_current()
    v3.verify_family_and_ui()
    v3.verify_reports_and_ai()
    v3.verify_shared_resources()
    v3.verify_zy2026()
    v3.verify_release_meta()
    base.verify_internal_links()
    base.verify_no_temporary_payloads()
    print('LN 2026 v3.9.63.1 runtime-cache and report-year release verification passed')
