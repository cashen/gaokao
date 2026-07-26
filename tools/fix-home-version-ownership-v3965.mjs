import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const VERSION = 'v3.9.65.0';
const ASSET = 'v3965_0';
const OLD_SHELL_CSS = '/shared/ui/shell/family-shell.v3964_0.css?v=3964_0';
const NEW_SHELL_CSS = '/shared/ui/shell/family-shell.v3965_0.css?v=3965_0';
const OLD_SHELL_JS = '/shared/ui/shell/family-shell.v3964_1.js?v=3964_1';
const NEW_SHELL_JS = '/shared/ui/shell/family-shell.v3965_0.js?v=3965_0';
const OLD_RELEASE_PRESENTER = '/shared/resources/release/release-presenter.v3964_1.js?v=3964_1';
const NEW_RELEASE_PRESENTER = '/shared/resources/release/release-presenter.v3965_0.js?v=3965_0';
const OLD_HOME_JS = '/ln-rank/js/ux/family-home.v3955_0.js?v=3955_0';
const NEW_HOME_JS = '/ln-rank/js/ux/family-home.v3965_0.js?v=3965_0';
const OLD_DIFFICULTY_JS = '/ln-rank/js/major-difficulty-2026.v3964_1.js?v=3964_1';
const NEW_DIFFICULTY_JS = '/ln-rank/js/major-difficulty-2026.v3965_0.js?v=3965_0';
const OLD_STRUCTURE_JS = '/zy2026/assets/zy2026.v3964_1.js?v=3964_1';
const NEW_STRUCTURE_JS = '/zy2026/assets/zy2026.v3965_0.js?v=3965_0';

const ACTIVE_PAGES = Object.freeze([
  'index.html',
  'ln-rank/index.html',
  'ln-rank/selection-pool.html',
  'ln-rank/local-mainline.html',
  'ln-rank/211-mainline.html',
  'ln2026.html',
  'zy2026.html',
  'zy2026/index.html',
  'tongxue/index.html',
  'tongxue/changelog.html'
]);

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const write = (file, content) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const normalized = content.endsWith('\n') ? content : `${content}\n`;
  if (exists(file) && fs.readFileSync(target, 'utf8') === normalized) return false;
  fs.writeFileSync(target, normalized);
  return true;
};
const replaceAll = (file, pairs) => {
  if (!exists(file)) return false;
  let source = read(file);
  const before = source;
  for (const [from, to] of pairs) source = source.split(from).join(to);
  if (source === before) return false;
  return write(file, source);
};
const ensureArraySwap = (items, from, to) => {
  const next = (Array.isArray(items) ? items : []).map(item => item === from ? to : item);
  if (!next.includes(to)) next.push(to);
  return [...new Set(next)];
};

function buildHomeRuntime() {
  const legacy = read('ln-rank/js/ux/family-home.v3955_0.js').trim();
  const source = `import { mountCurrentRelease } from '../../../shared/resources/release/release-presenter.v3965_0.js?v=3965_0';

${legacy}

const HOME_RUNTIME_VERSION = 'family-home-runtime-v3965_0';
const EXAM_START_AT = new Date('2027-06-07T09:00:00+08:00');
const CLOCK_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function renderCountdown(now = new Date()) {
  const remaining = EXAM_START_AT.getTime() - now.getTime();
  setText('d2027', remaining <= 0 ? '0' : String(Math.ceil(remaining / 86400000)));
  setText('nowText', CLOCK_FORMATTER.format(now));
}

const release = mountCurrentRelease();
renderCountdown();
const countdownTimer = globalThis.setInterval(renderCountdown, 60000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderCountdown();
});

globalThis.__GAOKAO_HOME_RUNTIME__ = Object.freeze({
  version: HOME_RUNTIME_VERSION,
  release: release.display,
  countdownOwner: HOME_RUNTIME_VERSION,
  stateOwner: HOME_RUNTIME_VERSION,
  timer: countdownTimer
});
`;
  write('ln-rank/js/ux/family-home.v3965_0.js', source);
}

function buildEvidenceWrappers() {
  write('ln-rank/js/major-difficulty-2026.v3965_0.js', `import '../../shared/resources/release/release-presenter.v3965_0.js?v=3965_0';
import '../../shared/ui/shell/family-shell.v3965_0.js?v=3965_0';
await import('./major-difficulty-2026.v3953_0.js?v=3953_0');
`);
  write('zy2026/assets/zy2026.v3965_0.js', `import '../../shared/resources/release/release-presenter.v3965_0.js?v=3965_0';
import '../../shared/ui/shell/family-shell.v3965_0.js?v=3965_0';
await import('./zy2026.v3955_0.js?v=3955_0');
`);
}

function ensureReleaseAttributes(file) {
  let source = read(file);
  source = source
    .split(OLD_SHELL_CSS).join(NEW_SHELL_CSS)
    .split(OLD_SHELL_JS).join(NEW_SHELL_JS)
    .split(OLD_RELEASE_PRESENTER).join(NEW_RELEASE_PRESENTER)
    .split(OLD_HOME_JS).join(NEW_HOME_JS)
    .split(OLD_DIFFICULTY_JS).join(NEW_DIFFICULTY_JS)
    .split(OLD_STRUCTURE_JS).join(NEW_STRUCTURE_JS)
    .split('data-release="v3.9.64.1"').join(`data-release="${VERSION}"`)
    .split('<span data-current-release>v3.9.64.1</span>').join(`<span data-current-release>${VERSION}</span>`);
  if (/<body\b/.test(source) && !/<body\b[^>]*\bdata-release=/.test(source)) {
    source = source.replace(/<body\b/, `<body data-release="${VERSION}"`);
  }
  source = source.replace(/(<span data-current-release>)(?:读取中|v3\.9\.64\.1)(<\/span>)/g, `$1${VERSION}$2`);
  write(file, source);
}

function updateHomepage() {
  let source = read('index.html');
  source = source.replace(/\n  <script>\n    const t=new Date\('2027-06-07T09:00:00\+08:00'\)[\s\S]*?setInterval\(r,60000\);\n  <\/script>/, '');
  if (!source.includes(NEW_HOME_JS)) throw new Error('homepage did not activate family-home.v3965_0.js');
  if (!source.includes(NEW_SHELL_CSS) || !source.includes(NEW_SHELL_JS)) throw new Error('homepage shell assets are not v3965_0');
  if (source.includes('family-shell.v3964_') || source.includes('family-home.v3955_0.js')) throw new Error('homepage still contains stale active version references');
  write('index.html', source);
}

function updateActivePages() {
  for (const file of ACTIVE_PAGES) ensureReleaseAttributes(file);
  updateHomepage();

  let changelog = read('tongxue/changelog.html');
  if (!changelog.includes(NEW_RELEASE_PRESENTER)) {
    changelog = changelog.replace(
      `<script type="module" src="${NEW_SHELL_JS}"></script>`,
      `<script type="module" src="${NEW_RELEASE_PRESENTER}"></script>\n<script type="module" src="${NEW_SHELL_JS}"></script>`
    );
  }
  if (!changelog.includes('data-current-release')) {
    changelog = changelog.replace('同学你好 · 更新记录</footer>', `同学你好 · 更新记录｜当前全站发布：<span data-current-release>${VERSION}</span></footer>`);
  }
  write('tongxue/changelog.html', changelog);

  for (const file of ACTIVE_PAGES) {
    const source = read(file);
    if (!source.includes(`data-release="${VERSION}"`)) throw new Error(`${file} is missing current release data attribute`);
    if (source.includes('release-presenter.v3964_1.js')) throw new Error(`${file} still activates the old release presenter`);
  }
}

function updateRegistries() {
  replaceAll('shared/ui/shell/family-shell.v3965_0.js', [
    ["'/shared/ui/shell/family-shell.v3964_0.css?v=3964_0'", "'/shared/ui/shell/family-shell.v3965_0.css?v=3965_0'"]
  ]);
  replaceAll('shared/ui/ui-registry.v3965_0.js', [
    ["shellCss: '/shared/ui/shell/family-shell.v3964_0.css'", "shellCss: '/shared/ui/shell/family-shell.v3965_0.css'"]
  ]);
  replaceAll('shared/resources/resource-registry.js', [
    ["shellCss: '/shared/ui/shell/family-shell.v3964_0.css'", "shellCss: '/shared/ui/shell/family-shell.v3965_0.css'"]
  ]);
  replaceAll('shared/resources/release/current-release.js', [
    ["searchIntentState: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3964_0.js'", "searchIntentState: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3965_0.js'"]
  ]);
}

function updateManifests() {
  for (const file of ['ln-rank/active-assets.json', 'ln-rank/release-meta.json']) {
    const data = JSON.parse(read(file));
    data.familyHomeJs = 'js/ux/family-home.v3965_0.js';
    data.majorDifficultyJs = 'js/major-difficulty-2026.v3965_0.js';
    data.sharedUiShellCss = '../shared/ui/shell/family-shell.v3965_0.css';
    data.sharedUiShellJs = '../shared/ui/shell/family-shell.v3965_0.js';
    data.structure2026 = { ...data.structure2026, js: '../zy2026/assets/zy2026.v3965_0.js' };
    data.jsEntry = ensureArraySwap(data.jsEntry, 'js/ux/family-home.v3955_0.js', 'js/ux/family-home.v3965_0.js');
    data.jsEntry = ensureArraySwap(data.jsEntry, 'js/major-difficulty-2026.v3964_1.js', 'js/major-difficulty-2026.v3965_0.js');
    data.jsEntry = ensureArraySwap(data.jsEntry, '../zy2026/assets/zy2026.v3964_1.js', '../zy2026/assets/zy2026.v3965_0.js');
    data.cssEntry = ensureArraySwap(data.cssEntry, '../shared/ui/shell/family-shell.v3964_0.css', '../shared/ui/shell/family-shell.v3965_0.css');
    write(file, JSON.stringify(data, null, 2));
  }
}

function ensureHeaderRule(headers, pathname, headerLine) {
  const rule = `${pathname}\n  ${headerLine}`;
  return headers.includes(rule) ? headers : `${headers.trimEnd()}\n\n${rule}\n`;
}

function updateHeaders() {
  let headers = read('_headers');
  for (const asset of [
    '/ln-rank/js/ux/family-home.v3965_0.js',
    '/shared/ui/shell/family-shell.v3965_0.css',
    '/ln-rank/js/major-difficulty-2026.v3965_0.js',
    '/zy2026/assets/zy2026.v3965_0.js'
  ]) headers = ensureHeaderRule(headers, asset, 'Cache-Control: public, max-age=31536000, immutable');
  headers = ensureHeaderRule(headers, '/zy2026/assets/zy2026.v3965_0.js', 'Content-Type: application/javascript; charset=utf-8');
  headers = ensureHeaderRule(headers, '/tongxue/changelog.html', 'Cache-Control: no-cache, max-age=0, must-revalidate');
  write('_headers', headers);
}

function verifyReleasePreparation() {
  const source = read('tools/prepare-release-v3965.mjs');
  const hook = "await import('./fix-home-version-ownership-v3965.mjs');";
  if (!source.includes(hook)) throw new Error('prepare-release-v3965.mjs is not connected to release ownership sync');
}

write('shared/ui/shell/family-shell.v3965_0.css', read('shared/ui/shell/family-shell.v3964_0.css'));
buildHomeRuntime();
buildEvidenceWrappers();
updateActivePages();
updateRegistries();
updateManifests();
updateHeaders();
verifyReleasePreparation();

console.log(JSON.stringify({
  ok: true,
  version: VERSION,
  asset: ASSET,
  homeRuntime: 'family-home-runtime-v3965_0',
  shellCss: 'family-shell.v3965_0.css',
  evidenceWrappers: [
    'major-difficulty-2026.v3965_0.js',
    'zy2026.v3965_0.js'
  ],
  singleReleaseOwner: true
}, null, 2));
