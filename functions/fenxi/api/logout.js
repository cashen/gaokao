export function onRequestPost(){
  return new Response(JSON.stringify({ok:true}), {
    headers: {
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'Set-Cookie':'ln_gateway_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    }
  });
}
export function onRequest(){
  return new Response(JSON.stringify({ok:false, reason:'method_not_allowed'}), {status:405, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
}
