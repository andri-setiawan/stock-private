// Local storage utilities for portfolio data
export interface StorageData {
  portfolio: unknown;
  timestamp: number;
  version: string;
}

class StorageService {
  private readonly STORAGE_KEY = 'stock-trader-ai-data';
  private readonly VERSION = '1.0.0';

  saveData(data: unknown): void {
    try {
      const storageData: StorageData = {
        portfolio: data,
        timestamp: Date.now(),
        version: this.VERSION,
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
    }
  }

  loadData(): unknown | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const storageData: StorageData = JSON.parse(stored);
      
      // Version check - migrate if needed
      if (storageData.version !== this.VERSION) {
        console.log('Data version mismatch, migrating...');
        return this.migrateData(storageData);
      }

      return storageData.portfolio;
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      return null;
    }
  }

  clearData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  exportData(): string {
    try {
      const data = this.loadData();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      return '';
    }
  }

  importData(jsonData: string): boolean {
    try {
      const data: unknown = JSON.parse(jsonData);
      this.saveData(data);
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  private migrateData(oldData: StorageData): unknown {
    // Handle data migration between versions
    console.log('Migrating data from version', oldData.version, 'to', this.VERSION);
    
    // For now, just return the old data
    // In future versions, implement proper migration logic
    return oldData.portfolio;
  }

  getStorageInfo(): { size: number; lastModified: Date | null } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return { size: 0, lastModified: null };
      }

      const storageData: StorageData = JSON.parse(stored);
      return {
        size: new Blob([stored]).size,
        lastModified: new Date(storageData.timestamp),
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { size: 0, lastModified: null };
    }
  }
}

export const storageService = new StorageService();

// Helper functions for specific data types
export const portfolioStorage = {
  save: (portfolio: unknown) => storageService.saveData({ portfolio }),
  load: () => {
    const data = storageService.loadData() as { portfolio?: unknown } | null;
    return data?.portfolio || null;
  },
  clear: () => storageService.clearData(),
};

export const transactionStorage = {
  save: (transactions: unknown[]) => {
    const existing = storageService.loadData() as Record<string, unknown> || {};
    storageService.saveData({ ...existing, transactions });
  },
  load: () => {
    const data = storageService.loadData() as { transactions?: unknown[] } | null;
    return data?.transactions || [];
  },
};

export const settingsStorage = {
  save: (settings: unknown) => {
    const existing = storageService.loadData() as Record<string, unknown> || {};
    storageService.saveData({ ...existing, settings });
  },
  load: () => {
    const data = storageService.loadData() as { settings?: unknown } | null;
    return data?.settings || {};
  },
};