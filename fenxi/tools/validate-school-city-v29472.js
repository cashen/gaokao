#!/usr/bin/env node
/* V2.9.4.7.2 city validation: verify entry refs and official school city coverage. */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function readJson(p){ return JSON.parse(fs.readFileSync(path.join(root,p),'utf8')); }
function fail(msg){ console.error('[FAIL]', msg); process.exitCode = 1; }
function ok(msg){ console.log('[OK]', msg); }

const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
const activeJs = index.includes('assets/app.v29473.js') ? 'assets/app.v29473.js' : 'assets/app.v29472.js';
const activeCss = index.includes('assets/app.v29473.css') ? 'assets/app.v29473.css' : 'assets/app.v29472.css';
if(!index.includes(activeJs)) fail('index.html 未引用当前版本 app JS');
if(!index.includes(activeCss)) fail('index.html 未引用当前版本 app CSS');
if(!index.includes('targetCities') || !index.includes('cityMode')) fail('index.html 缺少城市偏好控件');
if(!index.includes('confusable-major-model.v29462.js')) fail('易混提醒侧过滤模型引用丢失');
if(!index.includes('major-name-model.v2946.js')) fail('专业名模型引用丢失');

const geo = readJson('data/school_geo_model/school_geo_reference_v29471.json');
const items = geo.items || [];
if(!items.length) fail('school_geo_reference_v29471.json items 为空');
let missProvince=0, missCity=0, missRegion=0, missSource=0;
const schoolMap = new Map();
for(const x of items){
  if(!x.school_name) fail('存在 school_name 为空的学校记录');
  if(!x.province || x.province === '待核验') missProvince++;
  if(!x.city || x.city === '待核验') missCity++;
  if(!x.region || x.region === '待核验') missRegion++;
  if(!x.source_method && !x.source_name && !x.source_file) missSource++;
  schoolMap.set(x.school_name, x);
}
if(missProvince) fail(`province 缺失 ${missProvince} 条`);
if(missCity) fail(`city 缺失 ${missCity} 条`);
if(missRegion) fail(`region 缺失 ${missRegion} 条`);
if(missSource) fail(`source 信息缺失 ${missSource} 条`);

const manifest = readJson('data/manifest.json');
let total=0;
const schools = new Set();
for(const c of manifest.chunks || []){
  const chunk = readJson(c.file);
  const records = chunk.records || [];
  total += records.length;
  for(const r of records) schools.add(r.school);
}
if(total !== manifest.totalRecords) fail(`manifest totalRecords=${manifest.totalRecords} 但 chunks 实际=${total}`);
const unmatched = [...schools].filter(s=>!schoolMap.has(s));
if(unmatched.length) fail(`投档学校未匹配 school_geo_model：${unmatched.slice(0,10).join('、')} 等 ${unmatched.length} 所`);

const js = fs.readFileSync(path.join(root,activeJs),'utf8');
['geoDisplayV29472','selectedCitiesV29472','cityMatchesV29472','renderGeoHintV29472','populateCityDatalistV29472'].forEach(fn=>{
  if(!js.includes(`function ${fn}`)) fail(`app.v29472.js 缺少 ${fn}`);
});
if(/女孩不适合|男孩适合|男孩更适合|女孩更适合/.test(js)) fail('发现性别刻板推荐文案');

if(!process.exitCode){
  ok(`school_geo_model 城市覆盖通过：${items.length} 所，投档学校 ${schools.size} 所，投档记录 ${total} 条`);
  ok(`入口引用 ${activeJs} / ${activeCss}，通过`);
  ok('易混专业 V2.9.4.6.2 提醒侧过滤引用仍保留');
}
