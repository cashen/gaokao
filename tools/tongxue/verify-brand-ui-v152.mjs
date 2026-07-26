import{readFile,stat}from'node:fs/promises';
const [page,entry,copy,portrait,headers,primary,source]=await Promise.all([
 readFile('tongxue/index.html','utf8'),
 readFile('tongxue/app/tongxue-performance-v158.js','utf8'),
 readFile('tongxue/app/tongxue-copy-v152.js','utf8'),
 readFile('tongxue/portrait/tongxue-school-portrait-v121.js','utf8'),
 readFile('_headers','utf8'),
 readFile('tongxue/assets/brand/tongxue-logo-primary-v1.webp'),
 readFile('tongxue/assets/brand/source/tongxue-logo-concept-original-v1.webp')
]);
const [primaryStat,sourceStat]=await Promise.all([
 stat('tongxue/assets/brand/tongxue-logo-primary-v1.webp'),
 stat('tongxue/assets/brand/source/tongxue-logo-concept-original-v1.webp')
]);
const failures=[],check=(label,passed)=>{if(!passed)failures.push(label);},count=(value,needle)=>value.split(needle).length-1;
check('页面版本',page.includes('同学你好 v1.5.8')&&page.includes('./app/tongxue-performance-v158.js?v=158'));
check('品牌构建标识',count(page,'<meta name="tongxue-build" content="tongxue-v158-cache-recovery-20260725">')===1);
check('隐藏主标题唯一',count(page,'<h1 class="sr-only">同学你好</h1>')===1);
check('Logo 首页链接',page.includes('class="hero-logo-link" href="/tongxue/" aria-label="返回同学你好首页"'));
check('Logo 图片语义',page.includes('class="hero-logo"')&&page.includes('src="./assets/brand/tongxue-logo-primary-v1.webp"')&&page.includes('width="560" height="260"')&&page.includes('alt="同学你好"')&&page.includes('fetchpriority="high"'));
check('精简首屏文案',page.includes('class="hero-title">找学校，看看大家怎么说')&&page.includes('汇总公开评论，帮你了解学习、生活和就业体验'));
check('精简输入',page.includes('placeholder="输入学校、简称或地区"')&&page.includes('>看同学怎么说</button>'));
check('桌面 Logo 尺寸',page.includes('width:clamp(330px,34vw,430px)'));
check('平板 Logo 尺寸',page.includes('@media(min-width:701px) and (max-width:1023px)')&&page.includes('width:clamp(280px,42vw,350px)'));
check('手机 Logo 尺寸',page.includes('width:clamp(190px,61vw,245px)'));
check('手机搜索纵向',page.includes('.search-row{display:grid;grid-template-columns:1fr;gap:10px}'));
check('手机输入不缩放',page.includes('.search-input{height:54px;font-size:16px}'));
check('矮屏适配',page.includes('@media(max-width:700px) and (max-height:700px)'));
check('结果后收敛 Hero',page.includes('body:has(#result:not(:empty)) .hero')&&page.includes('body:has(#result:not(:empty)) .hero-logo'));
check('运行时构建校验',entry.includes("EXPECTED_BUILD='tongxue-v158-cache-recovery-20260725'")&&entry.includes("tongxue-performance-v112.js?v=156")&&entry.includes("family-shell.v3964_1.js?v=3964_1"));
check('运行时版本',entry.includes("installShareMetadataStabilizer('v1.5.8')")&&entry.includes("pageVersion:'v1.5.8'"));
check('无副作用画像入口',entry.includes("tongxue-school-portrait-v121.js?v=156")&&!entry.includes('tongxue-school-portrait-v120.js'));
check('画像不覆盖首页',!portrait.includes('applyPageCopy')&&!portrait.includes('stabilizeButtonCopy')&&!portrait.includes('document.title')&&!portrait.includes('.hero p')&&!portrait.includes('input.placeholder')&&!portrait.includes("querySelectorAll('.version')"));
check('画像能力保留',portrait.includes('installPortraitStyles()')&&portrait.includes('fetchPortrait')&&portrait.includes('renderPortrait('));
check('文案动态归一',copy.includes("button.textContent='看同学怎么说'")&&copy.includes("node.textContent='学校名单已准备好'")&&copy.includes("text.textContent.replace(/^已识别：/,'已找到：')"));
check('品牌缓存',headers.includes('/tongxue/assets/brand/*')&&headers.includes('/tongxue/app/tongxue-performance-v158.js')&&headers.includes('/tongxue/portrait/tongxue-school-portrait-v121.js')&&headers.includes('immutable'));
check('首页 Logo WebP 签名',isWebp(primary));
check('概念图 WebP 签名',isWebp(source));
check('页面 Logo 大小',primaryStat.size>5000&&primaryStat.size<50000);
check('概念原图大小',sourceStat.size>3000&&sourceStat.size<50000);
check('无过度承诺',!page.includes('轻微错别字')&&!page.includes('都可以搜索')&&!page.includes('看看学长学姐怎么说')&&!portrait.includes('轻微错别字')&&!portrait.includes('看看学长学姐怎么说'));
check('不恢复 v1.6.0',!page.includes('v1.6.0')&&!page.includes('高频讨论信号')&&!page.includes('报考前核验清单')&&!page.includes('共识与分歧'));
console.log('TONGXUE_BRAND_UI_V154_RESULTS '+JSON.stringify({primaryBytes:primaryStat.size,sourceBytes:sourceStat.size,failures}));
if(failures.length)process.exitCode=1;
function isWebp(buffer){return buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';}
