'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import AdvancedTradingInterface from '@/components/AdvancedTradingInterface';
import MobileNav from '@/components/MobileNav';
import AppHeader from '@/components/AppHeader';

export default function TradePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const symbol = searchParams.get('symbol');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AppHeader 
        title="Advanced Trading" 
        subtitle={symbol ? `Search results for ${symbol}` : "Advanced trading with order management & AI"}
      />

      {/* Main Content */}
      <main>
        <AdvancedTradingInterface initialSymbol={symbol || ''} />
      </main>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}