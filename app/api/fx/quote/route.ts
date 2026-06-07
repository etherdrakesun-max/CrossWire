import { NextRequest, NextResponse } from 'next/server'
import { getStableFXQuote } from '@/lib/stablefx'

export async function GET(request: NextRequest) {
  try {
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
