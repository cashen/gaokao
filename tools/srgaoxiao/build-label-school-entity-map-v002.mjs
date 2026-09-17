#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveSchoolProfile } from '../../shared/resources/schools/school-profile-center.js';
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
const profileKeys = new Set();
const entityIds = new Set();
let relationCount = 0;
let resolvedProfileCount = 0;
let unresolvedCount = 0;
let entityEnhancedCount = 0;

for (const labelRow of labels) {
  const matches = Array.isArray(labelRow.schoolMatches) ? labelRow.schoolMatches : [];
  const mapped = [];
  for (const sourceRow of matches) {
    relationCount += 1;
    const sourceId = clean(sourceRow.sourceId);
    const sourceName = clean(sourceRow.name);
    const profile = resolveSchoolProfile(sourceName);
    const entity = findSchoolEntityByName(sourceName);
    if (profile) {
      resolvedProfileCount += 1;
      const profileKey = clean(profile.standardSchoolName || profile.school);
      if (profileKey) profileKeys.add(profileKey);
      if (entity?.entityId) {
        entityEnhancedCount += 1;
        entityIds.add(entity.entityId);
      }
      mapped.push({
        sourceId,
        sourceName,
        sourceHref: clean(sourceRow.href),
        profileKey,
        profileDisplayName: clean(profile.school),
        profileProvince: clean(profile.province),
        profileCity: clean(profile.city),
        profileConfidence: clean(profile.confidence || 'high'),
        entityId: entity?.entityId || null,
        entityDisplayName: entity?.displayName || null,
        entityType: entity?.entityType || null,
        parentEntityId: entity?.parentEntityId || null,
        matchType: entity?.entityId ? 'shared-profile-plus-entity' : 'shared-profile'
      });
    } else {
      unresolvedCount += 1;
      const key = `${sourceId}||${sourceName}`;
      unresolvedByName.set(key, { sourceId, sourceName });
      mapped.push({
        sourceId,
        sourceName,
        sourceHref: clean(sourceRow.href),
        profileKey: null,
        profileDisplayName: null,
        profileProvince: null,
        profileCity: null,
        profileConfidence: null,
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
    mappedSchoolCount: mapped.filter(row => row.profileKey).length,
    unresolvedSchoolCount: mapped.filter(row => !row.profileKey).length,
    schoolMatches: mapped
  });
}

const summary = {
  labels: labels.length,
  relations: relationCount,
  resolvedProfileRelations: resolvedProfileCount,
  unresolvedRelations: unresolvedCount,
  profileResolutionRate: relationCount ? round(resolvedProfileCount / relationCount) : 0,
  entityEnhancedRelations: entityEnhancedCount,
  uniqueSharedProfiles: profileKeys.size,
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
    mappingRule: 'resolve source school name through shared school profile center; optionally enhance with canonical school entity',
    fuzzyMatching: false,
    inferredRelations: false,
    unresolvedIsFailClosed: true,
    productionRuntimeTouched: false
  },
  labels: rows.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN')),
  unresolvedSchools: [...unresolvedByName.values()].sort((a, b) => a.sourceName.localeCompare(b.sourceName, 'zh-CN'))
}, null, 2));

console.log(JSON.stringify(summary, null, 2));
