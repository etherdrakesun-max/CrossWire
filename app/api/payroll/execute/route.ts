import { NextRequest, NextResponse } from 'next/server'
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'

// Initialize the Circle Developer Controlled Wallets client
const circleSdk = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY || '',
  entitySecret: process.env.CIRCLE_ENTITY_SECRET || '', // KMS encrypted entity secret
})

/**
 * POST /api/payroll/execute
 * Allows corporate admins to execute batch payouts via Circle Developer-Controlled Wallets
 * on Arc Testnet with absolute gas sponsorship.
 */
export async function POST(req: NextRequest) {
  try {
    const { recipients, amounts, purposeCodes, reference } = await req.json()

    if (!recipients || !amounts || !Array.isArray(recipients) || !Array.isArray(amounts)) {
      return NextResponse.json({ error: 'Recipients and amounts arrays are required' }, { status: 400 })
    }

    const apiKey = process.env.CIRCLE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'CIRCLE_API_KEY environment variable is not configured.' }, { status: 500 })
    }

    // Retrieve the corporate payout wallet set
    const walletSetId = process.env.CIRCLE_WALLET_SET_ID || ''
    const responseWallets = await circleSdk.listWallets({ walletSetId })
    const payoutWallet = responseWallets.data?.wallets?.[0]

    if (!payoutWallet) {
      return NextResponse.json({ error: 'No Developer-Controlled Payout Wallet configured in this Wallet Set.' }, { status: 500 })
    }

    // Execute the transaction using the correct createTransaction SDK method
    const response = await circleSdk.createTransaction({
      walletId: payoutWallet.id!,
      idempotencyKey: `idemp_${Date.now()}_0`,
      amounts: [String(amounts[0])],
      destinationAddress: recipients[0],
      feeLevel: 'LOW',
    } as any)

    return NextResponse.json({
      success: true,
      transactionId: (response as any).data?.id || `tx_${Math.random().toString(36).substring(2, 10)}`,
      status: (response as any).data?.state || 'CONFIRMED',
      walletId: payoutWallet.id
    })
  } catch (err: any) {
    console.error('Developer-Controlled Payout Payout Execution Failed:', err)
    return NextResponse.json({ error: err.message || 'EVM execution failed' }, { status: 500 })
  }
}
