import { loadSchoolCatalog } from '../../tongxue/data/school-name-resolver-v150.js';
import { resolveUnifiedSchoolQuery } from '../../shared/resources/schools/school-query-engine.v3969_0.js';

const SEARCH_LIMIT = 8;
const RESOLVE_LIMIT = 20;
let catalogPromise = null;
let admissionDirectoryPromise = null;

function norm(value) {
  return String(value ?? '').normalize('NFKC').replace(/\u00a0/g, ' ').trim();
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
  const officialName = norm(item?.officialName || item?.school || item?.name);
  const metadata = metadataOf(resolver, officialName) || {};
  const province = norm(metadata.province || item?.province);
  const city = norm(metadata.city || item?.city);
  const level = norm(metadata.level || item?.level);
  return {
    officialName,
    province,
    city,
    level,
    location: norm(metadata.location || [province, city].filter(Boolean).join(' · ')),
    score: Number(item?.score || 0),
    matchType: norm(item?.matchType),
    matchReason: norm(item?.matchReason)
  };
}

async function search(query) {
  const [catalog, admissionDirectory] = await Promise.all([
    loadCatalogOnce(),
    loadAdmissionDirectoryOnce()
  ]);
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

self.addEventListener('message', async event => {
  const data = event.data || {};
  const id = String(data.id ?? '');
  const seq = Number(data.seq ?? 0);
  try {
    if (data.type === 'search') {
      const payload = await search(data.query);
      self.postMessage({ type: 'school-candidates', id, seq, ...payload });
      return;
    }
    if (data.type === 'resolve') {
      const result = await resolve(data.query);
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
