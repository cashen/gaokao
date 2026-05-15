// V2.9.6 child-interest UI: compact summary in page, full selection in drawer.
(function(){
  function esc(v){const fn=window.htmlSafeV2945||window.v2950Text; if(typeof fn==='function')return fn(String(v??'')); return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function rt(){return window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V2955;}
  let search='';
  function renderSummary(){
    const box=document.getElementById('childInterestBoxV2955'); if(!box||!rt())return;
    const s=rt().readState(); const sum=rt().summary(); const selected=(s.selectedGroups||[]).map(id=>rt().groupById(id)).filter(Boolean);
    box.innerHTML=`<div class="child-interest-compact-v296 ${s.mode==='selected'?'selected':'undecided'}">
      <div class="compact-head-v296"><div><b>${esc(sum.title)}</b><span>${esc(sum.text)}</span></div><button class="execute-secondary" data-action="child-interest-start">编辑兴趣</button></div>
      <div class="child-interest-tags-v296">${selected.map(g=>`<span>${esc(g.name)}<button aria-label="移除${esc(g.name)}" data-action="child-interest-remove" data-interest-id="${esc(g.id)}">×</button></span>`).join('')||'<em>暂不确定，综合推荐</em>'}</div>
      <div class="compact-actions-v296"><button class="secondary slim" data-action="child-interest-undecided">暂不确定，听系统推荐</button><label><input type="checkbox" id="onlyChildInterestV296" ${s.manualOnlyInterest?'checked':''}/> 只看孩子已选方向</label></div>
    </div>${window.LN_CHILD_INTENT_UI_V2975?.renderInline?.()||''}`;
    window.LN_CHILD_INTENT_UI_V2975?.bind?.(box);
    const chk=document.getElementById('onlyChildInterestV296');
    if(chk&&!chk.dataset.bound){chk.dataset.bound='1'; chk.addEventListener('change',()=>{const st=rt().readState(); st.manualOnlyInterest=chk.checked; rt().saveState(st); renderSummary(); window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:'child-interest-change',level:'soft',delay:180});});}
  }
  function groupCard(g,s,q){
    const on=(s.selectedGroups||[]).includes(g.id);
    const text=[g.name,g.desc,(g.match?.core||[]).join(' '),(g.match?.related||[]).join(' '),(g.match?.review||[]).join(' ')].join(' ');
    if(q && !text.includes(q))return '';
    const tags=(arr,n)=>(arr||[]).slice(0,n).map(x=>`<span>${esc(x)}</span>`).join('')||'<span>暂无</span>';
    return `<div class="child-interest-card-v296 ${on?'active':''} color-${esc(g.color||'gray')}" role="button" tabindex="0" data-child-interest-group="${esc(g.id)}">
      <div class="card-main-v296"><strong>${esc(g.name)}</strong><span>${esc(g.desc||'')}</span><em>${esc(g.cycle?.label||'需结合孩子适配复核')}</em></div>
      <div class="interest-subtags-v296"><b>正主</b>${tags(g.match?.core,4)}</div>
      <div class="interest-subtags-v296"><b>相近</b>${tags(g.match?.related,4)}</div>
      <div class="interest-subtags-v296 review"><b>需复核</b>${tags(g.match?.review,3)}</div>
    </div>`;
  }
  function renderDrawerBody(){
    if(!rt())return; const s=rt().readState(); const q=search.trim();
    const selected=(s.selectedGroups||[]).map(id=>rt().groupById(id)).filter(Boolean);
    const body=`<div class="child-interest-drawer-v296">
      <p class="drawer-help-v296">孩子兴趣只做软加权和解释优先级，不替代家庭底线，也不默认排除其他合理备选。</p>
      ${window.LN_CHILD_INTENT_UI_V2975?.renderInline?.()||''}
      <div class="child-interest-selected-line-v296">${selected.map(g=>`<span>${esc(g.name)}<button data-action="child-interest-remove" data-interest-id="${esc(g.id)}">×</button></span>`).join('')||'<em>当前为综合推荐</em>'}</div>
      <div class="child-interest-search-v296"><input id="childInterestSearchV296" placeholder="搜索专业方向，例如：电气、计算机、临床、会计" value="${esc(search)}"/><button class="secondary slim" data-action="child-interest-undecided">暂不确定</button></div>
      <div class="child-interest-grid-v296">${rt().groups().map(g=>groupCard(g,s,q)).join('')||'<div class="notice">没有匹配方向，可以换一个关键词。</div>'}</div>
      <div class="child-interest-cycle-v296"><b>周期提醒：</b>兴趣会变化，建议在分数、家庭底线或招生计划更新后重新确认一次。</div>
    </div>`;
    window.LN_DRAWER_V296?.setBody?.(body);
    window.LN_CHILD_INTENT_UI_V2975?.bind?.(document);
    const input=document.getElementById('childInterestSearchV296');
    if(input){input.focus(); input.setSelectionRange(input.value.length,input.value.length); let timer=null; input.addEventListener('input',()=>{search=input.value; clearTimeout(timer); timer=setTimeout(renderDrawerBody,120);});}
  }
  function openDrawer(){ window.LN_DRAWER_V296?.open?.('孩子专业兴趣方向', '<div class="notice">正在加载...</div>'); renderDrawerBody(); }
  window.LN_CHILD_INTEREST_UI_V296={renderSummary,openDrawer,renderDrawerBody,ready:true};
})();
