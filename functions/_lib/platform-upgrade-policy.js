import { resolveSchoolProfile } from '../../shared/resources/schools/school-profile-center.js';

export const PLATFORM_UPGRADE_POLICY_VERSION = 'platform-upgrade-policy-v3990_3';
const SCHOOL_TIER_CACHE_MAX = 1024;
const schoolTierCache = new Map();

function clean(value, max = 160) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

export function normalizePlatformTarget(value = '') {
  const target = clean(value, 12);
  return target === '985' || target === '211' ? target : '';
}

export function isPlatformBudgetProject(record = {}) {
  const feeType = clean(record?.feeType, 40);
  return record?.isSinoForeign === true
    || record?.isHighFee === true
    || feeType === 'sino_foreign'
    || feeType === 'high_fee';
}

function schoolTier(record = {}) {
  const school = clean(record?.school || record?.schoolName, 160);
  if (!school) return Object.freeze({ is985: false, is211: false });
  const cached = schoolTierCache.get(school);
  if (cached) return cached;
  const profile = record?.schoolProfile || resolveSchoolProfile(school, record) || null;
  const tier = Object.freeze({
    is985: Boolean(profile?.is985),
    is211: Boolean(profile?.is211 || profile?.is985)
  });
  if (schoolTierCache.size >= SCHOOL_TIER_CACHE_MAX) {
    const oldest = schoolTierCache.keys().next().value;
    if (oldest !== undefined) schoolTierCache.delete(oldest);
  }
  schoolTierCache.set(school, tier);
  return tier;
}

export function matchesPlatformUpgradeRecord(record = {}, target = '') {
  const normalized = normalizePlatformTarget(target);
  if (!normalized) return true;
  if (!isPlatformBudgetProject(record)) return false;
  const tier = schoolTier(record);
  return normalized === '985' ? tier.is985 : tier.is211;
}

export function platformUpgradePolicyState() {
  return Object.freeze({
    version: PLATFORM_UPGRADE_POLICY_VERSION,
    schoolTierCacheEntries: schoolTierCache.size,
    schoolTierCacheMax: SCHOOL_TIER_CACHE_MAX,
    bounded: schoolTierCache.size <= SCHOOL_TIER_CACHE_MAX
  });
}
