const QR_LIBRARY_URL='https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
let loader;
export async function createQrCanvas(text){
  await loadLibrary();
  if(typeof window.qrcode!=='function')return null;
  const qr=window.qrcode(0,'M');qr.addData(text);qr.make();
  const count=qr.getModuleCount(),quiet=4,scale=5;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=(count+quiet*2)*scale;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#17242d';
  for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(qr.isDark(row,col))ctx.fillRect((col+quiet)*scale,(row+quiet)*scale,scale,scale);
  return canvas;
}
function loadLibrary(){
  if(typeof window.qrcode==='function')return Promise.resolve();
  if(loader)return loader;
  loader=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=QR_LIBRARY_URL;script.async=true;script.crossOrigin='anonymous';const timer=setTimeout(()=>reject(new Error('QR timeout')),5000);script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);reject(new Error('QR unavailable'));};document.head.append(script);});
  return loader;
}
