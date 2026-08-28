import { createEntityAwareResolver } from './school-entities-v130.js';

export const SCHOOL_NAME_DATA_URL = new URL('./school-search-index.20260617.json', import.meta.url).href;

const SEARCH_CACHE_LIMIT = 100;
const GENERIC_SHORTCUTS = new Map([
  ['科大', ['科技大学', '科学技术大学']],['工大', ['工业大学', '工程大学', '工程技术大学']],['师大', ['师范大学']],['医大', ['医科大学']],['财大', ['财经大学', '财政大学']],['交大', ['交通大学']],['农大', ['农业大学']],['林大', ['林业大学']],['理工', ['理工大学']],['外大', ['外国语大学']]
]);
const REGION_ABBR = new Map(Object.entries({北京:'北',上海:'上',天津:'天',重庆:'重',河北:'冀',山西:'晋',辽宁:'辽',吉林:'吉',黑龙江:'黑',江苏:'苏',浙江:'浙',安徽:'皖',福建:'闽',江西:'赣',山东:'鲁',河南:'豫',湖北:'鄂',湖南:'湘',广东:'粤',广西:'桂',海南:'琼',四川:'川',贵州:'贵',云南:'云',陕西:'陕',甘肃:'甘',青海:'青',宁夏:'宁',新疆:'新',西藏:'藏',内蒙古:'蒙'}));
const CITY_ABBR = new Map(Object.entries({沈阳:'沈',大连:'大',哈尔滨:'哈',长春:'长',南京:'南',苏州:'苏',杭州:'杭',宁波:'宁',合肥:'合',厦门:'厦',福州:'福',南昌:'南昌',济南:'济',青岛:'青',郑州:'郑',武汉:'武',长沙:'长',广州:'广',深圳:'深',成都:'成',昆明:'昆',西安:'西',兰州:'兰'}));
const EXPLICIT_ALIASES = Object.freeze({吉大:'吉林大学',大工:'大连理工大学',大连理工:'大连理工大学',东财:'东北财经大学',辽科大:'辽宁科技大学',辽宁科大:'辽宁科技大学',辽大:'辽宁大学',辽石化:'辽宁石油化工大学',沈航:'沈阳航空航天大学',沈工大:'沈阳工业大学',沈建:'沈阳建筑大学',沈药:'沈阳药科大学',辽师:'辽宁师范大学',大医:'大连医科大学',大外:'大连外国语大学',北大:'北京大学',清华:'清华大学',人大:'中国人民大学',北航:'北京航空航天大学',北理工:'北京理工大学',北科大:'北京科技大学',北邮:'北京邮电大学',北化:'北京化工大学',北师大:'北京师范大学',北外:'北京外国语大学',中传:'中国传媒大学',央财:'中央财经大学',贸大:'对外经济贸易大学',对外经贸:'对外经济贸易大学',法大:'中国政法大学',上交:'上海交通大学',上财:'上海财经大学',华理:'华东理工大学',南大:'南京大学',南航:'南京航空航天大学',南理工:'南京理工大学',南邮:'南京邮电大学',浙大:'浙江大学',中科大:'中国科学技术大学',厦大:'厦门大学',武大:'武汉大学',华科:'华中科技大学',中南:'中南大学',中山:'中山大学',华工:'华南理工大学',川大:'四川大学',成电:'电子科技大学',电子科大:'电子科技大学',西财:'西南财经大学',西交:'西安交通大学',西工大:'西北工业大学',西电:'西安电子科技大学',兰大:'兰州大学',哈工大:'哈尔滨工业大学',哈工程:'哈尔滨工程大学',东师:'东北师范大学'});
const TYPE_REPLACEMENTS = [['航空航天大学','航大'],['科学技术大学','科大'],['工程技术大学','工大'],['科技大学','科大'],['工业大学','工大'],['理工大学','理工'],['师范大学','师大'],['医科大学','医大'],['中医药大学','中医药'],['财经大学','财大'],['交通大学','交大'],['农业大学','农大'],['林业大学','林大'],['外国语大学','外大'],['民族大学','民大'],['政法大学','政法'],['体育大学','体大']];

export async function loadSchoolCatalog(url = SCHOOL_NAME_DATA_URL, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('当前环境没有可用的 fetch。');
  const response = await fetchImpl(url, { cache: 'force-cache', headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`学校名单加载失败：HTTP ${response.status}`);
  const payload = await response.json();
  const records = extractSchoolRecords(payload);
  const expectedCount = Number(payload?.count || payload?.scope?.ordinaryHigherEducationInstitutions || 0);
  if (expectedCount && records.length !== expectedCount) throw new Error(`学校名单数量异常：应为 ${expectedCount}，实际为 ${records.length}`);
  if (records.length < 2900) throw new Error('学校名单数量异常。');
  const baseResolver = createSchoolNameResolver(records);
  const resolver = createEntityAwareResolver(baseResolver, baseResolver.metadata);
  return Object.freeze({ resolver, metadata: resolver.metadata, count: baseResolver.count, entityCount: resolver.entityCount, asOfDate: String(payload?.asOfDate || '') });
}
export async function loadSchoolNameResolver(url = SCHOOL_NAME_DATA_URL, fetchImpl = globalThis.fetch) { return (await loadSchoolCatalog(url, fetchImpl)).resolver; }

export function extractSchoolRecords(payload) {
  if (Array.isArray(payload)) return uniqueRecords(payload.map(readRecord).filter(Boolean));
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.schools)) return uniqueRecords(payload.schools.map(readRecord).filter(Boolean));
  if (payload.exactMap && typeof payload.exactMap === 'object') return uniqueRecords(Object.keys(payload.exactMap).map((name) => readRecord(name)).filter(Boolean));
  return uniqueRecords(Object.keys(payload).map((name) => readRecord(name)).filter(Boolean));
}
export function extractSchoolNames(payload) { return extractSchoolRecords(payload).map((record) => record.name); }

export function createSchoolNameResolver(schoolRows) {
  const records = uniqueRecords((schoolRows || []).map(readRecord).filter(Boolean));
  const names = records.map((record) => record.name);
  const nameSet = new Set(names);
  const metadata = new Map(records.map((record) => [record.name, Object.freeze({ ...record })]));
  const entries = records.map((record) => ({ officialName: record.name, normalized: normalizeSchoolText(record.name), aliases: new Set(), aliasNormalized: [], initialCodes: record.initialCodes || [] }));
  const entryByName = new Map(entries.map((entry) => [entry.officialName, entry]));
  const officialMap = new Map(), aliasMap = new Map(), firstCharIndex = new Map(), bigramIndex = new Map(), genericIndex = new Map(), initialExactMap = new Map(), initialBucketIndex = new Map(), searchCache = new Map();
  for (const entry of entries) {
    addToSetMap(officialMap, entry.normalized, entry.officialName);
    for (const alias of generateAliases(entry.officialName)) entry.aliases.add(alias);
  }
  for (const [alias, officialName] of Object.entries(EXPLICIT_ALIASES)) if (nameSet.has(officialName)) entryByName.get(officialName)?.aliases.add(alias);
  for (const entry of entries) {
    entry.aliasNormalized = [...entry.aliases].map(normalizeSchoolText).filter((alias) => alias && alias !== entry.normalized);
    for (const alias of entry.aliasNormalized) addToSetMap(aliasMap, alias, entry.officialName);
    for (const code of entry.initialCodes) indexInitial(initialExactMap, initialBucketIndex, code, entry);
    indexEntry(firstCharIndex, bigramIndex, entry, entry.normalized);
    for (const alias of entry.aliasNormalized) indexEntry(firstCharIndex, bigramIndex, entry, alias);
  }
  for (const [shortcut, suffixes] of GENERIC_SHORTCUTS) genericIndex.set(shortcut, entries.filter((entry) => suffixes.some((suffix) => entry.officialName.includes(suffix))).sort(compareEntries));
  const context = { entries, officialMap, aliasMap, firstCharIndex, bigramIndex, genericIndex, initialExactMap, initialBucketIndex, searchCache };
  return Object.freeze({ count: names.length, names: Object.freeze([...names]), metadata, getMetadata(name) { return metadata.get(cleanOfficialName(name)) || null; }, resolve(query, options = {}) { return resolveSchoolName(query, { ...context, ...options }); }, search(query, options = {}) { return searchSchoolNames(query, context, options); } });
}

export function resolveSchoolName(query, context) {
  const input = cleanOfficialName(query), normalizedInput = normalizeSchoolText(input), limit = Number.isFinite(context?.limit) ? Math.max(1, context.limit) : 8;
  if (!normalizedInput) return result('empty', input, null, [], 'empty');
  const officialMatches = [...(context?.officialMap?.get(normalizedInput) || [])];
  if (officialMatches.length === 1) return result('resolved', input, officialMatches[0], [], 'official_exact', 1);
  if (officialMatches.length > 1) return result('ambiguous', input, null, toCandidates(officialMatches, 1, 'official_exact'), 'official_exact');
  const aliasMatches = [...(context?.aliasMap?.get(normalizedInput) || [])];
  if (aliasMatches.length === 1) return result('resolved', input, aliasMatches[0], [], 'alias_exact', 0.99);
  if (aliasMatches.length > 1) return result('ambiguous', input, null, toCandidates(aliasMatches, 0.99, 'alias_exact'), 'alias_exact');
  if (isLatinCodeInput(input)) {
    const code = normalizeInitialQuery(input);
    if (code.length < 2) return result('not_found', input, null, [], 'none');
    const exact = [...(context?.initialExactMap?.get(code) || [])];
    if (exact.length === 1) return result('resolved', input, exact[0].officialName, [], 'initial_exact', 0.995);
    if (exact.length > 1) return result('ambiguous', input, null, exact.map((entry) => initialCandidate(entry, 0.995, 'initial_exact')), 'initial_exact');
    const initials = searchInitialSchoolNames(code, context, limit);
    if (initials.length) return result('ambiguous', input, null, initials, 'initial_prefix');
    return result('not_found', input, null, [], 'none');
  }
  const genericCandidates = getGenericCandidates(normalizedInput, context?.genericIndex, limit);
  if (genericCandidates.length > 1) return result('ambiguous', input, null, genericCandidates, 'generic_shortcut');
  const candidates = searchSchoolNames(input, context, { limit });
  if (!candidates.length) return result('not_found', input, null, [], 'none');
  const first = candidates[0], second = candidates[1], margin = first.score - (second?.score || 0), autoThreshold = normalizedInput.length >= 5 ? 0.82 : 0.9, requiredMargin = normalizedInput.length >= 5 ? 0.08 : 0.12;
  if (first.score >= autoThreshold && margin >= requiredMargin) return result('resolved', input, first.officialName, candidates.slice(1, 4), first.matchType, first.score);
  const plausible = candidates.filter((candidate) => candidate.score >= 0.57).slice(0, limit);
  if (plausible.length === 1 && plausible[0].score >= 0.86) return result('resolved', input, plausible[0].officialName, [], plausible[0].matchType, plausible[0].score);
  if (plausible.length) return result('ambiguous', input, null, plausible, 'fuzzy');
  return result('not_found', input, null, candidates.slice(0, 3), 'none');
}

export function searchSchoolNames(query, contextOrEntries, options = {}) {
  const normalizedInput = normalizeSchoolText(query), limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 8;
  if (!normalizedInput) return [];
  const context = Array.isArray(contextOrEntries) ? buildLegacyContext(contextOrEntries) : (contextOrEntries || {}), cacheKey = `${normalizedInput}|${limit}`;
  const cached = context.searchCache?.get(cacheKey); if (cached) return cached.map((item) => ({ ...item }));
  if (isLatinCodeInput(query)) {
    const code = normalizeInitialQuery(query);
    if (code.length < 2) return cacheSearch(context.searchCache, cacheKey, []);
    return cacheSearch(context.searchCache, cacheKey, searchInitialSchoolNames(code, context, limit));
  }
  const generic = getGenericCandidates(normalizedInput, context.genericIndex, limit); if (generic.length) return cacheSearch(context.searchCache, cacheKey, generic);
  const candidateEntries = selectCandidateEntries(normalizedInput, context), scored = [];
  for (const entry of candidateEntries) {
    let best = scoreText(normalizedInput, entry.normalized, 'official');
    for (const alias of entry.aliasNormalized || []) { const aliasScore = scoreText(normalizedInput, alias, 'alias'); if (aliasScore.score > best.score) best = aliasScore; }
    if (best.score < 0.42) continue;
    scored.push({ officialName: entry.officialName, score: roundScore(best.score), matchType: best.matchType });
  }
  scored.sort((a, b) => b.score - a.score || a.officialName.length - b.officialName.length || a.officialName.localeCompare(b.officialName, 'zh-CN'));
  return cacheSearch(context.searchCache, cacheKey, scored.slice(0, limit));
}

export function normalizeSchoolText(value) { return String(value || '').normalize('NFKC').toLowerCase().replace(/[（【\[]/g, '(').replace(/[）】\]]/g, ')').replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '').trim(); }
export function normalizeInitialQuery(value) { return String(value || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
export function isInitialQuery(value) { return isLatinCodeInput(value) && normalizeInitialQuery(value).length >= 2; }

function isLatinCodeInput(value) { const source=String(value||'').normalize('NFKC').trim(); return Boolean(source)&&/^[a-z0-9\s._-]+$/i.test(source); }
function searchInitialSchoolNames(code, context, limit) {
  if (code.length < 2) return [];
  const exact = [...(context.initialExactMap?.get(code) || [])];
  if (exact.length) return exact.sort(compareEntries).slice(0, limit).map((entry) => initialCandidate(entry, 0.995, 'initial_exact'));
  const pool = [...(context.initialBucketIndex?.get(code.slice(0, 2)) || [])];
  const rows = [];
  for (const entry of pool) {
    const matching = (entry.initialCodes || []).filter((item) => item.startsWith(code)).sort((a,b)=>a.length-b.length)[0] || '';
    if (!matching) continue;
    const coverage = code.length / matching.length;
    rows.push(initialCandidate(entry, Math.min(0.97, 0.76 + coverage * 0.2), 'initial_prefix'));
  }
  rows.sort((a,b)=>b.score-a.score||a.officialName.length-b.officialName.length||a.officialName.localeCompare(b.officialName,'zh-CN'));
  return rows.slice(0, limit);
}
function indexInitial(exactMap, bucketMap, code, entry) { const normalized=normalizeInitialQuery(code); if(normalized.length<2)return; addToSetMap(exactMap,normalized,entry); addToSetMap(bucketMap,normalized.slice(0,2),entry); }
function initialCandidate(entry, score, matchType) { return { officialName: entry.officialName, score: roundScore(score), matchType }; }
function selectCandidateEntries(query, context) { const entries=context.entries||[]; if(entries.length<500)return entries; const selected=new Set(),first=context.firstCharIndex?.get(query[0]); if(first)for(const entry of first)selected.add(entry); for(const gram of bigrams(query)){const matches=context.bigramIndex?.get(gram);if(matches)for(const entry of matches)selected.add(entry);} if(!selected.size)return entries; return [...selected].filter((entry)=>Math.abs(entry.normalized.length-query.length)<=Math.max(5,Math.ceil(query.length*0.7))); }
function indexEntry(firstCharIndex,bigramIndex,entry,value){if(!value)return;addToSetMap(firstCharIndex,value[0],entry);for(const gram of bigrams(value))addToSetMap(bigramIndex,gram,entry);}
function bigrams(value){const chars=[...String(value||'')],grams=[];for(let i=0;i<chars.length-1;i+=1)grams.push(chars[i]+chars[i+1]);return grams;}
function buildLegacyContext(entries){const normalizedEntries=entries.map((entry)=>({...entry,aliasNormalized:[...(entry.aliases||[])].map(normalizeSchoolText),initialCodes:normalizeInitialCodes(entry.initialCodes||[])}));const firstCharIndex=new Map(),bigramIndex=new Map(),genericIndex=new Map(),initialExactMap=new Map(),initialBucketIndex=new Map();for(const entry of normalizedEntries){indexEntry(firstCharIndex,bigramIndex,entry,entry.normalized);for(const alias of entry.aliasNormalized)indexEntry(firstCharIndex,bigramIndex,entry,alias);for(const code of entry.initialCodes)indexInitial(initialExactMap,initialBucketIndex,code,entry);}for(const [shortcut,suffixes] of GENERIC_SHORTCUTS)genericIndex.set(shortcut,normalizedEntries.filter((entry)=>suffixes.some((suffix)=>entry.officialName.includes(suffix))).sort(compareEntries));return{entries:normalizedEntries,firstCharIndex,bigramIndex,genericIndex,initialExactMap,initialBucketIndex,searchCache:new Map()};}
function getGenericCandidates(normalizedInput,genericIndex,limit){return(genericIndex?.get(normalizedInput)||[]).slice(0,limit).map((entry)=>({officialName:entry.officialName,score:0.72,matchType:'generic_shortcut'}));}
function cacheSearch(cache,key,results){const copy=results.map((item)=>({...item}));if(cache){if(cache.size>=SEARCH_CACHE_LIMIT)cache.delete(cache.keys().next().value);cache.set(key,copy);}return copy.map((item)=>({...item}));}
function generateAliases(officialName){const aliases=new Set(),normalizedDisplay=officialName.replace(/[（]/g,'(').replace(/[）]/g,')');aliases.add(normalizedDisplay);aliases.add(normalizedDisplay.replace(/[()]/g,''));const withoutSuffix=officialName.replace(/(职业技术大学|职业大学|高等专科学校|大学|学院)$/u,'');if(withoutSuffix.length>=3)aliases.add(withoutSuffix);for(const [suffix,shortSuffix] of TYPE_REPLACEMENTS){if(!officialName.endsWith(suffix))continue;const prefix=officialName.slice(0,-suffix.length);if(!prefix)continue;aliases.add(prefix+shortSuffix);aliases.add(prefix+suffix.replace(/大学$/,''));const regionShort=REGION_ABBR.get(prefix)||CITY_ABBR.get(prefix);if(regionShort)aliases.add(regionShort+shortSuffix);}const genericUniversity=officialName.match(/^(.{2,8})大学$/u);if(genericUniversity){const prefix=genericUniversity[1],regionShort=REGION_ABBR.get(prefix)||CITY_ABBR.get(prefix);if(regionShort)aliases.add(regionShort+'大');}if(officialName.includes('（'))aliases.add(officialName.replace(/（/g,'(').replace(/）/g,')'));if(officialName.includes('('))aliases.add(officialName.replace(/\(/g,'（').replace(/\)/g,'）'));return aliases;}
function scoreText(query,target,kind){if(!query||!target)return{score:0,matchType:'none'};if(query===target)return{score:kind==='official'?1:0.99,matchType:`${kind}_exact`};if(target.startsWith(query)){const coverage=query.length/target.length;return{score:Math.min(0.97,0.78+coverage*0.19+(kind==='alias'?0.015:0)),matchType:`${kind}_prefix`};}if(target.includes(query)){const coverage=query.length/target.length;return{score:Math.min(0.9,0.65+coverage*0.22+(kind==='alias'?0.015:0)),matchType:`${kind}_contains`};}if(query.startsWith(target)&&target.length>=3){const coverage=target.length/query.length;return{score:Math.min(0.86,0.58+coverage*0.24),matchType:`${kind}_expanded`};}if(query.length<3||target.length<3)return{score:0,matchType:'none'};const distance=levenshtein(query,target),similarity=1-distance/Math.max(query.length,target.length),prefixBonus=query[0]===target[0]?0.035:0,suffixBonus=query.at(-1)===target.at(-1)?0.02:0;return{score:Math.max(0,similarity+prefixBonus+suffixBonus+(kind==='alias'?0.01:0)),matchType:`${kind}_fuzzy`};}
function levenshtein(a,b){const source=[...a],target=[...b];let previous=Array.from({length:target.length+1},(_,i)=>i);for(let i=1;i<=source.length;i+=1){const current=[i];for(let j=1;j<=target.length;j+=1){const cost=source[i-1]===target[j-1]?0:1;current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+cost);}previous=current;}return previous[target.length];}
function result(status,input,resolvedName,candidates,matchType,confidence=0){return{status,input,resolvedName,candidates:candidates||[],matchType,confidence:roundScore(confidence)};}
function toCandidates(names,score,matchType){return names.map((officialName)=>({officialName,score,matchType}));}
function addToSetMap(map,key,value){if(!key)return;if(!map.has(key))map.set(key,new Set());map.get(key).add(value);}
function readRecord(value){if(typeof value==='string'){const name=cleanOfficialName(value);return name?{name,location:'',level:'',initialCodes:[]}:null;}if(Array.isArray(value)){const name=cleanOfficialName(value[0]);return name?{name,location:cleanOfficialName(value[1]),level:cleanOfficialName(value[2]),initialCodes:normalizeInitialCodes(value[3])}:null;}if(!value||typeof value!=='object')return null;const name=cleanOfficialName(value.name||value.school||value.schoolName||value.school_name||'');return name?{name,location:cleanOfficialName(value.location||value.province||''),level:cleanOfficialName(value.level||''),initialCodes:normalizeInitialCodes(value.initialCodes||value.initials||value.pinyinInitials)}:null;}
function normalizeInitialCodes(value){return[...new Set((Array.isArray(value)?value:[value]).map(normalizeInitialQuery).filter((code)=>code.length>=2))];}
function cleanOfficialName(value){return String(value||'').replace(/\s+/g,' ').replace(/[。；;，,]+$/g,'').trim();}
function uniqueRecords(records){const map=new Map();for(const record of records)if(record?.name&&!map.has(record.name))map.set(record.name,record);return[...map.values()];}
function compareEntries(a,b){return a.officialName.length-b.officialName.length||a.officialName.localeCompare(b.officialName,'zh-CN');}
function roundScore(value){return Math.round((Number(value)||0)*1000)/1000;}
