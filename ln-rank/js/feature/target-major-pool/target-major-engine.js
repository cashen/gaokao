(function () {
  'use strict';

  const cfg = () => window.TargetMajorPoolConfig;
  const chunkCache = new Map();
  let manifestCache = null;

  function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeKeyword(value) {
    return text(value).replace(/\s+/g, '').toLowerCase();
  }

  function getActiveSubject() {
    const active = document.querySelector('[data-subject].is-active') || document.querySelector('[data-subject][aria-pressed="true"]');
    return active?.dataset?.subject || 'physics';
  }

  function getTargetScoreFromPage() {
    const value = document.getElementById('targetScoreInput')?.value;
    const n = Math.round(Number(String(value || '').replace(/[^0-9.]/g, '')));
    return Number.isFinite(n) ? n : 500;
  }

  function getYearDataForSubject(subjectKey) {
    const data = window.GAOKAO_RANK_DATA;
    const calc = window.ScoreCalc;
    if (!data || !calc) return null;
    try {
      calc.prepareData(data);
    } catch (e) {
      // 数据已准备时可能不需要再次处理。
    }
    return data.subjects?.[subjectKey]?.years?.['2025'] || null;
  }

  function clampScore(yearData, score) {
    return Math.max(yearData.scoreMin, Math.min(yearData.scoreMax, Math.round(score)));
  }

  function rankByScore(subjectKey, score) {
    const yearData = getYearDataForSubject(subjectKey);
    if (!yearData || !yearData.scoreMap) return null;
    const safe = clampScore(yearData, score);
    return yearData.scoreMap[String(safe)]?.cumulative || null;
  }

  function buildScoreWindow(targetScore) {
    const score = Math.round(Number(targetScore));
    return {
      targetScore: score,
      upperScore: score + cfg().upperDelta,
      lowerScore: score - cfg().lowerDelta,
      upperRange: [score + 1, score + cfg().upperDelta],
      nearRange: [score - 10, score],
      lowerRange: [score - cfg().lowerDelta, score - 11]
    };
  }

  function buildRankWindow(subjectKey, targetScore) {
    const win = buildScoreWindow(targetScore);
    const upperRank = rankByScore(subjectKey, win.upperScore);
    const lowerRank = rankByScore(subjectKey, win.lowerScore);
    return {
      ...win,
      rankMin: upperRank == null || lowerRank == null ? null : Math.min(upperRank, lowerRank),
      rankMax: upperRank == null || lowerRank == null ? null : Math.max(upperRank, lowerRank),
      upperRank,
      lowerRank
    };
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`读取失败：${url} (${res.status})`);
    return res.json();
  }

  async function loadManifest() {
    if (manifestCache) return manifestCache;
    manifestCache = await fetchJson(cfg().fenxiManifestUrl);
    return manifestCache;
  }

  function pickChunks(manifest, rankWindow) {
    if (!rankWindow.rankMin || !rankWindow.rankMax) return manifest.chunks || [];
    return (manifest.chunks || []).filter((chunk) => {
      const min = Number(chunk.minRank);
      const max = Number(chunk.maxRank);
      return min <= rankWindow.rankMax && max >= rankWindow.rankMin;
    });
  }

  function resolveChunkUrl(chunk) {
    if (!chunk || !chunk.file) return null;
    if (/^https?:\/\//.test(chunk.file) || chunk.file.startsWith('/')) return chunk.file;
    return `/fenxi/${chunk.file.replace(/^\.\//, '')}`;
  }

  async function loadChunk(chunk) {
    const url = resolveChunkUrl(chunk);
    if (!url) return [];
    if (chunkCache.has(url)) return chunkCache.get(url);
    const data = await fetchJson(url);
    const records = Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : []);
    chunkCache.set(url, records);
    return records;
  }

  async function loadRecordsForWindow(rankWindow) {
    const manifest = await loadManifest();
    const chunks = pickChunks(manifest, rankWindow);
    const lists = await Promise.all(chunks.map(loadChunk));
    return lists.flat();
  }

  function getScore(record) {
    return toNumber(record.score2025 ?? record.minScore ?? record.score ?? record['最低分']);
  }

  function getRank(record) {
    return toNumber(record.rank2025 ?? record.minRank ?? record.rank ?? record['最低位次']);
  }

  function getSchool(record) {
    return text(record.school ?? record.schoolName ?? record['院校名称'] ?? record['学校名称']);
  }

  function getMajor(record) {
    return text(record.major ?? record.majorName ?? record['专业名称']);
  }

  function getRegionText(record) {
    const lnArea = text(record.lnArea);
    const province = text(record.schoolProvince ?? record.province ?? record['省份']);
    const city = text(record.schoolCity ?? record.city ?? record['城市']);
    return [lnArea, province, city].filter(Boolean).join(' · ') || '地区待核验';
  }

  function classify(recordScore, targetScore) {
    const delta = recordScore - targetScore;
    if (delta >= 1 && delta <= cfg().upperDelta) return 'upper';
    if (delta <= 0 && delta >= -10) return 'near';
    if (delta <= -11 && delta >= -cfg().lowerDelta) return 'lower';
    return 'outside';
  }

  function matchRegion(record, region) {
    const lnArea = text(record.lnArea);
    if (!region || region === 'all') return true;
    if (region === 'ln') return lnArea && lnArea !== '省外';
    if (region === 'outside') return lnArea === '省外';
    if (region === 'shenyang') return lnArea === '沈阳';
    if (region === 'dalian') return lnArea === '大连';
    if (region === 'ln-other') return lnArea === '辽宁其他';
    return true;
  }

  function matchKeyword(record, schoolKeyword, majorKeyword) {
    const schoolKey = normalizeKeyword(schoolKeyword);
    const majorKey = normalizeKeyword(majorKeyword);
    const school = normalizeKeyword(getSchool(record));
    const major = normalizeKeyword(getMajor(record));
    if (schoolKey && !school.includes(schoolKey)) return false;
    if (majorKey && !major.includes(majorKey)) return false;
    return true;
  }

  function normalizeRecord(record, targetScore) {
    const score = getScore(record);
    const rank = getRank(record);
    const group = Number.isFinite(score) ? classify(score, targetScore) : 'outside';
    return {
      raw: record,
      id: text(record.id) || `${getSchool(record)}-${getMajor(record)}-${score}-${rank}`,
      school: getSchool(record),
      major: getMajor(record),
      score,
      rank,
      scoreDelta: Number.isFinite(score) ? score - targetScore : null,
      group,
      region: getRegionText(record),
      nature: text(record.schoolNatureLabel),
      status: text(record.status),
      tuition: text(record.tuition2025),
      flags: Array.isArray(record.riskFlags) ? record.riskFlags : []
    };
  }

  function sortByGroup(records) {
    return records.sort((a, b) => {
      const da = Math.abs(a.scoreDelta || 0);
      const db = Math.abs(b.scoreDelta || 0);
      if (a.group === 'upper') return (a.scoreDelta - b.scoreDelta) || (a.rank || 0) - (b.rank || 0);
      if (a.group === 'near') return da - db || (a.rank || 0) - (b.rank || 0);
      if (a.group === 'lower') return da - db || (a.rank || 0) - (b.rank || 0);
      return da - db;
    });
  }

  async function query(options) {
    const subjectKey = options.subjectKey || getActiveSubject();
    const targetScore = Math.round(Number(options.targetScore || getTargetScoreFromPage()));

    if (subjectKey !== cfg().supportedSubject) {
      return {
        unsupported: true,
        subjectKey,
        targetScore,
        groups: { upper: [], near: [], lower: [] },
        total: 0
      };
    }

    const rankWindow = buildRankWindow(subjectKey, targetScore);
    const rawRecords = await loadRecordsForWindow(rankWindow);
    const region = options.region || 'all';
    const schoolKeyword = options.schoolKeyword || '';
    const majorKeyword = options.majorKeyword || '';

    const normalized = rawRecords
      .map((record) => normalizeRecord(record, targetScore))
      .filter((record) => record.group !== 'outside')
      .filter((record) => Number.isFinite(record.score))
      .filter((record) => matchRegion(record.raw, region))
      .filter((record) => matchKeyword(record.raw, schoolKeyword, majorKeyword));

    const groups = { upper: [], near: [], lower: [] };
    normalized.forEach((record) => groups[record.group].push(record));
    Object.keys(groups).forEach((key) => sortByGroup(groups[key]));

    return {
      unsupported: false,
      subjectKey,
      targetScore,
      rankWindow,
      filters: { region, schoolKeyword, majorKeyword },
      groups,
      total: normalized.length,
      manifest: manifestCache
    };
  }

  window.TargetMajorPoolEngine = {
    buildScoreWindow,
    buildRankWindow,
    query,
    getActiveSubject,
    getTargetScoreFromPage,
    classify
  };
})();
