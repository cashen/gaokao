import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const school = read('ln-rank/js/feature/school-majors/school-all-mode.v3969_2.js');
const workspace = read('ln-rank/js/workspace/selection-workspace-orchestrator.v3969_2.js');
const api = read('functions/api/school-majors.js');
const release = read('shared/resources/release/current-release.js');
const contract = read('shared/resources/release/site-runtime-contract.v3990_2.js');
const nav = read('shared/ui/navigation/module-navigation.v004.js');

const checks = [
  ['school preflight uses resolve-only', school.includes("resolveOnly: '1'")],
  ['school submits only after canonical entity', school.includes("if (!state.schoolSelection?.entityId) return preflightSchoolSelection({ submit: true });")],
  ['school does not clear prior result during confirmation', !school.includes('state.schoolAll.data = null')],
  ['school uses typed score query value', school.includes('scoreQueryValue')],
  ['workspace blocks unknown school submit', workspace.includes("school-search-needs-confirmation")],
  ['API exposes resolve-only mode', api.includes("const resolveOnly = url.searchParams.get('resolveOnly') === '1'") && api.includes("mode: 'school-resolve-only'")],
  ['API fail-closes without canonical entity', api.includes('if (!selection?.entityId || !entity)')],
  ['feature version and revision are registered', /lnRankHumanQueryInputVersion:\s*'ln-rank-human-query-input-v001'/.test(release) && /lnRankHumanQueryInputRevision:\s*'r\d+'/.test(release)],
  ['active school owner is v3969_2', release.includes("schoolResults: '/ln-rank/js/feature/school-majors/school-all-mode.v3969_2.js'")],
  ['active contract has school owner', contract.includes('school-all-mode.v3969_2.js')],
  ['navigation waits for header mount', nav.includes("[data-ui-global-header],[data-ui-global-header-mount]")],
  ['navigation marks standalone only in standalone path', nav.split('function ensureMobileNav(visit) {')[1].split('function removeStandaloneNav')[0].includes("if (!hasHeaderSurface()) return null;") && nav.split('function ensureStandaloneNav(visit) {')[1].includes("data-ui-navigation-standalone")],
  ['Tongxue retired cache identity absent', !contract.includes('v=159-major001')]
];

const failed = checks.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error('ln-rank human query flow contract failed:', failed.join('; '));
  process.exit(1);
}
console.log(`ln-rank human query flow contract passed (${checks.length} checks)`);
