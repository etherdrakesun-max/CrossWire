import { NextRequest, NextResponse } from 'next/server'
import { getGatewayBalance, createNanopayment } from './gateway'

export interface X402Config {
  cost: number
  recipient: string
  memo: string
}

/**
 * Validates x402 headers (x-payment-sender and x-payment-signature).
 * If valid, processes the micropayment and allows the API to proceed.
 * If invalid, returns a 402 Payment Required response.
 */
export async function verifyX402Payment(
  req: NextRequest,
  config: X402Config
): Promise<{ paid: boolean; response?: NextResponse; senderAddress?: string }> {
  const sender = req.headers.get('x-payment-sender')
  const signature = req.headers.get('x-payment-signature')

  if (!sender || !signature) {
    const res = NextResponse.json(
      {
        error: 'Payment Required',
        message: `This endpoint requires an x402 Gateway micropayment of ${config.cost} USDC to proceed.`,
        cost: config.cost,
        currency: 'USDC',
        recipient: config.recipient
      },
      { status: 402 }
    )
    
    // Inject standard x402 challenge headers
    res.headers.set('PAYMENT-REQUIRED', `cost=${config.cost}&token=USDC&recipient=${config.recipient}`)
    return { paid: false, response: res }
  }

  const senderLower = sender.toLowerCase()
  const balance = await getGatewayBalance(senderLower)
  
  if (balance < config.cost) {
    const res = NextResponse.json(
      {
        error: 'Insufficient Gateway Balance',
        message: `Your Gateway balance of $${balance.toFixed(6)} USDC is insufficient to cover this call ($${config.cost.toFixed(6)}). Please deposit testnet USDC.`
      },
      { status: 402 }
    )
    return { paid: false, response: res }
  }

  // Deduct the API call fee from Gateway balance
  await createNanopayment(
    senderLower,
    config.recipient.toLowerCase(),
    config.cost,
    2, // Purpose code: 2 = API / Service Settlement
    config.memo
  )

  return { paid: true, senderAddress: senderLower }
}
