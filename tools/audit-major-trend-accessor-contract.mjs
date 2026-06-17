import { getTrendHint } from '../functions/_lib/kb/major-trend-retriever.js';
const out = getTrendHint({ score: 612, keyword: '财经管理' });
if (!out || typeof out !== 'object' || !('matched' in out)) throw new Error('getTrendHint compatibility export failed');
console.log(JSON.stringify({ok:true, sample:out.text||''},null,2));
