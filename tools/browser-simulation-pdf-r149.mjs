import { strict as assert } from 'node:assert';
import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
await page.route('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.html2canvas=async()=>{const c=document.createElement("canvas");c.width=794;c.height=1123;return c};'}));
await page.route('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.jspdf={jsPDF:class{constructor(){this.pages=1}addPage(){this.pages++}addImage(){}save(){window.__GAOKAO_PDF_SAVED__=true}output(){return new Blob(["pdf"],{type:"application/pdf"})}}};'}));
await page.route('**/api/simulation-rank**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,rank:12345,available:true})}));
await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>{localStorage.setItem('gaokao:simulation-report:v002',JSON.stringify({version:2,studentName:'测试',subjectTrack:'辽宁物理类（物化生）',totalScore:'555',rank:12345,volunteers:[{id:'pdf-1',order:1,school:'沈阳化工大学',confirmedSchool:'沈阳化工大学',majorCode:'080407',majorName:'高分子材料与工程',history:{years:{2026:{score:523,rank:34567},2025:{score:518,rank:35200},2024:{score:510,rank:36800}}},manualCheck:{},familyStatus:'候选',familyNote:''}]})});
await page.reload({waitUntil:'domcontentloaded'});
await page.locator('#wbPdf').click();
await page.waitForFunction(()=>window.__GAOKAO_PDF_SAVED__===true,{timeout:5000});
assert.equal(await page.locator('#wbPdf').textContent(),'打印 / 保存这份方案');
console.log('simulation unified PDF smoke: PASS');
await browser.close();
