import { NextRequest, NextResponse } from 'next/server'
import { settleBatch } from '@/lib/gateway'

/**
 * Proxy for Circle Gateway batch settlement API.
 * Receives EIP-712 authorization payload signatures and triggers the batch relayer settlement simulation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { authorizations } = body

    if (!authorizations || !Array.isArray(authorizations) || authorizations.length === 0) {
      return NextResponse.json({ error: 'No signed authorizations provided for settlement' }, { status: 400 })
    }

    console.log(`Aggregating and settling ${authorizations.length} signed EIP-712 authorizations...`)

    // Call local database transaction aggregator simulation
    const result = await settleBatch()

    return NextResponse.json({
      success: true,
      message: `Successfully aggregated and settled ${authorizations.length} EIP-712 signatures.`,
      settledCount: result.settledCount,
      totalSettledAmount: result.totalSettledAmount,
      blockchainTxHash: result.txHash,
      explorerUrl: `https://testnet.arcscan.app/tx/${result.txHash}`
    })
  } catch (err: any) {
    console.error('Batch settlement API failure:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
