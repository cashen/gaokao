import { FEISHU_REPORT_ROUTES } from '../../../../shared/resources/reports/feishu-report-contract.v3964_0.js?v=3964_0';
import { postFeishuReport } from '../../shared/feishu-api-client.v3964_0.js?v=3964_0';

export function createSelectionPoolFeishuReport(payload) {
  return postFeishuReport(FEISHU_REPORT_ROUTES.selectionPool, payload);
}
