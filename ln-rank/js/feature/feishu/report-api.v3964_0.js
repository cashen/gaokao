import { FEISHU_REPORT_ROUTES } from '../../../../shared/resources/reports/feishu-report-contract.v3964_0.js?v=3964_0';
import { postFeishuReport } from '../../shared/feishu-api-client.v3964_0.js?v=3964_0';

export function createFeishuReport(payload) {
  return postFeishuReport(FEISHU_REPORT_ROUTES.currentBand, payload);
}
