const fs=require('fs');
const path=require('path');
const root=process.cwd();
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){return fs.existsSync(path.join(root,p));}
function list(dir){return fs.readdirSync(path.join(root,dir)).filter(f=>fs.statSync(path.join(root,dir,f)).isFile());}
const index=read('fenxi/index.html');
const assets=list('fenxi/assets').filter(f=>/\.js$/.test(f));
const loaded=[...index.matchAll(/assets\/([^"']+\.js)/g)].map(m=>m[1]);
const loadedSet=new Set(loaded);
const notLoaded=assets.filter(f=>!loadedSet.has(f));
const allJs=assets.map(f=>[f,read('fenxi/assets/'+f)]);
function refs(name){return allJs.filter(([f,c])=>f!==name&&c.includes(name.replace(/\.js$/,''))).map(x=>x[0]);}
const safeRemove=[]; const keepCompat=[]; const review=[];
for(const f of notLoaded){
  const r=refs(f);
  if(/v29(4|5|6|7)/.test(f) || /v298\.js$/.test(f)) keepCompat.push({file:f,reason:'历史版本/兼容资产，未在当前入口加载，但可能用于回滚或排查'});
  else if(!r.length) review.push({file:f,reason:'当前入口未加载且未发现文本引用，删除前仍需人工确认'});
  else review.push({file:f,reason:'未在入口加载，但被 '+r.slice(0,4).join('、')+' 引用'});
}
const report={
  loadedCount:loaded.length,
  assetJsCount:assets.length,
  notLoadedCount:notLoaded.length,
  policy:'本脚本只审计，不自动删除；删除必须满足入口无引用、模块无调用、无 localStorage/导出/诊断/访问保护依赖。',
  SAFE_REMOVE:safeRemove,
  KEEP_COMPAT:keepCompat.slice(0,80),
  REVIEW_MANUAL:review.slice(0,80)
};
console.log(JSON.stringify(report,null,2));
