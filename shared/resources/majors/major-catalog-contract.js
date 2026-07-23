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

  return Object.freeze({
    contract: MAJOR_CATALOG_RESOURCE_CONTRACT,
    count: majors.length,
    majors: Object.freeze(majors),
    categoryCount: categoryMap.size,
    findByCode,
    findByName,
    findCategory,
    resolve,
    codesForCategory(value) {
      return [...(findCategory(value)?.codes || [])];
    }
  });
}
