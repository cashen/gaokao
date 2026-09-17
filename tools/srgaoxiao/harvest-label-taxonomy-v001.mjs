#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const DEFAULTS = Object.freeze({
  schoolsUrl: 'https://eo.srgaoxiao.com/schools',
  specialtiesUrl: 'https://eo.srgaoxiao.com/specialties',
  out: 'tmp/srgaoxiao-label-harvest-v001.json',
  maxLabels: 200,
  maxPagesPerLabel: 400,
  timeoutMs: 30000
});

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const token = process.argv[i];
  if (!token.startsWith('--')) continue;
  const [key, inline] = token.slice(2).split('=', 2);
  args.set(key, inline ?? process.argv[++i]);
}
const opt = key => args.get(key) ?? DEFAULTS[key];

function cleanText(value) {
  return String(value ?? '').replace(/\\s+/g, ' ').trim();
}

function normalizeLabel(value) {
  return cleanText(value).replace(/[\u00a0|｜:：、,，。；;（）()\[\]【】]/g, '');
}

function isPlausibleLabel(text) {
  const s = normalizeLabel(text);
  if (!s || s.length > 12) return false;
  if (/搜索|筛选|全部|登录|注册|排行榜|投稿|更多|上一页|下一页|首页|尾页|关于我们|用户协议|联系我们|学校|专业|城市|热度排行|选择一级分类/.test(s)) return false;
  return /[\u3400-\u9fffA-Za-z0-9]/.test(s);
}

async function mkdirp(file) {
  await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
}

async function snapshotRaw(page, file) {
  const html = await page.content();
  const text = await page.locator('body').innerText().catch(() => '');
  await fs.writeFile(file, JSON.stringify({ url: page.url(), html, text }, null, 2));
}

async function discoverPillCandidates(page) {
  const rows = await page.evaluate(() => {
    const score = el => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length > 12 || rect.width < 24 || rect.height < 20) return null;
      if (cs.display === 'none' || cs.visibility === 'hidden') return null;
      const radius = parseFloat(cs.borderRadius || '0');
      const looksPill = radius >= Math.min(rect.height / 2, 16) && rect.height <= 60;
      if (!looksPill) return null;
      let clickable = el.closest('button,a,[role="button"]') || el;
      const clickRect = clickable.getBoundingClientRect();
      if (!clickRect.width || !clickRect.height) return null;
      return { text: txt, tag: clickable.tagName, cls: clickable.className || '', x: clickRect.x, y: clickRect.y, w: clickRect.width, h: clickRect.height };
    };
    const nodes = [...document.querySelectorAll('button,a,[role="button"],span,div')].map(score).filter(Boolean);
    const buckets = new Map();
    for (const row of nodes) {
      const key = `${Math.round(row.y / 10)}:${Math.round(row.h / 4)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(row);
    }
    return [...buckets.values()]
      .filter(bucket => bucket.length >= 8)
      .sort((a, b) => b.length - a.length)
      .slice(0, 4)
      .flat()
      .filter((row, i, arr) => arr.findIndex(x => x.text === row.text) === i);
  });
  return rows.filter(row => isPlausibleLabel(row.text));
}

async function getResultLinks(page, kind) {
  const hrefPattern = kind === 'schools' ? /(school|college|university)/i : /(special|major)/i;
  return await page.evaluate(patternSource => {
    const re = new RegExp(patternSource, 'i');
    const out = [];
    const seen = new Set();
    for (const a of document.querySelectorAll('a[href]')) {
      const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
      const href = a.href || '';
      if (!text || text.length > 40 || !re.test(href) || /\/schools\/?$|\/specialties\/?$/i.test(href)) continue;
      const key = `${text}||${href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ text, href });
    }
    return out;
  }, hrefPattern.source);
}

async function findNext(page) {
  const candidates = page.getByRole('button', { name: /下一页|后页|›|>/ }).or(page.getByRole('link', { name: /下一页|后页|›|>/ }));
  const count = await candidates.count().catch(() => 0);
  for (let i = 0; i < count; i += 1) {
    const node = candidates.nth(i);
    const disabled = await node.isDisabled().catch(() => false);
    const aria = await node.getAttribute('aria-disabled').catch(() => null);
    const cls = await node.getAttribute('class').catch(() => '');
    if (!disabled && aria !== 'true' && !/disabled/i.test(cls || '')) return node;
  }
  return null;
}

async function waitForResultChange(page, previousSignature) {
  try {
    await page.waitForFunction(sig => document.body.innerText.includes(sig) === false, previousSignature.slice(0, 80), { timeout: 4000 });
  } catch {}
  await page.waitForTimeout(300);
}

async function scrapeCurrentResults(page, kind, records) {
  const links = await getResultLinks(page, kind);
  for (const link of links) {
    const key = `${link.text}||${link.href}`;
    records.set(key, { name: link.text, href: link.href });
  }
  return links.length;
}

async function scrapeLabel(page, kind, label, maxPages) {
  const records = new Map();
  let pages = 0;
  for (let i = 0; i < maxPages; i += 1) {
    pages += 1;
    await scrapeCurrentResults(page, kind, records);
    const next = await findNext(page);
    if (!next) break;
    const before = (await getResultLinks(page, kind)).map(x => x.href).join('|');
    await next.click().catch(() => null);
    await waitForResultChange(page, before);
  }
  return { label, pages, records: [...records.values()] };
}

async function selectLabel(page, label, initialUrl) {
  const locator = page.getByText(label, { exact: true }).first();
  if (!(await locator.count())) return false;
  const before = page.url();
  const activeBefore = await locator.getAttribute('aria-pressed').catch(() => null);
  await locator.scrollIntoViewIfNeeded().catch(() => null);
  await locator.click({ timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(500);
  const after = page.url();
  const activeAfter = await locator.getAttribute('aria-pressed').catch(() => null);
  const selectedChip = await page.getByText(label, { exact: true }).count().catch(() => 0);
  const changed = after !== before || activeAfter !== activeBefore || selectedChip > 1;
  if (!changed) {
    await page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: opt('timeoutMs') }).catch(() => null);
    await page.waitForTimeout(700);
  }
  return changed;
}

async function harvestPage(browser, kind, url, rawDir) {
  const page = await browser.newPage();
  page.setDefaultTimeout(opt('timeoutMs'));
  const network = [];
  page.on('response', async response => {
    const req = response.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return;
    const rUrl = response.url();
    if (!/^https:\/\/[^/]*srgaoxiao\.com\//i.test(rUrl)) return;
    const ct = response.headers()['content-type'] || '';
    if (!/json|javascript|text/i.test(ct)) return;
    network.push({ url: rUrl, status: response.status(), contentType: ct });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opt('timeoutMs') });
  await page.waitForTimeout(1200);
  await mkdirp(path.join(rawDir, `${kind}-initial.json`));
  await snapshotRaw(page, path.join(rawDir, `${kind}-initial.json`));

  const candidates = await discoverPillCandidates(page);
  const labels = [...new Map(candidates.map(x => [x.text, x])).values()].slice(0, Number(opt('maxLabels')));
  const output = [];

  for (const row of labels) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opt('timeoutMs') }).catch(() => null);
    await page.waitForTimeout(700);
    const selected = await selectLabel(page, row.text, url);
    if (!selected) continue;
    const result = await scrapeLabel(page, kind, row.text, Number(opt('maxPagesPerLabel')));
    output.push({
      label: row.text,
      control: row,
      sourceUrl: page.url(),
      pages: result.pages,
      count: result.records.length,
      records: result.records
    });
  }

  await fs.writeFile(path.join(rawDir, `${kind}-network.json`), JSON.stringify(network, null, 2));
  await page.close();
  return { url, labels: output, discoveredCandidates: candidates, network };
}

async function main() {
  const out = opt('out');
  const rawDir = path.join(path.dirname(out), 'raw');
  await mkdirp(out);
  const browser = await chromium.launch({ headless: true });
  const startedAt = new Date().toISOString();
  try {
    const schools = await harvestPage(browser, 'schools', opt('schoolsUrl'), rawDir);
    const specialties = await harvestPage(browser, 'specialties', opt('specialtiesUrl'), rawDir);
    const labels = new Map();
    for (const surface of [schools, specialties]) {
      for (const item of surface.labels) {
        const entry = labels.get(item.label) || { label: item.label, surfaces: {}, schoolMatches: [], majorMatches: [] };
        const key = surface === schools ? 'schools' : 'specialties';
        entry.surfaces[key] = { count: item.count, pages: item.pages, sourceUrl: item.sourceUrl };
        if (surface === schools) entry.schoolMatches = item.records;
        else entry.majorMatches = item.records;
        labels.set(item.label, entry);
      }
    }
    const payload = {
      schemaVersion: 'srgaoxiao-label-harvest-v001',
      source: {
        host: 'eo.srgaoxiao.com',
        schoolsUrl: opt('schoolsUrl'),
        specialtiesUrl: opt('specialtiesUrl'),
        harvestedAt: new Date().toISOString(),
        startedAt,
        note: 'Raw/source-derived staging only. No label semantics or canonical school/major matching is inferred here.'
      },
      summary: {
        discoveredSchoolLabels: schools.labels.length,
        discoveredMajorLabels: specialties.labels.length,
        uniqueLabels: labels.size,
        totalSchoolLabelRelations: schools.labels.reduce((n, x) => n + x.count, 0),
        totalMajorLabelRelations: specialties.labels.reduce((n, x) => n + x.count, 0)
      },
      labels: [...labels.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
      surfaces: { schools, specialties }
    };
    await fs.writeFile(out, JSON.stringify(payload, null, 2));
    console.log(JSON.stringify(payload.summary, null, 2));
  } finally {
    await browser.close();
  }
}

await main();
