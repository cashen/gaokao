from pathlib import Path

provider = Path('functions/_lib/major-bands-static-provider.js')
text = provider.read_text()
version_marker = "export const MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION = 'major-bands-page-id-native-prefilter-v3990_1';"
version_add = version_marker + "\nexport const MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION = 'major-bands-page-id-direct-row-lookup-v3990_1';"
if text.count(version_marker) != 1:
    raise SystemExit(f'version marker count={text.count(version_marker)}')
text = text.replace(version_marker, version_add, 1)

scan_marker = "export function scanMajorBandsStaticRankRowsText(text, options = {}) {"
helpers = r'''function findTopLevelArrayEnd(source, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '[' || char === '{') depth += 1;
    else if (char === ']' || char === '}') {
      depth -= 1;
      if (depth === 0) return cursor + 1;
      if (depth < 0) throw new Error('静态专业位次桶直接定位 row 容器深度异常');
    }
  }
  throw new Error('静态专业位次桶直接定位 row 未完整结束');
}

function findMajorBandsStaticRowTextById(source, rowsStart, id) {
  const canonicalId = String(id || '');
  if (!canonicalId) return '';
  const pattern = `[${JSON.stringify(canonicalId)},`;
  let from = rowsStart + 1;
  while (from < source.length) {
    const start = source.indexOf(pattern, from);
    if (start < 0) return '';
    let previous = start - 1;
    while (previous > rowsStart && /\s/.test(source[previous])) previous -= 1;
    if (source[previous] === '[' || source[previous] === ',') {
      const end = findTopLevelArrayEnd(source, start);
      return source.slice(start, end);
    }
    from = start + pattern.length;
  }
  return '';
}

'''
if text.count(scan_marker) != 1:
    raise SystemExit(f'scan marker count={text.count(scan_marker)}')
text = text.replace(scan_marker, helpers + scan_marker, 1)

allowed_anchor = """  const rows = [];
  let rowCount = 0;
  let rankMatchedCount = 0;
  let fullRowParseCount = 0;
  let pageIdScalarPrefilterCount = 0;
  let cursor = rowsStart + 1;"""
allowed_replacement = """  const rows = [];
  const expectedRecordCount = Math.max(0, Number(options.expectedRecordCount || 0));
  let rowCount = 0;
  let rankMatchedCount = 0;
  let fullRowParseCount = 0;
  let pageIdScalarPrefilterCount = 0;
  let pageIdDirectLookupCount = 0;
  let pageIdDirectLookupHits = 0;

  if (allowedIds && idIndex === 0) {
    rowCount = expectedRecordCount;
    for (const id of allowedIds) {
      pageIdDirectLookupCount += 1;
      const rowText = findMajorBandsStaticRowTextById(source, rowsStart, id);
      if (!rowText) continue;
      const row = JSON.parse(rowText);
      fullRowParseCount += 1;
      if (!Array.isArray(row)) throw new Error('静态专业位次桶直接定位 row 解析后不是数组');
      if (String(row?.[idIndex] || '') !== String(id)) throw new Error('静态专业位次桶直接定位 ID 不一致');
      const rankMatch = rankRange && rankIndex >= 0
        ? majorBandsRankValueMatchesRange(row?.[rankIndex], rankRange)
        : true;
      if (!rankMatch) continue;
      rankMatchedCount += 1;
      pageIdDirectLookupHits += 1;
      rows.push(row);
    }
    const suffix = source.slice(source.lastIndexOf(']') + 1).trim();
    if (!suffix.endsWith('}')) throw new Error('静态专业位次桶外层 JSON 未完整结束');
    return {
      version,
      rows,
      rowCount,
      rankMatchedCount,
      rankMatchedCountMode: 'selected-page-ids-only',
      fullRowParseCount,
      pageIdScalarPrefilterCount,
      pageIdDirectLookupCount,
      pageIdDirectLookupHits,
      pageIdPrefilterVersion: MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION,
      mode: 'native-page-id-direct-row-lookup',
      scanVersion: MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION
    };
  }

  let cursor = rowsStart + 1;"""
if text.count(allowed_anchor) != 1:
    raise SystemExit(f'allowed anchor count={text.count(allowed_anchor)}')
text = text.replace(allowed_anchor, allowed_replacement, 1)

duplicate_expected = "  const expectedRecordCount = Math.max(0, Number(options.expectedRecordCount || 0));\n  if (expectedRecordCount && rowCount !== expectedRecordCount) {"
replacement_expected = "  if (expectedRecordCount && rowCount !== expectedRecordCount) {"
if text.count(duplicate_expected) != 1:
    raise SystemExit(f'expected count anchor count={text.count(duplicate_expected)}')
text = text.replace(duplicate_expected, replacement_expected, 1)

return_anchor = """    pageIdScalarPrefilterCount,
    pageIdDirectLookupCount,
    pageIdDirectLookupHits,
    pageIdPrefilterVersion: MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION,
    mode: 'native-row-text-scan',"""
return_replacement = return_anchor
if text.count(return_anchor) != 1:
    old_return = """    pageIdScalarPrefilterCount,
    pageIdPrefilterVersion: MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION,
    mode: 'native-row-text-scan',"""
    new_return = """    pageIdScalarPrefilterCount,
    pageIdDirectLookupCount,
    pageIdDirectLookupHits,
    pageIdPrefilterVersion: MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION,
    mode: 'native-row-text-scan',"""
    if text.count(old_return) != 1:
        raise SystemExit(f'return anchor count={text.count(old_return)}')
    text = text.replace(old_return, new_return, 1)
provider.write_text(text)

verifier = Path('tools/verify-major-bands-rank-native-scan-v3990_1.mjs')
v = verifier.read_text()
old = "  MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION,"
new = "  MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION,\n  MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION,"
if v.count(old) != 1:
    raise SystemExit(f'verifier import count={v.count(old)}')
v = v.replace(old, new, 1)
old = "assert.equal(MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION, 'major-bands-page-id-native-prefilter-v3990_1');"
new = old + "\nassert.equal(MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION, 'major-bands-page-id-direct-row-lookup-v3990_1');"
if v.count(old) != 1:
    raise SystemExit(f'verifier version assert count={v.count(old)}')
v = v.replace(old, new, 1)
old = "let allowedScalarPrefilters = 0;"
new = old + "\nlet allowedDirectLookups = 0;\nlet allowedDirectHits = 0;"
if v.count(old) != 1:
    raise SystemExit(f'verifier totals count={v.count(old)}')
v = v.replace(old, new, 1)
old_asserts = """  assert.equal(selective.rankMatchedCount, rankTruth.length, `${bucket.file}: rank truth count`);
  assert.deepEqual(selective.rows, allowedRowsTruth, `${bucket.file}: rank/id truth mismatch`);
  assert.equal(selective.pageIdPrefilterVersion, MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION, `${bucket.file}: page-ID prefilter version`);
  assert.equal(selective.pageIdScalarPrefilterCount, payload.rows.length, `${bucket.file}: scalar prefilter count`);
  assert.equal(selective.fullRowParseCount, allowedRowsTruth.length, `${bucket.file}: full row parse count`);"""
new_asserts = """  assert.deepEqual(selective.rows, allowedRowsTruth, `${bucket.file}: rank/id truth mismatch`);
  assert.equal(selective.mode, 'native-page-id-direct-row-lookup', `${bucket.file}: direct lookup mode`);
  assert.equal(selective.pageIdPrefilterVersion, MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION, `${bucket.file}: direct lookup version`);
  assert.equal(selective.pageIdScalarPrefilterCount, 0, `${bucket.file}: scalar scan should be bypassed`);
  assert.equal(selective.pageIdDirectLookupCount, allowedIds.size, `${bucket.file}: direct lookup count`);
  assert.equal(selective.pageIdDirectLookupHits, allowedRowsTruth.length, `${bucket.file}: direct lookup hits`);
  assert.equal(selective.fullRowParseCount, allowedRowsTruth.length, `${bucket.file}: full row parse count`);"""
if v.count(old_asserts) != 1:
    raise SystemExit(f'verifier selective assertions count={v.count(old_asserts)}')
v = v.replace(old_asserts, new_asserts, 1)
old = "  selectiveScanned += selective.rankMatchedCount;"
new = "  selectiveScanned += rankTruth.length;"
if v.count(old) != 1:
    raise SystemExit(f'verifier selective total count={v.count(old)}')
v = v.replace(old, new, 1)
old = "  allowedScalarPrefilters += selective.pageIdScalarPrefilterCount;"
new = old + "\n  allowedDirectLookups += selective.pageIdDirectLookupCount;\n  allowedDirectHits += selective.pageIdDirectLookupHits;"
if v.count(old) != 1:
    raise SystemExit(f'verifier direct totals count={v.count(old)}')
v = v.replace(old, new, 1)
old = "assert.equal(allowedScalarPrefilters, Number(manifest.recordCount), 'allowed-ID scalar prefilter total');"
new = "assert.equal(allowedScalarPrefilters, 0, 'allowed-ID scalar prefilter bypass total');\nassert.equal(allowedDirectHits, allowedTruth, 'allowed-ID direct hit total');"
if v.count(old) != 1:
    raise SystemExit(f'verifier final direct count={v.count(old)}')
v = v.replace(old, new, 1)
output_old = """  pageIdScalarPrefilterVersion: MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION,
  pageIdFullRowParses: allowedFullRowParses,
  pageIdScalarPrefilters: allowedScalarPrefilters,
  fullRowParseOnlyForAllowedIds: true,"""
output_new = """  pageIdDirectLookupVersion: MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION,
  pageIdFullRowParses: allowedFullRowParses,
  pageIdScalarPrefilters: allowedScalarPrefilters,
  pageIdDirectLookups: allowedDirectLookups,
  pageIdDirectHits: allowedDirectHits,
  fullRowParseOnlyForAllowedIds: true,"""
if v.count(output_old) != 1:
    raise SystemExit(f'verifier output count={v.count(output_old)}')
verifier.write_text(v.replace(output_old, output_new, 1))
