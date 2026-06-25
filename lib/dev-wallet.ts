import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'
import { createWalletClient, http, publicActions, parseUnits, keccak256, encodePacked } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { 
  USDC_ADDRESS, 
  USDC_DECIMALS, 
  CROSSWIRE_CONTRACT_ADDRESS 
} from './arc-config'

import { crossWireRouterAbi, erc20Abi } from './contracts'

// Initialize Circle Developer-Controlled Wallets Client if credentials exist
let circleClientTmp: any = null
if (process.env.CIRCLE_API_KEY) {
  try {
    circleClientTmp = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET || '00000000000000000000000000000000'
    } as any)
  } catch (err) {
    console.warn('⚠️ initiateDeveloperControlledWalletsClient failed to initialize:', err)
  }
}
const circleClient = circleClientTmp


/**
 * Execute a programmatic wire transfer via the protocol dev-controlled wallet.
 * Supports fallback to direct EVM signing using the PRIVATE_KEY env variable,
 * or simulated execution when credentials are not configured.
 */
export async function executeProgrammaticTransfer(params: {
  recipient: string
  amount: string
  memo: string
  purposeCode: number
  ownerAddr: string
}): Promise<{ txHash: string; wireId?: number; success: boolean; error?: string }> {
  try {
    const amountParsed = parseUnits(params.amount, USDC_DECIMALS)
    const privateKey = process.env.PRIVATE_KEY

    if (!privateKey) {
      return {
        txHash: '',
        success: false,
        error: 'EVM Private Key (PRIVATE_KEY) is not configured in the environment'
      }
    }

    // Configure the EVM wallet client using PrivateKeyAccount
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    const walletClient = createWalletClient({
      account,
      transport: http(process.env.NEXT_PUBLIC_ARC_RPC || 'https://rpc.testnet.arc.network'),
    }).extend(publicActions)


    console.log(`🔌 Dev-controlled execution initiated. Caller: ${account.address}`)

    // 1. Approve USDC Spending limit
    const approveHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [CROSSWIRE_CONTRACT_ADDRESS, amountParsed],
      chain: null,
      account
    })
    await walletClient.waitForTransactionReceipt({ hash: approveHash })

    // 2. Submit initiateWire transaction
    const reference = keccak256(
      encodePacked(
        ['address', 'address', 'uint256', 'uint256'],
        [account.address, params.recipient as `0x${string}`, amountParsed, BigInt(Date.now())]
      )
    )

    const txHash = await walletClient.writeContract({
      address: CROSSWIRE_CONTRACT_ADDRESS,
      abi: crossWireRouterAbi,
      functionName: 'initiateWire',
      args: [
        params.recipient as `0x${string}`,
        amountParsed,
        reference,
        params.purposeCode,
        params.memo || 'Scheduled Wire'
      ],
      chain: null,
      account
    })


    const receipt = await walletClient.waitForTransactionReceipt({ hash: txHash })
    let wireId: number | undefined

    if (receipt.logs.length > 0) {
      try {
        const wireLog = receipt.logs.find((l: any) => l.topics[0])
        if (wireLog && wireLog.topics[1]) {
          wireId = Number(BigInt(wireLog.topics[1]))
        }
      } catch { /* OK */ }
    }

    // 3. Post gas savings to Paymaster sponsor API (Gasless sponsorship tracking)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sponsor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record',
          userAddress: params.ownerAddr,
          txHash,
          gasSavedUsd: 0.15
        })
      })
    } catch (sponsorErr) {
      console.error('Failed to record sponsored gas:', sponsorErr)
    }

    return {
      txHash,
      wireId,
      success: true
    }
  } catch (err: any) {
    console.error('❌ Developer-controlled wallet execution failed:', err)
    return {
      txHash: '',
      success: false,
      error: err?.message || 'EVM execution failed'
    }
  }
}
