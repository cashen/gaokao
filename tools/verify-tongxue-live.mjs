import { cp } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const schools = splitEnv('TEST_SCHOOLS', ['吉林大学', '大连理工大学', '辽宁大学', '辽宁科技大学']);
const requiredSchools = new Set(splitEnv('REQUIRED_SUCCESS_SCHOOLS', ['吉林大学', '大连理工大学']));
const sourceHosts = ['https://srgaoxiao.com', 'https://eo.srgaoxiao.com'];
const nativeFetch = globalThis.fetch.bind(globalThis);

await cp('functions/api/tongxue-summary.js', '/tmp/tongxue-summary.mjs');
const { onRequest } = await import(`${pathToFileURL('/tmp/tongxue-summary.mjs').href}?t=${Date.now()}`);

const outbound = [];
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const started = Date.now();
  try {
    const response = await nativeFetch(input, init);
    outbound.push({
      url,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      elapsedMs: Date.now() - started
    });
    return response;
  } catch (error) {
    outbound.push({
      url,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - started
    });
    throw error;
  }
};

console.log('LIVE_PROBE_BEGIN');
const directProbe = [];
for (const school of schools) {
  for (const host of sourceHosts) {
    const url = `${host}/school/${encodeURIComponent(school)}`;
    const probe = await probeUrl(url);
    const row = {
      school,
      host,
      status: probe.status,
      finalUrl: probe.finalUrl,
      contentType: probe.contentType,
      length: probe.text.length,
      hasSchool: probe.text.includes(school),
      hasSummaryAnchor: /同学们普遍认为|AI\s*摘要|aiSummary|ai_summary/.test(probe.text),
      scriptUrls: extractAssetUrls(probe.text, host).slice(0, 8),
      preview: compact(probe.text.slice(0, 180))
    };
    directProbe.push(row);
    console.log(`DIRECT ${JSON.stringify(row)}`);
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

  const row = {
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
  };
  parserResults.push(row);
  console.log(`PARSER ${JSON.stringify(row)}`);
}

const failedRequired = parserResults.filter((item) => requiredSchools.has(item.school) && !item.ok);
console.log(`SUMMARY ${JSON.stringify({ required: [...requiredSchools], failedRequired: failedRequired.map((item) => item.school) })}`);
console.log('LIVE_PROBE_END');

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
    return {
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get('content-type') || '',
      text: (await response.text()).slice(0, 3_000_000)
    };
  } catch (error) {
    return {
      status: 0,
      finalUrl: url,
      contentType: '',
      text: `FETCH_ERROR: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function extractAssetUrls(html, base) {
  const urls = new Set();
  const pattern = /<(?:script|link)[^>]+(?:src|href)=["']([^"']+\.(?:js|mjs)(?:\?[^"']*)?)["']/gi;
  let match;
  while ((match = pattern.exec(html))) {
    try { urls.add(new URL(match[1], base).href); } catch {}
  }
  return [...urls];
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
