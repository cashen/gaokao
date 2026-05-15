// V2.9.8 child intent translator: structured buttons, not a career test.
(function(){
  const STORAGE_KEY='ln_child_intent_state_v2975';
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  const intents=[
    {id:'want_medical',short:'医药健康',label:'我想学医药健康',concernTags:['医疗健康','路径分叉'],message:'孩子关注医疗健康方向，但临床、口腔、药学、医学技术、护理不是一条路。',possibleDirections:['临床医学','口腔医学','药学','医学技术','护理学','公共卫生'],misreadWarnings:['药学不等同于临床医生。','医学技术不等同于临床医学。'],reviewQuestions:['孩子是想做临床诊疗，还是想进入医疗健康行业？','家庭是否接受较长学习周期？']},
    {id:'pharmacy',short:'药学制药',label:'我对药学 / 制药感兴趣',concernTags:['药学制药','读研提升'],message:'药学和制药方向要分清药学、临床药学、制药工程、生物制药，药学不是临床医生方向。',possibleDirections:['药学','临床药学','药物制剂','制药工程','生物制药'],misreadWarnings:['药学不是临床医生方向。'],reviewQuestions:['是否接受读研提升？','是否了解药企、医院药学、制药工程的差异？']},
    {id:'animal_life',short:'动物生命',label:'我喜欢动物 / 生命科学',concernTags:['动物生命','实践环境'],message:'喜欢动物不等于一定适合动物医学，建议复核实践环境、城市资源和职业接受度。',possibleDirections:['动物医学','动物药学','动植物检疫','生物科学','生物工程','食品科学'],misreadWarnings:['动物医学和动物科学不是一回事。','生物科学、生物工程、生物技术不是一回事。'],reviewQuestions:['孩子是否接受动物接触、实验和实践环境？','是喜欢宠物，还是能接受医疗和临床场景？']},
    {id:'teacher_exam',short:'教师考编',label:'我想以后当老师 / 考编',concernTags:['考编路径','师范属性'],message:'想当老师要确认是否师范类、公费、定向或有履约要求；考编要看岗位表。',possibleDirections:['汉语言文学','数学与应用数学','生物科学','思想政治教育','教育技术学','法学','计算机'],misreadWarnings:['汉语言文学不等于一定是师范。'],reviewQuestions:['目标地区教师招聘是否认可该专业？','是否接受公费或定向履约？']},
    {id:'law_expression',short:'法学表达',label:'我想学法学 / 表达 / 文字',concernTags:['表达写作','法考公考'],message:'法学、汉语言、新闻传播、知识产权都和表达有关，但后续路径差异很大。',possibleDirections:['法学','知识产权','汉语言文学','新闻传播','公共管理'],misreadWarnings:['法学不等于天然稳定。','汉语言文学不等于一定师范。'],reviewQuestions:['孩子是喜欢表达写作，还是想走法考、公务员、教师路径？']},
    {id:'computer_ai',short:'计算机AI',label:'我想做计算机 / AI / 数据',concernTags:['数字技术','持续学习'],message:'计算机、电子信息、自动化、数据管理不是一条路，要看课程结构和培养方向。',possibleDirections:['计算机科学与技术','软件工程','人工智能','数据科学','信息安全'],misreadWarnings:['大数据管理与应用不等于数据科学与大数据技术。'],reviewQuestions:['是否接受编程、数学和持续学习？']},
    {id:'electric_energy',short:'电气能源',label:'我想做电气 / 能源 / 自动化',concernTags:['电气能源','国企路径'],message:'电气、能源、自动化有交叉，但不是同一条路；电气正主和泛相关方向要分清。',possibleDirections:['电气工程及其自动化','智能电网信息工程','能源与动力工程','新能源科学与工程','自动化'],misreadWarnings:['自动化、测控、电子信息不能直接等同电气正主。'],reviewQuestions:['是否关注电网能源口径？','是否了解学校行业背景？']},
    {id:'electronic_chip',short:'电子通信',label:'我想做电子信息 / 通信 / 芯片',concernTags:['电子通信','芯片光电'],message:'电子信息、通信、计算机、电气不是一条路，课程和就业口径要分清。',possibleDirections:['电子信息工程','通信工程','微电子科学与工程','集成电路','光电信息'],misreadWarnings:['电子信息不等于计算机。'],reviewQuestions:['更偏硬件、通信、芯片、光电，还是软件信息？']},
    {id:'mechanical_instrument',short:'机械仪器',label:'我想做机械 / 智能制造 / 仪器',concernTags:['工程制造','仪器测控'],message:'仪器、自动化、机械、电子信息有交叉，但学习内容和就业方向不同。',possibleDirections:['机械设计制造及其自动化','机械电子工程','智能制造工程','测控技术与仪器','精密仪器'],misreadWarnings:['测控技术与仪器不等于电气工程。'],reviewQuestions:['是否接受工程课程、实验实践和制造场景？']},
    {id:'stable',short:'稳定路径',label:'我想稳定一点',concernTags:['路径清楚','家庭安全感'],message:'稳定不是专业名称决定的，要看考试、证书、地区岗位、学校平台和家庭承受周期。',possibleDirections:['路径清楚型','考证考编型','家庭底线优先'],misreadWarnings:['稳定专业这种说法容易误导。'],reviewQuestions:['稳定是指考编、考证、本科就业、离家近，还是收入波动小？']},
    {id:'city_development',short:'城市发展',label:'我想去大城市发展',concernTags:['城市资源','机会代价'],message:'城市会带来资源，也可能换来学校层级、专业热度或学费成本的代价。',possibleDirections:['城市发展型','实习资源','产业城市'],misreadWarnings:['城市名好听不等于专业资源一定匹配。'],reviewQuestions:['是否接受为城市牺牲学校层级或增加成本？']},
    {id:'unclear',short:'暂不确定',label:'我还不确定',concernTags:['综合推荐','路径复核'],message:'暂不确定很正常，建议先按家庭底线和路径清楚度筛一轮，再让孩子表达排斥和偏好。',possibleDirections:['综合推荐','路径清楚型'],misreadWarnings:['不宜急着锁死专业。'],reviewQuestions:['孩子明确不接受什么？','家庭不能承受什么？']}
  ];
  function defaultState(){return {selectedIntentIds:[],updatedAt:'',schemaVersion:2};}
  function readState(){try{const raw=localStorage.getItem(STORAGE_KEY); const s=raw?JSON.parse(raw):{}; return Object.assign(defaultState(),s||{},{selectedIntentIds:Array.isArray(s.selectedIntentIds)?s.selectedIntentIds:[]});}catch(e){return defaultState();}}
  function saveState(s){const next=Object.assign(defaultState(),s||{}); next.selectedIntentIds=[...new Set((next.selectedIntentIds||[]).filter(id=>intents.some(x=>x.id===id)))].slice(0,3); next.updatedAt=new Date().toISOString(); try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch(e){} window.LN_STATE_SNAPSHOT_V296?.reset?.(); window.LN_CANDIDATE_CACHE_V296?.reset?.(); return next;}
  function byId(id){return intents.find(x=>x.id===id)||null;}
  function selected(){const s=readState(); return s.selectedIntentIds.map(byId).filter(Boolean);}
  function toggle(id){const s=readState(); const set=new Set(s.selectedIntentIds); if(set.has(id))set.delete(id); else{if(set.size>=3)return {ok:false,reason:'max'}; set.add(id);} s.selectedIntentIds=[...set]; saveState(s); return {ok:true,state:s};}
  function clear(){return saveState(defaultState());}
  function summary(){const list=selected(); if(!list.length)return {title:'孩子想法未整理',text:'可选填，系统会按家庭底线和综合规则先看。',names:[]}; return {title:'已整理：'+list.map(x=>x.short).join('、'),text:'这些想法会自动带入专业方向，但只做软加权，不会排除其他专业。',names:list.map(x=>x.label)};}
  function translate(){const list=selected(); return {intents:list,concernTags:[...new Set(list.flatMap(x=>x.concernTags||[]))],possibleDirections:[...new Set(list.flatMap(x=>x.possibleDirections||[]))],misreadWarnings:[...new Set(list.flatMap(x=>x.misreadWarnings||[]))],reviewQuestions:[...new Set(list.flatMap(x=>x.reviewQuestions||[]))],messages:list.map(x=>x.message),hardExclude:false};}
  function candidateIntentMessages(r){const im=window.LN_CHILD_INTEREST_RUNTIME_V296?.matchRecord?.(r); if(im?.active&&im.level&&im.level!=='none'&&im.level!=='no')return [im.reason||`孩子关注：${im.intentShort||im.group?.short||'兴趣方向'}｜${im.label}`]; return [];}
  const api={intents,esc,readState,saveState,byId,selected,toggle,clear,summary,translate,candidateIntentMessages,ready:true};
  window.LN_CHILD_INTENT_TRANSLATOR_V2976=api; window.LN_CHILD_INTENT_TRANSLATOR_V2975=api;
  window.LN_CHILD_INTENT_TRANSLATOR_V298=api;
})();
