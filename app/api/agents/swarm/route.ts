import { NextRequest, NextResponse } from 'next/server'
import { runSwarm, CreatorEvent } from '@/lib/agent-swarm'

/**
 * Triggers the Multi-Agent Swarm execution for a creator attribution event.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, sourceId, creatorName, consumerAddress, metadata } = body

    if (!type || !creatorName || !consumerAddress) {
      return NextResponse.json({ error: 'Missing required creator event fields (type, creatorName, or consumerAddress)' }, { status: 400 })
    }

    const event: CreatorEvent = {
      type,
      sourceId: sourceId || `id-${Math.random().toString(36).substring(2, 9)}`,
      creatorName,
      consumerAddress,
      metadata: metadata || {}
    }

    // Execute swarm reasoning loop
    const result = await runSwarm(event)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Swarm execution api crashed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
