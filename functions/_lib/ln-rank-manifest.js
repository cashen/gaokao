const TTL = 5 * 60 * 1000;
let manifestCache = null;
const chunkCache = new Map();
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

function findRecordsArrayStart(text) {
  const first = text.search(/\S/);
  if (first >= 0 && text[first] === '[') return first;
  const match = /"records"\s*:\s*\[/.exec(text);
  return match ? match.index + match[0].lastIndexOf('[') : -1;
}

function countToken(text, token) {
  let count = 0;
  let offset = 0;
  while (true) {
    const index = text.indexOf(token, offset);
    if (index < 0) break;
    count += 1;
    offset = index + token.length;
  }
  return count;
}

function exactSchoolRowsFromText(text, schoolNames, expectedRecordCount, predicate) {
  const expected = Number(expectedRecordCount || 0);
  if (!expected || countToken(text, RECORD_START) !== expected || countToken(text, SCHOOL_FIELD) !== expected) return null;
  const arrayEnd = text.lastIndexOf(']}');
  if (arrayEnd < 0) return null;

  const starts = new Set();
  for (const schoolName of [...new Set((Array.isArray(schoolNames) ? schoolNames : []).map(value => String(value || '').trim()).filter(Boolean))]) {
    const marker = `${SCHOOL_FIELD}${JSON.stringify(schoolName)}`;
    let offset = 0;
    while (true) {
      const index = text.indexOf(marker, offset);
      if (index < 0) break;
      const start = text.lastIndexOf(RECORD_START, index);
      if (start < 0) return null;
      starts.add(start);
      offset = index + marker.length;
    }
  }

  const records = [];
  for (const start of [...starts].sort((a, b) => a - b)) {
    const next = text.indexOf(RECORD_START, start + RECORD_START.length);
    const end = next >= 0 ? next - 1 : arrayEnd;
    if (end <= start) return null;
    const raw = JSON.parse(text.slice(start, end));
    if (predicate(raw)) records.push(raw);
  }
  return { records, scanned: expected, mode: 'exact-school-native-text-scan' };
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

export async function loadAllRecords(request, env) {
  const manifest = await loadManifest(request, env);
  const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
  const lists = await Promise.all(chunks.map(async chunk => {
    const file = chunk.file || chunk.path;
    if (!file) return [];
    if (fresh(chunkCache.get(file))) return chunkCache.get(file).data;
    const data = await fetchJson(request, file);
    const records = rowsFromJson(data);
    chunkCache.set(file, { time: Date.now(), data: records });
    return records;
  }));
  return { manifest, records: lists.flat() };
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
  return { manifest, records, scanned, chunkFiles: requested, modes };
}
