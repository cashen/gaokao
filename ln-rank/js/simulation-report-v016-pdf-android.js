const RELEASE='v016.51-r146';
const MOBILE_SCALE=1.25;
const isAndroid=/Android/i.test(navigator.userAgent||'');
let patchedCanvas=false;
let patchedSave=false;
let timer=null;

function installCanvasPatch(){
  if(!isAndroid||patchedCanvas||typeof globalThis.html2canvas!=='function')return;
  const original=globalThis.html2canvas;
  const wrapped=async (element,options={})=>original(element,{...options,scale:Math.min(Number(options.scale)||MOBILE_SCALE,MOBILE_SCALE)});
  wrapped.__gaokaoAndroidPatched=true;
  globalThis.html2canvas=wrapped;
  patchedCanvas=true;
}

function installSavePatch(){
  if(!isAndroid||patchedSave||typeof globalThis.jspdf?.jsPDF!=='function')return;
  const proto=globalThis.jspdf.jsPDF.prototype;
  if(proto.__gaokaoAndroidSavePatched)return;
  const original=proto.save;
  proto.save=function(filename='simulation.pdf'){
    try{
      const blob=this.output('blob');
      const url=URL.createObjectURL(blob);
      const open=window.open(url,'_blank','noopener');
      if(!open){
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
  patchedSave=true;
}

function tick(){
  installCanvasPatch();
  installSavePatch();
  if(patchedCanvas&&patchedSave&&timer){clearInterval(timer);timer=null;}
}

if(isAndroid){
  timer=setInterval(tick,50);
  tick();
}

globalThis.__GAOKAO_SIMULATION_PDF_ANDROID__=Object.freeze({
  release:RELEASE,
  mobile:isAndroid,
  canvasScale:MOBILE_SCALE,
  get savePatched(){return patchedSave;},
  get canvasPatched(){return patchedCanvas;}
});

export const SIMULATION_PDF_ANDROID_RELEASE=RELEASE;
