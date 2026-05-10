// Cloudflare Pages Functions middleware for V2.9.5.5
// Protects data files with a server-side cookie session while keeping the existing /fenxi UI visible.

const COOKIE_NAME = 'ln_gateway_session';

function textEncoder(){ return new TextEncoder(); }
function hex(buffer){ return [...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
function parseCookies(header){
  const out = {};
  (header || '').split(';').forEach(part=>{
    const i = part.indexOf('=');
    if(i > -1) out[part.slice(0,i).trim()] = part.slice(i+1).trim();
  });
  return out;
}
function safeEqual(a,b){
  a=String(a||''); b=String(b||'');
  if(a.length !== b.length) return false;
  let r=0;
  for(let i=0;i<a.length;i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function sign(payload, secret){
  const key = await crypto.subtle.importKey('raw', textEncoder().encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder().encode(payload));
  return hex(sig);
}
async function verifySession(request, env){
  const secret = env.LN_SESSION_SECRET || env.ACCESS_COOKIE_SECRET || '';
  if(!secret) return false;
  const token = parseCookies(request.headers.get('Cookie'))[COOKIE_NAME] || '';
  const parts = token.split('.');
  if(parts.length !== 3 || parts[0] !== 'v1') return false;
  const exp = Number(parts[1]);
  if(!Number.isFinite(exp) || exp < Math.floor(Date.now()/1000)) return false;
  const payload = `v1.${parts[1]}`;
  const expected = await sign(payload, secret);
  return safeEqual(expected, parts[2]);
}
function isProtectedDataPath(pathname){
  return pathname === '/fenxi/data' || pathname.startsWith('/fenxi/data/') || pathname === '/data' || pathname.startsWith('/data/');
}
function isAuthApiPath(pathname){
  return pathname === '/fenxi/api/login' || pathname === '/fenxi/api/logout' || pathname === '/fenxi/api/session';
}
function unauthorized(){
  return new Response(JSON.stringify({ok:false, reason:'auth_required'}), {
    status: 401,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequest(context){
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Auth endpoints must remain reachable before login.
  if(isAuthApiPath(pathname)) return context.next();

  // Keep the existing UI unchanged: index/css/js can load, but JSON data is protected.
  if(isProtectedDataPath(pathname)){
    const ok = await verifySession(context.request, context.env || {});
    if(!ok) return unauthorized();
  }

  const response = await context.next();
  if(isProtectedDataPath(pathname)){
    const headers = new Headers(response.headers);
    headers.set('Cache-Control','private, no-store');
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  }
  return response;
}
