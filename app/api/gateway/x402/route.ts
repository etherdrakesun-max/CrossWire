import { NextRequest, NextResponse } from 'next/server'
import { getGatewayBalance, createNanopayment } from '@/lib/gateway'

/**
 * HTTP 402 Payment Required Gateway API endpoint
 * 
 * Flow:
 * 1. Client requests endpoint.
 * 2. If no `x-payment-signature` and `x-payment-sender` headers are found, return HTTP 402 with `PAYMENT-REQUIRED` headers.
 * 3. If headers are present, verify Gateway balance, deduct payment, process the wire transfer, and return success.
 */
export async function POST(req: NextRequest) {
  try {
    const sender = req.headers.get('x-payment-sender')
    const signature = req.headers.get('x-payment-signature')
    
    // x402 cost details for calling this premium API
    const API_CALL_COST = 0.05 // $0.05 USDC per wire API call

    if (!sender || !signature) {
      // Return HTTP 402 Payment Required
      const res = NextResponse.json(
        {
          error: 'Payment Required',
          message: 'This endpoint requires an x402 Gateway micropayment of 0.05 USDC to process.',
          cost: API_CALL_COST,
          currency: 'USDC'
        },
        { status: 402 }
      );
      
      // Inject standard x402 headers
      res.headers.set('PAYMENT-REQUIRED', `cost=${API_CALL_COST}&token=USDC&recipient=protocol-treasury`)
      return res
    }

    // Client provided payment signatures/headers.
    // Parse the actual transfer payload from the body.
    const body = await req.json()
    const { recipient, amount, memo = 'x402 Programmatic Payout', purposeCode = 0 } = body

    if (!recipient || !amount) {
      return NextResponse.json({ error: 'Missing recipient or amount in payout payload' }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 })
    }

    // 1. Verify caller has enough Gateway balance to pay for the API call AND the transfer amount
    const totalRequired = API_CALL_COST + parsedAmount
    const senderBal = await getGatewayBalance(sender)

    if (senderBal < totalRequired) {
      return NextResponse.json(
        {
          error: 'Insufficient Balance',
          message: `Your Gateway balance of $${senderBal.toFixed(4)} USDC is insufficient to cover the transfer ($${parsedAmount.toFixed(4)}) and API fee ($${API_CALL_COST.toFixed(4)}).`
        },
        { status: 402 }
      )
    }

    // 2. Process API fee nanopayment to treasury
    const TREASURY_ADDRESS = '0x1f91886c7028986ad885ffcee0e40b75c9cd5ac1'
    await createNanopayment(
      sender,
      TREASURY_ADDRESS,
      API_CALL_COST,
      2, // Invoice settlement purpose code
      'x402 API Call Fee'
    )

    // 3. Process the actual micropayment wire transfer to the beneficiary
    const result = await createNanopayment(
      sender,
      recipient,
      parsedAmount,
      purposeCode,
      memo
    )

    // 4. Return success along with payment transaction details
    return NextResponse.json({
      success: true,
      message: 'x402 Micropayment Wire Processed Successfully',
      apiCallCost: API_CALL_COST,
      transferDetails: {
        sender: sender.toLowerCase(),
        recipient: recipient.toLowerCase(),
        amount: parsedAmount,
        wireId: result.wire.id,
        txHash: result.wire.txHash,
        status: 'EXECUTED'
      }
    })
  } catch (err: any) {
    console.error('x402 Micropayment API Error:', err)
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}
