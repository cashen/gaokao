// V2.9.7 candidate evidence card view model.
// Converts one candidate record into parent-readable admission evidence.
(function(){
  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  function fmt(n){
    if(n===null || n===undefined || n==='') return '-';
    const x=Number(n);
    if(Number.isFinite(x)) return Math.round(x).toLocaleString('zh-CN');
    return String(n);
  }
  function val(n){
    if(n===null || n===undefined || n==='') return null;
    const x=Number(n);
    return Number.isFinite(x) ? x : null;
  }
  function scoreRankLine(score, rank, year){
    const hasScore=score!==null && score!==undefined && score!=='';
    const hasRank=rank!==null && rank!==undefined && rank!=='';
    if(!hasScore && !hasRank) return `${year}：待核验`;
    return `${year}：${hasScore ? fmt(score)+'分' : '分数待核验'}｜${hasRank ? fmt(rank)+'位' : '位次待核验'}`;
  }
  function rankDiffValue(r){
    const d=val(r && r.rankDiff);
    const r25=val(r && r.rank2025), r24=val(r && r.rank2024);
    if(d!==null) return d;
    if(r25!==null && r24!==null) return r25-r24;
    return null;
  }
  function changeText(r){
    const diff=rankDiffValue(r);
    if(diff===null) return '两年变化：暂无2024可比数据';
    const abs=Math.abs(diff);
    if(abs<300) return `两年变化：位次变化 ${fmt(abs)} 位，基本稳定`;
    if(diff<0) return `两年变化：位次前移 ${fmt(abs)} 位，竞争变强`;
    return `两年变化：位次后移 ${fmt(abs)} 位，相对好进`;
  }
  function changeTone(r){
    const diff=rankDiffValue(r);
    if(diff===null) return 'unknown';
    const abs=Math.abs(diff);
    if(abs<300) return 'stable';
    return diff<0 ? 'hotter' : 'looser';
  }
  function currentRankValue(){
    const cur=(typeof currentRank!=='undefined' && currentRank) || (typeof resolveRank==='function' ? resolveRank() : null);
    return val(cur);
  }
  function distanceText(r){
    const rank=val(r && r.rank2025);
    const cr=currentRankValue();
    const level=(r && (r._level || '')) || '';
    if(rank===null || cr===null) return level ? `当前判断：${level}` : '与当前位次：待输入位次后判断';
    const gap=cr-rank;
    if(gap>0) return `与当前位次：2025线高出 ${fmt(gap)} 位，当前判断：${level || '需复核'}`;
    if(gap<0) return `与当前位次：2025线低于孩子 ${fmt(Math.abs(gap))} 位，当前判断：${level || '需复核'}`;
    return `与当前位次：接近2025线，当前判断：${level || '贴线'}`;
  }
  function distanceTone(r){
    const rank=val(r && r.rank2025);
    const cr=currentRankValue();
    if(rank===null || cr===null) return 'unknown';
    const gap=cr-rank;
    if(gap>2500) return 'stretch';
    if(gap<-2500) return 'safe';
    return 'near';
  }
  function planReason(r,type,idx){
    try{
      if(typeof strongWhyV29475Fix2==='function'){
        return String(strongWhyV29475Fix2(r,type,idx||0)||'').replace(/^首选原因：/,'').replace(/^备选原因：/,'').trim();
      }
    }catch(e){}
    if(type==='A') return '公办、费用、地域和位次安全共同决定是否适合先守底线。';
    if(type==='B') return '专业方向、孩子兴趣和培养路径共同决定是否值得精读。';
    return '城市、学校层级、费用和位次压力共同决定是否值得争上限。';
  }
  function vm(r,type,idx){
    const im=window.LN_CHILD_INTEREST_RUNTIME_V296?.matchRecord?.(r);
    const tags=[];
    if(r && r.schoolNature?.label) tags.push(r.schoolNature.label);
    else if(r && r.schoolNatureLabel) tags.push(r.schoolNatureLabel);
    if(r && (r.schoolProvince || r.lnArea)) tags.push(r.schoolProvince || r.lnArea);
    if(r && !(r.isHighFee || r.isCoopV29475)) tags.push('普通学费');
    if(im?.active && im.level && im.level!=='no') tags.push('专业匹配：'+im.label);
    const qg=window.LN_QUALIFICATION_GATE_V296?.check?.(r);
    if(qg?.matched){ tags.push('资格型入口'); (qg.labels||[]).slice(0,1).forEach(x=>tags.push(x)); }
    const px=window.LN_PATH_EXPLAIN_ENGINE_V2975?.explain?.(r)||{};
    (px.tags||[]).slice(0,2).forEach(x=>tags.push(x));
    return {
      school:r?.school||'学校待核验',
      major:r?.major||r?.majorText||'专业待核验',
      tags:[...new Set(tags.filter(Boolean))].slice(0,4),
      line2025:scoreRankLine(r?.score2025, r?.rank2025, '2025'),
      line2024:scoreRankLine(r?.score2024, r?.rank2024, '2024'),
      change:changeText(r),
      changeTone:changeTone(r),
      distance:distanceText(r),
      distanceTone:distanceTone(r),
      reason:planReason(r,type,idx),
      pathExplain:window.LN_PATH_EXPLAIN_ENGINE_V2975?.explain?.(r)||{},
      risk:(()=>{const base=(typeof planRiskTextV29475==='function' ? planRiskTextV29475(r,type) : '') || '招生章程、学费、校区和专业归属建议复核'; const q=window.LN_QUALIFICATION_GATE_V296?.check?.(r); return q?.matched ? base+'；资格型入口需复核：'+(q.reviewTips||[]).slice(0,2).join('、') : base;})()
    };
  }
  function evidenceHtml(r,type,opts){
    const m=vm(r,type,opts?.idx||0);
    const compact=!!opts?.compact;
    const tagHtml=m.tags.map(x=>`<span>${esc(x)}</span>`).join('');
    if(compact){
      return `<div class="evidence-mini-v297"><b>${esc(m.line2025)}</b><span>${esc(m.line2024)}</span><em>${esc(m.change)}</em>${m.pathExplain?.tags?.length?`<small>路径提醒：${esc(m.pathExplain.tags.slice(0,2).join('｜'))}</small>`:''}</div>`;
    }
    return `<div class="evidence-card-v297">
      <div class="evidence-tags-v297">${tagHtml}</div>
      <div class="evidence-grid-v297"><div><b>${esc(m.line2025)}</b><span>历史投档证据</span></div><div><b>${esc(m.line2024)}</b><span>上一年对照</span></div></div>
      <p class="evidence-change-v297 tone-${esc(m.changeTone)}">${esc(m.change)}</p>
      <p class="evidence-distance-v297 tone-${esc(m.distanceTone)}">${esc(m.distance)}</p>
      ${window.LN_PATH_EXPLAIN_ENGINE_V2975?.cardHtml?.(r)||''}
    </div>`;
  }
  window.LN_CANDIDATE_CARD_VIEW_V296={vm,evidenceHtml,changeText,distanceText,changeTone,distanceTone,ready:true};
})();
