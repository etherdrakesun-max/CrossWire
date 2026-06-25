import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userAddress = searchParams.get('userAddress')

    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress query parameter' }, { status: 400 })
    }

    const goals = await prisma.agentGoal.findMany({
      where: { userAddress: userAddress.toLowerCase() },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(goals)
  } catch (err: any) {
    console.error('Failed to retrieve agent history:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
