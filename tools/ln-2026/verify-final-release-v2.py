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
    schools = {row.get('school') for row in records}
    base.check(len(schools) == 956, f'chunk school count {len(schools)}')
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
    low_text = json.dumps(below_undergraduate[0], ensure_ascii=False)
    base.check(re.search(r'预科|资格|边防', low_text), 'below-undergraduate record is not isolated as a special project')


def verify_selection_and_feishu():
    store = base.text('ln-rank/js/feature/selection-pool/store.js')
    for export_name in ('getPoolItems', 'savePoolItems', 'addPoolItem', 'removePoolItem', 'clearPoolItems', 'movePoolItem', 'movePoolItemTo', 'sortPoolItems', 'getPoolStats'):
        base.check(f'export function {export_name}' in store, f'selection store lost {export_name}')
    base.check('lnRank.selectionPool.lnPhysics.2026.v3951' in store, 'selection 2026 storage key')
    base.check('historicalOnly: true' in store, 'legacy selection isolation')
    recompute = base.text('ln-rank/js/feature/selection-pool/recompute.js')
    base.check('classifySelectionDelta' in recompute and 'scoreDelta2026' in recompute and 'rankGap2026' in recompute, 'selection recompute 2026')
    policy = base.text('ln-rank/js/domain/selection-band-policy.js')
    for needle in ('min: 1, max: 10', 'min: -10, max: 0', 'min: -25, max: -11'):
        base.check(needle in policy, f'shared band policy missing {needle}')
    selection_page = base.text('ln-rank/selection-pool.html')
    base.check('主要依据辽宁 2026' in selection_page, 'selection page primary year')
    base.check('/ln-rank/major-trend-2026.html' in selection_page, 'selection trend link')
    report = base.text('functions/_lib/feishu-selection-pool-report-builder.js')
    styled = base.text('functions/_lib/feishu-selection-pool-styled-builder.js')
    combined = report + styled
    for needle in ('score2026', 'rank2026', 'score2025', 'rank2025', 'score2024', 'rank2024'):
        base.check(needle in combined, f'Feishu missing {needle}')
    base.check('historicalOnly' in report and '!x.historicalOnly' in report, 'Feishu historical-only exclusion')
    base.check('2026投档最低分' in report, 'Feishu primary item line is not 2026')
    base.check('2025：' in report and '2024：' in report, 'Feishu three-year history rows')
    base.check('模考 / 预估参考分数' in report or '参考分数' in report, 'Feishu reference score wording')
    for phrase in ('你的 2027 位次', '2027 实际位次是'):
        base.check(phrase not in combined, f'Feishu forbidden wording: {phrase}')
    base.check('score2025 ?? item.score' not in report, 'Feishu must not use 2025 as primary fallback')


def main():
    base.verify_protected_paths()
    base.verify_rank_table()
    verify_manifest_and_chunks()
    base.verify_centered_analysis()
    base.verify_runtime_contracts()
    verify_selection_and_feishu()
    base.verify_pages_and_assets()
    base.verify_internal_links()
    base.verify_no_temporary_payloads()
    print('LN 2026 final release verification passed')


if __name__ == '__main__':
    main()
