import { normalizeMajorCode, normalizeMajorText } from './major-catalog-contract.js';

export const MAJOR_SEARCH_INTENT_META = Object.freeze({
  version: 'major-search-intent-v001',
  policy: 'exact-official-direct-vague-parent-language-disambiguate-before-selection',
  boundary: '家长简称、专业类简称和关键词只用于候选消歧，不得静默升级成某一个正式本科专业。'
});

function key(value = '') {
  return normalizeMajorText(value).toLowerCase();
}

function parentKey(value = '') {
  return key(value)
    .replace(/^(我想了解|想了解|了解一下|介绍一下|介绍下|讲讲|说说|看看|想学|想读|学|读)/, '')
    .replace(/(这个)?(专业|方向|相关专业)$/, '')
    .replace(/(怎么样|是干嘛的|干什么的|是啥|是什么|学什么|就业怎么样)$/, '')
    .trim();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function stripClassSuffix(value = '') {
  return key(value).replace(/类$/, '');
}

function scoreCandidate(major, queryKey, aliasTargets = new Set()) {
  const nameKey = key(major.name);
  let score = 0;
  if (nameKey === queryKey) score += 1000;
  if (nameKey.startsWith(queryKey)) score += 420;
  else if (nameKey.includes(queryKey)) score += 300;
  if (aliasTargets.has(major.code)) score += 220;
  if (stripClassSuffix(major.majorClass || major.categoryName) === queryKey) score += 80;
  score -= Math.min(nameKey.length, 80);
  return score;
}

export function createMajorSearchIntentResolver(rows = [], aliases = []) {
  const majors = (Array.isArray(rows) ? rows : []).filter(item => item?.code && item?.name);
  const byCode = new Map(majors.map(item => [normalizeMajorCode(item.code), item]));
  const byName = new Map(majors.map(item => [key(item.name), item]));
  const classes = new Map();
  for (const major of majors) {
    const className = String(major.majorClass || major.categoryName || '').trim();
    if (!className) continue;
    const classKey = key(className);
    const current = classes.get(classKey) || { name: className, items: [] };
    current.items.push(major);
    classes.set(classKey, current);
  }

  const aliasRows = (Array.isArray(aliases) ? aliases : []).map(item => ({ ...item, _key: key(item.pattern) })).filter(item => item._key);
  const aliasByKey = new Map();
  for (const alias of aliasRows) {
    const list = aliasByKey.get(alias._key) || [];
    list.push(alias);
    aliasByKey.set(alias._key, list);
  }

  function classForStem(queryKey) {
    for (const item of classes.values()) {
      if (stripClassSuffix(item.name) === queryKey) return item;
    }
    return null;
  }

  function majorsForCodes(codes = []) {
    return unique(codes.map(code => normalizeMajorCode(code))).map(code => byCode.get(code)).filter(Boolean);
  }

  function officialNameMatches(queryKey) {
    if (!queryKey) return [];
    return majors.filter(item => key(item.name).includes(queryKey));
  }

  function isStrongLexicalMatch(major, queryKey) {
    const nameKey = key(major?.name);
    return Boolean(queryKey && (nameKey.startsWith(queryKey) || nameKey.endsWith(queryKey)));
  }

  function exactAliasEvidence(queryKey) {
    const rows = aliasByKey.get(queryKey) || [];
    const targetCodes = unique(rows.flatMap(item => item.targetCodes || []));
    return { rows, targetCodes, majors: majorsForCodes(targetCodes) };
  }

  function sortCandidates(items, queryKey, aliasTargets = new Set()) {
    return unique(items.map(item => item.code))
      .map(code => byCode.get(code))
      .filter(Boolean)
      .sort((a, b) => scoreCandidate(b, queryKey, aliasTargets) - scoreCandidate(a, queryKey, aliasTargets) || String(a.code).localeCompare(String(b.code)));
  }

  function candidateSet(queryKey) {
    const aliasMatches = aliasByKey.get(queryKey) || [];
    const aliasCodes = unique(aliasMatches.flatMap(item => item.targetCodes || item.candidateCodes || []));
    const aliasTargets = new Set(aliasCodes);
    const classStem = classForStem(queryKey);
    const contains = majors.filter(item => {
      const nameKey = key(item.name);
      return queryKey && (nameKey.includes(queryKey) || queryKey.includes(nameKey));
    });
    const classItems = classStem?.items || [];
    return { candidates: sortCandidates([...majorsForCodes(aliasCodes), ...contains, ...classItems], queryKey, aliasTargets), aliasMatches, classStem, aliasTargets };
  }

  function ambiguity(raw, semanticType, label, explanation, all, limit) {
    return Object.freeze({
      kind: 'ambiguous', query: raw, semanticType, label: label || '', explanation,
      total: all.length, candidates: Object.freeze(all.slice(0, limit)), allCandidates: Object.freeze(all)
    });
  }

  function resolve(rawQuery = '', { limit = 8 } = {}) {
    const raw = String(rawQuery || '').trim();
    const queryKey = parentKey(raw);
    if (!queryKey) return Object.freeze({ kind: 'empty', query: raw, candidates: Object.freeze([]) });

    const directCode = byCode.get(normalizeMajorCode(raw));
    if (directCode) return Object.freeze({ kind: 'direct', query: raw, matchType: 'code', major: directCode, candidates: Object.freeze([directCode]) });

    const exactName = byName.get(queryKey);
    const classExact = classes.get(queryKey);
    const stemClass = classForStem(queryKey);
    const explicitAlias = exactAliasEvidence(queryKey);
    const explicitAliasTargets = new Set(explicitAlias.targetCodes);

    if (classExact) {
      const all = sortCandidates(classExact.items, queryKey, explicitAliasTargets);
      return ambiguity(raw, 'major_class', classExact.name, `“${raw}”是本科专业类名称，不是一个具体本科专业。先选正式专业，再看升学路径。`, all, limit);
    }

    if (stemClass && !exactName) {
      const all = sortCandidates(stemClass.items, queryKey, explicitAliasTargets);
      return ambiguity(raw, 'class_stem', stemClass.name, `家长说“${raw}”时，常常是在泛指“${stemClass.name}”。它下面有多个正式本科专业，不能默认替你选成其中一个。`, all, limit);
    }

    if (exactName) {
      return Object.freeze({ kind: 'direct', query: raw, matchType: 'official_name', major: exactName, candidates: Object.freeze([exactName]) });
    }

    if (explicitAlias.majors.length === 1) {
      const target = explicitAlias.majors[0];
      const officialMatches = officialNameMatches(queryKey).filter(item => item.code !== target.code);
      const targetUsesTermLexically = key(target.name).includes(queryKey);
      const hasStrongOfficialCompetitor = officialMatches.some(item => isStrongLexicalMatch(item, queryKey));
      if ((targetUsesTermLexically || hasStrongOfficialCompetitor) && officialMatches.length) {
        const all = sortCandidates([target, ...officialMatches], queryKey, explicitAliasTargets);
        return ambiguity(raw, 'broad_alias', '', `“${raw}”虽然是现有别名库中的常用说法，但当前本科目录还有其他正式专业名称也把它作为完整专业词使用。为避免把家长的模糊理解强行收窄，请先确认具体专业。`, all, limit);
      }
      return Object.freeze({
        kind: 'direct', query: raw, matchType: 'alias_exact', major: target,
        explanation: `“${raw}”是家长常用简称，这里按现有本科专业别名库识别为“${target.name}”。`,
        candidates: Object.freeze([target])
      });
    }

    const evidence = candidateSet(queryKey);
    const candidateCodes = unique(evidence.candidates.map(item => item.code));
    if (candidateCodes.length > 1) {
      return ambiguity(raw, explicitAlias.majors.length > 1 ? 'shared_alias' : 'keyword', '', `“${raw}”不是唯一的正式本科专业名。下面这些专业名称或家长常用简称都与它有关，请先确认你想看的具体专业。`, evidence.candidates, limit);
    }

    if (candidateCodes.length === 1) {
      const major = evidence.candidates[0];
      return Object.freeze({
        kind: 'direct', query: raw, matchType: 'keyword_single', major,
        explanation: `“${raw}”不是完整的正式专业名；当前本科目录中只有“${major.name}”与这个关键词形成唯一明确候选，因此先按它展示。`,
        candidates: Object.freeze([major])
      });
    }

    return Object.freeze({ kind: 'none', query: raw, matchType: 'none', candidates: Object.freeze([]) });
  }

  return Object.freeze({
    meta: MAJOR_SEARCH_INTENT_META,
    resolve,
    count: majors.length,
    aliasCount: aliasRows.length
  });
}
