export interface ChainConfig {
  id: number
  name: string
  cctpDomain: number
  usdcAddress: `0x${string}`
  tokenMessenger: `0x${string}`
  messageTransmitter: `0x${string}`
  explorerUrl: string
  rpcUrl: string
}

export const CCTP_CHAINS: Record<string, ChainConfig> = {
  Ethereum_Sepolia: {
    id: 11155111,
    name: 'Ethereum Sepolia',
    cctpDomain: 0,
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    tokenMessenger: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://rpc.ankr.com/eth_sepolia',
  },
  Base_Sepolia: {
    id: 84532,
    name: 'Base Sepolia',
    cctpDomain: 6,
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    tokenMessenger: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    explorerUrl: 'https://sepolia.basescan.org',
    rpcUrl: 'https://sepolia.base.org',
  },
  Arbitrum_Sepolia: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    cctpDomain: 3,
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    tokenMessenger: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    explorerUrl: 'https://sepolia.arbiscan.io',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  },
  Arc_Testnet: {
    id: 5042002,
    name: 'Arc Testnet',
    cctpDomain: 26,
    usdcAddress: '0x3600000000000000000000000000000000000000',
    tokenMessenger: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
    messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    explorerUrl: 'https://testnet.arcscan.app',
    rpcUrl: 'https://rpc.testnet.arc.network',
  },
}
