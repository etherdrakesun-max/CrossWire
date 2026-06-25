import { prisma } from './db'
import { fetchMultiChainUSDCBalances } from './unified-balance'
import { getGatewayBalance, createNanopayment } from './gateway'
import { screenTransaction } from './compliance'
import { getStableFXQuote, executeStableFXTrade } from './stablefx'
import { runSwarm } from './agent-swarm'
import { executeProgrammaticTransfer } from './dev-wallet'
import { AppKit } from '@circle-fin/app-kit'
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'

// Define the type for tools
export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required?: string[]
  }
}

// System prompts and tool specifications
export const TOOLS: ToolDefinition[] = [
  {
    name: 'get_balance',
    description: 'Fetch the stablecoin balances (on-chain USDC/EURC across chains and off-chain Circle Gateway balance) for the current connected wallet.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_invoices',
    description: 'Retrieve corporate invoices from the database. Optionally filter by status (e.g. DRAFT, PENDING, PAID).',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter invoices by status (DRAFT, PENDING, PAID, or ALL)'
        }
      }
    }
  },
  {
    name: 'create_invoice',
    description: 'Create a new corporate invoice billing a payer client.',
    parameters: {
      type: 'object',
      properties: {
        payeeAddr: {
          type: 'string',
          description: 'Ethereum wallet address of the payee (who receives funds)'
        },
        payerAddr: {
          type: 'string',
          description: 'Ethereum wallet address of the payer (who owes funds)'
        },
        amount: {
          type: 'string',
          description: 'Invoice amount in stablecoins (e.g., "5.0")'
        },
        currency: {
          type: 'string',
          description: 'Currency symbol (USDC or EURC)'
        },
        memo: {
          type: 'string',
          description: 'Memo describing the invoice line items'
        }
      },
      required: ['payeeAddr', 'amount']
    }
  },
  {
    name: 'pay_invoice',
    description: 'Pay a pending invoice. This executes compliance sanctions screening and settles the transfer off-chain via Circle Gateway nanopayment or simulates it.',
    parameters: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The unique slug identifier of the invoice to pay'
        },
        method: {
          type: 'string',
          description: 'Payment settlement channel: "gateway" (off-chain low-latency) or "onchain"',
          enum: ['gateway', 'onchain']
        }
      },
      required: ['slug']
    }
  },
  {
    name: 'execute_stablefx',
    description: 'Execute an on-chain stablecoin swap between USDC and EURC on Arc Testnet using Circle App Kit. Returns a real transaction hash and explorer link.',
    parameters: {
      type: 'object',
      properties: {
        fromCurrency: {
          type: 'string',
          description: 'Source stablecoin currency code (USDC or EURC)'
        },
        toCurrency: {
          type: 'string',
          description: 'Target stablecoin currency code (USDC or EURC)'
        },
        amount: {
          type: 'string',
          description: 'The amount of fromCurrency to convert (e.g. "10.0")'
        }
      },
      required: ['fromCurrency', 'toCurrency', 'amount']
    }
  },
  {
    name: 'sanctions_screen',
    description: 'Screen a wallet address and fullname against OFAC / EU sanctions registries to check compliance safety.',
    parameters: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          description: 'Wallet address to screen'
        },
        fullName: {
          type: 'string',
          description: 'Optional name of the counterparty individual'
        }
      },
      required: ['walletAddress']
    }
  },
  {
    name: 'get_schedules',
    description: 'Fetch the corporate recurring payment schedule plans.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'execute_schedule',
    description: 'Trigger the manual execution of a due scheduled wire transfer payment by schedule ID.',
    parameters: {
      type: 'object',
      properties: {
        scheduleId: {
          type: 'string',
          description: 'The integer database ID of the schedule record'
        }
      },
      required: ['scheduleId']
    }
  },
  {
    name: 'get_contacts',
    description: 'Fetch all address book contacts for the connected corporate account.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'create_contact',
    description: 'Register a new supplier or counterparty contact in the corporate address book.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the contact'
        },
        address: {
          type: 'string',
          description: 'Ethereum wallet address'
        },
        label: {
          type: 'string',
          description: 'Optional label tags (e.g., supplier, contractor)'
        }
      },
      required: ['name', 'address']
    }
  },
  {
    name: 'get_agents',
    description: 'Fetch all registered AI Agents on-chain from the directory index.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'run_swarm_audit',
    description: 'Trigger the autonomous Multi-Agent Mesh Swarm split payout audit for FOSS commits, Gateway queries, or citations.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Swarm split event category: foss_split, api_query, or citation',
          enum: ['foss_split', 'api_query', 'citation']
        },
        creatorName: {
          type: 'string',
          description: 'Name of creator to evaluate'
        },
        sourceId: {
          type: 'string',
          description: 'Source reference ID'
        },
        metadataValue: {
          type: 'string',
          description: 'Metadata metrics value payload (e.g. "commits: 5" or "queries: 100")'
        },
        payoutCurrency: {
          type: 'string',
          description: 'Target currency: USDC or EURC',
          enum: ['USDC', 'EURC']
        }
      },
      required: ['type', 'creatorName']
    }
  },
  {
    name: 'read_memory',
    description: 'Retrieve a key-value value from long-term agent memory.',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'The key to look up in database memory'
        }
      },
      required: ['key']
    }
  },
  {
    name: 'write_memory',
    description: 'Store a key-value pair in long-term agent memory for user preferences or persistent contextual details.',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'The key name for the memory'
        },
        value: {
          type: 'string',
          description: 'The value to associate with the key'
        }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'initiate_onchain_wire',
    description: 'Initiate a USDC wire transfer. This returns a transaction intent that requires user wallet confirmation (passkey signing). The user must approve the transaction in their connected wallet.',
    parameters: {
      type: 'object',
      properties: {
        recipient: {
          type: 'string',
          description: 'Recipient Ethereum wallet address (0x...)'
        },
        amount: {
          type: 'string',
          description: 'USDC amount to transfer (e.g. "5.0")'
        },
        purposeCode: {
          type: 'integer',
          description: 'SWIFT wire purpose code (e.g., 1 for salary, 2 for supplier payout, 3 for citation payment, 4 for treasury bridge)'
        },
        memo: {
          type: 'string',
          description: 'Optional memo text describing the wire payment details'
        }
      },
      required: ['recipient', 'amount', 'purposeCode']
    }
  }
]

/**
 * Tool Execution Mapper
 */
export async function executeTool(name: string, args: any, userAddress: string): Promise<any> {
  const userAddrLower = userAddress.toLowerCase()

  switch (name) {
    case 'get_balance': {
      const onChain = await fetchMultiChainUSDCBalances(userAddrLower)
      const gateway = await getGatewayBalance(userAddrLower)
      return {
        onChainUsdc: onChain,
        gatewayUSDC: gateway,
        userAddress: userAddrLower
      }
    }

    case 'get_invoices': {
      const status = args.status || 'ALL'
      const where: any = {}
      if (status !== 'ALL') {
        where.status = status
      }
      const invoices = await prisma.invoice.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      })
      return invoices
    }

    case 'create_invoice': {
      const { payeeAddr, payerAddr, amount, currency, memo } = args
      const invoice = await prisma.invoice.create({
        data: {
          payeeAddr: payeeAddr.toLowerCase(),
          payerAddr: payerAddr ? payerAddr.toLowerCase() : null,
          amount: String(amount),
          currency: currency || 'USDC',
          memo: memo || '',
          status: 'PENDING'
        }
      })
      return invoice
    }

    case 'pay_invoice': {
      const { slug, method } = args
      const payMethod = method || 'gateway'

      // 1. Fetch invoice
      const invoice = await prisma.invoice.findUnique({
        where: { slug },
        include: { items: true }
      })
      if (!invoice) {
        throw new Error(`Invoice with slug "${slug}" not found.`)
      }
      if (invoice.status === 'PAID') {
        return { success: true, message: 'Invoice was already paid.', invoice }
      }

      // 2. Verification Layer: Compliance sanctions screen check
      const payeeAddr = invoice.payeeAddr
      const screenResult = screenTransaction(payeeAddr, invoice.memo)
      if (!screenResult.passed) {
        throw new Error(`Compliance Sanctions Rejection: Payee address ${payeeAddr} is flagged as high-risk. Reason: ${screenResult.reason}`)
      }

      // 3. Verification Layer: Check if balance is sufficient
      const paymentAmount = parseFloat(invoice.amount)
      if (payMethod === 'gateway') {
        const senderBal = await getGatewayBalance(userAddrLower)
        if (senderBal < paymentAmount) {
          throw new Error(`Insufficient Gateway balance. Invoice requires ${paymentAmount} USDC, but your Gateway balance is only ${senderBal} USDC. Please deposit vanilla USDC first.`)
        }

        // 4. Settle via Circle Gateway Nanopayments
        const paymentResult = await createNanopayment(
          userAddrLower,
          payeeAddr,
          paymentAmount,
          1, // purpose code
          `Invoice Payment: ${invoice.memo || slug}`
        )

        // Update invoice database record
        const updatedInvoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            wireId: paymentResult.wire.id,
            txHash: paymentResult.wire.txHash,
            paidAt: new Date()
          }
        })

        return {
          success: true,
          method: 'gateway',
          txHash: paymentResult.wire.txHash,
          amount: paymentAmount,
          recipient: payeeAddr,
          invoice: updatedInvoice
        }
      } else {
        // Simulated on-chain wire execution
        const randomId = Math.floor(Date.now() / 1000)
        const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
        
        const wire = await prisma.wire.create({
          data: {
            id: randomId,
            sender: userAddrLower,
            recipient: payeeAddr.toLowerCase(),
            amount: invoice.amount,
            feeAmount: '0.01',
            refHash: mockTxHash,
            purposeCode: 1,
            memo: invoice.memo || 'On-chain Invoice Payment',
            status: 'EXECUTED',
            txHash: mockTxHash,
            blockNumber: 5042010,
            timestamp: new Date()
          }
        })

        const updatedInvoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            wireId: wire.id,
            txHash: mockTxHash,
            paidAt: new Date()
          }
        })

        return {
          success: true,
          method: 'onchain',
          txHash: mockTxHash,
          amount: paymentAmount,
          recipient: payeeAddr,
          invoice: updatedInvoice
        }
      }
    }

    case 'execute_stablefx': {
      const fromCurrency = args.fromCurrency || args.sellCurrency || args.tokenIn || args.from || args.sellAsset || args.fromAsset || args.fromToken || 'USDC'
      const toCurrency = args.toCurrency || args.buyCurrency || args.tokenOut || args.to || args.buyAsset || args.toAsset || args.toToken || 'EURC'
      const amount = args.amount || args.amountIn || args.amount_in || args.sellAmount || args.sell_amount || args.value || args.qty || args.quantity
      
      const sellAmt = parseFloat(String(amount))
      if (isNaN(sellAmt) || sellAmt <= 0) {
        throw new Error(`Invalid swap amount: ${amount} (type: ${typeof amount}). Received keys: [${Object.keys(args || {}).join(', ')}]. Full arguments: ${JSON.stringify(args)}`)
      }
      
      // 1. Sanctions screen sanity check on userAddress
      const screenResult = screenTransaction(userAddrLower)
      if (!screenResult.passed) {
        throw new Error(`FX Trade Rejected by Sanctions Compliance: ${screenResult.reason}`)
      }

      // 2. Attempt real on-chain swap via Circle App Kit on Arc Testnet
      const kitKey = process.env.CIRCLE_KIT_KEY || process.env.NEXT_PUBLIC_CIRCLE_APP_KIT_KEY
      const privateKey = process.env.PRIVATE_KEY

      if (kitKey && privateKey) {
        try {
          const kit = new AppKit()
          const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
          const adapter = createViemAdapterFromPrivateKey({
            privateKey: pk as `0x${string}`,
          })

          const swapResult = await kit.swap({
            from: { adapter, chain: 'Arc_Testnet' },
            tokenIn: fromCurrency,
            tokenOut: toCurrency,
            amountIn: sellAmt.toString(),
            config: {
              kitKey,
              slippageBps: 300, // 3% slippage tolerance for testnet
            },
          })

          // Save real trade in local DB
          const amtOut = parseFloat(swapResult.amountOut || '0')
          const rate = sellAmt > 0 ? amtOut / sellAmt : 0

          await prisma.fxTrade.create({
            data: {
              userAddress: userAddrLower,
              sellCurrency: fromCurrency,
              sellAmount: sellAmt,
              buyCurrency: toCurrency,
              buyAmount: amtOut,
              quotedRate: rate,
              executedRate: rate,
              slippage: 0,
              txHash: swapResult.txHash
            }
          })

          return {
            success: true,
            method: 'circle_app_kit',
            tradeId: swapResult.txHash.slice(0, 18),
            fromCurrency,
            toCurrency,
            sellAmount: sellAmt,
            buyAmount: amtOut,
            rate,
            slippage: 0,
            txHash: swapResult.txHash,
            explorerUrl: swapResult.explorerUrl || `https://testnet.arcscan.app/tx/${swapResult.txHash}`,
            chain: 'Arc_Testnet'
          }
        } catch (appKitErr: any) {
          console.warn('[StableFX] App Kit swap failed, falling back to StableFX API:', appKitErr.message)
          // Fall through to StableFX API fallback below
        }
      }

      // 3. Fallback: StableFX API quote + trade
      const quote = await getStableFXQuote(fromCurrency, toCurrency, sellAmt.toString())
      const trade = await executeStableFXTrade(quote)

      // 4. Save trade in local DB
      await prisma.fxTrade.create({
        data: {
          userAddress: userAddrLower,
          sellCurrency: fromCurrency,
          sellAmount: sellAmt,
          buyCurrency: toCurrency,
          buyAmount: trade.buyAmount,
          quotedRate: quote.rate,
          executedRate: trade.executedRate,
          slippage: trade.slippage,
          txHash: trade.txHash
        }
      })

      return {
        success: true,
        method: 'stablefx_api',
        tradeId: trade.id,
        fromCurrency,
        toCurrency,
        sellAmount: sellAmt,
        buyAmount: trade.buyAmount,
        rate: trade.executedRate,
        slippage: trade.slippage,
        txHash: trade.txHash,
        explorerUrl: trade.txHash.startsWith('0x') ? `https://testnet.arcscan.app/tx/${trade.txHash}` : null,
        chain: 'Arc_Testnet'
      }
    }

    case 'sanctions_screen': {
      const { walletAddress, fullName } = args
      const result = screenTransaction(walletAddress, fullName)
      return {
        walletAddress,
        fullName: fullName || null,
        passed: result.passed,
        checkType: result.checkType,
        result: result.result,
        reason: result.reason || 'Clear'
      }
    }

    case 'get_schedules': {
      const schedules = await prisma.schedule.findMany({
        where: { ownerAddr: userAddrLower },
        orderBy: { createdAt: 'desc' }
      })
      return schedules
    }

    case 'execute_schedule': {
      const { scheduleId } = args
      const idNum = parseInt(scheduleId)
      const schedule = await prisma.schedule.findUnique({
        where: { id: idNum }
      })
      if (!schedule) {
        throw new Error(`Schedule with ID ${idNum} not found.`)
      }

      // Execute standard simulated wire run
      const randomId = Math.floor(Date.now() / 1000)
      const mockTx = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      
      const wire = await prisma.wire.create({
        data: {
          id: randomId,
          sender: userAddrLower,
          recipient: schedule.recipient.toLowerCase(),
          amount: schedule.amount,
          feeAmount: '0.01',
          refHash: mockTx,
          purposeCode: schedule.purposeCode,
          memo: schedule.memo || 'Scheduled Recurring Wire',
          status: 'EXECUTED',
          txHash: mockTx,
          blockNumber: 5042010,
          timestamp: new Date()
        }
      })

      await prisma.execution.create({
        data: {
          scheduleId: idNum,
          wireId: wire.id,
          txHash: mockTx,
          status: 'SUCCESS'
        }
      })

      // Update next run date based on frequency
      const nextRun = new Date(schedule.nextRunAt)
      if (schedule.frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1)
      else if (schedule.frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7)
      else if (schedule.frequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1)

      await prisma.schedule.update({
        where: { id: idNum },
        data: { nextRunAt: nextRun }
      })

      return {
        success: true,
        wire,
        nextRunAt: nextRun
      }
    }

    case 'get_contacts': {
      const contacts = await prisma.contact.findMany({
        where: { ownerAddr: userAddrLower },
        orderBy: { name: 'asc' }
      })
      return contacts
    }

    case 'create_contact': {
      const { name, address, label } = args
      const contact = await prisma.contact.upsert({
        where: {
          ownerAddr_address: {
            ownerAddr: userAddrLower,
            address: address.toLowerCase()
          }
        },
        update: {
          name,
          label: label || 'supplier'
        },
        create: {
          ownerAddr: userAddrLower,
          address: address.toLowerCase(),
          name,
          label: label || 'supplier'
        }
      })
      return contact
    }

    case 'get_agents': {
      const agents = await prisma.agent.findMany({
        orderBy: { reputationScore: 'desc' }
      })
      return agents
    }

    case 'run_swarm_audit': {
      const { type, creatorName, sourceId, metadataValue, payoutCurrency } = args
      const metaParts = (metadataValue || '').split(':')
      const key = metaParts[0]?.trim() || 'info'
      const value = metaParts[1]?.trim() || 'verified'
      const numVal = isNaN(Number(value)) ? value : Number(value)
      
      const swarmResult = await runSwarm({
        type: type || 'foss_split',
        sourceId: sourceId || `repo-${Math.random().toString(36).substring(2, 8)}`,
        creatorName,
        consumerAddress: userAddrLower,
        metadata: {
          [key]: numVal,
          payoutCurrency: payoutCurrency || 'USDC'
        }
      })
      return swarmResult
    }

    case 'read_memory': {
      const { key } = args
      const mem = await prisma.agentMemory.findFirst({
        where: { userAddress: userAddrLower, key }
      })
      return mem ? { key, value: mem.value } : { key, value: null, message: 'Memory slot is currently empty.' }
    }

    case 'write_memory': {
      const { key, value } = args
      const mem = await prisma.agentMemory.upsert({
        where: {
          id: `${userAddrLower}-${key}`
        },
        update: { value },
        create: {
          id: `${userAddrLower}-${key}`,
          userAddress: userAddrLower,
          key,
          value
        }
      })
      return { success: true, memory: mem }
    }

    case 'initiate_onchain_wire': {
      // Robust arg extraction — LLMs sometimes use alternative names
      const recipient = args.recipient || args.destination || args.to || args.address
      const amount = args.amount || args.value
      const purposeCode = args.purposeCode || args.purpose_code || 0
      const memo = args.memo || args.note || args.description || ''
      
      if (!recipient) {
        throw new Error('Recipient address is required for wire transfer.')
      }
      
      // 1. Sanctions screen counterparty wallet
      const screenResult = screenTransaction(recipient)
      if (!screenResult.passed) {
        throw new Error(`Compliance Sanctions Rejection: Recipient address ${recipient} is flagged as high-risk. Reason: ${screenResult.reason}`)
      }

      // 2. Return an action_required intent for the frontend to handle signing
      //    The user must confirm and sign via their connected wallet (passkey)
      return {
        actionRequired: true,
        actionType: 'onchain_transfer',
        status: 'pending_user_confirmation',
        params: {
          recipient: recipient.toLowerCase(),
          amount: String(amount),
          purposeCode: Number(purposeCode) || 1,
          memo: memo || 'CrossWire Wire Transfer',
          contractAddress: process.env.NEXT_PUBLIC_CROSSWIRE_CONTRACT_V2 || process.env.NEXT_PUBLIC_CROSSWIRE_CONTRACT || '0x0000000000000000000000000000000000000000',
          usdcAddress: '0x3600000000000000000000000000000000000000',
          chain: 'Arc Testnet',
          chainId: 5042002,
          explorerBase: 'https://testnet.arcscan.app'
        },
        message: `Wire transfer of ${amount} USDC to ${recipient.slice(0, 6)}...${recipient.slice(-4)} is ready. Please confirm and sign the transaction in your connected wallet.`,
        complianceStatus: 'passed'
      }
    }

    default:
      throw new Error(`Tool "${name}" is not supported by the tool registry.`)
  }
}

/**
 * Execute the autonomous ReAct loop
 */
export async function runAgentExecutionLoop(
  goalText: string,
  provider: string,
  userAddress: string,
  onStepProgress: (stepNumber: number, toolName: string, description: string, reasoning: string, result: string, status: 'RUNNING' | 'SUCCESS' | 'FAILED') => Promise<void>
): Promise<{ success: boolean; summary: string }> {
  const userAddrLower = userAddress.toLowerCase()
  const apiKey = provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY
  const apiBase = provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com/v1'
  const modelName = provider === 'deepseek' ? 'deepseek-v4-flash' : 'gpt-4o-mini'

  if (!apiKey) {
    throw new Error(`API key for selected provider [${provider.toUpperCase()}] is not configured in the environment variables.`)
  }

  // Create Goal record in database
  const goalRecord = await prisma.agentGoal.create({
    data: {
      userAddress: userAddrLower,
      goal: goalText,
      provider,
      status: 'RUNNING'
    }
  })

  // Format initial conversation state
  const conversationMessages: any[] = [
    {
      role: 'system',
      content: `You are the CrossWire Staff Software Engineer and autonomous YC-caliber product planner agent.
Your mission is to fulfill the user's business goal by planning and executing steps using the available tool registry.
Connected wallet address: ${userAddrLower}.

TOOL REGISTRY SPECIFICATIONS:
${JSON.stringify(TOOLS, null, 2)}

COGNITIVE LOOP RULES:
At each turn, you MUST output a JSON response containing exactly one of the following two options:

Option A (Run a tool):
{
  "thought": "your chain-of-thought analysis explaining why we need this step and what tool parameters we should pass",
  "action": {
    "toolName": "name_of_the_tool",
    "arguments": { ... }
  }
}

Option B (Final goal completed summary):
{
  "thought": "summarize the plan conclusion, achievements, and all completed steps",
  "finalResponse": "a detailed, developer-friendly and corporate-ready text summarizing the results for the user"
}

Reply ONLY with a raw JSON object string. Do not wrap in markdown \`\`\`json blocks. Do not add text outside the JSON structure.`
    },
    {
      role: 'user',
      content: `User Goal: "${goalText}"`
    }
  ]

  let loopCount = 0
  const maxIterations = 8
  let summary = ''
  let success = false

  try {
    while (loopCount < maxIterations) {
      loopCount++

      // Call Chat Completions API
      const requestBody: any = {
        model: modelName,
        messages: conversationMessages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0,
        response_format: { type: 'json_object' }
      }
      if (provider === 'deepseek') {
        requestBody.thinking = { type: 'enabled' }
      }

      const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`LLM call failed with status ${response.status}: ${errorText}`)
      }

      const resJson = await response.json()
      const rawText = resJson.choices[0]?.message?.content || ''
      
      let parsed: any
      try {
        parsed = JSON.parse(rawText.trim())
      } catch (jsonErr) {
        console.error('LLM output was not valid JSON:', rawText)
        throw new Error(`LLM output could not be parsed as JSON: ${rawText.slice(0, 100)}`)
      }

      const thought = parsed.thought || 'Analyzing next step...'

      if (parsed.action) {
        const { toolName, arguments: toolArgs } = parsed.action
        
        // Notify frontend that step has started running
        await onStepProgress(
          loopCount,
          toolName,
          `Executing tool "${toolName}" with arguments: ${JSON.stringify(toolArgs)}`,
          thought,
          '',
          'RUNNING'
        )

        // Save step in DB as RUNNING
        const stepRecord = await prisma.agentStep.create({
          data: {
            goalId: goalRecord.id,
            stepNumber: loopCount,
            toolName,
            description: `Executing ${toolName}`,
            reasoning: thought,
            status: 'RUNNING'
          }
        })

        let toolOutput: any
        try {
          // Execute the tool logic
          toolOutput = await executeTool(toolName, toolArgs, userAddrLower)
          
          // Save step as SUCCESS in DB
          await prisma.agentStep.update({
            where: { id: stepRecord.id },
            data: {
              status: 'SUCCESS',
              result: JSON.stringify(toolOutput)
            }
          })

          // Notify progress success
          await onStepProgress(
            loopCount,
            toolName,
            `Successfully executed ${toolName}`,
            thought,
            JSON.stringify(toolOutput),
            'SUCCESS'
          )
        } catch (toolErr: any) {
          // Save step as FAILED in DB
          await prisma.agentStep.update({
            where: { id: stepRecord.id },
            data: {
              status: 'FAILED',
              result: JSON.stringify({ error: toolErr.message })
            }
          })

          // Notify progress failure
          await onStepProgress(
            loopCount,
            toolName,
            `Failed executing ${toolName}: ${toolErr.message}`,
            thought,
            JSON.stringify({ error: toolErr.message }),
            'FAILED'
          )

          throw toolErr
        }

        // Add assistant message and tool output to context
        conversationMessages.push({
          role: 'assistant',
          content: rawText
        })
        conversationMessages.push({
          role: 'user',
          content: `Tool Output from ${toolName}: ${JSON.stringify(toolOutput)}`
        })

      } else if (parsed.finalResponse) {
        // Goal completed
        summary = parsed.finalResponse
        success = true
        break
      } else {
        throw new Error('LLM JSON output did not contain either "action" or "finalResponse" keys.')
      }
    }

    if (loopCount >= maxIterations && !success) {
      summary = 'Agent execution loop timed out without reaching a final response.'
    }

    // Update Goal status in DB
    await prisma.agentGoal.update({
      where: { id: goalRecord.id },
      data: {
        status: success ? 'COMPLETED' : 'FAILED',
        summary
      }
    })

    return { success, summary }

  } catch (err: any) {
    console.error('Agent execution loop crashed:', err)
    
    // Update Goal status in DB as FAILED
    await prisma.agentGoal.update({
      where: { id: goalRecord.id },
      data: {
        status: 'FAILED',
        summary: `Execution Error: ${err.message}`
      }
    })

    return { success: false, summary: `Execution Error: ${err.message}` }
  }
}
