import React, { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { AddressBookEntry } from '../utils/storage';
import { StratisWallet } from '../utils/wallet';

interface AddressBookProps {
  entries: AddressBookEntry[];
  onUpdate: (entries: AddressBookEntry[]) => void;
  isTestnet: boolean;
}

export const AddressBook: React.FC<AddressBookProps> = ({
  entries,
  onUpdate,
  isTestnet,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    note: '',
  });
  const [error, setError] = useState('');

  const resetForm = () => {
    setFormData({ name: '', address: '', note: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = () => {
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (!formData.address.trim()) {
      setError('Please enter an address');
      return;
    }

    if (!StratisWallet.validateAddress(formData.address, isTestnet)) {
      setError('Invalid STRAT address');
      return;
    }

    if (editingId) {
      // Update existing entry
      const updatedEntries = entries.map((entry) =>
        entry.id === editingId
          ? {
              ...entry,
              name: formData.name,
              address: formData.address,
              note: formData.note,
            }
          : entry
      );
      onUpdate(updatedEntries);
    } else {
      // Add new entry
      const newEntry: AddressBookEntry = {
        id: Date.now().toString(),
        name: formData.name,
        address: formData.address,
        note: formData.note,
        createdAt: Date.now(),
      };
      onUpdate([...entries, newEntry]);
    }

    resetForm();
  };

  const handleEdit = (entry: AddressBookEntry) => {
    setFormData({
      name: entry.name,
      address: entry.address,
      note: entry.note || '',
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this address?')) {
      const updatedEntries = entries.filter((entry) => entry.id !== id);
      onUpdate(updatedEntries);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Address Book</h1>
          <p className="text-gray-400 mt-1">Save and manage frequently used addresses</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Address
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? 'Edit Address' : 'Add New Address'}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g., John's Wallet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input-field font-mono"
                placeholder="STRAT address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Note (Optional)</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="input-field"
                placeholder="Add a note..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={resetForm} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleSubmit} className="btn-primary flex-1">
                {editingId ? 'Update' : 'Add'} Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address List */}
      {entries.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpenIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No addresses saved yet</p>
          <p className="text-gray-500 text-sm mt-2">
            Add frequently used addresses for quick access
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {entries.map((entry) => (
            <div key={entry.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">{entry.name}</h3>
                  <code className="text-sm text-gray-400 break-all font-mono">
                    {entry.address}
                  </code>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-2 text-gray-400 hover:text-primary-400 transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {entry.note && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-sm text-gray-400">{entry.note}</p>
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500">
                Added {new Date(entry.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
