import { cp, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const schools = splitEnv('TEST_SCHOOLS', ['吉林大学', '大连理工大学', '辽宁大学', '辽宁科技大学']);
const requiredSchools = new Set(splitEnv('REQUIRED_SUCCESS_SCHOOLS', ['吉林大学', '大连理工大学']));
const sourceHosts = ['https://srgaoxiao.com', 'https://eo.srgaoxiao.com'];
const nativeFetch = globalThis.fetch.bind(globalThis);

await cp('functions/api/tongxue-summary.js', '/tmp/tongxue-summary.mjs');
const moduleUrl = `${pathToFileURL('/tmp/tongxue-summary.mjs').href}?t=${Date.now()}`;
const { onRequest } = await import(moduleUrl);

const requestLog = [];
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const started = Date.now();
  try {
    const response = await nativeFetch(input, init);
    requestLog.push({
      url,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      location: response.headers.get('location') || '',
      elapsedMs: Date.now() - started
    });
    return response;
  } catch (error) {
    requestLog.push({
      url,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - started
    });
    throw error;
  }
};

console.log('=== Direct source probes ===');
const probeBodies = new Map();
for (const school of schools) {
  for (const host of sourceHosts) {
    const url = `${host}/school/${encodeURIComponent(school)}`;
    const probe = await probeUrl(url);
    probeBodies.set(`${host}|${school}`, probe.text);
    console.log(JSON.stringify({
      school,
      host,
      status: probe.status,
      finalUrl: probe.finalUrl,
      contentType: probe.contentType,
      length: probe.text.length,
      hasSchool: probe.text.includes(school),
      hasSummaryAnchor: /同学们普遍认为|AI\s*摘要|aiSummary|ai_summary/.test(probe.text),
      preview: compact(probe.text.slice(0, 220))
    }, null, 2));
  }
}

console.log('=== Asset discovery from 吉林大学 pages ===');
for (const host of sourceHosts) {
  const html = probeBodies.get(`${host}|吉林大学`) || '';
  const assets = extractAssetUrls(html, host).slice(0, 20);
  console.log(JSON.stringify({ host, assetCount: assets.length, assets }, null, 2));
  for (const assetUrl of assets) {
    try {
      const response = await nativeFetch(assetUrl, {
        redirect: 'follow',
        headers: { 'user-agent': 'Mozilla/5.0', accept: '*/*' }
      });
      const body = (await response.text()).slice(0, 3_000_000);
      const hints = findHints(body);
      if (hints.length) {
        console.log(JSON.stringify({ assetUrl, status: response.status, length: body.length, hints }, null, 2));
      }
    } catch (error) {
      console.log(JSON.stringify({ assetUrl, error: error instanceof Error ? error.message : String(error) }));
    }
  }
}

console.log('=== Execute actual Cloudflare Function code ===');
const results = [];
for (const school of schools) {
  requestLog.length = 0;
  const request = new Request(`https://verification.invalid/api/tongxue-summary?school=${encodeURIComponent(school)}`, {
    method: 'GET',
    headers: { accept: 'application/json' }
  });

  let response;
  let payload;
  try {
    response = await onRequest({ request, env: {} });
    const raw = await response.text();
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }
  } catch (error) {
    payload = { thrown: error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ''}` : String(error) };
  }

  const result = {
    school,
    status: response?.status ?? null,
    ok: Boolean(payload?.ok),
    version: payload?.version || null,
    error: payload?.error || null,
    message: payload?.message || null,
    summaryLength: typeof payload?.summary === 'string' ? payload.summary.length : 0,
    summaryPreview: typeof payload?.summary === 'string' ? payload.summary.slice(0, 260) : '',
    diagnostics: payload?.diagnostics || null,
    thrown: payload?.thrown || null,
    outboundRequests: [...requestLog]
  };
  results.push(result);
  console.log(JSON.stringify(result, null, 2));
}

await writeFile('/tmp/tongxue-live-results.json', JSON.stringify(results, null, 2));

const failedRequired = results.filter((item) => requiredSchools.has(item.school) && !item.ok);
if (failedRequired.length) {
  console.error(`Required live schools failed: ${failedRequired.map((item) => item.school).join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Required live schools passed: ${[...requiredSchools].join(', ')}`);
}

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
    try {
      urls.add(new URL(match[1], base).href);
    } catch {}
  }
  return [...urls];
}

function findHints(body) {
  const needles = ['同学们普遍认为', 'aiSummary', 'ai_summary', 'summaryText', '/api/', 'school/'];
  const output = [];
  for (const needle of needles) {
    let index = body.indexOf(needle);
    let count = 0;
    while (index !== -1 && count < 4) {
      output.push({ needle, snippet: compact(body.slice(Math.max(0, index - 160), index + needle.length + 240)) });
      index = body.indexOf(needle, index + needle.length);
      count += 1;
    }
  }
  return output;
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
