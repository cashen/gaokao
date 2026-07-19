import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const artifactDir = '/tmp/tongxue-live-artifact';
const assetsDir = path.join(artifactDir, 'source-assets');
await mkdir(assetsDir, { recursive: true });

const hosts = ['https://eo.srgaoxiao.com', 'https://srgaoxiao.com'];
const schools = [
  { name: '辽宁大学', id: 182 },
  { name: '辽宁科技大学', id: 436 },
  { name: '吉林大学', id: 29 }
];
const pages = [];
const queue = [];
const seen = new Set();

for (const host of hosts) {
  for (const school of schools.slice(0, 1)) {
    const url = `${host}/school/${encodeURIComponent(school.name)}`;
    const response = await fetchText(url, { accept: 'text/html,*/*' });
    const assets = extractHtmlAssets(response.text, host);
    pages.push({ url, status: response.status, length: response.text.length, assets });
    for (const asset of assets) queue.push(asset);
  }
}

const assets = [];
while (queue.length && seen.size < 100) {
  const url = queue.shift();
  if (!url || seen.has(url)) continue;
  seen.add(url);
  const response = await fetchText(url, { accept: '*/*' });
  const body = response.text.slice(0, 15_000_000);
  const fileName = `${new URL(url).hostname}-${path.basename(new URL(url).pathname)}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  await writeFile(path.join(assetsDir, fileName), body);
  const lazy = extractLazyAssets(body, url);
  for (const child of lazy) if (!seen.has(child)) queue.push(child);
  const contexts = discoverContexts(body);
  const endpointFragments = discoverEndpointFragments(body);
  if (contexts.length || endpointFragments.length || /SchoolDetail/i.test(url)) {
    assets.push({ url, status: response.status, length: body.length, lazy, contexts, endpointFragments });
  }
}

const probeCandidates = buildProbeCandidates();
const probes = [];
for (const candidate of probeCandidates) {
  const response = await fetchText(candidate.url, { accept: 'application/json,text/plain,*/*', referer: `${candidate.host}/` });
  let json = null;
  try { json = JSON.parse(response.text); } catch {}
  probes.push({
    ...candidate,
    status: response.status,
    contentType: response.contentType,
    length: response.text.length,
    preview: json === null ? compact(response.text).slice(0, 1000) : JSON.stringify(json).slice(0, 2000)
  });
}

const report = { generatedAt: new Date().toISOString(), pages, assets, probes };
await writeFile(path.join(artifactDir, 'srgaoxiao-review-discovery.json'), JSON.stringify(report, null, 2));
console.log(`REVIEW_DISCOVERY ${JSON.stringify({
  pages,
  interestingAssets: assets.map((item) => ({ url: item.url, length: item.length, endpoints: item.endpointFragments.slice(0, 30), contexts: item.contexts.slice(0, 12) })),
  successfulProbes: probes.filter((item) => item.status >= 200 && item.status < 300 && item.length > 2)
})}`);

function buildProbeCandidates() {
  const patterns = [
    (host, id) => `${host}/api/schools/${id}/reviews`,
    (host, id) => `${host}/api/schools/${id}/reviews?limit=6&offset=0`,
    (host, id) => `${host}/api/schools/${id}/reviews?page=1&page_size=6`,
    (host, id) => `${host}/api/schools/${id}/comments`,
    (host, id) => `${host}/api/reviews?school_id=${id}&limit=6`,
    (host, id) => `${host}/api/reviews?schoolId=${id}&limit=6`,
    (host, id) => `${host}/api/reviews/school/${id}`,
    (host, id) => `${host}/api/school-reviews?school_id=${id}&limit=6`
  ];
  const output = [];
  for (const host of hosts) {
    for (const school of schools) {
      for (const pattern of patterns) output.push({ host, school: school.name, schoolId: school.id, url: pattern(host, school.id) });
    }
  }
  return output;
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
        accept: options.accept || '*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        ...(options.referer ? { referer: options.referer } : {})
      }
    });
    return { status: response.status, contentType: response.headers.get('content-type') || '', text: await response.text() };
  } catch (error) {
    return { status: 0, contentType: '', text: `FETCH_ERROR: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    clearTimeout(timeout);
  }
}

function extractHtmlAssets(html, base) {
  const urls = new Set();
  const pattern = /<(?:script|link)[^>]+(?:src|href)=["']([^"']+\.(?:js|mjs)(?:\?[^"']*)?)["']/gi;
  for (const match of html.matchAll(pattern)) {
    try { urls.add(new URL(match[1], base).href); } catch {}
  }
  return [...urls];
}

function extractLazyAssets(body, assetUrl) {
  const urls = new Set();
  const base = new URL('./', assetUrl);
  const patterns = [
    /import\(["']\.\/([^"']+\.js)["']\)/g,
    /["']\.\/([A-Za-z0-9_-]+\.js)["']/g,
    /["']([A-Za-z][A-Za-z0-9_-]+-[A-Za-z0-9_-]+\.js)["']/g
  ];
  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      try { urls.add(new URL(match[1], base).href); } catch {}
    }
  }
  return [...urls];
}

function discoverEndpointFragments(body) {
  const values = new Set();
  const patterns = [
    /["'`]((?:\/|\\\/)(?:api|schools?|reviews?|comments?)[^"'`\s]{0,240})["'`]/gi,
    /fetch\(\s*`([^`]{1,300})`/gi,
    /fetch\(\s*["']([^"']{1,300})["']/gi,
    /axios\.(?:get|post)\(\s*`([^`]{1,300})`/gi,
    /axios\.(?:get|post)\(\s*["']([^"']{1,300})["']/gi
  ];
  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      const value = String(match[1] || match[0]).replace(/\\\//g, '/');
      if (/review|comment|school|api/i.test(value) && value.length < 320) values.add(value);
    }
  }
  return [...values].slice(0, 500);
}

function discoverContexts(body) {
  const needles = ['reviews', 'review_count', 'comments', 'created_at', 'createdAt', 'like_count', 'likes', 'rating', '最新', '最近', '评价', '评论'];
  const contexts = [];
  for (const needle of needles) {
    let index = body.indexOf(needle);
    let count = 0;
    while (index !== -1 && count < 20) {
      contexts.push({ needle, context: compact(body.slice(Math.max(0, index - 400), index + needle.length + 900)) });
      index = body.indexOf(needle, index + needle.length);
      count += 1;
    }
  }
  return contexts;
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
