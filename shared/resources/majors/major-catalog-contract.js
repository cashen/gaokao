export const MAJOR_CATALOG_RESOURCE_CONTRACT = Object.freeze({
  version: 'major-catalog-resource-v3958',
  catalogYear: 2026,
  canonicalCount: 883,
  canonicalDisciplineCount: 13,
  canonicalCategoryCount: 92,
  policy: 'single-resolver-derived-runtime-formats',
  boundary: '2026本科专业目录只用于专业代码、专业类、目录变化和专业理解，不覆盖历史投档事实。'
});

export function normalizeMajorCode(value) {
  return String(value || '').normalize('NFKC').trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeMajorText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[\s·・]/g, '')
    .trim();
}

export function stripAdmissionDecoration(value) {
  return normalizeMajorText(value)
    .replace(/\([^)]*(中外|合作|校企|高收费|较高收费|国际|实验班|试验班|拔尖|方向|卓越|师范|非师范|英语|日语|俄语|民族|定向|专项|创新班|基地班)[^)]*\)/g, '')
    .trim();
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

export function adaptMajorCatalogRow(row = {}) {
  return Object.freeze({
    ...row,
    code: normalizeMajorCode(row.code),
    name: String(row.name || '').trim(),
    categoryCode: String(row.categoryCode || row.majorClassCode || '').trim(),
    categoryName: String(row.categoryName || row.majorClass || '').trim(),
    disciplineCode: String(row.disciplineCode || '').trim(),
    disciplineName: String(row.disciplineName || row.discipline || row.degreeCategory || '').trim(),
    aliases: Object.freeze(unique(row.aliases || [])),
    catalogYear: Number(row.catalogYear || MAJOR_CATALOG_RESOURCE_CONTRACT.catalogYear)
  });
}

/**
 * Normalizes only the hierarchy identity of a 2026 undergraduate-catalog row.
 *
 * The browser-facing legacy catalog predates the 2026 cross-discipline move and
 * may carry a historical `majorClass` display label without the canonical
 * `categoryCode`. For ordinary six-digit majors, the first four numeric digits
 * remain the official major-class code. For the new 14 交叉学科门类, the 2026
 * standard catalog intentionally leaves categoryCode/categoryName empty. In
 * that state we must preserve “专业类未单列” rather than invent `1400` or reuse
 * a historical class label.
 */
export function deriveMajorCatalogHierarchy(row = {}) {
  const adapted = adaptMajorCatalogRow(row);
  const numeric = adapted.code.replace(/[^0-9]/g, '');
  const disciplineCode = adapted.disciplineCode || (numeric.length >= 2 ? numeric.slice(0, 2) : '');
  const disciplineName = adapted.disciplineName;
  const explicitCategoryCode = String(row.categoryCode || row.majorClassCode || '').trim();
  const explicitCategoryName = String(row.categoryName || '').trim();
  const categoryIsUnlisted = disciplineCode === '14' && !explicitCategoryCode;
  const categoryCode = categoryIsUnlisted
    ? ''
    : (explicitCategoryCode || (numeric.length >= 4 ? numeric.slice(0, 4) : ''));
  const categoryName = categoryIsUnlisted
    ? ''
    : (explicitCategoryName || String(row.majorClass || adapted.categoryName || '').trim());

  return Object.freeze({
    code: adapted.code,
    name: adapted.name,
    disciplineCode,
    disciplineName,
    categoryCode,
    categoryName,
    categoryIsUnlisted,
    catalogYear: adapted.catalogYear
  });
}

export function createMajorCatalogResolver(rows = [], categories = []) {
  const majors = (Array.isArray(rows) ? rows : []).map(adaptMajorCatalogRow).filter(item => item.code && item.name);
  const byCode = new Map();
  const byName = new Map();
  const byAlias = new Map();
  const categoryMap = new Map();

  for (const item of majors) {
    byCode.set(item.code, item);
    byName.set(normalizeMajorText(item.name), item);
    for (const alias of item.aliases) byAlias.set(normalizeMajorText(alias), item);
    if (item.categoryName) {
      const key = normalizeMajorText(item.categoryName);
      const existing = categoryMap.get(key) || {
        code: item.categoryCode,
        name: item.categoryName,
        disciplineCode: item.disciplineCode,
        disciplineName: item.disciplineName,
        codes: []
      };
      if (!existing.codes.includes(item.code)) existing.codes.push(item.code);
      categoryMap.set(key, existing);
    }
  }

  for (const raw of Array.isArray(categories) ? categories : []) {
    const name = String(raw?.name || raw?.categoryName || raw?.majorClass || '').trim();
    if (!name) continue;
    const key = normalizeMajorText(name);
    const existing = categoryMap.get(key) || { codes: [] };
    categoryMap.set(key, {
      ...existing,
      code: String(raw.code || raw.categoryCode || existing.code || '').trim(),
      name,
      disciplineCode: String(raw.disciplineCode || existing.disciplineCode || '').trim(),
      disciplineName: String(raw.disciplineName || raw.discipline || existing.disciplineName || '').trim(),
      codes: unique(existing.codes || [])
    });
  }

  function findByCode(value) {
    return byCode.get(normalizeMajorCode(value)) || null;
  }

  function findByName(value) {
    const direct = normalizeMajorText(value);
    const stripped = stripAdmissionDecoration(value);
    return byName.get(direct) || byName.get(stripped) || byAlias.get(direct) || byAlias.get(stripped) || null;
  }

  function findCategory(value) {
    const direct = normalizeMajorText(value);
    const stripped = stripAdmissionDecoration(value);
    return categoryMap.get(direct) || categoryMap.get(stripped) || null;
  }

  function resolve(value, options = {}) {
    const input = String(value || '').trim();
    if (!input) return null;
    const code = findByCode(input);
    if (code) return { kind: 'major', item: code, matchType: 'code', confidence: 100 };

    const direct = normalizeMajorText(input);
    const stripped = stripAdmissionDecoration(input);
    const exactName = byName.get(direct);
    if (exactName) return { kind: 'major', item: exactName, matchType: 'name_exact', confidence: 100 };
    const cleanedName = stripped !== direct ? byName.get(stripped) : null;
    if (cleanedName) return { kind: 'major', item: cleanedName, matchType: 'admission_suffix_clean', confidence: 96 };
    const alias = byAlias.get(direct) || byAlias.get(stripped);
    if (alias) return { kind: 'major', item: alias, matchType: 'alias_exact', confidence: 88 };

    const category = categoryMap.get(direct) || categoryMap.get(stripped);
    if (category) return { kind: 'category', item: Object.freeze({ ...category, codes: Object.freeze([...(category.codes || [])]) }), matchType: 'category_name', confidence: 72 };

    if (options.allowContains === false) return null;
    let bestMajor = null;
    for (const [nameKey, item] of byName.entries()) {
      if (nameKey && stripped.includes(nameKey) && (!bestMajor || nameKey.length > bestMajor.key.length)) bestMajor = { key: nameKey, item, alias: false };
    }
    for (const [aliasKey, item] of byAlias.entries()) {
      if (aliasKey && stripped.includes(aliasKey) && (!bestMajor || aliasKey.length > bestMajor.key.length)) bestMajor = { key: aliasKey, item, alias: true };
    }
    if (bestMajor) return { kind: 'major', item: bestMajor.item, matchType: bestMajor.alias ? 'alias_contains' : 'name_contains', confidence: bestMajor.alias ? 80 : 92 };

    let bestCategory = null;
    for (const [categoryKey, item] of categoryMap.entries()) {
      if (categoryKey && stripped.includes(categoryKey) && (!bestCategory || categoryKey.length > bestCategory.key.length)) bestCategory = { key: categoryKey, item };
    }
    return bestCategory
      ? { kind: 'category', item: Object.freeze({ ...bestCategory.item, codes: Object.freeze([...(bestCategory.item.codes || [])]) }), matchType: 'category_contains', confidence: 68 }
      : null;
  }

  function search(value, options = {}) {
    const input = normalizeMajorText(value);
    const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 8;
    if (!input) return [];
    const codeMatch = byCode.get(normalizeMajorCode(input));
    if (codeMatch) return [{ item: codeMatch, score: 1, matchType: 'code_exact' }];
    const rows = [];
    for (const item of majors) {
      let best = scoreMajorText(input, normalizeMajorText(item.name), 'name');
      for (const alias of item.aliases) {
        const candidate = scoreMajorText(input, normalizeMajorText(alias), 'alias');
        if (candidate.score > best.score) best = candidate;
      }
      if (best.score >= 0.42) rows.push({ item, score: roundMajorScore(best.score), matchType: best.matchType });
    }
    rows.sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length || a.item.name.localeCompare(b.item.name, 'zh-CN'));
    return rows.slice(0, limit);
  }

  return Object.freeze({
    contract: MAJOR_CATALOG_RESOURCE_CONTRACT,
    count: majors.length,
    majors: Object.freeze(majors),
    categoryCount: categoryMap.size,
    findByCode,
    findByName,
    findCategory,
    resolve,
    search,
    codesForCategory(value) {
      return [...(findCategory(value)?.codes || [])];
    }
  });
}

export function scoreMajorText(query, target, kind = 'name') {
  if (!query || !target) return { score: 0, matchType: 'none' };
  if (query === target) return { score: kind === 'name' ? 1 : 0.99, matchType: `${kind}_exact` };
  if (target.startsWith(query)) {
    const coverage = query.length / target.length;
    return { score: Math.min(0.97, 0.78 + coverage * 0.19 + (kind === 'alias' ? 0.015 : 0)), matchType: `${kind}_prefix` };
  }
  if (target.includes(query)) {
    const coverage = query.length / target.length;
    return { score: Math.min(0.9, 0.65 + coverage * 0.22 + (kind === 'alias' ? 0.015 : 0)), matchType: `${kind}_contains` };
  }
  if (query.startsWith(target) && target.length >= 2) {
    const coverage = target.length / query.length;
    return { score: Math.min(0.86, 0.58 + coverage * 0.24), matchType: `${kind}_expanded` };
  }
  if (query.length < 2 || target.length < 2) return { score: 0, matchType: 'none' };
  const distance = levenshtein(query, target);
  const similarity = 1 - distance / Math.max(query.length, target.length);
  const prefixBonus = query[0] === target[0] ? 0.035 : 0;
  const suffixBonus = query.at(-1) === target.at(-1) ? 0.02 : 0;
  return { score: Math.max(0, similarity + prefixBonus + suffixBonus + (kind === 'alias' ? 0.01 : 0)), matchType: `${kind}_fuzzy` };
}

export function levenshtein(a, b) {
  const source = [...a], target = [...b];
  let previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  for (let i = 1; i <= source.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= target.length; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[target.length];
}

function roundMajorScore(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}
