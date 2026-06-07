import { createPublicClient, http } from 'viem'
import { arcTestnet, CROSSWIRE_CONTRACT_ADDRESS } from './arc-config'
import { prisma } from './db'
import { crossWireRouterAbi } from './contracts'

const RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC || 'https://rpc.testnet.arc.network'

export const indexerClient = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL)
})

export async function syncEvents() {
  if (CROSSWIRE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.log('Indexer: No contract address configured.')
    return
  }

  // Get current sync state
  let syncState = await prisma.syncState.findUnique({ where: { id: 1 } })
  if (!syncState) {
    syncState = await prisma.syncState.create({
      data: { id: 1, lastBlockNumber: 0 }
    })
  }

  const startBlock = BigInt(syncState.lastBlockNumber + 1)
  const currentBlock = await indexerClient.getBlockNumber()

  if (startBlock > currentBlock) {
    console.log(`Indexer: Already in sync at block ${currentBlock.toString()}`)
    return
  }

  // Sync in chunks of 5000 blocks
  const maxChunk = 5000n
  let toBlock = startBlock + maxChunk
  if (toBlock > currentBlock) {
    toBlock = currentBlock
  }

  console.log(`Indexer: Syncing from block ${startBlock.toString()} to ${toBlock.toString()}`)

  // Get logs for the contract
  const logs = await indexerClient.getLogs({
    address: CROSSWIRE_CONTRACT_ADDRESS,
    fromBlock: startBlock,
    toBlock: toBlock
  })

  // Sort logs by blockNumber and logIndex to process chronologically
  const sortedLogs = logs.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return Number(a.blockNumber - b.blockNumber)
    }
    return (a.logIndex || 0) - (b.logIndex || 0)
  })

  for (const log of sortedLogs) {
    const txHash = log.transactionHash as string
    const blockNumber = Number(log.blockNumber)
    const logIndex = log.logIndex || 0

    // Fetch block timestamp
    const block = await indexerClient.getBlock({ blockNumber: log.blockNumber })
    const timestamp = new Date(Number(block.timestamp) * 1000)

    try {
      const { decodeEventLog } = await import('viem')
      const decoded = decodeEventLog({
        abi: crossWireRouterAbi,
        data: log.data,
        topics: log.topics
      })

      const eventName = decoded.eventName
      const args = decoded.args as any

      if (eventName === 'WireInitiated') {
        const wireId = Number(args.wireId)
        const sender = args.sender.toLowerCase()
        const recipient = args.recipient.toLowerCase()
        const amount = args.amount.toString()
        const refHash = args.reference || args.refHash || '0x'
        const purposeCode = Number(args.purposeCode || 0)
        const memo = args.memo || ''

        let status = 'PENDING'
        let feeAmount = '0'
        try {
          const wireData = await indexerClient.readContract({
            address: CROSSWIRE_CONTRACT_ADDRESS,
            abi: crossWireRouterAbi,
            functionName: 'getWire',
            args: [BigInt(wireId)]
          }) as any
          
          if (wireData) {
            const statusInt = Number(wireData.status)
            if (statusInt === 1) status = 'APPROVED'
            else if (statusInt === 2) status = 'EXECUTED'
            else if (statusInt === 3) status = 'CANCELLED'
            feeAmount = wireData.feeAmount.toString()
          }
        } catch (err) {
          console.error(`Indexer error calling getWire for wire #${wireId}:`, err)
        }

        await prisma.wire.upsert({
          where: { id: wireId },
          update: {
            status,
            feeAmount,
            txHash,
            blockNumber,
            timestamp
          },
          create: {
            id: wireId,
            sender,
            recipient,
            amount,
            feeAmount,
            refHash,
            purposeCode,
            memo,
            status,
            txHash,
            blockNumber,
            timestamp
          }
        })

        await prisma.wireEvent.upsert({
          where: { txHash_logIndex: { txHash, logIndex } },
          update: {},
          create: {
            wireId,
            eventType: 'Initiated',
            actor: sender,
            txHash,
            blockNumber,
            logIndex,
            timestamp,
            data: JSON.stringify(args)
          }
        })
      } 
      else if (eventName === 'WireExecuted') {
        const wireId = Number(args.wireId)
        const sender = args.sender.toLowerCase()
        const recipient = args.recipient.toLowerCase()
        const amount = args.amount.toString()
        const refHash = args.reference || args.refHash || '0x'

        await prisma.wire.upsert({
          where: { id: wireId },
          update: {
            status: 'EXECUTED',
            txHash,
            blockNumber,
            timestamp
          },
          create: {
            id: wireId,
            sender,
            recipient,
            amount,
            feeAmount: '0',
            refHash,
            purposeCode: 0,
            memo: '',
            status: 'EXECUTED',
            txHash,
            blockNumber,
            timestamp
          }
        })

        await prisma.wireEvent.upsert({
          where: { txHash_logIndex: { txHash, logIndex } },
          update: {},
          create: {
            wireId,
            eventType: 'Executed',
            actor: sender,
            txHash,
            blockNumber,
            logIndex,
            timestamp,
            data: JSON.stringify(args)
          }
        })
      }
      else if (eventName === 'WireApproved') {
        const wireId = Number(args.wireId)
        const approver = args.approver.toLowerCase()

        let status = 'APPROVED'
        try {
          const wireData = await indexerClient.readContract({
            address: CROSSWIRE_CONTRACT_ADDRESS,
            abi: crossWireRouterAbi,
            functionName: 'getWire',
            args: [BigInt(wireId)]
          }) as any
          if (wireData) {
            const statusInt = Number(wireData.status)
            if (statusInt === 2) status = 'EXECUTED'
            else if (statusInt === 3) status = 'CANCELLED'
          }
        } catch {}

        await prisma.wire.updateMany({
          where: { id: wireId },
          data: { status }
        })

        await prisma.wireEvent.upsert({
          where: { txHash_logIndex: { txHash, logIndex } },
          update: {},
          create: {
            wireId,
            eventType: 'Approved',
            actor: approver,
            txHash,
            blockNumber,
            logIndex,
            timestamp,
            data: JSON.stringify(args)
          }
        })
      }
      else if (eventName === 'WireCancelled') {
        const wireId = Number(args.wireId)
        const canceller = args.canceller.toLowerCase()

        await prisma.wire.updateMany({
          where: { id: wireId },
          data: { status: 'CANCELLED' }
        })

        await prisma.wireEvent.upsert({
          where: { txHash_logIndex: { txHash, logIndex } },
          update: {},
          create: {
            wireId,
            eventType: 'Cancelled',
            actor: canceller,
            txHash,
            blockNumber,
            logIndex,
            timestamp,
            data: JSON.stringify(args)
          }
        })
      }
      else if (eventName === 'WireFeeCollected') {
        const wireId = Number(args.wireId)
        const feeAmount = args.feeAmount.toString()
        const vault = args.vault.toLowerCase()

        await prisma.wire.updateMany({
          where: { id: wireId },
          data: { feeAmount }
        })

        await prisma.wireEvent.upsert({
          where: { txHash_logIndex: { txHash, logIndex } },
          update: {},
          create: {
            wireId,
            eventType: 'FeeCollected',
            actor: vault,
            txHash,
            blockNumber,
            logIndex,
            timestamp,
            data: JSON.stringify(args)
          }
        })
      }
    } catch (err) {
      console.error('Indexer failed decoding event:', err)
    }
  }

  // Update last synced block
  await prisma.syncState.update({
    where: { id: 1 },
    data: { lastBlockNumber: Number(toBlock) }
  })
}
