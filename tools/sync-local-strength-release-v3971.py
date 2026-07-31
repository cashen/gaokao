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


def replace_exact(relative: str, old: str, new: str, required: bool = True) -> bool:
    path = ROOT / relative
    text = path.read_text()
    if old not in text:
        if required:
            raise SystemExit(f'missing expected text in {relative}: {old}')
        return False
    path.write_text(text.replace(old, new))
    return True


for relative in DISPLAY_VERSION_FILES:
    replace_exact(relative, OLD, NEW)

# Production verification intentionally checks the current stable deployment on PR,
# then the new deployment after the merge-to-main push.
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
if old_block not in text:
    raise SystemExit('production release expectation block changed unexpectedly')
production.write_text(text.replace(old_block, new_block))

# The shared stable presenter remains the global owner. LocalStrength has its own
# immutable presenter, avoiding a false claim that every page migrated.
release = ROOT / 'shared/resources/release/current-release.js'
text = release.read_text()
old_owner = "    releasePresenter: '/shared/resources/release/release-presenter.v3971_2.js',"
new_owner = "    releasePresenter: '/shared/resources/release/release-presenter.v3970_0.js',\n    localStrengthReleasePresenter: '/shared/resources/release/release-presenter.v3971_2.js',"
if old_owner not in text:
    raise SystemExit('current release presenter owner changed unexpectedly')
release.write_text(text.replace(old_owner, new_owner))

# The major-bands response contract uses `bands`, not `groups`.
workflow = ROOT / '.github/workflows/verify-local-strength-static-v3971.yml'
text = workflow.read_text()
old_count = "score.groups?.[k]?.records?.length||score[k]?.records?.length||0"
new_count = "score.bands?.[k]?.records?.length||0"
old_school_count = "school.groups?.[k]?.records?.length||school[k]?.records?.length||0"
new_school_count = "school.bands?.[k]?.records?.length||0"
if old_count not in text or old_school_count not in text:
    raise SystemExit('major-bands health count contract changed unexpectedly')
workflow.write_text(text.replace(old_count, new_count).replace(old_school_count, new_school_count))

# Root display is synchronized without altering the stable v3970_0 home runtime.
root_index = ROOT / 'index.html'
text = root_index.read_text()
text = text.replace('data-release="v3.9.70.1"', 'data-release="v3.9.71.2"')
text = text.replace('<span data-current-release>v3.9.70.1</span>', '<span data-current-release>v3.9.71.2</span>')
if 'data-release="v3.9.71.2"' not in text or '<span data-current-release>v3.9.71.2</span>' not in text:
    raise SystemExit('root release sync failed')
root_index.write_text(text)

print(f'synchronized {len(DISPLAY_VERSION_FILES)} display-version files plus production, release ownership, health contract and root')
