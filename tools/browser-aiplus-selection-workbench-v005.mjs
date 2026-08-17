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
const AMBIGUOUS_RECORDS = [
  { id: 'ambiguous-a', dataYear: 2026, primaryYear: 2026, school: '戊大学', major: '自动化', score2026: 570, rank2026: 24000, bandKey: 'steady', isPublicSchool: true },
  { id: 'ambiguous-b', dataYear: 2026, primaryYear: 2026, school: '戊大学', major: '自动化', score2026: 570, rank2026: 24000, bandKey: 'steady', isPublicSchool: true }
];
const HISTORY_ONLY = { id: 'history-only', school: '己大学', major: '电气工程及其自动化', score: 568, rank: 24800, year: 2025 };

async function seed(page) {
  const seedUrl = `${BASE}/__aiplus-selection-seed__`;
  await page.route(seedUrl, route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>selection seed</title>' }));
  await page.goto(seedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(async ({ pool, addRecord, ambiguousRecords, historyOnly }) => {
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
    ws.lastResult = {
      candidates: { records: [addRecord, ...ambiguousRecords], counts: { upper: 0, near: 0, steady: 3, total: 3 } },
      history: { records: [historyOnly] },
      decisionStage: 'feasible_set'
    };
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
  }, { pool: SEED_POOL, addRecord: ADD_RECORD, ambiguousRecords: AMBIGUOUS_RECORDS, historyOnly: HISTORY_ONLY });
  await page.unroute(seedUrl);
}

async function openDecision(page, device) {
  if (device.name !== 'pc' && !await page.evaluate(() => document.body.classList.contains('history-open'))) {
    await page.locator('#historyToggle').click();
    await page.waitForFunction(() => document.body.classList.contains('history-open'));
  }
  await page.locator('#selectionWorkbench').waitFor({ state: 'visible' });
}

async function closeDecisionForMain(page, device) {
  if (device.name === 'pc') return;
  await page.locator('#historyClose').click();
  await page.waitForFunction(() => !document.body.classList.contains('history-open'));
}

async function appendCandidateCard(page, record, marker) {
  await page.evaluate(({ record, marker }) => {
    const turn = document.createElement('article');
    turn.className = 'turn';
    turn.dataset.selectionSyntheticTurn = marker;
    const assistant = document.createElement('div');
    assistant.className = 'assistant-turn answer-surface';
    const card = document.createElement('section');
    card.className = 'result-card';
    const list = document.createElement('div');
    list.className = 'candidate-list';
    const item = document.createElement('article');
    item.className = 'candidate-item';
    item.dataset.selectionTest = marker;
    const head = document.createElement('div'); head.className = 'candidate-head';
    const school = document.createElement('div'); school.className = 'candidate-school'; school.textContent = record.school;
    const major = document.createElement('div'); major.className = 'candidate-major'; major.textContent = record.major;
    const location = document.createElement('div'); location.className = 'candidate-location'; location.textContent = record.displayLocation || '';
    head.append(school, major, location); item.append(head);
    const ref = document.createElement('div'); ref.className = 'candidate-reference';
    const main = document.createElement('span'); main.className = 'reference-main';
    const score = record.score2026 ?? record.score;
    const recordRank = record.rank2026 ?? record.rank;
    main.textContent = `2026参考 · ${score}分 · ${Number(recordRank).toLocaleString('zh-CN')}位`;
    ref.append(main); item.append(ref);
    list.append(item); card.append(list); assistant.append(card); turn.append(assistant);
    document.querySelector('#conversationStream').append(turn);
  }, { record, marker });
}

async function assertNoSelectionAction(page, marker, message) {
  const card = page.locator(`.candidate-item[data-selection-test="${marker}"]`);
  await card.waitFor({ state: 'visible' });
  await page.waitForTimeout(100);
  assert(await card.locator('.selection-add-button').count() === 0, message);
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

    await appendCandidateCard(page, { ...ADD_RECORD, score2026: 574, rank2026: 22500 }, 'mismatch');
    await assertNoSelectionAction(page, 'mismatch', `${device.name}: mismatched score/rank must not fall back to another current record`);

    await appendCandidateCard(page, HISTORY_ONLY, 'history-only');
    await assertNoSelectionAction(page, 'history-only', `${device.name}: historical generic score record must not be promoted into 2026 selection`);

    await appendCandidateCard(page, AMBIGUOUS_RECORDS[0], 'ambiguous');
    await assertNoSelectionAction(page, 'ambiguous', `${device.name}: ambiguous duplicate current records must fail closed`);

    await closeDecisionForMain(page, device);
    await appendCandidateCard(page, ADD_RECORD, 'valid');
    const add = page.locator('.candidate-item[data-selection-test="valid"] .selection-add-button');
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

    const observerChurn = await page.evaluate(async () => {
      const button = document.querySelector('.candidate-item[data-selection-test="valid"] .selection-add-button');
      if (!button) return -1;
      let childListMutations = 0;
      const testObserver = new MutationObserver(records => {
        childListMutations += records.filter(record => record.type === 'childList').length;
      });
      testObserver.observe(button, { childList: true, subtree: true });
      const unrelated = document.createElement('div');
      unrelated.className = 'selection-observer-unrelated';
      unrelated.textContent = 'unrelated conversation mutation';
      document.querySelector('#conversationStream').append(unrelated);
      await new Promise(resolve => setTimeout(resolve, 250));
      testObserver.disconnect();
      unrelated.remove();
      return childListMutations;
    });
    assert(observerChurn === 0, `${device.name}: unrelated conversation mutations caused selection-button rewrite churn (${observerChurn})`);

    await openDecision(page, device);
    const sorter = page.locator('.selection-sorter');
    await sorter.locator('summary').click();
    const select = sorter.locator('select');
    await select.waitFor({ state: 'visible' });
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
