import { createFenxiCookie } from './fenxi-session.js';
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
function isFresh(item) { return item && Date.now() - item.time < CACHE_TTL_MS; }
function dataBase(request, env = {}) {
  const base = (env.FENXI_DATA_BASE || '').replace(/\/$/, '');
  return base || `${new URL(request.url).origin}/fenxi/data`;
}
export async function fetchFenxiJson(request, env, path) {
  const key = path;
  const cached = cache.get(key);
  if (isFresh(cached)) return cached.data;
  const url = `${dataBase(request, env)}/${String(path).replace(/^\//,'')}`;
  const cookie = await createFenxiCookie(env);
  const headers = { accept: 'application/json' };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(url, { headers, cf: { cacheTtl: 60, cacheEverything: false } });
  if (!res.ok) throw new Error(`读取 /fenxi 数据失败：${path} (${res.status})`);
  const data = await res.json();
  cache.set(key, { time: Date.now(), data });
  return data;
}
