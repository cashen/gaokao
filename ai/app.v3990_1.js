import {
  createAiWorkspace,
  applyAiWorkspaceEvent,
  compactAiWorkspaceForServer,
  activeViewLabel,
  AI_WORKSPACE_CONTRACT_VERSION
} from '/shared/ai/ai-workspace-contract.v3990_1.js?v=3990_1';

// Keep the original IndexedDB name so existing v3990_0 workspaces migrate in-place.
const DB_NAME = 'gaokao-ai-workspace-v3990_0';
const STORE_NAME = 'workspace';
const WORKSPACE_KEY = 'current';
const SELECTION_POOL_KEY = 'lnRank.selectionPool.lnPhysics.2026.v3951';

let workspace = createAiWorkspace();
let pendingCommand = null;
let pendingInput = '';
let activeTurnController = null;
let activeTurnSequence = 0;

const $ = selector => document.querySelector(selector);
const els = {
  taskList:$('#taskList'), resultStream:$('#resultStream'), constraintList:$('#constraintList'), pendingList:$('#pendingList'), evidenceList:$('#evidenceList'),
  form:$('#promptForm'), input:$('#promptInput'), send:$('#sendButton'), stop:$('#stopButton'), starter:$('#starterPanel'), health:$('#healthBar'),
  activeViewBar:$('#activeViewBar'), activeViewChips:$('#activeViewChips'), modelConfig:$('#modelConfig'), modelProbeResult:$('#modelProbeResult'), probeModel:$('#probeModel'),
  importSelection:$('#importSelection'), importStatus:$('#importStatus'), newWorkspace:$('#newWorkspace'), exportWorkspace:$('#exportWorkspace'),
  confirmDialog:$('#confirmDialog'), confirmText:$('#confirmText'), confirmApply:$('#confirmApply')
};

function node(tag,className='',text=''){ const element=document.createElement(tag); if(className) element.className=className; if(text) element.textContent=text; return element; }
function safeHref(value){ const text=String(value||'').trim(); if(text.startsWith('/')) return text; try{ const url=new URL(text); return url.protocol==='https:'?url.toString():''; }catch{return '';} }
function regionText(values=[]){
  const list=Array.isArray(values)?values:[];
  if(!list.length||list.includes('all')) return '全国';
  return list.map(key=>String(key).startsWith('province:')?String(key).slice(9):({outside:'省外',ln:'辽宁省内',jiangzhehu:'江浙沪',huazhong:'华中',southwest:'西南',northwest:'西北'}[key]||key)).join('、');
}
function bottomLineText(value){ return ({all:'全部项目性质',public_first:'公办优先',public_regular_only:'公办普通项目',public_include_sino:'公办含中外合作'})[value]||value||'全部项目性质'; }

function openDb(){ return new Promise((resolve,reject)=>{ const request=indexedDB.open(DB_NAME,1); request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME);}; request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); }); }
async function loadWorkspace(){
  try{ const db=await openDb(); const value=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readonly');const request=tx.objectStore(STORE_NAME).get(WORKSPACE_KEY);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});db.close(); workspace=createAiWorkspace(value||{}); if(value?.contractVersion!==AI_WORKSPACE_CONTRACT_VERSION) await saveWorkspace(); }
  catch{ workspace=createAiWorkspace(); }
}
async function saveWorkspace(){ try{const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readwrite');tx.objectStore(STORE_NAME).put(workspace,WORKSPACE_KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();}catch{} }

function promptButton(label,prompt,className=''){ const button=node('button',className,label);button.type='button';button.addEventListener('click',()=>{els.input.value=prompt;executeTurn(prompt);});return button; }

function renderHistory(){
  els.taskList.replaceChildren();
  const current=node('div','task-item is-main'); current.append(node('b','','当前 · '+activeViewLabel(workspace.activeView)),node('small','','正在观察的范围')); els.taskList.append(current);
  const history=workspace.viewHistory||[];
  if(!history.length){ els.taskList.append(node('p','muted','你切换专业、地区或范围后，上一批会留在这里。')); return; }
  history.slice(0,10).forEach((view,index)=>{ const button=node('button','task-item');button.type='button';button.append(node('b','',activeViewLabel(view)),node('small','',index===0?'上一批':'更早'));button.addEventListener('click',()=>executeTurn(index===0?'回到上一批':`回到刚才 ${activeViewLabel(view)} 那批`));els.taskList.append(button); });
}
function renderActiveView(){
  const view=workspace.activeView||{}; const has=Boolean(view.score||(view.majorKeywords||[]).length||((view.regionKeys||[]).length&&!view.regionKeys.includes('all'))||view.bottomLineMode!=='all');
  els.activeViewBar.hidden=!has; els.activeViewChips.replaceChildren(); if(!has)return;
  if(view.score) els.activeViewChips.append(node('span','view-chip',`${view.score}分 · 辽宁物理类`));
  const region=regionText(view.regionKeys); const regionChip=promptButton(region,region==='全国'?'只看省内':'回到全国看看','view-chip actionable'); els.activeViewChips.append(regionChip);
  if((view.majorKeywords||[]).length){ for(const major of view.majorKeywords) els.activeViewChips.append(node('span','view-chip',major)); els.activeViewChips.append(promptButton('× 专业不限','先不限专业看看','view-chip actionable subtle')); }
  els.activeViewChips.append(promptButton(bottomLineText(view.bottomLineMode),view.bottomLineMode==='all'?'只看公办普通项目':'学校性质不限，都可以看','view-chip actionable'));
}
function renderConstraints(){
  els.constraintList.replaceChildren();
  const entries=[];
  for(const item of workspace.hardConstraints||[]){ const values=item.key.startsWith('region')?regionText(item.values||[]):(item.values||[]).join(' / ');entries.push({label:item.label||item.key,text:values}); }
  if(workspace.selectionSnapshot?.items?.length) entries.push({label:'已导入家庭方案',text:`${workspace.selectionSnapshot.items.length}项只读快照`});
  if(!entries.length){els.constraintList.append(node('p','muted','这里仅保存真正的家庭长期底线。临时说“看安徽/看省内”不会写进这里。'));return;}
  for(const entry of entries){const box=node('div','constraint-chip');box.append(node('strong','',entry.label),node('span','',entry.text));els.constraintList.append(box);}
}
function renderPending(){ els.pendingList.replaceChildren();const items=workspace.pendingChecks||[];if(!items.length){els.pendingList.append(node('p','muted','目前没有新增待核验事项。'));return;}for(const item of items)els.pendingList.append(node('div','pending-item',item.text||String(item))); }
function renderEvidenceAside(){ els.evidenceList.replaceChildren();const items=workspace.evidence||[];if(!items.length){els.evidenceList.append(node('p','muted','需要核验事实时，这里只出现受控官方入口。'));return;}for(const item of items.slice(0,8)){const box=node('div','evidence-item');const href=safeHref(item.sourceUrl);if(href){const link=node('a','',item.sourceName||'官方来源');link.href=href;link.target='_blank';link.rel='noopener noreferrer';box.append(link);}box.append(node('small','',`${item.level||'A'}级 · ${item.scope||'核验入口'}`));els.evidenceList.append(box);} }
function countGrid(counts={}){ const grid=node('div','count-grid');for(const [key,label] of [['upper','稍高目标'],['near','主要参考'],['steady','低分侧'],['total','合计']]){const card=node('div','count-card');card.append(node('b','',Number(counts[key]||0).toLocaleString('zh-CN')),node('span','',label));grid.append(card);}return grid; }
function candidateList(records=[]){const list=node('div','candidate-list');for(const record of records.slice(0,18)){const item=node('div','candidate-item');item.append(node('b','',record.school||record.schoolName||'学校待核'),node('span','',record.major||record.majorName||'专业待核'),node('small','',`${record.bandKey||record.band||''}${record.rank2026?` · ${Number(record.rank2026).toLocaleString('zh-CN')}位`:''}`));list.append(item);}return list;}

function renderComparison(block,box){
  const grid=node('div','comparison-grid');
  for(const item of block.items||[]){const card=node('article','comparison-card');card.append(node('h4','',item.label||'比较对象'),countGrid(item.counts||{}));const facts=[];if(item.reachableSchoolCount)facts.push(`当前预览覆盖学校 ${item.reachableSchoolCount} 所`);if(item.reachableMajorCount)facts.push(`当前预览覆盖专业 ${item.reachableMajorCount} 个`);if(item.sampleSchools?.length)facts.push(`学校样本：${item.sampleSchools.join('、')}`);if(item.sampleMajors?.length)facts.push(`专业样本：${item.sampleMajors.join('、')}`);for(const text of facts)card.append(node('p','comparison-fact',text));grid.append(card);}box.append(grid);
  if(block.comparableDimensions?.length)box.append(node('p','muted',`本轮可比：${block.comparableDimensions.join('、')}`));
  if(block.pendingEvidenceDimensions?.length)box.append(node('p','muted',`未强行比较：${block.pendingEvidenceDimensions.join('、')}`));
}
function renderBlock(block){
  const type=block?.type||'plain';const classMap={task_header:'task-header',fact_summary:'fact',delta:'delta',clarification:'warning',evidence:'evidence',pending_checks:'warning',inheritance:'inheritance'};const box=node('section',`block ${classMap[type]||''}`);if(block.title)box.append(node('h3','',block.title));if(block.subtitle)box.append(node('p','',block.subtitle));if(block.text)box.append(node('p','',block.text));
  if(type==='active_view'){const view=block.view||{};const chips=node('div','view-chips');if(view.score)chips.append(node('span','view-chip',`${view.score}分`));chips.append(node('span','view-chip',view.regionLabel||'全国'));for(const major of view.majorKeywords||[])chips.append(node('span','view-chip',major));if(view.schoolNames?.length)for(const school of view.schoolNames)chips.append(node('span','view-chip',school));chips.append(node('span','view-chip',bottomLineText(view.bottomLineMode)));box.append(chips);}
  if(type==='candidate_routes'){box.append(countGrid(block.counts||{}));if(block.records?.length)box.append(candidateList(block.records));}
  if(type==='comparison')renderComparison(block,box);
  if(type==='delta'){const list=node('div','delta-list');for(const [key,value] of Object.entries(block.delta?.countChanges||{})){const labels={upper:'稍高目标',near:'主要参考',steady:'低分侧',total:'合计'};list.append(node('div','delta-line',`${labels[key]||key}：${value.before} → ${value.after}（${value.delta>0?'+':''}${value.delta}）`));}if(block.delta?.addedPreviewIds?.length)list.append(node('div','delta-line',`当前预览新增 ${block.delta.addedPreviewIds.length} 项。`));if(block.delta?.removedPreviewIds?.length)list.append(node('div','delta-line',`当前预览减少 ${block.delta.removedPreviewIds.length} 项。`));box.append(list);}
  if(type==='evidence'){const list=node('div','evidence-items');for(const item of block.items||[]){const row=node('div','evidence-item');const href=safeHref(item.sourceUrl);if(href){const link=node('a','',item.sourceName||'官方来源');link.href=href;link.target='_blank';link.rel='noopener noreferrer';row.append(link);}row.append(node('small','',`${item.level||'A'}级 · ${item.scope||''}`));list.append(row);}box.append(list);}
  if(type==='pending_checks'){const list=node('div','pending-items');for(const item of block.items||[])list.append(node('div','pending-item',item.text||String(item)));box.append(list);}
  if(type==='action'){const actions=node('div','block-actions');for(const action of block.actions||[]){if(action.href){const link=node('a','',action.label||'打开');link.href=safeHref(action.href)||'/';actions.append(link);}else if(action.prompt){actions.append(promptButton(action.label||action.prompt,action.prompt));}}box.append(actions);}
  return box;
}
function renderResults(){els.resultStream.replaceChildren();const blocks=workspace.lastTurn?.blocks||[];els.starter.hidden=blocks.length>0;if(!blocks.length)return;for(const block of blocks)els.resultStream.append(renderBlock(block));}
function render(){renderHistory();renderActiveView();renderConstraints();renderPending();renderEvidenceAside();renderResults();}

async function checkHealth(){
  try{const response=await fetch('/api/ai/health',{headers:{accept:'application/json'},cache:'no-store'});const data=await response.json();if(!response.ok||!data?.ok)throw new Error('health failed');const provider=data.provider||{};const ready=Boolean(provider.primaryReady);els.health.className=`health-bar ${ready?'is-ok':'is-warn'}`;els.health.textContent=ready?`工作台已就绪：确定性数据执行 + ${provider.primary} 语义解析；模型失败自动退回本地规则。`:provider.primary==='workers-ai'&&!provider.workersAiBound?'确定性业务可继续；Cloudflare Workers AI Binding 未在当前部署生效。':'确定性业务可继续；当前主模型尚未达到可调用状态。';const model=provider.primaryModel||'未配置';els.modelConfig.textContent=`${provider.primary||'deterministic'} · ${model} · ${ready?'可调用':'未就绪'}`;}
  catch{els.health.className='health-bar is-warn';els.health.textContent='健康检查暂时不可用；已有工作区仍保存在本机。';els.modelConfig.textContent='模型配置暂不可读';}
}
async function probeModel(){
  els.probeModel.disabled=true;els.probeModel.textContent='测试中…';els.modelProbeResult.textContent='正在发起一次最小真实模型调用…';
  try{const response=await fetch('/api/ai/model-probe',{method:'POST',headers:{accept:'application/json','content-type':'application/json'},body:'{}'});const data=await response.json();const actual=data.actual||{};if(!response.ok||!data.ok){const failure=Array.isArray(data.failures)?data.failures[0]:null;const detail=[failure?.code,failure?.provider,failure?.model,failure?.error].filter(Boolean).join(' · ');throw new Error(`${data.note||'模型探针失败'}${detail?` ${detail}`:''}`);}els.modelProbeResult.textContent=`本次实测：${actual.provider} · ${actual.model} · ${actual.latencyMs}ms${actual.fallbackUsed?' · 使用备用模型':''}`;}
  catch(error){els.modelProbeResult.textContent=`实测失败：${String(error?.message||error)}。确定性业务仍可继续。`;}
  finally{els.probeModel.disabled=false;els.probeModel.textContent='测试模型';}
}
function taskIdForResult(taskAction){if(taskAction==='branch')return workspace.tasks[0]?.id||workspace.mainTaskId;return workspace.mainTaskId;}
function setRunning(running){els.stop.hidden=!running;els.send.textContent=running?'改口并执行':'执行';els.health.classList.toggle('is-running',running);}
function stopActiveTurn(reason='已停止本轮执行。'){activeTurnSequence+=1;if(activeTurnController)activeTurnController.abort();activeTurnController=null;setRunning(false);if(reason){const box=node('section','block warning');box.append(node('p','',reason));els.resultStream.prepend(box);}}

async function executeTurn(input,confirmedCommand=null){
  const text=String(input||'').trim();if(!text&&!confirmedCommand)return;
  if(activeTurnController)activeTurnController.abort();
  const sequence=++activeTurnSequence;const controller=new AbortController();activeTurnController=controller;setRunning(true);
  const requestWorkspace=compactAiWorkspaceForServer(workspace);
  try{
    const response=await fetch('/api/ai/turn',{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({workspace:requestWorkspace,input:text,confirmedCommand}),signal:controller.signal});
    const data=await response.json();if(sequence!==activeTurnSequence)return;if(!response.ok||!data?.ok)throw new Error(data?.message||'本轮执行失败');
    if(data.pendingConfirmation){pendingCommand=data.command;pendingInput=text;els.confirmText.textContent=data.command?.reason||'当前指代还不够确定。';els.confirmDialog.showModal();return;}
    workspace=applyAiWorkspaceEvent(workspace,data.event);
    const taskId=taskIdForResult(data.taskAction);
    workspace=applyAiWorkspaceEvent(workspace,{type:'result_committed',payload:{taskId,result:data.result,turn:{blocks:data.blocks||[],command:data.command,delta:data.delta,provider:data.provider,at:new Date().toISOString()}}});
    await saveWorkspace();if(sequence!==activeTurnSequence)return;render();els.input.value='';
  }catch(error){
    if(error?.name==='AbortError'||controller.signal.aborted){if(sequence===activeTurnSequence)stopActiveTurn('本轮已停止；已有结果没有被旧请求覆盖。');return;}
    if(sequence===activeTurnSequence){const box=node('section','block warning');box.append(node('h3','','本轮没有修改工作区'),node('p','',String(error?.message||error)));els.resultStream.prepend(box);}
  }finally{if(sequence===activeTurnSequence){activeTurnController=null;setRunning(false);}}
}

function selectionSnapshotFromStorage(){
  let parsed;try{const raw=localStorage.getItem(SELECTION_POOL_KEY);if(!raw)return{version:'ln-rank-selection-snapshot-v3990_1',items:[]};parsed=JSON.parse(raw);}catch{return{version:'ln-rank-selection-snapshot-v3990_1',items:[]};}
  const items=Array.isArray(parsed)?parsed:(Array.isArray(parsed?.items)?parsed.items:[]);
  return{version:'ln-rank-selection-snapshot-v3990_1',items:items.slice(0,112).map(item=>({id:String(item?.id||'').slice(0,220),school:String(item?.school||'').slice(0,120),major:String(item?.major||'').slice(0,180),score2026:Number.isFinite(Number(item?.score2026??item?.score))?Number(item.score2026??item.score):null,rank2026:Number.isFinite(Number(item?.rank2026??item?.rank))?Number(item.rank2026??item.rank):null,bandKey:String(item?.bandKey||item?.band||'').slice(0,40),displayLocation:String(item?.displayLocation||'').slice(0,80),natureLabel:String(item?.natureLabel||'').slice(0,60),tuition:String(item?.tuition||'').slice(0,80),userNote:String(item?.userNote||'').slice(0,240)}))};
}

els.form.addEventListener('submit',event=>{event.preventDefault();const input=els.input.value.trim();if(input)executeTurn(input);});
els.input.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();els.form.requestSubmit();}});
for(const button of document.querySelectorAll('[data-prompt]'))button.addEventListener('click',()=>{const prompt=button.dataset.prompt||'';els.input.value=prompt;executeTurn(prompt);});
els.stop.addEventListener('click',()=>stopActiveTurn());
els.probeModel.addEventListener('click',probeModel);
els.confirmApply.addEventListener('click',async()=>{if(!pendingCommand)return;els.confirmDialog.close();const command=pendingCommand;const input=pendingInput;pendingCommand=null;pendingInput='';await executeTurn(input,command);});
els.importSelection.addEventListener('click',async()=>{const snapshot=selectionSnapshotFromStorage();workspace=applyAiWorkspaceEvent(workspace,{type:'selection_snapshot_imported',payload:{snapshot}});await saveWorkspace();els.importStatus.textContent=snapshot.items.length?`已导入${snapshot.items.length}项只读快照；原选择池未修改。`:'当前浏览器没有可导入的2026选择池记录。';render();});
els.newWorkspace.addEventListener('click',async()=>{if(!confirm('新建工作区会清空当前AI工作区，本来的 ln-rank 选择池不会受影响。继续吗？'))return;stopActiveTurn('');workspace=createAiWorkspace();await saveWorkspace();render();});
els.exportWorkspace.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(workspace,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`gaokao-ai-workspace-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});

await loadWorkspace();render();checkHealth();
