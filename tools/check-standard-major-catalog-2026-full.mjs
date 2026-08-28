import { STANDARD_MAJOR_CATALOG_2026_FULL, STANDARD_MAJOR_CATEGORIES_2026_FULL, STANDARD_MAJOR_DISCIPLINES_2026 } from '../functions/_lib/kb/standard-major-catalog-2026-full.generated.js';
function assert(cond,msg){ if(!cond) throw new Error(msg); }
assert(STANDARD_MAJOR_CATALOG_2026_FULL.length===883, 'expected 883 majors');
assert(STANDARD_MAJOR_CATEGORIES_2026_FULL.length===92, 'expected 92 categories');
assert(STANDARD_MAJOR_DISCIPLINES_2026.length===13, 'expected 13 disciplines');
const byName=new Map(STANDARD_MAJOR_CATALOG_2026_FULL.map(x=>[x.name,x])); const byCode=new Map(STANDARD_MAJOR_CATALOG_2026_FULL.map(x=>[x.code,x]));
assert(byCode.get('080601')?.name==='电气工程及其自动化','080601 failed');
assert(byName.get('园艺')?.code==='090102','园艺 failed'); assert(byName.get('园林')?.code==='090502','园林 failed'); assert(byName.get('风景园林')?.code==='082803','风景园林 failed');
assert(byName.get('动物医学')?.disciplineName==='农学','动物医学 failed'); assert(byName.get('食品科学与工程')?.categoryCode==='0827','食品 failed');
assert(byCode.get('140012TK')?.name==='具身智能','具身智能 failed'); assert(byCode.get('140013TK')?.name==='脑机科学与技术','脑机 failed'); assert(byCode.get('140007T')?.oldCode==='101011T','智能医学工程 oldCode failed');
console.log('standard-major-catalog-2026-full ok');
