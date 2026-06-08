import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')

    const whereClause: any = {}
    if (wallet) {
      whereClause.sender = wallet.toLowerCase()
    }

    const wires = await prisma.wire.findMany({
      where: whereClause
    })

    // Fetch contacts book to map names
    const contacts = await prisma.contact.findMany()
    const contactMap: Record<string, string> = {}
    contacts.forEach(c => {
      contactMap[c.address.toLowerCase()] = c.name
    })

    const groupMap: Record<string, { address: string; name: string; volume: number; count: number }> = {}

    wires.forEach(wire => {
      const rec = wire.recipient.toLowerCase()
      const amt = Number(wire.amount) / 1e6

      if (!groupMap[rec]) {
        groupMap[rec] = {
          address: wire.recipient,
          name: contactMap[rec] || 'Unknown Counterparty',
          volume: amt,
          count: 1
        }
      } else {
        groupMap[rec].volume += amt
        groupMap[rec].count += 1
      }
    })

    const topCounterparties = Object.values(groupMap)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      data: topCounterparties
    })
  } catch (err: any) {
    console.error('Failed to resolve counterparty analytics:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
