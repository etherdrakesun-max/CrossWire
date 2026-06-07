import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json({ error: 'Missing invoice slug' }, { status: 400 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { slug },
      include: { items: true }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (err: any) {
    console.error('Failed to get public invoice details:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
