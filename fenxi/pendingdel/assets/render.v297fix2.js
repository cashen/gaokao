// V2.9.5.4 render-engine: card rendering, scenario/preference UI and light UI helpers
function parentLine(r){
  if(r._level==='匹配')return '这条与当前位次接近，适合作为主体候选，需要精读招生计划和专业组。';
  if(r._level==='稳妥')return '这条录取把握更高，适合放在中后段兜住，但仍要看专业质量。';
  if(r._level==='保底')return '这条偏保底，用来兜住底线，不建议只因稳就盲选。';
  if(r._level==='可冲')return '这条是可冲候选，适合少量放在前段，不建议只依赖这一类选择。';
  if(r._level==='超冲')return '这条明显偏冲，除非特别喜欢，否则不要占用太多志愿位。';
  if(r._level==='过低')return '这条位次放宽较多，可以做兜底核验，但要防止专业和学校质量让步过大。';
  return '未输入位次时仅作检索参考。';
}
function exclusionBucket(ex){
  if(ex.some(x=>String(x).includes('区域')||String(x).includes('不在目标区域')))return '区域排除';
  if(ex.some(x=>String(x).includes('预算')||String(x).includes('高收费')))return '预算排除';
  if(ex.some(x=>String(x).includes('不学医')||String(x).includes('师范')||String(x).includes('画像')))return '画像排除';
  return '低匹配排除';
}


/* V2.9.4.6.2 卡片折叠与信息密度优化：只改展示层，不改 4.6 数据模型。 */
const CARD_VIEW_MODE_KEY_V29461 = 'ln_card_view_mode_v29461';
function isMobileV29461(){ return window.matchMedia && window.matchMedia('(max-width:760px)').matches; }
function defaultCardViewModeV29461(){ return isMobileV29461() ? 'compact' : 'standard'; }
function getCardViewModeV29461(){
  const v = localStorage.getItem(CARD_VIEW_MODE_KEY_V29461);
  return ['compact','standard','detailed'].includes(v) ? v : defaultCardViewModeV29461();
}
function setCardViewModeV29461(mode){
  if(!['compact','standard','detailed'].includes(mode)) mode = defaultCardViewModeV29461();
  localStorage.setItem(CARD_VIEW_MODE_KEY_V29461, mode);
  applyCardViewModeClassV29461();
  syncCardViewModeButtonsV29461();
  if(typeof renderCards === 'function') renderCards();
}
function applyCardViewModeClassV29461(){
  const mode = getCardViewModeV29461();
  document.body.classList.remove('card-mode-compact','card-mode-standard','card-mode-detailed');
  document.body.classList.add('card-mode-' + mode);
}
function cardDetailOpenV29461(section){
  const mode = getCardViewModeV29461();
  if(mode === 'detailed') return section !== 'debug';
  return false;
}
function syncCardViewModeButtonsV29461(){
  const mode = getCardViewModeV29461();
  document.querySelectorAll('[data-card-view-mode]').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.cardViewMode === mode);
  });
  const label = document.getElementById('cardViewModeLabelV29461');
  if(label){
    const map = {compact:'紧凑：先快筛', standard:'标准：摘要+风险', detailed:'详细：默认展开'};
    label.textContent = map[mode] || map.standard;
  }
}
function ensureCardViewModeToolbarV29461(){
  if(document.getElementById('cardViewModeToolbarV29461')) { syncCardViewModeButtonsV29461(); return; }
  const anchor = document.getElementById('filterSummary') || document.getElementById('cards');
  if(!anchor || !anchor.parentElement) return;
  const bar = document.createElement('div');
  bar.id = 'cardViewModeToolbarV29461';
  bar.className = 'view-mode-toolbar-v29461';
  bar.innerHTML = `
    <div class="view-mode-left-v29461">
      <b>卡片显示</b>
      <span id="cardViewModeLabelV29461">标准：摘要+风险</span>
    </div>
    <div class="view-mode-buttons-v29461" role="group" aria-label="卡片显示模式">
      <button type="button" data-card-view-mode="compact" onclick="setCardViewModeV29461('compact')">紧凑</button>
      <button type="button" data-card-view-mode="standard" onclick="setCardViewModeV29461('standard')">标准</button>
      <button type="button" data-card-view-mode="detailed" onclick="setCardViewModeV29461('detailed')">详细</button>
    </div>
    <div class="view-mode-tip-v29461">复核标签默认外露，解释内容按需展开；PNG 导出跟随当前展开状态。</div>`;
  anchor.parentElement.insertBefore(bar, anchor);
  syncCardViewModeButtonsV29461();
}
function firstUsefulV29461(list, n){ return (Array.isArray(list)?list:[]).filter(Boolean).slice(0,n); }
function riskBadgesV29461(r){
  const out=[];
  const pairs = (typeof confusablePairsForRecordV2946 === 'function') ? confusablePairsForRecordV2946(r) : [];
  if(r.isCollegeSpecialPlanV29474) out.push({text:'高校专项资格', cls:'warn'});
  if(r._qualificationGate?.matched || (r.qualificationGatesV296||[]).length) out.push({text:'资格型入口', cls:'warn'});
  if(r.isCoopV29475) out.push({text:'中外合作', cls:'danger'});
  else if(r.isHighFee) out.push({text:'高收费', cls:'danger'});
  if(r.isPrivateV29475) out.push({text:'民办本科', cls:'warn'});
  if(pairs.length) out.push({text:'易混专业', cls:'warn'});
  const idn = (typeof admissionIdentityV2945 === 'function') ? admissionIdentityV2945(r) : null;
  if(idn && ['大类招生','试验班/特色班','中外合作/高收费','专项/特殊入口'].includes(idn.label)) out.push({text:idn.label, cls:idn.cls==='danger'?'danger':'warn'});
  const cost = (typeof costInsightV2945 === 'function') ? costInsightV2945(r) : null;
  if(cost && ['danger','warn'].includes(cost.cls)) out.push({text:cost.label, cls:cost.cls});
  if(r.undergradDisciplineName) out.push({text:r.undergradDisciplineName, cls:'soft'});
  if(r.undergradCategoryName) out.push({text:r.undergradCategoryName, cls:'soft'});
  const gh=cityPreferenceHintV29472(r);
  if(gh.state==='match') out.push({text:'城市匹配', cls:'soft'});
  if(gh.state==='miss' && cityModeV29472()==='soft') out.push({text:'非目标城市', cls:'warn'});
  const sh = (typeof studentProfileHintsV29471==='function') ? studentProfileHintsV29471(r) : [];
  if(sh.some(x=>['high','medium'].includes(x.priority))) out.push({text:'学生适配提醒', cls:'warn'});
  const interestBadges=window.LN_CHILD_INTEREST_RUNTIME_V296?.badgesForRecord?.(r)||[];
  out.push(...interestBadges);
  const seen=new Set();
  return out.filter(x=>{const k=x.text; if(seen.has(k))return false; seen.add(k); return true;}).slice(0,7);
}
function primarySummaryV29461(r){
  const pairs = (typeof confusablePairsForRecordV2946 === 'function') ? confusablePairsForRecordV2946(r) : [];
  if(pairs.length){
    const p=pairs[0];
    const current=(p.items||[]).find(x=>x.record_id===r.id)||(p.items||[])[0]||{};
    if(current && current.catalog_major_code){
      return `易混提醒：${current.catalog_major_code}｜${current.discipline_category_name||'门类待复核'}｜${current.major_class_name||'专业大类待复核'}。${current.warning_summary_v29462 || p.parent_warning || '名字相近，但方向可能不同。'}`;
    }
    return '易混提醒：名字相近，但方向可能不同，建议看本科代码和专业大类。';
  }
  const traps = (typeof nameTrapV2945 === 'function') ? nameTrapV2945(r) : [];
  if(traps.length) return traps[0];
  const idn = (typeof admissionIdentityV2945 === 'function') ? admissionIdentityV2945(r) : null;
  if(idn) return idn.text;
  return '建议结合本科代码、招生备注、学费和位次变化一起判断，不要只看专业名称。';
}
function compactOfficialLineV29461(r){
  const code = r.officialMajorCode || r.undergradMajorCode || r.catalog_major_code || '';
  const disc = r.undergradDisciplineName || '';
  const cat = r.undergradCategoryName || '';
  const parts = [code, disc, cat].filter(Boolean);
  return parts.length ? parts.join('｜') : '本科目录口径待复核';
}


/* V2.9.4.6 家长关心点表达增强层：不新增外部保研率数据，只把 2.9.4.4 现有字段翻译成家长可读判断。 */
function htmlSafeV2945(v){
  return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function moneyTextV2945(v){
  if(v == null || v === '' || v === '待核验') return '待核验';
  const n = Number(String(v).replace(/[^\d.]/g,''));
  if(!Number.isFinite(n) || n<=0) return String(v);
  return n >= 10000 ? `${Math.round(n/1000)/10}万/年` : `${Math.round(n)}元/年`;
}
function admissionIdentityV2945(r){
  const raw = String(r.major || '');
  const clean = String(r.cleanMajor || raw);
  const review = String(r.admissionReviewStatus || r.admissionReviewTags || r.reviewStatus || '');
  const off = r.officialUndergrad2026 || {};
  const attrs = [];
  if(r.isHighFee || /中外合作|合作办学|高收费|国际|联合培养/.test(raw)) attrs.push('中外合作/高收费');
  if(/试验班|实验班|拔尖|卓越|强基|基地班|英才班/.test(raw)) attrs.push('试验班/特色班');
  if(/预科|民族班|定向|专项/.test(raw)) attrs.push('专项/特殊入口');
  if(/类(?:\(|（|$)|工科试验|理科试验/.test(clean) || off.kind === 'category' || /category|大类|专业类/.test(review)) attrs.push('大类招生');
  if(/方向|校企|智能|创新|实验|特色/.test(raw) && !attrs.includes('试验班/特色班')) attrs.push('方向/培养模式');
  if(!attrs.length) attrs.push('具体专业倾向');
  let label = attrs[0], cls='ok', text='招生名与本科目录专业较接近，但仍要保留原始招生名，避免丢失校区、学费、备注、体检等限制。';
  if(label==='大类招生'){cls='warn';text='这不是最终毕业专业，通常还要看入校后的专业分流规则。不要默认等于其中某一个热门专业。';}
  if(label==='试验班/特色班'){cls='warn';text='这是招生入口或培养模式名称，不宜直接等同单一本科目录专业。重点核验分流、退出和转专业规则。';}
  if(label==='中外合作/高收费'){cls='danger';text='专业本体可校准，但收费、培养方案、证书说明和转专业政策需要单独核验，不宜按普通同名专业理解。';}
  if(label==='专项/特殊入口'){cls='warn';text='这类入口通常有资格、培养或政策条件，不宜直接和普通专业混排理解。';}
  if(label==='方向/培养模式'){cls='mid';text='目录校准只识别专业本体，括号内方向或培养模式要作为招生属性单独保留。';}
  return {label, cls, attrs, text, raw, clean};
}
function rankTrendV2945(r){
  const d = Number(r.rankDiff);
  if(!Number.isFinite(d)) return {label:'缺少对比', cls:'mid', text:'缺少 2024/2025 连续对比，先按 2025 位次作为主参考。'};
  const abs = Math.abs(d);
  const base = Number(r.rank2024)||Number(r.rank2025)||0;
  const pct = base ? abs/base : 0;
  if(abs < 300 || pct < 0.03) return {label:'基本稳定', cls:'ok', text:`2024→2025 位次变化较小（${d>0?'+':''}${fmt(d)}），主要看自身位次匹配。`};
  if(d < 0) return {label:'竞争增强', cls:pct>0.18?'danger':'warn', text:`2025 位次比 2024 前移 ${fmt(abs)} 位，说明这条更难进了，放入“冲/稳”时要更保守。`};
  return {label:'位次放宽', cls:'ok', text:`2025 位次比 2024 后移 ${fmt(abs)} 位，相对更好进，但要复核是否有扩招、学费、校区或专业属性变化。`};
}
function costInsightV2945(r){
  const fee = moneyTextV2945(r.tuition2025);
  const isPrivate = /民办|独立/.test(String(r.schoolNature?.label || r.schoolNatureLabel || ''));
  if(r.isHighFee || /中外合作|高收费/.test(String(r.major||'') + String(r.tuitionStatus||''))){
    return {label:'成本压力较高', cls:'danger', text:`学费/收费属性：${fee}。普通家庭不要只看学校名，建议单独核验总成本、证书说明和转专业政策。`};
  }
  if(isPrivate){
    return {label:'民办/独立学院成本需核算', cls:'warn', text:`学校性质倾向：${r.schoolNature?.label||'民办/独立'}；学费：${fee}。建议把四年总成本和就业预期一起算。`};
  }
  if(fee === '待核验') return {label:'学费待核验', cls:'mid', text:'当前学费字段待核验。正式填报前建议回到招生计划或学校招生章程确认。'};
  return {label:'成本压力较低', cls:'ok', text:`学费参考：${fee}。仍需复核住宿、校区和专业特殊收费。`};
}
function nameTrapV2945(r){
  const m = String(r.major || '');
  const traps = [];
  if(/智能医学工程|医学影像技术|医学检验技术|康复治疗|护理|生物医学工程/.test(m)) traps.push('医学相关并不等同于临床医生路径，能否当医生要看具体专业和执业资格。');
  if(/计算机类/.test(m)) traps.push('计算机类并不等同于一定分到计算机科学与技术，关键看分流规则。');
  if(/电子信息类/.test(m)) traps.push('电子信息类可能含通信、电子、光电、集成电路等方向，并不等同于纯计算机。');
  if(/电气类/.test(m)) traps.push('电气类并不等同于必然进入电网，学校平台、专业方向和招聘口径都要看。');
  if(/管理科学与工程|工程管理|工业工程|物流工程/.test(m)) traps.push('名称偏“工程”，但就业口径可能偏管理/流程/现场，需看培养方案。');
  if(/材料|化学|化工|环境|食品|生物/.test(m)) traps.push('化学材料生物食品环境类差异很大，建议结合是否读研和行业接受度判断。');
  if(/建筑学|城乡规划|风景园林/.test(m)) traps.push('建筑规划园林通常有作品、周期或行业景气因素，建议不要只看学校层级。');
  if(/法学|公安|侦查|治安|警务/.test(m)) traps.push('法学/公安相关路径差异大，需核验是否公安院校、是否有入警政策或体检要求。');
  return traps.slice(0,2);
}
function routeTagsV2945(r){
  const tags=[];
  if(r.isComputer || /计算机|软件|网络|数据|人工智能/.test(r.majorText||r.major||'')) tags.push('偏代码/数字化');
  if(r.isGrid || /电气|智能电网|能源与动力/.test(r.majorText||r.major||'')) tags.push('电力能源相关');
  if(isMed(r.majorText||r.major||'')) tags.push('医学/健康路径');
  if(isTeacher(r.majorText||r.major||'')) tags.push('师范教育路径');
  if(isChem(r.majorText||r.major||'')) tags.push('化学材料生物环境');
  if(isPhys(r.majorText||r.major||'')) tags.push('工科现场/制造相关');
  if(isLiberal(r.majorText||r.major||'')) tags.push('经管法文社科');
  if(r.gradReferenceShort && r.gradReferenceShort !== '需复核') tags.push('考研方向可参考');
  return [...new Set(tags)].slice(0,4);
}
function candidateAdviceV2945(r){
  const reasons=[];
  const identity=admissionIdentityV2945(r);
  const cost=costInsightV2945(r);
  const trend=rankTrendV2945(r);
  let score=0;
  const level=r._level || classify(r.rank2025);
  if(level==='匹配') {score+=22; reasons.push('位次接近，可作为主体候选');}
  if(level==='稳妥') {score+=24; reasons.push('位次更稳，适合中后段');}
  if(level==='保底') {score+=16; reasons.push('有兜底作用');}
  if(level==='可冲') {score+=8; reasons.push('可少量前置冲击');}
  if(level==='超冲') {score-=18; reasons.push('明显偏冲');}
  if(level==='过低') {score-=10; reasons.push('位次放宽较多，要防止只图稳');}
  if((r._profile||0)>=70) {score+=16; reasons.push('画像匹配较高');}
  else if((r._profile||0)<45) {score-=12; reasons.push('画像匹配偏低');}
  if(cost.cls==='danger') {score-=28; reasons.push('成本/收费需复核');}
  else if(cost.cls==='warn') {score-=12; reasons.push('成本需核验');}
  if(['大类招生','试验班/特色班','专项/特殊入口'].includes(identity.label)) {score-=13; reasons.push('招生入口并不等同于最终专业');}
  if(identity.label==='中外合作/高收费') {score-=18; reasons.push('合作办学需单独核验');}
  if(trend.cls==='danger') {score-=10; reasons.push('竞争明显增强');}
  if((r.riskFlags||[]).length) {score-=8; reasons.push('已有复核标签');}
  if((r.keySubjectHints||[]).length) {score+=6; reasons.push('有重点学科提醒');}
  let label='建议保留', cls='ok';
  if(score>=35){label='建议保留';cls='ok';}
  else if(score>=12){label='谨慎保留';cls='mid';}
  else if(score>=-8){label='复核后再保留';cls='warn';}
  else {label='暂不优先';cls='danger';}
  return {label, cls, reasons:[...new Set(reasons)].slice(0,4), score};
}
function renderParentInterestPanelV2945(r){
  const idn=admissionIdentityV2945(r), trend=rankTrendV2945(r), cost=costInsightV2945(r), advice=candidateAdviceV2945(r), traps=nameTrapV2945(r), tags=routeTagsV2945(r);
  const profileHintsV29471 = (typeof studentProfileHintsV29471==='function') ? studentProfileHintsV29471(r) : [];
  const open = cardDetailOpenV29461('parentRead') ? ' open' : '';
  const summaryBullets = [];
  if(traps.length) summaryBullets.push(traps[0]);
  else summaryBullets.push(idn.text);
  if(cost.cls==='danger' || cost.cls==='warn') summaryBullets.push(cost.text);
  if(profileHintsV29471.length) summaryBullets.push(profileHintsV29471[0].message);
  summaryBullets.push(parentLine(r));
  const bulletHtml = firstUsefulV29461(summaryBullets, 3).map(x=>`<li>${htmlSafeV2945(x)}</li>`).join('');
  const trapHtml = traps.length ? traps.map(x=>`<div class="pi-note danger-note">${htmlSafeV2945(x)}</div>`).join('') : '<div class="pi-note ok-note">暂未识别明显名称陷阱，但仍建议看招生章程中的校区、学费、体检和分流说明。</div>';
  const tagHtml = tags.length ? tags.map(x=>`<span class="pi-tag">${htmlSafeV2945(x)}</span>`).join('') : '<span class="pi-tag">方向待复核</span>';
  return `<details class="parent-insight-v2945 parent-insight-v29461"${open}>
    <summary>
      <div class="pi-summary-title"><b>家长重点看</b><span>默认显示摘要，展开后查看完整解释</span></div>
      <em class="advice ${advice.cls}">${htmlSafeV2945(advice.label)}</em>
      <ul class="pi-summary-bullets">${bulletHtml}</ul>
    </summary>
    <div class="pi-body-v29461">
      <div class="pi-grid">
        <div class="pi-box ${idn.cls}">
          <label>这是真专业吗？</label>
          <strong>${htmlSafeV2945(idn.label)}</strong>
          <p>${htmlSafeV2945(idn.text)}</p>
        </div>
        <div class="pi-box ${trend.cls}">
          <label>2025 变难还是变好进？</label>
          <strong>${htmlSafeV2945(trend.label)}</strong>
          <p>${htmlSafeV2945(trend.text)}</p>
        </div>
        <div class="pi-box ${cost.cls}">
          <label>普通家庭成本提示</label>
          <strong>${htmlSafeV2945(cost.label)}</strong>
          <p>${htmlSafeV2945(cost.text)}</p>
        </div>
        ${renderGeoHintV29472(r)}
        ${renderStudentProfileHintsV29471(r)}
      </div>
      <div class="pi-subgrid">
        <div>
          <label>名称复核提示</label>
          ${trapHtml}
        </div>
        <div>
          <label>方向理解</label>
          <div class="pi-tags">${tagHtml}</div>
          <div class="pi-note mid-note">研究生参考只用于理解升学方向，不能反推该校本科专业实力。</div>
        </div>
        <div>
          <label>为什么给这个候选建议</label>
          <div class="pi-tags">${advice.reasons.map(x=>`<span class="pi-tag ${advice.cls}">${htmlSafeV2945(x)}</span>`).join('') || '<span class="pi-tag">等待更多条件</span>'}</div>
        </div>
      </div>
    </div>
  </details>`;
}



/* V2.9.4.6 易混专业筛选与辨析展示层：只提示“容易看错”，不做专业好坏排序。 */
function confusablePairsForRecordV2946(r){
  if(!CONFUSABLE_MODEL_2946 || !CONFUSABLE_MODEL_2946.recordPairs) return [];
  const list = CONFUSABLE_MODEL_2946.recordPairs.get(r.id) || [];
  return list.filter(p=>p && p.front_display !== false).sort((a,b)=>(b.risk_score||0)-(a.risk_score||0));
}
function hasConfusableMajorV2946(r){ return confusablePairsForRecordV2946(r).length>0; }
function hasConfusableGroupV2946(r,gid){ return confusablePairsForRecordV2946(r).some(p=>p.group_id===gid); }
function riskLabelV2946(level){
  if(level==='high') return '需重点复核易混';
  if(level==='medium_high') return '中需重点复核易混';
  if(level==='medium') return '需复核易混';
  return '易混提醒';
}
function fmtMiniV2946(v){ return v===undefined||v===null||v===''?'-':String(v).replace(/\.0$/,''); }
function escapeV2946(v){ return htmlSafeV2945(v); }
function renderConfusableMajorPanelV2946(r){
  const pairs = confusablePairsForRecordV2946(r);
  if(!pairs.length) return '';
  const p = pairs[0];
  const current = (p.items||[]).find(x=>x.record_id===r.id) || (p.items||[])[0] || {};
  const peers = (p.items||[]).filter(x=>x.record_id!==r.id).slice(0,2);
  const peer = peers[0] || {};
  const basis = (p.basis||[]).slice(0,4).map(x=>`<li>${escapeV2946(x)}</li>`).join('');
  const peerRows = peers.map(x=>`<tr>
    <td>${escapeV2946(x.admission_major_name_raw)}</td>
    <td>${escapeV2946(x.catalog_major_code||'待复核')}</td>
    <td>${escapeV2946(x.discipline_category_name||'待复核')}</td>
    <td>${escapeV2946(x.major_class_name||'待复核')}</td>
    <td>${escapeV2946(x.plain_label||'需结合培养方案复核')}</td>
    <td>${fmtMiniV2946(x.score_2025)} / ${fmtMiniV2946(x.rank_2025)}</td>
  </tr>`).join('');
  const open = cardDetailOpenV29461('confusable') ? ' open' : '';
  const sideWarning = current.warning_summary_v29462 || p.parent_warning || '该专业容易与同校或同主题专业混淆，建议对比本科代码和专业大类。';
  const summaryLine = current.catalog_major_code
    ? `${current.catalog_major_code}｜${current.discipline_category_name||'门类待复核'}｜${current.major_class_name||'专业大类待复核'}；${sideWarning}`
    : sideWarning;
  return `<details class="confusable-v2946 confusable-v29461"${open}>
    <summary>
      <span>${riskLabelV2946(p.risk_level)}</span><b>名字相近，方向可能不同</b><em>${escapeV2946(p.group_name||'易混专业')}</em>
      <p>${escapeV2946(summaryLine)}</p>
    </summary>
    <div class="confusable-body">
      <div class="confusable-warning">${escapeV2946(sideWarning)}</div>
      <div class="confusable-grid">
        <div><span>当前专业官方口径</span><b>${escapeV2946(current.catalog_major_code||'待复核')}｜${escapeV2946(current.discipline_category_name||'待复核')}｜${escapeV2946(current.major_class_name||'待复核')}</b><p>${escapeV2946(current.plain_label||'需结合培养方案复核')}</p></div>
        <div><span>容易混淆对象</span><b>${escapeV2946(peer.admission_major_name_raw||'同校/同主题相近专业')}</b><p>${escapeV2946(peer.catalog_major_code||'待复核')}｜${escapeV2946(peer.discipline_category_name||'待复核')}｜${escapeV2946(peer.major_class_name||'待复核')}</p></div>
      </div>
      <div class="confusable-table-wrap"><table class="confusable-table"><thead><tr><th>对比专业</th><th>本科代码</th><th>门类</th><th>专业大类</th><th>家长理解</th><th>2025分/位</th></tr></thead><tbody>
        <tr><td>${escapeV2946(current.admission_major_name_raw||r.major)}</td><td>${escapeV2946(current.catalog_major_code||'待复核')}</td><td>${escapeV2946(current.discipline_category_name||'待复核')}</td><td>${escapeV2946(current.major_class_name||'待复核')}</td><td>${escapeV2946(current.plain_label||'需结合培养方案复核')}</td><td>${fmtMiniV2946(current.score_2025)} / ${fmtMiniV2946(current.rank_2025)}</td></tr>
        ${peerRows}
      </tbody></table></div>
      <div class="confusable-basis"><b>判断依据：</b><ul>${basis}</ul></div>
      <div class="confusable-note">说明：这是“易混提醒”，只在容易被误认的一侧显示；正主专业只作为对比参照，不主动打提醒。具体课程、分流、转专业、校区、学费仍需查学校招生章程和培养方案。</div>
    </div>
  </details>`;
}

function populateConfusableGroupFilterV2946(){
  const sel=document.getElementById('filterConfusableGroup');
  if(!sel || !CONFUSABLE_MODEL_2946) return;
  const current=sel.value||'';
  const groups=(CONFUSABLE_MODEL_2946.groups?.items||[]).slice().sort((a,b)=>String(a.group_name).localeCompare(String(b.group_name),'zh-CN'));
  sel.innerHTML='<option value="">全部易混主题</option>'+groups.map(g=>`<option value="${escapeV2946(g.group_id)}">${escapeV2946(g.group_name)}</option>`).join('');
  if(current) sel.value=current;
}

function renderCards(){
  ensureCardViewModeToolbarV29461();
  applyCardViewModeClassV29461();
  const start=(currentPage-1)*pageSize,rows=filtered.slice(start,start+pageSize),el=document.getElementById('cards');
  el.innerHTML=rows.map(r=>{
    const reasons=(r._reasons||[]).slice(0,3).map(x=>`<span class="pill purple">${x}</span>`).join('');
    const risks=(r.riskFlags||[]).slice(0,3).map(x=>`<span class="pill red">${x}</span>`).join('');
    const keys=(r.keySubjectHints||[]).slice(0,2).map(x=>`<span class="pill green">重点：${x}</span>`).join('');
    const badges=riskBadgesV29461(r).map(x=>`<span class="pill v29461-risk ${x.cls}">${htmlSafeV2945(x.text)}</span>`).join('');
    const summary=primarySummaryV29461(r);
    const official=compactOfficialLineV29461(r);
    return`<div class="card card-v29461 level-${r._level}">
      <div class="cardTop">
        <div><div class="school">${r.school} <span class="pill geo-city-v29472">${htmlSafeV2945(geoDisplayV29472(r))}</span> <span class="pill nature-pill ${r.schoolNature.cls||'unknown'}">${r.schoolNature.label}</span> <span class="pill tier-pill ${r.schoolTier?.cls||'tier-unknown'}">${r.schoolTier?.label||'层级待核验'}</span></div><div class="major">${r.major}</div><div class="official-mini-v29461">${htmlSafeV2945(official)}</div>${renderTaxonomyLine(r)}</div>
        <div class="level">${levelPill(r._level)}</div>
      </div>
      <div class="card-meta-v29461"><span class="pill blue">画像 ${Math.round(r._profile)}分</span>${r.rankChangeLabel?`<span class="pill blue">${r.rankChangeLabel}</span>`:''}${badges}</div>
      <div class="score-meter"><i style="width:${Math.round(r._profile)}%"></i></div>
      <div class="kv kv-v29461"><div><span>2025分/位</span><b>${fmt(r.score2025)} / ${fmt(r.rank2025)}</b></div><div><span>2024分/位</span><b>${fmt(r.score2024)} / ${fmt(r.rank2024)}</b></div><div><span>分差</span><b>${fmt(r.scoreDiff)}</b></div><div><span>位次差</span><b>${fmt(r.rankDiff)}</b></div></div>
      <div class="summary-v29461">${htmlSafeV2945(summary)}</div>
      <div class="secondary-pills-v29461">${reasons}${risks}${keys}</div>
      ${renderConfusableMajorPanelV2946(r)}
      ${renderParentInterestPanelV2945(r)}
      ${renderTaxonomyDetail(r)}
      <div class="judge"><b>高报师判断：</b>${judge(r)}</div>
      ${renderRule(r)}
      <div class="row action-row-v29461"><button class="secondary slim" onclick="addCandidate('${r.id}')">加入候选</button></div>
    </div>`
  }).join('')||'<div class="notice">没有命中结果。可以放宽目标区域、关闭严格画像缩水，或清空关键词。</div>';
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  document.getElementById('pageInfo').textContent=`${currentPage} / ${pages}`;
  syncCardViewModeButtonsV29461();
}

function nextPage(){const pages=Math.max(1,Math.ceil(filtered.length/pageSize));if(currentPage<pages){currentPage++;renderCards();document.getElementById('cards').scrollIntoView({behavior:'smooth'})}}function prevPage(){if(currentPage>1){currentPage--;renderCards();document.getElementById('cards').scrollIntoView({behavior:'smooth'})}}function toggleAdvanced(){document.getElementById('advancedFilters').classList.toggle('open')}
function activeConditionCount(){
  let n=0;
  ['qSchool','qMajor','filterSubjectGroup','filterPrimary','filterTaxConfidence','filterLevel','targetCities'].forEach(id=>{if((document.getElementById(id)?.value||'').trim())n++});
  if(selectedRejects().length)n++;
  if(selectedProvinces().length)n++;
  if(document.getElementById('onlyKey')?.checked)n++;
  return n;
}
function quickNarrow(action){
  if(action==='ln'){
    clearProvinces();selectRegionGroup('辽宁省内',true);document.getElementById('regionMode').value='hard';setSingle('outProvince','no');
  }
  if(action==='northeast'){
    clearProvinces();selectRegionGroup('东北',true);document.getElementById('regionMode').value='hard';
  }
  if(action==='tech'){
    const sel=document.getElementById('filterSubjectGroup'); if(sel) sel.value='电子信息与通信';
  }
  if(action==='grid'){
    const sel=document.getElementById('filterSubjectGroup'); if(sel) sel.value='电气能源与自动化'; setSingle('gridPower','prefer');
  }
  if(action==='computer'){
    const sel=document.getElementById('filterSubjectGroup'); if(sel) sel.value='计算机与软件';
  }
  if(action==='noHighFee'){
    document.getElementById('budget').value='normal'; document.querySelector('[data-reject="高收费"]')?.classList.add('active');
  }
  if(action==='clearKeywords'){
    ['qSchool','qMajor','filterPrimary','targetCities'].forEach(id=>{const el=document.getElementById(id); if(el)el.value=''});
    const sg=document.getElementById('filterSubjectGroup'); if(sg)sg.value='';
    const tc=document.getElementById('filterTaxConfidence'); if(tc)tc.value='';
  }
  autoRefresh();
  document.getElementById('resultBox')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function updateNarrowGuide(){
  const el=document.getElementById('narrowGuide'); if(!el)return;
  if(!currentRank){el.className='narrow-guide hide';el.innerHTML='';return;}
  const total=(filtered||[]).length;
  if(total===0){
    el.className='narrow-guide danger';
    el.innerHTML=`<b>没有命中结果。</b><br/>建议放宽区域、清空关键词，或关闭严格画像缩水。<div class="guide-actions"><button onclick="quickNarrow('clearKeywords')">清空学科/关键词</button><button onclick="document.getElementById('strictProfile').checked=false;autoRefresh()">关闭严格画像</button><button onclick="clearProvinces();document.getElementById('regionMode').value='none';autoRefresh()">放宽区域</button></div>`;
  }else if(total>500){
    el.className='narrow-guide';
    el.innerHTML=`<b>结果偏多：${fmt(total)} 条。</b><br/>建议先按“区域 / 学科群 / 预算压力”做第一轮收窄，手机端会更好读。<div class="guide-actions"><button onclick="quickNarrow('ln')">只看辽宁</button><button onclick="quickNarrow('northeast')">东北优先</button><button onclick="quickNarrow('computer')">计算机</button><button onclick="quickNarrow('tech')">电子信息</button><button onclick="quickNarrow('grid')">电气能源</button><button class="warn" onclick="quickNarrow('noHighFee')">排除高收费</button></div>`;
  }else if(total<=80){
    el.className='narrow-guide good';
    el.innerHTML=`<b>结果范围适合精读：${fmt(total)} 条。</b><br/>可以逐条看专业归属、学科置信度和复核标签，再加入候选。`;
  }else{
    el.className='narrow-guide good';
    el.innerHTML=`<b>结果范围可用：${fmt(total)} 条。</b><br/>建议优先查看 A/B/C 方案，再按学科群或学校性质二次筛选。`;
  }
}
function debugEnabled(){return new URLSearchParams(location.search).has('debug')}
function renderDebugPanel(){
  const panel=document.getElementById('debugPanel'); if(!panel)return;
  if(!debugEnabled()){panel.classList.add('hide');return;}
  panel.classList.remove('hide');
  const overflow=document.documentElement.scrollWidth>window.innerWidth+2;
  const loaded=[...loadedChunkIds].join('、')||'无';
  const cityStats=(filtered||[]).reduce((m,r)=>{const k=geoDisplayV29472(r);m[k]=(m[k]||0)+1;return m;},{});
  const topCity=Object.entries(cityStats).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}:${v}`).join('｜')||'无';
  panel.innerHTML=`<b>V2.9.4.7.5 Debug</b><br/>
  viewport：<code>${window.innerWidth}×${window.innerHeight}</code><br/>
  scrollWidth：<code>${document.documentElement.scrollWidth}</code>｜横向溢出：<span class="${overflow?'bad':'ok'}">${overflow?'是':'否'}</span><br/>
  manifest：<code>${MANIFEST?MANIFEST.version:'未加载'}</code>｜rank：<code>${RANK2025?'已加载':'未加载'}</code><br/>
  taxonomy：<code>${TAXONOMY_READY?TAXONOMY_MAP.size+' 项':'未加载'}</code><br/>
  currentRank：<code>${currentRank||'-'}</code>｜DATA：<code>${DATA.length}</code>｜filtered：<code>${filtered.length}</code><br/>
  chunks：<code>${loaded}</code><br/>
  条件数：<code>${activeConditionCount()}</code>｜城市模式：<code>${cityModeV29472()}</code>｜目标城市：<code>${selectedCitiesV29472().join('、')||'不限'}</code><br/>
  当前结果城市Top：<code>${topCity}</code><br/>
  易混模型：<code>${CONFUSABLE_MODEL_2946?((CONFUSABLE_MODEL_2946.detectedPairs?.count||0)+' 对 / '+(CONFUSABLE_MODEL_2946.recordIndex?.count||0)+' 条索引'):'未加载'}</code><br/>学校地域：<code>${SCHOOL_GEO_MODEL_29471?(SCHOOL_GEO_MODEL_29471.items.length+' 所，city全量'):'未加载'}</code>｜学生画像：<code>${STUDENT_PROFILE_MODEL_29471?((STUDENT_PROFILE_MODEL_29471.rules||[]).length+' 条规则'):'未加载'}</code><br/>app.js：<code>app.v2952.js</code>｜app.css：<code>app.v2952.css</code>`;
}

function renderStrategyCardsV2951(){
  const box=document.getElementById('strategyCards'); if(!box)return;
  if(window.LN_SCENARIO_UI_V296?.render){ return window.LN_SCENARIO_UI_V296.render(box); }
  let rules=allScenarioRulesV2951();
  if(!rules.length)return;
  const hasScore=!!(typeof currentScoreV2954Fix2==='function' && currentScoreV2954Fix2());
  if(hasScore){
    const order={match:0,near:1,neutral:2,unknown:3,mismatch:4};
    rules=[...rules].sort((a,b)=>((order[scoreBandFitV2954Fix2(a).state]??3)-(order[scoreBandFitV2954Fix2(b).state]??3))||((a.order||999)-(b.order||999)));
  }
  box.innerHTML=rules.map(rule=>{
    const cls=['strategy-card','scenario-card-v2951'];
    if(rule.id===currentStrategy || (!currentStrategy && (rule.defaultSelected || rule.id===(rulesV2951().defaults?.selectedScenario||'employment'))))cls.push('active');
    if(rule.id==='publicLow'||rule.id==='edgeBachelor')cls.push('public-first');
    const risk=rule.riskLevel==='aggressive'?'冲刺':rule.riskLevel==='conservative'?'稳妥':'均衡';
    const fit=typeof scoreBandFitV2954Fix2==='function'?scoreBandFitV2954Fix2(rule):{state:'neutral',label:'不限分段'};
    const interestFit=window.LN_CHILD_INTEREST_RUNTIME_V296?.scenarioFit?.(rule)||{state:'none',label:''};
    if(interestFit.state==='high') cls.push('interest-match-high-v296');
    else if(interestFit.state==='near') cls.push('interest-match-near-v296');
    return `<button class="${cls.join(' ')}" data-strategy="${v2950Text(rule.id)}" data-score-fit="${v2950Text(fit.state)}">
      <strong>${v2950Text(rule.title)}</strong>
      <span>${v2950Text(rule.desc||'')}</span>
      <small class="scenario-fit-v2954fix3">${v2950Text(fit.label)}</small>
      ${interestFit.label?`<small class="scenario-interest-v296 ${v2950Text(interestFit.state)}">${v2950Text(interestFit.label)}</small>`:''}
      <em>${risk}</em>
    </button>`;
  }).join('');
  const intro=document.getElementById('scenarioRuleHintV2951');
  if(intro){
    const child=window.LN_CHILD_INTEREST_RUNTIME_V296?.summary?.();
    const childLine=child?`｜${v2950Text(child.title)}`:'';
    intro.innerHTML=`<b>场景规则中心</b><span>${v2950Text(rulesV2951().uiText?.scenarioIntro||'场景卡来自独立规则集。')} 分数段和孩子兴趣只做提示与排序，不会禁止你对照查看。${childLine}</span>`;
  }
}
function renderPreferenceSelectV2952(){
  const sel=document.getElementById('priority'); if(!sel)return;
  const rules=allPreferenceRulesV2952();
  if(!rules.length)return;
  const current=sel.value || rulesV2951().defaults?.priority || 'employment';
  sel.innerHTML=rules.map(r=>`<option value="${v2950Text(r.id)}">${v2950Text(r.label||r.title||r.id)}</option>`).join('');
  if([...sel.options].some(o=>o.value===current)) sel.value=current;
  else sel.value=(rules[0]&&rules[0].id)||'employment';
  sel.addEventListener('change',()=>{
    PREFERENCE_TOUCHED_V2952=true;
    updatePreferenceExplainV2952('manual');
  });
  updatePreferenceExplainV2952('init');
}
function setPreferenceValueV2952(value,source){
  const sel=document.getElementById('priority'); if(!sel||!value)return false;
  if(source==='scenario' && PREFERENCE_TOUCHED_V2952 && sel.value!==value) return false;
  if([...sel.options].some(o=>o.value===value)){ sel.value=value; updatePreferenceExplainV2952(source||'scenario'); return true; }
  return false;
}
function updatePreferenceExplainV2952(source){
  const box=document.getElementById('targetPathExplainV2952'); if(!box)return;
  const val=document.getElementById('priority')?.value || 'employment';
  const rule=preferenceRuleV2952(val)||{};
  const status=PREFERENCE_TOUCHED_V2952?'已手动微调':'来自当前场景建议';
  const bias=rule.planBias?`A ${rule.planBias.A||1} / B ${rule.planBias.B||1} / C ${rule.planBias.C||1}`:'A/B/C 默认均衡';
  box.innerHTML=`<b>${v2950Text(rule.label||val)}</b><span>${v2950Text(rule.desc||'目标路径用于微调当前场景下的 A/B/C 倾向。')}</span><em>${status}｜${bias}</em>${rule.warning?`<p>${v2950Text(rule.warning)}</p>`:''}`;
}
function renderScenarioNoticeV2951(rule,skipped=[]){
  let box=document.getElementById('scenarioExplainV2951');
  const grid=document.getElementById('strategyCards');
  if(!box && grid){ box=document.createElement('div'); box.id='scenarioExplainV2951'; box.className='scenario-explain-v2951'; grid.insertAdjacentElement('afterend',box); }
  if(!box)return;
  const protect=(rule.protect||[]).map(x=>`<span>${v2950Text(x)}</span>`).join('');
  const avoid=(rule.doNotAutoRelax||[]).map(x=>`<span>${v2950Text(x)}</span>`).join('');
  const abc=rule.abcGuide?`<div class="scenario-abc-v2951"><b>A</b>${v2950Text(rule.abcGuide.A||'')}<b>B</b>${v2950Text(rule.abcGuide.B||'')}<b>C</b>${v2950Text(rule.abcGuide.C||'')}</div>`:'';
  const prefVal=document.getElementById('priority')?.value||rule?.preference?.priority||'';
  const prefRule=preferenceRuleV2952(prefVal)||{};
  const fit=typeof scoreBandFitV2954Fix2==='function'?scoreBandFitV2954Fix2(rule):null;
  const fitLine=fit?`<p class="small"><b>分段提示：</b>${v2950Text(fit.label)}。分数段只做前置提醒，不禁止你对照查看。</p>`:'';
  const prefLine=prefVal?`<div class="scenario-pref-v2952"><b>当前目标路径</b><span>${v2950Text(prefRule.label||prefVal)}${PREFERENCE_TOUCHED_V2952?'（已手动微调）':'（场景建议）'}</span></div>`:'';
  box.innerHTML=`<div><strong>当前场景：${v2950Text(rule.title)}</strong><p>${v2950Text(rule.userPain||rule.desc||'')}</p></div>
    <div class="scenario-tags-v2951"><em>优先保护</em>${protect||'<span>按当前底线</span>'}</div>
    <div class="scenario-tags-v2951"><em>不会自动放宽</em>${avoid||'<span>用户已设底线</span>'}</div>
    ${abc}${prefLine}${fitLine}<p class="small">${v2950Text(rule.warning||'场景只作为建议策略。')}${skipped.length?'｜已保留你手动设置的：'+v2950Text([...new Set(skipped)].join('、')):''}</p>`;
}
function switchFullModeV2951(){
  const el=document.getElementById('simpleModeToggleV2950'); if(el){el.checked=false; applySimpleModeV2950();}
  toggleAdvanced(true);
  document.getElementById('advancedFilters')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function toggleAdvanced(force){
  const box=document.getElementById('advancedFilters'); if(!box)return;
  if(force===true) box.classList.add('open'); else if(force===false) box.classList.remove('open'); else box.classList.toggle('open');
}
function toggleSection(id){
  const el=document.getElementById(id);
  if(el) el.classList.toggle('collapsed');
}

window.LN_RENDER = {
  renderCards, renderStudentProfileHintsV29471,
  renderStrategyCardsV2951, renderPreferenceSelectV2952, updatePreferenceExplainV2952,
  renderScenarioNoticeV2951, renderDebugPanel,
  toggleAdvanced, toggleSection
};
