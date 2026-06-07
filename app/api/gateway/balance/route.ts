import { NextRequest, NextResponse } from 'next/server'
import { getGatewayBalance, settleBatch } from '@/lib/gateway'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userAddress = searchParams.get('userAddress')

    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress query parameter' }, { status: 400 })
    }

    const balance = await getGatewayBalance(userAddress)
    return NextResponse.json({ userAddress, balance })
  } catch (err: any) {
    console.error('Gateway Balance GET Error:', err)
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Settle pending nanopayments
    const result = await settleBatch()
    return NextResponse.json({
      success: true,
      settledCount: result.settledCount,
      totalSettledAmount: result.totalSettledAmount,
      settlementTxHash: result.txHash
    })
  } catch (err: any) {
    console.error('Gateway Settle POST Error:', err)
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}
