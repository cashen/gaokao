import './tongxue-performance-v112.js?v=120';
import { installShareMetadataStabilizer } from './tongxue-share-stabilizer-v113.js';
import { installTongxueShare } from './tongxue-share-v113.js?v=120';
import { installSchoolPortrait } from './tongxue-school-portrait-v120.js';
installShareMetadataStabilizer('v1.2.0');
installTongxueShare({ pageVersion: 'v1.2.0' });
installSchoolPortrait({ pageVersion: 'v1.2.0' });
