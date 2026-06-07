import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { executeStableFXTrade, StableFXQuote } from '@/lib/stablefx'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quote, userAddress } = body as { quote: StableFXQuote; userAddress: string }

    if (!quote || !userAddress) {
      return NextResponse.json({ error: 'Missing quote or userAddress parameters' }, { status: 400 })
    }

    // Execute trade using StableFX engine
    const tradeResult = await executeStableFXTrade(quote)

    // Save executed trade to the database
    const savedTrade = await prisma.fxTrade.create({
      data: {
        userAddress: userAddress.toLowerCase(),
        sellCurrency: tradeResult.sellCurrency,
        sellAmount: tradeResult.sellAmount,
        buyCurrency: tradeResult.buyCurrency,
        buyAmount: tradeResult.buyAmount,
        quotedRate: tradeResult.quotedRate,
        executedRate: tradeResult.executedRate,
        slippage: tradeResult.slippage,
        txHash: tradeResult.txHash,
      },
    })

    return NextResponse.json({ ...tradeResult, dbId: savedTrade.id })
  } catch (err: any) {
    console.error('Error executing StableFX trade:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// Support GET method to retrieve FX swap history for the user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('userAddress')

    if (!userAddress) {
      // Return all trades if no specific address is provided
      const trades = await prisma.fxTrade.findMany({
        orderBy: { timestamp: 'desc' },
      })
      return NextResponse.json(trades)
    }

    const trades = await prisma.fxTrade.findMany({
      where: {
        userAddress: userAddress.toLowerCase(),
      },
      orderBy: { timestamp: 'desc' },
    })

    return NextResponse.json(trades)
  } catch (err: any) {
    console.error('Error fetching FX trade history:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
