const RELEASE='v016.52-r147';
const MOBILE_SCALE=1.25;
const isAndroid=/Android/i.test(navigator.userAgent||'');
let timer=null;
let stopTimer=null;

function installCanvasPatch(){
  if(!isAndroid||typeof globalThis.html2canvas!=='function'||globalThis.html2canvas.__gaokaoAndroidPatched)return;
  const original=globalThis.html2canvas;
  const wrapped=async (element,options={})=>original(element,{...options,scale:Math.min(Number(options.scale)||MOBILE_SCALE,MOBILE_SCALE)});
  wrapped.__gaokaoAndroidPatched=true;
  globalThis.html2canvas=wrapped;
}

function installSavePatch(){
  if(!isAndroid||typeof globalThis.jspdf?.jsPDF!=='function')return;
  const proto=globalThis.jspdf.jsPDF.prototype;
  if(proto.__gaokaoAndroidSavePatched)return;
  const original=proto.save;
  proto.save=function(filename='simulation.pdf'){
    try{
      const blob=this.output('blob');
      const url=URL.createObjectURL(blob);
      let opened=false;
      try{opened=Boolean(window.open(url,'_blank','noopener'));}catch{}
      if(!opened){
        window.location.assign(url);
      }else{
        setTimeout(()=>URL.revokeObjectURL(url),60000);
      }
      return this;
    }catch(error){
      try{return original.call(this,filename)}catch{return this}
    }
  };
  proto.__gaokaoAndroidSavePatched=true;
}

function tick(){
  installCanvasPatch();
  installSavePatch();
}

if(isAndroid){
  timer=setInterval(tick,50);
  stopTimer=setTimeout(()=>{if(timer)clearInterval(timer);timer=null;},30000);
  tick();
}

globalThis.__GAOKAO_SIMULATION_PDF_ANDROID__=Object.freeze({
  release:RELEASE,
  mobile:isAndroid,
  canvasScale:MOBILE_SCALE,
  get savePatched(){return Boolean(globalThis.jspdf?.jsPDF?.prototype?.__gaokaoAndroidSavePatched);},
  get canvasPatched(){return Boolean(globalThis.html2canvas?.__gaokaoAndroidPatched);}
});

export const SIMULATION_PDF_ANDROID_RELEASE=RELEASE;
