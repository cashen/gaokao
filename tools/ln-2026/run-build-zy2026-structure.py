from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SPEC = importlib.util.spec_from_file_location('zy2026_structure_builder', HERE / 'build-zy2026-structure.py')
builder = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
sys.modules[SPEC.name] = builder
SPEC.loader.exec_module(builder)

ZY_EXPERIENCE_VERSION = 'v3.9.55.0'
ZY_ASSET_VERSION = 'v3955_0'


def load_manifest_rows(manifest_path: Path, prefix: Path) -> list[dict]:
    """Resolve both legacy manifest-relative paths and fenxi-relative paths."""
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    rows: list[dict] = []
    for chunk in manifest.get('chunks', []):
        raw = str(chunk.get('file') or chunk.get('path') or '').strip()
        if not raw:
            continue
        raw_path = Path(raw)
        candidates = [
            prefix / raw_path,
            prefix / raw_path.name,
            manifest_path.parent / raw_path,
            ROOT / 'fenxi' / raw_path,
            ROOT / raw_path,
        ]
        path = next((candidate for candidate in candidates if candidate.exists()), None)
        if path is None:
            tried = ', '.join(
                str(candidate.relative_to(ROOT)) if candidate.is_relative_to(ROOT) else str(candidate)
                for candidate in candidates
            )
            raise RuntimeError(f'missing data chunk: {raw}; tried: {tried}')
        rows.extend(builder.load_rows(path))
    return rows


def dump_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def sync_change_first_contract() -> None:
    """Restore the user-facing change-first assets after rebuilding data."""
    release_path = ROOT / 'ln-rank/release-meta.json'
    active_path = ROOT / 'ln-rank/active-assets.json'
    release = json.loads(release_path.read_text(encoding='utf-8'))
    release.update({
        'zy2026ExperienceVersion': ZY_EXPERIENCE_VERSION,
        'zy2026ExperienceAssetVersion': ZY_ASSET_VERSION,
        'zy2026ChangeFirstContract': True,
        'zy2026StableCollapsedContract': True,
        'zy2026FeaturedDiscoveryContract': True,
        'zy2026ChangePriorityOrderContract': True,
        'zy2026RecordLanguageContract': True,
    })
    dump_json(release_path, release)

    active = json.loads(active_path.read_text(encoding='utf-8'))
    active.update({
        'zy2026ExperienceVersion': ZY_EXPERIENCE_VERSION,
        'zy2026ExperienceAssetVersion': ZY_ASSET_VERSION,
        'zy2026ChangeFirstContract': True,
        'zy2026StableCollapsedContract': True,
        'zy2026FeaturedDiscoveryContract': True,
        'zy2026ChangePriorityOrderContract': True,
        'zy2026RecordLanguageContract': True,
    })
    structure = active.setdefault('structure2026', {})
    structure.update({
        'page': '../zy2026/index.html',
        'css': '../zy2026/assets/zy2026.v3954_0.css',
        'js': '../zy2026/assets/zy2026.v3955_0.js',
        'summary': '../data/zy2026/summary.json',
        'schoolIndex': '../data/zy2026/school-index.json',
        'majorIndex': '../data/zy2026/major-index.json',
    })
    dump_json(active_path, active)


def sync_extensionless_alias() -> None:
    """Keep /zy2026 working when Pages resolves it to zy2026.html first."""
    source = ROOT / 'zy2026/index.html'
    target = ROOT / 'zy2026.html'
    if not source.exists():
        raise RuntimeError('missing zy2026/index.html for route alias')
    target.write_text(source.read_text(encoding='utf-8'), encoding='utf-8')


builder.load_manifest_rows = load_manifest_rows
builder.build()
sync_change_first_contract()
sync_extensionless_alias()
