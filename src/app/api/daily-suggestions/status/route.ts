// API endpoint for cache status and management
import { NextRequest, NextResponse } from 'next/server';
import { serverCacheService } from '@/services/serverCache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Handle cache management actions
    if (action === 'clear') {
      await serverCacheService.clearCache();
      return NextResponse.json({
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'export') {
      const exportData = await serverCacheService.exportCacheData();
      return NextResponse.json({
        success: true,
        data: exportData,
        timestamp: new Date().toISOString()
      });
    }

    // Default: return cache status
    const status = await serverCacheService.getCacheStatus();
    const info = await serverCacheService.getCacheInfo();
    
    return NextResponse.json({
      success: true,
      data: {
        status,
        info,
        message: await serverCacheService.getCacheStatusMessage(),
        shouldAutoRefresh: await serverCacheService.shouldAutoRefresh(),
        isScheduledRefreshTime: await serverCacheService.isScheduledRefreshTime()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get cache status',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await serverCacheService.clearCache();
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}