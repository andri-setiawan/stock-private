import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, type, quantity, price, aiRecommendation } = body;

    // Validation
    if (!symbol || !type || typeof quantity !== 'number' || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'Invalid data: symbol, type, quantity, and price are required' },
        { status: 400 }
      );
    }

    if (!['BUY', 'SELL'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid trade type. Must be BUY or SELL' },
        { status: 400 }
      );
    }

    if (quantity <= 0 || price <= 0) {
      return NextResponse.json(
        { error: 'Quantity and price must be positive numbers' },
        { status: 400 }
      );
    }

    // Find user and portfolio
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        portfolios: {
          where: { isActive: true },
          include: {
            holdings: true
          }
        }
      }
    });

    if (!user || !user.portfolios[0]) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    const portfolio = user.portfolios[0];
    const totalCost = quantity * price;

    // Execute trade in transaction to ensure atomicity
    const result = await prisma.$transaction(async (prisma) => {
      if (type === 'BUY') {
        // Check sufficient funds
        if (totalCost > Number(portfolio.cashBalance)) {
          throw new Error(`Insufficient funds. Need $${totalCost.toFixed(2)}, have $${Number(portfolio.cashBalance).toFixed(2)}`);
        }

        // Update portfolio cash balance
        await prisma.portfolio.update({
          where: { id: portfolio.id },
          data: {
            cashBalance: new Decimal(Number(portfolio.cashBalance) - totalCost),
            updatedAt: new Date()
          }
        });

        // Find existing holding
        const existingHolding = await prisma.holding.findUnique({
          where: {
            unique_portfolio_symbol: {
              portfolioId: portfolio.id,
              symbol: symbol.toUpperCase()
            }
          }
        });

        if (existingHolding) {
          // Update existing holding with weighted average price
          const oldQuantity = Number(existingHolding.quantity);
          const oldPrice = Number(existingHolding.averagePrice);
          const newQuantity = oldQuantity + quantity;
          const newAveragePrice = ((oldQuantity * oldPrice) + (quantity * price)) / newQuantity;

          await prisma.holding.update({
            where: { id: existingHolding.id },
            data: {
              quantity: new Decimal(newQuantity),
              averagePrice: new Decimal(newAveragePrice),
              currentPrice: new Decimal(price),
              totalValue: new Decimal(newQuantity * price),
              profitLoss: new Decimal(newQuantity * (price - newAveragePrice)),
              profitLossPercent: new Decimal(newAveragePrice > 0 ? ((price - newAveragePrice) / newAveragePrice) * 100 : 0),
              lastUpdated: new Date()
            }
          });
        } else {
          // Create new holding
          await prisma.holding.create({
            data: {
              portfolioId: portfolio.id,
              symbol: symbol.toUpperCase(),
              quantity: new Decimal(quantity),
              averagePrice: new Decimal(price),
              currentPrice: new Decimal(price),
              totalValue: new Decimal(totalCost),
              profitLoss: new Decimal(0),
              profitLossPercent: new Decimal(0),
              lastUpdated: new Date()
            }
          });
        }

      } else { // SELL
        // Find existing holding
        const existingHolding = await prisma.holding.findUnique({
          where: {
            unique_portfolio_symbol: {
              portfolioId: portfolio.id,
              symbol: symbol.toUpperCase()
            }
          }
        });

        if (!existingHolding || Number(existingHolding.quantity) < quantity) {
          throw new Error(`Insufficient shares. Need ${quantity}, have ${Number(existingHolding?.quantity) || 0}`);
        }

        // Update portfolio cash balance
        await prisma.portfolio.update({
          where: { id: portfolio.id },
          data: {
            cashBalance: new Decimal(Number(portfolio.cashBalance) + totalCost),
            updatedAt: new Date()
          }
        });

        const newQuantity = Number(existingHolding.quantity) - quantity;
        
        if (newQuantity === 0) {
          // Remove holding if quantity becomes zero
          await prisma.holding.delete({
            where: { id: existingHolding.id }
          });
        } else {
          // Update holding
          const averagePrice = Number(existingHolding.averagePrice);
          await prisma.holding.update({
            where: { id: existingHolding.id },
            data: {
              quantity: new Decimal(newQuantity),
              currentPrice: new Decimal(price),
              totalValue: new Decimal(newQuantity * price),
              profitLoss: new Decimal(newQuantity * (price - averagePrice)),
              profitLossPercent: new Decimal(averagePrice > 0 ? ((price - averagePrice) / averagePrice) * 100 : 0),
              lastUpdated: new Date()
            }
          });
        }
      }

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          portfolioId: portfolio.id,
          symbol: symbol.toUpperCase(),
          type: type as 'BUY' | 'SELL',
          quantity: new Decimal(quantity),
          price: new Decimal(price),
          totalAmount: new Decimal(totalCost),
          aiRecommendation: aiRecommendation || null,
          transactionDate: new Date()
        }
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      message: `${type} order executed successfully`,
      data: {
        transactionId: result.id,
        symbol: result.symbol,
        type: result.type,
        quantity: Number(result.quantity),
        price: Number(result.price),
        totalAmount: Number(result.totalAmount)
      }
    });

  } catch (error) {
    console.error('Trade execution error:', error);
    
    // Return specific error messages for known issues
    if (error instanceof Error) {
      if (error.message.includes('Insufficient funds') || error.message.includes('Insufficient shares')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to execute trade' },
      { status: 500 }
    );
  }
}