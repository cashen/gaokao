// Generated for ln-rank KB seed: kb-source-registry.js

export const KB_SOURCE_REGISTRY = {
  version: 'kb-source-registry-20260604',
  project: 'ln-rank',
  province: '辽宁',
  subject: '物理类',
  sourceLevels: {
    A: '教育部、阳光高考/学信网、辽宁省教育厅、辽宁招生考试之窗、国家部委法规/公告、学校官网招生章程等，可作为事实底座。',
    B: '高校就业质量报告、学院官网、官方媒体转载、学科评估公开资料，可作为辅助线索。',
    C: '内部统计、数据挖掘、经验规则，只能作为参考提醒。',
    D: '商业榜单、自媒体、论坛、短视频，不进入正式AI诊断。'
  },
  files: {
    'standard-major-catalog-2026-full.generated.js': { level: 'A', sourceName: '教育部《普通高等学校本科专业目录（2026年）》PDF', sourceUrl: 'user_uploaded_pdf:18585282273714.pdf', status: 'generated_full883', affects: ['专业代码显示','专业类核验','筛选预置词联动','AI专业解释','飞书报告复核点'] },
    'standard-major-catalog-bridge.generated.js': { level: 'policy', sourceName: 'ln-rank 2024/2025历史录取数据与2026本科专业目录兼容策略', status: 'generated', affects: ['卡片专业代码展示','历史数据不覆盖','AI边界说明'] },
    'major-filter-preset-kb.generated.js': { level: 'policy', sourceName: 'ln-rank筛选预置词与2026专业目录/项目属性联动策略', status: 'generated', affects: ['搜索页常用词','更多方向','项目属性分流'] },
    'standard-major-catalog-2026.generated.js': {
      level: 'A',
      sourceName: '教育部2026本科专业目录通知及附件',
      sourceUrl: 'https://education.news.cn/20260428/5d9c0117b0c943adb68d74e4320835e6/202604285d9c0117b0c943adb68d74e4320835e6_1224e991cd08564f5f9c594207f0d5ff38.pdf',
      status: 'coreSeedGenerated_full883IntegratedInV3986',
      affects: ['专业代码显示', '专业方向归类', 'AI专业解释', '热度方向映射', '报告复核点']
    },
    'major-catalog-change-kb.generated.js': {
      level: 'A',
      sourceName: '教育部2025/2026本科专业目录发布信息',
      status: 'generated',
      affects: ['新专业提示', '交叉学科提醒', '2026更新清单']
    },
    'liaoning-policy-kb.generated.js': {
      level: 'A',
      sourceName: '辽宁省教育厅2025志愿填报及招生录取问答',
      sourceUrl: 'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2025062010472685884/index.shtml',
      status: 'generated',
      affects: ['自选专业诊断', '飞书报告', '辽宁专业+学校口径']
    },
    'admission-charter-source-kb.generated.js': {
      level: 'A',
      sourceName: '阳光高考招生章程平台',
      sourceUrl: 'https://gaokao.chsi.com.cn/zsgs/zhangcheng/',
      status: 'generated',
      affects: ['中外/高收费/定向/试验班复核', '报告复核点']
    },
    'physical-exam-kb.generated.js': {
      level: 'A',
      sourceName: '普通高等学校招生体检工作指导意见',
      sourceUrl: 'https://gaokao.chsi.com.cn/gkxx/zcdh/200702/20070228/754576.html',
      status: 'generated',
      affects: ['医学/食品/动物医学/园艺/交通等体检复核提示']
    },
    'career-path-medical-kb.generated.js': {
      level: 'A',
      sourceName: '国家卫生健康委住院医师规范化培训制度信息',
      sourceUrl: 'https://www.nhc.gov.cn/qjjys/c100015/201502/7466984c6d29417e8fb46f4f336a8947.shtml',
      status: 'generated',
      affects: ['医学核心方向AI解释', '报告长期路径提醒']
    },
    'career-path-law-kb.generated.js': {
      level: 'A',
      sourceName: '司法部国家统一法律职业资格考试公告',
      sourceUrl: 'https://www.moj.gov.cn/pub/sfbgw/zwxxgk/fdzdgknr/fdzdgknrtzwj/202506/t20250605_520493.html',
      status: 'generated',
      affects: ['法学路径AI解释', '报告复核点']
    },
    'career-path-teacher-kb.generated.js': {
      level: 'A',
      sourceName: '中国教育考试网教师资格条例/中小学教师资格考试',
      sourceUrl: 'https://ntce.neea.edu.cn/xhtml1/report/1508/309-1.htm',
      status: 'generated',
      affects: ['师范路径AI解释', '报告复核点']
    }
  },
  updateTriggers: [
    { trigger: '2026辽宁一分一段和控制线公布', update: ['year-caliber-kb', 'rank-table', '报告年份说明', 'AI年份口径', '公办底线边界'] },
    { trigger: '2026辽宁招生计划公布', update: ['招生计划KB', '校区/学费/招生人数', '项目属性', '报告复核点'] },
    { trigger: '教育部专业目录附件完成全量解析', update: ['standard-major-catalog-2026.generated.js full883RowsParsed=true'] },
    { trigger: '阳光高考/学校官网发布2026招生章程', update: ['admission-charter-source-kb', 'school-charter-kb pending->generated'] },
    { trigger: '专业热度统计升级到2025/2026', update: ['major-trend-kb', 'major-trend-page', '搜索页热度提示', '报告热度边界'] }
  ],
  formalOutputPolicy: {
    forbidTechWords: ['payload', 'raw', 'source', 'debug', 'model', 'JSON', 'workers-ai', 'fallback'],
    feishuFailureCopy: '报告暂时生成失败。可以先复制文字版报告，稍后再试。',
    note: '飞书报告可以使用KB内容，但必须摘要化、家长化，不展示sourceLevel/sourceUrl等工程字段。'
  }
};

export function getKbSourceByFile(fileName) {
  return KB_SOURCE_REGISTRY.files[fileName] || null;
}
