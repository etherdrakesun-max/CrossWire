import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Standard ISO 20022 wire transfer purpose categories
const PURPOSE_LABELS: Record<number, string> = {
  0: 'Treasury & FX',
  1: 'Payroll & Salaries',
  2: 'Supplier Invoice',
  3: 'Retail Micropayments',
  4: 'Commercial Wire Transfer',
  5: 'Agent Escrow Settlement',
  10: 'Other Business Outflows'
}

export async function GET(req: NextRequest) {
  try {
    const wires = await prisma.wire.findMany()
    const kycProfiles = await prisma.kycProfile.findMany()
    
    // Map of wallet -> country
    const countryMap: Record<string, string> = {}
    kycProfiles.forEach(p => {
      countryMap[p.walletAddr.toLowerCase()] = p.country || 'US'
    })

    const purposeBreakdown: Record<string, { name: string; value: number; volume: number }> = {}
    const geoBreakdown: Record<string, { name: string; value: number; volume: number }> = {}

    wires.forEach(wire => {
      const pCode = wire.purposeCode || 0
      const label = PURPOSE_LABELS[pCode] || `Code ${pCode}`
      const amt = Number(wire.amount) / 1e6
      const country = countryMap[wire.sender.toLowerCase()] || 'US' // Default to US if unverified

      // Purpose Code Breakdown
      if (!purposeBreakdown[label]) {
        purposeBreakdown[label] = { name: label, value: 1, volume: amt }
      } else {
        purposeBreakdown[label].value += 1
        purposeBreakdown[label].volume += amt
      }

      // Geo Breakdown
      if (!geoBreakdown[country]) {
        geoBreakdown[country] = { name: country, value: 1, volume: amt }
      } else {
        geoBreakdown[country].value += 1
        geoBreakdown[country].volume += amt
      }
    })

    return NextResponse.json({
      success: true,
      purpose: Object.values(purposeBreakdown),
      geographic: Object.values(geoBreakdown)
    })
  } catch (err: any) {
    console.error('Failed to resolve breakdown analytics:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
