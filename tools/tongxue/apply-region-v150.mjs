import{readFile,writeFile,mkdir}from'node:fs/promises';
import{gunzipSync}from'node:zlib';
const BUILD='tongxue-v150-region-20260617';
await mkdir('tongxue/data',{recursive:true});
await writeFile('tongxue/data/school-name-resolver-v150.js',gunzipSync(Buffer.from('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','base64')));
await patchPage();
await patchChangelog();
await patchDirectoryCheck();
await patchShareCheck();
await patchHeaders();
console.log('TONGXUE_V150_MIGRATION_APPLIED '+BUILD);
async function patchPage(){
 let s=await readFile('tongxue/index.html','utf8');
 s=s.replace('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">','<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="tongxue-build" content="'+BUILD+'">');
 s=s.replace('<link rel="canonical" href="https://gaokao.powers.org.cn/tongxue/">','<link rel="canonical" href="https://gaokao.powers.org.cn/tongxue/">\n<script type="importmap">{"imports":{"/tongxue/data/school-name-resolver.js":"/tongxue/data/school-name-resolver-v150.js?v=150","/tongxue/data/school-entities-v130.js":"/tongxue/data/school-entities-v150.js?v=150"}}</script>');
 s=s.replace('简称、拼音首字母、轻微错别字、分校和招生校区也能识别。','学校名称、拼音首字母、城市或省份都可以搜索；分校和招生校区会单独标明。');
 s=s.replace('placeholder="输入学校、校区或首字母，如：哈工威 / hgw"','placeholder="输入学校、首字母或城市，如：hgw / 深圳"');
 s=s.replace('<button class="quick-example" type="button" data-example="dgpj">dgpj</button>','<button class="quick-example" type="button" data-example="深圳">深圳</button>');
 s=s.replace('同学你好 v1.4.1 · 更新于 2026-07-20 · 查看更新记录','同学你好 v1.5.0 · 更新于 2026-07-20 · 查看更新记录');
 s=s.replace('./app/tongxue-performance-v141.js?v=141','./app/tongxue-performance-v150.js?v=150');
 if(!s.includes(BUILD)||!s.includes('tongxue-performance-v150.js?v=150'))throw new Error('v1.5.0 页面迁移失败');
 await writeFile('tongxue/index.html',s);
}
async function patchChangelog(){
 let s=await readFile('tongxue/changelog.html','utf8');
 s=s.replace('<article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.4.1 · 输入流畅性与代码语义修复</h2></div>','<article class="release"><div class="release-head"><h2>v1.4.1 · 输入流畅性与代码语义修复</h2>');
 const marker='    <article class="release"><div class="release-head"><h2>v1.4.1 · 输入流畅性与代码语义修复</h2>';
 const article='    <article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.5.0 · 省份与城市筛选</h2></div><time class="date">2026-07-20</time></div><ul><li>从教育部 2026 普通高校 XLS 的省级分组和所在地生成 2,952 所学校的省份、城市 JSON，不根据校名猜地域。</li><li>输入城市时列出当地正式高校和单独维护的分校/校区；输入省份时先按城市分组，避免手机端一次堆叠过多学校。</li><li>支持“广东 深圳”“辽宁 科技”等地域组合筛选；地域结果必须由用户选择具体学校，不按排名、热度或分数线自动进入第一项。</li><li>新增版本化 resolver、实体表和地域索引，页面校验 build ID 并约束缓存，避免手机与 PC 加载新旧资源混装。</li><li>输入改变时立即清除旧查询结果，原有 hgw、dgpj、lkd、lnkj 和分校实体隔离规则继续保留。</li></ul></article>\n';
 if(!s.includes('v1.5.0'))s=s.replace(marker,article+marker);
 if(!s.includes('v1.5.0 · 省份与城市筛选'))throw new Error('v1.5.0 更新记录迁移失败');
 await writeFile('tongxue/changelog.html',s);
}
async function patchDirectoryCheck(){
 const s=`import { readFile, readdir } from 'node:fs/promises';
const failures=[];
const requireText=(content,value,label)=>{if(!content.includes(value))failures.push(label);};
const [page,changelog,legacy,home,share,resolver,wrapper,rootFiles]=await Promise.all([
 readFile('tongxue/index.html','utf8'),readFile('tongxue/changelog.html','utf8'),readFile('tongxue.html','utf8'),readFile('index.html','utf8'),readFile('tongxue/share/tongxue-share-v130.js','utf8'),readFile('tongxue/data/school-name-resolver-v150.js','utf8'),readFile('tongxue/app/tongxue-performance-v150.js','utf8'),readdir('.')
]);
requireText(page,'<title>同学你好 - 看看学长学姐怎么说</title>','页面标题');
requireText(page,'./app/tongxue-performance-v150.js?v=150','页面入口');
requireText(page,'同学你好 v1.5.0 · 更新于 2026-07-20','页面版本');
requireText(page,'tongxue-v150-region-20260617','页面构建标识');
requireText(page,'/tongxue/data/school-name-resolver-v150.js?v=150','resolver 导入映射');
requireText(page,'/tongxue/data/school-entities-v150.js?v=150','实体导入映射');
requireText(page,'href="./changelog.html"','更新记录链接');
requireText(page,'城市或省份','地域说明');
requireText(page,'data-example="hgw"','hgw 快捷示例');
requireText(page,'data-example="深圳"','深圳快捷示例');
requireText(page,'https://gaokao.powers.org.cn/tongxue/','canonical');
requireText(changelog,'v1.5.0 · 省份与城市筛选','更新记录 v1.5.0');
requireText(changelog,'v1.4.1 · 输入流畅性与代码语义修复','更新记录 v1.4.1');
if(!(changelog.indexOf('v1.5.0')<changelog.indexOf('v1.4.1')&&changelog.indexOf('v1.4.1')<changelog.indexOf('v1.4.0')))failures.push('更新记录未按倒序排列');
requireText(wrapper,"installShareMetadataStabilizer('v1.5.0')",'运行时版本');
requireText(wrapper,"tongxue-performance-v112.js?v=150",'核心运行时缓存版本');
requireText(home,'href="/tongxue/"','首页导航');
requireText(legacy,"new URL('/tongxue/',location.origin)",'旧入口目标');
if(home.includes('./tongxue.html'))failures.push('首页仍引用旧入口');
if(share.includes('/tongxue.html')||!share.includes("url.pathname='/tongxue/'"))failures.push('分享链接未迁移');
if(!resolver.includes('school-search-index.20260617-v150.json'))failures.push('地域索引路径未版本化');
if(resolver.includes('Intl.Collator')||resolver.includes('createSchoolInitialCodes'))failures.push('浏览器运行时仍在计算拼音首字母');
if(!resolver.includes('initialBucketIndex')||resolver.includes('initialPrefixIndex'))failures.push('首字母索引不是有限两字母桶');
const scattered=rootFiles.filter(name=>/^tongxue-.*\.js$/.test(name)||/^school-search-index.*\.json$/.test(name)||name==='school-name-resolver.js'||name==='school-name-index.generated.json');
if(scattered.length)failures.push('根目录残留：'+scattered.join(','));
console.log('TONGXUE_DIRECTORY_RESULTS '+JSON.stringify({failures}));if(failures.length)process.exitCode=1;`;
 await writeFile('tools/tongxue/verify-directory.mjs',s);
}
async function patchShareCheck(){
 let s=await readFile('tools/tongxue/verify-share.mjs','utf8');
 s=s.replaceAll('tongxue-performance-v141.js','tongxue-performance-v150.js').replaceAll('school-entities-v130.js','school-entities-v150.js').replaceAll('school-entities-v130.mjs','school-entities-v150.mjs');
 s=s.replace("from'../data/school-entities-v150.js'","from'./school-entities-v150.mjs'");
 s=s.replace("html.includes('同学你好 v1.4.1')&&html.includes('./app/tongxue-performance-v141.js?v=141')","html.includes('同学你好 v1.5.0')&&html.includes('./app/tongxue-performance-v150.js?v=150')");
 s=s.replace("wrapper.includes('tongxue-performance-v112.js?v=141')","wrapper.includes('tongxue-performance-v112.js?v=150')");
 await writeFile('tools/tongxue/verify-share.mjs',s);
}
async function patchHeaders(){
 const s=`/ln-rank/js/*
  Content-Type: application/javascript; charset=utf-8
/ln-rank/css/*
  Content-Type: text/css; charset=utf-8
/tongxue/
  Cache-Control: no-cache, max-age=0, must-revalidate
/tongxue/index.html
  Cache-Control: no-cache, max-age=0, must-revalidate
/tongxue/app/tongxue-performance-v150.js
  Cache-Control: public, max-age=31536000, immutable
/tongxue/app/tongxue-region-ui-v150.js
  Cache-Control: public, max-age=31536000, immutable
/tongxue/app/tongxue-school-entity-ui-v150.js
  Cache-Control: public, max-age=31536000, immutable
/tongxue/data/school-name-resolver-v150.js
  Cache-Control: public, max-age=31536000, immutable
/tongxue/data/school-entities-v150.js
  Cache-Control: public, max-age=31536000, immutable
/tongxue/data/school-search-index.20260617-v150.json
  Cache-Control: public, max-age=31536000, immutable
`;
 await writeFile('_headers',s);
}
