import { createPublicClient, http } from 'viem'

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

async function check() {
  const client = createPublicClient({
    chain: arcTestnet,
    transport: http('https://rpc.testnet.arc.network')
  })

  const address = '0x4CEF52F7e9e623A8C66fB9F51eD494D99e5251a3'
  console.log(`Checking bytecode of ${address}...`)
  try {
    const bytecode = await client.getBytecode({ address })
    console.log(`Bytecode length: ${bytecode ? bytecode.length : 0}`)
  } catch (err) {
    console.error(`Error: ${err.message}`)
  }
}

check()
