// v3.9.7.1 关键词预置策略：前端短路径，后台长能力。
// 快捷词不是全部都是标准专业名；type 用于区分专业别名、行业路径、项目属性。
export const DEFAULT_KEYWORD_PRESETS = [
  { label: '计算机', type: 'major_alias', standardMajorNames: ['计算机科学与技术', '软件工程', '网络工程', '物联网工程', '数据科学与大数据技术'] },
  { label: '电气', type: 'major_alias', standardMajorNames: ['电气工程及其自动化', '智能电网信息工程'] },
  { label: '自动化', type: 'major_alias', standardMajorNames: ['自动化', '机器人工程', '测控技术与仪器'] },
  { label: '机械', type: 'major_alias', standardMajorNames: ['机械工程', '机械设计制造及其自动化', '机械电子工程'] },
  { label: '会计', type: 'major_alias', standardMajorNames: ['会计学', '财务管理', '审计学'] },
  { label: '医学', type: 'major_alias', standardMajorNames: ['临床医学', '口腔医学', '护理学', '药学', '医学影像技术'] },
  { label: '师范', type: 'major_alias', standardMajorNames: ['小学教育', '学前教育', '教育学', '教育技术学'] },
  { label: '法学', type: 'major_alias', standardMajorNames: ['法学', '知识产权'] },
  { label: '中外', type: 'project_attribute', relatedTerms: ['中外合作', '合作办学', '较高收费', '高收费'] },
  { label: '交通', type: 'industry_path', standardMajorNames: ['交通运输', '交通工程', '车辆工程', '道路桥梁与渡河工程'], schoolHints: ['交通', '铁道'] }
];

export const MORE_KEYWORD_GROUPS = [
  { title: '工科技术', words: ['电子', '通信', '软件', '人工智能', '材料', '化工', '环境', '食品'] },
  { title: '医学健康', words: ['临床', '口腔', '护理', '药学', '康复', '影像'] },
  { title: '财经文法', words: ['金融', '财务', '审计', '经济', '管理', '中文', '新闻', '外语'] },
  { title: '行业项目', words: ['石油', '铁道', '航空', '航天', '电力', '邮电', '高收费'] }
];
