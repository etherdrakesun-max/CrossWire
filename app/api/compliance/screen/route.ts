import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { screenTransaction, TIER_LIMITS, calculateRiskScore, RiskTier } from '@/lib/compliance'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddr, amount, recipient } = body

    if (!walletAddr || !amount || !recipient) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const senderLower = walletAddr.toLowerCase()
    const recipientLower = recipient.toLowerCase()

    // 1. Fetch Kyc Profile
    const profile = await prisma.kycProfile.findUnique({
      where: { walletAddr: senderLower }
    })

    const tier = (profile?.tier || 'UNVERIFIED') as RiskTier
    const status = profile?.status || 'NONE'
    const fullName = profile?.fullName || undefined
    const country = profile?.country || undefined

    // 2. Perform Sanctions Screening
    const senderScreen = screenTransaction(senderLower, fullName)
    const recipientScreen = screenTransaction(recipientLower)

    let allowed = true
    let reason = ''
    let checkType = 'SANCTIONS'
    let checkResult = 'PASS'

    if (!senderScreen.passed) {
      allowed = false
      reason = `Sender flagged: ${senderScreen.reason}`
      checkType = senderScreen.checkType
      checkResult = senderScreen.result
    } else if (!recipientScreen.passed) {
      allowed = false
      reason = `Recipient flagged: ${recipientScreen.reason}`
      checkType = recipientScreen.checkType
      checkResult = recipientScreen.result
    }

    // 3. Limit Enforcement
    const transferAmount = Number(amount)
    const limit = TIER_LIMITS[tier] || TIER_LIMITS.UNVERIFIED

    if (allowed) {
      // Fetch user's wire transfers from DB for current day/month
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const dailyWires = await prisma.wire.findMany({
        where: {
          sender: senderLower,
          createdAt: { gte: startOfDay }
        }
      })

      const monthlyWires = await prisma.wire.findMany({
        where: {
          sender: senderLower,
          createdAt: { gte: startOfMonth }
        }
      })

      const dailyTotal = dailyWires.reduce((acc, wire) => acc + Number(wire.amount), 0)
      const monthlyTotal = monthlyWires.reduce((acc, wire) => acc + Number(wire.amount), 0)

      if (dailyTotal + transferAmount > limit.daily) {
        allowed = false
        reason = `Transfer exceeds daily compliance limit of $${limit.daily.toLocaleString()} for tier ${tier} (Current daily total: $${dailyTotal.toLocaleString()})`
        checkType = 'LIMIT_BREACH'
        checkResult = 'FAIL'
      } else if (monthlyTotal + transferAmount > limit.monthly) {
        allowed = false
        reason = `Transfer exceeds monthly compliance limit of $${limit.monthly.toLocaleString()} for tier ${tier} (Current monthly total: $${monthlyTotal.toLocaleString()})`
        checkType = 'LIMIT_BREACH'
        checkResult = 'FAIL'
      }
    }

    // Risk Scoring Calculation
    const riskScore = calculateRiskScore({
      country,
      tier,
      hasIpVpn: false,
      failedChecksCount: checkResult === 'FAIL' ? 1 : 0
    })


    // 4. Log Compliance Check in DB
    await prisma.complianceCheck.create({
      data: {
        walletAddr: senderLower,
        checkType,
        result: checkResult,
        details: JSON.stringify({
          recipient: recipientLower,
          amount: transferAmount,
          reason,
          riskScore
        })
      }
    })

    return NextResponse.json({
      allowed,
      reason,
      tier,
      limit,
      riskScore
    })
  } catch (err: any) {
    console.error('Compliance screening failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
export async function GET(req: NextRequest) {
  try {
    const checks = await prisma.complianceCheck.findMany({
      orderBy: { checkedAt: 'desc' },
      take: 20
    })
    return NextResponse.json(checks)
  } catch (err: any) {
    console.error('Failed to get compliance audit logs:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
