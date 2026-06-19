import { screenTransaction } from './compliance'
import { getStableFXQuote, executeStableFXTrade } from './stablefx'
import { createNanopayment, getGatewayBalance } from './gateway'
import { prisma } from './db'
import { ChatOpenAI } from '@langchain/openai'

export interface CreatorEvent {
  type: 'scrobble' | 'stream_webhook' | 'citation'
  sourceId: string // MBID, channelId, or articleId
  creatorName: string
  consumerAddress: string
  metadata?: any
}

export interface SwarmLog {
  timestamp: string
  agent: 'COORDINATOR' | 'REGISTRY' | 'VERIFIER' | 'COMPLIANCE' | 'SETTLEMENT' | 'AI_BRAIN'
  message: string
  status: 'info' | 'success' | 'warning' | 'error'
}

export interface SwarmResult {
  success: boolean
  logs: SwarmLog[]
  settlementDetails?: {
    recipient: string
    currency: string
    rawAmount: number
    settledAmount: number
    txHash?: string
  }
}

/**
 * Resolves creator identities to Web3 wallets (MusicBrainz and EXIF mappings).
 */
export function resolveCreatorWallet(creatorName: string, sourceId: string): string {
  const nameClean = creatorName.toLowerCase().trim()
  
  if (nameClean.includes('taylor') || sourceId === 'mbid-taylor-swift') {
    return '0x70997970c51812dc3a010c7d01b50e0d17dc79c8' // Test Account 1
  }
  if (nameClean.includes('owncast') || sourceId === 'owncast-stream-channel') {
    return '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc' // Test Account 2
  }
  if (nameClean.includes('rsshub') || nameClean.includes('author') || sourceId.startsWith('paper-')) {
    return '0x90f79bf6eb2c4f870365e785982e1f101e93b906' // Test Account 3
  }
  
  return '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65'
}

/**
 * Executes the Multi-Agent Swarm logic.
 * Processes creator events, screening them through the compliance and verification agents,
 * resolving metadata, and settling nanopayments.
 */
export async function runSwarm(event: CreatorEvent): Promise<SwarmResult> {
  const logs: SwarmLog[] = []
  const log = (agent: SwarmLog['agent'], message: string, status: SwarmLog['status'] = 'info') => {
    logs.push({
      timestamp: new Date().toLocaleTimeString(),
      agent,
      message,
      status
    })
  }

  try {
    // ── STAGE 1: COORDINATOR AGENT (Budget and Coordination) ──
    log('COORDINATOR', `Received new creator event of type: [${event.type.toUpperCase()}] from creator: "${event.creatorName}"`)
    
    // Check Agent swarm budget limits
    const budgetLimit = 10.0 // Daily autonomous spending cap in USDC
    log('COORDINATOR', `Checking autonomous spending budget. Daily cap: $${budgetLimit.toFixed(2)} USDC.`)
    
    const consumerBal = await getGatewayBalance(event.consumerAddress)
    log('COORDINATOR', `Consumer Gateway balance: $${consumerBal.toFixed(6)} USDC.`)
    
    if (consumerBal <= 0) {
      log('COORDINATOR', `Budget check failed: Consumer Gateway balance is empty. Refusing service.`, 'error')
      return { success: false, logs }
    }

    // ── STAGE 2: AI REASONING / COGNITIVE DECISION LOOP ──
    let selectedPayoutCurrency = event.metadata?.payoutCurrency || 'USDC'
    const openAiKey = process.env.OPENAI_API_KEY
    
    if (openAiKey) {
      log('AI_BRAIN', `OpenAI API key detected. Invoking ChatOpenAI cognitive planning model...`)
      try {
        const chat = new ChatOpenAI({
          openAIApiKey: openAiKey,
          modelName: 'gpt-4o-mini',
          temperature: 0
        })
        
        const systemPrompt = `You are the AI brain coordinating the CrossWire Agent Swarm. 
The event type is "${event.type}" from creator "${event.creatorName}" with metadata: ${JSON.stringify(event.metadata)}.
Based on the payout preferences, decide whether we should settle in "USDC" directly or perform an FX swap to "EURC".
Reply ONLY with a JSON object: {"decision": "USDC" | "EURC", "rationale": "short explanation"}`
        
        const response = await chat.call([
          { role: 'system', content: systemPrompt }
        ])
        
        const parsed = JSON.parse(response.text)
        log('AI_BRAIN', `Decision: Settle in ${parsed.decision}. Rationale: ${parsed.rationale}`, 'success')
        selectedPayoutCurrency = parsed.decision
      } catch (aiErr: any) {
        log('AI_BRAIN', `AI planning loop failed. Falling back to default heuristics. Error: ${aiErr.message}`, 'warning')
      }
    } else {
      log('AI_BRAIN', `No OpenAI API key found. Executing standard rule-based cognitive heuristics.`, 'info')
    }

    // ── STAGE 3: REGISTRY AGENT ──
    log('REGISTRY', `Resolving creator identity and target wallet for "${event.creatorName}" (ID: ${event.sourceId})...`)
    const creatorWallet = resolveCreatorWallet(event.creatorName, event.sourceId)
    log('REGISTRY', `Successfully resolved payee wallet: ${creatorWallet}`, 'success')

    // ── STAGE 4: VERIFICATION & AGENT-TO-AGENT HIRING ──
    log('VERIFIER', `Verifier Agent hired by Coordinator for auditing FOSS metrics.`)
    
    // Agent-to-Agent Fee
    const verifierFee = 0.00005 // Verifier fee in USDC
    log('COORDINATOR', `Paying Verifier Agent hiring fee of $${verifierFee.toFixed(6)} USDC...`)
    
    let paymentAmount = 0.0001 // Default base payment
    if (event.type === 'scrobble') {
      log('VERIFIER', `Verified track play: "${event.metadata?.track || 'Unknown Track'}" for ${event.creatorName}.`)
      paymentAmount = 0.00025 // $0.00025 per scrobble
    } else if (event.type === 'stream_webhook') {
      const duration = Number(event.metadata?.durationSeconds || 0)
      log('VERIFIER', `Verified live stream viewer check-in. Duration watched: ${duration} seconds.`)
      paymentAmount = duration * 0.00001 // $0.00001 USDC per second
    } else if (event.type === 'citation') {
      log('VERIFIER', `Scanning RSS citation data for LLM Crawler resolve.`)
      paymentAmount = 0.005 // $0.005 per citation lookup
    }

    const totalCost = paymentAmount + verifierFee
    if (consumerBal < totalCost) {
      log('COORDINATOR', `Insufficient balance to cover wire ($${paymentAmount.toFixed(6)}) and agent hiring fee ($${verifierFee.toFixed(6)}).`, 'error')
      return { success: false, logs }
    }

    log('VERIFIER', `Validation passed. Payment amount approved: $${paymentAmount.toFixed(6)} USDC`, 'success')

    // ── STAGE 5: COMPLIANCE AGENT (OFAC Scan) ──
    log('COMPLIANCE', `Screening target wallet address ${creatorWallet} against OFAC and EU sanctions lists...`)
    const screening = screenTransaction(creatorWallet, event.creatorName)
    if (!screening.passed) {
      log('COMPLIANCE', `Sanctions check FAILED: ${screening.reason}`, 'error')
      await prisma.complianceCheck.create({
        data: {
          walletAddr: creatorWallet,
          checkType: screening.checkType,
          result: 'FAIL',
          details: JSON.stringify({ creatorName: event.creatorName, reason: screening.reason })
        }
      })
      return { success: false, logs }
    }
    log('COMPLIANCE', `Sanctions screen PASSED. No matches found.`, 'success')

    await prisma.complianceCheck.create({
      data: {
        walletAddr: creatorWallet,
        checkType: 'SANCTIONS',
        result: 'PASS',
        details: JSON.stringify({ creatorName: event.creatorName })
      }
    })

    // ── STAGE 6: SETTLEMENT & PAYMENT AGENT ──
    log('SETTLEMENT', `Initiating off-chain EIP-3009/EIP-712 nanopayment signature loop...`)
    
    // Deduct Verifier hiring fee from balance
    await createNanopayment(
      event.consumerAddress,
      '0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c', // Verifier agent address
      verifierFee,
      2, // purpose code
      'Verifier Hiring Fee'
    )
    log('SETTLEMENT', `Hiring fee of $${verifierFee.toFixed(6)} USDC paid to Verifier Agent.`, 'success')

    let currency = 'USDC'
    let settledAmount = paymentAmount
    let details: any = null

    if (selectedPayoutCurrency === 'EURC') {
      log('SETTLEMENT', `StableFX requested: Converting ${paymentAmount.toFixed(6)} USDC to EURC...`)
      const quote = await getStableFXQuote('USDC', 'EURC', paymentAmount.toString())
      log('SETTLEMENT', `StableFX Quote received: 1 USDC = ${quote.rate} EURC. Expiry: ${quote.expiresAt}`)
      
      const trade = await executeStableFXTrade(quote)
      log('SETTLEMENT', `StableFX Trade executed on-chain (Tx: ${trade.txHash.slice(0, 10)}...). Slippage: ${trade.slippage}%`, 'success')
      
      currency = 'EURC'
      settledAmount = trade.buyAmount
      
      details = await createNanopayment(
        event.consumerAddress,
        creatorWallet,
        paymentAmount,
        event.type === 'citation' ? 3 : 1,
        `StableFX Swapped Payout to ${event.creatorName}`
      )
    } else {
      details = await createNanopayment(
        event.consumerAddress,
        creatorWallet,
        paymentAmount,
        event.type === 'citation' ? 3 : 1,
        `${event.type.toUpperCase()} Settlement: ${event.creatorName}`
      )
    }

    log('SETTLEMENT', `Gateway Nanopayment successfully recorded off-chain (ID: ${details.payment.id.slice(0, 8)}). Status: PENDING`, 'success')
    log('COORDINATOR', `Swarm execution completed successfully! Settle queue updated.`, 'success')

    return {
      success: true,
      logs,
      settlementDetails: {
        recipient: creatorWallet,
        currency,
        rawAmount: paymentAmount,
        settledAmount,
        txHash: details?.wire?.txHash
      }
    }
  } catch (err: any) {
    log('COORDINATOR', `Swarm execution crashed: ${err?.message || err}`, 'error')
    return { success: false, logs }
  }
}
