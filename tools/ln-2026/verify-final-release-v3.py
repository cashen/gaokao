from __future__ import annotations

import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('ln2026_verify_v2', HERE / 'verify-final-release-v2.py')
v2 = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(v2)
base = v2.base
base.VERSION = 'v3.9.53.0'


def verify_structure_data():
    summary = base.data('data/zy2026/summary.json')
    audit = base.data('analysis/2026/zy2026-audit.json')
    school_index = base.data('data/zy2026/school-index.json')
    major_index = base.data('data/zy2026/major-index.json')
    base.check(summary['productVersion'] == 'v3.9.53.0', 'zy2026 data product version')
    base.check(summary['assetVersion'] == 'v3953_0', 'zy2026 data asset version')
    base.check(summary['records2026'] == 11628, 'zy2026 2026 record count')
    base.check(10000 <= summary['records2025'] <= 12000, f'zy2026 unexpected 2025 record count {summary["records2025"]}')
    base.check(summary['recordDelta'] == summary['records2026'] - summary['records2025'], 'zy2026 record delta')
    base.check(audit['coverage']['records2025'] == audit['coverage']['assigned2025'], 'zy2026 2025 coverage')
    base.check(audit['coverage']['records2026'] == audit['coverage']['assigned2026'], 'zy2026 2026 coverage')
    base.check(sum(summary['relationRecordCounts2025'].values()) == summary['records2025'], 'zy2026 relation 2025 sum')
    base.check(sum(summary['relationRecordCounts2026'].values()) == summary['records2026'], 'zy2026 relation 2026 sum')
    for key in ('continued', 'name_adjustment', 'project_change', 'class_split', 'class_merge', 'reappeared', 'first_seen', 'not_listed', 'needs_review'):
        base.check(key in summary['relationCounts'], f'zy2026 missing relation type {key}')
    base.check(summary['relationRecordCounts2026']['continued'] >= 7000, 'zy2026 continuity unexpectedly low')
    base.check(len(summary['directions']) >= 10, 'zy2026 direction coverage')
    base.check(len(school_index['schools']) >= 900, 'zy2026 school index coverage')
    base.check(len(major_index['majors']) >= 300, 'zy2026 major index coverage')
    base.check(any(sum(v for k, v in item.get('relationCounts', {}).items() if k != 'continued') >= 3 for item in school_index['schools']), 'zy2026 featured school candidates')
    base.check(any(abs(item.get('schoolDelta', 0)) >= 3 for item in major_index['majors']), 'zy2026 featured major candidates')
    chunks = base.ROOT / 'data/zy2026/chunks'
    base.check(chunks.exists(), 'zy2026 chunks missing')
    for item in school_index['schools'][:80]:
        base.check((chunks / item['chunk']).exists(), f'zy2026 school chunk missing {item["chunk"]}')
    for item in major_index['majors'][:80]:
        base.check((chunks / item['chunk']).exists(), f'zy2026 major chunk missing {item["chunk"]}')


def verify_structure_pages():
    page = base.text('zy2026/index.html')
    alias = base.text('zy2026.html')
    js = base.text('zy2026/assets/zy2026.v3954_0.js')
    css = base.text('zy2026/assets/zy2026.v3954_0.css')
    for phrase in (
        '辽宁2026招生变化发现', '重点比较2025→2026', '不用盲猜，先从变化明显的地方开始',
        '真正变化放前面，稳定记录放最后', '默认只显示值得确认的变化',
        '基本连续的学校默认收起', '页面体验版本：v3.9.54.0', '2024的角色'
    ):
        base.check(phrase in page, f'zy2026 visible copy missing {phrase}')
    for phrase in ('unmatched', 'fuzzy match', 'similarity_score', '真实新增', '真实消失', '新增659个专业'):
        base.check(phrase not in page + js, f'zy2026 technical or misleading copy visible: {phrase}')
    for phrase in (
        "CHANGE_ORDER=['project_change'", "RELATION_ORDER=[...CHANGE_ORDER,'continued']",
        'renderFeatured', 'featuredSchools', 'featuredMajors', 'stableBlock', 'stableSets',
        'groupedChanges', 'changes=sorted.filter', 'data-featured-school', 'data-featured-major',
        'data-stable-toggle', 'slice(0,6)', '默认只展示真正变化', '填报前确认'
    ):
        base.check(phrase in js, f'zy2026 change-first runtime contract missing {phrase}')
    base.check("RELATION_ORDER=['continued'" not in js, 'zy2026 old stable-first order remains')
    base.check(js.find("'project_change'") < js.find("'continued'"), 'zy2026 change priority order')
    for phrase in (
        'zy2026.v3953_0.css', '.featured-grid', '.featured-card', '.change-overview',
        '.stable-block', '.stable-list', '@media(max-width:680px)'
    ):
        base.check(phrase in css, f'zy2026 change-first responsive CSS missing {phrase}')
    base.check('zy2026.v3954_0.css?v=3954_0' in page, 'zy2026 new css not loaded')
    base.check('zy2026.v3954_0.js?v=3954_0' in page, 'zy2026 new js not loaded')
    base.check(alias == page, 'zy2026 extensionless alias must mirror directory page')
    base.check("location.replace('/zy2026')" not in alias, 'zy2026 alias must not self-redirect')
    runner = base.text('tools/ln-2026/run-build-zy2026-structure.py')
    finalizer = base.text('tools/ln-2026/finalize-v3953-assets.py')
    for phrase in ('sync_extensionless_alias', 'sync_change_first_contract', 'zy2026ChangeFirstContract', 'zy2026.v3954_0.js'):
        base.check(phrase in runner, f'zy2026 rebuild guard missing {phrase}')
    for phrase in ('sync_zy2026_alias', 'apply_zy2026_change_first', 'zy2026StableCollapsedContract', 'zy2026.v3954_0.css'):
        base.check(phrase in finalizer, f'zy2026 finalizer guard missing {phrase}')
    root = base.text('index.html')
    base.check('href="/zy2026"' in root, 'root zy2026 entry')
    base.check('href="/zy.html"' not in root, 'root old zy entry remains')
    base.check('招生结构变化' in root and '首页版本：v3.9.53.0' in root, 'root zy2026 copy/version')
    redirect = base.text('zy.html')
    base.check("location.replace('/zy2026')" in redirect, 'zy.html redirect')
    base.check('v3.9.53.0' in redirect, 'zy.html version')


def verify_ln2026_score_band_order():
    page = base.text('ln2026.html')
    js = base.text('ln-rank/js/major-difficulty-2026.v3953_0.js')
    base.check('major-difficulty-2026.v3953_0.js' in page, 'ln2026 new score-band asset')
    base.check('分数段统一按从低到高排列' in page, 'ln2026 visible ascending-order explanation')
    expected = ['344—449 分', '450—499 分', '500—549 分', '550—589 分', '590—624 分', '625 分及以上']
    positions = [js.find(f"['{label}'") for label in expected]
    base.check(all(position >= 0 for position in positions), f'ln2026 score-band labels missing: {positions}')
    base.check(positions == sorted(positions), f'ln2026 score-band labels not low-to-high: {positions}')
    base.check('scoreBandOrder(a) - scoreBandOrder(b)' in js, 'ln2026 score-band ascending runtime sort')
    base.check('Number(b.maxScore || 0) - Number(a.maxScore || 0)' not in js, 'ln2026 old descending sort remains')


def verify_compare_workspace():
    page = base.text('ln-rank/index.html')
    js = base.text('ln-rank/js/ux/compare-workspace.v3953_0.js')
    css = base.text('ln-rank/css/dist/compare-workspace.v3953_0.css')
    year_fix = base.text('ln-rank/css/dist/compare-workspace-year-fix.v3953_0.css')
    base.check('compare-workspace.v3953_0.css' in page, 'compare workspace CSS not loaded')
    base.check('compare-workspace-year-fix.v3953_0.css' in page, 'compare year-label fix not loaded')
    base.check('compare-workspace.v3953_0.js' in page, 'compare workspace JS not loaded')
    base.check('data-release="v3.9.53.0"' in page, 'main page release version')
    for phrase in (
        'movePanelToWorkspace', 'scrollIntoView', 'panel.focus', '已打开',
        '横向一起看', '左右滑动比较', 'MutationObserver', "action === 'chip'"
    ):
        base.check(phrase in js, f'compare workspace journey missing {phrase}')
    for phrase in (
        'grid-column:1/-1', '@media (min-width:1200px)',
        '@media (min-width:768px) and (max-width:1199px)', '@media (max-width:767px)',
        'grid-auto-flow:column', 'scroll-snap-type:x mandatory', 'min-height:44px'
    ):
        base.check(phrase in css, f'compare workspace responsive contract missing {phrase}')
    base.check('span::before{content:none!important}' in year_fix, 'compare year labels must not be duplicated')
    base.check('initialCards + naturalComparePanel' in base.text('ln-rank/js/feature/major-pool/render.js'), 'core compare insertion contract unexpectedly changed')


def verify_release_meta():
    release = base.data('ln-rank/release-meta.json')
    active = base.data('ln-rank/active-assets.json')
    for meta in (release, active):
        base.check(meta['version'] == 'v3.9.53.0', 'v3953 core release version')
        base.check(meta['assetVersion'] == 'v3953_0', 'v3953 core asset version')
        base.check(meta['zy2026StructureContract'] is True, 'zy2026 structure contract')
        base.check(meta['zy2026RouteMigrationContract'] is True, 'zy2026 route contract')
        base.check(meta['zy2026ExtensionlessAliasContract'] is True, 'zy2026 extensionless alias contract')
        base.check(meta['zy2026ExperienceVersion'] == 'v3.9.54.0', 'zy2026 experience version')
        base.check(meta['zy2026ExperienceAssetVersion'] == 'v3954_0', 'zy2026 experience asset version')
        base.check(meta['zy2026ChangeFirstContract'] is True, 'zy2026 change-first contract')
        base.check(meta['zy2026StableCollapsedContract'] is True, 'zy2026 stable collapsed contract')
        base.check(meta['zy2026FeaturedDiscoveryContract'] is True, 'zy2026 featured discovery contract')
        base.check(meta['zy2026ChangePriorityOrderContract'] is True, 'zy2026 change order contract')
        base.check(meta['ln2026ScoreBandAscendingContract'] is True, 'ln2026 ascending score bands contract')
        base.check(meta['compareWorkspaceHumanJourneyContract'] is True, 'compare human journey contract')
        base.check(meta['compareWorkspaceAutoNavigateContract'] is True, 'compare auto navigation contract')
        base.check(meta['compareWorkspaceYearLabelContract'] is True, 'compare single year-label contract')
    base.check(release['zy2026PrimaryComparison'] == '2025-2026', 'zy2026 primary comparison')
    base.check(release['zy2026Year2024Role'] == 'reappearance-and-continuity-evidence-only', 'zy2026 2024 role')
    base.check(release['majorDifficultyJs'] == 'js/major-difficulty-2026.v3953_0.js', 'release major difficulty asset')
    structure = active['structure2026']
    for key in ('page', 'css', 'js', 'summary', 'schoolIndex', 'majorIndex'):
        base.check(key in structure, f'zy2026 active asset missing {key}')
    base.check(structure['css'] == '../zy2026/assets/zy2026.v3954_0.css', 'zy2026 active css')
    base.check(structure['js'] == '../zy2026/assets/zy2026.v3954_0.js', 'zy2026 active js')
    for asset in ('js/major-difficulty-2026.v3953_0.js', 'js/ux/compare-workspace.v3953_0.js'):
        base.check(asset in active['jsEntry'], f'active JS missing {asset}')
    for asset in ('css/dist/compare-workspace.v3953_0.css', 'css/dist/compare-workspace-year-fix.v3953_0.css'):
        base.check(asset in active['cssEntry'], f'active CSS missing {asset}')
    base.check('js/major-difficulty-2026.v3952_0.js' not in active['jsEntry'], 'inactive old difficulty JS remains active')


def verify_temporary_files_removed():
    for path in (
        '.bootstrap',
        '.github/workflows/bootstrap-zy2026-v3953.yml',
        '.github/workflows/materialize-zy2026-v3953.yml',
    ):
        base.check(not (base.ROOT / path).exists(), f'temporary build path remains: {path}')


def main():
    base.verify_protected_paths()
    base.verify_rank_table()
    v2.verify_manifest_and_chunks()
    base.verify_centered_analysis()
    base.verify_runtime_contracts()
    v2.verify_selection_and_feishu()
    verify_structure_data()
    verify_structure_pages()
    verify_ln2026_score_band_order()
    verify_compare_workspace()
    verify_release_meta()
    verify_temporary_files_removed()
    base.verify_internal_links()
    base.verify_no_temporary_payloads()
    print('LN 2026 v3.9.53.0 core with ZY2026 v3.9.54.0 change-first experience verification passed')


if __name__ == '__main__':
    main()
