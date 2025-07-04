#!/usr/bin/env node

/**
 * Portfolio Data Migration Script
 * 
 * This script helps migrate existing localStorage portfolio data to the database.
 * Run this script in the browser console on the portfolio page to migrate data.
 */

const migratePortfolioData = async () => {
  try {
    console.log('🔄 Starting portfolio data migration...');
    
    // Get localStorage data
    const storageKey = 'portfolio-storage';
    const localData = localStorage.getItem(storageKey);
    
    if (!localData) {
      console.log('📋 No local portfolio data found to migrate.');
      return;
    }
    
    const portfolioData = JSON.parse(localData);
    console.log('📊 Found local portfolio data:', portfolioData);
    
    // Check if user is authenticated
    const response = await fetch('/api/auth/session');
    const session = await response.json();
    
    if (!session?.user) {
      console.error('❌ User not authenticated. Please log in first.');
      return;
    }
    
    console.log('✅ User authenticated:', session.user.email);
    
    // Load current database portfolio
    const portfolioResponse = await fetch('/api/portfolio');
    
    if (!portfolioResponse.ok) {
      console.error('❌ Failed to load current portfolio from database');
      return;
    }
    
    const { data: dbPortfolio } = await portfolioResponse.json();
    console.log('📊 Current database portfolio:', dbPortfolio);
    
    // Check if database already has data
    if (dbPortfolio.transactions.length > 0 || Object.keys(dbPortfolio.holdings).length > 0) {
      const confirmMigration = confirm('Database already contains portfolio data. Overwrite with localStorage data?');
      if (!confirmMigration) {
        console.log('❌ Migration cancelled by user.');
        return;
      }
    }
    
    const state = portfolioData.state || portfolioData;
    
    // Migrate portfolio values
    console.log('🔄 Migrating portfolio values...');
    const portfolioUpdateResponse = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cashBalance: state.cashBalance,
        totalValue: state.totalValue
      })
    });
    
    if (!portfolioUpdateResponse.ok) {
      throw new Error('Failed to update portfolio values');
    }
    
    console.log('✅ Portfolio values migrated');
    
    // Migrate holdings
    if (state.holdings && Object.keys(state.holdings).length > 0) {
      console.log('🔄 Migrating holdings...');
      
      for (const [symbol, holding] of Object.entries(state.holdings)) {
        const holdingResponse = await fetch('/api/portfolio/holdings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            quantity: holding.quantity,
            averagePrice: holding.averagePrice,
            currentPrice: holding.currentPrice,
            totalValue: holding.totalValue,
            profitLoss: holding.profitLoss,
            profitLossPercent: holding.profitLossPercent
          })
        });
        
        if (!holdingResponse.ok) {
          console.error(`❌ Failed to migrate holding for ${symbol}`);
        } else {
          console.log(`✅ Migrated holding for ${symbol}`);
        }
      }
    }
    
    // Migrate transactions
    if (state.transactions && state.transactions.length > 0) {
      console.log('🔄 Migrating transactions...');
      
      for (const transaction of state.transactions) {
        const transactionResponse = await fetch('/api/portfolio/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: transaction.id,
            symbol: transaction.symbol,
            type: transaction.type,
            quantity: transaction.quantity,
            price: transaction.price,
            totalAmount: transaction.totalAmount,
            aiRecommendation: transaction.aiRecommendation,
            transactionDate: transaction.timestamp
          })
        });
        
        if (!transactionResponse.ok) {
          console.error(`❌ Failed to migrate transaction ${transaction.id}`);
        } else {
          console.log(`✅ Migrated transaction ${transaction.id}`);
        }
      }
    }
    
    console.log('🎉 Portfolio data migration completed successfully!');
    console.log('💡 You can now safely delete localStorage data or keep it as backup.');
    
    // Optional: Clear localStorage after successful migration
    const clearStorage = confirm('Migration completed! Clear localStorage data?');
    if (clearStorage) {
      localStorage.removeItem(storageKey);
      console.log('🗑️ localStorage data cleared');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { migratePortfolioData };
} else {
  // Browser environment - make function available globally
  window.migratePortfolioData = migratePortfolioData;
  console.log('📋 Portfolio migration script loaded. Run migratePortfolioData() to start migration.');
}