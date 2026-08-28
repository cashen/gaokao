#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = assets.assetVersion.replace(/^v/, '');
const failures = [];
function fail(name, ok, detail=''){ if(!ok) failures.push(`${name}${detail?': '+detail:''}`); }
const indexPath = path.join(lr, 'data/local-mainline/local-mainline-index.generated.json');
fail('local mainline index exists', fs.existsSync(indexPath));
const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
fail('index version follows active', data.meta?.version === assets.version, data.meta?.version);
fail('index has schools', Array.isArray(data.schools) && data.schools.length >= 20, String(data.schools?.length));
fail('index has all schools', Array.isArray(data.allSchools) && data.allSchools.length >= 50, String(data.allSchools?.length));
fail('index has major summaries', Array.isArray(data.majors) && data.majors.length >= 40, String(data.majors?.length));
for (const school of data.schools || []) {
  fail(`${school.school} has overview`, Boolean(school.overview));
  for (const line of school.mainlines || []) {
    fail(`${school.school}/${line.direction} has human label`, ['本校方向','本校相关','方向提醒'].includes(line.displayLabel), line.displayLabel);
    fail(`${school.school}/${line.direction} has majors`, Array.isArray(line.majors) && line.majors.length > 0);
    fail(`${school.school}/${line.direction} has review points`, Array.isArray(line.reviewPoints) && line.reviewPoints.length > 0);
    fail(`${school.school}/${line.direction} has boundary-safe note`, !/推荐|优势明显|强校|稳进|保底|捡漏|必录|能上|就业保证|一级命中|二级命中|强链/.test(line.humanNote || ''), line.humanNote || '');
    if (line.level === 'primary') {
      const evidenceCount = (line.doctoralEvidence?.length || 0) + (line.disciplineEvaluation?.length || 0) + (line.evidence?.length || 0);
      fail(`${school.school}/${line.direction} primary has evidence`, evidenceCount > 0, 'primary needs evidence');
    }
  }
}
const out = { version: assets.version, assetVersion: assets.assetVersion, status: failures.length ? 'fail' : 'pass', failures };
fs.writeFileSync(path.join(lr, `local-mainline-contract-audit.${q}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (failures.length) process.exit(1);
