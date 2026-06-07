import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncEvents } from '@/lib/indexer'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      await syncEvents()
    } catch (err) {
      console.error('Indexer failed to sync on GET /api/wires/[id]:', err)
    }

    const resolvedParams = await params
    const wireId = parseInt(resolvedParams.id)
    if (isNaN(wireId)) {
      return NextResponse.json({ error: 'Invalid wire ID' }, { status: 400 })
    }

    const wire = await prisma.wire.findUnique({
      where: { id: wireId }
    })

    if (!wire) {
      return NextResponse.json({ error: 'Wire not found' }, { status: 404 })
    }

    const events = await prisma.wireEvent.findMany({
      where: { wireId },
      orderBy: { id: 'asc' }
    })

    return NextResponse.json({
      wire,
      events
    })
  } catch (error: any) {
    console.error('API GET wire error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch wire' }, { status: 500 })
  }
}
