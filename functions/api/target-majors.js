const DEFAULT_UPPER_DELTA = 10;
const DEFAULT_LOWER_DELTA = 25;
const DEFAULT_VISIBLE_LIMIT = 300;
const CACHE_TTL_MS = 5 * 60 * 1000;

const COOKIE_NAME = 'ln_gateway_session';
const DEFAULT_SESSION_TTL_SECONDS = 10 * 60;

let manifestCache = null;
const chunkCache = new Map();

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeKeyword(value) {
  return text(value).replace(/\s+/g, '').toLowerCase();
}

function getEnv(env, name, fallback = '') {
  return text(env && env[name]) || fallback;
}

function getFenxiSessionSecret(env) {
  return (
    getEnv(env, 'LN_SESSION_SECRET', '') ||
    getEnv(env, 'ACCESS_COOKIE_SECRET', '') ||
    getEnv(env, 'FENXI_SESSION_SECRET', '')
  );
}

function getDataBase(request, env) {
  const configured = getEnv(env, 'FENXI_DATA_BASE', '');
  if (configured) return configured.replace(/\/$/, '');

  const origin = new URL(request.url).origin;
  return `${origin}/fenxi/data`;
}

function buildFenxiUrl(request, env, path) {
  const base = getDataBase(request, env);
  const cleanPath = String(path || '')
    .replace(/^\/?fenxi\/data\//, '')
    .replace(/^\/?data\//, '')
    .replace(/^\//, '');

  return new URL(`${base}/${cleanPath}`, request.url);
}

function hex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function signSessionPayload(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );

  return hex(sig);
}

async function createFenxiCookie(env) {
  const secret = getFenxiSessionSecret(env);
  if (!secret) return '';

  const exp = Math.floor(Date.now() / 1000) + DEFAULT_SESSION_TTL_SECONDS;
  const payload = `v1.${exp}`;
  const sig = await signSessionPayload(payload, secret);

  return `${COOKIE_NAME}=v1.${exp}.${sig}`;
}

async function buildFenxiHeaders(request, env) {
  const headers = {
    accept: 'application/json'
  };

  const signedCookie = await createFenxiCookie(env);

  if (signedCookie) {
    headers.cookie = signedCookie;
    return headers;
  }

  // 兜底：如果用户浏览器本身已经登录过 /fenxi，则可以转发现有 cookie。
  // 但正式部署建议配置 LN_SESSION_SECRET 或 ACCESS_COOKIE_SECRET。
  const incomingCookie = request.headers.get('Cookie');
  if (incomingCookie) {
    headers.cookie = incomingCookie;
  }

  return headers;
}

async function fetchFenxiJson(request, env, path) {
  const url = buildFenxiUrl(request, env, path);
  const headers = await buildFenxiHeaders(request, env);

  const res = await fetch(url.toString(), {
    headers,
    cf: { cacheTtl: 60, cacheEverything: false }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const detail = body ? `：${body.slice(0, 160)}` : '';
    throw new Error(`读取 /fenxi 数据失败：${path} (${res.status})${detail}`);
  }

  return res.json();
}

function isCacheFresh(item) {
  return item && Date.now() - item.time < CACHE_TTL_MS;
}

async function loadManifest(request, env) {
  if (isCacheFresh(manifestCache)) return manifestCache.data;
  const data = await fetchFenxiJson(request, env, 'manifest.json');
  manifestCache = { time: Date.now(), data };
  return data;
}

async function loadChunk(request, env, chunk) {
  if (!chunk || !chunk.file) return [];
  const key = chunk.file;
  const cached = chunkCache.get(key);
  if (isCacheFresh(cached)) return cached.data;

  const data = await fetchFenxiJson(request, env, chunk.file);
  const records = Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : []);
  chunkCache.set(key, { time: Date.now(), data: records });
  return records;
}

function getScore(record) {
  return toNumber(record.score2025 ?? record.minScore ?? record.score ?? record['最低分']);
}

function getRank(record) {
  return toNumber(record.rank2025 ?? record.minRank ?? record.rank ?? record['最低位次']);
}

function getSchool(record) {
  return text(record.school ?? record.schoolName ?? record['院校名称'] ?? record['学校名称']);
}

function getMajor(record) {
  return text(record.major ?? record.majorName ?? record['专业名称']);
}

function getRegionText(record) {
  const lnArea = text(record.lnArea);
  const province = text(record.schoolProvince ?? record.province ?? record['省份']);
  const city = text(record.schoolCity ?? record.city ?? record['城市']);
  return [lnArea, province, city].filter(Boolean).join(' · ') || '地区待核验';
}

function classify(score, targetScore) {
  const delta = score - targetScore;
  if (delta >= 1 && delta <= DEFAULT_UPPER_DELTA) return 'upper';
  if (delta <= 0 && delta >= -10) return 'near';
  if (delta <= -11 && delta >= -DEFAULT_LOWER_DELTA) return 'lower';
  return 'outside';
}

function matchRegion(record, region) {
  const lnArea = text(record.lnArea);
  if (!region || region === 'all') return true;
  if (region === 'ln') return lnArea && lnArea !== '省外';
  if (region === 'outside') return lnArea === '省外';
  if (region === 'shenyang') return lnArea === '沈阳';
  if (region === 'dalian') return lnArea === '大连';
  if (region === 'ln-other') return lnArea === '辽宁其他';
  return true;
}

function matchKeyword(record, schoolKeyword, majorKeyword) {
  const schoolKey = normalizeKeyword(schoolKeyword);
  const majorKey = normalizeKeyword(majorKeyword);
  const school = normalizeKeyword(getSchool(record));
  const major = normalizeKeyword(getMajor(record));

  if (schoolKey && !school.includes(schoolKey)) return false;
  if (majorKey && !major.includes(majorKey)) return false;
  return true;
}

function normalizeRecord(record, targetScore) {
  const score = getScore(record);
  const rank = getRank(record);
  const group = Number.isFinite(score) ? classify(score, targetScore) : 'outside';

  return {
    id: text(record.id) || `${getSchool(record)}-${getMajor(record)}-${score}-${rank}`,
    school: getSchool(record),
    major: getMajor(record),
    score,
    rank,
    scoreDelta: Number.isFinite(score) ? score - targetScore : null,
    group,
    region: getRegionText(record),
    nature: text(record.schoolNatureLabel),
    status: text(record.status),
    tuition: text(record.tuition2025),
    flags: Array.isArray(record.riskFlags) ? record.riskFlags.slice(0, 4) : []
  };
}

function sortGroup(records, group) {
  return records.sort((a, b) => {
    const da = Math.abs(a.scoreDelta || 0);
    const db = Math.abs(b.scoreDelta || 0);

    if (group === 'upper') {
      return (a.scoreDelta - b.scoreDelta) || (a.rank || 0) - (b.rank || 0);
    }

    return da - db || (a.rank || 0) - (b.rank || 0);
  });
}

function sanitizeString(value, maxLen = 50) {
  return text(value).slice(0, maxLen);
}

async function queryMajors(request, env) {
  const url = new URL(request.url);
  const subject = sanitizeString(url.searchParams.get('subject') || 'physics', 20);
  const targetScore = Math.round(Number(url.searchParams.get('targetScore') || 500));
  const region = sanitizeString(url.searchParams.get('region') || 'all', 20);
  const schoolKeyword = sanitizeString(url.searchParams.get('schoolKeyword') || '', 40);
  const majorKeyword = sanitizeString(url.searchParams.get('majorKeyword') || '', 40);

  if (!Number.isFinite(targetScore)) {
    return json({ ok: false, message: '目标分格式不正确。' }, 400);
  }

  if (subject !== 'physics') {
    return json({
      ok: true,
      unsupported: true,
      subjectKey: subject,
      targetScore,
      groups: { upper: [], near: [], lower: [] },
      total: 0,
      message: '当前 /fenxi 专业数据以物理类为主，历史类暂不展示专业池。'
    });
  }

  const lowerScore = targetScore - DEFAULT_LOWER_DELTA;
  const upperScore = targetScore + DEFAULT_UPPER_DELTA;

  const manifest = await loadManifest(request, env);
  const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
  const lists = await Promise.all(chunks.map((chunk) => loadChunk(request, env, chunk)));

  const groups = { upper: [], near: [], lower: [] };

  for (const raw of lists.flat()) {
    const score = getScore(raw);
    if (!Number.isFinite(score)) continue;
    if (score < lowerScore || score > upperScore) continue;
    if (!matchRegion(raw, region)) continue;
    if (!matchKeyword(raw, schoolKeyword, majorKeyword)) continue;

    const record = normalizeRecord(raw, targetScore);
    if (record.group === 'outside') continue;
    groups[record.group].push(record);
  }

  Object.keys(groups).forEach((key) => {
    sortGroup(groups[key], key);
    groups[key] = groups[key].slice(0, DEFAULT_VISIBLE_LIMIT);
  });

  const total = groups.upper.length + groups.near.length + groups.lower.length;
  const secretConfigured = Boolean(getFenxiSessionSecret(env));

  return json({
    ok: true,
    unsupported: false,
    subjectKey: subject,
    targetScore,
    rankWindow: {
      targetScore,
      upperScore,
      lowerScore,
      rankMin: null,
      rankMax: null,
      source: 'score-window-server-filter'
    },
    filters: { region, schoolKeyword, majorKeyword },
    groups,
    total,
    source: {
      manifestVersion: manifest.version || '',
      totalRecords: manifest.totalRecords || null,
      mode: 'cloudflare-pages-function-cookie-session',
      sessionCookie: secretConfigured ? 'server-signed' : 'forwarded-browser-cookie'
    }
  });
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'access-control-allow-methods': 'GET, OPTIONS' }
    });
  }

  if (context.request.method !== 'GET') {
    return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  }

  try {
    return await queryMajors(context.request, context.env || {});
  } catch (error) {
    return json({
      ok: false,
      message: error && error.message ? error.message : String(error),
      hint: '请确认 Cloudflare Pages 环境变量里已配置 LN_SESSION_SECRET 或 ACCESS_COOKIE_SECRET，并且它与 /fenxi 的 _middleware.js 使用同一个值。FENXI_DATA_BASE 可留空，默认读取同站 /fenxi/data。'
    }, 500);
  }
}
