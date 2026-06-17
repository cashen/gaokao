export const LIAONING_CAMPUS_MAJOR_KB = {
  version: 'v3912-liaoning-campus-major-baseline',
  sourcePolicy: {
    level: 'A/B',
    note: '第一批覆盖辽宁省内重点跨城市/多校区风险院校。卡片只做短标签和复核摘要；最终以当年招生计划备注和招生章程为准。'
  },
  schools: [
    {
      school: '辽宁大学', defaultCity: '沈阳', riskLevel: 'high',
      rules: [
        { match: { majors: ['英语', '日语', '俄语', '翻译', '商务英语'] }, campusName: '武圣校区', city: '辽阳', displayTag: '校区：辽阳', reviewSummary: '辽宁大学外语类部分专业在辽阳武圣校区，需确认是否接受辽阳就读。', sourceYear: 2025, sourceLevel: 'A' }
      ], fallback: { displayTag: '校区需核验', reviewSummary: '辽宁大学有沈阳蒲河、沈阳崇山、辽阳武圣等办学地点，需按专业核验校区。' }
    },
    {
      school: '沈阳工业大学', defaultCity: '沈阳', riskLevel: 'high',
      rules: [
        { match: { any: ['高分子材料与工程','化学工程与工艺','应用化学','资源循环科学与工程','过程装备与控制工程','油气储运工程','环保设备工程','能源与动力工程','电子与计算机工程','电气工程与智能控制','电子商务','互联网金融','物流工程','化工','油气','过程装备','高分子','资源循环','环保设备'] }, campusName: '辽阳分校', city: '辽阳', displayTag: '校区：辽阳', reviewSummary: '沈阳工业大学部分化工、油气、材料、能源、电控、经管类专业在辽阳分校，需确认办学地点。', sourceYear: 2025, sourceLevel: 'A' }
      ], fallback: { displayTag: '校区需核验', reviewSummary: '沈阳工业大学存在沈阳与辽阳分校分专业办学，需按招生计划备注核验。' }
    },
    {
      school: '沈阳药科大学', defaultCity: '沈阳', riskLevel: 'high',
      rules: [
        { match: { any: ['药学（理科基地班）','药学(理科基地班)','理科基地班'] }, campusName: '校本部', city: '沈阳', displayTag: '校区：沈阳', reviewSummary: '药学（理科基地班）按章程在沈阳校本部，仍需以当年章程为准。', sourceYear: 2025, sourceLevel: 'A' },
        { match: { allOthers: true }, campusName: '南校区', city: '本溪', displayTag: '校区：本溪', reviewSummary: '沈阳药科大学除药学（理科基地班）外，多数招生专业在本溪南校区，需确认是否接受本溪就读。', sourceYear: 2025, sourceLevel: 'A' }
      ]
    },
    {
      school: '辽宁工程技术大学', defaultCity: '阜新', riskLevel: 'high',
      rules: [
        { match: { any: ['电气','自动化','计算机','软件','通信','电子','安全','应急','会计','财务','工商','经管','金融','营销'] }, campusName: '龙湾校园', city: '葫芦岛', displayTag: '校区：葫芦岛', reviewSummary: '辽宁工程技术大学阜新、葫芦岛多城市办学，相关电气、计算机、经管、安全等专业需核验是否在葫芦岛龙湾校园。', sourceYear: 2025, sourceLevel: 'A' }
      ], fallback: { displayTag: '校区：阜新/葫芦岛', reviewSummary: '辽宁工程技术大学有阜新中华路、阜新玉龙、葫芦岛龙湾等办学地点，需按专业核验校区。' }
    },
    {
      school: '大连理工大学盘锦校区', defaultCity: '盘锦', riskLevel: 'high',
      rules: [ { match: { allOthers: true }, campusName: '盘锦校区', city: '盘锦', displayTag: '校区：盘锦', reviewSummary: '该条目为大连理工大学盘锦校区，填报时需按盘锦校区招生代码、专业备注和培养地点核验。', sourceYear: 2025, sourceLevel: 'A' } ]
    },
    {
      school: '大连理工大学', defaultCity: '大连', riskLevel: 'high',
      rules: [ { match: { schoolOrMajorAny: ['盘锦校区','盘锦'] }, campusName: '盘锦校区', city: '盘锦', displayTag: '校区：盘锦', reviewSummary: '大连理工大学盘锦校区与主校区分开招生，需核验招生代码和办学地点。', sourceYear: 2025, sourceLevel: 'A' } ]
    },
    {
      school: '辽宁中医药大学', defaultCity: '沈阳', riskLevel: 'medium',
      rules: [ { match: { allOthers: true }, campusName: '一校三区', city: '沈阳/大连/本溪', displayTag: '校区需核验', reviewSummary: '辽宁中医药大学有沈阳、大连、本溪等校区，需按专业核验办学地点。', sourceYear: 2025, sourceLevel: 'B' } ]
    },
    {
      school: '大连交通大学', defaultCity: '大连', riskLevel: 'medium',
      rules: [
        { match: { any: ['工业设计','动画','产品设计'] }, campusName: '沙河口校区', city: '大连', displayTag: '校区：沙河口', reviewSummary: '大连交通大学工业设计、动画、产品设计等专业按章程在沙河口校区，需核验住宿与通勤。', sourceYear: 2025, sourceLevel: 'A' },
        { match: { allOthers: true }, campusName: '旅顺口校区', city: '大连', displayTag: '校区：旅顺口', reviewSummary: '大连交通大学多数普通本科专业新生在旅顺口校区，需确认同城不同区通勤和住宿。', sourceYear: 2025, sourceLevel: 'A' }
      ]
    },
    {
      school: '锦州医科大学', defaultCity: '锦州', riskLevel: 'medium',
      rules: [
        { match: { any: ['临床','口腔','麻醉','医学影像','医学检验','护理','预防医学','基础医学','教育'] }, campusName: '东校园', city: '锦州', displayTag: '校区：东校园', reviewSummary: '锦州医科大学医学、教育类专业多在东校园，需按专业核验。', sourceYear: 2025, sourceLevel: 'A' },
        { match: { any: ['动物','食品','农学','动植物','管理','工程','工学'] }, campusName: '西校园', city: '锦州', displayTag: '校区：西校园', reviewSummary: '锦州医科大学农学、工学、管理类专业可能在西校园，需核验住宿与通勤。', sourceYear: 2025, sourceLevel: 'A' }
      ], fallback: { displayTag: '校区需核验', reviewSummary: '锦州医科大学东校园/西校园分专业办学，需按专业核验。' }
    },
    {
      school: '辽宁师范大学', defaultCity: '大连', riskLevel: 'medium',
      rules: [ { match: { allOthers: true }, campusName: '黄河路/西山湖', city: '大连', displayTag: '校区需核验', reviewSummary: '辽宁师范大学黄河路、西山湖校区分专业办学，需核验专业所在校区。', sourceYear: 2025, sourceLevel: 'B' } ]
    },
    {
      school: '渤海大学', defaultCity: '锦州', riskLevel: 'medium',
      rules: [ { match: { allOthers: true }, campusName: '松山/滨海', city: '锦州', displayTag: '校区需核验', reviewSummary: '渤海大学松山、滨海校区分专业办学，需核验专业所在校区。', sourceYear: 2025, sourceLevel: 'B' } ]
    },
    {
      school: '大连海洋大学', defaultCity: '大连', riskLevel: 'medium',
      rules: [ { match: { allOthers: true }, campusName: '大黑石等', city: '大连', displayTag: '校区需核验', reviewSummary: '大连海洋大学部分专业涉及大黑石等校区，需以当年招生章程和计划备注为准。', sourceYear: 2025, sourceLevel: 'B' } ]
    }
  ]
};
