import { onRequest } from '../functions/api/211-mainline.js';
const urls = [
  'https://example.com/api/211-mainline?mode=meta',
  'https://example.com/api/211-mainline?mode=school&school=西安电子科技大学',
  'https://example.com/api/211-mainline?mode=major&major=通信工程',
  'https://example.com/api/211-mainline?mode=score&score=666&level=primary_secondary'
];
const results = [];
for (const url of urls) {
  const res = await onRequest({ request: new Request(url, { method: 'GET' }), env: {} });
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  let parsed = null; let parseOk = false;
  try { parsed = JSON.parse(text); parseOk = true; } catch {}
  results.push({ url: new URL(url).pathname + new URL(url).search, status: res.status, contentType, parseOk, okField: parsed?.ok, htmlLike: /^\s*</.test(text) });
}
const passed = results.every(r => r.contentType.includes('application/json') && r.parseOk && !r.htmlLike);
console.log(JSON.stringify({ audit: 'audit-211-score-api-smoke', version: 'v3.9.33.14', passed, results }, null, 2));
if (!passed) process.exit(1);
