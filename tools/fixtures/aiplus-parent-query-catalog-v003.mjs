export const AIPLUS_PARENT_QUERY_CATALOG_V003=Object.freeze([
  {id:'multi-goal-major-choice',text:'孩子568分，普通家庭，不太想考研，想以后工作稳一点，最好能进央国企。学校牌子不用特别高，但专业别太虚，电气、自动化、机械哪个更合适？',schools:[],majors:['电气工程及其自动化','自动化','机械'],task:'decision_research',careers:['central_soe','state_owned'],needs:['admissions','background','employment','postgraduate']},
  {id:'pair-choice',text:'沈工大电气和大连交通自动化怎么选，考虑就业和考研',schools:['沈阳工业大学','大连交通大学'],aliases:['沈工大','大连交通'],majors:['电气工程及其自动化','自动化'],task:'decision_research',needs:['employment','postgraduate']},
  {id:'pair-choice-short',text:'沈工大电气和大连交通自动化到底选哪个',schools:['沈阳工业大学','大连交通大学'],aliases:['沈工大','大连交通'],majors:['电气工程及其自动化','自动化'],task:'decision_research'},
  {id:'school-compare-legacy',text:'沈工大和沈航哪个好',schools:['沈阳工业大学','沈阳航空航天大学'],aliases:['沈工大','沈航'],majors:[],task:'school_comparison'},
  {id:'candidate-legacy',text:'560分电气省内能报什么',schools:[],majors:['电气工程及其自动化'],taskOneOf:['candidate_discovery','candidate_refinement']},
  {id:'school-major-history-legacy',text:'大连交通自动化多少分',schools:['大连交通大学'],aliases:['大连交通'],majors:['自动化'],task:'school_major_history'},
  {id:'school-experience-legacy',text:'沈航宿舍怎么样',schools:['沈阳航空航天大学'],aliases:['沈航'],majors:[],task:'school_experience'},
  {id:'soft-region',text:'最好在辽宁，电气和自动化怎么选，更看重就业',schools:[],majors:['电气工程及其自动化','自动化'],task:'decision_research',softSignal:['region','liaoning_preferred']},
  {id:'hard-region',text:'绝不出省，电气和自动化怎么选，就业优先',schools:[],majors:['电气工程及其自动化','自动化'],task:'decision_research',hardSignal:['region','liaoning_only']},
  {id:'cost-study',text:'普通家庭，预算有限，不想考研，机械和电气怎么选',schools:[],majors:['机械','电气工程及其自动化'],task:'decision_research',needs:['cost','postgraduate']},
  {id:'curriculum-employment',text:'沈工大电气和沈航自动化怎么选，我想看实际学什么和本科就业',schools:['沈阳工业大学','沈阳航空航天大学'],aliases:['沈工大','沈航'],majors:['电气工程及其自动化','自动化'],task:'decision_research',needs:['curriculum','employment']},
  {id:'public-service',text:'法学和汉语言怎么选，我主要考虑以后考公和稳定',schools:[],majors:['法学','汉语言文学'],task:'decision_research',careers:['public_service']}
]);
