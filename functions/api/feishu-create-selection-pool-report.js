import { buildSelectionPoolFeishuReport } from '../_lib/feishu-selection-pool-report-builder.js';
import { createFeishuReportResponse } from '../_lib/feishu-report-service.js';
import { FEISHU_REPORT_CONTRACT, normalizeSelectionPoolReportType } from '../../shared/resources/reports/feishu-report-contract.js';

export function onRequest(context) {
  return createFeishuReportResponse(context, async input => ({
    ...buildSelectionPoolFeishuReport({ ...input, reportType: normalizeSelectionPoolReportType(input.reportType) }),
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear
  }), FEISHU_REPORT_CONTRACT);
}
