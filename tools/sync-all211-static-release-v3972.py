from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = 'v3.9.72.1'
NEW = 'v3.9.72.5'

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
    'tools/browser-all211-static-v3972.mjs',
    'ln-rank/211-mainline.html',
]


def replace_version(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new)
    if new in text:
        return text
    raise SystemExit(f'contract not found: {label}')


changed = []
for relative in DISPLAY_VERSION_FILES:
    path = ROOT / relative
    text = path.read_text()
    updated = replace_version(text, OLD, NEW, relative)
    if updated != text:
        path.write_text(updated)
        changed.append(relative)

release = ROOT / 'shared/resources/release/current-release.js'
text = release.read_text()
replacements = [
    ("  display: 'v3.9.72.1',", "  display: 'v3.9.72.5',", 'release display'),
    ("  version: 'v3.9.72.1',", "  version: 'v3.9.72.5',", 'release version'),
    ("  release: 'v3.9.72.1-all211-static-functions-decoupled',", "  release: 'v3.9.72.5-all211-static-worker-budget',", 'release id'),
    ("  releaseName: 'v3.9.72.1-all211-static-functions-decoupled',", "  releaseName: 'v3.9.72.5-all211-static-worker-budget',", 'release name'),
    ("  label: 'all211-static-functions-decoupled',", "  label: 'all211-static-worker-budget',", 'release label'),
]
for old, new, label in replacements:
    text = replace_version(text, old, new, label)
release.write_text(text)
changed.append(str(release.relative_to(ROOT)))

version = ROOT / 'VERSION.txt'
if version.read_text().strip() != NEW:
    version.write_text(f'{NEW}\n')
    changed.append(str(version.relative_to(ROOT)))

root_index = ROOT / 'index.html'
text = root_index.read_text()
updated = text.replace(f'data-release="{OLD}"', f'data-release="{NEW}"').replace(
    f'<span data-current-release>{OLD}</span>',
    f'<span data-current-release>{NEW}</span>',
)
if updated != text:
    root_index.write_text(updated)
    changed.append(str(root_index.relative_to(ROOT)))
elif f'data-release="{NEW}"' not in text or f'<span data-current-release>{NEW}</span>' not in text:
    raise SystemExit('root release sync failed')

print(f'synchronized {NEW} contracts; changed={len(changed)}')
for relative in changed:
    print(relative)
