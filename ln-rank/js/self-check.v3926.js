
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function badge(ok){return `<span class="status ${ok?'ok':'bad'}">${ok?'通过':'失败'}</span>`}
function row(x){return `<div class="case"><h3>${esc(x.name)} ${badge(x.ok)}</h3><div class="muted">${esc(x.detail||'')}</div>${x.suggestion?`<div class="mono">建议：${esc(x.suggestion)}</div>`:''}</div>`}
async function text(path){const r=await fetch(path,{cache:'no-store'}); if(!r.ok) throw new Error(path+' '+r.status); return await r.text()}
async function exists(path){try{const r=await fetch(path,{cache:'no-store'}); const t=await r.text(); return {ok:r.ok && !/^\s*</.test(t) || path.endsWith('.html'), text:t, status:r.status}}catch(e){return {ok:false,text:String(e),status:0}}}
function importSpecs(js){return [...js.matchAll(/(?:import|export)\s+(?:[^'\"]*?from\s*)?['\"]([^'\"]+\.js(?:\?v=[^'\"]+)?)['\"]/g)].map(m=>m[1])}
function resolve(base,spec){let clean=spec.replace(/\?.*$/,''); const stack=base.split('/'); stack.pop(); for(const part of clean.split('/')){if(!part||part==='.'){continue}else if(part==='..'){stack.pop()}else{stack.push(part)}} return stack.join('/')}
function badWords(s){return ['NaN','undefined','null','[object Object]','payload','raw','source','debug','model','JSON','workers-ai','fallback','AI_PATH_MODEL','稳进','必录','保证','一定能上','闭眼报','稳赚','捡漏'].filter(w=>String(s||'').includes(w))}

async function runResultUiChecks(){
  const checks=[];
  try{
    const html=await text('./index.html');
    const cssResult=await text('./css/components/result-section-contract.css?v=3926');
    const cssCard=await text('./css/components/major-card-contract.css?v=3926');
    const cssBand=await text('./css/components/band-selector-contract.css?v=3926');
    const cssColor=await text('./css/core/color-system.css?v=3926');
    const cssTheme=await text('./css/components/post-exam-calm-theme.css?v=3926');
    const cssBreath=await text('./css/components/band-card-breathing-link.css?v=3926');
    const renderMajor=await text('./js/feature/major-pool/render.js?v=3926');
    const bandRender=await text('./js/feature/score-bands/render.js?v=3926');
    checks.push({name:'VISUAL-COLOR-001：考后松弛色系文件存在',ok:cssColor.includes('--page-bg')&&cssColor.includes('--band-upper-bg')&&cssColor.includes('--band-near-bg')&&cssColor.includes('--band-steady-bg'),detail:'color-system.css 已定义暖白底、三段语义色、特殊项目/热度/费用色'});
    checks.push({name:'VISUAL-COLOR-002：主题覆盖文件存在',ok:cssTheme.includes('降低全页绿色占比')&&cssTheme.includes('--special-bg')&&cssTheme.includes('--heat-bg'),detail:'post-exam-calm-theme.css 已覆盖旧绿色堆叠'});
    checks.push({name:'BAND-UI-001：Android 三段同时可见',ok:/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(cssBand),detail:'移动端分段使用三等分 grid，不靠单卡横滑'});
    checks.push({name:'BAND-UI-002：Android 不使用单卡横滑宽卡',ok:!/(flex:\s*0\s*0\s*(80|90|100)vw|min-width:\s*(80|90|100)vw|width:\s*(80|90|100)vw)/.test(cssBand),detail:'band-selector-contract.css 未发现 80vw/90vw/100vw 分段卡'});
    checks.push({name:'BAND-UI-003：分段 active class 包含 is-band-*',ok:bandRender.includes('is-band-${escapeHtml(key)}'),detail:'渲染层输出 is-band-upper/near/steady class'});
    checks.push({name:'BAND-UI-004：稍高目标使用杏色语义',ok:cssColor.includes('--band-upper-bg: #FFF6E8')&&cssBand.includes('result-band-upper'),detail:'稍高目标不再使用品牌绿作为主色'});
    checks.push({name:'BAND-UI-005：主要参考使用蓝色语义',ok:cssColor.includes('--band-near-bg: #EEF5FF')&&cssBand.includes('result-band-near'),detail:'主要参考不再使用品牌绿作为主色'});
    checks.push({name:'BAND-UI-006：稳妥补充使用浅青绿语义',ok:cssColor.includes('--band-steady-bg: #EDF8F3'),detail:'稳妥补充保留温和青绿，但不同于主按钮深色'});
    checks.push({name:'RESULT-UI-001：结果区视觉 CSS 存在',ok:cssResult.length>1200 && cssCard.length>1200,detail:`${cssResult.length}/${cssCard.length}`});
    checks.push({name:'RESULT-UI-002：结果区使用统一外壳',ok:/ln-result-section/.test(html),detail:'resultsPanel 已接入 ln-result-section'});
    checks.push({name:'RESULT-UI-003：结果说明区承载当前查看',ok:/result-context-bar/.test(await text('./css/components/result-context-bar.css?v=3926').catch(e=>''))&&/renderResultContextBar/.test(renderMajor),detail:'当前分段范围/数量进入紧凑结果说明区，不再重复占位'});
    checks.push({name:'RESULT-UI-004：特殊项目提示进入结果说明区',ok:/result-context-special/.test(await text('./css/components/result-context-bar.css?v=3926').catch(e=>''))&&/data-context-special-toggle/.test(renderMajor),detail:'特殊项目数量与显示入口收纳进紧凑说明条'});
    checks.push({name:'CARD-BAND-001：专业卡片输出 is-band-* class',ok:renderMajor.includes('ln-major-card status-${statusKey} ${bandClass}')&&renderMajor.includes('bandKeyFromActive'),detail:'卡片 article 已跟随 activeBand 输出 is-band-upper/near/steady'});
    checks.push({name:'CARD-BAND-002：分段标签同步 is-band-* class',ok:renderMajor.includes('ln-band-pill ${bandClass}')&&cssBreath.includes('.ln-band-pill.is-band-near'),detail:'卡片右上分段标签与上方类别同色系'});
    checks.push({name:'CARD-BAND-003：适合位置跟随分段语义色',ok:renderMajor.includes('ln-fit-position ${bandClass}')&&cssBreath.includes('.ln-fit-position.is-band-near'),detail:'适合位置值按当前分段轻强调'});
    checks.push({name:'CARD-BAND-004：不使用粗左边框',ok:!(/border-left\s*:\s*[4-9]px/.test(cssBreath)) && !cssBreath.includes('bottom: 0 !important'),detail:'呼应方式为顶部细色带，不是硬左线'});
    checks.push({name:'CARD-BAND-005：存在顶部细色带',ok:cssBreath.includes('height: 3px')&&cssBreath.includes('::before'),detail:'卡片顶部 2-3px 色带建立归属'});
    checks.push({name:'CARD-BAND-006：三段使用杏/蓝/青绿呼应',ok:cssBreath.includes('--band-upper-accent')&&cssBreath.includes('--band-near-accent')&&cssBreath.includes('--band-steady-accent'),detail:'稍高目标杏色、主要参考蓝色、稳妥补充青绿色'});
    checks.push({name:'CARD-BAND-007：标签文案不出现“主要参考补充”',ok:!renderMajor.includes('主要参考补充'),detail:'卡片分段标签统一为稍高目标/主要参考/稳妥补充'});

  }catch(e){checks.push({name:'RESULT/BAND/COLOR：视觉检查',ok:false,detail:String(e)})}
  return checks;
}

async function runManifest(){const checks=[];let manifest;try{manifest=JSON.parse(await text('./active-assets.json'));checks.push({name:'ASSET-001：active-assets 可读取',ok:true,detail:manifest.version+' / '+manifest.assetVersion})}catch(e){checks.push({name:'ASSET-001：active-assets 可读取',ok:false,detail:String(e)});return checks}
for(const p of [...manifest.html,...manifest.jsEntry,...manifest.cssEntry,...manifest.stableModules]){const e=await exists('./'+p);checks.push({name:'ASSET：'+p,ok:e.ok,detail:e.ok?'存在且没有返回 fallback HTML':'缺失或返回 HTML：'+e.status})}
for(const p of manifest.cssEntry||[]){const t=await text('./'+p).catch(e=>'');checks.push({name:'CSS-NONEMPTY：'+p,ok:String(t).trim().length>20,detail:String(t).trim().length>20?'非空':'CSS 为空或过短'})}
const missing=[];for(const entry of manifest.jsEntry||[]){const js=await text('./'+entry).catch(e=>'');for(const spec of importSpecs(js)){const target=resolve(entry,spec);if(spec.includes('major-bands-response-normalizer'))missing.push('禁止 active 依赖：'+spec);const r=await exists('./'+target);if(!r.ok)missing.push(entry+' -> '+spec+' => '+target)}}checks.push({name:'IMPORT-001：active JS import 递归入口检查',ok:!missing.length,detail:missing.length?missing.slice(0,12).join(' / '):'未发现 active import 缺失或 wrapper 依赖'});
for(const page of ['index.html','selection-pool.html']){const t=await text('./'+page).catch(e=>'');const bad=badWords(t);checks.push({name:'COPY-'+page+'：主页面禁词与坏值',ok:!bad.length,detail:bad.length?bad.join('、'):'未发现主路径禁词或坏值'});}

const indexText=await text('./index.html').catch(e=>'');
checks.push({name:'GUIDE-001：存在“孩子高考分数”',ok:indexText.includes('孩子高考分数'),detail:indexText.includes('孩子高考分数')?'已使用新手文案':'仍是系统化分数文案'});
checks.push({name:'GUIDE-002：存在“先看多大范围”',ok:indexText.includes('先看多大范围'),detail:indexText.includes('先看多大范围')?'已使用范围引导':'查看范围文案仍偏工具化'});
checks.push({name:'GUIDE-003：存在“想看什么方向”',ok:indexText.includes('想看什么方向'),detail:indexText.includes('想看什么方向')?'已使用方向引导':'搜索条件文案仍偏系统化'});
checks.push({name:'GUIDE-004：主按钮不叫“更新条件”',ok:!indexText.includes('更新条件'),detail:!indexText.includes('更新条件')?'未发现旧按钮文案':'仍存在“更新条件”'});
checks.push({name:'LAYOUT-HEAT-001：热度提示不在主按钮之前',ok:indexText.indexOf('filter-action search-action-row') < indexText.indexOf('majorTrendHint'),detail:indexText.indexOf('filter-action search-action-row') < indexText.indexOf('majorTrendHint')?'主按钮在热度提示之前':'热度提示仍在主按钮之前'});
checks.push({name:'LAYOUT-HEAT-002：热度提示使用独立横向摘要类',ok:indexText.includes('ln-heat-summary-row'),detail:indexText.includes('ln-heat-summary-row')?'热度已作为独立摘要行':'缺少热度摘要行 class'});
checks.push({name:'SPECIAL-001：存在特殊项目默认隐藏控件',ok:indexText.includes('specialProjectPanel'),detail:indexText.includes('specialProjectPanel')?'搜索页已提供特殊项目状态条':'缺少特殊项目状态条'});
checks.push({name:'SPECIAL-002：默认隐藏专项/定向/预科文案',ok:indexText.includes('已默认隐藏专项、定向、预科'),detail:indexText.includes('已默认隐藏专项、定向、预科')?'默认隐藏文案存在':'缺少默认隐藏说明'});
checks.push({name:'SPECIAL-003：active-assets 包含特殊项目策略',ok:(manifest.stableModules||[]).includes('js/domain/special-project-policy.js'),detail:(manifest.stableModules||[]).includes('js/domain/special-project-policy.js')?'special-project-policy 已纳入稳定模块':'stableModules 缺少 special-project-policy'});
const mainDistCss=await text('./css/dist/ln-rank-main.v3926.css').catch(e=>'');
checks.push({name:'SPECIAL-004：active dist CSS 包含特殊项目样式',ok:(manifest.cssEntry||[]).includes('css/dist/ln-rank-main.v3926.css')&&mainDistCss.includes('SOURCE: css/components/special-project-filter.css'),detail:mainDistCss.includes('SOURCE: css/components/special-project-filter.css')?'特殊项目样式已纳入 main dist CSS':'main dist CSS 缺少 special-project-filter.css source marker'});

const poolControllerText=await text('./js/feature/selection-pool/controller.js').catch(e=>'');
const poolMobileCss=await text('./css/components/selection-pool-mobile-entry.css').catch(e=>'');
checks.push({name:'POOL-MOBILE-001：Android 不显示右下固定报告入口',ok:poolMobileCss.includes('.selection-pool-shell.pool-entry-direct-shell') && poolMobileCss.includes('> .pool-entry-direct'),detail:'手机端保留 toast shell、隐藏桌面固定入口'});
checks.push({name:'POOL-MOBILE-002：添加成功后存在可点击气泡',ok:poolControllerText.includes('pool-entry-action-toast') && poolControllerText.includes('pool-entry-toast-action'),detail:poolControllerText.includes('pool-entry-action-toast')?'已使用操作型气泡':'仍是纯文字 toast'});
checks.push({name:'POOL-MOBILE-003：气泡包含“生成报告”链接',ok:poolControllerText.includes('>生成报告</a>'),detail:poolControllerText.includes('>生成报告</a>')?'气泡包含生成报告入口':'缺少生成报告入口'});
checks.push({name:'POOL-MOBILE-004：气泡自动关闭时间在 3-5 秒之间',ok:poolControllerText.includes('Date.now() + 3800') && poolControllerText.includes('3900'),detail:'目标停留时间 3.8 秒，3.9 秒清理'});
checks.push({name:'POOL-MOBILE-005：结果区已选状态行不是 sticky',ok:poolMobileCss.includes('position: static !important') && !poolMobileCss.includes('position: sticky'),detail:poolMobileCss.includes('position: static !important')?'已选状态行已降为静态轻提示':'仍可能 sticky 遮挡结果'});
checks.push({name:'POOL-MOBILE-006：toast 允许点击',ok:poolMobileCss.includes('pointer-events: auto !important'),detail:poolMobileCss.includes('pointer-events: auto !important')?'气泡允许点击':'toast 仍不可点击'});
checks.push({name:'POOL-MOBILE-007：toast 链接没有被隐藏',ok:poolMobileCss.includes('display: inline-flex !important') && poolMobileCss.includes('.pool-entry-toast-action'),detail:'新 CSS 覆盖旧 display:none 规则'});


const reportFlowText=await text('./js/feature/selection-pool/controller.js').catch(e=>'');
const selectionText=await text('./selection-pool.html').catch(e=>'');
const majorRenderText=await text('./js/feature/major-pool/render.js').catch(e=>'');
checks.push({name:'REPORT-FLOW-001：搜索结果按钮为“放进报告”',ok:majorRenderText.includes('放进报告')&&majorRenderText.includes('已放进报告'),detail:'专业卡片操作已从自选改为报告语义'});
checks.push({name:'REPORT-FLOW-002：浮层文案为“已选 X 个专业｜生成报告”',ok:reportFlowText.includes('已选专业')&&reportFlowText.includes('生成报告'),detail:'搜索页浮层进入生成报告前确认'});
checks.push({name:'REPORT-FLOW-003：确认页标题为“生成报告前确认”',ok:selectionText.includes('生成报告前确认'),detail:'selection-pool 工程路径保持，用户定位已改为报告确认'});
checks.push({name:'REPORT-FLOW-004：确认页存在“已选专业分布”',ok:selectionText.includes('已选专业')&&selectionText.includes('生成前看一眼'),detail:'确认页采用家长可理解的分布和生成前检查文案'});
checks.push({name:'REPORT-FLOW-005：主按钮为“生成飞书报告”语义',ok:selectionText.includes('生成飞书')||selectionText.includes('生成解读版'),detail:'报告动作区保留飞书报告输出能力'});
const forbiddenReport=['本机自选','自选池','收藏夹','我的方案','我的备忘','草稿箱','报告清单','匹配度 92%'];
const visibleJoined=indexText+'\n'+selectionText+'\n'+majorRenderText+'\n'+reportFlowText;
const foundForbidden=forbiddenReport.filter(w=>visibleJoined.includes(w));
checks.push({name:'REPORT-FLOW-006：用户可见不出现账户/自选池/报告清单误导词',ok:!foundForbidden.length,detail:foundForbidden.length?foundForbidden.join('、'):'未发现误导词'});

checks.push({name:'REPORT-FLOW-007：确认页存在已选专业分布组件',ok:(selectionText.includes('已选专业分布')|| (await text('./js/selection-pool.v3923.js').catch(e=>'')).includes('已选专业分布')) && (await text('./css/components/report-content-confirm.css').catch(e=>'')).includes('report-distribution-panel'),detail:'确认页分布组件用于家长快速判断稍高/主要/稳妥搭配'});
checks.push({name:'REPORT-FLOW-008：确认页存在生成前看一眼组件',ok:(selectionText.includes('生成前看一眼')|| (await text('./js/selection-pool.v3923.js').catch(e=>'')).includes('生成前看一眼')) && (await text('./css/components/report-content-confirm.css').catch(e=>'')).includes('before-report-check-panel'),detail:'生成前看一眼用于温和提示方向、城市、费用和特殊项目'});
checks.push({name:'REPORT-FLOW-009：飞书失败态有人话备用方案',ok:(await text('./js/selection-pool.v3923.js').catch(e=>'')).includes('飞书报告暂时没生成成功，可以先复制文字版保存。'),detail:'失败态提供复制文字版，不用冰冷报错'});



const contextCss=await text('./css/components/result-context-compact.css').catch(e=>'');
const majorRenderText2=await text('./js/feature/major-pool/render.js').catch(e=>'');
const bandRender2=await text('./js/feature/score-bands/render.js').catch(e=>'');
checks.push({name:'CONTEXT-BAR-001：存在统一结果说明区',ok:/result-context-bar/.test(contextCss)&&/renderResultContextBar/.test(majorRenderText2),detail:'当前分段、关键词、特殊项目合并为轻量说明区'});
checks.push({name:'CONTEXT-BAR-002：关键词详情默认折叠',ok:/data-result-context-toggle/.test(majorRenderText2)&&/result-context-details/.test(contextCss),detail:'精准匹配/相关方向/行业关联数量进入展开说明'});
checks.push({name:'CONTEXT-BAR-003：特殊项目提示不再默认大横条',ok:/keyword-summary,.results-special-project-note\{display:none!important\}/.test(contextCss.replace(/\s+/g,''))||/results-special-project-note\{display:none!important\}/.test(contextCss.replace(/\s+/g,'')),detail:'结果区特殊项目说明降级为说明条 chip'});
checks.push({name:'CONTEXT-BAR-004：分段当前说明不重复占位',ok:!bandRender2.includes('result-current-detail')&&!bandRender2.includes('当前查看：<b>'),detail:'当前查看信息交给结果说明区承载'});
checks.push({name:'CONTEXT-BAR-005：Android 使用摘要+展开',ok:/@media\(max-width:760px\)/.test(contextCss),detail:'移动端有专门紧凑样式'});

const uiTokenCss=await text('./css/core/ui-token.css').catch(e=>'');
const polishCss=await text('./css/components/parent-report-ui-polish.css').catch(e=>'');
checks.push({name:'UI-POLISH-001：统一视觉 token 存在',ok:uiTokenCss.includes('--ui-radius-card')&&uiTokenCss.includes('--ui-shadow-card')&&uiTokenCss.includes('--action-primary'),detail:'半径、阴影、间距和主按钮色进入统一 token'});
checks.push({name:'UI-POLISH-002：专业卡片降噪样式存在',ok:polishCss.includes('.major-code-line{display:none')&&polishCss.includes('.match-reason{display:none'),detail:'卡片优先学校、专业、分段、分数、核验点，不再像资料库字段'});
checks.push({name:'UI-POLISH-003：“放进报告”不是强主按钮',ok:polishCss.includes('.pool-add-button')&&polishCss.includes('box-shadow:none')&&polishCss.includes('--action-primary-soft'),detail:'放进报告降为中按钮，生成飞书报告保留主按钮'});
checks.push({name:'UI-POLISH-004：确认页分布改为轻摘要 chip',ok:polishCss.includes('.report-distribution-grid')&&polishCss.includes('display:flex')&&polishCss.includes('border-radius:var(--ui-radius-chip)'),detail:'已选专业分布不是五个大统计卡，改为轻摘要'});
checks.push({name:'UI-POLISH-005：PC 确认页右侧摘要宽度受控',ok:polishCss.includes('minmax(300px,360px)')&&polishCss.includes('max-width:360px'),detail:'右侧摘要不抢已选专业列表空间'});
checks.push({name:'UI-POLISH-006：Android 底部入口高度受控',ok:polishCss.includes('min-height:56px')&&polishCss.includes('max-width:760px'),detail:'手机端底部生成报告入口控制在 56-64px 语义'});


const trendHtml=await text('./major-trend-2025.html').catch(e=>'');
const trendJs=await text('./js/major-trend-render.v3923.js').catch(e=>'');
const trendCss=await text('./css/pages/major-trend.css').catch(e=>'');
const trendIndex=await text('./js/feature/trend/index.js').catch(e=>'');
const trendRules=await text('./js/feature/trend/rules.js').catch(e=>'');
const trendVisible=trendHtml+'\n'+trendJs+'\n'+trendCss+'\n'+trendRules;
checks.push({name:'TREND-001：趋势页标题为“专业方向变化参考”',ok:trendHtml.includes('专业方向变化参考')&&trendJs.includes('专业方向变化参考'),detail:'major-trend-2025 已从热度页收口为方向变化辅助判断页'});
checks.push({name:'TREND-002：趋势页存在“先看这页怎么用”',ok:trendJs.includes('先看这页怎么用'),detail:'第一屏先讲用法，口径说明折叠'});
checks.push({name:'TREND-003：趋势页接回主流程',ok:trendHtml.includes('返回查专业')&&trendHtml.includes('生成报告前确认')&&trendJs.includes('返回查专业')&&trendJs.includes('生成报告前确认'),detail:'顶部与底部都能回到查专业 / 报告确认'});
checks.push({name:'TREND-004：趋势指标默认折叠',ok:trendJs.includes('trend-data-details')&&trendCss.includes('.trend-data-details'),detail:'更挤/相对缓和/净变化等数据进入展开数据'});
checks.push({name:'TREND-005：移动端样本卡片化',ok:trendJs.includes('trend-mobile-sample-card')&&trendCss.includes('trend-mobile-sample-list')&&trendCss.includes('.trend-table-wrap { display: none; }'),detail:'Android 默认不用大表格'});
checks.push({name:'TREND-006：趋势 import 版本统一',ok:trendIndex.includes('v=3923')&&trendRules.includes('v=3923')&&!trendIndex.includes('v=3921_6')&&!trendRules.includes('v=3921_6'),detail:'trend/index.js 与 rules.js 内部 import 使用 v3923'});
const trendBad=['热门专业排行榜','录取概率','稳进','必录','保底','兜底','捡漏','稳赚'];
const trendFound=trendBad.filter(w=>trendVisible.includes(w));
checks.push({name:'TREND-007：趋势页禁词扫描',ok:!trendFound.length,detail:trendFound.length?trendFound.join('、'):'未发现热门榜/概率/保证类误导词'});
checks.push({name:'TREND-008：趋势页保留数据口径说明',ok:trendJs.includes('展开口径说明')&&trendJs.includes('数据范围')&&trendJs.includes('排除项目')&&trendJs.includes('分类规则'),detail:'口径仍保留，但默认折叠'});

return checks}
function renderClientChecks(checks){const root=document.getElementById('clientChecks')||document.getElementById('uiChecks');if(root)root.innerHTML=(checks||[]).map(row).join('')}
async function run(){const overall=document.getElementById('overallBadge');overall.className='status warn';overall.textContent='正在自测…';const client=[...(await runManifest()), ...(await runResultUiChecks())];try{const res=await fetch('/api/ln-rank-self-check',{cache:'no-store'});const data=await res.json();document.getElementById('versionBox').textContent=JSON.stringify({version:data.version,catalog:data.catalog,policyLine:data.policyLine,clientChecks:client.length},null,2);document.getElementById('cases').innerHTML=(data.cases||[]).map(c=>row({name:c.input,ok:c.ok,detail:`方向：${c.direction||'—'}｜项目：${c.project||'—'}｜代码：${c.code||'—'}`})).join('');document.getElementById('reports').innerHTML=(data.reports||[]).map(r=>row({name:r.name,ok:r.ok,detail:'长度/块数：'+(r.length||'—')})).join('');document.getElementById('uiChecks').innerHTML=[...(data.uiChecks||[]),...client].map(x=>row({name:x.name,ok:x.ok,detail:x.detail,suggestion:x.suggestion})).join('');document.getElementById('errors').textContent=(data.errors&&data.errors.length)?data.errors.join('\n'):'暂无。';const ok=Boolean(data.ok)&&client.every(x=>x.ok);overall.className='status '+(ok?'ok':'bad');overall.textContent=ok?'全部通过':'存在失败'}catch(e){document.getElementById('errors').textContent=String(e?.stack||e);renderClientChecks(client);overall.className='status '+(client.every(x=>x.ok)?'ok':'bad');overall.textContent=client.every(x=>x.ok)?'客户端检查通过，接口未返回':'自测接口或客户端检查失败'}}
document.getElementById('runSelfCheck')?.addEventListener('click',run);run();console.info('v3.9.26 Android 条件区收口自测已启用。');
