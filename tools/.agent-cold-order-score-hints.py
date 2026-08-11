from pathlib import Path

def rep(path, old, new, label):
    p=Path(path); s=p.read_text()
    if old not in s: raise SystemExit('missing '+label)
    p.write_text(s.replace(old,new,1))

p='functions/api/major-bands.js'
old="""        orderRawRowCount: loaded.stats.rawRowCount,
        orderDecodedRowCount: loaded.stats.decodedRowCount,
        orderedIds: ordered.map(record => record.id),
        snapshot: majorBandsSnapshotId(ordered, identity)
"""
new="""        orderRawRowCount: loaded.stats.rawRowCount,
        orderDecodedRowCount: loaded.stats.decodedRowCount,
        orderedIds: ordered.map(record => record.id),
        orderedScores: orderedPageScores(ordered),
        pageScoreHintVersion: MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION,
        snapshot: majorBandsSnapshotId(ordered, identity)
"""
rep(p,old,new,'cold ordered snapshot score hints')

p='tools/verify-major-bands-preview-concurrency-v3990_1.mjs'
s=Path(p).read_text()
anchor="const sharedScenarios = Object.freeze(["
insert="""const apiSourceForScoreHintContract = fs.readFileSync('functions/api/major-bands.js', 'utf8');
assert.equal((apiSourceForScoreHintContract.match(/orderedScores: orderedPageScores\\(ordered\\)/g) || []).length, 2, 'cold and shared ordered snapshots must both persist aligned scores');
assert.ok((apiSourceForScoreHintContract.match(/pageScoreHintVersion: MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION/g) || []).length >= 2, 'cold and shared ordered snapshots must both carry score-hint version');

"""+anchor
if anchor not in s: raise SystemExit('missing preview verifier anchor')
Path(p).write_text(s.replace(anchor,insert,1))
