import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useWalletStore } from '../store/walletStore';
import { formatCurrency, formatAddress } from '../utils/formatters';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { wallet, balance, transactions, refreshBalance, loading } =
    useWalletStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (wallet) {
      refreshBalance();
    }
  }, [wallet]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  if (loading && !wallet) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Balance Card */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(balance)} STRAT
        </Text>
        <Text style={styles.balanceUSD}>
          ≈ ${(balance * 0.1).toFixed(2)} USD
        </Text>

        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>Your Address</Text>
          <Text style={styles.address}>
            {wallet ? formatAddress(wallet.address) : ''}
          </Text>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Send' as never)}
        >
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.actionGradient}
          >
            <Icon name="send" size={24} color="#fff" />
            <Text style={styles.actionText}>Send</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Receive' as never)}
        >
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.actionGradient}
          >
            <Icon name="qrcode-scan" size={24} color="#fff" />
            <Text style={styles.actionText}>Receive</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Scan' as never)}
        >
          <LinearGradient
            colors={['#FF9800', '#F57C00']}
            style={styles.actionGradient}
          >
            <Icon name="camera" size={24} color="#fff" />
            <Text style={styles.actionText}>Scan</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('DeFi' as never)}
        >
          <LinearGradient
            colors={['#9C27B0', '#7B1FA2']}
            style={styles.actionGradient}
          >
            <Icon name="finance" size={24} color="#fff" />
            <Text style={styles.actionText}>DeFi</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Transaction History */}
      <View style={styles.historyContainer}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Recent Transactions</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Transactions' as never)}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {transactions.slice(0, 5).map((tx, index) => (
          <TouchableOpacity
            key={index}
            style={styles.transactionItem}
            onPress={() =>
              navigation.navigate('TransactionDetail' as never, {
                transaction: tx
              } as never)
            }
          >
            <View
              style={[
                styles.txIcon,
                { backgroundColor: tx.type === 'received' ? '#4CAF50' : '#F44336' }
              ]}
            >
              <Icon
                name={tx.type === 'received' ? 'arrow-down' : 'arrow-up'}
                size={20}
                color="#fff"
              />
            </View>

            <View style={styles.txDetails}>
              <Text style={styles.txType}>
                {tx.type === 'received' ? 'Received' : 'Sent'}
              </Text>
              <Text style={styles.txDate}>
                {new Date(tx.timestamp).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.txAmountContainer}>
              <Text
                style={[
                  styles.txAmount,
                  { color: tx.type === 'received' ? '#4CAF50' : '#F44336' }
                ]}
              >
                {tx.type === 'received' ? '+' : '-'}
                {formatCurrency(tx.amount)}
              </Text>
              <Text style={styles.txStatus}>{tx.status}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {transactions.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="history" size={48} color="#666" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        )}
      </View>

      {/* Features */}
      <View style={styles.featuresContainer}>
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Staking' as never)}
        >
          <Icon name="layers" size={32} color="#4CAF50" />
          <Text style={styles.featureTitle}>Staking</Text>
          <Text style={styles.featureDescription}>
            Earn rewards by staking STRAT
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('NFT' as never)}
        >
          <Icon name="palette" size={32} color="#2196F3" />
          <Text style={styles.featureTitle}>NFTs</Text>
          <Text style={styles.featureDescription}>Browse your NFT collection</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a'
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 16
  },
  balanceCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    elevation: 5
  },
  balanceLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4
  },
  balanceUSD: {
    color: '#4CAF50',
    fontSize: 18,
    marginBottom: 16
  },
  addressContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)'
  },
  addressLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4
  },
  address: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace'
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 24
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4
  },
  actionGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600'
  },
  historyContainer: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 16
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  historyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  viewAllText: {
    color: '#4CAF50',
    fontSize: 14
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  txDetails: {
    flex: 1
  },
  txType: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4
  },
  txDate: {
    color: '#aaa',
    fontSize: 12
  },
  txAmountContainer: {
    alignItems: 'flex-end'
  },
  txAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  txStatus: {
    color: '#aaa',
    fontSize: 12
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 8
  },
  featuresContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  featureTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4
  },
  featureDescription: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center'
  }
});
