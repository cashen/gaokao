import fs from 'node:fs';
import assert from 'node:assert/strict';
import { resolveMajorUnderstanding } from '../ln-rank/js/knowledge/major-understanding-resolver.js';
import {
  MAJOR_PATH_NAVIGATION_META,
  buildMajorPathHref,
  sanitizeMajorPathReturnTarget
} from '../shared/resources/majors/major-path-navigation.v004.js';

const read = path => fs.readFileSync(path, 'utf8');
const index = read('major-path/index.html');
const human = read('major-path/app.v006.js');
const core = read('major-path/app-core.v006.js');
const humanCss = read('major-path/major-path-human.v006.css');

assert.match(index, /data-major-path-version="major-path-v0\.06"/);
assert.match(index, /data-major-path-core-version="major-path-core-v0\.06"/);
assert.match(index, /data-major-path-handoff-version="major-path-handoff-v0\.03"/);
assert.match(index, /data-major-path-human-version="major-path-human-v0\.06"/);
assert.match(index, /\/major-path\/app\.v006\.js\?v=006_0/);
assert.match(index, /\/major-path\/major-path-human\.v006\.css\?v=006_0/);
assert.doesNotMatch(index, /\/major-path\/app\.v003\.js\?v=003_0/);
assert.doesNotMatch(index, /\/major-path\/major-path-direct\.v003\.css\?v=003_0/);
assert.match(index, /查一个本科专业，看看它属于哪里，以后读研可以往哪些方向了解/);
assert.match(index, /看这个专业/);
assert.match(index, /关于“相关专业”和读研方向，再说明一句/);
assert.doesNotMatch(index, /关系图不是“平替排行榜”|本科目录硬关系|研究生升学导航|跨专业类升学交叉|不补造“1400专业类”/);

assert.match(human, /major-path-human-v0\.06/);
assert.match(human, /major-path-viewport-v0\.06/);
assert.match(human, /await import\('\.\/app-core\.v006\.js\?v=006_0'\)/);
assert.doesNotMatch(human, /app\.v003\.js/);
assert.match(human, /本科到读研，先看这条线/);
assert.match(human, /dataMajorPathwayFocus|majorPathwayFocus/);
assert.match(human, /bootState/);
assert.match(human, /coreReady/);
assert.match(human, /queuedAction/);
assert.match(human, /majorPathCoreReady/);
assert.match(human, /currentResultNeedsPresentation/);
assert.match(human, /ownViewport/);
assert.match(human, /result\.hidden = true|els\.result\.hidden = true/);
assert.match(human, /holdResultUntilHumanized/);
assert.doesNotMatch(human, /cancelLegacyViewport|suppressLegacyScroll|viewportStartY/);
assert.match(human, /window\.scrollTo\(/);
assert.match(human, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
assert.doesNotMatch(human, /scrollIntoView\s*\(/);
assert.doesNotMatch(human, /MutationObserver|setTimeout\s*\(|localStorage|sessionStorage|indexedDB/);
assert.match(human, /还想看看和它相关的专业/);
assert.match(human, /为什么这里只写“可以先看”，不是固定对应/);
assert.match(human, /来自刚才的辽宁招生结果/);
assert.match(human, /从刚才的专业继续看/);
assert.match(human, /data-graph-mode/);
assert.match(human, /simplifyGraphLanguage\(relationship\)/);
assert.match(human, /直接列在“交叉学科”门类下，专业类未单列/);
assert.doesNotMatch(human, /系统已经确认/);

assert.match(core, /createMajorRelationshipGraphResolver/);
assert.match(core, /major-path-core-v0\.06/);
assert.match(core, /aria-selected/);
assert.doesNotMatch(core, /scrollIntoView\s*\(/);
assert.doesNotMatch(core, /你高考报的是/);
assert.match(core, /buildUndergradGraduatePathway/);
assert.match(core, /createMajorSearchIntentResolver/);
assert.match(humanCss, /body\.major-path-direct \.topbar\{position:sticky/);
assert.match(humanCss, /\.major-pathway-focus/);
assert.match(humanCss, /\.human-explore-details/);
assert.match(humanCss, /\.human-evidence-details/);

assert.equal(MAJOR_PATH_NAVIGATION_META.version, 'major-path-navigation-v0.04');
assert.equal(sanitizeMajorPathReturnTarget('/ln-rank/?score=580'), '/ln-rank/?score=580');
assert.equal(sanitizeMajorPathReturnTarget('https://evil.example/ln-rank/?score=580'), '/ln-rank/');
const href = buildMajorPathHref({
  majorCode: '120103', canonicalName: '工程管理', context: 'score', sourceKey: 'score-key',
  sourceMajor: '工程管理', returnTo: '/ln-rank/?score=580'
});
const url = new URL(href, 'https://gaokao.powers.org.cn');
assert.equal(url.pathname, '/major-path/');
assert.equal(url.searchParams.get('majorCode'), '120103');
assert.equal(url.searchParams.get('from'), 'ln-rank');

const exact = resolveMajorUnderstanding({ major: '工程管理' });
assert.equal(exact.code, '120103');
assert.notEqual(exact.isClassLevel, true);
const classLevel = resolveMajorUnderstanding({ major: '计算机类' });
assert.equal(classLevel.isClassLevel, true);
const cooperation = resolveMajorUnderstanding({ major: '机械工程（中外合作办学）' });
assert.equal(cooperation.code, '080201');
assert.equal(cooperation.matchType, 'admission_suffix_clean');

console.log(JSON.stringify({
  ok: true,
  version: 'major-path-human-source-v0.06',
  visibleProduct: 'major-path-v0.06',
  activeCore: 'major-path-core-v0.06',
  preservedHandoff: 'major-path-handoff-v0.03'
}, null, 2));
