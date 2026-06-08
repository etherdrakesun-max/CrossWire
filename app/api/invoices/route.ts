import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendPushNotification } from '@/lib/backend-notifications'


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ error: 'Missing address query parameter' }, { status: 400 })
    }

    const addrLower = address.toLowerCase()

    // Fetch invoices where user is either the payee or the payer
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { payeeAddr: addrLower },
          { payerAddr: addrLower }
        ]
      },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(invoices)
  } catch (err: any) {
    console.error('Failed to get invoices:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      payeeAddr,
      payerAddr,
      amount,
      memo = '',
      dueDate,
      status = 'DRAFT',
      items = []
    } = body

    if (!payeeAddr || !amount) {
      return NextResponse.json({ error: 'Missing required invoice fields (payeeAddr or amount)' }, { status: 400 })
    }

    // Build the Invoice and related items in a transactional construct
    const invoice = await prisma.$transaction(async (tx) => {
      const createdInvoice = await tx.invoice.create({
        data: {
          payeeAddr: payeeAddr.toLowerCase(),
          payerAddr: payerAddr ? payerAddr.toLowerCase() : null,
          amount: String(amount),
          memo,
          dueDate: dueDate ? new Date(dueDate) : null,
          status
        }
      })

      if (items.length > 0) {
        await tx.invoiceItem.createMany({
          data: items.map((item: any) => ({
            invoiceId: createdInvoice.id,
            description: item.description,
            quantity: item.quantity !== undefined ? Number(item.quantity) : 1,
            unitPrice: String(item.unitPrice)
          }))
        })
      }

      return tx.invoice.findUnique({
        where: { id: createdInvoice.id },
        include: { items: true }
      })
    })

    return NextResponse.json(invoice)
  } catch (err: any) {
    console.error('Failed to create invoice:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, txHash, wireId, payerAddr } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 })
    }

    const updatedData: any = { status }

    if (status === 'PAID') {
      updatedData.paidAt = new Date()
      if (txHash) updatedData.txHash = txHash
      if (wireId !== undefined) updatedData.wireId = Number(wireId)
      if (payerAddr) updatedData.payerAddr = payerAddr.toLowerCase()
    }

    const updated = await prisma.invoice.update({
      where: { id: Number(id) },
      data: updatedData,
      include: { items: true }
    })

    if (status === 'PAID') {
      const payer = updated.payerAddr || 'A client'
      await sendPushNotification(
        updated.payeeAddr,
        'Invoice Paid',
        `Invoice #${updated.id} for ${updated.amount} USDC has been successfully settled by ${payer}.`,
        `/invoices`
      )
    }

    return NextResponse.json(updated)

  } catch (err: any) {
    console.error('Failed to update invoice:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
