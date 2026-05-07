const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'data', 'confusable_major_model');
function readJson(name){ return JSON.parse(fs.readFileSync(path.join(base, name), 'utf8')); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1); } }
const rules = readJson('confusable_anchor_rules_v29462.json');
const pairs = readJson('confusable_major_detected_pairs_v29462.json');
const idx = readJson('confusable_major_record_index_v29462.json');
const report = readJson('confusable_warning_side_quality_report_v29462.json');
assert(rules.version === 'V2.9.4.6.2', 'anchor rules version');
assert(pairs.version === 'V2.9.4.6.2', 'detected pairs version');
assert(idx.version === 'V2.9.4.6.2', 'record index version');
assert(Array.isArray(rules.items) && rules.items.length >= 10, 'anchor rules count');
assert(Array.isArray(pairs.items) && pairs.items.length > 2000, 'pair count');
assert(Array.isArray(idx.items) && idx.items.length > 1000, 'filtered record index count');
const idxMap = new Map(idx.items.map(x => [x.record_id, x]));
let anchorIndexed = 0;
let warningMissing = 0;
for(const p of pairs.items){
  for(const it of (p.items||[])){
    const row = idxMap.get(it.record_id);
    const hasThisPair = !!(row && (row.pairs||[]).some(x => x.pair_id === p.pair_id));
    if(it.show_warning_v29462 && !hasThisPair) warningMissing++;
    if(it.role_v29462 === 'anchor' && hasThisPair) anchorIndexed++;
  }
}
assert(anchorIndexed === 0, 'anchor records should not enter warning index for the same pair: '+anchorIndexed);
assert(warningMissing === 0, 'warning side records should enter warning index for the same pair: '+warningMissing);
function findPair(school, majors){
  return pairs.items.find(p => p.school === school && majors.every(m => (p.items||[]).some(it => String(it.admission_major_name_raw||'').includes(m))));
}
const yk = findPair('营口理工学院', ['大数据管理与应用', '数据科学与大数据技术']);
assert(yk, '营口理工学院两个大数据 pair found');
const dm = yk.items.find(it => it.admission_major_name_raw.includes('大数据管理与应用'));
const ds = yk.items.find(it => it.admission_major_name_raw.includes('数据科学与大数据技术'));
assert(dm && dm.show_warning_v29462 === true && idxMap.has(dm.record_id), '大数据管理与应用 should warn');
assert(ds && ds.role_v29462 === 'anchor' && !idxMap.has(ds.record_id), '数据科学与大数据技术 should be protected anchor');
console.log('OK V2.9.4.6.2 warning-side validation passed');
console.log(JSON.stringify({rules: rules.items.length, pairs: pairs.count, recordIndex: idx.count, protectedAnchorPairs: report.summary.pairs_with_anchor_protected}, null, 2));
