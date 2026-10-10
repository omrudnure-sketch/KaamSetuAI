import * as reportService from '../services/reportService.js';

export const getReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    const reportData = await reportService.generateReportData(type, req.query);

    if (req.query.format === 'csv') {
      const csv = reportService.convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="kaamsetu_${type}_report.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, data: reportData });
  } catch (error) {
    next(error);
  }
};
