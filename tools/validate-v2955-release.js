const fs=require('fs');
const vm=require('vm');
function read(p){return fs.readFileSync(p,'utf8');}
function assert(x,msg){if(!x)throw new Error(msg)}
const required=[
 'index.html','diagnostics.html','assets/config.v2955.js','assets/rules.v2955.js','assets/child-interest-rules.v2955.js','assets/rule-runtime.v2955.js','assets/data-engine.v2955.js','assets/filter-engine.v2955.js','assets/plan-engine.v2955.js','assets/render.v2955.js','assets/selection.v2955.js','assets/export.v2955.js','assets/app.v2955.js','assets/app.v2955.css','assets/major-name-model.v2946.js','assets/confusable-major-model.v29462.js','fenxi/index.html','fenxi/diagnostics.html','fenxi/assets/config.v2955.js','fenxi/assets/child-interest-rules.v2955.js','fenxi/assets/rule-runtime.v2955.js','fenxi/assets/app.v2955.js','fenxi/data/manifest.json','functions/_middleware.js','functions/fenxi/api/login.js'
];
for(const f of required){assert(fs.existsSync(f),'missing '+f)}
for(const f of required.filter(x=>x.endsWith('.js') && !x.startsWith('functions/'))){new vm.Script(read(f),{filename:f});}
const index=read('fenxi/index.html');
assert(index.includes('childInterest'), 'fenxi index missing childInterest section');
assert(index.includes('assets/child-interest-rules.v2955.js'), 'fenxi index missing child interest rules loader');
assert(index.includes('assets/rule-runtime.v2955.js'), 'fenxi index missing rule runtime loader');
assert(index.includes('V2.9.5.5｜孩子专业兴趣与规则中心增强版'), 'fenxi index version mismatch');
assert(!index.includes('v2954fix3.js'), 'fenxi index still references v2954fix3 js');
assert(!index.includes('访问码：'), 'fenxi index exposes access code label');
assert(!index.includes('ln2025'), 'fenxi index exposes raw access code');
const context={
  window:{}, console, setTimeout:(fn)=>{}, clearTimeout:()=>{}, setInterval:()=>{},
  document:{addEventListener(){},querySelector(){return null},querySelectorAll(){return []},getElementById(){return null},body:{classList:{add(){},remove(){},toggle(){}}},createElement(){return {click(){},style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},appendChild(){}};}},
  localStorage:{_m:{},getItem(k){return this._m[k]||null},setItem(k,v){this._m[k]=String(v)},removeItem(k){delete this._m[k]}},
  location:{search:'',pathname:'/fenxi/',href:'https://example.com/fenxi/'},
  HTMLCanvasElement:function(){}, Image:function(){}, Blob:function(){}, URL:{createObjectURL(){return ''},revokeObjectURL(){},},
  fetch:function(){return Promise.reject(new Error('fetch disabled in validator'));}
};
context.window=Object.assign(context.window, context); context.window.__LN_ASSET_BASE='./'; vm.createContext(context);
for(const f of ['assets/config.v2955.js','assets/rules.v2955.js','assets/child-interest-rules.v2955.js','assets/rule-runtime.v2955.js','assets/major-name-model.v2946.js','assets/confusable-major-model.v29462.js','assets/data-engine.v2955.js','assets/filter-engine.v2955.js','assets/plan-engine.v2955.js','assets/render.v2955.js','assets/selection.v2955.js','assets/export.v2955.js']){
  vm.runInContext(read(f),context,{filename:f});
}
for(const name of ['LN_CONFIG','LN_GAOKAO_RULES_V2953','LN_CHILD_INTEREST_RULES_V2955','LN_CHILD_INTEREST_RUNTIME_V2955','LN_DATA_ENGINE','LN_FILTER_ENGINE','LN_PLAN_ENGINE','LN_RENDER','LN_SELECTION','LN_EXPORT']){
  assert(context.window[name], name+' not defined');
}
assert(context.window.LN_CHILD_INTEREST_RUNTIME_V2955.ready===true, 'child interest runtime not ready');
assert(context.window.LN_EXPORT.ready===true, 'LN_EXPORT ready flag not true');
const groups=context.window.LN_CHILD_INTEREST_RULES_V2955.groups||[];
assert(groups.length===9, 'child interest groups should be 9');
assert(groups.some(g=>g.id==='grid_energy'), 'missing grid_energy group');
assert(groups.some(g=>g.id==='medical_health'), 'missing medical_health group');
const grid=groups.find(g=>g.id==='grid_energy');
assert(grid.match.core.includes('电气工程及其自动化'), 'grid core missing electrical');
assert(grid.match.review.includes('测控技术与仪器'), 'grid review missing measure-control');
const runtime=context.window.LN_CHILD_INTEREST_RUNTIME_V2955;
runtime.saveState({mode:'selected', selectedGroups:['grid_energy'], manualOnlyInterest:false});
let match=runtime.matchRecord({major:'电气工程及其自动化'});
assert(match.level==='core', 'electrical should be core interest match');
match=runtime.matchRecord({major:'测控技术与仪器'});
assert(match.level==='review', 'measurement should be review interest match');
const plan=read('assets/plan-engine.v2955.js');
assert(plan.includes('planAdjustment(r,type)'), 'plan engine missing child interest adjustment');
assert(plan.includes('childInterestLineV2955'), 'plan engine missing interest line');
const filter=read('assets/filter-engine.v2955.js');
assert(filter.includes('filterPass(r)'), 'filter engine missing child interest hard filter pass');
const render=read('assets/render.v2955.js');
assert(render.includes('scenarioFit'), 'render missing scenario interest fit');
console.log('V2.9.5.5 validation passed');
