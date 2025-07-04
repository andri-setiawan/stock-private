'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import AlertNotifications from './AlertNotifications';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showAlerts?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ title, subtitle, showAlerts = true }) => {
  const { data: session } = useSession();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>

          {/* Actions Section */}
          <div className="flex items-center space-x-3">
            {/* Alert Notifications */}
            {showAlerts && <AlertNotifications />}
            
            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500">Trader</p>
              </div>
              
              {/* Profile/Logout Button */}
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Sign Out"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(session?.user?.name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <svg className="w-4 h-4 text-gray-400 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;