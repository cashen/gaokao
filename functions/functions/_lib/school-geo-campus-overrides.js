/**
 * Campus overrides for entities whose official parent-school list is not enough.
 * Keep this file short and human-reviewable.
 */
export const SCHOOL_GEO_CAMPUS_OVERRIDES = {
  '东北大学秦皇岛分校': { province: '河北', city: '秦皇岛', sourceMethod: 'manual_campus_override', matchNote: '招生实体为秦皇岛分校，地域按实际办学地河北秦皇岛处理。' },
  '北京交通大学(威海校区)': { province: '山东', city: '威海', sourceMethod: 'manual_campus_override', matchNote: '招生实体为威海校区，地域按实际办学地山东威海处理。' },
  '北京师范大学(珠海校区)': { province: '广东', city: '珠海', sourceMethod: 'manual_campus_override', matchNote: '招生实体为珠海校区，地域按实际办学地广东珠海处理。' },
  '大连理工大学(盘锦校区)': { province: '辽宁', city: '盘锦', sourceMethod: 'manual_campus_override', matchNote: '招生实体为盘锦校区，地域按实际办学地辽宁盘锦处理。' }
};
