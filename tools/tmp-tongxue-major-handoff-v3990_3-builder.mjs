import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OLD_TOKEN = '3990_2';
const NEW_TOKEN = '3990_3';
const OLD_GEN = 'v3990_2';
const NEW_GEN = 'v3990_3';
const OLD_RELEASE = 'v3.9.90.2';
const NEW_RELEASE = 'v3.9.90.3';
const SELF = 'tools/tmp-tongxue-major-handoff-v3990_3-builder.mjs';
const SELF_WORKFLOW = '.github/workflows/tmp-tongxue-major-handoff-v3990_3-builder.yml';

const abs = rel => path.join(ROOT, rel);
const exists = rel => fs.existsSync(abs(rel));
const read = rel => fs.readFileSync(abs(rel), 'utf8');
const write = (rel, content) => {
  const full = abs(rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
};

function replaceCurrent(text) {
  return String(text)
    .replaceAll(OLD_RELEASE, NEW_RELEASE)
    .replaceAll(OLD_GEN, NEW_GEN)
    .replaceAll(OLD_TOKEN, NEW_TOKEN);
}

function stripRef(value) {
  return String(value || '').split('?')[0].replace(/^\//, '');
}

function resolveRef(from, ref) {
  const cleaned = stripRef(ref);
  if (!cleaned) return '';
  if (ref.startsWith('/')) return cleaned;
  if (ref.startsWith('.')) return path.posix.normalize(path.posix.join(path.posix.dirname(from), cleaned));
  return '';
}

function versionedRefs(rel, content) {
  const refs = [];
  const regex = /['"`]([^'"`\s]+v3990_2[^'"`\s]*)['"`]/g;
  let match;
  while ((match = regex.exec(content))) {
    const resolved = resolveRef(rel, match[1]);
    if (resolved && exists(resolved)) refs.push(resolved);
  }
  return refs;
}

const runtimeSeeds = new Set([
  'shared/resources/release/site-runtime-contract.v3990_2.js',
  'shared/resources/release/release-presenter.v3990_2.js',
  'shared/resources/release/runtime-cache-contract.v3990_2.js',
  'shared/governance/resource-execution-contract.v3990_2.js',
  'shared/governance/production-resource-verification-contract.v3990_2.js',
  'shared/ui/ui-resource-registry.v3990_2.js',
  'ln-rank/site-active-generation.v3990_2.json',
  'functions/_lib/major-bands-rank-index.v3990_2.js',
  'functions/_lib/major-bands-rank-query-kernel.v3990_2.js',
  'functions/_lib/major-bands-rank-bucket-loader.v3990_2.js',
  'functions/_lib/major-bands-result-order.v3990_2.js',
  'functions/_lib/major-bands-response-transport.v3990_2.js',
  'functions/_lib/major-filter.v3990_2.js',
  'shared/resources/geo/china-region-catalog.v3990_2.js',
  'shared/ui/shell/family-shell.v3990_2.js',
  'shared/ui/components/family-plan-entry.v3990_2.js',
  'shared/ui/interaction/interaction-transaction.v3990_2.js',
  'shared/ui/interaction/interaction-transaction.v3990_2.css',
  'ln-rank/js/ux/family-home.v3990_2.js',
  'ln-rank/js/app.v3990_2.js',
  'ln-rank/js/app-runtime.v3990_2.js',
  'ln-rank/js/self-check.v3990_2.js',
  'ln-rank/js/feature/major-pool/pagination-snapshot-guard.v3990_2.js',
  'ln-rank/js/workspace/selection-workspace-orchestrator.v3990_2.js',
  'ln-rank/js/selection-pool.v3990_2.js',
  'ln-rank/js/selection-pool-runtime.v3990_2.js',
  'aiplus/app.v3990_2.js',
  'aiplus/workspace.v3990_2.css',
  'shared/ai/ai-workspace-contract.v3990_2.js'
]);

for (const owner of [
  'shared/resources/release/current-release.js',
  'shared/resources/release/site-runtime-contract.v3990_2.js',
  'shared/resources/release/runtime-cache-contract.v3990_2.js',
  'shared/resources/resource-registry.js'
]) {
  if (!exists(owner)) continue;
  for (const ref of versionedRefs(owner, read(owner))) runtimeSeeds.add(ref);
}

const cloned = new Set();
function cloneRuntime(rel) {
  if (!rel.includes(OLD_GEN) || cloned.has(rel) || !exists(rel)) return;
  if (rel.startsWith('.github/workflows/') || rel.startsWith('docs/')) return;
  cloned.add(rel);
  const dest = rel.replaceAll(OLD_GEN, NEW_GEN);
  const source = read(rel);
  let next = replaceCurrent(source);
  if (dest.endsWith('major-bands-rank-query-kernel.v3990_3.js')) {
    next = next.replace("from './major-filter.js'", "from './major-filter.v3990_3.js'");
  }
  write(dest, next);
  for (const ref of versionedRefs(rel, source)) cloneRuntime(ref);
}
for (const seed of runtimeSeeds) cloneRuntime(seed);

const generatedToolSeeds = [
  'tools/audit-canonical-release-version-v3990_2.mjs',
  'tools/audit-site-runtime-generation-v3990_2.mjs',
  'tools/audit-unified-resource-graph-v3990_2.mjs',
  'tools/audit-architecture-handoff-v3990_2.mjs',
  'tools/audit-major-bands-rank-kernel-v3990_2.mjs',
  'tools/audit-cloudflare-git-production-v3990_2.mjs',
  'tools/audit-score-equivalence-v3990_2.mjs',
  'tools/browser-home-release-v3990_2.mjs',
  'tools/browser-family-action-v3990_2.mjs',
  'tools/browser-resource-execution-v3990_2.mjs',
  'tools/browser-school-query-v3990_2.mjs',
  'tools/browser-native-chooser-activation-v3990_2.mjs',
  'tools/verify-ai-workspace-v3990_2.mjs',
  'tools/browser-ai-workspace-v3990_2.mjs'
];
for (const rel of generatedToolSeeds) if (exists(rel)) cloneRuntime(rel);

const grepFiles = execFileSync('git', ['grep', '-l', '-e', OLD_RELEASE, '-e', OLD_GEN, '-e', OLD_TOKEN], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
const allowedDocs = new Set([
  'docs/skills/unified-site-release/SKILL.md',
  'docs/architecture/START-HERE.md'
]);
function isPointerFile(rel) {
  if (rel === SELF || rel === SELF_WORKFLOW || rel === '_headers') return false;
  if (rel === 'VERSION.txt' || rel === 'ln-rank/VERSION.txt') return false;
  if (rel.startsWith('docs/')) return allowedDocs.has(rel);
  if (rel.endsWith('.md')) return false;
  if (rel.startsWith('.github/workflows/')) return true;
  if (rel.endsWith('.html')) return true;
  if (rel.startsWith('shared/resources/release/')) return true;
  if (rel === 'shared/resources/resource-registry.js') return true;
  if (rel.startsWith('shared/governance/') && !rel.includes(OLD_GEN)) return true;
  if (rel.startsWith('shared/ui/') && !rel.includes(OLD_GEN)) return true;
  if (rel.startsWith('functions/') && !rel.includes(OLD_GEN)) return true;
  if (rel.startsWith('ln-rank/') && !rel.includes(OLD_GEN) && !rel.includes('/data/')) return true;
  if (rel.startsWith('aiplus/') && !rel.includes(OLD_GEN)) return true;
  if (rel.startsWith('tools/') && !rel.includes(OLD_GEN)) return true;
  return false;
}
for (const rel of grepFiles) {
  if (!exists(rel) || !isPointerFile(rel)) continue;
  const before = read(rel);
  const after = replaceCurrent(before);
  if (after !== before) write(rel, after);
}
for (const rel of grepFiles.filter(rel => rel.startsWith('.github/workflows/') && exists(rel))) {
  const before = read(rel);
  const after = replaceCurrent(before);
  if (after !== before) write(rel, after);
}
for (const rel of grepFiles.filter(rel => rel.startsWith('.github/workflows/') && exists(rel))) {
  const workflow = read(rel);
  const refs = workflow.match(/tools\/[A-Za-z0-9_./-]*v3990_3[A-Za-z0-9_./-]*/g) || [];
  for (const ref of new Set(refs)) {
    const clean = ref.replace(/["'`,:)]+$/g, '');
    if (exists(clean)) continue;
    const prior = clean.replaceAll(NEW_GEN, OLD_GEN);
    if (exists(prior)) cloneRuntime(prior);
  }
}

// Canonical release identity. This is a single site release, not a feature-only version fork.
{
  const rel = 'shared/resources/release/current-release.js';
  let text = read(rel);
  text = text
    .replace("release: 'v3.9.90.3-home-countdown-seconds'", "release: 'v3.9.90.3-tongxue-major-handoff-cache'")
    .replace("releaseName: 'v3.9.90.3-home-countdown-seconds'", "releaseName: 'v3.9.90.3-tongxue-major-handoff-cache'")
    .replace("label: 'home-countdown-seconds'", "label: 'tongxue-major-handoff-cache'")
    .replace("tongxueRuntimeVersion: 'tongxue-runtime-v159-r3968'", "tongxueRuntimeVersion: 'tongxue-runtime-v160-r3990_3'");
  write(rel, text);
}

// New immutable Student Voice navigation contract. It owns URL construction only; shared interaction still owns location.assign.
write('shared/resources/experience/student-voice-navigation.v002.js', `export const STUDENT_VOICE_NAVIGATION_VERSION = 'student-voice-navigation-v0.02';
export const STUDENT_VOICE_NAVIGATION_META = Object.freeze({
  version:STUDENT_VOICE_NAVIGATION_VERSION,
  targetPath:'/tongxue/',
  sourcePath:'/ln-rank/',
  scope:'major',
  policy:'canonical-major-code-direct-entry-ln-rank-return-only'
});

function clean(value = '') {
  return String(value || '').replace(/\\s+/g, ' ').trim();
}

function cleanCode(value = '') {
  const code = clean(value).toUpperCase();
  return /^[0-9A-Z]{4,10}$/.test(code) ? code : '';
}

function cleanContext(value = '') {
  const text = clean(value);
  return text === 'school' ? 'school' : (text === 'score' ? 'score' : '');
}

function containsEmbeddedAbsoluteUrl(value = '') {
  let text = String(value || '');
  for (let pass = 0; pass < 3; pass += 1) {
    if (/https?:\\/\\//i.test(text)) return true;
    try {
      const decoded = decodeURIComponent(text);
      if (decoded === text) break;
      text = decoded;
    } catch { break; }
  }
  return /https?:\\/\\//i.test(text);
}

export function sanitizeStudentVoiceReturnTarget(value, { origin = 'https://gaokao.powers.org.cn' } = {}) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 2048 || !raw.startsWith('/') || raw.startsWith('//') || containsEmbeddedAbsoluteUrl(raw)) return '';
  let url;
  let expectedOrigin;
  try {
    expectedOrigin = new URL(origin).origin;
    url = new URL(raw, expectedOrigin);
  } catch { return ''; }
  if (url.origin !== expectedOrigin || !url.pathname.startsWith('/ln-rank/')) return '';
  const normalized = \`${'${url.pathname}${url.search}${url.hash}'}\`;
  return containsEmbeddedAbsoluteUrl(normalized) ? '' : normalized;
}

export function buildStudentVoiceMajorHref({ majorCode='', canonicalName='', topic='general', sourceKey='', context='', returnTo='' } = {}) {
  const code = cleanCode(majorCode);
  const name = clean(canonicalName);
  if (!code || !name) return '';
  const params = new URLSearchParams({ scope:'major', majorCode:code, major:name });
  const normalizedTopic = clean(topic);
  if (normalizedTopic && normalizedTopic !== 'general' && /^[a-z_]{1,40}$/.test(normalizedTopic)) params.set('topic', normalizedTopic);
  const key = clean(sourceKey).slice(0, 160);
  if (key) params.set('sourceKey', key);
  const sourceContext = cleanContext(context);
  if (sourceContext) params.set('context', sourceContext);
  const returnTarget = sanitizeStudentVoiceReturnTarget(returnTo);
  if (returnTarget) params.set('returnTo', returnTarget);
  return \`${'${STUDENT_VOICE_NAVIGATION_META.targetPath}?${params.toString()}'}\`;
}

export function readStudentVoiceMajorContext(locationLike = globalThis.location) {
  const href = locationLike?.href || String(locationLike || '');
  let url;
  try { url = new URL(href, 'https://gaokao.powers.org.cn'); } catch { return Object.freeze({ scope:'', majorCode:'', major:'', topic:'general', sourceKey:'', context:'', returnTo:'' }); }
  const scope = url.searchParams.get('scope') === 'major' ? 'major' : '';
  return Object.freeze({
    scope,
    majorCode:scope ? cleanCode(url.searchParams.get('majorCode')) : '',
    major:scope ? clean(url.searchParams.get('major')) : '',
    topic:scope && /^[a-z_]{1,40}$/.test(clean(url.searchParams.get('topic'))) ? clean(url.searchParams.get('topic')) : 'general',
    sourceKey:scope ? clean(url.searchParams.get('sourceKey')).slice(0, 160) : '',
    context:scope ? cleanContext(url.searchParams.get('context')) : '',
    returnTo:scope ? sanitizeStudentVoiceReturnTarget(url.searchParams.get('returnTo'), { origin:url.origin }) : ''
  });
}
`);

// The ln-rank handoff gets a new immutable identity; do not mutate v0.03 again.
{
  const source = read('ln-rank/js/workspace/major-path-handoff.v003.js');
  let text = source
    .replace("../../../shared/resources/experience/student-voice-navigation.v001.js", "../../../shared/resources/experience/student-voice-navigation.v002.js?v=002_0")
    .replace("export const MAJOR_PATH_HANDOFF_VERSION = 'major-path-ln-rank-handoff-v0.03';", "export const MAJOR_PATH_HANDOFF_VERSION = 'major-path-ln-rank-handoff-v0.04';")
    .replace("const RESUME_KEY = 'lnRankMajorPathResumeV003';", "const RESUME_KEY = 'lnRankMajorPathResumeV004';");
  if (!text.includes('student-voice-navigation.v002.js?v=002_0') || !text.includes('major-path-ln-rank-handoff-v0.04')) throw new Error('handoff v0.04 patch incomplete');
  write('ln-rank/js/workspace/major-path-handoff.v004.js', text);
  const app = 'ln-rank/js/app.v3990_3.js';
  let appText = read(app).replace("./workspace/major-path-handoff.v003.js?v=003_0", "./workspace/major-path-handoff.v004.js?v=004_0");
  if (!appText.includes('major-path-handoff.v004.js?v=004_0')) throw new Error('app handoff pointer incomplete');
  write(app, appText);
}

// Tongxue v159 assets are immutable and must remain untouched. v160 carries the UEC direct-major capability.
{
  let controller = read('tongxue/app/tongxue-runtime-controller-v159.js');
  controller = controller
    .replace("./tongxue-runtime-result-view-v159.js?v=159", "./tongxue-runtime-result-view-v160.js?v=160")
    .replace("const RUNTIME_VERSION = 'tongxue-runtime-v159';", "const RUNTIME_VERSION = 'tongxue-runtime-v160';")
    .replaceAll('__TONGXUE_RUNTIME_V159__', '__TONGXUE_RUNTIME_V160__')
    .replace('Tongxue v1.5.9 missing UI node', 'Tongxue v1.6.0 missing UI node');
  if (!controller.includes("tongxue-runtime-result-view-v160.js?v=160") || !controller.includes("const RUNTIME_VERSION = 'tongxue-runtime-v160'")) throw new Error('Tongxue controller v160 patch incomplete');
  write('tongxue/app/tongxue-runtime-controller-v160.js', controller);

  let result = read('tongxue/app/tongxue-runtime-result-view-v159.js');
  result = result.replace("const PAGE_VERSION = 'v1.5.9-uec01';", "const PAGE_VERSION = 'v1.6.0-uec02';");
  write('tongxue/app/tongxue-runtime-result-view-v160.js', result);

  const wrapper = `import '../../shared/resources/release/release-presenter.v3990_3.js?v=3990_3';
import '../../shared/ui/shell/family-shell.v3965_0.js?v=3965_0';
import { startTongxueRuntime } from './tongxue-runtime-controller-v160.js?v=160';

const EXPECTED_BUILD = 'tongxue-v160-student-voice-major-direct-20260821';
const actualBuild = document.querySelector('meta[name="tongxue-build"]')?.content || '';
if (actualBuild !== EXPECTED_BUILD) {
  throw new Error(\`Tongxue build mismatch: expected \${EXPECTED_BUILD}, received \${actualBuild || 'missing'}\`);
}

function installTongxueRuntimeLayout() {
  if (document.querySelector('[data-tongxue-runtime-layout="v160"]')) return;
  const style = document.createElement('style');
  style.dataset.tongxueRuntimeLayout = 'v160';
  style.textContent = \`
    @media (max-width: 700px) {
      #schoolSuggestions.suggestions {
        position: static;
        margin-top: 8px;
        max-height: min(46vh, 320px);
      }
    }
  \`;
  document.head.append(style);
}

installTongxueRuntimeLayout();
await startTongxueRuntime();
`;
  write('tongxue/app/tongxue-runtime-v160-r3990_3.js', wrapper);

  const htmlRel = 'tongxue/index.html';
  let html = read(htmlRel)
    .replace('tongxue-v159-single-runtime-owner-20260726', 'tongxue-v160-student-voice-major-direct-20260821')
    .replace('/tongxue/app/tongxue-runtime-v159-r3968.js?v=3968_0', '/tongxue/app/tongxue-runtime-v160-r3990_3.js?v=3990_3');
  if (!html.includes('tongxue-runtime-v160-r3990_3.js?v=3990_3')) throw new Error('Tongxue HTML runtime pointer incomplete');
  write(htmlRel, html);
}

// Current site contract declares the new stable Tongxue package instead of pointing at mutated v159 internals.
{
  const rel = 'shared/resources/release/site-runtime-contract.v3990_3.js';
  let text = read(rel)
    .replace("tongxueRuntime: '/tongxue/app/tongxue-runtime-v159-r3968.js?v=3968_0'", "tongxueRuntime: '/tongxue/app/tongxue-runtime-v160-r3990_3.js?v=3990_3'")
    .replace("tongxue: '/tongxue/app/tongxue-runtime-v159-r3968.js'", "tongxue: '/tongxue/app/tongxue-runtime-v160-r3990_3.js'")
    .replace("'/tongxue/app/tongxue-runtime-v159-r3968.js'", "'/tongxue/app/tongxue-runtime-v160-r3990_3.js'")
    .replace("'/tongxue/app/tongxue-runtime-controller-v159.js'", "'/tongxue/app/tongxue-runtime-controller-v160.js'")
    .replace("'/tongxue/app/tongxue-runtime-result-view-v159.js'", "'/tongxue/app/tongxue-runtime-result-view-v160.js'")
    .replace("tongxue: 'tongxue-runtime-v159-r3968'", "tongxue: 'tongxue-runtime-v160-r3990_3'");
  if (!text.includes('tongxue-runtime-v160-r3990_3.js?v=3990_3') || text.includes("stablePageEntrypoints: Object.freeze({\n    tongxuePage: '/tongxue/',\n    tongxueRuntime: '/tongxue/app/tongxue-runtime-v159-r3968.js")) throw new Error('site Tongxue runtime contract incomplete');
  write(rel, text);
}

// Resource registry current pointer, if present, follows the immutable v160 package.
{
  const rel = 'shared/resources/resource-registry.js';
  let text = read(rel)
    .replaceAll('tongxue-runtime-v159-r3968', 'tongxue-runtime-v160-r3990_3')
    .replaceAll('/tongxue/app/tongxue-runtime-controller-v159.js', '/tongxue/app/tongxue-runtime-controller-v160.js')
    .replaceAll('/tongxue/app/tongxue-runtime-result-view-v159.js', '/tongxue/app/tongxue-runtime-result-view-v160.js');
  write(rel, text);
}

// Permanent source contract uses the real school-all URL and proves polluted returnTo cannot propagate.
write('tools/verify-student-voice-navigation-v002.mjs', `import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  STUDENT_VOICE_NAVIGATION_META,
  STUDENT_VOICE_NAVIGATION_VERSION,
  buildStudentVoiceMajorHref,
  readStudentVoiceMajorContext,
  sanitizeStudentVoiceReturnTarget
} from '../shared/resources/experience/student-voice-navigation.v002.js';

const returnTo='/ln-rank/?mode=school-all&schoolSort=position-near&school=沈阳建筑大学';
const href=buildStudentVoiceMajorHref({
  majorCode:'080601',
  canonicalName:'电气工程及其自动化',
  sourceKey:'沈阳建筑大学-电气工程及其自动化-562-27032',
  context:'school',
  returnTo
});
const target=new URL(href,'https://gaokao.powers.org.cn');
assert.equal(target.pathname,'/tongxue/');
assert.equal(target.searchParams.get('scope'),'major');
assert.equal(target.searchParams.get('majorCode'),'080601');
assert.equal(target.searchParams.get('major'),'电气工程及其自动化');
assert.equal(target.searchParams.get('context'),'school');
assert.equal(target.searchParams.get('sourceKey'),'沈阳建筑大学-电气工程及其自动化-562-27032');
assert.equal(target.searchParams.get('returnTo'),returnTo);
assert.equal((href.match(/\\/tongxue\\//g)||[]).length,1,'target must contain exactly one Tongxue path');
assert.equal(STUDENT_VOICE_NAVIGATION_VERSION,'student-voice-navigation-v0.02');
assert.equal(STUDENT_VOICE_NAVIGATION_META.sourcePath,'/ln-rank/');

const polluted=returnTo+'https://gaokao.powers.org.cn/tongxue/?scope=major&majorCode=080601';
assert.equal(sanitizeStudentVoiceReturnTarget(polluted),'','embedded absolute URL must fail closed');
const pollutedHref=buildStudentVoiceMajorHref({majorCode:'080601',canonicalName:'电气工程及其自动化',context:'school',returnTo:polluted});
assert.equal(new URL(pollutedHref,'https://gaokao.powers.org.cn').searchParams.has('returnTo'),false,'polluted returnTo must not propagate');
assert.equal(sanitizeStudentVoiceReturnTarget('https://evil.example/ln-rank/'),'');
assert.equal(sanitizeStudentVoiceReturnTarget('/tongxue/?scope=major'),'');

const parsed=readStudentVoiceMajorContext({href:'https://gaokao.powers.org.cn'+href});
assert.equal(parsed.majorCode,'080601');
assert.equal(parsed.context,'school');
assert.equal(parsed.returnTo,returnTo);

const app=fs.readFileSync('ln-rank/js/app.v3990_3.js','utf8');
const handoff=fs.readFileSync('ln-rank/js/workspace/major-path-handoff.v004.js','utf8');
const html=fs.readFileSync('tongxue/index.html','utf8');
const wrapper=fs.readFileSync('tongxue/app/tongxue-runtime-v160-r3990_3.js','utf8');
const controller=fs.readFileSync('tongxue/app/tongxue-runtime-controller-v160.js','utf8');
assert.match(app,/major-path-handoff\\.v004\\.js\\?v=004_0/);
assert.match(handoff,/student-voice-navigation\\.v002\\.js\\?v=002_0/);
assert.match(handoff,/major-path-ln-rank-handoff-v0\\.04/);
assert.match(html,/tongxue-runtime-v160-r3990_3\\.js\\?v=3990_3/);
assert.doesNotMatch(html,/tongxue-runtime-v159-r3968\\.js\\?v=3968_0/);
assert.match(wrapper,/tongxue-runtime-controller-v160\\.js\\?v=160/);
assert.match(controller,/performMajorExperienceQuery/);
assert.match(controller,/document\\.body\\.dataset\\.studentVoiceScope\\s*=\\s*'major'/);
console.log('Student Voice navigation v0.02 verified: exact school-all handoff, one Tongxue target, polluted return fail-closed, immutable Tongxue v160 runtime.');
`);

// Browser proof: exact school card -> generated Tongxue target -> Tongxue v160 direct-major render on four viewports.
write('tools/browser-student-voice-handoff-v002.mjs', `import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const runtimeModules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright(){try{return await import('playwright');}catch(error){if(runtimeModules)return import(pathToFileURL(path.join(runtimeModules,'playwright','index.mjs')).href);throw error;}}
const {chromium}=await loadPlaywright();
const ROOT=process.cwd();
const ORIGIN='https://student-voice.test';
const DEVICES=[
  {name:'pc',viewport:{width:1440,height:900}},
  {name:'pad',viewport:{width:1024,height:768},hasTouch:true},
  {name:'android',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'android-compact',viewport:{width:360,height:740},isMobile:true,hasTouch:true}
];
function assert(value,message){if(!value)throw new Error(message);}
function mime(file){if(file.endsWith('.css'))return'text/css; charset=utf-8';if(file.endsWith('.js')||file.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(file.endsWith('.html'))return'text/html; charset=utf-8';if(file.endsWith('.json'))return'application/json; charset=utf-8';return'application/octet-stream';}
function staticFile(pathname){const mapped=pathname==='/tongxue/'?'/tongxue/index.html':pathname;const resolved=path.resolve(ROOT,\`.\${decodeURIComponent(mapped)}\`);if(!resolved.startsWith(\`${ROOT}${path.sep}\`)||!fs.existsSync(resolved)||!fs.statSync(resolved).isFile())return null;return resolved;}
function mockLnRankHtml(){return \`<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="candidateScore"></div><select id="region"><option value="all">all</option></select><input id="schoolKeyword"><input id="majorKeyword"><select id="schoolAllSort"><option value="position-near">position-near</option></select>
<div id="schoolAllTitle">沈阳建筑大学</div><div id="results"></div>
<div id="schoolAllContent"><article class="school-major-row" data-school-record="沈阳建筑大学-电气工程及其自动化-562-27032"><div class="school-major-main"><div class="school-major-title-line"><h3>电气工程及其自动化</h3></div></div></article></div>
<script type="module">import {mountMajorPathHandoff} from '/ln-rank/js/workspace/major-path-handoff.v004.js?v=004_0';mountMajorPathHandoff();document.dispatchEvent(new CustomEvent('gaokao:school-result-render'));</script>
</body></html>\`;}
async function install(page){await page.route(\`${ORIGIN}/**\`,async route=>{const url=new URL(route.request().url());if(url.pathname==='/ln-rank/mock.html')return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:mockLnRankHtml()});if(url.pathname==='/api/tongxue-summary')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,mode:'major_reviews',scope:'major',topic:'general',major:{code:'080601',name:'电气工程及其自动化'},reviews:[{id:'r1',content:'课程里既有电路基础，也会接触控制与实践项目。',author:'同学A',createdAt:'2026-07-01'}],reviewPagination:{page:1,hasMore:false},evidence:{matched:1,matchCount:1,scanned:1,scannedCount:1,pages:1,scannedPages:1,sampleLevel:'single',exhaustive:false},source:{name:'srgaoxiao.com',url:'https://srgaoxiao.com'},fetchedAt:'2026-08-21T05:00:00Z',transport:'test'})});const file=staticFile(url.pathname);if(file)return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)});return route.fulfill({status:404,contentType:'text/plain',body:\`missing \${url.pathname}\`});});}
async function run(page,name){const start=\`${ORIGIN}/ln-rank/mock.html?mode=school-all&schoolSort=position-near&school=沈阳建筑大学\`;await page.goto(start,{waitUntil:'domcontentloaded'});await page.waitForSelector('[data-student-voice-entry="080601"]');const target=await page.locator('[data-student-voice-entry="080601"]').getAttribute('data-ui-navigation-target');const u=new URL(target,ORIGIN);assert(u.pathname==='/tongxue/',\`${name}: target path\`);assert(u.searchParams.get('majorCode')==='080601',\`${name}: major code\`);assert(u.searchParams.get('context')==='school',\`${name}: context\`);assert(u.searchParams.get('sourceKey')==='沈阳建筑大学-电气工程及其自动化-562-27032',\`${name}: source key\`);assert(u.searchParams.get('returnTo')==='/ln-rank/?mode=school-all&schoolSort=position-near&school=沈阳建筑大学',\`${name}: return target\`);assert((target.match(/\\/tongxue\\//g)||[]).length===1,\`${name}: duplicate Tongxue target\`);await page.goto(u.href,{waitUntil:'domcontentloaded'});await page.waitForSelector('[data-student-voice-scope="major"]');await page.waitForFunction(()=>document.body.dataset.studentVoiceScope==='major');const state=await page.evaluate(()=>({runtime:window.__TONGXUE_RUNTIME_V160__?.version||'',scope:document.body.dataset.studentVoiceScope||'',title:document.querySelector('#resultTitle')?.textContent||'',text:document.querySelector('#result')?.textContent||'',overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));assert(state.runtime==='tongxue-runtime-v160',\`${name}: Tongxue v160 runtime missing\`);assert(state.scope==='major',\`${name}: scope missing\`);assert(state.title.includes('电气工程及其自动化'),\`${name}: major title missing\`);assert(state.text.includes('不能代表某一所学校的培养情况')||state.text.includes('跨学校'),\`${name}: cross-school boundary missing\`);assert(state.overflow<=1,\`${name}: horizontal overflow \${state.overflow}\`);}
const browser=await chromium.launch({headless:true});const evidence=[];try{for(const device of DEVICES){const context=await browser.newContext(device);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));await install(page);await run(page,device.name);assert(!errors.length,\`${device.name}: page errors \${errors.join('\\n')}\`);evidence.push({device:device.name,ok:true});await context.close();}}finally{await browser.close();}
console.log(JSON.stringify({ok:true,version:'student-voice-handoff-browser-v0.02',devices:evidence},null,2));
`);

// Permanent UEC workflow follows v0.02 navigation and browser proof.
{
  const rel = '.github/workflows/verify-unified-experience-context-v001.yml';
  let text = read(rel)
    .replaceAll('tools/verify-student-voice-navigation-v001.mjs', 'tools/verify-student-voice-navigation-v002.mjs');
  if (!text.includes('tools/browser-student-voice-handoff-v002.mjs')) {
    text = text.replace("      - name: Student Voice cross-product navigation contract\n        run: node tools/verify-student-voice-navigation-v002.mjs", "      - name: Student Voice cross-product navigation contract\n        run: node tools/verify-student-voice-navigation-v002.mjs\n      - name: Install Chromium for Student Voice handoff\n        run: |\n          npm install --no-save --no-package-lock playwright@1.55.0\n          npx playwright install --with-deps chromium\n      - name: Student Voice ln-rank to Tongxue browser handoff\n        run: node tools/browser-student-voice-handoff-v002.mjs");
  }
  write(rel, text);
}

// Tongxue live verification now proves v160 is the one active immutable package while v159 remains historical.
{
  const rel = '.github/workflows/tongxue-live-verification.yml';
  let text = read(rel)
    .replace('name: Tongxue v1.5.9 live verification', 'name: Tongxue v1.6.0 live verification')
    .replace("CURRENT_RELEASE.tongxueRuntimeVersion!=='tongxue-runtime-v159-r3968'", "CURRENT_RELEASE.tongxueRuntimeVersion!=='tongxue-runtime-v160-r3990_3'")
    .replace("SITE_RUNTIME_CONTRACT.stableDependencies.includes('/tongxue/app/tongxue-runtime-v159-r3968.js')", "SITE_RUNTIME_CONTRACT.stableDependencies.includes('/tongxue/app/tongxue-runtime-v160-r3990_3.js')")
    .replace("html.includes('tongxue-runtime-v159-r3968.js?v=3968_0')", "html.includes('tongxue-runtime-v160-r3990_3.js?v=3990_3')")
    .replace("fs.readFileSync('tongxue/app/tongxue-runtime-v159-r3968.js','utf8')", "fs.readFileSync('tongxue/app/tongxue-runtime-v160-r3990_3.js','utf8')")
    .replace("['release-presenter.v3968_0.js?v=3968_0','tongxue-runtime-controller-v159.js?v=159']", "['release-presenter.v3990_3.js?v=3990_3','tongxue-runtime-controller-v160.js?v=160']")
    .replace("fs.readFileSync('tongxue/app/tongxue-runtime-controller-v159.js','utf8')", "fs.readFileSync('tongxue/app/tongxue-runtime-controller-v160.js','utf8')")
    .replace("['tongxue-runtime-search-view-v159.js?v=159','tongxue-runtime-result-view-v159.js?v=159','tongxue-runtime-utils-v159.js?v=159']", "['tongxue-runtime-search-view-v159.js?v=159','tongxue-runtime-result-view-v160.js?v=160','tongxue-runtime-utils-v159.js?v=159']")
    .replace("['tongxue/app/tongxue-runtime-v159-r3968.js','tongxue/app/tongxue-runtime-controller-v159.js','tongxue/app/tongxue-runtime-search-view-v159.js','tongxue/app/tongxue-runtime-result-view-v159.js']", "['tongxue/app/tongxue-runtime-v160-r3990_3.js','tongxue/app/tongxue-runtime-controller-v160.js','tongxue/app/tongxue-runtime-search-view-v159.js','tongxue/app/tongxue-runtime-result-view-v160.js']")
    .replace("console.log('Tongxue stable v159 package under current site generation v3990_3 and release v3.9.90.3 passed');", "console.log('Tongxue immutable v160 package under current site generation v3990_3 and release v3.9.90.3 passed');")
    .replace('name: tongxue-v159-v3990-1-live-results', 'name: tongxue-v160-v3990-3-live-results');
  write(rel, text);
}

// Durable ledger records the production contradiction that reopened UEC-06/07 and the structural fix.
{
  const rel = 'docs/architecture/UNIFIED-EXPERIENCE-CONTEXT-STATUS.md';
  let text = read(rel);
  const marker = '## Permanent proof surfaces';
  const note = `## Post-merge contradiction and repair line (2026-08-21)\n\nA real ln-rank school-all journey exposed a contradiction after PR #182: the Student Voice button could generate the expected major target, but Tongxue still loaded immutable v159 assets under their old cache identity. Because PR #182 had modified v159 controller/result files in place, users could receive a mixed runtime (new handoff + cached old Tongxue controller). The user also supplied a polluted concatenated URL example; return-state sanitation therefore now rejects any embedded absolute URL instead of propagating it.\n\nThis contradiction reopened **UEC-06** and **UEC-07**. The repair keeps one owner per responsibility: new immutable Tongxue v160 runtime/controller/result assets, Student Voice navigation v0.02, ln-rank handoff v0.04, and the existing shared interaction transaction as the only navigation executor. No v159 file is modified again, no second admissions/major truth is created, and the current site release advances coherently to v3.9.90.3 / v3990_3. UEC-QA remains open until Draft → exact Preview → same-head Ready → expected-head merge → exact-main Production is complete.\n\n`;
  if (!text.includes('Post-merge contradiction and repair line')) text = text.replace(marker, note + marker);
  text = text.replace('| UEC-06 | **DONE** | Tongxue keeps its existing school runtime owner and gains bounded Student Voice presentation/direct scope handling without a second runtime. |', '| UEC-06 | **DONE** | Re-proved after production contradiction: Tongxue direct-major handling now lives in immutable v160 assets; v159 remains historical and untouched. |');
  text = text.replace('| UEC-07 | **DONE** | ln-rank concrete-major handoff uses canonical major identity and same-origin return; no copied admissions result state. |', '| UEC-07 | **DONE** | Re-proved after production contradiction: ln-rank uses handoff v0.04 + navigation v0.02; exact school-all return survives and polluted embedded URLs fail closed. |');
  text = text.replace('- `tools/verify-student-voice-navigation-v001.mjs`', '- `tools/verify-student-voice-navigation-v002.mjs`\n- `tools/browser-student-voice-handoff-v002.mjs`');
  write(rel, text);
}

// Preserve historical immutable cache rules and add the new site/Tongxue/navigation assets.
{
  const rel = '_headers';
  let text = read(rel);
  const immutable = [...cloned]
    .map(source => source.replaceAll(OLD_GEN, NEW_GEN))
    .filter(file => !file.startsWith('functions/'))
    .filter(file => /\.(?:js|css|json)$/.test(file));
  immutable.push(
    'shared/resources/experience/student-voice-navigation.v002.js',
    'ln-rank/js/workspace/major-path-handoff.v004.js',
    'tongxue/app/tongxue-runtime-v160-r3990_3.js',
    'tongxue/app/tongxue-runtime-controller-v160.js',
    'tongxue/app/tongxue-runtime-result-view-v160.js'
  );
  const additions=[];
  for (const file of new Set(immutable)) {
    const route=`/${file}`;
    if (text.includes(`${route}\n`)) continue;
    additions.push(`${route}\n  Cache-Control: public, max-age=31536000, immutable`);
  }
  if (additions.length) text += `\n\n# v3990_3 current site generation / Tongxue v160\n${additions.join('\n')}\n`;
  write(rel, text);
}

for (const rel of allowedDocs) {
  if (!exists(rel)) continue;
  const before=read(rel);
  const after=replaceCurrent(before);
  if (after!==before) write(rel, after);
}

// Remove one-shot builder artifacts from the final candidate.
for (const rel of [SELF, SELF_WORKFLOW]) if (exists(rel)) fs.rmSync(abs(rel));

const required=[
  'shared/resources/release/site-runtime-contract.v3990_3.js',
  'shared/resources/release/runtime-cache-contract.v3990_3.js',
  'shared/governance/resource-execution-contract.v3990_3.js',
  'ln-rank/site-active-generation.v3990_3.json',
  'ln-rank/js/app.v3990_3.js',
  'shared/resources/experience/student-voice-navigation.v002.js',
  'ln-rank/js/workspace/major-path-handoff.v004.js',
  'tongxue/app/tongxue-runtime-v160-r3990_3.js',
  'tongxue/app/tongxue-runtime-controller-v160.js',
  'tongxue/app/tongxue-runtime-result-view-v160.js',
  'tools/audit-canonical-release-version-v3990_3.mjs',
  'tools/audit-site-runtime-generation-v3990_3.mjs',
  'tools/verify-student-voice-navigation-v002.mjs',
  'tools/browser-student-voice-handoff-v002.mjs'
];
for (const rel of required) if (!exists(rel)) throw new Error(`missing generated ${rel}`);
const current=read('shared/resources/release/current-release.js');
if (!current.includes("display: 'v3.9.90.3'") || !current.includes("siteRuntimeGeneration: 'v3990_3'") || !current.includes("tongxueRuntimeVersion: 'tongxue-runtime-v160-r3990_3'")) throw new Error('canonical release/Tongxue bump incomplete');
if (read('tongxue/index.html').includes('tongxue-runtime-v159-r3968.js?v=3968_0')) throw new Error('old Tongxue wrapper still active');
if (!read('ln-rank/js/app.v3990_3.js').includes('major-path-handoff.v004.js?v=004_0')) throw new Error('new handoff not active');
console.log(JSON.stringify({ok:true,release:NEW_RELEASE,generation:NEW_GEN,tongxue:'tongxue-runtime-v160-r3990_3',studentVoiceNavigation:'student-voice-navigation-v0.02',handoff:'major-path-ln-rank-handoff-v0.04',clonedRuntimeFiles:[...cloned].sort(),temporaryArtifactsRemoved:!exists(SELF)&&!exists(SELF_WORKFLOW)},null,2));
