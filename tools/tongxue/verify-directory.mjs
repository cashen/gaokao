import { readFile, readdir } from 'node:fs/promises';

const failures=[];
const requireText=(content,value,label)=>{if(!content.includes(value))failures.push(label);};
const [page,changelog,legacy,home,share,resolver,wrapper,rootFiles]=await Promise.all([
  readFile('tongxue/index.html','utf8'),
  readFile('tongxue/changelog.html','utf8'),
  readFile('tongxue.html','utf8'),
  readFile('index.html','utf8'),
  readFile('tongxue/share/tongxue-share-v130.js','utf8'),
  readFile('tongxue/data/school-name-resolver.js','utf8'),
  readFile('tongxue/app/tongxue-performance-v141.js','utf8'),
  readdir('.')
]);
requireText(page,'<title>同学你好 - 看看学长学姐怎么说</title>','页面标题');
requireText(page,'./app/tongxue-performance-v141.js?v=141','页面入口');
requireText(page,'同学你好 v1.4.1 · 更新于 2026-07-20','页面版本');
requireText(page,'href="./changelog.html"','更新记录链接');
requireText(page,'拼音首字母','首字母说明');
requireText(page,'data-example="hgw"','hgw 快捷示例');
requireText(page,'data-example="dgpj"','dgpj 快捷示例');
requireText(page,'https://gaokao.powers.org.cn/tongxue/','canonical');
requireText(changelog,'<title>同学你好 - 更新记录</title>','更新记录标题');
requireText(changelog,'v1.4.1 · 输入流畅性与代码语义修复','更新记录 v1.4.1');
requireText(changelog,'v1.4.0 · 拼音首字母联想','更新记录 v1.4.0');
requireText(changelog,'v1.3.0 · 分校与校区实体隔离','更新记录 v1.3.0');
requireText(changelog,'v1.2.0 · 学校体验画像','更新记录 v1.2.0');
if(!(changelog.indexOf('v1.4.1')<changelog.indexOf('v1.4.0')&&changelog.indexOf('v1.4.0')<changelog.indexOf('v1.3.0')&&changelog.indexOf('v1.3.0')<changelog.indexOf('v1.2.0')))failures.push('更新记录未按倒序排列');
requireText(wrapper,"installShareMetadataStabilizer('v1.4.1')",'运行时版本');
requireText(wrapper,"tongxue-performance-v112.js?v=141",'核心运行时缓存版本');
requireText(home,'href="/tongxue/"','首页导航');
requireText(home,'首页 v1.0.2 · 更新于 2026-07-20','首页版本');
requireText(legacy,"new URL('/tongxue/',location.origin)",'旧入口目标');
requireText(legacy,'target.search=location.search','旧入口查询参数');
requireText(legacy,'target.hash=location.hash','旧入口 hash');
requireText(legacy,'location.replace(target.href)','旧入口 replace');
if(home.includes('./tongxue.html'))failures.push('首页仍引用旧入口');
if(share.includes('/tongxue.html')||!share.includes("url.pathname='/tongxue/'"))failures.push('分享链接未迁移');
if(!resolver.includes("new URL('./school-search-index.20260617.json', import.meta.url).href"))failures.push('高校索引路径未迁移');
if(resolver.includes('school-pinyin-initials-v140.js')||resolver.includes('school-pinyin-initials-v141.js')||resolver.includes('Intl.Collator')||resolver.includes('createSchoolInitialCodes'))failures.push('浏览器运行时仍在计算拼音首字母');
if(!resolver.includes('initialBucketIndex')||resolver.includes('initialPrefixIndex'))failures.push('首字母索引不是有限两字母桶');
const scattered=rootFiles.filter(name=>/^tongxue-.*\.js$/.test(name)||/^school-search-index.*\.json$/.test(name)||name==='school-name-resolver.js'||name==='school-name-index.generated.json');
if(scattered.length)failures.push('根目录残留：'+scattered.join(','));
console.log('TONGXUE_DIRECTORY_RESULTS '+JSON.stringify({failures}));
if(failures.length)process.exitCode=1;
