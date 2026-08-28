import { FEISHU_REPORT_ROUTES } from '../../../../shared/resources/reports/feishu-report-contract.v3963_1.js?v=3963_1';
import { postFeishuReport } from '../../shared/feishu-api-client.v3963_1.js?v=3963_1';

export function createFeishuReport(payload) {
  return postFeishuReport(FEISHU_REPORT_ROUTES.currentBand, payload);
}
