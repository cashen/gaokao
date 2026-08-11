from pathlib import Path

def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'missing {label} in {path}')
    p.write_text(s.replace(old, new, 1))

# The workflow copies the five formally tested PR #135 performance files first.
# Integrate PR #137's canonical region predecode into the native text scanner.
p = Path('functions/_lib/major-bands-static-provider.js')
s = p.read_text()
old = "import { normalizeLocation } from './location-normalizer.js';"
new = old + "\nimport { matchRegionRule } from '../../shared/resources/geo/china-region-catalog.v3990_1.js';"
if new not in s:
    if old not in s: raise SystemExit('missing static provider import anchor')
    s = s.replace(old, new, 1)
old = "export const MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION = 'major-bands-rank-order-minimal-projection-v3990_1';"
new = old + "\nexport const MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION = 'major-bands-predecode-region-filter-v3990_1';"
if 'MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION' not in s:
    if old not in s: raise SystemExit('missing static provider version anchor')
    s = s.replace(old, new, 1)
anchor = "export function majorBandsRankValueMatchesRange(rankLike, range = null) {"
if 'export function majorBandsStaticRowMatchesRegion' not in s:
    helper = """export function majorBandsStaticRowMatchesRegion(row = [], schema = [], region = 'all') {\n  const key = String(region || 'all').trim();\n  if (!key || key === 'all') return true;\n  const index = name => schema.indexOf(name);\n  const value = indexValue => indexValue >= 0 ? row?.[indexValue] : undefined;\n  return matchRegionRule({\n    lnArea: value(index('lnArea')),\n    province: value(index('province')),\n    city: value(index('city'))\n  }, key);\n}\n\n"""
    if anchor not in s: raise SystemExit('missing region helper anchor')
    s = s.replace(anchor, helper + anchor, 1)
scanner = s.index('export function scanMajorBandsStaticRankRowsText')
id_anchor = "  const idIndex = Number.isInteger(options.idIndex) ? options.idIndex : -1;\n"
pos = s.index(id_anchor, scanner) + len(id_anchor)
if 'const predecodeRegion = String(options.predecodeRegion' not in s[scanner:scanner+2500]:
    extra = """  const lnAreaIndex = Number.isInteger(options.lnAreaIndex) ? options.lnAreaIndex : -1;\n  const provinceIndex = Number.isInteger(options.provinceIndex) ? options.provinceIndex : -1;\n  const cityIndex = Number.isInteger(options.cityIndex) ? options.cityIndex : -1;\n  const predecodeRegion = String(options.predecodeRegion || 'all').trim() || 'all';\n  const regionScalarIndexes = [lnAreaIndex, provinceIndex, cityIndex].filter(index => index >= 0);\n  const regionPredecodeEnabled = predecodeRegion !== 'all' && regionScalarIndexes.length > 0;\n"""
    s = s[:pos] + extra + s[pos:]
count_anchor = "  let rankMatchedCount = 0;\n"
pos = s.index(count_anchor, scanner) + len(count_anchor)
if 'let regionMatchedCount = 0;' not in s[scanner:scanner+4000]:
    s = s[:pos] + "  let regionMatchedCount = 0;\n  let regionScalarPrefilterCount = 0;\n" + s[pos:]
start = s.index('    const rowText = source.slice(start, cursor);', scanner)
end = s.index('\n  if (!ended)', start)
replacement = """    const rowText = source.slice(start, cursor);\n    rowCount += 1;\n    const scalarIndexes = [];\n    if (rankRange && rankIndex >= 0) scalarIndexes.push(rankIndex);\n    if (regionPredecodeEnabled) scalarIndexes.push(...regionScalarIndexes);\n    if (allowedIds && idIndex >= 0) scalarIndexes.push(idIndex);\n    const scalarValues = scalarIndexes.length\n      ? readTopLevelArrayScalars(rowText, scalarIndexes)\n      : new Map();\n\n    const rankMatch = rankRange && rankIndex >= 0\n      ? majorBandsRankValueMatchesRange(scalarValues.get(rankIndex), rankRange)\n      : true;\n    if (!rankMatch) continue;\n    rankMatchedCount += 1;\n\n    if (regionPredecodeEnabled) {\n      regionScalarPrefilterCount += 1;\n      const regionMatch = matchRegionRule({\n        lnArea: scalarValues.get(lnAreaIndex),\n        province: scalarValues.get(provinceIndex),\n        city: scalarValues.get(cityIndex)\n      }, predecodeRegion);\n      if (!regionMatch) continue;\n    }\n    regionMatchedCount += 1;\n\n    if (allowedIds && idIndex >= 0) {\n      pageIdScalarPrefilterCount += 1;\n      if (!allowedIds.has(String(scalarValues.get(idIndex) || ''))) continue;\n    }\n\n    const row = JSON.parse(rowText);\n    fullRowParseCount += 1;\n    if (!Array.isArray(row)) throw new Error('静态专业位次桶 row 解析后不是数组');\n    rows.push(row);\n"""
s = s[:start] + replacement + s[end:]
ret_anchor = "    rankMatchedCount,\n    fullRowParseCount,"
if ret_anchor not in s: raise SystemExit('missing scanner return counter anchor')
s = s.replace(ret_anchor, "    rankMatchedCount,\n    regionMatchedCount,\n    regionScalarPrefilterCount,\n    predecodeRegion,\n    predecodeRegionFilterVersion: MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION,\n    fullRowParseCount,", 1)
load = s.index('export async function loadMajorBandsStaticRankBucket')
id_load_anchor = "  const idIndex = schema.indexOf('id');\n"
pos = s.index(id_load_anchor, load) + len(id_load_anchor)
if 'const lnAreaIndex = schema.indexOf' not in s[load:load+2000]:
    s = s[:pos] + "  const lnAreaIndex = schema.indexOf('lnArea');\n  const provinceIndex = schema.indexOf('province');\n  const cityIndex = schema.indexOf('city');\n  const predecodeRegion = String(options.predecodeRegion || 'all').trim() || 'all';\n" + s[pos:]
scan_call = """    rankIndex,\n    idIndex,\n    rankRange,\n    allowedIds\n"""
scan_call_new = """    rankIndex,\n    idIndex,\n    lnAreaIndex,\n    provinceIndex,\n    cityIndex,\n    predecodeRegion,\n    rankRange,\n    allowedIds\n"""
if scan_call not in s[load:]: raise SystemExit('missing scanner call anchor')
s = s[:load] + s[load:].replace(scan_call, scan_call_new, 1)
stats_old = """    rowCount: scan.rowCount,\n    decodedRowCount: selectedRows.length,\n    rankRowsSkipped: scan.rowCount - selectedRows.length,\n    pageIdRowsSkipped: scan.rankMatchedCount - selectedRows.length,\n    pageIdFilterCount: allowedIds?.size || 0,\n"""
stats_new = """    rowCount: scan.rowCount,\n    decodedRowCount: selectedRows.length,\n    rankRowsSkipped: scan.rowCount - selectedRows.length,\n    rankOnlyRowsSkipped: scan.rowCount - scan.rankMatchedCount,\n    regionRowsSkipped: scan.rankMatchedCount - scan.regionMatchedCount,\n    predecodeRegion,\n    predecodeRegionFilterVersion: MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION,\n    pageIdRowsSkipped: scan.regionMatchedCount - selectedRows.length,\n    pageIdFilterCount: allowedIds?.size || 0,\n"""
if stats_old not in s: raise SystemExit('missing native provider stats anchor')
s = s.replace(stats_old, stats_new, 1)
p.write_text(s)

# Retain PR #137 predecode propagation in the loader (loader itself is not copied from #135).
# PR #135 score-hint/API implementation: pass region into both cold order scan and cached page refetch.
p = Path('functions/api/major-bands.js')
s = p.read_text()
old = """        projection: minimalOrderProjection ? MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION : undefined,\n        rawRowStorage: minimalOrderProjection ? 'serialized-json' : undefined\n"""
new = """        projection: minimalOrderProjection ? MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION : undefined,\n        rawRowStorage: minimalOrderProjection ? 'serialized-json' : undefined,\n        predecodeRegion: filters.region\n"""
if old not in s: raise SystemExit('missing requested cold load anchor')
s = s.replace(old, new, 1)
old = "const pageLoaded = await loadMajorBandsRankWindow(context, selectedBuckets, { allowedIds: new Set(pageIds) });"
new = "const pageLoaded = await loadMajorBandsRankWindow(context, selectedBuckets, { allowedIds: new Set(pageIds), predecodeRegion: filters.region });"
if old not in s: raise SystemExit('missing page refetch anchor')
s = s.replace(old, new, 1)
# Surface canonical region predecode evidence in the requested-band response.
old = """        rankDecodedRowCount: loadedStats.decodedRowCount,\n        rankRowsSkipped: loadedStats.rankRowsSkipped,\n        pageIdRowsSkipped: loadedStats.pageIdRowsSkipped || 0,\n"""
new = """        rankDecodedRowCount: loadedStats.decodedRowCount,\n        rankRowsSkipped: loadedStats.rankRowsSkipped,\n        rankOnlyRowsSkipped: loadedStats.rankOnlyRowsSkipped || 0,\n        regionRowsSkipped: loadedStats.regionRowsSkipped || 0,\n        predecodeRegion: loadedStats.predecodeRegion || filters.region || 'all',\n        predecodeRegionFilterVersion: loadedStats.predecodeRegionFilterVersion || 'major-bands-predecode-region-filter-v3990_1',\n        pageIdRowsSkipped: loadedStats.pageIdRowsSkipped || 0,\n"""
if old not in s: raise SystemExit('missing requested source telemetry anchor')
s = s.replace(old, new, 1)
p.write_text(s)

# Native verifier remains from #135; make the region verifier a permanent part of the rank audit.
p = Path('tools/audit-major-bands-rank-kernel-v3990_1.mjs')
s = p.read_text()
anchor = "import './verify-major-bands-rank-native-scan-v3990_1.mjs';\n"
if anchor not in s: raise SystemExit('native verifier import missing')
if "verify-major-bands-predecode-region-v3990_1.mjs" not in s:
    s = s.replace(anchor, anchor + "import './verify-major-bands-predecode-region-v3990_1.mjs';\n", 1)
p.write_text(s)

# Strengthen the existing PR #137 region verifier for the native scalar scan ordering.
p = Path('tools/verify-major-bands-predecode-region-v3990_1.mjs')
s = p.read_text()
marker = "console.log(JSON.stringify({ok:true,version:MAJOR_BANDS_PREDECODE_REGION_FILTER_VERSION,total,west,regions:regions.length},null,2));"
if marker not in s: raise SystemExit('region verifier marker missing')
extra = """const provider=fs.readFileSync('functions/_lib/major-bands-static-provider.js','utf8');\nconst scanStart=provider.indexOf('export function scanMajorBandsStaticRankRowsText');\nconst rankStage=provider.indexOf('majorBandsRankValueMatchesRange(scalarValues.get(rankIndex), rankRange)',scanStart);\nconst regionStage=provider.indexOf('const regionMatch = matchRegionRule',scanStart);\nconst idStage=provider.indexOf("allowedIds.has(String(scalarValues.get(idIndex) || ''))",scanStart);\nconst parseStage=provider.indexOf('const row = JSON.parse(rowText);',scanStart);\nassert.ok(scanStart>=0&&rankStage>scanStart&&regionStage>rankStage&&idStage>regionStage&&parseStage>idStage,'native predecode order must be rank -> region -> page-id -> full parse');\nassert.ok(provider.includes("MAJOR_BANDS_RANK_ROW_NATIVE_SCAN_VERSION = 'major-bands-rank-row-native-scan-v3990_1'"));\n"""
s = s.replace(marker, extra + marker, 1)
p.write_text(s)
