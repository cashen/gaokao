import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const requiredSuccess = splitEnv('REQUIRED_SUCCESS_SCHOOLS', ['吉林大学', '大连理工大学']);
const expectedNull = splitEnv('EXPECTED_NULL_SCHOOLS', ['辽宁大学', '辽宁科技大学']);
const schools = [...new Set([...requiredSuccess, ...expectedNull])];
const artifactDir = '/tmp/tongxue-live-artifact';
await mkdir(artifactDir, { recursive: true });

await cp('functions/api/tongxue-summary.js', '/tmp/tongxue-summary.mjs');
const { onRequest } = await import(`${pathToFileURL('/tmp/tongxue-summary.mjs').href}?t=${Date.now()}`);

const functionResults = [];
for (const school of schools) {
  const request = new Request(`https://verification.invalid/api/tongxue-summary?school=${encodeURIComponent(school)}`, {
    method: 'GET',
    headers: { accept: 'application/json' }
  });

  let response;
  let payload;
  let thrown = '';
  try {
    response = await onRequest({ request, env: {} });
    const raw = await response.text();
    try { payload = JSON.parse(raw); }
    catch { payload = { raw: compact(raw).slice(0, 600) }; }
  } catch (error) {
    thrown = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ''}` : String(error);
    payload = {};
  }

  const row = {
    school,
    status: response?.status ?? null,
    ok: Boolean(payload?.ok),
    error: payload?.error || null,
    message: payload?.message || null,
    version: payload?.version || null,
    schoolId: payload?.schoolMeta?.id ?? null,
    canonicalName: payload?.school || payload?.schoolMeta?.name || null,
    summaryLength: typeof payload?.summary === 'string' ? payload.summary.length : 0,
    summaryPreview: typeof payload?.summary === 'string' ? compact(payload.summary).slice(0, 500) : '',
    transport: payload?.transport || null,
    diagnostics: payload?.diagnostics || null,
    thrown
  };
  functionResults.push(row);
  console.log(`FUNCTION_RESULT ${JSON.stringify(row)}`);
}

const html = await readFile('tongxue.html', 'utf8');
const htmlChecks = {
  version109: html.includes("const PAGE_VERSION='v1.0.9'") && html.includes('同学你好 v1.0.9'),
  noDefaultSchool: !/<input[^>]*id=["']school["'][^>]*value=/i.test(html),
  hasAliasExamples: html.includes('辽科大') && html.includes('大连理功大学'),
  importsResolver: html.includes("from '/school-name-resolver.js'"),
  usesAllSchoolList: html.includes('正在载入全站高校名单'),
  noBrowserJina: !html.includes('r.jina.ai') && !html.includes('JINA_API_KEY')
};
console.log(`HTML_CHECKS ${JSON.stringify(htmlChecks)}`);

const requiredFailures = requiredSuccess.filter((school) => {
  const result = functionResults.find((item) => item.school === school);
  return !result || !result.ok || result.status !== 200 || result.summaryLength < 40 || !result.summaryPreview.includes(school);
});

const nullStateFailures = expectedNull.filter((school) => {
  const result = functionResults.find((item) => item.school === school);
  if (!result) return true;
  if (result.ok && result.status === 200 && result.summaryLength >= 20) return false;
  return !(result.status === 404 && result.error === 'summary_not_available' && result.schoolId !== null);
});

const failedHtmlChecks = Object.entries(htmlChecks).filter(([, passed]) => !passed).map(([name]) => name);
const report = {
  generatedAt: new Date().toISOString(),
  requiredSuccess,
  expectedNull,
  requiredFailures,
  nullStateFailures,
  failedHtmlChecks,
  htmlChecks,
  functionResults
};
await writeFile(path.join(artifactDir, 'tongxue-live-results.json'), JSON.stringify(report, null, 2));

console.log(`VERIFICATION_SUMMARY ${JSON.stringify({ requiredFailures, nullStateFailures, failedHtmlChecks })}`);
if (requiredFailures.length || nullStateFailures.length || failedHtmlChecks.length) process.exitCode = 1;

function splitEnv(name, fallback) {
  const value = String(process.env[name] || '').trim();
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : fallback;
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
