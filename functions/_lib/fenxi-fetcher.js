import { createFenxiCookie } from './fenxi-session.js';

const TTL = 5 * 60 * 1000;
const metadataCache = new Map();

function fresh(item) {
  return item && Date.now() - item.time < TTL;
}

function trim(value) {
  return String(value || '').replace(/\/+$/, '');
}

function base(request, env = {}) {
  const configured = trim(env.FENXI_DATA_BASE || '');
  const origin = new URL(request.url).origin;
  if (configured) {
    if (configured.startsWith('http://') || configured.startsWith('https://')) return configured;
    if (configured.startsWith('/')) return `${origin}${configured}`;
    return `${origin}/${configured.replace(/^\/+/, '')}`;
  }
  return `${origin}/fenxi/data`;
}

export function normalizeFenxiDataPath(path) {
  let value = String(path || '').trim();
  value = value.replace(/^https?:\/\/[^/]+\//i, '').replace(/^\/+/, '');
  if (value.startsWith('fenxi/data/')) value = value.slice('fenxi/data/'.length);
  if (value.startsWith('data/')) value = value.slice('data/'.length);
  return value.replace(/^\/+/, '') || 'manifest.json';
}

function first(value, limit = 220) {
  return String(value || '').replace(/\s+/g, ' ').slice(0, limit);
}

function html(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.startsWith('<!doctype html') || normalized.startsWith('<html') || normalized.includes('<html');
}

function isLargeChunk(path) {
  return /(^|\/)chunks\//.test(path);
}

function assertJsonResponse(response, { clean, url, contentType }) {
  if (!response.ok) {
    return response.text().then(raw => {
      throw new Error(`读取 /fenxi 数据失败：${clean}，HTTP ${response.status}。请求路径：${url}。返回内容：${first(raw)}`);
    });
  }
  if (contentType.toLowerCase().includes('text/html')) {
    return response.text().then(raw => {
      throw new Error(`读取 /fenxi 数据时返回了 HTML，不是 JSON。请求路径：${url}。请确认路径是 /fenxi/data/chunks/xxx，而不是 /fenxi/data/data/chunks/xxx。返回开头：${first(raw)}`);
    });
  }
  return null;
}

async function parseLargeJsonResponse(response, { clean, url, contentType }) {
  const invalid = assertJsonResponse(response, { clean, url, contentType });
  if (invalid) return invalid;
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`读取 /fenxi 大分片后 JSON 解析失败：${clean}。Content-Type=${contentType}。请求路径：${url}。${error?.message || String(error)}`);
  }
}

async function fetchFenxiResponse(request, env, clean) {
  const url = `${base(request, env)}/${clean}`;
  const cookie = await createFenxiCookie(env);
  const headers = { accept: 'application/json' };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(url, {
    headers,
    cf: { cacheTtl: 60, cacheEverything: false }
  });
  const contentType = response.headers.get('content-type') || '';
  return { response, url, contentType };
}

function scoreFromRecordJson(raw) {
  for (const key of ['score2026', 'score', 'minScore']) {
    const match = new RegExp(`"${key}"\\s*:\\s*"?(-?\\d+(?:\\.\\d+)?)`).exec(raw);
    if (match && Number.isFinite(Number(match[1]))) return Number(match[1]);
  }
  return null;
}

function outsideScoreWindow(raw, scoreWindow) {
  const min = Number(scoreWindow?.min);
  const max = Number(scoreWindow?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
  const score = scoreFromRecordJson(raw);
  return Number.isFinite(score) && (score < min || score > max);
}

function parseRecordObject(raw, context) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`流式解析 /fenxi 大分片记录失败：${context.clean}，第 ${context.index} 条。请求路径：${context.url}。${error?.message || String(error)}`);
  }
}

async function* parseRecordArrayStream(response, context) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    const data = await parseLargeJsonResponse(response, context);
    const records = Array.isArray(data) ? data : (Array.isArray(data?.records) ? data.records : []);
    for (const record of records) {
      context.onRawRecord?.();
      const score = Number(record?.score2026 ?? record?.score ?? record?.minScore);
      if (Number.isFinite(Number(context.scoreWindow?.min)) && Number.isFinite(Number(context.scoreWindow?.max))
        && Number.isFinite(score) && (score < context.scoreWindow.min || score > context.scoreWindow.max)) continue;
      yield record;
    }
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let phase = 'seek-records';
  let scan = 0;
  let objectStart = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let index = 0;
  let completed = false;

  try {
    while (!completed) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: !done });
      if (done) buffer += decoder.decode();

      if (phase === 'seek-records') {
        const match = /"records"\s*:\s*\[/.exec(buffer);
        if (!match) {
          if (done) throw new Error(`流式读取 /fenxi 大分片时未找到 records 数组：${context.clean}。请求路径：${context.url}`);
          if (buffer.length > 131072) throw new Error(`流式读取 /fenxi 大分片头部异常：${context.clean}。请求路径：${context.url}`);
          continue;
        }
        buffer = buffer.slice(match.index + match[0].length);
        phase = 'records';
        scan = 0;
      }

      while (phase === 'records' && scan < buffer.length) {
        if (objectStart < 0) {
          const char = buffer[scan];
          if (/\s|,/.test(char)) {
            scan += 1;
            continue;
          }
          if (char === ']') {
            completed = true;
            break;
          }
          if (char !== '{') {
            throw new Error(`流式读取 /fenxi 大分片遇到非法 records 内容：${context.clean}，位置 ${scan}。`);
          }
          objectStart = scan;
          depth = 1;
          inString = false;
          escaped = false;
          scan += 1;
        }

        let recordCompleted = false;
        while (objectStart >= 0 && scan < buffer.length) {
          const char = buffer[scan];
          if (inString) {
            if (escaped) {
              escaped = false;
            } else if (char === '\\') {
              escaped = true;
            } else if (char === '"') {
              inString = false;
            }
          } else if (char === '"') {
            inString = true;
          } else if (char === '{') {
            depth += 1;
          } else if (char === '}') {
            depth -= 1;
            if (depth === 0) {
              index += 1;
              const raw = buffer.slice(objectStart, scan + 1);
              buffer = buffer.slice(scan + 1);
              scan = 0;
              objectStart = -1;
              recordCompleted = true;
              context.onRawRecord?.();
              if (!outsideScoreWindow(raw, context.scoreWindow)) {
                yield parseRecordObject(raw, { ...context, index });
              }
              break;
            }
          }
          scan += 1;
        }

        if (recordCompleted) continue;
        if (objectStart >= 0) {
          if (objectStart > 0) {
            buffer = buffer.slice(objectStart);
            scan -= objectStart;
            objectStart = 0;
          }
          break;
        }
      }

      if (done && !completed) {
        throw new Error(`流式读取 /fenxi 大分片提前结束：${context.clean}，已解析 ${index} 条。请求路径：${context.url}`);
      }
    }
  } finally {
    if (!completed) {
      try { await reader.cancel(); } catch {}
    }
    try { reader.releaseLock(); } catch {}
  }
}

// Large admission chunks are deliberately request-scoped.
// Streaming keeps both the raw JSON array and previously normalized candidates
// from coexisting in one Worker request. Score boundaries are checked against
// each raw object before JSON.parse, and no large module cache is used.
export async function* streamFenxiChunkRecords(request, env, path, options = {}) {
  const clean = normalizeFenxiDataPath(path);
  if (!isLargeChunk(clean)) {
    const data = await fetchFenxiJson(request, env, clean);
    const records = Array.isArray(data) ? data : (Array.isArray(data?.records) ? data.records : []);
    for (const record of records) {
      options.onRawRecord?.();
      yield record;
    }
    return;
  }

  const { response, url, contentType } = await fetchFenxiResponse(request, env, clean);
  const invalid = assertJsonResponse(response, { clean, url, contentType });
  if (invalid) {
    await invalid;
    return;
  }
  yield* parseRecordArrayStream(response, {
    clean,
    url,
    contentType,
    scoreWindow: options.scoreWindow,
    onRawRecord: options.onRawRecord
  });
}

export async function fetchFenxiJson(request, env, path) {
  const clean = normalizeFenxiDataPath(path);
  const largeChunk = isLargeChunk(clean);
  if (!largeChunk) {
    const cached = metadataCache.get(clean);
    if (fresh(cached)) return cached.data;
  }

  const { response, url, contentType } = await fetchFenxiResponse(request, env, clean);

  if (largeChunk) {
    // Compatibility path for callers that still require an entire chunk.
    // The major-bands runtime uses streamFenxiChunkRecords instead.
    return parseLargeJsonResponse(response, { clean, url, contentType });
  }

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`读取 /fenxi 数据失败：${clean}，HTTP ${response.status}。请求路径：${url}。返回内容：${first(raw)}`);
  }
  if (html(raw)) {
    throw new Error(`读取 /fenxi 数据时返回了 HTML，不是 JSON。请求路径：${url}。返回开头：${first(raw)}`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`读取 /fenxi 数据后 JSON 解析失败：${clean}。Content-Type=${contentType}。请求路径：${url}。返回开头：${first(raw)}`);
  }
  metadataCache.set(clean, { time: Date.now(), data });
  return data;
}
