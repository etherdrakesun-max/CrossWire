import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncEvents } from '@/lib/indexer'

export async function GET() {
  try {
    try {
      await syncEvents()
    } catch (err) {
      console.error('Indexer failed to sync on GET /api/stats:', err)
    }

    const wireCount = await prisma.wire.count()
    
    const executedWires = await prisma.wire.findMany({
      where: { status: 'EXECUTED' }
    })
    
    let totalVolumeBig = 0n
    for (const w of executedWires) {
      totalVolumeBig += BigInt(w.amount)
    }

    const recentWires = await prisma.wire.findMany({
      where: { status: 'EXECUTED' },
      orderBy: { id: 'desc' },
      take: 10
    })

    return NextResponse.json({
      wireCount: wireCount.toString(),
      totalVolume: totalVolumeBig.toString(),
      recentWires: recentWires.map((w) => ({
        transactionHash: w.txHash,
        args: {
          wireId: w.id.toString(),
          recipient: w.recipient,
          amount: w.amount,
          refHash: w.refHash
        }
      }))
    })
  } catch (error: any) {
    console.error('API GET stats error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch stats' }, { status: 500 })
  }
}
