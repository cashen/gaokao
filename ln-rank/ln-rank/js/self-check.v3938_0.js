/* v3.9.38 active-assets driven self check: version contract + product intent preservation */
function $(id){return document.getElementById(id)}
async function fetchText(path){const res=await fetch(path,{cache:'no-store'}); if(!res.ok) throw new Error(`${path} ${res.status}`); return res.text()}
async function fetchJson(path){return JSON.parse(await fetchText(path))}
function okIcon(ok){return ok?'✅':'❌'}
function render(checks){const root=$('selfCheckResult')||document.body; root.innerHTML=`<div class="self-check-list">${checks.map(c=>`<div class="self-check-row ${c.ok?'is-ok':'is-bad'}"><b>${okIcon(c.ok)} ${c.name}</b><p>${c.detail||''}</p></div>`).join('')}</div>`}
function hasWrongActiveQuery(text){return /\?v=(?!3938_0\b)[0-9A-Za-z_.-]+/.test(text)}
function hasDangerCopy(text){return /(AI不可用|fallback|rules-only|主要参考参考|方案解读解读|命中已收录学科|行业特色相关|录取概率|稳了|必录|捡漏|能上|保底)/.test(text)}
async function main(){
 const checks=[];
 try{
  const assets=await fetchJson('/ln-rank/active-assets.json?v=3938_0');
  const meta=await fetchJson('/ln-rank/release-meta.json?v=3938_0');
  checks.push({name:'active-assets 版本',ok:assets.version==='v3.9.38'&&assets.assetVersion==='v3938_0',detail:`${assets.version} / ${assets.assetVersion}`});
  checks.push({name:'release-meta 版本',ok:meta.version==='v3.9.38'&&meta.assetVersion==='v3938_0',detail:`${meta.version} / ${meta.assetVersion}`});
  for(const rel of [...assets.jsEntry,...assets.cssEntry]){
    const text=await fetchText(`/ln-rank/${rel}?v=3938_0`);
    checks.push({name:`资源存在：${rel}`,ok:text.length>80,detail:`${text.length} bytes`});
    if(rel.endsWith('.js')) checks.push({name:`JS query 统一：${rel}`,ok:!hasWrongActiveQuery(text),detail:'active 文件内 import/export query 应统一 ?v=3938_0'});
    if(rel.endsWith('.css')) checks.push({name:`CSS 不返回 HTML：${rel}`,ok:!/^\s*</.test(text),detail:'active CSS 不能是 HTML 回退页'});
  }
  const htmls=await Promise.all(assets.html.map(rel=>fetchText(`/ln-rank/${rel}?v=3938_0`).then(text=>[rel,text])));
  const footerOk=htmls.every(([rel,text])=>text.includes('版本：v3.9.38')||rel==='self-check.html'&&text.includes('v3.9.38'));
  checks.push({name:'页面可见版本一致',ok:footerOk,detail:'HTML footer/title/self-check 应显示 v3.9.38'});
  const allHtml=htmls.map(x=>x[1]).join('\n');
  checks.push({name:'前台不暴露内部词',ok:!hasDangerCopy(allHtml),detail:'家长正文不显示工程状态、过强承诺和内部字段'});
  const intent=await fetchText('/ln-rank/docs/product-intent-map.md?v=3938_0');
  checks.push({name:'产品意图保真表存在',ok:/不可删除|核验清单|主流程/.test(intent),detail:'UI 工程师接入必须先读 product-intent-map'});
 }catch(err){checks.push({name:'自测执行',ok:false,detail:err.message||String(err)})}
 render(checks);
}
main();
