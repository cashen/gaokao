import'../../shared/ui/shell/family-shell.v3964_0.js?v=3964_0';
import{installSchoolEntityUi}from'./tongxue-school-entity-ui-v152.js?v=156';
import{installRegionUi,announceRegionSupport}from'./tongxue-region-ui-v152.js?v=156';
import{installTongxueCopyV152,refreshTongxueCopyV152}from'./tongxue-copy-v152.js?v=156';
import{prepareTongxueDirectHandoff}from'./tongxue-direct-handoff-v155.js?v=156';
import{installTongxueDirectResultShell}from'./tongxue-direct-result-v156.js?v=156';
import{installShareMetadataStabilizer}from'../share/tongxue-share-stabilizer-v113.js?v=156';
import{installTongxueShare}from'../share/tongxue-share-v130.js?v=156';
import{installSchoolPortrait}from'../portrait/tongxue-school-portrait-v121.js?v=156';

const EXPECTED_BUILD='tongxue-v157-family-shell-20260725';
const pageBuild=document.querySelector('meta[name="tongxue-build"]')?.content||'';
if(pageBuild!==EXPECTED_BUILD)throw new Error('同学你好页面资源版本不一致，请刷新后重试。');
document.documentElement.dataset.tongxueBuild=EXPECTED_BUILD;

installSchoolEntityUi();
installRegionUi();
installTongxueCopyV152();
const directHandoff=prepareTongxueDirectHandoff();
const directResult=installTongxueDirectResultShell(directHandoff.state,{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
await import('./tongxue-performance-v112.js?v=156');
await directHandoff.start();
directResult.refresh();
announceRegionSupport();
refreshTongxueCopyV152();
installShareMetadataStabilizer('v1.5.7');
installTongxueShare({pageVersion:'v1.5.7'});
installSchoolPortrait({pageVersion:'v1.5.7'});
refreshTongxueCopyV152();
