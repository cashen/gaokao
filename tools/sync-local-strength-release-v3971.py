from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = 'v3.9.70.1'
NEW = 'v3.9.71.2'

DISPLAY_VERSION_FILES = [
    'tools/browser-school-query-v3970.mjs',
    'tools/browser-home-release-v3970.mjs',
    'tools/audit-academic-background-v3970.mjs',
    'tools/browser-resource-execution-v3970.mjs',
    'tools/audit-home-release-ownership-v3970.mjs',
    'tools/ln-2026/verify-final-release-v3970.py',
    'tools/audit-school-query-v3970.mjs',
    'tools/browser-family-action-v3970.mjs',
    'tools/audit-family-action-v3970.mjs',
    '.github/workflows/verify-ln-2026-final.yml',
    '.github/workflows/tongxue-live-verification.yml',
    '.github/workflows/verify-dual-search-v3963.yml',
]


def ensure_replaced(relative: str, old: str, new: str) -> bool:
    path = ROOT / relative
    text = path.read_text()
    if old in text:
        path.write_text(text.replace(old, new))
        return True
    if new in text:
        return False
    raise SystemExit(f'neither old nor new contract found in {relative}')


changed = []
for relative in DISPLAY_VERSION_FILES:
    if ensure_replaced(relative, OLD, NEW):
        changed.append(relative)

production = ROOT / '.github/workflows/verify-production-release-v3970.yml'
text = production.read_text()
old_block = """          if [ \"$EVENT_NAME\" = 'pull_request' ]; then
            expected_root_release='v3.9.70.0'
            require_home_industry_link=0
          else
            expected_root_release='v3.9.70.1'
            require_home_industry_link=1
          fi"""
new_block = """          if [ \"$EVENT_NAME\" = 'pull_request' ]; then
            expected_root_release='v3.9.70.1'
            require_home_industry_link=1
          else
            expected_root_release='v3.9.71.2'
            require_home_industry_link=1
          fi"""
if old_block in text:
    production.write_text(text.replace(old_block, new_block))
    changed.append(str(production.relative_to(ROOT)))
elif new_block not in text:
    raise SystemExit('production release expectation block changed unexpectedly')

release = ROOT / 'shared/resources/release/current-release.js'
text = release.read_text()
old_owner = "    releasePresenter: '/shared/resources/release/release-presenter.v3971_2.js',"
new_owner = "    releasePresenter: '/shared/resources/release/release-presenter.v3970_0.js',\n    localStrengthReleasePresenter: '/shared/resources/release/release-presenter.v3971_2.js',"
if old_owner in text:
    release.write_text(text.replace(old_owner, new_owner))
    changed.append(str(release.relative_to(ROOT)))
elif new_owner not in text:
    raise SystemExit('current release presenter owner changed unexpectedly')

workflow = ROOT / '.github/workflows/verify-local-strength-static-v3971.yml'
text = workflow.read_text()
old_count = "score.groups?.[k]?.records?.length||score[k]?.records?.length||0"
new_count = "score.bands?.[k]?.records?.length||0"
old_school_count = "school.groups?.[k]?.records?.length||school[k]?.records?.length||0"
new_school_count = "school.bands?.[k]?.records?.length||0"
if old_count in text or old_school_count in text:
    if old_count not in text or old_school_count not in text:
        raise SystemExit('major-bands count contract partially updated')
    workflow.write_text(text.replace(old_count, new_count).replace(old_school_count, new_school_count))
    changed.append(str(workflow.relative_to(ROOT)))
elif new_count not in text or new_school_count not in text:
    raise SystemExit('major-bands health count contract changed unexpectedly')

root_index = ROOT / 'index.html'
text = root_index.read_text()
updated = text.replace('data-release="v3.9.70.1"', 'data-release="v3.9.71.2"').replace(
    '<span data-current-release>v3.9.70.1</span>',
    '<span data-current-release>v3.9.71.2</span>',
)
if updated != text:
    root_index.write_text(updated)
    changed.append(str(root_index.relative_to(ROOT)))
elif 'data-release="v3.9.71.2"' not in text or '<span data-current-release>v3.9.71.2</span>' not in text:
    raise SystemExit('root release sync failed')

print(f'synchronized v3.9.71.2 contracts; changed={len(changed)}')
for relative in changed:
    print(relative)
