import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFunctionSelector } from 'viem'
import path from 'path'
import fs from 'fs'
import { CROSSWIRE_CONTRACT_ADDRESS, USDC_ADDRESS } from '@/lib/arc-config'

// Load sponsorship policy file
function getSponsorshipPolicy() {
  try {
    const policyPath = path.join(process.cwd(), 'config', 'sponsorship-policy.json')
    const fileContent = fs.readFileSync(policyPath, 'utf8')
    return JSON.parse(fileContent)
  } catch (err) {
    console.error('Error reading sponsorship policy file:', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action = 'validate', userAddress } = body

    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 })
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Calculate user's daily gas savings spending
    const dailyAggregate = await prisma.sponsorship.aggregate({
      _sum: {
        gasSavedUsd: true
      },
      where: {
        userAddress: userAddress.toLowerCase(),
        timestamp: {
          gte: oneDayAgo
        }
      }
    })

    const dailySpent = dailyAggregate._sum.gasSavedUsd || 0

    if (action === 'validate') {
      const { target, data } = body

      if (!target || !data) {
        return NextResponse.json({ error: 'Missing target or data for validation' }, { status: 400 })
      }

      // Check daily limit ($100 per day)
      if (dailySpent >= 100.0) {
        return NextResponse.json({
          sponsored: false,
          reason: `Daily gas sponsorship limit ($100.00) exceeded. Spent: $${dailySpent.toFixed(2)}`
        })
      }

      // Retrieve policy rules
      const policy = getSponsorshipPolicy()
      if (!policy) {
        return NextResponse.json({
          sponsored: false,
          reason: 'Sponsorship policy configuration file could not be loaded'
        })
      }

      const selector = data.slice(0, 10).toLowerCase()
      let matchedRule = false

      for (const rule of policy.rules) {
        try {
          const ruleSelector = getFunctionSelector(rule.functionSignature)
          if (ruleSelector.toLowerCase() === selector) {
            const targetLower = target.toLowerCase()
            const ruleAddrLower = rule.contractAddress.toLowerCase()

            // Match if:
            // 1. Matches exact contractAddress in policy
            // 2. Matches active CrossWire Router deployment
            // 3. Matches active USDC token contract
            if (
              targetLower === ruleAddrLower ||
              targetLower === CROSSWIRE_CONTRACT_ADDRESS.toLowerCase() ||
              targetLower === USDC_ADDRESS.toLowerCase()
            ) {
              matchedRule = true
              break
            }
          }
        } catch (selectorErr) {
          console.error('Selector parsing error for rule:', rule, selectorErr)
        }
      }

      if (matchedRule) {
        return NextResponse.json({
          sponsored: true,
          dailySpent,
          remainingLimit: Math.max(0, 100.0 - dailySpent)
        })
      }

      return NextResponse.json({
        sponsored: false,
        reason: `Function selector ${selector} on contract ${target} is not approved for sponsorship`
      })
    }

    if (action === 'record') {
      const { txHash, gasSavedUsd } = body

      if (!txHash || gasSavedUsd === undefined) {
        return NextResponse.json({ error: 'Missing txHash or gasSavedUsd for recording' }, { status: 400 })
      }

      // Check for duplicate to prevent double tracking
      const existing = await prisma.sponsorship.findUnique({
        where: { txHash }
      })

      if (existing) {
        return NextResponse.json({ success: true, entry: existing, info: 'Sponsorship already recorded' })
      }

      const entry = await prisma.sponsorship.create({
        data: {
          userAddress: userAddress.toLowerCase(),
          txHash,
          gasSavedUsd: parseFloat(gasSavedUsd)
        }
      })

      return NextResponse.json({ success: true, entry })
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 })
  } catch (err: any) {
    console.error('Sponsorship API Error:', err)
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userAddress = searchParams.get('userAddress')

    // Sum of all gas savings globally
    const globalSavings = await prisma.sponsorship.aggregate({
      _sum: {
        gasSavedUsd: true
      }
    })

    const totalGasSaved = globalSavings._sum.gasSavedUsd || 0

    if (userAddress) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const userSavings = await prisma.sponsorship.aggregate({
        _sum: {
          gasSavedUsd: true
        },
        where: {
          userAddress: userAddress.toLowerCase()
        }
      })

      const dailySavings = await prisma.sponsorship.aggregate({
        _sum: {
          gasSavedUsd: true
        },
        where: {
          userAddress: userAddress.toLowerCase(),
          timestamp: {
            gte: oneDayAgo
          }
        }
      })

      const userTotal = userSavings._sum.gasSavedUsd || 0
      const userDailySpent = dailySavings._sum.gasSavedUsd || 0

      return NextResponse.json({
        totalGasSaved,
        userTotal,
        userDailySpent,
        remainingLimit: Math.max(0, 100.0 - userDailySpent)
      })
    }

    return NextResponse.json({ totalGasSaved })
  } catch (err: any) {
    console.error('Sponsorship GET Error:', err)
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}
