import { readFile, writeFile } from 'node:fs/promises';

const BUILD='tongxue-v160-evidence-20260720';
const VERSION='v1.6.0';

await copyEvidenceCore();
await updateBaseApi();
await updateEntityApi();
await updatePage();
await updateChangelog();
await updateHeaders();
await updateDirectoryTest();
await updateRegionUiTest();
await updateShareTest();
await updatePortraitTest();

console.log('TONGXUE_V160_MIGRATION '+JSON.stringify({build:BUILD,version:VERSION,ok:true}));

async function copyEvidenceCore(){
  const source=await readFile('functions/_lib/tongxue-school-portrait-base-v160.js','utf8');
  required(source,"version:'v1.6.0'",'v160 证据核心版本');
  required(source,'buildEvidenceInterpretation','v160 证据解释');
  await writeFile('functions/_lib/tongxue-school-portrait-core.js',source);
}

async function updateBaseApi(){
  const path='functions/_lib/tongxue-school-portrait-base-v120.js';
  let source=await readFile(path,'utf8');
  source=replaceEither(source,"const API_VERSION = 'v1.2.0';","const API_VERSION = 'v1.6.0';",'底层画像 API 版本');
  if(!source.includes("url.searchParams.set('schema', API_VERSION);")){
    source=replaceOnce(source,"  url.searchParams.set('school', school);\n  return new Request(url.toString(), { method:'GET', headers:{ accept:'application/json' } });","  url.searchParams.set('school', school);\n  url.searchParams.set('schema', API_VERSION);\n  return new Request(url.toString(), { method:'GET', headers:{ accept:'application/json' } });",'底层画像缓存 schema');
  }
  await writeFile(path,source);
}

async function updateEntityApi(){
  const path='functions/api/tongxue-school-portrait.js';
  let source=await readFile(path,'utf8');
  source=replaceEither(source,"const VERSION='v1.3.0';","const VERSION='v1.6.0';",'实体画像 API 版本');
  await writeFile(path,source);
}

async function updatePage(){
  const path='tongxue/index.html';
  let source=await readFile(path,'utf8');
  source=replaceEither(source,'<meta name="tongxue-build" content="tongxue-v150-region-20260617">',`<meta name="tongxue-build" content="${BUILD}">`,'页面 build ID');
  source=replaceEither(source,'学校名称、拼音首字母、城市或省份都可以搜索；分校和招生校区会单独标明。','学校名称、拼音首字母、城市或省份都可以搜索；结果会同时标明样本、共识、分歧和待核验事项。','页面证据说明');
  source=replaceEither(source,'同学你好 v1.5.0 · 更新于 2026-07-20 · 查看更新记录','同学你好 v1.6.0 · 更新于 2026-07-20 · 查看更新记录','页面版本');
  source=replaceEither(source,'./app/tongxue-performance-v150.js?v=150','./app/tongxue-performance-v160.js?v=160','页面入口');
  if(count(source,`<meta name="tongxue-build" content="${BUILD}">`)!==1)throw new Error('页面 build ID 必须恰好出现一次');
  if(count(source,'<script type="importmap">')!==1)throw new Error('页面 import map 必须恰好出现一次');
  await writeFile(path,source);
}

async function updateChangelog(){
  const path='tongxue/changelog.html';
  let source=await readFile(path,'utf8');
  const oldCurrent='<article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.5.0 · 省份与城市筛选</h2></div><time class="date">2026-07-20</time></div>';
  const oldNormal='<article class="release"><div class="release-head"><div><h2>v1.5.0 · 省份与城市筛选</h2></div><time class="date">2026-07-20</time></div>';
  if(source.includes(oldCurrent))source=source.replace(oldCurrent,oldNormal);
  const marker='  <main class="timeline">\n';
  const release='    <article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.6.0 · 证据解释层</h2></div><time class="date">2026-07-20</time></div><ul><li>在原七维画像上增加高、中、低评分分布与离散程度，区分相对一致、分化明显和样本不足，避免单一平均分制造虚假确定性。</li><li>按近一年与较早样本展示时间有效性和有限趋势，并继续标明认证样本、校区标签和是否只读取了部分评论。</li><li>从公开评论中统计校区、住宿、管理、费用、交通、转专业和就业等讨论信号；只展示提及次数和原评论入口，不把讨论频率冒充官方事实。</li><li>自动生成不超过六项的报考前核验清单，把评论中的焦虑转化为可向招生办、学院和在校生确认的具体问题。</li><li>保留学校名称、首字母、地域筛选、分校实体隔离、原评论和分享能力；不新增统一学校排名，也不让 AI 代替家庭作最终选择。</li></ul></article>\n';
  if(!source.includes('v1.6.0 · 证据解释层'))source=replaceOnce(source,marker,marker+release,'插入 v1.6.0 更新记录');
  if(count(source,'<span class="badge">当前版本</span>')!==1)throw new Error('更新记录当前版本标识必须恰好出现一次');
  await writeFile(path,source);
}

async function updateHeaders(){
  const path='_headers';
  let source=await readFile(path,'utf8');
  const blocks=[
    '/tongxue/app/tongxue-performance-v160.js',
    '/tongxue/portrait/tongxue-school-portrait-v160.js',
    '/tongxue/portrait/tongxue-school-portrait-view-v160.js',
    '/tongxue/portrait/tongxue-school-portrait-style-v160.js'
  ];
  for(const route of blocks){
    if(!source.includes(route))source+=`\n${route}\n  Cache-Control: public, max-age=31536000, immutable`;
  }
  await writeFile(path,source.trimEnd()+'\n');
}

async function updateDirectoryTest(){
  const path='tools/tongxue/verify-directory.mjs';
  let source=await readFile(path,'utf8');
  source=replaceEither(source,"readFile('tongxue/app/tongxue-performance-v150.js','utf8')","readFile('tongxue/app/tongxue-performance-v160.js','utf8')",'目录测试入口文件');
  source=replaceEither(source,"requireText(page,'./app/tongxue-performance-v150.js?v=150','页面入口');","requireText(page,'./app/tongxue-performance-v160.js?v=160','页面入口');",'目录测试页面入口');
  source=replaceEither(source,"requireText(page,'同学你好 v1.5.0 · 更新于 2026-07-20','页面版本');","requireText(page,'同学你好 v1.6.0 · 更新于 2026-07-20','页面版本');",'目录测试页面版本');
  source=replaceEither(source,"requireText(page,'tongxue-v150-region-20260617','页面构建标识');","requireText(page,'tongxue-v160-evidence-20260720','页面构建标识');",'目录测试 build');
  source=replaceEither(source,"requireText(changelog,'v1.5.0 · 省份与城市筛选','更新记录 v1.5.0');","requireText(changelog,'v1.6.0 · 证据解释层','更新记录 v1.6.0');\nrequireText(changelog,'v1.5.0 · 省份与城市筛选','更新记录 v1.5.0');",'目录测试更新记录');
  source=replaceEither(source,"if(!(changelog.indexOf('v1.5.0')<changelog.indexOf('v1.4.1')&&changelog.indexOf('v1.4.1')<changelog.indexOf('v1.4.0')))failures.push('更新记录未按倒序排列');","if(!(changelog.indexOf('v1.6.0')<changelog.indexOf('v1.5.0')&&changelog.indexOf('v1.5.0')<changelog.indexOf('v1.4.1')&&changelog.indexOf('v1.4.1')<changelog.indexOf('v1.4.0')))failures.push('更新记录未按倒序排列');",'目录测试倒序');
  source=replaceEither(source,"requireText(wrapper,\"installShareMetadataStabilizer('v1.5.0')\",'运行时版本');","requireText(wrapper,\"installShareMetadataStabilizer('v1.6.0')\",'运行时版本');",'目录测试运行时版本');
  source=replaceEither(source,"requireText(wrapper,\"tongxue-performance-v112.js?v=150\",'核心运行时缓存版本');","requireText(wrapper,\"tongxue-performance-v112.js?v=160\",'核心运行时缓存版本');",'目录测试核心版本');
  await writeFile(path,source);
}

async function updateRegionUiTest(){
  const path='tools/tongxue/verify-school-region-ui-v150.mjs';
  let source=await readFile(path,'utf8');
  source=replaceEither(source,"readFile('tongxue/app/tongxue-performance-v150.js','utf8')","readFile('tongxue/app/tongxue-performance-v160.js','utf8')",'地域测试入口');
  source=replaceEither(source,"const build='<meta name=\"tongxue-build\" content=\"tongxue-v150-region-20260617\">';","const build='<meta name=\"tongxue-build\" content=\"tongxue-v160-evidence-20260720\">';",'地域测试 build');
  source=replaceEither(source,"check('页面版本',page.includes('同学你好 v1.5.0')&&page.includes('tongxue-performance-v150.js?v=150'));","check('页面版本',page.includes('同学你好 v1.6.0')&&page.includes('tongxue-performance-v160.js?v=160'));",'地域测试页面版本');
  source=replaceEither(source,"await import('./tongxue-performance-v112.js?v=150')","await import('./tongxue-performance-v112.js?v=160')",'地域测试核心版本');
  await writeFile(path,source);
}

async function updateShareTest(){
  const path='tools/tongxue/verify-share.mjs';
  let source=await readFile(path,'utf8');
  source=replaceEither(source,"readFile('tongxue/app/tongxue-performance-v150.js','utf8')","readFile('tongxue/app/tongxue-performance-v160.js','utf8')",'分享测试入口');
  source=replaceEither(source,"pageVersion:html.includes('同学你好 v1.5.0')&&html.includes('./app/tongxue-performance-v150.js?v=150')","pageVersion:html.includes('同学你好 v1.6.0')&&html.includes('./app/tongxue-performance-v160.js?v=160')",'分享测试页面版本');
  source=replaceEither(source,"keepsQueryRuntime:wrapper.includes('tongxue-performance-v112.js?v=150')","keepsQueryRuntime:wrapper.includes('tongxue-performance-v112.js?v=160')",'分享测试核心版本');
  await writeFile(path,source);
}

async function updatePortraitTest(){
  const path='tools/tongxue/verify-portrait.mjs';
  let source=await readFile(path,'utf8');
  source=replaceEither(source,"response:first.status===200&&first.payload.ok&&first.payload.version==='v1.3.0'","response:first.status===200&&first.payload.ok&&first.payload.version==='v1.6.0'",'画像测试 API 版本');
  source=replaceEither(source,"shape:first.payload.dimensions?.length===7&&Array.isArray(first.payload.questions)&&Array.isArray(first.payload.campuses)","shape:first.payload.dimensions?.length===7&&Array.isArray(first.payload.questions)&&Array.isArray(first.payload.campuses)&&first.payload.evidence?.version==='v1.6.0'&&Array.isArray(first.payload.evidence?.checklist)",'画像测试证据结构');
  source=replaceEither(source,"if(!(result.status===200&&result.payload.ok&&result.payload.dimensions?.length===7))failures.push('live:'+school);","if(!(result.status===200&&result.payload.ok&&result.payload.dimensions?.length===7&&result.payload.evidence?.version==='v1.6.0'))failures.push('live:'+school);",'画像实时证据结构');
  await writeFile(path,source);
}

function replaceEither(source,oldValue,newValue,label){
  if(source.includes(newValue))return source;
  return replaceOnce(source,oldValue,newValue,label);
}
function replaceOnce(source,oldValue,newValue,label){
  const matches=count(source,oldValue);
  if(matches!==1)throw new Error(`${label}：预期 1 处，实际 ${matches} 处`);
  return source.replace(oldValue,newValue);
}
function required(source,value,label){if(!source.includes(value))throw new Error(`${label} 缺失`);}
function count(source,value){return source.split(value).length-1;}
