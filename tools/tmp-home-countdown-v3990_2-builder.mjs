import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OLD_TOKEN = '3990_1';
const NEW_TOKEN = '3990_2';
const OLD_GEN = 'v3990_1';
const NEW_GEN = 'v3990_2';
const OLD_RELEASE = 'v3.9.90.1';
const NEW_RELEASE = 'v3.9.90.2';
const SELF = 'tools/tmp-home-countdown-v3990_2-builder.mjs';
const SELF_WORKFLOW = '.github/workflows/tmp-home-countdown-v3990_2-builder.yml';

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
  const regex = /['"`]([^'"`\s]+v3990_1[^'"`\s]*)['"`]/g;
  let match;
  while ((match = regex.exec(content))) {
    const resolved = resolveRef(rel, match[1]);
    if (resolved && exists(resolved)) refs.push(resolved);
  }
  return refs;
}

const runtimeSeeds = new Set([
  'shared/resources/release/site-runtime-contract.v3990_1.js',
  'shared/resources/release/release-presenter.v3990_1.js',
  'shared/resources/release/runtime-cache-contract.v3990_1.js',
  'shared/governance/resource-execution-contract.v3990_1.js',
  'shared/governance/production-resource-verification-contract.v3990_1.js',
  'shared/ui/ui-resource-registry.v3990_1.js',
  'ln-rank/site-active-generation.v3990_1.json',
  'functions/_lib/major-bands-rank-index.v3990_1.js',
  'functions/_lib/major-bands-rank-query-kernel.v3990_1.js',
  'functions/_lib/major-bands-rank-bucket-loader.v3990_1.js',
  'functions/_lib/major-bands-result-order.v3990_1.js',
  'functions/_lib/major-bands-response-transport.v3990_1.js',
  'functions/_lib/major-filter.v3990_1.js',
  'shared/resources/geo/china-region-catalog.v3990_1.js',
  'shared/ui/shell/family-shell.v3990_1.js',
  'shared/ui/components/family-plan-entry.v3990_1.js',
  'shared/ui/interaction/interaction-transaction.v3990_1.js',
  'shared/ui/interaction/interaction-transaction.v3990_1.css',
  'ln-rank/js/ux/family-home.v3990_1.js',
  'ln-rank/js/app.v3990_1.js',
  'ln-rank/js/app-runtime.v3990_1.js',
  'ln-rank/js/self-check.v3990_1.js',
  'ln-rank/js/feature/major-pool/pagination-snapshot-guard.v3990_1.js',
  'ln-rank/js/workspace/selection-workspace-orchestrator.v3990_1.js',
  'ln-rank/js/selection-pool.v3990_1.js',
  'ln-rank/js/selection-pool-runtime.v3990_1.js',
  'aiplus/app.v3990_1.js',
  'aiplus/workspace.v3990_1.css',
  'shared/ai/ai-workspace-contract.v3990_1.js'
]);

for (const owner of [
  'shared/resources/release/current-release.js',
  'shared/resources/release/site-runtime-contract.v3990_1.js',
  'shared/resources/release/runtime-cache-contract.v3990_1.js',
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
  if (dest.endsWith('major-bands-rank-query-kernel.v3990_2.js')) {
    next = next.replace("from './major-filter.js'", "from './major-filter.v3990_2.js'");
  }
  write(dest, next);
  for (const ref of versionedRefs(rel, source)) cloneRuntime(ref);
}
for (const seed of runtimeSeeds) cloneRuntime(seed);

const generatedToolSeeds = [
  'tools/audit-canonical-release-version-v3990_1.mjs',
  'tools/audit-site-runtime-generation-v3990_1.mjs',
  'tools/audit-unified-resource-graph-v3990_1.mjs',
  'tools/audit-architecture-handoff-v3990_1.mjs',
  'tools/audit-major-bands-rank-kernel-v3990_1.mjs',
  'tools/audit-cloudflare-git-production-v3990_1.mjs',
  'tools/audit-score-equivalence-v3990_1.mjs',
  'tools/browser-home-release-v3990_1.mjs',
  'tools/browser-family-action-v3990_1.mjs',
  'tools/browser-resource-execution-v3990_1.mjs',
  'tools/browser-school-query-v3990_1.mjs',
  'tools/browser-native-chooser-activation-v3990_1.mjs',
  'tools/verify-ai-workspace-v3990_1.mjs',
  'tools/browser-ai-workspace-v3990_1.mjs'
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

// Active workflows keep their historical filenames but validate the new current site generation.
for (const rel of grepFiles.filter(rel => rel.startsWith('.github/workflows/') && exists(rel))) {
  const before = read(rel);
  const after = replaceCurrent(before);
  if (after !== before) write(rel, after);
}

// If an updated workflow now references a v3990_2 verifier that does not yet exist,
// clone only the corresponding prior verifier. Existing v3990_2 capability tools are never overwritten.
for (const rel of grepFiles.filter(rel => rel.startsWith('.github/workflows/') && exists(rel))) {
  const workflow = read(rel);
  const refs = workflow.match(/tools\/[A-Za-z0-9_./-]*v3990_2[A-Za-z0-9_./-]*/g) || [];
  for (const ref of new Set(refs)) {
    const clean = ref.replace(/["'`,:)]+$/g, '');
    if (exists(clean)) continue;
    const prior = clean.replaceAll(NEW_GEN, OLD_GEN);
    if (exists(prior)) cloneRuntime(prior);
  }
}

// Canonical release label describes this release without changing stable business truth.
{
  const rel = 'shared/resources/release/current-release.js';
  let text = read(rel);
  text = text
    .replace("release: 'v3.9.90.2-ai-semantic-active-view'", "release: 'v3.9.90.2-home-countdown-seconds'")
    .replace("releaseName: 'v3.9.90.2-ai-semantic-active-view'", "releaseName: 'v3.9.90.2-home-countdown-seconds'")
    .replace("label: 'ai-semantic-active-view'", "label: 'home-countdown-seconds'");
  write(rel, text);
}

// Countdown remains owned by the single home runtime. It recomputes from the absolute target every second,
// so timer delay does not accumulate into clock drift.
{
  const rel = 'ln-rank/js/ux/family-home.v3990_2.js';
  let text = read(rel);
  text = text.replace(
    "  minute: '2-digit',\n  hour12: false",
    "  minute: '2-digit',\n  second: '2-digit',\n  hour12: false"
  );
  text = text.replace(
`function renderCountdown(now = new Date()) {
  const remaining = EXAM_START_AT.getTime() - now.getTime();
  setText('d2027', remaining <= 0 ? '0' : String(Math.ceil(remaining / 86400000)));
  setText('nowText', CLOCK_FORMATTER.format(now));
}`,
`function renderCountdown(now = new Date()) {
  const remainingMs = Math.max(0, EXAM_START_AT.getTime() - now.getTime());
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad2 = value => String(value).padStart(2, '0');

  setText('d2027', String(days));
  setText('h2027', pad2(hours));
  setText('m2027', pad2(minutes));
  setText('s2027', pad2(seconds));
  setText('nowText', CLOCK_FORMATTER.format(now));
  document.getElementById('examCountdown')?.setAttribute(
    'aria-label',
    [96m\`距离2027年高考还有\${days}天\${hours}小时\${minutes}分\${seconds}秒\`[0m
  );
}`.replace(/\u001b\[96m|\u001b\[0m/g, '')
  );
  text = text.replace(
    'const countdownTimer = globalThis.setInterval(renderCountdown, 60000);',
    'const countdownTimer = globalThis.setInterval(renderCountdown, 1000);'
  );
  text = text.replace(
    '  countdownOwner: HOME_RUNTIME_VERSION,\n  timer: countdownTimer',
    "  countdownOwner: HOME_RUNTIME_VERSION,\n  countdownPrecision: 'second',\n  countdownIntervalMs: 1000,\n  examStartAt: EXAM_START_AT.toISOString(),\n  timer: countdownTimer"
  );
  if (!text.includes("countdownPrecision: 'second'")) throw new Error('countdown runtime patch incomplete');
  write(rel, text);
}

// Human layout: four stable numeric cells, tabular digits, no per-device business branch.
{
  const rel = 'index.html';
  let text = read(rel);
  text = text.replace(
    '.time{display:grid;grid-template-columns:minmax(150px,240px);gap:8px;margin-top:14px}.time div{padding:14px 10px;border:1px solid var(--line);border-radius:13px;text-align:center}.time b{display:block;font-size:clamp(30px,5vw,48px);line-height:1;font-variant-numeric:tabular-nums}.time span{display:block;margin-top:7px;color:var(--muted);font-size:12px;font-weight:900}.now{display:flex;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px dashed var(--line);color:var(--muted);font-size:13px}',
    '.time{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}.time div{min-width:0;padding:13px 6px;border:1px solid var(--line);border-radius:13px;text-align:center}.time b{display:block;min-width:0;font-size:clamp(24px,4vw,38px);line-height:1;font-variant-numeric:tabular-nums;font-feature-settings:"tnum";letter-spacing:-.02em;white-space:nowrap}.time span{display:block;margin-top:7px;color:var(--muted);font-size:12px;font-weight:900}.now{display:flex;justify-content:space-between;gap:10px;margin-top:12px;padding-top:12px;border-top:1px dashed var(--line);color:var(--muted);font-size:13px}.now b{font-variant-numeric:tabular-nums;font-feature-settings:"tnum";white-space:nowrap}'
  );
  text = text.replace('@media(max-width:460px){.page{width:calc(100vw - 16px);padding-top:8px}.shell{border-radius:19px}.card{padding:16px}.now{display:block}}', '@media(max-width:460px){.page{width:calc(100vw - 16px);padding-top:8px}.shell{border-radius:19px}.card{padding:16px}.time{gap:6px}.time div{padding:12px 4px}.time b{font-size:clamp(23px,8vw,30px)}.now{display:grid;gap:4px}}');
  text = text.replace('<div class="count">\n            <div class="count-head"><div><h2>距离2027年高考</h2><small>时间只帮助安排节奏，不替代今天的学习与家庭沟通。</small></div></div>\n            <div class="time"><div><b id="d2027">0</b><span>天左右</span></div></div>', '<div class="count" id="examCountdown">\n            <div class="count-head"><div><h2>距离2027年高考</h2><small>按页面预设的北京时间 2027年6月7日 09:00 计算；时间只帮助安排节奏。</small></div></div>\n            <div class="time" data-countdown-precision="second"><div><b id="d2027">0</b><span>天</span></div><div><b id="h2027">00</b><span>小时</span></div><div><b id="m2027">00</b><span>分钟</span></div><div><b id="s2027">00</b><span>秒</span></div></div>');
  if (!text.includes('data-countdown-precision="second"') || !text.includes('id="s2027"')) throw new Error('home countdown markup patch incomplete');
  write(rel, text);
}

// Extend the home ownership audit with precision/cadence and stable four-cell layout assertions.
{
  const rel = 'tools/audit-home-release-ownership-v3970.mjs';
  let text = read(rel);
  text = text.replace(
    "  '全国上市公司产业落地图'\n]) assert.ok(home.includes(marker)",
    "  '全国上市公司产业落地图',\n  'data-countdown-precision=\"second\"',\n  'id=\"h2027\"',\n  'id=\"m2027\"',\n  'id=\"s2027\"'\n]) assert.ok(home.includes(marker)"
  );
  text = text.replace(
    "  'stateOwner: release.resourceOwners.familyDecisionState'\n]) assert.ok(runtime.includes(marker)",
    "  'stateOwner: release.resourceOwners.familyDecisionState',\n  \"second: '2-digit'\",\n  \"countdownPrecision: 'second'\",\n  'countdownIntervalMs: 1000',\n  'setInterval(renderCountdown, 1000)'\n]) assert.ok(runtime.includes(marker)"
  );
  text = text.replace(
    "assert.equal((runtime.match(/setInterval\\(/g) || []).length, 1, 'home countdown must have one timer owner');",
    "assert.equal((runtime.match(/setInterval\\(/g) || []).length, 1, 'home countdown must have one timer owner');\nassert.equal((home.match(/data-countdown-precision=\"second\"/g) || []).length, 1, 'home must have one second-precision countdown');\nassert.equal((home.match(/id=\"[dhms]2027\"/g) || []).length, 4, 'home countdown must expose four stable time cells');"
  );
  write(rel, text);
}

// New browser gate proves second-level change, numeric bounds, Beijing clock seconds and cross-device geometry.
{
  const rel = 'tools/browser-home-release-v3990_2.mjs';
  let text = read(rel);
  text = text.replace("const artifactDir = process.env.V3970_HOME_ARTIFACT_DIR || '/tmp/v3990-0-home-browser';", "const artifactDir = process.env.V3970_HOME_ARTIFACT_DIR || '/tmp/v3990-2-home-browser';");
  text = text.replace(
    "        countdown: Number(document.getElementById('d2027')?.textContent || NaN),",
    "        countdown: Number(document.getElementById('d2027')?.textContent || NaN),\n        countdownParts: {\n          days: Number(document.getElementById('d2027')?.textContent || NaN),\n          hours: Number(document.getElementById('h2027')?.textContent || NaN),\n          minutes: Number(document.getElementById('m2027')?.textContent || NaN),\n          seconds: Number(document.getElementById('s2027')?.textContent || NaN)\n        },\n        countdownCellCount: document.querySelectorAll('[data-countdown-precision=\"second\"] > div').length,\n        countdownPrecision: document.querySelector('[data-countdown-precision]')?.dataset.countdownPrecision,\n        nowText: document.getElementById('nowText')?.textContent?.trim(),"
  );
  text = text.replace(
    "    assert.ok(Number.isFinite(state.countdown) && state.countdown >= 0, `${device.name}: countdown`);",
    "    assert.ok(Number.isFinite(state.countdown) && state.countdown >= 0, `${device.name}: countdown`);\n    assert.equal(state.countdownCellCount, 4, `${device.name}: four countdown cells`);\n    assert.equal(state.countdownPrecision, 'second', `${device.name}: second precision marker`);\n    assert.equal(state.runtime?.countdownPrecision, 'second', `${device.name}: runtime second precision`);\n    assert.equal(state.runtime?.countdownIntervalMs, 1000, `${device.name}: one-second cadence`);\n    assert.equal(state.countdownParts.hours >= 0 && state.countdownParts.hours <= 23, true, `${device.name}: hour range`);\n    assert.equal(state.countdownParts.minutes >= 0 && state.countdownParts.minutes <= 59, true, `${device.name}: minute range`);\n    assert.equal(state.countdownParts.seconds >= 0 && state.countdownParts.seconds <= 59, true, `${device.name}: second range`);\n    assert.match(state.nowText || '', /\\d{2}:\\d{2}:\\d{2}/, `${device.name}: Beijing clock includes seconds`);\n\n    const beforeTotal = state.countdownParts.days * 86400 + state.countdownParts.hours * 3600 + state.countdownParts.minutes * 60 + state.countdownParts.seconds;\n    await page.waitForTimeout(1150);\n    const afterParts = await page.evaluate(() => ({\n      days: Number(document.getElementById('d2027')?.textContent || NaN),\n      hours: Number(document.getElementById('h2027')?.textContent || NaN),\n      minutes: Number(document.getElementById('m2027')?.textContent || NaN),\n      seconds: Number(document.getElementById('s2027')?.textContent || NaN),\n      scrollWidth: document.documentElement.scrollWidth,\n      clientWidth: document.documentElement.clientWidth\n    }));\n    const afterTotal = afterParts.days * 86400 + afterParts.hours * 3600 + afterParts.minutes * 60 + afterParts.seconds;\n    assert.ok(afterTotal < beforeTotal && beforeTotal - afterTotal <= 2, `${device.name}: countdown advances by second (${beforeTotal} -> ${afterTotal})`);\n    assert.ok(afterParts.scrollWidth <= afterParts.clientWidth + 1, `${device.name}: no overflow after second tick`);"
  );
  write(rel, text);
}

// Preserve historical immutable cache rules and add the new site-generation static assets.
{
  const rel = '_headers';
  let text = read(rel);
  const immutable = [...cloned]
    .map(source => source.replaceAll(OLD_GEN, NEW_GEN))
    .filter(file => !file.startsWith('functions/'))
    .filter(file => /\.(?:js|css|json)$/.test(file));
  const additions = [];
  for (const file of new Set(immutable)) {
    const route = `/${file}`;
    if (text.includes(`${route}\n`)) continue;
    additions.push(`${route}\n  Cache-Control: public, max-age=31536000, immutable`);
  }
  if (additions.length) text += `\n\n# v3990_2 current site generation\n${additions.join('\n')}\n`;
  write(rel, text);
}

// The two architecture navigation docs describe the current owner; historical program ledgers remain untouched.
for (const rel of allowedDocs) {
  if (!exists(rel)) continue;
  const before = read(rel);
  const after = replaceCurrent(before);
  if (after !== before) write(rel, after);
}

// Remove one-shot builder artifacts from the release candidate.
for (const rel of [SELF, SELF_WORKFLOW]) if (exists(rel)) fs.rmSync(abs(rel));

const required = [
  'shared/resources/release/site-runtime-contract.v3990_2.js',
  'shared/resources/release/runtime-cache-contract.v3990_2.js',
  'shared/governance/resource-execution-contract.v3990_2.js',
  'ln-rank/site-active-generation.v3990_2.json',
  'ln-rank/js/ux/family-home.v3990_2.js',
  'tools/audit-canonical-release-version-v3990_2.mjs',
  'tools/audit-site-runtime-generation-v3990_2.mjs',
  'tools/browser-home-release-v3990_2.mjs'
];
for (const rel of required) if (!exists(rel)) throw new Error(`missing generated ${rel}`);

const current = read('shared/resources/release/current-release.js');
if (!current.includes("display: 'v3.9.90.2'") || !current.includes("siteRuntimeGeneration: 'v3990_2'")) throw new Error('canonical release bump incomplete');
if (!read('index.html').includes('data-countdown-precision="second"')) throw new Error('second countdown missing');
if (!read('ln-rank/js/ux/family-home.v3990_2.js').includes('setInterval(renderCountdown, 1000)')) throw new Error('second timer cadence missing');

console.log(JSON.stringify({
  ok: true,
  release: NEW_RELEASE,
  generation: NEW_GEN,
  clonedRuntimeFiles: [...cloned].sort(),
  temporaryArtifactsRemoved: !exists(SELF) && !exists(SELF_WORKFLOW)
}, null, 2));
