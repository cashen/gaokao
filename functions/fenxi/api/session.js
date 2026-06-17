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
  let r=0; for(let i=0;i<a.length;i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function sign(payload, secret){
  const key = await crypto.subtle.importKey('raw', textEncoder().encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder().encode(payload));
  return hex(sig);
}
async function verify(request, env){
  const secret = env.LN_SESSION_SECRET || env.ACCESS_COOKIE_SECRET || '';
  if(!secret) return {ok:false, configured:false};
  const token = parseCookies(request.headers.get('Cookie'))[COOKIE_NAME] || '';
  const parts = token.split('.');
  if(parts.length !== 3 || parts[0] !== 'v1') return {ok:false, configured:true};
  const exp = Number(parts[1]);
  if(!Number.isFinite(exp) || exp < Math.floor(Date.now()/1000)) return {ok:false, configured:true};
  const payload = `v1.${parts[1]}`;
  const expected = await sign(payload, secret);
  return {ok:safeEqual(expected, parts[2]), configured:true, expiresAt: exp};
}
export async function onRequestGet({request, env}){
  const status = await verify(request, env || {});
  return new Response(JSON.stringify(status), {headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
}
export function onRequest(){
  return new Response(JSON.stringify({ok:false, reason:'method_not_allowed'}), {status:405, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
}
