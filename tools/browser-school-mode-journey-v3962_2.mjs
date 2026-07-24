import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.SCHOOL_UI_BASE_URL || 'http://127.0.0.1:8765';
const artifactDir = process.env.SCHOOL_UI_ARTIFACT_DIR || '/tmp/school-mode-v3962_2';
fs.mkdirSync(artifactDir, { recursive: true });

const majors = [
  ['001','电子信息类(创新班)(电子信息工程、计算机科学与技术、未来机器人、人工智能、自动化、电气工程及其自动化、光电信息科学与工程、生物医学工程)',663,1389,148],
  ['002','人工智能(未来卓越班)',661,1592,146],
  ['003','自动化类',615,10234,100],
  ['004','计算机科学与技术',610,11880,95],
  ['005','材料类',590,18600,75],
  ['006','生物医学工程(中外合作办学)',575,23800,60]
];
const records = majors.map(([majorCode2026,major,score2026,rank2026,scoreDelta2026],index)=>({
  id:`neu-main|0141|${majorCode2026}`,school:'东北大学',major,schoolCode2026:'0141',majorCode2026,
  score2026,rank2026,score2025:index<4?score2026-2:null,score2024:index<3?score2026-4:null,scoreDelta2026,
  statusLabel:scoreDelta2026>0?'稍高目标参考':'历史位置参考',schoolTierTags:['985','211'],natureLabel:'公办',
  displayLocation:'辽宁·沈阳',projectLabel:index===5?'中外合作办学':'普通招生记录',isSinoForeign:index===5,isHighFee:index===5,
  specialProject:index===5?{hasSpecialProject:true,reviewPoints:['学费与培养方式']}:{hasSpecialProject:false},schoolEntity:{entityId:'neu-main'}
}));
const payload={
  ok:true,
  meta:{mode:'school-all',school:'东北大学',schoolEntity:{entityId:'neu-main',school:'东北大学'},filteredTotal:52,candidateScore:515,dataBoundary:'只展示该校在辽宁2026物理类投档表中的招生专业与项目，不代表该校全国全部本科专业，也不判断2027录取结果。',pagination:{hasMore:false,nextOffset:records.length}},
  summary:{minScore:575,maxScore:663,regularCount:50,specialCount:2,nearCount:4},records
};
const cases=[
  {name:'pc-1440',width:1440,height:900,maxModeHeight:165,maxCardHeight:125},
  {name:'pc-zoom-like-1024',width:1024,height:820,maxModeHeight:180,maxCardHeight:165},
  {name:'pad-820',width:820,height:1180,maxModeHeight:190,maxCardHeight:175,touch:true},
  {name:'android-412',width:412,height:915,maxModeHeight:220,maxCardHeight:230,touch:true},
  {name:'android-360-large-text',width:360,height:800,maxModeHeight:280,maxCardHeight:290,touch:true,largeText:true}
];

const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const testCase of cases){
    const context=await browser.newContext({viewport:{width:testCase.width,height:testCase.height},hasTouch:Boolean(testCase.touch),isMobile:testCase.width<=480,deviceScaleFactor:1});
    const page=await context.newPage();
    const pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)));
    await page.route('**/api/school-majors**',route=>route.fulfill({status:200,contentType:'application/json; charset=utf-8',body:JSON.stringify(payload)}));
    try{
      await page.goto(`${baseUrl}/ln-rank/?score=515`,{waitUntil:'networkidle',timeout:60000});
      if(testCase.largeText) await page.addStyleTag({content:'html{-webkit-text-size-adjust:125%} body{font-size:18px}'});
      await page.locator('#schoolKeyword').fill('东北大学');
      const mount=page.locator('#schoolViewModeMount');
      await mount.waitFor({state:'visible',timeout:15000});
      await page.evaluate(async()=>{await document.fonts?.ready;document.getElementById('schoolViewModeMount')?.scrollIntoView({block:'center'});});

      const modeMetrics=await page.evaluate(()=>{
        const doc=document.documentElement;
        const grid=document.querySelector('.search-grid-top');
        const mount=document.getElementById('schoolViewModeMount');
        const head=mount?.querySelector('.ui-mode-switch__head');
        const actions=mount?.querySelector('.ui-mode-switch__actions');
        const buttons=[...(mount?.querySelectorAll('[data-school-view-mode]')||[])];
        const box=mount?.getBoundingClientRect();
        const gridBox=grid?.getBoundingClientRect();
        const headBox=head?.getBoundingClientRect();
        const actionBox=actions?.getBoundingClientRect();
        return {
          documentOverflow:doc.scrollWidth-doc.clientWidth,
          gridOverflow:grid?grid.scrollWidth-grid.clientWidth:999,
          mountOverflow:mount?mount.scrollWidth-mount.clientWidth:999,
          mountWidth:box?.width||0,mountHeight:box?.height||999,mountLeft:box?.left||0,mountRight:box?.right||0,
          gridLeft:gridBox?.left||0,gridRight:gridBox?.right||0,
          headWidth:headBox?.width||0,headHeight:headBox?.height||999,
          actionWidth:actionBox?.width||0,
          writingModes:[head,...buttons].filter(Boolean).map(node=>getComputedStyle(node).writingMode),
          buttonTexts:buttons.map(button=>button.textContent?.trim()||''),
          buttonWidths:buttons.map(button=>button.getBoundingClientRect().width),
          buttonHeights:buttons.map(button=>button.getBoundingClientRect().height),
          buttonWhiteSpace:buttons.map(button=>getComputedStyle(button).whiteSpace),
          hidden:mount?.hidden,
          viewportHeight:window.innerHeight,
          mountTop:box?.top||0,mountBottom:box?.bottom||999
        };
      });
      assert.equal(modeMetrics.hidden,false,`${testCase.name}: mode switch stayed hidden`);
      assert.ok(modeMetrics.documentOverflow<=1,`${testCase.name}: document overflow ${modeMetrics.documentOverflow}`);
      assert.ok(modeMetrics.gridOverflow<=1,`${testCase.name}: filter grid overflow ${modeMetrics.gridOverflow}`);
      assert.ok(modeMetrics.mountOverflow<=1,`${testCase.name}: mode switch overflow ${modeMetrics.mountOverflow}`);
      assert.ok(modeMetrics.mountLeft>=modeMetrics.gridLeft-1&&modeMetrics.mountRight<=modeMetrics.gridRight+1,`${testCase.name}: mode switch escaped shared filter grid`);
      assert.ok(modeMetrics.mountWidth>=modeMetrics.actionWidth-1&&modeMetrics.headWidth>=modeMetrics.mountWidth-28,`${testCase.name}: mode content collapsed into a narrow column`);
      assert.ok(modeMetrics.mountHeight<=testCase.maxModeHeight,`${testCase.name}: mode switch too tall ${modeMetrics.mountHeight}`);
      assert.ok(modeMetrics.headHeight<=testCase.maxModeHeight/2,`${testCase.name}: heading became vertical ${modeMetrics.headHeight}`);
      assert.deepEqual(modeMetrics.buttonTexts,['按我的分数附近看','看该校全部招生专业'],`${testCase.name}: shared mode copy mismatch`);
      assert.ok(modeMetrics.writingModes.every(mode=>mode==='horizontal-tb'),`${testCase.name}: vertical writing mode ${modeMetrics.writingModes}`);
      assert.ok(modeMetrics.buttonWidths.every(width=>width>=90),`${testCase.name}: mode button collapsed ${modeMetrics.buttonWidths}`);
      assert.ok(modeMetrics.buttonHeights.every(height=>height<=70),`${testCase.name}: mode button became vertical ${modeMetrics.buttonHeights}`);
      assert.ok(modeMetrics.mountTop>=0&&modeMetrics.mountBottom<=modeMetrics.viewportHeight+1,`${testCase.name}: fixed navigation obscures centered mode switch`);

      await page.locator('[data-school-view-mode="school-all"]').click();
      await page.locator('#queryButton').click();
      await page.locator('.school-major-row').first().waitFor({state:'visible',timeout:30000});
      const resultMetrics=await page.evaluate(()=>{
        const panel=document.getElementById('schoolAllResultsPanel');
        const first=document.querySelector('.school-major-row');
        const add=first?.querySelector('[data-school-selection-action]');
        return {panelOverflow:panel?panel.scrollWidth-panel.clientWidth:999,cardOverflow:first?first.scrollWidth-first.clientWidth:999,cardHeight:first?.getBoundingClientRect().height||999,addText:add?.textContent?.trim()||'',addHeight:add?.getBoundingClientRect().height||999};
      });
      assert.ok(resultMetrics.panelOverflow<=1,`${testCase.name}: result panel overflow ${resultMetrics.panelOverflow}`);
      assert.ok(resultMetrics.cardOverflow<=1,`${testCase.name}: result card overflow ${resultMetrics.cardOverflow}`);
      assert.ok(resultMetrics.cardHeight<=testCase.maxCardHeight,`${testCase.name}: result card too tall ${resultMetrics.cardHeight}`);
      assert.equal(resultMetrics.addText,'加入已选',`${testCase.name}: compact action copy changed`);
      assert.ok(resultMetrics.addHeight<=46,`${testCase.name}: selection action too tall ${resultMetrics.addHeight}`);
      assert.deepEqual(pageErrors,[],`${testCase.name}: page errors\n${pageErrors.join('\n')}`);
      results.push({name:testCase.name,...modeMetrics,resultCardHeight:resultMetrics.cardHeight});
    }catch(error){
      await page.screenshot({path:path.join(artifactDir,`${testCase.name}-failure.png`),fullPage:true}).catch(()=>{});
      fs.writeFileSync(path.join(artifactDir,`${testCase.name}-error.txt`),String(error?.stack||error));
      throw error;
    }finally{
      await context.close();
    }
  }
}finally{
  await browser.close();
}
console.log(JSON.stringify({ok:true,contract:'school-mode-real-journey-v3962_2',cases:results},null,2));
