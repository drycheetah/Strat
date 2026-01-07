import React, { useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { StratisWallet } from '../utils/wallet';
import { Encryption } from '../utils/encryption';

interface RestoreWalletProps {
  onWalletRestored: (mnemonic: string, password: string) => void;
  onBack: () => void;
}

export const RestoreWallet: React.FC<RestoreWalletProps> = ({ onWalletRestored, onBack }) => {
  const [step, setStep] = useState<'mnemonic' | 'password'>('mnemonic');
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleValidateMnemonic = () => {
    const cleanMnemonic = mnemonic.trim().replace(/\s+/g, ' ');

    if (!StratisWallet.validateMnemonic(cleanMnemonic)) {
      setError('Invalid recovery phrase. Please check and try again.');
      return;
    }

    setMnemonic(cleanMnemonic);
    setError('');
    setStep('password');
  };

  const handleRestore = () => {
    const validation = Encryption.validatePassword(password);
    if (!validation.valid) {
      setError(validation.message || 'Invalid password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    onWalletRestored(mnemonic, password);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="card max-w-2xl w-full">
        {step === 'mnemonic' && (
          <div>
            <ArrowPathIcon className="w-16 h-16 text-primary-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-6 text-center">Restore Wallet</h2>
            <p className="text-gray-400 mb-6 text-center">
              Enter your 24-word recovery phrase to restore your wallet.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recovery Phrase</label>
                <textarea
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  className="input-field min-h-[120px] font-mono"
                  placeholder="Enter your 24-word recovery phrase separated by spaces"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter all 24 words separated by spaces
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={onBack} className="btn-secondary flex-1">
                  Back
                </button>
                <button onClick={handleValidateMnemonic} className="btn-primary flex-1">
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'password' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Set Your Password</h2>
            <p className="text-gray-400 mb-6">
              Choose a strong password to encrypt your restored wallet.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter a strong password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Confirm your password"
                />
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 text-sm text-gray-300">
                <p className="font-medium mb-2">Password Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>At least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('mnemonic')} className="btn-secondary flex-1">
                  Back
                </button>
                <button onClick={handleRestore} className="btn-primary flex-1">
                  Restore Wallet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
