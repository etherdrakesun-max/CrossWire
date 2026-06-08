import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddr, subscription } = body

    if (!walletAddr || !subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const walletLower = walletAddr.toLowerCase()

    // Save or update subscription
    const saved = await prisma.notificationSubscription.upsert({
      where: { walletAddr: walletLower },
      update: {
        endpoint: subscription.endpoint,
        keys: JSON.stringify(subscription.keys || {})
      },
      create: {
        walletAddr: walletLower,
        endpoint: subscription.endpoint,
        keys: JSON.stringify(subscription.keys || {})
      }
    })

    return NextResponse.json({
      success: true,
      subscriptionId: saved.id
    })
  } catch (err: any) {
    console.error('Failed to save push subscription:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
