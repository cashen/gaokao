from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CURRENT = 'v3.9.72.0'

# LocalStrength is an immutable v3971.2 resource generation. Its rebuild job must
# not downgrade or rewrite a newer site-wide release contract.
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
]

for relative in DISPLAY_VERSION_FILES:
    text = (ROOT / relative).read_text()
    if CURRENT not in text:
        raise SystemExit(f'current release contract missing in {relative}')

release = (ROOT / 'shared/resources/release/current-release.js').read_text()
for marker in [
    "display: 'v3.9.72.0'",
    "localStrengthVersion: 'local-strength-v3971_2'",
    "localStrengthDataVersion: 'local-strength-static-v3971_2'",
    "localStrengthArchitecture: 'build-time-static-index'",
    "localStrengthReleasePresenter: '/shared/resources/release/release-presenter.v3971_2.js'",
]:
    if marker not in release:
        raise SystemExit(f'LocalStrength release marker missing: {marker}')

workflow = (ROOT / '.github/workflows/verify-local-strength-static-v3971.yml').read_text()
for marker in [
    "score.bands?.[k]?.records?.length||0",
    "school.bands?.[k]?.records?.length||0",
]:
    if marker not in workflow:
        raise SystemExit(f'major-bands health marker missing: {marker}')

root_index = (ROOT / 'index.html').read_text()
if 'data-release="v3.9.72.0"' not in root_index or '<span data-current-release>v3.9.72.0</span>' not in root_index:
    raise SystemExit('root release contract is not current')

print('validated LocalStrength v3971.2 under site release v3.9.72.0; changed=0')
