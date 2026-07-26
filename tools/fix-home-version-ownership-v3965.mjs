import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const VERSION = 'v3.9.65.0';
const ASSET = 'v3965_0';
const OLD_SHELL_CSS = '/shared/ui/shell/family-shell.v3964_0.css?v=3964_0';
const NEW_SHELL_CSS = '/shared/ui/shell/family-shell.v3965_0.css?v=3965_0';
const OLD_SHELL_JS = '/shared/ui/shell/family-shell.v3964_1.js?v=3964_1';
const NEW_SHELL_JS = '/shared/ui/shell/family-shell.v3965_0.js?v=3965_0';
const OLD_HOME_JS = '/ln-rank/js/ux/family-home.v3955_0.js?v=3955_0';
const NEW_HOME_JS = '/ln-rank/js/ux/family-home.v3965_0.js?v=3965_0';

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

function updateHomepage() {
  let source = read('index.html');
  source = source
    .split(OLD_SHELL_CSS).join(NEW_SHELL_CSS)
    .split(OLD_SHELL_JS).join(NEW_SHELL_JS)
    .split(OLD_HOME_JS).join(NEW_HOME_JS)
    .split('data-release="v3.9.64.1"').join(`data-release="${VERSION}"`)
    .split('<span data-current-release>v3.9.64.1</span>').join(`<span data-current-release>${VERSION}</span>`);
  source = source.replace(/\n  <script>\n    const t=new Date\('2027-06-07T09:00:00\+08:00'\)[\s\S]*?setInterval\(r,60000\);\n  <\/script>/, '');
  if (!source.includes(NEW_HOME_JS)) throw new Error('homepage did not activate family-home.v3965_0.js');
  if (!source.includes(NEW_SHELL_CSS) || !source.includes(NEW_SHELL_JS)) throw new Error('homepage shell assets are not v3965_0');
  if (source.includes('family-shell.v3964_') || source.includes('family-home.v3955_0.js')) throw new Error('homepage still contains stale active version references');
  write('index.html', source);
}

function updateActiveUiReferences() {
  const activePages = [
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
  ];
  for (const file of activePages) {
    replaceAll(file, [
      [OLD_SHELL_CSS, NEW_SHELL_CSS],
      [OLD_SHELL_JS, NEW_SHELL_JS]
    ]);
  }
  replaceAll('shared/ui/shell/family-shell.v3965_0.js', [
    ["'/shared/ui/shell/family-shell.v3964_0.css?v=3964_0'", "'/shared/ui/shell/family-shell.v3965_0.css?v=3965_0'"]
  ]);
  replaceAll('shared/ui/ui-registry.v3965_0.js', [
    ["shellCss: '/shared/ui/shell/family-shell.v3964_0.css'", "shellCss: '/shared/ui/shell/family-shell.v3965_0.css'"]
  ]);
  replaceAll('shared/resources/resource-registry.js', [
    ["shellCss: '/shared/ui/shell/family-shell.v3964_0.css'", "shellCss: '/shared/ui/shell/family-shell.v3965_0.css'"]
  ]);
}

function updateManifests() {
  for (const file of ['ln-rank/active-assets.json', 'ln-rank/release-meta.json']) {
    const data = JSON.parse(read(file));
    data.familyHomeJs = 'js/ux/family-home.v3965_0.js';
    data.sharedUiShellCss = '../shared/ui/shell/family-shell.v3965_0.css';
    data.sharedUiShellJs = '../shared/ui/shell/family-shell.v3965_0.js';
    data.jsEntry = ensureArraySwap(data.jsEntry, 'js/ux/family-home.v3955_0.js', 'js/ux/family-home.v3965_0.js');
    data.cssEntry = ensureArraySwap(data.cssEntry, '../shared/ui/shell/family-shell.v3964_0.css', '../shared/ui/shell/family-shell.v3965_0.css');
    write(file, JSON.stringify(data, null, 2));
  }
}

function updateHeaders() {
  let headers = read('_headers');
  for (const asset of [
    '/ln-rank/js/ux/family-home.v3965_0.js',
    '/shared/ui/shell/family-shell.v3965_0.css'
  ]) {
    const rule = `${asset}\n  Cache-Control: public, max-age=31536000, immutable`;
    if (!headers.includes(rule)) headers += `\n${rule}\n`;
  }
  write('_headers', headers);
}

function updateReleasePreparation() {
  const file = 'tools/prepare-release-v3965.mjs';
  let source = read(file);
  const hook = "await import('./fix-home-version-ownership-v3965.mjs');";
  if (!source.includes(hook)) {
    source = source.replace(
      "console.log(JSON.stringify({ ok: true, version: VERSION, asset: ASSET }, null, 2));",
      `${hook}\nconsole.log(JSON.stringify({ ok: true, version: VERSION, asset: ASSET }, null, 2));`
    );
  }
  if (!source.includes(hook)) throw new Error('prepare-release-v3965.mjs could not be connected to homepage ownership sync');
  write(file, source);
}

function updateAudits() {
  let runtimeAudit = read('tools/audit-runtime-ownership-v3965.mjs');
  if (!runtimeAudit.includes("const home = read('index.html');")) {
    runtimeAudit = runtimeAudit.replace(
      "const main = read('ln-rank/index.html');",
      "const home = read('index.html');\nconst homeRuntime = read('ln-rank/js/ux/family-home.v3965_0.js');\nconst shellRuntime = read('shared/ui/shell/family-shell.v3965_0.js');\nconst main = read('ln-rank/index.html');"
    );
  }
  const ownershipAssertions = `
assert.ok(home.includes('/ln-rank/js/ux/family-home.v3965_0.js?v=3965_0'));
assert.ok(home.includes('/shared/ui/shell/family-shell.v3965_0.css?v=3965_0'));
assert.ok(home.includes('/shared/ui/shell/family-shell.v3965_0.js?v=3965_0'));
assert.ok(home.includes('data-release="v3.9.65.0"'));
assert.ok(home.includes('<span data-current-release>v3.9.65.0</span>'));
assert.ok(!home.includes('family-shell.v3964_'));
assert.ok(!home.includes('family-home.v3955_0.js'));
assert.ok(!home.includes("const t=new Date('2027-06-07T09:00:00+08:00')"));
assert.ok(homeRuntime.includes("HOME_RUNTIME_VERSION = 'family-home-runtime-v3965_0'"));
assert.ok(homeRuntime.includes('mountCurrentRelease'));
assert.ok(homeRuntime.includes('countdownOwner: HOME_RUNTIME_VERSION'));
assert.ok(shellRuntime.includes('/shared/ui/shell/family-shell.v3965_0.css?v=3965_0'));
assert.equal(active.familyHomeJs, 'js/ux/family-home.v3965_0.js');
assert.equal(active.sharedUiShellCss, '../shared/ui/shell/family-shell.v3965_0.css');
assert.ok(active.jsEntry.includes('js/ux/family-home.v3965_0.js'));
assert.ok(!active.jsEntry.includes('js/ux/family-home.v3955_0.js'));
assert.ok(active.cssEntry.includes('../shared/ui/shell/family-shell.v3965_0.css'));
assert.ok(!active.cssEntry.includes('../shared/ui/shell/family-shell.v3964_0.css'));
`;
  if (!runtimeAudit.includes("assert.equal(active.familyHomeJs, 'js/ux/family-home.v3965_0.js');")) {
    runtimeAudit = runtimeAudit.replace("assert.equal(active.assetVersion, CURRENT_RELEASE.assetVersion);", `assert.equal(active.assetVersion, CURRENT_RELEASE.assetVersion);${ownershipAssertions}`);
  }
  write('tools/audit-runtime-ownership-v3965.mjs', runtimeAudit);

  let staticAudit = read('tools/audit-static-content-types-v3965.mjs');
  staticAudit = staticAudit
    .split("['/shared/ui/shell/family-shell.v3964_0.css', 'text/css']")
    .join("['/shared/ui/shell/family-shell.v3965_0.css', 'text/css'],\n  ['/ln-rank/js/ux/family-home.v3965_0.js', 'application/javascript']");
  if (!staticAudit.includes("'/ln-rank/js/ux/family-home.v3965_0.js',")) {
    staticAudit = staticAudit.replace(
      "  '/shared/ui/shell/family-shell.v3965_0.js',",
      "  '/shared/ui/shell/family-shell.v3965_0.js',\n  '/shared/ui/shell/family-shell.v3965_0.css',\n  '/ln-rank/js/ux/family-home.v3965_0.js',"
    );
  }
  write('tools/audit-static-content-types-v3965.mjs', staticAudit);
}

write('shared/ui/shell/family-shell.v3965_0.css', read('shared/ui/shell/family-shell.v3964_0.css'));
buildHomeRuntime();
updateHomepage();
updateActiveUiReferences();
updateManifests();
updateHeaders();
updateReleasePreparation();
updateAudits();

console.log(JSON.stringify({
  ok: true,
  version: VERSION,
  asset: ASSET,
  homeRuntime: 'family-home-runtime-v3965_0',
  shellCss: 'family-shell.v3965_0.css',
  singleReleaseOwner: true
}, null, 2));
