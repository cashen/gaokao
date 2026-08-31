#!/usr/bin/env node
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';

const files = ['ln-rank/local-mainline.html', 'ln-rank/211-mainline.html'];
const navigationSource = fs.readFileSync('shared/ui/navigation/module-navigation.v004.js', 'utf8');
const navigationStyles = fs.readFileSync('shared/ui/navigation/module-navigation.v005.css', 'utf8');
const expectedScript = `${CURRENT_RELEASE.resourceOwners.moduleNavigation}?v=004`;
const expectedStyles = `${CURRENT_RELEASE.resourceOwners.moduleNavigationStyles}?v=005&r=${CURRENT_RELEASE.moduleNavigationLayoutRevision}`;
const checks = files.map(file => {
  const text = fs.readFileSync(file, 'utf8');
  return {
    file,
    hasRuntimeNavigationScript: text.includes(expectedScript),
    hasRuntimeNavigationStyles: text.includes(expectedStyles),
    legacyInlineNavigationAbsent: !text.includes('class="aux-page-nav"') && !text.includes('aux-page-bottom-link'),
    repeatedHardBacklinkAbsent: !/回到初选工具查看|返回专业初选继续查询|回到专业初选继续看/.test(text)
  };
});
const ownerChecks = {
  version: navigationSource.includes(`VERSION = '${CURRENT_RELEASE.moduleNavigationVersion}'`),
  rootModuleHome: navigationSource.includes("route: '/'") && navigationSource.includes('ROOT_MODULES'),
  returnTargetPreservesPath: navigationSource.includes('link.href = visit.returnPath'),
  responsiveStyles: navigationStyles.includes('.ui-mobile-module-nav')
};
const passed = checks.every(item => Object.values(item).every(Boolean)) && Object.values(ownerChecks).every(Boolean);
console.log(JSON.stringify({
  audit: 'audit-aux-page-navigation-contract',
  version: CURRENT_RELEASE.moduleNavigationVersion,
  stylesVersion: CURRENT_RELEASE.moduleNavigationStylesVersion,
  passed,
  ownerChecks,
  checks
}, null, 2));
if (!passed) process.exit(1);
