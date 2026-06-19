import { createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
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

const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
]

async function main() {
  const pClient = createPublicClient({
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.network'),
  })

  const pk = process.env.PRIVATE_KEY
  if (!pk) {
    console.error('PRIVATE_KEY not set in .env')
    return
  }
  const account = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`)
  console.log(`Checking account: ${account.address}`)

  const nativeBal = await pClient.getBalance({ address: account.address })
  console.log(`Native Gas Balance (18 decimals): ${Number(nativeBal) / 1e18} USDC`)

  const usdcAddress = '0x3600000000000000000000000000000000000000'
  try {
    const erc20Bal = await pClient.readContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    })
    console.log(`ERC-20 USDC Balance (6 decimals): ${Number(erc20Bal) / 1e6} USDC`)
  } catch (err) {
    console.error(`Error reading ERC20 balance: ${err.message}`)
  }
}

main()
