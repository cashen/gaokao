from pathlib import Path

ROOT=Path('.')

def read(p): return (ROOT/p).read_text()
def write(p,s): (ROOT/p).write_text(s)
def once(s,old,new,label):
    n=s.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 occurrence, got {n}')
    return s.replace(old,new,1)

# 1) One semantic owner for human region-directory language.
lang=ROOT/'functions/_lib/ai/region-school-language.js'
lang.write_text("""export const AI_REGION_SCHOOL_LANGUAGE_VERSION='ai-region-school-language-v0.02';

function clean(value){return String(value||'').normalize('NFKC').trim();}
function compact(value){return clean(value).replace(/[\\s，,。！!；;：:]/g,'');}

export function looksRegionSchoolDirectoryLanguage(text=''){
  const source=compact(text);
  if(!source)return false;
  if(/(?:多少分|最低分|投档分|录取分|分数线|位次|排名)/.test(source))return false;
  return /(?:(?:有哪些|有那些|都有(?:哪些|那些|什么|啥)|有什么|有啥|有多少|多少所|几所).{0,10}(?:大学|高校|院校|学校|本科(?:院校|大学)?|专科(?:院校|学校)?|高职(?:院校)?)|(?:大学|高校|院校|学校).{0,8}(?:有哪些|有那些|都有(?:哪些|那些|什么|啥)|名单|列表|名录|数量|总数|一共多少所|共有多少所|有多少所|几所|多不多)|(?:列一下|列出|给我看|给我看看|看看).{0,8}(?:大学|高校|院校|学校)|(?:所有|全部).{0,5}(?:本科院校|本科大学|专科院校|高职院校))/.test(source);
}

export function regionSchoolLevelFromText(text=''){
  const source=compact(text);
  if(/本科|本科院校|本科大学/.test(source))return'本科';
  if(/专科|高职|专科学校|高职院校/.test(source))return'专科';
  return'all';
}

export function looksRegionSchoolDirectoryFollowup(text=''){
  const source=compact(text);
  return /^(?:本科|本科院校|本科大学|专科|高职|专科院校|高职院校|全部|所有|都要|都有哪些|还有哪些|多少所|几所)(?:呢|有哪些|有那些|有多少|多少|吗)?[？?]?$/.test(source);
}
""")

# 2) command-interpreter: resolve explicit region-directory intent before school fuzzy resolver.
p=ROOT/'functions/_lib/ai/command-interpreter.js'; s=p.read_text()
s=once(s,"import {\n  AI_AGENT_KERNEL_VERSION, AGENT_TASKS, deterministicAgentTask, explicitScoreUsage,\n  validateAgentTask, taskExecutionPolicy\n} from './agent-task-kernel.js';", "import {\n  AI_AGENT_KERNEL_VERSION, AGENT_TASKS, deterministicAgentTask, explicitScoreUsage,\n  validateAgentTask, taskExecutionPolicy\n} from './agent-task-kernel.js';\nimport {looksRegionSchoolDirectoryLanguage,regionSchoolLevelFromText} from './region-school-language.js';",'command import')
s=once(s,"function regionSchoolDirectoryLanguage(text){const source=String(text||'');return /(?:(?:有哪些|有那些|有什么|有啥|有多少|多少所|几所).{0,8}(?:大学|高校|院校|学校|本科(?:院校|大学)?|专科(?:院校|学校)?|高职(?:院校)?)|(?:大学|高校|院校|学校)(?:名单|数量|总数|一共多少所|共有多少所|有多少所|几所))/.test(source);}\nfunction schoolLevelFromText(text){const source=String(text||'');if(/本科|本科院校|本科大学/.test(source))return'本科';if(/专科|高职|专科学校|高职院校/.test(source))return'专科';return'all';}\n",'', 'remove duplicate region language')
s=s.replace('directoryQuestion=regionSchoolDirectoryLanguage(source)','directoryQuestion=looksRegionSchoolDirectoryLanguage(source)')
s=s.replace('schoolLevel=schoolLevelFromText(source)','schoolLevel=regionSchoolLevelFromText(source)')
old="export async function interpretAiCommand(text,workspace={},env={},request=null){\n  const resolvedSchool=await resolveAiSchoolMentionsDetailed(text,{request,env}),resolvedSchoolNames=resolvedSchool.schoolNames;\n  let resolvedRegion=null;\n  if(!resolvedSchoolNames.length&&(regionSchoolDirectoryLanguage(text)||positiveMajors(text).length||workspace?.agentContext?.currentTask==='region_school_directory')){try{const resource=await import('./school-directory-resource.js');resolvedRegion=await resource.resolveSchoolDirectoryRegion({request,env},text,workspace);}catch{resolvedRegion=null;}}\n  const fallback=deterministicBase(text,workspace,resolvedSchoolNames,resolvedSchool.matchedAliases,resolvedRegion);"
new="export async function interpretAiCommand(text,workspace={},env={},request=null){\n  const directoryQuestion=looksRegionSchoolDirectoryLanguage(text);\n  let resolvedRegion=null;\n  if(directoryQuestion||positiveMajors(text).length||workspace?.agentContext?.currentTask==='region_school_directory'){try{const resource=await import('./school-directory-resource.js');resolvedRegion=await resource.resolveSchoolDirectoryRegion({request,env},text,workspace);}catch{resolvedRegion=null;}}\n  const resolvedSchool=directoryQuestion&&resolvedRegion?.key?{schoolNames:[],matchedAliases:[]}:await resolveAiSchoolMentionsDetailed(text,{request,env}),resolvedSchoolNames=resolvedSchool.schoolNames;\n  const fallback=deterministicBase(text,workspace,resolvedSchoolNames,resolvedSchool.matchedAliases,resolvedRegion);"
s=once(s,old,new,'interpret precedence')
p.write_text(s)

# 3) task kernel: current explicit object outranks inherited school focus.
p=ROOT/'functions/_lib/ai/agent-task-kernel.js'; s=p.read_text()
s=once(s,"export const AI_AGENT_KERNEL_VERSION='ai-human-advisor-kernel-v3992_5';", "import {looksRegionSchoolDirectoryLanguage,looksRegionSchoolDirectoryFollowup} from './region-school-language.js';\n\nexport const AI_AGENT_KERNEL_VERSION='ai-human-advisor-kernel-v3992_5';",'kernel import')
s=once(s,"function looksRegionSchoolDirectory(source){return /(?:(?:有哪些|有那些|有什么|有啥|有多少|多少所|几所).{0,8}(?:大学|高校|院校|学校|本科(?:院校|大学)?|专科(?:院校|学校)?|高职(?:院校)?)|(?:大学|高校|院校|学校)(?:名单|数量|总数|一共多少所|共有多少所|有多少所|几所))/.test(String(source||''));}\nfunction looksRegionSchoolDirectoryFollowup(source){return /^(?:本科|本科院校|专科|高职|专科院校|全部|都要|都有哪些|还有哪些|多少所|几所)(?:呢|有哪些|有多少|多少|吗)?[？?]?$/.test(String(source||'').replace(/[\\s，,。！!；;：:]/g,''));}\n",'', 'kernel duplicate language')
s=once(s,"if(!score&&!school&&!explicitMajors.length&&hasRegionScope&&(looksRegionSchoolDirectory(source)||(priorTask==='region_school_directory'&&looksRegionSchoolDirectoryFollowup(source))))return'region_school_directory';", "if(!score&&!schools.length&&!explicitMajors.length&&hasRegionScope&&(looksRegionSchoolDirectoryLanguage(source)||(priorTask==='region_school_directory'&&looksRegionSchoolDirectoryFollowup(source))))return'region_school_directory';",'kernel directory precedence')
s=once(s,"if(!score&&!school&&explicitMajors.length&&hasRegionScope&&!looksFit(source)&&(looksHistory(source)||looksMajorRegionSchoolList(source)||priorTask==='region_school_directory'))return'major_region_history';", "if(!score&&!schools.length&&explicitMajors.length&&hasRegionScope&&!looksFit(source)&&(looksHistory(source)||looksMajorRegionSchoolList(source)||priorTask==='region_school_directory'))return'major_region_history';",'kernel major region precedence')
p.write_text(s)

# 4) fact resource uses same language owner and exposes all rows for local UI tabs without a second data source.
p=ROOT/'functions/_lib/ai/school-directory-resource.js'; s=p.read_text()
s=once(s,"import { SCHOOL_NAME_DATA_URL, extractSchoolRecords } from '../../../tongxue/data/school-name-resolver-v150.js';", "import { SCHOOL_NAME_DATA_URL, extractSchoolRecords } from '../../../tongxue/data/school-name-resolver-v150.js';\nexport {looksRegionSchoolDirectoryLanguage,regionSchoolLevelFromText as schoolDirectoryLevelFromText} from './region-school-language.js';",'resource language reexport')
s=once(s,"export function schoolDirectoryLevelFromText(text=''){const source=String(text||'');if(/本科|本科院校|本科大学/.test(source))return'本科';if(/专科|高职|专科学校|高职院校/.test(source))return'专科';return'all';}\nexport function looksRegionSchoolDirectoryLanguage(text=''){const source=String(text||'');return /(?:(?:有哪些|有那些|有什么|有啥|有多少|多少所|几所).{0,8}(?:大学|高校|院校|学校|本科(?:院校|大学)?|专科(?:院校|学校)?|高职(?:院校)?)|(?:大学|高校|院校|学校)(?:名单|数量|总数|一共多少所|共有多少所|有多少所|几所))/.test(source);}\n",'', 'resource duplicate language')
old="const selected=normalizedLevel==='all'?allRegion:allRegion.filter(row=>row.level===normalizedLevel),undergraduateCount=allRegion.filter(row=>row.level==='本科').length,juniorCollegeCount=allRegion.filter(row=>row.level==='专科').length,returned=selected.slice(0,MAX_RETURNED_SCHOOLS);return{ok:true,region:{type:region.type||'',province:provinceName(region.province),city:cityName(region.city),label:clean(region.label||region.city||region.province,80),key:clean(region.key,100)},level:normalizedLevel,total:selected.length,records:returned,complete:returned.length===selected.length,summary:"
new="const selected=normalizedLevel==='all'?allRegion:allRegion.filter(row=>row.level===normalizedLevel),undergraduateCount=allRegion.filter(row=>row.level==='本科').length,juniorCollegeCount=allRegion.filter(row=>row.level==='专科').length,returned=selected.slice(0,MAX_RETURNED_SCHOOLS),allReturned=allRegion.slice(0,MAX_RETURNED_SCHOOLS);return{ok:true,region:{type:region.type||'',province:provinceName(region.province),city:cityName(region.city),label:clean(region.label||region.city||region.province,80),key:clean(region.key,100)},level:normalizedLevel,total:selected.length,records:returned,complete:returned.length===selected.length,allRecords:allReturned,allComplete:allReturned.length===allRegion.length,summary:"
s=once(s,old,new,'resource all records')
p.write_text(s)

# 5) presentation owns a dedicated region-directory block, not background_routes.
p=ROOT/'functions/_lib/ai/advisor-presentation.js'; s=p.read_text()
old="if(result.regionSchools?.ok){const schoolRows=result.regionSchools.records||[],undergraduate=schoolRows.filter(item=>item.level==='本科'),junior=schoolRows.filter(item=>item.level==='专科'),items=[];if(undergraduate.length)items.push({label:'本科院校',schoolCount:undergraduate.length,schools:undergraduate.map(item=>({school:item.school,officialName:item.officialName,province:item.province,city:item.city}))});if(junior.length)items.push({label:'专科院校',schoolCount:junior.length,schools:junior.map(item=>({school:item.school,officialName:item.officialName,province:item.province,city:item.city}))});blocks.push({type:'background_routes',title:`${result.regionSchools.region?.label||command.regionLabel||'当前地区'}高校目录`,text:'学校名称来自统一高校地域目录；点击学校可继续查该校辽宁2026物理类专业分数，“全部专业”进入现有 ln-rank 单校专业页。',background:{scope:'region_school_directory',region:result.regionSchools.region,level:result.regionSchools.level,items,boundary:result.regionSchools.boundary}});}"
new="if(result.regionSchools?.ok){blocks.push({type:'region_school_directory',title:`${result.regionSchools.region?.label||command.regionLabel||'当前地区'}高校目录`,text:'先按学校层次看清名单。学校名称可继续进入学校研究；“全部专业”进入现有 ln-rank 单校专业页。',directory:{region:result.regionSchools.region,level:result.regionSchools.level,summary:result.regionSchools.summary||{},records:result.regionSchools.allRecords||result.regionSchools.records||[],selectedRecords:result.regionSchools.records||[],complete:result.regionSchools.allComplete!==false,source:result.regionSchools.source||{},boundary:result.regionSchools.boundary||''}});}"
s=once(s,old,new,'presentation dedicated block')
p.write_text(s)

# 6) no arbitrary first-school recommendation.
p=ROOT/'functions/_lib/ai/next-action-engine.js'; s=p.read_text()
old="if(task==='region_school_directory'){const directory=result?.regionSchools||{},region=clean(directory?.region?.label)||'当前地区',level=directory?.level||'all',first=clean(directory?.records?.[0]?.school||directory?.records?.[0]?.officialName),key=clean(directory?.region?.key),out=[];if(level==='all')out.push(action('region-undergraduate','只看本科',`${region}有哪些本科院校`,'把学校层次单独收窄，不改变候选筛选。',100));else out.push(action('region-all-schools','看全部高校',`${region}有哪些大学`,'回到本科和专科的完整地域目录。',100));out.push(action('region-major-history','看一个专业的学校和分数',`${region}电气工程及其自动化有哪些学校，2026都多少分`,'从学校目录进入确定性专业投档事实。',94));if(first)out.push(action('region-first-school',`继续看${first}`,`介绍下${first}`,'从地域列表进入具体学校研究。',98));if(scoreText&&(key==='ln'||key==='shenyang'||key==='dalian'||key.startsWith('province:')))out.unshift(action('region-score-fit','按我的分数看可达性',`按我${scoreText}分，只看${region}有哪些学校更现实`,'这一步才把地区写入候选筛选。',105));return out;}"
new="if(task==='region_school_directory'){const directory=result?.regionSchools||{},region=clean(directory?.region?.label)||'当前地区',level=directory?.level||'all',key=clean(directory?.region?.key),out=[];if(level==='all')out.push(action('region-undergraduate','只看本科',`${region}有哪些本科院校`,'把学校层次单独收窄，不改变候选筛选。',100));else out.push(action('region-all-schools','看全部高校',`${region}有哪些大学`,'回到本科和专科的完整地域目录。',100));out.push(action('region-major-history','按专业看学校和分数',`${region}电气工程及其自动化有哪些学校，2026都多少分`,'从学校目录进入确定性专业投档事实。',94));if(scoreText&&(key==='ln'||key==='shenyang'||key==='dalian'||key.startsWith('province:')))out.unshift(action('region-score-fit','按我的分数看可达性',`按我${scoreText}分，只看${region}有哪些学校更现实`,'这一步才把地区写入候选筛选。',105));return out;}"
s=once(s,old,new,'remove first school recommendation')
p.write_text(s)

# 7) browser renderer gets a compact dedicated list with local tabs/search/lazy expansion.
p=ROOT/'aiplus/render.v3992_0.js'; s=p.read_text()
anchor="function renderBackground(block,box,onPrompt){"
if s.count(anchor)!=1: raise SystemExit('render anchor missing')
insert="""function regionSchoolRow(item,onPrompt){const row=node('div','region-school-row'),main=node('div','region-school-main'),name=node('button','region-school-name',item.school||item.officialName||'学校');name.type='button';name.addEventListener('click',()=>onPrompt(`介绍下${item.school||item.officialName||''}`));main.append(name);const meta=[];if(item.level)meta.push(item.level);if(item.city)meta.push(item.city);else if(item.province)meta.push(item.province);if(meta.length)main.append(node('span','region-school-meta',meta.join(' · ')));const a=node('a','region-school-all-link','全部专业 →');a.href=schoolAllHref(item.school||item.officialName);row.append(main,a);return row;}
function renderRegionSchoolRows(records,onPrompt){const wrap=node('div','region-school-rows'),initial=records.slice(0,8),remaining=records.slice(8);for(const item of initial)wrap.append(regionSchoolRow(item,onPrompt));if(remaining.length){const details=node('details','region-school-more'),summary=node('summary','',`展开其余 ${remaining.length} 所`),mount=node('div','region-school-lazy');details.append(summary,mount);details.addEventListener('toggle',()=>{if(details.open&&!mount.dataset.mounted){mount.dataset.mounted='true';for(const item of remaining)mount.append(regionSchoolRow(item,onPrompt));}});wrap.append(details);}return wrap;}
function renderRegionSchoolDirectory(block,box,onPrompt){const directory=block.directory||{},records=Array.isArray(directory.records)?directory.records:[],summary=directory.summary||{},initial=['本科','专科'].includes(directory.level)?directory.level:'all',controls=node('div','region-school-controls'),tabs=node('div','region-school-tabs'),list=node('div','region-school-list'),counts={all:Number(summary.regionTotal||records.length),本科:Number(summary.regionUndergraduateCount||records.filter(x=>x.level==='本科').length),专科:Number(summary.regionJuniorCollegeCount||records.filter(x=>x.level==='专科').length)};let active=initial,query='';const tabDefs=[['all','全部'],['本科','本科'],['专科','专科']];const mount=()=>{for(const button of tabs.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.level===active));let filtered=records.filter(item=>(active==='all'||item.level===active)&&(!query||String(item.school||item.officialName||'').includes(query)));list.replaceChildren();if(!filtered.length){list.append(node('p','empty-note',query?'没有匹配的学校名称。':'当前层次没有学校记录。'));return;}list.append(renderRegionSchoolRows(filtered,onPrompt));};for(const [key,label] of tabDefs){const button=node('button','region-school-tab',`${label} ${numberText(counts[key]||0)}`);button.type='button';button.dataset.level=key;button.addEventListener('click',()=>{active=key;mount();});tabs.append(button);}controls.append(tabs);if(records.length>20){const search=node('input','region-school-search');search.type='search';search.placeholder='在本地区学校中查找';search.setAttribute('aria-label','在本地区学校中查找');search.addEventListener('input',()=>{query=search.value.trim();mount();});controls.append(search);}box.append(controls,list);mount();if(directory.boundary)box.append(node('p','region-school-boundary',directory.boundary));}
"""
s=s.replace(anchor,insert+anchor,1)
s=once(s,"if(type==='background_routes')classes.push('background');", "if(type==='background_routes')classes.push('background');if(type==='region_school_directory')classes.push('region-directory');",'render class')
s=once(s,"if(type==='background_routes')renderBackground(block,box,onPrompt);", "if(type==='background_routes')renderBackground(block,box,onPrompt);if(type==='region_school_directory')renderRegionSchoolDirectory(block,box,onPrompt);",'render block')
s=once(s,"const priority={change_explanation:1,official_school_info:1,school_profile_supplement:1,school_experience:1,school_research_snapshot:2,fact_summary:2,candidate_routes:2,history_records:2,fit_assessment:2,background_routes:3,comparison:3,selection_review:3,next_questions:5,decision_guidance:6,decision_details:8};", "const priority={change_explanation:1,official_school_info:1,school_profile_supplement:1,school_experience:1,school_research_snapshot:2,fact_summary:2,candidate_routes:2,history_records:2,fit_assessment:2,region_school_directory:2,background_routes:3,comparison:3,selection_review:3,next_questions:5,decision_guidance:6,decision_details:8};",'render priority')
p.write_text(s)

# 8) responsive compact list CSS; one shared geometry, no device-specific business logic.
p=ROOT/'aiplus/workspace.v3990_1.css'; s=p.read_text()
css="""
/* AIPLuS region-school directory v002_3: compact human list, one interaction model across viewports */
.result-card.region-directory{padding:16px 18px}.region-school-controls{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:12px 0}.region-school-tabs{display:flex;gap:6px;flex-wrap:wrap}.region-school-tab{border:1px solid #ced9d1;background:#fff;color:#355347;border-radius:999px;padding:6px 10px;cursor:pointer;font-size:13px}.region-school-tab[aria-pressed="true"]{background:#e9f2ec;border-color:#94ad9e;color:#214a38;font-weight:760}.region-school-search{min-width:min(260px,100%);border:1px solid #d4ddd6;border-radius:10px;background:#fff;padding:8px 10px;outline:0}.region-school-list{margin-top:4px}.region-school-rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.region-school-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;border:1px solid #e1e6e2;border-radius:11px;background:#fff;padding:9px 10px}.region-school-main{display:flex;align-items:baseline;gap:7px;min-width:0}.region-school-name{border:0;background:transparent;padding:0;color:#245b43;font-weight:760;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;min-width:0}.region-school-meta{font-size:11px;color:#7a847f;white-space:nowrap}.region-school-all-link{flex:0 0 auto;font-size:12px;color:#52685d;text-decoration:none;white-space:nowrap}.region-school-all-link:hover,.region-school-name:hover{color:#173f2f}.region-school-more{grid-column:1/-1;margin-top:2px}.region-school-more>summary{cursor:pointer;color:#486056;font-weight:650;padding:7px 2px}.region-school-lazy{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:5px}.region-school-boundary{margin-top:10px!important;font-size:12px;color:#78817d!important}
@media(max-width:760px){.result-card.region-directory{padding:13px}.region-school-controls{align-items:stretch}.region-school-tabs{width:100%}.region-school-tab{flex:1 1 0;text-align:center;min-height:38px}.region-school-search{width:100%;min-width:0}.region-school-rows,.region-school-lazy{grid-template-columns:minmax(0,1fr)}.region-school-row{padding:10px}.region-school-main{display:grid;gap:2px}.region-school-meta{white-space:normal}.region-school-all-link{font-size:11px}}
"""
if 'AIPLuS region-school directory v002_3' in s: raise SystemExit('css already patched')
p.write_text(s+'\n'+css)

# 9) atomic AIPLuS browser cache transaction.
p=ROOT/'aiplus/app.v3990_1.js'; s=p.read_text().replace("?v=002_1'","?v=002_3'")
p.write_text(s)
p=ROOT/'aiplus/index.html'; s=p.read_text()
s=s.replace('data-ai-plus-assets="aiplus-assets-v002_1"','data-ai-plus-assets="aiplus-assets-v002_3"')
s=s.replace('?v=002_1&scroll=002_1','?v=002_3&scroll=002_1')
s=s.replace('/aiplus/geometry.v002.css?v=002_2&core=002_1','/aiplus/geometry.v002.css?v=002_2&core=002_3')
p.write_text(s)

# 10) UI audit follows the single cache transaction and asserts dedicated owner.
p=ROOT/'tools/audit-aiplus-v002-ui.mjs'; s=p.read_text()
s=s.replace('data-ai-plus-assets="aiplus-assets-v002_1"','data-ai-plus-assets="aiplus-assets-v002_3"')
s=s.replace("const geometryAsset='/aiplus/geometry.v002.css?v=002_2&core=002_1';","const geometryAsset='/aiplus/geometry.v002.css?v=002_2&core=002_3';")
s=s.replace("url.searchParams.get('v')==='002_1'","url.searchParams.get('v')==='002_3'")
s=s.replace("value.endsWith('?v=002_1')","value.endsWith('?v=002_3')")
s=once(s,"assert.match(render,/initial=records\\.slice\\(0,10\\),remaining=records\\.slice\\(10\\)/);", "assert.match(render,/initial=records\\.slice\\(0,10\\),remaining=records\\.slice\\(10\\)/);\nassert.match(render,/function renderRegionSchoolDirectory/);\nassert.match(render,/region-school-name/);\nassert.match(render,/展开其余 \\${remaining\\.length} 所/);\nassert.doesNotMatch(presentation,/type:'background_routes'[^\\n]+region_school_directory/);\nassert.match(presentation,/type:'region_school_directory'/);",'ui audit region')
p.write_text(s)

# 11) browser gate gets real region-directory journey and new cache identity.
p=ROOT/'tools/browser-ai-workspace-v3990_1.mjs'; s=p.read_text()
s=s.replace("assetVersion==='aiplus-assets-v002_1'","assetVersion==='aiplus-assets-v002_3'")
s=s.replace("href.includes('002_1')","href.includes('002_3')||href.includes('geometry.v002.css?v=002_2&core=002_3')")
anchor="async function schoolHistoryAliasJourney(page,name){"
journey="""async function regionSchoolDirectoryJourney(page,name){await reset(page);const first=await submitTurn(page,'吉林有那些大学');assert(first.command.agentTask==='region_school_directory',`${name}: 吉林目录 task ${first.command.agentTask}`);assert(first.result?.regionSchools?.ok===true,`${name}: 吉林目录 missing`);assert(await page.locator('.region-directory').count()===1,`${name}: dedicated region directory card missing`);assert(await page.locator('.region-school-name').count()>0,`${name}: school links missing`);assert(await page.locator('.region-school-tab').count()===3,`${name}: local level tabs missing`);await checkGeometry(page,`${name}:region-directory`);const previousView=await viewText(page);const firstSchool=(await page.locator('.region-school-name').first().innerText()).trim();const responsePromise=waitForFinalTurnResponse(page,`介绍下${firstSchool}`);await page.locator('.region-school-name').first().click();const response=await responsePromise;const data=await response.json();assert(response.status()===200&&data?.ok===true,`${name}: school link did not continue conversation`);assert(data.command.agentTask==='school_research',`${name}: school link task ${data.command.agentTask}`);await waitIdle(page);assert(await viewText(page)===previousView,`${name}: region knowledge click polluted candidate view`);await reset(page);await submitTurn(page,'辽宁科技大学怎么样');const polluted=await submitTurn(page,'北京的大学有哪些');assert(polluted.command.agentTask==='region_school_directory',`${name}: prior school polluted Beijing directory: ${polluted.command.agentTask}`);assert(polluted.result?.regionSchools?.region?.label==='北京',`${name}: Beijing region mismatch`);}
"""
s=s.replace(anchor,journey+anchor,1)
s=once(s,"await parentEntryUiJourney(page,device.name);await viewportStabilityJourney", "await parentEntryUiJourney(page,device.name);await regionSchoolDirectoryJourney(page,device.name);await viewportStabilityJourney",'browser invoke')
p.write_text(s)

# 12) deterministic verifier: full canonical province/city query matrix + polluted-context regression + UI contract.
p=ROOT/'tools/verify-ai-region-school-directory-v002.mjs'; s=p.read_text()
s=s.replace("assert(out.blocks.some(x=>x.type==='background_routes'),'region school UI block missing');", "assert(out.blocks.some(x=>x.type==='region_school_directory'),'dedicated region school UI block missing');assert(!out.blocks.some(x=>x.type==='background_routes'&&x.background?.scope==='region_school_directory'),'region directory leaked through background renderer');")
insert="""
const uniqueRegions=[];
for(const row of truth){const province=normProvince(row.province),city=normCity(row.city);if(province&&!uniqueRegions.some(x=>x.type==='province'&&x.label===province))uniqueRegions.push({type:'province',label:province,province});if(city&&!uniqueRegions.some(x=>x.type==='city'&&x.label===city&&x.province===province))uniqueRegions.push({type:'city',label:city,province,city});}
for(const region of uniqueRegions){const out=await run(`${region.label}有哪些大学`);assertDirectory(out,{province:region.province,city:region.city||''});}
const pollutedBase=createAiWorkspace({agentContext:{currentTask:'school_research',focus:{school:'辽宁科技大学'}},lastTurn:{userText:'辽宁科技大学怎么样'},activeView:{regionKeys:['all'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'}});
for(const text of ['北京有哪些大学','吉林有那些大学','上海的大学有哪些','天津高校都有哪些','重庆高校列表','南京所有本科院校','武汉都有什么大学','深圳给我看看高校']){const out=await run(text,pollutedBase);assert(out.command.agentTask==='region_school_directory',`${text} polluted by prior school: ${out.command.agentTask}`);assert(out.commitView===false,`${text} must not commit view`);}
for(const text of ['吉林大学怎么样','北京大学有哪些专业','南京大学电气多少分','沈阳工业大学有哪些强项','大连交通大学所有专业多少分']){const cmd=await command(text);assert(cmd.agentTask!=='region_school_directory',`${text} false-positive region directory`);}
"""
s=once(s,"const syMajor=await command('沈阳电气有哪些学校');",insert+"\nconst syMajor=await command('沈阳电气有哪些学校');",'verifier matrix')
p.write_text(s)

print('patched AIPLuS region directory semantics/UI v002_3')
