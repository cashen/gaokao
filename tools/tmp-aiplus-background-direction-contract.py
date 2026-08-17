from pathlib import Path
import re

ROOT=Path('.')

def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')
def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 exact match, got {count}')
    return text.replace(old,new,1)
def regex_once(text,pattern,repl,label,flags=0):
    out,count=re.subn(pattern,repl,text,count=1,flags=flags)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 regex match, got {count}')
    return out

# 1) Canonical background adapter: direction is evidence grouping, admissionMajors are queryable majors.
p=Path('functions/_lib/ai/background-resource-adapter.js'); text=read(p)
text=replace_once(text,"export const AI_BACKGROUND_RESOURCE_ADAPTER_VERSION = 'ai-background-resource-adapter-v3992_1';","export const AI_BACKGROUND_RESOURCE_ADAPTER_VERSION = 'ai-background-resource-adapter-v3992_2';",'adapter version')
needle="""function directionOf(record = {}) {
  return clean(record?.background?.direction || record?.background?.label || record?.standardMajor?.name || record?.major, 160);
}
"""
insert=needle+"""
function admissionMajorOf(record = {}) {
  return clean(record?.standardMajor?.name || record?.major, 160);
}
"""
text=replace_once(text,needle,insert,'admission major helper')
old_group="""function groupDirections(records = []) {
  const byDirection = new Map();
  for (const record of records) {
    const direction = directionOf(record);
    if (!direction) continue;
    let item = byDirection.get(direction);
    if (!item) {
      item = {
        major: direction,
        direction,
        schools: new Map(),
        primaryCount: 0,
        secondaryCount: 0,
        recordCount: 0,
        overview: clean(record?.background?.label || record?.background?.evidenceLabel || '', 220)
      };
      byDirection.set(direction, item);
    }
    const school = clean(record?.school, 120);
    if (school) item.schools.set(normalizeText(school), { school, city: clean(record?.city || record?.displayLocation, 80) });
    if (evidenceLevel(record) === 'primary') item.primaryCount += 1;
    else item.secondaryCount += 1;
    item.recordCount += 1;
  }
  return [...byDirection.values()].map(item => ({
    ...item,
    schools: [...item.schools.values()],
    schoolCount: item.schools.size,
    evidenceScore: item.primaryCount * 5 + item.secondaryCount * 2 + item.schools.size
  }));
}
"""
new_group="""function groupDirections(records = []) {
  const byDirection = new Map();
  for (const record of records) {
    const direction = directionOf(record);
    if (!direction) continue;
    let item = byDirection.get(direction);
    if (!item) {
      item = {
        // Compatibility display alias only. Queryability is explicit below; never use this as a history-query key.
        major: direction,
        direction,
        entityKind: 'background_direction',
        historyQueryable: false,
        admissionMajors: new Map(),
        schools: new Map(),
        primaryCount: 0,
        secondaryCount: 0,
        recordCount: 0,
        overview: clean(record?.background?.label || record?.background?.evidenceLabel || '', 220)
      };
      byDirection.set(direction, item);
    }
    const admissionMajor = admissionMajorOf(record);
    if (admissionMajor) item.admissionMajors.set(normalizeText(admissionMajor), admissionMajor);
    const school = clean(record?.school, 120);
    if (school) {
      const schoolKey = normalizeText(school);
      let schoolItem = item.schools.get(schoolKey);
      if (!schoolItem) {
        schoolItem = { school, city: clean(record?.city || record?.displayLocation, 80), admissionMajors: new Map() };
        item.schools.set(schoolKey, schoolItem);
      }
      if (admissionMajor) schoolItem.admissionMajors.set(normalizeText(admissionMajor), admissionMajor);
    }
    if (evidenceLevel(record) === 'primary') item.primaryCount += 1;
    else item.secondaryCount += 1;
    item.recordCount += 1;
  }
  return [...byDirection.values()].map(item => ({
    ...item,
    admissionMajors: [...item.admissionMajors.values()],
    schools: [...item.schools.values()].map(school => ({ ...school, admissionMajors: [...school.admissionMajors.values()] })),
    schoolCount: item.schools.size,
    evidenceScore: item.primaryCount * 5 + item.secondaryCount * 2 + item.schools.size
  }));
}
"""
text=replace_once(text,old_group,new_group,'group directions contract')
old_school="""export function schoolBackgroundFromSnapshot(snapshot, school) {
  const needle = normalizeText(school);
  const records = (snapshot.records || []).filter(record => normalizeText(record?.school) === needle);
  const items = groupDirections(records).map(item => ({ ...item, school: clean(school, 120) }));
  return { items, meta: sourceMeta(snapshot) };
}
"""
new_school=old_school+"""
export function schoolBackgroundDirectionFromSnapshot(snapshot, school, direction) {
  const needle = normalizeText(direction);
  if (!needle) return null;
  return schoolBackgroundFromSnapshot(snapshot, school).items.find(item => normalizeText(item?.direction) === needle) || null;
}
"""
text=replace_once(text,old_school,new_school,'direction lookup export')
text=text.replace("String(a.major).localeCompare(String(b.major), 'zh-CN')","String(a.direction).localeCompare(String(b.direction), 'zh-CN')")
write(p,text)

# 2) Tool registry: empty exact-major result can safely identify a known non-queryable background direction.
p=Path('functions/_lib/ai/tool-registry.js'); text=read(p)
text=replace_once(text,"  schoolBackgroundFromSnapshot,\n  majorBackgroundFromSnapshot,","  schoolBackgroundFromSnapshot,\n  schoolBackgroundDirectionFromSnapshot,\n  majorBackgroundFromSnapshot,",'registry direction import')
old="""  const scores=records.map(record=>Number(record.score2026)).filter(Number.isFinite),summary=successfulCount?(
    requested.length>1||projectScope==='exclude_sino'?{total:records.length,schoolCount:records.length?1:0,uniqueMajorCount:new Set(records.map(record=>record.major).filter(Boolean)).size,minScore:scores.length?Math.min(...scores):null,maxScore:scores.length?Math.max(...scores):null}:firstPayload.summary||{}
  ):({total:0,schoolCount:0,minScore:null,maxScore:null});
  return{ok:true,partial,allFailed,school:schoolName,majorKeyword:requested.length>1?'':clean(requested[0]||'',160),majorKeywords:requested,bottomLineMode:projectScope,records,queryResults,total:records.length,majorSuggestions:majorSuggestionsFor(records,schoolName),summary,meta:firstPayload?.meta||{},source:firstPayload?.source||{},adapterVersion:AI_SCHOOL_HISTORY_ADAPTER_VERSION,bridgeVersion:AI_FACT_BRIDGE_CONTRACT_VERSION,scoreUsed:false,boundary:`只展示辽宁2026物理类实际投档记录；学校历史事实由同源的按校预聚合分片读取，本轮不使用考生分数过滤${projectScope==='exclude_sino'?'，并已排除中外合作/高收费记录':''}。`,message:allFailed?'本轮各专业查询都暂时没有完成；请优先重试标记为失败的专业。':partial?'部分专业已完成，失败专业已单独标出。':''};
"""
new="""  const scores=records.map(record=>Number(record.score2026)).filter(Number.isFinite),sourceSummary=firstPayload.summary&&typeof firstPayload.summary==='object'?firstPayload.summary:{},summary=successfulCount?{...sourceSummary,total:records.length,schoolCount:records.length?1:0,uniqueMajorCount:new Set(records.map(record=>record.major).filter(Boolean)).size,minScore:scores.length?Math.min(...scores):null,maxScore:scores.length?Math.max(...scores):null}:({total:0,schoolCount:0,uniqueMajorCount:0,minScore:null,maxScore:null});
  let directionRedirect=null;
  if(requested.length===1&&records.length===0&&successfulCount>0){
    try{
      const snapshot=await loadAiBackgroundSnapshot(context),match=schoolBackgroundDirectionFromSnapshot(snapshot,schoolName,requested[0]);
      if(match)directionRedirect={kind:'background_direction',direction:clean(match.direction,160),admissionMajors:unique(match.admissionMajors||[],16),queryable:false};
    }catch{}
  }
  const majorSuggestions=directionRedirect?(directionRedirect.admissionMajors||[]).slice(0,3).map(major=>({major,prompt:`${schoolName}${major}多少分`,reason:`“${directionRedirect.direction}”是学校背景方向，不是招生专业名；请从该方向下的实际招生专业继续查。`})):majorSuggestionsFor(records,schoolName);
  const directionMessage=directionRedirect?`“${directionRedirect.direction}”是${schoolName}背景证据中的专业方向/专业群，不是当前招生专业名；没有把它解释成“0分专业”。可继续查：${(directionRedirect.admissionMajors||[]).slice(0,8).join('、')||'该方向下的实际招生专业'}。`:'';
  return{ok:true,partial,allFailed,school:schoolName,majorKeyword:requested.length>1?'':clean(requested[0]||'',160),majorKeywords:requested,bottomLineMode:projectScope,records,queryResults,total:records.length,directionRedirect,majorSuggestions,summary,meta:firstPayload?.meta||{},source:firstPayload?.source||{},adapterVersion:AI_SCHOOL_HISTORY_ADAPTER_VERSION,bridgeVersion:AI_FACT_BRIDGE_CONTRACT_VERSION,scoreUsed:false,boundary:`只展示辽宁2026物理类实际投档记录；学校历史事实由同源的按校预聚合分片读取，本轮不使用考生分数过滤${projectScope==='exclude_sino'?'，并已排除中外合作/高收费记录':''}${directionRedirect?'；背景方向名称不等于招生专业名称':''}。`,message:directionMessage||(allFailed?'本轮各专业查询都暂时没有完成；请优先重试标记为失败的专业。':partial?'部分专业已完成，失败专业已单独标出。':'')};
"""
text=replace_once(text,old,new,'school history semantic redirect')
write(p,text)

# 3) Next actions: background direction never becomes a score-query prompt.
p=Path('functions/_lib/ai/next-action-engine.js'); text=read(p)
needle="""  if(task==='school_history'||task==='school_major_history')return[
"""
insert="""  if(task==='school_major_history'&&result?.history?.directionRedirect?.admissionMajors?.length)return result.history.directionRedirect.admissionMajors.slice(0,3).map((major,index)=>action(`direction-major-history-${index}`,`查${major}分数`,`${s}${major}多少分`,`“${result.history.directionRedirect.direction}”是背景方向；这里改查实际招生专业。`,110-index));
"""+needle
text=replace_once(text,needle,insert,'direction next actions')
write(p,text)

# 4) Answer composer: null is not zero; direction query is a corrected answer, not a fake 0-score result.
p=Path('functions/_lib/ai/answer-composer.js'); text=read(p)
text=replace_once(text,"function number(value){const n=Number(value);return Number.isFinite(n)?n:null;}","function number(value){if(value===null||value===undefined||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}",'null-safe answer number')
needle="""  if(result.history){if(result.history.ok&&!result.history.allFailed){"""
insert="""  if(result.history?.directionRedirect){const direction=result.history.directionRedirect,majors=(direction.admissionMajors||[]).slice(0,8);return{status:'answered',text:`“${direction.direction||result.history.majorKeyword}”是${result.history.school||focus.school}背景证据里的专业方向/专业群，不是当前招生专业名，所以不能把它当成一个“0分专业”。这个方向下可继续查的实际招生专业包括：${majors.join('、')||'暂未形成可安全列出的招生专业'}。`};}\n"""+needle
text=replace_once(text,needle,insert,'direction primary answer')
text=replace_once(text,"`已找到${focus.school||focus.major||'当前方向'}可核验的专业背景证据，具体学校或专业见下方。`","`已找到${focus.school||focus.major||'当前方向'}可核验的专业背景证据；背景方向与实际招生专业会分开展示。`",'background primary wording')
write(p,text)

# 5) Presentation: use queryable admission major, label directions honestly, and keep nullable score summaries null.
p=Path('functions/_lib/ai/advisor-presentation.js'); text=read(p)
text=text.replace("min=Number(history.summary?.minScore),max=Number(history.summary?.maxScore)","min=validScore(history.summary?.minScore),max=validScore(history.summary?.maxScore)")
old_hist="""function historySummary(history){if(!history?.ok)return history?.message||'学校专业历史没有读取成功。';if(history.allFailed)return history.message||'本轮各专业查询都暂时没有完成。';const total=history.records?.length||0,multi=Array.isArray(history.majorKeywords)&&history.majorKeywords.length>1,major=multi?` · ${history.majorKeywords.join('、')}`:(history.majorKeyword?` · ${history.majorKeyword}`:'');const partial=history.partial?'其中部分专业暂时失败，下面会单独标出。':'',scope=history.bottomLineMode==='exclude_sino'?'已排除中外合作/高收费记录':'默认包含普通项目与中外合作/高收费项目';if(!history.majorKeyword&&!multi){const uniqueCount=Number(history.summary?.uniqueMajorCount||0),min=Number(history.summary?.minScore),max=Number(history.summary?.maxScore),range=[];if(Number.isFinite(min))range.push(`最低${min}分`);if(Number.isFinite(max))range.push(`最高${max}分`);return`${history.school}在辽宁2026物理类共返回 ${total} 条实际投档记录${uniqueCount?`，覆盖 ${uniqueCount} 个专业/项目`:''}${range.length?`；${range.join('，')}`:''}。${scope}。${partial}下面按投档分从高到低列出全部记录；这轮不拿你的个人分数过滤。`;}return`我分别查了 ${history.school}${major} 的辽宁2026物理类实际投档记录，共返回 ${total} 条；${scope}。${partial||'这轮没有拿你的个人分数过滤。'}`;}
"""
new_hist="""function historySummary(history){if(!history?.ok)return history?.message||'学校专业历史没有读取成功。';if(history.allFailed)return history.message||'本轮各专业查询都暂时没有完成。';if(history.directionRedirect){const majors=(history.directionRedirect.admissionMajors||[]).slice(0,8);return`“${history.directionRedirect.direction||history.majorKeyword}”是${history.school}背景证据中的专业方向/专业群，不是招生专业名，因此这轮不把 0 条结果写成“最低0分/最高0分”。这个方向下可继续查的实际招生专业包括：${majors.join('、')||'暂未形成可安全列出的招生专业'}。`;}const total=history.records?.length||0,multi=Array.isArray(history.majorKeywords)&&history.majorKeywords.length>1,major=multi?` · ${history.majorKeywords.join('、')}`:(history.majorKeyword?` · ${history.majorKeyword}`:'');const partial=history.partial?'其中部分专业暂时失败，下面会单独标出。':'',scope=history.bottomLineMode==='exclude_sino'?'已排除中外合作/高收费记录':'默认包含普通项目与中外合作/高收费项目';if(!history.majorKeyword&&!multi){const uniqueCount=Number(history.summary?.uniqueMajorCount||0),min=validScore(history.summary?.minScore),max=validScore(history.summary?.maxScore),range=[];if(min!==null)range.push(`最低${min}分`);if(max!==null)range.push(`最高${max}分`);return`${history.school}在辽宁2026物理类共返回 ${total} 条实际投档记录${uniqueCount?`，覆盖 ${uniqueCount} 个专业/项目`:''}${range.length?`；${range.join('，')}`:''}。${scope}。${partial}下面按投档分从高到低列出全部记录；这轮不拿你的个人分数过滤。`;}return`我分别查了 ${history.school}${major} 的辽宁2026物理类实际投档记录，共返回 ${total} 条；${scope}。${partial||'这轮没有拿你的个人分数过滤。'}`;}
"""
text=replace_once(text,old_hist,new_hist,'history summary direction')
old_bg="""function backgroundSummary(background){if(!background?.ok)return background?.message||'当前背景知识库没有形成可展示结果。';if(background.previewOnly)return`这次把你当前分数窗口与辽宁学校背景证据做了交集预览，找到 ${background.items?.length||0} 条有证据的代表性记录；它不是“最佳专业排名”。`;if(background.school)return`当前背景知识库能为 ${background.school} 提供 ${background.items?.length||0} 组受控背景摘要；没有证据的部分不补猜。`;if(background.major)return`围绕“${background.major}”，当前背景知识库找到 ${background.items?.length||0} 个可继续研究的背景方向。`;return`辽宁背景知识库当前有 ${background.totalWithEvidence||background.items?.length||0} 个方向通过证据门禁，先展示最值得继续核验的一部分；未显示不代表其他专业不好。`;}
"""
new_bg="""function backgroundSummary(background){if(!background?.ok)return background?.message||'当前背景知识库没有形成可展示结果。';if(background.previewOnly)return`这次把你当前分数窗口与辽宁学校背景证据做了交集预览，找到 ${background.items?.length||0} 条有证据的代表性记录；它不是“最佳专业排名”。`;if(background.school)return`当前背景知识库能为 ${background.school} 提供 ${background.items?.length||0} 组受控专业方向摘要。方向名称用于表达学校积累，不等于招生专业名；下面只把同一资源中真实出现的招生专业作为查分入口。`;if(background.major)return`围绕“${background.major}”，当前背景知识库找到 ${background.items?.length||0} 个可继续研究的背景方向。`;return`辽宁背景知识库当前有 ${background.totalWithEvidence||background.items?.length||0} 个方向通过证据门禁，先展示最值得继续核验的一部分；方向不是招生专业排名，未显示也不代表其他专业不好。`;}
"""
text=replace_once(text,old_bg,new_bg,'background summary wording')
old_relation="backgroundMajor:result?.background?.items?.[0]?.major||result?.background?.items?.[0]?.majorName||''"
new_relation="backgroundMajor:result?.background?.items?.[0]?.admissionMajors?.[0]||result?.background?.items?.[0]?.majorName||''"
text=replace_once(text,old_relation,new_relation,'queryable background next action')
text=text.replace("minScore:Number.isFinite(Number(result.history.summary?.minScore))?Number(result.history.summary.minScore):null,maxScore:Number.isFinite(Number(result.history.summary?.maxScore))?Number(result.history.summary.maxScore):null","minScore:validScore(result.history.summary?.minScore),maxScore:validScore(result.history.summary?.maxScore)")
text=text.replace("queryResults:(result.history.queryResults||[]).filter(item=>item?.query||result.history.partial).slice(0,8)","queryResults:result.history.directionRedirect?[]:(result.history.queryResults||[]).filter(item=>item?.query||result.history.partial).slice(0,8)")
text=replace_once(text,"title:'有证据的学校 / 专业背景'","title:'有证据的学校 / 专业方向'",'background block title')
write(p,text)

# 6) Browser renderer: direction cards expose actual majors; no direction-name score prompt; null-safe number formatting.
p=Path('aiplus/render.v3992_0.js'); text=read(p)
text=replace_once(text,"function numberText(value){const n=Number(value);return Number.isFinite(n)?n.toLocaleString('zh-CN'):'';}","function numberText(value){if(value===null||value===undefined||String(value).trim()==='')return'';const n=Number(value);return Number.isFinite(n)?n.toLocaleString('zh-CN'):'';}",'render null-safe number')
text=text.replace("if(Number.isFinite(Number(history.minScore)))bits.push(`最低${history.minScore}分`);if(Number.isFinite(Number(history.maxScore)))bits.push(`最高${history.maxScore}分`);","const minScore=numberText(history.minScore),maxScore=numberText(history.maxScore);if(minScore)bits.push(`最低${minScore}分`);if(maxScore)bits.push(`最高${maxScore}分`);")
new_render_bg="""function renderBackground(block,box,onPrompt){
  const bg=block.background||{},items=bg.items||[],grid=node('div','background-grid');
  for(const item of items.slice(0,16)){
    const card=node('article','background-item');
    if(item.record&&item.background){
      card.append(node('strong','',`${item.record.school} · ${item.record.major}`));
      const ref=[];if(item.record.score2026)ref.push(`${item.record.score2026}分`);if(item.record.rank2026)ref.push(`${numberText(item.record.rank2026)}位`);if(ref.length)card.append(node('span','',`2026参考 · ${ref.join(' · ')}`));
      card.append(node('small','',item.background.label||item.background.direction||'背景证据已通过门禁'));
      const a=node('a','background-school-link','查看该校全部专业');a.href=schoolAllHref(item.record.school);card.append(a);
    }else{
      const direction=item.direction||item.major||item.name||item.label||'背景方向',admissionMajors=Array.isArray(item.admissionMajors)?item.admissionMajors.filter(Boolean):[];
      card.append(node('strong','',direction),node('small','',item.entityKind==='background_direction'?'专业方向 / 专业群（不是招生专业名）':'背景方向'));
      const bits=[];if(item.schoolCount)bits.push(`${item.schoolCount}所学校`);if(item.primaryCount)bits.push(`${item.primaryCount}个主背景`);if(item.overview)bits.push(item.overview);if(bits.length)card.append(node('span','',bits.join(' · ')));
      if(admissionMajors.length)card.append(node('span','background-admission-majors',`可查招生专业：${admissionMajors.slice(0,8).join('、')}`));
      const schools=Array.isArray(item.schools)?item.schools.filter(entry=>backgroundSchoolName(entry)):[];
      if(schools.length){
        const details=node('details','background-schools'),summary=node('summary','',`展开 ${schools.length} 所学校`),links=node('div','background-school-actions');details.append(summary);
        for(const entry of schools){
          const school=backgroundSchoolName(entry),schoolMajors=Array.isArray(entry?.admissionMajors)?entry.admissionMajors.filter(Boolean):[];
          links.append(promptButton(school,`介绍下${school}`,onPrompt,'background-school-prompt','先看学校整体'));
          if(schoolMajors[0])links.append(promptButton(`查${schoolMajors[0]}分数`,`${school}${schoolMajors[0]}多少分`,onPrompt,'background-school-prompt','只用实际招生专业查分'));
          const a=node('a','background-school-link','全部专业');a.href=schoolAllHref(school);links.append(a);
        }
        details.append(links);card.append(details);
      }else if(item.school){
        if(admissionMajors[0])card.append(promptButton(`查${admissionMajors[0]}分数`,`${item.school}${admissionMajors[0]}多少分`,onPrompt,'background-school-prompt','只用实际招生专业查分'));
        const a=node('a','background-school-link','查看该校全部专业');a.href=schoolAllHref(item.school);card.append(a);
      }
    }
    grid.append(card);
  }
  if(items.length)box.append(grid);
}
"""
text=regex_once(text,r"function renderBackground\(block,box,onPrompt\)\{.*?\nfunction renderBlock",new_render_bg+"function renderBlock",'render background contract',re.S)
write(p,text)

# 7) Permanent AEK verifier: one truth source, no direction-as-major, and no null-to-zero answer.
p=Path('tools/verify-aiplus-aek-v001.mjs'); text=read(p)
text=replace_once(text,"import assert from 'node:assert/strict';","import assert from 'node:assert/strict';\nimport fs from 'node:fs';",'AEK fs import')
anchor="import {runEducationKnowledgeEvidence,OFFICIAL_WEB_EVIDENCE_TESTING} from '../functions/_lib/ai/official-web-evidence.js';\n"
imports=anchor+"import {schoolBackgroundFromSnapshot,schoolBackgroundDirectionFromSnapshot} from '../functions/_lib/ai/background-resource-adapter.js';\nimport {nextActionsForTurn} from '../functions/_lib/ai/next-action-engine.js';\nimport {composePrimaryAnswer} from '../functions/_lib/ai/answer-composer.js';\n"
text=replace_once(text,anchor,imports,'AEK background imports')
marker="\nconsole.log(JSON.stringify({ok:true,version:'aiplus-aek-verifier-v0.02'"
tests="""

const backgroundSnapshot=JSON.parse(fs.readFileSync(new URL('../ln-rank/data/local-strength/local-strength-index.v3971_2.json',import.meta.url),'utf8'));
const syitBackground=schoolBackgroundFromSnapshot(backgroundSnapshot,'沈阳工业大学');
const motorDirection=syitBackground.items.find(item=>item.direction==='电机电器与装备制造');
assert.ok(motorDirection,'沈阳工业大学 background direction must remain available');
assert.equal(motorDirection.entityKind,'background_direction');
assert.equal(motorDirection.historyQueryable,false,'background direction itself must never be a score-query key');
assert.ok(motorDirection.admissionMajors.includes('电气工程及其自动化'));
assert.ok(motorDirection.admissionMajors.includes('自动化'));
assert.ok(motorDirection.admissionMajors.includes('机械设计制造及其自动化'));
assert.ok(motorDirection.admissionMajors.includes('测控技术与仪器'));
assert.ok(motorDirection.schools.every(item=>Array.isArray(item.admissionMajors)),'each school must retain its own queryable majors');
const exactDirection=schoolBackgroundDirectionFromSnapshot(backgroundSnapshot,'沈阳工业大学','电机电器与装备制造');
assert.equal(exactDirection?.historyQueryable,false);
assert.equal(schoolBackgroundDirectionFromSnapshot(backgroundSnapshot,'沈阳工业大学','电气工程及其自动化'),null,'real major and background direction must stay distinct');
const backgroundActions=nextActionsForTurn({task:'school_background',school:'沈阳工业大学',backgroundMajor:motorDirection.admissionMajors[0],result:{background:{ok:true,items:[motorDirection]}},workspace:createAiWorkspace()});
assert.ok(backgroundActions.some(item=>item.prompt.includes('电气工程及其自动化')&&item.prompt.includes('多少分')),'school background must offer a real admissions-major score action');
assert.ok(backgroundActions.every(item=>!item.prompt.includes('电机电器与装备制造多少分')),'direction label must never become a score action');
const directionHistory={ok:true,allFailed:false,school:'沈阳工业大学',majorKeyword:'电机电器与装备制造',majorKeywords:['电机电器与装备制造'],records:[],total:0,summary:{total:0,minScore:null,maxScore:null},directionRedirect:{kind:'background_direction',direction:'电机电器与装备制造',admissionMajors:motorDirection.admissionMajors,queryable:false}};
const directionAnswer=composePrimaryAnswer({command:{agentTask:'school_major_history'},result:{history:directionHistory},focus:{school:'沈阳工业大学'}});
assert.match(directionAnswer.text,/不是当前招生专业名|不是招生专业名/);
assert.match(directionAnswer.text,/电气工程及其自动化/);
assert.doesNotMatch(directionAnswer.text,/最低0分|最高0分|0分专业.*实际投档/);
const emptyHistory={ok:true,allFailed:false,school:'测试大学',majorKeyword:'不存在专业',majorKeywords:['不存在专业'],records:[],total:0,summary:{total:0,minScore:null,maxScore:null},queryResults:[{query:'不存在专业',status:'success',recordCount:0}]};
const emptyAnswer=composePrimaryAnswer({command:{agentTask:'school_major_history'},result:{history:emptyHistory},focus:{school:'测试大学'}});
assert.doesNotMatch(emptyAnswer.text,/最低0分|最高0分/,'nullable score summary must never be rendered as zero');
"""
text=replace_once(text,marker,tests+marker,'AEK background invariant tests')
write(p,text)

# 8) Existing UI audit owns renderer contract; no second workflow/verifier owner.
p=Path('tools/audit-aiplus-v002-ui.mjs'); text=read(p)
anchor="assert.match(render,/你是不是在找/);\n"
addition=anchor+"assert.match(render,/专业方向 \/ 专业群（不是招生专业名）/);\nassert.match(render,/schoolMajors\[0\]/);\nassert.doesNotMatch(render,/const major=item\.major\|\|bg\.major/,'background direction must not be reused as a score-query major');\n"
text=replace_once(text,anchor,addition,'UI direction-query invariant')
write(p,text)

print('patched background direction contract')
