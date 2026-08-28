from __future__ import annotations

import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('ln2026_verify_v2', HERE / 'verify-final-release-v2.py')
v2 = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(v2)
base = v2.base
base.VERSION = 'v3.9.60.0'


def contains(path: str, *phrases: str) -> None:
    source = base.text(path)
    for phrase in phrases:
        base.check(phrase in source, f'{path} missing {phrase}')


def verify_manifest_and_chunks() -> None:
    manifest = base.data('fenxi/data/ln-rank-2026/manifest.json')
    base.check(manifest['dataYear'] == 2026, 'manifest data year')
    base.check(manifest['audienceYear'] == 2027, 'manifest audience year')
    base.check(manifest['totalRecords'] == 11628, 'manifest record count')
    base.check(manifest['schoolCount'] == 956, 'manifest school count')
    base.check(manifest['historyMatch'] == {'unmatched': 2699, 'exact': 8929}, 'history match counts')
    total = 0
    schools = set()
    for chunk in manifest['chunks']:
        path = base.ROOT / 'fenxi' / chunk['file']
        base.check(path.exists(), f'missing chunk {chunk["file"]}')
        payload = json.loads(path.read_text(encoding='utf-8'))
        rows = payload if isinstance(payload, list) else payload.get('records', [])
        base.check(len(rows) == chunk['recordCount'], f'chunk count {chunk["file"]}')
        total += len(rows)
        schools.update(row.get('school') for row in rows if row.get('school'))
    base.check(total == manifest['totalRecords'], 'manifest chunk sum')
    base.check(len(schools) == manifest['schoolCount'], 'manifest school sum')


def verify_runtime_current() -> None:
    contains('functions/_lib/release-contract.js', 'shared/resources/release/current-release.js', 'LN_RANK_RELEASE_CONTRACT', 'RELEASE_CONTRACT', 'algorithmOrchestrationContract')
    contains('functions/_lib/exam-year-config.js', 'shared/resources/exam/liaoning-physics.js', 'getExamResourceConfig')
    contains('functions/_lib/rank-table-provider.js', 'ln-2026-physics-score-rank.js', 'ln-2025-physics-score-rank.js')
    contains('ln-rank/js/core/score-guard.js', 'validateExamScore', 'belowVocational', 'belowUndergraduate', 'underSpecial', 'topRange')
    contains('functions/api/major-bands.js', "classificationMode: 'canonical_rank_primary_2026_position'", 'candidateReferenceRank2026', 'resolveCanonicalPosition', 'rankRecords', 'getBottomLineEligibility', 'algorithmOrchestrationVersion')
    base.check("classificationMode: 'score_delta'" not in base.text('functions/api/major-bands.js'), 'legacy score-only classification remains')
    contains('functions/_lib/report-data-service-v3956.js', 'makeDecisionSnapshot', 'current-decision-snapshot', 'canonical-server-rebuild-2026')
    contains('functions/_lib/advisor-fact-builder.js', 'score2026', 'rank2026', 'algorithmVersion')
    contains('shared/algorithms/algorithm-registry.js', 'algorithm-orchestration-v3963', 'rank-primary-2026-position', 'ai-explains-but-does-not-rank')
    contains('shared/algorithms/position/canonical-position.v3963_0.js', 'resolveCanonicalPosition', 'rankGapRatio', 'positionDistance')
    contains('shared/algorithms/ranking/staged-ranking.v3960_0.js', 'eligibilityTier', 'intentTier', 'softPreferenceWeight')


def verify_family_and_ui() -> None:
    contains('index.html', '辽宁高考家庭决策工作台', '先圈出一批可以讨论的专业', '近期公开评论', '时间只帮助安排节奏')
    root = base.text('index.html')
    base.check('近期真实评论' not in root, 'homepage real-review claim')
    contains('ln-rank/index.html', '确认孩子的位置', '说清想看什么', '圈出并整理专业', '家庭逐项复核', '/ln-rank/js/app.v3960_0.js?v=3960_0', 'data-release="v3.9.60.0"', '资源、UI与算法：全站统一调度')
    contains('ln-rank/selection-pool.html', 'id="selected-list"', 'id="family-review"', '检查已选专业', '生成家庭复核报告', '同一算法快照', '/ln-rank/js/selection-pool.v3960_0.js?v=3960_0')
    base.check('family-decision-bar.v3955_0.js' not in base.text('ln-rank/index.html'), 'legacy main family bar active')
    base.check('family-decision-bar.v3955_0.js' not in base.text('ln-rank/selection-pool.html'), 'legacy selection family bar active')
    contains('shared/ui/ui-registry.js', 'ui-registry.v3960_0.js')
    contains('shared/ui/ui-registry.v3960_0.js', 'UI_ORCHESTRATION_VERSION', '#selected-list', '#family-review', 'UI_ACTION_PRIORITY')
    contains('shared/ui/tokens/foundation.v3959_0.css', '--ui-page-bg', '--ui-brand-primary', '--ui-touch-min', '--ui-safe-bottom')
    contains('shared/ui/tokens/semantic.v3959_0.css', '.ui-button', '.ui-state--loading', '.ui-state--pending', '.ui-state--error')
    contains('shared/ui/shell/family-shell.v3960_0.css', '.ui-global-header', '.ui-family-status', '.ui-mobile-nav', 'mobile-dirty-bar', 'pool-entry-toast')
    contains('shared/ui/shell/family-shell.v3960_0.js', '当前家庭方案', 'data-ui-mobile-selected', 'visualViewport', 'ensureUiStyles', 'query.click()')
    shell = base.text('shared/ui/shell/family-shell.v3960_0.js')
    base.check('MutationObserver' not in shell and "fetch('/api/" not in shell, 'shared UI shell changed data or observers')
    contains('shared/ui/shell/family-shell.v3959_0.js', 'family-shell.v3960_0.js')
    contains('ln-rank/js/app.v3960_0.js', 'shared/ui/shell/family-shell.v3960_0.js', 'ALGORITHM_CONTRACT', 'isPublicBottomLineVisible')
    contains('ln-rank/js/selection-pool.v3960_0.js', 'shared/ui/shell/family-shell.v3960_0.js', 'ALGORITHM_CONTRACT')


def verify_reports_and_ai() -> None:
    store = base.text('ln-rank/js/feature/selection-pool/store.js')
    for name in ('getPoolItems', 'savePoolItems', 'addPoolItem', 'removePoolItem', 'clearPoolItems', 'movePoolItem', 'movePoolItemTo', 'sortPoolItems', 'getPoolStats'):
        base.check(f'export function {name}' in store, f'selection store lost {name}')
    report = base.text('functions/_lib/feishu-selection-pool-report-builder.js') + base.text('functions/_lib/feishu-selection-pool-styled-builder.js')
    for key in ('score2026', 'rank2026', 'score2025', 'rank2025', 'score2024', 'rank2024'):
        base.check(key in report, f'report missing {key}')
    base.check('2026最低投档分' in report and '2025最低分' not in report, 'Feishu report is not 2026-first')
    contains('shared/resources/reports/feishu-report-contract.js', 'CURRENT_RELEASE', '/api/feishu-create-report', '/api/feishu-create-selection-pool-report')
    contains('tongxue/index.html', 'tongxue-performance-v156.js?v=156', '同学你好 v1.5.6')
    contains('functions/_lib/ai-card-prompt.js', 'score2026', 'rank2026', '2026专业最低投档分和位次为主事实', 'checks中的年份必须面向2027正式填报')
    history = base.text('functions/_lib/history-score-engine.js')
    base.check('最低投档所需位次' in history and '录取所需位次' not in history, 'history engine wording')


def verify_shared_resources() -> None:
    contains('shared/resources/release/current-release.js', "display: 'v3.9.60.0'", "assetVersion: 'v3960_0'", "algorithmOrchestrationVersion: 'algorithm-orchestration-v3960'", "algorithms: '/shared/algorithms/algorithm-registry.js'")
    contains('shared/resources/exam/liaoning-physics.js', 'specialControlScore: 508', 'undergraduateControlScore: 344', 'vocationalControlScore: 150', 'isPublicBottomLineVisible')
    contains('shared/resources/geo/china-region-catalog.js', 'REGION_OPTIONS', 'REGION_GROUPS', 'matchRegionRule', 'getLiaoningAreaLabel')
    contains('shared/resources/schools/school-resource-center.js', 'resolveCompactSchoolResource', 'resolveCardSchoolResource', 'buildTongxueSchoolHref', 'tongxueDirectoryPromise', "from './school-identity-center.js'")
    contains('shared/resources/schools/school-identity-center.js', "E('dlut-panjin'", 'createEntityAwareResolver')
    contains('shared/resources/schools/school-profile-center.js', 'SCHOOL_PROFILE_ROWS', 'SCHOOL_PROFILE_SPECIALS', '双非（非985/211）')
    contains('shared/resources/majors/major-catalog-contract.js', 'createMajorCatalogResolver', 'canonicalCount: 883')
    contains('tools/schools/school_resource_bundle.py', 'def parse_workbook', 'def build_all', 'write_profile_module', 'write_region_index')
    contains('tools/audit-resource-ownership-v3958.mjs', 'RESOURCE_OWNERSHIP_AUDIT_FAILED')
    contains('tools/audit-ui-orchestration-v3959.mjs', 'UI_ORCHESTRATION_VERSION')
    contains('tools/audit-algorithm-orchestration-v3960.mjs', 'ALGORITHM_ORCHESTRATION_VERSION')


def verify_zy2026() -> None:
    summary = base.data('data/zy2026/summary.json')
    audit = base.data('analysis/2026/zy2026-audit.json')
    base.check(summary['records2026'] == 11628, 'zy2026 record count')
    base.check(audit['coverage']['records2026'] == audit['coverage']['assigned2026'], 'zy2026 coverage')
    page = base.text('zy2026/index.html')
    alias = base.text('zy2026.html')
    runtime = base.text('zy2026/assets/zy2026.v3955_0.js')
    for phrase in ('辽宁2026招生变化发现', '2026投档表首次可见', '2026投档表未再单列', '页面体验版本：v3.9.55.0'):
        base.check(phrase in page + runtime, f'zy2026 missing {phrase}')
    base.check('zy2026.v3959_0.js?v=3959_0' in page, 'zy2026 UI wrapper')
    base.check('不能直接说专业被撤销' in runtime, 'zy2026撤销边界')
    base.check(alias == page, 'zy2026 alias mismatch')


def verify_release_meta() -> None:
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
        'explicitSpecialProjectIntentContract', 'decisionSnapshotContract', 'aiExplainsButDoesNotRankContract'
    )
    for meta in (release, active):
        base.check(meta['version'] == 'v3.9.60.0' and meta['assetVersion'] == 'v3960_0', 'release version')
        for key in required:
            base.check(meta.get(key) is True, f'missing contract {key}')
        base.check(meta['sharedResourceCenterVersion'] == 'v3960_0', 'shared resource version')
        base.check(meta['algorithmOrchestrationVersion'] == 'algorithm-orchestration-v3960', 'algorithm version')
    base.check(active['mainJs'] == 'js/app.v3960_0.js', 'active main JS')
    base.check(active['selectionPoolJs'] == 'js/selection-pool.v3960_0.js', 'active selection JS')
    base.check('js/app.v3960_0.js' in active['jsEntry'] and 'js/app.v3951_0.js' not in active['jsEntry'], 'main wrapper activation')
    base.check('../shared/ui/shell/family-shell.v3960_0.js' in active['jsEntry'], 'shared shell activation')
    base.check('../shared/algorithms/algorithm-registry.js' in active['jsEntry'], 'algorithm owner activation')
    base.check(active['structure2026']['js'] == '../zy2026/assets/zy2026.v3959_0.js', 'zy2026 active JS')


def main() -> None:
    base.verify_protected_paths()
    base.verify_rank_table()
    verify_manifest_and_chunks()
    base.verify_centered_analysis()
    verify_runtime_current()
    verify_family_and_ui()
    verify_reports_and_ai()
    verify_shared_resources()
    verify_zy2026()
    verify_release_meta()
    base.verify_internal_links()
    base.verify_no_temporary_payloads()
    print('LN 2026 v3.9.60.0 resource, UI and algorithm orchestration verification passed')


if __name__ == '__main__':
    main()
