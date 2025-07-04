'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to handle client-side time formatting
 * Prevents hydration mismatches by deferring time formatting until after hydration
 */
export function useClientTime(
  timestamp: string | null, 
  options?: { 
    showTime?: boolean;
    showDate?: boolean;
    relative?: boolean;
  }
) {
  const [formattedTime, setFormattedTime] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    if (timestamp) {
      const date = new Date(timestamp);
      
      if (options?.relative) {
        // Simple relative time formatting
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (seconds < 60) {
          setFormattedTime('Just now');
        } else if (minutes < 60) {
          setFormattedTime(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
        } else if (hours < 24) {
          setFormattedTime(`${hours} hour${hours > 1 ? 's' : ''} ago`);
        } else {
          setFormattedTime(date.toLocaleDateString());
        }
      } else {
        // Standard formatting
        let formatted = '';
        
        if (options?.showDate !== false) {
          formatted += date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
        
        if (options?.showTime !== false) {
          const timeStr = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
          formatted += formatted ? ` ${timeStr}` : timeStr;
        }
        
        setFormattedTime(formatted);
      }
    }
  }, [timestamp, options?.showTime, options?.showDate, options?.relative]);

  return {
    formattedTime,
    isClient
  };
}

/**
 * Simple hook to detect if component has hydrated
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}