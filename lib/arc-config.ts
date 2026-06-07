import { defineChain } from 'viem'

export const arcTestnet = defineChain({
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
      apiUrl: 'https://api.testnet.arcscan.app/api',
    },
  },
  testnet: true,
})

// USDC on Arc — ERC-20 interface uses 6 decimals
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const
export const USDC_DECIMALS = 6

// Contract address — update after deployment
export const CROSSWIRE_CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CROSSWIRE_CONTRACT_V2 ||
  process.env.NEXT_PUBLIC_CROSSWIRE_CONTRACT ||
  '0x0000000000000000000000000000000000000000'
) as `0x${string}`

// Explorer helpers
export const getExplorerTxUrl = (hash: string) =>
  `https://testnet.arcscan.app/tx/${hash}`

export const getExplorerAddressUrl = (addr: string) =>
  `https://testnet.arcscan.app/address/${addr}`
