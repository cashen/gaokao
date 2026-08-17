const DB_NAME='gaokao-ai-workspace-v3990_0';
const STORE_NAME='workspace';
const CURRENT_KEY='current';
const SESSION_PREFIX='session:';
const MAX_SESSIONS=30;

let prunePromise=null;

function openDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME);};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function clean(value,max=80){return String(value==null?'':value).replace(/\s+/g,' ').trim().slice(0,max);}
function taskLabel(task=''){return({school_research:'学校研究',school_official_qa:'学校官方信息',school_history:'学校分数',school_major_history:'学校专业分数',major_region_history:'专业分数',candidate_discovery:'候选探索',candidate_refinement:'候选收窄',fit_assessment:'分数判断',school_comparison:'学校比较',major_comparison:'专业比较',background_discovery:'专业背景',school_background:'学校背景',major_background:'专业背景'})[task]||'讨论';}
export function workspaceHistoryMeta(workspace={}){
  const turns=Array.isArray(workspace.turnHistory)?workspace.turnHistory:[],last=turns.at(-1)||{},focus=workspace?.agentContext?.focus||{},task=workspace?.agentContext?.currentTask||'';
  const title=focus.school&&task.startsWith('school_')?`${focus.school} · ${taskLabel(task)}`:clean(last.userText||workspace?.conversationMemory?.lastUserText||'新的讨论',34);
  const updatedAt=workspace.updatedAt||last.at||workspace.createdAt||new Date().toISOString();
  const searchText=clean([title,focus.school,focus.major,...turns.slice(-6).map(item=>item.userText)].filter(Boolean).join(' '),600).toLowerCase();
  return{id:String(workspace.id||''),title,updatedAt,turnCount:turns.length,searchText,task};
}
async function allSessionRows(){
  const db=await openDb();
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readonly'),store=tx.objectStore(STORE_NAME),rows=[],request=store.openCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor){resolve(rows);return;}const key=String(cursor.key||'');if(key.startsWith(SESSION_PREFIX)&&cursor.value?.id)rows.push({key,value:clone(cursor.value)});cursor.continue();};request.onerror=()=>reject(request.error);tx.onerror=()=>reject(tx.error);});}
  finally{db.close();}
}
async function pruneSessions(){
  const rows=await allSessionRows();rows.sort((a,b)=>String(b.value?.updatedAt||'').localeCompare(String(a.value?.updatedAt||'')));
  const stale=rows.slice(MAX_SESSIONS);if(!stale.length)return;
  const db=await openDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readwrite'),store=tx.objectStore(STORE_NAME);for(const row of stale)store.delete(row.key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
function schedulePruneSessions(){
  if(prunePromise)return prunePromise;
  prunePromise=pruneSessions().catch(()=>{}).finally(()=>{prunePromise=null;});
  return prunePromise;
}
async function ensureCurrentSession(value){
  if(!value?.id)return;
  const db=await openDb();
  try{await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,'readwrite'),store=tx.objectStore(STORE_NAME),currentRequest=store.get(CURRENT_KEY);
    currentRequest.onerror=()=>reject(currentRequest.error);
    currentRequest.onsuccess=()=>{
      const current=currentRequest.result;
      if(!current?.id||current.id!==value.id)return;
      const key=`${SESSION_PREFIX}${current.id}`,sessionRequest=store.get(key);
      sessionRequest.onerror=()=>reject(sessionRequest.error);
      sessionRequest.onsuccess=()=>{if(!sessionRequest.result)store.put(clone(current),key);};
    };
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });}finally{db.close();}
}
export async function loadCurrentWorkspace(){
  const db=await openDb();let value=null;
  try{value=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readonly'),request=tx.objectStore(STORE_NAME).get(CURRENT_KEY);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});}
  finally{db.close();}
  if(value?.id)await ensureCurrentSession(value);
  return value;
}
export async function saveCurrentWorkspace(workspace,{prune=true}={}){
  if(!workspace?.id)return;
  const snapshot=clone(workspace),db=await openDb();
  try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readwrite'),store=tx.objectStore(STORE_NAME);store.put(snapshot,CURRENT_KEY);store.put(snapshot,`${SESSION_PREFIX}${workspace.id}`);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  finally{db.close();}
  if(prune)schedulePruneSessions();
}
export async function listWorkspaceHistory(query=''){
  const needle=clean(query,120).toLowerCase(),rows=await allSessionRows();
  return rows.map(row=>({workspace:row.value,meta:workspaceHistoryMeta(row.value)})).filter(item=>!needle||item.meta.searchText.includes(needle)).sort((a,b)=>String(b.meta.updatedAt).localeCompare(String(a.meta.updatedAt))).slice(0,MAX_SESSIONS);
}
export async function loadWorkspaceSession(id=''){
  const key=`${SESSION_PREFIX}${String(id||'')}`,db=await openDb();
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readonly'),request=tx.objectStore(STORE_NAME).get(key);request.onsuccess=()=>resolve(request.result?clone(request.result):null);request.onerror=()=>reject(request.error);});}
  finally{db.close();}
}
export async function deleteWorkspaceSession(id=''){
  const key=`${SESSION_PREFIX}${String(id||'')}`,db=await openDb();
  try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE_NAME,'readwrite');tx.objectStore(STORE_NAME).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
  finally{db.close();}
}