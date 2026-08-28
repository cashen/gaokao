// v3.9.12 辽宁省内校区/办学地点前端轻量显示策略。
// 只显示短标签和复核摘要；最终以当年招生计划备注和招生章程为准。
export const LIAONING_CAMPUS_RULES = [
  { school:'辽宁大学', risk:'high', rules:[{ any:['英语','日语','俄语','翻译','商务英语'], tag:'校区：辽阳', summary:'辽宁大学外语类部分专业在辽阳武圣校区，需确认是否接受辽阳就读。' }], fallback:{ tag:'校区需核验', summary:'辽宁大学有沈阳与辽阳等办学地点，需按专业核验校区。' } },
  { school:'沈阳工业大学', risk:'high', rules:[{ any:['高分子材料与工程','化学工程与工艺','应用化学','资源循环科学与工程','过程装备与控制工程','油气储运工程','环保设备工程','能源与动力工程','电子与计算机工程','电气工程与智能控制','电子商务','互联网金融','物流工程','化工','油气','过程装备','高分子','资源循环','环保设备'], tag:'校区：辽阳', summary:'沈阳工业大学部分专业在辽阳分校，需确认办学地点。' }], fallback:{ tag:'校区需核验', summary:'沈阳工业大学存在沈阳与辽阳分校分专业办学，需核验校区。' } },
  { school:'沈阳药科大学', risk:'high', rules:[{ any:['药学（理科基地班）','药学(理科基地班)','理科基地班'], tag:'校区：沈阳', summary:'药学（理科基地班）按章程在沈阳校本部，仍需以当年章程为准。' }, { all:true, tag:'校区：本溪', summary:'沈阳药科大学除药学（理科基地班）外，多数招生专业在本溪南校区，需确认是否接受本溪就读。' }] },
  { school:'辽宁工程技术大学', risk:'high', rules:[{ any:['电气','自动化','计算机','软件','通信','电子','安全','应急','会计','财务','工商','经管','金融','营销'], tag:'校区：葫芦岛', summary:'辽宁工程技术大学阜新、葫芦岛多城市办学，相关专业需核验是否在葫芦岛龙湾校园。' }], fallback:{ tag:'校区：阜新/葫芦岛', summary:'辽宁工程技术大学有阜新、葫芦岛等办学地点，需按专业核验校区。' } },
  { school:'大连理工大学盘锦校区', risk:'high', rules:[{ all:true, tag:'校区：盘锦', summary:'该条目为大连理工大学盘锦校区，需按盘锦校区招生代码和办学地点核验。' }] },
  { school:'大连理工大学', risk:'high', rules:[{ any:['盘锦校区','盘锦'], tag:'校区：盘锦', summary:'大连理工大学盘锦校区与主校区分开招生，需核验招生代码和办学地点。' }] },
  { school:'辽宁中医药大学', risk:'medium', rules:[{ all:true, tag:'校区需核验', summary:'辽宁中医药大学有沈阳、大连、本溪等校区，需按专业核验办学地点。' }] },
  { school:'大连交通大学', risk:'medium', rules:[{ any:['工业设计','动画','产品设计'], tag:'校区：沙河口', summary:'大连交通大学工业设计、动画、产品设计等专业在沙河口校区，需核验住宿与通勤。' }, { all:true, tag:'校区：旅顺口', summary:'大连交通大学多数普通本科专业新生在旅顺口校区，需确认同城不同区通勤和住宿。' }] },
  { school:'锦州医科大学', risk:'medium', rules:[{ any:['临床','口腔','麻醉','医学影像','医学检验','护理','预防医学','基础医学','教育'], tag:'校区：东校园', summary:'锦州医科大学医学、教育类专业多在东校园，需按专业核验。' }, { any:['动物','食品','农学','动植物','管理','工程','工学'], tag:'校区：西校园', summary:'锦州医科大学农学、工学、管理类专业可能在西校园，需核验住宿与通勤。' }], fallback:{ tag:'校区需核验', summary:'锦州医科大学东校园/西校园分专业办学，需按专业核验。' } },
  { school:'辽宁师范大学', risk:'medium', rules:[{ all:true, tag:'校区需核验', summary:'辽宁师范大学黄河路、西山湖校区分专业办学，需核验专业所在校区。' }] },
  { school:'渤海大学', risk:'medium', rules:[{ all:true, tag:'校区需核验', summary:'渤海大学松山、滨海校区分专业办学，需核验专业所在校区。' }] },
  { school:'大连海洋大学', risk:'medium', rules:[{ all:true, tag:'校区需核验', summary:'大连海洋大学部分专业涉及大黑石等校区，需以当年招生章程和计划备注为准。' }] }
];

function includesAny(text, arr = []) { return arr.some(x => text.includes(x)); }
export function getCampusForRecord(record = {}) {
  const schoolText = String(record.school || '');
  const majorText = String(record.major || '');
  const allText = `${schoolText} ${majorText} ${Array.isArray(record.schoolTags) ? record.schoolTags.join(' ') : ''}`;
  const school = LIAONING_CAMPUS_RULES.find(x => allText.includes(x.school) || schoolText.includes(x.school));
  if (!school) return null;
  const rule = (school.rules || []).find(r => r.all || includesAny(majorText, r.any || []) || includesAny(allText, r.any || []));
  const selected = rule || school.fallback;
  if (!selected) return null;
  return { school: school.school, risk: school.risk, displayTag: selected.tag, reviewSummary: selected.summary };
}
