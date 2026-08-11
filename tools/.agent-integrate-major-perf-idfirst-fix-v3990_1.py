from pathlib import Path
p=Path('functions/_lib/major-bands-static-provider.js')
s=p.read_text()
start=s.index('    const scalarIndexes = [];',s.index('export function scanMajorBandsStaticRankRowsText'))
end=s.index("    rows.push(row);",start)+len("    rows.push(row);\n")
new="""    const scalarIndexes = [];\n    if (allowedIds && idIndex >= 0) scalarIndexes.push(idIndex);\n    if (rankRange && rankIndex >= 0) scalarIndexes.push(rankIndex);\n    if (regionPredecodeEnabled) scalarIndexes.push(...regionScalarIndexes);\n    const scalarValues = scalarIndexes.length\n      ? readTopLevelArrayScalars(rowText, scalarIndexes)\n      : new Map();\n\n    // Cached-page refetch is ID-first: rows outside the current page stop here\n    // before rank/region checks or full JSON.parse. Cold queries have no ID set\n    // and therefore start with rank -> region before full parse.\n    if (allowedIds && idIndex >= 0) {\n      pageIdScalarPrefilterCount += 1;\n      if (!allowedIds.has(String(scalarValues.get(idIndex) || ''))) continue;\n    }\n\n    const rankMatch = rankRange && rankIndex >= 0\n      ? majorBandsRankValueMatchesRange(scalarValues.get(rankIndex), rankRange)\n      : true;\n    if (!rankMatch) continue;\n    rankMatchedCount += 1;\n\n    if (regionPredecodeEnabled) {\n      regionScalarPrefilterCount += 1;\n      const regionMatch = matchRegionRule({\n        lnArea: scalarValues.get(lnAreaIndex),\n        province: scalarValues.get(provinceIndex),\n        city: scalarValues.get(cityIndex)\n      }, predecodeRegion);\n      if (!regionMatch) continue;\n    }\n    regionMatchedCount += 1;\n\n    const row = JSON.parse(rowText);\n    fullRowParseCount += 1;\n    if (!Array.isArray(row)) throw new Error('静态专业位次桶 row 解析后不是数组');\n    rows.push(row);\n"""
s=s[:start]+new+s[end:]
p.write_text(s)

# Update source-order assertion to reflect the dual-mode contract.
p=Path('tools/verify-major-bands-predecode-region-v3990_1.mjs')
s=p.read_text()
old="""const rankStage=provider.indexOf('majorBandsRankValueMatchesRange(scalarValues.get(rankIndex), rankRange)',scanStart);\nconst regionStage=provider.indexOf('const regionMatch = matchRegionRule',scanStart);\nconst idStage=provider.indexOf(\"allowedIds.has(String(scalarValues.get(idIndex) || ''))\",scanStart);\nconst parseStage=provider.indexOf('const row = JSON.parse(rowText);',scanStart);\nassert.ok(scanStart>=0&&rankStage>scanStart&&regionStage>rankStage&&idStage>regionStage&&parseStage>idStage,'native predecode order must be rank -> region -> page-id -> full parse');\n"""
new="""const idStage=provider.indexOf(\"allowedIds.has(String(scalarValues.get(idIndex) || ''))\",scanStart);\nconst rankStage=provider.indexOf('majorBandsRankValueMatchesRange(scalarValues.get(rankIndex), rankRange)',scanStart);\nconst regionStage=provider.indexOf('const regionMatch = matchRegionRule',scanStart);\nconst parseStage=provider.indexOf('const row = JSON.parse(rowText);',scanStart);\nassert.ok(scanStart>=0&&idStage>scanStart&&rankStage>idStage&&regionStage>rankStage&&parseStage>regionStage,'native page scan must be ID -> rank -> region -> full parse; cold scan skips ID stage');\n"""
if old not in s: raise SystemExit('region verifier order anchor missing')
p.write_text(s.replace(old,new,1))

# PR #135's source audit pinned the old full-row rank expression. The native\n# scanner now reads rank from a scalar before JSON.parse, which is the intended\n# stronger memory contract; keep that exact scalar expression under audit.
p=Path('tools/audit-major-bands-rank-kernel-v3990_1.mjs')
s=p.read_text()
old="  'majorBandsRankValueMatchesRange(row?.[rankIndex], rankRange)',"
new="  'majorBandsRankValueMatchesRange(scalarValues.get(rankIndex), rankRange)',"
if old not in s: raise SystemExit('native audit scalar anchor missing')
p.write_text(s.replace(old,new,1))
