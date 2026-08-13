import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('aiplus/index.html','utf8');
const css=fs.readFileSync('aiplus/geometry.v002.css','utf8');

assert.ok(html.includes('/aiplus/geometry.v002.css?v=002_2'),'geometry contract stylesheet is not mounted');
assert.ok(html.indexOf('/aiplus/geometry.v002.css?v=002_2')>html.indexOf('/aiplus/product.v002.css?v=002_1'),'geometry contract must load after product styles');
assert.ok(css.includes('.major-suggestion{'),'related-major geometry contract missing');
assert.ok(css.includes('grid-template-columns:minmax(13rem,1fr) minmax(9rem,19rem)'),'related-major desktop copy/action columns drift');
assert.ok(css.includes('.major-suggestion-button > span{'),'related-major reason styling missing');
assert.ok(css.includes('.query-status-row{'),'batch status geometry contract missing');
assert.ok(css.includes('grid-template-columns:minmax(9rem,.55fr) minmax(0,1fr)'),'batch status must use two shrink-safe reading columns');
assert.ok(css.includes('writing-mode:horizontal-tb'),'horizontal text invariant missing');
assert.ok(css.includes('overflow-wrap:break-word'),'human-readable wrap invariant missing');
assert.ok(!css.includes('overflow-wrap:anywhere'),'geometry contract must not opt normal Chinese copy into anywhere breaking');
assert.ok(css.includes('.answer-surface .history-list .history-item{'),'drawer/history result class isolation missing');
assert.ok(css.includes('.composer textarea{min-width:0;width:100%;max-width:100%}'),'composer shrink contract missing');
assert.ok(css.includes('@media(max-width:760px)'),'mobile stack contract missing');
assert.ok(css.includes('.background-school-actions{display:grid;grid-template-columns:minmax(0,1fr);align-items:stretch}'),'mobile background actions must stack');

console.log(JSON.stringify({
  ok:true,
  contract:'aiplus-responsive-geometry-v0.02',
  stylesheet:'/aiplus/geometry.v002.css?v=002_2',
  surfaces:['related-major','batch-status','history-cards','background-actions','turn-understanding','composer','topbar'],
  breakPolicy:'horizontal-break-word'
},null,2));
