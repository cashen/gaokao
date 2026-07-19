import { readFile, readdir } from 'node:fs/promises';

const failures=[];
const requireText=(content,value,label)=>{if(!content.includes(value))failures.push(label);};
const [page,legacy,home,share,resolver,rootFiles]=await Promise.all([
  readFile('tongxue/index.html','utf8'),
  readFile('tongxue.html','utf8'),
  readFile('index.html','utf8'),
  readFile('tongxue/share/tongxue-share-v113.js','utf8'),
  readFile('tongxue/data/school-name-resolver.js','utf8'),
  readdir('.')
]);
requireText(page,'<title>同学你好 - 看看学长学姐怎么说</title>','页面标题');
requireText(page,'./app/tongxue-performance-v120.js?v=121','页面入口');
requireText(page,'同学你好 v1.2.1 · 更新于 2026-07-20','页面版本');
requireText(page,'https://gaokao.powers.org.cn/tongxue/','canonical');
requireText(home,'href="/tongxue/"','首页导航');
requireText(home,'首页 v1.0.2 · 更新于 2026-07-20','首页版本');
requireText(legacy,"new URL('/tongxue/',location.origin)",'旧入口目标');
requireText(legacy,'target.search=location.search','旧入口查询参数');
requireText(legacy,'target.hash=location.hash','旧入口 hash');
requireText(legacy,'location.replace(target.href)','旧入口 replace');
if(home.includes('./tongxue.html'))failures.push('首页仍引用旧入口');
if(share.includes('/tongxue.html')||!share.includes("url.pathname='/tongxue/'"))failures.push('分享链接未迁移');
if(!resolver.includes("new URL('./school-search-index.20260617.json', import.meta.url).href"))failures.push('高校索引路径未迁移');
const scattered=rootFiles.filter(name=>/^tongxue-.*\.js$/.test(name)||/^school-search-index.*\.json$/.test(name)||name==='school-name-resolver.js'||name==='school-name-index.generated.json');
if(scattered.length)failures.push('根目录残留：'+scattered.join(','));
console.log('TONGXUE_DIRECTORY_RESULTS '+JSON.stringify({failures}));
if(failures.length)process.exitCode=1;
