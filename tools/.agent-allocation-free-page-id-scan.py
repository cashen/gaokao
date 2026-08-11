from pathlib import Path

def rep(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit('missing ' + label)
    p.write_text(s.replace(old, new, 1))

p = 'functions/_lib/major-bands-static-provider.js'
rep(p,
"""    const start = cursor;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (; cursor < source.length; cursor += 1) {
      const char = source[cursor];
""",
"""    const start = cursor;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let primaryIdCaptured = false;
    let primaryIdValue;
    for (; cursor < source.length; cursor += 1) {
      const char = source[cursor];
""", 'primary ID state')

rep(p,
"""      if (char === '[' || char === '{') depth += 1;
      else if (char === ']' || char === '}') {
""",
"""      if (char === ',' && depth === 1 && allowedIds && idIndex === 0 && !primaryIdCaptured) {
        const rawId = source.slice(start + 1, cursor).trim();
        primaryIdValue = rawId ? JSON.parse(rawId) : undefined;
        primaryIdCaptured = true;
      }
      if (char === '[' || char === '{') depth += 1;
      else if (char === ']' || char === '}') {
""", 'capture ID during boundary traversal')

rep(p,
"""    if (depth !== 0 || inString) throw new Error('静态专业位次桶 row 未完整结束');

    const rowText = source.slice(start, cursor);
    rowCount += 1;
    const scalarIndexes = [];
    if (allowedIds && idIndex >= 0) scalarIndexes.push(idIndex);
    if (rankRange && rankIndex >= 0) scalarIndexes.push(rankIndex);
    if (regionPredecodeEnabled) scalarIndexes.push(...regionScalarIndexes);
    const scalarValues = scalarIndexes.length
      ? readTopLevelArrayScalars(rowText, scalarIndexes)
      : new Map();

    // Cached-page refetch is ID-first: rows outside the current page stop here
    // before rank/region checks or full JSON.parse. Cold queries have no ID set
    // and therefore start with rank -> region before full parse.
    if (allowedIds && idIndex >= 0) {
      pageIdScalarPrefilterCount += 1;
      if (!allowedIds.has(String(scalarValues.get(idIndex) || ''))) continue;
    }
""",
"""    if (depth !== 0 || inString) throw new Error('静态专业位次桶 row 未完整结束');

    rowCount += 1;
    if (allowedIds && idIndex === 0) {
      pageIdScalarPrefilterCount += 1;
      pageIdPrimaryTraversalCount += 1;
      if (!primaryIdCaptured) throw new Error('静态专业位次桶主遍历未捕获第 0 列 ID');
      if (!allowedIds.has(String(primaryIdValue || ''))) {
        pageIdRowTextAvoidedCount += 1;
        continue;
      }
    }

    const rowText = source.slice(start, cursor);
    pageIdRowTextAllocationCount += 1;
    const scalarIndexes = [];
    if (allowedIds && idIndex >= 0 && idIndex !== 0) scalarIndexes.push(idIndex);
    if (rankRange && rankIndex >= 0) scalarIndexes.push(rankIndex);
    if (regionPredecodeEnabled) scalarIndexes.push(...regionScalarIndexes);
    const scalarValues = scalarIndexes.length
      ? readTopLevelArrayScalars(rowText, scalarIndexes)
      : new Map();
    if (allowedIds && idIndex === 0) scalarValues.set(idIndex, primaryIdValue);

    // Cached-page refetch is ID-first: schema index 0 is captured during the
    // primary boundary traversal, so non-page rows never allocate rowText.
    // Fallback schemas retain the scalar prefilter after rowText creation.
    if (allowedIds && idIndex > 0) {
      pageIdScalarPrefilterCount += 1;
      if (!allowedIds.has(String(scalarValues.get(idIndex) || ''))) continue;
    }
""", 'allocation-free ID gate')

rep(p,
"""  let pageIdScalarPrefilterCount = 0;
  let pageIdDirectLookupCount = 0;
""",
"""  let pageIdScalarPrefilterCount = 0;
  let pageIdPrimaryTraversalCount = 0;
  let pageIdRowTextAllocationCount = 0;
  let pageIdRowTextAvoidedCount = 0;
  let pageIdDirectLookupCount = 0;
""", 'allocation counters')

rep(p,
"""    pageIdScalarPrefilterCount,
    pageIdDirectLookupCount,
""",
"""    pageIdScalarPrefilterCount,
    pageIdPrimaryTraversalCount,
    pageIdRowTextAllocationCount,
    pageIdRowTextAvoidedCount,
    pageIdDirectLookupCount,
""", 'return allocation counters')

p = 'tools/verify-major-bands-rank-native-scan-v3990_1.mjs'
rep(p,
"""let allowedFullRowParses = 0;
let allowedScalarPrefilters = 0;
""",
"""let allowedFullRowParses = 0;
let allowedScalarPrefilters = 0;
let allowedPrimaryTraversalScans = 0;
let allowedRowTextAllocations = 0;
let avoidedRowTextAllocations = 0;
""", 'verifier counters')
rep(p,
"""  assert.equal(selective.pageIdScalarPrefilterCount, payload.rows.length, `${bucket.file}: ID-first scan count`);
  assert.equal(selective.pageIdDirectLookupCount, 0, `${bucket.file}: direct lookup disabled`);
""",
"""  assert.equal(selective.pageIdScalarPrefilterCount, payload.rows.length, `${bucket.file}: ID-first scan count`);
  assert.equal(selective.pageIdPrimaryTraversalCount, payload.rows.length, `${bucket.file}: primary traversal ID scan count`);
  assert.equal(selective.pageIdRowTextAllocationCount, allowedRowsTruth.length, `${bucket.file}: rowText allocations only for page IDs`);
  assert.equal(selective.pageIdRowTextAvoidedCount, payload.rows.length - allowedRowsTruth.length, `${bucket.file}: avoided non-page rowText allocations`);
  assert.equal(selective.pageIdDirectLookupCount, 0, `${bucket.file}: direct lookup disabled`);
""", 'verifier per bucket')
rep(p,
"""  allowedFullRowParses += selective.fullRowParseCount;
  allowedScalarPrefilters += selective.pageIdScalarPrefilterCount;
""",
"""  allowedFullRowParses += selective.fullRowParseCount;
  allowedScalarPrefilters += selective.pageIdScalarPrefilterCount;
  allowedPrimaryTraversalScans += selective.pageIdPrimaryTraversalCount;
  allowedRowTextAllocations += selective.pageIdRowTextAllocationCount;
  avoidedRowTextAllocations += selective.pageIdRowTextAvoidedCount;
""", 'verifier aggregate')
rep(p,
"""assert.equal(allowedScalarPrefilters, Number(manifest.recordCount), 'allowed-ID ID-first scan total');
""",
"""assert.equal(allowedScalarPrefilters, Number(manifest.recordCount), 'allowed-ID ID-first scan total');
assert.equal(allowedPrimaryTraversalScans, Number(manifest.recordCount), 'primary traversal ID scan total');
assert.equal(allowedRowTextAllocations, allowedTruth, 'rowText allocation only for allowed IDs');
assert.equal(avoidedRowTextAllocations, Number(manifest.recordCount) - allowedTruth, 'non-page rowText allocations avoided');
""", 'verifier aggregate assertions')
rep(p,
"""  pageIdIdFirstScans: allowedScalarPrefilters,
  directLookupDisabled: true,
""",
"""  pageIdIdFirstScans: allowedScalarPrefilters,
  pageIdPrimaryTraversalScans: allowedPrimaryTraversalScans,
  pageIdRowTextAllocations: allowedRowTextAllocations,
  pageIdRowTextAvoided: avoidedRowTextAllocations,
  directLookupDisabled: true,
""", 'verifier output')
