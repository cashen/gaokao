export const AI_BACKGROUND_STATIC_RESOURCE = '/ln-rank/data/local-strength/local-strength-index.v3971_2.json';
export const AI_BACKGROUND_RESOURCE_ADAPTER_VERSION = 'ai-background-resource-adapter-v3992_2';

function clean(value, max = 220) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function normalizeText(value) {
  return clean(value, 260)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[（【\[]/g, '(')
    .replace(/[）】\]]/g, ')')
    .replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '');
}

function baseUrl(context = {}) {
  const raw = context?.request?.url || 'https://example.invalid/';
  return new URL(raw).origin;
}

async function fetchStaticJson(context, pathname) {
  const url = new URL(pathname, baseUrl(context));
  let response = null;
  if (context?.env?.ASSETS?.fetch) {
    try {
      response = await context.env.ASSETS.fetch(new Request(url.toString(), {
        method: 'GET',
        headers: { accept: 'application/json' }
      }));
    } catch {
      response = null;
    }
  }
  if (!response || !response.ok) {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
  }
  if (!response.ok) throw new Error(`AI background static resource fetch failed ${response.status}`);
  return response.json();
}

export async function loadAiBackgroundSnapshot(context) {
  const payload = await fetchStaticJson(context, AI_BACKGROUND_STATIC_RESOURCE);
  if (payload?.version !== 'local-strength-static-v3971_2') {
    throw new Error(`AI background static resource version mismatch: ${clean(payload?.version, 80)}`);
  }
  if (!Array.isArray(payload.records) || !Array.isArray(payload.schools)) {
    throw new Error('AI background static resource shape mismatch');
  }
  return payload;
}

function evidenceLevel(record = {}) {
  return clean(record?.background?.level || '', 30);
}

function directionOf(record = {}) {
  return clean(record?.background?.direction || record?.background?.label || record?.standardMajor?.name || record?.major, 160);
}

function admissionMajorOf(record = {}) {
  return clean(record?.standardMajor?.name || record?.major, 160);
}

function schoolMetaMap(snapshot = {}) {
  return new Map((snapshot.schools || []).map(item => [normalizeText(item?.officialName), item]));
}

function regionAllows(meta = {}, regionKeys = ['all']) {
  const keys = Array.isArray(regionKeys) && regionKeys.length ? regionKeys : ['all'];
  if (keys.includes('all') || keys.includes('ln') || keys.includes('province:辽宁')) return true;
  const city = clean(meta?.city, 80);
  if (keys.includes('shenyang') && city.includes('沈阳')) return true;
  if (keys.includes('dalian') && city.includes('大连')) return true;
  if (keys.includes('ln-other') && city && !city.includes('沈阳') && !city.includes('大连')) return true;
  return false;
}

function sourceMeta(snapshot = {}) {
  const backgroundMeta = snapshot.academicBackgroundMeta && typeof snapshot.academicBackgroundMeta === 'object'
    ? snapshot.academicBackgroundMeta
    : {};
  return {
    ...backgroundMeta,
    resourceVersion: snapshot.version || '',
    resourcePath: AI_BACKGROUND_STATIC_RESOURCE,
    dataYear: Number(snapshot?.meta?.dataYear || 2026),
    generatedAt: snapshot.generatedAt || '',
    boundary: clean(backgroundMeta.boundary || snapshot?.meta?.boundary || '只展示已发布静态背景证据资源中通过门禁的方向；未显示不代表学校或专业没有优势。', 500)
  };
}

function groupDirections(records = []) {
  const byDirection = new Map();
  for (const record of records) {
    const direction = directionOf(record);
    if (!direction) continue;
    let item = byDirection.get(direction);
    if (!item) {
      item = {
        // Compatibility display alias only. Queryability is explicit below; never use this as a history-query key.
        major: direction,
        direction,
        entityKind: 'background_direction',
        historyQueryable: false,
        admissionMajors: new Map(),
        schools: new Map(),
        primaryCount: 0,
        secondaryCount: 0,
        recordCount: 0,
        overview: clean(record?.background?.label || record?.background?.evidenceLabel || '', 220)
      };
      byDirection.set(direction, item);
    }
    const admissionMajor = admissionMajorOf(record);
    if (admissionMajor) item.admissionMajors.set(normalizeText(admissionMajor), admissionMajor);
    const school = clean(record?.school, 120);
    if (school) {
      const schoolKey = normalizeText(school);
      let schoolItem = item.schools.get(schoolKey);
      if (!schoolItem) {
        schoolItem = { school, city: clean(record?.city || record?.displayLocation, 80), admissionMajors: new Map() };
        item.schools.set(schoolKey, schoolItem);
      }
      if (admissionMajor) schoolItem.admissionMajors.set(normalizeText(admissionMajor), admissionMajor);
    }
    if (evidenceLevel(record) === 'primary') item.primaryCount += 1;
    else item.secondaryCount += 1;
    item.recordCount += 1;
  }
  return [...byDirection.values()].map(item => ({
    ...item,
    admissionMajors: [...item.admissionMajors.values()],
    schools: [...item.schools.values()].map(school => ({ ...school, admissionMajors: [...school.admissionMajors.values()] })),
    schoolCount: item.schools.size,
    evidenceScore: item.primaryCount * 5 + item.secondaryCount * 2 + item.schools.size
  }));
}

export function backgroundDiscoveryFromSnapshot(snapshot, { limit = 12, regionKeys = ['ln'] } = {}) {
  const metaBySchool = schoolMetaMap(snapshot);
  const scoped = (snapshot.records || []).filter(record => {
    const meta = metaBySchool.get(normalizeText(record?.school)) || { city: record?.city || record?.displayLocation || '' };
    return regionAllows(meta, regionKeys);
  });
  const items = groupDirections(scoped)
    .sort((a, b) => b.evidenceScore - a.evidenceScore || String(a.direction).localeCompare(String(b.direction), 'zh-CN'));
  return {
    items: items.slice(0, Math.max(6, Math.min(20, Number(limit || 12)))),
    totalWithEvidence: items.length,
    meta: sourceMeta(snapshot)
  };
}

export function schoolBackgroundFromSnapshot(snapshot, school) {
  const needle = normalizeText(school);
  const records = (snapshot.records || []).filter(record => normalizeText(record?.school) === needle);
  const items = groupDirections(records).map(item => ({ ...item, school: clean(school, 120) }));
  return { items, meta: sourceMeta(snapshot) };
}

export function schoolBackgroundDirectionFromSnapshot(snapshot, school, direction) {
  const needle = normalizeText(direction);
  if (!needle) return null;
  return schoolBackgroundFromSnapshot(snapshot, school).items.find(item => normalizeText(item?.direction) === needle) || null;
}

export function majorBackgroundFromSnapshot(snapshot, major) {
  const needle = normalizeText(major);
  const records = (snapshot.records || []).filter(record => {
    const majorText = normalizeText(record?.major);
    const direction = normalizeText(directionOf(record));
    return needle && (majorText.includes(needle) || direction.includes(needle) || needle.includes(direction));
  });
  const items = groupDirections(records)
    .sort((a, b) => b.evidenceScore - a.evidenceScore || String(a.direction).localeCompare(String(b.direction), 'zh-CN'));
  return { items, meta: sourceMeta(snapshot) };
}

function candidateEvidenceKey(school, major) {
  return `${normalizeText(school)}|${normalizeText(major)}`;
}

export function matchCandidateBackgrounds(snapshot, candidateRecords = []) {
  const byKey = new Map();
  for (const record of snapshot.records || []) {
    const key = candidateEvidenceKey(record?.school, record?.major);
    if (key && !byKey.has(key)) byKey.set(key, record?.background || null);
  }
  const matched = [];
  for (const record of candidateRecords || []) {
    const background = byKey.get(candidateEvidenceKey(record?.school, record?.major));
    if (!background) continue;
    matched.push({ record, background });
  }
  return { items: matched, meta: sourceMeta(snapshot) };
}
