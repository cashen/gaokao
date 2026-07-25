import { buildSelectionPoolFeishuReport } from '../_lib/feishu-selection-pool-report-builder.js';
import { createFeishuReportResponse } from '../_lib/feishu-report-service.js';
import { FEISHU_REPORT_CONTRACT, normalizeSelectionPoolReportType } from '../../shared/resources/reports/feishu-report-contract.js';

export function onRequest(context) {
  return createFeishuReportResponse(context, async input => {
    const reportContext = {
      ...(input.reportContext || {}),
      dataYear: FEISHU_REPORT_CONTRACT.dataYear,
      rankYear: FEISHU_REPORT_CONTRACT.rankYear,
      audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
      yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion
    };
    const reportPayload = {
      ...(input.reportPayload || {}),
      activeDataYear: FEISHU_REPORT_CONTRACT.dataYear,
      rankYear: FEISHU_REPORT_CONTRACT.rankYear,
      audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
      yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion
    };
    return {
      ...buildSelectionPoolFeishuReport({
        ...input,
        year: FEISHU_REPORT_CONTRACT.dataYear,
        dataYear: FEISHU_REPORT_CONTRACT.dataYear,
        rankYear: FEISHU_REPORT_CONTRACT.rankYear,
        audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
        yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion,
        reportContext,
        reportPayload,
        reportType: normalizeSelectionPoolReportType(input.reportType)
      }),
      dataYear: FEISHU_REPORT_CONTRACT.dataYear,
      rankYear: FEISHU_REPORT_CONTRACT.rankYear,
      audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
      yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion
    };
  }, FEISHU_REPORT_CONTRACT);
}
