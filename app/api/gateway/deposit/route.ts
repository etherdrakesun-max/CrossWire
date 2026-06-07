import { NextRequest, NextResponse } from 'next/server'
import { depositToGateway } from '@/lib/gateway'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userAddress, amount, txHash } = body

    if (!userAddress || !amount || !txHash) {
      return NextResponse.json({ error: 'Missing required parameters: userAddress, amount, or txHash' }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid deposit amount' }, { status: 400 })
    }

    const result = await depositToGateway(userAddress, parsedAmount, txHash)
    return NextResponse.json({
      success: true,
      deposit: result.deposit,
      balance: result.balance
    })
  } catch (err: any) {
    console.error('Gateway Deposit API Error:', err)
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}
