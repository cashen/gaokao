/* v3.9.33 active-assets driven self check */
function $(id){return document.getElementById(id)}
async function fetchText(path){const res=await fetch(path,{cache:'no-store'}); if(!res.ok) throw new Error(`${path} ${res.status}`); return res.text()}
async function fetchJson(path){return JSON.parse(await fetchText(path))}
function okIcon(ok){return ok?'✅':'❌'}
function render(checks){const root=$('selfCheckResult')||document.body; root.innerHTML=`<div class="self-check-list">${checks.map(c=>`<div class="self-check-row ${c.ok?'is-ok':'is-bad'}"><b>${okIcon(c.ok)} ${c.name}</b><p>${c.detail||''}</p></div>`).join('')}</div>`}
function importsOf(js){return [...js.matchAll(/(?:import|export)\s+(?:[^'\"]*?from\s*)?['\"]([^'\"]+\.js(?:\?v=[^'\"]+)?)['\"]/g)].map(m=>m[1])}
function hasOldVersionQuery(text){return /\?v=(?!3933\b)[0-9A-Za-z_.-]+/.test(text)}
async function main(){
 const checks=[];
 try{
  const assets=await fetchJson('/ln-rank/active-assets.json?v=3933');
  checks.push({name:'active-assets 版本',ok:assets.version==='v3.9.33'&&assets.assetVersion==='v3933',detail:`${assets.version} / ${assets.assetVersion}`});
  for(const rel of [...assets.jsEntry,...assets.cssEntry]){
    const text=await fetchText(`/ln-rank/${rel}?v=3933`);
    checks.push({name:`资源存在：${rel}`,ok:text.length>80,detail:`${text.length} bytes`});
    if(rel.endsWith('.js')) checks.push({name:`JS query 统一：${rel}`,ok:!hasOldVersionQuery(text),detail:'active 文件内 import/export query 应统一 ?v=3933'});
    if(rel.endsWith('.css')) checks.push({name:`CSS 包含院校专业背景合同：${rel}`,ok:/local-context-contract|local-context-inline|workspace-local-context-chip/.test(text),detail:'active dist 需包含 local-context 样式'});
  }
  const indexHtml=await fetchText('/ln-rank/index.html?v=3933');
  const selectionHtml=await fetchText('/ln-rank/selection-pool.html?v=3933');
  checks.push({name:'页面底部版本一致',ok:/版本：v3\.9\.33/.test(indexHtml)&&/版本：v3\.9\.33/.test(selectionHtml),detail:'首页和自选页 footer 都应显示 v3.9.33'});
  const activeJs=await fetchText('/ln-rank/js/app.v3933.js?v=3933') + '\n' + await fetchText('/ln-rank/js/selection-pool.v3933.js?v=3933');
  checks.push({name:'前台不暴露内部词',ok:!new RegExp(['辽宁属地'+'强链','一级'+'命中','二级'+'命中','强'+'链：','强'+'链复核'].join('|')).test(indexHtml+selectionHtml+activeJs),detail:'前台使用“本校方向/本校相关/方向提醒/院校专业背景复核”'});
  checks.push({name:'卡片/自选不输出长解释类',ok:!/local-chain-card-tip|workspace-local-chain/.test(activeJs),detail:'单卡和自选只能短标签，不显示报告级解释'});
 }catch(err){checks.push({name:'自测执行',ok:false,detail:err.message||String(err)})}
 render(checks);
}
main();
