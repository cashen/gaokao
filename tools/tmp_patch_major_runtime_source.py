from pathlib import Path

p = Path('tools/tmp_ln_rank_worker_vnext_consumer_fix_v2.py')
s = p.read_text(encoding='utf-8')
old = '''    buckets = [dict() for _ in range(SHARD_COUNT)]
    for key in sorted(nodes):
        buckets[fnv1a(key) % SHARD_COUNT][key] = nodes[key]
    for file in old_files:
        file.unlink()
'''
new = '''    # Keep existing major-XX relation shards untouched for ZY2026 UI. Worker reads exact-only runtime shards.
    buckets = [dict() for _ in range(SHARD_COUNT)]
    for key in sorted(runtime):
        buckets[fnv1a(key) % SHARD_COUNT][key] = {
            'runtimeRecords2026': runtime[key],
            'runtimeRecordCount2026': len(runtime[key]),
        }
'''
if old not in s:
    raise SystemExit('major bucket source block not found')
s = s.replace(old, new, 1)
s = s.replace("filename = f'major-{i:02d}.json'", "filename = f'major-runtime-{i:02d}.json'", 1)
old_ui = '''    ui_items = index.get('majors') or []
    for item in ui_items:
        key = item.get('key') or item.get('label')
        if key in nodes:
            item['chunk'] = f'major-{fnv1a(key) % SHARD_COUNT:02d}.json'
'''
new_ui = '''    # Existing UI major index keeps its original relation-shard pointers.
    ui_items = index.get('majors') or []
'''
if old_ui not in s:
    raise SystemExit('major UI pointer block not found')
s = s.replace(old_ui, new_ui, 1)
s = s.replace("'chunk': f'major-{fnv1a(key) % SHARD_COUNT:02d}.json'", "'chunk': f'major-runtime-{fnv1a(key) % SHARD_COUNT:02d}.json'", 1)
s = s.replace("/^major-\\d{2}\\.json$/", "/^major-runtime-\\d{2}\\.json$/")
s = s.replace("/^major-\\\\d{2}\\\\.json$/", "/^major-runtime-\\\\d{2}\\\\.json$/")
p.write_text(s, encoding='utf-8')
print('patched exact-only major runtime shard generation')
