import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const runtimeModules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
async function loadPlaywright(){
  try{return await import('playwright');}
  catch(error){
    if(runtimeModules)return import(pathToFileURL(path.join(runtimeModules,'playwright','index.mjs')).href);
    throw error;
  }
}
const {chromium}=await loadPlaywright();
const BASE=process.env.AIPLUS_GEOMETRY_BASE||'http://127.0.0.1:8765';
const DIR='/tmp/aiplus-ui-geometry';
const DEVICES=[
  ['pc-1440',1440,920,false],['pad-1024',1024,768,false],
  ['android-390',390,844,true],['android-360',360,740,true]
];
fs.mkdirSync(DIR,{recursive:true});
const assert=(value,message)=>{if(!value)throw new Error(message);};

async function mount(page,name){
  await page.route('**/aiplus/app.v3990_2.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:'export {};'}));
  const response=await page.goto(`${BASE}/aiplus/?geometry=${name}`,{waitUntil:'networkidle',timeout:30000});
  assert(response?.ok(),`${name}: page ${response?.status()}`);
  await page.waitForFunction(()=>[...document.styleSheets].some(s=>String(s.href||'').includes('/aiplus/geometry.v002.css?v=002_2')));
  await page.evaluate(()=>{
    const stream=document.querySelector('#conversationStream');
    stream.innerHTML=`<article class="turn" data-turn-id="geometry">
      <div class="user-line"><div class="user-bubble">冶金工程是不是还有相近专业？</div></div>
      <div class="assistant-turn answer-surface">
        <div class="assistant-lead"><p>已有记录先保留，相近专业只做确认，不自动改掉原查询。</p></div>
        <div class="turn-understanding"><strong>本轮理解</strong><span>你问的是多个专业和一个可能存在名称歧义的冶金方向；已有记录先保留，相近专业只做确认。</span></div>
        <section class="result-card history">
          <h3>可能还要确认的相近专业</h3>
          <div class="major-suggestions">
            <strong class="major-suggestions-title">可能还要确认的相近专业</strong>
            <div class="major-suggestion">
              <span>你是不是在找“冶金工程（中外合作办学）”？</span>
              <button class="major-suggestion-button"><strong>查冶金工程（中外合作办学）</strong><span>这个学校还有名称更具体的同类专业；建议单独核验，避免和普通项目混在一起。</span></button>
            </div>
          </div>
          <div class="query-status-list">
            <strong class="query-status-title">本轮各专业查询状态</strong>
            <div class="query-status-row is-failed">
              <span class="query-status-query">冶金工程（中外合作办学与智能制造联合培养方向）</span>
              <span class="query-status-result">暂时失败：当前名称没有形成可靠的完全匹配，需要确认名称更具体的正式专业。</span>
            </div>
          </div>
          <div class="history-list">
            <article class="candidate-item history-item">
              <div class="candidate-head">
                <div class="candidate-school">沈阳航空航天大学长名称测试校区</div>
                <div class="candidate-major">机械电子工程（智能制造与工程实践联合培养方向）</div>
                <div class="candidate-location">辽宁省沈阳市浑南区</div>
              </div>
            </article>
          </div>
          <div class="background-school-actions">
            <button class="question-button background-school-prompt"><strong>大连交通大学长名称测试校区</strong><span>继续在对话里查这个学校的专业历史</span></button>
            <a class="background-school-link" href="#">查看该校全部专业</a>
          </div>
          <div class="question-list"><button class="question-button"><strong>把这些学校的机械电子工程按2026分数从高到低排一下</strong><span>继续沿着当前专业比较，不改变家庭长期条件。</span></button></div>
        </section>
      </div>
    </article>`;
  });
}

async function metrics(page){
  return page.evaluate(()=>{
    const r=el=>{const x=el.getBoundingClientRect();return{width:x.width,height:x.height,left:x.left,right:x.right};};
    const get=s=>document.querySelector(s),root=document.documentElement;
    const row=get('.major-suggestion'),copy=get('.major-suggestion>span'),action=get('.major-suggestion-button');
    const status=get('.query-status-row'),query=get('.query-status-query'),result=get('.query-status-result');
    const school=get('.candidate-school'),major=get('.candidate-major'),history=get('.result-card .history-item');
    const key=['.major-suggestion>span','.major-suggestion-button','.major-suggestion-button>span','.query-status-query','.query-status-result','.candidate-school','.candidate-major','.turn-understanding>span','.background-school-prompt','.background-school-link','.question-list .question-button strong'];
    const text=key.flatMap(selector=>[...document.querySelectorAll(selector)].map(el=>({selector,...r(el),scroll:el.scrollWidth,client:el.clientWidth,writing:getComputedStyle(el).writingMode,text:[...(el.textContent||'').trim()].length,parent:r(el.parentElement).width})));
    return{inner:innerWidth,doc:root.scrollWidth,body:document.body.scrollWidth,row:r(row),copy:r(copy),action:r(action),rowDisplay:getComputedStyle(row).display,status:r(status),query:r(query),result:r(result),historyDisplay:getComputedStyle(history).display,school:r(school),major:r(major),text};
  });
}
function verify(m,name,width){
  assert(m.doc<=m.inner+2&&m.body<=m.inner+2,`${name}: document overflow ${JSON.stringify(m)}`);
  assert(m.rowDisplay==='grid',`${name}: related-major row not grid`);
  assert(m.historyDisplay==='block',`${name}: answer history inherited drawer grid`);
  assert(m.school.width>70&&m.major.width>70,`${name}: candidate text collapsed`);
  if(width>760){
    assert(m.copy.width>=180&&m.copy.width>=m.row.width*.35,`${name}: related-major copy squeezed ${JSON.stringify(m)}`);
    assert(m.action.width<=310,`${name}: action track unbounded ${JSON.stringify(m)}`);
    assert(m.query.width>=120,`${name}: status query squeezed ${JSON.stringify(m)}`);
  }else{
    assert(m.copy.width>=m.row.width*.8&&m.action.width>=m.row.width*.8,`${name}: related-major did not stack`);
    assert(m.query.width>=m.status.width*.8&&m.result.width>=m.status.width*.8,`${name}: status did not stack`);
  }
  for(const item of m.text){
    assert(item.writing==='horizontal-tb',`${name}: writing mode drift ${JSON.stringify(item)}`);
    assert(item.scroll<=item.client+2,`${name}: text overflow ${JSON.stringify(item)}`);
    if(item.text>=6)assert(!(item.width<Math.min(76,Math.max(48,item.parent*.22))&&item.height>item.width*1.5),`${name}: one-character column ${JSON.stringify(item)}`);
  }
}

const browser=await chromium.launch({headless:true}),report=[];
try{
  for(const [name,width,height,isMobile] of DEVICES){
    const context=await browser.newContext({viewport:{width,height},isMobile,hasTouch:isMobile,locale:'zh-CN'});
    const page=await context.newPage();
    try{
      await mount(page,name);const m=await metrics(page);verify(m,name,width);
      await page.screenshot({path:path.join(DIR,`${name}.png`),fullPage:true});
      report.push({name,width,rowCopy:Math.round(m.copy.width),rowAction:Math.round(m.action.width),statusQuery:Math.round(m.query.width),statusResult:Math.round(m.result.width),doc:m.doc});
    }catch(error){await page.screenshot({path:path.join(DIR,`${name}-failure.png`),fullPage:true}).catch(()=>{});throw error;}
    finally{await context.close();}
  }
}finally{await browser.close();}
fs.writeFileSync(path.join(DIR,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({ok:true,contract:'aiplus-responsive-geometry-v0.02',report},null,2));
