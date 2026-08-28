import{readFile}from'node:fs/promises';
const [page,entry,regionUi,entityUi,resolver,headers]=await Promise.all([
 readFile('tongxue/index.html','utf8'),readFile('tongxue/app/tongxue-performance-v158.js','utf8'),readFile('tongxue/app/tongxue-region-ui-v152.js','utf8'),readFile('tongxue/app/tongxue-school-entity-ui-v152.js','utf8'),readFile('tongxue/data/school-name-resolver-v150.js','utf8'),readFile('_headers','utf8')
]);
const failures=[],check=(label,passed)=>{if(!passed)failures.push(label);},count=(source,value)=>source.split(value).length-1;
const build='<meta name="tongxue-build" content="tongxue-v158-cache-recovery-20260725">';
const importMap='<script type="importmap">{"imports":{"/tongxue/data/school-name-resolver.js":"/tongxue/data/school-name-resolver-v150.js?v=150","/tongxue/data/school-entities-v130.js":"/tongxue/data/school-entities-v150.js?v=150"}}</script>';
check('页面版本',page.includes('同学你好 v1.5.8')&&page.includes('tongxue-performance-v158.js?v=158'));
check('品牌 Logo',page.includes('tongxue-logo-primary-v1.webp')&&page.includes('alt="同学你好"'));
check('页面构建标识唯一',count(page,build)===1);
check('导入映射唯一',count(page,importMap)===1);
check('导入映射 resolver',page.includes('/tongxue/data/school-name-resolver.js')&&page.includes('/tongxue/data/school-name-resolver-v150.js?v=150'));
check('导入映射 entities',page.includes('/tongxue/data/school-entities-v130.js')&&page.includes('/tongxue/data/school-entities-v150.js?v=150'));
check('入口先安装地域层',entry.indexOf('installRegionUi();')<entry.indexOf("await import('./tongxue-performance-v112.js?v=156')"));
check('入口构建校验',entry.includes('pageBuild!==EXPECTED_BUILD'));
check('地域不自动首项',regionUi.includes('地区搜索只用于缩小范围，不会自动选择学校')&&!regionUi.includes('candidates[0]'));
check('地域文案精简',regionUi.includes('<span class="badge">地区</span>')&&regionUi.includes("renderSchoolSection('分校和校区',entities)")&&!regionUi.includes('地域筛选')&&!regionUi.includes('正式高校'));
check('输入变化清除旧结果',regionUi.includes('clearStaleResult(result)'));
check('键盘操作',regionUi.includes("event.key==='ArrowDown'")&&regionUi.includes("event.key==='Enter'"));
check('按钮点击地域查询',regionUi.includes("button.addEventListener('click'"));
check('无候选 MutationObserver',!regionUi.includes('MutationObserver'));
check('地域 JSON 版本化',resolver.includes('school-search-index.20260617-v150.json'));
check('JSON 构建标识校验',resolver.includes('payload?.buildId!==TONGXUE_V150_BUILD_ID'));
check('HTML 不缓存',headers.includes('/tongxue/index.html')&&headers.includes('must-revalidate'));
check('版本资源长期缓存',headers.includes('/tongxue/data/school-search-index.20260617-v150.json')&&headers.includes('/tongxue/app/tongxue-performance-v158.js')&&headers.includes('immutable'));
check('实体层使用 v150 数据',entityUi.includes('school-entities-v150.js?v=150'));
check('实体内容隔离',entityUi.includes('不会混入其他校区或母体学校评价')&&entityUi.includes("url.searchParams.set('entity',entity.entityId)"));
console.log('TONGXUE_REGION_UI_V154_RESULTS '+JSON.stringify({failures}));if(failures.length)process.exitCode=1;
