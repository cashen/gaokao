import { matchLiaoningLocalStrongChain } from './liaoning-local-strong-chain.js?v=3931';

const SURFACES = new Set(['card', 'selectionItem', 'summary', 'report']);

function hitOf(record = {}) {
  return record?.localStrongChain?.matched ? record.localStrongChain : matchLiaoningLocalStrongChain(record);
}

function shortLabel(hit = {}) {
  const tier = hit.tier || 'A';
  const depth = hit.depth || 'support';
  if (tier === 'S' && depth === 'core') return '辽宁本地强链 · 主干';
  if (tier === 'S') return '辽宁本地强链 · 相关';
  if (depth === 'core') return '属地特色 · 主干';
  return '属地特色 · 相关';
}

function chipPrefix(hit = {}) {
  return hit.tier === 'S' ? '强链' : '特色';
}

function compactChainName(name = '') {
  return String(name || '')
    .replace(/方向$/, '')
    .replace(/辽宁属地/g, '')
    .trim() || '学校主干方向';
}

function compactReviewPoints(points = [], max = 2) {
  return (Array.isArray(points) ? points : [])
    .map(x => String(x || '').trim())
    .filter(Boolean)
    .slice(0, max);
}

export function getLocalChainPresentation(record = {}, surface = 'card') {
  const safeSurface = SURFACES.has(surface) ? surface : 'card';
  const hit = hitOf(record);
  if (!hit) return null;

  const label = shortLabel(hit);
  const chainShort = compactChainName(hit.chainName);
  const reviewShort = compactReviewPoints(hit.reviewPoints, safeSurface === 'selectionItem' ? 2 : 0);
  const prefix = chipPrefix(hit);

  if (safeSurface === 'card') {
    return {
      matched: true,
      mode: 'compact',
      shortLabel: label,
      chainShort,
      text: `${label}｜${chainShort}`,
      allowFullText: false,
      reviewPoints: [],
      hit
    };
  }

  if (safeSurface === 'selectionItem') {
    return {
      matched: true,
      mode: 'chip',
      shortLabel: prefix,
      chainShort,
      text: `${prefix}：${chainShort}${reviewShort.length ? `｜${reviewShort.join(' / ')}` : ''}`,
      allowFullText: false,
      reviewPoints: reviewShort,
      hit
    };
  }

  if (safeSurface === 'summary') {
    return {
      matched: true,
      mode: 'summary',
      displayLabel: hit.displayLabel,
      chainName: hit.chainName,
      reviewPoints: compactReviewPoints(hit.reviewPoints, 5),
      boundary: hit.boundary,
      allowFullText: true,
      hit
    };
  }

  return {
    matched: true,
    mode: 'report',
    displayLabel: hit.displayLabel,
    chainName: hit.chainName,
    cardTip: hit.cardTip,
    reportTip: hit.reportTip,
    reviewPoints: Array.isArray(hit.reviewPoints) ? hit.reviewPoints : [],
    boundary: hit.boundary,
    allowFullText: true,
    hit
  };
}

export function renderLocalChainShortText(record = {}, surface = 'card') {
  return getLocalChainPresentation(record, surface)?.text || '';
}
