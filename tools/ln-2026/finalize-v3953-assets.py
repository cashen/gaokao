from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION = 'v3.9.55.0'
ASSET_VERSION = 'v3955_0'
ZY_EXPERIENCE_VERSION = 'v3.9.55.0'
ZY_ASSET_VERSION = 'v3955_0'


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def dump(path: str, value) -> None:
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def replace_version(path: str) -> None:
    target = ROOT / path
    if not target.exists():
        return
    text = target.read_text(encoding='utf-8')
    for old in ('v3.9.52.0', 'v3.9.53.0', 'v3.9.54.0'):
        text = text.replace(old, VERSION)
    target.write_text(text, encoding='utf-8')


def append_unique(items, value):
    if value not in items:
        items.append(value)


def sync_zy2026_alias() -> None:
    source = ROOT / 'zy2026/index.html'
    target = ROOT / 'zy2026.html'
    if not source.exists():
        raise RuntimeError('missing zy2026/index.html for extensionless route alias')
    target.write_text(source.read_text(encoding='utf-8'), encoding='utf-8')


def apply_zy2026_change_first(meta: dict) -> None:
    meta.update({
        'zy2026ExperienceVersion': ZY_EXPERIENCE_VERSION,
        'zy2026ExperienceAssetVersion': ZY_ASSET_VERSION,
        'zy2026ChangeFirstContract': True,
        'zy2026StableCollapsedContract': True,
        'zy2026FeaturedDiscoveryContract': True,
        'zy2026ChangePriorityOrderContract': True,
        'zy2026RecordLanguageContract': True,
    })


def apply_family_decision_contract(meta: dict) -> None:
    meta.update({
        'familyLanguageTrustContract': True,
        'familyFourStageLanguageContract': True,
        'familyNextStepHomepageContract': True,
        'familyDecisionStatusBarContract': True,
        'familyDecisionCardSummaryContract': True,
        'familyDecisionSelectionActionContract': True,
        'familyDecisionTongxueEntityContract': True,
        'familyDecisionPublicReviewCopyContract': True,
        'familyDecisionNoRankingInfluenceContract': True,
        'familyDecisionNoApiPrefetchContract': True,
        'familyDecisionNoNewObserverContract': True,
        'familyPresentationJs': 'js/ux/family-presentation.v3955_0.js',
        'familyDecisionBarJs': 'js/ux/family-decision-bar.v3955_0.js',
        'familyHomeJs': 'js/ux/family-home.v3955_0.js',
        'familyDecisionContractJs': 'js/domain/family-decision-contract.v3955_0.js',
        'familyDecisionCss': 'css/dist/family-decision-workspace.v3955_0.css',
    })


def apply_shared_resource_contract(meta: dict) -> None:
    meta.update({
        'sharedResourceCenterContract': True,
        'sharedResourceCenterVersion': 'v3955_0',
        'sharedExamResourceContract': True,
        'sharedRegionResourceContract': True,
        'sharedSchoolResourceContract': True,
        'sharedSchoolDirectoryLazySingleFlightContract': True,
        'sharedResourceCompatibilityAdapterContract': True,
        'sharedResourceNoPerCardNetworkContract': True,
        'sharedMainAppWrapperContract': True,
        'sharedMajorBandsRequestRewriteContract': True,
        'mainJs': 'js/app.v3955_0.js',
        'legacyMainJs': 'js/app.v3951_0.js',
        'sharedResourceRegistry': '../shared/resources/resource-registry.js',
        'sharedExamResource': '../shared/resources/exam/liaoning-physics.js',
        'sharedRegionResource': '../shared/resources/geo/china-region-catalog.js',
        'sharedSchoolResource': '../shared/resources/schools/school-resource-center.js',
    })


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
        'releaseName': 'v3.9.55.0-family-decision-card-ai-shared-resource-center-no-fenxi',
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
        'zy2026ExtensionlessAliasContract': True,
    })
    apply_family_decision_contract(release)
    apply_shared_resource_contract(release)
    apply_zy2026_change_first(release)
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
        'zy2026ExtensionlessAliasContract': True,
        'majorDifficultyJs': 'js/major-difficulty-2026.v3953_0.js',
    })
    apply_family_decision_contract(active)
    apply_shared_resource_contract(active)
    apply_zy2026_change_first(active)
    active['structure2026'] = {
        'page': '../zy2026/index.html',
        'css': '../zy2026/assets/zy2026.v3954_0.css',
        'js': '../zy2026/assets/zy2026.v3955_0.js',
        'summary': '../data/zy2026/summary.json',
        'schoolIndex': '../data/zy2026/school-index.json',
        'majorIndex': '../data/zy2026/major-index.json',
    }
    js_entries = active.setdefault('jsEntry', [])
    active['jsEntry'] = [item for item in js_entries if item not in (
        'js/app.v3951_0.js',
        'js/major-difficulty-2026.v3952_0.js',
        'js/ux/family-presentation.v3952_0.js',
    )]
    if 'js/app.v3955_0.js' not in active['jsEntry']:
        active['jsEntry'].insert(0, 'js/app.v3955_0.js')
    for item in (
        'js/major-difficulty-2026.v3953_0.js',
        'js/ux/compare-workspace.v3953_0.js',
        'js/ux/family-presentation.v3955_0.js',
        'js/ux/family-decision-bar.v3955_0.js',
        'js/ux/family-home.v3955_0.js',
    ):
        append_unique(active['jsEntry'], item)
    for item in (
        'css/dist/compare-workspace.v3953_0.css',
        'css/dist/compare-workspace-year-fix.v3953_0.css',
        'css/dist/family-decision-workspace.v3955_0.css',
    ):
        append_unique(active.setdefault('cssEntry', []), item)
    css_dist = active.setdefault('cssDist', {})
    css_dist['compareWorkspace'] = 'css/dist/compare-workspace.v3953_0.css'
    css_dist['compareWorkspaceYearFix'] = 'css/dist/compare-workspace-year-fix.v3953_0.css'
    css_dist['familyDecision'] = 'css/dist/family-decision-workspace.v3955_0.css'
    dump('ln-rank/active-assets.json', active)

    sync_zy2026_alias()

    print(json.dumps({
        'version': VERSION,
        'assets': [
            'ln-rank/js/app.v3955_0.js',
            'ln-rank/js/major-difficulty-2026.v3953_0.js',
            'ln-rank/js/ux/compare-workspace.v3953_0.js',
            'ln-rank/js/ux/family-presentation.v3955_0.js',
            'ln-rank/js/ux/family-decision-bar.v3955_0.js',
            'ln-rank/js/ux/family-home.v3955_0.js',
            'ln-rank/css/dist/family-decision-workspace.v3955_0.css',
            'shared/resources/exam/liaoning-physics.js',
            'shared/resources/geo/china-region-catalog.js',
            'shared/resources/schools/school-resource-center.js',
            'zy2026/assets/zy2026.v3955_0.js',
            'zy2026/assets/zy2026.v3954_0.css',
        ],
        'sharedResourceCenterVersion': 'v3955_0',
        'zy2026ExperienceVersion': ZY_EXPERIENCE_VERSION,
        'zy2026Alias': 'zy2026.html mirrors zy2026/index.html',
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
