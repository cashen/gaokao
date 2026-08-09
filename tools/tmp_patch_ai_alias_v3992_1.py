from pathlib import Path
import subprocess


def replace(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'{label}: anchor missing in {path}')
    p.write_text(text.replace(old, new, 1))

# Stable school alias data must remain byte-for-byte identical to main.
subprocess.run(['git','fetch','origin','main','--depth=1'], check=True)
subprocess.run(['git','checkout','origin/main','--','tongxue/data/school-name-resolver-v150.js'], check=True)

path='functions/_lib/ai/command-interpreter.js'
replace(path,
"import { explicitSchoolAliasesInText } from '../../../tongxue/data/school-name-resolver-v150.js';\n",
"import { resolveAdmissionSchoolQuery } from '../school-query-provider.v3969.js';\n",
'alias import')
replace(path,
"function schoolNamesFromText(text){const source=String(text||''),aliases=explicitSchoolAliasesInText(source).map(item=>item.officialName),matches=source.match(/[\\u4e00-\\u9fa5]{2,18}?(?:大学|学院)/g)||[],full=matches.map(v=>v.replace(/^(比较|对比|看看|再看|想问|帮我看|帮我比较|把|那|和|跟|与|就|先|还是)/,'').trim());return unique([...aliases,...full],4);}\n",
"""function schoolNamesFromText(text,resolvedSchoolNames=[]){const source=String(text||''),matches=source.match(/[\\u4e00-\\u9fa5]{2,18}?(?:大学|学院)/g)||[],full=matches.map(v=>v.replace(/^(比较|对比|看看|再看|想问|帮我看|帮我比较|把|那|和|跟|与|就|先|还是)/,'').trim());return unique([...(resolvedSchoolNames||[]),...full],4);}
function likelySchoolMentionTokens(text){const source=clean(text,360);if(!source||/[\\u4e00-\\u9fa5]{2,18}?(?:大学|学院)/.test(source))return[];const tokens=[];const possessive=source.match(/(?:^|[，,。！？!?；;\\s])([^，,。！？!?；;\\s的]{2,12})的(?:电气|自动化|机械|计算机|软件|电子|通信|材料|化工|冶金|土木|建筑|医学|法学|金融|会计|专业|强项|背景)/);if(possessive?.[1])tokens.push(possessive[1]);let reduced=source.replace(/(?:^|[^\\d])\\d{3}\\s*分?/g,' ');for(const term of [...MAJOR_TERMS].sort((a,b)=>b.length-a.length))reduced=reduced.split(term).join(' ');reduced=reduced.replace(/(所有专业|全部专业|全校专业|招生专业|最低录取分|最低投档分|最低分|投档分|录取分|多少分|分数线|历史分数|历年分数|有证据的强项方向|强项方向|背景证据|学校背景|专业背景|强项|怎么样|如何|咋样|能不能上|能不能报|够不够|够吗|呢|吗|呀|啊|吧)/g,' ');reduced=reduced.replace(/^(那|再|还是|然后|顺便|看看|看下|看一下|帮我看|帮我查|我想看|想看|查下|查一下|请看|请查)+/,'').replace(/(的|呢|吗|呀|啊|吧)+$/g,'').replace(/[\\s，,。！？!?；;：:]+/g,'').trim();if(reduced.length>=2&&reduced.length<=12)tokens.push(reduced);return unique(tokens,4);}
export async function resolveAiSchoolMentions(text,request,resolver=resolveAdmissionSchoolQuery){if(!request||typeof resolver!=='function')return[];const resolved=[];for(const query of likelySchoolMentionTokens(text)){try{const result=await resolver(request,{query,intent:'school',limit:4});const exact=clean(result?.resolvedSchool?.officialName||result?.resolvedSchool?.school,120);if(result?.status==='resolved'&&exact){resolved.push(exact);break;}const candidates=Array.isArray(result?.candidates)?result.candidates:[];if(candidates.length===1&&Number(candidates[0]?.score||0)>=.9){resolved.push(clean(candidates[0]?.officialName||candidates[0]?.school,120));break;}}catch{}}return unique(resolved,4);}
""",
'school resolver helpers')
replace(path,
"function deterministicBase(text,workspace={}){\n  const source=clean(text,1200),score=scoreFromText(source),positive0=positiveMajors(source),negative=negativeMajors(source),schools0=schoolNamesFromText(source),geo=geographyFromText(source)",
"function deterministicBase(text,workspace={},resolvedSchoolNames=[]){\n  const source=clean(text,1200),score=scoreFromText(source),positive0=positiveMajors(source),negative=negativeMajors(source),schools0=schoolNamesFromText(source,resolvedSchoolNames),geo=geographyFromText(source)",
'deterministicBase')
replace(path,
"export function deterministicCommand(text,workspace={}){return deterministicBase(text,workspace);}\n",
"export function deterministicCommand(text,workspace={},resolvedSchoolNames=[]){return deterministicBase(text,workspace,resolvedSchoolNames);}\n",
'deterministicCommand')
replace(path,
"export async function interpretAiCommand(text,workspace={},env={}){\n  const fallback=deterministicBase(text,workspace);",
"export async function interpretAiCommand(text,workspace={},env={},request=null){\n  const resolvedSchoolNames=await resolveAiSchoolMentions(text,request);\n  const fallback=deterministicBase(text,workspace,resolvedSchoolNames);",
'interpretAiCommand')

replace('functions/_lib/ai/turn-orchestrator.js',
"else interpreted=await interpretAiCommand(input,workspace,context.env||{});",
"else interpreted=await interpretAiCommand(input,workspace,context.env||{},context.request);",
'orchestrator resolver request')

path='tools/verify-ai-workspace-v3990_1.mjs'
replace(path,
"import { deterministicCommand,interpretAiCommand,shouldShortCircuitAiProvider } from '../functions/_lib/ai/command-interpreter.js';",
"import { deterministicCommand,interpretAiCommand,shouldShortCircuitAiProvider,resolveAiSchoolMentions } from '../functions/_lib/ai/command-interpreter.js';",
'test import')
replace(path,
"import { explicitSchoolAliasesInText } from '../tongxue/data/school-name-resolver-v150.js';\n",
"",
'test stable alias import removal')
replace(path,
"const cmd=(text,workspace=createAiWorkspace())=>deterministicCommand(text,workspace);",
"const cmd=(text,workspace=createAiWorkspace(),resolvedSchools=[])=>deterministicCommand(text,workspace,resolvedSchools);",
'test cmd injection')
replace(path,
"""function testParentHumanJourneysV3992_1(){
  assert.equal(explicitSchoolAliasesInText('沈航的电气呢')[0]?.officialName,'沈阳航空航天大学');
  assert.equal(explicitSchoolAliasesInText('辽科大的电气呢')[0]?.officialName,'辽宁科技大学');""",
"""async function testParentHumanJourneysV3992_1(){
  const fakeRequest=new Request('https://example.test/api/ai/turn');
  const fakeResolver=async(_request,{query})=>{const map={沈航:'沈阳航空航天大学',辽科大:'辽宁科技大学'};const school=map[query]||'';return school?{status:'resolved',resolvedSchool:{officialName:school,school},candidates:[]}:{status:'not_found',candidates:[]};};
  const shenyangAviation=await resolveAiSchoolMentions('沈航的电气呢',fakeRequest,fakeResolver);assert.deepEqual(shenyangAviation,['沈阳航空航天大学']);
  const liaoningTech=await resolveAiSchoolMentions('辽科大的电气呢',fakeRequest,fakeResolver);assert.deepEqual(liaoningTech,['辽宁科技大学']);""",
'parent alias tests')
replace(path,"let c=cmd('沈航的电气呢',history);","let c=cmd('沈航的电气呢',history,shenyangAviation);",'沈航 injection')
replace(path,"c=cmd('辽科大的电气呢',history);","c=cmd('辽科大的电气呢',history,liaoningTech);",'辽科大 possessive injection')
replace(path,"c=cmd('辽科大',majorBg);","c=cmd('辽科大',majorBg,liaoningTech);",'辽科大 focus injection')

p=Path(path)
s=p.read_text()
marker='function testAiMajorBandsResourceBoundary()'
if marker not in s:
    raise SystemExit('school resolver boundary insertion marker missing')
boundary="function testAiSchoolResolverBoundary(){const source=read('functions/_lib/ai/command-interpreter.js'),stable=read('tongxue/data/school-name-resolver-v150.js');assert.ok(source.includes('resolveAdmissionSchoolQuery'));assert.ok(source.includes('resolveAiSchoolMentions'));assert.equal(stable.includes('explicitSchoolAliasesInText'),false);}\n\n"
s=s.replace(marker,boundary+marker,1)
old='testPrivacyBudget();testParentHumanJourneysV3992_1();testAiMajorBandsResourceBoundary();'
new='testPrivacyBudget();await testParentHumanJourneysV3992_1();testAiSchoolResolverBoundary();testAiMajorBandsResourceBoundary();'
if old not in s:
    raise SystemExit('test invocation anchor missing')
p.write_text(s.replace(old,new,1))
