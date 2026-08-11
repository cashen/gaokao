from pathlib import Path

p=Path('functions/api/major-bands.js')
s=p.read_text()
anchor="function requestedBandOrderEdgeCacheRequest(request) {\n"
helper="""const MAJOR_BANDS_NON_BUSINESS_CACHE_PARAMS = Object.freeze([\n  'stress',\n  'deploy',\n  'candidate',\n  'production-resource-check'\n]);\n\nfunction stripMajorBandsNonBusinessCacheParams(url) {\n  for (const key of MAJOR_BANDS_NON_BUSINESS_CACHE_PARAMS) url.searchParams.delete(key);\n  return url;\n}\n\n"""
if helper.strip() not in s:
    if anchor not in s: raise SystemExit('order cache anchor missing')
    s=s.replace(anchor,helper+anchor,1)
old="""  url.searchParams.delete('stress');\n  url.searchParams.delete('deploy');\n"""
count=s.count(old)
if count != 3:
    raise SystemExit(f'expected 3 nonbusiness cache pairs, got {count}')
s=s.replace(old,"  stripMajorBandsNonBusinessCacheParams(url);\n",3)
p.write_text(s)

p=Path('tools/audit-production-resource-verification-v3990_1.mjs')
s=p.read_text()
needle="  'predecodeRegion: filters.region'\n], 'major-bands API');"
repl="""  'predecodeRegion: filters.region',\n  'MAJOR_BANDS_NON_BUSINESS_CACHE_PARAMS',\n  \"'production-resource-check'\",\n  'stripMajorBandsNonBusinessCacheParams(url)'\n], 'major-bands API');"""
if needle not in s: raise SystemExit('production audit cache anchor missing')
s=s.replace(needle,repl,1)
p.write_text(s)

p=Path('tools/audit-major-bands-query-execution-cache-v3990_0.mjs')
s=p.read_text()
# Retire literal per-builder stress/deploy assertions; the centralized helper is now the contract.
s=s.replace("  \"url.searchParams.delete('stress')\",\n",'',1)
s=s.replace("  \"url.searchParams.delete('deploy')\",\n",'',1)
needle="  'predecodeRegion: filters.region',\n  \"url.searchParams.delete('offset')\","
repl="""  'predecodeRegion: filters.region',\n  'MAJOR_BANDS_NON_BUSINESS_CACHE_PARAMS',\n  \"'stress'\",\n  \"'deploy'\",\n  \"'candidate'\",\n  \"'production-resource-check'\",\n  'stripMajorBandsNonBusinessCacheParams(url)',\n  \"url.searchParams.delete('offset')\","""
if needle not in s: raise SystemExit('query cache audit canonicalizer anchor missing')
s=s.replace(needle,repl,1)
p.write_text(s)
