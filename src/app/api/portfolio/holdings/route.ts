// Holdings API routes - manages stock holdings CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/portfolio/holdings - Get all holdings for user's portfolio
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        portfolios: {
          where: { isActive: true },
          include: {
            holdings: {
              orderBy: { totalValue: 'desc' }
            }
          }
        }
      }
    });

    if (!user || !user.portfolios[0]) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    const holdings = user.portfolios[0].holdings.map(holding => ({
      id: holding.id,
      symbol: holding.symbol,
      quantity: Number(holding.quantity),
      averagePrice: Number(holding.averagePrice),
      currentPrice: Number(holding.currentPrice || 0),
      totalValue: Number(holding.totalValue || 0),
      profitLoss: Number(holding.profitLoss || 0),
      profitLossPercent: Number(holding.profitLossPercent || 0),
      lastUpdated: holding.lastUpdated,
      createdAt: holding.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: holdings
    });

  } catch (error) {
    console.error('Holdings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}

// POST /api/portfolio/holdings - Add or update a holding
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      symbol, 
      quantity, 
      averagePrice, 
      currentPrice, 
      totalValue, 
      profitLoss, 
      profitLossPercent 
    } = body;

    // Validation
    if (!symbol || typeof quantity !== 'number' || typeof averagePrice !== 'number') {
      return NextResponse.json(
        { error: 'Invalid data: symbol, quantity, and averagePrice are required' },
        { status: 400 }
      );
    }

    // Find user and portfolio
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        portfolios: {
          where: { isActive: true }
        }
      }
    });

    if (!user || !user.portfolios[0]) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    const portfolioId = user.portfolios[0].id;

    // Check if holding already exists
    const existingHolding = await prisma.holding.findUnique({
      where: {
        unique_portfolio_symbol: {
          portfolioId,
          symbol: symbol.toUpperCase()
        }
      }
    });

    let holding;

    if (existingHolding) {
      // Update existing holding
      holding = await prisma.holding.update({
        where: { id: existingHolding.id },
        data: {
          quantity: new Decimal(quantity),
          averagePrice: new Decimal(averagePrice),
          currentPrice: currentPrice ? new Decimal(currentPrice) : undefined,
          totalValue: totalValue ? new Decimal(totalValue) : undefined,
          profitLoss: profitLoss ? new Decimal(profitLoss) : undefined,
          profitLossPercent: profitLossPercent ? new Decimal(profitLossPercent) : undefined,
          lastUpdated: new Date()
        }
      });
    } else {
      // Create new holding
      holding = await prisma.holding.create({
        data: {
          portfolioId,
          symbol: symbol.toUpperCase(),
          quantity: new Decimal(quantity),
          averagePrice: new Decimal(averagePrice),
          currentPrice: currentPrice ? new Decimal(currentPrice) : new Decimal(0),
          totalValue: totalValue ? new Decimal(totalValue) : new Decimal(quantity * averagePrice),
          profitLoss: profitLoss ? new Decimal(profitLoss) : new Decimal(0),
          profitLossPercent: profitLossPercent ? new Decimal(profitLossPercent) : new Decimal(0)
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: holding.id,
        symbol: holding.symbol,
        quantity: Number(holding.quantity),
        averagePrice: Number(holding.averagePrice),
        currentPrice: Number(holding.currentPrice || 0),
        totalValue: Number(holding.totalValue || 0),
        profitLoss: Number(holding.profitLoss || 0),
        profitLossPercent: Number(holding.profitLossPercent || 0),
        lastUpdated: holding.lastUpdated,
        createdAt: holding.createdAt
      }
    });

  } catch (error) {
    console.error('Holdings create/update error:', error);
    return NextResponse.json(
      { error: 'Failed to create/update holding' },
      { status: 500 }
    );
  }
}

// PUT /api/portfolio/holdings - Bulk update holdings (for real-time price updates)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { holdings, totalValue } = body;

    if (!Array.isArray(holdings)) {
      return NextResponse.json(
        { error: 'Invalid data: holdings must be an array' },
        { status: 400 }
      );
    }

    // Find user and portfolio
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        portfolios: {
          where: { isActive: true }
        }
      }
    });

    if (!user || !user.portfolios[0]) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    const portfolioId = user.portfolios[0].id;

    // Bulk update holdings
    const updatePromises = holdings.map(async (holdingData: any) => {
      if (!holdingData.symbol) return null;

      return prisma.holding.updateMany({
        where: {
          portfolioId,
          symbol: holdingData.symbol.toUpperCase()
        },
        data: {
          currentPrice: holdingData.currentPrice ? new Decimal(holdingData.currentPrice) : undefined,
          totalValue: holdingData.totalValue ? new Decimal(holdingData.totalValue) : undefined,
          profitLoss: holdingData.profitLoss ? new Decimal(holdingData.profitLoss) : undefined,
          profitLossPercent: holdingData.profitLossPercent ? new Decimal(holdingData.profitLossPercent) : undefined,
          lastUpdated: new Date()
        }
      });
    });

    const results = await Promise.all(updatePromises);
    const updatedCount = results.filter(result => result && result.count > 0).length;

    // Update portfolio total value if provided
    if (totalValue !== undefined) {
      await prisma.portfolio.update({
        where: { id: portfolioId },
        data: { 
          totalValue: new Decimal(totalValue),
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} holdings`,
      updatedCount
    });

  } catch (error) {
    console.error('Holdings bulk update error:', error);
    return NextResponse.json(
      { error: 'Failed to update holdings' },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolio/holdings?symbol=AAPL - Delete a specific holding
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Find user and portfolio
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        portfolios: {
          where: { isActive: true }
        }
      }
    });

    if (!user || !user.portfolios[0]) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    const portfolioId = user.portfolios[0].id;

    // Delete the holding
    const deleted = await prisma.holding.deleteMany({
      where: {
        portfolioId,
        symbol: symbol.toUpperCase()
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted holding for ${symbol.toUpperCase()}`
    });

  } catch (error) {
    console.error('Holdings delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete holding' },
      { status: 500 }
    );
  }
}