import { cp, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const schools = splitEnv('TEST_SCHOOLS', ['吉林大学', '大连理工大学', '辽宁大学', '辽宁科技大学']);
const requiredSchools = new Set(splitEnv('REQUIRED_SUCCESS_SCHOOLS', ['吉林大学', '大连理工大学']));
const sourceHosts = ['https://srgaoxiao.com', 'https://eo.srgaoxiao.com'];
const nativeFetch = globalThis.fetch.bind(globalThis);
const artifactDir = '/tmp/tongxue-live-artifact';
const assetsDir = path.join(artifactDir, 'assets');
await mkdir(assetsDir, { recursive: true });

await cp('functions/api/tongxue-summary.js', '/tmp/tongxue-summary.mjs');
const { onRequest } = await import(`${pathToFileURL('/tmp/tongxue-summary.mjs').href}?t=${Date.now()}`);

const outbound = [];
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const started = Date.now();
  try {
    const response = await nativeFetch(input, init);
    outbound.push({ url, status: response.status, contentType: response.headers.get('content-type') || '', elapsedMs: Date.now() - started });
    return response;
  } catch (error) {
    outbound.push({ url, error: error instanceof Error ? error.message : String(error), elapsedMs: Date.now() - started });
    throw error;
  }
};

const directProbe = [];
const discoveredAssets = new Set();
for (const school of schools) {
  for (const host of sourceHosts) {
    const url = `${host}/school/${encodeURIComponent(school)}`;
    const probe = await probeUrl(url);
    const assetUrls = extractHtmlAssetUrls(probe.text, host);
    assetUrls.forEach((asset) => discoveredAssets.add(asset));
    directProbe.push({
      school,
      host,
      status: probe.status,
      finalUrl: probe.finalUrl,
      contentType: probe.contentType,
      length: probe.text.length,
      hasSchool: probe.text.includes(school),
      hasSummaryAnchor: /同学们普遍认为|AI\s*摘要|aiSummary|ai_summary/.test(probe.text),
      assetUrls,
      preview: compact(probe.text.slice(0, 180))
    });
  }
}

const assetReports = [];
const queue = [...discoveredAssets];
const fetchedAssets = new Set();
while (queue.length && fetchedAssets.size < 80) {
  const assetUrl = queue.shift();
  if (!assetUrl || fetchedAssets.has(assetUrl)) continue;
  fetchedAssets.add(assetUrl);

  try {
    const response = await nativeFetch(assetUrl, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0', accept: '*/*' } });
    const body = (await response.text()).slice(0, 12_000_000);
    const parsed = new URL(assetUrl);
    const safeName = parsed.hostname + '-' + path.basename(parsed.pathname);
    await writeFile(path.join(assetsDir, safeName), body);

    const lazyAssets = extractLazyAssetUrls(body, assetUrl);
    for (const child of lazyAssets) {
      if (!fetchedAssets.has(child)) queue.push(child);
    }

    assetReports.push({
      assetUrl,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      length: body.length,
      lazyAssets,
      apiCandidates: discoverApiCandidates(body),
      keywordContexts: discoverContexts(body)
    });
  } catch (error) {
    assetReports.push({ assetUrl, error: error instanceof Error ? error.message : String(error) });
  }
}

const parserResults = [];
for (const school of schools) {
  outbound.length = 0;
  const request = new Request(`https://verification.invalid/api/tongxue-summary?school=${encodeURIComponent(school)}`);
  let response;
  let payload;
  try {
    response = await onRequest({ request, env: {} });
    const raw = await response.text();
    try { payload = JSON.parse(raw); }
    catch { payload = { raw: compact(raw).slice(0, 500) }; }
  } catch (error) {
    payload = { thrown: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }

  parserResults.push({
    school,
    status: response?.status ?? null,
    ok: Boolean(payload?.ok),
    version: payload?.version || null,
    error: payload?.error || null,
    message: payload?.message || null,
    summaryLength: typeof payload?.summary === 'string' ? payload.summary.length : 0,
    summaryPreview: typeof payload?.summary === 'string' ? compact(payload.summary).slice(0, 240) : '',
    diagnostics: payload?.diagnostics || null,
    thrown: payload?.thrown || null,
    outbound: [...outbound]
  });
}

const failedRequired = parserResults.filter((item) => requiredSchools.has(item.school) && !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  requiredSchools: [...requiredSchools],
  failedRequired: failedRequired.map((item) => item.school),
  directProbe,
  assetReports,
  parserResults
};
await writeFile(path.join(artifactDir, 'tongxue-live-results.json'), JSON.stringify(report, null, 2));

const importantAssets = assetReports.filter((item) => /SchoolDetail|SchoolList|index-/.test(item.assetUrl || ''));
console.log(`IMPORTANT_ASSETS ${JSON.stringify(importantAssets.map((item) => ({ url: item.assetUrl, status: item.status, length: item.length, apiCandidates: item.apiCandidates?.slice(0, 80), contexts: item.keywordContexts?.slice(0, 30) })))}`);
console.log(`SUMMARY ${JSON.stringify({ required: [...requiredSchools], failedRequired: failedRequired.map((item) => item.school) })}`);
if (failedRequired.length) process.exitCode = 1;

function splitEnv(name, fallback) {
  const value = String(process.env[name] || '').trim();
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : fallback;
}

async function probeUrl(url) {
  try {
    const response = await nativeFetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9'
      }
    });
    return { status: response.status, finalUrl: response.url, contentType: response.headers.get('content-type') || '', text: (await response.text()).slice(0, 3_000_000) };
  } catch (error) {
    return { status: 0, finalUrl: url, contentType: '', text: `FETCH_ERROR: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function extractHtmlAssetUrls(html, base) {
  const urls = new Set();
  const pattern = /<(?:script|link)[^>]+(?:src|href)=["']([^"']+\.(?:js|mjs)(?:\?[^"']*)?)["']/gi;
  let match;
  while ((match = pattern.exec(html))) {
    try { urls.add(new URL(match[1], base).href); } catch {}
  }
  return [...urls];
}

function extractLazyAssetUrls(body, assetUrl) {
  const urls = new Set();
  const assetBase = new URL('./', assetUrl);
  const patterns = [
    /import\(["']\.\/([^"']+\.js)["']\)/g,
    /["']\.\/([A-Za-z0-9_-]+\.js)["']/g,
    /["']([A-Za-z][A-Za-z0-9_-]+-[A-Za-z0-9_-]+\.js)["']/g
  ];
  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      try { urls.add(new URL(match[1], assetBase).href); } catch {}
    }
  }
  return [...urls];
}

function discoverApiCandidates(body) {
  const values = new Set();
  const patterns = [
    /https?:\\?\/\\?\/[^"'`\s)]+/g,
    /["'`]((?:\/|\\\/)(?:api|v\d|school|schools|comment|review|summary)[^"'`\s]*)["'`]/gi,
    /baseURL\s*:\s*["'`]([^"'`]+)["'`]/gi,
    /fetch\(\s*`([^`]{1,260})`/gi,
    /fetch\(\s*["']([^"']{1,260})["']/gi
  ];
  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      const raw = match[1] || match[0];
      const value = raw.replace(/\\\//g, '/').replace(/[",;)}\]]+$/g, '');
      if (value.length < 400) values.add(value);
    }
  }
  return [...values].filter((value) => /api|school|comment|review|summary|srgaoxiao/i.test(value)).slice(0, 500);
}

function discoverContexts(body) {
  const needles = ['同学们普遍认为', 'AI摘要', 'AI 摘要', 'aiSummary', 'ai_summary', 'summaryText', 'schoolDetail', 'schoolName', 'review_count', 'summary_text', 'fetch(', '/api/', '/schools/'];
  const output = [];
  for (const needle of needles) {
    let index = body.indexOf(needle);
    let count = 0;
    while (index !== -1 && count < 30) {
      output.push({ needle, context: compact(body.slice(Math.max(0, index - 400), index + needle.length + 900)) });
      index = body.indexOf(needle, index + needle.length);
      count += 1;
    }
  }
  return output;
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
