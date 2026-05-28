import { loadAllRecords } from '../_lib/fenxi-manifest.js';
import { normalizeRecord } from '../_lib/fenxi-normalizer.js';
import { getSchoolGeoDbSize, getSchoolGeoSourceMeta } from '../_lib/school-geo-normalizer.js';
import { aliasCount } from '../_lib/school-alias-map.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function clean(value, max = 60) {
  return String(value || '').trim().slice(0, max);
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  }

  try {
    const url = new URL(context.request.url);
    const limit = Math.max(10, Math.min(1000, Number(url.searchParams.get('limit') || 300)));
    const keyword = clean(url.searchParams.get('keyword') || '', 50);
    const { manifest, records: rawRecords } = await loadAllRecords(context.request, context.env || {});

    const map = new Map();

    for (const raw of rawRecords) {
      const record = normalizeRecord(raw);
      if (!record.school) continue;
      if (keyword && !record.school.includes(keyword)) continue;

      const existed = map.get(record.school) || {
        school: record.school,
        count: 0,
        majors: new Set(),
        displayLocation: record.displayLocation,
        province: record.province,
        city: record.city,
        geoEntity: record.geoEntity,
        schoolCanonical: record.schoolCanonical,
        locationSource: record.locationSource,
        locationConfidence: record.locationConfidence,
        locationWarning: record.locationWarning,
        geoSourceMethod: record.geoSourceMethod,
        geoSourceYear: record.geoSourceYear,
        geoMatchNote: record.geoMatchNote,
        schoolIdentifier: record.schoolIdentifier
      };

      existed.count += 1;
      if (record.major) existed.majors.add(record.major);
      if (!existed.displayLocation && record.displayLocation) existed.displayLocation = record.displayLocation;
      if (!existed.geoEntity && record.geoEntity) existed.geoEntity = record.geoEntity;
      if (!existed.locationWarning && record.locationWarning) existed.locationWarning = record.locationWarning;

      map.set(record.school, existed);
    }

    const schools = [...map.values()].map(item => ({
      ...item,
      majors: item.majors.size,
      status: item.locationSource === 'missing' || item.locationConfidence === 'low' ? 'needs-review' : 'mapped'
    })).sort((a, b) => b.count - a.count || a.school.localeCompare(b.school, 'zh-CN'));

    const summary = {
      uniqueSchools: schools.length,
      mapped: schools.filter(s => s.status === 'mapped').length,
      needsReview: schools.filter(s => s.status === 'needs-review').length,
      geoDbSize: getSchoolGeoDbSize(),
      aliasCount: aliasCount(),
      sourceMeta: getSchoolGeoSourceMeta ? getSchoolGeoSourceMeta() : null,
      manifestVersion: manifest.version || '',
      totalRecords: rawRecords.length
    };

    return json({
      ok: true,
      summary,
      schools: schools.slice(0, limit)
    });
  } catch (error) {
    return json({
      ok: false,
      message: error && error.message ? error.message : String(error),
      hint: '请确认 /fenxi/data/manifest.json 与 chunks 可以由 Cloudflare Function 读取。'
    }, 500);
  }
}
