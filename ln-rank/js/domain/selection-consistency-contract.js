function hasAny(text, re) { return re.test(String(text == null ? '' : text)); }
function itemText(item = {}) { return [item.school, item.major, item.matchReason, item.tuition, item.feeType, ...(Array.isArray(item.flags) ? item.flags : [])].join(' '); }

export function buildSelectionConsistencyNotes({ items = [], bottomLineMode = 'all', region = 'all', scoreChanged = false, specialProjectMode = 'hide_eligibility_projects' } = {}) {
  const list = Array.isArray(items) ? items : [];
  const notes = [];
  const hasCost = list.some(item => item.isSinoForeign || item.isHighFee || hasAny(itemText(item), /中外|合作办学|高收费|较高收费|费用|学费/));
  const hasSpecial = list.some(item => item.specialProject?.hasSpecialProject || item.hasSpecialProject || hasAny(itemText(item), /定向|专项|公费师范|优师|预科|民族班|公安|司法|航海|轮机/));
  const hasOutRegion = region && region !== 'all' && list.some(item => String(item.displayLocation || item.province || item.city || '').trim() && !String(item.displayLocation || item.province || item.city || '').includes(region));
  if (bottomLineMode === 'public_regular_only' && hasCost) notes.push('当前筛选是“只看公办普通”，但已选清单中仍有中外/高收费项目。已选清单不会自动删除，报告会单独列入费用、培养模式和证书口径核验。');
  if (hasSpecial && specialProjectMode !== 'show_eligibility_projects') notes.push('已选清单中包含或疑似包含专项、定向、公费师范、预科等特殊项目，报告会提示资格、协议、服务年限、批次和体检/政审核验。');
  if (hasOutRegion) notes.push('当前地区筛选不会自动删除已选清单里的跨地区项目，生成报告前请逐条核验城市、校区和家庭接受度。');
  if (scoreChanged) notes.push('分数变化后，已选专业相对孩子分数的位置需要重新核验。');
  if (list.length >= 40) notes.push('已选专业数量较多，建议先“生成前看一眼”，检查前中后段结构和方向是否过散。');
  return notes;
}
