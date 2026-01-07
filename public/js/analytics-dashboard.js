// Analytics Dashboard JavaScript

let charts = {};
let socket;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeWebSocket();
    initializeDateRanges();
    loadOverview();

    // Refresh data every 30 seconds
    setInterval(loadOverview, 30000);
});

// Tab navigation
function initializeTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tabName).classList.add('active');

            // Load data for specific tab
            loadTabData(tabName);
        });
    });
}

// Initialize WebSocket connection
function initializeWebSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('stats', (data) => {
        updateRealtimeStats(data);
    });

    socket.on('alert', (alert) => {
        addAlert(alert);
    });
}

// Initialize date ranges
function initializeDateRanges() {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const formatDate = (date) => date.toISOString().split('T')[0];

    document.getElementById('txStartDate').value = formatDate(weekAgo);
    document.getElementById('txEndDate').value = formatDate(today);
    document.getElementById('userStartDate').value = formatDate(weekAgo);
    document.getElementById('userEndDate').value = formatDate(today);
    document.getElementById('protocolStartDate').value = formatDate(weekAgo);
    document.getElementById('protocolEndDate').value = formatDate(today);
    document.getElementById('reportDate').value = formatDate(today);
}

// Load overview data
async function loadOverview() {
    try {
        const response = await fetch('/api/analytics/dashboard');
        const result = await response.json();

        if (result.success) {
            updateOverviewMetrics(result.data);
            loadOverviewChart();
            loadRecentAlerts();
        }
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

// Update overview metrics
function updateOverviewMetrics(data) {
    document.getElementById('blockHeight').textContent =
        data.transactions?.currentHour?.totalTransactions || '-';
    document.getElementById('totalTransactions').textContent =
        data.transactions?.currentHour?.totalTransactions || 0;
    document.getElementById('activeUsers').textContent =
        data.users?.currentDay?.activeUsers || 0;
    document.getElementById('totalRevenue').textContent =
        formatNumber(data.revenue?.today?.totalRevenue || 0) + ' STRAT';
}

// Update realtime stats
function updateRealtimeStats(stats) {
    document.getElementById('blockHeight').textContent = stats.blockHeight || '-';
}

// Load overview chart
async function loadOverviewChart() {
    try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        const response = await fetch(
            `/api/analytics/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&granularity=daily`
        );
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            const ctx = document.getElementById('overviewChart');

            if (charts.overview) {
                charts.overview.destroy();
            }

            charts.overview = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: result.data.map(d => formatDate(d.date || d._id)),
                    datasets: [{
                        label: 'Transactions',
                        data: result.data.map(d => d.totalTransactions),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading overview chart:', error);
    }
}

// Load recent alerts
async function loadRecentAlerts() {
    try {
        const response = await fetch('/api/analytics/monitoring/alerts?limit=5');
        const result = await response.json();

        if (result.success) {
            const alertsList = document.getElementById('alertsList');
            alertsList.innerHTML = '';

            if (result.data.length === 0) {
                alertsList.innerHTML = '<p>No active alerts</p>';
                return;
            }

            result.data.forEach(alert => {
                alertsList.appendChild(createAlertElement(alert));
            });
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

// Create alert element
function createAlertElement(alert) {
    const div = document.createElement('div');
    div.className = `alert-item ${alert.severity}`;
    div.innerHTML = `
        <strong>${alert.title}</strong><br>
        ${alert.message}<br>
        <small>${new Date(alert.timestamp).toLocaleString()}</small>
    `;
    return div;
}

// Add new alert
function addAlert(alert) {
    const alertsList = document.getElementById('alertsList');
    const alertElement = createAlertElement(alert);
    alertsList.insertBefore(alertElement, alertsList.firstChild);

    // Keep only last 5 alerts
    while (alertsList.children.length > 5) {
        alertsList.removeChild(alertsList.lastChild);
    }
}

// Load transaction analytics
async function loadTransactionAnalytics() {
    try {
        const startDate = document.getElementById('txStartDate').value;
        const endDate = document.getElementById('txEndDate').value;

        const response = await fetch(
            `/api/analytics/transactions?startDate=${startDate}&endDate=${endDate}&granularity=daily`
        );
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            updateTransactionMetrics(result.data);
            loadTransactionCharts(result.data);
        }
    } catch (error) {
        console.error('Error loading transaction analytics:', error);
    }
}

// Update transaction metrics
function updateTransactionMetrics(data) {
    const totals = data.reduce((acc, d) => ({
        transactions: acc.transactions + (d.totalTransactions || 0),
        volume: acc.volume + (d.totalVolume || 0),
        peakTPS: Math.max(acc.peakTPS, d.peakTPS || 0),
        successRate: acc.successRate + (d.successRate || 100)
    }), { transactions: 0, volume: 0, peakTPS: 0, successRate: 0 });

    document.getElementById('txTotal').textContent = totals.transactions.toLocaleString();
    document.getElementById('txVolume').textContent = formatNumber(totals.volume) + ' STRAT';
    document.getElementById('txPeakTPS').textContent = totals.peakTPS.toFixed(2);
    document.getElementById('txSuccessRate').textContent =
        (totals.successRate / data.length).toFixed(1) + '%';
}

// Load transaction charts
function loadTransactionCharts(data) {
    // Volume chart
    const volumeCtx = document.getElementById('txVolumeChart');
    if (charts.txVolume) charts.txVolume.destroy();

    charts.txVolume = new Chart(volumeCtx, {
        type: 'line',
        data: {
            labels: data.map(d => formatDate(d.date || d._id)),
            datasets: [{
                label: 'Transaction Volume',
                data: data.map(d => d.totalVolume),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Transaction types chart
    if (data.length > 0 && data[0].transactionTypes) {
        const typesCtx = document.getElementById('txTypesChart');
        if (charts.txTypes) charts.txTypes.destroy();

        const types = data[0].transactionTypes;

        charts.txTypes = new Chart(typesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Transfer', 'Contract', 'Staking', 'Bridge', 'NFT'],
                datasets: [{
                    data: [
                        types.transfer || 0,
                        types.contract || 0,
                        types.staking || 0,
                        types.bridge || 0,
                        types.nft || 0
                    ],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// Load user analytics
async function loadUserAnalytics() {
    try {
        const startDate = document.getElementById('userStartDate').value;
        const endDate = document.getElementById('userEndDate').value;

        const response = await fetch(
            `/api/analytics/users?startDate=${startDate}&endDate=${endDate}`
        );
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            updateUserMetrics(result.data);
            loadUserCharts(result.data);
        }
    } catch (error) {
        console.error('Error loading user analytics:', error);
    }
}

// Update user metrics
function updateUserMetrics(data) {
    const latest = data[data.length - 1];

    document.getElementById('userTotal').textContent = latest.totalUsers || 0;
    document.getElementById('userActive').textContent = latest.activeUsers || 0;
    document.getElementById('userNew').textContent = latest.newUsers || 0;
    document.getElementById('userRetention').textContent =
        (latest.userRetentionRate || 0).toFixed(1) + '%';
}

// Load user charts
function loadUserCharts(data) {
    // User growth chart
    const growthCtx = document.getElementById('userGrowthChart');
    if (charts.userGrowth) charts.userGrowth.destroy();

    charts.userGrowth = new Chart(growthCtx, {
        type: 'line',
        data: {
            labels: data.map(d => formatDate(d.date)),
            datasets: [
                {
                    label: 'Total Users',
                    data: data.map(d => d.totalUsers),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)'
                },
                {
                    label: 'Active Users',
                    data: data.map(d => d.activeUsers),
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // User distribution chart
    if (data.length > 0 && data[0].userDistribution) {
        const distCtx = document.getElementById('userDistributionChart');
        if (charts.userDist) charts.userDist.destroy();

        const dist = data[data.length - 1].userDistribution;

        charts.userDist = new Chart(distCtx, {
            type: 'pie',
            data: {
                labels: ['Whales', 'Large', 'Medium', 'Small', 'Inactive'],
                datasets: [{
                    data: [
                        dist.whales || 0,
                        dist.large || 0,
                        dist.medium || 0,
                        dist.small || 0,
                        dist.inactive || 0
                    ],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// Load protocol analytics
async function loadProtocolAnalytics() {
    try {
        const protocol = document.getElementById('protocolSelect').value;
        const startDate = document.getElementById('protocolStartDate').value;
        const endDate = document.getElementById('protocolEndDate').value;

        const url = protocol
            ? `/api/analytics/protocols?protocol=${protocol}&startDate=${startDate}&endDate=${endDate}`
            : `/api/analytics/protocols?startDate=${startDate}&endDate=${endDate}`;

        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            displayProtocolMetrics(result.data);
            loadProtocolChart(result.data);
        }
    } catch (error) {
        console.error('Error loading protocol analytics:', error);
    }
}

// Display protocol metrics
function displayProtocolMetrics(data) {
    const metricsDiv = document.getElementById('protocolMetrics');
    metricsDiv.innerHTML = '';

    // Group by protocol
    const byProtocol = {};
    data.forEach(d => {
        if (!byProtocol[d.protocol]) {
            byProtocol[d.protocol] = {
                tvl: 0,
                volume: 0,
                users: 0,
                transactions: 0
            };
        }
        byProtocol[d.protocol].tvl = Math.max(byProtocol[d.protocol].tvl, d.totalValueLocked || 0);
        byProtocol[d.protocol].volume += d.volume24h || 0;
        byProtocol[d.protocol].users = Math.max(byProtocol[d.protocol].users, d.uniqueUsers || 0);
        byProtocol[d.protocol].transactions += d.totalTransactions || 0;
    });

    Object.keys(byProtocol).forEach(protocol => {
        const metrics = byProtocol[protocol];
        const card = document.createElement('div');
        card.className = 'metric-card';
        card.innerHTML = `
            <h3>${protocol.toUpperCase()}</h3>
            <p>TVL: ${formatNumber(metrics.tvl)} STRAT</p>
            <p>Volume: ${formatNumber(metrics.volume)} STRAT</p>
            <p>Users: ${metrics.users.toLocaleString()}</p>
            <p>Transactions: ${metrics.transactions.toLocaleString()}</p>
        `;
        metricsDiv.appendChild(card);
    });
}

// Load protocol chart
function loadProtocolChart(data) {
    const ctx = document.getElementById('protocolChart');
    if (charts.protocol) charts.protocol.destroy();

    // Group by protocol
    const byProtocol = {};
    data.forEach(d => {
        if (!byProtocol[d.protocol]) {
            byProtocol[d.protocol] = 0;
        }
        byProtocol[d.protocol] += d.volume24h || 0;
    });

    charts.protocol = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(byProtocol),
            datasets: [{
                label: 'Protocol Volume',
                data: Object.values(byProtocol),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                    'rgba(255, 159, 64, 0.5)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Load revenue analytics
async function loadRevenueAnalytics() {
    try {
        const days = document.getElementById('revenuePeriod').value;

        const response = await fetch(`/api/analytics/revenue/summary?days=${days}`);
        const result = await response.json();

        if (result.success && result.data) {
            updateRevenueMetrics(result.data);
            loadRevenueCharts(days);
        }
    } catch (error) {
        console.error('Error loading revenue analytics:', error);
    }
}

// Update revenue metrics
function updateRevenueMetrics(data) {
    document.getElementById('revTotal').textContent = formatNumber(data.totalRevenue) + ' STRAT';
    document.getElementById('revTxFees').textContent = formatNumber(data.transactionFees) + ' STRAT';
    document.getElementById('revBridgeFees').textContent = formatNumber(data.bridgeFees) + ' STRAT';
    document.getElementById('revNFT').textContent = formatNumber(data.nftRoyalties) + ' STRAT';
}

// Load revenue charts
async function loadRevenueCharts(days) {
    try {
        const response = await fetch(`/api/analytics/revenue/trends?period=daily&count=${days}`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            // Revenue trend chart
            const trendCtx = document.getElementById('revenueTrendChart');
            if (charts.revenueTrend) charts.revenueTrend.destroy();

            charts.revenueTrend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: result.data.map(d => formatDate(d.date)),
                    datasets: [{
                        label: 'Daily Revenue',
                        data: result.data.map(d => d.revenue),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    } catch (error) {
        console.error('Error loading revenue charts:', error);
    }
}

// Load tab data
function loadTabData(tabName) {
    switch(tabName) {
        case 'overview':
            loadOverview();
            break;
        case 'transactions':
            loadTransactionAnalytics();
            break;
        case 'users':
            loadUserAnalytics();
            break;
        case 'protocols':
            loadProtocolAnalytics();
            break;
        case 'revenue':
            loadRevenueAnalytics();
            break;
        case 'monitoring':
            loadMonitoring();
            break;
        case 'reports':
            // Reports are generated on demand
            break;
    }
}

// Load monitoring data
async function loadMonitoring() {
    try {
        const response = await fetch('/api/analytics/monitoring/dashboard');
        const result = await response.json();

        if (result.success) {
            updateMonitoringMetrics(result.data);
        }
    } catch (error) {
        console.error('Error loading monitoring:', error);
    }
}

// Update monitoring metrics
function updateMonitoringMetrics(data) {
    document.getElementById('networkStatus').textContent =
        data.network?.networkStatus || 'Unknown';
    document.getElementById('cpuUsage').textContent =
        (data.performance?.system?.cpuUsage || 0).toFixed(1) + '%';
    document.getElementById('memoryUsage').textContent =
        (data.performance?.system?.memoryUsage || 0).toFixed(1) + '%';
    document.getElementById('activePeers').textContent =
        data.network?.p2pConnections || 0;

    // Update network status indicator
    const statusIndicator = document.querySelector('.status-indicator');
    statusIndicator.className = 'status-indicator';
    if (data.network?.networkStatus === 'healthy') {
        statusIndicator.classList.add('status-healthy');
    } else if (data.network?.networkStatus === 'degraded') {
        statusIndicator.classList.add('status-degraded');
    } else {
        statusIndicator.classList.add('status-critical');
    }

    // Load monitoring alerts
    const alertsDiv = document.getElementById('monitoringAlerts');
    alertsDiv.innerHTML = '';

    if (data.activeAlerts && data.activeAlerts.length > 0) {
        data.activeAlerts.forEach(alert => {
            alertsDiv.appendChild(createAlertElement(alert));
        });
    } else {
        alertsDiv.innerHTML = '<p>No active alerts</p>';
    }
}

// Generate report
async function generateReport() {
    try {
        const type = document.getElementById('reportType').value;
        const date = document.getElementById('reportDate').value;

        let url;
        if (type === 'daily') {
            url = `/api/analytics/reports/daily?date=${date}`;
        } else if (type === 'weekly') {
            url = `/api/analytics/reports/weekly?endDate=${date}`;
        } else if (type === 'monthly') {
            const d = new Date(date);
            url = `/api/analytics/reports/monthly?year=${d.getFullYear()}&month=${d.getMonth() + 1}`;
        } else if (type === 'financial') {
            const endDate = new Date(date);
            const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            url = `/api/analytics/reports/financial?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            displayReport(result.data);
        }
    } catch (error) {
        console.error('Error generating report:', error);
    }
}

// Display report
function displayReport(report) {
    const reportDiv = document.getElementById('reportData');
    reportDiv.innerHTML = `
        <h3>Report Type: ${report.type}</h3>
        <p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
        <pre>${JSON.stringify(report, null, 2)}</pre>
    `;
}

// Export report
function exportReport() {
    const type = document.getElementById('reportType').value;
    const date = document.getElementById('reportDate').value;

    window.location.href = `/api/analytics/reports/export?type=${type}&date=${date}`;
}

// Utility functions
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
}
