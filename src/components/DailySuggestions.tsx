'use client';

import React, { useState, useEffect } from 'react';
import { usePortfolioStore } from '@/store/portfolio';
import { useClientTime, useIsClient } from '@/hooks/useClientTime';

interface AIRecommendation {
  symbol: string;
  name: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  currentPrice: number;
  targetPrice: number;
  expectedReturn: number;
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe: 'SHORT' | 'MEDIUM' | 'LONG';
  keyFactors: string[];
  marketData: {
    volume: number;
    changePercent: number;
    volatility: number;
    sector: string;
  };
  generatedAt: string;
}

interface MarketAnalysis {
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  volatilityIndex: number;
  summary: string;
  riskWarnings: string[];
}

interface DailySuggestionsData {
  recommendations: AIRecommendation[];
  marketAnalysis: MarketAnalysis;
  topOpportunities: AIRecommendation[];
  stats: {
    totalAnalyzed: number;
    buySignals: number;
    sellSignals: number;
    holdSignals: number;
    averageConfidence: number;
    totalAvailable?: number;
  };
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  lastUpdated: string;
  fromCache?: boolean;
  cacheStatus?: string;
}

const DailySuggestions: React.FC = () => {
  const [data, setData] = useState<DailySuggestionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'opportunities' | 'analysis'>('all');
  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);
  
  // Use client-side hook to prevent hydration mismatches
  const isClient = useIsClient();
  const { formattedTime: refreshTimeFormatted } = useClientTime(lastRefreshTime);
  const { formattedTime: dataTimeFormatted } = useClientTime(data?.lastUpdated || null);
  
  // Pagination and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<'ALL' | 'BUY' | 'SELL' | 'HOLD'>('ALL');
  const [filterSector, setFilterSector] = useState<string>('ALL');
  const [loadingMore, setLoadingMore] = useState(false);
  const [allRecommendations, setAllRecommendations] = useState<AIRecommendation[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [pageSize] = useState(10);
  
  const portfolioStore = usePortfolioStore();
  const { executeTrade, cashBalance, totalValue, holdings } = portfolioStore;

  const fetchDailySuggestions = async (forceRefresh = false, append = false) => {
    try {
      setError(null);
      if (forceRefresh) {
        setForceRefreshing(true);
        setCurrentOffset(0);
        setAllRecommendations([]);
      }
      
      const offset = append ? currentOffset : 0;
      const url = forceRefresh 
        ? `/api/daily-suggestions?limit=${pageSize}&offset=${offset}&maxStocks=60&refresh=true`
        : `/api/daily-suggestions?limit=${pageSize}&offset=${offset}&maxStocks=60`;
        
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        if (append && data) {
          // Append new recommendations to existing ones
          const updatedData = {
            ...result.data,
            recommendations: [...allRecommendations, ...result.data.recommendations]
          };
          setData(updatedData);
          setAllRecommendations([...allRecommendations, ...result.data.recommendations]);
        } else {
          // First load or refresh
          setData(result.data);
          setAllRecommendations(result.data.recommendations);
        }
        
        if (forceRefresh && !result.data.fromCache) {
          setLastRefreshTime(new Date().toISOString());
          // Clear the refresh notification after 5 seconds
          setTimeout(() => setLastRefreshTime(null), 5000);
        }
      } else {
        setError(result.error || 'Failed to load suggestions');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Error fetching daily suggestions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setForceRefreshing(false);
      setLoadingMore(false);
    }
  };

  const loadMoreRecommendations = async () => {
    if (loadingMore || !data?.pagination?.hasMore) return;
    
    setLoadingMore(true);
    const newOffset = currentOffset + pageSize;
    setCurrentOffset(newOffset);
    
    try {
      const url = `/api/daily-suggestions?limit=${pageSize}&offset=${newOffset}&maxStocks=60`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        // Append new recommendations to existing ones
        const newRecommendations = [...allRecommendations, ...result.data.recommendations];
        setAllRecommendations(newRecommendations);
        
        const updatedData = {
          ...data,
          recommendations: newRecommendations,
          pagination: result.data.pagination
        };
        setData(updatedData);
      }
    } catch (err) {
      console.error('Error loading more recommendations:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Filter and search logic (now works on all loaded recommendations)
  const getFilteredRecommendations = (recommendations: AIRecommendation[]) => {
    let filtered = recommendations;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(rec => 
        rec.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.marketData.sector.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (filterAction !== 'ALL') {
      filtered = filtered.filter(rec => rec.action === filterAction);
    }

    // Sector filter
    if (filterSector !== 'ALL') {
      filtered = filtered.filter(rec => rec.marketData.sector === filterSector);
    }

    return filtered;
  };

  // Get unique sectors for filter dropdown
  const getUniqueSectors = (recommendations: AIRecommendation[]) => {
    const sectors = recommendations.map(rec => rec.marketData.sector);
    return [...new Set(sectors)].sort();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDailySuggestions();
  };

  const handleForceRefresh = async () => {
    await fetchDailySuggestions(true);
  };

  const handleQuickTrade = async (recommendation: AIRecommendation) => {
    console.log('🚀 QUICK TRADE BUTTON CLICKED!');
    console.log('🚀 handleQuickTrade called for:', recommendation.symbol, recommendation);
    
    if (recommendation.action === 'HOLD') {
      console.log('❌ Trade skipped - action is HOLD');
      alert('Cannot trade HOLD recommendations. Please select a BUY or SELL signal.');
      return;
    }
    
    const quantity = Math.floor(1000 / recommendation.currentPrice); // $1000 position
    console.log('💰 Trade details:', {
      symbol: recommendation.symbol,
      action: recommendation.action,
      quantity,
      price: recommendation.currentPrice,
      totalCost: quantity * recommendation.currentPrice
    });
    
    try {
      console.log('📞 Calling executeTrade with params:', {
        symbol: recommendation.symbol,
        type: recommendation.action === 'BUY' ? 'BUY' : 'SELL',
        quantity,
        price: recommendation.currentPrice
      });
      
      const tradeResult = await executeTrade(
        recommendation.symbol,
        recommendation.action === 'BUY' ? 'BUY' : 'SELL',
        quantity,
        recommendation.currentPrice,
        {
          action: recommendation.action,
          confidence: recommendation.confidence,
          reasoning: recommendation.reasoning
        }
      );
      
      console.log('📊 Trade result:', tradeResult);
      
      if (!tradeResult) {
        console.error('❌ Trade failed - executeTrade returned false');
        alert('Trade execution failed. Please check your balance and try again.');
      } else {
        console.log('✅ Trade executed successfully!');
        alert(`✅ ${recommendation.action} order placed successfully for ${quantity} shares of ${recommendation.symbol}`);
      }
    } catch (error) {
      console.error('❌ Trade execution failed:', error);
      alert('Trade execution failed. Please try again.');
    }
  };

  const handleCustomTrade = async (recommendation: AIRecommendation) => {
    console.log('💼 CUSTOM AMOUNT BUTTON CLICKED!');
    console.log('💼 handleCustomTrade called for:', recommendation.symbol);
    
    if (recommendation.action === 'HOLD') {
      alert('Cannot trade HOLD recommendations. Please select a BUY or SELL signal.');
      return;
    }

    const amountStr = prompt(`Enter amount in USD for ${recommendation.action} ${recommendation.symbol}:`, '1000');
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const quantity = Math.floor(amount / recommendation.currentPrice);
    if (quantity <= 0) {
      alert('Amount too small to buy even 1 share.');
      return;
    }

    try {
      console.log('📞 Calling executeTrade with custom amount:', {
        symbol: recommendation.symbol,
        type: recommendation.action === 'BUY' ? 'BUY' : 'SELL',
        quantity,
        price: recommendation.currentPrice,
        totalCost: quantity * recommendation.currentPrice
      });

      const tradeResult = await executeTrade(
        recommendation.symbol,
        recommendation.action === 'BUY' ? 'BUY' : 'SELL',
        quantity,
        recommendation.currentPrice,
        {
          action: recommendation.action,
          confidence: recommendation.confidence,
          reasoning: recommendation.reasoning
        }
      );

      if (!tradeResult) {
        alert('Trade execution failed. Please check your balance and try again.');
      } else {
        alert(`✅ ${recommendation.action} order placed successfully for ${quantity} shares of ${recommendation.symbol}`);
      }
    } catch (error) {
      console.error('❌ Custom trade execution failed:', error);
      alert('Trade execution failed. Please try again.');
    }
  };

  useEffect(() => {
    console.log('🏪 Portfolio Store State on Mount:', {
      cashBalance,
      totalValue,
      holdings,
      executeTrade: typeof executeTrade,
      portfolioStore
    });
    
    fetchDailySuggestions();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => fetchDailySuggestions(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cashBalance, totalValue, holdings, executeTrade, portfolioStore]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    console.log('🔄 Portfolio State Updated:', { cashBalance, totalValue, holdings });
  }, [cashBalance, totalValue, holdings]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️ {error}</div>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">🤖 AI Daily Suggestions</h2>
            {data?.cacheStatus && (
              <p className="text-sm mt-1 opacity-90">{data.cacheStatus}</p>
            )}
            {data?.fromCache && isClient && dataTimeFormatted && (
              <span className="inline-block mt-2 px-2 py-1 bg-white/20 rounded text-xs">
                📱 Cached Data • {dataTimeFormatted}
              </span>
            )}
            {lastRefreshTime && isClient && refreshTimeFormatted && (
              <span className="inline-block mt-2 px-2 py-1 bg-green-500/30 rounded text-xs animate-pulse">
                ✨ Refreshed at {refreshTimeFormatted}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing || forceRefreshing}
              className="px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 text-sm"
              title="Refresh display"
            >
              {refreshing ? '↻' : '🔄'}
            </button>
            <button
              onClick={handleForceRefresh}
              disabled={refreshing || forceRefreshing}
              className="px-3 py-1 bg-white/30 rounded-lg hover:bg-white/40 transition-colors disabled:opacity-50 text-sm"
              title="Generate new AI recommendations"
            >
              {forceRefreshing ? '🤖...' : '✨ Renew'}
            </button>
          </div>
        </div>
        
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg">{data.stats.totalAnalyzed}</div>
              <div className="opacity-90">Analyzed</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-green-300">{data.stats.buySignals}</div>
              <div className="opacity-90">Buy Signals</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-red-300">{data.stats.sellSignals}</div>
              <div className="opacity-90">Sell Signals</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">{data.stats.totalAvailable || allRecommendations.length}</div>
              <div className="opacity-90">Available</div>
            </div>
          </div>
        )}
      </div>

      {/* Market Analysis Banner */}
      {data?.marketAnalysis && (
        <div className={`p-4 ${
          data.marketAnalysis.sentiment === 'BULLISH' ? 'bg-green-50 border-l-4 border-green-400' :
          data.marketAnalysis.sentiment === 'BEARISH' ? 'bg-red-50 border-l-4 border-red-400' :
          'bg-yellow-50 border-l-4 border-yellow-400'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">
                {data.marketAnalysis.sentiment} Market
              </span>
              <span className="ml-2 text-sm text-gray-600">
                (Volatility: {data.marketAnalysis.volatilityIndex}%)
              </span>
            </div>
            {isClient && dataTimeFormatted && (
              <div className="text-sm text-gray-500">
                Updated: {dataTimeFormatted}
              </div>
            )}
          </div>
          <p className="text-sm mt-1">{data.marketAnalysis.summary}</p>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="p-4 bg-gray-50 border-b space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search stocks by symbol, name, or sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">🔍</span>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {/* Action Filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as 'ALL' | 'BUY' | 'SELL' | 'HOLD')}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm min-w-0 flex-shrink-0"
          >
            <option value="ALL">All Actions</option>
            <option value="BUY">Buy Only</option>
            <option value="SELL">Sell Only</option>
            <option value="HOLD">Hold Only</option>
          </select>

          {/* Sector Filter */}
          {allRecommendations.length > 0 && (
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm min-w-0 flex-shrink-0"
            >
              <option value="ALL">All Sectors</option>
              {getUniqueSectors(allRecommendations).map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          )}

          {/* Clear Filters Button */}
          {(searchTerm || filterAction !== 'ALL' || filterSector !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterAction('ALL');
                setFilterSector('ALL');
              }}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 flex-shrink-0"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex">
          {[
            { key: 'all', label: 'All Recommendations', count: allRecommendations.length },
            { key: 'opportunities', label: 'Top Opportunities', count: data?.topOpportunities.length },
            { key: 'analysis', label: 'Market Analysis', count: null }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as 'all' | 'opportunities' | 'analysis')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedTab === 'all' && allRecommendations.length > 0 && (
          <div className="space-y-4">
            {(() => {
              const filteredRecommendations = getFilteredRecommendations(allRecommendations);
              return (
                <>
                  {/* Results Info */}
                  <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                    <span>
                      Showing {filteredRecommendations.length} of {data?.pagination?.total || allRecommendations.length} recommendations
                      {(searchTerm || filterAction !== 'ALL' || filterSector !== 'ALL') && ' (filtered)'}
                    </span>
                    {data?.pagination?.hasMore && !searchTerm && filterAction === 'ALL' && filterSector === 'ALL' && (
                      <button
                        onClick={loadMoreRecommendations}
                        disabled={loadingMore}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loadingMore ? 'Loading...' : `Load More (${(data.pagination.total - allRecommendations.length)} available)`}
                      </button>
                    )}
                  </div>

                  {/* Recommendations */}
                  {filteredRecommendations.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🔍</div>
                      <p className="text-gray-500 mb-2">No recommendations match your filters</p>
                      <p className="text-sm text-gray-400">Try adjusting your search or filter criteria</p>
                    </div>
                  ) : (
                    filteredRecommendations.map((rec, index) => (
                      <RecommendationCard 
                        key={`${rec.symbol}-${index}`}
                        recommendation={rec}
                        onQuickTrade={handleQuickTrade}
                        onCustomTrade={handleCustomTrade}
                      />
                    ))
                  )}
                </>
              );
            })()}
          </div>
        )}

        {selectedTab === 'opportunities' && data?.topOpportunities && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-yellow-800 mb-2">🚀 High-Confidence Opportunities</h3>
              <p className="text-sm text-yellow-700">
                These are the highest-confidence recommendations with strong profit potential.
              </p>
            </div>
            {data.topOpportunities.map((rec, index) => (
              <RecommendationCard 
                key={`opp-${rec.symbol}-${index}`}
                recommendation={rec}
                onQuickTrade={handleQuickTrade}
                onCustomTrade={handleCustomTrade}
                highlight={true}
              />
            ))}
          </div>
        )}

        {selectedTab === 'analysis' && data?.marketAnalysis && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">📊 Market Summary</h3>
              <p className="text-gray-700">{data.marketAnalysis.summary}</p>
            </div>

            {data.marketAnalysis.riskWarnings.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-3">⚠️ Risk Warnings</h3>
                <ul className="space-y-1">
                  {data.marketAnalysis.riskWarnings.map((warning, index) => (
                    <li key={index} className="text-sm text-red-700">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3">💡 Trading Tips</h3>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• Consider your risk tolerance before following any recommendation</li>
                <li>• Diversify your trades across different sectors</li>
                <li>• Set stop-loss orders to limit potential losses</li>
                <li>• Take profits when targets are reached</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface RecommendationCardProps {
  recommendation: AIRecommendation;
  onQuickTrade: (rec: AIRecommendation) => void;
  onCustomTrade: (rec: AIRecommendation) => void;
  highlight?: boolean;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onQuickTrade,
  onCustomTrade,
  highlight = false
}) => {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'text-green-600 bg-green-100';
      case 'SELL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
      highlight ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{recommendation.symbol}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(recommendation.action)}`}>
              {recommendation.action}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(recommendation.riskLevel)}`}>
              {recommendation.riskLevel} RISK
            </span>
          </div>
          <p className="text-sm text-gray-600">{recommendation.name}</p>
          <p className="text-xs text-gray-500">{recommendation.marketData.sector}</p>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold">${recommendation.currentPrice.toFixed(2)}</div>
          <div className={`text-sm ${getConfidenceColor(recommendation.confidence)}`}>
            {recommendation.confidence}% confidence
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
        <div>
          <span className="text-gray-500">Target:</span>
          <div className="font-medium">${recommendation.targetPrice.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-gray-500">Expected Return:</span>
          <div className={`font-medium ${recommendation.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {recommendation.expectedReturn > 0 ? '+' : ''}{recommendation.expectedReturn.toFixed(1)}%
          </div>
        </div>
        <div>
          <span className="text-gray-500">Timeframe:</span>
          <div className="font-medium">{recommendation.timeframe}</div>
        </div>
        <div>
          <span className="text-gray-500">Volume:</span>
          <div className="font-medium">{(recommendation.marketData.volume / 1000000).toFixed(1)}M</div>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-700 mb-2">{recommendation.reasoning}</p>
        <div className="flex flex-wrap gap-1">
          {recommendation.keyFactors.map((factor, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              {factor}
            </span>
          ))}
        </div>
      </div>

      {recommendation.action !== 'HOLD' && (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔥 Quick trade button clicked for:', recommendation.symbol);
              onQuickTrade(recommendation);
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
              recommendation.action === 'BUY'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            Quick {recommendation.action} ($1000)
          </button>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔥 Custom amount button clicked for:', recommendation.symbol);
              onCustomTrade(recommendation);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Custom Amount
          </button>
        </div>
      )}
    </div>
  );
};

export default DailySuggestions;