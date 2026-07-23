#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def p(rel: str) -> Path:
    return ROOT / rel


def read(rel: str) -> str:
    return p(rel).read_text(encoding='utf-8')


def write(rel: str, text: str) -> None:
    target = p(rel)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding='utf-8')


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 occurrence, got {count}')
    return text.replace(old, new, 1)


def update_json(rel: str) -> None:
    data = json.loads(read(rel))
    data['releaseName'] = 'v3.9.57.0-school-profile-tongxue-direct-result-no-fenxi'
    data['releaseGate'] = 'official-2026-school-profile, military-special-profile, campus-inheritance, 985-211-double-non, public-private-card-tags, tongxue-direct-result, protected-fenxi-runtime-unchanged'
    data['tongxueDirectHandoffContract'] = True
    data['tongxueDirectHandoffVersion'] = 'v1.5.6'
    data['tongxueDirectResultContract'] = True
    data['tongxueDirectResultVersion'] = 'v1.5.6'
    data['tongxueDirectResultOnlyContentContract'] = True
    data['tongxueSuggestionAutoCollapseContract'] = True
    data['tongxueAmbiguityFallbackContract'] = True
    data['tongxueChangeSchoolContract'] = True
    data['schoolProfileSpecialMilitaryContract'] = True
    data['schoolProfileSourceCount'] = 2952
    data['schoolProfilePrivateCount'] = 840
    data['schoolProfile985OfficialMatchedCount'] = 38
    data['schoolProfile211OfficialMatchedCount'] = 112
    data['schoolProfileSpecialCount'] = 3
    if rel.endswith('active-assets.json'):
        data['jsEntry'] = [
            'js/self-check.v3957_0.js' if item == 'js/self-check.v3956_0.js' else item
            for item in data.get('jsEntry', [])
        ]
    write(rel, json.dumps(data, ensure_ascii=False, indent=2) + '\n')


for rel in ('ln-rank/release-meta.json', 'ln-rank/active-assets.json'):
    update_json(rel)

# Versioned self-check page: the Feishu client remains v3956, while the release shell is v3957.
self_page = read('ln-rank/self-check.html')
self_page = self_page.replace('v3.9.56.0', 'v3.9.57.0')
self_page = self_page.replace('/ln-rank/js/self-check.v3956_0.js?v=3956_0', '/ln-rank/js/self-check.v3957_0.js?v=3957_0')
self_page = self_page.replace('active 资源、孩子方向讨论助手、报告流程和多终端真实使用路径合同', 'active资源、统一学校资料、同学你好直达结果、报告流程和多终端真实使用路径合同')
write('ln-rank/self-check.html', self_page)

self_js = read('ln-rank/js/self-check.v3956_0.js')
self_js = self_js.replace("const VERSION='v3.9.56.0';", "const VERSION='v3.9.57.0';")
self_js = self_js.replace("const ASSET='v3956_0';", "const ASSET='v3957_0';")
self_js = self_js.replace('/ln-rank/active-assets.json?v=3956_0', '/ln-rank/active-assets.json?v=3957_0')
self_js = self_js.replace('/ln-rank/release-meta.json?v=3956_0', '/ln-rank/release-meta.json?v=3957_0')
self_js = self_js.replace('/api/ln-rank-self-check?v=3956_0', '/api/ln-rank-self-check?v=3957_0')
write('ln-rank/js/self-check.v3957_0.js', self_js)

# Compact release contract.
check = read('tools/check-ln-2026-release.mjs')
check = check.replace("main.includes('v3.9.56.0')", "main.includes('v3.9.57.0')")
check = check.replace("app.v3956_0.js?v=3956_0", "app.v3957_0.js?v=3957_0")
check = check.replace("app.v3951_0.js?v=3956_0", "app.v3951_0.js?v=3957_0")
check = check.replace("selection.includes('v3.9.56.0')", "selection.includes('v3.9.57.0')")
check = check.replace("const appWrapper=t('ln-rank/js/app.v3956_0.js');", "const appWrapper=t('ln-rank/js/app.v3957_0.js');")
check = check.replace("active.version==='v3.9.56.0'&&active.assetVersion==='v3956_0'", "active.version==='v3.9.57.0'&&active.assetVersion==='v3957_0'")
check = check.replace("active.mainJs==='js/app.v3956_0.js'&&active.jsEntry.includes('js/app.v3956_0.js')", "active.mainJs==='js/app.v3957_0.js'&&active.jsEntry.includes('js/app.v3957_0.js')")
check = check.replace("release.version==='v3.9.56.0'&&release.assetVersion==='v3956_0'", "release.version==='v3.9.57.0'&&release.assetVersion==='v3957_0'")
check = check.replace("tongxue-performance-v155.js?v=155", "tongxue-performance-v156.js?v=156")
check = check.replace("'Tongxue v155 active'", "'Tongxue v156 active'")
check = check.replace("LN 2026 v3.9.56.0 Feishu, Tongxue and shared resource checks passed", "LN 2026 v3.9.57.0 school profile and Tongxue direct-result checks passed")
profile_anchor = "ok(sharedSchool.includes('tongxueDirectoryPromise')&&sharedSchool.includes('resolveCardSchoolResource'),'shared school center');"
profile_checks = "\nconst schoolProfile=t('shared/resources/schools/school-profile-center.js');\nok(schoolProfile.includes('SCHOOL_PROFILE_ROWS')&&schoolProfile.includes('SCHOOL_PROFILE_SPECIALS'),'shared school profile center');\nok(t('functions/_lib/school-tags.js').includes('school-profile-center.js')&&t('functions/_lib/location-normalizer.js').includes('school-profile-center.js'),'school profile adapters');\nok(t('ln-rank/js/feature/major-pool/render.v3957_0.js').includes('双非（非985/211）'),'school profile card tags');"
if profile_checks.strip() not in check:
    check = one(check, profile_anchor, profile_anchor + profile_checks, 'compact school profile checks')
contract_anchor = "ok(release.feishuSharedResourceContract===true&&release.feishuThreeEntryRegressionContract===true&&release.tongxueDirectHandoffContract===true,'v3956 integration contracts');"
contract_new = "ok(release.feishuSharedResourceContract===true&&release.feishuThreeEntryRegressionContract===true&&release.tongxueDirectHandoffContract===true,'Feishu and Tongxue contracts');\nok(release.sharedSchoolProfileContract===true&&release.schoolProfileCardAlwaysVisibleContract===true&&release.tongxueDirectResultContract===true,'v3957 school profile contracts');"
check = one(check, contract_anchor, contract_new, 'compact release contract')
write('tools/check-ln-2026-release.mjs', check)

# Full Python release verifier.
verify = read('tools/ln-2026/verify-final-release-v3.py')
verify = verify.replace("base.VERSION = 'v3.9.56.0'", "base.VERSION = 'v3.9.57.0'")
verify = verify.replace("'/ln-rank/js/app.v3956_0.js?v=3956_0', 'data-release=\"v3.9.56.0\"'", "'/ln-rank/js/app.v3957_0.js?v=3957_0', 'data-release=\"v3.9.57.0\"'")
verify = verify.replace("'tongxue-performance-v155.js?v=155', '同学你好 v1.5.5'", "'tongxue-performance-v156.js?v=156', '同学你好 v1.5.6'")
verify = verify.replace("contains('ln-rank/js/app.v3956_0.js'", "contains('ln-rank/js/app.v3957_0.js'")
verify = verify.replace("meta['version'] == 'v3.9.56.0' and meta['assetVersion'] == 'v3956_0'", "meta['version'] == 'v3.9.57.0' and meta['assetVersion'] == 'v3957_0'")
verify = verify.replace("meta['sharedResourceCenterVersion'] == 'v3956_0'", "meta['sharedResourceCenterVersion'] == 'v3957_0'")
verify = verify.replace("active['mainJs'] == 'js/app.v3956_0.js'", "active['mainJs'] == 'js/app.v3957_0.js'")
verify = verify.replace("'js/app.v3956_0.js' in active['jsEntry']", "'js/app.v3957_0.js' in active['jsEntry']")
verify = verify.replace("LN 2026 v3.9.56.0 Feishu, Tongxue and shared resource verification passed", "LN 2026 v3.9.57.0 school profile and Tongxue direct-result verification passed")
keys_old = "'feishuSharedResourceContract', 'feishuThreeEntryRegressionContract', 'tongxueDirectHandoffContract'"
keys_new = "'feishuSharedResourceContract', 'feishuThreeEntryRegressionContract', 'tongxueDirectHandoffContract', 'tongxueDirectResultContract', 'sharedSchoolProfileContract', 'schoolProfileNatureContract', 'schoolProfile985211Contract', 'schoolProfileDoubleNonContract', 'schoolProfileCardAlwaysVisibleContract'"
verify = verify.replace(keys_old, keys_new)
shared_anchor = "    contains('shared/resources/resource-registry.js', 'lazy-single-flight')"
shared_extra = "\n    contains('shared/resources/schools/school-profile-center.js', 'SCHOOL_PROFILE_ROWS', 'SCHOOL_PROFILE_SPECIALS', '双非（非985/211）')\n    contains('functions/_lib/school-tags.js', 'shared/resources/schools/school-profile-center.js')\n    contains('functions/_lib/location-normalizer.js', 'shared/resources/schools/school-profile-center.js')\n    contains('functions/_lib/school-display-tags.js', 'shared/resources/schools/school-profile-center.js')\n    contains('ln-rank/js/feature/major-pool/render.v3957_0.js', 'schoolEntityTypeLabel', '地域待核验', '双非（非985/211）')"
if shared_extra.strip() not in verify:
    verify = one(verify, shared_anchor, shared_anchor + shared_extra, 'full school profile checks')
tongxue_anchor = "    contains('tongxue/app/tongxue-direct-handoff-v155.js', 'button.click()', 'shouldAutoQuery')"
tongxue_extra = "\n    contains('tongxue/app/tongxue-direct-result-v156.js', 'hero.hidden = !visible', 'suggestionsBox.replaceChildren()', 'needs-confirmation', '换一所学校')"
if tongxue_extra.strip() not in verify:
    verify = one(verify, tongxue_anchor, tongxue_anchor + tongxue_extra, 'full direct result checks')
write('tools/ln-2026/verify-final-release-v3.py', verify)

# Family workspace regression follows the new release shell while preserving v3955 family UX assets.
family = read('tools/verify-family-decision-v3955.mjs')
family = family.replace("'v3.9.56.0'", "'v3.9.57.0'")
family = family.replace("'v3956_0'", "'v3957_0'")
family = family.replace('app.v3956_0.js?v=3956_0', 'app.v3957_0.js?v=3957_0')
family = family.replace('data-release="v3.9.56.0"', 'data-release="v3.9.57.0"')
family = family.replace("active.jsEntry.includes('js/app.v3956_0.js')", "active.jsEntry.includes('js/app.v3957_0.js')")
family = family.replace('FAMILY_DECISION_V3956_OK', 'FAMILY_DECISION_V3957_OK')
write('tools/verify-family-decision-v3955.mjs', family)

print('v3957 release contracts finalized')
