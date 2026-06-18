/* v3.9.47.4 active-assets driven self check: version + report contract + global color token + responsive contract + scoped CSS gate */
const VERSION = 'v3.9.47.4';
const ASSET = 'v3947_4';
const ASSET_QUERY = '3947_4';
const REQUIRED_REPORT_SECTIONS = [
  '一、概要判断',
  '二、当前方案怎么看',
  '三、前中后段快速确认',
  '四、最终排序清单',
  '五、本方案确认清单',
  '六、数据和使用边界'
];
function $(id){return document.getElementById(id)}
async function fetchText(path){const res=await fetch(path,{cache:'no-store'}); if(!res.ok) throw new Error(`${path} ${res.status}`); return res.text()}
async function fetchJson(path){return JSON.parse(await fetchText(path))}
function okIcon(ok){return ok?'✅':'❌'}
function statusClass(ok){return ok?'is-ok':'is-bad'}
function setOverall(checks){
  const badge=$('overallBadge');
  if(!badge) return;
  const bad=checks.filter(c=>!c.ok);
  badge.className=`status ${bad.length?'bad':'ok'}`;
  badge.textContent=bad.length?`未通过 ${bad.length} 项`:'自测通过';
}
function renderList(id, checks){
  const root=$(id);
  if(!root) return;
  root.innerHTML=checks.map(c=>`<div class="self-check-row ${statusClass(c.ok)}"><b>${okIcon(c.ok)} ${c.name}</b><p>${c.detail||''}</p>${c.suggestion?`<p class="muted">建议：${c.suggestion}</p>`:''}</div>`).join('') || '<div class="self-check-row"><b>暂无结果</b></div>';
}
function render(checks){
  renderList('selfCheckResult', checks);
  setOverall(checks);
  const errors=$('errors');
  if(errors){
    const bad=checks.filter(c=>!c.ok);
    errors.textContent=bad.length?bad.map(c=>`${c.name}: ${c.detail||''}`).join('\n'):'暂无。';
  }
}
function hasWrongActiveQuery(text){return /\?v=(?!3947_4\b)[0-9A-Za-z_.-]+/.test(text)}
function hasDangerCopy(text){return /(AI不可用|fallback|rules-only|主要参考参考|方案解读解读|命中已收录学科|行业特色相关|稳了|必录|捡漏|能上|保底)/.test(text)}
function hasBlastRadiusSelector(css){return /\[class\*=["'](?:card|Card|chip|tag)["']\]/.test(css)}
function hasRequiredColorTokens(css){return ['--ln-bg','--ln-primary','--ln-action','--ln-action-soft','--ln-touch-target'].every(token=>css.includes(token))}
function hasResponsiveContract(css){return /@media\s*\(\s*max-width\s*:\s*(640|760)px\s*\)/.test(css)&&css.includes('min-height:var(--ln-touch-target)')}
function stripCssComments(css){return css.replace(/\/\*[\s\S]*?\*\//g,'')}
function hasBareButtonBlast(css){const clean=stripCssComments(css); return clean.split('{').some((part,index)=>{if(index===clean.split('{').length-1)return false; const selector=part.split('}').pop().trim(); return selector.split(',').some(s=>/^button(?:\s|$|[:.#\[])/.test(s.trim()))})}
function checkReportSectionContract(markdown=''){
  const h2 = markdown.split(/\n+/).filter(line => /^##\s+/.test(line)).map(line => line.replace(/^##\s+/, '').trim());
  const ok = REQUIRED_REPORT_SECTIONS.every((section, index) => h2[index] === section) && h2.length === REQUIRED_REPORT_SECTIONS.length;
  return { ok, detail: ok ? h2.join('｜') : `实际二级标题：${h2.join('｜') || '未识别'}` };
}
async function checkSelfCheckApi(){
  const data = await fetchJson('/api/ln-rank-self-check?v=3947_4');
  const checks=[];
  checks.push({name:'self-check API 返回 JSON',ok:typeof data==='object'&&data!==null,detail:`ok=${Boolean(data.ok)}｜version=${data.version||'未返回'}`});
  checks.push({name:'self-check API 版本同步',ok:data.version===VERSION,detail:`${data.version||'未返回'} / ${VERSION}`});
  if(Array.isArray(data.cases)){
    renderList('cases', data.cases.map(c=>({name:c.input||c.name||'用例', ok:Boolean(c.ok), detail:c.errors?.join('；')||`方向=${c.direction||'—'}｜代码=${c.code||'—'}`})));
  }
  if(Array.isArray(data.reports)){
    renderList('reports', data.reports.map(c=>({name:c.name||'报告用例', ok:Boolean(c.ok), detail:c.errors?.join('；')||`length=${c.length||0}`})));
    const reportCase=data.reports.find(x=>x.name==='带解读报告');
    checks.push({name:'API 报告六段合同用例',ok:!reportCase || reportCase.ok,detail:reportCase?`${reportCase.errors?.join('；')||'通过'}｜length=${reportCase.length}`:'未返回带解读报告用例'});
  }
  if(Array.isArray(data.uiChecks)){
    renderList('uiChecks', data.uiChecks.map(c=>({name:c.name||'UI 用例', ok:Boolean(c.ok), detail:c.detail||'', suggestion:c.suggestion||''})));
  }
  return checks;
}
async function main(){
 const checks=[];
 try{
  const assets=await fetchJson('/ln-rank/active-assets.json?v=3947_4');
  const meta=await fetchJson('/ln-rank/release-meta.json?v=3947_4');
  const manifest=await fetchJson('/ln-rank/module-manifest.json?v=3947_4');
  checks.push({name:'active-assets 版本',ok:assets.version===VERSION&&assets.assetVersion===ASSET,detail:`${assets.version} / ${assets.assetVersion}`});
  checks.push({name:'release-meta 版本',ok:meta.version===VERSION&&meta.assetVersion===ASSET,detail:`${meta.version} / ${meta.assetVersion}`});
  checks.push({name:'module-manifest 版本',ok:manifest.version===VERSION&&manifest.assetVersion===ASSET,detail:`${manifest.version} / ${manifest.assetVersion}`});
  checks.push({name:'报告六段发布标记',ok:Boolean(assets.reportSixSectionContract&&meta.reportSixSectionContract&&manifest.reportSixSectionContract),detail:'active-assets / release-meta / manifest 均应声明 reportSixSectionContract'});
  const versionBox=$('versionBox');
  if(versionBox) versionBox.textContent=`${assets.version} / ${assets.assetVersion} / ${meta.release}`;

  for(const rel of [...assets.jsEntry,...assets.cssEntry]){
    const text=await fetchText(`/ln-rank/${rel}?v=${ASSET_QUERY}`);
    checks.push({name:`资源存在：${rel}`,ok:text.length>80,detail:`${text.length} bytes`});
    if(rel.endsWith('.js')) checks.push({name:`JS query 统一：${rel}`,ok:!hasWrongActiveQuery(text),detail:'active 文件内 import/export query 应统一 ?v=3947_4'});
    if(rel.endsWith('.css')){
      checks.push({name:`CSS 不返回 HTML：${rel}`,ok:!text.trimStart().startsWith('<'),detail:'active CSS 不能是 HTML 回退页'});
      checks.push({name:`CSS selector 半径：${rel}`,ok:!hasBlastRadiusSelector(text)&&!hasBareButtonBlast(text),detail:'active CSS 禁止 [class*=card/chip/tag] 和裸 button 这类跨页模糊选择器'});
      checks.push({name:`全站色彩 token：${rel}`,ok:hasRequiredColorTokens(text),detail:'active CSS 应包含 --ln-bg / --ln-primary / --ln-action 等统一 token'});
      checks.push({name:`多终端响应式合同：${rel}`,ok:hasResponsiveContract(text),detail:'active CSS 应包含 640px 小屏合同、44px 触控目标和长文本抗溢出'});
    }
  }
  const htmls=await Promise.all(assets.html.map(rel=>fetchText(`/ln-rank/${rel}?v=${ASSET_QUERY}`).then(text=>[rel,text])));
  const footerOk=htmls.every(([rel,text])=>text.includes(`版本：${VERSION}`)||rel==='self-check.html'&&text.includes(VERSION));
  checks.push({name:'页面可见版本一致',ok:footerOk,detail:`HTML footer/title/self-check 应显示 ${VERSION}`});
  const allHtml=htmls.map(x=>x[1]).join('\n');
  checks.push({name:'前台不暴露内部词',ok:!hasDangerCopy(allHtml),detail:'家长正文不显示工程状态、过强承诺和内部字段'});
  const contract=await fetchText('/ln-rank/js/domain/version-contract.js?v=3947_4');
  checks.push({name:'前端 version-contract 同步',ok:contract.includes(VERSION)&&contract.includes('3947_4')&&contract.includes(meta.release),detail:'display / asset / release 应与 release-meta 一致'});
  const intent=await fetchText('/ln-rank/docs/product-intent-map.md?v=3947_4');
  checks.push({name:'产品意图保真表存在',ok:/不可删除|核验清单|主流程/.test(intent),detail:'UI 工程师接入必须先读 product-intent-map'});

  try{
    const apiChecks=await checkSelfCheckApi();
    checks.push(...apiChecks);
  }catch(err){
    checks.push({name:'self-check API 可达性',ok:false,detail:err.message||String(err),suggestion:'本地静态预览可能无 Functions；线上部署后需再测。'});
  }
 }catch(err){checks.push({name:'自测执行',ok:false,detail:err.message||String(err)})}
 render(checks);
}

document.addEventListener('DOMContentLoaded',()=>{
  const btn=$('runSelfCheck');
  if(btn) btn.addEventListener('click', main);
});
