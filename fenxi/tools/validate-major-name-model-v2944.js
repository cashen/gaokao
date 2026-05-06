#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function load(rel){ return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); }
function assert(ok, msg){ if(!ok){ throw new Error(msg); } }
const manifest = load('data/major_name_model/v2944_manifest.json');
const admission = load('data/major_name_model/admission_major_raw_v2944.json');
const catalog = load('data/major_name_model/undergraduate_catalog_major_v2944.json');
const maps = load('data/major_name_model/admission_to_catalog_map_v2944.json');
const grad = load('data/major_name_model/graduate_subject_reference_v2944.json');
const entry = load('data/major_name_model/admission_entry_major_index_v2944.json');
const quality = load('data/major_name_model/quality_report_v2944.json');
const baseManifest = load('data/manifest.json');
assert(manifest.version === 'V2.9.4.4', 'manifest version should be V2.9.4.4');
assert(entry.count === baseManifest.totalRecords, `entry count ${entry.count} != base manifest ${baseManifest.totalRecords}`);
assert(admission.count === 3003, `admission raw count expected 3003 got ${admission.count}`);
assert(catalog.count === 850, `catalog count expected 850 got ${catalog.count}`);
assert(maps.count > admission.count, 'map rows should be greater than admission name rows because components expand');
assert(grad.count > 0, 'graduate reference should not be empty');
assert(quality.overall_passed === true, 'quality report overall_passed should be true');
const catalogCodes = new Set(catalog.items.map(x=>x.catalog_major_code));
for(const m of maps.items){
  if(m.catalog_major_code) assert(catalogCodes.has(m.catalog_major_code), `map code missing in catalog: ${m.catalog_major_code}`);
}
const admissionKeys = new Set(admission.items.map(x=>x.admission_major_key));
for(const e of entry.items){
  assert(admissionKeys.has(e.admission_major_key), `entry admission key missing: ${e.admission_major_key}`);
}
console.log(JSON.stringify({
  ok: true,
  version: manifest.version,
  entryCount: entry.count,
  admissionMajorNames: admission.count,
  catalogMajors: catalog.count,
  mapRows: maps.count,
  graduateReferenceRows: grad.count,
  checks: quality.checks.length
}, null, 2));
