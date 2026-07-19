import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const schools = splitEnv('TEST_SCHOOLS', ['吉林大学', '大连理工大学', '辽宁大学', '辽宁科技大学']);
const requiredSchools = new Set(splitEnv('REQUIRED_SUCCESS_SCHOOLS', ['吉林大学', '大连理工大学']));
const sourceHosts = ['https://srgaoxiao.com', 'https://eo.srgaoxiao.com'];
const artifactDir = '/tmp/tongxue-live-artifact';
await mkdir(artifactDir, { recursive: true });

const apiProbe = [];

for (const school of schools) {
  for (const host of sourceHosts) {
    const detailUrl = `${host}/api/schools/${encodeURIComponent(school)}`;
    const detail = await fetchJson(detailUrl);
    const schoolId = pickSchoolId(detail.payload);

    let summary = null;
    let summaryUrl = '';
    if (schoolId !== null) {
      summaryUrl = `${host}/api/schools/${encodeURIComponent(String(schoolId))}/ai-summary`;
      summary = await fetchJson(summaryUrl);
    }

    const summaryText = pickSummary(summary?.payload);
    const row = {
      school,
      host,
      detailUrl,
      detailStatus: detail.status,
      detailContentType: detail.contentType,
      detailLength: detail.raw.length,
      detailPreview: previewPayload(detail.payload, detail.raw),
      schoolId,
      summaryUrl,
      summaryStatus: summary?.status ?? null,
      summaryContentType: summary?.contentType || '',
      summaryLength: summary?.raw.length || 0,
      summaryTextLength: summaryText.length,
      summaryPreview: summaryText.slice(0, 500),
      summaryPayloadPreview: summary ? previewPayload(summary.payload, summary.raw) : ''
    };
    apiProbe.push(row);
    console.log(`API_PROBE ${JSON.stringify(row)}`);
  }
}

const bestBySchool = schools.map((school) => {
  const attempts = apiProbe.filter((row) => row.school === school);
  const success = attempts.find((row) => row.summaryTextLength >= 20);
  return {
    school,
    ok: Boolean(success),
    host: success?.host || null,
    schoolId: success?.schoolId ?? null,
    summaryLength: success?.summaryTextLength || 0,
    summaryPreview: success?.summaryPreview || '',
    attempts
  };
});

const failedRequired = bestBySchool.filter((item) => requiredSchools.has(item.school) && !item.ok);
const report = {
  generatedAt: new Date().toISOString(),
  requiredSchools: [...requiredSchools],
  failedRequired: failedRequired.map((item) => item.school),
  apiProbe,
  bestBySchool
};
await writeFile(path.join(artifactDir, 'tongxue-live-results.json'), JSON.stringify(report, null, 2));

console.log(`RESULTS ${JSON.stringify(bestBySchool.map(({ attempts, ...item }) => item))}`);
console.log(`SUMMARY ${JSON.stringify({ required: [...requiredSchools], failedRequired: failedRequired.map((item) => item.school) })}`);
if (failedRequired.length) process.exitCode = 1;

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
        accept: 'application/json,text/plain,*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        referer: new URL('/', url).href
      }
    });
    const raw = await response.text();
    let payload = null;
    try { payload = JSON.parse(raw); } catch {}
    return {
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      raw: raw.slice(0, 2_000_000),
      payload
    };
  } catch (error) {
    return {
      status: 0,
      contentType: '',
      raw: `FETCH_ERROR: ${error instanceof Error ? error.message : String(error)}`,
      payload: null
    };
  }
}

function pickSchoolId(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [payload.id, payload.school_id, payload.schoolId, payload.data?.id, payload.data?.school_id, payload.school?.id];
  return candidates.find((value) => value !== undefined && value !== null) ?? null;
}

function pickSummary(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload.trim();
  if (typeof payload !== 'object') return '';
  const candidates = [
    payload.summary,
    payload.aiSummary,
    payload.ai_summary,
    payload.summaryText,
    payload.data?.summary,
    payload.data?.aiSummary,
    payload.data?.ai_summary
  ];
  const value = candidates.find((item) => typeof item === 'string' && item.trim());
  return value ? value.trim() : '';
}

function previewPayload(payload, raw) {
  if (payload !== null) return JSON.stringify(payload).slice(0, 1000);
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 1000);
}

function splitEnv(name, fallback) {
  const value = String(process.env[name] || '').trim();
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : fallback;
}
