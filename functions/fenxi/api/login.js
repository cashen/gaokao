const COOKIE_NAME = 'ln_gateway_session';

function textEncoder(){ return new TextEncoder(); }
function hex(buffer){ return [...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
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
async function readBody(request){
  const type = request.headers.get('content-type') || '';
  if(type.includes('application/json')) return await request.json().catch(()=>({}));
  if(type.includes('form')){
    const form = await request.formData().catch(()=>null);
    if(!form) return {};
    return Object.fromEntries(form.entries());
  }
  return {};
}
function json(data, init={}){
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type','application/json; charset=utf-8');
  headers.set('Cache-Control','no-store');
  return new Response(JSON.stringify(data), {...init, headers});
}

export async function onRequestPost({request, env}){
  const password = env.LN_ACCESS_PASSWORD || env.ACCESS_PASSWORD || '';
  const secret = env.LN_SESSION_SECRET || env.ACCESS_COOKIE_SECRET || '';
  if(!password || !secret){
    return json({ok:false, reason:'server_not_configured'}, {status:500});
  }
  const body = await readBody(request);
  const input = String(body.password || '').trim();
  if(!safeEqual(input, String(password))){
    return json({ok:false, reason:'bad_password'}, {status:401});
  }
  const daysRaw = Number(env.LN_SESSION_DAYS || env.ACCESS_SESSION_DAYS || 30);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 180) : 30;
  const maxAge = Math.floor(days * 86400);
  const exp = Math.floor(Date.now()/1000) + maxAge;
  const payload = `v1.${exp}`;
  const token = `${payload}.${await sign(payload, secret)}`;
  const headers = new Headers();
  headers.set('Content-Type','application/json; charset=utf-8');
  headers.set('Cache-Control','no-store');
  headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
  return new Response(JSON.stringify({ok:true, expiresAt: exp}), {status:200, headers});
}

export function onRequest(){
  return json({ok:false, reason:'method_not_allowed'}, {status:405});
}
