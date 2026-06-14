// v3.9.5.7 升学与推免参考数据（第一轮）
// 维护原则：只做“参考”和“核验提示”，不作为录取判断、硬排序或专业级保研率结论。
// sourceLevel:
//   A = 官方推免分子 + 官方分母，可较严谨估算
//   B = 官方推免人数/名单线索，分母待补
//   C = 第三方汇总或口径待复核，只能做弱参考
//   D = 只有接收推免/政策/招生章程等，不能计算本校保研率

export const PUSH_RATE_REFERENCE_VERSION = 'v2025-first-pass-20260601';

export const PUSH_RATE_REFERENCE = [
  {
    schoolName: '大连海事大学', province: '辽宁', tags: ['211', '双一流', '交通航运'], sourceLevel: 'A-',
    recommendQuota: 617, recommendQuotaText: '617名普通推免 + 1名国防科工补偿计划；第三方合计口径约641',
    graduateCount: 4331, schoolPushRateText: '约14%+', pushOpportunityLevel: 'medium-high', confidence: 'medium-high',
    sourceUrls: ['https://jwc.dlmu.edu.cn/info/1077/5343.htm'],
    notes: ['官方推免资格分子较明确，本科毕业生分母来自公开教学质量报告线索；专项口径仍需复核。'],
    majorLevelStatus: 'need_manual_check'
  },
  {
    schoolName: '辽宁师范大学', province: '辽宁', tags: ['师范'], sourceLevel: 'B+',
    recommendQuota: 284, recommendQuotaText: '2025届284名获得推免资格', schoolPushRateText: '推免人数284，校级率待补分母', pushOpportunityLevel: 'medium', confidence: 'medium-high',
    sourceUrls: ['https://news.lnnu.edu.cn/info/1163/7567.htm'],
    notes: ['官方分子明确，需补本科毕业生分母；师范类还需核验具体学院/专业名额。'], majorLevelStatus: 'need_manual_check'
  },
  {
    schoolName: '东北农业大学', province: '黑龙江', tags: ['211', '双一流', '农林'], sourceLevel: 'B+',
    recommendQuota: 757, recommendQuotaText: '2025届757名获得推免资格', schoolPushRateText: '约12%上下（分母需复核）', pushOpportunityLevel: 'medium-high', confidence: 'medium',
    sourceUrls: ['https://graduate.neau.edu.cn/info/1146/3974.htm'],
    notes: ['官方分子明确；经管/电信/工程等学院名额有线索，但学院分母待补。'],
    collegeSignals: [{ name: '经管学院', quotaText: '约106名，待复核' }, { name: '电信学院', quotaText: '约65名，待复核' }, { name: '工程学院', quotaText: '约62名，待复核' }],
    majorLevelStatus: 'need_manual_check'
  },
  {
    schoolName: '东北石油大学', province: '黑龙江', tags: ['石油行业'], sourceLevel: 'B+',
    recommendQuota: 212, recommendQuotaText: '教育部下达推免名额212人，含专项4人', schoolPushRateText: '推免人数212，校级率待补分母', pushOpportunityLevel: 'medium', confidence: 'medium-high',
    sourceUrls: ['https://jwc.nepu.edu.cn/info/1164/9242.htm'],
    notes: ['行业院校属性明显；需补毕业生分母和学院名额分配表。'], majorLevelStatus: 'need_manual_check'
  },
  { schoolName: '辽宁大学', province: '辽宁', tags: ['211', '双一流'], sourceLevel: 'B', schoolPushRateText: '官方名单/附件待统计', pushOpportunityLevel: 'medium-high', confidence: 'medium', notes: ['有官方推免资格名单线索，需统计人数并补毕业生分母。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '辽宁工程技术大学', province: '辽宁', tags: ['工科'], sourceLevel: 'B', schoolPushRateText: '官方名单/PDF待统计', pushOpportunityLevel: 'medium', confidence: 'medium', notes: ['可按学院字段统计；需补毕业生分母。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '沈阳农业大学', province: '辽宁', tags: ['农林'], sourceLevel: 'B', schoolPushRateText: '官方名单入口待统计', pushOpportunityLevel: 'medium', confidence: 'medium', notes: ['需解析名单并补分母；经管等学院有专业排名线索。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '东北财经大学', province: '辽宁', tags: ['财经'], sourceLevel: 'C', recommendQuotaText: '第三方称约346名，约14.31%', schoolPushRateText: '约14%（第三方，待复核）', pushOpportunityLevel: 'medium-high', confidence: 'low-medium', notes: ['财经类升学/考公/就业路径需要区分；需核验官方名单和学院分配。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '大连理工大学', province: '辽宁', tags: ['985', '211', '双一流'], sourceLevel: 'C', recommendQuotaText: '第三方称约1482名，约23.74%；不同校区/学院/班型差异大', schoolPushRateText: '约24%（第三方，口径待复核）', pushOpportunityLevel: 'high', confidence: 'low-medium', notes: ['主校区/盘锦/中外合作/实验班差异大，不可用一个全校率替代专业机会。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '东北大学', province: '辽宁', tags: ['985', '211', '双一流'], sourceLevel: 'C', recommendQuotaText: '第三方称约1500人，约30%+', schoolPushRateText: '约30%（第三方，待复核）', pushOpportunityLevel: 'high', confidence: 'low-medium', notes: ['需找本校推荐资格名单，不能用接收推免数替代。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '沈阳药科大学', province: '辽宁', tags: ['医药'], sourceLevel: 'C', recommendQuotaText: '第三方称约209名，约9.28%', schoolPushRateText: '约9%（第三方，待复核）', pushOpportunityLevel: 'medium', confidence: 'low-medium', notes: ['药学/基地班可能存在结构差异，需专业级核验。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '中国医科大学', province: '辽宁', tags: ['医学'], sourceLevel: 'C', recommendQuotaText: '第三方称约312名，约14.63%', schoolPushRateText: '约15%（第三方，待复核）', pushOpportunityLevel: 'medium-high', confidence: 'low-medium', notes: ['医学类需区分5+3、临床、基础医学、护理等路径。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '大连交通大学', province: '辽宁', tags: ['交通工科'], sourceLevel: 'C', recommendQuotaText: '第三方称约173名，约4.28%', schoolPushRateText: '约4%（第三方，待复核）', pushOpportunityLevel: 'low-medium', confidence: 'low', notes: ['偏就业/行业入口参考，保研数据弱参考。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '沈阳建筑大学', province: '辽宁', tags: ['建筑土木'], sourceLevel: 'C', recommendQuotaText: '第三方称约155名，约5.21%', schoolPushRateText: '约5%（第三方，待复核）', pushOpportunityLevel: 'low-medium', confidence: 'low', notes: ['土建方向需结合行业周期和专业接受度。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '沈阳工业大学', province: '辽宁', tags: ['工科', '电气'], sourceLevel: 'D', schoolPushRateText: '可靠校级推免率待核验', pushOpportunityLevel: 'unknown', confidence: 'low', notes: ['当前不展示具体保研率；电气等专业更多按行业就业/电网考试逻辑核验。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '辽宁科技大学', province: '辽宁', tags: ['工科'], sourceLevel: 'D', schoolPushRateText: '可靠校级推免率待核验', pushOpportunityLevel: 'unknown', confidence: 'low', notes: ['暂不作为保研率排序依据。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '沈阳理工大学', province: '辽宁', tags: ['工科'], sourceLevel: 'D', schoolPushRateText: '可靠校级推免率待核验', pushOpportunityLevel: 'unknown', confidence: 'low', notes: ['暂不作为保研率排序依据。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '大连大学', province: '辽宁', tags: ['综合'], sourceLevel: 'D', schoolPushRateText: '可靠校级推免率待核验', pushOpportunityLevel: 'unknown', confidence: 'low', notes: ['暂不作为保研率排序依据。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '大连医科大学', province: '辽宁', tags: ['医学'], sourceLevel: 'D', schoolPushRateText: '多为接收推免信息，不能算本校保研率', pushOpportunityLevel: 'unknown', confidence: 'low', notes: ['医学类需核验本校推荐名单和具体专业/培养类型。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '沈阳航空航天大学', province: '辽宁', tags: ['航空航天'], sourceLevel: 'D', schoolPushRateText: '可靠校级推免率待核验', pushOpportunityLevel: 'unknown', confidence: 'low', notes: ['航空航天方向更多按行业属性、专业实力和就业路径判断。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '吉林大学', province: '吉林', tags: ['985', '211', '双一流'], sourceLevel: 'C', schoolPushRateText: '约23.7%（第三方，待复核）', pushOpportunityLevel: 'high', confidence: 'low-medium', notes: ['高平台升学参考，需核验专业/学院机会。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '太原理工大学', province: '山西', tags: ['211', '双一流', '工科'], sourceLevel: 'C', schoolPushRateText: '约11.9%（第三方，待复核）', pushOpportunityLevel: 'medium', confidence: 'low-medium', notes: ['工科平台参考，需补官方分子分母。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '中北大学', province: '山西', tags: ['兵工'], sourceLevel: 'C', recommendQuotaText: '第三方称约381名，约4.3%', schoolPushRateText: '约4%（第三方，待复核）', pushOpportunityLevel: 'low-medium', confidence: 'low', notes: ['更偏行业就业/兵工特色，升学参考权重不宜过高。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '东北林业大学', province: '黑龙江', tags: ['211', '双一流', '林业'], sourceLevel: 'C', recommendQuotaText: '第三方称约1037名，约20.7%~21.0%', schoolPushRateText: '约21%（第三方，待复核）', pushOpportunityLevel: 'high', confidence: 'low-medium', notes: ['211/双一流升学跳板参考，需核验学院。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '西南交通大学', province: '四川', tags: ['211', '双一流', '交通'], sourceLevel: 'C', recommendQuotaText: '第三方称约1352名，约19.0%', schoolPushRateText: '约19%（第三方，待复核）', pushOpportunityLevel: 'high', confidence: 'low-medium', notes: ['交通行业特色院校；环境学院有12名免研名额官方片段，专业分母待补。'], collegeSignals: [{ name: '环境科学与工程学院', quotaText: '约12名，需补毕业生分母' }], majorLevelStatus: 'need_manual_check' },
  { schoolName: '西北农林科技大学', province: '陕西', tags: ['985', '211', '双一流', '农林'], sourceLevel: 'C', schoolPushRateText: '约25.5%（第三方，待复核）', pushOpportunityLevel: 'high', confidence: 'low-medium', notes: ['985平台升学参考，专业/学院机会需核验。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '中国地质大学（北京）', aliases: ['中国地质大学北京'], province: '北京', tags: ['211', '双一流', '地质'], sourceLevel: 'C', schoolPushRateText: '约25.5%（第三方，待复核）', pushOpportunityLevel: 'high', confidence: 'low-medium', notes: ['地质行业特色院校；环境学院等有方案线索但不可直接算专业率。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '北京林业大学', province: '北京', tags: ['211', '双一流', '林业'], sourceLevel: 'C', schoolPushRateText: '约21.1%（第三方，待复核）', pushOpportunityLevel: 'high', confidence: 'low-medium', notes: ['林业/生态相关升学平台参考，需核验学院名额。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '南京航空航天大学', province: '江苏', tags: ['211', '双一流', '航空航天'], sourceLevel: 'C', recommendQuotaText: '第三方称约1226名，约26.2%', schoolPushRateText: '约26%（第三方，待复核）', pushOpportunityLevel: 'high', confidence: 'low-medium', notes: ['自动化/机电/计算机学院名额线索较强，但学院分母待补。'], collegeSignals: [{ name: '自动化学院', quotaText: '约143名，待复核' }, { name: '机电学院', quotaText: '约127名，待复核' }, { name: '计算机学院', quotaText: '约121名，待复核' }], majorLevelStatus: 'need_manual_check' },
  { schoolName: '中国石油大学（华东）', aliases: ['中国石油大学华东'], province: '山东', tags: ['211', '双一流', '石油'], sourceLevel: 'C', schoolPushRateText: '约21%（第三方，待复核）', pushOpportunityLevel: 'high', confidence: 'low-medium', notes: ['石油行业特色院校，升学/行业就业都需结合专业。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '南京工业大学', province: '江苏', tags: ['工科', '化工'], sourceLevel: 'D', schoolPushRateText: '低可信人数线索，暂不展示数值', pushOpportunityLevel: 'unknown', confidence: 'low', notes: ['需官方推免名单和毕业生分母。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '石家庄铁道大学', province: '河北', tags: ['铁道交通'], sourceLevel: 'C', recommendQuotaText: '第三方称约228名，约4.46%', schoolPushRateText: '约4%（第三方，待复核）', pushOpportunityLevel: 'low-medium', confidence: 'low', notes: ['偏行业就业参考，升学参考权重较低。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '燕山大学', province: '河北', tags: ['机械'], sourceLevel: 'C', recommendQuotaText: '第三方称约612名，约10.81%', schoolPushRateText: '约11%（第三方，待复核）', pushOpportunityLevel: 'medium', confidence: 'low-medium', notes: ['机械等优势方向需学院/专业名额核验。'], majorLevelStatus: 'need_manual_check' },
  { schoolName: '长安大学', province: '陕西', tags: ['211', '双一流', '交通'], sourceLevel: 'C', recommendQuotaText: '第三方称约1023名，约16.24%', schoolPushRateText: '约16%（第三方，待复核）', pushOpportunityLevel: 'medium-high', confidence: 'low-medium', notes: ['信息工程学院有109+3候补官方片段，学院分母待补。'], collegeSignals: [{ name: '信息工程学院', quotaText: '109名 + 3候补，需补毕业生分母' }], majorLevelStatus: 'need_manual_check' },
  { schoolName: '河海大学', province: '江苏', tags: ['211', '双一流', '水利'], sourceLevel: 'C', recommendQuotaText: '第三方称约1047/1048名，约19.55%~19.57%', schoolPushRateText: '约19.5%（第三方，待复核）', pushOpportunityLevel: 'high', confidence: 'low-medium', notes: ['水利特色院校，需核验大禹学院/水利等方向。'], majorLevelStatus: 'need_manual_check' }
];
