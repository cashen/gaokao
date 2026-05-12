(function(){
  'use strict';
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function filterVal(state,k){var f=(state.advancedFilter)||((state.candidates||{}).advancedFilter)||{};return f[k]||'';}
  function checked(state,k){var f=(state.advancedFilter)||((state.candidates||{}).advancedFilter)||{};return !!f[k];}
  function selected(value,current){return String(value)===String(current)?' selected':'';}
  function chipList(list){return (list||[]).slice(0,6).map(function(x){return '<span>'+esc(x)+'</span>';}).join('');}
  function scoreBreakdown(c){var keys=Object.keys(c.scoreBreakdown||{}); if(!keys.length)return '<span>暂无细分</span>'; return keys.map(function(k){return '<span>'+esc(k)+'：'+esc(c.scoreBreakdown[k])+'</span>';}).join('');}
  function cardHtml(c){
    return ['<article class="candidate-detail-card rc2-candidate-card" data-card-key="'+esc(c.key)+'">',
      '<div class="candidate-card-top"><div><span class="plan-pill plan-'+esc(c.planBand)+'">'+esc(c.planTitle)+'</span><h3>'+esc(c.school)+'</h3><p>'+esc(c.major)+'</p></div><button type="button" class="v3-btn small" data-shortlist-toggle="'+esc(c.key)+'">'+(c.inShortlist?'已加入家庭自选池':'加入家庭自选池')+'</button></div>',
      '<div class="candidate-facts"><span>'+esc(c.score2025)+' 分</span><span>位次 '+esc(c.rank2025)+'</span><span>'+esc(c.safety)+'</span><span>'+esc(c.lnArea||c.schoolProvince||'地域待核验')+'</span><span>'+esc(c.schoolNatureLabel)+'</span><span>推荐分 '+esc(c.score)+'</span></div>',
      '<p class="candidate-one-line">'+esc(c.conclusion)+'</p>',
      '<div class="candidate-evidence"><b>'+esc(c.evidenceLevel)+'</b><span>'+esc(c.familyFit)+'</span><span>'+esc(c.interestFit)+'</span><span>'+esc((c.professional&&c.professional.label)||'专业路径待判断')+'</span></div>',
      '<div class="candidate-tags">'+chipList(c.reviewTags)+'</div>',
      (c.professional&&c.professional.warning?'<p class="candidate-evidence-summary">'+esc(c.professional.warning)+'</p>':''),
      c.traps&&c.traps.length?'<div class="rc2-card-warning">'+c.traps.map(esc).join('；')+'</div>':'',
      '<details class="candidate-detail-more"><summary>展开旧版复核逻辑：位次、专业、成本、风险</summary>',
        '<div class="rc2-legacy-grid">',
          '<div><b>位次角色</b><span>'+esc(c.safety)+'</span></div>',
          '<div><b>招生身份</b><span>'+esc(c.identity&&c.identity.label)+'</span><em>'+esc(c.identity&&c.identity.text)+'</em></div>',
          '<div><b>成本提醒</b><span>'+esc(c.cost&&c.cost.label)+'</span><em>'+esc(c.cost&&c.cost.text)+'</em></div>',
          '<div><b>年度位次</b><span>'+esc(c.trend&&c.trend.label)+'</span><em>'+esc(c.trend&&c.trend.text)+'</em></div>',
        '</div>',
        '<div class="rc2-score-breakdown">'+scoreBreakdown(c)+'</div>',
        '<ul>'+(c.nextReview||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul><p>'+esc(c.profileFit)+'</p>',
      '</details>',
      '</article>'].join('');
  }
  function shortlistHtml(items){
    if(!items.length)return '<div class="notice-box">家庭自选池为空。先从下面“候选复核卡”手动加入 2—5 条，再做横向比较；系统候选不会自动进入自选池。</div>';
    return '<div class="shortlist-mini-list">'+items.map(function(item){return '<div><b>'+esc(item.school)+'</b><span>'+esc(item.major)+'</span><em>'+esc(item.planTitle||'')+'｜'+esc(item.safety||'')+'</em><button type="button" class="link-btn" data-shortlist-remove="'+esc(item.key)+'">移出自选池</button></div>';}).join('')+'</div>';
  }
  function compareHtml(items){
    if(!items.length)return '<div class="notice-box">横向比较只读取家庭自选池。当前没有自选项，不再用系统候选自动凑表，避免误导。</div>';
    return ['<div class="candidate-compare-table-wrap"><table class="candidate-compare-table"><thead><tr><th>方案</th><th>学校专业</th><th>位次角色</th><th>专业路径</th><th>复核风险</th></tr></thead><tbody>',
      items.slice(0,6).map(function(x){return '<tr><td>'+esc(x.planTitle||'')+'</td><td><b>'+esc(x.school)+'</b><span>'+esc(x.major)+'</span></td><td>'+esc(x.safety||'')+'</td><td>'+esc((x.professional&&x.professional.label)||x.interestFit||'待复核')+'</td><td>'+esc((x.reviewTags||[]).slice(0,2).join('；')||'复核招生章程')+'</td></tr>';}).join(''),
      '</tbody></table></div>'].join('');
  }
  function optionHtml(state){var s=filterVal(state,'sortBy');return '<option value="profile"'+selected('profile',s)+'>画像匹配优先</option><option value="plan"'+selected('plan',s)+'>按 A/B/C 角色</option><option value="fit"'+selected('fit',s)+'>位次匹配度</option><option value="rank2025"'+selected('rank2025',s)+'>2025 位次</option><option value="rankDiffHot"'+selected('rankDiffHot',s)+'>竞争增强优先</option><option value="rankDiffLoose"'+selected('rankDiffLoose',s)+'>位次放宽优先</option><option value="lift"'+selected('lift',s)+'>提档价值优先</option>';}
  function html(state){
    var p=window.LN_V3_CANDIDATES_ADAPTER.generate(state); var cards=p.list||[]; var pageSize=(window.LN_V3_DEVICE&&window.LN_V3_DEVICE.detect().mobile)?20:50; var visible=cards.slice(0,pageSize); var full=!!filterVal(state,'fullMode'); var shortlist=((state.shortlist||{}).items)||[];
    return ['<section class="step-card rc2-candidates" data-step-view="candidates">',
      '<div class="step-hero"><div class="v3-kicker">第 6 步 · 候选复核</div><h2>候选复核 & 家庭自选池</h2><p>这里是系统候选复核池，不等于自选。只有你手动点击“加入家庭自选池”的条目，才进入家庭重点比较。</p></div>',
      '<div class="step-body">',
      '<div class="plans-overview candidates-overview"><div><span>候选复核卡</span><strong>'+esc(p.total)+'</strong></div><div><span>A</span><strong>'+esc(p.byPlan.A)+'</strong></div><div><span>B</span><strong>'+esc(p.byPlan.B)+'</strong></div><div><span>C</span><strong>'+esc(p.byPlan.C)+'</strong></div><div><span>家庭自选池</span><strong>'+esc(shortlist.length)+'</strong></div></div>',
      '<div class="step-section shortlist-panel"><h3>家庭自选池</h3>'+shortlistHtml(shortlist)+'</div>',
      '<div class="candidate-compare-panel"><div class="section-title-row"><h3>横向比较</h3><span>只比较家庭自选池，不自动拿系统候选凑数</span></div>'+compareHtml(shortlist)+'</div>',
      '<div class="candidate-compare-toolbar rc2-advanced-toolbar"><button type="button" class="v3-btn secondary" data-rc2-fullmode>'+(full?'收起高报师完整模式':'展开高报师完整模式')+'</button><label><span>排序</span><select data-rc2-filter="sortBy">'+optionHtml(state)+'</select></label></div>',
      full?'<div class="rc2-advanced-panel"><label>学校<input class="v3-input" data-rc2-filter="qSchool" value="'+esc(filterVal(state,'qSchool'))+'" placeholder="如 沈阳工程学院"></label><label>专业<input class="v3-input" data-rc2-filter="qMajor" value="'+esc(filterVal(state,'qMajor'))+'" placeholder="如 电气 / 计算机 / 临床"></label><label>A/B/C<select data-rc2-filter="planBand"><option value="">全部</option><option value="A"'+selected('A',filterVal(state,'planBand'))+'>A 守底线</option><option value="B"'+selected('B',filterVal(state,'planBand'))+'>B 看专业</option><option value="C"'+selected('C',filterVal(state,'planBand'))+'>C 看上限</option></select></label><label>位次角色<select data-rc2-filter="rankRole"><option value="">全部</option><option value="farReach"'+selected('farReach',filterVal(state,'rankRole'))+'>超冲过远</option><option value="upper"'+selected('upper',filterVal(state,'rankRole'))+'>上限探索</option><option value="reach"'+selected('reach',filterVal(state,'rankRole'))+'>可冲</option><option value="match"'+selected('match',filterVal(state,'rankRole'))+'>匹配</option><option value="steady"'+selected('steady',filterVal(state,'rankRole'))+'>稳妥</option><option value="safeLow"'+selected('safeLow',filterVal(state,'rankRole'))+'>保底/偏低</option></select></label><label>层级<select data-rc2-filter="schoolTier"><option value="">全部</option><option value="985"'+selected('985',filterVal(state,'schoolTier'))+'>985</option><option value="211"'+selected('211',filterVal(state,'schoolTier'))+'>211</option><option value="public"'+selected('public',filterVal(state,'schoolTier'))+'>公办</option><option value="private"'+selected('private',filterVal(state,'schoolTier'))+'>民办/独立</option></select></label><label>收费<select data-rc2-filter="feeType"><option value="all"'+selected('all',filterVal(state,'feeType'))+'>全部</option><option value="normal"'+selected('normal',filterVal(state,'feeType'))+'>普通学费</option><option value="coopOnly"'+selected('coopOnly',filterVal(state,'feeType'))+'>只看中外/高收费</option><option value="excludeHighPrivate"'+selected('excludeHighPrivate',filterVal(state,'feeType'))+'>排除高收费/民办</option></select></label><label><input type="checkbox" data-rc2-check="onlyConfusable"'+(checked(state,'onlyConfusable')?' checked':'')+'> 只看易混/需复核</label><label><input type="checkbox" data-rc2-check="onlyKey"'+(checked(state,'onlyKey')?' checked':'')+'> 只看重点学科</label><button type="button" class="v3-btn" data-rc2-apply-filter>应用筛选</button></div>':'',
      '<div class="notice-box">'+esc(p.summary)+' 当前渲染 '+visible.length+' 条；手机端默认限制渲染，避免卡顿。</div>',
      '<div class="candidate-card-list">'+(visible.length?visible.map(cardHtml).join(''):'<div class="notice-box">当前筛选下暂无候选。</div>')+'</div>',
      '<div class="v3-actions"><button type="button" class="v3-btn" data-candidates-refresh>重新计算候选复核池</button><button type="button" class="v3-btn" data-candidates-next>去导出</button></div>',
      '</div></section>'].join('');
  }
  function patchFilter(root){var state=window.LN_V3_STORE.getState();var f=Object.assign({},state.advancedFilter||((state.candidates||{}).advancedFilter)||{});root.querySelectorAll('[data-rc2-filter]').forEach(function(el){f[el.getAttribute('data-rc2-filter')]=el.value;});root.querySelectorAll('[data-rc2-check]').forEach(function(el){f[el.getAttribute('data-rc2-check')]=el.checked;});window.LN_V3_STORE.setState({advancedFilter:f,candidates:{advancedFilter:f}},'rc2fix1-advanced-filter');window.LN_V3_COMPUTE_CORE.apply('advanced-filter');}
  function bind(root){
    setTimeout(function(){document.querySelectorAll('#v3BottomTabs a,#v3BottomTabs button,.v3-bottom-tabs a,.v3-bottom-tabs button').forEach(function(el){if(/自选/.test(el.textContent||''))el.innerHTML=(el.innerHTML||'').replace(/自选/g,'候选');});},0);
    var fm=root.querySelector('[data-rc2-fullmode]'); if(fm)fm.addEventListener('click',function(){var st=window.LN_V3_STORE.getState();var f=Object.assign({},st.advancedFilter||{});f.fullMode=!f.fullMode;window.LN_V3_STORE.setState({advancedFilter:f,candidates:{advancedFilter:f}},'rc2fix1-fullmode-toggle');window.LN_V3_WIZARD.render();});
    var apply=root.querySelector('[data-rc2-apply-filter]'); if(apply)apply.addEventListener('click',function(){patchFilter(root);window.LN_V3_WIZARD.render();});
    root.querySelectorAll('[data-rc2-filter]').forEach(function(el){if(el.tagName==='SELECT')el.addEventListener('change',function(){patchFilter(root);window.LN_V3_WIZARD.render();});});
    root.querySelectorAll('[data-shortlist-toggle]').forEach(function(btn){btn.addEventListener('click',function(){var key=btn.getAttribute('data-shortlist-toggle');var st=window.LN_V3_STORE.getState();var exists=((st.shortlist||{}).items||[]).some(function(x){return x.key===key;});if(exists)window.LN_V3_CANDIDATES_ADAPTER.remove(key);else window.LN_V3_CANDIDATES_ADAPTER.add(key);window.LN_V3_WIZARD.render();});});
    root.querySelectorAll('[data-shortlist-remove]').forEach(function(btn){btn.addEventListener('click',function(){window.LN_V3_CANDIDATES_ADAPTER.remove(btn.getAttribute('data-shortlist-remove'));window.LN_V3_WIZARD.render();});});
    var refresh=root.querySelector('[data-candidates-refresh]'); if(refresh)refresh.addEventListener('click',function(){window.LN_V3_COMPUTE_CORE.apply('candidates-refresh');window.LN_V3_CANDIDATES_ADAPTER.apply('candidates-refresh');window.LN_V3_WIZARD.render();});
    var next=root.querySelector('[data-candidates-next]'); if(next)next.addEventListener('click',function(){if(window.LN_V3_STORE.markCompleteThrough)window.LN_V3_STORE.markCompleteThrough('candidates','rc2fix1-candidates-complete');window.LN_V3_ROUTER.go('export','rc2fix1-candidates-next');});
  }
  window.LN_V3_STEP_CANDIDATES={render:function(root,state){root.innerHTML=html(state);bind(root);}};
})();
