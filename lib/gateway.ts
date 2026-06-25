import { prisma } from './db'
import { keccak256, encodePacked, createWalletClient, createPublicClient, http, publicActions, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arcTestnet, CROSSWIRE_CONTRACT_ADDRESS, USDC_ADDRESS } from './arc-config'
import { crossWireRouterAbi, erc20Abi } from './contracts'

/**
 * Circle Gateway Nanopayments and x402 Micropayment Protocol Utility Helper
 */

/**
 * Check the Gateway balance of a given user address
 */
export async function getGatewayBalance(userAddress: string): Promise<number> {
  const addressLower = userAddress.toLowerCase()
  const balanceRecord = await prisma.gatewayBalance.findUnique({
    where: { userAddress: addressLower }
  })
  return balanceRecord ? balanceRecord.balance : 0.0
}

/**
 * Records a user deposit into their Circle Gateway balance after verifying the transaction on-chain
 */
export async function depositToGateway(userAddress: string, amount: number, txHash: string): Promise<any> {
  const addressLower = userAddress.toLowerCase()
  
  // 1. Replay prevention: Check if txHash has already been processed
  const existingDeposit = await prisma.gatewayDeposit.findFirst({
    where: { txHash: { equals: txHash } }
  })
  if (existingDeposit) {
    throw new Error('This deposit transaction hash has already been registered and processed')
  }

  // 2. Perform on-chain validation of the transaction receipt on Arc Testnet
  console.log(`[Gateway] Verifying on-chain deposit txHash: ${txHash}`)
  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(process.env.NEXT_PUBLIC_ARC_RPC || 'https://rpc.testnet.arc.network'),
  })

  const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` })
  if (!receipt) {
    throw new Error('Deposit transaction receipt not found on Arc Testnet')
  }

  if (receipt.status !== 'success') {
    throw new Error('Deposit transaction failed on-chain')
  }

  // Verify the target is the USDC token contract on Arc
  if (receipt.to?.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
    throw new Error(`Deposit transaction target is not the USDC token contract. Target: ${receipt.to}, Expected: ${USDC_ADDRESS}`)
  }

  // Parse logs to find Transfer(from, to, value)
  let totalUsdcTransferred = BigInt(0)
  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

  // Also accept transfers from the deployer EOA (used by /api/direct-submit fallback
  // when the ERC-4337 bundler's mempool is full due to stuck UserOps)
  const deployerAddress = process.env.PRIVATE_KEY
    ? (() => {
        try {
          const { privateKeyToAccount } = require('viem/accounts')
          const pk = process.env.PRIVATE_KEY!
          const account = privateKeyToAccount((pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`)
          return account.address.toLowerCase()
        } catch { return '' }
      })()
    : ''

  for (const log of receipt.logs) {
    const topic1 = log.topics[1]
    const topic2 = log.topics[2]
    if (
      log.topics[0] === transferTopic &&
      topic1 &&
      topic2 &&
      log.address.toLowerCase() === USDC_ADDRESS.toLowerCase()
    ) {
      const fromAddr = '0x' + topic1.slice(26).toLowerCase()
      const toAddr = '0x' + topic2.slice(26).toLowerCase()

      // Accept transfers from the user's address OR the deployer EOA (direct-submit fallback)
      const isFromUser = fromAddr === addressLower
      const isFromDeployer = deployerAddress && fromAddr === deployerAddress
      if ((isFromUser || isFromDeployer) && toAddr === CROSSWIRE_CONTRACT_ADDRESS.toLowerCase()) {
        const value = BigInt(log.data)
        totalUsdcTransferred += value
      }
    }
  }

  const expectedUsdcUnits = BigInt(Math.round(amount * 1_000_000))
  if (totalUsdcTransferred < expectedUsdcUnits) {
    throw new Error(
      `Insufficient USDC transferred to protocol contract. Expected at least ${amount} USDC (${expectedUsdcUnits} raw units), but verified logs only show ${Number(totalUsdcTransferred) / 1_000_000} USDC`
    )
  }

  console.log(`[Gateway] On-chain deposit verification succeeded: Verified transfer of ${Number(totalUsdcTransferred) / 1_000_000} USDC from ${addressLower}`)

  return await prisma.$transaction(async (tx) => {
    // 1. Create GatewayDeposit entry
    const deposit = await tx.gatewayDeposit.create({
      data: {
        userAddress: addressLower,
        amount,
        txHash
      }
    })

    // 2. Update or create GatewayBalance
    const balance = await tx.gatewayBalance.upsert({
      where: { userAddress: addressLower },
      update: {
        balance: {
          increment: amount
        }
      },
      create: {
        userAddress: addressLower,
        balance: amount
      }
    })

    return { deposit, balance }
  })
}

/**
 * Process a micropayment wire transfer off-chain using Gateway balances
 */
export async function createNanopayment(
  sender: string,
  recipient: string,
  amount: number,
  purposeCode: number,
  memo: string
): Promise<any> {
  const senderLower = sender.toLowerCase()
  const recipientLower = recipient.toLowerCase()

  return await prisma.$transaction(async (tx) => {
    // 1. Get sender balance
    const senderBalRecord = await tx.gatewayBalance.findUnique({
      where: { userAddress: senderLower }
    })
    
    let senderBalance = senderBalRecord ? senderBalRecord.balance : 0
    if (senderBalance < amount) {
      throw new Error(`Insufficient Gateway balance: sender balance is $${senderBalance.toFixed(6)} USDC, but payment requires $${amount.toFixed(6)} USDC.`)
    }

    // Calculate micro fee (0.25% - consistent with Phase 1 fee engine)
    const feeAmount = parseFloat((amount * 0.0025).toFixed(6))
    const recipientAmount = amount - feeAmount

    // 2. Deduct from sender Gateway balance
    await tx.gatewayBalance.update({
      where: { userAddress: senderLower },
      data: {
        balance: {
          decrement: amount
        }
      }
    })

    // 3. Credit to recipient Gateway balance
    await tx.gatewayBalance.upsert({
      where: { userAddress: recipientLower },
      update: {
        balance: {
          increment: recipientAmount
        }
      },
      create: {
        userAddress: recipientLower,
        balance: recipientAmount
      }
    })

    // 4. Create GatewayNanopayment record
    const payment = await tx.gatewayNanopayment.create({
      data: {
        sender: senderLower,
        recipient: recipientLower,
        amount,
        feeAmount,
        purposeCode,
        memo,
        status: 'PENDING'
      }
    })

    // 5. Store inside standard Wire history table for global visibility
    const randomId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000)
    const simulatedRef = keccak256(
      encodePacked(
        ['address', 'address', 'uint256', 'uint256'],
        [senderLower as `0x${string}`, recipientLower as `0x${string}`, BigInt(Math.floor(amount * 1e6)), BigInt(Date.now())]
      )
    )

    const wire = await tx.wire.create({
      data: {
        id: randomId,
        sender: senderLower,
        recipient: recipientLower,
        amount: amount.toString(),
        feeAmount: feeAmount.toString(),
        refHash: simulatedRef,
        purposeCode,
        memo: memo || 'CrossWire Nanopayment Transfer',
        status: 'EXECUTED',
        txHash: `gateway-nanopayment-${payment.id.slice(0, 8)}`,
        blockNumber: 0, // 0 block number indicates off-chain Gateway transaction
        timestamp: new Date()
      }
    })

    return { payment, wire }
  })
}

/**
 * Aggregates all pending micro-fees and settles them batch on-chain
 */
export async function settleBatch(): Promise<{ success: boolean; settledCount: number; totalSettledAmount: number; txHash: string }> {
  const pendingPayments = await prisma.gatewayNanopayment.findMany({
    where: { status: 'PENDING' }
  })

  if (pendingPayments.length === 0) {
    return {
      success: true,
      settledCount: 0,
      totalSettledAmount: 0,
      txHash: '0x0000000000000000000000000000000000000000000000000000000000000000'
    }
  }

  const totalSettledAmount = pendingPayments.reduce((acc, p) => acc + p.amount, 0)
  
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    throw new Error('EVM Private Key (PRIVATE_KEY) is not configured in the environment')
  }

  try {
    const account = privateKeyToAccount(privateKey.startsWith('0x') ? (privateKey as `0x${string}`) : `0x${privateKey}`)
    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(process.env.NEXT_PUBLIC_ARC_RPC || 'https://rpc.testnet.arc.network')
    })
    const walletClient = createWalletClient({
      chain: arcTestnet,
      transport: http(process.env.NEXT_PUBLIC_ARC_RPC || 'https://rpc.testnet.arc.network'),
      account
    }).extend(publicActions)

    // Format fields for batchInitiateWires
    const recipients = pendingPayments.map(p => p.recipient as `0x${string}`)
    const amounts = pendingPayments.map(p => parseUnits(p.amount.toString(), 6))
    const references = pendingPayments.map(p => keccak256(encodePacked(['string'], [p.id])))
    const purposeCodes = pendingPayments.map(p => p.purposeCode)

    const totalAmount = amounts.reduce((acc, a) => acc + a, 0n)

    // Approve the Router to spend the total amount of USDC
    const approveTx = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [CROSSWIRE_CONTRACT_ADDRESS, totalAmount],
      chain: null,
      account
    })
    await publicClient.waitForTransactionReceipt({ hash: approveTx })

    // Call batchInitiateWires
    const txHash = await walletClient.writeContract({
      address: CROSSWIRE_CONTRACT_ADDRESS,
      abi: crossWireRouterAbi,
      functionName: 'batchInitiateWires',
      args: [recipients, amounts, references, purposeCodes],
      chain: null,
      account
    })
    await publicClient.waitForTransactionReceipt({ hash: txHash })

    await prisma.gatewayNanopayment.updateMany({
      where: {
        id: {
          in: pendingPayments.map(p => p.id)
        }
      },
      data: {
        status: 'SETTLED',
        settlementTxHash: txHash
      }
    })

    return {
      success: true,
      settledCount: pendingPayments.length,
      totalSettledAmount,
      txHash
    }
  } catch (err: any) {
    console.error('❌ On-chain batch settlement failed:', err)
    throw new Error(`Batch settlement failed: ${err.message}`)
  }
}
