import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const j=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const t=p=>fs.readFileSync(p,'utf8');
const ok=(c,m)=>{if(!c)throw new Error(m)};
const { CURRENT_RELEASE }=await import(pathToFileURL(`${process.cwd()}/shared/resources/release/current-release.js`));
const VERSION=CURRENT_RELEASE.display, ASSET=CURRENT_RELEASE.assetVersion;

const manifest=j('fenxi/data/ln-rank-2026/manifest.json');
ok(manifest.dataYear===2026,'manifest year');
ok(manifest.audienceYear===2027,'manifest audience year');
ok(manifest.totalRecords===11628,'record count');
ok(manifest.schoolCount===956,'school count');

const ranks=j('fenxi/data/rank_2026_physics.json');
for(const [score,rank] of [[700,41],[600,14235],[508,49824],[344,119069],[150,141691]])ok(ranks[String(score)]===rank,`rank anchor ${score}`);

const pages=['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/local-mainline.html','ln-rank/211-mainline.html','ln-rank/major-trend-2026.html','ln2026.html','lngk2026.html','index.html','e.html','zy.html','zy2026.html','zy2026/index.html'];
for(const path of pages)ok(!/版本：v3\.9\.50\.0/.test(t(path)),`${path} old footer`);

ok(VERSION==='v3.9.61.0'&&ASSET==='v3961_0','current release version');
ok(CURRENT_RELEASE.uiOrchestrationVersion==='ui-orchestration-v3961','current UI version');
ok(CURRENT_RELEASE.algorithmOrchestrationVersion==='algorithm-orchestration-v3960','algorithm version preserved');
ok(CURRENT_RELEASE.selectionWorkspaceVersion==='selection-workspace-orchestration-v3961','workspace version');

const main=t('ln-rank/index.html');
ok(main.includes(VERSION),'main version');
ok(main.includes('app.v3961_0.js?v=3961_0'),'v3961 main wrapper loaded');
ok(main.includes('selection-workspace.v3961_0.css?v=3961_0'),'workspace CSS loaded');
ok(!main.includes('app.v3960_0.js?v=3960_0'),'old main not loaded directly');
ok(main.includes('foundation.v3959_0.css'),'shared UI tokens loaded');
ok(main.includes('family-shell.v3960_0.css?v=3961_0'),'shared shell CSS loaded');
ok(main.includes('family-decision-workspace.v3955_0.css'),'family decision compatibility css loaded');
for(const inactive of ['family-presentation.v3955_0.js','multi-terminal.v3949_4.js','compare-workspace.v3953_0.js','family-decision-bar.v3955_0.js'])ok(!main.includes(inactive),`legacy active layer ${inactive}`);
ok(main.includes('资源、UI与算法：全站统一调度'),'orchestration copy');

const selection=t('ln-rank/selection-pool.html');
ok(selection.includes(VERSION),'selection version');
ok(selection.includes('selection-pool.v3960_0.js?v=3961_0'),'selection preserved runtime');
ok(selection.includes('id="selected-list"')&&selection.includes('id="family-review"'),'distinct selected/review targets');
ok(selection.includes('生成家庭复核报告')&&selection.includes('其他保存方式'),'selection action simplification');
ok(selection.includes('同一算法快照'),'decision snapshot copy');
ok(t('ln2026.html').includes('v3.9.53.0'),'difficulty core version preserved');
ok(t('ln2026.html').includes('major-difficulty-2026.v3959_0.js?v=3959_0'),'difficulty UI adapter preserved');

const root=t('index.html');
ok(root.includes('辽宁高考家庭决策工作台'),'root family workspace');
ok(root.includes('近期公开评论'),'root public review copy');
ok(!root.includes('近期真实评论'),'root no real-review claim');
ok(root.includes('foundation.v3959_0.css?v=3959_0')&&root.includes('family-shell.v3959_0.js?v=3959_0'),'root compatibility UI shell');
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
ok(zyPage.includes('zy2026.v3959_0.js?v=3959_0')&&zyPage.includes('zy2026.v3954_0.css?v=3955_0'),'zy2026 UI wrapper preserved');
ok(t('tools/ln-2026/run-build-zy2026-structure.py').includes("ZY_EXPERIENCE_VERSION = 'v3.9.55.0'"),'zy rebuild guard');
ok(t('tools/ln-2026/finalize-v3953-assets.py').includes('apply_shared_resource_contract'),'shared resource finalizer guard');
ok(t('lngk2026.html').includes('/ln2026.html#score-band'),'score-band redirect');

const zyJs=t('zy2026/assets/zy2026.v3955_0.js');
ok(zyJs.includes("CHANGE_ORDER=['project_change'")&&zyJs.includes("RELATION_ORDER=[...CHANGE_ORDER,'continued']"),'zy change priority');
ok(zyJs.includes('renderFeatured')&&zyJs.includes('stableBlock')&&zyJs.includes('groupedChanges'),'zy change-first runtime');
ok(zyJs.includes('2026投档表首次可见')&&zyJs.includes('不能直接说专业被撤销'),'zy precise record language');
ok(!zyJs.includes("RELATION_ORDER=['continued'"),'old stable-first order removed');
ok(t('zy2026/assets/zy2026.v3959_0.js').includes('shared/ui/shell/family-shell.v3959_0.js'),'zy compatibility UI adapter');

const sharedExam=t('shared/resources/exam/liaoning-physics.js');
const sharedGeo=t('shared/resources/geo/china-region-catalog.js');
const sharedSchool=t('shared/resources/schools/school-resource-center.js');
const sharedIdentity=t('shared/resources/schools/school-identity-center.js');
const appWrapper=t('ln-rank/js/app.v3961_0.js');
ok(sharedExam.includes('specialControlScore: 508')&&sharedExam.includes('undergraduateControlScore: 344'),'shared exam controls');
ok(sharedGeo.includes('REGION_OPTIONS')&&sharedGeo.includes('matchRegionRule')&&sharedGeo.includes('getLiaoningAreaLabel'),'shared region catalog');
ok(sharedSchool.includes('tongxueDirectoryPromise')&&sharedSchool.includes('resolveCardSchoolResource'),'shared school center');
ok(sharedSchool.includes("from './school-identity-center.js'"),'school resource uses shared identity upstream');
ok(sharedIdentity.includes("E('dlut-panjin'")&&sharedIdentity.includes('createEntityAwareResolver'),'shared identity content');
const schoolProfile=t('shared/resources/schools/school-profile-center.js');
ok(schoolProfile.includes('SCHOOL_PROFILE_ROWS')&&schoolProfile.includes('SCHOOL_PROFILE_SPECIALS'),'shared school profile center');
ok(t('functions/_lib/school-tags.js').includes('school-profile-center.js')&&t('functions/_lib/location-normalizer.js').includes('school-profile-center.js'),'school profile adapters');
ok(t('ln-rank/js/feature/major-pool/render.v3957_0.js').includes('双非（非985/211）'),'school profile card tags');
ok(appWrapper.includes("url.pathname !== '/api/major-bands'")&&appWrapper.includes("url.searchParams.get('bottomLineMode') || state?.filters?.bottomLineMode"),'shared request uses submitted snapshot');
ok(appWrapper.includes('shared/ui/shell/family-shell.v3961_0.js'),'main v3961 UI adapter');
ok(appWrapper.includes('ALGORITHM_CONTRACT'),'main algorithm contract');
ok(t('functions/_lib/exam-year-config.js').includes('shared/resources/exam/liaoning-physics.js'),'exam adapter');
ok(t('functions/_lib/region-rules.js').includes('shared/resources/geo/china-region-catalog.js'),'region backend adapter');
ok(t('ln-rank/js/config/region-options.js').includes('shared/resources/geo/china-region-catalog.js'),'region frontend adapter');
ok(t('ln-rank/js/workspace/family-card-presenter.v3961_0.js').includes('shared/resources/schools/school-resource-center.js'),'card school center');
ok(t('functions/_lib/standard-major-mapper.js').includes('shared/resources/majors/major-catalog-contract.js'),'server major resolver shared');
ok(t('ln-rank/js/knowledge/major-understanding-resolver.js').includes('shared/resources/majors/major-catalog-contract.js'),'browser major resolver shared');

const uiRegistry=t('shared/ui/ui-registry.v3961_0.js');
ok(uiRegistry.includes('UI_ORCHESTRATION_VERSION')&&uiRegistry.includes('#selected-list')&&uiRegistry.includes('#family-review'),'shared UI registry');
ok(uiRegistry.includes('SELECTION_WORKSPACE_CONTRACT')&&uiRegistry.includes('bandSwitchIsViewOnly'),'workspace UI contract');
ok(t('shared/ui/shell/family-shell.v3961_0.js').includes('当前家庭方案'),'shared family shell');
ok(!t('shared/ui/shell/family-shell.v3961_0.js').includes('visualViewport'),'single viewport owner');
ok(t('shared/ui/shell/family-shell.v3959_0.js').includes('family-shell.v3960_0.js'),'legacy shell bridge');
ok(t('tongxue/app/tongxue-performance-v156.js').includes('shared/ui/shell/family-shell.v3959_0.js'),'Tongxue compatibility UI adapter');

const orchestrator=t('ln-rank/js/workspace/selection-workspace-orchestrator.v3961_0.js');
const resultCommit=t('ln-rank/js/workspace/result-commit.v3961_0.js');
const presenter=t('ln-rank/js/workspace/family-card-presenter.v3961_0.js');
const scroll=t('ln-rank/js/workspace/scroll-policy.v3961_0.js');
const viewport=t('ln-rank/js/workspace/viewport-orchestrator.v3961_0.js');
ok(orchestrator.includes('querySnapshotFromDraft')&&orchestrator.includes('committedQuery')&&orchestrator.includes("bandFocus: 'all-bands'"),'draft committed query split');
ok(orchestrator.includes('updateResultWorkspaceStatus')&&orchestrator.includes('shouldKeepRenderedResult'),'preserve rendered stale results');
ok(!orchestrator.includes('markResultStale')&&!orchestrator.includes('clearResultState'),'no stale collapse');
ok(resultCommit.includes('presentFamilyResults(root)')&&resultCommit.includes('ensureCompareSlot'),'single result commit');
ok(!resultCommit.includes('MutationObserver')&&!presenter.includes('MutationObserver'),'no structural result observer');
ok(scroll.includes('userScrollRevision')&&scroll.includes('finishQueryScrollIntent'),'single scroll policy');
ok(viewport.includes('visualViewport')&&viewport.includes('orientationchange'),'single viewport policy');
ok(t('ln-rank/js/feature/score-bands/render.v3961_0.js').includes('score-band-segmented'),'Android band component');
ok(t('ln-rank/js/feature/selection-pool/controller.v3961_0.js').includes('gaokao:selection-change')&&!t('ln-rank/js/feature/selection-pool/controller.v3961_0.js').includes('lnrank:pool-updated'),'selection event dedup');

const algorithmRegistry=t('shared/algorithms/algorithm-registry.js');
const position=t('shared/algorithms/position/canonical-position.v3960_0.js');
const ranking=t('shared/algorithms/ranking/staged-ranking.v3960_0.js');
ok(algorithmRegistry.includes('algorithm-orchestration-v3960'),'algorithm registry');
ok(position.includes('resolveCanonicalPosition')&&position.includes('rankGapRatio')&&position.includes('positionDistance'),'canonical position engine');
ok(ranking.includes('eligibilityTier')&&ranking.includes('intentTier')&&ranking.includes('softPreferenceWeight'),'staged ranking engine');
ok(t('functions/api/major-bands.js').includes('canonical_rank_aware_score_window'),'major bands canonical mode');
ok(t('functions/api/major-bands.js').includes('getBottomLineEligibility'),'bottomline tri-state');
ok(t('functions/_lib/report-data-service-v3956.js').includes('makeDecisionSnapshot'),'report decision snapshot');
ok(t('functions/_lib/advisor-fact-builder.js').includes('score2026')&&t('functions/_lib/advisor-fact-builder.js').includes('rank2026'),'advisor 2026 facts');

const active=j('ln-rank/active-assets.json');
ok(active.version===VERSION&&active.assetVersion===ASSET,'active version');
ok(active.mainJs==='js/app.v3961_0.js'&&active.jsEntry.includes('js/app.v3961_0.js'),'active v3961 main');
ok(active.selectionPoolJs==='js/selection-pool.v3960_0.js'&&active.jsEntry.includes('js/selection-pool.v3960_0.js'),'active selection');
for(const entry of ['js/workspace/selection-workspace-orchestrator.v3961_0.js','js/workspace/result-commit.v3961_0.js','js/workspace/family-card-presenter.v3961_0.js','js/workspace/scroll-policy.v3961_0.js','js/workspace/viewport-orchestrator.v3961_0.js','../shared/ui/shell/family-shell.v3961_0.js'])ok(active.jsEntry.includes(entry),`active workspace ${entry}`);
for(const inactive of ['js/app.v3960_0.js','js/app.v3951_0.js','js/ux/family-presentation.v3955_0.js','js/ux/multi-terminal.v3949_4.js','js/ux/compare-workspace.v3953_0.js'])ok(!active.jsEntry.includes(inactive),`legacy active ${inactive}`);
ok(active.sharedResourceCenterContract===true&&active.sharedSchoolDirectoryLazySingleFlightContract===true,'shared active contracts');
ok(active.unifiedResourceOwnershipContract===true&&active.resourceOwnershipAuditContract===true,'resource ownership active contracts');
ok(active.sharedUiOwnershipContract===true&&active.sharedUiSixPageAdapterContract===true&&active.sharedUiSingleActionSurfaceContract===true,'shared UI active contracts');
ok(active.selectionWorkspaceOrchestrationContract===true&&active.preserveStaleResultsContract===true&&active.singleScrollOwnerContract===true,'workspace active contracts');
ok(active.algorithmOrchestrationContract===true&&active.canonicalPositionContract===true&&active.decisionSnapshotContract===true,'algorithm active contracts');
ok(active.cssEntry.includes('css/selection-workspace.v3961_0.css'),'workspace css active');
ok(active.zy2026ExperienceVersion==='v3.9.55.0','zy experience version');
ok(active.structure2026.js==='../zy2026/assets/zy2026.v3959_0.js'&&active.structure2026.css==='../zy2026/assets/zy2026.v3954_0.css','zy active assets');

const release=j('ln-rank/release-meta.json');
ok(release.version===VERSION&&release.assetVersion===ASSET,'release version');
ok(release.majorDifficultyJs==='js/major-difficulty-2026.v3959_0.js','release difficulty js');
ok(release.compareWorkspaceYearLabelContract===true,'year-label contract preserved');
ok(release.familyDecisionTongxueEntityContract===true&&release.familyDecisionNoApiPrefetchContract===true,'Tongxue efficient auto-match contract');
ok(release.cardAi2026FirstContract===true,'card AI 2026 contract');
ok(release.sharedResourceCenterContract===true&&release.sharedMajorBandsRequestRewriteContract===true,'shared release contracts');
ok(release.unifiedResourceOwnershipContract===true&&release.singleMoeSchoolBuildContract===true&&release.sharedMajorCatalogResolverContract===true,'resource ownership contracts');
ok(release.sharedUiOwnershipContract===true&&release.selectedReviewDistinctRouteContract===true,'UI contracts');
ok(release.selectionWorkspaceOrchestrationContract===true&&release.bandSwitchViewOnlyContract===true&&release.androidNoLayoutJitterContract===true,'v3961 workspace contracts');
ok(release.algorithmOrchestrationContract===true&&release.rankAwarePositionContract===true&&release.aiExplainsButDoesNotRankContract===true,'v3960 algorithm contracts');
ok(release.feishuSharedResourceContract===true&&release.feishuThreeEntryRegressionContract===true&&release.tongxueDirectHandoffContract===true,'Feishu and Tongxue contracts');
ok(release.sharedSchoolProfileContract===true&&release.schoolProfileCardAlwaysVisibleContract===true&&release.tongxueDirectResultContract===true,'school profile contracts');
ok(t('shared/resources/reports/feishu-report-contract.js').includes('/api/feishu-create-selection-pool-report'),'shared Feishu route contract');
ok(t('tongxue/index.html').includes('tongxue-performance-v156.js?v=156'),'Tongxue v156 active');
ok(release.zy2026ExperienceVersion==='v3.9.55.0'&&release.zy2026RecordLanguageContract===true,'zy release contracts');

for(const path of ['.bootstrap','.github/workflows/bootstrap-zy2026-v3953.yml','.github/workflows/materialize-zy2026-v3953.yml','.github/workflows/agent-algorithm-orchestration-v3960.yml'])ok(!fs.existsSync(path),`temporary path remains ${path}`);
ok(!t('ln-rank/js/core/score-guard.js').includes('<400'),'no 400 guard');
console.log(`LN 2026 ${VERSION} selection workspace, resource, UI and algorithm orchestration checks passed`);
