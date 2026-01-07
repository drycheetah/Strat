import React, { useState } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';

interface UnlockWalletProps {
  onUnlock: (password: string) => Promise<void>;
  onRestore: () => void;
}

export const UnlockWallet: React.FC<UnlockWalletProps> = ({ onUnlock, onRestore }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onUnlock(password);
    } catch (err: any) {
      setError(err.message || 'Failed to unlock wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <LockClosedIcon className="w-20 h-20 text-primary-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Unlock Wallet</h1>
          <p className="text-gray-400 mt-2">Enter your password to access your wallet</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Enter your password"
              disabled={loading}
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading || !password}>
            {loading ? 'Unlocking...' : 'Unlock Wallet'}
          </button>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={onRestore}
              className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
            >
              Restore wallet from recovery phrase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
