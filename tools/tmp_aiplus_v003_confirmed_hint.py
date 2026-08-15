from pathlib import Path

p = Path('functions/_lib/ai/turn-orchestrator.js')
s = p.read_text()
old = "async function validateConfirmedCommand(value,input,workspace,env={},request=null){if(!value||typeof value!=='object')return null;const fallback=await deterministicResolvedCommand(input,workspace,env,request);return{...fallback,semanticFrame:null,rawText:clean(input,1200),question:clean(input,1200),source:`${clean(fallback.source,30)||'deterministic'}-confirmed`};}"
new = "async function validateConfirmedCommand(value,input,workspace,env={},request=null,preserveEntityHints=false){if(!value||typeof value!=='object')return null;const fallback=await deterministicResolvedCommand(input,workspace,env,request),canPreserve=preserveEntityHints&&fallback.executionPolicy?.commitView!==true,hintedSchools=canPreserve?unique(value.schoolNames||[],4):[],hintedMajors=canPreserve?unique(value.majorKeywords||[],8):[],schoolNames=hintedSchools.length?hintedSchools:fallback.schoolNames,majorKeywords=hintedMajors.length?hintedMajors:fallback.majorKeywords,focus=canPreserve?{...(fallback.focus||{}),school:schoolNames.length===1?schoolNames[0]:clean(value.focus?.school||fallback.focus?.school,120),major:majorKeywords.length===1?majorKeywords[0]:clean(value.focus?.major||fallback.focus?.major,160),schools:schoolNames.length>1?schoolNames:unique(value.focus?.schools||fallback.focus?.schools||[],4),majors:majorKeywords.length>1?majorKeywords:unique(value.focus?.majors||fallback.focus?.majors||[],8)}:fallback.focus;return{...fallback,schoolNames,majorKeywords,focus,semanticFrame:null,rawText:clean(input,1200),question:clean(input,1200),source:`${clean(fallback.source,30)||'deterministic'}-confirmed`};}"
if s.count(old) != 1:
    raise SystemExit(f'confirmed validator strict anchor count={s.count(old)}')
s = s.replace(old, new)
old = "let interpreted;const deterministicContinuation=Object.keys(executionContext.aiDeterministicToolResults).length>0,confirmed=await validateConfirmedCommand(payload.confirmedCommand,input||payload.confirmedCommand?.rawText||'',workspace,context.env||{},context.request||null);"
new = "let interpreted;const deterministicContinuation=Object.keys(executionContext.aiDeterministicToolResults).length>0,confirmed=await validateConfirmedCommand(payload.confirmedCommand,input||payload.confirmedCommand?.rawText||'',workspace,context.env||{},context.request||null,deterministicContinuation);"
if s.count(old) != 1:
    raise SystemExit(f'confirmed invocation preservation anchor count={s.count(old)}')
p.write_text(s.replace(old, new))
