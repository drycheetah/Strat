import React, { useState, useEffect } from 'react';
import { PaperAirplaneIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { WalletAccount, StratisWallet } from '../utils/wallet';
import { StratisAPI } from '../services/api';
import { AddressBookEntry } from '../utils/storage';

interface SendProps {
  currentAccount: WalletAccount;
  isTestnet: boolean;
  onSuccess: () => void;
  addressBook: AddressBookEntry[];
}

export const Send: React.FC<SendProps> = ({
  currentAccount,
  isTestnet,
  onSuccess,
  addressBook,
}) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('0.0001');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [balance, setBalance] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const api = new StratisAPI(isTestnet);

  useEffect(() => {
    loadBalance();
  }, [currentAccount.address]);

  const loadBalance = async () => {
    try {
      const balanceData = await api.getBalance(currentAccount.address);
      setBalance(balanceData.total);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const validateForm = (): boolean => {
    setError('');

    if (!recipient) {
      setError('Please enter a recipient address');
      return false;
    }

    if (!StratisWallet.validateAddress(recipient, isTestnet)) {
      setError('Invalid recipient address');
      return false;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    const feeNum = parseFloat(fee);
    if (isNaN(feeNum) || feeNum < 0) {
      setError('Please enter a valid fee');
      return false;
    }

    const total = amountNum + feeNum;
    if (total > balance) {
      setError('Insufficient balance');
      return false;
    }

    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) {
      return;
    }

    setShowConfirm(true);
  };

  const confirmSend = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Note: In a real implementation, you would need to:
      // 1. Get UTXOs from the API
      // 2. Build and sign the transaction
      // 3. Broadcast it to the network

      // For now, we'll show a placeholder message
      setError(
        'Transaction signing and broadcasting requires additional implementation. ' +
        'This would typically involve building a transaction from UTXOs, signing it with the private key, ' +
        'and broadcasting it to the network.'
      );

      // Simulated success (remove in production)
      // setSuccess(`Transaction sent successfully! TXID: ${Math.random().toString(36).substring(7)}`);
      // setTimeout(() => {
      //   onSuccess();
      //   setShowConfirm(false);
      //   setRecipient('');
      //   setAmount('');
      //   setNote('');
      // }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  const selectFromAddressBook = (entry: AddressBookEntry) => {
    setRecipient(entry.address);
  };

  const maxAmount = () => {
    const feeNum = parseFloat(fee) || 0.0001;
    const max = Math.max(0, balance - feeNum);
    setAmount(max.toFixed(8));
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Send STRAT</h1>
        <p className="text-gray-400 mt-1">Send STRAT to another address</p>
      </div>

      {!showConfirm ? (
        <div className="card max-w-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 mb-4 flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 rounded-lg p-3 mb-4">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">From Account</label>
              <div className="input-field bg-slate-700 cursor-not-allowed">
                {currentAccount.name} - {currentAccount.address.slice(0, 20)}...
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Available: {balance.toFixed(8)} STRAT
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Recipient Address</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="input-field"
                placeholder="Enter STRAT address"
              />
            </div>

            {addressBook.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Or select from address book</label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {addressBook.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => selectFromAddressBook(entry)}
                      className="text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <div className="font-medium">{entry.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{entry.address}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Amount (STRAT)</label>
                <button
                  onClick={maxAmount}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Max
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                placeholder="0.00000000"
                step="0.00000001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fee (STRAT)</label>
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="input-field"
                placeholder="0.0001"
                step="0.00001"
              />
              <div className="text-xs text-gray-400 mt-1">
                Recommended fee: 0.0001 STRAT
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Note (Optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input-field"
                placeholder="Add a note for your records"
                rows={3}
              />
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Amount:</span>
                <span className="font-medium">{amount || '0.00000000'} STRAT</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Fee:</span>
                <span className="font-medium">{fee} STRAT</span>
              </div>
              <div className="border-t border-slate-600 my-2"></div>
              <div className="flex justify-between">
                <span className="font-medium">Total:</span>
                <span className="font-bold text-lg">
                  {(parseFloat(amount || '0') + parseFloat(fee || '0')).toFixed(8)} STRAT
                </span>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              Review Transaction
            </button>
          </div>
        </div>
      ) : (
        <div className="card max-w-2xl">
          <h2 className="text-2xl font-bold mb-6">Confirm Transaction</h2>

          <div className="bg-slate-700/50 rounded-lg p-4 space-y-4 mb-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">From</div>
              <div className="font-mono text-sm">{currentAccount.address}</div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-1">To</div>
              <div className="font-mono text-sm break-all">{recipient}</div>
            </div>

            <div className="border-t border-slate-600 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Amount:</span>
                <span className="font-medium">{amount} STRAT</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Fee:</span>
                <span className="font-medium">{fee} STRAT</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{(parseFloat(amount) + parseFloat(fee)).toFixed(8)} STRAT</span>
              </div>
            </div>

            {note && (
              <div>
                <div className="text-sm text-gray-400 mb-1">Note</div>
                <div className="text-sm">{note}</div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={confirmSend}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Sending...' : 'Confirm & Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
