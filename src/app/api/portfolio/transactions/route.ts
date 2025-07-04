// Transactions API routes - manages trade transaction history
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/portfolio/transactions - Get transaction history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const symbol = searchParams.get('symbol');

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

    // Build where clause
    const whereClause: any = { portfolioId };
    if (symbol) {
      whereClause.symbol = symbol.toUpperCase();
    }

    // Get transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { transactionDate: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.transaction.count({
        where: whereClause
      })
    ]);

    const transactionData = transactions.map(transaction => ({
      id: transaction.id,
      symbol: transaction.symbol,
      type: transaction.type,
      quantity: Number(transaction.quantity),
      price: Number(transaction.price),
      totalAmount: Number(transaction.totalAmount),
      aiRecommendation: transaction.aiRecommendation,
      transactionDate: transaction.transactionDate,
      createdAt: transaction.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactionData,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    });

  } catch (error) {
    console.error('Transactions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST /api/portfolio/transactions - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      transactionId,
      symbol, 
      type, 
      quantity, 
      price, 
      totalAmount,
      aiRecommendation,
      transactionDate
    } = body;

    // Validation
    if (!transactionId || !symbol || !type || typeof quantity !== 'number' || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'Invalid data: transactionId, symbol, type, quantity, and price are required' },
        { status: 400 }
      );
    }

    if (!['BUY', 'SELL'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type. Must be BUY or SELL' },
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

    // Check if transaction already exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction already exists' },
        { status: 409 }
      );
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        id: transactionId,
        portfolioId,
        symbol: symbol.toUpperCase(),
        type: type as 'BUY' | 'SELL',
        quantity: new Decimal(quantity),
        price: new Decimal(price),
        totalAmount: new Decimal(totalAmount || quantity * price),
        aiRecommendation: aiRecommendation || null,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: transaction.id,
        symbol: transaction.symbol,
        type: transaction.type,
        quantity: Number(transaction.quantity),
        price: Number(transaction.price),
        totalAmount: Number(transaction.totalAmount),
        aiRecommendation: transaction.aiRecommendation,
        transactionDate: transaction.transactionDate,
        createdAt: transaction.createdAt
      }
    });

  } catch (error) {
    console.error('Transaction create error:', error);
    
    // Handle unique constraint violation
    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        { error: 'Transaction ID already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

// GET /api/portfolio/transactions/stats - Get transaction statistics
export async function GET_STATS(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Get transaction statistics
    const [totalTransactions, buyTransactions, sellTransactions, totalVolume] = await Promise.all([
      prisma.transaction.count({
        where: { portfolioId }
      }),
      prisma.transaction.count({
        where: { portfolioId, type: 'BUY' }
      }),
      prisma.transaction.count({
        where: { portfolioId, type: 'SELL' }
      }),
      prisma.transaction.aggregate({
        where: { portfolioId },
        _sum: {
          totalAmount: true
        }
      })
    ]);

    // Get AI recommendation stats
    const aiTransactions = await prisma.transaction.count({
      where: { 
        portfolioId,
        aiRecommendation: { not: null }
      }
    });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.transaction.count({
      where: {
        portfolioId,
        transactionDate: {
          gte: thirtyDaysAgo
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalTransactions,
        buyTransactions,
        sellTransactions,
        aiTransactions,
        totalVolume: Number(totalVolume._sum.totalAmount || 0),
        recentActivity,
        aiUsagePercent: totalTransactions > 0 ? (aiTransactions / totalTransactions) * 100 : 0
      }
    });

  } catch (error) {
    console.error('Transaction stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction statistics' },
      { status: 500 }
    );
  }
}