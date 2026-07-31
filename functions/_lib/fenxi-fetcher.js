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

async function parseLargeJsonResponse(response, { clean, url, contentType }) {
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`读取 /fenxi 数据失败：${clean}，HTTP ${response.status}。请求路径：${url}。返回内容：${first(raw)}`);
  }
  if (contentType.toLowerCase().includes('text/html')) {
    const raw = await response.text();
    throw new Error(`读取 /fenxi 数据时返回了 HTML，不是 JSON。请求路径：${url}。请确认路径是 /fenxi/data/chunks/xxx，而不是 /fenxi/data/data/chunks/xxx。返回开头：${first(raw)}`);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`读取 /fenxi 大分片后 JSON 解析失败：${clean}。Content-Type=${contentType}。请求路径：${url}。${error?.message || String(error)}`);
  }
}

export async function fetchFenxiJson(request, env, path) {
  const clean = normalizeFenxiDataPath(path);
  const largeChunk = isLargeChunk(clean);
  if (!largeChunk) {
    const cached = metadataCache.get(clean);
    if (fresh(cached)) return cached.data;
  }

  const url = `${base(request, env)}/${clean}`;
  const cookie = await createFenxiCookie(env);
  const headers = { accept: 'application/json' };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(url, {
    headers,
    cf: { cacheTtl: 60, cacheEverything: false }
  });
  const contentType = response.headers.get('content-type') || '';

  if (largeChunk) {
    // Large admission chunks are deliberately request-scoped. Keeping parsed
    // arrays in module globals can retain the full 2026 dataset in one isolate.
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
