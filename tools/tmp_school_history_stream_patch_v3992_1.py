from pathlib import Path

p=Path('functions/_lib/ln-rank-manifest.js')
s=p.read_text()
anchor="async function fetchJson(request,path){const url=`${base(request)}/fenxi/${String(path).replace(/^\\/+/, '')}`;const r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`ln-rank 2026 data fetch failed ${r.status}: ${path}`);return r.json()}\n"
insert=anchor+"async function fetchJsonStreaming(request,env,path){const url=`${base(request)}/fenxi/${String(path).replace(/^\\/+/, '')}`;let r=null;if(env?.ASSETS?.fetch){try{r=await env.ASSETS.fetch(new Request(url,{method:'GET',headers:{accept:'application/json'}}))}catch{r=null}}if(!r||!r.ok)r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`ln-rank 2026 data fetch failed ${r.status}: ${path}`);return r.json()}\n"
if anchor not in s: raise SystemExit('fetchJson anchor missing')
s=s.replace(anchor,insert,1)
append="\nexport async function loadMatchingRecords(request,env,predicate){const manifest=await loadManifest(request,env);const chunks=Array.isArray(manifest.chunks)?manifest.chunks:[],records=[];let scanned=0;for(const chunk of chunks){const file=chunk.file||chunk.path;if(!file)continue;const data=await fetchJsonStreaming(request,env,file),rows=Array.isArray(data)?data:(Array.isArray(data.records)?data.records:[]);scanned+=rows.length;for(const raw of rows)if(predicate(raw))records.push(raw)}return{manifest,records,scanned}}\n"
if 'export async function loadMatchingRecords' in s: raise SystemExit('loadMatchingRecords already exists')
s=s.rstrip()+append
p.write_text(s)

p=Path('functions/api/school-majors.js')
s=p.read_text()
s=s.replace("import { loadAllRecords } from '../_lib/ln-rank-manifest.js';","import { loadMatchingRecords } from '../_lib/ln-rank-manifest.js';")
old="""    const [{ manifest, records: rawRecords }, directoryMeta] = await Promise.all([\n      loadAllRecords(context.request, context.env || {}),\n      getAdmissionSchoolDirectoryMeta(context.request)\n    ]);\n"""
new="""    const directoryMeta = await getAdmissionSchoolDirectoryMeta(context.request);\n"""
if old not in s: raise SystemExit('eager load block missing')
s=s.replace(old,new,1)
old="""    const acceptedNames = acceptedNamesForSelection(selection, entity);\n    const exactRaw = rawRecords.filter(raw => acceptedNames.has(normalizeUnifiedSchoolName(rawSchool(raw))));\n"""
new="""    const acceptedNames = acceptedNamesForSelection(selection, entity);\n    const { manifest, records: exactRaw, scanned: rawScanned } = await loadMatchingRecords(\n      context.request,\n      context.env || {},\n      raw => acceptedNames.has(normalizeUnifiedSchoolName(rawSchool(raw)))\n    );\n"""
if old not in s: raise SystemExit('exactRaw block missing')
s=s.replace(old,new,1)
s=s.replace("totalRecords: manifest.totalRecords || rawRecords.length,\n        rawScanned: rawRecords.length,","totalRecords: manifest.totalRecords || rawScanned,\n        rawScanned,")
p.write_text(s)

p=Path('tools/verify-ai-workspace-v3990_1.mjs')
s=p.read_text()
needle="function testAiMajorBandsResourceBoundary(){"
idx=s.find(needle)
if idx<0: raise SystemExit('test insertion anchor missing')
newtest="function testSchoolHistoryStreamingBoundary(){const api=read('functions/api/school-majors.js'),manifest=read('functions/_lib/ln-rank-manifest.js');assert.ok(api.includes('loadMatchingRecords'));assert.equal(api.includes('loadAllRecords(context.request'),false);assert.ok(api.indexOf('getAdmissionSchoolDirectoryMeta')<api.indexOf('loadMatchingRecords('),'school identity must resolve before rank chunks are scanned');assert.ok(manifest.includes('export async function loadMatchingRecords'));assert.ok(manifest.includes('for(const chunk of chunks)'));assert.ok(manifest.includes('env?.ASSETS?.fetch'));assert.equal(manifest.includes('chunkCache.set(file',{ } if False else False)}\n"
# build valid JS string explicitly
newtest="function testSchoolHistoryStreamingBoundary(){const api=read('functions/api/school-majors.js'),manifest=read('functions/_lib/ln-rank-manifest.js');assert.ok(api.includes('loadMatchingRecords'));assert.equal(api.includes('loadAllRecords(context.request'),false);assert.ok(api.indexOf('getAdmissionSchoolDirectoryMeta')<api.indexOf('loadMatchingRecords('),'school identity must resolve before rank chunks are scanned');assert.ok(manifest.includes('export async function loadMatchingRecords'));assert.ok(manifest.includes('for(const chunk of chunks)'));assert.ok(manifest.includes('env?.ASSETS?.fetch'));}\n"
s=s[:idx]+newtest+s[idx:]
call_anchor="testAiMajorBandsResourceBoundary();"
if call_anchor not in s: raise SystemExit('test call anchor missing')
s=s.replace(call_anchor,"testSchoolHistoryStreamingBoundary();\n"+call_anchor,1)
p.write_text(s)
