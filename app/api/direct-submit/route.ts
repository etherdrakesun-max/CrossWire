import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, parseUnits, encodeFunctionData } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arcTestnet } from 'viem/chains'

const erc20Abi = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, data, userAddress } = body

    if (!to || !data) {
      return NextResponse.json({ error: 'Missing to or data' }, { status: 400 })
    }

    const pk = process.env.PRIVATE_KEY
    if (!pk) {
      return NextResponse.json({ error: 'Server not configured for direct submit' }, { status: 500 })
    }

    const privateKey = (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`
    const account = privateKeyToAccount(privateKey)

    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http('https://rpc.testnet.arc.network')
    })

    const walletClient = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http('https://rpc.testnet.arc.network')
    })

    // Execute the exact same call data but from the deployer EOA
    const txHash = await walletClient.sendTransaction({
      to: to as `0x${string}`,
      data: data as `0x${string}`,
    })

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

    return NextResponse.json({
      success: receipt.status === 'success',
      txHash,
      blockNumber: receipt.blockNumber.toString()
    })
  } catch (err: any) {
    console.error('[direct-submit] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Direct submit failed' },
      { status: 500 }
    )
  }
}
