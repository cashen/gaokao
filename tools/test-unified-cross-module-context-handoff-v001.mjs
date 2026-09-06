import assert from 'node:assert/strict';
import {
  createDecisionContext,
  decodeDecisionContext,
  encodeDecisionContext,
  summarizeDecisionContext
} from '../shared/decision-context/decision-context.v001.js';
import {
  RETURN_SNAPSHOT_MAX_ENTRIES,
  RETURN_SNAPSHOT_STORAGE_KEY,
  captureCurrentReturnSnapshot,
  readReturnSnapshot,
  readReturnSnapshotForLocation,
  restoreReturnSnapshot
} from '../shared/decision-context/return-snapshot.v001.js';
import { buildTongxueSchoolHref } from '../shared/resources/schools/school-resource-center.js';

const context = createDecisionContext({
  sourceSurface: 'ln-rank',
  sourceAction: 'view_student_voice',
  returnTo: '/ln-rank/?mode=school-all&school=%E6%B2%88%E9%98%B3%E5%8C%96%E5%B7%A5%E5%A4%A7%E5%AD%A6#schoolAllResultsPanel',
  resultMode: 'school-all',
  returnAnchor: 'schoolAllResultsPanel',
  province: '辽宁',
  admissionYear: 2026,
  track: '物理类',
  score: 580,
  school: '沈阳化工大学',
  schoolCode: 'admission:沈阳化工大学'
});

globalThis.btoa = globalThis.btoa || (value => Buffer.from(value, 'binary').toString('base64'));
globalThis.atob = globalThis.atob || (value => Buffer.from(value, 'base64').toString('binary'));
const encoded = encodeDecisionContext(context);
const roundTrip = decodeDecisionContext(encoded);
assert.equal(roundTrip.contextId, context.contextId);
assert.equal(roundTrip.resultMode, 'school-all');
assert.equal(roundTrip.returnAnchor, 'schoolAllResultsPanel');
assert.match(summarizeDecisionContext(roundTrip).title, /学校专业列表/);

const store = new Map();
globalThis.sessionStorage = {
  getItem: key => store.get(key) || null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key)
};
const snapshot = captureCurrentReturnSnapshot({
  contextId: context.contextId,
  returnTo: context.returnTo,
  sourceSurface: 'ln-rank',
  resultMode: context.resultMode,
  anchorId: context.returnAnchor,
  focusId: context.returnAnchor,
  scrollY: 1234
});
assert.equal(snapshot.contextId, context.contextId);
assert.equal(readReturnSnapshot(context.contextId).scrollY, 1234);
const contextLocation = new URL(context.returnTo, 'https://gaokao.powers.org.cn');
assert.equal(readReturnSnapshotForLocation({ pathname:contextLocation.pathname, search:contextLocation.search, hash:contextLocation.hash }).contextId, context.contextId);
assert.equal(readReturnSnapshotForLocation({ href:`https://gaokao.powers.org.cn${context.returnTo}` }).contextId, context.contextId);
assert.ok(JSON.parse(store.get(RETURN_SNAPSHOT_STORAGE_KEY)).length <= RETURN_SNAPSHOT_MAX_ENTRIES);

let scrolled = null;
const didRestore = restoreReturnSnapshot(snapshot, {
  documentLike: { getElementById: id => id === 'schoolAllResultsPanel' ? { scrollIntoView: options => { scrolled = options; } } : null },
  windowLike: { scrollTo: () => { throw new Error('anchor should win'); } }
});
assert.equal(didRestore, true);
assert.deepEqual(scrolled, { behavior:'auto', block:'start' });

const href = buildTongxueSchoolHref({
  school: '东北大学',
  entityId: 'neu-main',
  returnTo: context.returnTo,
  resultMode: context.resultMode,
  returnAnchor: context.returnAnchor,
  decisionContext: context
});
const targetUrl = new URL(href, 'https://gaokao.powers.org.cn');
assert.equal(targetUrl.searchParams.get('entity'), 'neu-main');
assert.equal(targetUrl.searchParams.get('resultMode'), 'school-all');
assert.ok(targetUrl.searchParams.get('dc'));

console.log('unified cross-module context handoff v001 tests passed');
