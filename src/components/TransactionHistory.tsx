'use client';

import { usePortfolioStore } from '@/store/portfolio';
import { useClientTime, useIsClient } from '@/hooks/useClientTime';

export default function TransactionHistory() {
  const { getTransactionHistory } = usePortfolioStore();
  const transactions = getTransactionHistory();
  const isClient = useIsClient();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const TransactionTimeDisplay = ({ timestamp }: { timestamp: Date }) => {
    const { formattedTime } = useClientTime(timestamp.toISOString(), { showTime: true, showDate: true });
    return (
      <p className="text-sm text-gray-600">{formattedTime || '...'}</p>
    );
  };

  return (
    <div className="p-4 pb-20">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaction History</h2>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-500 mb-2">No transactions yet</p>
            <p className="text-sm text-gray-400">Your trading history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      transaction.type === 'BUY' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{transaction.symbol}</h4>
                      <p className="text-sm text-gray-600">
                        {transaction.quantity} shares @ {formatCurrency(transaction.price)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(transaction.totalAmount)}</p>
                    {isClient && (
                      <TransactionTimeDisplay timestamp={transaction.timestamp} />
                    )}
                  </div>
                </div>

                {transaction.aiRecommendation && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-900">🤖 AI Recommendation</span>
                      <span className="text-sm text-blue-700">
                        {transaction.aiRecommendation.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-blue-800">
                      {transaction.aiRecommendation.reasoning}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {transactions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="font-semibold text-gray-900">
                  {transactions.filter(t => t.type === 'BUY').length}
                </p>
                <p className="text-gray-600">Buys</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {transactions.filter(t => t.type === 'SELL').length}
                </p>
                <p className="text-gray-600">Sells</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {transactions.reduce((sum, t) => sum + t.totalAmount, 0).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-gray-600">Total Volume</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}