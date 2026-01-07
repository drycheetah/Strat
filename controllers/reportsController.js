const logger = require('../utils/logger');

class ReportsController {
  // Generate daily report
  static async generateDailyReport(req, res) {
    try {
      const { date } = req.query;
      const reportDate = date ? new Date(date) : new Date();

      const reportGenerator = req.app.locals.reportGenerator;
      const report = await reportGenerator.generateDailyReport(reportDate);

      if (!report) {
        return res.status(404).json({
          error: 'No data available for the specified date'
        });
      }

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error(`Error generating daily report: ${error.message}`);
      res.status(500).json({
        error: 'Failed to generate daily report',
        message: error.message
      });
    }
  }

  // Generate weekly report
  static async generateWeeklyReport(req, res) {
    try {
      const { endDate } = req.query;
      const reportEndDate = endDate ? new Date(endDate) : new Date();

      const reportGenerator = req.app.locals.reportGenerator;
      const report = await reportGenerator.generateWeeklyReport(reportEndDate);

      if (!report) {
        return res.status(404).json({
          error: 'No data available for the specified period'
        });
      }

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error(`Error generating weekly report: ${error.message}`);
      res.status(500).json({
        error: 'Failed to generate weekly report',
        message: error.message
      });
    }
  }

  // Generate monthly report
  static async generateMonthlyReport(req, res) {
    try {
      const { year, month } = req.query;

      if (!year || !month) {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
      }

      const reportGenerator = req.app.locals.reportGenerator;
      const report = await reportGenerator.generateMonthlyReport(
        parseInt(year),
        parseInt(month)
      );

      if (!report) {
        return res.status(404).json({
          error: 'No data available for the specified month'
        });
      }

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error(`Error generating monthly report: ${error.message}`);
      res.status(500).json({
        error: 'Failed to generate monthly report',
        message: error.message
      });
    }
  }

  // Generate financial report
  static async generateFinancialReport(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate are required'
        });
      }

      const reportGenerator = req.app.locals.reportGenerator;
      const report = await reportGenerator.generateFinancialReport(startDate, endDate);

      if (!report) {
        return res.status(404).json({
          error: 'No data available for the specified period'
        });
      }

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error(`Error generating financial report: ${error.message}`);
      res.status(500).json({
        error: 'Failed to generate financial report',
        message: error.message
      });
    }
  }

  // Export report as CSV
  static async exportReportCSV(req, res) {
    try {
      const { type, date, startDate, endDate } = req.query;

      if (!type) {
        return res.status(400).json({
          error: 'Report type is required'
        });
      }

      const reportGenerator = req.app.locals.reportGenerator;
      let report;

      switch (type) {
        case 'daily':
          report = await reportGenerator.generateDailyReport(
            date ? new Date(date) : new Date()
          );
          break;
        case 'weekly':
          report = await reportGenerator.generateWeeklyReport(
            endDate ? new Date(endDate) : new Date()
          );
          break;
        case 'financial':
          if (!startDate || !endDate) {
            return res.status(400).json({
              error: 'startDate and endDate are required for financial report'
            });
          }
          report = await reportGenerator.generateFinancialReport(startDate, endDate);
          break;
        default:
          return res.status(400).json({
            error: 'Invalid report type'
          });
      }

      if (!report) {
        return res.status(404).json({
          error: 'No data available'
        });
      }

      // Convert to CSV
      const csv = this.convertToCSV(report);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${Date.now()}.csv"`);
      res.send(csv);

    } catch (error) {
      logger.error(`Error exporting report: ${error.message}`);
      res.status(500).json({
        error: 'Failed to export report',
        message: error.message
      });
    }
  }

  // Helper: Convert report to CSV
  static convertToCSV(report) {
    let csv = '';

    // Add header
    csv += `Report Type: ${report.type}\n`;
    csv += `Generated At: ${report.generatedAt}\n`;
    csv += '\n';

    // Add transaction data
    if (report.transactions) {
      csv += 'Transaction Metrics\n';
      csv += 'Metric,Value\n';
      csv += `Total Transactions,${report.transactions.totalTransactions || 0}\n`;
      csv += `Total Volume,${report.transactions.totalVolume || 0}\n`;
      csv += `Total Fees,${report.transactions.totalFees || 0}\n`;
      csv += `Peak TPS,${report.transactions.peakTPS || 0}\n`;
      csv += '\n';
    }

    // Add user data
    if (report.users) {
      csv += 'User Metrics\n';
      csv += 'Metric,Value\n';
      csv += `Active Users,${report.users.activeUsers || report.users.totalActiveUsers || 0}\n`;
      csv += `New Users,${report.users.newUsers || 0}\n`;
      csv += `Retention Rate,${report.users.userRetentionRate || report.users.averageRetentionRate || 0}%\n`;
      csv += '\n';
    }

    // Add revenue data
    if (report.revenue && report.revenue.totalRevenue) {
      csv += 'Revenue Metrics\n';
      csv += 'Metric,Value\n';
      csv += `Total Revenue,${report.revenue.totalRevenue}\n`;
      csv += `Transaction Fees,${report.revenue.transactionFees || 0}\n`;
      csv += `Bridge Fees,${report.revenue.bridgeFees || 0}\n`;
      csv += `NFT Royalties,${report.revenue.nftRoyalties || 0}\n`;
      csv += '\n';
    }

    return csv;
  }

  // Get available reports
  static async getAvailableReports(req, res) {
    try {
      // This would typically query a database of saved reports
      // For now, return the types of reports that can be generated

      const reportTypes = [
        {
          type: 'daily',
          name: 'Daily Report',
          description: 'Comprehensive daily analytics and metrics',
          parameters: ['date (optional)']
        },
        {
          type: 'weekly',
          name: 'Weekly Report',
          description: '7-day analytics summary',
          parameters: ['endDate (optional)']
        },
        {
          type: 'monthly',
          name: 'Monthly Report',
          description: 'Full month analytics and growth metrics',
          parameters: ['year', 'month']
        },
        {
          type: 'financial',
          name: 'Financial Report',
          description: 'Detailed revenue and financial metrics',
          parameters: ['startDate', 'endDate']
        }
      ];

      res.json({
        success: true,
        data: reportTypes
      });

    } catch (error) {
      logger.error(`Error getting available reports: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch available reports',
        message: error.message
      });
    }
  }
}

module.exports = ReportsController;
