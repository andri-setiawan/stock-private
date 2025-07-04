// Portfolio API routes - handles portfolio CRUD operations with authentication
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/portfolio - Get user's portfolio data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      // Create user if doesn't exist
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || 'User',
          image: session.user.image
        }
      });
    }

    // Find or create portfolio for user
    let portfolio = await prisma.portfolio.findFirst({
      where: { 
        userId: user.id,
        isActive: true
      },
      include: {
        holdings: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 100 // Latest 100 transactions
        }
      }
    });

    if (!portfolio) {
      // Create default portfolio
      portfolio = await prisma.portfolio.create({
        data: {
          userId: user.id,
          name: 'Main Portfolio',
          initialValue: new Decimal(10000),
          cashBalance: new Decimal(10000),
          totalValue: new Decimal(10000)
        },
        include: {
          holdings: true,
          transactions: true
        }
      });
    }

    // Convert Decimal to number for JSON serialization
    const portfolioData = {
      id: portfolio.id,
      userId: portfolio.userId,
      name: portfolio.name,
      initialValue: Number(portfolio.initialValue),
      cashBalance: Number(portfolio.cashBalance),
      totalValue: Number(portfolio.totalValue),
      isActive: portfolio.isActive,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
      holdings: portfolio.holdings.map(holding => ({
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
      })),
      transactions: portfolio.transactions.map(transaction => ({
        id: transaction.id,
        symbol: transaction.symbol,
        type: transaction.type,
        quantity: Number(transaction.quantity),
        price: Number(transaction.price),
        totalAmount: Number(transaction.totalAmount),
        aiRecommendation: transaction.aiRecommendation,
        transactionDate: transaction.transactionDate,
        createdAt: transaction.createdAt
      }))
    };

    return NextResponse.json({
      success: true,
      data: portfolioData
    });

  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}

// POST /api/portfolio - Update portfolio values (cash balance, total value)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cashBalance, totalValue } = body;

    if (typeof cashBalance !== 'number' || typeof totalValue !== 'number') {
      return NextResponse.json(
        { error: 'Invalid data: cashBalance and totalValue must be numbers' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update portfolio
    const portfolio = await prisma.portfolio.updateMany({
      where: { 
        userId: user.id,
        isActive: true
      },
      data: {
        cashBalance: new Decimal(cashBalance),
        totalValue: new Decimal(totalValue),
        updatedAt: new Date()
      }
    });

    if (portfolio.count === 0) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Portfolio updated successfully'
    });

  } catch (error) {
    console.error('Portfolio update error:', error);
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}