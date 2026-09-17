#!/usr/bin/env node
import fs from 'node:fs/promises';
import process from 'node:process';

const target = process.argv[2] || 'tmp/srgaoxiao-label-harvest-v001.json';
const payload = JSON.parse(await fs.readFile(target, 'utf8'));
const fail = message => { throw new Error(message); };
if (payload.schemaVersion !== 'srgaoxiao-label-harvest-v001') fail('schemaVersion mismatch');
if (!payload.source?.schoolsUrl || !payload.source?.specialtiesUrl) fail('source URLs missing');
if (!Array.isArray(payload.labels)) fail('labels must be an array');
if (!payload.surfaces?.schools || !payload.surfaces?.specialties) fail('surface snapshots missing');
const labelNames = new Set();
for (const label of payload.labels) {
  if (!label?.label || labelNames.has(label.label)) fail(`duplicate/empty label: ${label?.label}`);
  labelNames.add(label.label);
  if (!Array.isArray(label.schoolMatches) || !Array.isArray(label.majorMatches)) fail(`match arrays missing: ${label.label}`);
  for (const row of [...label.schoolMatches, ...label.majorMatches]) {
    if (!row?.name && !row?.sourceId) fail(`invalid relation in ${label.label}`);
  }
}
const totalSchools = payload.labels.reduce((n, x) => n + x.schoolMatches.length, 0);
const totalMajors = payload.labels.reduce((n, x) => n + x.majorMatches.length, 0);
if (payload.summary?.totalSchoolLabelRelations !== totalSchools) fail('school relation summary mismatch');
if (payload.summary?.totalMajorLabelRelations !== totalMajors) fail('major relation summary mismatch');
if (payload.summary?.schoolLabelsWithRelations > payload.summary?.discoveredSchoolLabels) fail('school label count overflow');
if (payload.summary?.majorLabelsWithRelations > payload.summary?.discoveredMajorLabels) fail('major label count overflow');
console.log(JSON.stringify({ ok:true, labels:payload.labels.length, schoolRelations:totalSchools, majorRelations:totalMajors }));
