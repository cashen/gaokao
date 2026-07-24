#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

for rel in ('ln-rank/release-meta.json', 'ln-rank/active-assets.json'):
    path = ROOT / rel
    source = path.read_text(encoding='utf-8')
    old = '"sharedResourceCenterVersion": "v3961_0"'
    new = '"sharedResourceCenterVersion": "v3962_0"'
    if old not in source and new not in source:
        raise SystemExit(f'{rel}: shared resource version marker missing')
    path.write_text(source.replace(old, new), encoding='utf-8')

verifier = ROOT / 'tools/ln-2026/verify-final-release-v5.py'
source = verifier.read_text(encoding='utf-8')
source = source.replace("meta['sharedResourceCenterVersion'] == 'v3961_0'", "meta['sharedResourceCenterVersion'] == 'v3962_0'")
verifier.write_text(source, encoding='utf-8')

audit = ROOT / 'tools/audit-shared-resource-center-v3957.mjs'
source = audit.read_text(encoding='utf-8')
source = source.replace("assert.equal(SHARED_RESOURCE_CENTER_VERSION, 'v3961_0');", "assert.equal(SHARED_RESOURCE_CENTER_VERSION, CURRENT_RELEASE.assetVersion);")
audit.write_text(source, encoding='utf-8')

print('RESOURCE_CENTER_V3962_SYNC_OK')
