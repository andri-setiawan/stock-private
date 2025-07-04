'use client';

import { useState, useEffect } from 'react';
import orderManager from '@/services/orderManager';
import { AdvancedOrder, OrderStatus, StopLossOrder, TakeProfitOrder, TrailingStopOrder, OCOOrder } from '@/types/orders';

export default function OrderManagementDashboard() {
  const [activeOrders, setActiveOrders] = useState<AdvancedOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<AdvancedOrder[]>([]);
  const [selectedTab, setSelectedTab] = useState<'active' | 'history'>('active');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [refreshKey]);

  const loadOrders = () => {
    setActiveOrders(orderManager.getActiveOrders());
    setOrderHistory(orderManager.getOrderHistory());
  };

  const handleCancelOrder = (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      const success = orderManager.cancelOrder(orderId);
      if (success) {
        setRefreshKey(prev => prev + 1);
        alert('Order cancelled successfully');
      } else {
        alert('Failed to cancel order');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'MARKET': return '⚡';
      case 'STOP_LOSS': return '🛡️';
      case 'TAKE_PROFIT': return '🎯';
      case 'TRAILING_STOP': return '📈';
      case 'OCO': return '🔄';
      default: return '📋';
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'TRIGGERED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOrderCard = (order: AdvancedOrder, isActive: boolean = true) => {
    return (
      <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getOrderTypeIcon(order.type)}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{order.symbol}</h3>
              <p className="text-sm text-gray-600">{order.type.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
            <p className="text-sm text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-500">Quantity</p>
            <p className="font-semibold">{order.quantity} shares</p>
          </div>
          {order.type === 'STOP_LOSS' && (
            <div>
              <p className="text-xs text-gray-500">Stop Price</p>
              <p className="font-semibold text-red-600">{formatCurrency((order as StopLossOrder).stopPrice)}</p>
            </div>
          )}
          {order.type === 'TAKE_PROFIT' && (
            <div>
              <p className="text-xs text-gray-500">Target Price</p>
              <p className="font-semibold text-green-600">{formatCurrency((order as TakeProfitOrder).targetPrice)}</p>
            </div>
          )}
          {order.type === 'TRAILING_STOP' && (
            <div>
              <p className="text-xs text-gray-500">Current Stop</p>
              <p className="font-semibold text-orange-600">{formatCurrency((order as TrailingStopOrder).currentStopPrice)}</p>
            </div>
          )}
        </div>

        {order.type === 'TRAILING_STOP' && (
          <div className="mb-3 p-2 bg-orange-50 rounded border">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Trail Amount:</span>
                <span className="ml-1 font-semibold">{(order as TrailingStopOrder).trailAmount}%</span>
              </div>
              <div>
                <span className="text-gray-600">High Water:</span>
                <span className="ml-1 font-semibold">{formatCurrency((order as TrailingStopOrder).highWaterMark)}</span>
              </div>
            </div>
          </div>
        )}

        {order.type === 'OCO' && (
          <div className="mb-3 p-2 bg-blue-50 rounded border">
            <p className="text-xs text-blue-600 font-medium mb-1">OCO Order Components:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Stop Loss:</span>
                <span className="ml-1 font-semibold">{formatCurrency((order as OCOOrder).stopLossOrder.stopPrice)}</span>
              </div>
              <div>
                <span className="text-gray-600">Take Profit:</span>
                <span className="ml-1 font-semibold">{formatCurrency((order as OCOOrder).takeProfitOrder.targetPrice)}</span>
              </div>
            </div>
          </div>
        )}

        {isActive && order.status === 'ACTIVE' && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleCancelOrder(order.id)}
              className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Cancel Order
            </button>
          </div>
        )}

        {order.triggeredAt && (
          <div className="mt-2 text-xs text-gray-500">
            Triggered: {formatDate(order.triggeredAt)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 pb-20 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Management</h2>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedTab('active')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedTab === 'active'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Orders ({activeOrders.length})
          </button>
          <button
            onClick={() => setSelectedTab('history')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedTab === 'history'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Order History ({orderHistory.length})
          </button>
        </div>
      </div>

      {/* Orders Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {activeOrders.filter(o => o.status === 'ACTIVE').length}
            </p>
            <p className="text-sm text-gray-600">Active Orders</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {orderHistory.filter(o => o.status === 'TRIGGERED').length}
            </p>
            <p className="text-sm text-gray-600">Triggered</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {orderHistory.filter(o => o.status === 'CANCELLED').length}
            </p>
            <p className="text-sm text-gray-600">Cancelled</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {orderHistory.filter(o => o.status === 'EXPIRED').length}
            </p>
            <p className="text-sm text-gray-600">Expired</p>
          </div>
        </div>
      </div>

      {/* Order List */}
      <div className="space-y-4">
        {selectedTab === 'active' ? (
          activeOrders.length > 0 ? (
            activeOrders.map(order => renderOrderCard(order, true))
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Orders</h3>
              <p className="text-gray-600 mb-4">
                You don&apos;t have any active orders. Advanced orders are created automatically when you make trades with stop-loss and take-profit settings.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.href = '/suggestions'}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  💡 View AI Trading Tips
                </button>
                <button
                  onClick={() => window.location.href = '/trade'}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                >
                  🚀 Start Advanced Trading
                </button>
              </div>
            </div>
          )
        ) : (
          orderHistory.length > 0 ? (
            orderHistory
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(order => renderOrderCard(order, false))
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-4xl mb-4">📜</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Order History</h3>
              <p className="text-gray-600">
                Your completed, cancelled, and expired orders will appear here.
              </p>
            </div>
          )
        )}
      </div>

      {/* Order Management Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Order Management Tips</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Active orders are automatically monitored and executed when conditions are met</p>
          <p>• Stop-loss orders help limit your losses if prices move against you</p>
          <p>• Take-profit orders automatically capture gains at your target price</p>
          <p>• Trailing stops adjust automatically to lock in profits as prices rise</p>
          <p>• OCO orders combine stop-loss and take-profit for complete position management</p>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={() => setRefreshKey(prev => prev + 1)}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          🔄 Refresh Orders
        </button>
      </div>
    </div>
  );
}