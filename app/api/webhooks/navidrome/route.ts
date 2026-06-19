import { NextRequest, NextResponse } from 'next/server'
import { runSwarm } from '@/lib/agent-swarm'
import { prisma } from '@/lib/db'

/**
 * Navidrome Scrobble Webhook / Subsonic playback logger
 * Settle micro-royalties to artists in real-time as music is streamed.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, artistName, trackTitle, durationPlayed = 0, payoutCurrency = 'USDC' } = body

    if (!username || !artistName || !trackTitle) {
      return NextResponse.json({ error: 'Missing required Navidrome scrobble fields' }, { status: 400 })
    }

    console.log(`🎵 Navidrome Scrobble Received: "${trackTitle}" by ${artistName} (User: ${username})`)

    // We only trigger payments if the user listened for more than 30 seconds
    if (durationPlayed < 30) {
      return NextResponse.json({
        success: true,
        processed: false,
        reason: `Playback duration too short (${durationPlayed}s). Required >= 30s.`
      })
    }

    // Resolve listener user address dynamically from database
    const user = await prisma.passkeyUser.findUnique({
      where: { username }
    })
    if (!user) {
      return NextResponse.json({ error: `Listener user "${username}" not registered on CrossWire` }, { status: 404 })
    }
    const consumerAddress = user.walletAddress

    const swarmResult = await runSwarm({
      type: 'scrobble',
      sourceId: 'mbid-taylor-swift',
      creatorName: artistName,
      consumerAddress,
      metadata: {
        track: trackTitle,
        payoutCurrency,
        playbackSec: durationPlayed
      }
    })

    return NextResponse.json({
      success: true,
      processed: true,
      track: trackTitle,
      artist: artistName,
      swarm: swarmResult
    })
  } catch (err: any) {
    console.error('Navidrome scrobble processing failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
