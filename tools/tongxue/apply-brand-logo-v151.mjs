import{readFile,writeFile}from'node:fs/promises';

const BUILD='tongxue-v151-brand-20260720';
await updatePage();
await updateChangelog();
await updateHeaders();
await updateDirectoryTest();
await updateRegionTest();
await updateShareTest();
await finalizeWorkflow();
console.log('TONGXUE_BRAND_V151_MIGRATION '+JSON.stringify({build:BUILD,ok:true}));

async function updatePage(){
 const path='tongxue/index.html';
 let source=await readFile(path,'utf8');
 source=replaceOne(source,'<meta name="tongxue-build" content="tongxue-v150-region-20260617">',`<meta name="tongxue-build" content="${BUILD}">`,'页面 build');
 source=replaceOne(source,':root{--bg:#f6f8f7;--card:#fff;--primary:#155e75;--primary-hover:#0f4a5c;--text:#17242d;--muted:#60717a;--border:#dce6e2;--soft:#e8f3f5;--warm:#fff6ed;--warm-border:#f0d4bc;--warm-text:#8d4b20;--danger:#9a4336;--danger-bg:#fff0ec;--danger-border:#efc5ba;--shadow:0 14px 38px rgba(20,40,50,.07)}',':root{--bg:#fff;--card:#fff;--primary:#172d67;--primary-hover:#102352;--brand-teal:#45b99a;--brand-teal-soft:#eaf7f3;--text:#17242d;--muted:#60717a;--border:#dce6e2;--soft:#eaf7f3;--warm:#fff6ed;--warm-border:#f0d4bc;--warm-text:#8d4b20;--danger:#9a4336;--danger-bg:#fff0ec;--danger-border:#efc5ba;--shadow:0 14px 38px rgba(20,40,50,.07)}','品牌色');
 source=replaceOne(source,'button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{box-shadow:0 0 0 3px rgba(21,94,117,.18);border-radius:8px}','button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{box-shadow:0 0 0 3px rgba(69,185,154,.22);border-radius:8px}','焦点色');
 source=replaceOne(source,'.brand{color:var(--primary);font-weight:850;font-size:18px}.back-home{color:var(--muted);font-size:13px;font-weight:750;text-decoration:none}.back-home:hover{color:var(--primary)}','.brand{color:var(--primary);font-weight:850;font-size:18px;text-decoration:none}.brand:hover{color:var(--brand-teal)}.back-home{color:var(--muted);font-size:13px;font-weight:750;text-decoration:none}.back-home:hover{color:var(--primary)}','顶部品牌');
 source=replaceOne(source,'.hero{text-align:center;padding:44px 0 30px}.hero h1{font-size:42px;line-height:1.15;margin:15px 0 10px}.hero p{max-width:730px;margin:0 auto;color:var(--muted);font-size:17px;line-height:1.75}.hero p span{display:block;font-size:14px;margin-top:3px}',`.hero{text-align:center;padding:46px 0 34px}.hero-logo-link{display:inline-flex;align-items:center;justify-content:center;border-radius:22px}.hero-logo{display:block;width:clamp(330px,34vw,430px);height:auto}.hero-copy{margin-top:18px}.hero-title{margin:0;color:var(--text);font-size:20px;font-weight:850;line-height:1.4}.hero-description{max-width:620px;margin:5px auto 0;color:var(--muted);font-size:14px;line-height:1.7}`,'Hero 样式');
 source=replaceOne(source,'.search-box{max-width:760px;margin:26px auto 0;text-align:left}.search-row{display:flex;gap:12px;align-items:flex-start}.input-wrap{position:relative;flex:1;min-width:0}','.search-box{max-width:760px;margin:24px auto 0;text-align:left}.search-row{display:flex;gap:12px;align-items:flex-start}.input-wrap{position:relative;flex:1;min-width:0}','搜索间距');
 source=replaceOne(source,'.search-input{width:100%;height:58px;border:1px solid var(--border);border-radius:16px;padding:0 48px 0 20px;font-size:18px;background:#fff;color:var(--text)}.search-input:focus{border-color:var(--primary)}','.search-input{width:100%;height:58px;border:1px solid var(--border);border-radius:16px;padding:0 48px 0 20px;font-size:18px;background:#fff;color:var(--text)}.search-input:focus{border-color:var(--brand-teal);box-shadow:0 0 0 4px rgba(69,185,154,.14)}','输入焦点');
 source=replaceOne(source,'.quick-examples{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:11px 4px 0;color:var(--muted);font-size:12px}', '.quick-examples{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;margin:11px 4px 0;color:var(--muted);font-size:12px}','快捷示例');
 const oldMobile=/^@media\(max-width:700px\)\{.*\}$/m;
 if(!oldMobile.test(source))throw new Error('手机样式未找到');
 const responsive=`body:has(#result:not(:empty)) .hero{padding-top:22px;padding-bottom:22px}\nbody:has(#result:not(:empty)) .hero-logo{width:clamp(210px,27vw,320px)}\n@media(min-width:701px) and (max-width:1023px){.hero{padding:38px 0 34px}.hero-logo{width:clamp(280px,42vw,350px)}.search-box{max-width:680px}}\n@media(max-width:700px){.wrap{padding:16px 14px calc(18px + env(safe-area-inset-bottom))}.brand{font-size:16px}.hero{padding:22px 0 26px}.hero-logo{width:clamp(190px,61vw,245px)}.hero-copy{margin-top:12px}.hero-title{font-size:18px}.hero-description{max-width:310px;font-size:13px}.search-box{margin-top:18px}.search-row{display:grid;grid-template-columns:1fr;gap:10px}.search-input{height:54px;font-size:16px}.btn{width:100%;height:52px;margin-top:0}.quick-examples{justify-content:center;margin-top:10px}.suggestions{top:62px}.result-shell,.state-card{padding:21px;border-radius:18px}.result-head{display:block}.result-head h2{font-size:26px}.badge{margin-top:12px}.summary-grid,.review-grid,.choice-grid{grid-template-columns:1fr}.insight-card,.review-card{padding:16px}.insight-list li{font-size:15px;line-height:1.75}.review-card-head{align-items:center}.footer{text-align:left}body:has(#result:not(:empty)) .hero{padding-top:16px;padding-bottom:18px}body:has(#result:not(:empty)) .hero-logo{width:clamp(160px,46vw,195px)}}\n@media(max-width:700px) and (max-height:700px){.hero{padding-top:14px;padding-bottom:20px}.hero-logo{width:clamp(175px,52vw,205px)}.hero-copy{margin-top:10px}.search-box{margin-top:15px}}`;
 source=source.replace(oldMobile,responsive);
 source=replaceOne(source,'  <div class="topbar"><div class="brand">同学你好</div><a class="back-home" href="/">← 返回首页</a></div>','  <div class="topbar"><a class="brand" href="/tongxue/" aria-label="返回同学你好首页">同学你好</a><a class="back-home" href="/">← 返回首页</a></div>','顶部结构');
 source=replaceOne(source,'    <h1>同学你好</h1>\n    <p>输入学校名称，看看学长学姐真实聊过的就业发展、学习氛围和校园生活。<span>学校名称、拼音首字母、城市或省份都可以搜索；分校和招生校区会单独标明。</span></p>','    <h1 class="sr-only">同学你好</h1>\n    <a class="hero-logo-link" href="/tongxue/" aria-label="返回同学你好首页">\n      <img class="hero-logo" src="./assets/brand/tongxue-logo-primary-v1.webp" width="560" height="260" alt="同学你好" decoding="async" fetchpriority="high">\n    </a>\n    <div class="hero-copy">\n      <p class="hero-title">看看学长学姐怎么说</p>\n      <p class="hero-description">学校名称、拼音首字母、城市或省份都可以搜索</p>\n    </div>','Hero 结构');
 source=replaceOne(source,'同学你好 v1.5.0 · 更新于 2026-07-20 · 查看更新记录','同学你好 v1.5.1 · 更新于 2026-07-20 · 查看更新记录','页面版本');
 source=replaceOne(source,'<script type="module" src="./app/tongxue-performance-v150.js?v=150"></script>','<script type="module" src="./app/tongxue-performance-v151.js?v=151"></script>','页面入口');
 if(count(source,`<meta name="tongxue-build" content="${BUILD}">`)!==1)throw new Error('页面 build 不唯一');
 if(count(source,'<script type="importmap">')!==1)throw new Error('import map 不唯一');
 await writeFile(path,source);
}

async function updateChangelog(){
 const path='tongxue/changelog.html';
 let source=await readFile(path,'utf8');
 const current='<article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.5.0 · 省份与城市筛选</h2></div><time class="date">2026-07-20</time></div>';
 const normal='<article class="release"><div class="release-head"><div><h2>v1.5.0 · 省份与城市筛选</h2></div><time class="date">2026-07-20</time></div>';
 source=replaceOne(source,current,normal,'旧当前版本');
 const marker='  <main class="timeline">\n';
 const release='    <article class="release"><div class="release-head"><div><span class="badge">当前版本</span><h2>v1.5.1 · 品牌 Logo 与多终端首页</h2></div><time class="date">2026-07-20</time></div><ul><li>将“同学你好”年轻化 Logo 作为首页第一视觉中心，搜索框继续作为第一操作入口。</li><li>保留生成概念图，并新增紧凑裁切、体积优化的正式网页 Logo 资源，全部托管在本站仓库。</li><li>为手机、矮屏手机、平板和桌面分别约束 Logo、留白和搜索布局；查询结果出现后自动收敛 Hero 高度。</li><li>手机端输入框与按钮改为上下排列，输入字号保持 16px，避免中文输入和 iOS 聚焦缩放影响使用。</li><li>学校名称、首字母、地域搜索、分校实体隔离、画像、评论和分享逻辑保持 v1.5.0 行为不变。</li></ul></article>\n';
 source=replaceOne(source,marker,marker+release,'插入更新记录');
 if(count(source,'<span class="badge">当前版本</span>')!==1)throw new Error('当前版本徽标不唯一');
 await writeFile(path,source);
}

async function updateHeaders(){
 const path='_headers';
 let source=await readFile(path,'utf8');
 if(!source.includes('/tongxue/app/tongxue-performance-v151.js'))source+='\n/tongxue/app/tongxue-performance-v151.js\n  Cache-Control: public, max-age=31536000, immutable\n';
 if(!source.includes('/tongxue/assets/brand/*'))source+='\n/tongxue/assets/brand/*\n  Cache-Control: public, max-age=31536000, immutable\n';
 await writeFile(path,source.trimEnd()+'\n');
}

async function updateDirectoryTest(){
 const path='tools/tongxue/verify-directory.mjs';
 let source=await readFile(path,'utf8');
 source=replaceOne(source,"readFile('tongxue/app/tongxue-performance-v150.js','utf8')","readFile('tongxue/app/tongxue-performance-v151.js','utf8')",'目录入口文件');
 source=replaceOne(source,"requireText(page,'./app/tongxue-performance-v150.js?v=150','页面入口');","requireText(page,'./app/tongxue-performance-v151.js?v=151','页面入口');",'目录页面入口');
 source=replaceOne(source,"requireText(page,'同学你好 v1.5.0 · 更新于 2026-07-20','页面版本');","requireText(page,'同学你好 v1.5.1 · 更新于 2026-07-20','页面版本');",'目录页面版本');
 source=replaceOne(source,"requireText(page,'tongxue-v150-region-20260617','页面构建标识');","requireText(page,'tongxue-v151-brand-20260720','页面构建标识');\nrequireText(page,'tongxue-logo-primary-v1.webp','品牌 Logo');\nrequireText(page,'<h1 class=\"sr-only\">同学你好</h1>','隐藏主标题');",'目录 build');
 source=replaceOne(source,"requireText(changelog,'v1.5.0 · 省份与城市筛选','更新记录 v1.5.0');","requireText(changelog,'v1.5.1 · 品牌 Logo 与多终端首页','更新记录 v1.5.1');\nrequireText(changelog,'v1.5.0 · 省份与城市筛选','更新记录 v1.5.0');",'目录更新记录');
 source=replaceOne(source,"if(!(changelog.indexOf('v1.5.0')<changelog.indexOf('v1.4.1')&&changelog.indexOf('v1.4.1')<changelog.indexOf('v1.4.0')))failures.push('更新记录未按倒序排列');","if(!(changelog.indexOf('v1.5.1')<changelog.indexOf('v1.5.0')&&changelog.indexOf('v1.5.0')<changelog.indexOf('v1.4.1')&&changelog.indexOf('v1.4.1')<changelog.indexOf('v1.4.0')))failures.push('更新记录未按倒序排列');",'目录顺序');
 source=replaceOne(source,"requireText(wrapper,\"installShareMetadataStabilizer('v1.5.0')\",'运行时版本');","requireText(wrapper,\"installShareMetadataStabilizer('v1.5.1')\",'运行时版本');",'目录运行时版本');
 source=replaceOne(source,"requireText(wrapper,\"tongxue-performance-v112.js?v=150\",'核心运行时缓存版本');","requireText(wrapper,\"tongxue-performance-v112.js?v=151\",'核心运行时缓存版本');",'目录核心版本');
 source=source.replace("if(scattered.length)failures.push('根目录残留：'+scattered.join(','));","if(scattered.length)failures.push('根目录残留：'+scattered.join(','));\nif(page.includes('v1.6.0')||page.includes('高频讨论信号')||page.includes('报考前核验清单')||page.includes('共识与分歧'))failures.push('页面恢复了已撤回的 v1.6.0 内容');");
 await writeFile(path,source);
}

async function updateRegionTest(){
 const path='tools/tongxue/verify-school-region-ui-v150.mjs';
 let source=await readFile(path,'utf8');
 source=replaceOne(source,"readFile('tongxue/app/tongxue-performance-v150.js','utf8')","readFile('tongxue/app/tongxue-performance-v151.js','utf8')",'地域入口文件');
 source=replaceOne(source,"const build='<meta name=\"tongxue-build\" content=\"tongxue-v150-region-20260617\">';","const build='<meta name=\"tongxue-build\" content=\"tongxue-v151-brand-20260720\">';",'地域 build');
 source=replaceOne(source,"check('页面版本',page.includes('同学你好 v1.5.0')&&page.includes('tongxue-performance-v150.js?v=150'));","check('页面版本',page.includes('同学你好 v1.5.1')&&page.includes('tongxue-performance-v151.js?v=151'));\ncheck('品牌 Logo',page.includes('tongxue-logo-primary-v1.webp')&&page.includes('alt=\"同学你好\"'));",'地域页面版本');
 source=replaceOne(source,"await import('./tongxue-performance-v112.js?v=150')","await import('./tongxue-performance-v112.js?v=151')",'地域核心版本');
 source=source.replace("check('版本资源长期缓存',headers.includes('/tongxue/data/school-search-index.20260617-v150.json')&&headers.includes('immutable'));","check('版本资源长期缓存',headers.includes('/tongxue/data/school-search-index.20260617-v150.json')&&headers.includes('immutable'));\ncheck('品牌资源长期缓存',headers.includes('/tongxue/assets/brand/*')&&headers.includes('/tongxue/app/tongxue-performance-v151.js'));");
 await writeFile(path,source);
}

async function updateShareTest(){
 const path='tools/tongxue/verify-share.mjs';
 let source=await readFile(path,'utf8');
 source=replaceOne(source,"readFile('tongxue/app/tongxue-performance-v150.js','utf8')","readFile('tongxue/app/tongxue-performance-v151.js','utf8')",'分享入口文件');
 source=replaceOne(source,"pageVersion:html.includes('同学你好 v1.5.0')&&html.includes('./app/tongxue-performance-v150.js?v=150')","pageVersion:html.includes('同学你好 v1.5.1')&&html.includes('./app/tongxue-performance-v151.js?v=151')",'分享页面版本');
 source=replaceOne(source,"newCopy:html.includes('看看学长学姐真实聊过的')&&html.includes('拼音首字母')&&html.includes('看看同学怎么说')","newCopy:html.includes('看看学长学姐怎么说')&&html.includes('拼音首字母')&&html.includes('看看同学怎么说')&&html.includes('tongxue-logo-primary-v1.webp')",'分享首页文案');
 source=replaceOne(source,"keepsQueryRuntime:wrapper.includes('tongxue-performance-v112.js?v=150')","keepsQueryRuntime:wrapper.includes('tongxue-performance-v112.js?v=151')",'分享核心版本');
 await writeFile(path,source);
}

async function finalizeWorkflow(){
 const path='.github/workflows/tongxue-live-verification.yml';
 let source=await readFile(path,'utf8');
 source=replaceOne(source,'permissions:\n  contents: write','permissions:\n  contents: read','工作流权限');
 source=replaceOne(source,"      - uses: actions/checkout@v4\n        with:\n          ref: agent/tongxue-brand-logo-v151\n          fetch-depth: 0","      - uses: actions/checkout@v4",'工作流 checkout');
 source=replaceOne(source,"      - name: Materialize Tongxue v1.5.1 brand assets\n        run: |\n          cat tools/tongxue/brand-assets-v151/primary-webp.*.b64 | base64 --decode > tongxue/assets/brand/tongxue-logo-primary-v1.webp\n          cat tools/tongxue/brand-assets-v151/source-webp.*.b64 | base64 --decode > tongxue/assets/brand/source/tongxue-logo-concept-original-v1.webp\n",'', '移除图片重建步骤');
 source=replaceOne(source,"      - name: Apply Tongxue v1.5.1 brand migration\n        run: node tools/tongxue/apply-brand-logo-v151.mjs\n",'', '移除迁移步骤');
 const commitBlock="      - name: Commit Tongxue v1.5.1 brand release\n        if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository && github.event.pull_request.head.ref == 'agent/tongxue-brand-logo-v151'\n        run: |\n          git config user.name 'github-actions[bot]'\n          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'\n          rm -rf tools/tongxue/brand-assets-v151\n          rm -f tongxue/assets/brand/tongxue-logo-primary-v1.png\n          rm tools/tongxue/apply-brand-logo-v151.mjs\n          git add -A\n          if git diff --cached --quiet; then\n            echo 'v1.5.1 brand release already generated'\n          else\n            git commit -m 'feat: publish Tongxue brand homepage v1.5.1'\n            git push origin HEAD:agent/tongxue-brand-logo-v151\n          fi\n";
 source=replaceOne(source,commitBlock,'','移除提交步骤');
 await writeFile(path,source);
}

function replaceOne(source,oldValue,newValue,label){
 const matches=count(source,oldValue);
 if(matches!==1)throw new Error(`${label}：预期 1 处，实际 ${matches} 处`);
 return source.replace(oldValue,newValue);
}
function count(source,value){return source.split(value).length-1;}
