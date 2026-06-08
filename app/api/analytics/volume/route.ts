import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '30' // 7, 30, 90 days

    const daysCount = parseInt(range)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysCount)

    // Fetch wires
    const wires = await prisma.wire.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Group by Date String (YYYY-MM-DD)
    const dailyMap: Record<string, { date: string; volume: number; wires: number; fees: number }> = {}

    // Populate all days in the range with 0 to prevent graph gaps
    for (let i = daysCount; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      dailyMap[dateStr] = { date: dateStr, volume: 0, wires: 0, fees: 0 }
    }

    wires.forEach(wire => {
      const dateStr = new Date(wire.timestamp).toISOString().split('T')[0]
      const amt = Number(wire.amount) / 1e6 // Convert from USDC decimals
      const fee = Number(wire.feeAmount || 0) / 1e6

      if (dailyMap[dateStr]) {
        dailyMap[dateStr].volume += amt
        dailyMap[dateStr].wires += 1
        dailyMap[dateStr].fees += fee
      } else {
        dailyMap[dateStr] = {
          date: dateStr,
          volume: amt,
          wires: 1,
          fees: fee
        }
      }
    })

    const chartData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: chartData
    })
  } catch (err: any) {
    console.error('Failed to aggregate volume analytics:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
