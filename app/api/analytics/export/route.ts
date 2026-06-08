import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'csv'
    const startStr = searchParams.get('startDate')
    const endStr = searchParams.get('endDate')

    const whereClause: any = {}
    if (startStr || endStr) {
      whereClause.createdAt = {}
      if (startStr) {
        whereClause.createdAt.gte = new Date(startStr)
      }
      if (endStr) {
        whereClause.createdAt.lte = new Date(endStr)
      }
    }

    const wires = await prisma.wire.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })

    if (format === 'csv') {
      const headers = 'Wire ID,Sender Address,Recipient Address,Amount (USDC),Fee Amount (USDC),Status,Tx Hash,Timestamp\n'
      const rows = wires.map(w => {
        const amt = (Number(w.amount) / 1e6).toFixed(2)
        const fee = (Number(w.feeAmount || 0) / 1e6).toFixed(2)
        return `"${w.id}","${w.sender}","${w.recipient}","${amt}","${fee}","${w.status}","${w.txHash}","${w.timestamp.toISOString()}"`
      }).join('\n')

      const response = new NextResponse(headers + rows)
      response.headers.set('Content-Type', 'text/csv')
      response.headers.set('Content-Disposition', `attachment; filename=crosswire_ledger_export_${Date.now()}.csv`)
      return response
    }

    // Default: Return structured JSON for web/PDF print render
    return NextResponse.json({
      success: true,
      reportTitle: 'CrossWire Monthly Ledger Statement',
      generatedAt: new Date().toISOString(),
      recordCount: wires.length,
      totals: {
        volumeUsdc: wires.reduce((sum, w) => sum + Number(w.amount) / 1e6, 0),
        feesCollectedUsdc: wires.reduce((sum, w) => sum + Number(w.feeAmount || 0) / 1e6, 0)
      },
      wires: wires.map(w => ({
        id: w.id,
        sender: w.sender,
        recipient: w.recipient,
        amount: Number(w.amount) / 1e6,
        fee: Number(w.feeAmount || 0) / 1e6,
        status: w.status,
        txHash: w.txHash,
        date: w.timestamp.toISOString().split('T')[0]
      }))
    })
  } catch (err: any) {
    console.error('Ledger export endpoint failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
