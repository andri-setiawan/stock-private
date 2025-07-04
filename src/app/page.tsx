'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PortfolioManager from '@/components/PortfolioManager';
import PortfolioSettings from '@/components/PortfolioSettings';
import MobileNav from '@/components/MobileNav';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [quickSuggestions, setQuickSuggestions] = useState<{
    symbol: string;
    action: string;
    confidence: number;
    currentPrice: number;
  }[]>([]);

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/login');
      return;
    }

    // Fetch quick suggestions for dashboard preview (uses cache)
    const fetchQuickSuggestions = async () => {
      try {
        const response = await fetch('/api/daily-suggestions?limit=3');
        const result = await response.json();
        if (result.success && result.data.recommendations) {
          setQuickSuggestions(result.data.recommendations.slice(0, 3));
        }
      } catch (error) {
        console.error('Failed to fetch quick suggestions:', error);
      }
    };

    fetchQuickSuggestions();
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">📈 Stock Trader AI</h1>
              <p className="text-sm text-gray-600">Welcome back, {session.user?.name}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Link 
                href="/advanced-analytics"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                📊 Analytics
              </Link>
              <Link 
                href="/settings"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ⚙️ Settings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* AI Suggestions Preview */}
      {quickSuggestions.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">🤖 Today&apos;s AI Picks</h3>
            <Link href="/suggestions" className="text-xs bg-white/20 px-2 py-1 rounded">
              View All
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {quickSuggestions.map((suggestion, index) => (
              <div key={index} className="flex-shrink-0 bg-white/10 rounded p-2 min-w-[140px]">
                <div className="text-sm font-medium">{suggestion.symbol}</div>
                <div className="text-xs opacity-90">
                  {suggestion.action} • {suggestion.confidence}%
                </div>
                <div className="text-xs">
                  ${suggestion.currentPrice.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pb-20 px-4">
        <PortfolioSettings />
        <PortfolioManager />
      </main>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}