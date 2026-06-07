import { NextRequest, NextResponse } from 'next/server'
import { fetchMultiChainUSDCBalances } from '@/lib/unified-balance'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('userAddress')

    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress query parameter' }, { status: 400 })
    }

    if (!userAddress.startsWith('0x') || userAddress.length !== 42) {
      return NextResponse.json({ error: 'Invalid Ethereum address format' }, { status: 400 })
    }

    const balances = await fetchMultiChainUSDCBalances(userAddress)
    return NextResponse.json(balances)
  } catch (err: any) {
    console.error('Error fetching multi-chain balances API:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
