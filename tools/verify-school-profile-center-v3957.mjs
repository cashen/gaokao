import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SCHOOL_PROFILE_SOURCE_META,
  SCHOOL_PROFILE_SPECIALS,
  resolveSchoolProfile,
  getSchoolProfileDisplayTags
} from '../shared/resources/schools/school-profile-center.js';
import { matchRegionRule } from '../shared/resources/geo/china-region-catalog.js';
import { buildDisplayTags } from '../functions/_lib/school-display-tags.js';
import { normalizeLocation } from '../functions/_lib/location-normalizer.js';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { getSchoolEntity } from '../shared/resources/schools/school-identity-center.js';

assert.equal(SCHOOL_PROFILE_SOURCE_META.version, 'v3957_0');
assert.equal(SCHOOL_PROFILE_SOURCE_META.count, 2952);
assert.equal(SCHOOL_PROFILE_SOURCE_META.provinceCount, 31);
assert.equal(SCHOOL_PROFILE_SOURCE_META.asOfDate, '2026-06-17');
assert.ok(SCHOOL_PROFILE_SOURCE_META.privateCount >= 500);
assert.ok(SCHOOL_PROFILE_SOURCE_META['985MatchedCount'] >= 38);
assert.ok(SCHOOL_PROFILE_SOURCE_META['211MatchedCount'] >= 100);
assert.equal(SCHOOL_PROFILE_SOURCE_META.doubleNonDefinition, '非985且非211；不等同于非双一流');
assert.ok(SCHOOL_PROFILE_SOURCE_META.source.schoolListPageUrl.includes('moe.gov.cn'));
assert.equal(SCHOOL_PROFILE_SPECIALS.length, 3);
assert.equal(getSchoolEntity('dlut-panjin')?.parentEntityId, 'dlut-main');

const cases = [
  ['北京大学', { province: '北京', city: '北京', natureType: 'public', is985: true, is211: true, isNon985211: false, tags: ['985', '211', '公办', '北京'] }],
  ['上海财经大学', { province: '上海', city: '上海', natureType: 'public', is985: false, is211: true, isNon985211: false, tags: ['211', '公办', '上海'] }],
  ['辽宁大学', { province: '辽宁', city: '沈阳', natureType: 'public', is985: false, is211: true, isNon985211: false, tags: ['211', '公办', '辽宁 · 沈阳'] }],
  ['深圳大学', { province: '广东', city: '深圳', natureType: 'public', is985: false, is211: false, isNon985211: true, tags: ['双非（非985/211）', '公办', '广东 · 深圳'] }],
  ['三亚学院', { province: '海南', city: '三亚', natureType: 'private', is985: false, is211: false, isNon985211: true, tags: ['双非（非985/211）', '民办', '海南 · 三亚'] }],
  ['大连东软信息学院', { province: '辽宁', city: '大连', natureType: 'private', is985: false, is211: false, isNon985211: true, tags: ['双非（非985/211）', '民办', '辽宁 · 大连'] }],
  ['国防科技大学', { province: '湖南', city: '长沙', natureType: 'public', is985: true, is211: true, isNon985211: false, tags: ['985', '211', '公办', '湖南 · 长沙'] }],
  ['第二军医大学', { province: '上海', city: '上海', natureType: 'public', is985: false, is211: true, isNon985211: false, tags: ['211', '公办', '上海'] }],
  ['第四军医大学', { province: '陕西', city: '西安', natureType: 'public', is985: false, is211: true, isNon985211: false, tags: ['211', '公办', '陕西 · 西安'] }]
];

for (const [name, expected] of cases) {
  const profile = resolveSchoolProfile(name);
  assert.ok(profile, `profile missing: ${name}`);
  for (const key of ['province','city','natureType','is985','is211','isNon985211']) {
    assert.equal(profile[key], expected[key], `${name} ${key}`);
  }
  const tags = getSchoolProfileDisplayTags(profile);
  for (const tag of expected.tags) assert.ok(tags.includes(tag), `${name} missing display tag ${tag}: ${tags.join('|')}`);
}

const panjin = resolveSchoolProfile('大连理工大学（盘锦校区）');
assert.ok(panjin);
assert.equal(panjin.standardSchoolName, '大连理工大学');
assert.equal(panjin.entityType, 'admission_campus');
assert.equal(panjin.entityTypeLabel, '招生校区');
assert.equal(panjin.province, '辽宁');
assert.equal(panjin.city, '盘锦');
assert.equal(panjin.is985, true);
assert.equal(panjin.is211, true);
assert.equal(panjin.natureType, 'public');
assert.ok(getSchoolProfileDisplayTags(panjin).includes('招生校区'));

const qinhuangdao = resolveSchoolProfile('东北大学秦皇岛分校');
assert.ok(qinhuangdao);
assert.equal(qinhuangdao.standardSchoolName, '东北大学');
assert.equal(qinhuangdao.entityType, 'branch_school');
assert.equal(qinhuangdao.entityTypeLabel, '分校');
assert.equal(qinhuangdao.province, '河北');
assert.equal(qinhuangdao.city, '秦皇岛');
assert.equal(qinhuangdao.is985, true);
assert.equal(qinhuangdao.is211, true);
assert.equal(qinhuangdao.natureType, 'public');
assert.equal(matchRegionRule(qinhuangdao, 'hebei'), true);
assert.equal(matchRegionRule(qinhuangdao, 'ln'), false);

const privateTags = buildDisplayTags({ school: '三亚学院', major: '计算机科学与技术' });
assert.equal(privateTags.natureLabel, '民办');
assert.equal(privateTags.isNon985211, true);
assert.ok(privateTags.schoolTierTags.includes('双非（非985/211）'));
assert.equal(privateTags.displayLocation, '海南 · 三亚');
assert.equal(privateTags.schoolProfileDisplayTags.includes('民办'), true);

const publicTags = buildDisplayTags({ school: '深圳大学', major: '电子信息工程' });
assert.equal(publicTags.natureLabel, '公办');
assert.equal(publicTags.isNon985211, true);
assert.ok(publicTags.schoolTierTags.includes('双非（非985/211）'));

const campusLocation = normalizeLocation({}, '大连理工大学（盘锦校区）', '能源化学工程');
assert.equal(campusLocation.province, '辽宁');
assert.equal(campusLocation.city, '盘锦');
assert.equal(campusLocation.natureHint, '公办');
assert.equal(campusLocation.schoolProfile.is985, true);

const render = fs.readFileSync('ln-rank/js/feature/major-pool/render.v3963_1.js', 'utf8');
assert.ok(render.includes("arr.push(record.natureLabel || '性质待核验')"));
assert.ok(render.includes('record.schoolEntityTypeLabel'));
assert.ok(render.includes("record.displayLocation || '地域待核验'"));
assert.ok(render.includes('双非（非985/211）'));
assert.ok(!/return \[\.\.\.new Set\(arr\.filter\(Boolean\)\)\]\.slice\(0,\s*6\)/.test(render));

const selection = fs.readFileSync('ln-rank/js/selection-pool.v3951_0.js', 'utf8');
const store = fs.readFileSync('ln-rank/js/feature/selection-pool/store.js', 'utf8');
assert.ok(selection.includes('itemSchoolProfileHtml'));
for (const field of ['schoolTierTags','is985','is211','isNon985211','schoolEntityTypeLabel']) {
  assert.ok(store.includes(field), `selection store missing ${field}`);
}

const tagsAdapter = fs.readFileSync('functions/_lib/school-tags.js', 'utf8');
const displayAdapter = fs.readFileSync('functions/_lib/school-display-tags.js', 'utf8');
const locationAdapter = fs.readFileSync('functions/_lib/location-normalizer.js', 'utf8');
for (const source of [tagsAdapter, displayAdapter, locationAdapter]) {
  assert.ok(source.includes('shared/resources/schools/school-profile-center.js'));
}
assert.ok(locationAdapter.includes('shared/resources/geo/china-region-catalog.js'));
assert.ok(!tagsAdapter.includes("'大连理工大学':"));

for (const file of ['ln-rank/release-meta.json','ln-rank/active-assets.json']) {
  const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(meta.version, CURRENT_RELEASE.display);
  assert.equal(meta.assetVersion, CURRENT_RELEASE.assetVersion);
  for (const key of [
    'sharedSchoolProfileContract','schoolProfileOfficial2026Contract','schoolProfileNatureContract',
    'schoolProfile985211Contract','schoolProfileDoubleNonContract','schoolProfileCampusInheritanceContract',
    'schoolProfileCardAlwaysVisibleContract','schoolProfileSelectionPoolContract','sharedSchoolIdentityOwnerContract'
  ]) assert.equal(meta[key], true, `${file} missing ${key}`);
}

console.log('SCHOOL_PROFILE_CENTER_V3958_OK');
