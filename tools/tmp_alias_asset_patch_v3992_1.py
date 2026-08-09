from pathlib import Path

p=Path('functions/_lib/ai/command-interpreter.js')
s=p.read_text()
s=s.replace("import { createSchoolNameResolver } from '../../../tongxue/data/school-name-resolver-v150.js';\nimport { SCHOOL_PROFILE_ROWS } from '../../../shared/resources/schools/school-profile-data.20260617-v3957.js';", "import { createSchoolNameResolver, SCHOOL_NAME_DATA_URL } from '../../../tongxue/data/school-name-resolver-v150.js';")
s=s.replace("const AI_SCHOOL_NAME_RESOLVER=createSchoolNameResolver(SCHOOL_PROFILE_ROWS.map(row=>({name:row[0],province:row[3],city:row[4],level:row[5]})));\n", "")
old="export async function resolveAiSchoolMentions(text,resolver=AI_SCHOOL_NAME_RESOLVER){if(!resolver||typeof resolver.resolve!=='function')return[];const resolved=[];for(const query of likelySchoolMentionTokens(text)){try{const result=resolver.resolve(query,{limit:4}),exact=clean(result?.resolvedName,120);if(result?.status==='resolved'&&exact){resolved.push(exact);break;}const candidates=Array.isArray(result?.candidates)?result.candidates:[];if(candidates.length===1&&Number(candidates[0]?.score||0)>=.9){resolved.push(clean(candidates[0]?.officialName,120));break;}}catch{}}return unique(resolved,4);}"
new="""async function loadAiSchoolResolver(request,env={}){const base=request?.url?new URL(request.url).origin:'https://example.invalid',url=new URL(SCHOOL_NAME_DATA_URL,base);let response=null;if(env?.ASSETS?.fetch)response=await env.ASSETS.fetch(new Request(url.toString(),{method:'GET'}));if(!response||!response.ok)response=await fetch(url.toString(),{method:'GET',cf:{cacheTtl:1800,cacheEverything:true}});if(!response.ok)throw new Error(`学校简称索引读取失败：${response.status}`);const payload=await response.json(),rows=Array.isArray(payload?.schools)?payload.schools.filter(row=>Array.isArray(row)&&row[3]==='本科'):[];if(rows.length<1000)throw new Error('学校简称索引不完整。');return createSchoolNameResolver(rows);}
export async function resolveAiSchoolMentions(text,contextOrResolver={}){const queries=likelySchoolMentionTokens(text);if(!queries.length)return[];let resolver=contextOrResolver?.resolve?contextOrResolver:null;if(!resolver){try{resolver=await loadAiSchoolResolver(contextOrResolver?.request||null,contextOrResolver?.env||{});}catch{return[];}}if(typeof resolver?.resolve!=='function')return[];const resolved=[];for(const query of queries){try{const result=resolver.resolve(query,{limit:4}),exact=clean(result?.resolvedName,120);if(result?.status==='resolved'&&exact){resolved.push(exact);break;}const candidates=Array.isArray(result?.candidates)?result.candidates:[];if(candidates.length===1&&Number(candidates[0]?.score||0)>=.9){resolved.push(clean(candidates[0]?.officialName,120));break;}}catch{}}return unique(resolved,4);}"""
if old not in s: raise SystemExit('resolveAiSchoolMentions anchor missing')
s=s.replace(old,new)
old="export async function interpretAiCommand(text,workspace={},env={}){\n  const resolvedSchoolNames=await resolveAiSchoolMentions(text);"
new="export async function interpretAiCommand(text,workspace={},env={},request=null){\n  const resolvedSchoolNames=await resolveAiSchoolMentions(text,{request,env});"
if old not in s: raise SystemExit('interpret anchor missing')
s=s.replace(old,new)
p.write_text(s)

p=Path('functions/_lib/ai/turn-orchestrator.js')
s=p.read_text()
old="else interpreted=await interpretAiCommand(input,workspace,context.env||{});"
new="else interpreted=await interpretAiCommand(input,workspace,context.env||{},context.request||null);"
if old not in s: raise SystemExit('orchestrator anchor missing')
p.write_text(s.replace(old,new))

p=Path('tools/verify-ai-workspace-v3990_1.mjs')
s=p.read_text()
old="function testAiSchoolResolverBoundary(){const source=read('functions/_lib/ai/command-interpreter.js'),stable=read('tongxue/data/school-name-resolver-v150.js');assert.ok(source.includes('createSchoolNameResolver'));assert.ok(source.includes('SCHOOL_PROFILE_ROWS'));assert.ok(source.includes('resolveAiSchoolMentions'));assert.equal(source.includes('school-query-provider.v3969'),false);assert.equal(stable.includes('explicitSchoolAliasesInText'),false);}"
new="function testAiSchoolResolverBoundary(){const source=read('functions/_lib/ai/command-interpreter.js'),stable=read('tongxue/data/school-name-resolver-v150.js');assert.ok(source.includes('createSchoolNameResolver'));assert.ok(source.includes('SCHOOL_NAME_DATA_URL'));assert.ok(source.includes('env?.ASSETS?.fetch'));assert.ok(source.includes(\"row[3]==='本科'\"));assert.ok(source.includes('resolveAiSchoolMentions'));assert.equal(source.includes('SCHOOL_PROFILE_ROWS'),false);assert.equal(source.includes('school-query-provider.v3969'),false);assert.equal(stable.includes('explicitSchoolAliasesInText'),false);}"
if old not in s: raise SystemExit('resolver boundary test anchor missing')
p.write_text(s.replace(old,new))
