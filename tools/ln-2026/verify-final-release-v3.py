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
base.VERSION = 'v3.9.56.0'


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
    contains('functions/_lib/exam-year-config.js', 'shared/resources/exam/liaoning-physics.js', 'getExamResourceConfig')
    contains('functions/_lib/rank-table-provider.js', 'ln-2026-physics-score-rank.js', 'ln-2025-physics-score-rank.js')
    contains('ln-rank/js/core/score-guard.js', 'validateExamScore', 'belowVocational', 'belowUndergraduate', 'underSpecial', 'topRange')
    contains('functions/api/major-bands.js', "classificationMode: 'score_delta'", 'candidateReferenceRank2026', 'chunksSkipped', 'ln-rank-manifest.js')
    contains('functions/_lib/background-position-engine.js', 'referenceAdmissionYear: 2026', 'groupScoreRecords')
    for path in ('functions/api/local-mainline.js', 'functions/api/211-mainline.js'):
        contains(path, 'dataYear: 2026', 'rankYear: 2026', '344—750')


def verify_family_and_reports() -> None:
    contains('index.html', '辽宁高考家庭决策工作台', '先圈出一批可以讨论的专业', '近期公开评论', '时间只帮助安排节奏')
    root = base.text('index.html')
    base.check('近期真实评论' not in root, 'homepage real-review claim')
    contains('ln-rank/index.html', '确认孩子的位置', '说清想看什么', '圈出并整理专业', '家庭逐项复核', '/ln-rank/js/app.v3956_0.js?v=3956_0', 'data-release="v3.9.56.0"')
    contains('ln-rank/selection-pool.html', '检查已选专业', '看看当前方案有没有明显偏科', '生成家庭复核报告', '其他保存方式', '2026年普通类本科批物理类专业投档记录')
    contains('ln-rank/js/ux/family-presentation.v3955_0.js', '为什么出现', '最需要确认', '现在还不知道', '最低投档位置基本稳定', 'tongxue-card-entry', 'shared/resources/schools/school-resource-center.js')
    presentation = base.text('ln-rank/js/ux/family-presentation.v3955_0.js')
    base.check('近两年录取位置基本稳定' not in presentation, 'old admission wording')
    base.check('/tongxue/data/school-entities-v150.js' not in presentation, 'direct Tongxue entity import remains')
    contains('ln-rank/js/ux/family-decision-bar.v3955_0.js', '当前家庭方案', 'data-mobile-selected', 'data-mobile-pending')
    contains('ln-rank/js/ux/family-home.v3955_0.js', 'returning', 'score-ready', '继续检查家庭方案')
    store = base.text('ln-rank/js/feature/selection-pool/store.js')
    for name in ('getPoolItems', 'savePoolItems', 'addPoolItem', 'removePoolItem', 'clearPoolItems', 'movePoolItem', 'movePoolItemTo', 'sortPoolItems', 'getPoolStats'):
        base.check(f'export function {name}' in store, f'selection store lost {name}')
    base.check('lnRank.selectionPool.lnPhysics.2026.v3951' in store and 'historicalOnly: true' in store, 'selection migration contract')
    report = base.text('functions/_lib/feishu-selection-pool-report-builder.js') + base.text('functions/_lib/feishu-selection-pool-styled-builder.js')
    for key in ('score2026', 'rank2026', 'score2025', 'rank2025', 'score2024', 'rank2024'):
        base.check(key in report, f'report missing {key}')
    base.check('2026最低投档分' in report and '2025最低分' not in report, 'Feishu report is not 2026-first')
    contains('functions/_lib/report-data-service-v3956.js', 'ln-rank-manifest.js', 'selectedRecords', 'current-visible-band')
    contains('functions/_lib/feishu-report-service.js', 'createFeishuReportResponse')
    contains('tongxue/index.html', 'tongxue-performance-v155.js?v=155', '同学你好 v1.5.5')
    contains('tongxue/app/tongxue-direct-handoff-v155.js', 'button.click()', 'shouldAutoQuery')


def verify_card_ai_2026() -> None:
    contains('functions/_lib/kb/year-caliber-kb.generated.js', 'shared/resources/exam/liaoning-physics.js', '2026063013492555300', '2026063014014729932')
    contains('functions/_lib/ai-card-prompt.js', 'score2026', 'rank2026', '2026专业最低投档分和位次为主事实', 'checks中的年份必须面向2027正式填报')
    rules = base.text('functions/_lib/ai-card-rules.js')
    schema = base.text('functions/_lib/ai-card-output-schema.js')
    base.check('2026最低投档：' in rules and '核验2027招生计划' in rules, 'AI rules not 2026-first')
    base.check("'核验2026招生计划" not in rules, 'AI rule output still uses 2026 plan check')
    base.check('.replace(/核验2026年?招生计划/g' in schema, 'AI schema must normalize legacy 2026-plan output')
    contains('functions/api/card-diagnose.js', 'caliber: diagnosisCaliber()', 'score2026', 'rank2026')
    contains('ln-rank/js/feature/diagnose/controller.js', 'score2026:', 'rank2026:', 'candidate:')
    history = base.text('functions/_lib/history-score-engine.js')
    base.check('最低投档所需位次' in history and '录取所需位次' not in history, 'history engine wording')


def verify_shared_resources() -> None:
    contains('shared/resources/exam/liaoning-physics.js', 'specialControlScore: 508', 'undergraduateControlScore: 344', 'vocationalControlScore: 150', 'isPublicBottomLineVisible')
    contains('shared/resources/geo/china-region-catalog.js', 'REGION_OPTIONS', 'REGION_GROUPS', 'matchRegionRule', 'jiangzhehu')
    contains('shared/resources/schools/school-resource-center.js', 'resolveCompactSchoolResource', 'resolveCardSchoolResource', 'combinedCampusCandidates', 'buildTongxueSchoolHref', 'tongxueDirectoryPromise')
    contains('shared/resources/resource-registry.js', 'lazy-single-flight')
    for path in ('functions/_lib/exam-year-config.js', 'ln-rank/js/core/score-guard.js', 'ln-rank/js/feature/selection-pool/candidate-context.js'):
        contains(path, 'shared/resources/exam/liaoning-physics.js')
    contains('functions/_lib/region-rules.js', 'shared/resources/geo/china-region-catalog.js')
    contains('ln-rank/js/config/region-options.js', 'shared/resources/geo/china-region-catalog.js')
    contains('ln-rank/js/app.v3956_0.js', 'isPublicBottomLineVisible', "url.pathname !== '/api/major-bands'", "url.searchParams.set('bottomLineMode', visible ? selectedMode : 'all')")


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
    base.check('不能直接说专业被撤销' in runtime, 'zy2026撤销边界')
    base.check(alias == page, 'zy2026 alias mismatch')


def verify_release_meta() -> None:
    release = base.data('ln-rank/release-meta.json')
    active = base.data('ln-rank/active-assets.json')
    for meta in (release, active):
        base.check(meta['version'] == 'v3.9.56.0' and meta['assetVersion'] == 'v3956_0', 'release version')
        for key in ('familyLanguageTrustContract', 'cardAi2026FirstContract', 'zy2026RecordLanguageContract', 'sharedResourceCenterContract', 'sharedExamResourceContract', 'sharedRegionResourceContract', 'sharedSchoolResourceContract', 'sharedSchoolDirectoryLazySingleFlightContract', 'feishuSharedResourceContract', 'feishuThreeEntryRegressionContract', 'tongxueDirectHandoffContract'):
            base.check(meta.get(key) is True, f'missing contract {key}')
        base.check(meta['sharedResourceCenterVersion'] == 'v3956_0', 'shared resource version')
    base.check(active['mainJs'] == 'js/app.v3956_0.js', 'active main JS')
    base.check('js/app.v3956_0.js' in active['jsEntry'] and 'js/app.v3951_0.js' not in active['jsEntry'], 'main wrapper activation')
    base.check(active['structure2026']['js'] == '../zy2026/assets/zy2026.v3955_0.js', 'zy2026 active JS')


def main() -> None:
    base.verify_protected_paths()
    base.verify_rank_table()
    verify_manifest_and_chunks()
    base.verify_centered_analysis()
    verify_runtime_current()
    verify_family_and_reports()
    verify_card_ai_2026()
    verify_shared_resources()
    verify_zy2026()
    verify_release_meta()
    base.verify_internal_links()
    base.verify_no_temporary_payloads()
    print('LN 2026 v3.9.56.0 Feishu, Tongxue and shared resource verification passed')


if __name__ == '__main__':
    main()
