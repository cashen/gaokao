from __future__ import annotations

import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('ln2026_verify_v2', HERE / 'verify-final-release-v2.py')
v2 = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(v2)
base = v2.base
base.VERSION = 'v3.9.55.0'


def verify_manifest_and_chunks():
    manifest = base.data('fenxi/data/ln-rank-2026/manifest.json')
    base.check(manifest['dataYear'] == 2026, 'manifest data year')
    base.check(manifest['audienceYear'] == 2027, 'manifest audience year')
    base.check(manifest['totalRecords'] == 11628, 'manifest record count')
    base.check(manifest['schoolCount'] == 956, 'manifest school count')
    base.check(manifest['historyMatch']['strictCompleteThreeYear'] == 6553, 'strict three-year count')
    total = 0
    for chunk in manifest['chunks']:
        path = base.ROOT / 'fenxi/data/ln-rank-2026' / chunk['file']
        base.check(path.exists(), f'missing chunk {chunk["file"]}')
        rows = base.data(str(path.relative_to(base.ROOT)))
        base.check(len(rows) == chunk['count'], f'chunk count {chunk["file"]}')
        total += len(rows)
    base.check(total == manifest['totalRecords'], 'manifest chunk sum')


def verify_selection_and_reports():
    store = base.text('ln-rank/js/feature/selection-pool/store.js')
    for name in ('getPoolItems', 'savePoolItems', 'addPoolItem', 'removePoolItem', 'clearPoolItems', 'movePoolItem', 'movePoolItemTo', 'sortPoolItems', 'getPoolStats'):
        base.check(f'export function {name}' in store, f'selection store lost {name}')
    base.check('lnRank.selectionPool.lnPhysics.2026.v3951' in store, 'selection 2026 storage key')
    base.check('historicalOnly: true' in store, 'legacy selection isolation')
    selection = base.text('ln-rank/selection-pool.html')
    for phrase in ('检查已选专业', '生成家庭复核报告', '2026年普通类本科批物理类专业投档记录'):
        base.check(phrase in selection, f'selection page missing {phrase}')
    report = base.text('functions/_lib/feishu-selection-pool-report-builder.js')
    styled = base.text('functions/_lib/feishu-selection-pool-styled-builder.js')
    combined = report + styled
    for key in ('score2026', 'rank2026', 'score2025', 'rank2025', 'score2024', 'rank2024'):
        base.check(key in combined, f'report missing {key}')
    base.check('historicalOnly' in report, 'report historical-only exclusion')


def verify_family_pages():
    root = base.text('index.html')
    main = base.text('ln-rank/index.html')
    selection = base.text('ln-rank/selection-pool.html')
    presentation = base.text('ln-rank/js/ux/family-presentation.v3955_0.js')
    decision_bar = base.text('ln-rank/js/ux/family-decision-bar.v3955_0.js')
    family_home = base.text('ln-rank/js/ux/family-home.v3955_0.js')
    family_css = base.text('ln-rank/css/dist/family-decision-workspace.v3955_0.css')

    for phrase in ('辽宁高考家庭决策工作台', '先圈出一批可以讨论的专业', '近期公开评论', '时间只帮助安排节奏'):
        base.check(phrase in root, f'homepage missing {phrase}')
    base.check('近期真实评论' not in root, 'homepage real-review claim')
    for phrase in ('确认孩子的位置', '说清想看什么', '圈出并整理专业', '家庭逐项复核'):
        base.check(phrase in main, f'main flow missing {phrase}')
    base.check('data-release="v3.9.55.0"' in main, 'main release version')
    base.check('/ln-rank/js/app.v3955_0.js?v=3955_0' in main, 'shared main wrapper not loaded')
    for phrase in ('检查已选专业', '看看当前方案有没有明显偏科', '生成家庭复核报告', '其他保存方式'):
        base.check(phrase in selection, f'selection flow missing {phrase}')
    for phrase in ('为什么出现', '最需要确认', '现在还不知道', '最低投档位置基本稳定', 'tongxue-card-entry'):
        base.check(phrase in presentation, f'presentation missing {phrase}')
    base.check('近两年录取位置基本稳定' not in presentation, 'old admission wording')
    base.check('shared/resources/schools/school-resource-center.js' in presentation, 'shared school center not used')
    base.check('/tongxue/data/school-entities-v150.js' not in presentation, 'direct Tongxue entity import remains')
    for phrase in ('当前家庭方案', 'data-mobile-selected', 'data-mobile-pending'):
        base.check(phrase in decision_bar, f'decision bar missing {phrase}')
    for phrase in ('returning', 'score-ready', '继续检查家庭方案'):
        base.check(phrase in family_home, f'family home missing {phrase}')
    for phrase in ('.family-decision-bar', '.family-decision-mobile', '.family-decision-summary', '.tongxue-card-entry'):
        base.check(phrase in family_css, f'family CSS missing {phrase}')


def verify_card_ai_2026():
    caliber = base.text('functions/_lib/kb/year-caliber-kb.generated.js')
    prompt = base.text('functions/_lib/ai-card-prompt.js')
    rules = base.text('functions/_lib/ai-card-rules.js')
    schema = base.text('functions/_lib/ai-card-output-schema.js')
    api = base.text('functions/api/card-diagnose.js')
    controller = base.text('ln-rank/js/feature/diagnose/controller.js')
    history = base.text('functions/_lib/history-score-engine.js')
    base.check('shared/resources/exam/liaoning-physics.js' in caliber, 'AI year caliber bypasses shared exam resource')
    for phrase in ('score2026', 'rank2026', '2026专业最低投档分和位次为主事实', 'checks中的年份必须面向2027正式填报'):
        base.check(phrase in prompt, f'AI prompt missing {phrase}')
    base.check('2026最低投档：' in rules, 'AI rules not 2026-first')
    base.check('核验2027招生计划' in rules, 'AI rules not 2027-facing')
    base.check('核验2026招生计划' not in prompt + rules + schema, 'AI still asks to verify 2026 plan')
    base.check('caliber: diagnosisCaliber()' in api, 'AI API caliber missing')
    base.check('score2026:' in controller and 'candidate:' in controller, 'AI cache key incomplete')
    base.check('最低投档所需位次' in history and '录取所需位次' not in history, 'history engine wording')


def verify_shared_resources():
    exam = base.text('shared/resources/exam/liaoning-physics.js')
    geo = base.text('shared/resources/geo/china-region-catalog.js')
    school = base.text('shared/resources/schools/school-resource-center.js')
    registry = base.text('shared/resources/resource-registry.js')
    wrapper = base.text('ln-rank/js/app.v3955_0.js')
    for phrase in ('specialControlScore: 508', 'undergraduateControlScore: 344', 'vocationalControlScore: 150', 'isPublicBottomLineVisible'):
        base.check(phrase in exam, f'shared exam missing {phrase}')
    for phrase in ('REGION_OPTIONS', 'REGION_GROUPS', 'matchRegionRule', 'jiangzhehu'):
        base.check(phrase in geo, f'shared geo missing {phrase}')
    for phrase in ('resolveCompactSchoolResource', 'resolveCardSchoolResource', 'buildTongxueSchoolHref', 'tongxueDirectoryPromise', 'lazy-single-flight'):
        base.check(phrase in school + registry, f'shared school missing {phrase}')
    for path in ('functions/_lib/exam-year-config.js', 'ln-rank/js/core/score-guard.js', 'ln-rank/js/feature/selection-pool/candidate-context.js'):
        base.check('shared/resources/exam/liaoning-physics.js' in base.text(path), f'{path} bypasses shared exam')
    base.check('shared/resources/geo/china-region-catalog.js' in base.text('functions/_lib/region-rules.js'), 'backend region bypass')
    base.check('shared/resources/geo/china-region-catalog.js' in base.text('ln-rank/js/config/region-options.js'), 'frontend region bypass')
    for phrase in ('isPublicBottomLineVisible', "url.pathname !== '/api/major-bands'", "url.searchParams.set('bottomLineMode', visible ? selectedMode : 'all')"):
        base.check(phrase in wrapper, f'main wrapper missing {phrase}')


def verify_zy2026():
    summary = base.data('data/zy2026/summary.json')
    audit = base.data('analysis/2026/zy2026-audit.json')
    base.check(summary['records2026'] == 11628, 'zy2026 record count')
    base.check(audit['coverage']['records2026'] == audit['coverage']['assigned2026'], 'zy2026 coverage')
    page = base.text('zy2026/index.html')
    alias = base.text('zy2026.html')
    js = base.text('zy2026/assets/zy2026.v3955_0.js')
    css = base.text('zy2026/assets/zy2026.v3954_0.css')
    for phrase in ('辽宁2026招生变化发现', '2026投档表首次可见', '2026投档表未再单列', '页面体验版本：v3.9.55.0'):
        base.check(phrase in page + js, f'zy2026 missing {phrase}')
    base.check('不能直接说专业被撤销' in js, 'zy2026撤销边界')
    base.check('.featured-grid' in css and '.stable-block' in css, 'zy2026 CSS')
    base.check(alias == page, 'zy2026 alias mismatch')


def verify_release_meta():
    release = base.data('ln-rank/release-meta.json')
    active = base.data('ln-rank/active-assets.json')
    for meta in (release, active):
        base.check(meta['version'] == 'v3.9.55.0', 'release version')
        base.check(meta['assetVersion'] == 'v3955_0', 'asset version')
        for key in (
            'familyLanguageTrustContract', 'cardAi2026FirstContract', 'zy2026RecordLanguageContract',
            'sharedResourceCenterContract', 'sharedExamResourceContract', 'sharedRegionResourceContract',
            'sharedSchoolResourceContract', 'sharedSchoolDirectoryLazySingleFlightContract'
        ):
            base.check(meta.get(key) is True, f'missing contract {key}')
        base.check(meta['sharedResourceCenterVersion'] == 'v3955_0', 'shared resource version')
    base.check(active['mainJs'] == 'js/app.v3955_0.js', 'active main JS')
    base.check('js/app.v3955_0.js' in active['jsEntry'], 'shared wrapper inactive')
    base.check('js/app.v3951_0.js' not in active['jsEntry'], 'legacy main directly active')
    base.check(active['structure2026']['js'] == '../zy2026/assets/zy2026.v3955_0.js', 'zy2026 active JS')


def verify_temporary_files_removed():
    for path in ('.bootstrap', '.github/workflows/bootstrap-zy2026-v3953.yml', '.github/workflows/materialize-zy2026-v3953.yml'):
        base.check(not (base.ROOT / path).exists(), f'temporary path remains {path}')


def main():
    base.verify_protected_paths()
    base.verify_rank_table()
    verify_manifest_and_chunks()
    base.verify_centered_analysis()
    base.verify_runtime_contracts()
    verify_selection_and_reports()
    verify_family_pages()
    verify_card_ai_2026()
    verify_shared_resources()
    verify_zy2026()
    verify_release_meta()
    verify_temporary_files_removed()
    base.verify_internal_links()
    base.verify_no_temporary_payloads()
    print('LN 2026 v3.9.55.0 family decision, 2026-first AI and shared resource center verification passed')


if __name__ == '__main__':
    main()
