const COOKIE_NAME = 'ln_gateway_session';
const TTL_SECONDS = 10 * 60;
function hex(buffer) { return [...new Uint8Array(buffer)].map((b)=>b.toString(16).padStart(2,'0')).join(''); }
function getSecret(env = {}) { return env.LN_SESSION_SECRET || env.ACCESS_COOKIE_SECRET || env.FENXI_SESSION_SECRET || ''; }
async function sign(payload, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return hex(sig);
}
export async function createFenxiCookie(env = {}) {
  const secret = getSecret(env);
  if (!secret) return '';
  const exp = Math.floor(Date.now()/1000) + TTL_SECONDS;
  const payload = `v1.${exp}`;
  const sig = await sign(payload, secret);
  return `${COOKIE_NAME}=v1.${exp}.${sig}`;
}
export function hasFenxiSecret(env = {}) { return Boolean(getSecret(env)); }
