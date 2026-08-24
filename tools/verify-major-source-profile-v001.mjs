import assert from 'node:assert/strict';
import { MAJOR_SOURCE_PROFILE_META, getMajorSourceProfile, majorSourceInterpretation, MAJOR_SOURCE_PROFILE_LIST } from '../ln-rank/kb/major-understanding/major-source-profile.generated.js';
import { majorUnderstandingCard } from '../ln-rank/js/knowledge/major-understanding-resolver.js';

assert.equal(MAJOR_SOURCE_PROFILE_META.canonicalCount, 883);
assert.equal(MAJOR_SOURCE_PROFILE_META.verifiedCount, 818);
assert.equal(MAJOR_SOURCE_PROFILE_META.missingCount, 65);
assert.equal(MAJOR_SOURCE_PROFILE_LIST.length, 818);

const energy = getMajorSourceProfile('080501');
assert.ok(energy);
assert.equal(energy.name, '能源与动力工程');
assert.equal(energy.sourceStatus, 'verified');
for (const field of ['whatIs', 'whatLearn', 'whatDo']) assert.ok(energy[field], field);
assert.match(energy.sourceUrl, /^https:\/\/eo\.srgaoxiao\.cn\/specialty\//);
assert.equal(majorSourceInterpretation('080501').available, true);

const smartManufacturing = getMajorSourceProfile('080213T');
assert.ok(smartManufacturing);
assert.equal(smartManufacturing.name, '智能制造工程');
assert.equal(smartManufacturing.sourceStatus, 'verified');
for (const field of ['whatIs', 'whatLearn', 'whatDo']) assert.ok(smartManufacturing[field], field);
assert.equal(majorSourceInterpretation('080213T').available, true);

const measurement = getMajorSourceProfile('080301');
assert.ok(measurement);
assert.equal(measurement.name, '测控技术与仪器');
assert.equal(measurement.sourceStatus, 'verified');
for (const field of ['whatIs', 'whatLearn', 'whatDo', 'careerPath']) assert.ok(measurement[field], field);
assert.equal(majorSourceInterpretation('080301').available, true);

const card = majorUnderstandingCard({ standardMajor: { code: '080501', name: '能源与动力工程' } });
assert.equal(card.source.available, true);
assert.equal(card.source.fields.whatIs, energy.whatIs);
assert.equal(card.source.fields.whatLearn, energy.whatLearn);
assert.equal(card.source.fields.whatDo, energy.whatDo);

assert.equal(getMajorSourceProfile('500101'), null);
assert.equal(majorSourceInterpretation('500101').available, false);
assert.equal(majorUnderstandingCard({ standardMajor: { code: '500101' } }), null);

console.log(JSON.stringify({ ok: true, canonicalCount: MAJOR_SOURCE_PROFILE_META.canonicalCount, verifiedCount: MAJOR_SOURCE_PROFILE_META.verifiedCount, missingCount: MAJOR_SOURCE_PROFILE_META.missingCount, sample: { code: energy.code, name: energy.name, sourceUrl: energy.sourceUrl } }));
