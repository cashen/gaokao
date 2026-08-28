// v3.9.6.4 行业路径关键词策略。
// 维护方式：新增行业时只改这里，不改 matcher。
export const INDUSTRY_KEYWORD_ALIASES = {
  '石油': { aliases: ['石油', '油气', '油气储运', '石油工程', '资源勘查', '化工'], schoolHints: ['石油', '石油化工'], industryTags: ['石油', '油气', '能源化工'] },
  '交通': { aliases: ['交通', '交通运输', '交通工程', '轨道交通', '铁道', '车辆', '道路桥梁'], schoolHints: ['交通', '铁道'], industryTags: ['交通', '轨道', '铁道'] },
  '铁道': { aliases: ['铁道', '轨道交通', '交通运输', '车辆工程', '电气化铁道', '道路桥梁'], schoolHints: ['铁道', '交通'], industryTags: ['铁道', '轨道交通'] },
  '航天': { aliases: ['航天', '航空', '航空航天', '飞行器', '飞行器设计', '飞行器制造', '飞行器动力'], schoolHints: ['航空', '航天'], industryTags: ['航空航天', '国防军工'] },
  '航空': { aliases: ['航空', '航天', '航空航天', '飞行器', '飞行器制造', '飞行器动力', '飞行技术'], schoolHints: ['航空', '航天', '民航'], industryTags: ['航空航天', '民航'] },
  '电力': { aliases: ['电力', '电气', '智能电网', '新能源', '能源动力', '储能'], schoolHints: ['电力', '能源'], industryTags: ['电力', '能源'] },
  '邮电': { aliases: ['邮电', '通信', '电子信息', '信息工程', '网络工程'], schoolHints: ['邮电', '电子科技'], industryTags: ['通信', '信息产业'] },
  '海洋': { aliases: ['海洋', '船舶', '轮机', '港口航道', '水产', '海洋技术'], schoolHints: ['海洋', '海事'], industryTags: ['海洋', '航运', '船舶'] },
  '海事': { aliases: ['海事', '航海', '轮机', '船舶', '海洋', '港口航道'], schoolHints: ['海事', '海洋'], industryTags: ['海事', '航运', '船舶'] },
  '地矿': { aliases: ['地质', '地矿', '矿业', '采矿', '资源勘查', '测绘', '遥感'], schoolHints: ['地质', '矿业'], industryTags: ['地矿', '资源'] },
  '测绘': { aliases: ['测绘', '遥感', '地理信息', '导航工程'], schoolHints: ['测绘', '地质'], industryTags: ['测绘', '地理信息'] },
  '农林': { aliases: ['农学', '农业', '林学', '园艺', '植物保护', '动物医学', '水产', '智慧农业'], schoolHints: ['农业', '农林', '林业'], industryTags: ['农林'] },
  '医药': { aliases: ['医学', '医科', '药学', '中医药', '临床', '口腔', '护理', '影像', '检验'], schoolHints: ['医科', '药科', '中医药'], industryTags: ['医药', '医学健康'] },
  '财经': { aliases: ['财经', '金融', '会计', '财务', '经济', '审计', '税收'], schoolHints: ['财经', '商学院'], industryTags: ['财经', '经管'] },
  '政法': { aliases: ['法学', '政法', '公安', '司法', '知识产权'], schoolHints: ['政法', '警察', '刑事警察'], industryTags: ['政法', '公安司法'] },
  '师范': { aliases: ['师范', '教育', '小学教育', '学前教育', '心理'], schoolHints: ['师范'], industryTags: ['师范教育'] },
  '建筑': { aliases: ['建筑', '建筑学', '城乡规划', '风景园林', '土木', '智能建造'], schoolHints: ['建筑'], industryTags: ['建筑土木'] },
  '材料': { aliases: ['材料', '材料科学', '高分子', '金属材料', '新能源材料'], schoolHints: [], industryTags: ['材料'] },
  '化工': { aliases: ['化工', '化学工程', '应用化学', '精细化工', '能源化学'], schoolHints: ['化工'], industryTags: ['化工'] },
  '食品': { aliases: ['食品', '食品科学', '食品质量', '营养', '酿酒', '乳品'], schoolHints: [], industryTags: ['食品'] },
  '水利': { aliases: ['水利', '水文', '港口航道'], schoolHints: ['水利'], industryTags: ['水利'] }
};
