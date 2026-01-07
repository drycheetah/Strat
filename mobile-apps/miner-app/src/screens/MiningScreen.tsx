import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import MiningService from '../services/MiningService';
import { keepAwake, allowSleepAgain } from 'expo-keep-awake';

const screenWidth = Dimensions.get('window').width;

export default function MiningScreen() {
  const [isMining, setIsMining] = useState(false);
  const [stats, setStats] = useState(MiningService.getStats());
  const [hashHistory, setHashHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [power, setPower] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    const interval = setInterval(() => {
      const currentStats = MiningService.getStats();
      setStats(currentStats);

      // Update hash history for chart
      setHashHistory((prev) => {
        const newHistory = [...prev.slice(1), currentStats.hashRate];
        return newHistory;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleMining = async () => {
    if (isMining) {
      await MiningService.stopMining();
      allowSleepAgain();
      setIsMining(false);
    } else {
      const started = await MiningService.startMining();
      if (started) {
        keepAwake();
        setIsMining(true);
      } else {
        Alert.alert('Error', 'Failed to start mining');
      }
    }
  };

  const changePower = (newPower: 'low' | 'medium' | 'high') => {
    setPower(newPower);
    MiningService.setPower(newPower);
  };

  const formatHashRate = (rate: number): string => {
    if (rate >= 1000000) {
      return `${(rate / 1000000).toFixed(2)} MH/s`;
    } else if (rate >= 1000) {
      return `${(rate / 1000).toFixed(2)} KH/s`;
    }
    return `${rate.toFixed(2)} H/s`;
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Mining Status Card */}
      <LinearGradient
        colors={
          isMining
            ? ['#4CAF50', '#45a049', '#388E3C']
            : ['#1a1a2e', '#16213e', '#0f3460']
        }
        style={styles.statusCard}
      >
        <View style={styles.statusHeader}>
          <Icon
            name={isMining ? 'cpu-64-bit' : 'power'}
            size={48}
            color="#fff"
          />
          <Text style={styles.statusText}>
            {isMining ? 'Mining Active' : 'Mining Stopped'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            { backgroundColor: isMining ? '#F44336' : '#4CAF50' }
          ]}
          onPress={toggleMining}
        >
          <Text style={styles.toggleButtonText}>
            {isMining ? 'Stop Mining' : 'Start Mining'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Hash Rate Chart */}
      {isMining && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Hash Rate</Text>
          <LineChart
            data={{
              labels: ['', '', '', '', '', ''],
              datasets: [
                {
                  data: hashHistory
                }
              ]
            }}
            width={screenWidth - 32}
            height={200}
            chartConfig={{
              backgroundColor: '#1a1a1a',
              backgroundGradientFrom: '#1a1a1a',
              backgroundGradientTo: '#0f3460',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#4CAF50'
              }
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Statistics Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Icon name="speedometer" size={32} color="#4CAF50" />
          <Text style={styles.statValue}>{formatHashRate(stats.hashRate)}</Text>
          <Text style={styles.statLabel}>Hash Rate</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="cube-outline" size={32} color="#2196F3" />
          <Text style={styles.statValue}>{stats.blocksFound}</Text>
          <Text style={styles.statLabel}>Blocks Found</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="cash-multiple" size={32} color="#FF9800" />
          <Text style={styles.statValue}>{stats.earnings.toFixed(4)}</Text>
          <Text style={styles.statLabel}>STRAT Earned</Text>
        </View>

        <View style={styles.statCard}>
          <Icon name="timer-outline" size={32} color="#9C27B0" />
          <Text style={styles.statValue}>{formatUptime(stats.uptime)}</Text>
          <Text style={styles.statLabel}>Uptime</Text>
        </View>
      </View>

      {/* Power Settings */}
      <View style={styles.powerContainer}>
        <Text style={styles.sectionTitle}>Mining Power</Text>
        <Text style={styles.sectionDescription}>
          Higher power means faster mining but more battery usage
        </Text>

        <View style={styles.powerButtons}>
          <TouchableOpacity
            style={[
              styles.powerButton,
              power === 'low' && styles.powerButtonActive
            ]}
            onPress={() => changePower('low')}
          >
            <Icon
              name="battery-50"
              size={24}
              color={power === 'low' ? '#fff' : '#aaa'}
            />
            <Text
              style={[
                styles.powerButtonText,
                power === 'low' && styles.powerButtonTextActive
              ]}
            >
              Low
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.powerButton,
              power === 'medium' && styles.powerButtonActive
            ]}
            onPress={() => changePower('medium')}
          >
            <Icon
              name="battery-70"
              size={24}
              color={power === 'medium' ? '#fff' : '#aaa'}
            />
            <Text
              style={[
                styles.powerButtonText,
                power === 'medium' && styles.powerButtonTextActive
              ]}
            >
              Medium
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.powerButton,
              power === 'high' && styles.powerButtonActive
            ]}
            onPress={() => changePower('high')}
          >
            <Icon
              name="battery-charging-100"
              size={24}
              color={power === 'high' ? '#fff' : '#aaa'}
            />
            <Text
              style={[
                styles.powerButtonText,
                power === 'high' && styles.powerButtonTextActive
              ]}
            >
              High
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Additional Stats */}
      <View style={styles.additionalStats}>
        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Total Hashes</Text>
          <Text style={styles.statRowValue}>
            {stats.totalHashes.toLocaleString()}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Difficulty</Text>
          <Text style={styles.statRowValue}>{stats.difficulty}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Mining Mode</Text>
          <Text style={styles.statRowValue}>
            {MiningService.getCurrentPool() ? 'Pool' : 'Solo'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  statusCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 16
  },
  statusText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8
  },
  toggleButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  chartContainer: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 16
  },
  chartTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  chart: {
    borderRadius: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    margin: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8
  },
  statLabel: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4
  },
  powerContainer: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 16
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  sectionDescription: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 16
  },
  powerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  powerButton: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#333'
  },
  powerButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50'
  },
  powerButtonText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4
  },
  powerButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold'
  },
  additionalStats: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 32
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  statRowLabel: {
    color: '#aaa',
    fontSize: 14
  },
  statRowValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  }
});
