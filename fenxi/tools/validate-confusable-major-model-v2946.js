#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return JSON.parse(fs.readFileSync(path.join(root,p),'utf8')); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:', msg); process.exitCode=1; } }
const base='data/confusable_major_model/';
const manifest=read(base+'v2946_manifest.json');
const groups=read(base+'confusable_major_groups_v2946.json');
const members=read(base+'confusable_major_members_v2946.json');
const pairs=read(base+'confusable_major_detected_pairs_v2946.json');
const school=read(base+'confusable_major_school_index_v2946.json');
const record=read(base+'confusable_major_record_index_v2946.json');
const report=read(base+'confusable_major_quality_report_v2946.json');
assert(manifest.version==='V2.9.4.6','manifest version should be V2.9.4.6');
assert(groups.items && groups.items.length>=10,'at least 10 rule groups');
assert(members.items && members.items.length>0,'members should not be empty');
assert(pairs.items && pairs.items.length>0,'detected pairs should not be empty');
assert(school.items && school.items.length>0,'school index should not be empty');
assert(record.items && record.items.length>0,'record index should not be empty');
const gids=new Set(groups.items.map(x=>x.group_id));
for(const p of pairs.items){
  assert(p.pair_id && p.school && p.group_id, 'pair missing id/school/group');
  assert(gids.has(p.group_id), 'pair references missing group '+p.group_id);
  assert(Array.isArray(p.items) && p.items.length>=2, 'pair must have at least two items '+p.pair_id);
  assert(p.basis && p.basis.length, 'pair missing basis '+p.pair_id);
  for(const it of p.items){
    assert(it.record_id && it.admission_major_name_raw, 'pair item missing record/major '+p.pair_id);
  }
}
const yk = pairs.items.find(p=>p.school==='营口理工学院' && p.group_id==='CONF_BIGDATA' && p.items.some(x=>x.admission_major_name_raw==='数据科学与大数据技术') && p.items.some(x=>x.admission_major_name_raw==='大数据管理与应用'));
assert(!!yk,'must include 营口理工学院 two big-data majors example');
assert(yk && yk.risk_level==='high','营口理工 big-data pair should be high risk');
assert(report.output_counts.detected_pairs===pairs.items.length,'report detected_pairs count mismatch');
if(process.exitCode){ process.exit(process.exitCode); }
console.log('V2.9.4.6 confusable-major model validation passed.');
console.log(`groups=${groups.items.length}, members=${members.items.length}, pairs=${pairs.items.length}, recordIndex=${record.items.length}, schools=${school.items.length}`);
