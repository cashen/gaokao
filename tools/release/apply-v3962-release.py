#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OLD_VERSION = 'v3.9.61.0'
NEW_VERSION = 'v3.9.62.0'
OLD_RELEASE = 'v3.9.61.0-selection-workspace-orchestration-no-fenxi'
NEW_RELEASE = 'v3.9.62.0-school-all-majors-no-fenxi'


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, value: str) -> None:
    (ROOT / path).write_text(value, encoding='utf-8')


def replace_all_version_literals() -> None:
    roots = [ROOT, ROOT / 'ln-rank', ROOT / 'shared', ROOT / 'tools', ROOT / '.github']
    seen: set[Path] = set()
    for base in roots:
        if not base.exists():
            continue
        for path in base.rglob('*'):
            if path in seen or not path.is_file() or path.suffix.lower() not in {'.js', '.mjs', '.py', '.html', '.json', '.yml', '.yaml', '.css'}:
                continue
            seen.add(path)
            source = path.read_text(encoding='utf-8')
            if OLD_VERSION not in source:
                continue
            path.write_text(source.replace(OLD_VERSION, NEW_VERSION), encoding='utf-8')


def update_current_release() -> None:
    path = 'shared/resources/release/current-release.js'
    source = text(path)
    source = source.replace(OLD_RELEASE, NEW_RELEASE)
    source = source.replace("asset: '3961_0'", "asset: '3962_0'")
    source = source.replace("assetVersion: 'v3961_0'", "assetVersion: 'v3962_0'")
    source = source.replace("label: 'selection-workspace-orchestration-no-fenxi'", "label: 'school-all-majors-no-fenxi'")
    marker = "  selectionWorkspaceVersion: 'selection-workspace-orchestration-v3961',\n"
    if "schoolAllModeVersion" not in source:
        source = source.replace(marker, marker + "  schoolAllModeVersion: 'school-all-mode-v3962',\n")
    write(path, source)


def update_meta(path: str) -> None:
    data = json.loads(text(path))
    data['version'] = NEW_VERSION
    data['assetVersion'] = 'v3962_0'
    data['releaseName'] = NEW_RELEASE
    data['generatedAt'] = datetime.now(timezone(timedelta(hours=8))).replace(microsecond=0).isoformat()
    data['releaseGate'] = 'resource-ownership-v3958-preserved, shared-ui-v3961, selection-workspace-v3961, school-all-v3962, algorithm-orchestration-v3960, protected-fenxi-runtime-unchanged'
    data['runtimeCacheQueryVersion'] = 'v3962_0'
    data['schoolAllModeVersion'] = 'school-all-mode-v3962'
    js_entry = data.setdefault('jsEntry', [])
    school_js = 'js/feature/school-majors/school-all-mode.v3962_0.js'
    if school_js not in js_entry:
        insert_at = js_entry.index('js/feature/selection-pool/index.v3961_0.js') + 1 if 'js/feature/selection-pool/index.v3961_0.js' in js_entry else 0
        js_entry.insert(insert_at, school_js)
    css_entry = data.setdefault('cssEntry', [])
    school_css = 'css/school-all-mode.v3962_0.css'
    if school_css not in css_entry:
        insert_at = css_entry.index('css/selection-workspace.v3961_0.css') + 1 if 'css/selection-workspace.v3961_0.css' in css_entry else 0
        css_entry.insert(insert_at, school_css)
    for key in (
        'schoolAllModeContract',
        'schoolAllSharedResourceContract',
        'schoolAllEntityIsolationContract',
        'schoolAllScoreInvariantContract',
        'schoolAllMultiTerminalContract',
        'schoolAllSharedSelectionPoolContract',
    ):
        data[key] = True
    write(path, json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def update_main_page() -> None:
    path = 'ln-rank/index.html'
    source = text(path)
    style = '  <link rel="stylesheet" href="/ln-rank/css/school-all-mode.v3962_0.css?v=3962_0" />\n'
    if 'school-all-mode.v3962_0.css' not in source:
        source = source.replace('  <link rel="stylesheet" href="/ln-rank/css/selection-workspace.v3961_0.css?v=3961_0" />\n', '  <link rel="stylesheet" href="/ln-rank/css/selection-workspace.v3961_0.css?v=3961_0" />\n' + style)
    source = source.replace('/ln-rank/js/app.v3961_0.js?v=3961_0', '/ln-rank/js/app.v3961_0.js?v=3962_0')
    write(path, source)


def update_verifier() -> None:
    path = 'tools/ln-2026/verify-final-release-v5.py'
    source = text(path)
    source = source.replace('/ln-rank/js/app.v3961_0.js?v=3961_0', '/ln-rank/js/app.v3961_0.js?v=3962_0')
    source = source.replace("\"assetVersion: 'v3961_0'\"", "\"assetVersion: 'v3962_0'\"")
    source = source.replace("meta['assetVersion'] == 'v3961_0'", "meta['assetVersion'] == 'v3962_0'")
    source = source.replace("base.check('css/selection-workspace.v3961_0.css' in active['cssEntry'], 'workspace CSS not active')", "base.check('css/selection-workspace.v3961_0.css' in active['cssEntry'], 'workspace CSS not active')\n    base.check('css/school-all-mode.v3962_0.css' in active['cssEntry'], 'school-all CSS not active')\n    base.check('js/feature/school-majors/school-all-mode.v3962_0.js' in active['jsEntry'], 'school-all JS not active')")
    marker = "    contains('ln-rank/js/selection-pool.v3960_0.js', 'release-presenter.js?v=3961_0', 'shared/ui/shell/family-shell.v3960_0.js', 'ALGORITHM_CONTRACT')\n"
    school_checks = "    contains('ln-rank/js/feature/school-majors/school-all-mode.v3962_0.js', 'resolveCompactSchoolResource', 'createSelectionPoolAdapter', \"const API_PATH = '/api/school-majors'\", 'school-all-mode-v3962')\n    contains('ln-rank/css/school-all-mode.v3962_0.css', 'body[data-result-mode=\"school-all\"]', '@media (max-width: 767px)', '@media (max-width: 390px)')\n    contains('functions/api/school-majors.js', \"../_lib/ln-rank-manifest.js\", 'school-identity-center.js', 'canonical-position.v3960_0.js', \"mode: 'shared-records-school-exact'\")\n"
    if 'school-all-mode-v3962' not in source:
        source = source.replace(marker, marker + school_checks)
    required_marker = "        'keyboardViewportSingleOwnerContract', 'androidNoLayoutJitterContract', 'layoutShiftBudgetContract'\n"
    if 'schoolAllModeContract' not in source:
        source = source.replace(required_marker, "        'keyboardViewportSingleOwnerContract', 'androidNoLayoutJitterContract', 'layoutShiftBudgetContract',\n        'schoolAllModeContract', 'schoolAllSharedResourceContract', 'schoolAllEntityIsolationContract',\n        'schoolAllScoreInvariantContract', 'schoolAllMultiTerminalContract', 'schoolAllSharedSelectionPoolContract'\n")
    write(path, source)


def update_workflow_runtime_assertion() -> None:
    path = '.github/workflows/verify-ln-2026-final.yml'
    source = text(path)
    source = source.replace("CURRENT_RELEASE.assetVersion!=='v3961_0'", "CURRENT_RELEASE.assetVersion!=='v3962_0'")
    source = source.replace('/ln-rank/js/app.v3961_0.js /ln-rank/js/workspace/', '/ln-rank/js/app.v3961_0.js /ln-rank/js/feature/school-majors/school-all-mode.v3962_0.js /ln-rank/css/school-all-mode.v3962_0.css /ln-rank/js/workspace/')
    write(path, source)


def update_active_audits() -> None:
    path = 'tools/audit-active-runtime-v3957.mjs'
    source = text(path)
    marker = "  'algorithm-orchestration-v3960','resolveCanonicalPosition','staged-ranking-v3960_0','decision-snapshot-v3960_0'\n"
    if 'school-all-mode-v3962' not in source:
        source = source.replace(marker, "  'algorithm-orchestration-v3960','resolveCanonicalPosition','staged-ranking-v3960_0','decision-snapshot-v3960_0',\n  'school-all-mode-v3962','/api/school-majors','resolveCompactSchoolResource'\n")
    write(path, source)


def remove_one_time_files() -> None:
    for rel in ('tools/release/apply-v3962-release.py', '.github/workflows/apply-v3962-release.yml'):
        target = ROOT / rel
        if target.exists():
            target.unlink()


def main() -> None:
    replace_all_version_literals()
    update_current_release()
    update_meta('ln-rank/release-meta.json')
    update_meta('ln-rank/active-assets.json')
    update_main_page()
    update_verifier()
    update_workflow_runtime_assertion()
    update_active_audits()
    remove_one_time_files()
    print(json.dumps({'ok': True, 'release': NEW_VERSION, 'asset': 'v3962_0'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
