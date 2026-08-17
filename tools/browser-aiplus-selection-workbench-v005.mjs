import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright() {
  try { return await import('playwright'); }
  catch (error) {
    if (runtimeModules) return import(pathToFileURL(path.join(runtimeModules, 'playwright', 'index.mjs')).href);
    throw error;
  }
}
const { chromium } = await loadPlaywright();

const ROOT = process.cwd();
const LOCAL_ORIGIN = 'https://aiplus-selection.test';
const BASE = String(process.env.AIPLUS_SELECTION_BASE || LOCAL_ORIGIN).replace(/\/$/, '');
const LIVE = BASE !== LOCAL_ORIGIN;
const DEVICES = [
  { name: 'pc', viewport: { width: 1440, height: 920 } },
  { name: 'pad', viewport: { width: 820, height: 1180 }, hasTouch: true },
  { name: 'android', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
];

function assert(condition, message) { if (!condition) throw new Error(message); }
function mime(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.js') || file.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}
function staticFile(pathname) {
  let relative = decodeURIComponent(pathname);
  if (relative === '/' || relative === '/aiplus' || relative === '/aiplus/') relative = '/aiplus/index.html';
  const resolved = path.resolve(ROOT, `.${relative}`);
  if (!resolved.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}
async function installLocalRoutes(page) {
  if (LIVE) return;
  await page.route(`${LOCAL_ORIGIN}/**`, async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/blank') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>seed</title>' });
    if (url.pathname === '/favicon.ico') return route.fulfill({ status: 204, body: '' });
    const file = staticFile(url.pathname);
    if (file) return route.fulfill({ status: 200, contentType: mime(file), body: fs.readFileSync(file) });
    return route.fulfill({ status: 404, contentType: 'text/plain', body: `not found: ${url.pathname}` });
  });
}

const SEED_POOL = [
  { id: 'seed|甲大学|电气工程及其自动化', dataYear: 2026, primaryYear: 2026, school: '甲大学', major: '电气工程及其自动化', score2026: 585, rank2026: 19000, bandKey: 'near', isSinoForeign: true, isHighFee: true, tuition: '60000元/年', userOrder: 1 },
  { id: 'seed|乙大学|自动化', dataYear: 2026, primaryYear: 2026, school: '乙大学', major: '自动化', score2026: 582, rank2026: 19800, bandKey: 'near', isPublicSchool: true, localStrongChain: { matched: true }, trajectoryChain: { matched: true }, majorUnderstanding: { matched: true }, userOrder: 2 },
  { id: 'seed|丙大学|机械电子工程', dataYear: 2026, primaryYear: 2026, school: '丙大学', major: '机械电子工程', score2026: 580, rank2026: 20696, bandKey: 'near', isPublicSchool: true, userOrder: 3 }
];
const ADD_RECORD = { id: 'seed|丁大学|测控技术与仪器', dataYear: 2026, primaryYear: 2026, school: '丁大学', major: '测控技术与仪器', score2026: 575, rank2026: 22400, bandKey: 'steady', isPublicSchool: true, displayLocation: '沈阳' };

async function seed(page) {
  await page.goto(`${BASE}${LIVE ? '/aiplus/' : '/blank'}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(async ({ pool, addRecord }) => {
    localStorage.setItem('lnRank.selectionPool.lnPhysics.2026.v3951', JSON.stringify(pool));
    const { createAiWorkspace } = await import('/shared/ai/ai-workspace-contract.v3992_0.js?v=002_4&fdw=003_0');
    const ws = createAiWorkspace();
    ws.id = 'workspace:selection-browser';
    ws.version = 21;
    ws.examContext = { ...(ws.examContext || {}), score: 580, rank: 20696 };
    ws.decisionStage = 'feasible_set';
    ws.decisionProfile = {
      ...(ws.decisionProfile || {}),
      explicit: {
        ...(ws.decisionProfile?.explicit || {}),
        primaryGoal: 'employment_stability',
        priorities: ['employment', 'cost'],
        familyResourceSensitivity: 'resource_sensitive',
        studyDurationTolerance: 'prefer_short'
      }
    };
    ws.lastResult = { candidates: { records: [addRecord], counts: { upper: 0, near: 0, steady: 1, total: 1 } }, decisionStage: 'feasible_set' };
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('gaokao-ai-workspace-v3990_0', 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('workspace')) request.result.createObjectStore('workspace'); };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('workspace', 'readwrite');
        const store = tx.objectStore('workspace');
        store.put(ws, 'current');
        store.put(ws, `session:${ws.id}`);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, { pool: SEED_POOL, addRecord: ADD_RECORD });
  if (LIVE) await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
}

async function openDecision(page, device) {
  if (device.name !== 'pc') {
    await page.locator('#historyToggle').click();
    await page.waitForFunction(() => document.body.classList.contains('history-open'));
  }
  await page.locator('#selectionWorkbench').waitFor({ state: 'visible' });
}

async function appendCandidateCard(page) {
  await page.evaluate(record => {
    const item = document.createElement('article'); item.className = 'candidate-item';
    const head = document.createElement('div'); head.className = 'candidate-head';
    const school = document.createElement('div'); school.className = 'candidate-school'; school.textContent = record.school;
    const major = document.createElement('div'); major.className = 'candidate-major'; major.textContent = record.major;
    const location = document.createElement('div'); location.className = 'candidate-location'; location.textContent = record.displayLocation;
    head.append(school, major, location); item.append(head);
    const ref = document.createElement('div'); ref.className = 'candidate-reference';
    const main = document.createElement('span'); main.className = 'reference-main'; main.textContent = `2026参考 · ${record.score2026}分 · ${record.rank2026.toLocaleString('zh-CN')}位`;
    ref.append(main); item.append(ref);
    document.querySelector('#conversationStream').append(item);
  }, ADD_RECORD);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const device of DEVICES) {
    const context = await browser.newContext({ viewport: device.viewport, isMobile: Boolean(device.isMobile), hasTouch: Boolean(device.hasTouch), locale: 'zh-CN' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await installLocalRoutes(page);
    await seed(page);
    const response = await page.goto(`${BASE}/aiplus/?selection-browser=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert(response?.ok(), `${device.name}: AIPLuS page failed`);
    await page.waitForFunction(() => document.body.dataset.aiSelectionWorkbench === 'aiplus-selection-workbench-v0.05' && document.querySelector('#selectionWorkbench'));
    await openDecision(page, device);

    const panelText = await page.locator('#selectionWorkbench').innerText();
    assert(panelText.includes('我的自选'), `${device.name}: selection workbench title missing`);
    assert(panelText.includes('3 个学校×专业'), `${device.name}: canonical pool count missing`);
    assert(panelText.includes('顺序诊断'), `${device.name}: order diagnosis missing`);
    assert(panelText.includes('家庭成本'), `${device.name}: cost diagnosis missing`);
    assert(panelText.includes('就业/升学路径证据'), `${device.name}: path-evidence diagnosis missing`);
    assert(panelText.includes('不是就业率排名'), `${device.name}: employment evidence boundary missing`);

    await appendCandidateCard(page);
    const add = page.locator('.candidate-item .selection-add-button');
    await add.waitFor({ state: 'visible' });
    assert((await add.textContent()).includes('加入自选'), `${device.name}: add-selection action missing`);
    await add.click();
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('lnRank.selectionPool.lnPhysics.2026.v3951');
      const parsed = JSON.parse(raw || '[]');
      const items = Array.isArray(parsed) ? parsed : parsed.items || [];
      return items.length === 4 && items.some(item => item.school === '丁大学' && item.major === '测控技术与仪器');
    });
    assert((await add.textContent()).includes('已自选'), `${device.name}: add action did not settle to selected state`);

    const select = page.locator('.selection-sorter select');
    await select.selectOption('cost');
    const previewText = await page.locator('.selection-sort-preview').innerText();
    assert(previewText.indexOf('乙大学') >= 0 && previewText.indexOf('甲大学') >= 0, `${device.name}: cost-order preview incomplete`);
    await page.evaluate(() => { window.confirm = () => true; });
    await page.locator('.selection-sort-apply').click();
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('lnRank.selectionPool.lnPhysics.2026.v3951');
      const parsed = JSON.parse(raw || '[]');
      const items = Array.isArray(parsed) ? parsed : parsed.items || [];
      return items.length === 4 && items[0]?.school !== '甲大学';
    });

    const geometry = await page.evaluate(() => ({ inner: innerWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, panel: (() => { const r = document.querySelector('#selectionWorkbench')?.getBoundingClientRect(); return r ? { left: r.left, right: r.right } : null; })() }));
    assert(geometry.doc <= geometry.inner + 2 && geometry.body <= geometry.inner + 2, `${device.name}: horizontal overflow ${JSON.stringify(geometry)}`);
    assert(geometry.panel && geometry.panel.right <= geometry.inner + 2, `${device.name}: workbench overflow ${JSON.stringify(geometry)}`);
    assert(errors.length === 0, `${device.name}: page errors ${errors.join(' | ')}`);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`AIPLuS selection workbench browser v0.05 (${LIVE ? 'live' : 'local'}): PASS`);
