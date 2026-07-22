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
            tried = ', '.join(str(candidate.relative_to(ROOT)) if candidate.is_relative_to(ROOT) else str(candidate) for candidate in candidates)
            raise RuntimeError(f'missing data chunk: {raw}; tried: {tried}')
        rows.extend(builder.load_rows(path))
    return rows


def sync_extensionless_alias() -> None:
    """Keep /zy2026 working when Pages resolves it to zy2026.html first."""
    source = ROOT / 'zy2026/index.html'
    target = ROOT / 'zy2026.html'
    if not source.exists():
        raise RuntimeError('missing zy2026/index.html for route alias')
    target.write_text(source.read_text(encoding='utf-8'), encoding='utf-8')


builder.load_manifest_rows = load_manifest_rows
builder.build()
sync_extensionless_alias()
