import fs from 'node:fs';

const path='tools/browser-ai-workspace-v3990_1.mjs';
const source=fs.readFileSync(path,'utf8');
const oldText=`async function selectionAndModel(page,name){
  await page.evaluate(()=>localStorage.setItem('lnRank.selectionPool.lnPhysics.2026.v3951',JSON.stringify({items:[{id:'browser-1',school:'测试大学',major:'机械工程',rank2026:20000,bandKey:'near',displayLocation:'沈阳',tuition:'5200',userNote:'这段私有备注不能发给模型'}]})));
  await page.locator('.decision-support-card').evaluate(el=>el.open=true);await page.locator('#importSelection').click();await page.locator('#importStatus').filter({hasText:'已导入1项'}).waitFor({state:'visible',timeout:10000});
  assert(await page.locator('#healthBar,#modelConfig,#modelProbeResult,#probeModel').count()===0,\`${'${name}'}: engineering/model controls leaked into parent UI\`);
  const progress=(await page.locator('#decisionProgressList').innerText()).replace(/\\s+/g,' ');assert(progress.includes('志愿方案'),\`${'${name}'}: imported plan missing from decision progress\`);
}
`;
const newText=`async function selectionAndModel(page,name){
  await page.evaluate(()=>localStorage.setItem('lnRank.selectionPool.lnPhysics.2026.v3951',JSON.stringify({items:[{id:'browser-1',school:'测试大学',major:'机械工程',rank2026:20000,bandKey:'near',displayLocation:'沈阳',tuition:'5200',userNote:'这段私有备注不能发给模型'}]})));
  if(name!=='pc'){
    await page.locator('#historyToggle').click();
    await page.waitForFunction(()=>document.body.classList.contains('history-open'),null,{timeout:5000});
  }
  await page.locator('.decision-support-card').evaluate(el=>el.open=true);
  await page.locator('#historyPanel').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await page.locator('#importSelection').click();
  await page.locator('#importStatus').filter({hasText:'已导入1项'}).waitFor({state:'visible',timeout:10000});
  assert(await page.locator('#healthBar,#modelConfig,#modelProbeResult,#probeModel').count()===0,\`${'${name}'}: engineering/model controls leaked into parent UI\`);
  const progress=(await page.locator('#decisionProgressList').innerText()).replace(/\\s+/g,' ');assert(progress.includes('志愿方案'),\`${'${name}'}: imported plan missing from decision progress\`);
  if(name!=='pc'){
    await page.locator('#historyClose').click();
    await page.waitForFunction(()=>!document.body.classList.contains('history-open'),null,{timeout:5000});
  }
}
`;
const count=source.split(oldText).length-1;
if(count!==1)throw new Error(`expected one selectionAndModel target, got ${count}`);
fs.writeFileSync(path,source.replace(oldText,newText));
console.log('selection browser patch applied');
