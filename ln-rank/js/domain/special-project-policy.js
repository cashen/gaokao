// v3.9.21.2 前端特殊项目策略：UI 文案、状态和卡片提示统一出口。
export const SPECIAL_PROJECT_HIDE_MODE = 'hide_eligibility_projects';
export const SPECIAL_PROJECT_SHOW_MODE = 'show_eligibility_projects';
export const SPECIAL_PROJECT_STORAGE_KEY = 'lnRank.specialProjectMode.current';

export function normalizeSpecialProjectMode(value) {
  return String(value || '').trim() === SPECIAL_PROJECT_SHOW_MODE ? SPECIAL_PROJECT_SHOW_MODE : SPECIAL_PROJECT_HIDE_MODE;
}

export function specialProjectModeLabel(mode) {
  return normalizeSpecialProjectMode(mode) === SPECIAL_PROJECT_SHOW_MODE
    ? '已显示特殊项目'
    : '默认隐藏特殊项目';
}

export function specialProjectStatusCopy(mode, hiddenCount = 0) {
  const normalized = normalizeSpecialProjectMode(mode);
  if (normalized === SPECIAL_PROJECT_SHOW_MODE) {
    return '已显示专项、定向、预科等特殊项目，请确认孩子具备对应资格。';
  }
  const countText = Number(hiddenCount) > 0 ? `本轮已隐藏 ${Number(hiddenCount).toLocaleString('zh-CN')} 条；` : '';
  return `${countText}已默认隐藏专项、定向、预科等需要资格核验的专业。`;
}

export function specialProjectToggleLabel(mode) {
  return normalizeSpecialProjectMode(mode) === SPECIAL_PROJECT_SHOW_MODE ? '继续隐藏' : '显示特殊项目';
}

export function specialProjectHelpCopy(mode) {
  return normalizeSpecialProjectMode(mode) === SPECIAL_PROJECT_SHOW_MODE
    ? '显示后请重点核验报考资格、招生批次、服务年限、违约责任、户籍/体检/政审等条件。'
    : '多数普通家庭不具备专项、定向、预科等资格，默认隐藏可减少误判。';
}

export function specialProjectResultNote(mode, source = {}) {
  const hidden = Number(source?.specialProjectHidden || source?.specialProjectStats?.hidden || 0);
  if (normalizeSpecialProjectMode(mode) === SPECIAL_PROJECT_SHOW_MODE) {
    return '当前已显示特殊项目。请把专项、定向、预科等条目当作“需资格核验”处理，不要按普通专业简单比较。';
  }
  if (hidden > 0) {
    return `已为普通家庭默认隐藏 ${hidden.toLocaleString('zh-CN')} 条专项、定向、预科等特殊项目；如孩子具备相关资格，可点击“显示特殊项目”查看。`;
  }
  return '已默认隐藏专项、定向、预科等特殊项目；本轮条件下暂无需要隐藏的相关条目。';
}

export function specialProjectCardBadge(record = {}) {
  const info = record.specialProject || {};
  if (!info.hasSpecialProject) return '';
  return info.labelText || info.primaryLabel || '特殊项目';
}
