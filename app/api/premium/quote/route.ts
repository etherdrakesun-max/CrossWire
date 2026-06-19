import { NextRequest, NextResponse } from 'next/server'
import { verifyX402Payment } from '@/lib/x402-middleware'

/**
 * x402 Gated Financial Premium Quote API
 * Cost: 0.01 USDC
 */
export async function POST(req: NextRequest) {
  try {
    const QUOTE_COST = 0.01 // $0.01 USDC
    const QUOTES_VAULT = '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65'

    // Protect endpoint with verifyX402Payment
    const paymentCheck = await verifyX402Payment(req, {
      cost: QUOTE_COST,
      recipient: QUOTES_VAULT,
      memo: 'x402 Premium Quote Request'
    })

    if (!paymentCheck.paid) {
      return paymentCheck.response!
    }

    // Process payout payload
    const body = await req.json()
    const { symbol } = body

    if (!symbol) {
      return NextResponse.json({ error: 'Missing stock/crypto symbol parameter' }, { status: 400 })
    }

    // Generate random financial quotes for mock symbol
    const basePrices: Record<string, number> = {
      BTC: 68450.25,
      ETH: 3512.40,
      USDC: 1.00,
      EURC: 1.08
    }
    const basePrice = basePrices[symbol.toUpperCase()] || 125.50
    const finalPrice = basePrice * (1 + (Math.random() - 0.5) * 0.002)

    return NextResponse.json({
      success: true,
      symbol: symbol.toUpperCase(),
      price: Number(finalPrice.toFixed(4)),
      change24h: Number(((Math.random() - 0.4) * 2.5).toFixed(2)),
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
