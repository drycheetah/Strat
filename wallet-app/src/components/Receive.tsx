import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { WalletAccount } from '../utils/wallet';

interface ReceiveProps {
  currentAccount: WalletAccount;
}

export const Receive: React.FC<ReceiveProps> = ({ currentAccount }) => {
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');

  const copyAddress = () => {
    navigator.clipboard.writeText(currentAccount.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const canvas = document.getElementById('qr-code') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `strat-address-${currentAccount.address.slice(0, 10)}.png`;
      link.href = url;
      link.click();
    }
  };

  // Generate URI with optional amount and label
  const generateUri = () => {
    let uri = `stratis:${currentAccount.address}`;
    const params: string[] = [];

    if (amount) {
      params.push(`amount=${amount}`);
    }
    if (label) {
      params.push(`label=${encodeURIComponent(label)}`);
    }

    if (params.length > 0) {
      uri += `?${params.join('&')}`;
    }

    return uri;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Receive STRAT</h1>
        <p className="text-gray-400 mt-1">Share your address to receive STRAT</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code Section */}
        <div className="card">
          <h2 className="text-xl font-bold mb-6">QR Code</h2>

          <div className="bg-white p-6 rounded-lg mb-6 flex justify-center">
            <QRCodeCanvas
              id="qr-code"
              value={generateUri()}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>

          <button
            onClick={downloadQR}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Download QR Code
          </button>
        </div>

        {/* Address Section */}
        <div className="card">
          <h2 className="text-xl font-bold mb-6">Your Address</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Account</label>
              <div className="input-field bg-slate-700">
                {currentAccount.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <div className="bg-slate-700 rounded-lg p-4 break-all font-mono text-sm">
                {currentAccount.address}
              </div>
              <button
                onClick={copyAddress}
                className="mt-2 btn-primary w-full flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-5 h-5" />
                    Copy Address
                  </>
                )}
              </button>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h3 className="font-bold mb-4">Optional Payment Details</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Amount (STRAT) - Optional
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field"
                    placeholder="0.00000000"
                    step="0.00000001"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Include a specific amount in the QR code
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Label - Optional
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="input-field"
                    placeholder="Payment for..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Add a label to help identify this payment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card mt-8">
        <h2 className="text-xl font-bold mb-4">How to Receive STRAT</h2>
        <div className="space-y-3 text-gray-300">
          <div className="flex items-start gap-3">
            <div className="bg-primary-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
              1
            </div>
            <p>Share your address or QR code with the person sending you STRAT</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-primary-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
              2
            </div>
            <p>Wait for the transaction to be broadcast to the network</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-primary-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
              3
            </div>
            <p>Your balance will update once the transaction is confirmed</p>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mt-6">
          <p className="text-yellow-400 text-sm">
            <strong>Note:</strong> Always verify the address before sending funds. Transactions on
            the blockchain are irreversible.
          </p>
        </div>
      </div>
    </div>
  );
};
