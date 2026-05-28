import { loadAllRecords } from '../_lib/fenxi-manifest.js';
import { normalizeRecord } from '../_lib/fenxi-normalizer.js';
import { buildDisplayTags } from '../_lib/school-display-tags.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function csv(payload, filename) {
  return new Response('\ufeff' + payload, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store'
    }
  });
}

function clean(value, max = 40) {
  return String(value || '').trim().slice(0, max);
}

function safe(value) {
  return String(value == null ? '' : value);
}

function csvCell(value) {
  const s = safe(value).replace(/"/g, '""');
  return `"${s}"`;
}

function toCsv(rows, columns) {
  const head = columns.map(c => csvCell(c.label)).join(',');
  const body = rows.map(row => columns.map(c => csvCell(row[c.key])).join(',')).join('\n');
  return `${head}\n${body}`;
}

function enrich(record) {
  const display = buildDisplayTags(record);
  return {
    ...record,
    ...display,
    schoolTagsText: Array.isArray(display.schoolTags) ? display.schoolTags.join(';') : '',
    regionGroupsText: Array.isArray(record.regionGroups) ? record.regionGroups.join(';') : '',
    flagsText: Array.isArray(record.flags) ? record.flags.join(';') : '',
    historyRankText: record?.historyCompare?.rankTrendText || ''
  };
}

function normalizedRecords(rawRecords) {
  return rawRecords
    .map(raw => normalizeRecord(raw))
    .filter(record => record.school && record.major)
    .map(enrich);
}

function buildSchools(records) {
  const map = new Map();

  for (const record of records) {
    const key = record.school;
    const current = map.get(key) || {
      school: record.school,
      count: 0,
      majorSet: new Set(),
      minScore2025: null,
      maxScore2025: null,
      bestRank2025: null,
      displayLocation: record.displayLocation || '',
      province: record.province || '',
      city: record.city || '',
      geoEntity: record.geoEntity || '',
      schoolCanonical: record.schoolCanonical || '',
      natureLabel: record.natureLabel || '',
      schoolTags: new Set(record.schoolTags || []),
      locationWarning: record.locationWarning || '',
      locationConfidence: record.locationConfidence || '',
      sampleMajors: []
    };

    current.count += 1;
    current.majorSet.add(record.major);

    const score = Number(record.score2025 ?? record.score);
    if (Number.isFinite(score)) {
      current.minScore2025 = current.minScore2025 == null ? score : Math.min(current.minScore2025, score);
      current.maxScore2025 = current.maxScore2025 == null ? score : Math.max(current.maxScore2025, score);
    }

    const rank = Number(record.rank2025 ?? record.rank);
    if (Number.isFinite(rank)) {
      current.bestRank2025 = current.bestRank2025 == null ? rank : Math.min(current.bestRank2025, rank);
    }

    if (!current.displayLocation && record.displayLocation) current.displayLocation = record.displayLocation;
    if (!current.geoEntity && record.geoEntity) current.geoEntity = record.geoEntity;
    if (!current.schoolCanonical && record.schoolCanonical) current.schoolCanonical = record.schoolCanonical;
    if (!current.locationWarning && record.locationWarning) current.locationWarning = record.locationWarning;

    if (current.sampleMajors.length < 8 && record.major) current.sampleMajors.push(record.major);

    map.set(key, current);
  }

  return [...map.values()].map(item => ({
    school: item.school,
    recordCount: item.count,
    majorCount: item.majorSet.size,
    minScore2025: item.minScore2025 ?? '',
    maxScore2025: item.maxScore2025 ?? '',
    bestRank2025: item.bestRank2025 ?? '',
    displayLocation: item.displayLocation,
    province: item.province,
    city: item.city,
    geoEntity: item.geoEntity,
    schoolCanonical: item.schoolCanonical,
    natureLabel: item.natureLabel,
    schoolTags: [...item.schoolTags].join(';'),
    locationConfidence: item.locationConfidence,
    locationWarning: item.locationWarning,
    sampleMajors: [...new Set(item.sampleMajors)].join('；')
  })).sort((a, b) => b.recordCount - a.recordCount || a.school.localeCompare(b.school, 'zh-CN'));
}

function buildMajorPool(records) {
  return records.map(record => ({
    school: record.school,
    major: record.major,
    score2025: record.score2025 ?? record.score ?? '',
    rank2025: record.rank2025 ?? record.rank ?? '',
    score2024: record.score2024 ?? '',
    rank2024: record.rank2024 ?? '',
    historyRankText: record.historyRankText || '',
    displayLocation: record.displayLocation || '',
    geoEntity: record.geoEntity || '',
    natureLabel: record.natureLabel || '',
    schoolTags: record.schoolTagsText || '',
    locationWarning: record.locationWarning || '',
    flags: record.flagsText || ''
  })).sort((a, b) => a.school.localeCompare(b.school, 'zh-CN') || a.major.localeCompare(b.major, 'zh-CN'));
}

function buildSchoolMajorSummary(records) {
  const map = new Map();

  for (const record of records) {
    const key = `${record.school}||${record.major}`;
    const current = map.get(key) || {
      school: record.school,
      major: record.major,
      count: 0,
      score2025: record.score2025 ?? record.score ?? '',
      rank2025: record.rank2025 ?? record.rank ?? '',
      score2024: record.score2024 ?? '',
      rank2024: record.rank2024 ?? '',
      displayLocation: record.displayLocation || '',
      geoEntity: record.geoEntity || '',
      natureLabel: record.natureLabel || '',
      schoolTags: record.schoolTagsText || ''
    };
    current.count += 1;
    map.set(key, current);
  }

  return [...map.values()].sort((a, b) => a.school.localeCompare(b.school, 'zh-CN') || a.major.localeCompare(b.major, 'zh-CN'));
}

function columnsFor(type) {
  if (type === 'schools') {
    return [
      ['school','学校名称'],
      ['recordCount','记录数'],
      ['majorCount','专业数'],
      ['minScore2025','2025最低分下限'],
      ['maxScore2025','2025最低分上限'],
      ['bestRank2025','最好位次'],
      ['displayLocation','地域'],
      ['province','省份'],
      ['city','城市'],
      ['geoEntity','办学实体'],
      ['schoolCanonical','标准实体'],
      ['natureLabel','性质'],
      ['schoolTags','学校标签'],
      ['locationConfidence','地域可信度'],
      ['locationWarning','地域/校区提示'],
      ['sampleMajors','专业示例']
    ].map(([key, label]) => ({ key, label }));
  }

  if (type === 'school-major') {
    return [
      ['school','学校名称'],
      ['major','专业名称'],
      ['count','重复记录数'],
      ['score2025','2025最低分'],
      ['rank2025','2025最低位次'],
      ['score2024','2024最低分'],
      ['rank2024','2024最低位次'],
      ['displayLocation','地域'],
      ['geoEntity','办学实体'],
      ['natureLabel','性质'],
      ['schoolTags','学校标签']
    ].map(([key, label]) => ({ key, label }));
  }

  return [
    ['school','学校名称'],
    ['major','专业名称'],
    ['score2025','2025最低分'],
    ['rank2025','2025最低位次'],
    ['score2024','2024最低分'],
    ['rank2024','2024最低位次'],
    ['historyRankText','两年位次变化'],
    ['displayLocation','地域'],
    ['geoEntity','办学实体'],
    ['natureLabel','性质'],
    ['schoolTags','学校标签'],
    ['locationWarning','地域/校区提示'],
    ['flags','需核验']
  ].map(([key, label]) => ({ key, label }));
}

function rowsFor(type, records) {
  if (type === 'schools') return buildSchools(records);
  if (type === 'school-major') return buildSchoolMajorSummary(records);
  return buildMajorPool(records);
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  }

  try {
    const url = new URL(context.request.url);
    const type = clean(url.searchParams.get('type') || 'summary', 30);
    const format = clean(url.searchParams.get('format') || 'json', 20);
    const keyword = clean(url.searchParams.get('keyword') || '', 60);
    const limit = Math.max(1, Math.min(5000, Number(url.searchParams.get('limit') || 1000)));

    const { manifest, records: rawRecords } = await loadAllRecords(context.request, context.env || {});
    let records = normalizedRecords(rawRecords);

    if (keyword) {
      records = records.filter(record => record.school.includes(keyword) || record.major.includes(keyword));
    }

    const schools = buildSchools(records);
    const majorPool = buildMajorPool(records);
    const schoolMajor = buildSchoolMajorSummary(records);

    const summary = {
      ok: true,
      manifestVersion: manifest.version || '',
      totalRawRecords: rawRecords.length,
      totalNormalizedRecords: records.length,
      uniqueSchools: schools.length,
      schoolMajorPairs: schoolMajor.length,
      majorPoolRecords: majorPool.length,
      keyword,
      generatedAt: new Date().toISOString()
    };

    if (format === 'csv') {
      const rows = rowsFor(type, records);
      const cols = columnsFor(type);
      const filename = type === 'schools'
        ? 'fenxi-schools.csv'
        : type === 'school-major'
          ? 'fenxi-school-major.csv'
          : 'fenxi-major-pool.csv';
      return csv(toCsv(rows, cols), filename);
    }

    if (type === 'schools') {
      return json({ ...summary, type, schools: schools.slice(0, limit) });
    }

    if (type === 'major-pool') {
      return json({ ...summary, type, majorPool: majorPool.slice(0, limit) });
    }

    if (type === 'school-major') {
      return json({ ...summary, type, schoolMajor: schoolMajor.slice(0, limit) });
    }

    return json({
      ...summary,
      type: 'summary',
      preview: {
        schools: schools.slice(0, 20),
        majorPool: majorPool.slice(0, 20),
        schoolMajor: schoolMajor.slice(0, 20)
      },
      downloads: {
        schoolsCsv: '/api/fenxi-catalog?type=schools&format=csv',
        majorPoolCsv: '/api/fenxi-catalog?type=major-pool&format=csv',
        schoolMajorCsv: '/api/fenxi-catalog?type=school-major&format=csv'
      }
    });
  } catch (error) {
    return json({
      ok: false,
      message: error && error.message ? error.message : String(error),
      hint: '请确认 /fenxi/data/manifest.json 和 chunks 已部署，且 Cloudflare Pages Functions 能访问 /fenxi 数据。'
    }, 500);
  }
}
