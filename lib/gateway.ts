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
 * Records a user deposit into their Circle Gateway balance
 */
export async function depositToGateway(userAddress: string, amount: number, txHash: string): Promise<any> {
  const addressLower = userAddress.toLowerCase()
  
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
    console.warn('⚠️ No PRIVATE_KEY configured for on-chain batch settlement. Simulating...')
    const simulatedTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
    await prisma.gatewayNanopayment.updateMany({
      where: { id: { in: pendingPayments.map(p => p.id) } },
      data: { status: 'SETTLED', settlementTxHash: simulatedTxHash }
    })
    return {
      success: true,
      settledCount: pendingPayments.length,
      totalSettledAmount,
      txHash: simulatedTxHash
    }
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
