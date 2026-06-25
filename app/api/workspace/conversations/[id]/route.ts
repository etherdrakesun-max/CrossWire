import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET: Fetch a single conversation with all messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  return NextResponse.json(conversation)
}

// PATCH: Rename a conversation title
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { title } = body

  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: { title }
  })

  return NextResponse.json(updated)
}
