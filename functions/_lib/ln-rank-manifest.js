const TTL = 5 * 60 * 1000;
let manifestCache = null;
const EXACT_SCHOOL_CACHE_TTL_MS = 45 * 1000;
const EXACT_SCHOOL_CACHE_MAX_ENTRIES = 8;
const EXACT_SCHOOL_CACHE_MAX_RECORDS = 800;
const exactSchoolCache = new Map();
let exactSchoolCacheRecordCount = 0;
const RECORD_START = '{"schoolCode2026":';
const SCHOOL_FIELD = '"school":';

function fresh(entry) {
  return entry && Date.now() - entry.time < TTL;
}

function base(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function fenxiUrl(request, path) {
  return `${base(request)}/fenxi/${String(path).replace(/^\/+/, '')}`;
}

async function fetchJson(request, path) {
  const response = await fetch(fenxiUrl(request, path), { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`ln-rank 2026 data fetch failed ${response.status}: ${path}`);
  return response.json();
}

async function fetchAssetResponse(request, env, path) {
  const url = fenxiUrl(request, path);
  let response = null;
  if (env?.ASSETS?.fetch) {
    try {
      response = await env.ASSETS.fetch(new Request(url, { method: 'GET', headers: { accept: 'application/json' } }));
    } catch {
      response = null;
    }
  }
  if (!response || !response.ok) response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`ln-rank 2026 data fetch failed ${response.status}: ${path}`);
  return response;
}

function rowsFromJson(data) {
  return Array.isArray(data) ? data : (Array.isArray(data?.records) ? data.records : []);
}

function exactSchoolCacheKey(files = [], schoolNames = []) {
  const fileKey = [...new Set((Array.isArray(files) ? files : []).map(value => String(value || '').trim()).filter(Boolean))].sort().join('|');
  const schoolKey = [...new Set((Array.isArray(schoolNames) ? schoolNames : []).map(value => String(value || '').trim()).filter(Boolean))].sort().join('|');
  return `${fileKey}::${schoolKey}`;
}

function removeExactSchoolCacheEntry(key) {
  const entry = exactSchoolCache.get(key);
  if (!entry) return;
  exactSchoolCache.delete(key);
  exactSchoolCacheRecordCount = Math.max(0, exactSchoolCacheRecordCount - Number(entry.recordCount || 0));
}

function pruneExactSchoolCache(now = Date.now()) {
  for (const [key, entry] of exactSchoolCache) {
    if (now - Number(entry.time || 0) >= EXACT_SCHOOL_CACHE_TTL_MS) removeExactSchoolCacheEntry(key);
  }
}

function readExactSchoolCache(key) {
  pruneExactSchoolCache();
  const entry = exactSchoolCache.get(key);
  if (!entry) return null;
  exactSchoolCache.delete(key);
  exactSchoolCache.set(key, entry);
  return {
    records: entry.records.map(record => ({ ...record })),
    scanned: entry.scanned,
    chunkFiles: [...entry.chunkFiles],
    modes: [...entry.modes],
    cacheStatus: 'hit'
  };
}

function putExactSchoolCache(key, result) {
  const records = Array.isArray(result?.records) ? result.records : [];
  if (!key || !records.length || records.length > EXACT_SCHOOL_CACHE_MAX_RECORDS) return false;
  pruneExactSchoolCache();
  removeExactSchoolCacheEntry(key);
  while (
    exactSchoolCache.size >= EXACT_SCHOOL_CACHE_MAX_ENTRIES
    || exactSchoolCacheRecordCount + records.length > EXACT_SCHOOL_CACHE_MAX_RECORDS
  ) {
    const oldest = exactSchoolCache.keys().next().value;
    if (oldest === undefined) break;
    removeExactSchoolCacheEntry(oldest);
  }
  if (exactSchoolCacheRecordCount + records.length > EXACT_SCHOOL_CACHE_MAX_RECORDS) return false;
  const entry = {
    time: Date.now(),
    records: records.map(record => ({ ...record })),
    scanned: Number(result.scanned || 0),
    chunkFiles: Object.freeze([...(result.chunkFiles || [])]),
    modes: Object.freeze([...(result.modes || [])]),
    recordCount: records.length
  };
  exactSchoolCache.set(key, entry);
  exactSchoolCacheRecordCount += records.length;
  return true;
}

export function exactSchoolRecordCacheState() {
  pruneExactSchoolCache();
  return Object.freeze({
    ttlMs: EXACT_SCHOOL_CACHE_TTL_MS,
    maxEntries: EXACT_SCHOOL_CACHE_MAX_ENTRIES,
    maxRecords: EXACT_SCHOOL_CACHE_MAX_RECORDS,
    entries: exactSchoolCache.size,
    records: exactSchoolCacheRecordCount,
    bounded: exactSchoolCache.size <= EXACT_SCHOOL_CACHE_MAX_ENTRIES
      && exactSchoolCacheRecordCount <= EXACT_SCHOOL_CACHE_MAX_RECORDS
  });
}

export function clearExactSchoolRecordCacheForTest() {
  exactSchoolCache.clear();
  exactSchoolCacheRecordCount = 0;
}

function findRecordsArrayStart(text) {
  const first = text.search(/\S/);
  if (first >= 0 && text[first] === '[') return first;
  const match = /"records"\s*:\s*\[/.exec(text);
  return match ? match.index + match[0].lastIndexOf('[') : -1;
}

function exactSchoolRowsFromText(text, schoolNames, expectedRecordCount, predicate) {
  const expected = Number(expectedRecordCount || 0);
  if (!expected) return null;
  const arrayEnd = text.lastIndexOf(']}');
  if (arrayEnd < 0) return null;

  const markers = [...new Set((Array.isArray(schoolNames) ? schoolNames : [])
    .map(value => String(value || '').trim())
    .filter(Boolean))]
    .map(schoolName => `${SCHOOL_FIELD}${JSON.stringify(schoolName)}`);
  if (!markers.length) return null;

  const records = [];
  let scanned = 0;
  let start = text.indexOf(RECORD_START);
  while (start >= 0) {
    const next = text.indexOf(RECORD_START, start + RECORD_START.length);
    const end = next >= 0 ? next - 1 : arrayEnd;
    if (end <= start) return null;
    const recordText = text.slice(start, end);
    const schoolField = recordText.indexOf(SCHOOL_FIELD);
    if (schoolField < 0 || recordText.indexOf(SCHOOL_FIELD, schoolField + SCHOOL_FIELD.length) >= 0) return null;
    scanned += 1;
    if (markers.some(marker => recordText.includes(marker))) {
      const raw = JSON.parse(recordText);
      if (predicate(raw)) records.push(raw);
    }
    if (next < 0) break;
    start = next;
  }
  if (scanned !== expected) return null;
  return { records, scanned, mode: 'exact-school-native-text-scan' };
}

async function streamMatchingRows(response, predicate) {
  if (!response?.body?.getReader) {
    const rows = rowsFromJson(await response.json());
    return { records: rows.filter(predicate), scanned: rows.length, mode: 'json-fallback' };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const records = [];
  let scanned = 0;
  let prefix = '';
  let started = false;
  let ended = false;
  let current = '';
  let depth = 0;
  let inString = false;
  let escaped = false;

  const consume = text => {
    let source = text;
    if (!started) {
      prefix += source;
      const arrayStart = findRecordsArrayStart(prefix);
      if (arrayStart < 0) {
        if (prefix.length > 64 * 1024) throw new Error('ln-rank chunk records array not found within prefix budget');
        return;
      }
      started = true;
      source = prefix.slice(arrayStart + 1);
      prefix = '';
    }

    for (let index = 0; index < source.length && !ended; index += 1) {
      const char = source[index];
      if (depth === 0) {
        if (/\s/.test(char) || char === ',') continue;
        if (char === ']') {
          ended = true;
          continue;
        }
        if (char !== '{') throw new Error(`ln-rank chunk record must be an object, got ${JSON.stringify(char)}`);
        current = '{';
        depth = 1;
        inString = false;
        escaped = false;
        continue;
      }

      current += char;
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          const raw = JSON.parse(current);
          scanned += 1;
          if (predicate(raw)) records.push(raw);
          current = '';
        }
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      consume(decoder.decode(value, { stream: true }));
    }
    consume(decoder.decode());
  } finally {
    reader.releaseLock?.();
  }

  if (!started || !ended || depth !== 0 || current) throw new Error('ln-rank chunk stream ended before records array completed');
  return { records, scanned, mode: 'record-stream' };
}

export async function loadManifest(request, env) {
  if (fresh(manifestCache)) return manifestCache.data;
  const data = await fetchJson(request, 'data/ln-rank-2026/manifest.json');
  if (Number(data.dataYear) !== 2026) throw new Error('ln-rank active manifest is not 2026');
  manifestCache = { time: Date.now(), data };
  return data;
}

export async function loadMatchingRecords(request, env, predicate) {
  const manifest = await loadManifest(request, env);
  const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
  const records = [];
  let scanned = 0;
  for (const chunk of chunks) {
    const file = chunk.file || chunk.path;
    if (!file) continue;
    const response = await fetchAssetResponse(request, env, file);
    const result = await streamMatchingRows(response, predicate);
    scanned += result.scanned;
    records.push(...result.records);
  }
  return { manifest, records, scanned };
}

export async function loadMatchingRecordsFromFiles(request, env, files, predicate) {
  const manifest = await loadManifest(request, env);
  const allowed = new Set((Array.isArray(manifest.chunks) ? manifest.chunks : []).map(chunk => chunk.file || chunk.path).filter(Boolean));
  const requested = [...new Set((Array.isArray(files) ? files : []).filter(file => allowed.has(file)))];
  const records = [];
  let scanned = 0;
  for (const file of requested) {
    const response = await fetchAssetResponse(request, env, file);
    const result = await streamMatchingRows(response, predicate);
    scanned += result.scanned;
    records.push(...result.records);
  }
  return { manifest, records, scanned, chunkFiles: requested };
}

export async function loadExactSchoolRecordsFromFiles(request, env, files, schoolNames, predicate) {
  const manifest = await loadManifest(request, env);
  const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
  const byFile = new Map(chunks.map(chunk => [chunk.file || chunk.path, chunk]));
  const requested = [...new Set((Array.isArray(files) ? files : []).filter(file => byFile.has(file)))];
  const cacheKey = exactSchoolCacheKey(requested, schoolNames);
  const cached = readExactSchoolCache(cacheKey);
  if (cached) return { manifest, ...cached };
  const records = [];
  let scanned = 0;
  const modes = [];
  for (const file of requested) {
    const chunk = byFile.get(file);
    const response = await fetchAssetResponse(request, env, file);
    const text = await response.text();
    let result = exactSchoolRowsFromText(text, schoolNames, chunk?.recordCount, predicate);
    if (!result) result = await streamMatchingRows(new Response(text, { headers: { 'content-type': 'application/json' } }), predicate);
    scanned += result.scanned;
    records.push(...result.records);
    modes.push(result.mode);
  }
  const result = { records, scanned, chunkFiles: requested, modes, cacheStatus: 'miss' };
  putExactSchoolCache(cacheKey, result);
  return { manifest, ...result };
}