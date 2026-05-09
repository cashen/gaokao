const fs=require('fs');
const vm=require('vm');
function read(p){return fs.readFileSync(p,'utf8');}
function assert(x,msg){if(!x){throw new Error(msg)}}
const required=[
 'index.html','diagnostics.html','assets/config.v2954fix3.js','assets/rules.v2954fix3.js','assets/data-engine.v2954fix3.js','assets/filter-engine.v2954fix3.js','assets/plan-engine.v2954fix3.js','assets/render.v2954fix3.js','assets/selection.v2954fix3.js','assets/export.v2954fix3.js','assets/app.v2954fix3.js','assets/app.v2954fix3.css','assets/major-name-model.v2946.js','assets/confusable-major-model.v29462.js','fenxi/index.html','fenxi/diagnostics.html','fenxi/assets/config.v2954fix3.js','fenxi/data/manifest.json'
];
for(const f of required){assert(fs.existsSync(f),'missing '+f)}
const index=read('index.html');
assert(index.includes('assets/app.v2954fix3.js'),'index loader does not mention v2954fix3 app');
assert(index.includes('2954fix3-20260509c'),'index missing cache-bust version');
assert(!index.includes('v2953fix5.js'),'index still references fix5 js');
assert(!index.includes('访问码：'),'index exposes access code label');
assert(!index.includes('输入访问码'),'index hints access code in placeholder');
assert(!index.includes('ln2025'),'index exposes raw access code');
assert(!index.includes('模块缓存隔离与运行时校验版'),'index still contains cache-isolation title');
assert((index.match(/onclick=/g)||[]).length===0,'index contains onclick');
for(const f of required.filter(x=>x.endsWith('.js'))){new vm.Script(read(f),{filename:f});}
// Runtime load with minimal browser shims, in the same order as diagnostics.
const context={
  window:{}, console, setTimeout:(fn)=>{}, clearTimeout:()=>{}, setInterval:()=>{},
  document:{addEventListener(){},querySelector(){return null},querySelectorAll(){return []},getElementById(){return null},body:{classList:{add(){},remove(){}}},createElement(){return {click(){},style:{},classList:{add(){},remove(){}}};}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},
  HTMLCanvasElement:function(){}, Image:function(){}, Blob:function(){}, URL:{createObjectURL(){return ''},revokeObjectURL(){}},
  fetch:function(){return Promise.reject(new Error('fetch disabled in validator'));}
};
context.window=Object.assign(context.window, context);
context.window.__LN_ASSET_BASE='./';
vm.createContext(context);
for(const f of ['assets/config.v2954fix3.js','assets/rules.v2954fix3.js','assets/major-name-model.v2946.js','assets/confusable-major-model.v29462.js','assets/data-engine.v2954fix3.js','assets/filter-engine.v2954fix3.js','assets/plan-engine.v2954fix3.js','assets/render.v2954fix3.js','assets/selection.v2954fix3.js','assets/export.v2954fix3.js']){
  vm.runInContext(read(f),context,{filename:f});
}
for(const name of ['LN_CONFIG','LN_GAOKAO_RULES_V2953','LN_DATA_ENGINE','LN_FILTER_ENGINE','LN_PLAN_ENGINE','LN_RENDER','LN_SELECTION','LN_EXPORT']){
  assert(context.window[name], name+' not defined');
}
assert(context.window.LN_EXPORT.ready===true,'LN_EXPORT ready flag not true');
const banned=['死保','敢冒','无脑','访问码不正确','页面执行出现错误','计算失败：','高风险易混','中高风险易混','中风险易混','风险惩罚','家长必读','访问码：','输入访问码','请输入访问码 ln2025','请重新输入 ln2025','模块缓存隔离与运行时校验版'];
for(const f of ['index.html','diagnostics.html','assets/rules.v2954fix3.js','assets/render.v2954fix3.js','assets/app.v2954fix3.js','assets/export.v2954fix3.js','assets/selection.v2954fix3.js']){
  const text=read(f);
  for(const b of banned){assert(!text.includes(b), `${f} contains banned wording: ${b}`)}
}
console.log('V2.9.5.4 fix3 compatibility validation passed');
