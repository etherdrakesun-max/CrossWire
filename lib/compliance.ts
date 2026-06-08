/**
 * Advanced Compliance, KYC, and AML Risk Analysis Engine
 */

export type RiskTier = 'UNVERIFIED' | 'BASIC' | 'ENHANCED' | 'INSTITUTIONAL'

export interface TransferLimits {
  daily: number
  monthly: number
}

// Limits as specified by the requirements
export const TIER_LIMITS: Record<RiskTier, TransferLimits> = {
  UNVERIFIED: { daily: 100, monthly: 500 },
  BASIC: { daily: 10000, monthly: 50000 },
  ENHANCED: { daily: 100000, monthly: 500000 },
  INSTITUTIONAL: { daily: 10000000, monthly: 50000000 }
}

// OFAC / EU Sanctioned Addresses & Names list
export const SANCTIONED_ADDRESSES = new Set([
  '0xd90e2fe9c7306089000a7a04b1e42dd7483ef333', // tornado cash router mock
  '0x776165696e67657220546f726e61646f2043617368', // tornado cash alternative
  '0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c', // Lazarus Group mock
  '0x0000000000000000000000000000000000000001', // system zero mock bad address
])

export const SANCTIONED_NAMES = new Set([
  'kim jong un',
  'nicolas maduro',
  'bashar al-assad',
  'lazarus group',
  'tornado cash user'
])

export const HIGH_RISK_COUNTRIES = new Set([
  'KP', // North Korea
  'IR', // Iran
  'SY', // Syria
  'CU', // Cuba
  'RU', // Russia
])

/**
 * Pre-flight screening check for sanctions (OFAC/EU), PEP status, and known bad actors.
 */
export function screenTransaction(walletAddr: string, fullName?: string): {
  passed: boolean
  reason?: string
  checkType: 'SANCTIONS' | 'PEP' | 'ADVERSE_MEDIA'
  result: 'PASS' | 'FAIL' | 'REVIEW'
} {
  const addressLower = walletAddr.toLowerCase()

  // 1. Sanctions screening on address
  if (SANCTIONED_ADDRESSES.has(addressLower)) {
    return {
      passed: false,
      reason: 'Sanctioned blockchain address detected on OFAC/EU list',
      checkType: 'SANCTIONS',
      result: 'FAIL'
    }
  }

  // 2. PEP/Sanctions screening on Name
  if (fullName) {
    const nameClean = fullName.toLowerCase().trim()
    for (const bannedName of SANCTIONED_NAMES) {
      if (nameClean.includes(bannedName)) {
        return {
          passed: false,
          reason: `Designated individual match found: ${fullName}`,
          checkType: 'PEP',
          result: 'FAIL'
        }
      }
    }
  }

  // 3. Simulated review flag for high-profile alerts
  if (fullName && fullName.toLowerCase().includes('pep')) {
    return {
      passed: false,
      reason: 'Politically Exposed Person (PEP) list review flag triggered',
      checkType: 'PEP',
      result: 'REVIEW'
    }
  }

  return {
    passed: true,
    checkType: 'SANCTIONS',
    result: 'PASS'
  }
}

/**
 * Calculates user overall risk score (0 to 100).
 * Lower is better/safer.
 */
export function calculateRiskScore(params: {
  country?: string
  tier: RiskTier
  hasIpVpn?: boolean
  failedChecksCount?: number
}): number {
  let score = 10 // baseline risk

  // Country multiplier
  if (params.country && HIGH_RISK_COUNTRIES.has(params.country.toUpperCase())) {
    score += 70
  } else if (params.country && ['CN', 'RU', 'VE'].includes(params.country.toUpperCase())) {
    score += 30
  }

  // Verification level reduction
  if (params.tier === 'ENHANCED') {
    score -= 10
  } else if (params.tier === 'INSTITUTIONAL') {
    score -= 15
  } else if (params.tier === 'UNVERIFIED') {
    score += 15
  }

  // VPN/IP flag
  if (params.hasIpVpn) {
    score += 25
  }

  // Historical flags
  if (params.failedChecksCount) {
    score += (params.failedChecksCount * 20)
  }

  // Clamp score
  return Math.max(5, Math.min(100, score))
}
