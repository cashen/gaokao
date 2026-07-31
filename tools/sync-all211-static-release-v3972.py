from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = 'v3.9.71.2'
NEW = 'v3.9.72.0'

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


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new)
    if new in text:
        return text
    raise SystemExit(f'contract not found: {label}')


changed = []
for relative in DISPLAY_VERSION_FILES:
    path = ROOT / relative
    text = path.read_text()
    updated = replace_once(text, OLD, NEW, relative)
    if updated != text:
        path.write_text(updated)
        changed.append(relative)

release = ROOT / 'shared/resources/release/current-release.js'
text = release.read_text()
replacements = [
    ("  display: 'v3.9.71.2',", "  display: 'v3.9.72.0',", 'release display'),
    ("  version: 'v3.9.71.2',", "  version: 'v3.9.72.0',", 'release version'),
    ("  release: 'v3.9.71.2-local-strength-static-human-ui-no-fenxi',", "  release: 'v3.9.72.0-all211-static-real-score-bands',", 'release id'),
    ("  releaseName: 'v3.9.71.2-local-strength-static-human-ui-no-fenxi',", "  releaseName: 'v3.9.72.0-all211-static-real-score-bands',", 'release name'),
    ("  label: 'local-strength-static-human-ui-no-fenxi',", "  label: 'all211-static-real-score-bands',", 'release label'),
]
for old, new, label in replacements:
    text = replace_once(text, old, new, label)

all211_fields = """  all211Version: 'all211-static-v3972_0',
  all211DataVersion: 'all-211-static-v3972_0',
  all211Architecture: 'build-time-static-index',
"""
anchor = "  localStrengthArchitecture: 'build-time-static-index',\n"
if all211_fields not in text:
    if anchor not in text:
        raise SystemExit('local strength release anchor missing')
    text = text.replace(anchor, anchor + all211_fields)

source_owner = "    officialDoubleFirstClassDisciplines: '/shared/resources/background/double-first-class-disciplines.2022.js',\n"
anchor = "    academicBackgroundSources: '/shared/resources/background/academic-background-source-registry.v3968_0.js',\n"
if source_owner not in text:
    if anchor not in text:
        raise SystemExit('academic background source owner anchor missing')
    text = text.replace(anchor, anchor + source_owner)

owners = """    all211ReleasePresenter: '/shared/resources/release/release-presenter.v3972_0.js',
    all211Page: '/ln-rank/211-mainline.html',
    all211Runtime: '/ln-rank/js/academic-background/all211-static-app.v3972_0.js',
    all211Styles: '/ln-rank/css/all211-static.v3972_0.css',
    all211Data: '/ln-rank/data/211-static/211-static-index.v3972_0.json',
    all211Audit: '/ln-rank/data/211-static/211-static-audit.v3972_0.json',
    all211Assembler: '/tools/assemble-academic-background-static-v3972.mjs',
"""
anchor = "    localStrengthBuilder: '/tools/build-local-strength-static-v3971.mjs',\n"
if owners not in text:
    if anchor not in text:
        raise SystemExit('local strength owner anchor missing')
    text = text.replace(anchor, anchor + owners)
text = replace_once(
    text,
    "    all211MainlineRuntime: '/ln-rank/js/academic-background/academic-background-app.v3968_0.js',",
    "    all211MainlineRuntime: '/ln-rank/js/academic-background/all211-static-app.v3972_0.js',",
    'all211 runtime owner',
)
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
