from pathlib import Path

provider = Path('functions/_lib/major-bands-static-provider.js')
text = provider.read_text()

old = "export const MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION = 'major-bands-page-id-direct-row-lookup-v3990_1';\n"
new = "export const MAJOR_BANDS_PAGE_ID_ID_FIRST_PREFILTER_VERSION = 'major-bands-page-id-id-first-prefilter-v3990_1';\n"
if text.count(old) != 1:
    raise SystemExit(f'direct version count={text.count(old)}')
text = text.replace(old, new, 1)

start = text.find('function findTopLevelArrayEnd(source, start) {')
end = text.find('export function scanMajorBandsStaticRankRowsText(text, options = {}) {')
if start < 0 or end <= start:
    raise SystemExit('direct lookup helper block not found')
text = text[:start] + text[end:]

old_branch = """  if (allowedIds && idIndex === 0) {
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

"""
if text.count(old_branch) != 1:
    raise SystemExit(f'direct branch count={text.count(old_branch)}')
text = text.replace(old_branch, '', 1)

old_allowed = """    if (allowedIds && idIndex >= 0) {
      const scalarValues = readTopLevelArrayScalars(rowText, [idIndex, rankIndex]);
      pageIdScalarPrefilterCount += 1;
      const rankMatch = rankRange && rankIndex >= 0
        ? majorBandsRankValueMatchesRange(scalarValues.get(rankIndex), rankRange)
        : true;
      if (!rankMatch) continue;
      rankMatchedCount += 1;
      if (!allowedIds.has(String(scalarValues.get(idIndex) || ''))) continue;
      const row = JSON.parse(rowText);
      fullRowParseCount += 1;
      if (!Array.isArray(row)) throw new Error('静态专业位次桶 row 解析后不是数组');
      rows.push(row);
      continue;
    }
"""
new_allowed = """    if (allowedIds && idIndex >= 0) {
      const scalarValues = readTopLevelArrayScalars(rowText, [idIndex]);
      pageIdScalarPrefilterCount += 1;
      if (!allowedIds.has(String(scalarValues.get(idIndex) || ''))) continue;
      const row = JSON.parse(rowText);
      fullRowParseCount += 1;
      if (!Array.isArray(row)) throw new Error('静态专业位次桶 row 解析后不是数组');
      const rankMatch = rankRange && rankIndex >= 0
        ? majorBandsRankValueMatchesRange(row?.[rankIndex], rankRange)
        : true;
      if (!rankMatch) continue;
      rankMatchedCount += 1;
      rows.push(row);
      continue;
    }
"""
if text.count(old_allowed) != 1:
    raise SystemExit(f'allowed scalar branch count={text.count(old_allowed)}')
text = text.replace(old_allowed, new_allowed, 1)

old_return = """    pageIdScalarPrefilterCount,
    pageIdDirectLookupCount,
    pageIdDirectLookupHits,
    pageIdPrefilterVersion: MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION,
    mode: 'native-row-text-scan',"""
new_return = """    pageIdScalarPrefilterCount,
    pageIdDirectLookupCount,
    pageIdDirectLookupHits,
    pageIdPrefilterVersion: allowedIds && idIndex >= 0
      ? MAJOR_BANDS_PAGE_ID_ID_FIRST_PREFILTER_VERSION
      : MAJOR_BANDS_PAGE_ID_NATIVE_PREFILTER_VERSION,
    mode: allowedIds && idIndex >= 0 ? 'native-page-id-id-first-prefilter' : 'native-row-text-scan',"""
if text.count(old_return) != 1:
    raise SystemExit(f'return block count={text.count(old_return)}')
provider.write_text(text.replace(old_return, new_return, 1))

verifier = Path('tools/verify-major-bands-rank-native-scan-v3990_1.mjs')
v = verifier.read_text()
v = v.replace(
    '  MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION,',
    '  MAJOR_BANDS_PAGE_ID_ID_FIRST_PREFILTER_VERSION,',
    1
)
v = v.replace(
    "assert.equal(MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION, 'major-bands-page-id-direct-row-lookup-v3990_1');",
    "assert.equal(MAJOR_BANDS_PAGE_ID_ID_FIRST_PREFILTER_VERSION, 'major-bands-page-id-id-first-prefilter-v3990_1');",
    1
)
v = v.replace('let allowedDirectLookups = 0;\nlet allowedDirectHits = 0;\n', '', 1)
old_assert = """  assert.deepEqual(selective.rows, allowedRowsTruth, `${bucket.file}: rank/id truth mismatch`);
  assert.equal(selective.mode, 'native-page-id-direct-row-lookup', `${bucket.file}: direct lookup mode`);
  assert.equal(selective.pageIdPrefilterVersion, MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION, `${bucket.file}: direct lookup version`);
  assert.equal(selective.pageIdScalarPrefilterCount, 0, `${bucket.file}: scalar scan should be bypassed`);
  assert.equal(selective.pageIdDirectLookupCount, allowedIds.size, `${bucket.file}: direct lookup count`);
  assert.equal(selective.pageIdDirectLookupHits, allowedRowsTruth.length, `${bucket.file}: direct lookup hits`);
  assert.equal(selective.fullRowParseCount, allowedRowsTruth.length, `${bucket.file}: full row parse count`);"""
new_assert = """  assert.deepEqual(selective.rows, allowedRowsTruth, `${bucket.file}: rank/id truth mismatch`);
  assert.equal(selective.mode, 'native-page-id-id-first-prefilter', `${bucket.file}: ID-first mode`);
  assert.equal(selective.pageIdPrefilterVersion, MAJOR_BANDS_PAGE_ID_ID_FIRST_PREFILTER_VERSION, `${bucket.file}: ID-first version`);
  assert.equal(selective.pageIdScalarPrefilterCount, payload.rows.length, `${bucket.file}: ID-first scan count`);
  assert.equal(selective.pageIdDirectLookupCount, 0, `${bucket.file}: direct lookup disabled`);
  assert.equal(selective.pageIdDirectLookupHits, 0, `${bucket.file}: direct lookup hits disabled`);
  assert.equal(selective.fullRowParseCount, allowedRowsTruth.length, `${bucket.file}: full row parse count`);"""
if v.count(old_assert) != 1:
    raise SystemExit(f'verifier direct assertion block count={v.count(old_assert)}')
v = v.replace(old_assert, new_assert, 1)
v = v.replace(
    "  allowedDirectLookups += selective.pageIdDirectLookupCount;\n  allowedDirectHits += selective.pageIdDirectLookupHits;\n",
    '',
    1
)
v = v.replace(
    "assert.equal(allowedScalarPrefilters, 0, 'allowed-ID scalar prefilter bypass total');\nassert.equal(allowedDirectHits, allowedTruth, 'allowed-ID direct hit total');",
    "assert.equal(allowedScalarPrefilters, Number(manifest.recordCount), 'allowed-ID ID-first scan total');",
    1
)
old_output = """  pageIdDirectLookupVersion: MAJOR_BANDS_PAGE_ID_DIRECT_LOOKUP_VERSION,
  pageIdFullRowParses: allowedFullRowParses,
  pageIdScalarPrefilters: allowedScalarPrefilters,
  pageIdDirectLookups: allowedDirectLookups,
  pageIdDirectHits: allowedDirectHits,
  fullRowParseOnlyForAllowedIds: true,"""
new_output = """  pageIdIdFirstPrefilterVersion: MAJOR_BANDS_PAGE_ID_ID_FIRST_PREFILTER_VERSION,
  pageIdFullRowParses: allowedFullRowParses,
  pageIdIdFirstScans: allowedScalarPrefilters,
  directLookupDisabled: true,
  fullRowParseOnlyForAllowedIds: true,"""
if v.count(old_output) != 1:
    raise SystemExit(f'verifier direct output block count={v.count(old_output)}')
verifier.write_text(v.replace(old_output, new_output, 1))
