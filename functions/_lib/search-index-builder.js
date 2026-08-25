export function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[（）()【】\[\]·\-—_]/g, '');
}

function joinValues(values) {
  return values.flat(Infinity).filter(v => v != null && v !== '').join(' ');
}

export function buildSearchIndex(records = []) {
  return (Array.isArray(records) ? records : []).map((record, index) => ({
    index,
    record,
    majorCode: String(record.standardMajor?.code || record.codes?.standardMajorCode || record.majorCode2026 || '').trim().toUpperCase(),
    majorText: normalizeSearchText(joinValues([
      record.majorName,
      record.major,
      record.majorCategory,
      record.majorFamily,
      record.majorGroup,
      record.majorTags,
      record.standardMajor?.code,
      record.standardMajor?.name,
      record.standardMajor?.categoryCode,
      record.standardMajor?.categoryName,
      record.codes?.standardMajorCode
    ])),
    projectText: normalizeSearchText(joinValues([
      record.majorName,
      record.major,
      record.remark,
      record.majorRemark,
      record.enrollRemark,
      record.tuition,
      record.tuitionText,
      record.feeType,
      record.cooperationType,
      record.projectType,
      record.flags,
      record.tags,
      record.rawText,
      record.codes?.rawFenxiMajorCode,
      record.codes?.standardMajorCode
    ])),
    schoolText: normalizeSearchText(joinValues([
      record.schoolName,
      record.school,
      record.schoolAlias,
      record.schoolCanonical,
      record.nature,
      record.schoolTags,
      record.flags
    ])),
    industryText: normalizeSearchText(joinValues([
      record.industryTag,
      record.schoolIndustry,
      record.majorIndustry,
      record.industryTags,
      record.schoolTags,
      record.flags
    ]))
  }));
}

let SEARCH_INDEX_CACHE = null;
let SEARCH_INDEX_VERSION = '';

export function getSearchIndex(records = [], version = 'default') {
  if (SEARCH_INDEX_CACHE && SEARCH_INDEX_VERSION === version) return SEARCH_INDEX_CACHE;
  SEARCH_INDEX_CACHE = buildSearchIndex(records);
  SEARCH_INDEX_VERSION = version;
  return SEARCH_INDEX_CACHE;
}
