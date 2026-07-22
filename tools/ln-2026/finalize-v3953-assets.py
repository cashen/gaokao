from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION = 'v3.9.53.0'
ASSET_VERSION = 'v3953_0'


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def dump(path: str, value) -> None:
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def replace_version(path: str) -> None:
    target = ROOT / path
    if not target.exists():
        return
    text = target.read_text(encoding='utf-8').replace('v3.9.52.0', VERSION)
    target.write_text(text, encoding='utf-8')


def append_unique(items, value):
    if value not in items:
        items.append(value)


def main() -> None:
    for path in (
        'ln-rank/index.html', 'ln-rank/selection-pool.html',
        'ln-rank/local-mainline.html', 'ln-rank/211-mainline.html',
        'ln-rank/major-trend-2026.html', 'ln2026.html', 'lngk2026.html',
        'index.html', 'e.html', 'zy.html', 'zy2026.html',
    ):
        replace_version(path)

    trend_path = 'ln-rank/data/major-trend-2026.json'
    trend = load(trend_path)
    trend['productVersion'] = VERSION
    dump(trend_path, trend)

    release = load('ln-rank/release-meta.json')
    release.update({
        'version': VERSION,
        'assetVersion': ASSET_VERSION,
        'releaseName': 'v3.9.53.0-zy2026-structure-and-human-compare-workspace-no-fenxi',
        'majorDifficultyJs': 'js/major-difficulty-2026.v3953_0.js',
        'compareWorkspaceCss': 'css/dist/compare-workspace.v3953_0.css',
        'compareWorkspaceYearFixCss': 'css/dist/compare-workspace-year-fix.v3953_0.css',
        'compareWorkspaceJs': 'js/ux/compare-workspace.v3953_0.js',
        'runtimeCacheQueryVersion': ASSET_VERSION,
        'ln2026ScoreBandAscendingContract': True,
        'compareWorkspaceHumanJourneyContract': True,
        'compareWorkspaceDesktopHorizontalContract': True,
        'compareWorkspaceTabletSwipeContract': True,
        'compareWorkspaceAndroidSnapContract': True,
        'compareWorkspaceAutoNavigateContract': True,
        'compareWorkspaceYearLabelContract': True,
    })
    dump('ln-rank/release-meta.json', release)

    active = load('ln-rank/active-assets.json')
    active.update({
        'version': VERSION,
        'assetVersion': ASSET_VERSION,
        'runtimeCacheQueryVersion': ASSET_VERSION,
        'ln2026ScoreBandAscendingContract': True,
        'compareWorkspaceHumanJourneyContract': True,
        'compareWorkspaceDesktopHorizontalContract': True,
        'compareWorkspaceTabletSwipeContract': True,
        'compareWorkspaceAndroidSnapContract': True,
        'compareWorkspaceAutoNavigateContract': True,
        'compareWorkspaceYearLabelContract': True,
        'majorDifficultyJs': 'js/major-difficulty-2026.v3953_0.js',
    })
    js_entries = active.setdefault('jsEntry', [])
    active['jsEntry'] = [item for item in js_entries if item != 'js/major-difficulty-2026.v3952_0.js']
    append_unique(active['jsEntry'], 'js/major-difficulty-2026.v3953_0.js')
    append_unique(active['jsEntry'], 'js/ux/compare-workspace.v3953_0.js')
    append_unique(active.setdefault('cssEntry', []), 'css/dist/compare-workspace.v3953_0.css')
    append_unique(active['cssEntry'], 'css/dist/compare-workspace-year-fix.v3953_0.css')
    css_dist = active.setdefault('cssDist', {})
    css_dist['compareWorkspace'] = 'css/dist/compare-workspace.v3953_0.css'
    css_dist['compareWorkspaceYearFix'] = 'css/dist/compare-workspace-year-fix.v3953_0.css'
    dump('ln-rank/active-assets.json', active)

    print(json.dumps({
        'version': VERSION,
        'assets': [
            'ln-rank/js/major-difficulty-2026.v3953_0.js',
            'ln-rank/js/ux/compare-workspace.v3953_0.js',
            'ln-rank/css/dist/compare-workspace.v3953_0.css',
            'ln-rank/css/dist/compare-workspace-year-fix.v3953_0.css',
        ],
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
