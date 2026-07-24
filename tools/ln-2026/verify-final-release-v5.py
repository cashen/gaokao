from __future__ import annotations

import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('ln2026_verify_v4', HERE / 'verify-final-release-v4.py')
v4 = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(v4)
v3 = v4.v3
base = v4.base
base.VERSION = 'v3.9.62.0'


def contains(path: str, *phrases: str) -> None:
    source = base.text(path)
    for phrase in phrases:
        base.check(phrase in source, f'{path} missing {phrase}')


def verify_family_and_ui_v3961() -> None:
    contains('index.html', '辽宁高考家庭决策工作台', '先圈出一批可以讨论的专业', '近期公开评论', '时间只帮助安排节奏', 'data-current-release')
    base.check('近期真实评论' not in base.text('index.html'), 'homepage real-review claim')
    contains('ln-rank/index.html', '确认孩子的位置', '说清想看什么', '圈出并整理专业', '家庭逐项复核', '/ln-rank/js/app.v3961_0.js?v=3962_0', '/ln-rank/css/selection-workspace.v3961_0.css?v=3961_0', 'data-release="v3.9.62.0"', 'data-current-release', '资源、UI与算法：全站统一调度')
    main = base.text('ln-rank/index.html')
    for inactive in ('family-decision-bar.v3955_0.js', 'multi-terminal.v3949_4.js', 'family-presentation.v3955_0.js', 'compare-workspace.v3953_0.js'):
        base.check(inactive not in main, f'legacy main layer active: {inactive}')
    contains('ln-rank/selection-pool.html', 'id="selected-list"', 'id="family-review"', '检查已选专业', '生成家庭复核报告', '同一算法快照', '/ln-rank/js/selection-pool.v3960_0.js?v=3961_0', 'data-release="v3.9.62.0"', 'data-current-release')
    base.check('family-decision-bar.v3955_0.js' not in base.text('ln-rank/selection-pool.html'), 'legacy selection family bar active')
    contains('shared/ui/ui-registry.js', 'ui-registry.v3961_0.js')
    contains('shared/ui/ui-registry.v3961_0.js', 'UI_ORCHESTRATION_VERSION', '#selected-list', '#family-review', 'UI_ACTION_PRIORITY', 'SELECTION_WORKSPACE_CONTRACT')
    contains('shared/ui/tokens/foundation.v3959_0.css', '--ui-page-bg', '--ui-brand-primary', '--ui-touch-min', '--ui-safe-bottom')
    contains('shared/ui/tokens/semantic.v3959_0.css', '.ui-button', '.ui-state--loading', '.ui-state--pending', '.ui-state--error')
    contains('shared/ui/shell/family-shell.v3960_0.css', '.ui-global-header', '.ui-family-status', '.ui-mobile-nav', 'mobile-dirty-bar', 'pool-entry-toast')
    contains('shared/ui/shell/family-shell.v3961_0.js', '当前家庭方案', 'data-ui-mobile-selected', 'ensureUiStyles', 'query.click()', 'gaokao:workspace-state', 'gaokao:selection-change')
    contains('shared/resources/release/release-presenter.js', 'CURRENT_RELEASE', 'data-current-release', 'dataset.release', 'dataset.uiRelease', '__GAOKAO_RELEASE__')
    presenter = base.text('shared/resources/release/release-presenter.js')
    base.check('MutationObserver' not in presenter and 'setTimeout' not in presenter, 'release presenter introduced observer or timer')
    contains('shared/ui/shell/family-shell.v3959_0.js', 'release-presenter.js?v=3961_0')
    shell = base.text('shared/ui/shell/family-shell.v3961_0.js')
    base.check('MutationObserver' not in shell and 'visualViewport' not in shell and "fetch('/api/" not in shell, 'shared UI shell changed data, viewport, or observers')
    contains('ln-rank/js/app.v3961_0.js', 'release-presenter.js?v=3961_0', 'shared/ui/shell/family-shell.v3961_0.js', 'ALGORITHM_CONTRACT', 'isPublicBottomLineVisible')
    contains('ln-rank/js/workspace/selection-workspace-orchestrator.v3961_0.js', 'querySnapshotFromDraft', 'committedQuery', "bandFocus: 'all-bands'", 'updateResultWorkspaceStatus', 'shouldKeepRenderedResult')
    contains('ln-rank/js/workspace/result-commit.v3961_0.js', 'presentFamilyResults(root)', 'ensureCompareSlot', 'updateResultWorkspaceStatus')
    contains('ln-rank/js/workspace/family-card-presenter.v3961_0.js', 'presentFamilyResults', 'ensureDecisionSummary', 'ensureTongxueEntry')
    contains('ln-rank/js/workspace/scroll-policy.v3961_0.js', 'userScrollRevision', 'finishQueryScrollIntent', 'intent.revision !== userScrollRevision')
    contains('ln-rank/js/workspace/viewport-orchestrator.v3961_0.js', 'visualViewport', 'orientationchange', 'gaokao:viewport-state')
    for path in ('ln-rank/js/workspace/selection-workspace-orchestrator.v3961_0.js', 'ln-rank/js/workspace/result-commit.v3961_0.js', 'ln-rank/js/workspace/family-card-presenter.v3961_0.js'):
        base.check('MutationObserver' not in base.text(path), f'{path} structural observer')
    contains('ln-rank/js/feature/score-bands/render.v3961_0.js', 'score-band-segmented', 'role="tablist"', '只切换当前列表，不重新查询')
    contains('ln-rank/css/selection-workspace.v3961_0.css', '.score-band-segmented', '.score-band-current', '.ln-result-workspace-status', '.workspace-compare-slot', 'overflow-anchor: none')
    contains('ln-rank/js/selection-pool.v3960_0.js', 'release-presenter.js?v=3961_0', 'shared/ui/shell/family-shell.v3960_0.js', 'ALGORITHM_CONTRACT')
    contains('ln-rank/js/feature/school-majors/school-all-mode.v3962_0.js', 'resolveCompactSchoolResource', 'createSelectionPoolAdapter', "const API_PATH = '/api/school-majors'", 'school-all-mode-v3962')
    contains('ln-rank/css/school-all-mode.v3962_0.css', 'body[data-result-mode="school-all"]', '@media (max-width: 767px)', '@media (max-width: 390px)')
    contains('functions/api/school-majors.js', "../_lib/ln-rank-manifest.js", 'school-identity-center.js', 'canonical-position.v3960_0.js', "mode: 'shared-records-school-exact'")


def verify_shared_resources_v3961() -> None:
    contains('shared/resources/release/current-release.js', "display: 'v3.9.62.0'", "assetVersion: 'v3962_0'", "uiOrchestrationVersion: 'ui-orchestration-v3961'", "selectionWorkspaceVersion: 'selection-workspace-orchestration-v3961'", "algorithmOrchestrationVersion: 'algorithm-orchestration-v3960'", "algorithms: '/shared/algorithms/algorithm-registry.js'")
    contains('shared/resources/release/release-presenter.js', "from './current-release.js'", 'syncCurrentRelease', 'mountCurrentRelease')
    contains('shared/resources/exam/liaoning-physics.js', 'specialControlScore: 508', 'undergraduateControlScore: 344', 'vocationalControlScore: 150', 'isPublicBottomLineVisible')
    contains('shared/resources/geo/china-region-catalog.js', 'REGION_OPTIONS', 'REGION_GROUPS', 'matchRegionRule', 'getLiaoningAreaLabel')
    contains('shared/resources/schools/school-resource-center.js', 'resolveCompactSchoolResource', 'resolveCardSchoolResource', 'buildTongxueSchoolHref', 'tongxueDirectoryPromise', "from './school-identity-center.js'")
    contains('shared/resources/schools/school-identity-center.js', "E('dlut-panjin'", 'createEntityAwareResolver')
    contains('shared/resources/schools/school-profile-center.js', 'SCHOOL_PROFILE_ROWS', 'SCHOOL_PROFILE_SPECIALS', '双非（非985/211）')
    contains('shared/resources/majors/major-catalog-contract.js', 'createMajorCatalogResolver', 'canonicalCount: 883')
    contains('tools/schools/school_resource_bundle.py', 'def parse_workbook', 'def build_all', 'write_profile_module', 'write_region_index')
    contains('tools/audit-resource-ownership-v3958.mjs', 'RESOURCE_OWNERSHIP_AUDIT_FAILED')
    contains('tools/audit-ui-orchestration-v3959.mjs', 'SELECTION_WORKSPACE_CONTRACT', 'releasePresentation')
    contains('tools/audit-selection-workspace-v3961.mjs', 'preservePreviousResultsWhileDirty', 'bandSwitchIsViewOnly')
    contains('tools/audit-algorithm-orchestration-v3960.mjs', 'ALGORITHM_ORCHESTRATION_VERSION')


def verify_zy2026_v3961() -> None:
    summary = base.data('data/zy2026/summary.json')
    audit = base.data('analysis/2026/zy2026-audit.json')
    base.check(summary['records2026'] == 11628, 'zy2026 record count')
    base.check(audit['coverage']['records2026'] == audit['coverage']['assigned2026'], 'zy2026 coverage')
    page = base.text('zy2026/index.html')
    alias = base.text('zy2026.html')
    runtime = base.text('zy2026/assets/zy2026.v3955_0.js')
    for phrase in ('辽宁2026招生变化发现', '2026投档表首次可见', '2026投档表未再单列', 'data-current-release'):
        base.check(phrase in page + runtime, f'zy2026 missing {phrase}')
    base.check('页面体验版本：v3.9.55.0' not in page, 'zy2026 retained legacy visible release owner')
    base.check('zy2026.v3959_0.js?v=3959_0' in page, 'zy2026 UI wrapper')
    base.check('不能直接说专业被撤销' in runtime, 'zy2026撤销边界')
    base.check(alias == page, 'zy2026 alias mismatch')


def verify_release_meta_v3961() -> None:
    release = base.data('ln-rank/release-meta.json')
    active = base.data('ln-rank/active-assets.json')
    required = (
        'familyLanguageTrustContract', 'cardAi2026FirstContract', 'zy2026RecordLanguageContract',
        'sharedResourceCenterContract', 'sharedExamResourceContract', 'sharedRegionResourceContract',
        'sharedSchoolResourceContract', 'sharedSchoolDirectoryLazySingleFlightContract', 'feishuSharedResourceContract',
        'feishuThreeEntryRegressionContract', 'tongxueDirectHandoffContract', 'tongxueDirectResultContract',
        'sharedSchoolProfileContract', 'schoolProfileNatureContract', 'schoolProfile985211Contract',
        'schoolProfileDoubleNonContract', 'schoolProfileCardAlwaysVisibleContract', 'unifiedResourceOwnershipContract',
        'sharedReleaseOwnerContract', 'singleMoeSchoolBuildContract', 'sharedSchoolIdentityOwnerContract',
        'sharedMajorCatalogResolverContract', 'sharedRegionDerivationContract', 'sharedSchoolNaturePriorityContract',
        'resourceOwnershipAuditContract', 'sharedUiOwnershipContract', 'sharedUiTokenContract', 'sharedUiShellContract',
        'sharedUiActionContract', 'sharedUiStateContract', 'sharedUiCopyContract', 'sharedUiSixPageAdapterContract',
        'sharedUiMobileNavigationContract', 'sharedUiKeyboardSafeAreaContract', 'sharedUiSubBrandContract',
        'sharedUiNoNewObserverContract', 'sharedUiResourceOwnershipPreservedContract',
        'sharedUiSingleActionSurfaceContract', 'quietSelectionFeedbackContract', 'selectedReviewDistinctRouteContract',
        'algorithmOrchestrationContract', 'canonicalPositionContract', 'rankAwarePositionContract',
        'stagedRankingTraceContract', 'intentBeforeSoftPreferenceContract', 'bottomLineUnknownTriStateContract',
        'explicitSpecialProjectIntentContract', 'decisionSnapshotContract', 'aiExplainsButDoesNotRankContract',
        'selectionWorkspaceOrchestrationContract', 'draftCommittedQueryContract', 'preserveStaleResultsContract',
        'stableResultSlotsContract', 'singleUiCommitPerIntentContract', 'noStructuralResultObserverContract',
        'singleScrollOwnerContract', 'userScrollWinsContract', 'bandSwitchViewOnlyContract',
        'compareSingleLayoutOwnerContract', 'cardFirstPassPresentationContract', 'selectionEventDedupContract',
        'keyboardViewportSingleOwnerContract', 'androidNoLayoutJitterContract', 'layoutShiftBudgetContract',
        'schoolAllModeContract', 'schoolAllSharedResourceContract', 'schoolAllEntityIsolationContract',
        'schoolAllScoreInvariantContract', 'schoolAllMultiTerminalContract', 'schoolAllSharedSelectionPoolContract'
    )
    for meta in (release, active):
        base.check(meta['version'] == 'v3.9.62.0' and meta['assetVersion'] == 'v3962_0', 'release version')
        for key in required:
            base.check(meta.get(key) is True, f'missing contract {key}')
        base.check(meta['sharedResourceCenterVersion'] == 'v3961_0', 'shared resource version')
        base.check(meta['uiOrchestrationVersion'] == 'ui-orchestration-v3961', 'UI version')
        base.check(meta['selectionWorkspaceVersion'] == 'selection-workspace-orchestration-v3961', 'workspace version')
        base.check(meta['algorithmOrchestrationVersion'] == 'algorithm-orchestration-v3960', 'algorithm version')
    base.check(active['mainJs'] == 'js/app.v3961_0.js', 'active main JS')
    base.check(active['selectionPoolJs'] == 'js/selection-pool.v3960_0.js', 'active selection JS')
    for entry in ('js/app.v3961_0.js', 'js/workspace/selection-workspace-orchestrator.v3961_0.js', 'js/workspace/result-commit.v3961_0.js', 'js/workspace/family-card-presenter.v3961_0.js', 'js/workspace/scroll-policy.v3961_0.js', 'js/workspace/viewport-orchestrator.v3961_0.js', '../shared/ui/shell/family-shell.v3961_0.js', '../shared/algorithms/algorithm-registry.js'):
        base.check(entry in active['jsEntry'], f'missing active entry {entry}')
    for inactive in ('js/app.v3960_0.js', 'js/app.v3951_0.js', 'js/ux/family-presentation.v3955_0.js', 'js/ux/multi-terminal.v3949_4.js', 'js/ux/compare-workspace.v3953_0.js'):
        base.check(inactive not in active['jsEntry'], f'legacy active entry {inactive}')
    base.check('css/selection-workspace.v3961_0.css' in active['cssEntry'], 'workspace CSS not active')
    base.check('css/school-all-mode.v3962_0.css' in active['cssEntry'], 'school-all CSS not active')
    base.check('js/feature/school-majors/school-all-mode.v3962_0.js' in active['jsEntry'], 'school-all JS not active')
    base.check('css/school-all-mode.v3962_0.css' in active['cssEntry'], 'school-all CSS not active')
    base.check('js/feature/school-majors/school-all-mode.v3962_0.js' in active['jsEntry'], 'school-all JS not active')
    base.check('css/school-all-mode.v3962_0.css' in active['cssEntry'], 'school-all CSS not active')
    base.check('js/feature/school-majors/school-all-mode.v3962_0.js' in active['jsEntry'], 'school-all JS not active')
    base.check(active['structure2026']['js'] == '../zy2026/assets/zy2026.v3959_0.js', 'zy2026 active JS')


v3.verify_family_and_ui = verify_family_and_ui_v3961
v3.verify_shared_resources = verify_shared_resources_v3961
v3.verify_zy2026 = verify_zy2026_v3961
v3.verify_release_meta = verify_release_meta_v3961

if __name__ == '__main__':
    v3.main()
    print('LN 2026 v3.9.62.0 selection workspace orchestration verification passed')
