import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useWalletStore } from '../store/walletStore';
import QRService from '../services/QRService';

export default function SendScreen() {
  const navigation = useNavigation();
  const { wallet, balance, sendTransaction, loading } = useWalletStore();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [sending, setSending] = useState(false);

  const handleScan = () => {
    navigation.navigate('ScanQR' as never, {
      onScan: (data: any) => {
        if (data.address) {
          setRecipient(data.address);
        }
        if (data.amount) {
          setAmount(data.amount.toString());
        }
        if (data.memo) {
          setMemo(data.memo);
        }
      }
    } as never);
  };

  const handleMaxAmount = () => {
    // Leave some for fees
    const maxAmount = Math.max(0, balance - 0.001);
    setAmount(maxAmount.toFixed(8));
  };

  const validateInputs = (): boolean => {
    if (!recipient) {
      Alert.alert('Error', 'Please enter recipient address');
      return false;
    }

    if (!QRService.validateAddress(recipient)) {
      Alert.alert('Error', 'Invalid recipient address');
      return false;
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter valid amount');
      return false;
    }

    if (amountNum > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return false;
    }

    return true;
  };

  const handleSend = async () => {
    if (!validateInputs()) return;

    const amountNum = parseFloat(amount);
    const fee = 0.0001; // Fixed fee for now

    Alert.alert(
      'Confirm Transaction',
      `Send ${amountNum} STRAT to ${recipient.substring(0, 10)}...?\n\nFee: ${fee} STRAT\nTotal: ${(amountNum + fee).toFixed(8)} STRAT`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setSending(true);
              const txHash = await sendTransaction(recipient, amountNum);

              Alert.alert(
                'Success',
                `Transaction sent!\nHash: ${txHash.substring(0, 16)}...`,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to send transaction'
              );
            } finally {
              setSending(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send STRAT</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Balance Display */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>{balance.toFixed(8)} STRAT</Text>
        <Text style={styles.balanceUSD}>≈ ${(balance * 0.1).toFixed(2)} USD</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Recipient */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient Address</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="STRAT..."
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScan}
            >
              <Icon name="qrcode-scan" size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Amount</Text>
            <TouchableOpacity onPress={handleMaxAmount}>
              <Text style={styles.maxButton}>MAX</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
            <Text style={styles.currency}>STRAT</Text>
          </View>
        </View>

        {/* Memo (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Memo (Optional)</Text>
          <TextInput
            style={[styles.input, styles.memoInput]}
            value={memo}
            onChangeText={setMemo}
            placeholder="Add a note..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Fee Info */}
        <View style={styles.feeCard}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Network Fee</Text>
            <Text style={styles.feeValue}>0.0001 STRAT</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Total</Text>
            <Text style={styles.feeTotalValue}>
              {amount ? (parseFloat(amount) + 0.0001).toFixed(8) : '0.0000'} STRAT
            </Text>
          </View>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, (sending || loading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={sending || loading}
        >
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.sendGradient}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="send" size={24} color="#fff" />
                <Text style={styles.sendButtonText}>Send Transaction</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  balanceCard: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  balanceLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 4
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4
  },
  balanceUSD: {
    color: '#4CAF50',
    fontSize: 16
  },
  form: {
    padding: 16
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600'
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  maxButton: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 16
  },
  memoInput: {
    textAlignVertical: 'top',
    minHeight: 80
  },
  scanButton: {
    padding: 8
  },
  currency: {
    color: '#aaa',
    fontSize: 16,
    marginLeft: 8
  },
  feeCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  feeLabel: {
    color: '#aaa',
    fontSize: 14
  },
  feeValue: {
    color: '#fff',
    fontSize: 14
  },
  feeTotalValue: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold'
  },
  sendButton: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
