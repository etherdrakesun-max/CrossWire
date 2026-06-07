import { NextRequest, NextResponse } from 'next/server'
import { executeProgrammaticTransfer } from '@/lib/dev-wallet'

/**
 * REST Endpoint for external AI Agents to trigger automated wires programmatically.
 * Expects JSON body with recipient, amount, memo, and purposeCode.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { recipient, amount, memo, purposeCode = 1 } = body

    if (!recipient || !amount) {
      return NextResponse.json({ error: 'Missing required transfer fields (recipient or amount)' }, { status: 400 })
    }

    // Call developer wallet execution engine
    const transferResult = await executeProgrammaticTransfer({
      recipient,
      amount,
      purposeCode: Number(purposeCode),
      memo: memo || 'AI Agent Automated Wire Transfer',
      ownerAddr: recipient
    })


    if (!transferResult.success) {
      return NextResponse.json({ 
        error: 'Automated transfer execution failed', 
        details: transferResult.error 
      }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      message: 'Automated wire transfer successfully executed on Arc',
      txHash: transferResult.txHash,
      wireId: transferResult.wireId
    })
  } catch (err: any) {
    console.error('External agent transfer error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
