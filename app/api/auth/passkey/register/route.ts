import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { credential, walletAddress, username } = await request.json()

    if (!credential?.id || !walletAddress || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if credential ID or username already exists
    const existing = await prisma.passkeyUser.findFirst({
      where: {
        OR: [
          { credentialId: credential.id },
          { username: username }
        ]
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Username or Passkey already registered' }, { status: 400 })
    }

    // Save the mapping in the database
    const user = await prisma.passkeyUser.create({
      data: {
        credentialId: credential.id,
        walletAddress: walletAddress.toLowerCase(),
        username: username
      }
    })

    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error('Passkey registration error:', error)
    return NextResponse.json({ error: error?.message || 'Server error during passkey registration' }, { status: 500 })
  }
}
