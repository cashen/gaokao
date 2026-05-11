// V2.9.8.2.fix3 child-interest UI: drawer click is lightweight; main refresh flushes after drawer close.
(function(){
  function esc(v){const fn=window.htmlSafeV2945||window.v2950Text; if(typeof fn==='function')return fn(String(v??'')); return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function rt(){return window.LN_CHILD_INTEREST_RUNTIME_V298||window.LN_CHILD_INTEREST_RUNTIME_V296;}
  let search='';
  let drawerRenderedOnce=false;
  function autoChips(auto){return (auto||[]).map(x=>`<span class="auto-interest-chip-v2976">${esc(x.label)}<button title="取消该自动带入方向" data-action="child-interest-auto-toggle" data-intent-id="${esc(x.intentId)}" data-interest-id="${esc(x.interestId)}">×</button></span>`).join('');}
  function hitLine(sum){if(!sum?.hit)return ''; const h=sum.hit; return `<div class="interest-hit-line-v298">当前真实候选命中：<b>正主 ${Number(h.core||0)}</b><b>相近 ${Number(h.related||0)}</b><b>需复核 ${Number(h.review||0)}</b></div>`;}
  function renderSummary(){
    const box=document.getElementById('childInterestBoxV2955'); if(!box||!rt())return; const s=rt().readState(); const sum=rt().summary();
    const manual=(s.selectedGroups||[]).map(id=>rt().groupById(id)).filter(Boolean); const auto=rt().autoMappings?.(s)||[]; const selected=!!(sum.names&&sum.names.length);
    const html=`<div class="child-interest-compact-v296 child-interest-compact-v298 ${selected?'selected':'undecided'}"><div class="compact-head-v296"><div><b>${esc(sum.title)}</b><span>${esc(sum.activeTitle||sum.text)}</span></div><button class="execute-secondary" data-action="child-interest-start">编辑兴趣</button></div>${hitLine(sum)}<p class="interest-closed-note-v298">${esc(sum.text||'系统只对真实候选做目录匹配，不会生成不存在的专业。')}</p><div class="child-interest-tags-v296">${manual.map(g=>`<span>${esc(g.name)}<button aria-label="移除${esc(g.name)}" data-action="child-interest-remove" data-interest-id="${esc(g.id)}">×</button></span>`).join('')}${autoChips(auto)||(!manual.length?'<em>暂不确定，综合推荐</em>':'')}</div><div class="compact-actions-v296"><button class="secondary slim" data-action="child-interest-undecided">清空兴趣</button><label><input type="checkbox" id="onlyChildInterestV296" ${s.manualOnlyInterest?'checked':''}/> 只看真实命中兴趣方向</label></div></div>`;
    if(box.dataset.lastChildInterestHtml!==html){box.innerHTML=html;box.dataset.lastChildInterestHtml=html;}
    bindSummaryControls(box);
  }
  function bindSummaryControls(root){
    const chk=(root||document).querySelector('#onlyChildInterestV296');
    if(chk&&!chk.dataset.bound){chk.dataset.bound='1'; chk.addEventListener('change',()=>{const st=rt().readState(); st.manualOnlyInterest=chk.checked; rt().saveState(st); renderSummary(); window.LN_INTEREST_HIT_SUMMARY_V298?.scheduleAggregate?.(null,900); window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:'child-interest-change',level:'soft',delay:900});});}
  }
  function lightSum(s){
    const manual=(s.selectedGroups||[]).map(id=>rt().groupById(id)).filter(Boolean).map(g=>g.name);
    const auto=(rt().autoMappings?.(s)||[]).map(x=>x.label);
    const active=[...new Set([...manual,...auto])];
    return {title:active.length?'已激活方向：'+active.join('、'):'未激活方向',text:active.length?'关闭窗口后统一刷新 A/B/C 和详细候选，避免点选卡顿。':'当前为综合推荐'};
  }
  function groupCard(g,s,q){
    const on=(s.selectedGroups||[]).includes(g.id); const auto=(rt().autoMappings?.(s)||[]).some(x=>x.interestId===g.id);
    const text=[g.name,g.desc,(g.match?.core||[]).join(' '),(g.match?.related||[]).join(' '),(g.match?.review||[]).join(' ')].join(' '); if(q&&!text.includes(q))return '';
    const tags=(arr,n)=>(arr||[]).slice(0,n).map(x=>`<span>${esc(x)}</span>`).join('')||'<span>暂无</span>';
    const cnt=(window.__LN_INTEREST_HIT_CACHE_V298||{})[g.id];
    const cntLine=cnt?`<div class="interest-card-hit-v298">上次候选命中：正主 ${cnt.core||0}｜相近 ${cnt.related||0}｜复核 ${cnt.review||0}</div>`:`<div class="interest-card-hit-v298 muted">点选后关闭抽屉，系统再统一计算真实候选。</div>`;
    return `<div class="child-interest-card-v296 ${on?'active':''} ${auto?'auto-mapped-v2976':''} color-${esc(g.color||'gray')}" role="button" tabindex="0" data-child-interest-group="${esc(g.id)}"><div class="card-main-v296"><strong>${esc(g.name)}${auto?'｜已激活':''}</strong><span>${esc(g.desc||'')}</span><em>${esc(g.cycle?.label||'需结合孩子适配复核')}</em></div>${cntLine}<div class="interest-subtags-v296"><b>正主规则</b>${tags(g.match?.core,4)}</div><div class="interest-subtags-v296"><b>相近规则</b>${tags(g.match?.related,4)}</div><div class="interest-subtags-v296 review"><b>需复核</b>${tags(g.match?.review,3)}</div></div>`;
  }
  function selectedLineHtml(s){
    const manual=(s.selectedGroups||[]).map(id=>rt().groupById(id)).filter(Boolean); const auto=rt().autoMappings?.(s)||[];
    return `${manual.map(g=>`<span>${esc(g.name)}<button data-action="child-interest-remove" data-interest-id="${esc(g.id)}">×</button></span>`).join('')}${autoChips(auto)||(!manual.length?'<em>当前为综合推荐</em>':'')}`;
  }
  function renderDrawerSelectionOnly(){
    if(!rt())return; const s=rt().readState(); const sum=lightSum(s);
    const live=document.querySelector('.interest-drawer-live-v298'); if(live){const b=live.querySelector('b'); const sp=live.querySelector('span'); const p=live.querySelector('p'); if(b)b.textContent='孩子兴趣已更新'; if(sp)sp.textContent=sum.title; if(p)p.textContent=sum.text;}
    const line=document.querySelector('.child-interest-selected-line-v296'); if(line)line.innerHTML=selectedLineHtml(s);
    const selected=new Set(s.selectedGroups||[]); const autoIds=new Set((rt().autoMappings?.(s)||[]).map(x=>x.interestId));
    document.querySelectorAll('[data-child-interest-group]').forEach(card=>{const id=card.dataset.childInterestGroup; card.classList.toggle('active',selected.has(id)); card.classList.toggle('auto-mapped-v2976',autoIds.has(id)); const strong=card.querySelector('.card-main-v296 strong'); const g=rt().groupById(id); if(strong&&g)strong.textContent=g.name+(autoIds.has(id)?'｜已激活':'');});
    const tr=window.LN_CHILD_INTENT_TRANSLATOR_V2976||window.LN_CHILD_INTENT_TRANSLATOR_V298; const st=tr?.readState?.(); const intentSet=new Set(st?.selectedIntentIds||[]); document.querySelectorAll('[data-child-intent-id]').forEach(btn=>btn.classList.toggle('active',intentSet.has(btn.dataset.childIntentId)));
  }
  function renderDrawerBody(){
    if(!rt())return; const s=rt().readState(); const q=search.trim(); const sum=lightSum(s);
    const body=`<div class="child-interest-drawer-v296 child-interest-drawer-v298"><p class="drawer-help-v296">孩子说的是兴趣，不是专业名。点选会先在抽屉内轻量记录；关闭抽屉后再统一刷新 A/B/C 和详细候选，避免卡顿。</p>${window.LN_CHILD_INTENT_UI_V298?.renderInline?.()||window.LN_CHILD_INTENT_UI_V2976?.renderInline?.()||''}<div class="interest-drawer-live-v298"><b>孩子兴趣</b><span>${esc(sum.title)}</span><p>${esc(sum.text)}</p></div><div class="child-interest-selected-line-v296">${selectedLineHtml(s)}</div><div class="child-interest-search-v296"><input id="childInterestSearchV296" placeholder="搜索专业方向，例如：动物医学、法学、电气、仪器" value="${esc(search)}"/><button class="secondary slim" data-action="child-interest-undecided">清空</button></div><div class="child-interest-grid-v296">${rt().groups().map(g=>groupCard(g,s,q)).join('')||'<div class="notice">没有匹配方向，可以换一个关键词。</div>'}</div><div class="child-interest-cycle-v296"><b>闭环说明：</b>兴趣只激活规则；A/B/C 和导出只使用当前真实候选中的正主、相近或需复核命中项。</div></div>`;
    window.LN_DRAWER_V296?.setBody?.(body); (window.LN_CHILD_INTENT_UI_V298||window.LN_CHILD_INTENT_UI_V2976)?.bind?.(document);
    const input=document.getElementById('childInterestSearchV296'); if(input){let timer=null; input.addEventListener('input',()=>{search=input.value; clearTimeout(timer); timer=setTimeout(renderDrawerBody,160);}); if(!drawerRenderedOnce){input.focus(); input.setSelectionRange(input.value.length,input.value.length); drawerRenderedOnce=true;}}
  }
  function openDrawer(){drawerRenderedOnce=false; window.__LN_ACTIVE_DRAWER_TYPE='childInterest'; window.LN_DRAWER_V296?.open?.('孩子兴趣与真实候选匹配','<div class="notice">正在加载...</div>'); renderDrawerBody();}
  const api={renderSummary,openDrawer,renderDrawerBody,renderDrawerSelectionOnly,ready:true,version:'V2.9.8.2.fix4'}; window.LN_CHILD_INTEREST_UI_V298=api; window.LN_CHILD_INTEREST_UI_V2976=api; window.LN_CHILD_INTEREST_UI_V296=api;
})();
