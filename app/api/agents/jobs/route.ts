import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const client = searchParams.get('client')
    const agent = searchParams.get('agent')

    const whereClause: any = {}
    if (client) whereClause.clientAddr = client.toLowerCase()
    if (agent) whereClause.agentAddr = agent.toLowerCase()

    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        agent: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(jobs)
  } catch (err: any) {
    console.error('Failed to query jobs:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, clientAddr, agentAddr, amount } = body

    if (!title || !clientAddr || !agentAddr || !amount) {
      return NextResponse.json({ error: 'Missing required job fields' }, { status: 400 })
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        clientAddr: clientAddr.toLowerCase(),
        agentAddr: agentAddr.toLowerCase(),
        amount: String(amount),
        status: 'CREATED'
      },
      include: {
        agent: true
      }
    })

    return NextResponse.json(job)
  } catch (err: any) {
    console.error('Failed to create job:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, proofOfWork, txHash } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 })
    }

    const updateData: any = { status }
    if (proofOfWork !== undefined) updateData.proofOfWork = proofOfWork
    if (txHash !== undefined) updateData.txHash = txHash

    // Update job status
    const updated = await prisma.job.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        agent: true
      }
    })

    // If job was APPROVED, we increase the reputation score of the agent by 2 points
    if (status === 'APPROVED') {
      const currentScore = updated.agent.reputationScore
      const nextScore = Math.min(100, currentScore + 2)
      await prisma.agent.update({
        where: { address: updated.agentAddr },
        data: { reputationScore: nextScore }
      })
    }

    // If job was DISPUTED, we decrease the reputation score of the agent by 10 points
    if (status === 'DISPUTED') {
      const currentScore = updated.agent.reputationScore
      const nextScore = Math.max(40, currentScore - 10)
      await prisma.agent.update({
        where: { address: updated.agentAddr },
        data: { reputationScore: nextScore }
      })
    }

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('Failed to update job:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
