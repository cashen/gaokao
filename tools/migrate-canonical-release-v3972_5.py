from pathlib import Path
import subprocess

OLD = 'v3.9.72.2'
NEW = 'v3.9.72.5'
GENERATION = 'v3972_5'
QUERY = '3972_5'

EXCLUDED_PREFIXES = (
    'docs/release-acceptance/',
    'ln-rank/data/local-strength/',
    'ln-rank/data/211-static/',
)
MIGRATION_PATHS = {
    '.github/workflows/migrate-canonical-release-v3972_5.yml',
    '.github/workflows/migrate-canonical-release-on-pr-v3972_5.yml',
    'tools/migrate-canonical-release-v3972_5.py',
}


def tracked_files():
    raw = subprocess.check_output(['git', 'ls-files', '-z'])
    for item in raw.split(b'\0'):
        if item:
            yield item.decode('utf-8')


for rel in tracked_files():
    if rel in MIGRATION_PATHS or rel.startswith(EXCLUDED_PREFIXES):
        continue
    path = Path(rel)
    try:
        text = path.read_text(encoding='utf-8')
    except (UnicodeDecodeError, IsADirectoryError):
        continue
    if OLD in text:
        path.write_text(text.replace(OLD, NEW), encoding='utf-8')

release_path = Path('shared/resources/release/current-release.js')
release = release_path.read_text(encoding='utf-8')
anchor = "const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;\n"
constants = (
    "const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;\n"
    f"const RELEASE_VERSION = '{NEW}';\n"
    f"const SITE_RUNTIME_GENERATION = '{GENERATION}';\n"
    f"const ASSET_QUERY_VERSION = '{QUERY}';\n"
)
if f"const RELEASE_VERSION = '{NEW}';" not in release:
    release = release.replace(anchor, constants, 1)
for before, after in {
    f"  display: '{NEW}',": '  display: RELEASE_VERSION,',
    f"  version: '{NEW}',": '  version: RELEASE_VERSION,',
    f"  asset: '{QUERY}',": '  asset: ASSET_QUERY_VERSION,',
    f"  assetVersion: '{GENERATION}',": '  assetVersion: SITE_RUNTIME_GENERATION,',
    f"  assetReleaseVersion: '{NEW}',": '  assetReleaseVersion: RELEASE_VERSION,',
    f"  siteRuntimeGeneration: '{GENERATION}',": '  siteRuntimeGeneration: SITE_RUNTIME_GENERATION,',
}.items():
    release = release.replace(before, after, 1)
release_path.write_text(release, encoding='utf-8')

contract_path = Path('shared/resources/release/site-runtime-contract.v3972_5.js')
contract = contract_path.read_text(encoding='utf-8')
import_line = "import { CURRENT_RELEASE } from './current-release.js?v=3972_5';\n\n"
if not contract.startswith('import { CURRENT_RELEASE }'):
    contract = import_line + contract
contract = contract.replace(f"  generation: '{GENERATION}',", '  generation: CURRENT_RELEASE.siteRuntimeGeneration,', 1)
contract = contract.replace(f"  queryVersion: '{QUERY}',", '  queryVersion: CURRENT_RELEASE.asset,', 1)
contract = contract.replace(f"  releaseVersion: '{NEW}',", '  releaseVersion: CURRENT_RELEASE.version,', 1)
contract_path.write_text(contract, encoding='utf-8')

skill_path = Path('docs/skills/unified-site-release/SKILL.md')
skill = skill_path.read_text(encoding='utf-8')
skill = skill.replace(
    f"The site has one active generation at a time. For the current release it is `{GENERATION}`, while the public business release remains `{NEW}`.",
    f"The site has one canonical current release at a time. For this release the public version is `{NEW}`, the runtime generation is `{GENERATION}`, and the asset query is `{QUERY}`; these are three encodings of the same release identity, not independent versions."
)
skill = skill.replace(
    '5. Keep the public business release unchanged unless the task explicitly changes it.',
    '5. Derive the public version, runtime generation and asset query from one canonical release identity. Any active-generation change must advance the canonical release; never keep an older public version while publishing a newer active runtime.'
)
forbidden_anchor = '- A version number is added only to one small module while the active site graph remains unchanged.\n'
forbidden_rule = '- The public release, runtime generation, asset query, HTML markers, release manifest or production verifier encode different current releases.\n'
if forbidden_rule not in skill:
    skill = skill.replace(forbidden_anchor, forbidden_anchor + forbidden_rule)
procedure_anchor = '6. Add or update source-contract tests that compare HTML, release center, cache contract, execution contract and runtime globals.\n'
procedure_rule = '6.1. Run the canonical-release audit and fail on any non-historical reference to a retired public release. Stable dependency versions must remain explicitly classified and must never populate current-release fields.\n'
if procedure_rule not in skill:
    skill = skill.replace(procedure_anchor, procedure_anchor + procedure_rule)
skill_path.write_text(skill, encoding='utf-8')

audit = f"""import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {{ fileURLToPath }} from 'node:url';
import {{ CURRENT_RELEASE }} from '../shared/resources/release/current-release.js';
import {{ SITE_RUNTIME_CONTRACT }} from '../shared/resources/release/site-runtime-contract.v3972_5.js';
import {{ LN_RANK_RUNTIME_CACHE_CONTRACT }} from '../shared/resources/release/runtime-cache-contract.v3972_5.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const canonicalRelease = '{NEW}';
const canonicalGeneration = '{GENERATION}';
const canonicalQuery = '{QUERY}';
const retiredPublicRelease = '{OLD}';

function generationFromRelease(version) {{
  const match = /^v(\\d+)\\.(\\d+)\\.(\\d+)\\.(\\d+)$/.exec(version);
  assert.ok(match, `invalid canonical release ${{version}}`);
  return `v${{match[1]}}${{match[2]}}${{match[3]}}_${{match[4]}}`;
}}

assert.equal(CURRENT_RELEASE.display, canonicalRelease);
assert.equal(CURRENT_RELEASE.version, canonicalRelease);
assert.equal(CURRENT_RELEASE.assetReleaseVersion, canonicalRelease);
assert.equal(CURRENT_RELEASE.siteRuntimeGeneration, canonicalGeneration);
assert.equal(CURRENT_RELEASE.assetVersion, canonicalGeneration);
assert.equal(CURRENT_RELEASE.asset, canonicalQuery);
assert.equal(generationFromRelease(CURRENT_RELEASE.version), canonicalGeneration);
assert.equal(SITE_RUNTIME_CONTRACT.releaseVersion, canonicalRelease);
assert.equal(SITE_RUNTIME_CONTRACT.generation, canonicalGeneration);
assert.equal(SITE_RUNTIME_CONTRACT.queryVersion, canonicalQuery);
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.releaseVersion, canonicalRelease);
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.assetVersion, canonicalGeneration);

for (const rel of ['index.html', 'ln-rank/index.html', 'ln-rank/selection-pool.html', 'ln-rank/211-mainline.html']) {{
  const html = read(rel);
  assert.ok(html.includes(`data-release=\"${{canonicalRelease}}\"`), `${{rel}} does not declare canonical release`);
  assert.ok(!html.includes(`data-release=\"${{retiredPublicRelease}}\"`), `${{rel}} exposes retired public release`);
}}

const manifest = JSON.parse(read('ln-rank/site-active-generation.v3972_5.json'));
assert.equal(manifest.releaseVersion, canonicalRelease);
assert.equal(manifest.generation, canonicalGeneration);
assert.equal(read('VERSION.txt').trim(), canonicalRelease);

const skill = read('docs/skills/unified-site-release/SKILL.md');
assert.ok(skill.includes('three encodings of the same release identity'));
assert.ok(skill.includes('never keep an older public version while publishing a newer active runtime'));

const stable = SITE_RUNTIME_CONTRACT.preservedBusinessResources;
assert.equal(stable.localStrength, 'local-strength-static-v3971_2');
assert.equal(stable.all211, 'all-211-static-v3972_0');
assert.equal(stable.majorBands, 'major-bands-static-v3972_2');

console.log(JSON.stringify({{
  ok: true,
  canonicalRelease,
  canonicalGeneration,
  canonicalQuery,
  preservedBusinessResources: stable
}}, null, 2));
"""
Path('tools/audit-canonical-release-version-v3972_5.mjs').write_text(audit, encoding='utf-8')

workflow = """name: Verify canonical release v3972.5

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  canonical-release:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Verify one canonical current release
        run: |
          set -euo pipefail
          node --experimental-default-type=module tools/audit-canonical-release-version-v3972_5.mjs
          node --experimental-default-type=module tools/audit-site-runtime-generation-v3972_5.mjs
          if git grep -n 'v3.9.72.2' -- ':!docs/release-acceptance/**' ':!ln-rank/data/local-strength/**' ':!ln-rank/data/211-static/**'; then
            echo 'retired public release remains in active source, tests or deployment governance'
            exit 1
          fi
"""
Path('.github/workflows/verify-canonical-release-v3972_5.yml').write_text(workflow, encoding='utf-8')

for rel in MIGRATION_PATHS:
    path = Path(rel)
    if path.exists():
        path.unlink()
