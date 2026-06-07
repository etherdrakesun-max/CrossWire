import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { credentialId } = await request.json()

    if (!credentialId) {
      return NextResponse.json({ error: 'Missing credentialId' }, { status: 400 })
    }

    const user = await prisma.passkeyUser.findUnique({
      where: { credentialId }
    })

    if (!user) {
      return NextResponse.json({ error: 'Passkey not found. Please register first.' }, { status: 404 })
    }

    return NextResponse.json({
      walletAddress: user.walletAddress,
      username: user.username
    })
  } catch (error: any) {
    console.error('Passkey login error:', error)
    return NextResponse.json({ error: error?.message || 'Server error during passkey verification' }, { status: 500 })
  }
}
