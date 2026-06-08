import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { HIGH_RISK_COUNTRIES } from '@/lib/compliance'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet query parameter' }, { status: 400 })
    }

    const walletAddr = wallet.toLowerCase()

    let profile = await prisma.kycProfile.findUnique({
      where: { walletAddr }
    })

    if (!profile) {
      // Return default unverified profile structure
      profile = {
        id: 0,
        walletAddr,
        tier: 'UNVERIFIED',
        fullName: '',
        country: '',
        documentId: '',
        verifiedAt: null,
        expiresAt: null,
        status: 'NONE',
        createdAt: new Date()
      } as any
    }

    return NextResponse.json(profile)
  } catch (err: any) {
    console.error('Failed to get KYC profile:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddr, fullName, country, documentId, requestedTier } = body

    if (!walletAddr || !fullName || !country) {
      return NextResponse.json({ error: 'Missing required KYC fields' }, { status: 400 })
    }

    const walletLower = walletAddr.toLowerCase()
    
    // Perform standard automated country screening
    let status = 'APPROVED'
    let tier = requestedTier || 'BASIC'

    if (HIGH_RISK_COUNTRIES.has(country.toUpperCase())) {
      status = 'REJECTED'
      tier = 'UNVERIFIED'
    } else if (tier === 'ENHANCED' && !documentId) {
      status = 'PENDING'
      tier = 'BASIC'
    }

    const verifiedAt = status === 'APPROVED' ? new Date() : null
    const expiresAt = status === 'APPROVED' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null // 1 year expiry

    // Save to DB
    const profile = await prisma.kycProfile.upsert({
      where: { walletAddr: walletLower },
      update: {
        fullName,
        country: country.toUpperCase(),
        documentId,
        tier,
        status,
        verifiedAt,
        expiresAt
      },
      create: {
        walletAddr: walletLower,
        fullName,
        country: country.toUpperCase(),
        documentId,
        tier,
        status,
        verifiedAt,
        expiresAt
      }
    })

    // Log a compliance check entry
    await prisma.complianceCheck.create({
      data: {
        walletAddr: walletLower,
        checkType: 'SANCTIONS',
        result: status === 'APPROVED' ? 'PASS' : 'FAIL',
        details: JSON.stringify({
          fullName,
          country,
          documentId,
          evaluatedTier: tier
        })
      }
    })

    return NextResponse.json(profile)
  } catch (err: any) {
    console.error('Failed to submit KYC:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
