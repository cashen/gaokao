import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},locale:'zh-CN'});
await context.addInitScript(()=>{localStorage.clear();});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:4173/ln-rank/simulation-report.html',{waitUntil:'domcontentloaded',timeout:15000});
await page.waitForFunction(()=>Boolean(window.__GAOKAO_SIMULATION_PDF_V01650__),null,{timeout:10000});

const makeState=count=>({version:2,studentName:'王子铭',subjectTrack:'辽宁物理类（物化生）',totalScore:'600',rank:14235,volunteers:Array.from({length:count},(_,i)=>({id:`pdf-reg-${i+1}`,order:i+1,school:['东北大学','沈阳工业大学','沈阳化工大学','大连交通大学'][i%4],majorCode:['080801','080601','080407','080301'][i%4],majorName:['自动化','电气工程及其自动化','高分子材料与工程','机械工程'][i%4],confirmedSchool:true,familyStatus:'待讨论',familyNote:i%3===0?'回家讨论': '',history:{years:{2026:{score:560,rank:9000+i},2025:{score:552,rank:9200+i},2024:{score:548,rank:9500+i}}}}))});

for(const count of [1,2,6,10,12]){
  const pages=await page.evaluate(async state=>window.__GAOKAO_SIMULATION_PDF_V01650__.measurePages(state),makeState(count));
  if(count<=12) assert.equal(pages,1,`expected ${count} compact volunteers to fit on one A4 page, got ${pages}`);
}
const fourteen=await page.evaluate(async state=>window.__GAOKAO_SIMULATION_PDF_V01650__.measurePages(state),makeState(14));
assert.ok(fourteen>=2,`14 volunteers should paginate, got ${fourteen}`);
assert.equal(errors.length,0,errors.join('\n'));
await browser.close();
console.log('simulation-workspace-v016.50 PDF pagination: PASS');
