import './tongxue-performance-v112.js?v=120';
import { installShareMetadataStabilizer } from '../share/tongxue-share-stabilizer-v113.js';
import { installTongxueShare } from '../share/tongxue-share-v113.js?v=121';
import { installSchoolPortrait } from '../portrait/tongxue-school-portrait-v120.js';
installShareMetadataStabilizer('v1.2.1');
installTongxueShare({ pageVersion: 'v1.2.1' });
installSchoolPortrait({ pageVersion: 'v1.2.1' });
