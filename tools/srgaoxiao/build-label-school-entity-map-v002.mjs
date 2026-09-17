#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { findSchoolEntityByName } from '../../shared/resources/schools/school-identity-center.js';

const input = process.argv[2];
const output = process.argv[3] || 'tmp/srgaoxiao-label-school-entity-map-v002.json';
if (!input) throw new Error('Usage: node build-label-school-entity-map-v002.mjs <harvest.json> [output.json]');

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const round = value => Math.round(value * 10000) / 10000;

const data = JSON.parse(await fs.readFile(input, 'utf8'));
const labels = Array.isArray(data.labels) ? data.labels : [];

const rows = [];
const unresolvedByName = new Map();
const entityIds = new Set();
let relationCount = 0;
let resolvedCount = 0;
let unresolvedCount = 0;

for (const labelRow of labels) {
  const matches = Array.isArray(labelRow.schoolMatches) ? labelRow.schoolMatches : [];
  const mapped = [];
  for (const sourceRow of matches) {
    relationCount += 1;
    const sourceId = clean(sourceRow.sourceId);
    const sourceName = clean(sourceRow.name);
    const entity = findSchoolEntityByName(sourceName);
    if (entity) {
      resolvedCount += 1;
      entityIds.add(entity.entityId);
      mapped.push({
        sourceId,
        sourceName,
        sourceHref: clean(sourceRow.href),
        entityId: entity.entityId,
        entityDisplayName: entity.displayName,
        entityType: entity.entityType,
        parentEntityId: entity.parentEntityId || null,
        matchType: 'exact-name-or-canonical-alias'
      });
    } else {
      unresolvedCount += 1;
      const key = `${sourceId}||${sourceName}`;
      unresolvedByName.set(key, { sourceId, sourceName });
      mapped.push({
        sourceId,
        sourceName,
        sourceHref: clean(sourceRow.href),
        entityId: null,
        entityDisplayName: null,
        entityType: null,
        parentEntityId: null,
        matchType: 'unresolved'
      });
    }
  }
  rows.push({
    label: clean(labelRow.label),
    sourceSchoolCount: matches.length,
    mappedSchoolCount: mapped.filter(row => row.entityId).length,
    unresolvedSchoolCount: mapped.filter(row => !row.entityId).length,
    schoolMatches: mapped
  });
}

const summary = {
  labels: labels.length,
  relations: relationCount,
  resolvedRelations: resolvedCount,
  unresolvedRelations: unresolvedCount,
  resolutionRate: relationCount ? round(resolvedCount / relationCount) : 0,
  uniqueCanonicalEntities: entityIds.size,
  unresolvedUniqueSchools: unresolvedByName.size
};

if (!(summary.labels > 0 && summary.relations > 0)) {
  throw new Error(`No source relations available for mapping: ${JSON.stringify(summary)}`);
}

await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
await fs.writeFile(output, JSON.stringify({
  schemaVersion: 'srgaoxiao-label-school-entity-map-v002',
  generatedAt: new Date().toISOString(),
  source: data.source || null,
  sourceSchemaVersion: data.schemaVersion || null,
  summary,
  policy: {
    mappingRule: 'exact source school name against shared school identity center only',
    fuzzyMatching: false,
    inferredRelations: false,
    unresolvedIsFailClosed: true,
    productionRuntimeTouched: false
  },
  labels: rows.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
  unresolvedSchools: [...unresolvedByName.values()].sort((a, b) => a.sourceName.localeCompare(b.sourceName, 'zh-CN'))
}, null, 2));

console.log(JSON.stringify(summary, null, 2));
