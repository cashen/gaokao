from pathlib import Path

app_path=Path('ai/app.v3990_1.js')
verify_path=Path('tools/verify-ai-school-history-bridge-v3992_2.mjs')
app=app_path.read_text(encoding='utf-8')

anchor="const DETERMINISTIC_TRANSIENT_STATUSES=new Set([502,503,504]),DETERMINISTIC_RETRY_DELAYS=Object.freeze([300,900,2100]);"
insert="""const DETERMINISTIC_TRANSIENT_STATUSES=new Set([502,503,504]),DETERMINISTIC_RETRY_DELAYS=Object.freeze([300,900,2100]);
const SCHOOL_HISTORY_SESSION_CACHE_TTL_MS=5*60*1000,SCHOOL_HISTORY_SESSION_CACHE_MAX_ENTRIES=4,schoolHistorySessionCache=new Map();
function readSchoolHistorySessionCache(tool){if(tool?.kind!=='school_history')return null;const entry=schoolHistorySessionCache.get(tool.url);if(!entry)return null;if(Date.now()-entry.time>SCHOOL_HISTORY_SESSION_CACHE_TTL_MS){schoolHistorySessionCache.delete(tool.url);return null;}schoolHistorySessionCache.delete(tool.url);schoolHistorySessionCache.set(tool.url,entry);try{return JSON.parse(entry.serialized);}catch{schoolHistorySessionCache.delete(tool.url);return null;}}
function putSchoolHistorySessionCache(tool,entry){if(tool?.kind!=='school_history'||!entry)return;const serialized=JSON.stringify(entry);schoolHistorySessionCache.delete(tool.url);schoolHistorySessionCache.set(tool.url,{time:Date.now(),serialized});while(schoolHistorySessionCache.size>SCHOOL_HISTORY_SESSION_CACHE_MAX_ENTRIES){const oldest=schoolHistorySessionCache.keys().next().value;schoolHistorySessionCache.delete(oldest);}}
"""
if app.count(anchor)!=1: raise SystemExit(f'cache anchor count {app.count(anchor)}')
app=app.replace(anchor,insert,1)

old="async function executeDeterministicTool(tool,controller){const spec=deterministicToolSpec(tool);if(!spec)throw new Error('确定性事实请求合同无效');let lastError=null;"
new="async function executeDeterministicTool(tool,controller){const spec=deterministicToolSpec(tool);if(!spec)throw new Error('确定性事实请求合同无效');const cached=readSchoolHistorySessionCache(tool);if(cached)return cached;let lastError=null;"
if app.count(old)!=1: raise SystemExit(f'execute cache-read anchor count {app.count(old)}')
app=app.replace(old,new,1)

old="if(bridgeBytes>spec.budget)throw new Error(`${spec.label}桥接超过安全预算`);return{kind:spec.kind,key:tool.key,url:tool.url,status:response.status,payload:compact};"
new="if(bridgeBytes>spec.budget)throw new Error(`${spec.label}桥接超过安全预算`);const entry={kind:spec.kind,key:tool.key,url:tool.url,status:response.status,payload:compact};putSchoolHistorySessionCache(tool,entry);return entry;"
if app.count(old)!=1: raise SystemExit(f'execute cache-write anchor count {app.count(old)}')
app=app.replace(old,new,1)
app_path.write_text(app,encoding='utf-8')

verify=verify_path.read_text(encoding='utf-8')
anchor="assert.ok(app.includes('!error?.workerResourceLimit'),'1102 no-retry guard missing');"
addition="""assert.ok(app.includes('!error?.workerResourceLimit'),'1102 no-retry guard missing');
assert.ok(app.includes('SCHOOL_HISTORY_SESSION_CACHE_TTL_MS=5*60*1000'),'school-history session cache TTL missing');
assert.ok(app.includes('SCHOOL_HISTORY_SESSION_CACHE_MAX_ENTRIES=4'),'school-history session cache entry cap missing');
assert.ok(app.includes('schoolHistorySessionCache.get(tool.url)'),'school-history session cache must key by exact tool URL');
assert.ok(app.includes('const cached=readSchoolHistorySessionCache(tool);if(cached)return cached'),'school-history cache read must happen before network fetch');
assert.ok(app.includes('putSchoolHistorySessionCache(tool,entry);return entry'),'successful bounded school-history fact must enter session cache');
"""
if verify.count(anchor)!=1: raise SystemExit(f'verifier cache assertion anchor count {verify.count(anchor)}')
verify=verify.replace(anchor,addition,1)
old="'exact-school-native-text-scan-truth-set-equal'"
new="'exact-school-native-text-scan-truth-set-equal','bounded-school-history-session-cache'"
if verify.count(old)!=1: raise SystemExit(f'verifier checks list anchor count {verify.count(old)}')
verify=verify.replace(old,new,1)
verify_path.write_text(verify,encoding='utf-8')
print('patched bounded school-history session cache + verifier')
