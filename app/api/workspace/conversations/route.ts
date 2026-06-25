import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET: List conversations for a user
export async function GET(req: NextRequest) {
  const userAddress = req.nextUrl.searchParams.get('userAddress')
  if (!userAddress) {
    return NextResponse.json({ error: 'userAddress required' }, { status: 400 })
  }

  const conversations = await prisma.conversation.findMany({
    where: { userAddress: userAddress.toLowerCase(), status: 'ACTIVE' },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, role: true, createdAt: true }
      },
      _count: { select: { messages: true } }
    }
  })

  return NextResponse.json(conversations)
}

// DELETE: Archive a conversation
export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { conversationId } = body
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'ARCHIVED' }
  })

  return NextResponse.json({ success: true })
}
