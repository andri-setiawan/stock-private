import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number' },
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

    // Find user's portfolio
    const portfolio = await prisma.portfolio.findFirst({
      where: { 
        userId: user.id,
        isActive: true
      }
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Calculate new balances
    const newCashBalance = Number(portfolio.cashBalance) + amount;
    const newTotalValue = Number(portfolio.totalValue) + amount;

    // Update portfolio
    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        cashBalance: new Decimal(newCashBalance),
        totalValue: new Decimal(newTotalValue),
        updatedAt: new Date()
      }
    });

    // Create a transaction record for the top-up
    await prisma.transaction.create({
      data: {
        id: `topup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        portfolioId: portfolio.id,
        symbol: 'CASH',
        type: 'BUY', // Using BUY to represent adding cash
        quantity: new Decimal(1),
        price: new Decimal(amount),
        totalAmount: new Decimal(amount),
        aiRecommendation: {
          action: 'TOP_UP',
          confidence: 100,
          reasoning: `Added $${amount.toFixed(2)} to portfolio cash balance`
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Cash topped up successfully',
      newCashBalance,
      newTotalValue
    });

  } catch (error) {
    console.error('Top-up error:', error);
    return NextResponse.json(
      { error: 'Failed to top up cash' },
      { status: 500 }
    );
  }
}