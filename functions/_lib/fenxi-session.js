const COOKIE_NAME = 'ln_gateway_session';
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
const DEFAULT_ACCESS_CODE = 'ln2026';

const encoder = new TextEncoder();

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function safeString(value) {
  return String(value || '').trim();
}

function timingSafeEqual(a, b) {
  const left = safeString(a);
  const right = safeString(b);
  if (left.length !== right.length) return false;
  let out = 0;
  for (let i = 0; i < left.length; i += 1) out |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return out === 0;
}

export function getFenxiAccessCode(env = {}) {
  return safeString(
    env.FENXI_ACCESS_CODE ||
      env.LN_FENXI_ACCESS_CODE ||
      env.LN_ACCESS_CODE ||
      env.ACCESS_CODE ||
      env.FENXI_PASSWORD ||
      env.LN2026 ||
      env.ln2026 ||
      DEFAULT_ACCESS_CODE,
  );
}

export function getFenxiSessionSecret(env = {}) {
  return safeString(
    env.LN_SESSION_SECRET ||
      env.ACCESS_COOKIE_SECRET ||
      env.FENXI_SESSION_SECRET ||
      env.SESSION_SECRET ||
      env.ln2026 ||
      getFenxiAccessCode(env),
  );
}

export function hasFenxiSecret(env = {}) {
  return Boolean(getFenxiSessionSecret(env));
}

export function checkFenxiAccessCode(input, env = {}) {
  const expected = getFenxiAccessCode(env);
  return Boolean(expected) && timingSafeEqual(input, expected);
}

async function signPayload(payload, env = {}) {
  const secret = getFenxiSessionSecret(env);
  if (!secret) return '';
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toHex(sig);
}

export async function createFenxiSessionToken(env = {}, maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  const exp = Math.floor(Date.now() / 1000) + Number(maxAgeSeconds || SESSION_MAX_AGE_SECONDS);
  const payload = `v1.${exp}`;
  const sig = await signPayload(payload, env);
  if (!sig) return '';
  return `${payload}.${sig}`;
}

// Kept for existing /api/major-bands internal fetches. This returns only the Cookie header value.
export async function createFenxiCookie(env = {}, maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  const token = await createFenxiSessionToken(env, maxAgeSeconds);
  return token ? `${COOKIE_NAME}=${token}` : '';
}

export async function createFenxiSetCookie(env = {}, maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  const cookie = await createFenxiCookie(env, maxAgeSeconds);
  if (!cookie) return '';
  return `${cookie}; Path=/; Max-Age=${Number(maxAgeSeconds || SESSION_MAX_AGE_SECONDS)}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearFenxiSetCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`;
}

export function readCookie(cookieHeader = '', name = COOKIE_NAME) {
  const parts = String(cookieHeader || '').split(';');
  for (const part of parts) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (key === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return '';
}

export async function verifyFenxiSessionToken(token, env = {}) {
  const raw = safeString(token);
  const pieces = raw.split('.');
  if (pieces.length !== 3) return false;
  const [version, expText, sig] = pieces;
  if (version !== 'v1') return false;
  const exp = Number(expText);
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return false;
  const expectedSig = await signPayload(`${version}.${expText}`, env);
  return Boolean(expectedSig) && timingSafeEqual(sig, expectedSig);
}

export async function verifyFenxiCookieHeader(cookieHeader = '', env = {}) {
  const token = readCookie(cookieHeader, COOKIE_NAME);
  if (!token) return false;
  return verifyFenxiSessionToken(token, env);
}

export async function verifyFenxiRequest(request, env = {}) {
  return verifyFenxiCookieHeader(request.headers.get('cookie') || '', env);
}

export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}
