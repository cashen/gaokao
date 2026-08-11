from pathlib import Path

p=Path('functions/_lib/ai/command-interpreter.js')
s=p.read_text()

# Resolve the actual shorthand token that matched a school. For a query such as
# 大连海事轮机工程, also try leading prefixes; only the resolver can confirm one.
a="function resolveSchoolQueries(resolver,queries=[]){if(typeof resolver?.resolve!=='function')return[];const resolved=[];for(const query of queries){try{const result=resolver.resolve(query,{limit:4}),exact=clean(result?.resolvedName,120);if(result?.status==='resolved'&&exact){resolved.push(exact);break;}const candidates=Array.isArray(result?.candidates)?result.candidates:[];if(candidates.length===1&&Number(candidates[0]?.score||0)>=.9){resolved.push(clean(candidates[0]?.officialName,120));break;}}catch{}}return unique(resolved,4);}"
b="function resolveSchoolQueryDetails(resolver,queries=[]){if(typeof resolver?.resolve!=='function')return{schoolNames:[],matchedAliases:[]};for(const rawQuery of queries){const query=clean(rawQuery,40),attempts=unique([query,...Array.from({length:Math.max(0,query.length-2)},(_,i)=>query.slice(0,query.length-i-1)).filter(item=>item.length>=2)],16);for(const attempt of attempts){try{const result=resolver.resolve(attempt,{limit:4}),exact=clean(result?.resolvedName,120);if(result?.status==='resolved'&&exact)return{schoolNames:[exact],matchedAliases:[attempt]};const candidates=Array.isArray(result?.candidates)?result.candidates:[];if(candidates.length===1&&Number(candidates[0]?.score||0)>=.9){const official=clean(candidates[0]?.officialName,120);if(official)return{schoolNames:[official],matchedAliases:[attempt]};}}catch{}}}return{schoolNames:[],matchedAliases:[]};}\nfunction resolveSchoolQueries(resolver,queries=[]){return resolveSchoolQueryDetails(resolver,queries).schoolNames;}"
if a not in s: raise SystemExit('resolveSchoolQueries anchor missing')
s=s.replace(a,b,1)

a="export async function resolveAiSchoolMentions(text,contextOrResolver={}){const queries=likelySchoolMentionTokens(text);if(!queries.length)return[];let resolver=contextOrResolver?.resolve?contextOrResolver:null;if(resolver)return resolveSchoolQueries(resolver,queries);try{const resolverModule=await import('../../../tongxue/data/school-name-resolver-v150.js');const localPayload=await fetchAiSchoolJson(contextOrResolver?.request||null,contextOrResolver?.env||{},AI_LOCAL_SCHOOL_ALIAS_RESOURCE),localRows=localSchoolResolverRows(localPayload);if(localRows.length>=50){const localResolver=resolverModule.createSchoolNameResolver(localRows),localResolved=resolveSchoolQueries(localResolver,queries);if(localResolved.length)return localResolved;}resolver=await loadAiSchoolResolver(contextOrResolver?.request||null,contextOrResolver?.env||{},queries,resolverModule);}catch{return[];}return resolveSchoolQueries(resolver,queries);}"
b="export async function resolveAiSchoolMentionsDetailed(text,contextOrResolver={}){const queries=likelySchoolMentionTokens(text);if(!queries.length)return{schoolNames:[],matchedAliases:[]};let resolver=contextOrResolver?.resolve?contextOrResolver:null;if(resolver)return resolveSchoolQueryDetails(resolver,queries);try{const resolverModule=await import('../../../tongxue/data/school-name-resolver-v150.js');const localPayload=await fetchAiSchoolJson(contextOrResolver?.request||null,contextOrResolver?.env||{},AI_LOCAL_SCHOOL_ALIAS_RESOURCE),localRows=localSchoolResolverRows(localPayload);if(localRows.length>=50){const localResolver=resolverModule.createSchoolNameResolver(localRows),localResolved=resolveSchoolQueryDetails(localResolver,queries);if(localResolved.schoolNames.length)return localResolved;}resolver=await loadAiSchoolResolver(contextOrResolver?.request||null,contextOrResolver?.env||{},queries,resolverModule);}catch{return{schoolNames:[],matchedAliases:[]};}return resolveSchoolQueryDetails(resolver,queries);}\nexport async function resolveAiSchoolMentions(text,contextOrResolver={}){return(await resolveAiSchoolMentionsDetailed(text,contextOrResolver)).schoolNames;}"
if a not in s: raise SystemExit('resolveAiSchoolMentions anchor missing')
s=s.replace(a,b,1)

# Replace the post-patch free-form major extractor so it removes only confirmed
# school names/aliases, never unconfirmed query fragments.
start=s.index('function inferSchoolHistoryMajor(source){')
end=s.index('function resolverRowParts', start)
old=s[start:end]
# Keep the preceding school token helpers, replacing only inferSchoolHistoryMajor.
infer_start=old.index('function inferSchoolHistoryMajor(source){')
prefix=old[:infer_start]
infer="""function inferSchoolHistoryMajor(source,matchedAliases=[],resolvedSchoolNames=[]){const historyFact=/(多少分|最低(?:录取|投档)?分|录取分|投档分|分数线|位次|排名|去年|往年|历年)/.test(source)||(/202[3456]/.test(source)&&!/(招生章程|章程|录取规则|宿舍|住宿|食堂|食宿|学费|收费|校区|主管部门|学校简介|学校介绍)/.test(source));if(!historyFact||/(所有|全部|全校|招生).{0,6}专业/.test(source))return'';let value=String(source||'');const removals=unique([...(matchedAliases||[]),...(resolvedSchoolNames||[]),...(resolvedSchoolNames||[]).map(name=>String(name||'').replace(/(?:大学|学院)$/,''))],12).sort((a,b)=>b.length-a.length);for(const token of removals)if(token)value=value.split(token).join(' ');for(const name of value.match(/[\\u4e00-\\u9fa5]{2,18}?(?:大学|学院)/g)||[])value=value.replace(name,' ');value=value.replace(/(?:^|[^\\d])\\d{3}\\s*分?/g,' ');value=value.replace(/(最低录取分|最低投档分|最低分|投档分|录取分|多少分|分数线|位次|排名|去年|往年|历年|202[3456]|这个学校|这所学校|那个学校|那所学校|该校|刚才这个学校|刚才那所学校|我不是问|不是问|我问|问一下|问下|看看|看下|多少|几分|几名|最低|录取|投档|分数|的|呢|吗|呀|啊|吧)/g,' ');value=value.replace(/[\\s，,。！？!?；;：:]+/g,'').trim();if(!value||value.length<2||value.length>24||/(能不能上|能不能报|够不够|学校|所有专业|全部专业|全校专业|招生专业|^(?:多少|几分|几名|最低|录取|投档|分数|位次|排名)$)/.test(value))return'';return normalizeMajorTerm(value);}\n"""
s=s[:start]+prefix+infer+s[end:]

# Thread confirmed aliases through deterministic parsing while keeping old call sites compatible.
a="function deterministicBase(text,workspace={},resolvedSchoolNames=[]){"
b="function deterministicBase(text,workspace={},resolvedSchoolNames=[],resolvedSchoolAliases=[]){"
if a not in s: raise SystemExit('deterministicBase signature anchor missing')
s=s.replace(a,b,1)

a="if(schools.length){const inferredMajor=inferSchoolHistoryMajor(source);if(inferredMajor)majors=[inferredMajor];}"
b="if(schools.length){const inferredMajor=inferSchoolHistoryMajor(source,resolvedSchoolAliases,schools);if(inferredMajor)majors=[inferredMajor];}"
if a not in s: raise SystemExit('infer major call anchor missing')
s=s.replace(a,b,1)

a="export function deterministicCommand(text,workspace={},resolvedSchoolNames=[]){return deterministicBase(text,workspace,resolvedSchoolNames);}"
b="export function deterministicCommand(text,workspace={},resolvedSchoolNames=[],resolvedSchoolAliases=[]){return deterministicBase(text,workspace,resolvedSchoolNames,resolvedSchoolAliases);}"
if a not in s: raise SystemExit('deterministicCommand anchor missing')
s=s.replace(a,b,1)

a="export async function interpretAiCommand(text,workspace={},env={},request=null){\n  const resolvedSchoolNames=await resolveAiSchoolMentions(text,{request,env});\n  const fallback=deterministicBase(text,workspace,resolvedSchoolNames);"
b="export async function interpretAiCommand(text,workspace={},env={},request=null){\n  const resolvedSchool=await resolveAiSchoolMentionsDetailed(text,{request,env}),resolvedSchoolNames=resolvedSchool.schoolNames;\n  const fallback=deterministicBase(text,workspace,resolvedSchoolNames,resolvedSchool.matchedAliases);"
if a not in s: raise SystemExit('interpret detailed resolver anchor missing')
s=s.replace(a,b,1)

p.write_text(s)
