import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,value){fs.writeFileSync(path,value);}
function replaceOnce(path,oldText,newText,label){
  let source=read(path);
  if(source.includes(newText)){console.log(`skip ${label}`);return;}
  if(!source.includes(oldText))throw new Error(`missing ${label} in ${path}`);
  source=source.replace(oldText,newText);write(path,source);console.log(`patched ${label}`);
}
function transform(path,label,fn){const source=read(path),next=fn(source);if(next===source){console.log(`skip ${label}`);return;}write(path,next);console.log(`patched ${label}`);}
function ensureIncludes(path,needle,label){if(!read(path).includes(needle))throw new Error(`missing postcondition ${label} in ${path}`);}

// UBC-01: exact canonical context remains exact, but unfiltered discovery must not collapse to empty.
replaceOnce('shared/resources/background/academic-background-context.v001.js',
`function majorMatches(record = {}, { majorCode = '', majorName = '' } = {}) {
  const code = clean(majorCode, 30).toUpperCase();
  if (code) return clean(record?.canonicalMajor?.code, 30).toUpperCase() === code;
  const name = normalizeBackgroundIdentityText(majorName);
  return Boolean(name && normalizeBackgroundIdentityText(record?.canonicalMajor?.name) === name);
}`,
`function majorMatches(record = {}, { majorCode = '', majorName = '', matchMode = 'exact' } = {}) {
  const code = clean(majorCode, 30).toUpperCase();
  if (code) return clean(record?.canonicalMajor?.code, 30).toUpperCase() === code;
  const name = normalizeBackgroundIdentityText(majorName);
  if (!name) return true;
  const canonical = normalizeBackgroundIdentityText(record?.canonicalMajor?.name);
  if (canonical === name) return true;
  if (matchMode !== 'related') return false;
  const values = [record?.canonicalMajor?.name, ...(record?.admissionMajors || []), ...(record?.directions || [])]
    .map(normalizeBackgroundIdentityText)
    .filter(Boolean);
  return values.some(value => value.includes(name) || (name.length >= 4 && value.length >= 4 && name.includes(value)));
}`,'context major match modes');
replaceOnce('shared/resources/background/academic-background-context.v001.js',
`  school = '', majorCode = '', majorName = '', scope = 'auto', regionKeys = ['all'], limit = 200
} = {}) {`,
`  school = '', majorCode = '', majorName = '', scope = 'auto', regionKeys = ['all'], limit = 200, majorMatchMode = 'exact'
} = {}) {`,'context query match-mode arg');
replaceOnce('shared/resources/background/academic-background-context.v001.js',
`    && majorMatches(record, { majorCode, majorName })`,
`    && majorMatches(record, { majorCode, majorName, matchMode: majorMatchMode })`,'context query match-mode use');
replaceOnce('shared/resources/background/academic-background-context.v001.js',
`  const query = queryAcademicBackgroundContext(snapshot, { majorCode, majorName, scope, regionKeys, limit: 500 });`,
`  const query = queryAcademicBackgroundContext(snapshot, { majorCode, majorName, scope, regionKeys, limit: 500, majorMatchMode: majorCode ? 'exact' : 'related' });`,'major background related query');
transform('shared/resources/background/academic-background-context.v001.js','major background no implicit ranking',source=>{
  source=source.replace(`    const key = normalizeBackgroundIdentityText(record.schoolIdentity || record.school);`, `    const key = \`${'${normalizeBackgroundIdentityText(record.schoolIdentity || record.school)}'}|${'${clean(record?.canonicalMajor?.code, 30).toUpperCase()}'}\`;`);
  source=source.replace(`  }).sort((a, b) =>
    b.scopesMatched.length - a.scopesMatched.length
    || b.evidence.length - a.evidence.length
    || String(a.school).localeCompare(String(b.school), 'zh-CN')
  ).slice(0, Math.max(1, Math.min(200, Number(limit || 120))));`, `  }).sort((a, b) =>
    String(a.school).localeCompare(String(b.school), 'zh-CN')
    || String(a.canonicalMajor?.code || '').localeCompare(String(b.canonicalMajor?.code || ''))
  ).slice(0, Math.max(1, Math.min(200, Number(limit || 120))));`);
  source=source.replace(`    total: bySchool.size,`, `    total: items.length,
    schoolCount: new Set(items.map(item => normalizeBackgroundIdentityText(item.school))).size,`);
  return source;
});

// Preserve official 211 provenance in the derived execution index.
replaceOnce('tools/build-background-context-index-v001.mjs',
`  const url = clean(source.url || source.sourceUrl || fallback.url || fallback.sourceUrl, 500);`,
`  const url = clean(source.url || source.sourceUrl || source.noticeUrl || source.attachmentUrl || fallback.url || fallback.sourceUrl || fallback.noticeUrl || fallback.attachmentUrl, 500);`,'211 source URL provenance');
replaceOnce('tools/build-background-context-index-v001.mjs',
`      executionRole: 'derived-evidence-index-only',`,
`      executionRole: 'derived-evidence-index-only',
      dataYear: 2026,`,'derived context data year');

// UBC-03: score-mode handoff must retain the school identity already visible on the canonical admissions card.
replaceOnce('ln-rank/js/workspace/major-path-handoff.v003.js',
`    const entry = makeEntry(target, { context: 'score', sourceKey, sourceMajor });`,
`    const school = clean(card.querySelector('.school')?.textContent);
    const entry = makeEntry(target, { context: 'score', sourceKey, sourceMajor, school });`,'score-mode school identity handoff');

// Additive source-surface context: existing ln-rank v0.03 URLs remain unchanged; background-return links can identify themselves.
replaceOnce('shared/resources/majors/major-path-navigation.v003.js',
`    sourceMajor: text(url.searchParams.get('sourceMajor')),
    canonicalName: text(url.searchParams.get('canonicalName')),`,
`    sourceMajor: text(url.searchParams.get('sourceMajor')),
    sourceSurface: text(url.searchParams.get('sourceSurface')),
    canonicalName: text(url.searchParams.get('canonicalName')),`,'major-path source surface read');

// UBC-02 / UBC-05: one background navigation contract owns both directions.
replaceOnce('shared/resources/background/academic-background-navigation.v001.js',
`import { normalizeBackgroundScope } from './academic-background-context.v001.js';`,
`import { normalizeBackgroundScope } from './academic-background-context.v001.js';
import { buildMajorPathHref } from '../majors/major-path-navigation.v003.js?v=003_0';`,'background navigation major-path import');
replaceOnce('shared/resources/background/academic-background-navigation.v001.js',
`  params.set('view', normalizedScope === '211' ? 'major' : 'list_all');`,
`  params.set('view', school ? 'school' : (normalizedScope === '211' ? 'major' : 'list_all'));`,'background direct detail view');
transform('shared/resources/background/academic-background-navigation.v001.js','background to major-path helper',source=>{
  if(source.includes('buildMajorPathFromAcademicBackgroundHref'))return source;
  return source + `\nexport function buildMajorPathFromAcademicBackgroundHref({\n  majorCode = '', canonicalName = '', school = '', sourceMajor = '', returnTo = '/ln-rank/'\n} = {}) {\n  const href = buildMajorPathHref({\n    majorCode, canonicalName, context: school ? 'school' : 'score', sourceMajor: sourceMajor || canonicalName, school, returnTo\n  });\n  if (!href) return '';\n  const url = new URL(href, 'https://gaokao.powers.org.cn');\n  url.searchParams.set('sourceSurface', 'academic-background');\n  return \`${'${url.pathname}${url.search}${url.hash}'}\`;\n}\n`;
});

// UBC-04: mount the background presentation after the human undergraduate->graduate answer and before relationship exploration.
replaceOnce('major-path/app.v004.js',
`import { MAJOR_CATALOG_2026 } from '../ln-rank/kb/major-understanding/major-catalog-2026.generated.js?v=3949_0';`,
`import { MAJOR_CATALOG_2026 } from '../ln-rank/kb/major-understanding/major-catalog-2026.generated.js?v=3949_0';
import { mountMajorPathBackgroundContext, MAJOR_PATH_BACKGROUND_CONTEXT_VERSION } from './background-context.v001.js';`,'major-path background import');
replaceOnce('major-path/app.v004.js',
`function conciseSourceContext(context, major) {
  const sourceMajor = String(context.sourceMajor || '').trim();`,
`function conciseSourceContext(context, major) {
  const sourceMajor = String(context.sourceMajor || '').trim();
  if (context.sourceSurface === 'academic-background') {
    return {
      title: context.school ? \`来自刚才的${'${context.school}'}专业背景依据\` : '来自刚才的专业背景依据',
      body: '这里继续看专业本身和本科到读研路径；学校背景证据仍回刚才页面核验。'
    };
  }`,'major-path background source copy');
replaceOnce('major-path/app.v004.js',
`  action.textContent = context.context === 'school' && context.school
    ? \`← 返回${'${context.school}'}的专业\`
    : '← 返回刚才的专业列表';`,
`  action.textContent = context.sourceSurface === 'academic-background'
    ? '← 返回背景依据'
    : context.context === 'school' && context.school
      ? \`← 返回${'${context.school}'}的专业\`
      : '← 返回刚才的专业列表';`,'major-path background return copy');
replaceOnce('major-path/app.v004.js',
`function wrapRelationship(shell, relationship, focus) {`,
`function wrapRelationship(shell, relationship, focus, anchor = focus) {`,'relationship anchor arg');
replaceOnce('major-path/app.v004.js',
`  focus.insertAdjacentElement('afterend', details);`,
`  anchor?.insertAdjacentElement('afterend', details);`,'relationship anchor placement');
replaceOnce('major-path/app.v004.js',
`  const focus = makePathwayFocus(shell, major, undergrad, graduate);
  const explore = wrapRelationship(shell, relationship, focus);
  buildEvidenceDetails(shell, relationship, graduate, source, explore || focus);`,
`  const focus = makePathwayFocus(shell, major, undergrad, graduate);
  const background = mountMajorPathBackgroundContext({ shell, major, focus, sourceContext, direct: renderState.directBoot });
  const explore = wrapRelationship(shell, relationship, focus, background || focus);
  buildEvidenceDetails(shell, relationship, graduate, source, explore || background || focus);`,'major-path background order');
replaceOnce('major-path/app.v004.js',
`    removeQueryKeys(['majorCode', 'major', 'from', 'context', 'sourceKey', 'sourceMajor', 'school', 'returnTo']);`,
`    removeQueryKeys(['majorCode', 'major', 'from', 'context', 'sourceKey', 'sourceMajor', 'sourceSurface', 'school', 'returnTo']);`,'major-path clear background source');
replaceOnce('major-path/app.v004.js',
`  navigationVersion: MAJOR_PATH_NAVIGATION_META.version,
  direct: renderState.directBoot,`,
`  navigationVersion: MAJOR_PATH_NAVIGATION_META.version,
  backgroundVersion: MAJOR_PATH_BACKGROUND_CONTEXT_VERSION,
  direct: renderState.directBoot,`,'major-path background meta');
replaceOnce('major-path/index.html',
`  <link rel="stylesheet" href="/major-path/major-path-human.v004.css?v=004_0">`,
`  <link rel="stylesheet" href="/major-path/major-path-human.v004.css?v=004_0">
  <link rel="stylesheet" href="/major-path/background-context.v001.css?v=001_0">`,'major-path background CSS entry');

// Stable background runtimes remain immutable; only their HTML receives the additive presentation adapter.
for(const page of ['ln-rank/local-mainline.html','ln-rank/211-mainline.html']){
  replaceOnce(page,
    page.includes('local-mainline') ? `  <link rel="stylesheet" href="/ln-rank/css/local-strength-score-position.v3972_3.css?v=3972_3" />` : `  <link rel="stylesheet" href="/ln-rank/css/all211-static.v3972_0.css?v=3972_0" />`,
    (page.includes('local-mainline') ? `  <link rel="stylesheet" href="/ln-rank/css/local-strength-score-position.v3972_3.css?v=3972_3" />` : `  <link rel="stylesheet" href="/ln-rank/css/all211-static.v3972_0.css?v=3972_0" />`) + `\n  <link rel="stylesheet" href="/ln-rank/css/background-context-direct.v001.css?v=001_0" />`,`${page} direct CSS`);
  const runtime = page.includes('local-mainline')
    ? `  <script type="module" src="/ln-rank/js/local-strength/local-strength-app.v3971_2.js?v=3972_3"></script>`
    : `  <script type="module" src="/ln-rank/js/academic-background/all211-static-app.v3972_0.js?v=3972_0"></script>`;
  replaceOnce(page,runtime,`  <script type="module" src="/ln-rank/js/academic-background/background-context-direct.v001.js?v=001_0"></script>\n${runtime}`,`${page} direct runtime`);
}

// UBC-06: background evidence scope is one human-query semantic slot, never a candidate filter.
replaceOnce('functions/_lib/ai/human-query-frame.js',
`export const AI_HUMAN_QUERY_FRAME_VERSION='ai-human-query-frame-v0.03';`,
`export const AI_HUMAN_QUERY_FRAME_VERSION='ai-human-query-frame-v0.04';`,'human query frame version');
transform('functions/_lib/ai/human-query-frame.js','background scope semantic slot',source=>{
  if(source.includes('export function backgroundScopeFromText'))return source;
  const marker=`export function collectionScopeFromText(value=''){`;
  const insert=`export function backgroundScopeFromText(value=''){\n  const source=text(value);\n  if(!source)return{scope:'auto',explicit:false,index:-1,token:''};\n  const backgroundLanguage=/(?:背景|底子|积累|强项|优势|建设学科|专业方向|学科方向)/.test(source);\n  if(!backgroundLanguage)return{scope:'auto',explicit:false,index:-1,token:''};\n  const match211=/(?:211(?:院校|高校|学校|里|范围|背景|专业背景)|(?:只看|看看|查询|查|在|从).{0,5}211)/.exec(source);\n  const matchLiaoning=/(?:省内背景|辽宁(?:省)?(?:背景|院校|高校|学校|范围)?|省内(?:院校|高校|学校|范围)?)/.exec(source);\n  if(match211&&(!matchLiaoning||match211.index<=matchLiaoning.index))return{scope:'211',explicit:true,index:match211.index,token:match211[0]};\n  if(matchLiaoning)return{scope:'liaoning',explicit:true,index:matchLiaoning.index,token:matchLiaoning[0]};\n  return{scope:'auto',explicit:false,index:-1,token:''};\n}\n\n`;
  if(!source.includes(marker))throw new Error('human query frame insertion marker missing');
  return source.replace(marker,insert+marker);
});
replaceOnce('functions/_lib/ai/human-query-frame.js',
`export const HUMAN_QUERY_FRAME_TESTING=Object.freeze({SCORE_MIN,SCORE_MAX,ALL_SCHOOL_MAJOR_SCOPE_RE,SCHOOL_TOPIC_PATTERNS,MAJOR_TOPIC_PATTERNS});`,
`export const HUMAN_QUERY_FRAME_TESTING=Object.freeze({SCORE_MIN,SCORE_MAX,ALL_SCHOOL_MAJOR_SCOPE_RE,SCHOOL_TOPIC_PATTERNS,MAJOR_TOPIC_PATTERNS});`,'human query frame testing stable');

replaceOnce('functions/_lib/ai/command-interpreter.js',
`import {collectionScopeFromText,isScoreWindow,scoreConstraintFromText,schoolTopicBoundaryFromText} from './human-query-frame.js';`,
`import {backgroundScopeFromText,collectionScopeFromText,isScoreWindow,scoreConstraintFromText,schoolTopicBoundaryFromText} from './human-query-frame.js';`,'command scope import');
transform('functions/_lib/ai/command-interpreter.js','command background scope fields',source=>{
  if(!source.includes('backgroundScope:backgroundScope.scope')){
    const old=`  const familyChanges=legacy.persistence==='family'?{regionIncludeKeys:geo.keys.filter(k=>k!=='all'),regionExcludeKeys:[],majorExcludeKeywords:negative,bottomLineMode:bottomLineMode||''}:{};`;
    const next=`  const backgroundScope=backgroundScopeFromText(source),familyChanges=legacy.persistence==='family'?{regionIncludeKeys:geo.keys.filter(k=>k!=='all'),regionExcludeKeys:[],majorExcludeKeywords:negative,bottomLineMode:bottomLineMode||''}:{};`;
    if(!source.includes(old))throw new Error('command familyChanges marker missing');
    source=source.replace(old,next);
    source=source.replace(`regionContext:{type:geo.type||'',province:geo.province||'',city:geo.city||'',label:geo.label||'',key:geo.key||(geo.keys||[])[0]||'',inherited:geo.inherited===true},schoolLevel,`, `regionContext:{type:geo.type||'',province:geo.province||'',city:geo.city||'',label:geo.label||'',key:geo.key||(geo.keys||[])[0]||'',inherited:geo.inherited===true},backgroundScope:backgroundScope.scope,backgroundScopeExplicit:backgroundScope.explicit,schoolLevel,`);
    source=source.replace(`command.combination=fallback.combination;command.focus=fallback.focus;`, `command.combination=fallback.combination;command.focus=fallback.focus;command.backgroundScope=fallback.backgroundScope;command.backgroundScopeExplicit=fallback.backgroundScopeExplicit;`);
  }
  return source;
});
replaceOnce('functions/_lib/ai/agent-task-kernel.js',`background_discovery:'发现省内背景方向'`,`background_discovery:'发现专业背景方向'`,'generic background task label');

// UBC-07: keep existing tool names, but route all background executions through the unified scope-aware projection.
transform('functions/_lib/ai/tool-registry.js','scope-aware background tools',source=>{
  const start=source.indexOf(`export async function runSchoolBackground(context,{school}={}){`);
  const end=source.indexOf(`\nfunction uniqueField(records,field,max=80)`,start);
  if(start<0||end<0){if(source.includes(`runSchoolBackground(context,{school,major='',majorCode='',scope='auto'}`))return source;throw new Error('background tool block markers missing');}
  const block=`export async function runSchoolBackground(context,{school,major='',majorCode='',scope='auto'}={}){\n  const needle=normalizeText(school);if(!needle)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};\n  const snapshot=await loadAiBackgroundSnapshot(context),resolved=schoolBackgroundFromSnapshot(snapshot,school,{scope,major,majorCode});\n  if(!resolved.items.length){const scopeText=resolved.scope==='211'?'211专业背景':resolved.scope==='liaoning'?'辽宁省内专业背景':'省内与211专业背景';return{ok:false,code:'background_no_evidence',message:\`当前${'${scopeText}'}资源没有达到展示门禁的${'${major?`“${major}”`:"具体专业"}'}证据；未显示不代表学校或专业弱。\`,school:clean(school,120),major:clean(major,160),scope:resolved.scope};}\n  return{ok:true,school:clean(school,120),major:clean(major,160),scope:resolved.scope,items:resolved.items.slice(0,8),meta:resolved.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'背景证据来自统一学校×canonical专业 projection；省内与211是证据视角，不相加成强弱分，学校平台身份不能代替具体专业证据。'};\n}\nexport async function runMajorBackground(context,{major,majorCode='',scope='auto'}={}){\n  const needle=normalizeText(major);if(!needle&&!majorCode)return{ok:false,code:'major_required',message:'需要先明确一个专业或方向。'};\n  const snapshot=await loadAiBackgroundSnapshot(context),resolved=majorBackgroundFromSnapshot(snapshot,major,{scope,majorCode,regionKeys:['all']});\n  if(!resolved.items.length){const scopeText=resolved.scope==='211'?'211专业背景':resolved.scope==='liaoning'?'辽宁省内专业背景':'省内与211专业背景';return{ok:false,code:'background_no_evidence',message:\`当前${'${scopeText}'}资源没有足够证据把“${'${major||majorCode}'}”映射到具体学校×专业；未显示不代表没有优势学校。\`,major:clean(major,160),scope:resolved.scope};}\n  return{ok:true,major:clean(major,160),scope:resolved.scope,items:resolved.items.slice(0,16),total:resolved.total,schoolCount:resolved.schoolCount,meta:resolved.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'只展示统一背景资源中通过门禁的学校×canonical专业证据；列表不是学校排名，未显示不代表其他学校没有优势。'};\n}\nexport async function runBackgroundDiscovery(context,{limit=12,regionKeys=['ln'],scope='auto'}={}){\n  const snapshot=await loadAiBackgroundSnapshot(context),resolved=backgroundDiscoveryFromSnapshot(snapshot,{limit,regionKeys:normalizeRegionKeys(regionKeys),scope});\n  return{ok:true,scope:resolved.scope,regionKeys:normalizeRegionKeys(regionKeys),items:resolved.items,totalWithEvidence:resolved.totalWithEvidence,meta:resolved.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'这里只列当前请求证据范围内、通过门禁的专业背景方向；未显示不代表其他专业不值得报，也不直接等于就业优劣。'};\n}\nexport async function runBackgroundFitDiscovery(context,{score,bottomLineMode='all',regionKeys=['ln'],scope='auto'}={}){\n  const candidates=await runMajorBandSearch(context,{score,majorKeywords:[],regionKeys,bottomLineMode});if(candidates?.code==='client_tool_required'||candidates?.code==='client_tool_invalid')return candidates;if(!candidates.ok)return{ok:false,code:'candidate_search_failed',message:candidates.message||'当前分数候选没有读取成功。'};\n  const snapshot=await loadAiBackgroundSnapshot(context),matched=matchCandidateBackgrounds(snapshot,candidates.records||[],{scope});\n  return{ok:true,scope:matched.scope,score:Number(score),regionKeys:normalizeRegionKeys(regionKeys),items:matched.items.slice(0,24).map(item=>({record:historyRecord(item.record),background:item.background})),candidateCounts:candidates.counts,previewOnly:true,meta:matched.meta,adapterVersion:AI_BACKGROUND_ADAPTER_VERSION,boundary:'这是当前分数与地域窗口的代表性预览和统一背景证据交集，不是全量“最佳专业”排名；候选事实仍来自当前确定性招生资源。'};\n}\n`;
  return source.slice(0,start)+block+source.slice(end);
});

// Preserve broad spoken major recall without inventing a canonical identity: related query returns exact school×canonical-major rows.
replaceOnce('functions/_lib/ai/background-resource-adapter.js',
`  const code = clean(record?.standardMajor?.code, 30).toUpperCase();
  const name = clean(record?.standardMajor?.name || record?.major, 180);`,
`  const code = clean(record?.standardMajor?.code || record?.standardMajorCode, 30).toUpperCase();
  const name = clean(record?.standardMajor?.name || record?.standardMajorName || record?.major, 180);`,'candidate canonical major fallbacks');
transform('functions/_lib/ai/background-resource-adapter.js','background discovery direction preservation',source=>{
  if(source.includes(`directions: new Set(),`))return source;
  source=source.replace(`        scopes: new Set(),\n        primaryCount: 0,`, `        scopes: new Set(),\n        directions: new Set(),\n        primaryCount: 0,`);
  source=source.replace(`    item.scopes.add(record.scope);`, `    item.scopes.add(record.scope);\n    for (const direction of record.directions || []) item.directions.add(clean(direction, 180));`);
  source=source.replace(`    scopesMatched: [...item.scopes],\n    schoolCount: item.schools.size,`, `    scopesMatched: [...item.scopes],\n    direction: [...item.directions][0] || item.major,\n    directions: [...item.directions],\n    schoolCount: item.schools.size,`);
  return source;
});
replaceOnce('functions/_lib/ai/background-resource-adapter.js',
`    generatedAt: snapshot.generatedAt || '',`,
`    generatedAt: snapshot.generatedAt || '',
    dataYear: Number(snapshot.meta?.dataYear || 2026),`,'background adapter data year');

// UBC-08: extend the existing typed claim firewall; do not create a second claim model.
replaceOnce('functions/_lib/ai/claim-evidence.js',`export const AI_CLAIM_EVIDENCE_VERSION='ai-claim-evidence-v0.03';`,`export const AI_CLAIM_EVIDENCE_VERSION='ai-claim-evidence-v0.04';`,'claim evidence version');
replaceOnce('functions/_lib/ai/claim-evidence.js',
`const SOURCE_SCOPES=new Set(['school','school_major','major_national','career','policy','general']);`,
`const SOURCE_SCOPES=new Set(['school','school_major','major_national','career','policy','general']);\nconst BACKGROUND_EVIDENCE_SCOPES=new Set(['liaoning','211']);`,'background claim scope set');
replaceOnce('functions/_lib/ai/claim-evidence.js',
`sourceScope='',documentScope='',documentTitle='',source={},confidence='verified',origin='official'`,
`sourceScope='',documentScope='',documentTitle='',source={},evidenceScope='',evidenceId='',sourceId='',confidence='verified',origin='official'`,'claim background metadata args');
replaceOnce('functions/_lib/ai/claim-evidence.js',
`source:{sourceName:clean(source.sourceName,120),sourceUrl:clean(source.sourceUrl,900),publishedAt:clean(source.publishedAt,80),accessedAt:clean(source.accessedAt,80)},confidence:clean(confidence,30)||'verified',origin:clean(origin,30)||'official'`,
`source:{sourceName:clean(source.sourceName,120),sourceUrl:clean(source.sourceUrl,900),publishedAt:clean(source.publishedAt,80),accessedAt:clean(source.accessedAt,80)},evidenceScope:clean(evidenceScope,40),evidenceId:clean(evidenceId,180),sourceId:clean(sourceId,120),confidence:clean(confidence,30)||'verified',origin:clean(origin,30)||'official'`,'claim background metadata fields');
replaceOnce('functions/_lib/ai/claim-evidence.js',
`claim.value,claim.year,claim.sourceScope,claim.source.sourceUrl`,
`claim.value,claim.year,claim.evidenceScope,claim.evidenceId,claim.sourceId,claim.sourceScope,claim.source.sourceUrl`,'claim id background identity');
transform('functions/_lib/ai/claim-evidence.js','background claims helper',source=>{
  if(source.includes('export function claimsFromAcademicBackground'))return source;
  const marker=`export function claimToEvidence(claim={}){return{level:'A',sourceName:claim.source?.sourceName||'官方证据',sourceUrl:claim.source?.sourceUrl||'',scope:[claim.subjectType,claim.subject,claim.dimension,claim.metric,claim.year?String(claim.year):'',claim.cohort,claim.sourceScope,claim.value].filter(Boolean).join(' · ').slice(0,520),claimId:claim.claimId||''};}`;
  if(!source.includes(marker))throw new Error('claimToEvidence marker missing');
  const replacement=`export function claimToEvidence(claim={}){return{level:'A',sourceName:claim.source?.sourceName||'官方证据',sourceUrl:claim.source?.sourceUrl||'',scope:[claim.subjectType,claim.subject,claim.dimension,claim.metric,claim.year?String(claim.year):'',claim.cohort,claim.evidenceScope,claim.sourceScope,claim.value].filter(Boolean).join(' · ').slice(0,520),claimId:claim.claimId||'',evidenceScope:claim.evidenceScope||'',evidenceId:claim.evidenceId||'',sourceId:claim.sourceId||''};}\n\nexport function claimsFromAcademicBackground(background={}){\n  if(!background?.ok)return[];const claims=[],items=Array.isArray(background.items)?background.items:[];\n  const pushItem=(item,record=null)=>{\n    const payload=item?.background&&record?item.background:item,school=clean(record?.school||payload?.school||background.school,120),majorObj=payload?.canonicalMajor||record?.standardMajor||{},major=clean(majorObj?.name||payload?.major||record?.standardMajorName||record?.major||background.major,160),code=clean(majorObj?.code||record?.standardMajorCode,40);\n    if(!school||!major)return;const evidence=Array.isArray(payload?.evidence)?payload.evidence:[],sources=Array.isArray(payload?.sources)?payload.sources:[];\n    for(const itemEvidence of evidence.slice(0,4)){if(claims.length>=16)break;const sourceItem=sources.find(source=>clean(source?.sourceId,120)&&clean(source?.sourceId,120)===clean(itemEvidence?.sourceId,120))||sources.find(source=>source?.url||source?.sourceUrl)||sources[0]||{},sourceUrl=clean(sourceItem?.url||sourceItem?.sourceUrl||itemEvidence?.sourceUrl,900);if(!sourceUrl)continue;const scopes=[...(itemEvidence?.scopes||payload?.scopesMatched||[])].filter(scope=>BACKGROUND_EVIDENCE_SCOPES.has(clean(scope,20))),evidenceScope=[...new Set(scopes)].sort().join('+')||(['liaoning','211'].includes(background.scope)?background.scope:'');const claim=createEvidenceClaim({subject:\`${'${school} · ${major}'}\`,subjectType:'school_major',subjectId:\`${'${school}|${code||major}'}\`,dimension:'background',metric:'school_major_background_evidence',value:clean(itemEvidence?.detail||payload?.overview||payload?.direction||major,1200),year:Number(itemEvidence?.evidenceYear||sourceItem?.year)||null,scope:clean(payload?.boundary||background.boundary||'学校×专业背景证据',260),sourceScope:'school_major',documentScope:'school_major',documentTitle:clean(sourceItem?.title||itemEvidence?.sourceTitle,220),source:{sourceName:clean(sourceItem?.title||sourceItem?.authority||itemEvidence?.sourceTitle||'官方背景证据',120),sourceUrl},evidenceScope,evidenceId:clean(itemEvidence?.evidenceId,180),sourceId:clean(itemEvidence?.sourceId||sourceItem?.sourceId,120),confidence:'verified',origin:'deterministic'});if(claim)claims.push(claim);}\n  };\n  for(const item of items){if(item?.record&&item?.background)pushItem(item,item.record);else pushItem(item,null);if(claims.length>=16)break;}\n  return claims;\n}\n`;
  return source.replace(marker,replacement);
});
transform('functions/_lib/ai/claim-evidence.js','background claim validation',source=>{
  if(source.includes(`claim.evidenceScope&&claim.evidenceScope.split('+')`))return source;
  return source.replace(`if(!SUBJECT_TYPES.has(clean(claim.subjectType,40))||!SOURCE_SCOPES.has(clean(claim.sourceScope,40))||!scopeCompatible(claim.subjectType,claim.sourceScope))return false;`, `if(!SUBJECT_TYPES.has(clean(claim.subjectType,40))||!SOURCE_SCOPES.has(clean(claim.sourceScope,40))||!scopeCompatible(claim.subjectType,claim.sourceScope))return false;if(claim.evidenceScope&&claim.evidenceScope.split('+').some(scope=>!BACKGROUND_EVIDENCE_SCOPES.has(scope)))return false;`);
});

// Turn execution passes scope without mutating candidate view and exposes typed background claims through the existing evidence path.
replaceOnce('functions/_lib/ai/turn-orchestrator.js',
`import {claimToEvidence} from './claim-evidence.js';`,
`import {claimToEvidence,claimsFromAcademicBackground} from './claim-evidence.js';`,'orchestrator background claim import');
replaceOnce('functions/_lib/ai/turn-orchestrator.js',
`result.background=await runBackgroundDiscovery(executionContext,{limit:12,regionKeys:command.regionKeys?.length?command.regionKeys:(view.regionKeys||['ln'])});`,
`result.background=await runBackgroundDiscovery(executionContext,{limit:12,regionKeys:command.regionKeys?.length?command.regionKeys:(view.regionKeys||['ln']),scope:command.backgroundScope||'auto'});`,'orchestrator background discovery scope');
replaceOnce('functions/_lib/ai/turn-orchestrator.js',
`result.background=await runBackgroundFitDiscovery(executionContext,{score,bottomLineMode:view.bottomLineMode,regionKeys:command.regionKeys?.length?command.regionKeys:(view.regionKeys||['ln'])});`,
`result.background=await runBackgroundFitDiscovery(executionContext,{score,bottomLineMode:view.bottomLineMode,regionKeys:command.regionKeys?.length?command.regionKeys:(view.regionKeys||['ln']),scope:command.backgroundScope||'auto'});`,'orchestrator background fit scope');
replaceOnce('functions/_lib/ai/turn-orchestrator.js',
`result.background=await runSchoolBackground(executionContext,{school:focus.school});result.partial=!result.background.ok;`,
`result.background=await runSchoolBackground(executionContext,{school:focus.school,major:focus.major||'',scope:command.backgroundScope||'auto'});result.partial=!result.background.ok;`,'orchestrator school background scope');
replaceOnce('functions/_lib/ai/turn-orchestrator.js',
`result.background=await runMajorBackground(executionContext,{major:focus.major});result.partial=!result.background.ok;`,
`result.background=await runMajorBackground(executionContext,{major:focus.major,scope:command.backgroundScope||'auto'});result.partial=!result.background.ok;`,'orchestrator major background scope');
transform('functions/_lib/ai/turn-orchestrator.js','orchestrator background typed claims',source=>{
  if(source.includes(`result.background.claims=claimsFromAcademicBackground`))return source;
  const marker=`  result.decisionStage=decisionStageFor({command,view,result,changes});`;
  if(!source.includes(marker))throw new Error('orchestrator decisionStage marker missing');
  source=source.replace(marker,`  if(result.background?.ok)result.background.claims=claimsFromAcademicBackground(result.background);\n${marker}`);
  source=source.replace(`  result.evidence=evidenceForIntent(evidenceIntent(command,result));`, `  result.evidence=evidenceForIntent(evidenceIntent(command,result));\n  if(result.background?.claims?.length)for(const claim of result.background.claims)result.evidence.push(claimToEvidence(claim));`);
  return source;
});

// UBC-10: keep the existing Decision Research step, but make its background evidence exact and typed.
replaceOnce('functions/_lib/ai/decision-research-runtime.js',
`import {createEvidenceClaim,claimsFromOfficialText} from './claim-evidence.js';`,
`import {createEvidenceClaim,claimsFromAcademicBackground,claimsFromOfficialText} from './claim-evidence.js';`,'decision background claim import');
transform('functions/_lib/ai/decision-research-runtime.js','decision background evidence exact pairs',source=>{
  const old=`  if(plan.steps.some(item=>item.kind==='background_evidence')){if(schools.length){for(const school of schools.slice(0,2))backgrounds.push({school,result:await runSchoolBackground(executionContext,{school})});}else for(const major of majors.slice(0,2))backgrounds.push({major,result:await runMajorBackground(executionContext,{major})});}\n  for(const item of backgrounds){if(!item.result?.ok)continue;const label=item.school||item.major,claim=createEvidenceClaim({subject:label,subjectType:item.school?'school':'general',sourceScope:item.school?'school':'general',dimension:'background',value:\`当前已发布背景证据资源有${'${Number(item.result.items?.length||0)}'}组通过门禁的相关证据；未显示方向不代表弱项。\`,scope:item.result.boundary||'站内背景证据',source:{sourceName:'站内学校/专业背景证据',sourceUrl:'/ln-rank/'},origin:'deterministic'});if(claim)claims.push(claim);}`;
  if(!source.includes(old)){if(source.includes('claimsFromAcademicBackground(item.result)'))return source;throw new Error('decision background block marker missing');}
  const next=`  if(plan.steps.some(item=>item.kind==='background_evidence')){if(pairs.length){for(const pair of pairs.slice(0,3))backgrounds.push({school:pair.school,major:pair.major,result:await runSchoolBackground(executionContext,{school:pair.school,major:pair.major,scope:'auto'})});}else if(schools.length){for(const school of schools.slice(0,2))backgrounds.push({school,result:await runSchoolBackground(executionContext,{school,scope:'auto'})});}else for(const major of majors.slice(0,2))backgrounds.push({major,result:await runMajorBackground(executionContext,{major,scope:'auto'})});}\n  for(const item of backgrounds){if(!item.result?.ok)continue;claims.push(...claimsFromAcademicBackground(item.result));}`;
  return source.replace(old,next);
});
replaceOnce('functions/_lib/ai/decision-research-runtime.js',
`school 证据不能写成某校某专业事实，major_national 证据不能写成某校就业事实。`,
`school 证据不能写成某校某专业事实，school_major 证据只能用于它自己的学校×专业 subjectId；211学校身份不能替代211专业背景 evidenceScope，major_national 证据不能写成某校就业事实。`,'decision model background firewall');

// Human presentation no longer describes every background task as Liaoning-only.
transform('functions/_lib/ai/advisor-presentation.js','scope-aware parent copy',source=>{
  const start=source.indexOf(`function backgroundSummary(background){`),end=source.indexOf(`\nfunction selectionReviewSummary`,start);
  if(start<0||end<0){if(source.includes('const scopeText=background.scope'))return source;throw new Error('backgroundSummary markers missing');}
  const block=`function backgroundSummary(background){if(!background?.ok)return background?.message||'当前背景知识库没有形成可展示结果。';const scopeText=background.scope==='211'?'211专业背景':background.scope==='liaoning'?'辽宁省内背景':'省内与211专业背景';if(background.previewOnly)return\`这次把你当前分数窗口与${'${scopeText}'}证据做了交集预览，找到 ${'${background.items?.length||0}'} 条有证据的代表性记录；它不是“最佳专业排名”。\`;if(background.school)return\`当前统一背景证据能为 ${'${background.school}'} 提供 ${'${background.items?.length||0}'} 组受控学校×专业摘要。学校平台身份和具体专业背景是两回事；下面只展示来源门禁通过的证据。\`;if(background.major)return\`围绕“${'${background.major}'}”，当前${'${scopeText}'}资源找到 ${'${background.items?.length||0}'} 个可继续研究的学校×专业证据；列表不是学校强弱排名。\`;return\`${'${scopeText}'}当前有 ${'${background.totalWithEvidence||background.items?.length||0}'} 个方向通过证据门禁，先展示一部分；未显示不代表其他专业不好。\`;}`;
  return source.slice(0,start)+block+source.slice(end);
});

for(const [path,needle,label] of [
  ['shared/resources/background/academic-background-context.v001.js',`majorMatchMode: majorCode ? 'exact' : 'related'`,'related major context'],
  ['ln-rank/js/workspace/major-path-handoff.v003.js',`sourceMajor, school`,'score school handoff'],
  ['major-path/app.v004.js',`mountMajorPathBackgroundContext`,'major path mount'],
  ['functions/_lib/ai/human-query-frame.js',`backgroundScopeFromText`,'scope semantic owner'],
  ['functions/_lib/ai/claim-evidence.js',`claimsFromAcademicBackground`,'typed background claims'],
  ['functions/_lib/ai/decision-research-runtime.js',`claimsFromAcademicBackground(item.result)`,'decision reuse']
])ensureIncludes(path,needle,label);
console.log('unified background construction patch applied');
