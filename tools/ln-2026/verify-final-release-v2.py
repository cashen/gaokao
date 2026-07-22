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


def main():
    base.verify_protected_paths()
    base.verify_rank_table()
    verify_manifest_and_chunks()
    base.verify_centered_analysis()
    base.verify_runtime_contracts()
    base.verify_selection_and_feishu()
    base.verify_pages_and_assets()
    base.verify_internal_links()
    base.verify_no_temporary_payloads()
    print('LN 2026 final release verification passed')


if __name__ == '__main__':
    main()
