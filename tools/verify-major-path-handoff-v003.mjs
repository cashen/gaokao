import fs from 'node:fs';
import assert from 'node:assert/strict';
import { resolveMajorUnderstanding } from '../ln-rank/js/knowledge/major-understanding-resolver.js';
import {
  MAJOR_PATH_NAVIGATION_META,
  buildMajorPathHref,
  sanitizeMajorPathReturnTarget
} from '../shared/resources/majors/major-path-navigation.v003.js';

const read = path => fs.readFileSync(path, 'utf8');

function concrete(raw) {
  const info = resolveMajorUnderstanding({ major: raw });
  const allowed = new Set(['name_exact', 'admission_suffix_clean', 'alias_exact']);
  return Boolean(info?.matched && !info.isClassLevel && info.code && info.name && info.confidence === 'high' && allowed.has(String(info.matchType || '')));
}

assert.equal(MAJOR_PATH_NAVIGATION_META.version, 'major-path-navigation-v0.03');
assert.equal(sanitizeMajorPathReturnTarget('/ln-rank/?score=580&mode=school-all'), '/ln-rank/?score=580&mode=school-all');
assert.equal(sanitizeMajorPathReturnTarget('https://evil.example/ln-rank/?score=580'), '/ln-rank/');
assert.equal(sanitizeMajorPathReturnTarget('/major-path/?major=工程管理'), '/ln-rank/');

const href = buildMajorPathHref({
  majorCode: '120103',
  canonicalName: '工程管理',
  context: 'school',
  sourceKey: 'school-key',
  sourceMajor: '工程管理',
  school: '沈阳建筑大学',
  returnTo: '/ln-rank/?mode=school-all&school=沈阳建筑大学&score=580'
});
const url = new URL(href, 'https://gaokao.powers.org.cn');
assert.equal(url.pathname, '/major-path/');
assert.equal(url.searchParams.get('majorCode'), '120103');
assert.equal(url.searchParams.get('from'), 'ln-rank');
assert.equal(url.searchParams.get('context'), 'school');
assert.equal(url.searchParams.get('school'), '沈阳建筑大学');
const returnTarget = new URL(url.searchParams.get('returnTo'), 'https://gaokao.powers.org.cn');
assert.equal(returnTarget.pathname, '/ln-rank/');
assert.equal(returnTarget.searchParams.get('mode'), 'school-all');
assert.equal(returnTarget.searchParams.get('school'), '沈阳建筑大学');
assert.equal(returnTarget.searchParams.get('score'), '580');

const engineeringManagement = resolveMajorUnderstanding({ major: '工程管理' });
assert.equal(engineeringManagement.code, '120103');
assert.equal(engineeringManagement.matchType, 'name_exact');
assert.equal(engineeringManagement.confidence, 'high');
assert.equal(concrete('工程管理'), true);

const cooperation = resolveMajorUnderstanding({ major: '机械工程（中外合作办学）' });
assert.equal(cooperation.code, '080201');
assert.equal(cooperation.matchType, 'admission_suffix_clean');
assert.equal(cooperation.confidence, 'high');
assert.equal(concrete('机械工程（中外合作办学）'), true);

const computingClass = resolveMajorUnderstanding({ major: '计算机类' });
assert.equal(computingClass.isClassLevel, true);
assert.equal(concrete('计算机类'), false);
assert.equal(concrete('工科试验班'), false);

const handoff = read('ln-rank/js/workspace/major-path-handoff.v003.js');
assert.match(handoff, /dataset\.uiNavigation = 'major-path'/);
assert.match(handoff, /dataset\.uiNavigationTarget = href/);
assert.match(handoff, /name_exact/);
assert.match(handoff, /admission_suffix_clean/);
assert.match(handoff, /alias_exact/);
assert.match(handoff, /info\.isClassLevel/);
assert.match(handoff, /gaokao:navigation-accepted/);
assert.match(handoff, /lnRankMajorPathResumeV003/);
assert.match(handoff, /scrollToExplicitTarget/);
assert.doesNotMatch(handoff, /location\.assign\s*\(/);
assert.doesNotMatch(handoff, /scrollIntoView\s*\(/);
assert.doesNotMatch(handoff, /localStorage|sessionStorage|indexedDB|MutationObserver/);

const bootstrap = read('ln-rank/js/app.v3990_2.js');
assert.match(bootstrap, /mountMajorPathHandoff/);
assert.match(bootstrap, /major-path-handoff\.v003\.js\?v=003_0/);

const majorPathIndex = read('major-path/index.html');
assert.match(majorPathIndex, /data-major-path-version="major-path-v0\.04"/);
assert.match(majorPathIndex, /data-major-path-handoff-version="major-path-handoff-v0\.03"/);
assert.match(majorPathIndex, /\/major-path\/app\.v004\.js\?v=004_0/);
assert.match(majorPathIndex, /\/major-path\/major-path-human\.v004\.css\?v=004_0/);

const direct = read('major-path/app.v004.js');
assert.match(direct, /major-path-direct/);
assert.match(direct, /history\.back\(\)/);
assert.match(direct, /directContextForMajor/);
assert.match(direct, /majorPathSourceBoundary/);
assert.doesNotMatch(direct, /localStorage|sessionStorage|indexedDB|MutationObserver/);

console.log(JSON.stringify({
  ok: true,
  version: 'major-path-handoff-source-v0.04',
  positive: ['120103 工程管理', '080201 机械工程（中外合作办学）'],
  failClosed: ['计算机类', '工科试验班', 'cross-origin returnTo']
}, null, 2));
