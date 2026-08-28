import{installSchoolEntityUi}from'./tongxue-school-entity-ui-v130.js';
import{installShareMetadataStabilizer}from'../share/tongxue-share-stabilizer-v113.js';
import{installTongxueShare}from'../share/tongxue-share-v130.js?v=130';
import{installSchoolPortrait}from'../portrait/tongxue-school-portrait-v120.js';
installSchoolEntityUi();
await import('./tongxue-performance-v112.js?v=130');
installShareMetadataStabilizer('v1.3.0');
installTongxueShare({pageVersion:'v1.3.0'});
installSchoolPortrait({pageVersion:'v1.3.0'});
