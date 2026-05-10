// V2.9.5.4 plan-engine: diagnosis, A/B/C scoring and plan board rendering
function scoreBandV29473(){
  const s=Number(document.getElementById('myScore')?.value||0);
  if(s>=650)return '700—650 / 650+ 高分段';
  if(s>=620)return '650—620';
  if(s>=580)return '620—580';
  if(s>=540)return '580—540';
  if(s>=500)return '540—500';
  if(s>=450)return '500—450';
  if(s>=400)return '450—400';
  if(s>=350)return '400—350';
  const r=currentRank||resolveRank();
  if(!r)return '未定位';
  if(r<6500)return '650+ 高分段';
  if(r<15000)return '650—620';
  if(r<30000)return '620—580';
  if(r<47000)return '580—540';
  if(r<65000)return '540—500';
  if(r<90000)return '500—450';
  if(r<115000)return '450—400';
  return '400—350 / 本科边缘';
}
function selectedRejectSetV29473(){return new Set(selectedRejects ? selectedRejects() : []);}
function conditionSnapshotV29473(){
  const snap = window.LN_STATE_SNAPSHOT_V296?.snapshot?.();
  if(snap) return snap;
  const provinces = typeof selectedProvinces==='function' ? selectedProvinces() : [];
  const cities = typeof selectedCitiesV29472==='function' ? selectedCitiesV29472() : [];
  const rejectSet = selectedRejectSetV29473();
  const budget = document.getElementById('budget')?.value || 'normal';
  const priority = document.getElementById('priority')?.value || 'employment';
  const regionMode = document.getElementById('regionMode')?.value || 'none';
  const cityMode = cityModeV29472 ? cityModeV29472() : 'none';
  const strongProvince = getGroup('outProvince')==='no' || (regionMode==='hard' && provinces.length===1 && provinces[0]==='辽宁') || ['shenyang','dalian','publicLow','grid'].includes(currentStrategy);
  const strongCity = priority==='city' || cityMode!=='none' || cities.length>0 || ['shenyang','dalian','city'].includes(currentStrategy);
  const qMajor = (document.getElementById('qMajor')?.value||'') + ' ' + (document.getElementById('filterSubjectGroup')?.value||'');
  const hotMajor = /计算机|软件|人工智能|数据|信息安全|网络|电气|电子|临床|口腔|医学|师范|法学/.test(qMajor) || ['grid','medical','exam'].includes(currentStrategy) || ['grid','exam'].includes(priority);
  const normalFamily = budget==='normal' || document.getElementById('familyTolerance')?.value==='low';
  const budgetWide = budget==='high' || budget==='coop' || document.getElementById('familyTolerance')?.value==='high';
  const coopIntent = budget==='coop' || (document.getElementById('filterFeeType')?.value||'all').includes('coop');
  const noHighFee = budget==='normal' || rejectSet.has('高收费') || (document.getElementById('filterFeeType')?.value==='excludeHighPrivate');
  const strict = !!document.getElementById('strictProfile')?.checked;
  const scoreBand = scoreBandV29473();
  const lowScore = /540—500|500—450|450—400|400—350|本科边缘/.test(scoreBand);
  const edgeScore = /500—450|450—400|400—350|本科边缘/.test(scoreBand);
  const highScore = /650\+|650—620|700/.test(scoreBand);
  const specialStatus=specialPlanStatusV29474();
  return {provinces,cities,rejectSet,budget,priority,regionMode,cityMode,strongProvince,strongCity,hotMajor,normalFamily,budgetWide,coopIntent,noHighFee,strict,scoreBand,lowScore,edgeScore,highScore,specialStatus};
}
function strengthRowsV29473(s){
  const rows=[];
  rows.push(['家庭成本',s.noHighFee?'硬底线/强保护':s.budgetWide?'预算较宽，可比较高收费':'普通偏好']);
  rows.push(['地域范围',s.strongProvince?'强省内/近省':'可全国比较']);
  rows.push(['城市要求',s.strongCity?(s.cityMode==='hard'?'指定城市硬筛':'城市优先/软筛'):'不限制城市']);
  rows.push(['专业热度',s.hotMajor?'热门/目标方向较强':'未强限定']);
  rows.push(['民办路径',s.budgetWide||s.edgeScore?'可进入比较，需复核':'默认不优先']);
  rows.push(['中外合作',s.coopIntent?'明确提档路径，强复核':s.budgetWide?'可作为提档方案，需复核':'普通家庭谨慎']);
  rows.push(['资格型入口保护',s.specialStatus==='approved'?'高校专项已在资格入口中确认，可纳入比较':s.specialStatus==='unknown'?'不确定，暂按默认隐藏':'未确认资格型入口，默认隐藏']);
  return rows;
}
function applyStageV29473(rows, name, fn, funnel){
  const before=rows.length;
  const out=rows.filter(fn);
  funnel.push({step:name,count:out.length,drop:before-out.length,before});
  return out;
}
function buildFunnelV29473(){
  const funnel=[];
  let rows=DATA.map(r=>{
    const level=classify(r.rank2025), p=profileScore(r);
    return {...r,_level:level,_fit:currentRank&&r.rank2025?Math.abs(r.rank2025-currentRank):999999999,_profile:p.score,_reasons:p.reasons,_excludes:p.excludes,_mentor:p.mentor,_confidence:confidence(r)};
  });
  funnel.push({step:'位次分段加载',count:rows.length,drop:0,before:rows.length});
  if(specialPlanStatusV29474()!=='approved'){
    rows=applyStageV29473(rows,'高校专项资格保护',r=>!r.isCollegeSpecialPlanV29474,funnel);
  }else{
    funnel.push({step:'高校专项资格保护',count:rows.length,drop:0,before:rows.length,note:'已通过审核，专项候选进入比较'});
  }
  const qS=document.getElementById('qSchool')?.value.trim()||'', qM=document.getElementById('qMajor')?.value.trim()||'';
  const fSubject=document.getElementById('filterSubjectGroup')?.value||'', fPrimary=document.getElementById('filterPrimary')?.value.trim()||'';
  if(qS||qM||fSubject||fPrimary){
    rows=applyStageV29473(rows,'关键词/学科筛选',r=>{
      if(qS&&!(r.school||'').includes(qS))return false;
      if(qM&&!majorMatchesV29475(r,qM))return false;
      if(fSubject&&r.subjectGroup!==fSubject)return false;
      if(fPrimary&&!((r.primaryDisciplineNames||'').includes(fPrimary)||(r.primaryDisciplineCodes||'').includes(fPrimary)||(r.cleanMajor||'').includes(fPrimary)||(r.undergradCategoryName||'').includes(fPrimary)||(r.officialCategoryCode||'').includes(fPrimary)||(r.officialMajorCode||'').includes(fPrimary)||(r.officialDisciplineCode||'').includes(fPrimary)||(r.officialMajorName||'').includes(fPrimary)))return false;
      return true;
    },funnel);
  }
  const provinces=selectedProvinces ? selectedProvinces() : [];
  const regionMode=document.getElementById('regionMode')?.value||'none';
  if(regionMode==='hard' && provinces.length){
    rows=applyStageV29473(rows,'区域硬筛',r=>provinces.includes(r.schoolProvince),funnel);
  }else if(regionMode==='soft' && provinces.length){
    funnel.push({step:'区域软筛',count:rows.length,drop:0,before:rows.length,note:'软筛不排除，只影响画像和提醒'});
  }
  const cities=selectedCitiesV29472 ? selectedCitiesV29472() : [];
  const cMode=cityModeV29472 ? cityModeV29472() : 'none';
  if(cMode==='hard' && cities.length){
    rows=applyStageV29473(rows,'城市硬筛',r=>cityMatchesV29472(r,cities),funnel);
  }else if(cMode==='soft' && cities.length){
    funnel.push({step:'城市软筛',count:rows.length,drop:0,before:rows.length,note:'软筛不排除，只影响画像和提醒'});
  }
  const fSchoolTier=document.getElementById('filterSchoolTier')?.value||'';
  if(fSchoolTier){
    rows=applyStageV29473(rows,'学校性质/层级筛选',r=>{
      if(fSchoolTier==='985')return r.schoolTier?.level==='985';
      if(fSchoolTier==='211')return r.schoolTier?.level==='211';
      if(fSchoolTier==='public')return ['public','publicSoft'].includes(r.schoolTier?.level);
      if(fSchoolTier==='private')return r.schoolTier?.level==='private';
      if(fSchoolTier==='unknown')return r.schoolTier?.level==='unknown';
      return true;
    },funnel);
  }
  const strict=!!document.getElementById('strictProfile')?.checked;
  const budget=document.getElementById('budget')?.value||'normal';
  if(strict && budget==='normal'){
    rows=applyStageV29473(rows,'预算/高收费保护',r=>!(r._excludes||[]).some(x=>/高收费|预算/.test(x)),funnel);
  }
  if(strict){
    rows=applyStageV29473(rows,'画像拒绝项缩水',r=>!(r._excludes||[]).length,funnel);
    rows=applyStageV29473(rows,'低画像匹配排除',r=>(r._profile||0)>=32,funnel);
  }else{
    funnel.push({step:'画像规则',count:rows.length,drop:0,before:rows.length,note:'严格画像未开启'});
  }
  return funnel;
}
function topPressureV29473(funnel){
  return (funnel||[]).filter(x=>x.drop>0).sort((a,b)=>b.drop-a.drop).slice(0,3);
}
function diagnoseV29473(){
  const s=conditionSnapshotV29473();
  const funnel=buildFunnelV29473();
  const top=topPressureV29473(funnel);
  const few=(filtered||[]).length<20 && !!currentRank;
  const many=(filtered||[]).length>260 && !!currentRank;
  const conflicts=[];
  const add=(id,title,diagnosis,relax,avoid,review,schemes)=>conflicts.push({id,title,diagnosis,relax,avoid,review,schemes});
  const publicFirst=currentStrategy==='publicLow'||s.priority==='publicLow'||document.getElementById('filterSchoolTier')?.value==='public';
  const strongEmployment=['employment','grid'].includes(s.priority)||['employment','grid'].includes(currentStrategy);
  if(s.lowScore && publicFirst && s.strongCity && (s.hotMajor||s.strongProvince) && s.noHighFee){
    add('low_perfect','低分段多重约束','公办、好城市、热门专业、不出省、普通学费同时满足难度较高。',['先把城市从硬条件改为软偏好','把热门专业扩展到相近专业','从只看辽宁扩展到东北/近省'],['不建议先放宽家庭成本底线','不建议直接接受未核验高收费','不建议牺牲孩子明显不适配项'],['学费','校区','专业可读性','学校性质'],['A 省内公办稳妥','B 专业路径扩展','C 东北近省比较']);
  }
  if(few && s.strongProvince && strongEmployment){
    add('province_employment','强省内 + 强就业冲突','省内范围较窄，就业导向专业竞争较强，候选容易偏少。',['辽宁省内扩展到东北/近省','沈阳/大连扩展到辽宁其他城市','热门正主专业扩展到相近专业'],['不建议先接受高收费','不建议降到明显不适配专业'],['学校行业背景','就业半径','实际校区'],['A 省内稳妥','B 专业路径','C 近省扩展']);
  }
  if(few && s.normalFamily && s.strongCity){
    add('ordinary_city','普通家庭 + 强城市冲突','城市偏好正在挤压公办、成本和专业适配空间。',['城市硬筛改为软提醒','目标城市扩展到同省/近省其他城市','热门专业改为相近专业'],['不建议为了城市直接接受高收费','不建议为城市牺牲孩子明显不适配项'],['学费','学校性质','实际校区','城市生活成本'],['A 成本可控','B 专业路径','C 城市软筛']);
  }
  if((s.budgetWide||s.coopIntent) && (s.priority==='school'||s.priority==='city'||s.strongCity||s.coopIntent)){
    add('budget_coop',s.coopIntent?'中外合作提档复核':'预算宽 + 提档复核',s.coopIntent?'当前已进入中外合作提档路径：重点不是能不能花钱，而是钱是否换来了学校层级、城市资源或专业机会。':'预算较宽可以比较中外合作或民办城市方案，但重点是钱是否换来有效提升。',['普通批公办方案与中外合作并列比较','核验证书/培养地点后再定','把民办城市专业作为备选路径'],['不建议只看学校名字','不建议忽略专业适配','不建议未核验证书就当真提档'],['证书','学费','培养地点','是否必须出国','外语要求'],['A 普通批公办','B 专业匹配','C 中外合作/民办提档']);
  }
  const mathLow=document.getElementById('mathTolerance')?.value==='low', fieldReject=document.getElementById('fieldWorkAcceptance')?.value==='reject', gradNo=(document.getElementById('gradPlan')?.value==='no'||document.getElementById('gradWillingnessV29471')?.value==='no');
  if(publicFirst && (mathLow||fieldReject||gradNo)){
    add('public_fit','公办执念 + 专业适配风险','公办身份有价值，但当前孩子画像显示部分专业可读性需要二次确认。',['公办冷门专业扩展到相近可读专业','省内公办扩展到近省公办','必要时比较民办匹配专业'],['不建议只按标签接受强工科','不建议把孩子完全不适配项当作让步项'],['课程难度','工程现场','读研依赖','孩子接受度'],['A 公办保底线','B 可读专业','C 民办匹配专业比较']);
  }
  if(s.edgeScore && (s.budgetWide || document.getElementById('filterSchoolTier')?.value==='private')){
    add('private_path','民办现实路径','民办可以进入比较，但不能只为本科标签选择。',['民办作为路径比较','专业路径优先','同步比较优质高职/专升本路径'],['不建议只看本科身份','不建议忽略四年成本','不建议忽略孩子自律'],['学费','学校管理','就业资源','考研/考公路径'],['A 公办机会','B 民办本科路径','C 高职/专升本对照']);
  }
  if((document.getElementById('gradPlan')?.value==='yes'||s.priority==='postgrad') && (mathLow||s.lowScore)){
    add('postgrad_trap','考研兜底幻觉','考研可以拓展路径，但不能弥补所有本科选择问题。',['深造依赖专业增加本科就业兜底','弱平台深造依赖改为平台更稳','把考研目标拆成专业和学校'],['不建议把考研当默认兜底','不建议用考研解释所有冷门专业'],['学习耐力','本科平台','考研失败兜底'],['A 本科就业可兜底','B 深造友好','C 平台上限']);
  }
  if(s.priority==='grid'||currentStrategy==='grid'){
    add('grid_imagination','电网想象复核','电气类更接近电网方向，但自动化、测控、能源动力、电子信息不宜直接等同电气正主。',['电气正主、泛电类、能源相关、自动化相关分层比较'],['不建议把所有“电/能源/自动化”都当电网正主'],['专业代码','学校电力背景','国网招聘口径'],['A 电气正主','B 泛电类相关','C 能源/自动化扩展']);
  }
  if(currentStrategy==='medical'||getGroup('medicine')==='prefer'){
    add('medical_path','医学路径误认复核','带“医学”并不等同于医生路径，需要分清临床医生、医学技术、护理康复、药学检验。',['医生路径、医学技术路径、护理康复路径分层比较'],['不建议把医学技术当临床医生路径','不建议忽略长周期和执业资格'],['执业资格','规培周期','培养方案','是否医生路径'],['A 医生路径','B 医学技术','C 护理康复/药学检验']);
  }
  if(many && currentStrategy==='broad'){
    add('too_broad','全量观察过宽','当前不是条件过紧，而是条件过宽，需要先确定底线。',['先问学费、省内、民办/中外合作、专业排斥','再看位次和路径'],['不建议直接看大列表','不建议只按最低分排序'],['家庭底线','专业路径','复核清单'],['A 成本优先缩小','B 地域优先缩小','C 专业路径缩小']);
  }
  if(s.specialStatus!=='approved' && (exclusionStats&&exclusionStats['高校专项隐藏']>0)){
    add('special_plan_protect','高校专项默认保护','当前未在资格入口中确认高校专项，系统已隐藏相关候选，避免把普通考生不能报的入口混入 A/B/C 方案。',['如果已通过资格审核，可在“资格型入口保护”中放开比较','如不确定，继续按未审核处理更稳'],['不建议把高校专项计划当作普通候选','不建议用专项计划缓解普通批结果偏少'],['资格审核结果','公示名单','招生计划','招生章程'],['普通候选 A/B/C','专项资格候选单独复核']);
  }
  if(!conflicts.length){
    const p=top.map(x=>x.step).join('、')||'暂无明显压缩点';
    add('general','当前条件暂无明显冲突',few?`当前结果偏少，主要压缩点可能是：${p}。`:`当前结果数量基本可用，建议先按 A/B/C 三方案看取舍。`,['若结果偏少，先放宽压缩最大的偏好项','若结果偏多，先明确成本、地域和专业底线'],['不要先放宽家庭成本底线','不要忽略专业实际校区'],['招生章程','学费','校区','专业路径'],['A 稳妥公办','B 专业路径','C 城市/学校层级']);
  }
  return {snapshot:s,funnel,top,conflicts:conflicts.slice(0,3)};
}
function rowPlanScoreV29473(r,type,chosen){
  let sc=0; const m=r.majorText||r.major||''; const s=conditionSnapshotV29473();
  if(type==='A'){
    if(['匹配','稳妥','保底'].includes(r._level))sc+=25;
    if(r.schoolNature?.label==='公办倾向')sc+=30;
    if(!r.isHighFee)sc+=16;
    if(['辽宁','吉林','黑龙江'].includes(r.schoolProvince))sc+=8;
    sc+=(r._profile||0)*0.35; sc-=((r._excludes||[]).length*18);
  }else if(type==='B'){
    if(['匹配','稳妥'].includes(r._level))sc+=18;
    if(s.priority==='grid'&&isGrid(m))sc+=35;
    else if(currentStrategy==='medical'&&isMed(m))sc+=35;
    else if(s.priority==='exam'&&(isLiberal(m)||isComp(m)||isTeacher(m)))sc+=28;
    else if(isGrid(m)||isComp(m)||isTeacher(m)||isMed(m))sc+=18;
    if((r._reasons||[]).length)sc+=Math.min(22,(r._reasons||[]).length*5);
    if(isDeepTrap(m)&&document.getElementById('gradPlan')?.value==='no')sc-=18;
    sc+=(r._profile||0)*0.45;
  }else{
    if(['可冲','匹配','稳妥'].includes(r._level))sc+=18;
    if(['985','211'].includes(r.schoolTier?.level))sc+=25;
    if(s.cities.length && cityMatchesV29472(r,s.cities))sc+=28;
    if(s.strongCity && ['沈阳','大连'].includes(r.schoolCity))sc+=10;
    if((s.budgetWide||s.coopIntent) && (r.isHighFee||r.isCoopV29475))sc+=18;
    if(r.isHighFee && !(s.budgetWide||s.coopIntent))sc-=25;
    sc+=(100-(r._fit||999999)/1000)*0.08;
    sc+=(r._profile||0)*0.25;
  }
  if(chosen && chosen.has(r.id))sc-=9999;
  return sc;
}
function pickSchemeRowsV29473(){
  const usable=(filtered||[]).filter(r=>!(r._excludes||[]).length);
  const chosen=new Set();
  function pick(type){
    const row=usable.slice().sort((a,b)=>rowPlanScoreV29473(b,type,chosen)-rowPlanScoreV29473(a,type,chosen))[0]||null;
    if(row)chosen.add(row.id); return row;
  }
  return {A:pick('A'),B:pick('B'),C:pick('C')};
}
function planReviewTagsV29473(r,type){
  const tags=['招生章程','专业代码'];
  if(!r)return tags;
  if(type==='A')tags.push('学校性质','普通学费','实际校区','专业可读性');
  if(type==='B')tags.push('培养方案','就业去向','是否读研依赖','行业背景');
  if(type==='C')tags.push('学费/证书','大类分流','实际校区','转专业政策');
  if(r.isHighFee)tags.push('高收费/中外合作');
  if(r.isCollegeSpecialPlanV29474)tags.push('专项资格审核');
  if(isMed(r.majorText||r.major))tags.push('医学执业路径');
  if(isGrid(r.majorText||r.major))tags.push('电网招聘口径');
  if(hasConfusableMajorV2946 && hasConfusableMajorV2946(r))tags.push('易混专业');
  return [...new Set(tags)].slice(0,7);
}
function planCardV29473(type,row){
  const meta={
    A:{cls:'a',title:'A：稳妥公办方案',fit:'普通家庭、低容错、强省内、公办优先家庭',sacrifice:'可能牺牲城市、专业热度和学校层级',risk:'公办并不等同于一定适配，低分段要看孩子能不能读下去',line:'优先保公办、普通学费和基本路径，适合先守住底线。'},
    B:{cls:'b',title:'B：专业路径方案',fit:'强就业、强考研、强体制或孩子有明确兴趣的家庭',sacrifice:'可能牺牲学校层级、城市和省内偏好',risk:'专业名可能误认，部分方向依赖读研、行业背景或资格路径',line:'优先看专业是否看得准、孩子是否学得动、毕业后路径是否清楚。'},
    C:{cls:'c',title:'C：城市 / 学校层级方案',fit:'预算较宽、强城市、高分段或想争取平台上限的家庭',sacrifice:'可能牺牲专业确定性、普通学费和省内照应',risk:'高收费、证书、校区、大类分流和专业适配建议重点复核',line:'争取城市资源和学校平台，但并不等同于天然更优。'}
  }[type];
  if(!row){return `<div class="plan-card-v29473 ${meta.cls}"><h3>${meta.title}</h3><p class="plan-line">暂无合适候选。建议先查看冲突诊断，放宽压缩最大的偏好项。</p><div class="plan-grid-small"><b>适合</b><span>${meta.fit}</span><b>牺牲</b><span>${meta.sacrifice}</span><b>复核</b><span>${meta.risk}</span></div></div>`;}
  const tags=planReviewTagsV29473(row,type).map(x=>`<span>${htmlSafeV2945(x)}</span>`).join('');
  const why=(row._reasons||[]).slice(0,3).join('；')||'位次和画像匹配度较高';
  return `<div class="plan-card-v29473 ${meta.cls}">
    <div class="plan-head"><h3>${meta.title}</h3><span>${row._level||'观察'}</span></div>
    <p class="plan-line">${meta.line}</p>
    <div class="plan-pick"><b>${htmlSafeV2945(row.school)}</b><em>${htmlSafeV2945(row.major)}</em><small>${htmlSafeV2945(geoDisplayV29472(row))}｜${row.schoolNature?.label||'性质待核验'}｜画像${Math.round(row._profile||0)}分｜2025位次${fmt(row.rank2025)}</small></div>
    <div class="plan-grid-small"><b>适合</b><span>${meta.fit}</span><b>牺牲</b><span>${meta.sacrifice}</span><b>主要复核</b><span>${meta.risk}</span><b>为什么入选</b><span>${htmlSafeV2945(why)}</span></div>
    <div class="review-tags-v29473"><strong>需复核</strong>${tags}</div>
  </div>`;
}
function renderDiagnosisV29473(diag){
  const box=document.getElementById('conflictDiagnosisV29473'); if(!box)return;
  if(!currentRank){box.innerHTML='';return;}
  const main=diag.conflicts[0];
  const pressure=diag.top.map(x=>`<span>${htmlSafeV2945(x.step)}：减少 ${fmt(x.drop)}</span>`).join('') || '<span>暂无明显压缩点</span>';
  const strength=strengthRowsV29473(diag.snapshot).map(x=>`<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
  const relax=(main.relax||[]).map(x=>`<li>${htmlSafeV2945(x)}</li>`).join('');
  const avoid=(main.avoid||[]).map(x=>`<li>${htmlSafeV2945(x)}</li>`).join('');
  const funnel=(diag.funnel||[]).map(x=>`<div class="funnel-step"><b>${htmlSafeV2945(x.step)}</b><span>${fmt(x.count)} 条</span>${x.drop?`<em>−${fmt(x.drop)}</em>`:''}</div>`).join('');
  box.innerHTML=`<div class="diagnosis-v29473">
    <div class="diag-main"><div><span class="diag-kicker">高报师诊断</span><h3>${htmlSafeV2945(main.title)}</h3><p>${htmlSafeV2945(main.diagnosis)}</p></div><div class="diag-band">${htmlSafeV2945(diag.snapshot.scoreBand)}</div></div>
    <div class="pressure-tags-v29473"><b>候选压缩：</b>${pressure}</div>
    <details class="diag-details-v29473"><summary>查看条件强度与候选漏斗</summary><div class="strength-grid-v29473">${strength}</div><div class="funnel-grid-v29473">${funnel}</div></details>
    <div class="diag-advice-grid"><div><h4>建议优先放宽</h4><ol>${relax}</ol></div><div><h4>不建议先放宽</h4><ol>${avoid}</ol></div></div>
  </div>`;
}
function levelKindV29475(r,type){
  if(!r)return '观察';
  if(type==='C' && (r.isHighFee||r.isCoopV29475||r.isPrivateV29475))return '比较';
  return r._level||'观察';
}
function pathMetaV29475(type){
  const s=typeof conditionSnapshotV29473==='function'?conditionSnapshotV29473():{};
  const cTitle=(s.coopIntent||s.budget==='coop')?'C：城市 / 学校层级 / 中外合作提档':'C：城市 / 学校层级 / 提档路径';
  return {
    A:{cls:'a',title:'A：稳妥公办路径',line:'优先保公办、普通学费和基本路径，适合先守住底线。',fit:'普通家庭、低容错、强省内、公办优先家庭',sacrifice:'可能牺牲城市、专业热度和学校层级',risk:'公办并不等同于一定适配，低分段要看孩子能不能读下去'},
    B:{cls:'b',title:'B：专业路径',line:'优先看专业是否看得准、孩子是否学得动、毕业后路径是否清楚。',fit:'强就业、强考研、强体制或孩子有明确兴趣的家庭',sacrifice:'可能牺牲学校层级、城市和省内偏好',risk:'专业名可能误认，部分方向依赖读研、行业背景或资格路径'},
    C:{cls:'c',title:cTitle,line:(s.coopIntent?'把普通批更高层级、中外合作提档、民办城市专业并列比较。':'争取城市资源和学校平台，但并不等同于天然更优。'),fit:'预算较宽、强城市、高分段或想争取平台上限的家庭',sacrifice:'可能牺牲专业确定性、普通学费和省内照应',risk:'高收费、证书、校区、大类分流和专业适配建议重点复核'}
  }[type];
}
function planRiskTextV29475(r,type){
  if(!r)return '';
  if(r.isCoopV29475)return '中外合作不是天然提档，证书、校区、培养模式建议重点复核';
  if(r.isPrivateV29475)return '民办本科要核算四年成本、学校资源和孩子自律';
  if(type==='A' && r.isHighFee)return '高收费不适合直接当稳妥方案，需复核家庭承受力';
  if(type==='B' && hasConfusableMajorV2946 && hasConfusableMajorV2946(r))return '专业名称存在易混点，建议重点看本科代码和培养方案';
  if(type==='C')return '上限更高但不确定性更强，需复核校区、学费和专业归属';
  if(type==='A')return '稳妥也需要复核细节，仍要看孩子能不能读下去';
  return '专业路径需结合培养方案、就业去向和孩子适配复核';
}
function whyPlanV29475(r,type){
  if(!r)return '';
  if(type==='A'){
    if(!r.isHighFee && ['public','publicSoft'].includes(r.schoolTier?.level))return '公办和普通学费属性更适合先保底线。';
    return '位次和画像较稳，适合作为低风险比较项。';
  }
  if(type==='B'){
    const q=(document.getElementById('qMajor')?.value||'').trim();
    if(q && majorMatchesV29475(r,q))return `与“${htmlSafeV2945(q)}”主专业口径相关，适合做专业路径比较。`;
    return (r._reasons||[]).slice(0,2).join('；')||'专业方向相对清楚，适合精读培养方案。';
  }
  if(r.isCoopV29475||r.isHighFee)return '适合预算较宽家庭比较“成本换层级/城市/机会”的提档价值。';
  if(r.isPrivateV29475)return '适合作为城市或专业路径的补充比较，不宜只看本科标签。';
  if(['985','211'].includes(r.schoolTier?.level))return '学校层级更高，适合争取平台上限。';
  if(cityModeV29472()!=='none' && selectedCitiesV29472().length && cityMatchesV29472(r,selectedCitiesV29472()))return '城市资源匹配，适合做城市路径比较。';
  return '适合比较城市、学校层级或上限空间。';
}
function planScoreV29475LegacyUnused(r,type,chosen){
  let sc=0; const m=r.majorText||r.major||''; const s=conditionSnapshotV29473();
  if(chosen&&chosen.has(r.id))sc-=9999;
  if(type==='A'){
    if(['匹配','稳妥','保底'].includes(r._level))sc+=32;
    if(['public','publicSoft'].includes(r.schoolTier?.level))sc+=30;
    if(!r.isHighFee&&!r.isCoopV29475)sc+=22;
    if(['辽宁','吉林','黑龙江'].includes(r.schoolProvince))sc+=10;
    if(r.isPrivateV29475)sc-=28;
    if(r.isHighFee||r.isCoopV29475)sc-=35;
    sc+=(r._profile||0)*.35;
  }else if(type==='B'){
    if(['匹配','稳妥','可冲'].includes(r._level))sc+=18;
    const q=(document.getElementById('qMajor')?.value||'').trim();
    if(q&&majorMatchesV29475(r,q))sc+=36;
    if(s.priority==='grid'&&isGrid(m))sc+=32;
    else if(currentStrategy==='medical'&&isMed(m))sc+=32;
    else if(s.priority==='exam'&&(isLiberal(m)||isComp(m)||isTeacher(m)))sc+=26;
    else if(isGrid(m)||isComp(m)||isTeacher(m)||isMed(m)||isLiberal(m))sc+=15;
    if(hasConfusableMajorV2946 && hasConfusableMajorV2946(r))sc-=6;
    sc+=(r._profile||0)*.45;
  }else{
    if(['可冲','匹配','稳妥'].includes(r._level))sc+=20;
    if(['985','211'].includes(r.schoolTier?.level))sc+=36;
    if(s.cities.length && cityMatchesV29472(r,s.cities))sc+=30;
    if(s.strongCity && ['沈阳','大连'].includes(r.schoolCity))sc+=10;
    if(s.coopIntent && (r.isCoopV29475||r.isHighFee))sc+=40;
    else if(s.budgetWide && (r.isCoopV29475||r.isHighFee))sc+=20;
    if(r.isPrivateV29475 && (s.budgetWide||s.edgeScore||document.getElementById('filterFeeType')?.value==='privateCompare'))sc+=16;
    if((r.isCoopV29475||r.isHighFee) && !(s.budgetWide||s.coopIntent))sc-=30;
    sc+=liftValueScoreV29475(r)*.55;
  }
  return sc * scenarioPlanBiasV2951(type);
}
function pickBucketV29475(type,limit=4){
  const usable=(filtered||[]).filter(r=>!(r._excludes||[]).length);
  const seen=new Set();
  const scored=usable.slice().sort((a,b)=>planScoreV29475(b,type,null)-planScoreV29475(a,type,null));
  const out=[];
  for(const r of scored){
    const key=(r.id||'')+'|'+(r.school||'')+'|'+(r.major||'')+'|'+(r.rank2025||'');
    if(seen.has(key))continue;
    // A 是稳妥路径，默认不把高收费/民办/中外合作放在前两张；但如果用户预算宽且候选不足，允许补足对照。
    if(type==='A' && (r.isHighFee||r.isCoopV29475||r.isPrivateV29475) && out.length<2){
      const plain=out.filter(x=>!(x.isHighFee||x.isCoopV29475||x.isPrivateV29475)).length;
      if(plain<2)continue;
    }
    out.push(r); seen.add(key);
    if(out.length>=limit)break;
  }
  // 如果 A 因稳妥保护不足 2 条，再放宽限制补齐，避免方案盘空。
  if(out.length<Math.min(2,usable.length)){
    for(const r of scored){
      const key=(r.id||'')+'|'+(r.school||'')+'|'+(r.major||'')+'|'+(r.rank2025||'');
      if(seen.has(key))continue;
      out.push(r); seen.add(key);
      if(out.length>=limit)break;
    }
  }
  return out;
}
function pickSchemeBucketsV29475(){
  // V2.9.4.7.5.fix：A/B/C 是三条路径，不是三个互斥坑位。
  // 每条路径独立选 2-4 个代表候选，避免旧版全局 chosen 导致每列只剩 1 张卡。
  return {A:pickBucketV29475('A',4),B:pickBucketV29475('B',4),C:pickBucketV29475('C',4)};
}
let latestPlanBucketsV29475Fix2 = {A:[],B:[],C:[]};
function planKeyV29475Fix2(r){
  if(!r)return '';
  return [r.school||'', r.major||r.admissionMajor||'', r.planType||r.batch||'', r.year||'2025', r.rank2025||'', r.score2025||''].join('§');
}
function planPathCategoryV29475Fix2(r){
  const m=String((r&& (r.majorText||r.cleanMajor||r.major||''))||'');
  if(/会计|财务|审计|财政|金融|工商管理/.test(m))return '财会 / 经管路径';
  if(/电气|电力|智能电网|能源|新能源|储能/.test(m))return '电气 / 能源路径';
  if(/电子信息|通信|微电子|集成电路|光电|测控/.test(m))return '电子信息 / 通信路径';
  if(/计算机|软件|网络|信息安全|数据科学|人工智能|智能科学/.test(m))return '计算机 / 数字技术路径';
  if(/临床|口腔|麻醉|影像|医学|护理|康复|药学|检验/.test(m))return '医学 / 医学技术路径';
  if(/师范|教育|小学教育|学前教育|汉语言/.test(m))return '师范 / 考编路径';
  if(/机械|自动化|机器人工程|车辆|交通|轨道/.test(m))return '机械 / 自动化 / 交通路径';
  if(/法学|公安|思想政治|社会工作|行政/.test(m))return '考公 / 体制路径';
  if(/材料|化学|环境|生物|食品|农学/.test(m))return '深造依赖 / 传统工科路径';
  return '专业路径待复核';
}
function strongWhyV29475Fix2(r,type,idx){
  const base=whyPlanV29475(r,type)||'';
  if(type==='A'){
    if(idx===0)return '首选原因：先守住公办、普通学费和基本路径；适合普通家庭先看这一条。';
    return base || '备选原因：同属稳妥路径，可作为 A 方案补充比较。';
  }
  if(type==='B'){
    const cat=planPathCategoryV29475Fix2(r);
    if(idx===0)return `首选原因：${cat}更清楚，适合作为专业路径主线先精读。`;
    return `备选原因：可作为${cat}的补充或替代，重点看培养方案和就业去向。`;
  }
  if(idx===0){
    if(r.isCoopV29475||r.isHighFee)return '首选原因：适合预算较宽家庭比较“成本换层级/城市/机会”的提档价值。';
    return '首选原因：上限或城市资源更突出，适合做 C 方案首个比较项。';
  }
  return base || '备选原因：属于城市、学校层级或提档路径的补充比较。';
}
function compactMetaV29475Fix2(r){
  return [geoDisplayV29472(r), r.schoolNature?.label||'性质待核验', r.feeTypeLabelV29475||feeTypeLabelV29475(r), `2025位次${fmt(r.rank2025)}`].filter(Boolean).join('｜');
}
function planBadgesV29475Fix2(r,type){
  const arr=[];
  arr.push(levelKindV29475(r,type)||'观察');
  if(type==='A')arr.push('守底线');
  if(type==='B')arr.push(planPathCategoryV29475Fix2(r));
  if(type==='C')arr.push(r.isCoopV29475?'中外提档':r.isPrivateV29475?'民办比较':r.isHighFee?'高收费复核':'争上限');
  if(r.isCollegeSpecialPlanV29474)arr.push('专项资格');
  const im=window.LN_CHILD_INTEREST_RUNTIME_V296?.matchRecord?.(r);
  if(im?.active && im.level!=='no') arr.push('专业匹配：'+im.label);
  return arr.filter(Boolean).slice(0,4).map(x=>`<span>${htmlSafeV2945(x)}</span>`).join('');
}

function stripReasonPrefixV29475Fix3(s){
  return String(s||'').replace(/^首选原因：/,'').replace(/^备选原因：/,'').replace(/^为什么：/,'').trim();
}
function compactTextV29475Fix3(s,max=54){
  const t=stripReasonPrefixV29475Fix3(s).replace(/\s+/g,'');
  return t.length>max?t.slice(0,max-1)+'…':t;
}
function compactRiskV29475Fix3(r,type){
  const t=String(planRiskTextV29475(r,type)||'').replace(/\s+/g,'');
  return t.length>42?t.slice(0,41)+'…':t;
}
function shortReviewTagsV29475Fix3(r,type){
  const tags=planReviewTagsV29473(r,type).slice(0,3).map(x=>`<span>${htmlSafeV2945(x)}</span>`).join('');
  return tags || '<span>招生章程</span>';
}
function planClusterV29475Fix2(r,type){
  if(type==='A')return [r.schoolProvince||'', r.schoolNature?.label||'', r._level||''].join('/');
  if(type==='B')return planPathCategoryV29475Fix2(r);
  if(type==='C'){
    if(r.isCoopV29475||r.isHighFee)return '中外合作/高收费提档';
    if(r.isPrivateV29475)return '民办城市专业';
    if(['985','211'].includes(r.schoolTier?.level))return '学校层级更高';
    if(cityModeV29472()!=='none' && selectedCitiesV29472().length && cityMatchesV29472(r,selectedCitiesV29472()))return '城市资源匹配';
    return '普通批层级/城市比较';
  }
  return 'default';
}
function pickBucketDiverseV29475Fix2(type,limit=4,avoidKeys=new Set()){
  const usable=(filtered||[]).filter(r=>!(r._excludes||[]).length);
  const scored=usable.slice().sort((a,b)=>planScoreV29475(b,type,null)-planScoreV29475(a,type,null));
  const out=[], seen=new Set(), clusters=new Set();
  function canUse(r,strict){
    const key=planKeyV29475Fix2(r);
    if(seen.has(key))return false;
    if(strict && avoidKeys.has(key))return false;
    if(type==='A' && (r.isHighFee||r.isCoopV29475||r.isPrivateV29475) && out.length<2){
      const plain=out.filter(x=>!(x.isHighFee||x.isCoopV29475||x.isPrivateV29475)).length;
      if(plain<2)return false;
    }
    if((type==='B'||type==='C') && clusters.has(planClusterV29475Fix2(r,type)) && out.length<3)return false;
    return true;
  }
  for(const strict of [true,false]){
    for(const r of scored){
      if(!canUse(r,strict))continue;
      const key=planKeyV29475Fix2(r);
      out.push(r); seen.add(key); clusters.add(planClusterV29475Fix2(r,type));
      if(out.length>=limit)return out;
    }
  }
  return out;
}
function pickSchemeBucketsV29475(){
  const A=pickBucketDiverseV29475Fix2('A',4,new Set());
  const avoidA=new Set(A.map(planKeyV29475Fix2));
  const B=pickBucketDiverseV29475Fix2('B',4,avoidA);
  const avoidAB=new Set([...A,...B].map(planKeyV29475Fix2));
  const C=pickBucketDiverseV29475Fix2('C',4,avoidAB);
  return {A,B,C};
}

const PLAN_MODES_V29476 = {
  A:{
    cls:'a', key:'A', title:'A：稳妥公办路径', shortName:'看底线', role:'稳妥',
    goal:'少犯大错，优先保公办、普通学费、位次安全和专业可读性。',
    line:'先保底线：公办、普通学费、位次更稳，适合普通家庭先看。',
    fit:'普通家庭、低容错、强省内、公办优先、预算谨慎家庭',
    sacrifice:'可能牺牲城市、专业热度、学校名气和上限空间',
    risk:'公办并不等同于一定适配，仍要看孩子能不能读下去',
    prefer:['public_school','normal_fee','safe_rank','low_risk','region_match'],
    avoid:['high_fee','private_college','special_plan_without_qualification','unclear_major'],
    review:['学校性质','学费','校区','招生章程','专业课程']
  },
  B:{
    cls:'b', key:'B', title:'B：专业路径方案', shortName:'看专业', role:'专业',
    goal:'看专业方向是否清楚、孩子是否学得动、毕业路径是否能解释。',
    line:'先看方向：专业是否看得准，孩子是否学得动，毕业往哪走。',
    fit:'强就业、强考研、强体制、孩子有明确兴趣或专业优先家庭',
    sacrifice:'可能牺牲学校层级、城市和省内偏好',
    risk:'专业名可能误认，部分方向依赖读研、行业背景或资格路径',
    prefer:['major_path_clear','major_core','child_fit','career_clarity'],
    avoid:['major_misread','unclear_path','over_depend_on_name'],
    review:['本科专业代码','培养方案','就业质量报告','岗位相关性']
  },
  C:{
    cls:'c', key:'C', title:'C：城市 / 学校层级 / 提档路径', shortName:'看上限', role:'提档',
    goal:'比较城市、学校层级、中外合作、民办城市专业带来的上限机会。',
    line:'争取上限：城市、学校层级或中外合作提档，但复核要求更高。',
    fit:'预算较宽、强城市、高分段、学校层级优先或想提档家庭',
    sacrifice:'可能牺牲专业确定性、普通学费、省内照应或孩子适配',
    risk:'高收费、证书、校区、大类分流和专业适配建议重点复核',
    prefer:['school_tier_lift','city_lift','coop_lift','platform_value'],
    avoid:['fake_lift','unverified_certificate','uncontrolled_cost'],
    review:['学费','证书','培养地点','是否必须出国','转专业政策']
  }
};

// Compatibility alias for legacy V2950 plan-card renderer names.
// The active plan metadata lives in PLAN_MODES_V29476, but some V2950 UI helpers still read PLAN_MODES_V2950.
// Keep this alias until those helpers are fully renamed.
const PLAN_MODES_V2950 = Object.fromEntries(
  Object.entries(PLAN_MODES_V29476).map(([key, meta]) => [key, {
    ...meta,
    short: meta.shortName || meta.role || key
  }])
);

const PATH_RULES_V29476 = {
  accounting:{
    label:'财会 / 经管路径', weight:91,
    core:['会计学','审计学','财务管理'],
    related:['工商管理类','财政学','金融学','税收学','资产评估','经济学'],
    regex:/会计|审计|财务|财政|税收|资产评估|金融|经济|工商管理/,
    confusable:['工商管理类需核验是否含会计、财务或审计方向','金融类普通院校资源依赖较强'],
    career:['财会','审计','税务','企业财务','考公岗位'],
    review:['培养方案','专业方向','就业去向','考公岗位相关性']
  },
  electric:{
    label:'电气 / 能源路径', weight:94,
    core:['电气工程及其自动化','智能电网信息工程'],
    related:['自动化','能源与动力工程','新能源科学与工程','储能科学与工程'],
    regex:/电气|智能电网|电力|能源与动力|新能源|储能|自动化|核工程|能源/,
    confusable:['自动化、测控、电子信息不宜直接等同电气正主','电网方向建议重点复核招聘口径'],
    career:['电力系统','能源企业','装备制造','国企央企相关岗位'],
    review:['专业代码','学校行业背景','电网招聘口径','就业质量报告']
  },
  electronic:{
    label:'电子信息 / 通信路径', weight:88,
    core:['电子信息工程','通信工程','微电子科学与工程','集成电路设计与集成系统'],
    related:['光电信息科学与工程','电子科学与技术','测控技术与仪器','信息工程'],
    regex:/电子信息|通信|微电子|集成电路|光电|电子科学|信息工程|测控/,
    confusable:['电子信息类方向较宽，需核验课程和学院归属','测控可能更偏仪器与自动化'],
    career:['通信设备','电子制造','嵌入式','半导体','信息系统'],
    review:['培养方案','专业类代码','实验条件','就业去向']
  },
  computer:{
    label:'计算机 / 数字技术路径', weight:90,
    core:['计算机科学与技术','软件工程','网络工程','信息安全'],
    related:['数据科学与大数据技术','人工智能','物联网工程','智能科学与技术'],
    regex:/计算机|软件|网络工程|信息安全|网络空间|数据科学|人工智能|智能科学|物联网|大数据/,
    confusable:['数据科学与大数据技术 ≠ 大数据管理与应用','人工智能名称热，需看课程底座'],
    career:['软件开发','数据分析','网络安全','信息系统','AI应用'],
    review:['代码强度','培养方案','专业归属学院','就业岗位']
  },
  medical:{
    label:'医学 / 医学技术路径', weight:84,
    core:['临床医学','口腔医学','麻醉学','医学影像学'],
    related:['医学影像技术','医学检验技术','护理学','康复治疗学','药学'],
    regex:/临床|口腔|麻醉|儿科|医学影像|医学检验|护理|康复|药学|预防医学|中医学|针灸/,
    confusable:['医学技术并不等同于临床医生路径','护理康复和药学需要单独看执业路径'],
    career:['医院','医学技术','护理康复','药学检验','继续深造'],
    review:['是否医生路径','执业资格','规培周期','培养年限']
  },
  teacher:{
    label:'师范 / 考编路径', weight:82,
    core:['汉语言文学','数学与应用数学','英语','小学教育','学前教育'],
    related:['物理学','化学','生物科学','思想政治教育','历史学','地理科学'],
    regex:/师范|小学教育|学前教育|特殊教育|教育技术|汉语言|思想政治教育|数学与应用数学|物理学|化学|生物科学|历史学|地理科学/,
    confusable:['师范标签和教师编岗位要结合地区政策','非师范也可能考教师资格，但就业口径不同'],
    career:['教师编','教育培训','考公考编','继续深造'],
    review:['是否师范类','教师资格路径','本地教师招聘岗位','培养方案']
  },
  engineering:{
    label:'机械 / 自动化 / 交通路径', weight:80,
    core:['机械设计制造及其自动化','机械电子工程','自动化','车辆工程','交通运输'],
    related:['轨道交通信号与控制','机器人工程','工业工程','物流工程'],
    regex:/机械|自动化|机器人工程|车辆|交通运输|轨道|工业工程|物流工程|智能制造|测控/,
    confusable:['传统工科要看现场环境和数学物理承受力','工业工程、物流工程可能更偏管理流程'],
    career:['制造业','装备企业','交通运输','自动化控制','现场工程'],
    review:['工程现场接受度','培养方案','就业地区','行业周期']
  },
  public_service:{
    label:'考公 / 体制路径', weight:78,
    core:['法学','汉语言文学','计算机科学与技术','会计学','财务管理'],
    related:['行政管理','思想政治教育','统计学','公安学类','社会工作'],
    regex:/法学|汉语言|计算机|会计|财务|审计|统计|思想政治|公安|行政管理|社会工作/,
    confusable:['体制路径不是专业一选就稳，建议重点看岗位表','经管法文不能泛化成全部考公友好'],
    career:['公务员','事业编','教师编','国企央企','基层岗位'],
    review:['近年岗位表','学历要求','地区限制','备考能力']
  },
  deep_research:{
    label:'深造依赖 / 传统工科路径', weight:62,
    core:['材料科学与工程','化学','应用化学','环境科学','生物科学'],
    related:['食品科学与工程','农学','园林','资源勘查工程','采矿工程'],
    regex:/材料|化学|环境|生物|食品|农学|园林|资源勘查|采矿|地质|矿业|生态/,
    confusable:['这类方向不是不能选，但更依赖平台、深造和长期投入'],
    career:['读研深造','科研检测','传统制造','行业单位'],
    review:['是否愿意读研','学校平台','就业质量报告','行业环境']
  }
};
function majorTextV29476(r){ return String((r&&(r.mainMajorV29475||r.cleanMajor||r.majorText||r.major||r.admissionMajor||''))||'').replace(/\s+/g,''); }
function pathMatchesRuleV29476(rule, text){
  if(!rule || !text)return false;
  if(rule.regex && rule.regex.test(text))return true;
  return [...(rule.core||[]),...(rule.related||[])].some(x=>text.includes(String(x).replace(/\s+/g,'')));
}
function majorPathInfoV29476(r){
  const text=majorTextV29476(r);
  const hits=Object.entries(PATH_RULES_V29476).filter(([k,rule])=>pathMatchesRuleV29476(rule,text)).sort((a,b)=>(b[1].weight||0)-(a[1].weight||0));
  const [key,rule]=hits[0]||['unknown',{label:'专业路径待复核',core:[],related:[],confusable:['需结合培养方案确认方向'],career:['待复核'],review:['培养方案','就业去向']}];
  const isCore=(rule.core||[]).some(x=>text.includes(String(x).replace(/\s+/g,'')));
  const isRelated=!isCore && (rule.related||[]).some(x=>text.includes(String(x).replace(/\s+/g,'')));
  return {key, ...rule, isCore, isRelated, text};
}
function liftExchangeInfoV29476(r){
  const s=typeof conditionSnapshotV29473==='function'?conditionSnapshotV29473():{};
  const got=[], paid=[], review=[];
  let score=0, label='仅供比较', kind='ordinary';
  if(['985','211'].includes(r.schoolTier?.level)){got.push(r.schoolTier.level==='985'?'985平台':'211平台');score+=30;kind='schoolTier';}
  else if(r.schoolTier?.label && r.schoolTier.label!=='普通本科'){got.push(r.schoolTier.label);score+=12;}
  if(s.cities?.length && cityMatchesV29472(r,s.cities)){got.push('目标城市匹配');score+=22;kind=kind==='ordinary'?'city':kind;}
  else if(['沈阳','大连','北京','天津','上海','南京','杭州','广州','深圳','青岛','济南'].includes(r.schoolCity)){got.push('城市资源较好');score+=10;}
  if(r.isCoopV29475||r.isHighFee){got.push('中外/高收费提档机会'); paid.push('学费更高'); review.push('证书','培养地点','是否必须出国'); score+=s.coopIntent?26:14; kind='coopLift';}
  if(r.isPrivateV29475){got.push('民办城市/专业机会'); paid.push('民办身份与四年成本'); review.push('学校资源','考研/就业氛围'); score+=s.budgetWide?12:4; kind=kind==='ordinary'?'privateCity':kind;}
  if(r.schoolProvince!=='辽宁'){paid.push('省外适应与往返成本');}
  if(/大类|试验班|实验班/.test(r.major||'')){paid.push('专业分流不确定');review.push('大类分流规则','退出机制');score-=3;}
  if(!got.length)got.push('普通批比较机会');
  if(!paid.length)paid.push('可能牺牲专业确定性或省内照应');
  if(!review.length)review.push('学费','校区','招生章程','专业归属');
  if(score>=46)label='提档价值较高'; else if(score>=25)label='提档价值一般'; else if(r.isCoopV29475||r.isHighFee)label='提档价值待复核';
  if((r.isCoopV29475||r.isHighFee) && score<25)label='疑似伪提档';
  return {score,label,kind,got:[...new Set(got)],paid:[...new Set(paid)],review:[...new Set(review)]};
}
function baselineHitsV29476(r){
  const hits=[];
  if(['public','publicSoft'].includes(r.schoolTier?.level) || r.schoolNature?.label==='公办倾向')hits.push('公办倾向');
  if(!(r.isHighFee||r.isCoopV29475))hits.push('普通学费');
  if(['匹配','稳妥','保底'].includes(r._level))hits.push('位次较稳');
  if(['辽宁','吉林','黑龙江'].includes(r.schoolProvince))hits.push('地域可控');
  if(!r.isCollegeSpecialPlanV29474)hits.push('非专项限制');
  if(!hasConfusableMajorV2946 || !hasConfusableMajorV2946(r))hits.push('易混风险低');
  return hits.length?hits:['需人工复核底线'];
}
pathMetaV29475 = function(type){
  const s=typeof conditionSnapshotV29473==='function'?conditionSnapshotV29473():{};
  const m=PLAN_MODES_V29476[type] || PLAN_MODES_V29476.A;
  const title=(type==='C' && (s.coopIntent||s.budget==='coop'))?'C：城市 / 学校层级 / 中外合作提档':m.title;
  const line=(type==='C' && (s.coopIntent||s.budget==='coop'))?'上限交换：普通批层级、中外合作提档、民办城市专业并列比较。':m.line;
  return {...m,title,line};
};
planPathCategoryV29475Fix2 = function(r){ return majorPathInfoV29476(r).label; };
planClusterV29475Fix2 = function(r,type){
  if(type==='A')return [r.schoolProvince||'', r.schoolNature?.label||'', r._level||'', (r.isHighFee||r.isPrivateV29475?'risk':'plain')].join('/');
  if(type==='B')return majorPathInfoV29476(r).label;
  if(type==='C')return liftExchangeInfoV29476(r).kind;
  return 'default';
};
const planReviewTagsBaseV29476 = planReviewTagsV29473;
planReviewTagsV29473 = function(r,type){
  const base=(planReviewTagsBaseV29476?planReviewTagsBaseV29476(r,type):[]).slice();
  if(type==='A')base.push(...PLAN_MODES_V29476.A.review, ...baselineHitsV29476(r).includes('易混风险低')?[]:['本科代码']);
  if(type==='B')base.push(...(majorPathInfoV29476(r).review||[]));
  if(type==='C')base.push(...liftExchangeInfoV29476(r).review);
  return [...new Set(base)].slice(0,9);
};
planRiskTextV29475 = function(r,type){
  if(!r)return '';
  if(type==='A'){
    if(r.isHighFee||r.isCoopV29475)return '高收费/中外合作不宜直接当稳妥方案，必须确认家庭承受力。';
    if(r.isPrivateV29475)return '民办院校不宜默认放入稳妥底线，建议单独比较成本和资源。';
    return '稳妥也需要复核细节，仍需复核孩子能否读下去、校区和培养方案。';
  }
  if(type==='B'){
    const info=majorPathInfoV29476(r);
    if(info.confusable?.length)return info.confusable[0];
    return '专业路径需结合培养方案、就业去向和孩子适配复核。';
  }
  const lift=liftExchangeInfoV29476(r);
  if(lift.label==='疑似伪提档')return '可能只是名称或学校层级看起来更好，证书、专业和培养地点建议重点复核。';
  if(r.isCoopV29475||r.isHighFee)return '中外合作不是天然提档，需核验证书、学费、校区和培养模式。';
  if(r.isPrivateV29475)return '民办城市专业要核算四年成本、学校资源和孩子自律。';
  return '上限更高但不确定性更强，需复核校区、专业归属和实际资源。';
};
strongWhyV29475Fix2 = function(r,type,idx){
  if(!r)return '';
  if(type==='A'){
    const hits=baselineHitsV29476(r).slice(0,4).join(' + ');
    return (idx===0?'首选原因：':'备选原因：') + `${hits}。这条路优先回答“能不能稳妥落地”。`;
  }
  if(type==='B'){
    const info=majorPathInfoV29476(r);
    const role=info.isCore?'正主专业':info.isRelated?'相近替代':'路径相关';
    const career=(info.career||[]).slice(0,3).join(' / ');
    return (idx===0?'首选原因：':'备选原因：') + `${info.label}｜${role}。重点看${career||'培养方案和就业去向'}，不是只看学校名。`;
  }
  const lift=liftExchangeInfoV29476(r);
  return (idx===0?'首选原因：':'备选原因：') + `换来：${lift.got.slice(0,3).join(' / ')}；付出：${lift.paid.slice(0,3).join(' / ')}。${lift.label}。`;
};
planBadgesV29475Fix2 = function(r,type){
  const arr=[];
  arr.push(levelKindV29475(r,type)||'观察');
  if(type==='A')arr.push(...baselineHitsV29476(r).slice(0,2));
  if(type==='B'){
    const p=majorPathInfoV29476(r); arr.push(p.label); if(p.isCore)arr.push('正主专业'); else if(p.isRelated)arr.push('相近替代');
  }
  if(type==='C'){
    const l=liftExchangeInfoV29476(r); arr.push(l.label); arr.push(l.kind==='coopLift'?'中外提档':l.kind==='privateCity'?'民办城市':l.kind==='city'?'城市资源':l.kind==='schoolTier'?'学校层级':'上限比较');
  }
  if(r.isCoopV29475)arr.push('中外合作');
  if(r.isHighFee)arr.push('高收费');
  if(r.isPrivateV29475)arr.push('民办本科');
  if(r._qualificationGate?.matched || (r.qualificationGatesV296||[]).length)arr.push('资格型入口');
  return [...new Set(arr.filter(Boolean))].slice(0,4).map(x=>`<span>${htmlSafeV2945(x)}</span>`).join('');
};
function explanationPanelV29476(r,type){
  if(type==='A'){
    return `<div class="path-explain-v29476 a"><b>底线命中</b><span>${baselineHitsV29476(r).slice(0,5).map(htmlSafeV2945).join('｜')}</span></div>`;
  }
  if(type==='B'){
    const p=majorPathInfoV29476(r);
    const core=(p.core||[]).slice(0,3).join(' / ')||'待复核';
    const related=(p.related||[]).slice(0,3).join(' / ')||'待复核';
    return `<div class="path-explain-v29476 b"><b>${htmlSafeV2945(p.label)}</b><span>正主：${htmlSafeV2945(core)}｜替代：${htmlSafeV2945(related)}</span></div>`;
  }
  const l=liftExchangeInfoV29476(r);
  return `<div class="path-explain-v29476 c"><b>${htmlSafeV2945(l.label)}</b><span>换来：${htmlSafeV2945(l.got.slice(0,3).join(' / '))}<br/>付出：${htmlSafeV2945(l.paid.slice(0,3).join(' / '))}</span></div>`;
}
primaryPlanItemV29475Fix2 = function(r,type){
  if(!r)return `<div class="plan-primary-empty-v29475fix2">暂无首选推荐。建议查看冲突诊断，先放宽压缩最大的偏好项。</div>`;
  const tags=planReviewTagsV29473(r,type).slice(0,6).map(x=>`<span>${htmlSafeV2945(x)}</span>`).join('');
  return `<div class="plan-primary-v29475fix2 plan-primary-v29476 ${type.toLowerCase()}">
    <div class="primary-kicker-v29475fix2"><span>优先看</span><em>${htmlSafeV2945(levelKindV29475(r,type)||'观察')}</em></div>
    <h4>${htmlSafeV2945(r.school)}</h4>
    <div class="primary-major-v29475fix2">${htmlSafeV2945(r.major)}</div>
    <div class="primary-meta-v29475fix2">${htmlSafeV2945(compactMetaV29475Fix2(r))}</div>
    <div class="path-badges-v29475fix2">${planBadgesV29475Fix2(r,type)}</div>
    ${window.LN_CANDIDATE_CARD_VIEW_V296?.evidenceHtml?.(r,type,{idx:0})||''}
    ${explanationPanelV29476(r,type)}
    <p><strong>${type==='A'?'为什么稳':type==='B'?'为什么是路径':'换来了什么'}：</strong>${htmlSafeV2945(stripReasonPrefixV29475Fix3(strongWhyV29475Fix2(r,type,0)))}</p>
    <p><strong>主要复核点：</strong>${htmlSafeV2945(planRiskTextV29475(r,type))}</p>
    <div class="review-tags-v29473"><strong>复核</strong>${tags}</div>
    <button class="ghost slim add-one-v29475fix2" onclick="addPlanOneV29475Fix2('${htmlSafeV2945(r.id)}','${type}','首选')">加入自选</button>
  </div>`;
};
backupPlanItemV29475Fix2 = function(r,type,idx){
  const reason=compactTextV29475Fix3(strongWhyV29475Fix2(r,type,idx),58);
  const risk=compactRiskV29475Fix3(r,type);
  const tags=shortReviewTagsV29475Fix3(r,type);
  return `<div class="plan-backup-v29475fix2 plan-backup-v29476 ${type.toLowerCase()}">
    <div class="backup-top-v29475fix2"><span>${type}${idx+1}</span><b>${htmlSafeV2945(levelKindV29475(r,type)||'观察')}</b></div>
    <div class="backup-main-v29475fix5"><strong>${htmlSafeV2945(r.school)}</strong><em>${htmlSafeV2945(r.major)}</em></div>
    <small>${htmlSafeV2945(compactMetaV29475Fix2(r))}</small>
    ${window.LN_CANDIDATE_CARD_VIEW_V296?.evidenceHtml?.(r,type,{idx,compact:true})||''}
    <div class="backup-path-v29476">${type==='B'?htmlSafeV2945(majorPathInfoV29476(r).label):type==='C'?htmlSafeV2945(liftExchangeInfoV29476(r).label):htmlSafeV2945(baselineHitsV29476(r).slice(0,2).join('｜'))}</div>
    <div class="backup-line-v29475fix5"><b>理由</b><span>${htmlSafeV2945(reason)}</span></div>
    <div class="backup-line-v29475fix5 muted"><b>复核</b><span>${htmlSafeV2945(risk)}</span></div>
    <div class="backup-tags-v29475fix5"><b>复核</b>${tags}</div>
    <button class="ghost slim add-one-v29475fix2" onclick="addPlanOneV29475Fix2('${htmlSafeV2945(r.id)}','${type}','备选')">加入</button>
  </div>`;
};

function scenarioPlanAdjustmentV2954Fix2(r,type,path,lift,s){
  const rule=scenarioRuleV2951(currentStrategy)||{};
  const pref=document.getElementById('priority')?.value || rule?.preference?.priority || 'employment';
  let adj=0;
  const bias=Number(rule?.planBias?.[type]);
  if(Number.isFinite(bias)) adj += Math.round((bias-1)*16);
  const fit=typeof scoreBandFitV2954Fix2==='function'?scoreBandFitV2954Fix2(rule):null;
  if(fit && fit.state==='mismatch') adj -= 3;
  const isPublic=['public','publicSoft'].includes(r.schoolTier?.level)||r.schoolNature?.label==='公办倾向';
  const normalFee=!(r.isHighFee||r.isCoopV29475);
  const feeRisk=(r.isHighFee||r.isCoopV29475||r.isPrivateV29475);
  const maxTuition=Number(rule?.baselineSuggestion?.maxTuition || 0);
  const tuition=Number(String(r.tuition2025 || r.tuition || '').replace(/[^0-9.]/g,''));
  if(maxTuition>0 && tuition>maxTuition){
    if(type==='A')adj-=18;
    else if(type==='B')adj-=8;
    else if(type==='C')adj-=3;
  }
  const key=path?.key||'unknown';
  const core=!!path?.isCore, related=!!path?.isRelated;
  if(['employment','publicLow','edgeBachelor'].includes(currentStrategy)){
    if(type==='A'){ if(isPublic)adj+=12; if(normalFee)adj+=10; if(['辽宁','吉林','黑龙江'].includes(r.schoolProvince))adj+=6; if(feeRisk)adj-=18; }
    if(type==='C' && feeRisk)adj-=8;
  }
  if(currentStrategy==='budgetFlexible'){
    if(type==='C'){ if(r.isCoopV29475||r.isHighFee)adj+=30; if(r.isPrivateV29475)adj+=16; if(lift?.kind==='coopLift'||lift?.kind==='privateCity')adj+=12; }
    if(type==='A' && isPublic && normalFee)adj+=8;
  }
  if(currentStrategy==='privateMajor'){
    if(type==='B' && r.isPrivateV29475)adj+=12;
    if(type==='C' && r.isPrivateV29475)adj+=18;
  }
  if(currentStrategy==='grid' || pref==='grid'){
    if(type==='B'){
      if(key==='electric' && core)adj+=42;
      else if(key==='electric' && related)adj+=24;
      else if(['electronic','engineering'].includes(key))adj+=8;
    }
    if(type==='C' && key==='electric')adj+=8;
  }
  if(currentStrategy==='medical' || pref==='medical'){
    if(type==='B'){
      if(key==='medical' && core)adj+=42;
      else if(key==='medical' && related)adj+=24;
      else if(/医学|药学|护理|康复/.test(path?.text||''))adj+=8;
    }
    if(type==='A' && key==='medical' && normalFee)adj+=6;
  }
  if(currentStrategy==='exam' || pref==='exam'){
    if(type==='B' && ['public_service','teacher','accounting','computer'].includes(key))adj+=26;
    if(type==='A' && isPublic)adj+=8;
  }
  if(pref==='school' && type==='C' && ['985','211'].includes(r.schoolTier?.level))adj+=22;
  if(pref==='city' && type==='C' && lift?.kind==='city')adj+=18;
  return adj;
}

planScoreV29475 = function(r,type,chosen){
  let sc=0; const s=conditionSnapshotV29473?conditionSnapshotV29473():{}; const path=majorPathInfoV29476(r); const lift=liftExchangeInfoV29476(r);
  if(chosen&&chosen.has(r.id))sc-=9999;
  if(type==='A'){
    if(['匹配','稳妥','保底'].includes(r._level))sc+=34;
    if(['public','publicSoft'].includes(r.schoolTier?.level)||r.schoolNature?.label==='公办倾向')sc+=30;
    if(!(r.isHighFee||r.isCoopV29475))sc+=24;
    if(['辽宁','吉林','黑龙江'].includes(r.schoolProvince))sc+=12;
    if(!r.isCollegeSpecialPlanV29474)sc+=8;
    if(r.isPrivateV29475)sc-=34;
    if(r.isHighFee||r.isCoopV29475)sc-=38;
    sc+=(r._profile||0)*.32;
  }else if(type==='B'){
    if(['匹配','稳妥','可冲'].includes(r._level))sc+=18;
    if(path.isCore)sc+=36; else if(path.isRelated)sc+=22; else if(path.key!=='unknown')sc+=14;
    const q=(document.getElementById('qMajor')?.value||'').trim(); if(q&&majorMatchesV29475(r,q))sc+=28;
    if(hasConfusableMajorV2946 && hasConfusableMajorV2946(r))sc-=6;
    sc+=(r._profile||0)*.42 + (path.weight||0)*.18;
  }else{
    if(['可冲','匹配','稳妥'].includes(r._level))sc+=18;
    sc+=lift.score;
    if(s.coopIntent && (r.isCoopV29475||r.isHighFee))sc+=30;
    if(s.budgetWide && (r.isCoopV29475||r.isHighFee||r.isPrivateV29475))sc+=14;
    if((r.isCoopV29475||r.isHighFee) && !(s.budgetWide||s.coopIntent))sc-=28;
    if(lift.label==='疑似伪提档')sc-=10;
    sc+=(r._profile||0)*.18;
  }
  sc += scenarioPlanAdjustmentV2954Fix2(r,type,path,lift,s);
  if(window.LN_CHILD_INTEREST_RUNTIME_V296?.planAdjustment){
    sc += window.LN_CHILD_INTEREST_RUNTIME_V296.planAdjustment(r,type);
  }
  return sc;
};
const planScoreV296Fix3Compute = planScoreV29475;
planScoreV29475 = function(r,type,chosen){
  if(chosen && chosen.has && chosen.has(r&&r.id)) return planScoreV296Fix3Compute(r,type,chosen);
  const cache=window.LN_CANDIDATE_CACHE_V296;
  if(cache?.get){ return cache.get(r,'planScore:'+type,()=>planScoreV296Fix3Compute(r,type,null)); }
  return planScoreV296Fix3Compute(r,type,chosen);
};
function v2950Text(v){return htmlSafeV2945(String(v??''));}
function getActiveChipTextV2950(group){const box=document.querySelector(`[data-group="${group}"]`);return box?.querySelector('.chip.active')?.textContent?.trim()||'未设置';}
function getBudgetLabelV2950(){const el=document.getElementById('budget');return el?.selectedOptions?.[0]?.textContent||'未设置';}
function getSpecialLabelV2950(){const v=window.LN_QUALIFICATION_GATE_V296?.specialPlanStatus?.()||'unreviewed';return v==='approved'?'高校专项已纳入资格入口比较':v==='unknown'?'高校专项不确定，默认隐藏':'高校专项未确认，默认隐藏';}
function getRegionLabelV2950(){
  const mode=document.getElementById('regionMode')?.selectedOptions?.[0]?.textContent||'不限制';
  const ps=selectedProvinces?selectedProvinces():[];
  return `${mode}${ps.length?'｜'+ps.slice(0,6).join('、')+(ps.length>6?'等':''):'｜未选省份'}`;
}
function getCityLabelV2950(){
  const mode=document.getElementById('cityMode')?.selectedOptions?.[0]?.textContent||'不限制';
  const cities=(document.getElementById('targetCities')?.value||'').trim();
  return `${mode}${cities?'｜'+cities:'｜未填城市'}`;
}
function renderBaselineSummaryV2950(){
  const box=document.getElementById('baselineSummaryV2950'); if(!box)return;
  const rejects=selectedRejects?selectedRejects():[];
  const budget=document.getElementById('budget')?.value||'normal';
  const special=specialPlanStatusV29474?specialPlanStatusV29474():'unreviewed';
  const out=getActiveChipTextV2950('outProvince');
  const fee=document.getElementById('filterFeeType')?.selectedOptions?.[0]?.textContent||'全部候选';
  const flags=[];
  if(budget==='normal')flags.push('普通学费优先');
  if(budget==='coop')flags.push('主动比较中外合作提档');
  if(special!=='approved')flags.push('高校专项默认隐藏');
  const qsum=window.LN_QUALIFICATION_GATE_V296?.summary?.();
  if(qsum?.enabled?.length)flags.push('资格入口已放开：'+qsum.enabled.slice(0,2).join('、')); else flags.push('资格型入口默认隐藏');
  if(rejects.length)flags.push('明确不接受：'+rejects.join('、'));
  box.innerHTML=`
    <div class="baseline-snapshot-v2950">
      <div><b>预算</b><span>${v2950Text(getBudgetLabelV2950())}</span></div>
      <div><b>专项资格</b><span>${v2950Text(getSpecialLabelV2950())}</span></div>
      <div><b>资格入口</b><span>${v2950Text((window.LN_QUALIFICATION_GATE_V296?.summary?.()||{}).text||'默认隐藏')}</span></div>
      <div><b>地域</b><span>${v2950Text(getRegionLabelV2950())}</span></div>
      <div><b>城市</b><span>${v2950Text(getCityLabelV2950())}</span></div>
      <div><b>出省</b><span>${v2950Text(out)}</span></div>
      <div><b>办学/收费</b><span>${v2950Text(fee)}</span></div>
    </div>
    <div class="baseline-tags-v2950">${flags.map(x=>`<span>${v2950Text(x)}</span>`).join('')||'<span>底线未收窄，先看全量方案</span>'}</div>`;
}
function applySimpleModeV2950(){
  const on=document.getElementById('simpleModeToggleV2950')?.checked ?? true;
  document.body.classList.toggle('parent-simple-v2950', !!on);
  localStorage.setItem('ln_simple_mode_v2950', on?'1':'0');
}
function initSimpleModeV2950(){
  const v=localStorage.getItem('ln_simple_mode_v2950');
  const el=document.getElementById('simpleModeToggleV2950');
  if(el){el.checked = v!=='0'; el.addEventListener('change',()=>{applySimpleModeV2950(); updateGuideState();});}
  applySimpleModeV2950();
}
function planRoleLabelV2950(r,type){
  if(type==='A')return (baselineHitsV29476?baselineHitsV29476(r).slice(0,3).join(' + '):'底线命中');
  if(type==='B'){
    const p=majorPathInfoV29476?majorPathInfoV29476(r):{};
    const role=p.isCore?'正主':p.isRelated?'相近':'需核验';
    return `${p.label||'专业路径'}｜${role}`;
  }
  const l=liftExchangeInfoV29476?liftExchangeInfoV29476(r):{};
  return `${l.label||'上限交换'}｜${(l.got||[]).slice(0,2).join('/')||'城市/层级比较'}`;
}
function primaryWhyV2950(r,type){
  if(type==='A')return `为什么放在A：${baselineHitsV29476(r).slice(0,5).join('、')}。这组优先回答“普通家庭能不能稳妥落地”。`;
  if(type==='B'){
    const p=majorPathInfoV29476(r); const role=p.isCore?'正主专业':p.isRelated?'相近替代':'需核验路径';
    return `为什么放在B：${p.label}，${role}。重点看专业主线、相近替代和孩子是否学得动。`;
  }
  const l=liftExchangeInfoV29476(r);
  return `为什么放在C：换来 ${l.got.slice(0,3).join('、')}；付出 ${l.paid.slice(0,3).join('、')}。${l.label}。`;
}
function planReviewV2950(r,type){
  return (planReviewTagsV29473?planReviewTagsV29473(r,type):['招生章程','学费','校区']).slice(0,6);
}
function childInterestLineV296(r){
  const im=window.LN_CHILD_INTEREST_RUNTIME_V296?.matchRecord?.(r);
  if(!im?.active || im.level==='no')return '';
  const note=im.level==='review' ? '需复核方向' : (im.level==='core'?'正主方向':'相近方向');
  return `<p class="interest-line-v296 ${htmlSafeV2945(im.level)}"><b>专业匹配</b>${htmlSafeV2945(im.group?.name||'孩子兴趣')}｜${htmlSafeV2945(im.label)}｜${htmlSafeV2945(note)}</p>`;
}
function planSmallCardV2950(r,type,idx){
  const meta=compactMetaV29475Fix2?compactMetaV29475Fix2(r):`${geoDisplayV29472(r)}｜${r._level||''}`;
  const role=planRoleLabelV2950(r,type);
  const risk=planRiskTextV29475?planRiskTextV29475(r,type):'需人工复核';
  return `<div class="plan-mini-v2950 ${type.toLowerCase()}">
    <div class="mini-head-v2950"><span>${type}${idx+1}</span><b>${v2950Text(levelKindV29475(r,type)||r._level||'观察')}</b></div>
    <strong>${v2950Text(r.school)}</strong>
    <em>${v2950Text(r.major)}</em>
    <small>${v2950Text(meta)}</small>
    <p><b>${type==='A'?'底线':type==='B'?'路径':'交换'}</b>${v2950Text(role)}</p>
    ${childInterestLineV296(r)}
    <p class="muted"><b>复核</b>${v2950Text(compactTextV29475Fix3?compactTextV29475Fix3(risk,54):risk)}</p>
    <button class="ghost slim" onclick="addPlanOneV29475Fix2('${v2950Text(r.id)}','${type}','备选')">加入</button>
  </div>`;
}
function planPrimaryCardV2950(r,type){
  if(!r)return `<div class="plan-primary-empty-v2950">暂无首选。请先放宽压缩最大的条件，或查看详细候选。</div>`;
  const meta=compactMetaV29475Fix2?compactMetaV29475Fix2(r):`${geoDisplayV29472(r)}｜${r._level||''}`;
  const tags=planReviewV2950(r,type).map(x=>`<span>${v2950Text(x)}</span>`).join('');
  const explain= type==='A' ? `<div class="explain-a-v2950"><b>底线命中</b><span>${v2950Text(baselineHitsV29476(r).slice(0,5).join('｜'))}</span></div>`
    : type==='B' ? (()=>{const p=majorPathInfoV29476(r);return `<div class="explain-b-v2950"><b>${v2950Text(p.label)}</b><span>正主：${v2950Text((p.core||[]).slice(0,3).join(' / ')||'待核验')}｜相近：${v2950Text((p.related||[]).slice(0,3).join(' / ')||'待核验')}</span></div>`;})()
    : (()=>{const l=liftExchangeInfoV29476(r);return `<div class="explain-c-v2950"><b>${v2950Text(l.label)}</b><span>换来：${v2950Text(l.got.slice(0,3).join(' / '))}<br/>付出：${v2950Text(l.paid.slice(0,3).join(' / '))}</span></div>`;})();
  return `<div class="plan-primary-v2950 ${type.toLowerCase()}">
    <div class="primary-badge-v2950"><span>优先看</span><em>${v2950Text(PLAN_MODES_V2950[type].short)}</em></div>
    <h4>${v2950Text(r.school)}</h4>
    <div class="major-v2950">${v2950Text(r.major)}</div>
    <div class="meta-v2950">${v2950Text(meta)}</div>
    ${explain}
    ${childInterestLineV296(r)}
    <p><strong>${type==='A'?'为什么稳':type==='B'?'为什么是路径':'换来了什么'}：</strong>${v2950Text(primaryWhyV2950(r,type))}</p>
    <p><strong>主要复核点：</strong>${v2950Text(planRiskTextV29475(r,type))}</p>
    <div class="review-v2950"><b>复核</b>${tags}</div>
    <button class="ghost slim" onclick="addPlanOneV29475Fix2('${v2950Text(r.id)}','${type}','首选')">加入自选</button>
  </div>`;
}
function renderPlanColumnV2950(type,rows){
  const meta=PLAN_MODES_V2950[type]; rows=rows||[];
  const count={chong:rows.filter(r=>['可冲','超冲'].includes(r._level)).length, main:rows.filter(r=>['匹配','稳妥'].includes(r._level)).length, safe:rows.filter(r=>['保底'].includes(r._level)).length};
  const first=rows[0]||null; const backups=rows.slice(1,4);
  return `<section class="plan-col-v2950 ${meta.cls}">
    <div class="plan-col-head-v2950"><div><h3>${v2950Text(meta.title)}</h3><p>${v2950Text(meta.line)}</p></div><button class="secondary slim" onclick="addPlanGroupV29475Fix2('${type}')">加入本方案 ${Math.min(rows.length,4)} 条</button></div>
    <div class="plan-stats-v2950"><span>共 ${rows.length} 条</span><span>冲 ${count.chong}</span><span>稳 ${count.main}</span><span>保 ${count.safe}</span></div>
    ${planPrimaryCardV2950(first,type)}
    <div class="backup-list-v2950">${backups.map((r,i)=>planSmallCardV2950(r,type,i+1)).join('')||'<p class="small">暂无备选。可放宽条件后重新筛选。</p>'}</div>
  </section>`;
}

function renderABCPanelV296Fix3(active,buckets){
  const view=window.LN_ABC_VIEW_V296;
  const meta=view?.currentMeta?.() || {title:active,desc:''};
  const currentRows=(buckets&&buckets[active])||[];
  return `<div class="abc-active-panel-v296"><div class="abc-active-head-v296"><b>${v2950Text(meta.title)}</b><span>${v2950Text(meta.desc)}</span></div>${renderPlanColumnV2950(active,currentRows)}</div>`;
}
function renderPlanABCViewOnly(){
  const box=document.getElementById('planABC'); if(!box)return;
  const view=window.LN_ABC_VIEW_V296;
  const active=(view?.get?.()||'A');
  const buckets=latestPlanBucketsV29475Fix2||{A:[],B:[],C:[]};
  const tabs=box.querySelector('.abc-segment-v296');
  if(tabs && view?.renderTabs){ tabs.outerHTML=view.renderTabs(buckets); }
  const panel=document.getElementById('abcPanelV296');
  if(panel){ panel.innerHTML=renderABCPanelV296Fix3(active,buckets); }
  else if(box){ renderPlanABC(); }
  view?.updateTabState?.();
}
function renderPlanABC(){
  const box=document.getElementById('planABC'); if(!box)return;
  box.className='abc-board-v296';
  if(!currentRank){box.innerHTML='<div class="abc-empty-v2950">先填写分数或位次，再看 A/B/C 三条路径。</div>'; const d=document.getElementById('conflictDiagnosisV29473'); if(d)d.innerHTML=''; return;}
  const diag=diagnoseV29473?diagnoseV29473():null; if(renderDiagnosisV29473&&diag)renderDiagnosisV29473(diag);
  const buckets=pickSchemeBucketsV29475?pickSchemeBucketsV29475():{A:[],B:[],C:[]}; latestPlanBucketsV29475Fix2=buckets;
  const view=window.LN_ABC_VIEW_V296;
  const active=(view?.get?.()||'A');
  const interestSummary=window.LN_CHILD_INTEREST_RUNTIME_V296?.summary?.() || window.LN_CHILD_INTEREST_RUNTIME_V2955?.summary?.();
  const interestLine=interestSummary?`<p class="abc-interest-note-v296">${v2950Text(interestSummary.title)}｜${v2950Text(interestSummary.text)}</p>`:'';
  const tabs=view?.renderTabs?.(buckets)||'';
  const toolbar=`<div class="abc-toolbar-v296"><div><b>A/B/C 方案视角</b><span>A 守底线，B 看专业，C 争上限；冲稳保是每条路径里的安全等级。</span>${interestLine}</div><button class="execute-secondary" onclick="addAllPlansV29475Fix2()">加入全部 A/B/C 候选</button></div>`;
  box.innerHTML=toolbar+tabs+`<div id="abcPanelV296">${renderABCPanelV296Fix3(active,buckets)}</div>`;
}
window.renderPlanABCViewOnly=renderPlanABCViewOnly;


window.LN_PLAN_ENGINE = {
  renderPlanABC,
  renderPlanABCViewOnly,
  pickSchemeRowsV29473,
  pickSchemeBucketsV29475,
  planScoreV29475,
  majorPathInfoV29476,
  liftExchangeInfoV29476,
  baselineHitsV29476
};
