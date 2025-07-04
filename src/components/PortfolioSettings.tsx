'use client';

import { useState } from 'react';
import { usePortfolioStore } from '@/store/portfolio';

export default function PortfolioSettings() {
  // Use proper Zustand selectors for reactive updates
  const resetPortfolio = usePortfolioStore(state => state.resetPortfolio);
  const topUpCash = usePortfolioStore(state => state.topUpCash);
  const cashBalance = usePortfolioStore(state => state.cashBalance);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showTopUpForm, setShowTopUpForm] = useState(false);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    try {
      await topUpCash(amount);
      setTopUpAmount('');
      setShowTopUpForm(false);
      alert(`Successfully added $${amount.toFixed(2)} to your portfolio!`);
    } catch {
      alert('Failed to top up cash. Please try again.');
    }
  };

  const handleReset = async () => {
    try {
      await resetPortfolio();
      setShowResetConfirm(false);
      alert('Portfolio has been reset to $10,000!');
    } catch {
      alert('Failed to reset portfolio. Please try again.');
    }
  };

  const presetAmounts = [1000, 5000, 10000, 25000];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Portfolio Settings</h2>
        <div className="text-sm text-gray-600">
          Current Cash: <span className="font-semibold text-green-600">${cashBalance.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Up Cash Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">💰 Add Virtual Cash</h3>
          
          {!showTopUpForm ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Add more virtual money to your portfolio for additional trading.
              </p>
              <button
                onClick={() => setShowTopUpForm(true)}
                className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                Add Cash
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount to Add
                </label>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="0"
                  step="0.01"
                />
              </div>
              
              {/* Preset Amounts */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Quick amounts:</p>
                <div className="grid grid-cols-2 gap-2">
                  {presetAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTopUpAmount(amount.toString())}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
                    >
                      ${amount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleTopUp}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Add Cash
                </button>
                <button
                  onClick={() => {
                    setShowTopUpForm(false);
                    setTopUpAmount('');
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reset Portfolio Section */}
        <div className="border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-700 mb-3">🔄 Reset Portfolio</h3>
          
          {!showResetConfirm ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Reset your portfolio to the initial $10,000 and clear all transactions.
              </p>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Reset Portfolio
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  ⚠️ <strong>Warning:</strong> This action cannot be undone! 
                  All your holdings and transaction history will be permanently deleted.
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold"
                >
                  Confirm Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-800 mb-1">📋 Portfolio Management Tips</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• The system now prevents overspending - you cannot buy more than your available cash</li>
          <li>• Add virtual cash when you need more buying power for larger positions</li>
          <li>• Reset your portfolio if you want to start fresh with a clean slate</li>
          <li>• All transactions and holdings are automatically saved in your browser</li>
        </ul>
      </div>
    </div>
  );
}