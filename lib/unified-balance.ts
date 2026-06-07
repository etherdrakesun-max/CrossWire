import { createPublicClient, http, formatUnits } from 'viem'
import { CCTP_CHAINS } from './chains'
import { erc20Abi } from './contracts'

export interface MultiChainBalance {
  chainId: number
  chainKey: string
  chainName: string
  balance: string
  rawBalance: string
  symbol: string
  decimals: number
}

/**
 * Fetch USDC balances for a user address across Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, and Arc Testnet.
 */
export async function fetchMultiChainUSDCBalances(userAddress: string): Promise<Record<string, MultiChainBalance>> {
  const balances: Record<string, MultiChainBalance> = {}

  if (!userAddress || !userAddress.startsWith('0x')) {
    return balances
  }

  // Iterate over each chain key from CCTP_CHAINS
  const chainKeys = Object.keys(CCTP_CHAINS)

  await Promise.all(
    chainKeys.map(async (key) => {
      const config = CCTP_CHAINS[key]
      try {
        const client = createPublicClient({
          transport: http(config.rpcUrl),
        })

        const rawBal = await client.readContract({
          address: config.usdcAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`],
        })

        const decimals = 6 // USDC uses 6 decimals
        const formatted = formatUnits(rawBal as bigint, decimals)

        balances[key] = {
          chainId: config.id,
          chainKey: key,
          chainName: config.name,
          balance: formatted,
          rawBalance: (rawBal as bigint).toString(),
          symbol: 'USDC',
          decimals,
        }
      } catch (err) {
        console.error(`Error fetching USDC balance on ${config.name}:`, err)
        // Graceful fallback for offline, zero balance, or RPC rate-limited scenarios
        balances[key] = {
          chainId: config.id,
          chainKey: key,
          chainName: config.name,
          balance: '0.00',
          rawBalance: '0',
          symbol: 'USDC',
          decimals: 6,
        }
      }
    })
  )

  return balances
}
