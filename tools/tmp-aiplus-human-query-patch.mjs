import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,value){fs.writeFileSync(path,value);}
function replaceOnce(path,before,after){const source=read(path),count=source.split(before).length-1;if(count!==1)throw new Error(`${path}: expected one match, got ${count}: ${before.slice(0,120)}`);write(path,source.replace(before,after));}
function replaceAllExact(path,before,after,expected){const source=read(path),count=source.split(before).length-1;if(count!==expected)throw new Error(`${path}: expected ${expected} matches, got ${count}: ${before.slice(0,120)}`);write(path,source.split(before).join(after));}

const command='functions/_lib/ai/command-interpreter.js';
replaceOnce(command,
  "import {looksRegionSchoolDirectoryLanguage,regionSchoolLevelFromText} from './region-school-language.js';",
  "import {looksRegionSchoolDirectoryLanguage,regionSchoolLevelFromText} from './region-school-language.js';\nimport {collectionScopeFromText,isScoreWindow,scoreConstraintFromText} from './human-query-frame.js';"
);
replaceOnce(command,
  "function scoreFromText(text){const m=String(text||'').match(/(?:^|[^\\d])(\\d{3})(?:\\s*分)?(?:[^\\d]|$)/),score=Number(m?.[1]);return Number.isFinite(score)&&score>=150&&score<=750?score:null;}",
  "function scoreFromText(text){const constraint=scoreConstraintFromText(text);return constraint.kind==='point'?constraint.value:null;}\nfunction scoreConstraintForTurn(text,workspace={}){const explicit=scoreConstraintFromText(text);if(explicit.explicit)return explicit;const prior=workspace?.lastTurn?.command?.scoreConstraint;const followup=workspace?.agentContext?.currentTask==='major_region_history'&&/^(?:去掉|排除|不要|不看|只看|只留|保留|改成|换成|继续|再看|展开|还有|全部|都列|往下看)/.test(String(text||'').trim());if(followup&&prior&&isScoreWindow(prior))return{...prior,explicit:false,sourceText:'inherited'};return explicit;}"
);
replaceOnce(command,
  "    let foundTopic=false;\n    for(const match of candidate.matchAll(topicRe)){foundTopic=true;pushCandidate(candidate.slice(0,match.index));}",
  "    let foundTopic=false;\n    const collectionScope=collectionScopeFromText(candidate);\n    if(collectionScope.kind==='all_school_majors'&&collectionScope.index>0){foundTopic=true;pushCandidate(candidate.slice(0,collectionScope.index));}\n    for(const match of candidate.matchAll(topicRe)){foundTopic=true;pushCandidate(candidate.slice(0,match.index));}"
);
replaceOnce(command,
  "if(!historyFact||/(所有|全部|全校|招生).{0,6}专业/.test(source))return'';",
  "if(!historyFact||collectionScopeFromText(source).kind==='all_school_majors'||/招生.{0,6}专业/.test(source))return'';"
);
replaceOnce(command,
  "const source=clean(text,1200),retryContext=retryContextForText(source,workspace),score=scoreFromText(source),directoryQuestion=looksRegionSchoolDirectoryLanguage(source)",
  "const source=clean(text,1200),retryContext=retryContextForText(source,workspace),scoreConstraint=scoreConstraintForTurn(source,workspace),score=scoreConstraint.kind==='point'?scoreConstraint.value:null,directoryQuestion=looksRegionSchoolDirectoryLanguage(source)"
);
replaceOnce(command,
  "    ...legacy,score,majorKeywords:majors,regionKeys:geo.keys,regionLabel:geo.label,",
  "    ...legacy,score,scoreConstraint,majorKeywords:majors,regionKeys:geo.keys,regionLabel:geo.label,"
);

const kernel='functions/_lib/ai/agent-task-kernel.js';
replaceOnce(kernel,
  "import {looksEducationKnowledgeQuestion} from './knowledge-language.js';",
  "import {looksEducationKnowledgeQuestion} from './knowledge-language.js';\nimport {collectionScopeFromText,isScoreWindow,scoreConstraintFromText} from './human-query-frame.js';"
);
replaceOnce(kernel,
  "function looksAllSchoolMajorsHistory(source){return /((?:所有|全部|全校|该校|这所学校|各个|各|每个|每一).{0,10}(?:专业|招生专业).{0,14}(?:最低|投档|录取|多少分|分数|位次)|(?:所有|全部|全校|各个|各|每个|每一).{0,10}(?:专业|招生专业).*(?:多少分|最低分|投档分|录取分|分数线|位次)|(?:所有|全部|全校|各个|各|每个|每一).{0,4}专业(?:都|分别|各自)?(?:多少)?分)/.test(source);}\nfunction looksAllSchoolMajorsFollowup(source){return /(?:所有|全部|全校|各个|各|每个|每一).{0,4}(?:专业|招生专业)(?:都|分别|各自)?(?:呢|怎么样|看看)?[？?]?$/.test(source);}",
  "function looksAllSchoolMajorsHistory(source){return collectionScopeFromText(source).kind==='all_school_majors'&&looksHistory(source);}\nfunction looksAllSchoolMajorsFollowup(source){return collectionScopeFromText(source).kind==='all_school_majors'&&!looksHistory(source);}"
);
replaceOnce(kernel,
  "  const explicitMajors=majors.filter(item=>item&&(!schools.some(name=>String(name||'').includes(String(item||'')))||sourceWithoutSchoolNames.includes(String(item||''))));\n  if(looksEducationKnowledgeQuestion",
  "  const explicitMajors=majors.filter(item=>item&&(!schools.some(name=>String(name||'').includes(String(item||'')))||sourceWithoutSchoolNames.includes(String(item||''))));\n  const scoreConstraint=scoreConstraintFromText(source);\n  if(looksEducationKnowledgeQuestion"
);
replaceOnce(kernel,
  "  const hasRegionScope=Array.isArray(regionKeys)&&regionKeys.length>0&&!regionKeys.includes('all');\n  if(!score&&!schools.length&&!explicitMajors.length&&hasRegionScope",
  "  const hasRegionScope=Array.isArray(regionKeys)&&regionKeys.length>0&&!regionKeys.includes('all');\n  if(!schools.length&&explicitMajors.length&&hasRegionScope&&isScoreWindow(scoreConstraint)&&!looksFit(source)&&!looksBackground(source))return'major_region_history';\n  if(!score&&!schools.length&&!explicitMajors.length&&hasRegionScope"
);

const orchestrator='functions/_lib/ai/turn-orchestrator.js';
replaceOnce(orchestrator,
  "function resultIdentity({view,command,selectionReview}){return[command.agentTask,view.score||'',view.majorKeywords.join('/')",
  "function resultIdentity({view,command,selectionReview}){return[command.agentTask,view.score||'',command.scoreConstraint?.kind||'',command.scoreConstraint?.min??'',command.scoreConstraint?.max??'',view.majorKeywords.join('/')"
);
replaceOnce(orchestrator,
  "regionKeys:command.transientRegionView&&command.regionKeys?.length?command.regionKeys:(regionExecution.exact?regionExecution.includeKeys:(view.regionKeys||['all'])),bottomLineMode:view.bottomLineMode||'all'});",
  "regionKeys:command.transientRegionView&&command.regionKeys?.length?command.regionKeys:(regionExecution.exact?regionExecution.includeKeys:(view.regionKeys||['all'])),scoreConstraint:command.scoreConstraint||{kind:'none',min:null,max:null},bottomLineMode:view.bottomLineMode||'all'});"
);

const registry='functions/_lib/ai/tool-registry.js';
replaceOnce(registry,
  "import { querySchoolDirectory } from './school-directory-resource.js';",
  "import { querySchoolDirectory } from './school-directory-resource.js';\nimport {scoreWithinConstraint} from './human-query-frame.js';"
);
replaceOnce(registry,
  "function requestForMajorRegionHistory(context,{majorKeyword='',regionKeys=['all'],bottomLineMode='all',offset=0}={}){const sourceUrl=new URL(context.request.url),url=new URL('/api/ai/major-history',sourceUrl.origin),regions=normalizeRegionKeys(regionKeys).slice(0,4),region=regions.length>1?`any:${regions.join('|')}`:(regions[0]||'all');url.searchParams.set('major',clean(majorKeyword,160));url.searchParams.set('region',region);url.searchParams.set('bottomLineMode',normalizeProjectScope(bottomLineMode));url.searchParams.set('offset',String(Math.max(0,Math.floor(Number(offset)||0))));url.searchParams.set('limit',String(AI_MAJOR_HISTORY_PAGE_LIMIT));return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}});}",
  "function requestForMajorRegionHistory(context,{majorKeyword='',regionKeys=['all'],scoreConstraint={},bottomLineMode='all',offset=0}={}){const sourceUrl=new URL(context.request.url),url=new URL('/api/ai/major-history',sourceUrl.origin),regions=normalizeRegionKeys(regionKeys).slice(0,4),region=regions.length>1?`any:${regions.join('|')}`:(regions[0]||'all'),min=Number(scoreConstraint?.min),max=Number(scoreConstraint?.max);url.searchParams.set('major',clean(majorKeyword,160));url.searchParams.set('region',region);url.searchParams.set('bottomLineMode',normalizeProjectScope(bottomLineMode));if(Number.isFinite(min))url.searchParams.set('minScore',String(Math.round(min)));if(Number.isFinite(max))url.searchParams.set('maxScore',String(Math.round(max)));url.searchParams.set('offset',String(Math.max(0,Math.floor(Number(offset)||0))));url.searchParams.set('limit',String(AI_MAJOR_HISTORY_PAGE_LIMIT));return new Request(url.toString(),{method:'GET',headers:{accept:'application/json'}}); }"
);
replaceOnce(registry,
  "export async function runMajorRegionHistory(context,{majorKeyword='',majorKeywords=[],regionKeys=['all'],bottomLineMode='all'}={}){",
  "export async function runMajorRegionHistory(context,{majorKeyword='',majorKeywords=[],regionKeys=['all'],scoreConstraint={},bottomLineMode='all'}={}){"
);
replaceAllExact(registry,
  "requestForMajorRegionHistory(context,{majorKeyword:query,regionKeys,bottomLineMode,offset",
  "requestForMajorRegionHistory(context,{majorKeyword:query,regionKeys,scoreConstraint,bottomLineMode,offset",
  2
);
replaceOnce(registry,
  "const records=pagePayloads.flatMap(payload=>(payload.records||[]).map(record=>({...majorHistoryRecord(record),queryMajor:query,queryIndex:index,queryStatus:'success'}))),complete=!plan.capped&&records.length===plan.total;",
  "const hasScoreConstraint=Number.isFinite(Number(scoreConstraint?.min))||Number.isFinite(Number(scoreConstraint?.max));const records=pagePayloads.flatMap(payload=>(payload.records||[]).map(record=>({...majorHistoryRecord(record),queryMajor:query,queryIndex:index,queryStatus:'success'}))).filter(record=>!hasScoreConstraint||scoreWithinConstraint(record.score2026,scoreConstraint)),complete=!plan.capped&&records.length===plan.total;"
);
replaceOnce(registry,
  "return{ok:true,partial,allFailed,majorKeyword:requested.length===1?clean(firstPayload.major||requested[0],160):'',majorKeywords:requested,region:clean(firstPayload.region,220),bottomLineMode:",
  "return{ok:true,partial,allFailed,majorKeyword:requested.length===1?clean(firstPayload.major||requested[0],160):'',majorKeywords:requested,region:clean(firstPayload.region,220),scoreConstraint:firstPayload.scoreRange||{kind:clean(scoreConstraint?.kind,20)||'none',min:Number.isFinite(Number(scoreConstraint?.min))?Number(scoreConstraint.min):null,max:Number.isFinite(Number(scoreConstraint?.max))?Number(scoreConstraint.max):null},bottomLineMode:"
);

const api='functions/api/ai/major-history.js';
replaceOnce(api,
  "function int(value, fallback = 0) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? n : fallback; }",
  "function int(value, fallback = 0) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? n : fallback; }\nfunction scoreBound(value) { if (value === null || value === undefined || String(value).trim() === '') return null; const n = Math.round(Number(value)); return Number.isFinite(n) && n >= 150 && n <= 750 ? n : null; }"
);
replaceOnce(api,
  "const url = new URL(context.request.url), major = clean(url.searchParams.get('major'), 180), region = clean(url.searchParams.get('region'), 220) || 'all', bottomLineMode = clean(url.searchParams.get('bottomLineMode'), 40) || 'all';\n    const offset =",
  "const url = new URL(context.request.url), major = clean(url.searchParams.get('major'), 180), region = clean(url.searchParams.get('region'), 220) || 'all', bottomLineMode = clean(url.searchParams.get('bottomLineMode'), 40) || 'all';\n    const rawMinScore = scoreBound(url.searchParams.get('minScore')), rawMaxScore = scoreBound(url.searchParams.get('maxScore'));\n    const minScore = rawMinScore !== null && rawMaxScore !== null ? Math.min(rawMinScore, rawMaxScore) : rawMinScore, maxScore = rawMinScore !== null && rawMaxScore !== null ? Math.max(rawMinScore, rawMaxScore) : rawMaxScore;\n    const scoreRange = { kind: minScore !== null && maxScore !== null ? 'range' : minScore !== null ? 'min' : maxScore !== null ? 'max' : 'none', min: minScore, max: maxScore };\n    const offset ="
);
replaceOnce(api,
  "if (!majorKeys.length) return json({ ok: true, major, region, bottomLineMode, matchedMajors: [], total: 0, records: [], summary:",
  "if (!majorKeys.length) return json({ ok: true, major, region, bottomLineMode, scoreRange, matchedMajors: [], total: 0, records: [], summary:"
);
replaceOnce(api,
  "if (regionMatch(record, region) && passBottomLineMode(record, bottomLineMode)) records.push(record);",
  "if (regionMatch(record, region) && passBottomLineMode(record, bottomLineMode) && (minScore === null || Number(record.score2026) >= minScore) && (maxScore === null || Number(record.score2026) <= maxScore)) records.push(record);"
);
replaceOnce(api,
  "ok: true, major, region, bottomLineMode, matchedMajors: majorKeys, total, offset, limit, nextOffset:",
  "ok: true, major, region, bottomLineMode, scoreRange, matchedMajors: majorKeys, total, offset, limit, nextOffset:"
);
replaceOnce(api,
  "boundary: '这里列的是2026辽宁物理类实际投档记录；默认包含普通项目和中外/高收费项目，若明确排除则按项目性质过滤。它不是2027录取承诺，正式填报仍要核对当年招生计划。'",
  "boundary: `这里列的是2026辽宁物理类实际投档记录${scoreRange.kind!=='none'?`，并按${minScore!==null?`${minScore}分以上`:''}${minScore!==null&&maxScore!==null?'且':''}${maxScore!==null?`${maxScore}分以下`:''}过滤`:''}；默认包含普通项目和中外/高收费项目，若明确排除则按项目性质过滤。它不是2027录取承诺，正式填报仍要核对当年招生计划。`"
);

const aek='tools/verify-aiplus-aek-v001.mjs';
replaceOnce(aek,"import './verify-aiplus-human-intent-matrix-v001.mjs';","import './verify-aiplus-human-intent-matrix-v001.mjs';\nimport './verify-aiplus-routing-grid-v001.mjs';");

const workflow='.github/workflows/verify-aiplus-parent-decision-v003.yml';
replaceAllExact(workflow,
  "      - 'tools/verify-aiplus-aek-human-language-v001.mjs'\n",
  "      - 'tools/verify-aiplus-aek-human-language-v001.mjs'\n      - 'tools/verify-aiplus-routing-grid-v001.mjs'\n",
  2
);
replaceOnce(workflow,
  "          node --check functions/_lib/ai/knowledge-language.js\n",
  "          node --check functions/_lib/ai/knowledge-language.js\n          node --check functions/_lib/ai/human-query-frame.js\n"
);
replaceOnce(workflow,
  "          node --check tools/verify-aiplus-aek-human-language-v001.mjs\n",
  "          node --check tools/verify-aiplus-aek-human-language-v001.mjs\n          node --check tools/verify-aiplus-routing-grid-v001.mjs\n"
);
replaceOnce(workflow,
  "          post_turn '今年辽宁高校专项有什么要求' \"$empty_workspace\" /tmp/aek-current.json",
  "          post_turn '500-600 省内所有会计专业' \"$empty_workspace\" /tmp/aek-score-range-route.json\n          jq -e '.command.agentTask==\"major_region_history\" and .command.score==null and .command.scoreConstraint.kind==\"range\" and .command.scoreConstraint.min==500 and .command.scoreConstraint.max==600 and .command.scoreUsage==\"suspended\" and .pendingDeterministicTool==true' /tmp/aek-score-range-route.json >/dev/null\n\n          curl -fsSL --retry 3 --retry-delay 2 --max-time 60 -H 'Cache-Control: no-cache' \"${PREVIEW_URL}/api/ai/major-history?major=%E4%BC%9A%E8%AE%A1&region=province%3A%E8%BE%BD%E5%AE%81&minScore=500&maxScore=600&offset=0&limit=100&candidate=${EXPECTED_SHA}\" -o /tmp/aek-score-range-api.json\n          jq -e '.ok==true and .scoreRange.kind==\"range\" and .scoreRange.min==500 and .scoreRange.max==600 and ([.records[]?.score2026|select(.<500 or .>600)]|length)==0 and ((.summary.minScore==null) or (.summary.minScore>=500)) and ((.summary.maxScore==null) or (.summary.maxScore<=600))' /tmp/aek-score-range-api.json >/dev/null\n\n          post_turn '今年辽宁高校专项有什么要求' \"$empty_workspace\" /tmp/aek-current.json"
);

for(const file of [command,kernel,orchestrator,registry,api,aek,workflow]){
  if(read(file).includes('tmp-aiplus-human-query-patch'))throw new Error(`${file}: accidental temp marker leak`);
}

console.log('patch applied');
