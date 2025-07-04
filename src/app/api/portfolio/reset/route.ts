import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Delete all holdings and transactions
    await prisma.holding.deleteMany({
      where: { portfolioId: portfolio.id }
    });

    await prisma.transaction.deleteMany({
      where: { portfolioId: portfolio.id }
    });

    // Reset portfolio to initial values
    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        cashBalance: new Decimal(10000),
        totalValue: new Decimal(10000),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Portfolio reset successfully'
    });

  } catch (error) {
    console.error('Portfolio reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset portfolio' },
      { status: 500 }
    );
  }
}