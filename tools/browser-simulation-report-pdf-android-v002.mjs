import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({
  viewport:{width:390,height:844},
  isMobile:true,
  locale:'zh-CN',
  userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36'
});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded',timeout:15000});
await page.waitForFunction(()=>globalThis.__GAOKAO_SIMULATION_PDF_ANDROID__?.mobile===true,{timeout:10000});
await page.evaluate(()=>{
  globalThis.__gaokaoH2cCalls=0;
  globalThis.__gaokaoSaveCalls=0;
  globalThis.html2canvas=async (_element,options)=>{globalThis.__gaokaoH2cCalls++;globalThis.__gaokaoH2cArgs=options;return {}};
  class MockPdf {
    output(){return new Blob(['pdf'],{type:'application/pdf'});}
    save(){globalThis.__gaokaoSaveCalls++;}
  }
  globalThis.jspdf={jsPDF:MockPdf};
  window.open=()=>({closed:false});
});
await page.waitForFunction(()=>globalThis.__GAOKAO_SIMULATION_PDF_ANDROID__.canvasPatched&&globalThis.__GAOKAO_SIMULATION_PDF_ANDROID__.savePatched,{timeout:10000});
const first=await page.evaluate(async()=>{
  await globalThis.html2canvas(document.body,{scale:2});
  const pdf=new globalThis.jspdf.jsPDF();
  pdf.save('android-test.pdf');
  return {
    release:globalThis.__GAOKAO_SIMULATION_PDF_ANDROID__.release,
    canvasScale:globalThis.__GAOKAO_SIMULATION_PDF_ANDROID__.canvasScale,
    requestedScale:globalThis.__gaokaoH2cArgs?.scale,
    h2cCalls:globalThis.__gaokaoH2cCalls,
    saveCalls:globalThis.__gaokaoSaveCalls
  };
});
assert.equal(first.release,'v016.52-r147');
assert.equal(first.canvasScale,1.25);
assert.equal(first.requestedScale,1.25,'Android html2canvas scale must be capped to reduce peak memory');
assert.equal(first.h2cCalls,1);
assert.equal(first.saveCalls,0,'Android path must not fall through to the native jsPDF save implementation');

await page.evaluate(()=>{
  globalThis.html2canvas=async (_element,options)=>{globalThis.__gaokaoH2cArgs2=options;return {}};
});
await page.waitForFunction(()=>globalThis.html2canvas?.__gaokaoAndroidPatched===true,{timeout:5000});
await page.evaluate(async()=>globalThis.html2canvas(document.body,{scale:2}));
const second=await page.evaluate(()=>globalThis.__gaokaoH2cArgs2?.scale);
assert.equal(second,1.25,'late-loaded/replaced html2canvas must also receive Android-safe scale');
assert.equal(errors.length,0,errors.join('\n'));
await browser.close();
console.log('simulation-workspace-v016.57 Android PDF delivery: PASS');
