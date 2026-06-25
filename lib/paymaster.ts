import { createPublicClient, http, formatUnits, Address } from 'viem'
import { arcTestnet } from './arc-config'

export const PAYMASTER_ADDRESS = '0x1f91886c7028986ad885ffcee0e40b75c9cd5ac1'

export function getPaymasterUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL || 'https://modular-sdk.circle.com/v1/rpc/w3s'
  return `${baseUrl}/arcTestnet`
}

/**
 * Estimates the gas savings of a sponsored transaction in USD (USDC equivalent)
 */
export async function estimateGasSavings(
  publicClient: any,
  to: string,
  data: string,
  from: string
): Promise<number> {
  try {
    const [gasEstimate, gasPrice] = await Promise.all([
      publicClient.estimateGas({
        to: to as Address,
        data: data as `0x${string}`,
        account: from as Address
      }),
      publicClient.getGasPrice()
    ])

    const totalCostWei = BigInt(gasEstimate) * BigInt(gasPrice)
    const costUsd = parseFloat(formatUnits(totalCostWei, 18))
    
    // Standard ERC-4337 transaction on Arc Testnet costs around 0.15 - 0.50 USDC
    return Math.max(costUsd, 0.15)
  } catch (err) {
    console.error('Error estimating gas savings:', err)
    return 0.15 // Fallback representation of gas fee
  }
}
