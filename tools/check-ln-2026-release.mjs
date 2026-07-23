import fs from 'node:fs';
const j=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const t=p=>fs.readFileSync(p,'utf8');
const ok=(c,m)=>{if(!c)throw new Error(m)};

const manifest=j('fenxi/data/ln-rank-2026/manifest.json');
ok(manifest.dataYear===2026,'manifest year');
ok(manifest.totalRecords===11628,'record count');
ok(manifest.schoolCount===956,'school count');

const ranks=j('fenxi/data/rank_2026_physics.json');
for(const [score,rank] of [[700,41],[600,14235],[508,49824],[344,119069],[150,141691]])ok(ranks[String(score)]===rank,`rank anchor ${score}`);

const pages=['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/local-mainline.html','ln-rank/211-mainline.html','ln-rank/major-trend-2026.html','ln2026.html','lngk2026.html','index.html','e.html','zy.html','zy2026.html','zy2026/index.html'];
for(const path of pages)ok(!/版本：v3\.9\.50\.0/.test(t(path)),`${path} old footer`);

const main=t('ln-rank/index.html');
ok(main.includes('v3.9.56.0'),'main version');
ok(main.includes('app.v3956_0.js?v=3956_0'),'shared main wrapper loaded');
ok(!main.includes('app.v3951_0.js?v=3956_0'),'legacy main not loaded directly');
ok(main.includes('family-decision-workspace.v3955_0.css'),'family decision css loaded');
ok(main.includes('family-presentation.v3955_0.js'),'family presentation loaded');
ok(main.includes('family-decision-bar.v3955_0.js'),'family status bar loaded');
ok(main.includes('compare-workspace-year-fix.v3953_0.css'),'compare year fix loaded');
const selection=t('ln-rank/selection-pool.html');
ok(selection.includes('v3.9.56.0'),'selection version');
ok(selection.includes('生成家庭复核报告')&&selection.includes('其他保存方式'),'selection action simplification');
ok(t('ln2026.html').includes('v3.9.53.0'),'difficulty core version preserved');

const root=t('index.html');
ok(root.includes('辽宁高考家庭决策工作台'),'root family workspace');
ok(root.includes('近期公开评论'),'root public review copy');
ok(!root.includes('近期真实评论'),'root no real-review claim');
ok((root.match(/ln2026\.html/g)||[]).length===1,'root unified difficulty link');
ok(root.includes('href="/zy2026"'),'root zy2026 link');
ok(!root.includes('href="/zy.html"'),'root old zy link');
ok(!root.includes('/fenxi'),'root legacy runtime link');

ok(t('e.html').includes("location.replace('/')"),'e redirect');
ok(t('zy.html').includes("location.replace('/zy2026')"),'zy redirect');
const zyPage=t('zy2026/index.html'),zyAlias=t('zy2026.html');
ok(zyAlias===zyPage,'zy2026 extensionless alias');
ok(!zyAlias.includes("location.replace('/zy2026')"),'zy2026 alias self redirect removed');
ok(zyPage.includes('辽宁2026招生变化发现')&&zyPage.includes('页面体验版本：v3.9.55.0'),'zy2026 family copy page');
ok(zyPage.includes('zy2026.v3955_0.js?v=3955_0')&&zyPage.includes('zy2026.v3954_0.css?v=3955_0'),'zy2026 v3955 runtime loaded');
ok(t('tools/ln-2026/run-build-zy2026-structure.py').includes("ZY_EXPERIENCE_VERSION = 'v3.9.55.0'"),'zy rebuild v3955 guard');
ok(t('tools/ln-2026/finalize-v3953-assets.py').includes('apply_shared_resource_contract'),'shared resource finalizer guard');
ok(t('lngk2026.html').includes('/ln2026.html#score-band'),'score-band redirect');

const zyJs=t('zy2026/assets/zy2026.v3955_0.js');
ok(zyJs.includes("CHANGE_ORDER=['project_change'")&&zyJs.includes("RELATION_ORDER=[...CHANGE_ORDER,'continued']"),'zy change priority');
ok(zyJs.includes('renderFeatured')&&zyJs.includes('stableBlock')&&zyJs.includes('groupedChanges'),'zy change-first runtime');
ok(zyJs.includes('2026投档表首次可见')&&zyJs.includes('不能直接说专业被撤销'),'zy precise record language');
ok(!zyJs.includes("RELATION_ORDER=['continued'"),'old stable-first order removed');
const zyCss=t('zy2026/assets/zy2026.v3954_0.css');
ok(zyCss.includes('.featured-grid')&&zyCss.includes('.stable-block')&&zyCss.includes('@media(max-width:680px)'),'zy change-first responsive');

const difficulty=t('ln-rank/js/major-difficulty-2026.v3953_0.js');
ok(difficulty.includes('scoreBandOrder(a) - scoreBandOrder(b)'),'ascending score bands');
ok(!difficulty.includes('Number(b.maxScore || 0) - Number(a.maxScore || 0)'),'old descending score bands');
const compare=t('ln-rank/js/ux/compare-workspace.v3953_0.js');
ok(compare.includes('movePanelToWorkspace')&&compare.includes('scrollIntoView')&&compare.includes('左右滑动比较'),'compare navigation');
const compareCss=t('ln-rank/css/dist/compare-workspace.v3953_0.css');
ok(compareCss.includes('@media (min-width:1200px)')&&compareCss.includes('@media (max-width:767px)')&&compareCss.includes('scroll-snap-type:x mandatory'),'compare responsive');
ok(t('ln-rank/css/dist/compare-workspace-year-fix.v3953_0.css').includes('span::before{content:none!important}'),'single year labels');

const sharedExam=t('shared/resources/exam/liaoning-physics.js');
const sharedGeo=t('shared/resources/geo/china-region-catalog.js');
const sharedSchool=t('shared/resources/schools/school-resource-center.js');
const appWrapper=t('ln-rank/js/app.v3956_0.js');
ok(sharedExam.includes('specialControlScore: 508')&&sharedExam.includes('undergraduateControlScore: 344'),'shared exam controls');
ok(sharedGeo.includes('REGION_OPTIONS')&&sharedGeo.includes('matchRegionRule'),'shared region catalog');
ok(sharedSchool.includes('tongxueDirectoryPromise')&&sharedSchool.includes('resolveCardSchoolResource'),'shared school center');
ok(appWrapper.includes("url.pathname !== '/api/major-bands'")&&appWrapper.includes("url.searchParams.set('bottomLineMode', visible ? selectedMode : 'all')"),'shared main API rewrite');
ok(t('functions/_lib/exam-year-config.js').includes('shared/resources/exam/liaoning-physics.js'),'exam adapter');
ok(t('functions/_lib/region-rules.js').includes('shared/resources/geo/china-region-catalog.js'),'region backend adapter');
ok(t('ln-rank/js/config/region-options.js').includes('shared/resources/geo/china-region-catalog.js'),'region frontend adapter');
ok(t('ln-rank/js/ux/family-presentation.v3955_0.js').includes('shared/resources/schools/school-resource-center.js'),'card school center');

const zy=j('data/zy2026/summary.json');
ok(zy.productVersion==='v3.9.53.0','zy data version preserved');
ok(zy.records2026===11628,'zy 2026 count');
ok(zy.records2025>=10000&&zy.records2025<=12000,'zy 2025 count');
ok(zy.recordDelta===zy.records2026-zy.records2025,'zy delta');
const audit=j('analysis/2026/zy2026-audit.json');
ok(audit.coverage.records2025===audit.coverage.assigned2025,'zy 2025 coverage');
ok(audit.coverage.records2026===audit.coverage.assigned2026,'zy 2026 coverage');

const active=j('ln-rank/active-assets.json');
ok(active.version==='v3.9.56.0'&&active.assetVersion==='v3956_0','active version');
ok(active.mainJs==='js/app.v3956_0.js'&&active.jsEntry.includes('js/app.v3956_0.js'),'active shared main');
ok(!active.jsEntry.includes('js/app.v3951_0.js'),'legacy main not directly active');
ok(active.sharedResourceCenterContract===true&&active.sharedSchoolDirectoryLazySingleFlightContract===true,'shared active contracts');
ok(active.zy2026ExperienceVersion==='v3.9.55.0','zy experience version');
ok(active.zy2026ChangeFirstContract===true&&active.zy2026StableCollapsedContract===true&&active.zy2026FeaturedDiscoveryContract===true,'zy active contracts');
ok(active.structure2026.js==='../zy2026/assets/zy2026.v3955_0.js'&&active.structure2026.css==='../zy2026/assets/zy2026.v3954_0.css','zy active assets');
ok(active.jsEntry.includes('js/ux/family-presentation.v3955_0.js'),'active family presentation');
ok(active.jsEntry.includes('js/ux/family-decision-bar.v3955_0.js'),'active family bar');
ok(active.cssEntry.includes('css/dist/family-decision-workspace.v3955_0.css'),'active family css');
ok(active.jsEntry.includes('js/ux/compare-workspace.v3953_0.js'),'active compare js');
ok(!active.jsEntry.includes('js/ux/family-presentation.v3952_0.js'),'old presentation inactive');
ok(!active.jsEntry.includes('js/major-difficulty-2026.v3952_0.js'),'old difficulty js inactive');

const release=j('ln-rank/release-meta.json');
ok(release.version==='v3.9.56.0'&&release.assetVersion==='v3956_0','release version');
ok(release.majorDifficultyJs==='js/major-difficulty-2026.v3953_0.js','release difficulty js');
ok(release.compareWorkspaceYearLabelContract===true,'year-label contract');
ok(release.familyDecisionTongxueEntityContract===true&&release.familyDecisionNoApiPrefetchContract===true,'Tongxue efficient auto-match contract');
ok(release.cardAi2026FirstContract===true,'card AI 2026 contract');
ok(release.sharedResourceCenterContract===true&&release.sharedMajorBandsRequestRewriteContract===true,'shared release contracts');
ok(release.feishuSharedResourceContract===true&&release.feishuThreeEntryRegressionContract===true&&release.tongxueDirectHandoffContract===true,'v3956 integration contracts');
ok(t('shared/resources/reports/feishu-report-contract.js').includes('/api/feishu-create-selection-pool-report'),'shared Feishu route contract');
ok(t('tongxue/index.html').includes('tongxue-performance-v155.js?v=155'),'Tongxue v155 active');
ok(release.zy2026ExperienceVersion==='v3.9.55.0'&&release.zy2026RecordLanguageContract===true,'zy release contracts');

for(const path of ['.bootstrap','.github/workflows/bootstrap-zy2026-v3953.yml','.github/workflows/materialize-zy2026-v3953.yml'])ok(!fs.existsSync(path),`temporary path remains ${path}`);
ok(!t('ln-rank/js/core/score-guard.js').includes('<400'),'no 400 guard');
console.log('LN 2026 v3.9.56.0 Feishu, Tongxue and shared resource checks passed');
