from pathlib import Path
import re


def replace_one(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 occurrence, got {count}')
    p.write_text(text.replace(old, new, 1))


# Entry assets: preserve v0.02 / v002_4 compatibility identity, add the FDW cache subtransaction.
p = Path('aiplus/index.html')
text = p.read_text()
text = text.replace('?v=002_4&scroll=002_1', '?v=002_4&scroll=002_1&fdw=003_0')
text = text.replace('?v=002_2&core=002_4', '?v=002_2&core=002_4&fdw=003_0')
body = 'data-ai-plus-assets="aiplus-assets-v002_4" data-conversation-scroll-contract="aiplus-conversation-scroll-v0.02"'
if body not in text:
    raise RuntimeError('missing AIPLuS body transaction marker')
text = text.replace(body, 'data-ai-plus-assets="aiplus-assets-v002_4" data-ai-family-decision="aiplus-family-decision-v0.03" data-conversation-scroll-contract="aiplus-conversation-scroll-v0.02"', 1)
p.write_text(text)

# App imports get the same cache subtransaction; family-advisor must use family starters.
p = Path('aiplus/app.v3990_1.js')
text = p.read_text().replace("?v=002_4'", "?v=002_4&fdw=003_0'")
old = "const AI_PLUS_SCHOOL_MODE=['family-advisor','school-official-qa'].includes(document.body?.dataset?.aiPlus);"
if old not in text:
    raise RuntimeError('missing school-mode bug marker')
text = text.replace(old, "const AI_PLUS_SCHOOL_MODE=['school-official-qa'].includes(document.body?.dataset?.aiPlus);", 1)
p.write_text(text)

# Renderer consumes the changed workspace contract through a historical URL; bust it too.
replace_one(
    'aiplus/render.v3992_0.js',
    "/shared/ai/ai-workspace-contract.v3992_0.js?v=002_1'",
    "/shared/ai/ai-workspace-contract.v3992_0.js?v=002_1&fdw=003_0'",
    'render workspace cache URL'
)

# New topic: preserve family truth, clear only temporary query scope/focus.
replace_one(
    'shared/ai/ai-workspace-contract.v3992_0.js',
    "contextUsage:{score:workspace.examContext?.score?'remembered':'cleared',region:'remembered',major:'cleared',school:'cleared',bottomLine:'remembered'}},workspace.examContext);workspace.mainTaskId='';workspace.activeView={...workspace.activeView,id:makeId('view'),target:'candidates',majorKeywords:[],schoolNames:[],combination:'replace',sourceText:'',updatedAt:nowIso()};",
    "contextUsage:{score:workspace.examContext?.score?'remembered':'cleared',region:'cleared',major:'cleared',school:'cleared',bottomLine:'cleared'}},workspace.examContext);workspace.mainTaskId='';workspace.activeView={...workspace.activeView,id:makeId('view'),target:'candidates',regionKeys:['all'],majorKeywords:[],schoolNames:[],bottomLineMode:'all',combination:'replace',sourceText:'',updatedAt:nowIso()};",
    'new-topic temporary scope reset'
)

# Existing 1024px Pad browser journey should use the drawer, not the desktop rail.
p = Path('aiplus/workspace.v3990_1.css')
text = p.read_text()
if '@media(min-width:960px)' not in text or '@media(max-width:959px)' not in text:
    raise RuntimeError('missing FDW responsive breakpoints')
text = text.replace('@media(min-width:960px)', '@media(min-width:1101px)', 1)
text = text.replace('@media(max-width:959px)', '@media(max-width:1100px)', 1)
p.write_text(text)

# Stable UI audit now verifies the additive FDW subtransaction.
p = Path('tools/audit-aiplus-v002-ui.mjs')
text = p.read_text()
text = text.replace(
    'assert.match(html,/data-ai-plus-assets="aiplus-assets-v002_4"/);',
    'assert.match(html,/data-ai-plus-assets="aiplus-assets-v002_4"/);\nassert.match(html,/data-ai-family-decision="aiplus-family-decision-v0\\.03"/);',
    1
)
text = text.replace(
    "const geometryAsset='/aiplus/geometry.v002.css?v=002_2&core=002_4';",
    "const geometryAsset='/aiplus/geometry.v002.css?v=002_2&core=002_4&fdw=003_0';",
    1
)
text = text.replace("key==='v'||key==='scroll'", "key==='v'||key==='scroll'||key==='fdw'", 1)
marker = "assert.ok(coreEntryUrls.every(url=>url.searchParams.get('scroll')==='002_1'),`mixed conversation scroll cache transaction: ${coreEntryAssets.join(', ')}`);"
if marker not in text:
    raise RuntimeError('missing core scroll audit marker')
text = text.replace(marker, marker + "\nassert.ok(coreEntryUrls.every(url=>url.searchParams.get('fdw')==='003_0'),`mixed FDW cache transaction: ${coreEntryAssets.join(', ')}`);", 1)
old = "assert.ok(moduleAssets.every(value=>value.endsWith('?v=002_4')),`mixed module cache transaction: ${moduleAssets.join(', ')}`);"
new = "const moduleUrls=moduleAssets.map(value=>new URL(value,'https://aiplus.local'));\nassert.ok(moduleUrls.every(url=>url.searchParams.get('v')==='002_4'&&url.searchParams.get('fdw')==='003_0'),`mixed module/FDW cache transaction: ${moduleAssets.join(', ')}`);"
if old not in text:
    raise RuntimeError('missing module cache audit marker')
text = text.replace(old, new, 1)
p.write_text(text)

# Browser gate: replace engineering-health readiness with app readiness.
p = Path('tools/browser-ai-workspace-v3990_1.mjs')
text = p.read_text()
old = "async function waitForHealth(page,timeout=30000){await page.waitForFunction(()=>{const t=document.querySelector('#healthBar')?.textContent||'';return t.includes('顾问可用')||t.includes('确定性查询仍可用');},null,{timeout});}"
new = "async function waitForAppReady(page,timeout=30000){await page.waitForFunction(()=>document.querySelector('#promptInput')&&document.querySelector('#sendButton')&&document.body?.dataset?.aiPlus==='family-advisor',null,{timeout});}"
if old not in text:
    raise RuntimeError('missing browser health wait')
text = text.replace(old, new, 1).replace('waitForHealth(page)', 'waitForAppReady(page)')

# Test isolation now creates another family profile; new-topic semantics get their own assertion.
pattern = r"async function openNewWorkspace\(page,selector='#newWorkspace'\)\{.*?\}\nasync function reset\(page\)\{await openNewWorkspace\(page\);\}"
replacement = '''async function openNewTopic(page){
  const hadTurns=(await turnCount(page))>0;let dialogSeen=false;
  if(hadTurns)page.once('dialog',async dialog=>{dialogSeen=true;await dialog.accept();});
  const before=await turnCount(page);await page.locator('#newWorkspace').click();await page.waitForTimeout(250);
  assert((await turnCount(page))===before,'new topic must preserve prior family conversation evidence');
  if(hadTurns)assert(dialogSeen,'new topic confirmation missing');
}
async function openNewFamilyProfile(page){
  const hadTurns=(await turnCount(page))>0;let dialogSeen=false;
  if(hadTurns)page.once('dialog',async dialog=>{dialogSeen=true;await dialog.accept();});
  await page.locator('#newFamilyProfile').evaluate(el=>el.click());await page.waitForTimeout(300);
  assert((await turnCount(page))===0,'new family profile did not start an independent conversation');
  if(hadTurns)assert(dialogSeen,'new family profile confirmation missing');
}
async function reset(page){await openNewFamilyProfile(page);}'''
text, n = re.subn(pattern, replacement, text, count=1, flags=re.S)
if n != 1:
    raise RuntimeError(f'new-topic browser helper patch count {n}')

# Explicit family conditions must persist across reload and survive a new topic.
pattern = r"async function profilePersistence\(page,name\)\{.*?\n\}"
replacement = '''async function profilePersistence(page,name){
  if(name!=='pc')return;
  await submitTurn(page,'普通家庭，更看重本科就业，不想把读研当必选项');
  assert(await turnCount(page)>=1,`${name}: profile turn missing`);
  await submitTurn(page,'不接受倒班');await submitTurn(page,'编程可以接受');
  const profileBefore=(await page.locator('#decisionProfileSummary').innerText()).replace(/\\s+/g,' ');
  assert(profileBefore.includes('就业')&&profileBefore.includes('倒班')&&profileBefore.includes('编程'),`${name}: family profile not visible: ${profileBefore}`);
  await page.reload({waitUntil:'networkidle'});await waitForAppReady(page);
  const profileAfter=(await page.locator('#decisionProfileSummary').innerText()).replace(/\\s+/g,' ');
  assert(profileAfter.includes('就业')&&profileAfter.includes('倒班')&&profileAfter.includes('编程'),`${name}: explicit family profile not persisted: ${profileAfter}`);
  const beforeTurns=await turnCount(page);await openNewTopic(page);
  assert(await turnCount(page)===beforeTurns,`${name}: new topic lost family conversation evidence`);
  const profileTopic=(await page.locator('#decisionProfileSummary').innerText()).replace(/\\s+/g,' ');
  assert(profileTopic.includes('倒班')&&profileTopic.includes('编程'),`${name}: new topic lost confirmed family conditions`);
  const view=await viewText(page);assert(!view.includes('机械')&&!view.includes('沈阳')&&!view.includes('大连'),`${name}: new topic retained temporary query focus: ${view}`);
}'''
text, n = re.subn(pattern, replacement, text, count=1, flags=re.S)
if n != 1:
    raise RuntimeError(f'profilePersistence patch count {n}')

# Stable browser identity + additive FDW capability/cache identity.
old = '''assert(assetVersion==='aiplus-assets-v002_4',`AIPLuS asset version drift: ${assetVersion}`);const assetHrefs=await page.locator('link[rel="stylesheet"],script[type="module"]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')||node.getAttribute('src')||''));assert(assetHrefs.every(href=>href.includes('002_4')||href.includes('geometry.v002.css?v=002_2&core=002_4')),`stale AIPLuS asset query remains: ${JSON.stringify(assetHrefs)}`);'''
new = '''assert(assetVersion==='aiplus-assets-v002_4',`AIPLuS asset version drift: ${assetVersion}`);assert(await page.locator('body').getAttribute('data-ai-family-decision')==='aiplus-family-decision-v0.03','FDW capability identity missing');const assetHrefs=await page.locator('link[rel="stylesheet"],script[type="module"]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')||node.getAttribute('src')||''));assert(assetHrefs.every(href=>href.includes('fdw=003_0')),`FDW cache subtransaction missing: ${JSON.stringify(assetHrefs)}`);'''
if old not in text:
    raise RuntimeError('missing parent entry asset assertion')
text = text.replace(old, new, 1)

# Family advisor starters replace the accidental school-only starter mode.
pattern = r"  const score=page\.locator\('#starterScore'\),apply=page\.locator\('#starterScoreApply'\);\n  const assertSchoolStarters=.*?\n  for\(const value of \['440','580','620','650'\]\)\{.*?\}\n"
replacement = '''  const score=page.locator('#starterScore'),apply=page.locator('#starterScoreApply');
  const initial=(await page.locator('#starterScenarios').innerText()).replace(/\\s+/g,' ');assert(initial.includes('先输入一个大概分数'),`family advisor should not start in school-only mode: ${initial}`);
  await score.fill('580');await apply.click();const familyStarters=(await page.locator('#starterScenarios').innerText()).replace(/\\s+/g,' ');
  assert(familyStarters.includes('本科就业优先')&&familyStarters.includes('211中外'),`580 family starters missing: ${familyStarters}`);
  assert(!familyStarters.includes('先把学校看懂'),`school-only starter leaked into family advisor: ${familyStarters}`);
'''
text, n = re.subn(pattern, replacement, text, count=1, flags=re.S)
if n != 1:
    raise RuntimeError(f'parent starter browser patch count {n}')

# Selection import proves plan progress; engineering/model controls must not exist in the parent UI.
pattern = r"async function selectionAndModel\(page,name\)\{.*?\n\}"
replacement = '''async function selectionAndModel(page,name){
  await page.evaluate(()=>localStorage.setItem('lnRank.selectionPool.lnPhysics.2026.v3951',JSON.stringify({items:[{id:'browser-1',school:'测试大学',major:'机械工程',rank2026:20000,bandKey:'near',displayLocation:'沈阳',tuition:'5200',userNote:'这段私有备注不能发给模型'}]})));
  await page.locator('.decision-support-card').evaluate(el=>el.open=true);await page.locator('#importSelection').click();await page.locator('#importStatus').filter({hasText:'已导入1项'}).waitFor({state:'visible',timeout:10000});
  assert(await page.locator('#healthBar,#modelConfig,#modelProbeResult,#probeModel').count()===0,`${name}: engineering/model controls leaked into parent UI`);
  const progress=(await page.locator('#decisionProgressList').innerText()).replace(/\\s+/g,' ');assert(progress.includes('志愿方案'),`${name}: imported plan missing from decision progress`);
}'''
text, n = re.subn(pattern, replacement, text, count=1, flags=re.S)
if n != 1:
    raise RuntimeError(f'selectionAndModel patch count {n}')

old = "await waitForAppReady(page);assert(await page.locator('#decisionContextDetails').evaluate(el=>!el.open),`${device.name}: engineering/support panel should default collapsed`);"
new = "await waitForAppReady(page);assert(await page.locator('#decisionProgressList .decision-progress-item').count()===6,`${device.name}: six-stage decision progress missing`);assert(await page.locator('#healthBar,#modelConfig,#modelProbeResult,#probeModel,#decisionContextDetails').count()===0,`${device.name}: engineering UI leaked into workbench`);"
if old not in text:
    raise RuntimeError('missing top-level engineering UI assertion')
text = text.replace(old, new, 1)
text = text.replace("'support-panel-collapsed'", "'six-stage-decision-progress'")
text = text.replace("'live-model-probe-pc'", "'engineering-ui-absent'")
p.write_text(text)

# Permanent FDW source verifier owns cache/new-topic invariants too.
p = Path('tools/verify-aiplus-family-decision-workbench-v003.mjs')
text = p.read_text()
marker = "ok(html.includes('id=\"mobileDecisionStrip\"'),'mobile must expose the same decision state through a compact entry');"
if marker not in text:
    raise RuntimeError('missing FDW UI verifier marker')
text = text.replace(marker, marker + "\nok(html.includes('data-ai-family-decision=\"aiplus-family-decision-v0.03\"'),'FDW capability identity must be visible');\nok(html.includes('fdw=003_0'),'FDW entry assets must carry the cache subtransaction');", 1)
marker2 = "eq(topicNext.activeView.schoolNames,[],'new topic clears temporary school focus');"
if marker2 not in text:
    raise RuntimeError('missing FDW topic verifier marker')
text = text.replace(marker2, marker2 + "\neq(topicNext.activeView.regionKeys,['all'],'new topic clears temporary region view');\neq(topicNext.activeView.bottomLineMode,'all','new topic clears temporary project-scope view');", 1)
p.write_text(text)

print('FDW browser/cache patcher completed')
