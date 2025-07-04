/**
 * Format currency safely for SSR - prevents hydration mismatches
 */
export const formatCurrency = (amount: number): string => {
  // Use simple formatting on server to avoid hydration mismatches
  if (typeof window === 'undefined') {
    return `$${amount.toFixed(2)}`;
  }
  
  // Use full Intl formatting on client
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

/**
 * Format percentage safely for SSR
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  if (typeof window === 'undefined') {
    return `${value.toFixed(decimals)}%`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

/**
 * Format number safely for SSR
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  if (typeof window === 'undefined') {
    return value.toFixed(decimals);
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Format time safely for SSR
 */
export const formatTime = (date: Date): string => {
  if (typeof window === 'undefined') {
    return date.toISOString().split('T')[1].split('.')[0]; // Simple HH:MM:SS format
  }
  
  return date.toLocaleTimeString();
};

/**
 * Format date safely for SSR
 */
export const formatDate = (date: Date): string => {
  if (typeof window === 'undefined') {
    return date.toISOString().split('T')[0]; // Simple YYYY-MM-DD format
  }
  
  return date.toLocaleDateString();
};