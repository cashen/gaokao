// V2.9.5.4 filter-engine: enrichment, filtering and result update

function setMetaStatusInFilterV297Fix2(text,status){
  if(window.LN_SET_META_STATUS_V297){ window.LN_SET_META_STATUS_V297(text,status); return; }
  const el=document.getElementById('metaRecords');
  if(!el)return;
  el.textContent=text;
  el.classList.remove('meta-status-ready','meta-status-loading','meta-status-idle','meta-status-error');
  if(status)el.classList.add('meta-status-'+status);
}

function guessSchoolNature(school){
  if(!school)return {label:'需核验',cls:'unknown',score:0};
  const normalized = school.replace(/[（(].*?[）)]/g,'').trim();

  const exact = SCHOOL_NATURE_EXACT_MAP[school] || SCHOOL_NATURE_EXACT_MAP[normalized];
  if(exact==='private')return {label:'民办/独立倾向',cls:'private',score:-30};
  if(exact==='public')return {label:'公办倾向',cls:'',score:20};

  const privateRe=/独立学院|民办|艺术与信息工程学院|贤达经济人文学院|天华学院|成贤学院|徐海学院|现代科技学院|耿丹学院|轻工学院|康达学院|金审学院|浦江学院|紫金学院|金城学院|红山学院|通达学院|船山学院|嘉庚学院|博达学院|锦江学院|中山学院|宝德学院|滨海外事学院|中环信息学院|珠江学院|南国商学院|赛恩斯新医药学院|工程技术学院|银杏酒店管理学院|广陵学院|海源学院|津桥学院|邮电与信息工程学院|南昌商学院|现代经济管理学院|华信学院|汇华学院|经济管理学院|药护学院|知行学院|潇湘学院|四方学院|至诚学院|希望学院|天府学院|华清学院|高新学院|医疗学院|人文信息学院|城南学院|诚毅学院|海都学院|昆仑旅游学院/;
  if(privateRe.test(school))return {label:'民办/独立倾向',cls:'private',score:-30};

  return {label:'需核验',cls:'unknown',score:0};
}


const SCHOOL_TIER_985 = new Set(["上海交通大学", "上海交通大学医学院", "东北大学", "东南大学", "中南大学", "中国人民大学", "中国人民解放军国防科技大学", "中国农业大学", "中国海洋大学", "中国科学技术大学", "中央民族大学", "中山大学", "兰州大学", "北京大学", "北京大学医学部", "北京师范大学", "北京理工大学", "北京航空航天大学", "华东师范大学", "华中科技大学", "华南理工大学", "南京大学", "南开大学", "厦门大学", "吉林大学", "同济大学", "哈尔滨工业大学", "四川大学", "国防科技大学", "复旦大学", "复旦大学上海医学院", "大连理工大学", "天津大学", "山东大学", "武汉大学", "浙江大学", "清华大学", "湖南大学", "电子科技大学", "西北农林科技大学", "西北工业大学", "西安交通大学", "重庆大学"]);
const SCHOOL_TIER_211 = new Set(["上海外国语大学", "上海大学", "上海财经大学", "东北农业大学", "东北师范大学", "东北林业大学", "东华大学", "中南财经政法大学", "中国人民解放军海军军医大学", "中国人民解放军空军军医大学", "中国传媒大学", "中国地质大学(北京)", "中国地质大学(武汉)", "中国政法大学", "中国石油大学(北京)", "中国石油大学(华东)", "中国矿业大学", "中国矿业大学(北京)", "中国药科大学", "中央财经大学", "中央音乐学院", "云南大学", "内蒙古大学", "北京中医药大学", "北京交通大学", "北京体育大学", "北京化工大学", "北京外国语大学", "北京工业大学", "北京林业大学", "北京科技大学", "北京邮电大学", "华东理工大学", "华中农业大学", "华中师范大学", "华北电力大学", "华南师范大学", "南京农业大学", "南京师范大学", "南京理工大学", "南京航空航天大学", "南昌大学", "合肥工业大学", "哈尔滨工程大学", "四川农业大学", "大连海事大学", "天津医科大学", "太原理工大学", "宁夏大学", "安徽大学", "对外经济贸易大学", "广西大学", "延边大学", "新疆大学", "暨南大学", "武汉理工大学", "江南大学", "河北工业大学", "河海大学", "海军军医大学", "海南大学", "湖南师范大学", "石河子大学", "福州大学", "空军军医大学", "第二军医大学", "第四军医大学", "苏州大学", "西北大学", "西南交通大学", "西南大学", "西南财经大学", "西安电子科技大学", "西藏大学", "贵州大学", "辽宁大学", "郑州大学", "长安大学", "陕西师范大学", "青海大学"]);
const SCHOOL_TIER_ALIAS = {
  "哈尔滨工业大学（深圳）":"哈尔滨工业大学","哈尔滨工业大学(深圳)":"哈尔滨工业大学","哈尔滨工业大学（威海）":"哈尔滨工业大学","哈尔滨工业大学(威海)":"哈尔滨工业大学",
  "山东大学（威海）":"山东大学","山东大学(威海)":"山东大学","山东大学威海分校":"山东大学","东北大学秦皇岛分校":"东北大学",
  "大连理工大学盘锦校区":"大连理工大学","大连理工大学（盘锦校区）":"大连理工大学","大连理工大学(盘锦校区)":"大连理工大学",
  "电子科技大学（沙河校区）":"电子科技大学","电子科技大学(沙河校区)":"电子科技大学",
  "合肥工业大学（宣城校区）":"合肥工业大学","合肥工业大学(宣城校区)":"合肥工业大学",
  "北京交通大学（威海校区）":"北京交通大学","北京交通大学(威海校区)":"北京交通大学",
  "北京邮电大学（宏福校区）":"北京邮电大学","北京邮电大学(宏福校区)":"北京邮电大学",
  "中国石油大学（北京）克拉玛依校区":"中国石油大学(北京)","中国石油大学(北京)克拉玛依校区":"中国石油大学(北京)",
  "华北电力大学（保定）":"华北电力大学","华北电力大学(保定)":"华北电力大学",
  "中国地质大学（北京）":"中国地质大学(北京)","中国地质大学（武汉）":"中国地质大学(武汉)",
  "中国矿业大学（北京）":"中国矿业大学(北京)","中国石油大学（北京）":"中国石油大学(北京)","中国石油大学（华东）":"中国石油大学(华东)"
};
function normalizeSchoolTierName(s){
  let raw=String(s||'').trim().replace(/\s+/g,'');
  if(SCHOOL_TIER_ALIAS[raw])return SCHOOL_TIER_ALIAS[raw];
  let noCampus=raw.replace(/[（(](盘锦校区|深圳校区|威海校区|沙河校区|宏福校区|宣城校区|保定校区|克拉玛依校区)[）)]/g,'').replace(/(盘锦校区|深圳校区|威海校区|沙河校区|宏福校区|宣城校区|保定校区|克拉玛依校区)$/g,'');
  return SCHOOL_TIER_ALIAS[noCampus]||noCampus;
}
function looksPublicLikeSchool(s){
  if(!s)return false;
  if(/独立学院|民办|艺术与信息工程学院|贤达经济人文学院|天华学院|成贤学院|徐海学院|现代科技学院|耿丹学院|轻工学院|康达学院|金审学院|浦江学院|紫金学院|金城学院|红山学院|通达学院|船山学院|嘉庚学院|博达学院|锦江学院|中山学院|宝德学院|滨海外事学院|中环信息学院|珠江学院|南国商学院|赛恩斯新医药学院|工程技术学院|银杏酒店管理学院|广陵学院|海源学院|津桥学院|邮电与信息工程学院|南昌商学院|现代经济管理学院|华信学院|汇华学院|经济管理学院|药护学院|知行学院|潇湘学院|四方学院|至诚学院|希望学院|天府学院|华清学院|高新学院|医疗学院|人文信息学院|城南学院|诚毅学院|海都学院|昆仑旅游学院/.test(s))return false;
  return /(大学|学院|医学院|师范学院|理工学院|工程学院|职业技术大学)$/.test(s);
}
function guessSchoolTier(school,nature){
  const raw=String(school||'').trim().replace(/\s+/g,'');
  const norm=normalizeSchoolTierName(raw);
  const n2=norm.replace(/[（(].*?[）)]/g,'');
  const natureLabel=nature?.label||'';
  const natureCls=nature?.cls||'';
  if(natureCls==='private' || /民办|独立/.test(natureLabel))return {label:'民办/独立',cls:'tier-private',level:'private',score:-30};
  const candidates=[raw,norm,n2,SCHOOL_TIER_ALIAS[raw],SCHOOL_TIER_ALIAS[norm]].filter(Boolean);
  if(candidates.some(x=>SCHOOL_TIER_985.has(x)))return {label:'985/211',cls:'tier-985',level:'985',score:60};
  if(candidates.some(x=>SCHOOL_TIER_211.has(x)))return {label:'211',cls:'tier-211',level:'211',score:45};
  if(/公办/.test(natureLabel))return {label:'双非公办',cls:'tier-public',level:'public',score:20};
  if(looksPublicLikeSchool(raw))return {label:'双非公办倾向',cls:'tier-public-soft',level:'publicSoft',score:8};
  return {label:'层级待核验',cls:'tier-unknown',level:'unknown',score:0};
}
function schoolTierLabel(r){return r?.schoolTier?.label||'层级待核验'}

function hasHighFee(r){const s=(r.major||'')+' '+(r.riskFlags||[]).join(' ');return /中外合作|高收费|合作办学|国际|学术互认|联合培养|中美|中英|中澳|中俄|中法|中德/.test(s)}

function normalizeMajorMainV29475(raw){
  let s=String(raw||'').replace(/\s+/g,'').trim();
  s=s.replace(/[（(][^）)]*(中外合作办学|中外合作|合作办学|国际|ACCA|CIMA|CPA|ISEC|学术互认|联合培养|中美|中英|中澳|中俄|中法|中德|高收费)[^）)]*[）)]/ig,'');
  s=s.replace(/[（(][^）)]*(方向|实验班|试验班|卓越|拔尖|创新班|基地班|师范|非师范)[^）)]*[）)]/ig,'');
  s=s.replace(/（.*?）|\(.*?\)/g,'');
  return s || String(raw||'').replace(/\s+/g,'').trim();
}
function isCoopProgramV29475(r){
  const s=[r.major,r.cleanMajor,r.admissionMajor,r.remark,(r.riskFlags||[]).join(' ')].map(x=>String(x||'')).join(' ');
  return /中外合作|合作办学|学术互认|联合培养|中美|中英|中澳|中俄|中法|中德|国际课程|国际会计|ACCA|CIMA|ISEC/.test(s);
}
function isPrivateProgramV29475(r){
  const txt=[r.schoolNature?.label,r.schoolTier?.level,r.schoolTier?.label,r.schoolNatureLabel].map(x=>String(x||'')).join(' ');
  return /民办|独立|private/.test(txt);
}
function feeTypeLabelV29475(r){
  if(r.isCoopV29475)return '中外合作/高收费';
  if(r.isHighFee)return '高收费';
  if(r.isPrivateV29475)return '民办本科';
  return '普通学费/普通专业';
}
function majorSearchBlobV29475(r){
  return [r.major,r.cleanMajor,r.mainMajorV29475,r.officialMajorName,r.undergradMajorName,r.undergradCategoryName,r.officialCategoryName,r.primaryDisciplineNames,r.subjectGroup,feeTypeLabelV29475(r)].map(x=>String(x||'')).join(' ').replace(/\s+/g,'');
}
function majorMatchesV29475(r,q){
  const kw=String(q||'').replace(/\s+/g,'');
  if(!kw)return true;
  const blob=majorSearchBlobV29475(r);
  if(blob.includes(kw))return true;
  const alt=kw.replace(/学$/,'');
  if(alt && alt.length>=2 && blob.includes(alt))return true;
  return false;
}
function isCoopIntentV29475(){
  const budget=document.getElementById('budget')?.value||'normal';
  const fee=document.getElementById('filterFeeType')?.value||'all';
  return budget==='coop'||fee==='coopCompare'||fee==='coopOnly';
}
function liftValueScoreV29475(r){
  let sc=0;
  if(['985','211'].includes(r.schoolTier?.level))sc+=36;
  if(r.schoolTier?.level==='public'||r.schoolTier?.level==='publicSoft')sc+=16;
  if(r.isCoopV29475||r.isHighFee)sc+=18;
  if(['沈阳','大连','北京','天津','上海','南京','杭州','苏州','广州','深圳','青岛','济南'].includes(r.schoolCity))sc+=12;
  if(r.isPrivateV29475)sc-=8;
  sc+=(r._profile||0)*0.2;
  sc-=Math.min((r._fit||0)/3000,30);
  return sc;
}
function specialPlanStatusV29474(){return window.LN_QUALIFICATION_GATE_V296?.specialPlanStatus?.() || document.getElementById('specialPlanStatus')?.value || 'unreviewed'}
function specialPlanApprovedV29474(){return specialPlanStatusV29474()==='approved'}
function hasCollegeSpecialPlanV29474(r){const s=[r.major,r.cleanMajor,r.admissionMajor,r.planType,r.batch,r.remark,(r.riskFlags||[]).join(' ')].map(x=>String(x||'')).join(' ');return /辽宁省高校专项计划|高校专项计划/.test(s)}
function specialPlanTextV29474(){const v=specialPlanStatusV29474();if(v==='approved')return '已在资格入口中确认高校专项，可纳入比较';if(v==='unknown')return '不确定，暂按默认隐藏处理';return '未确认，默认隐藏'}
function enrich(r){r.schoolProvince=r.schoolProvince||inferProvince(r.school);applySchoolGeoV29471(r);r.schoolNature=r.schoolNatureLabel?{label:r.schoolNatureLabel,cls:r.schoolNatureCls||'unknown',score:r.schoolNatureScore||0}:guessSchoolNature(r.school);r.schoolTier=guessSchoolTier(r.school,r.schoolNature);r.majorText=(r.major||'').replace(/\s/g,'');r.isHighFee=hasHighFee(r);r.isCoopV29475=isCoopProgramV29475(r);r.isPrivateV29475=isPrivateProgramV29475(r);r.mainMajorV29475=normalizeMajorMainV29475(r.cleanMajor||r.major);r.feeTypeLabelV29475=feeTypeLabelV29475(r);r.isCollegeSpecialPlanV29474=hasCollegeSpecialPlanV29474(r);r.qualificationGatesV296=window.LN_QUALIFICATION_GATE_V296?.matchedGates?.(r)||[];attachTaxonomy(r);r.studentProfileHints=studentProfileHintsV29471(r);return r}
/* 访问码逻辑已统一迁移到 app 入口模块，filter-engine 不处理 gate。 */
function bootChips(){const pc=document.getElementById('provinceChips');pc.innerHTML=PROVINCES.map(p=>`<span class="chip" data-province="${p}">${p}</span>`).join('');selectRegionGroup('东北',true);document.querySelectorAll('.chip').forEach(ch=>{ch.addEventListener('click',()=>{if(typeof markTouchedByElementV2954Fix2==='function')markTouchedByElementV2954Fix2(ch);const p=ch.parentElement;if(p.classList.contains('single')){p.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));ch.classList.add('active')}else ch.classList.toggle('active');if(ch.dataset.regionGroup){selectRegionGroup(ch.dataset.regionGroup,ch.classList.contains('active'))}(window.LN_REFRESH_SCHEDULER_V296?window.LN_REFRESH_SCHEDULER_V296.request({reason:'chip-change',level:'soft',delay:200}):autoRefresh())})})}
function selectedProvinces(){return[...document.querySelectorAll('#provinceChips .chip.active')].map(x=>x.dataset.province)}
function setTargetCitiesV29472(value, mode='soft'){const el=document.getElementById('targetCities');if(el)el.value=value||'';const m=document.getElementById('cityMode');if(m)m.value=mode||'soft';}
function selectRegionGroup(g,active=true){const arr=REGION_GROUPS[g]||[];if(g==='全国'){document.querySelectorAll('#provinceChips .chip').forEach(c=>c.classList.toggle('active',active));return}document.querySelectorAll('#provinceChips .chip').forEach(c=>{if(arr.includes(c.dataset.province))c.classList.toggle('active',active)})}
function clearProvinces(){document.querySelectorAll('#provinceChips .chip,#regionGroupChips .chip').forEach(c=>c.classList.remove('active'))}
function setSingle(group,value){const box=document.querySelector(`[data-group="${group}"]`);if(!box)return;box.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active',c.dataset.value===value))}
function getGroup(group){return document.querySelector(`[data-group="${group}"] .chip.active`)?.dataset.value||''}
function selectedRejects(){return[...document.querySelectorAll('#rejectChips .chip.active')].map(x=>x.dataset.reject)}
function resetAll(){location.reload()}
function isMed(m){return/临床|口腔|医学|麻醉|儿科|药学|中医|护理|影像|眼视光|预防|基础医学|精神医学|针灸/.test(m)}
function isTeacher(m){return/师范|教育|小学教育|学前教育|特殊教育/.test(m)}
function isLiberal(m){return/法学|金融|经济|会计|财务|工商|管理|外语|英语|日语|俄语|法语|德语|西班牙|新闻|传播|汉语言|汉语国际|历史|哲学|社会|图书馆|档案|旅游/.test(m)}
function isChem(m){return/化学|化工|材料|环境|制药|药学|生物|食品|轻化|高分子|能源化学/.test(m)}
function isPhys(m){return/物理|力学|机械|车辆|航空|航天|飞行器|船舶|兵器|土木|测绘|建筑环境|能源与动力|过程装备/.test(m)}
function gridPathLevelV2954Fix2(m){m=String(m||''); if(/电气工程及其自动化|智能电网|电力系统|电力/.test(m))return 'core'; if(/能源与动力|新能源|储能|自动化|核工程|能源/.test(m))return 'related'; if(/测控|电子信息|通信|电子科学|信息工程/.test(m))return 'loose'; return ''}
function isGrid(m){return !!gridPathLevelV2954Fix2(m)}
function isComp(m){return/计算机|软件|网络空间|人工智能|数据科学|物联网|信息安全|电子信息/.test(m)}
function isFinance(m){return/金融|经济|投资|保险|资产评估|国际经济与贸易/.test(m)}
function topFinance(s,rank){return/北京大学|清华大学|中国人民大学|复旦|上海交通|中央财经|上海财经|对外经济贸易|南开|厦门|西南财经|中南财经政法/.test(s||'')||(rank&&rank<8000)}
function isDeepTrap(m){return/环境科学|生态学|基础医学|心理学|生物科学|生物技术/.test(m)||/^(化学|应用化学|材料科学与工程|材料类)$/.test(m)}
function mentorRule(r,m){const mode=document.getElementById('mentorMode').value;if(mode==='off')return{delta:0,tags:[],notes:[],breakdown:[],exclude:false};const factor=mode==='mild'?.55:mode==='strict'?1.25:1;const fam=document.getElementById('familyTolerance').value,grad=document.getElementById('gradPlan').value,time=document.getElementById('timePressure').value,priority=document.getElementById('priority').value,rejects=selectedRejects();let delta=0,tags=[],notes=[],breakdown=[],exclude=false;function add(d,tag,note){delta+=d;tags.push(tag);notes.push(note);breakdown.push({delta:d,tag,note})}
 const gridLevelV2954Fix2=gridPathLevelV2954Fix2(m); if(gridLevelV2954Fix2){const gd=gridLevelV2954Fix2==='core'?(priority==='grid'?24:14):gridLevelV2954Fix2==='related'?(priority==='grid'?15:8):(priority==='grid'?6:2); add(gd,gridLevelV2954Fix2==='core'?'电气正主':gridLevelV2954Fix2==='related'?'电气/能源相近':'泛相关需复核',gridLevelV2954Fix2==='core'?'更接近电网电气正主路径':gridLevelV2954Fix2==='related'?'能源、自动化等可作相近路径比较':'不要直接等同电气正主，需复核学院和招聘口径')}; if(isMed(m)){add(getGroup('medicine')==='prefer'?8:3,'医学执照路径','医学有执照保护，但周期长')}; if(isComp(m)){add(8,'技术路径','计算机仍有性价比，但要叠加AI能力')}; if(isTeacher(m)){add(7,'稳定路径','师范/教育可走稳定路径')}; if(gridLevelV2954Fix2==='core'||gridLevelV2954Fix2==='related')add(8,'AI低替代/受益','电力能源和AI基础设施相关') 
 if(/新闻|传播|俄语|日语|法语|德语|西班牙语|翻译/.test(m))add(-16,'AI冲击高','新闻/小语种基础岗位受AI影响'); if(isFinance(m)&&!topFinance(r.school,r.rank2025))add(fam==='low'?-18:-8,'强资源依赖','普通院校财经金融资源依赖高'); if(/工商管理|市场营销|行政管理|旅游管理|酒店管理|电子商务/.test(m))add(-12,'管理本科风险','本科管理类缺少硬技能'); if(isDeepTrap(m))add(-15,'深造依赖','本科就业弹性较弱，往往依赖读研读博'); if(/建筑学|工程造价|风景园林|园林|城乡规划/.test(m))add(-12,'行业周期风险','需复核行业周期')
 if(priority==='publicLow'){if(r.schoolNature.label==='公办倾向')add(25,'公办本科优先','低分段先守住公办本科机会'); if(r.schoolNature.label==='民办/独立倾向')add(-30,'民办/独立倾向降权','当前策略优先保公办本科'); if(['辽宁','吉林','黑龙江'].includes(r.schoolProvince))add(10,'省内/东北优先','兼顾距离和家庭承受'); if(r.isHighFee)add(-40,'高收费强降权','不建议把高收费作为主体'); if(/食品|过程装备|测控|机械|材料成型|无机非金属|化工|工业工程|物流工程|工程管理/.test(m))add(8,'专业可让步方向','可作为保公办本科的复核方向')}
 if(fam==='low'&&r.isHighFee)add(-20,'成本风险','普通家庭不宜默认承担高收费项目'); if(grad==='no'&&isDeepTrap(m))add(-15,'不读研冲突','不想读研时不宜选择深造依赖专业'); if(time==='fast'&&isMed(m))add(-14,'时间压力冲突','医学培养周期较长'); if(rejects.includes('高收费')&&r.isHighFee){exclude=true;tags.push('拒绝项：高收费')}; if(rejects.includes('长学制')&&isMed(m))add(-22,'拒绝项：长学制','已选择不接受长学制/规培'); if(rejects.includes('工地现场')&&/土木|建筑环境|采矿|石油|油气|地质|测绘|过程装备/.test(m))add(-14,'拒绝项：现场环境','可能涉及现场或艰苦环境'); if(rejects.includes('夜班')&&/护理|临床|医学|急诊|麻醉/.test(m))add(-10,'拒绝项：夜班','可能存在夜班值班'); if(rejects.includes('销售')&&/金融|市场营销|保险|国际经济与贸易|电子商务/.test(m))add(-10,'拒绝项：销售','中位数岗位可能含营销属性')
 delta=Math.round(delta*factor); return{delta,tags:[...new Set(tags)].slice(0,6),notes:[...new Set(notes)].slice(0,3),breakdown:breakdown.slice(0,9),exclude}}
function profileScore(r){const m=r.majorText;let score=50,reasons=[],excludes=[];const provinces=selectedProvinces(),regionMode=document.getElementById('regionMode').value;if(regionMode!=='none'&&provinces.length){if(provinces.includes(r.schoolProvince)){score+=14;reasons.push('目标区域匹配')}else if(regionMode==='hard')excludes.push('不在目标区域');else score-=10}; const cityTargets=selectedCitiesV29472(), cityMode=cityModeV29472(); if(cityMode!=='none'&&cityTargets.length){if(cityMatchesV29472(r,cityTargets)){score+=10;reasons.push('目标城市匹配')}else if(cityMode==='hard')excludes.push('不在目标城市');else {score-=6;reasons.push('非目标城市，已降权提醒')}}; if(getGroup('outProvince')==='no'&&r.schoolProvince&&r.schoolProvince!=='辽宁'){score-=18;reasons.push('省外降权')}; if(r.isHighFee&&document.getElementById('budget').value==='normal')excludes.push('高收费/中外合作不符合预算'); if(r.isCollegeSpecialPlanV29474&&specialPlanApprovedV29474()){score+=3;reasons.push('高校专项资格候选')}
 if(isMed(m)){if(getGroup('medicine')==='prefer'){score+=18;reasons.push('医学意向匹配')}else if(getGroup('medicine')==='avoid')excludes.push('不学医')}; if(isTeacher(m)){if(getGroup('teacher')==='prefer'){score+=14;reasons.push('师范意向匹配')}else if(getGroup('teacher')==='avoid')excludes.push('不考虑师范')}; if(isLiberal(m)&&getGroup('liberal')==='avoid'){score-=18;reasons.push('经管法外语降权')}; if(isChem(m)&&getGroup('chem')==='avoid'){score-=22;reasons.push('化学/材料/生物降权')}; if(isPhys(m)&&getGroup('physics')==='prefer'){score+=14;reasons.push('物理/机械倾向匹配')}; const gl=gridPathLevelV2954Fix2(m); if(gl&&getGroup('gridPower')==='prefer'){score+=gl==='core'?22:gl==='related'?14:4;reasons.push(gl==='core'?'电气正主匹配':gl==='related'?'电气/能源相近':'电网泛相关，需复核')}; if((r.keySubjectHints||[]).length){score+=4;reasons.push('有重点学科提醒')}
 const z=mentorRule(r,m);score+=z.delta;reasons.push(...z.tags);if(z.exclude)excludes.push('家长初筛规则排除项');score=Math.max(0,Math.min(100,score));return{score,reasons:[...new Set(reasons)].slice(0,7),excludes:[...new Set(excludes)],mentor:z}}
function resolveRank(){const r=Number(document.getElementById('myRank').value);if(r>0)return r;const s=String(Number(document.getElementById('myScore').value));return RANK2025[s]?Number(RANK2025[s]):null}
function getBandModel(){const m=document.getElementById('model').value;if(m==='safe')return{chong:[.93,.98],match:[.98,1.05],steady:[1.05,1.20],safe:[1.20,1.45]};if(m==='bold')return{chong:[.82,.97],match:[.97,1.06],steady:[1.06,1.18],safe:[1.18,1.35]};return{chong:[.88,.97],match:[.97,1.05],steady:[1.05,1.18],safe:[1.18,1.35]}}
function bandText(p){return currentRank?`${fmt(Math.round(currentRank*p[0]))} — ${fmt(Math.round(currentRank*p[1]))} 位`:'-'}
function classify(rank){if(!currentRank||!rank)return'';const b=getBandModel(),r=currentRank;if(rank<r*b.chong[0])return'超冲';if(rank>=r*b.chong[0]&&rank<=r*b.chong[1])return'可冲';if(rank>r*b.match[0]&&rank<=r*b.match[1])return'匹配';if(rank>r*b.steady[0]&&rank<=r*b.steady[1])return'稳妥';if(rank>r*b.safe[0]&&rank<=r*b.safe[1])return'保底';if(rank>r*b.safe[1])return'过低';return''}

function chunkIdsForRank(rank){
  if(!MANIFEST || !rank)return [];
  const model = document.getElementById('model')?.value || 'normal';
  const multiplier = model==='bold' ? [0.78,1.42] : model==='safe' ? [0.90,1.55] : [0.84,1.45];
  const minR = Math.max(0, Math.floor(rank * multiplier[0]));
  const maxR = Math.ceil(rank * multiplier[1]);
  return (MANIFEST.chunks||[]).filter(c => !(c.maxRank < minR || c.minRank > maxR)).map(c=>c.id);
}
async function loadChunkById(id){
  if(CHUNK_CACHE.has(id))return CHUNK_CACHE.get(id);
  const chunk = (MANIFEST.chunks||[]).find(c=>c.id===id);
  if(!chunk)return [];
  const obj = await loadJsonFile(chunk.file, '分块数据 '+id);
  const rows = (obj.records||[]).map(enrich);
  CHUNK_CACHE.set(id, rows);
  loadedChunkIds.add(id);
  return rows;
}
async function ensureDataForCurrentRank(){
  if(!MANIFEST)return;
  const rank = resolveRank();
  if(!rank){
    DATA=[]; filtered=[];
    setMetaStatusInFilterV297Fix2(`已就绪｜总数据 ${fmt(MANIFEST.totalRecords)} 条｜本科目录与招生名已复核｜输入位次后加载对应分段`,'ready');
    return;
  }
  const ids = chunkIdsForRank(rank);
  setMetaStatusInFilterV297Fix2(`正在加载位次相关分段：${ids.join('、') || '无'}`,'loading');
  const parts = await Promise.all(ids.map(loadChunkById));
  const byId = new Map();
  parts.flat().forEach(r=>byId.set(r.id,r));
  DATA=[...byId.values()];
  setMetaStatusInFilterV297Fix2(`已加载 ${fmt(DATA.length)} 条相关数据｜全量 ${fmt(MANIFEST.totalRecords)} 条｜分块 ${ids.length} 个`,'ready');
}
async function autoRefreshAsync(){
  window.LN_PERF_MONITOR_V296?.mark?.('autoRefreshAsync:start');
  window.LN_STATE_SNAPSHOT_V296?.reset?.();
  window.LN_CANDIDATE_CACHE_V296?.reset?.();
  currentRank=resolveRank();
  if(currentRank){
    const b=getBandModel();
    document.getElementById('rankSummary').textContent=`当前参考位次：${fmt(currentRank)}。系统已按位次段加载数据。位次数值越小，要求越高。`;
    document.getElementById('bandChong').textContent=bandText(b.chong);
    document.getElementById('bandMatch').textContent=bandText(b.match);
    document.getElementById('bandSteady').textContent=bandText(b.steady);
    document.getElementById('bandSafe').textContent=bandText(b.safe);
  }else{
    const rs=document.getElementById('rankSummary');
    if(rs)rs.textContent='请输入位次或分数，系统会按位次段加载相关数据。';
  }
  await ensureDataForCurrentRank();
  window.LN_PERF_MONITOR_V296?.mark?.('data-ready');
  if(typeof renderStrategyCardsV2951==='function')renderStrategyCardsV2951();
  if(window.LN_CHILD_INTEREST_UI_V296?.renderSummary) window.LN_CHILD_INTEREST_UI_V296.renderSummary();
  else if(window.LN_CHILD_INTEREST_RUNTIME_V296?.render) window.LN_CHILD_INTEREST_RUNTIME_V296.render();
  window.LN_PERF_MONITOR_V296?.mark?.('control-rendered');
  applyFilters();
  window.LN_PERF_MONITOR_V296?.mark?.('filters-applied');
}


function confidence(r){
  if(r.status==='both' && r.rank2025 && r.rank2024 && !r.isHighFee)return {label:'高可信', cls:'high'};
  if(r.status==='both')return {label:'需复核', cls:'mid'};
  return {label:'谨慎看', cls:'low'};
}
function levelPill(level){
  return `<span class="level-pill ${level||''}">${level||'检索'}</span>`;
}
function renderRule(r){
  const lines=(r._mentor?.breakdown||r._zxf?.breakdown||[]).filter(x=>x.delta!==0);
  if(!lines.length)return '';
  return `<details class="rule-breakdown">
    <summary><span>家长初筛规则明细</span></summary>
    <div class="rule-lines">${lines.map(x=>`<div class="rule-line ${x.delta>=0?'plus':'minus'}">
      <div class="sign">${x.delta>=0?'+':''}${x.delta}</div>
      <div><div class="tagtxt">${x.tag||'规则调整'}</div><div class="why">${x.note||''}</div></div>
    </div>`).join('')}</div>
  </details>`;
}
function judge(r){
  const parts=[];
  if(r._level==='匹配')parts.push('与当前位次接近，适合作为主体候选。');
  else if(r._level==='稳妥')parts.push('录取把握更高，适合中后段兜住。');
  else if(r._level==='保底')parts.push('偏保底，用来兜住底线，但仍需看专业质量。');
  else if(r._level==='可冲')parts.push('可作为前段冲击对象，但不要只依赖这一类选择。');
  else if(r._level==='超冲')parts.push('明显偏冲，只适合少量观察。');
  else if(r._level==='过低')parts.push('位次放宽较多，不建议只因稳而选择。');
  if((r._reasons||[]).length)parts.push('匹配点：'+r._reasons.slice(0,3).join('；')+'。');
  if(r.rankChangeLabel)parts.push(r.rankChangeLabel+'，需结合计划变化复核。');
  return parts.join('');
}

function updateSpecialPlanNoticeV29474(){
  const el=document.getElementById('specialPlanNoticeV29474');
  if(!el)return;
  const hidden=(exclusionStats&&exclusionStats['高校专项隐藏'])||0;
  const status=specialPlanStatusV29474();
  if(!currentRank){el.innerHTML='';el.className='special-plan-notice-v29474 hide';return;}
  if(status==='approved'){
    const shown=(filtered||[]).filter(r=>r.isCollegeSpecialPlanV29474).length;
    el.className='special-plan-notice-v29474 approved';
    el.innerHTML=`<b>高校专项资格：已在资格入口中确认。</b> 已显示高校专项计划候选 ${fmt(shown)} 条。正式填报前仍需复核资格审核结果、公示名单和当年招生计划。`;
  }else{
    el.className='special-plan-notice-v29474 protected';
    const statusText=status==='unknown'?'当前选择“不确定”，系统暂按未审核处理。':'当前默认“未通过 / 未审核”。';
    el.innerHTML=`<b>资格入口中的高校专项默认保护：</b>${statusText} 已隐藏高校专项计划候选 ${fmt(hidden)} 条；这些不是普通考生“分够就能报”的入口。`;
  }
}
function updateQualificationGateNoticeV296(){
  const el=document.getElementById('qualificationGateNoticeV296');
  if(!el)return;
  const hidden=(exclusionStats&&exclusionStats['资格入口隐藏'])||0;
  if(!currentRank || !hidden){el.innerHTML='';el.className='special-plan-notice-v29474 hide';return;}
  el.className='special-plan-notice-v29474 protected';
  el.innerHTML=window.LN_QUALIFICATION_GATE_UI_V296?.noticeHtml?.(hidden) || `<b>资格型入口保护：</b>已隐藏 ${fmt(hidden)} 条需资格入口。`;
}

function updateCounts(){
  const c={'可冲':0,'匹配':0,'稳妥':0,'保底':0,'超冲':0,'过低':0};
  (filtered||[]).forEach(r=>{ if(c[r._level]!==undefined)c[r._level]++; });
  const set=(id,val)=>{const el=document.getElementById(id); if(el)el.textContent=fmt(val);};
  set('cntAll',(filtered||[]).length);
  set('cntChong',c['可冲']);
  set('cntMatch',c['匹配']);
  set('cntSteady',c['稳妥']);
  set('cntSafe',c['保底']);
  const ex=exclusionStats||{'区域排除':0,'预算排除':0,'画像排除':0,'低匹配排除':0};
  set('exRegion',ex['区域排除']||0);
  set('exBudget',ex['预算排除']||0);
  set('exProfile',ex['画像排除']||0);
  set('exLowScore',ex['低匹配排除']||0);
  set('exSpecial',(ex['资格入口隐藏']||ex['高校专项隐藏']||0));
  updateSpecialPlanNoticeV29474();
  updateQualificationGateNoticeV296();
  const fs=document.getElementById('filterSummary');
  if(fs){
    if(!currentRank) fs.textContent='已加载轻量索引。请输入分数或位次后，再加载对应位次段数据。';
    else fs.textContent=`当前结果：${fmt((filtered||[]).length)} 条。已按位次段加载相关数据；结果太多就收窄区域/偏好，太少就放宽条件。`;
  }
  updateNarrowGuide();
  renderDebugPanel();
}
function updateLive(){
  const set=(id,val)=>{const el=document.getElementById(id); if(el)el.textContent=fmt(val);};
  set('liveRank',currentRank||'-');
  set('liveTotal',(filtered||[]).length);
  set('liveMain',(filtered||[]).filter(r=>['匹配','稳妥'].includes(r._level)).length);
  set('liveSafe',(filtered||[]).filter(r=>r._level==='保底').length);
  set('cntSY',(filtered||[]).filter(r=>r.schoolProvince==='辽宁' && r.schoolCity==='沈阳').length);
  set('cntDL',(filtered||[]).filter(r=>r.schoolProvince==='辽宁' && r.schoolCity==='大连').length);
  set('cntLNOther',(filtered||[]).filter(r=>r.schoolProvince==='辽宁' && !['沈阳','大连'].includes(r.schoolCity)).length);
  set('cntOut',(filtered||[]).filter(r=>r.schoolProvince && r.schoolProvince!=='辽宁').length);
  const note=document.getElementById('lowPublicNote');
  if(note)note.classList.toggle('hide',currentStrategy!=='publicLow');
  const st=document.getElementById('liveStatus'),ad=document.getElementById('liveAdvice');
  if(!st||!ad)return;
  if(!currentRank){
    st.textContent='等待位次'; st.className='realtime-status warn';
    ad.textContent='请输入2025位次，或输入可换算的一分一段分数。';
  }else if((filtered||[]).length<20){
    st.textContent='结果偏少'; st.className='realtime-status danger';
    ad.textContent='当前结果偏少，建议放宽区域、关闭严格画像缩水，或减少拒绝项。';
  }else if((filtered||[]).length>300){
    st.textContent='结果偏多'; st.className='realtime-status warn';
    ad.textContent='当前结果偏多，建议继续限定区域、策略或明确不接受项。';
  }else{
    st.textContent='范围适中'; st.className='realtime-status';
    ad.textContent='结果数量适中。建议先看A/B/C三方案，再看匹配和稳妥候选。';
  }
}

function applyFilters(){
  const qS=document.getElementById('qSchool')?.value.trim()||'',
        qM=document.getElementById('qMajor')?.value.trim()||'',
        fLevel=document.getElementById('filterLevel')?.value||'',
        onlyKey=document.getElementById('onlyKey')?.checked,
        strict=document.getElementById('strictProfile')?.checked,
        sortBy=document.getElementById('sortBy')?.value||'profile',
        fSubject=document.getElementById('filterSubjectGroup')?.value||'',
        fPrimary=document.getElementById('filterPrimary')?.value.trim()||'',
        fTaxConfidence=document.getElementById('filterTaxConfidence')?.value||'',
        fSchoolTier=document.getElementById('filterSchoolTier')?.value||'',
        fFeeType=document.getElementById('filterFeeType')?.value||'all',
        fConfusableGroup=document.getElementById('filterConfusableGroup')?.value||'',
        onlyConfusable=document.getElementById('onlyConfusable')?.checked,
        fCityQuick=selectedCitiesV29472(),
        fCityMode=cityModeV29472();

  const exStats={'区域排除':0,'预算排除':0,'画像排除':0,'低匹配排除':0,'高校专项隐藏':0,'资格入口隐藏':0};

  let arr=DATA.map(r=>{
    const level=classify(r.rank2025), p=profileScore(r);
    const obj={...r,_level:level,_fit:currentRank&&r.rank2025?Math.abs(r.rank2025-currentRank):999999999,_profile:p.score,_reasons:p.reasons,_excludes:p.excludes,_mentor:p.mentor};
    obj._confidence=confidence(obj);
    return obj;
  });

  const snapshotV296=(window.LN_STATE_SNAPSHOT_V296?.snapshot?.(true))||{};
  const specialStatusV29474=specialPlanStatusV29474();
  arr=arr.filter(r=>{
    const gateCheck=window.LN_QUALIFICATION_GATE_V296?.check?.(r,snapshotV296);
    if(gateCheck && gateCheck.blocked){
      exStats['资格入口隐藏']=(exStats['资格入口隐藏']||0)+1;
      if(gateCheck.gateId==='eduSpecialPlan'||gateCheck.gateId==='lnRuralSpecial') exStats['高校专项隐藏']=(exStats['高校专项隐藏']||0)+1;
      if(gateCheck.statKey) exStats[gateCheck.statKey]=(exStats[gateCheck.statKey]||0)+1;
      r._qualificationGate=gateCheck;
      return false;
    }
    if(gateCheck && gateCheck.matched) r._qualificationGate=gateCheck;
    else if(r.isCollegeSpecialPlanV29474 && specialStatusV29474!=='approved'){exStats['高校专项隐藏']=(exStats['高校专项隐藏']||0)+1;exStats['资格入口隐藏']=(exStats['资格入口隐藏']||0)+1;return false;}
    if(qS&&!(r.school||'').includes(qS))return false;
    if(qM&&!majorMatchesV29475(r,qM))return false;
    if(fSubject&&r.subjectGroup!==fSubject)return false;
    if(fPrimary&&!((r.primaryDisciplineNames||'').includes(fPrimary)||(r.primaryDisciplineCodes||'').includes(fPrimary)||(r.cleanMajor||'').includes(fPrimary)||(r.undergradCategoryName||'').includes(fPrimary)||(r.officialCategoryCode||'').includes(fPrimary)||(r.officialMajorCode||'').includes(fPrimary)||(r.officialDisciplineCode||'').includes(fPrimary)||(r.officialMajorName||'').includes(fPrimary)))return false;
    const taxRank={high:3,medium:2,low:1,unknown:0};
    if(fTaxConfidence==='high'&&r.taxonomyConfidence!=='high')return false;
    if(fTaxConfidence==='medium'&&(taxRank[r.taxonomyConfidence]||0)<2)return false;
    if(fTaxConfidence==='review'&&!['low','unknown'].includes(r.taxonomyConfidence))return false;
    if(fSchoolTier==='985'&&r.schoolTier?.level!=='985')return false;
    if(fSchoolTier==='211'&&r.schoolTier?.level!=='211')return false;
    if(fSchoolTier==='public'&&!['public','publicSoft'].includes(r.schoolTier?.level))return false;
    if(fSchoolTier==='private'&&r.schoolTier?.level!=='private')return false;
    if(fSchoolTier==='unknown'&&r.schoolTier?.level!=='unknown')return false;
    if(fFeeType==='normal'&&(r.isHighFee||r.isCoopV29475||r.isPrivateV29475)){exStats['预算排除']=(exStats['预算排除']||0)+1;return false;}
    if(fFeeType==='coopOnly'&&!(r.isCoopV29475||r.isHighFee)){exStats['预算排除']=(exStats['预算排除']||0)+1;return false;}
    if(fFeeType==='excludeHighPrivate'&&(r.isHighFee||r.isCoopV29475||r.isPrivateV29475)){exStats['预算排除']=(exStats['预算排除']||0)+1;return false;}
    if(onlyConfusable && !hasConfusableMajorV2946(r))return false;
    if(fConfusableGroup && !hasConfusableGroupV2946(r,fConfusableGroup))return false;
    if(window.LN_CHILD_INTEREST_RUNTIME_V296 && !window.LN_CHILD_INTEREST_RUNTIME_V296.filterPass(r))return false;
    if(fLevel&&r._level!==fLevel)return false;
    if(fCityMode==='hard' && fCityQuick.length && !cityMatchesV29472(r,fCityQuick)){exStats['区域排除']=(exStats['区域排除']||0)+1;return false;}
    if(onlyKey&&!(r.keySubjectHints||[]).length)return false;
    if(strict&&r._excludes.length){
      const b=typeof exclusionBucket==='function'?exclusionBucket(r._excludes):'画像排除';
      exStats[b]=(exStats[b]||0)+1;
      return false;
    }
    if(strict&&r._profile<32){
      exStats['低匹配排除']=(exStats['低匹配排除']||0)+1;
      return false;
    }
    return true;
  });

  exclusionStats=exStats;

  arr.sort((a,b)=>sortBy==='rank2025'
    ? (a.rank2025||999999999)-(b.rank2025||999999999)
    : sortBy==='rankDiffHot'
      ? (a.rankDiff??999999999)-(b.rankDiff??999999999)
      : sortBy==='rankDiffLoose'
        ? (b.rankDiff??-999999999)-(a.rankDiff??-999999999)
        : sortBy==='fit'
          ? a._fit-b._fit
          : sortBy==='lift'
            ? liftValueScoreV29475(b)-liftValueScoreV29475(a)
            : (b._profile-a._profile)||(a._fit-b._fit));

  filtered=arr;
  currentPage=1;
  updateCounts();
  renderPlanABC();
  renderCards();
  updateLive();
  if(typeof updateGuideState==='function')updateGuideState();
}

window.LN_FILTER_ENGINE = {
  enrich, profileScore, applyFilters, autoRefreshAsync,
  getBandModel, classify, resolveRank,
  isCoopProgramV29475, isPrivateProgramV29475, feeTypeLabelV29475,
  specialPlanStatusV29474, specialPlanApprovedV29474, hasCollegeSpecialPlanV29474, updateQualificationGateNoticeV296,
  majorMatchesV29475, normalizeMajorMainV29475
};
