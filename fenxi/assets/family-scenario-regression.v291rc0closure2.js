// V2.91RC0.rules-closure2｜家庭场景回归清单
(function(){
  var VERSION='v291rc0closure2-regression';
  var CASES=[
    {id:'female_540_employment_site_reject',rank:56548,gender:'female',scenario:'employment',priority:'employment',rejects:['工地现场'],interests:[],expect:'A/B/C 不应被电气能源机械自动化霸屏'},
    {id:'female_540_exam_site_reject',rank:56548,gender:'female',scenario:'exam',priority:'exam',rejects:['工地现场'],interests:[],expect:'B 方案应偏考公/财会/师范/计算机'},
    {id:'female_540_exam_grid_residue',rank:56548,gender:'female',scenario:'exam',priority:'grid',rejects:['工地现场'],interests:[],expect:'识别 priority 残留并防止电网吞掉考公'},
    {id:'female_540_grid_site_reject',rank:56548,gender:'female',scenario:'grid',priority:'grid',rejects:['工地现场'],interests:[],expect:'强冲突提示：电网 vs 不接受现场'},
    {id:'male_540_grid_electric_accept',rank:56548,gender:'male',scenario:'grid',priority:'grid',rejects:[],field:'accept',interests:['electric_energy'],expect:'电气/能源正主或相近方向可上升'},
    {id:'female_500_public_low_sensitive_site',rank:95000,gender:'female',scenario:'publicLow',priority:'lowPublic',rejects:['工地现场'],load:'sensitive',expect:'不能只为公办牺牲可读性'},
    {id:'female_600_medical_reject_long',rank:20541,gender:'female',scenario:'medical',priority:'medical',rejects:['长学制'],interests:['medical_health'],expect:'临床/口腔等长周期需降权或强提醒'},
    {id:'female_600_medical_reject_night',rank:20541,gender:'female',scenario:'medical',priority:'medical',rejects:['夜班'],interests:['medical_health'],expect:'护理/临床夜班风险必须提示'},
    {id:'budget_flex_coop',rank:20541,gender:'unspecified',scenario:'budgetFlexible',priority:'city',budget:'flex',expect:'中外/民办只能作为机会对照并提示成本'},
    {id:'platform_computer_interest',rank:6708,gender:'unspecified',scenario:'platformStable',priority:'school',interests:['computer_info'],expect:'允许路径集中但要提示计算机路径集中'},
    {id:'broad_observe',rank:56548,gender:'unspecified',scenario:'broad',priority:'employment',expect:'先不设限必须显示观察模式'},
    {id:'male_expression_exam',rank:95000,gender:'male',scenario:'exam',priority:'exam',learning:'expression',expect:'男孩偏表达考公不应默认工科'},
    {id:'female_computer_sensitive',rank:56548,gender:'female',scenario:'employment',priority:'employment',load:'sensitive',interests:['computer_info'],expect:'区分强代码和数字化应用'},
    {id:'low_score_law_chinese',rank:95000,gender:'unspecified',scenario:'exam',priority:'exam',expect:'低分法学/汉语言需长期备考和就业复核'},
    {id:'basic_science_not_teacher',rank:56548,gender:'unspecified',scenario:'exam',priority:'exam',expect:'应用物理/应用化学/生物科学非师范不得自动归师范'}
  ];
  window.LN_FAMILY_SCENARIO_REGRESSION_V291={ready:true,version:VERSION,cases:CASES};
})();
