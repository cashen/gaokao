const COOKIE_NAME='ln_gateway_session';function hex(b){return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}function getSecret(env={}){return String(env.LN_SESSION_SECRET||env.ACCESS_COOKIE_SECRET||env.FENXI_SESSION_SECRET||'')}export async function createFenxiCookie(env={}){const secret=getSecret(env);if(!secret)return'';const exp=Math.floor(Date.now()/1000)+600,payload=`v1.${exp}`;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload));return`${COOKIE_NAME}=v1.${exp}.${hex(sig)}`}


export function hasFenxiSecret(env = {}) {
  return Boolean(String(env.LN_SESSION_SECRET || env.ACCESS_COOKIE_SECRET || env.FENXI_SESSION_SECRET || ''));
}
