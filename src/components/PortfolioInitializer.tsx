'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePortfolioStore } from '@/store/portfolio';

export default function PortfolioInitializer({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { loadPortfolio, isLoading, error } = usePortfolioStore();

  useEffect(() => {
    // Load portfolio data from database when user is authenticated
    if (status === 'authenticated' && session?.user) {
      console.log('🔄 Loading portfolio from database for user:', session.user.email);
      loadPortfolio();
    }
  }, [status, session, loadPortfolio]);

  // Show loading state while session is loading or portfolio is loading
  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {status === 'loading' ? 'Loading your session...' : 'Loading your portfolio...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error state if there's a portfolio error
  if (error && status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Portfolio Loading Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => loadPortfolio()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}