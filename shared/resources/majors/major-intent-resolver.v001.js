import { normalizeMajorCode, normalizeMajorText, stripAdmissionDecoration } from './major-catalog-contract.js';

export const MAJOR_INTENT_META = Object.freeze({
  version: 'major-intent-resolver-v001',
  policy: 'catalog-derived-hierarchy-direction-before-ambiguous-exact',
  boundary: '本科专业、专业类、方向和学科层级分开解释；模糊输入先给选择，不静默替换成一个专业。'
});

function text(value = '') {
  return normalizeMajorText(value).replace(/[“”‘’]/g, '').trim();
}

function key(value = '') {
  return text(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function withoutQuestionSuffix(value = '') {
  return key(value)
    .replace(/^(我想了解|我想报|想了解|了解一下|介绍一下|介绍下|讲讲|说说|看看|想学|想读|读)/, '')
    .replace(/(这个)?(专业|方向|相关专业)$/, '')
    .replace(/(怎么样|是干嘛的|干什么的|是啥|是什么|学什么|就业怎么样)$/, '')
    .trim();
}

function stripHierarchyPrefix(value = '') {
  return withoutQuestionSuffix(value)
    .replace(/^(本科)?(专业)?(类|大类)$/, '')
    .replace(/^(学科门类|一级学科|学科|本科专业|专业类)/, '')
    .trim();
}

function isSingleCharacter(value = '') {
  return [...value].length <= 1;
}

function displayMajor(row) {
  return Object.freeze({
    code: normalizeMajorCode(row.code),
    name: String(row.name || '').trim(),
    discipline: String(row.disciplineName || row.discipline || '').trim(),
    disciplineCode: String(row.disciplineCode || '').trim(),
    majorClass: String(row.categoryName || row.majorClass || '').trim(),
    categoryCode: String(row.categoryCode || row.majorClassCode || '').trim(),
    directionLabel: String(row.directionLabel || '').trim(),
    tags: Object.freeze(unique(row.tags || [])),
    aliases: Object.freeze(unique(row.aliases || [])),
    catalogLabel: String(row.catalogLabel || '').trim()
  });
}

function addMapValue(map, mapKey, value) {
  if (!mapKey || !value) return;
  const list = map.get(mapKey) || [];
  if (!list.includes(value)) list.push(value);
  map.set(mapKey, list);
}

// These are intent bridges, not a second major catalogue. The target groups are
// derived from directionLabel, so newly added catalogue majors inherit coverage.
const SPOKEN_DIRECTION_ALIASES = Object.freeze({
  计算机: ['计算机/AI/软件'],
  电脑: ['计算机/AI/软件'],
  软件: ['计算机/AI/软件'],
  互联网: ['计算机/AI/软件'],
  网络安全: ['计算机/AI/软件'],
  机械: ['机械/装备/车辆'],
  机电: ['机械/装备/车辆'],
  智能制造: ['机械/装备/车辆'],
  电气: ['电气/自动化/能源'],
  能源: ['电气/自动化/能源'],
  电子信息: ['电子信息/集成电路'],
  集成电路: ['电子信息/集成电路'],
  芯片: ['电子信息/集成电路'],
  医学: ['医学应用', '医学核心'],
  临床: ['医学核心'],
  师范: ['师范/法学/考公'],
  考公: ['师范/法学/考公'],
  财经: ['财经管理'],
  金融: ['财经管理'],
  管理: ['财经管理'],
  文科: ['文旅外语新闻'],
  外语: ['文旅外语新闻'],
  新闻: ['文旅外语新闻'],
  理科: ['基础理科/数理'],
  材料: ['石化/材料/资源安全'],
  化工: ['石化/材料/资源安全'],
  土木: ['土木建筑交通'],
  建筑: ['土木建筑交通'],
  交通: ['土木建筑交通'],
  农学: ['农林食品环境'],
  食品: ['农林食品环境'],
  环境: ['农林食品环境']
});

const BROAD_SPOKEN_ALIASES = Object.freeze({
  机: ['机械/装备/车辆', '计算机/AI/软件', '电气/自动化/能源'],
  工科: ['计算机/AI/软件', '电气/自动化/能源', '机械/装备/车辆', '电子信息/集成电路', '石化/材料/资源安全', '土木建筑交通'],
  工学: ['计算机/AI/软件', '电气/自动化/能源', '机械/装备/车辆', '电子信息/集成电路', '石化/材料/资源安全', '土木建筑交通'],
  教育: ['师范/法学/考公'],
  生命科学: ['医学应用', '农林食品环境'],
  医疗: ['医学应用', '医学核心']
});

const DIRECTION_CORE_PATTERNS = Object.freeze({
  计算机: ['计算机', '软件', '网络', '信息安全', '物联网', '数据', '大数据', '智能科学', '空间信息', '数字媒体技术', '新媒体技术', '虚拟现实', '区块链', '密码', '工业软件', '人工智能', '具身智能', '保密技术', '服务科学', '电子与计算机'],
  网络安全: ['网络安全', '信息安全', '网络空间安全', '网络工程', '密码', '保密'],
  机械: ['机械', '机电', '车辆', '汽车', '装备', '制造', '工业设计', '过程装备', '微机电', '智能制造', '智能车辆', '仿生', '增材', '交互', '真空', '装甲'],
  电气: ['电气', '电网', '电机', '电缆', '自动化', '机器人', '轨道交通信号', '装备与系统', '工业智能'],
  电子信息: ['电子', '通信', '微电子', '光电', '信息工程', '广播电视', '水声', '集成电路', '电磁场', '电波', '电信', '人工智能', '海洋信息', '柔性电子', '测控', '智能视觉', '智能视听', '半导体'],
  医学: ['医学', '临床', '口腔', '麻醉', '影像', '检验', '预防', '护理', '康复', '药学', '中医学', '针灸', '法医学'],
  财经: ['经济', '金融', '财政', '税收', '会计', '财务', '审计', '保险', '投资', '贸易'],
  外语: ['英语', '日语', '俄语', '法语', '德语', '西班牙语', '语言', '翻译'],
  土木: ['土木', '建筑', '城乡规划', '风景园林', '道路', '桥梁', '交通', '城市地下', '给排水', '工程管理'],
  材料: ['材料', '化学', '化工', '高分子', '金属', '无机非金属', '复合', '能源化学'],
  农学: ['农学', '植物', '园艺', '种子', '农业', '林学', '园林', '森林', '食品', '动物', '水产', '环境']
});

function makeDirectionLabel(label) {
  return String(label || '').trim();
}

function candidateSummary(majors, limit) {
  return majors.slice(0, limit).map(item => ({
    code: item.code,
    name: item.name,
    majorClass: item.majorClass,
    discipline: item.discipline,
    directionLabel: item.directionLabel,
    tags: item.tags
  }));
}

function codesByPatterns(codes, byCode, patterns = []) {
  const normalizedPatterns = patterns.map(key).filter(Boolean);
  if (!normalizedPatterns.length) return codes;
  return codes.filter(code => {
    const major = byCode.get(code);
    const haystack = key([major?.name, major?.aliases.join(' ')].join(' '));
    return normalizedPatterns.some(pattern => haystack.includes(pattern));
  });
}

export function createMajorIntentResolver(rows = [], aliases = [], options = {}) {
  const majors = (Array.isArray(rows) ? rows : [])
    .filter(item => item?.code && item?.name)
    .map(displayMajor);
  const byCode = new Map(majors.map(item => [item.code, item]));
  const byName = new Map(majors.map(item => [key(item.name), item]));
  const byCategory = new Map();
  const byDiscipline = new Map();
  const byDirection = new Map();
  const directionAliases = new Map();
  const aliasByKey = new Map();

  for (const major of majors) {
    const categoryIsDisciplineLabel = major.majorClass.endsWith('门类') && key(major.majorClass).replace(/门类$/, '') === key(major.discipline);
    if (!categoryIsDisciplineLabel) addMapValue(byCategory, key(major.majorClass), major.code);
    addMapValue(byDiscipline, key(major.discipline), major.code);
    addMapValue(byDirection, key(major.directionLabel), major.code);
    for (const segment of major.directionLabel.split(/[\/、,，]/).map(item => item.trim()).filter(Boolean)) {
      addMapValue(directionAliases, key(segment), major.directionLabel);
    }
  }

  for (const [spoken, labels] of Object.entries(SPOKEN_DIRECTION_ALIASES)) {
    for (const label of labels) {
      if (byDirection.has(key(label))) addMapValue(directionAliases, key(spoken), label);
    }
  }

  const aliasRows = (Array.isArray(aliases) ? aliases : [])
    .map(item => ({ ...item, _key: key(item.pattern) }))
    .filter(item => item._key);
  for (const alias of aliasRows) addMapValue(aliasByKey, alias._key, alias);

  function majorsForCodes(codes = []) {
    return unique(codes.map(normalizeMajorCode)).map(code => byCode.get(code)).filter(Boolean);
  }

  function sortedMajors(codes = []) {
    return majorsForCodes(codes).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN') || a.code.localeCompare(b.code));
  }

  function result(raw, values = {}) {
    const core = unique(values.coreMajorCodes || []);
    const related = unique(values.relatedMajorCodes || []).filter(code => !core.includes(code));
    const candidates = sortedMajors([...core, ...related]);
    return Object.freeze({
      rawInput: String(raw || '').trim(),
      query: stripHierarchyPrefix(raw),
      intentKey: values.intentKey || '',
      intentLabel: values.intentLabel || '',
      intentLevel: values.intentLevel || 'unknown',
      status: values.status || 'unresolved',
      matchType: values.matchType || '',
      confidence: values.confidence || 'candidate',
      coreMajorCodes: Object.freeze(core),
      relatedMajorCodes: Object.freeze(related),
      categoryCodes: Object.freeze(unique(values.categoryCodes || [])),
      disciplineKeys: Object.freeze(unique(values.disciplineKeys || [])),
      selectedScope: values.selectedScope || 'core',
      matchedTerms: Object.freeze(unique(values.matchedTerms || [])),
      warnings: Object.freeze(unique(values.warnings || [])),
      candidates: Object.freeze(candidateSummary(candidates, values.limit || 12)),
      allCandidates: Object.freeze(candidates),
      sourceVersion: options.sourceVersion || 'catalog-derived',
      catalogCount: majors.length
    });
  }

  function resolve(rawInput = '', { limit = 12 } = {}) {
    const raw = String(rawInput || '').trim();
    const query = stripHierarchyPrefix(raw);
    if (!query) return result(raw, { status: 'missing', confidence: 'none', limit });

    const hierarchyPrefix = /^(学科门类|一级学科)/.test(key(raw));
    if (hierarchyPrefix) {
      const namedMajor = byName.get(query);
      if (namedMajor) {
        return result(raw, {
          status: 'too-broad', intentKey: `discipline:${namedMajor.code}`, intentLabel: `${namedMajor.name}（本科专业方向）`, intentLevel: 'discipline', matchType: 'discipline_prefix', confidence: 'high',
          relatedMajorCodes: [namedMajor.code], disciplineKeys: [namedMajor.discipline], matchedTerms: [raw],
          warnings: ['“一级学科”是学科理解口径，不直接等同于本科投档专业；这里保留本科专业作为方向参考。'], limit
        });
      }
    }

    const directCode = byCode.get(normalizeMajorCode(query));
    if (directCode) return result(raw, { status: 'ready', intentKey: directCode.code, intentLabel: directCode.name, intentLevel: 'exact-major', matchType: 'code_exact', confidence: 'high', coreMajorCodes: [directCode.code], matchedTerms: [raw], limit });

    const classQuery = query.replace(/类$/, '类');
    const categoryCodes = byCategory.get(key(classQuery));
    const aliasCategory = aliasRows.find(item => item._key === key(query) && item.matchType === 'major-class');
    if (categoryCodes?.length || aliasCategory?.candidateCodes?.length) {
      const codes = categoryCodes || aliasCategory.candidateCodes;
      const label = aliasCategory?.targetMajorClass || majorsForCodes(codes)[0]?.majorClass || query;
      return result(raw, {
        status: 'needs-choice', intentKey: `class:${key(label)}`, intentLabel: label, intentLevel: 'major-class', matchType: 'category_exact', confidence: 'high',
        coreMajorCodes: codes, categoryCodes: [String(aliasCategory?.categoryCode || '')].filter(Boolean), matchedTerms: [raw],
        warnings: ['这是专业类/大类，不等于一个具体本科专业；请确认是否查看该类下全部专业。'], limit
      });
    }

    const exactMajor = byName.get(query);
    if (exactMajor) return result(raw, { status: 'ready', intentKey: exactMajor.code, intentLabel: exactMajor.name, intentLevel: 'exact-major', matchType: 'name_exact', confidence: 'high', coreMajorCodes: [exactMajor.code], matchedTerms: [raw], limit });

    const disciplineQuery = query.replace(/^(学科门类|一级学科)/, '').replace(/(门类$|学科$)/, (suffix, full) => full === '门类' ? '' : '');
    const disciplineCodes = byDiscipline.get(key(disciplineQuery));
    if (disciplineCodes?.length) {
      return result(raw, {
        status: 'too-broad', intentKey: `discipline:${key(disciplineQuery)}`, intentLabel: disciplineQuery, intentLevel: 'discipline', matchType: 'discipline_exact', confidence: 'high',
        coreMajorCodes: [], relatedMajorCodes: disciplineCodes, disciplineKeys: [disciplineQuery], matchedTerms: [raw],
        warnings: ['这是学科门类/一级学科理解，不直接等同于本科投档专业；请继续选择专业方向。'], limit
      });
    }

    const directionKeys = unique([
      ...(directionAliases.get(query) || []),
      ...(BROAD_SPOKEN_ALIASES[query] || []).filter(label => byDirection.has(key(label)))
    ]);
    if (directionKeys.length) {
      const allDirectionCodes = unique(directionKeys.flatMap(label => byDirection.get(key(label)) || []));
      const patterns = DIRECTION_CORE_PATTERNS[query] || [];
      const codes = unique(codesByPatterns(allDirectionCodes, byCode, patterns));
      const relatedCodes = allDirectionCodes.filter(code => !codes.includes(code));
      const tooBroad = isSingleCharacter(query) || (BROAD_SPOKEN_ALIASES[query] || []).length > 1 || codes.length > 40;
      return result(raw, {
        status: tooBroad ? 'too-broad' : 'ready',
        intentKey: `direction:${directionKeys.map(key).join('+')}`,
        intentLabel: directionKeys.join('、'),
        intentLevel: tooBroad ? 'broad-field' : 'direction',
        matchType: tooBroad ? 'spoken_broad_field' : 'spoken_direction',
        confidence: 'high', coreMajorCodes: tooBroad ? [] : codes, relatedMajorCodes: tooBroad ? allDirectionCodes : relatedCodes,
        matchedTerms: [raw], warnings: [tooBroad ? '这个说法范围较宽，先选一个方向，避免把不同专业混在一起。' : '这是方向理解，默认先看该方向的目录专业；需要时可扩大到相关方向。'], limit
      });
    }

    const aliasMatches = aliasByKey.get(query) || [];
    const aliasCodes = unique(aliasMatches.flatMap(item => item.targetCodes || []));
    if (aliasCodes.length === 1 && byCode.has(aliasCodes[0])) {
      const major = byCode.get(aliasCodes[0]);
      return result(raw, { status: 'ready', intentKey: major.code, intentLabel: major.name, intentLevel: 'exact-major', matchType: 'alias_exact', confidence: 'high', coreMajorCodes: [major.code], matchedTerms: [raw], limit });
    }
    if (aliasCodes.length > 1) {
      return result(raw, { status: 'needs-choice', intentKey: `alias:${query}`, intentLabel: raw, intentLevel: 'unknown', matchType: 'alias_ambiguous', confidence: 'candidate', relatedMajorCodes: aliasCodes, matchedTerms: [raw], limit });
    }

    const fuzzy = majors.filter(item => {
      const haystack = [item.name, item.aliases.join(' '), item.majorClass, item.directionLabel, item.discipline].map(key).join(' ');
      return haystack.includes(query) || query.includes(key(item.name));
    });
    if (fuzzy.length) return result(raw, { status: 'needs-choice', intentKey: `keyword:${query}`, intentLabel: raw, intentLevel: 'unknown', matchType: 'keyword_candidates', confidence: 'candidate', relatedMajorCodes: fuzzy.map(item => item.code), matchedTerms: [raw], warnings: ['这不是完整的正式专业名，请从候选中确认。'], limit });
    return result(raw, { status: 'unresolved', intentLevel: 'unknown', confidence: 'none', matchedTerms: [raw], warnings: ['暂时没有安全匹配到本科专业，请换一个更完整的名称或代码。'], limit });
  }

  function resolveMany(input = '', optionsForResolve = {}) {
    const raw = Array.isArray(input) ? input : String(input || '').split(/[,，、/；;|]+/).map(item => item.trim()).filter(Boolean);
    const items = raw.map(item => resolve(item, optionsForResolve));
    const ready = items.filter(item => item.status === 'ready');
    const codes = unique(ready.flatMap(item => item.coreMajorCodes));
    return Object.freeze({
      rawInput: Array.isArray(input) ? raw.join('、') : String(input || ''),
      terms: Object.freeze(raw), items: Object.freeze(items), ready: items.length > 0 && items.every(item => item.status === 'ready'),
      majorCodes: Object.freeze(codes), status: items.some(item => item.status === 'unresolved') ? 'unresolved' : (items.every(item => item.status === 'ready') ? 'ready' : 'needs-choice')
    });
  }

  return Object.freeze({
    meta: MAJOR_INTENT_META,
    count: majors.length,
    directionCount: byDirection.size,
    categoryCount: byCategory.size,
    disciplineCount: byDiscipline.size,
    resolve,
    resolveMany,
    findByCode: code => byCode.get(normalizeMajorCode(code)) || null,
    allMajors: Object.freeze(majors)
  });
}
