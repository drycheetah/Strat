import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../providers/price_provider.dart';

class ChartsScreen extends StatefulWidget {
  const ChartsScreen({super.key});

  @override
  State<ChartsScreen> createState() => _ChartsScreenState();
}

class _ChartsScreenState extends State<ChartsScreen> {
  String _selectedTimeframe = '24H';
  String _chartType = 'candlestick';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PriceProvider>().loadPriceData(_selectedTimeframe);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Price Charts'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<PriceProvider>().loadPriceData(_selectedTimeframe);
            },
          ),
        ],
      ),
      body: Consumer<PriceProvider>(
        builder: (context, priceProvider, child) {
          if (priceProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          return SingleChildScrollView(
            child: Column(
              children: [
                // Price Header
                Container(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'STRAT/USD',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '\$${priceProvider.currentPrice.toStringAsFixed(4)}',
                                style: const TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF4CAF50),
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: priceProvider.priceChange >= 0
                                  ? const Color(0xFF4CAF50)
                                  : const Color(0xFFF44336),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${priceProvider.priceChange >= 0 ? '+' : ''}${priceProvider.priceChange.toStringAsFixed(2)}%',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildStatItem('24h High', '\$${priceProvider.high24h.toStringAsFixed(4)}'),
                          _buildStatItem('24h Low', '\$${priceProvider.low24h.toStringAsFixed(4)}'),
                          _buildStatItem('Volume', '\$${_formatVolume(priceProvider.volume24h)}'),
                        ],
                      ),
                    ],
                  ),
                ),

                // Timeframe Selector
                Container(
                  height: 50,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: ['1H', '24H', '7D', '1M', '3M', '1Y', 'ALL']
                        .map((timeframe) => _buildTimeframeButton(timeframe))
                        .toList(),
                  ),
                ),

                // Chart Type Selector
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      _buildChartTypeButton('Line', 'line', Icons.show_chart),
                      const SizedBox(width: 8),
                      _buildChartTypeButton('Candlestick', 'candlestick', Icons.candlestick_chart),
                      const SizedBox(width: 8),
                      _buildChartTypeButton('Area', 'area', Icons.area_chart),
                    ],
                  ),
                ),

                // Chart
                Container(
                  height: 300,
                  padding: const EdgeInsets.all(16),
                  child: _buildChart(priceProvider),
                ),

                // Market Info
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Market Information',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildInfoRow('Market Cap', '\$${_formatVolume(priceProvider.marketCap)}'),
                      _buildInfoRow('Circulating Supply', '${_formatVolume(priceProvider.circulatingSupply)} STRAT'),
                      _buildInfoRow('Total Supply', '${_formatVolume(priceProvider.totalSupply)} STRAT'),
                      _buildInfoRow('All-Time High', '\$${priceProvider.allTimeHigh.toStringAsFixed(4)}'),
                      _buildInfoRow('All-Time Low', '\$${priceProvider.allTimeLow.toStringAsFixed(4)}'),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Colors.grey,
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildTimeframeButton(String timeframe) {
    final isSelected = _selectedTimeframe == timeframe;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ElevatedButton(
        onPressed: () {
          setState(() => _selectedTimeframe = timeframe);
          context.read<PriceProvider>().loadPriceData(timeframe);
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: isSelected
              ? const Color(0xFF4CAF50)
              : const Color(0xFF1a1a1a),
          foregroundColor: isSelected ? Colors.white : Colors.grey,
        ),
        child: Text(timeframe),
      ),
    );
  }

  Widget _buildChartTypeButton(String label, String type, IconData icon) {
    final isSelected = _chartType == type;

    return Expanded(
      child: ElevatedButton.icon(
        onPressed: () => setState(() => _chartType = type),
        icon: Icon(icon, size: 16),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: isSelected
              ? const Color(0xFF4CAF50)
              : const Color(0xFF1a1a1a),
          foregroundColor: isSelected ? Colors.white : Colors.grey,
        ),
      ),
    );
  }

  Widget _buildChart(PriceProvider priceProvider) {
    switch (_chartType) {
      case 'line':
        return LineChart(
          LineChartData(
            gridData: FlGridData(show: true, drawVerticalLine: false),
            titlesData: FlTitlesData(show: false),
            borderData: FlBorderData(show: false),
            lineBarsData: [
              LineChartBarData(
                spots: priceProvider.priceData
                    .asMap()
                    .entries
                    .map((e) => FlSpot(e.key.toDouble(), e.value))
                    .toList(),
                isCurved: true,
                color: const Color(0xFF4CAF50),
                barWidth: 2,
                dotData: FlDotData(show: false),
                belowBarData: BarAreaData(show: false),
              ),
            ],
          ),
        );
      case 'area':
        return LineChart(
          LineChartData(
            gridData: FlGridData(show: true, drawVerticalLine: false),
            titlesData: FlTitlesData(show: false),
            borderData: FlBorderData(show: false),
            lineBarsData: [
              LineChartBarData(
                spots: priceProvider.priceData
                    .asMap()
                    .entries
                    .map((e) => FlSpot(e.key.toDouble(), e.value))
                    .toList(),
                isCurved: true,
                color: const Color(0xFF4CAF50),
                barWidth: 2,
                dotData: FlDotData(show: false),
                belowBarData: BarAreaData(
                  show: true,
                  color: const Color(0xFF4CAF50).withOpacity(0.3),
                ),
              ),
            ],
          ),
        );
      default:
        return const Center(
          child: Text('Candlestick chart coming soon'),
        );
    }
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(color: Colors.grey),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  String _formatVolume(double volume) {
    if (volume >= 1000000000) {
      return '${(volume / 1000000000).toStringAsFixed(2)}B';
    } else if (volume >= 1000000) {
      return '${(volume / 1000000).toStringAsFixed(2)}M';
    } else if (volume >= 1000) {
      return '${(volume / 1000).toStringAsFixed(2)}K';
    }
    return volume.toStringAsFixed(2);
  }
}
