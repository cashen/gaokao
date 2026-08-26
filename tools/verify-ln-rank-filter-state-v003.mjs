import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const major = read('ln-rank/js/feature/major-all/major-all-mode.v001.js');
const workspace = read('ln-rank/js/workspace/selection-workspace-orchestrator.v3969_2.js');
const school = read('ln-rank/js/feature/school-majors/school-all-mode.v3969_2.js');
const css = read('ln-rank/css/school-all-mode.v3967_0.css');

assert.match(major, /params\.getAll\('majorConfirmed'\)/, 'confirmed direction state must be read from URL');
assert.match(major, /candidate\.intentLevel === 'direction'/, 'URL confirmation must remain direction-only');
assert.match(major, /candidate\.intentStatus === 'ready'/, 'URL confirmation must be resolver-verified');
assert.match(major, /url\.searchParams\.delete\('majorConfirmed'\)/, 'URL confirmation state must be replaced atomically');
assert.match(major, /url\.searchParams\.append\('majorConfirmed'/, 'each confirmed direction must be serialized');
assert.match(major, /const draftTerms = rawTerms\.filter\(term => !confirmedDirectionTerms\.has\(term\)\)/, 'unconfirmed draft terms must remain editable after restore');
assert.match(major, /state\.filters\.majorKeyword = draftMajorText\(\)/, 'shared filter state must match restored context');

assert.match(workspace, /let scoreModeReturnSnapshot = null/, 'score return snapshot must be isolated from shared URL state');
assert.match(workspace, /rememberScoreModeReturnState\(\)/, 'school handoff must remember the previous score context');
assert.match(workspace, /restoreScoreModeReturnState\(\)/, 'score navigation must restore the previous context');
assert.match(workspace, /next === MODE_SCORE && state\.resultMode === MODE_SCHOOL/, 'direct school-to-score switching must also restore context');
assert.match(workspace, /state\.schoolSelection = \{ status: 'empty'/, 'root score context must not retain a school entity');

assert.match(school, /reviews: '大学生说学校'/, 'school card review entry must use the unified human brand');
assert.match(school, /school-major-review-link__brand/, 'school review entry must expose the brand separately');
assert.match(school, /看看这所学校的大学生怎么说/, 'school review entry must explain the destination');
assert.match(css, /school-major-review-link__brand/, 'school review entry layout must be governed by the active CSS');

console.log('ln-rank filter-state and school-entry contract v003 passed: URL confirmation, isolated module return, and unified three-entry copy.');
