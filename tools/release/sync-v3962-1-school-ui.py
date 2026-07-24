#!/usr/bin/env python3
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION = 'v3.9.62.1'
ASSET = 'v3962_1'
RELEASE_NAME = 'v3.9.62.1-school-ui-governance-no-fenxi'
OLD_VERSION = 'v3.9.62.0'
OLD_ASSET = 'v3962_0'
OLD_JS = 'js/feature/school-majors/school-all-mode.v3962_0.js'
NEW_JS = 'js/feature/school-majors/school-all-mode.v3962_1.js'
OLD_CSS = 'css/school-all-mode.v3962_0.css'
NEW_CSS = 'css/school-all-mode.v3962_1.css'


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, content):
    (ROOT / path).write_text(content, encoding='utf-8')


def replace_required(path, replacements):
    source = read(path)
    for old, new in replacements:
        if old not in source and new not in source:
            raise SystemExit(f'{path}: expected marker missing: {old}')
        source = source.replace(old, new)
    write(path, source)


def replace_present(path, replacements):
    source = read(path)
    observed = []
    changed = []
    for old, new in replacements:
        if old in source:
            source = source.replace(old, new)
            observed.append(old)
            changed.append(old)
        elif new in source:
            observed.append(new)
    if not observed:
        expected = ', '.join(old for old, _ in replacements)
        raise SystemExit(f'{path}: none of the controlled release markers were found: {expected}')
    write(path, source)
    return changed


def sync_manifest(path):
    target = ROOT / path
    data = json.loads(target.read_text(encoding='utf-8'))
    data['version'] = VERSION
    data['assetVersion'] = ASSET
    data['releaseName'] = RELEASE_NAME
    data['generatedAt'] = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
    data['releaseGate'] = 'resource-ownership-v3958-preserved, shared-ui-v3961, selection-workspace-v3961, school-all-v3962_1, school-ui-governance-v3962_1, algorithm-orchestration-v3960, protected-fenxi-runtime-unchanged'
    data['sharedResourceCenterVersion'] = ASSET
    data['runtimeCacheQueryVersion'] = ASSET
    data['schoolAllModeVersion'] = 'school-all-mode-v3962_1'
    data['schoolUiGovernanceVersion'] = 'school-ui-governance-v3962_1'
    data['schoolAllSharedUiGovernanceContract'] = True
    data['schoolAllFullRowDetailsContract'] = True
    data['schoolAllContainerResponsiveContract'] = True
    data['schoolAllBrowserMultiTerminalContract'] = True
    data['jsEntry'] = [NEW_JS if item == OLD_JS else item for item in data.get('jsEntry', [])]
    data['cssEntry'] = [NEW_CSS if item == OLD_CSS else item for item in data.get('cssEntry', [])]
    if NEW_JS not in data['jsEntry'] or OLD_JS in data['jsEntry']:
        raise SystemExit(f'{path}: active school JS was not synchronized')
    if NEW_CSS not in data['cssEntry'] or OLD_CSS in data['cssEntry']:
        raise SystemExit(f'{path}: active school CSS was not synchronized')
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


for manifest in ('ln-rank/release-meta.json', 'ln-rank/active-assets.json'):
    sync_manifest(manifest)

for page in (
    'index.html',
    'ln-rank/selection-pool.html',
    'ln2026.html',
    'zy2026.html',
    'zy2026/index.html',
):
    replace_required(page, [(OLD_VERSION, VERSION)])

replace_required('ln-rank/css/selection-workspace.v3961_0.css', [('v3.9.62.0 selection workspace orchestration', 'v3.9.62.1 selection workspace orchestration')])

controlled_markers = [
    (OLD_VERSION, VERSION),
    (OLD_ASSET, ASSET),
    ('school-all-mode.v3962_0.js', 'school-all-mode.v3962_1.js'),
    ('school-all-mode.v3962_0.css', 'school-all-mode.v3962_1.css'),
    ('school-all-mode-v3962', 'school-all-mode-v3962_1'),
]
for verifier in (
    'tools/ln-2026/verify-final-release-v5.py',
    'tools/check-ln-2026-release.mjs',
    'tools/audit-ui-orchestration-v3959.mjs',
    'tools/audit-selection-workspace-v3961.mjs',
    'tools/audit-algorithm-orchestration-v3960.mjs',
    'tools/verify-family-decision-v3955.mjs',
    'tools/audit-shared-resource-center-v3957.mjs',
):
    replace_present(verifier, controlled_markers)

for path in ('ln-rank/release-meta.json', 'ln-rank/active-assets.json'):
    data = json.loads(read(path))
    assert data['version'] == VERSION
    assert data['assetVersion'] == ASSET
    assert data['schoolUiGovernanceVersion'] == 'school-ui-governance-v3962_1'
    assert data['schoolAllSharedUiGovernanceContract'] is True
    assert NEW_JS in data['jsEntry'] and OLD_JS not in data['jsEntry']
    assert NEW_CSS in data['cssEntry'] and OLD_CSS not in data['cssEntry']

for page in ('index.html', 'ln-rank/selection-pool.html', 'ln2026.html', 'zy2026.html', 'zy2026/index.html'):
    assert OLD_VERSION not in read(page), f'{page}: old visible release remains'

print('V3962_1_RELEASE_SYNC_OK')
