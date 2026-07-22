from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION = 'v3.9.51.0'
ASSET = 'v3951_0'


def load(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def save(path, value):
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def patch_text(path, replacements):
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    for old, new in replacements:
        if old not in text:
            raise RuntimeError(f'{path}: missing text to replace: {old}')
        text = text.replace(old, new)
    target.write_text(text, encoding='utf-8')


def main():
    active = load('ln-rank/active-assets.json')
    active.update({
        'version': VERSION,
        'assetVersion': ASSET,
        'html': [
            'index.html',
            'selection-pool.html',
            '211-mainline.html',
            'local-mainline.html',
            'major-trend-2026.html',
            'self-check.html'
        ],
        'jsEntry': [
            'js/app.v3951_0.js',
            'js/selection-pool.v3951_0.js',
            'js/major-trend-render.v3951_0.js',
            'js/self-check.v3949_0.js',
            'js/local-mainline/local-mainline-app.v3951_0.js',
            'js/211-mainline/211-mainline-app.v3951_0.js',
            'js/ux/multi-terminal.v3949_4.js',
            'js/ux/v3949_4-self-check.js'
        ],
        'releaseGate': '2026-data, 2024-2026-centered-trends, selection-feishu-sync, 360-375-412-ipad-wide, readable-width, touch-44, reduced-motion, protected-fenxi-runtime-unchanged',
        'humanUiNoBusinessLogicChange': False,
        'runtimeCacheQueryVersion': ASSET,
        'preservedCoreModuleQueryVersion': ASSET,
        'preservedRuntimeModuleQueryVersion': ASSET,
        'activeDataYear': 2026,
        'audienceYear': 2027,
        'rankTableYear': 2026,
        'controlLines': {'special': 508, 'undergraduate': 344, 'vocational': 150},
        'cardThreeYearReference': True,
        'centeredThreeYearTrendContract': True,
        'annualCommonShiftAuditContract': True,
        'selectionPool2026MigrationContract': True,
        'feishu2026ThreeYearContract': True,
        'majorTrendJson': 'data/major-trend-2026.json',
        'mainJs': 'js/app.v3951_0.js',
        'selectionPoolJs': 'js/selection-pool.v3951_0.js',
        'majorTrendJs': 'js/major-trend-render.v3951_0.js'
    })
    save('ln-rank/active-assets.json', active)

    release = load('ln-rank/release-meta.json')
    release.update({
        'version': VERSION,
        'assetVersion': ASSET,
        'releaseName': 'v3.9.51.0-ln-rank-2026-centered-three-year-family-analysis-12-role-no-fenxi',
        'releaseGate': '2026-data, 2024-2026-centered-trends, selection-feishu-sync, multi-terminal-regression, protected-fenxi-runtime-unchanged',
        'humanUiNoBusinessLogicChange': False,
        'runtimeCacheQueryVersion': ASSET,
        'preservedCoreModuleQueryVersion': ASSET,
        'preservedRuntimeModuleQueryVersion': ASSET,
        'activeDataYear': 2026,
        'audienceYear': 2027,
        'rankTableYear': 2026,
        'controlLines': {'special': 508, 'undergraduate': 344, 'vocational': 150},
        'threeYearAnalysis': True,
        'threeYearAnalysisVersion': 'three-year-2024-2026-centered-v1.0.0',
        'centeredThreeYearTrendContract': True,
        'annualCommonShiftAuditContract': True,
        'ln2026AnnualObservation': True,
        'lngk2026HeatObservation': True,
        'selectionPool2026Migration': True,
        'feishuThreeYearContract': True,
        'protectedFenxiRuntimeUnchanged': True
    })
    save('ln-rank/release-meta.json', release)

    patch_text('index.html', [
        ('按分数或位次先圈出可讨论专业', '按模考或预估参考分数先圈出可讨论专业'),
        ('输入分数或位次，先圈出可讨论专业', '输入模考或预估参考分数，先圈出可讨论专业'),
        ('看2024—2026连续变化、最新变化和反转，只作历史观察。', '看 2024—2026 连续变化、最新变化和反转，只作历史观察。'),
        ('帮助了解2026分数段专业投档热度观察，不作录取判断。', '按 2026 投档分段查看三年相对位置变化；“热度”不等于报名人数或就业热度。')
    ])

    print('LN 2026 release metadata finalized')


if __name__ == '__main__':
    main()
