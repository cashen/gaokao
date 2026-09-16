import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({
  viewport:{width:390,height:844},
  isMobile:true,
  locale:'zh-CN',
  userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36'
});
await context.addInitScript(()=>{
  globalThis.__gaokaoH2cArgs=null;
  globalThis.__gaokaoSaveCalls=0;
  globalThis.html2canvas=async (_element,options)=>{globalThis.__gaokaoH2cArgs=options;return {}};
  class MockPdf {
    output(){return new Blob(['pdf'],{type:'application/pdf'});}
    save(){globalThis.__gaokaoSaveCalls++;}
  }
  globalThis.jspdf={jsPDF:MockPdf};
  window.open=()=>({closed:false});
});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded',timeout:15000});
await page.waitForFunction(()=>globalThis.__GAOKAO_SIMULATION_PDF_ANDROID__?.canvasPatched&&globalThis.__GAOKAO_SIMULATION_PDF_ANDROID__?.savePatched,{timeout:10000});
const result=await page.evaluate(async()=>{
  await globalThis.html2canvas(document.body,{scale:2});
  const pdf=new globalThis.jspdf.jsPDF();
  pdf.save('android-test.pdf');
  return {
    release:globalThis.__GAOKAO_SIMULATION_PDF_ANDROID__.release,
    canvasScale:globalThis.__GAOKAO_SIMULATION_PDF_ANDROID__.canvasScale,
    requestedScale:globalThis.__gaokaoH2cArgs?.scale,
    saveCalls:globalThis.__gaokaoSaveCalls
  };
});
assert.equal(result.release,'v016.51-r146');
assert.equal(result.canvasScale,1.25);
assert.equal(result.requestedScale,1.25,'Android html2canvas scale must be capped to reduce peak memory');
assert.equal(result.saveCalls,0,'Android path must not fall through to the native jsPDF save implementation');
assert.equal(errors.length,0,errors.join('\n'));
await browser.close();
console.log('simulation-workspace-v016.56 Android PDF delivery: PASS');
