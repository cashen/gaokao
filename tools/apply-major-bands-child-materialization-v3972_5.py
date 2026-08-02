from pathlib import Path

path = Path('functions/_lib/major-bands-bucket-engine.js')
text = path.read_text(encoding='utf-8')

before_import = "import { lookupScoreRank } from './rank-table-provider.js';\n"
after_import = (
    "import { lookupScoreRank } from './rank-table-provider.js';\n"
    "import { materializeMajorBandsStaticRecord } from './major-bands-static-provider.js';\n"
    "import { buildDisplayTags } from './school-display-tags.js';\n"
)
if before_import not in text:
    raise RuntimeError('missing import anchor')
text = text.replace(before_import, after_import, 1)

before_item = """  const item = {
    ...record,
    band: canonicalPosition.bandKey,
"""
after_item = """  // The child Worker owns expensive record materialization. It resolves
  // historical evidence, geography and the canonical school profile once
  // before the compact transfer boundary. The parent consumes the marker and
  // compact schoolProfile instead of repeating those lookups.
  const materialized = materializeMajorBandsStaticRecord(record);
  const displayTags = buildDisplayTags(materialized);
  const item = {
    ...materialized,
    ...displayTags,
    band: canonicalPosition.bandKey,
"""
if before_item not in text:
    raise RuntimeError('missing candidate anchor')
text = text.replace(before_item, after_item, 1)

path.write_text(text, encoding='utf-8')
