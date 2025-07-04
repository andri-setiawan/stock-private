'use client';

import { SessionProvider } from 'next-auth/react';
import PortfolioInitializer from '@/components/PortfolioInitializer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PortfolioInitializer>
        {children}
      </PortfolioInitializer>
    </SessionProvider>
  );
}