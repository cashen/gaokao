import { createFenxiCookie } from './fenxi-session.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function isFresh(item) {
  return item && Date.now() - item.time < CACHE_TTL_MS;
}

function dataBase(request, env = {}) {
  const base = String(env.FENXI_DATA_BASE || '').replace(/\/$/, '');
  return base || `${new URL(request.url).origin}/fenxi/data`;
}

function firstChars(text, len = 180) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, len);
}

function looksLikeHtml(text) {
  const s = String(text || '').trim().toLowerCase();
  return s.startsWith('<!doctype html') || s.startsWith('<html') || s.includes('<html');
}

export async function fetchFenxiJson(request, env, path) {
  const key = path;
  const cached = cache.get(key);
  if (isFresh(cached)) return cached.data;

  const url = `${dataBase(request, env)}/${String(path).replace(/^\//, '')}`;
  const cookie = await createFenxiCookie(env);
  const headers = { accept: 'application/json' };
  if (cookie) headers.cookie = cookie;

  const res = await fetch(url, {
    headers,
    cf: { cacheTtl: 60, cacheEverything: false }
  });

  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text();

  if (!res.ok) {
    throw new Error(
      `读取 /fenxi 数据失败：${path}，HTTP ${res.status}。返回内容：${firstChars(raw)}`
    );
  }

  if (looksLikeHtml(raw)) {
    throw new Error(
      `读取 /fenxi 数据时返回了 HTML，不是 JSON。请检查路径是否真实存在、FENXI_DATA_BASE 是否指向 /fenxi/data、Cloudflare Pages Functions 是否部署在项目根目录。请求路径：${url}。返回开头：${firstChars(raw)}`
    );
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `读取 /fenxi 数据后 JSON 解析失败：${path}。Content-Type=${contentType}。返回开头：${firstChars(raw)}`
    );
  }

  cache.set(key, { time: Date.now(), data });
  return data;
}
