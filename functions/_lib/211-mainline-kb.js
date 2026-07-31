/*
 * v3.9.72.1 Functions compatibility adapter.
 *
 * The complete 211 admission/background catalogue is generated at build time and
 * served from /ln-rank/data/211-static/211-static-index.v3972_0.json.
 * This module must remain lightweight: Cloudflare Pages packages Functions into
 * a shared Worker, so importing the full 211 evidence and school resources here
 * would also increase the cost of unrelated score and school query routes.
 */

export const ALL_211_KB_VERSION = 'all-211-functions-compat-v3972_1';

const STATIC_PAGE = '/ln-rank/211-mainline.html';
const STATIC_INDEX = '/ln-rank/data/211-static/211-static-index.v3972_0.json';
const BOUNDARY = '211完整投档与专业背景查询已迁移到构建期静态索引。Functions 不执行211全量投档扫描、背景匹配、排序或聚合。';

export function get211MainlineMeta() {
  return {
    meta: {
      version: ALL_211_KB_VERSION,
      assetVersion: 'v3972_0',
      generatedAt: '2026-07-31',
      executionRole: 'static-index-compatibility-only',
      architecture: 'build-time-static-index',
      staticPage: STATIC_PAGE,
      staticIndex: STATIC_INDEX
    },
    copy: {
      boundary: BOUNDARY,
      scoreBoundary: '分数和位次查询由浏览器读取不可变静态索引完成，不代表录取结果。'
    },
    totalEntries: 0,
    source: {
      sourceId: 'MOE_DOUBLE_FIRST_CLASS_2022',
      executionRole: 'build-time-only'
    }
  };
}

export function get211SchoolSummaries() {
  return [];
}

export function get211MajorSummaries() {
  return [];
}

export function match211Mainline() {
  return null;
}

export function present211Mainline() {
  return null;
}
