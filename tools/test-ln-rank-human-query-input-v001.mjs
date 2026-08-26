import assert from 'node:assert/strict';
import {
  HUMAN_QUERY_INPUT_PROTOCOL_VERSION,
  createHumanInputProposal,
  parseScoreInput,
  scoreQueryValue
} from '../ln-rank/js/query/human-query-input-protocol.v001.js';

const cases = [
  ['580', { kind: 'point', value: 580, canSubmit: true }],
  ['580分', { kind: 'point', value: 580, canSubmit: true }],
  ['孩子考了580分', { kind: 'point', value: 580, canSubmit: true }],
  ['570-590分', { kind: 'range', min: 570, max: 590, canSubmit: false }],
  ['600以上', { kind: 'min', min: 600, canSubmit: false }],
  ['600以下', { kind: 'max', max: 600, canSubmit: false }],
  ['位次23000', { kind: 'invalid', canSubmit: false }],
  ['751', { kind: 'out_of_range', canSubmit: false }],
  ['沈航', { kind: 'invalid', canSubmit: false }]
];

for (const [input, expected] of cases) {
  const actual = parseScoreInput(input);
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(actual[key], value, `${input}: ${key}`);
  }
}

assert.equal(scoreQueryValue('580分'), 580);
assert.equal(scoreQueryValue('570-590分'), null);
const proposal = createHumanInputProposal({ field: 'score', raw: '位次23000' });
assert.equal(proposal.protocolVersion, HUMAN_QUERY_INPUT_PROTOCOL_VERSION);
assert.equal(proposal.status, 'invalid');
assert.equal(proposal.canCommit, false);

console.log('ln-rank human query input protocol v001 tests passed');
