import { NextRequest, NextResponse } from 'next/server'
import { runSwarm } from '@/lib/agent-swarm'
import { prisma } from '@/lib/db'

/**
 * Owncast Webhook Handler
 * Receives livestream viewer events and triggers autonomous stream verification payouts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, eventData } = body

    if (!type || !eventData) {
      return NextResponse.json({ error: 'Invalid Owncast webhook payload structure' }, { status: 400 })
    }

    console.log(`📡 Owncast Webhook Received: [${type}]`)

    // We settle micro-royalties when users watch live streams (simulating check-ins)
    if (type === 'CHAT_MESSAGE' || type === 'USER_JOINED') {
      const viewerName = eventData.user?.displayName || eventData.username || 'Anonymous Viewer'
      
      let viewerAddress = eventData.user?.walletAddress
      if (!viewerAddress) {
        const user = await prisma.passkeyUser.findFirst({
          where: {
            OR: [
              { username: viewerName },
              { username: viewerName.toLowerCase().replace(/\s+/g, '') }
            ]
          }
        })
        if (user) {
          viewerAddress = user.walletAddress
        } else {
          return NextResponse.json({ error: `Viewer "${viewerName}" not registered on CrossWire` }, { status: 404 })
        }
      }

      const swarmResult = await runSwarm({
        type: 'stream_webhook',
        sourceId: 'owncast-stream-channel',
        creatorName: 'Owncast Broadcaster',
        consumerAddress: viewerAddress,
        metadata: {
          durationSeconds: type === 'CHAT_MESSAGE' ? 300 : 60, // Settle for active chat/engagement duration
          payoutCurrency: 'USDC',
          rawPayload: eventData
        }
      })

      return NextResponse.json({
        success: true,
        processed: true,
        event: type,
        swarm: swarmResult
      })
    }

    return NextResponse.json({
      success: true,
      processed: false,
      message: `Event type [${type}] received but no payout triggered.`
    })
  } catch (err: any) {
    console.error('Owncast webhook processing failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
