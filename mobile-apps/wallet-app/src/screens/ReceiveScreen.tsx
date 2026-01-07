import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Share,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation } from '@react-navigation/native';
import { useWalletStore } from '../store/walletStore';
import QRService from '../services/QRService';
import * as Clipboard from 'expo-clipboard';

export default function ReceiveScreen() {
  const navigation = useNavigation();
  const { wallet } = useWalletStore();

  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [qrData, setQrData] = useState(wallet?.address || '');

  const generateQR = () => {
    if (!wallet) return;

    const amountNum = amount ? parseFloat(amount) : undefined;
    const data = QRService.generatePaymentQR(
      wallet.address,
      amountNum,
      memo || undefined
    );

    setQrData(data);
  };

  const handleCopyAddress = async () => {
    if (wallet) {
      await Clipboard.setStringAsync(wallet.address);
      Alert.alert('Success', 'Address copied to clipboard');
    }
  };

  const handleShare = async () => {
    if (!wallet) return;

    try {
      await Share.share({
        message: `Send STRAT to: ${wallet.address}`,
        title: 'My STRAT Address'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  React.useEffect(() => {
    generateQR();
  }, [amount, memo]);

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
        <Text style={styles.headerTitle}>Receive STRAT</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* QR Code */}
      <View style={styles.qrContainer}>
        <View style={styles.qrCard}>
          <QRCode
            value={qrData}
            size={250}
            color="#000"
            backgroundColor="#fff"
            logo={require('../assets/logo.png')}
            logoSize={50}
            logoBackgroundColor="#fff"
          />
        </View>
        <Text style={styles.qrLabel}>Scan to send STRAT</Text>
      </View>

      {/* Address */}
      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>Your Address</Text>
        <TouchableOpacity
          style={styles.addressCard}
          onPress={handleCopyAddress}
        >
          <Text style={styles.address} numberOfLines={1}>
            {wallet?.address}
          </Text>
          <Icon name="content-copy" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Payment Request Form */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>Request Specific Amount (Optional)</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Memo</Text>
          <TextInput
            style={[styles.input, styles.memoInput]}
            value={memo}
            onChangeText={setMemo}
            placeholder="What's this for?"
            placeholderTextColor="#666"
            multiline
            numberOfLines={2}
          />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCopyAddress}
        >
          <LinearGradient
            colors={['#2196F3', '#1976D2']}
            style={styles.actionGradient}
          >
            <Icon name="content-copy" size={24} color="#fff" />
            <Text style={styles.actionText}>Copy Address</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
        >
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.actionGradient}
          >
            <Icon name="share-variant" size={24} color="#fff" />
            <Text style={styles.actionText}>Share</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Icon name="information" size={20} color="#2196F3" />
        <Text style={styles.infoText}>
          Only send STRAT to this address. Sending other cryptocurrencies may
          result in permanent loss.
        </Text>
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
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 24
  },
  qrCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  qrLabel: {
    color: '#aaa',
    fontSize: 14
  },
  addressContainer: {
    paddingHorizontal: 16,
    marginBottom: 24
  },
  addressLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600'
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  address: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
    marginRight: 12
  },
  form: {
    paddingHorizontal: 16,
    marginBottom: 24
  },
  formTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600'
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
    textAlignVertical: 'top',
    minHeight: 60
  },
  currency: {
    color: '#aaa',
    fontSize: 16,
    marginLeft: 8
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden'
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
    gap: 12
  },
  infoText: {
    flex: 1,
    color: '#2196F3',
    fontSize: 12,
    lineHeight: 18
  }
});
