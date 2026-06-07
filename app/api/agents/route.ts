import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        jobs: true
      },
      orderBy: {
        reputationScore: 'desc'
      }
    })
    return NextResponse.json(agents)
  } catch (err: any) {
    console.error('Failed to retrieve agents:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { address, name, capabilities, agentCardUri } = body

    if (!address || !name) {
      return NextResponse.json({ error: 'Missing required agent fields (address or name)' }, { status: 400 })
    }

    const addrLower = address.toLowerCase()
    
    // Upsert the Agent registration record in local database
    const agent = await prisma.agent.upsert({
      where: { address: addrLower },
      update: {
        name,
        capabilities: Array.isArray(capabilities) ? capabilities.join(',') : capabilities,
        agentCardUri: agentCardUri || '',
        status: 'ACTIVE'
      },
      create: {
        address: addrLower,
        name,
        capabilities: Array.isArray(capabilities) ? capabilities.join(',') : capabilities,
        agentCardUri: agentCardUri || '',
        reputationScore: 100,
        status: 'ACTIVE'
      }
    })

    return NextResponse.json(agent)
  } catch (err: any) {
    console.error('Failed to register agent:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
