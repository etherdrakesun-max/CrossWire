import { NextRequest, NextResponse } from 'next/server'
import { verifyX402Payment } from '@/lib/x402-middleware'

/**
 * x402 Gated Citational Index Endpoint
 * Cost: 0.005 USDC
 */
export async function POST(req: NextRequest) {
  try {
    const CITATION_COST = 0.005 // $0.005 USDC
    const CITATION_VAULT = '0x90f79bf6eb2c4f870365e785982e1f101e93b906'

    // Protect endpoint with verifyX402Payment
    const paymentCheck = await verifyX402Payment(req, {
      cost: CITATION_COST,
      recipient: CITATION_VAULT,
      memo: 'x402 Citation lookup request'
    })

    if (!paymentCheck.paid) {
      return paymentCheck.response!
    }

    const body = await req.json()
    const { articleId } = body

    if (!articleId) {
      return NextResponse.json({ error: 'Missing articleId parameter' }, { status: 400 })
    }

    // Premium research lookup results
    const papers: Record<string, any> = {
      'paper-01': {
        title: 'USDC Micropayments: Scaling Creator Platforms via Batched Settlement',
        authors: ['Circle Research', 'Canteen Devs'],
        citationsCount: 42,
        citationToken: 'CIT-77a6e31e'
      },
      'paper-02': {
        title: 'Autonomous Swarms and Agentic Budgets on the Arc Blockchain',
        authors: ['Antigravity Labs'],
        citationsCount: 18,
        citationToken: 'CIT-27f4cc3b'
      }
    }

    const result = papers[articleId] || {
      title: `Unknown Research Article (${articleId})`,
      authors: ['Anonymous Peer-Reviewer'],
      citationsCount: 1,
      citationToken: 'CIT-generic'
    }

    return NextResponse.json({
      success: true,
      articleId,
      citationDetails: result
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
