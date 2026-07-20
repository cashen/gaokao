import{installSchoolEntityUi}from'./tongxue-school-entity-ui-v140.js';
import{installShareMetadataStabilizer}from'../share/tongxue-share-stabilizer-v113.js';
import{installTongxueShare}from'../share/tongxue-share-v130.js?v=140';
import{installSchoolPortrait}from'../portrait/tongxue-school-portrait-v120.js';
installSchoolEntityUi();
await import('./tongxue-performance-v112.js?v=140');
installShareMetadataStabilizer('v1.4.0');
installTongxueShare({pageVersion:'v1.4.0'});
installSchoolPortrait({pageVersion:'v1.4.0'});
