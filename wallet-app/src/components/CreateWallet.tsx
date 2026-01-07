import React, { useState } from 'react';
import { ShieldCheckIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { StratisWallet } from '../utils/wallet';
import { Encryption } from '../utils/encryption';

interface CreateWalletProps {
  onWalletCreated: (mnemonic: string, password: string) => void;
}

export const CreateWallet: React.FC<CreateWalletProps> = ({ onWalletCreated }) => {
  const [step, setStep] = useState<'intro' | 'password' | 'mnemonic' | 'verify'>('intro');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [verifyWords, setVerifyWords] = useState<{ [key: number]: string }>({});
  const [randomIndices, setRandomIndices] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleCreateWallet = () => {
    const validation = Encryption.validatePassword(password);
    if (!validation.valid) {
      setError(validation.message || 'Invalid password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const newMnemonic = StratisWallet.generateMnemonic();
    setMnemonic(newMnemonic);
    setMnemonicWords(newMnemonic.split(' '));

    // Select 3 random words to verify
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * 24);
      if (!indices.includes(idx)) {
        indices.push(idx);
      }
    }
    setRandomIndices(indices.sort((a, b) => a - b));

    setError('');
    setStep('mnemonic');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = () => {
    let isValid = true;
    for (const idx of randomIndices) {
      if (verifyWords[idx]?.toLowerCase() !== mnemonicWords[idx].toLowerCase()) {
        isValid = false;
        break;
      }
    }

    if (isValid) {
      onWalletCreated(mnemonic, password);
    } else {
      setError('Verification failed. Please check the words and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="card max-w-2xl w-full">
        {step === 'intro' && (
          <div className="text-center">
            <ShieldCheckIcon className="w-20 h-20 text-primary-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">Create New Wallet</h1>
            <p className="text-gray-400 mb-8">
              Create a new Stratis wallet with a secure HD seed phrase.
            </p>
            <button onClick={() => setStep('password')} className="btn-primary w-full">
              Get Started
            </button>
          </div>
        )}

        {step === 'password' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Set Your Password</h2>
            <p className="text-gray-400 mb-6">
              Choose a strong password to encrypt your wallet. This password will be required every time
              you open the wallet.
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
                <button onClick={() => setStep('intro')} className="btn-secondary flex-1">
                  Back
                </button>
                <button onClick={handleCreateWallet} className="btn-primary flex-1">
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'mnemonic' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Your Recovery Phrase</h2>
            <p className="text-gray-400 mb-6">
              Write down these 24 words in order and keep them safe. This is the ONLY way to recover
              your wallet if you lose access.
            </p>

            <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-4 mb-6">
              <p className="font-bold">Warning!</p>
              <p className="text-sm mt-1">
                Never share your recovery phrase with anyone. Anyone with these words can access your
                funds.
              </p>
            </div>

            <div className="bg-slate-700 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {mnemonicWords.map((word, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-800 rounded px-3 py-2">
                    <span className="text-gray-500 text-sm">{idx + 1}.</span>
                    <span className="font-mono">{word}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-5 h-5" />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>

            <button onClick={() => setStep('verify')} className="btn-primary w-full">
              I've Written Down My Recovery Phrase
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Verify Recovery Phrase</h2>
            <p className="text-gray-400 mb-6">
              To ensure you've written down your recovery phrase correctly, please enter the following
              words:
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              {randomIndices.map((idx) => (
                <div key={idx}>
                  <label className="block text-sm font-medium mb-2">Word #{idx + 1}</label>
                  <input
                    type="text"
                    value={verifyWords[idx] || ''}
                    onChange={(e) =>
                      setVerifyWords({ ...verifyWords, [idx]: e.target.value })
                    }
                    className="input-field"
                    placeholder={`Enter word #${idx + 1}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('mnemonic')} className="btn-secondary flex-1">
                Back
              </button>
              <button onClick={handleVerify} className="btn-primary flex-1">
                Verify & Create Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
