import fs from 'node:fs';
import { MAJOR_CATALOG_2026, MAJOR_CATALOG_2026_META } from '../ln-rank/kb/major-understanding/major-catalog-2026.generated.js';
import { ADMISSION_MAJOR_ALIAS_2026 } from '../ln-rank/kb/major-understanding/admission-major-alias.generated.js';
import { GRADUATE_CATALOG_2022, GRADUATE_CATALOG_2022_META, GRADUATE_CATALOG_SOURCES } from '../shared/resources/graduate/graduate-catalog-2022.v001.js';
import { buildUndergradGraduatePathway, UNDERGRAD_GRADUATE_PATHWAY_META } from '../shared/resources/majors/undergrad-graduate-pathway.v001.js';
import { createMajorSearchIntentResolver, MAJOR_SEARCH_INTENT_META } from '../shared/resources/majors/major-search-intent.v001.js';

function assert(value, message) { if (!value) throw new Error(message); }
function unique(values) { return new Set(values).size === values.length; }
function semanticSnapshot(result = {}) {
  return JSON.stringify({
    kind: result.kind || '',
    matchType: result.matchType || '',
    semanticType: result.semanticType || '',
    code: result.major?.code || '',
    name: result.major?.name || '',
    total: result.total || 0,
    candidates: (result.allCandidates || result.candidates || []).map(item => `${item.code}:${item.name}`)
  });
}

assert(MAJOR_CATALOG_2026_META.total === 883, `undergraduate source meta must remain 883, got ${MAJOR_CATALOG_2026_META.total}`);
assert(MAJOR_CATALOG_2026.length === 883, `undergraduate runtime count must remain 883, got ${MAJOR_CATALOG_2026.length}`);
assert(unique(MAJOR_CATALOG_2026.map(item => item.code)), 'undergraduate codes must be unique');
assert(GRADUATE_CATALOG_2022_META.count === 184, `graduate catalog count drift: ${GRADUATE_CATALOG_2022_META.count}`);
assert(GRADUATE_CATALOG_2022.length === 184, 'graduate catalog runtime count drift');
assert(unique(GRADUATE_CATALOG_2022.map(item => item.code)), 'graduate four-digit codes must be unique');
assert(GRADUATE_CATALOG_2022.some(item => item.code === '1201' && item.name === '管理科学与工程' && item.kind === 'academic_discipline'), 'missing graduate 1201');
assert(GRADUATE_CATALOG_2022.some(item => item.code === '1256' && item.name === '工程管理' && item.kind === 'professional_degree'), 'missing graduate 1256');
assert(GRADUATE_CATALOG_2022.some(item => item.code === '1405' && item.name === '智能科学与技术'), 'missing current cross-discipline 1405');
assert(Object.values(GRADUATE_CATALOG_SOURCES).every(source => /^https:\/\/www\.moe\.gov\.cn\//.test(source.url)), 'graduate sources must stay on official MOE host');
assert(
  UNDERGRAD_GRADUATE_PATHWAY_META.boundary.includes('教育部未发布') && UNDERGRAD_GRADUATE_PATHWAY_META.boundary.includes('一一对应表'),
  'cross-level no-one-to-one boundary missing'
);

const graduateCodes = new Set(GRADUATE_CATALOG_2022.map(item => item.code));
let curated = 0;
let explicitNoCrosswalk = 0;
let routeCount = 0;
for (const major of MAJOR_CATALOG_2026) {
  const pathway = buildUndergradGraduatePathway(major);
  assert(pathway?.undergraduate?.code === major.code, `pathway lost undergraduate code ${major.code}`);
  assert(pathway.boundary.includes('一一对应'), `pathway boundary missing for ${major.code}`);
  assert(['curated_navigation','no_national_one_to_one'].includes(pathway.relationStatus), `invalid relation status ${major.code}`);
  const codes = [...pathway.academic, ...pathway.professional].map(item => item.code);
  assert(unique(codes), `duplicate graduate route for ${major.code}: ${codes.join(',')}`);
  for (const code of codes) assert(graduateCodes.has(code), `route ${major.code} points outside canonical graduate catalog: ${code}`);
  if (pathway.relationStatus === 'curated_navigation') curated += 1;
  else explicitNoCrosswalk += 1;
  routeCount += codes.length;
}
assert(curated + explicitNoCrosswalk === 883, 'every undergraduate major must have an explicit relation state');
assert(curated > 0 && routeCount > 0, 'pathway owner must provide real curated navigation, not only fallback copy');

const cases = [
  ['120103','工程管理',['1201'],['1256'],['125601','125602','125603','125604']],
  ['080601','电气工程及其自动化',['0808'],['0858'],[]],
  ['100201K','临床医学',['1002'],['1051'],[]]
];
for (const [code, name, academics, professionals, fields] of cases) {
  const major = MAJOR_CATALOG_2026.find(item => item.code === code || item.name === name);
  assert(major, `representative undergraduate major missing: ${name}`);
  const pathway = buildUndergradGraduatePathway(major);
  for (const expected of academics) assert(pathway.academic.some(item => item.code === expected), `${name} missing academic ${expected}`);
  for (const expected of professionals) assert(pathway.professional.some(item => item.code === expected), `${name} missing professional ${expected}`);
  for (const expected of fields) assert(pathway.professionalFields.some(item => item.code === expected), `${name} missing field ${expected}`);
}

const SEARCH = createMajorSearchIntentResolver(MAJOR_CATALOG_2026, ADMISSION_MAJOR_ALIAS_2026);
assert(SEARCH.count === 883, `search owner must consume all 883 majors, got ${SEARCH.count}`);
assert(MAJOR_SEARCH_INTENT_META.boundary.includes('不得静默升级'), 'search owner must forbid silent major selection');

function assertAmbiguous(query, requiredCodes = []) {
  const result = SEARCH.resolve(query, { limit: 8 });
  assert(result.kind === 'ambiguous', `${query} must disambiguate; actual=${semanticSnapshot(result)}`);
  assert(result.total > 1, `${query} ambiguity must have multiple candidates; actual=${semanticSnapshot(result)}`);
  const allCodes = (result.allCandidates || []).map(item => item.code);
  for (const code of requiredCodes) assert(allCodes.includes(code), `${query} missing candidate ${code}; actual=${semanticSnapshot(result)}`);
  for (const code of allCodes) assert(MAJOR_CATALOG_2026.some(item => item.code === code), `${query} emitted non-canonical candidate ${code}`);
  return result;
}

assertAmbiguous('机械', ['080201','080202','080204']);
assertAmbiguous('想了解机械怎么样', ['080201','080202','080204']);
assertAmbiguous('机械类', ['080201','080202','080204']);
assertAmbiguous('电气', ['080601','080602T']);
assertAmbiguous('材料', ['080401','080402','080403']);
assertAmbiguous('计算机', ['080901','080902','080903']);
assertAmbiguous('测控', ['080301','080720T']);
assertAmbiguous('食品', ['082701','082702']);
assertAmbiguous('汽车', ['080207','080208','080216T']);
assertAmbiguous('临床', ['100201K','100703TK']);
assertAmbiguous('软件', ['080902','080919T','081013T']);
assertAmbiguous('口腔', ['100301K','101006']);

const jike = SEARCH.resolve('计科');
assert(jike.kind === 'direct' && jike.major?.code === '080901', `计科 must resolve to 080901; actual=${semanticSnapshot(jike)}`);
assert(jike.matchType === 'alias_exact' && jike.explanation.includes('家长常用简称'), `计科 must explain alias recognition; actual=${semanticSnapshot(jike)}`);
const dianli = SEARCH.resolve('电力');
assert(dianli.kind === 'direct' && dianli.major?.code === '080601', `电力 must resolve to 080601 when no competing official major name exists; actual=${semanticSnapshot(dianli)}`);
assert(dianli.explanation.includes('家长常用简称'), `电力 must preserve alias recognition explanation; actual=${semanticSnapshot(dianli)}`);
const exact = SEARCH.resolve('工程管理');
assert(exact.kind === 'direct' && exact.matchType === 'official_name' && exact.major?.code === '120103', `official major name must remain direct; actual=${semanticSnapshot(exact)}`);
const byCode = SEARCH.resolve('120103');
assert(byCode.kind === 'direct' && byCode.matchType === 'code' && byCode.major?.name === '工程管理', `official code must remain direct; actual=${semanticSnapshot(byCode)}`);

const html = fs.readFileSync('major-path/index.html','utf8');
const app = fs.readFileSync('major-path/app.v001.js','utf8');
const css = fs.readFileSync('major-path/major-path.v001.css','utf8');
assert(html.includes('data-major-path-version="major-path-v0.01"'), 'page version marker missing');
assert(html.includes('本科专业和硕士专业不是一一对应'), 'human boundary copy missing');
assert(html.includes('机械 / 电气 / 计科'), 'parent-language search examples missing');
assert(html.includes('/major-path/app.v001.js?v=001_0'), 'current app edge missing');
assert(html.includes('/major-path/major-path.v001.css?v=001_0'), 'current css edge missing');
assert(app.includes('MAJOR_CATALOG_2026'), 'page must reuse canonical undergraduate catalog');
assert(app.includes('ADMISSION_MAJOR_ALIAS_2026'), 'page must reuse canonical admission-major aliases');
assert(app.includes('createMajorSearchIntentResolver'), 'page must use the single semantic-search owner');
assert(app.includes('buildUndergradGraduatePathway'), 'page must use the single relation owner');
assert(app.includes('data-disambiguation-query'), 'page must render explicit fuzzy-query disambiguation');
assert(app.includes('data-recognition-query'), 'page must preserve one-candidate fuzzy recognition context');
assert(!app.includes('fetch('), 'major path v0.01 must remain deterministic/static; no runtime crawler');
assert(css.includes('.disambiguation-grid') && css.includes('.recognition-note'), 'semantic-search UI styles missing');
assert(css.includes('@media(max-width:760px)') && css.includes('@media(max-width:390px)'), 'Pad/Android responsive contracts missing');
assert(!/if\s*\([^)]*(Android|iPad|iPhone)/i.test(app), 'device-specific business state is forbidden');

console.log(JSON.stringify({ok:true,version:'major-path-verifier-v0.01',undergraduate:MAJOR_CATALOG_2026.length,graduate:GRADUATE_CATALOG_2022.length,curated,explicitNoCrosswalk,routeCount,searchAliases:SEARCH.aliasCount},null,2));
