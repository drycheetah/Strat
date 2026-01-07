import React, { useState, useEffect } from 'react';
import {
  GlobeAltIcon,
  ArrowRightOnRectangleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface SettingsProps {
  isTestnet: boolean;
  onNetworkChange: (isTestnet: boolean) => void;
  onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  isTestnet,
  onNetworkChange,
  onLogout,
}) => {
  const [appVersion, setAppVersion] = useState('');
  const [platform, setPlatform] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNetworkConfirm, setShowNetworkConfirm] = useState(false);
  const [pendingNetwork, setPendingNetwork] = useState(false);

  useEffect(() => {
    loadAppInfo();
  }, []);

  const loadAppInfo = async () => {
    try {
      const version = await window.electronAPI.getAppVersion();
      const platformInfo = await window.electronAPI.getPlatform();
      setAppVersion(version);
      setPlatform(platformInfo);
    } catch (error) {
      console.error('Error loading app info:', error);
    }
  };

  const handleNetworkChange = (newIsTestnet: boolean) => {
    setPendingNetwork(newIsTestnet);
    setShowNetworkConfirm(true);
  };

  const confirmNetworkChange = () => {
    onNetworkChange(pendingNetwork);
    setShowNetworkConfirm(false);
  };

  const confirmLogout = () => {
    onLogout();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your wallet settings</p>
      </div>

      <div className="space-y-6">
        {/* Network Settings */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="bg-primary-500/20 p-3 rounded-lg">
              <GlobeAltIcon className="w-6 h-6 text-primary-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Network</h2>
              <p className="text-gray-400 mb-4">
                Choose which network to connect to
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                  <input
                    type="radio"
                    name="network"
                    checked={!isTestnet}
                    onChange={() => handleNetworkChange(false)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <div>
                    <div className="font-medium">Mainnet</div>
                    <div className="text-sm text-gray-400">
                      Real STRAT transactions and balances
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                  <input
                    type="radio"
                    name="network"
                    checked={isTestnet}
                    onChange={() => handleNetworkChange(true)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <div>
                    <div className="font-medium">Testnet</div>
                    <div className="text-sm text-gray-400">
                      Test network for development purposes
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* App Information */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="bg-slate-700 p-3 rounded-lg">
              <InformationCircleIcon className="w-6 h-6 text-gray-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">About</h2>
              <div className="space-y-2 text-gray-300">
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-gray-400">Version</span>
                  <span className="font-medium">{appVersion || '1.0.0'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-gray-400">Platform</span>
                  <span className="font-medium capitalize">{platform || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-gray-400">Network</span>
                  <span className="font-medium">{isTestnet ? 'Testnet' : 'Mainnet'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="bg-red-500/20 p-3 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2 text-red-400">Danger Zone</h2>
              <p className="text-gray-400 mb-4">
                Irreversible and destructive actions
              </p>

              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="btn-danger flex items-center gap-2"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Lock Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-6">
          <h3 className="font-bold text-yellow-400 mb-3">Important Security Notes</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>
                Never share your password or recovery phrase with anyone
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>
                Make sure to backup your recovery phrase in a secure location
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>
                Always verify addresses before sending transactions
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>
                Keep your computer and wallet software up to date
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Network Change Confirmation Modal */}
      {showNetworkConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Confirm Network Change</h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to switch to {pendingNetwork ? 'Testnet' : 'Mainnet'}?
              Your wallet will reload with the new network settings.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNetworkConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={confirmNetworkChange} className="btn-primary flex-1">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Lock Wallet</h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to lock your wallet? You will need to enter your password
              again to access it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={confirmLogout} className="btn-danger flex-1">
                Lock Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
