from pathlib import Path

branch_files = {
    'functions/_lib/school-query-provider.v3969.js': None,
    'functions/_lib/ai/tool-registry.js': None,
    'tools/verify-ai-workspace-v3990_1.mjs': None,
}

p = Path('functions/_lib/school-query-provider.v3969.js')
s = p.read_text()
old = "export function clearSchoolQueryProviderCacheForTest() {\n  cacheByOrigin.clear();\n}\n"
new = "export function releaseSchoolQueryProviderCache() {\n  cacheByOrigin.clear();\n}\n\nexport function clearSchoolQueryProviderCacheForTest() {\n  releaseSchoolQueryProviderCache();\n}\n"
if old not in s:
    raise SystemExit('provider cache clear anchor missing')
p.write_text(s.replace(old, new, 1))

p = Path('functions/_lib/ai/tool-registry.js')
s = p.read_text()
anchor = "import { onRequest as schoolMajorsOnRequest } from '../../api/school-majors.js';\n"
insert = anchor + "import { releaseSchoolQueryProviderCache } from '../school-query-provider.v3969.js';\n"
if anchor not in s:
    raise SystemExit('tool registry import anchor missing')
s = s.replace(anchor, insert, 1)
old = "async function schoolMajorsQuery(context,params){\n  const response=await schoolMajorsOnRequest({...context,request:schoolMajorsRequest(context,params)});let payload=null;try{payload=await response.json();}catch{}\n  if(!response.ok||!payload?.ok)return{ok:false,status:response.status,code:payload?.code||'school_history_failed',message:clean(payload?.message||payload?.userMessage||'学校专业记录查询失败。',300),candidates:payload?.candidates||[]};\n  return payload;\n}"
new = "async function schoolMajorsQuery(context,params){\n  try{const response=await schoolMajorsOnRequest({...context,request:schoolMajorsRequest(context,params)});let payload=null;try{payload=await response.json();}catch{}\n    if(!response.ok||!payload?.ok)return{ok:false,status:response.status,code:payload?.code||'school_history_failed',message:clean(payload?.message||payload?.userMessage||'学校专业记录查询失败。',300),candidates:payload?.candidates||[]};\n    return payload;\n  }finally{releaseSchoolQueryProviderCache();}\n}"
if old not in s:
    raise SystemExit('schoolMajorsQuery anchor missing')
p.write_text(s.replace(old, new, 1))

p = Path('tools/verify-ai-workspace-v3990_1.mjs')
s = p.read_text()
needle = "function testAiMajorBandsResourceBoundary(){"
idx = s.find(needle)
if idx < 0:
    raise SystemExit('test insertion anchor missing')
newtest = "function testAiSchoolQueryCacheReleaseBoundary(){const registry=read('functions/_lib/ai/tool-registry.js'),provider=read('functions/_lib/school-query-provider.v3969.js');assert.ok(registry.includes(\"releaseSchoolQueryProviderCache\"));assert.ok(registry.includes(\"finally{releaseSchoolQueryProviderCache();}\"));assert.ok(provider.includes('export function releaseSchoolQueryProviderCache()'));assert.ok(provider.includes('clearSchoolQueryProviderCacheForTest()'));}\n"
s = s[:idx] + newtest + s[idx:]
call_anchor = "testAiMajorBandsResourceBoundary();"
if call_anchor not in s:
    raise SystemExit('test call anchor missing')
s = s.replace(call_anchor, "testAiSchoolQueryCacheReleaseBoundary();\n" + call_anchor, 1)
p.write_text(s)
