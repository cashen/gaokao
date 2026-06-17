function esc(value){return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function badge(ok){return `<span class="status ${ok?'ok':'bad'}">${ok?'通过':'失败'}</span>`}
function renderCase(c){return `<div class="case"><h3>${esc(c.input)} ${badge(c.ok)}</h3><div class="muted">方向：${esc(c.direction||'—')}｜项目：${esc(c.project||'—')}｜代码：${esc(c.code||'—')}｜专业类：${esc(c.category||'—')}</div>${c.reviewPoints?.length?`<ul class="list">${c.reviewPoints.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${c.errors?.length?`<div class="mono">${esc(c.errors.join('\n'))}</div>`:''}</div>`}
function renderReport(r){return `<div class="case"><h3>${esc(r.name)} ${badge(r.ok)}</h3><div class="muted">长度/块数：${esc(r.length)}</div>${r.errors?.length?`<div class="mono">${esc(r.errors.join('\n'))}</div>`:''}</div>`}
function renderUiCheck(x){return `<div class="case"><h3>${esc(x.name)} ${badge(x.ok)}</h3><div class="muted">${esc(x.detail||'')}</div>${x.suggestion?`<div class="mono">建议：${esc(x.suggestion)}</div>`:''}</div>`}
async function run(){
  const overall=document.getElementById('overallBadge');
  overall.className='status warn'; overall.textContent='正在自测…';
  try{
    const res=await fetch('/api/ln-rank-self-check',{cache:'no-store'});
    const data=await res.json();
    overall.className=`status ${data.ok?'ok':'bad'}`; overall.textContent=data.ok?'全部通过':'存在失败';
    document.getElementById('versionBox').textContent=JSON.stringify({version:data.version,catalog:data.catalog,policyLine:data.policyLine},null,2);
    document.getElementById('cases').innerHTML=(data.cases||[]).map(renderCase).join('');
    document.getElementById('reports').innerHTML=(data.reports||[]).map(renderReport).join('');
    document.getElementById('uiChecks').innerHTML=(data.uiChecks||[]).map(renderUiCheck).join('');
    document.getElementById('errors').textContent=(data.errors&&data.errors.length)?data.errors.join('\n'): '暂无。';
  }catch(error){
    overall.className='status bad'; overall.textContent='自测接口失败';
    document.getElementById('errors').textContent=String(error?.stack||error);
  }
}
document.getElementById('runSelfCheck')?.addEventListener('click',run);
run();

console.info('复核清单生成检查：已纳入 v3.9.18.4；自选专业页与报告会汇总校区、费用、位次、计划、体检、外语和履约复核事项。');

console.info('v3.9.18.4 UI结构检查：自选页按确认分数、整理清单、检查方案、生成报告四步收口，报告状态就近反馈。');
