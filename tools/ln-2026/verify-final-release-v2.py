from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('ln2026_verify_base', HERE / 'verify-final-release.py')
base = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(base)
base.VERSION = 'v3.9.52.0'


def verify_manifest_and_chunks():
    manifest = base.data('fenxi/data/ln-rank-2026/manifest.json')
    base.check(manifest['dataYear'] == 2026, 'manifest dataYear')
    base.check(manifest['audienceYear'] == 2027, 'manifest audienceYear')
    base.check(manifest['totalRecords'] == 11628, 'manifest totalRecords')
    base.check(manifest['schoolCount'] == 956, 'manifest schoolCount')
    history = manifest['historyMatch']
    base.check(history['exact'] == 8929, 'history exact count')
    base.check(history['unmatched'] == 2699, 'history unmatched count')
    ranks = base.data('fenxi/data/rank_2026_physics.json')
    records = []
    for chunk in manifest['chunks']:
        path = base.ROOT / 'fenxi' / chunk['file']
        base.check(path.exists(), f'missing chunk {path}')
        payload = json.loads(path.read_text(encoding='utf-8'))
        rows = payload if isinstance(payload, list) else payload.get('records', [])
        base.check(len(rows) == chunk['recordCount'], f'chunk count mismatch {chunk["file"]}: {len(rows)} != {chunk["recordCount"]}')
        records.extend(rows)
    base.check(len(records) == 11628, f'chunk record sum {len(records)}')
    base.check(len({row.get("school") for row in records}) == 956, 'chunk school count')
    ids = set()
    below_undergraduate = []
    for row in records:
        record_id = row.get('id')
        base.check(record_id and record_id not in ids, f'duplicate or missing record id {record_id}')
        ids.add(record_id)
        base.check(row.get('dataYear') == 2026, f'wrong dataYear {record_id}')
        score = int(row['score2026'])
        base.check(314 <= score <= 696, f'score range {record_id}: {score}')
        base.check(row.get('rank2026') == ranks.get(str(score)), f'rank mapping {record_id}')
        if score < 344:
            below_undergraduate.append(row)
    base.check(len(below_undergraduate) == 1, f'expected one below-undergraduate special record, got {len(below_undergraduate)}')
    base.check(re.search(r'预科|资格|边防', json.dumps(below_undergraduate[0], ensure_ascii=False)), 'below-undergraduate special record')


def verify_selection_and_feishu():
    store = base.text('ln-rank/js/feature/selection-pool/store.js')
    for export_name in ('getPoolItems', 'savePoolItems', 'addPoolItem', 'removePoolItem', 'clearPoolItems', 'movePoolItem', 'movePoolItemTo', 'sortPoolItems', 'getPoolStats'):
        base.check(f'export function {export_name}' in store, f'selection store lost {export_name}')
    base.check('lnRank.selectionPool.lnPhysics.2026.v3951' in store, 'selection 2026 storage key')
    base.check('historicalOnly: true' in store, 'legacy selection isolation')
    selection_page = base.text('ln-rank/selection-pool.html')
    base.check('主要依据辽宁2026' in selection_page, 'selection page primary year')
    base.check('/ln2026.html' in selection_page, 'selection unified difficulty link')
    base.check('/ln-rank/major-trend-2026.html' not in selection_page, 'selection old trend route removed')
    report = base.text('functions/_lib/feishu-selection-pool-report-builder.js')
    styled = base.text('functions/_lib/feishu-selection-pool-styled-builder.js')
    combined = report + styled
    for needle in ('score2026', 'rank2026', 'score2025', 'rank2025', 'score2024', 'rank2024'):
        base.check(needle in combined, f'Feishu missing {needle}')
    base.check('historicalOnly' in report and '!x.historicalOnly' in report, 'Feishu historical-only exclusion')
    base.check('2026投档最低分' in report, 'Feishu primary item line is not 2026')
    for phrase in ('你的 2027 位次', '2027 实际位次是'):
        base.check(phrase not in combined, f'Feishu forbidden wording: {phrase}')


def verify_human_pages_and_assets():
    active = base.data('ln-rank/active-assets.json')
    release = base.data('ln-rank/release-meta.json')
    for meta in (active, release):
        base.check(meta['version'] == 'v3.9.52.0', 'release version')
        base.check(meta['activeDataYear'] == 2026 and meta['audienceYear'] == 2027, 'release years')
        base.check(meta['centeredThreeYearTrendContract'] is True, 'centered trend contract')
    for asset in ('js/major-difficulty-2026.v3952_0.js', 'js/ux/family-presentation.v3952_0.js'):
        base.check(asset in active['jsEntry'], f'active JS missing {asset}')
    for asset in ('css/dist/family-human-layer.v3952_0.css', 'css/dist/major-difficulty-2026.v3952_0.css'):
        base.check(asset in active['cssEntry'], f'active CSS missing {asset}')

    current_pages = ['ln-rank/index.html', 'ln-rank/selection-pool.html', 'ln-rank/major-trend-2026.html', 'ln2026.html', 'lngk2026.html', 'index.html', 'e.html']
    for path in current_pages:
        source = base.text(path)
        base.check('v3.9.52.0' in source or path == 'index.html', f'{path} version')
        base.check('v3.9.50.0' not in source, f'{path} old version')

    root = base.text('index.html')
    base.check(root.count('ln2026.html') == 1, 'root must expose one unified difficulty entry')
    base.check('lngk2026.html' not in root, 'root duplicate score-band trend entry remains')
    base.check('/fenxi' not in root, 'root must not point families to protected legacy runtime')
    base.check("location.replace('/')" in base.text('e.html'), 'e.html unified home redirect')

    unified = base.text('ln2026.html')
    for phrase in ('辽宁2026专业报考难度变化', '相比多数专业，更难报了', '相比多数专业，更容易报了', '按2026最低投档分分层查看'):
        base.check(phrase in unified, f'unified difficulty copy missing {phrase}')
    for phrase in ('专业投档热度观察', '相对全体前移', '相对全体后移', '年度共同位移'):
        base.check(phrase not in unified, f'technical or misleading copy visible: {phrase}')
    base.check('/ln2026.html#score-band' in base.text('lngk2026.html'), 'score-band legacy redirect')
    base.check('/ln2026.html#overview' in base.text('ln-rank/major-trend-2026.html'), 'trend legacy redirect')

    main_page = base.text('ln-rank/index.html')
    selection_page = base.text('ln-rank/selection-pool.html')
    for page, name in ((main_page, 'main'), (selection_page, 'selection')):
        base.check('family-human-layer.v3952_0.css' in page, f'{name} family CSS')
        base.check('family-presentation.v3952_0.js' in page, f'{name} family JS')
    family_js = base.text('ln-rank/js/ux/family-presentation.v3952_0.js')
    for phrase in ('正在准备专业数据，请稍候', '暂时没能读取专业数据', "get('debug') === '1'"):
        base.check(phrase in family_js, f'family technical-status contract missing {phrase}')
    base.check('正在读取 /fenxi' not in main_page, 'technical data path visible in main HTML')


def main():
    base.verify_protected_paths()
    base.verify_rank_table()
    verify_manifest_and_chunks()
    base.verify_centered_analysis()
    base.verify_runtime_contracts()
    verify_selection_and_feishu()
    verify_human_pages_and_assets()
    base.verify_internal_links()
    base.verify_no_temporary_payloads()
    print('LN 2026 human-language release verification passed')


if __name__ == '__main__':
    main()
