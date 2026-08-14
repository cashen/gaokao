import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const rawSource=await readFile('tools/tongxue/verify-live.mjs','utf8');
const source=rawSource.replace(
  "readFile('tongxue/data/school-entities-v130.js','utf8')",
  "readFile('shared/resources/schools/school-identity-center.js','utf8')"
);
if(source===rawSource)throw new Error('无法定位学校实体测试夹具');
const start=source.indexOf("const html = await readFile('tongxue/index.html', 'utf8');");
const end=source.indexOf('const report = {',start);
if(start<0||end<0)throw new Error('无法定位旧页面审计区段');
const target='/tmp/verify-tongxue-live.mjs';
await writeFile(target,source.slice(0,start)+'const htmlChecks={directoryRegression:true,sharedSchoolIdentity:true};\n\n'+source.slice(end),'utf8');
await import(pathToFileURL(target).href+'?t='+Date.now());

// Diagnostic-only: compare direct-source regression above with the real Pages
// Function path. `refresh=1` intentionally bypasses Tongxue edge cache so that
// the returned diagnostics describe the current Cloudflare -> source hop.
const productionBase = process.env.TONGXUE_PRODUCTION_BASE || 'https://gaokao-4y9.pages.dev';
const productionCases = [
  ['辽宁科技大学', 1],
  ['辽宁科技大学', 2],
  ['辽宁大学', 1],
  ['辽宁大学', 2],
  ['大连理工大学', 1]
];
const productionProbe = [];
for (const [school, attempt] of productionCases) {
  const url = new URL('/api/tongxue-summary', productionBase);
  url.searchParams.set('school', school);
  url.searchParams.set('page', '1');
  url.searchParams.set('refresh', '1');
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const raw = await response.text();
    let payload = null;
    try { payload = JSON.parse(raw); } catch {}
    productionProbe.push({
      school,
      attempt,
      status: response.status,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get('content-type') || '',
      tongxueVersion: response.headers.get('x-tongxue-version') || '',
      cache: response.headers.get('x-tongxue-cache') || '',
      serverTiming: response.headers.get('server-timing') || '',
      ok: payload?.ok ?? null,
      mode: payload?.mode ?? null,
      error: payload?.error ?? null,
      message: payload?.message ?? null,
      schoolId: payload?.schoolMeta?.id ?? null,
      reviewCount: Array.isArray(payload?.reviews) ? payload.reviews.length : null,
      diagnostics: payload?.diagnostics ?? null,
      rawPreview: payload ? '' : raw.slice(0, 240)
    });
  } catch (error) {
    productionProbe.push({ school, attempt, status: null, durationMs: Date.now() - startedAt, thrown: String(error) });
  }
}
console.log(`TONGXUE_PRODUCTION_PROBE ${JSON.stringify({ productionBase, results: productionProbe })}`);
