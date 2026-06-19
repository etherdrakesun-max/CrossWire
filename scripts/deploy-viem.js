import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
      webSocket: ['wss://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arcscan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
}

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

async function main() {
  const pk = process.env.PRIVATE_KEY
  if (!pk) {
    throw new Error('PRIVATE_KEY not configured in .env')
  }
  
  const account = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`)
  console.log(`Deployer address: ${account.address}`)

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.network')
  })

  const walletClient = createWalletClient({
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.network'),
    account
  })

  // Read Router Artifact
  const routerPath = path.resolve('artifacts/contracts/CrossWireRouterV2.sol/CrossWireRouterV2.json')
  const routerArtifact = JSON.parse(fs.readFileSync(routerPath, 'utf8'))

  // Read Agent Artifact
  const agentPath = path.resolve('artifacts/contracts/CrossWireAgent.sol/CrossWireAgent.json')
  const agentArtifact = JSON.parse(fs.readFileSync(agentPath, 'utf8'))

  console.log('1️⃣ Deploying CrossWireRouterV2...')
  const hashRouter = await walletClient.deployContract({
    abi: routerArtifact.abi,
    bytecode: routerArtifact.bytecode,
    args: [USDC_ADDRESS]
  })
  console.log(`Transaction hash: ${hashRouter}`)
  console.log('Waiting for transaction receipt...')
  const receiptRouter = await publicClient.waitForTransactionReceipt({ hash: hashRouter })
  const routerAddress = receiptRouter.contractAddress
  console.log(`✅ CrossWireRouterV2 deployed to: ${routerAddress}`)

  console.log('2️⃣ Deploying CrossWireAgent...')
  const hashAgent = await walletClient.deployContract({
    abi: agentArtifact.abi,
    bytecode: agentArtifact.bytecode,
    args: [account.address] // Deployer is the admin fee recipient
  })
  console.log(`Transaction hash: ${hashAgent}`)
  console.log('Waiting for transaction receipt...')
  const receiptAgent = await publicClient.waitForTransactionReceipt({ hash: hashAgent })
  const agentAddress = receiptAgent.contractAddress
  console.log(`✅ CrossWireAgent deployed to: ${agentAddress}`)

  console.log('\n========================================================')
  console.log('📋 Deployment Successful! Add these to your .env file:')
  console.log(`NEXT_PUBLIC_CROSSWIRE_CONTRACT=${routerAddress}`)
  console.log(`NEXT_PUBLIC_CROSSWIRE_AGENT_CONTRACT=${agentAddress}`)
  console.log('========================================================\n')
}

main().catch(console.error)
