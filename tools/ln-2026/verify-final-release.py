from __future__ import annotations

import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION = 'v3.9.51.0'
BASE_SHA = '62b31b2c2ce32d760ad142c9bdd49662a7603fe7'


def fail(message):
    raise AssertionError(message)


def check(condition, message):
    if not condition:
        fail(message)


def text(path):
    return (ROOT / path).read_text(encoding='utf-8')


def data(path):
    return json.loads(text(path))


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag not in {'a', 'link', 'script'}:
            return
        values = dict(attrs)
        target = values.get('href') or values.get('src')
        if target:
            self.links.append(target)


def verify_protected_paths():
    protected = [
        'fenxi/index.html',
        'fenxi/assets',
        'functions/fenxi',
        'functions/_middleware.js',
        'functions/_lib/release-contract.js'
    ]
    changed = git('diff', '--name-only', f'{BASE_SHA}...HEAD', '--', *protected)
    check(not changed, f'protected paths changed:\n{changed}')


def verify_rank_table():
    ranks = data('fenxi/data/rank_2026_physics.json')
    anchors = {700: 41, 650: 2867, 600: 14235, 570: 24127, 550: 31674, 508: 49824, 480: 62667, 450: 76652, 400: 98648, 344: 119069, 150: 141691}
    for score, expected in anchors.items():
        check(ranks.get(str(score)) == expected, f'rank anchor {score}: {ranks.get(str(score))} != {expected}')
    rows = sorted((int(score), int(rank)) for score, rank in ranks.items())
    for index in range(1, len(rows)):
        prev_score, prev_rank = rows[index - 1]
        score, rank = rows[index]
        check(score > prev_score, 'rank scores are not strictly increasing')
        check(rank <= prev_rank, f'cumulative rank must not increase with score: {prev_score}/{prev_rank} -> {score}/{rank}')


def verify_manifest_and_chunks():
    manifest = data('fenxi/data/ln-rank-2026/manifest.json')
    check(manifest['dataYear'] == 2026, 'manifest dataYear')
    check(manifest['audienceYear'] == 2027, 'manifest audienceYear')
    check(manifest['totalRecords'] == 11628, 'manifest totalRecords')
    check(manifest['schoolCount'] == 956, 'manifest schoolCount')
    history = manifest['historyMatch']
    check(history['exact'] == 8929, 'history exact count')
    check(history['unmatched'] == 2699, 'history unmatched count')
    check(history['strictCompleteThreeYear'] == 6553, 'strict complete three-year count')
    ranks = data('fenxi/data/rank_2026_physics.json')
    records = []
    for chunk in manifest['chunks']:
        path = ROOT / 'fenxi/data/ln-rank-2026' / chunk['file']
        check(path.exists(), f'missing chunk {path}')
        rows = json.loads(path.read_text(encoding='utf-8'))
        check(len(rows) == chunk['count'], f'chunk count mismatch {chunk["file"]}')
        records.extend(rows)
    check(len(records) == 11628, f'chunk record sum {len(records)}')
    schools = {row.get('school') for row in records}
    check(len(schools) == 956, f'chunk school count {len(schools)}')
    ids = set()
    below_undergraduate = []
    for row in records:
        record_id = row.get('id')
        check(record_id and record_id not in ids, f'duplicate or missing record id {record_id}')
        ids.add(record_id)
        check(row.get('dataYear') == 2026, f'wrong dataYear {record_id}')
        score = int(row['score2026'])
        check(314 <= score <= 696, f'score range {record_id}: {score}')
        check(row.get('rank2026') == ranks.get(str(score)), f'rank mapping {record_id}')
        if score < 344:
            below_undergraduate.append(row)
    check(len(below_undergraduate) == 1, f'expected one below-undergraduate special record, got {len(below_undergraduate)}')
    low_text = json.dumps(below_undergraduate[0], ensure_ascii=False)
    check(re.search(r'预科|资格|边防', low_text), 'below-undergraduate record is not isolated as a special project')


def verify_centered_analysis():
    summary = data('analysis/2026/overall-summary.json')
    policy = summary['policy']
    check(summary['version'] == 'three-year-2024-2026-centered-v1.0.0', 'centered analysis version')
    check(summary['strictCompleteCount'] == 6553, 'centered strict count')
    counts = summary['trendCounts']
    check(sum(counts.values()) == 6553, 'trend count sum')
    check(max(counts.values()) < 0.75 * 6553, f'trend classification dominated by one label: {counts}')
    check(0.5 <= policy['neutralThresholdPctPoint'] <= 1.5, 'neutral threshold')
    common = policy['annualCommonShift']
    check(round(common['pctPoint26vs25Median'], 6) == -4.853927, '2026 annual common shift')
    check(round(common['pctPoint25vs24Median'], 6) == 2.679232, '2025 annual common shift')
    canonical = data('analysis/2026/canonical-three-year-records.json')
    check(len(canonical['records']) == 6553, 'canonical record count')
    for row in canonical['records'][:200]:
        check('relativePctPoint26vs25' in row and 'relativePctPoint25vs24' in row, 'centered relative fields missing')
        check(row.get('trendMethod') == 'annual_common_shift_centered_rank_percentile', 'trend method missing')
    trend = data('ln-rank/data/major-trend-2026.json')
    check(trend['policy']['version'] == policy['version'], 'browser trend policy mismatch')
    check(trend['summary']['trendCounts'] == counts, 'browser trend counts mismatch')


def verify_runtime_contracts():
    exam = text('functions/_lib/exam-year-config.js')
    for needle in ('specialControlScore: 508', 'undergraduateControlScore: 344', 'vocationalControlScore: 150', 'audienceYear: 2027'):
        check(needle in exam, f'exam config missing {needle}')
    provider = text('functions/_lib/rank-table-provider.js')
    check('ln-2026-physics-score-rank.js' in provider and 'ln-2025-physics-score-rank.js' in provider, 'multi-year rank provider')
    guard = text('ln-rank/js/core/score-guard.js')
    for needle in ('n < VOCATIONAL_CONTROL_SCORE', 'n < UNDERGRADUATE_CONTROL_SCORE', 'n < SPECIAL_CONTROL_SCORE', 'n > 750'):
        check(needle in guard, f'score guard missing {needle}')
    api = text('functions/api/major-bands.js')
    for needle in ('classificationMode: \'score_delta\'', 'candidateReferenceRank2026', 'chunksSkipped', 'ln-rank-manifest.js'):
        check(needle in api, f'major API missing {needle}')
    background = text('functions/_lib/background-position-engine.js')
    check('referenceAdmissionYear: 2026' in background, 'background year')
    check('groupScoreRecords' in background and 'score - 25' not in background, 'background shared standard bands')
    for path in ('functions/api/local-mainline.js', 'functions/api/211-mainline.js'):
        source = text(path)
        check('dataYear: 2026' in source and 'rankYear: 2026' in source, f'{path} year contract')
        check('344—750' in source, f'{path} control boundary')


def verify_selection_and_feishu():
    store = text('ln-rank/js/feature/selection-pool/store.js')
    for export_name in ('getPoolItems', 'savePoolItems', 'addPoolItem', 'removePoolItem', 'clearPoolItems', 'movePoolItem', 'movePoolItemTo', 'sortPoolItems', 'getPoolStats'):
        check(f'export function {export_name}' in store, f'selection store lost {export_name}')
    check("lnRank.selectionPool.lnPhysics.2026.v3951" in store, 'selection 2026 storage key')
    check('historicalOnly: true' in store, 'legacy selection isolation')
    recompute = text('ln-rank/js/feature/selection-pool/recompute.js')
    check('classifySelectionDelta' in recompute and 'scoreDelta2026' in recompute and 'rankGap2026' in recompute, 'selection recompute 2026')
    policy = text('ln-rank/js/domain/selection-band-policy.js')
    for needle in ('min: 1, max: 10', 'min: -10, max: 0', 'min: -25, max: -11'):
        check(needle in policy, f'shared band policy missing {needle}')
    selection_page = text('ln-rank/selection-pool.html')
    check('主要依据辽宁 2026' in selection_page, 'selection page primary year')
    check('/ln-rank/major-trend-2026.html' in selection_page, 'selection trend link')
    report = text('functions/_lib/feishu-selection-pool-report-builder.js')
    styled = text('functions/_lib/feishu-selection-pool-styled-builder.js')
    combined = report + styled
    for needle in ('score2026', 'rank2026', 'score2025', 'rank2025', 'score2024', 'rank2024'):
        check(needle in combined, f'Feishu missing {needle}')
    check('historicalOnly' in report, 'Feishu historical-only exclusion')
    check('模考 / 预估参考分数' in report or '参考分数' in report, 'Feishu reference score wording')
    forbidden = ['你的 2027 位次', '2027 实际位次是', '2025最低分']
    for phrase in forbidden:
        check(phrase not in combined, f'Feishu forbidden wording: {phrase}')


def verify_pages_and_assets():
    active = data('ln-rank/active-assets.json')
    release = data('ln-rank/release-meta.json')
    for meta in (active, release):
        check(meta['version'] == VERSION, 'release version')
        check(meta['activeDataYear'] == 2026 and meta['audienceYear'] == 2027, 'release years')
        check(meta['centeredThreeYearTrendContract'] is True, 'centered trend contract')
    check('js/app.v3951_0.js' in active['jsEntry'], 'active main JS')
    check('js/selection-pool.v3951_0.js' in active['jsEntry'], 'active selection JS')
    check('js/major-trend-render.v3951_0.js' in active['jsEntry'], 'active trend JS')
    check('major-trend-2026.html' in active['html'], 'active trend HTML')

    current_pages = [
        'ln-rank/index.html',
        'ln-rank/selection-pool.html',
        'ln-rank/local-mainline.html',
        'ln-rank/211-mainline.html',
        'ln-rank/major-trend-2026.html',
        'ln2026.html',
        'lngk2026.html'
    ]
    for path in current_pages:
        source = text(path)
        check(VERSION in source, f'{path} footer/version')
        check('v3.9.50.0' not in source, f'{path} old version')
    check('./ln2026.html' in text('index.html') and './lngk2026.html' in text('index.html'), 'root current report links')
    check('./ln2026.html' in text('e.html') and './lngk2026.html' in text('e.html'), 'countdown current report links')
    check('major-trend-2025.html' not in text('ln-rank/index.html') + text('ln-rank/selection-pool.html') + text('ln-rank/major-trend-2026.html'), 'current LN Rank links old trend')
    check('major-trend-2026.json' in text('ln-rank/js/major-trend-render.v3951_0.js'), 'new trend renderer data')
    stale = ['当前基于辽宁 2025', '2026 一分一段接入后', '特控线 515', '本科线 367', '低于 400 分']
    joined = '\n'.join(text(path) for path in current_pages)
    for phrase in stale:
        check(phrase not in joined, f'stale page wording: {phrase}')
    prohibited_auto = ['必报', '稳录', '保证录取', '一定上涨', '冷门捡漏', '就业一定更好']
    generated_text = text('ln2026.html') + text('lngk2026.html') + text('ln-rank/major-trend-2026.html')
    for phrase in prohibited_auto:
        check(phrase not in generated_text, f'forbidden generated trend phrase: {phrase}')


def verify_internal_links():
    pages = [
        'index.html', 'e.html', 'ln2026.html', 'lngk2026.html',
        'ln-rank/index.html', 'ln-rank/selection-pool.html',
        'ln-rank/local-mainline.html', 'ln-rank/211-mainline.html',
        'ln-rank/major-trend-2026.html'
    ]
    missing = []
    for path in pages:
        parser = LinkParser()
        parser.feed(text(path))
        base = (ROOT / path).parent
        for target in parser.links:
            clean = target.split('#', 1)[0].split('?', 1)[0]
            if not clean or clean.startswith(('http://', 'https://', 'mailto:', 'tel:', 'data:', 'javascript:')):
                continue
            candidate = ROOT / clean.lstrip('/') if clean.startswith('/') else base / clean
            if clean.endswith('/'):
                candidate = candidate / 'index.html'
            if not candidate.exists():
                missing.append(f'{path} -> {target}')
    check(not missing, 'missing internal links/assets:\n' + '\n'.join(missing[:50]))


def verify_no_temporary_payloads():
    forbidden = [
        '.github/workflows/build-ln-2026-release.yml',
        '.github/workflows/integrate-ln-2026-release.yml',
        '.github/workflows/apply-ln-2026-runtime-corrections.yml',
        '.github/workflows/audit-ln-2026-trend-method.yml',
        '.github/workflows/rebuild-ln-2026-centered-trends.yml',
        '.github/workflows/finalize-ln-2026-metadata.yml',
        'tools/ln-2026/READY',
        'tools/ln-2026/build_release.py.gz.b64',
        'tools/ln-2026/verify_release.py.gz.b64',
        'tools/ln-2026/rank-pdf-layout-diagnostic.txt',
        'tools/ln-2026/apply-runtime-corrections.py',
        'tools/ln-2026/finalize-release-metadata.py'
    ]
    forbidden.extend(str(path.relative_to(ROOT)) for path in (ROOT / 'tools/ln-2026/payload').glob('*') if path.is_file())
    remaining = [path for path in forbidden if (ROOT / path).exists()]
    check(not remaining, 'temporary build files remain:\n' + '\n'.join(remaining))
    check((ROOT / 'tools/ln-2026/build-release.py').exists(), 'readable data build source missing')
    check((ROOT / 'tools/ln-2026/verify-generated-release.py').exists(), 'readable generated-data verifier missing')


def main():
    verify_protected_paths()
    verify_rank_table()
    verify_manifest_and_chunks()
    verify_centered_analysis()
    verify_runtime_contracts()
    verify_selection_and_feishu()
    verify_pages_and_assets()
    verify_internal_links()
    verify_no_temporary_payloads()
    print('LN 2026 final release verification passed')


if __name__ == '__main__':
    main()
