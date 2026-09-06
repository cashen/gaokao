import assert from 'node:assert/strict';
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
const base = process.env.UNIFIED_CONTEXT_BASE || 'http://127.0.0.1:8766';
const returnTo = '/ln-rank/index.html?mode=school-all&school=%E4%B8%9C%E5%8C%97%E5%A4%A7%E5%AD%A6#schoolAllResultsPanel';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}${returnTo}`, { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async returnTarget => {
    const decision = await import('/shared/decision-context/decision-context.v001.js');
    const snapshots = await import('/shared/decision-context/return-snapshot.v001.js');
    const schools = await import('/shared/resources/schools/school-resource-center.js');
    const dc = decision.createDecisionContext({
      sourceSurface: 'ln-rank', sourceAction: 'view_student_voice', returnTo: returnTarget,
      resultMode: 'school-all', returnAnchor: 'schoolAllResultsPanel', province: '辽宁', score: 580,
      school: '东北大学', schoolCode: 'neu-main'
    });
    const href = schools.buildTongxueSchoolHref({ school: '东北大学', entityId: 'neu-main', returnTo: returnTarget, resultMode: 'school-all', returnAnchor: 'schoolAllResultsPanel', decisionContext: dc });
    const target = document.createElement('div');
    target.id = 'schoolAllResultsPanel';
    target.textContent = '结果位置';
    document.body.append(target);
    const saved = snapshots.captureCurrentReturnSnapshot({ contextId: dc.contextId, returnTo: returnTarget, sourceSurface: 'ln-rank', resultMode: dc.resultMode, anchorId: dc.returnAnchor, focusId: dc.returnAnchor, scrollY: 640 });
    const found = snapshots.readReturnSnapshotForLocation(location);
    let restored = false;
    Element.prototype.scrollIntoView = () => { restored = true; };
    const didRestore = snapshots.restoreReturnSnapshot(found, { documentLike: document, windowLike: window });
    const offlineFound = snapshots.readReturnSnapshotForLocation({ href: `${location.origin}${returnTarget}` });
    return { href, saved: saved?.contextId === dc.contextId, found: found?.contextId === dc.contextId, didRestore, restored, offlineFound: offlineFound?.contextId === dc.contextId };
  }, returnTo);
  assert.equal(result.saved, true);
  assert.equal(result.found, true);
  assert.equal(result.didRestore, true);
  assert.equal(result.restored, true);
  assert.equal(result.offlineFound, true);
  const target = new URL(result.href, base);
  assert.equal(target.pathname, '/tongxue/');
  assert.equal(target.searchParams.get('entity'), 'neu-main');
  assert.equal(target.searchParams.get('resultMode'), 'school-all');
  assert.ok(target.searchParams.get('dc'));
  await page.route('**/*', route => route.abort());
  const stillAvailableOffline = await page.evaluate(async () => {
    const { readReturnSnapshotForLocation } = await import('/shared/decision-context/return-snapshot.v001.js');
    return Boolean(readReturnSnapshotForLocation(location));
  });
  assert.equal(stillAvailableOffline, true);
  console.log(JSON.stringify({ ok: true, version: 'unified-cross-module-context-handoff-browser-v001', offlineSnapshotReadable: true, target: `${target.pathname}?entity=${target.searchParams.get('entity')}` }));
  await context.close();
} finally {
  await browser.close();
}
