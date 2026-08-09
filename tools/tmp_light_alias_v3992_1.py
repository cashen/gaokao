from pathlib import Path

def replace(path, old, new, label):
    p=Path(path); s=p.read_text()
    if old not in s: raise SystemExit(f'{label}: anchor missing')
    p.write_text(s.replace(old,new,1))

path='functions/_lib/ai/command-interpreter.js'
replace(path,
"import { resolveAdmissionSchoolQuery } from '../school-query-provider.v3969.js';\n",
"import { createSchoolNameResolver } from '../../../tongxue/data/school-name-resolver-v150.js';\nimport { SCHOOL_PROFILE_ROWS } from '../../../shared/resources/schools/school-profile-data.20260617-v3957.js';\n",
'light alias imports')
replace(path,
"const CORE_DIMENSIONS=Object.freeze(['score','region','major','school','bottomLine']);\n",
"const CORE_DIMENSIONS=Object.freeze(['score','region','major','school','bottomLine']);\nconst AI_SCHOOL_NAME_RESOLVER=createSchoolNameResolver(SCHOOL_PROFILE_ROWS.map(row=>({name:row[0],province:row[3],city:row[4],level:row[5]})));\n",
'light resolver init')
old="export async function resolveAiSchoolMentions(text,request,resolver=resolveAdmissionSchoolQuery){if(!request||typeof resolver!=='function')return[];const resolved=[];for(const query of likelySchoolMentionTokens(text)){try{const result=await resolver(request,{query,intent:'school',limit:4});const exact=clean(result?.resolvedSchool?.officialName||result?.resolvedSchool?.school,120);if(result?.status==='resolved'&&exact){resolved.push(exact);break;}const candidates=Array.isArray(result?.candidates)?result.candidates:[];if(candidates.length===1&&Number(candidates[0]?.score||0)>=.9){resolved.push(clean(candidates[0]?.officialName||candidates[0]?.school,120));break;}}catch{}}return unique(resolved,4);}\n"
new="export async function resolveAiSchoolMentions(text,resolver=AI_SCHOOL_NAME_RESOLVER){if(!resolver||typeof resolver.resolve!=='function')return[];const resolved=[];for(const query of likelySchoolMentionTokens(text)){try{const result=resolver.resolve(query,{limit:4}),exact=clean(result?.resolvedName,120);if(result?.status==='resolved'&&exact){resolved.push(exact);break;}const candidates=Array.isArray(result?.candidates)?result.candidates:[];if(candidates.length===1&&Number(candidates[0]?.score||0)>=.9){resolved.push(clean(candidates[0]?.officialName,120));break;}}catch{}}return unique(resolved,4);}\n"
replace(path,old,new,'resolveAiSchoolMentions light')
replace(path,
"export async function interpretAiCommand(text,workspace={},env={},request=null){\n  const resolvedSchoolNames=await resolveAiSchoolMentions(text,request);",
"export async function interpretAiCommand(text,workspace={},env={}){\n  const resolvedSchoolNames=await resolveAiSchoolMentions(text);",
'interpret signature')

replace('functions/_lib/ai/turn-orchestrator.js',
"else interpreted=await interpretAiCommand(input,workspace,context.env||{},context.request);",
"else interpreted=await interpretAiCommand(input,workspace,context.env||{});",
'orchestrator light interpreter')

path='tools/verify-ai-workspace-v3990_1.mjs'
p=Path(path); s=p.read_text()
old="const fakeRequest=new Request('https://example.test/api/ai/turn');\n  const fakeResolver=async(_request,{query})=>{const map={沈航:'沈阳航空航天大学',辽科大:'辽宁科技大学'};const school=map[query]||'';return school?{status:'resolved',resolvedSchool:{officialName:school,school},candidates:[]}:{status:'not_found',candidates:[]};};\n  const shenyangAviation=await resolveAiSchoolMentions('沈航的电气呢',fakeRequest,fakeResolver);assert.deepEqual(shenyangAviation,['沈阳航空航天大学']);\n  const liaoningTech=await resolveAiSchoolMentions('辽科大的电气呢',fakeRequest,fakeResolver);assert.deepEqual(liaoningTech,['辽宁科技大学']);"
new="const fakeResolver={resolve(query){const map={沈航:'沈阳航空航天大学',辽科大:'辽宁科技大学'},school=map[query]||'';return school?{status:'resolved',resolvedName:school,candidates:[]}:{status:'not_found',candidates:[]};}};\n  const shenyangAviation=await resolveAiSchoolMentions('沈航的电气呢',fakeResolver);assert.deepEqual(shenyangAviation,['沈阳航空航天大学']);\n  const liaoningTech=await resolveAiSchoolMentions('辽科大的电气呢',fakeResolver);assert.deepEqual(liaoningTech,['辽宁科技大学']);"
if old not in s: raise SystemExit('fake resolver test anchor missing')
s=s.replace(old,new,1)
old="function testAiSchoolResolverBoundary(){const source=read('functions/_lib/ai/command-interpreter.js'),stable=read('tongxue/data/school-name-resolver-v150.js');assert.ok(source.includes('resolveAdmissionSchoolQuery'));assert.ok(source.includes('resolveAiSchoolMentions'));assert.equal(stable.includes('explicitSchoolAliasesInText'),false);}\n"
new="function testAiSchoolResolverBoundary(){const source=read('functions/_lib/ai/command-interpreter.js'),stable=read('tongxue/data/school-name-resolver-v150.js');assert.ok(source.includes('createSchoolNameResolver'));assert.ok(source.includes('SCHOOL_PROFILE_ROWS'));assert.ok(source.includes('resolveAiSchoolMentions'));assert.equal(source.includes('school-query-provider.v3969'),false);assert.equal(stable.includes('explicitSchoolAliasesInText'),false);}\n"
if old not in s: raise SystemExit('resolver boundary test anchor missing')
p.write_text(s.replace(old,new,1))
