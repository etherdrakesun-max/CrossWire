import { NextRequest, NextResponse } from 'next/server'
import { getStableFXQuote } from '@/lib/stablefx'
import { verifyX402Payment } from '@/lib/x402-middleware'

export async function GET(request: NextRequest) {
  try {
    // Protect endpoint with $0.005 USDC cost
    const paymentCheck = await verifyX402Payment(request, {
      cost: 0.005,
      recipient: '0x1f91886c7028986ad885ffcee0e40b75c9cd5ac1', // Treasury address
      memo: 'StableFX Real-Time Quote Fee'
    })

    if (!paymentCheck.paid) {
      return paymentCheck.response!
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || 'USDC'
    const to = searchParams.get('to') || 'EURC'
    const amount = searchParams.get('amount') || '1.0'

    const quote = await getStableFXQuote(from, to, amount)
    return NextResponse.json(quote)
  } catch (err: any) {
    console.error('Error fetching StableFX quote:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
