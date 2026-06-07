import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseUnits } from 'viem'
import { USDC_DECIMALS } from '@/lib/arc-config'
import { syncEvents } from '@/lib/indexer'

export async function GET(request: NextRequest) {
  try {
    // Automatically trigger indexer to get latest events
    try {
      await syncEvents()
    } catch (err) {
      console.error('Indexer failed to sync on GET /api/wires:', err)
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sender = searchParams.get('sender')
    const recipient = searchParams.get('recipient')
    const minAmount = searchParams.get('minAmount')
    const maxAmount = searchParams.get('maxAmount')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1') || 1
    const limit = parseInt(searchParams.get('limit') || '50') || 50

    const skip = (page - 1) * limit

    const where: any = {}

    if (status) {
      where.status = status.toUpperCase()
    }

    if (sender) {
      where.sender = sender.toLowerCase()
    }

    if (recipient) {
      where.recipient = recipient.toLowerCase()
    }

    if (search) {
      const s = search.toLowerCase()
      where.OR = [
        { sender: { contains: s } },
        { recipient: { contains: s } },
        { refHash: { contains: s } },
        { memo: { contains: s } }
      ]
    }

    // Retrieve sorted wires
    let wires = await prisma.wire.findMany({
      where,
      orderBy: { id: 'desc' }
    })

    // Filter by amount range
    if (minAmount || maxAmount) {
      const minBig = minAmount ? parseUnits(minAmount, USDC_DECIMALS) : null
      const maxBig = maxAmount ? parseUnits(maxAmount, USDC_DECIMALS) : null

      wires = wires.filter((wire) => {
        const amtBig = BigInt(wire.amount)
        if (minBig !== null && amtBig < minBig) return false
        if (maxBig !== null && amtBig > maxBig) return false
        return true
      })
    }

    const total = wires.length
    const paginatedWires = wires.slice(skip, skip + limit)

    // Fetch matching events for the paginated wires
    const wireIds = paginatedWires.map(w => w.id)
    const events = await prisma.wireEvent.findMany({
      where: { wireId: { in: wireIds } },
      orderBy: { id: 'asc' }
    })

    // Combine wires and their events
    const wiresWithEvents = paginatedWires.map((w) => ({
      ...w,
      events: events.filter((e) => e.wireId === w.id)
    }))

    return NextResponse.json({
      wires: wiresWithEvents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error('API GET wires error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch wires' }, { status: 500 })
  }
}
