// Visualization helper utilities for analytics dashboard

class VisualizationUtils {
  // Generate data for line chart
  static generateLineChartData(data, xField, yField, label) {
    return {
      labels: data.map(d => this.formatDate(d[xField])),
      datasets: [{
        label,
        data: data.map(d => d[yField]),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    };
  }

  // Generate data for multi-line chart
  static generateMultiLineChartData(data, xField, yFields) {
    const colors = [
      { border: 'rgb(75, 192, 192)', bg: 'rgba(75, 192, 192, 0.2)' },
      { border: 'rgb(255, 99, 132)', bg: 'rgba(255, 99, 132, 0.2)' },
      { border: 'rgb(54, 162, 235)', bg: 'rgba(54, 162, 235, 0.2)' },
      { border: 'rgb(255, 206, 86)', bg: 'rgba(255, 206, 86, 0.2)' },
      { border: 'rgb(153, 102, 255)', bg: 'rgba(153, 102, 255, 0.2)' }
    ];

    return {
      labels: data.map(d => this.formatDate(d[xField])),
      datasets: yFields.map((field, index) => ({
        label: field.label,
        data: data.map(d => this.getNestedValue(d, field.key)),
        borderColor: colors[index % colors.length].border,
        backgroundColor: colors[index % colors.length].bg,
        tension: 0.1
      }))
    };
  }

  // Generate data for bar chart
  static generateBarChartData(data, labels, values, label) {
    return {
      labels,
      datasets: [{
        label,
        data: values,
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 206, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)'
        ],
        borderWidth: 1
      }]
    };
  }

  // Generate data for pie/doughnut chart
  static generatePieChartData(data, labels, values) {
    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 206, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)'
        ],
        borderWidth: 1
      }]
    };
  }

  // Generate network topology data
  static generateNetworkTopology(nodes, connections) {
    return {
      nodes: nodes.map(node => ({
        id: node.id,
        label: node.label || node.id,
        value: node.value || 10,
        group: node.group || 'default',
        title: node.title || node.label
      })),
      edges: connections.map(conn => ({
        from: conn.from,
        to: conn.to,
        value: conn.value || 1,
        arrows: 'to',
        label: conn.label || ''
      }))
    };
  }

  // Generate transaction flow data
  static generateTransactionFlowData(transactions) {
    const nodes = new Map();
    const edges = [];

    transactions.forEach(tx => {
      // Add sender node
      if (!nodes.has(tx.from)) {
        nodes.set(tx.from, {
          id: tx.from,
          label: this.truncateAddress(tx.from),
          value: 1,
          group: 'sender'
        });
      } else {
        nodes.get(tx.from).value++;
      }

      // Add receiver node
      if (!nodes.has(tx.to)) {
        nodes.set(tx.to, {
          id: tx.to,
          label: this.truncateAddress(tx.to),
          value: 1,
          group: 'receiver'
        });
      } else {
        nodes.get(tx.to).value++;
      }

      // Add edge
      edges.push({
        from: tx.from,
        to: tx.to,
        value: tx.amount,
        label: `${tx.amount} STRAT`,
        title: `Transaction: ${tx.hash}`
      });
    });

    return this.generateNetworkTopology(Array.from(nodes.values()), edges);
  }

  // Generate heatmap data
  static generateHeatmapData(data, xLabels, yLabels) {
    return {
      x: xLabels,
      y: yLabels,
      z: data,
      type: 'heatmap',
      colorscale: 'Viridis'
    };
  }

  // Generate portfolio distribution data
  static generatePortfolioData(holdings) {
    const labels = holdings.map(h => h.symbol || h.asset);
    const values = holdings.map(h => h.value || h.amount);
    const percentages = this.calculatePercentages(values);

    return {
      chartData: this.generatePieChartData(holdings, labels, values),
      details: holdings.map((h, i) => ({
        asset: h.symbol || h.asset,
        amount: h.amount,
        value: h.value,
        percentage: percentages[i]
      }))
    };
  }

  // Helper: Format date
  static formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Helper: Truncate address
  static truncateAddress(address, length = 8) {
    if (!address || address.length <= length) return address;
    return `${address.substring(0, length / 2)}...${address.substring(address.length - length / 2)}`;
  }

  // Helper: Get nested value from object
  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Helper: Calculate percentages
  static calculatePercentages(values) {
    const total = values.reduce((sum, v) => sum + v, 0);
    return values.map(v => total > 0 ? (v / total) * 100 : 0);
  }

  // Generate sparkline data (mini charts)
  static generateSparklineData(values) {
    return {
      labels: values.map((_, i) => i),
      datasets: [{
        data: values,
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      }]
    };
  }

  // Generate comparison data
  static generateComparisonData(current, previous, labels) {
    return {
      labels,
      datasets: [
        {
          label: 'Current Period',
          data: current,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1
        },
        {
          label: 'Previous Period',
          data: previous,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1
        }
      ]
    };
  }

  // Format large numbers
  static formatNumber(num) {
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

  // Calculate growth rate
  static calculateGrowthRate(current, previous) {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  // Generate trend indicator
  static getTrendIndicator(current, previous) {
    const growth = this.calculateGrowthRate(current, previous);
    return {
      direction: growth > 0 ? 'up' : growth < 0 ? 'down' : 'flat',
      percentage: Math.abs(growth),
      color: growth > 0 ? 'green' : growth < 0 ? 'red' : 'gray'
    };
  }
}

module.exports = VisualizationUtils;
