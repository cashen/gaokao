import { selectMajorBandsStaticBuckets, loadMajorBandsStaticBucket } from './major-bands-static-provider.js';
import { loadSchoolRuntimeRecords, loadMajorRuntimeRecords } from './school-record-runtime-provider.vnext.js';
import { normalizeRecord, rawScore, rawSchool, rawMajor } from './fenxi-normalizer.js';
import { buildDisplayTags } from './school-display-tags.js';
import { lookupScoreRank } from './rank-table-provider.js';
import { getHistoryScoreRankEvidence } from '../../shared/resources/exam/historical-score-rank-contract.js';

export function clean(value, max = 80) {
  return String(value || '').trim().slice(0, max);
}

export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function rankSort(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER;
}

export function normalizeKey(value) {
  return String(value || '').replace(/[（(].*?[）)]/g, '').replace(/\s+/g, '').trim();
}

export function includesText(a, b) {
  const left = normalizeKey(a);
  const right = normalizeKey(b);
  return !right || left.includes(right) || right.includes(left);
}

export function levelPass(level, filter) {
  if (filter === 'primary' || filter === 'core') return level === 'primary';
  if (filter === 'primary_secondary') return level === 'primary' || level === 'secondary';
  return true;
}

export function publicPass(record, mode) {
  if (mode !== 'public_regular_only') return true;
  const text = [record.nature, record.natureRaw, ...(record.schoolTags || []), record.rawText].filter(Boolean).join(' ');
  if (/民办|独立学院|中外|合作办学|高收费|较高收费/.test(text)) return false;
  return /公办/.test(text) || !/民办|独立学院/.test(text);
}

function rankContext(score) {
  const row = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score });
  if (!row) return null;
  const rankStart = num(row.rankStart);
  const rankEnd = num(row.rankEnd ?? row.cumulative ?? row.rankForGap);
  return {
    score: num(row.score ?? score),
    rankStart,
    rankEnd,
    rank: num(row.rankForGap) ?? rankEnd,
    sameCount: num(row.sameCount),
    emptyScore: Boolean(row.emptyScore)
  };
}

export function buildCandidatePositionContext(score, extra = {}) {
  const candidateScore = num(score);
  const candidateRank = extra.candidateRankContext || rankContext(candidateScore);
  return {
    audienceYear: 2027,
    activeCandidateYear: 2026,
    candidateScore,
    candidateRank: extra.candidateRank ?? candidateRank?.rank ?? null,
    candidateRankStart: extra.candidateRankStart ?? candidateRank?.rankStart ?? null,
    candidateRankEnd: extra.candidateRankEnd ?? candidateRank?.rankEnd ?? null,
    candidateSameCount: extra.candidateSameCount ?? candidateRank?.sameCount ?? null,
    candidateRankEmptyScore: Boolean(candidateRank?.emptyScore),
    referenceAdmissionYear: 2026,
    referenceScore: extra.referenceScore ?? candidateScore,
    referenceRank: extra.referenceRank ?? candidateRank?.rank ?? null,
    positionMode: extra.positionMode || '2026_score_delta_with_rank_context',
    classificationMode: 'score_delta',
    dataSourceLabel: extra.dataSourceLabel || '辽宁 2026 普通类本科批物理类专业投档记录；位次来自 2026 物理类一分一段。',
    humanBoundary: extra.humanBoundary || '这里不是录取判断。输入的是模考或预估参考分数；分段按参考分数与 2026 投档最低分的分差整理，位次只用于解释 2026 历史位置，不是 2027 实际位次。',
    referenceWindow: extra.referenceWindow || {
      near: { minDelta: -10, maxDelta: 0, label: '主要参考' },
      upper: { minDelta: 1, maxDelta: 10, label: '稍高目标' },
      lower: { minDelta: -25, maxDelta: -11, label: '低分侧补充' }
    }
  };
}

function levelWeightByRaw(record, rawKey) {
  const raw = rawKey ? record?.[rawKey] : null;
  const level = raw?.level || record?.level;
  return level === 'primary' ? 3 : level === 'secondary' ? 2 : level === 'trajectory' ? 1 : 0;
}

export function shapeBackgroundRecord(record, hit, filters = {}, config = {}) {
  const display = buildDisplayTags(record);
  const candidateScore = filters.candidateScore;
  const positionContext = buildCandidatePositionContext(candidateScore);
  const score2026 = record.score2026 ?? record.score;
  const rank2026 = record.rank2026 ?? record.rank;
  const delta = Number.isFinite(Number(candidateScore)) && Number.isFinite(Number(score2026))
    ? Number(score2026) - Number(candidateScore)
    : null;
  const rankGap2026 = Number.isFinite(Number(positionContext.candidateRank)) && Number.isFinite(Number(rank2026))
    ? Number(positionContext.candidateRank) - Number(rank2026)
    : null;
  const presentHit = typeof config.presentHit === 'function' ? config.presentHit : value => value;
  const evidence = presentHit(hit);
  const outputKey = config.outputKey || 'background';
  const rawKey = config.rawKey || 'backgroundRaw';

  return {
    id: record.id,
    dataYear: 2026,
    primaryYear: 2026,
    school: record.school,
    major: record.major,
    score: score2026,
    rank: rank2026,
    score2026,
    rank2026,
    rankStart2026: record.rankStart2026 ?? null,
    rankEnd2026: record.rankEnd2026 ?? rank2026 ?? null,
    score2025: record.score2025 ?? null,
    rank2025: record.rank2025 ?? null,
    score2024: record.score2024 ?? null,
    rank2024: record.rank2024 ?? null,
    historyCompare: record.historyCompare || null,
    historyEvidence: getHistoryScoreRankEvidence(record),
    scoreDelta2026: delta,
    scoreDelta: delta,
    rankGap2026,
    rankGap: rankGap2026,
    displayLocation: record.displayLocation || display.displayLocation || '',
    natureLabel: display.natureLabel || record.nature || '',
    schoolTags: display.schoolTags || [],
    [outputKey]: evidence,
    [rawKey]: hit,
    reviewPoints: evidence?.reviewPoints || hit?.reviewPoints || [],
    positionContext,
    backgroundSource: config.sourceName || 'background-kb'
  };
}

function chunkFile(chunk) {
  return chunk?.file || chunk?.path || '';
}

function chunkIntersectsWindow(chunk, filters = {}) {
  const minScore = num(chunk?.minScore);
  const maxScore = num(chunk?.maxScore);
  if (minScore == null || maxScore == null) return true;
  const wantedMin = num(filters.minScore);
  const wantedMax = num(filters.maxScore);
  if (wantedMin != null && maxScore < wantedMin) return false;
  if (wantedMax != null && minScore > wantedMax) return false;
  return true;
}

async function loadChunkRecords(request, env, file) {
  const data = await fetchFenxiJson(request, env || {}, file);
  return Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : []);
}

function inScoreWindowRaw(raw, filters = {}) {
  const score = rawScore(raw);
  if (!Number.isFinite(score)) return false;
  if (Number.isFinite(Number(filters.maxScore)) && score > Number(filters.maxScore)) return false;
  if (Number.isFinite(Number(filters.minScore)) && score < Number(filters.minScore)) return false;
  return true;
}

function rawTextPass(raw, filters = {}) {
  const schoolFilter = clean(filters.school || '', 80);
  const majorFilter = clean(filters.major || '', 80);
  if (schoolFilter && !includesText(rawSchool(raw), schoolFilter)) return false;
  if (majorFilter && !includesText(rawMajor(raw), majorFilter)) return false;
  return true;
}

export async function loadBackgroundMatchedRecords(request, env, filters = {}, config = {}) {
  const out=[]; const max=Math.max(20,Math.min(500,Number(filters.max||180)));
  const hasScoreWindow=Number.isFinite(Number(filters.maxScore))||Number.isFinite(Number(filters.minScore));
  let manifest=null,rawTotal=0,windowCandidateCount=0,normalizedCount=0,matchedBeforeLimit=0,failedChunk='',chunksRead=0,chunksSkipped=0,runtimeMode='';
  const handleRaw=raw=>{
    rawTotal+=1; if(hasScoreWindow&&!inScoreWindowRaw(raw,filters))return; if(!rawTextPass(raw,filters))return; windowCandidateCount+=1;
    const record=normalizeRecord(raw); if(!record.school||!record.major||!Number.isFinite(Number(record.score2026??record.score)))return; normalizedCount+=1; record.rawText=JSON.stringify(raw).slice(0,1600);
    const hit=config.matchRecord(record,raw); if(!hit||!levelPass(hit.level,filters.level||'all')||!publicPass(record,filters.natureMode||'all'))return;
    matchedBeforeLimit+=1; if(out.length<max)out.push(shapeBackgroundRecord(record,hit,filters,config));
  };
  try{
    if(hasScoreWindow){
      const min=Number.isFinite(Number(filters.minScore))?Number(filters.minScore):0,maxScore=Number.isFinite(Number(filters.maxScore))?Number(filters.maxScore):750;
      const scoreWindow={min,max:maxScore}; const options={assets:env?.ASSETS}; const selected=await selectMajorBandsStaticBuckets(request,scoreWindow,options); manifest=selected.manifest;
      for(const bucket of selected.buckets||[]){const loaded=await loadMajorBandsStaticBucket(request,bucket.file,scoreWindow,options);chunksRead+=1;for(const raw of loaded.records||[])handleRaw(raw);} runtimeMode='bounded-score-buckets';
    }else if(clean(filters.school||'',80)){
      const loaded=await loadSchoolRuntimeRecords({request,env:env||{}},{schoolNames:[filters.school]});manifest=loaded.manifest;chunksRead=loaded.shardFiles?.length||0;for(const raw of loaded.records||[])handleRaw(raw);runtimeMode='bounded-school-projection';
    }else if(clean(filters.major||'',80)){
      const loaded=await loadMajorRuntimeRecords({request,env:env||{}},{majorNames:[filters.major]});manifest=loaded.manifest;chunksRead=loaded.shardFiles?.length||0;for(const raw of loaded.records||[])handleRaw(raw);runtimeMode='bounded-major-projection';
    }else runtimeMode='no-unbounded-query';
  }catch(error){failedChunk=error?.message||String(error);throw error;}
  const candidate=Number(filters.candidateScore),rawKey=config.rawKey||'backgroundRaw';
  out.sort((a,b)=>{if(Number.isFinite(candidate)){const da=Math.abs(Number(a.score2026||0)-candidate),db=Math.abs(Number(b.score2026||0)-candidate);if(da!==db)return da-db;}return levelWeightByRaw(b,rawKey)-levelWeightByRaw(a,rawKey)||Number(b.score2026||0)-Number(a.score2026||0)||rankSort(a.rank2026)-rankSort(b.rank2026);});
  return{records:out,scannedCount:rawTotal,rawScanned:rawTotal,windowCandidateCount,normalizedCount,matchedCount:matchedBeforeLimit,dataReadOk:true,failedChunk,manifest,chunksRead,chunksSkipped,runtimeMode,positionContext:buildCandidatePositionContext(filters.candidateScore)};
}

export function sortByPositionDistance(records, score, rawKey = 'backgroundRaw') {
  const candidate = Number(score);
  return [...records].sort((a, b) => {
    const da = Math.abs(Number(a.score2026 || 0) - candidate);
    const db = Math.abs(Number(b.score2026 || 0) - candidate);
    return da - db
      || levelWeightByRaw(b, rawKey) - levelWeightByRaw(a, rawKey)
      || Number(b.score2026 || 0) - Number(a.score2026 || 0)
      || rankSort(a.rank2026) - rankSort(b.rank2026);
  });
}

export function groupScoreRecords(records, score, rawKey = 'backgroundRaw') {
  const candidate = Number(score);
  return {
    near: sortByPositionDistance(records.filter(record => Number(record.score2026) >= candidate - 10 && Number(record.score2026) <= candidate), score, rawKey),
    upper: sortByPositionDistance(records.filter(record => Number(record.score2026) > candidate && Number(record.score2026) <= candidate + 10), score, rawKey),
    lower: sortByPositionDistance(records.filter(record => Number(record.score2026) >= candidate - 25 && Number(record.score2026) < candidate - 10), score, rawKey)
  };
}
