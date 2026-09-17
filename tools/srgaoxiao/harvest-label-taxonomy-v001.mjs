#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const DEFAULTS = Object.freeze({
  schoolsUrl: 'https://eo.srgaoxiao.com/schools',
  specialtiesUrl: 'https://eo.srgaoxiao.com/specialties',
  out: 'tmp/srgaoxiao-label-harvest-v001.json',
  maxLabels: 200,
  maxPagesPerLabel: 400,
  schoolPageSize: 100,
  majorPageSize: 100,
  timeoutMs: 20000
});

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const token = process.argv[i];
  if (!token.startsWith('--')) continue;
  const [key, inline] = token.slice(2).split('=', 2);
  args.set(key, inline ?? process.argv[++i]);
}
const opt = key => args.get(key) ?? DEFAULTS[key];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const norm = value => clean(value).replace(/[\u00a0|｜:：、,，。；;（）()\[\]【】]/g, '');

function plausibleLabel(value) {
  const s = norm(value);
  if (!s || s.length > 12) return false;
  if (/搜索|筛选|全部|登录|注册|排行榜|投稿|更多|上一页|下一页|首页|尾页|关于我们|用户协议|联系我们|学校|专业|城市|热度排行|选择一级分类/.test(s)) return false;
  return /[\u3400-\u9fffA-Za-z0-9]/.test(s);
}

async function ensureDir(file) {
  await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
}

function findArray(value, predicate, depth = 0) {
  if (depth > 8 || value == null) return null;
  if (Array.isArray(value)) {
    if (value.length && value.every(item => predicate(item))) return value;
    for (const item of value) {
      const found = findArray(item, predicate, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) {
      const found = findArray(item, predicate, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function rowName(row) {
  if (!row || typeof row !== 'object') return '';
  return clean(row.name ?? row.schoolName ?? row.specialtyName ?? row.majorName ?? row.title ?? row.school ?? row.major);
}

function rowId(row) {
  if (!row || typeof row !== 'object') return '';
  return clean(row.id ?? row.schoolId ?? row.specialtyId ?? row.majorId ?? row.code);
}

function rowHref(row) {
  if (!row || typeof row !== 'object') return '';
  return clean(row.href ?? row.url ?? row.path ?? row.detailUrl ?? row.detailPath);
}

function normalizeRelation(row) {
  const name = rowName(row);
  const sourceId = rowId(row);
  const href = rowHref(row);
  if (!name && !sourceId) return null;
  return Object.freeze({ name, sourceId, href });
}

async function apiJson(page, requestPath, timeoutMs = Number(opt('timeoutMs'))) {
  const absoluteUrl = new URL(requestPath, page.url()).href;
  try {
    const response = await page.request.get(absoluteUrl, { timeout: timeoutMs, failOnStatusCode: false });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    return { ok: response.ok(), status: response.status(), url:response.url(), body, text:text.slice(0, 20000) };
  } catch (error) {
    return { ok:false, status:0, url:absoluteUrl, body:null, text:String(error?.message || error) };
  }
}

function extractRows(body) {
  const array = findArray(body, item => item && typeof item === 'object' && rowName(item));
  return Array.isArray(array) ? array : [];
}

function extractTotal(body) {
  const hits = [];
  const walk = value => {
    if (value == null || hits.length || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (/^(total|totalCount|count)$/i.test(key) && Number.isFinite(Number(child))) hits.push(Number(child));
      else walk(child);
      if (hits.length) return;
    }
  };
  walk(body);
  return hits.length ? hits[0] : null;
}

async function discoverLabels(page) {
  const api = await apiJson(page, '/api/schools/filters/tags');
  const apiRows = Array.isArray(api.body) ? api.body : extractRows(api.body);
  const apiLabels = apiRows.map(rowName).filter(plausibleLabel);
  const domLabels = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button,a,[role="button"],span')) {
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 12 || rect.width < 24 || rect.height < 20 || rect.height > 60) continue;
      const radius = parseFloat(cs.borderRadius || '0');
      if (radius < Math.min(rect.height / 2, 16)) continue;
      out.push(text);
    }
    return [...new Set(out)];
  });
  return [...new Set([...apiLabels, ...domLabels.filter(plausibleLabel)])].slice(0, Number(opt('maxLabels')));
}

async function collectPaged(page, basePath, label, pageSize) {
  const relations = new Map();
  const attempted = [];
  let total = null;
  let lastFirstId = '';
  for (let pageNo = 1; pageNo <= Number(opt('maxPagesPerLabel')); pageNo += 1) {
    const url = `${basePath}?tag=${encodeURIComponent(label)}&page=${pageNo}&pageSize=${pageSize}`;
    const result = await apiJson(page, url);
    attempted.push({ url:result.url, status:result.status });
    if (!result.ok) break;
    const rows = extractRows(result.body);
    total ??= extractTotal(result.body);
    let pageAdds = 0;
    for (const row of rows) {
      const relation = normalizeRelation(row);
      if (!relation) continue;
      const key = `${relation.sourceId || ''}||${relation.name}||${relation.href}`;
      if (!relations.has(key)) { relations.set(key, relation); pageAdds += 1; }
    }
    const firstId = rows[0] ? rowId(rows[0]) : '';
    if (!rows.length || pageAdds === 0 || firstId === lastFirstId || (total != null && relations.size >= total) || (total == null && rows.length < pageSize)) break;
    lastFirstId = firstId;
    await sleep(50);
  }
  return { records:[...relations.values()], attempted, total };
}

async function collectMajorBySourceEndpoint(page, label, pageSize) {
  const url = `/api/specialties?sort=popularity&tag=${encodeURIComponent(label)}&page=1&pageSize=${pageSize}`;
  const result = await apiJson(page, url);
  if (!result.ok) return { attempted:[{ url:result.url, status:result.status }], records:[], total:null };
  return { attempted:[{ url:result.url, status:result.status }], records:extractRows(result.body).map(normalizeRelation).filter(Boolean), total:extractTotal(result.body) };
}

async function snapshot(page, file) {
  await ensureDir(file);
  await fs.writeFile(file, JSON.stringify({ url:page.url(), html:await page.content(), text:await page.locator('body').innerText().catch(()=> '') }, null, 2));
}

async function harvest() {
  const out = opt('out');
  const rawDir = path.join(path.dirname(out), 'raw');
  await ensureDir(out);
  const browser = await chromium.launch({ headless:true });
  const startedAt = new Date().toISOString();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(Number(opt('timeoutMs')));

    await page.goto(opt('schoolsUrl'), { waitUntil:'domcontentloaded', timeout:Number(opt('timeoutMs')) });
    await sleep(900);
    await snapshot(page, path.join(rawDir, 'schools-initial.json'));
    const labels = await discoverLabels(page);
    const schoolSurface = [];
    const schoolNetwork = [];
    for (const label of labels) {
      const result = await collectPaged(page, '/api/schools', label, Number(opt('schoolPageSize')));
      schoolNetwork.push(...result.attempted);
      schoolSurface.push({ label, sourceUrl:page.url(), pages:result.attempted.length, total:result.total, count:result.records.length, records:result.records });
    }

    await page.goto(opt('specialtiesUrl'), { waitUntil:'domcontentloaded', timeout:Number(opt('timeoutMs')) });
    await sleep(900);
    await snapshot(page, path.join(rawDir, 'specialties-initial.json'));
    const specialtyDiscovery = labels;
    const specialtySurface = [];
    const specialtyNetwork = [];
    const genericMajorApi = await apiJson(page, '/api/specialties?sort=popularity&page=1&pageSize=100');
    await fs.writeFile(path.join(rawDir, 'specialties-first-page.json'), JSON.stringify(genericMajorApi, null, 2));
    for (const label of specialtyDiscovery) {
      const hit = await collectMajorBySourceEndpoint(page, label, Number(opt('majorPageSize')));
      specialtyNetwork.push(...hit.attempted);
      specialtySurface.push({ label, sourceUrl:page.url(), endpoint:'/api/specialties', pages:1, count:hit.records.length, total:hit.total, records:hit.records });
    }
    await fs.writeFile(path.join(rawDir, 'schools-network.json'), JSON.stringify(schoolNetwork, null, 2));
    await fs.writeFile(path.join(rawDir, 'specialties-network.json'), JSON.stringify(specialtyNetwork, null, 2));

    const byLabel = new Map();
    for (const row of schoolSurface) byLabel.set(row.label, { label:row.label, schoolMatches:row.records, majorMatches:[], schoolSource:{ count:row.count,total:row.total,pages:row.pages,sourceUrl:row.sourceUrl }, majorSources:[] });
    for (const row of specialtySurface) {
      const entry = byLabel.get(row.label) || { label:row.label, schoolMatches:[], majorMatches:[], schoolSource:{}, majorSources:[] };
      entry.majorMatches = [...new Map([...entry.majorMatches,...row.records].map(x=>[`${x.sourceId||''}||${x.name}||${x.href}`,x])).values()];
      entry.majorSources.push({ endpoint:row.endpoint,count:row.count,total:row.total,pages:row.pages,sourceUrl:row.sourceUrl });
      byLabel.set(row.label, entry);
    }

    const payload = {
      schemaVersion:'srgaoxiao-label-harvest-v001',
      source:{ host:'eo.srgaoxiao.com', schoolsUrl:opt('schoolsUrl'), specialtiesUrl:opt('specialtiesUrl'), harvestedAt:new Date().toISOString(), startedAt,
        note:'Source-derived staging only. No semantic classification or canonical school/major matching is inferred.' },
      summary:{ discoveredSchoolLabels:labels.length, discoveredMajorLabels:specialtyDiscovery.length, uniqueLabels:byLabel.size,
        totalSchoolLabelRelations:schoolSurface.reduce((n,x)=>n+x.count,0), totalMajorLabelRelations:specialtySurface.reduce((n,x)=>n+x.count,0),
        schoolLabelsWithRelations:schoolSurface.filter(x=>x.count>0).length, majorLabelsWithRelations:specialtySurface.filter(x=>x.count>0).length },
      labels:[...byLabel.values()].sort((a,b)=>a.label.localeCompare(b.label,'zh-CN')),
      surfaces:{ schools:{url:opt('schoolsUrl'),labels:schoolSurface,discoveredLabels:labels}, specialties:{url:opt('specialtiesUrl'),labels:specialtySurface,discoveredLabels:specialtyDiscovery} }
    };
    await fs.writeFile(out, JSON.stringify(payload,null,2));
    console.log(JSON.stringify(payload.summary,null,2));
  } finally {
    await browser.close();
  }
}

await harvest();
