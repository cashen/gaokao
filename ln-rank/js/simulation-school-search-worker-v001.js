import { loadSchoolCatalog } from '../../tongxue/data/school-name-resolver-v150.js';
import { resolveUnifiedSchoolQuery } from '../../shared/resources/schools/school-query-engine.v3969_0.js';

const SEARCH_LIMIT = 8;
const RESOLVE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 100;
let catalogPromise = null;
let admissionDirectoryPromise = null;
const searchTimers = new Map();
const searchSequences = new Map();

function norm(value) {
  return String(value ?? '').normalize('NFKC').replace(/\u00a0/g, ' ').trim();
}

function normalizedSchool(value) {
  return norm(value).toLowerCase().replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '');
}

async function loadCatalogOnce() {
  if (!catalogPromise) catalogPromise = loadSchoolCatalog();
  return catalogPromise;
}

async function loadAdmissionDirectoryOnce() {
  if (!admissionDirectoryPromise) {
    admissionDirectoryPromise = fetch('/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json', {
      cache: 'force-cache',
      headers: { accept: 'application/json' }
    }).then(async response => {
      if (!response.ok) throw new Error(`招生学校目录加载失败：HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.schools)) throw new Error('招生学校目录格式异常。');
      return payload;
    });
  }
  return admissionDirectoryPromise;
}

function metadataOf(resolver, name) {
  return resolver?.getMetadata?.(name) || null;
}

function candidateView(resolver, item) {
  const officialName = norm(item?.officialName || item?.name || item?.school);
  const metadata = metadataOf(resolver, officialName) || {};
  const province = norm(metadata.province || item?.province);
  const city = norm(metadata.city || item?.city);
  const level = norm(metadata.level || item?.level);
  return {
    officialName,
    province,
    city,
    level,
    location: norm(metadata.location || item?.location || [province, city].filter(Boolean).join(' · ')),
    score: Number(item?.score || 0),
    matchType: norm(item?.matchType),
    matchReason: norm(item?.matchReason)
  };
}

function directoryCandidates(query, directory) {
  const needle = normalizedSchool(query);
  if (!needle) return [];
  const rows = Array.isArray(directory?.schools) ? directory.schools : [];
  const matches = [];
  for (const row of rows) {
    const names = [row?.officialName, ...(Array.isArray(row?.admissionNames) ? row.admissionNames : []), ...(Array.isArray(row?.searchNames) ? row.searchNames : [])]
      .map(norm).filter(Boolean);
    if (!names.length) continue;
    const matched = names.find(name => normalizedSchool(name) === needle)
      || names.find(name => normalizedSchool(name).startsWith(needle))
      || names.find(name => normalizedSchool(name).includes(needle));
    if (!matched) continue;
    const normalizedMatched = normalizedSchool(matched);
    const exact = normalizedMatched === needle;
    const prefix = normalizedMatched.startsWith(needle);
    const coverage = Math.min(1, needle.length / Math.max(1, normalizedMatched.length));
    matches.push({
      officialName: norm(row?.officialName || matched),
      province: norm(row?.province),
      city: norm(row?.city),
      level: norm(row?.level),
      location: norm(row?.location || [row?.province, row?.city].filter(Boolean).join(' · ')),
      score: exact ? 1 : prefix ? 0.86 + coverage * 0.1 : 0.66 + coverage * 0.18,
      matchType: exact ? 'official_exact' : prefix ? 'official_prefix' : 'name_fragment',
      matchReason: exact ? '按招生学校目录精确匹配。' : '按招生学校目录名称匹配。'
    });
  }
  const seen = new Set();
  return matches
    .sort((a, b) => Number(b.score) - Number(a.score) || a.officialName.length - b.officialName.length || a.officialName.localeCompare(b.officialName, 'zh-CN'))
    .filter(item => {
      const key = normalizedSchool(item.officialName);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, SEARCH_LIMIT);
}

async function search(query) {
  const admissionDirectory = await loadAdmissionDirectoryOnce();
  const direct = directoryCandidates(query, admissionDirectory);
  if (direct.length) return { status: 'candidates', candidates: direct.map(item => candidateView(null, item)) };

  const catalog = await loadCatalogOnce();
  const result = resolveUnifiedSchoolQuery({
    query: norm(query),
    resolver: catalog.resolver,
    admissionDirectory,
    limit: SEARCH_LIMIT
  });
  const candidates = (result?.candidates || []).map(item => candidateView(catalog.resolver, item));
  return {
    status: result?.status || 'not_found',
    candidates
  };
}

async function resolve(query) {
  const catalog = await loadCatalogOnce();
  const input = norm(query);
  const result = catalog.resolver.resolve(input, { limit: RESOLVE_LIMIT });
  if (result?.status !== 'resolved' || !result?.resolvedName) {
    return {
      status: result?.status || 'not_found',
      candidates: (result?.candidates || []).map(item => candidateView(catalog.resolver, item))
    };
  }
  const view = candidateView(catalog.resolver, {
    officialName: result.resolvedName,
    score: result.confidence,
    matchType: result.matchType
  });
  return {
    status: 'resolved',
    officialName: view.officialName,
    province: view.province,
    city: view.city,
    level: view.level,
    location: view.location,
    score: view.score,
    matchType: view.matchType
  };
}

function scheduleSearch(id, seq, query) {
  const key = String(id);
  const oldTimer = searchTimers.get(key);
  if (oldTimer) clearTimeout(oldTimer);
  searchSequences.set(key, seq);
  if (!norm(query)) {
    self.postMessage({ type: 'school-candidates', id: key, seq, status: 'not_found', candidates: [] });
    return;
  }
  const timer = setTimeout(async () => {
    searchTimers.delete(key);
    if (searchSequences.get(key) !== seq) return;
    try {
      const payload = await search(query);
      if (searchSequences.get(key) !== seq) return;
      self.postMessage({ type: 'school-candidates', id: key, seq, ...payload });
    } catch (error) {
      if (searchSequences.get(key) !== seq) return;
      self.postMessage({
        type: 'school-error',
        id: key,
        seq,
        message: String(error?.message || error || 'school_search_failed')
      });
    }
  }, SEARCH_DEBOUNCE_MS);
  searchTimers.set(key, timer);
}

// Start the small, common school directory load as soon as the Worker starts.
// The first keystroke should not be responsible for booting the directory pipeline.
void loadAdmissionDirectoryOnce().catch(() => {});

self.addEventListener('message', async event => {
  const data = event.data || {};
  const id = String(data.id ?? '');
  const seq = Number(data.seq ?? 0);
  try {
    if (data.type === 'search') {
      scheduleSearch(id, seq, data.query);
      return;
    }
    if (data.type === 'resolve') {
      searchSequences.set(id, seq);
      const result = await resolve(data.query);
      if (searchSequences.get(id) !== seq) return;
      self.postMessage({ type: 'school-resolved', id, seq, result });
      return;
    }
    self.postMessage({ type: 'school-error', id, seq, message: 'unsupported school worker message' });
  } catch (error) {
    self.postMessage({
      type: 'school-error',
      id,
      seq,
      message: String(error?.message || error || 'school_worker_failed')
    });
  }
});
