const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const MonitoringController = require('../controllers/monitoringController');
const ReportsController = require('../controllers/reportsController');

// Transaction Analytics
router.get('/transactions', AnalyticsController.getTransactionAnalytics);
router.get('/transactions/realtime', AnalyticsController.getRealTimeTransactionStats);

// User Analytics
router.get('/users', AnalyticsController.getUserAnalytics);
router.get('/users/realtime', AnalyticsController.getRealTimeUserStats);

// Protocol Analytics
router.get('/protocols', AnalyticsController.getProtocolAnalytics);
router.get('/protocols/realtime', AnalyticsController.getRealTimeProtocolStats);

// Revenue Analytics
router.get('/revenue', AnalyticsController.getRevenueAnalytics);
router.get('/revenue/summary', AnalyticsController.getRevenueSummary);
router.get('/revenue/trends', AnalyticsController.getRevenueTrends);
router.get('/revenue/realtime', AnalyticsController.getRealTimeRevenueStats);

// Dashboard Overview
router.get('/dashboard', AnalyticsController.getDashboardOverview);

// Network Monitoring
router.get('/monitoring/network', MonitoringController.getNetworkHealth);
router.get('/monitoring/network/history', MonitoringController.getHistoricalNetworkHealth);
router.get('/monitoring/network/stats', MonitoringController.getNetworkStatistics);

// Performance Monitoring
router.get('/monitoring/performance', MonitoringController.getPerformanceMetrics);
router.get('/monitoring/performance/history', MonitoringController.getHistoricalPerformanceMetrics);
router.get('/monitoring/service-health', MonitoringController.getServiceHealth);

// Alerts
router.get('/monitoring/alerts', MonitoringController.getActiveAlerts);
router.get('/monitoring/alerts/history', MonitoringController.getAlertHistory);
router.get('/monitoring/alerts/stats', MonitoringController.getAlertStatistics);
router.post('/monitoring/alerts/:alertId/resolve', MonitoringController.resolveAlert);

// Monitoring Dashboard
router.get('/monitoring/dashboard', MonitoringController.getMonitoringDashboard);

// Reports
router.get('/reports/daily', ReportsController.generateDailyReport);
router.get('/reports/weekly', ReportsController.generateWeeklyReport);
router.get('/reports/monthly', ReportsController.generateMonthlyReport);
router.get('/reports/financial', ReportsController.generateFinancialReport);
router.get('/reports/export', ReportsController.exportReportCSV);
router.get('/reports/available', ReportsController.getAvailableReports);

module.exports = router;
