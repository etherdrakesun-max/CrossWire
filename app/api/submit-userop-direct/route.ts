import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, Hex, Address, decodeErrorResult } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arcTestnet } from 'viem/chains'

const entryPointAbi = [
  {
    inputs: [
      {
        components: [
          { name: 'sender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'initCode', type: 'bytes' },
          { name: 'callData', type: 'bytes' },
          { name: 'accountGasLimits', type: 'bytes32' },
          { name: 'preVerificationGas', type: 'uint256' },
          { name: 'gasFees', type: 'bytes32' },
          { name: 'paymasterAndData', type: 'bytes' },
          { name: 'signature', type: 'bytes' }
        ],
        name: 'ops',
        type: 'tuple[]'
      },
      { name: 'beneficiary', type: 'address' }
    ],
    name: 'handleOps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // EntryPoint v0.7 error types for decoding revert reasons
  {
    inputs: [
      { name: 'opIndex', type: 'uint256' },
      { name: 'reason', type: 'string' }
    ],
    name: 'FailedOp',
    type: 'error'
  },
  {
    inputs: [
      { name: 'opIndex', type: 'uint256' },
      { name: 'reason', type: 'string' },
      { name: 'inner', type: 'bytes' }
    ],
    name: 'FailedOpWithRevert',
    type: 'error'
  }
] as const

const ENTRYPOINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userOp } = body

    if (!userOp) {
      return NextResponse.json({ error: 'Missing userOp' }, { status: 400 })
    }

    const pk = process.env.PRIVATE_KEY
    if (!pk) {
      return NextResponse.json({ error: 'Server not configured with PRIVATE_KEY' }, { status: 500 })
    }

    const privateKey = (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`
    const deployerAccount = privateKeyToAccount(privateKey)

    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(process.env.NEXT_PUBLIC_ARC_RPC || 'https://rpc.testnet.arc.network')
    })

    const walletClient = createWalletClient({
      account: deployerAccount,
      chain: arcTestnet,
      transport: http(process.env.NEXT_PUBLIC_ARC_RPC || 'https://rpc.testnet.arc.network')
    })

    // --- Construct initCode ---
    // v0.7 JSON-RPC uses separate factory/factoryData; EntryPoint wants packed initCode
    let initCode: Hex = '0x'
    if (userOp.initCode) {
      initCode = userOp.initCode as Hex
    } else if (userOp.factory) {
      const factoryData = userOp.factoryData || '0x'
      initCode = `${userOp.factory}${factoryData.slice(2)}` as Hex
    }

    // --- Construct paymasterAndData ---
    let paymasterAndData: Hex = '0x'
    if (userOp.paymasterAndData) {
      paymasterAndData = userOp.paymasterAndData as Hex
    } else if (userOp.paymaster) {
      const pmVerGasLimit = BigInt(userOp.paymasterVerificationGasLimit || 0)
      const pmPostOpGasLimit = BigInt(userOp.paymasterPostOpGasLimit || 0)
      const pmData = userOp.paymasterData || '0x'
      const pmVerHex = pmVerGasLimit.toString(16).padStart(32, '0')
      const pmPostHex = pmPostOpGasLimit.toString(16).padStart(32, '0')
      paymasterAndData = `${userOp.paymaster}${pmVerHex}${pmPostHex}${pmData.slice(2)}` as Hex
    }

    // --- Construct accountGasLimits (bytes32) ---
    let accountGasLimits: Hex
    if (userOp.accountGasLimits) {
      accountGasLimits = userOp.accountGasLimits as Hex
    } else {
      const vLimit = BigInt(userOp.verificationGasLimit || 2000000)
      const cLimit = BigInt(userOp.callGasLimit || 120000)
      const packed = (vLimit << 128n) | cLimit
      accountGasLimits = `0x${packed.toString(16).padStart(64, '0')}` as Hex
    }

    // --- Construct gasFees (bytes32) ---
    let gasFees: Hex
    if (userOp.gasFees) {
      gasFees = userOp.gasFees as Hex
    } else {
      const maxPriority = BigInt(userOp.maxPriorityFeePerGas || 1000000000)
      const maxFee = BigInt(userOp.maxFeePerGas || 25000000000)
      const packed = (maxPriority << 128n) | maxFee
      gasFees = `0x${packed.toString(16).padStart(64, '0')}` as Hex
    }

    const packedUserOp = {
      sender: userOp.sender as Address,
      nonce: BigInt(userOp.nonce),
      initCode,
      callData: userOp.callData as Hex,
      accountGasLimits,
      preVerificationGas: BigInt(userOp.preVerificationGas),
      gasFees,
      paymasterAndData,
      signature: userOp.signature as Hex
    }

    console.log('[submit-userop-direct] Submitting PackedUserOperation to EntryPoint:', {
      sender: packedUserOp.sender,
      nonce: packedUserOp.nonce.toString(),
      initCodeLength: initCode.length,
      callDataLength: packedUserOp.callData.length,
      hasPaymaster: paymasterAndData !== '0x'
    })

    // Check sender's native balance first (for self-funded UserOps)
    const senderBalance = await publicClient.getBalance({ address: packedUserOp.sender })
    console.log('[submit-userop-direct] Sender native balance:', senderBalance.toString(), 'wei')

    // Simulate first to decode any FailedOp error
    try {
      await publicClient.simulateContract({
        address: ENTRYPOINT_ADDRESS,
        abi: entryPointAbi,
        functionName: 'handleOps',
        args: [[packedUserOp], deployerAccount.address],
        account: deployerAccount
      })
      console.log('[submit-userop-direct] Simulation passed')
    } catch (simErr: any) {
      // Try to decode the FailedOp error
      let failedReason = 'Unknown'
      try {
        const revertData = simErr?.cause?.data?.data || simErr?.data
        if (revertData) {
          const decoded = decodeErrorResult({ abi: entryPointAbi, data: revertData })
          failedReason = `${decoded.errorName}: ${decoded.args?.join(', ')}`
        }
      } catch { /* ignore decode failure */ }

      // Also extract from error message string
      const errMsg = simErr?.message || simErr?.shortMessage || ''
      // Look for AA error codes in the message
      const aaMatch = errMsg.match(/AA\d\d\s[^"'\n]+/)
      if (aaMatch) failedReason = aaMatch[0]

      console.error('[submit-userop-direct] Simulation FAILED:', failedReason)
      console.error('[submit-userop-direct] Full simulation error:', errMsg.slice(0, 500))

      return NextResponse.json({
        error: `EntryPoint rejected UserOp: ${failedReason}`,
        details: errMsg.slice(0, 1000)
      }, { status: 500 })
    }

    // Submit handleOps directly on-chain
    const txHash = await walletClient.writeContract({
      address: ENTRYPOINT_ADDRESS,
      abi: entryPointAbi,
      functionName: 'handleOps',
      args: [[packedUserOp], deployerAccount.address],
      chain: null,
      account: deployerAccount
    })

    console.log('[submit-userop-direct] Transaction submitted:', txHash)
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    console.log('[submit-userop-direct] Transaction confirmed in block:', receipt.blockNumber.toString())

    return NextResponse.json({
      success: receipt.status === 'success',
      txHash,
      blockNumber: receipt.blockNumber.toString()
    })
  } catch (err: any) {
    console.error('[submit-userop-direct] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Direct UserOperation submission failed' },
      { status: 500 }
    )
  }
}
