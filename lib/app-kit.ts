import { AppKit } from '@circle-fin/app-kit'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'

let kitInstance: AppKit | null = null

/**
 * Initialize Circle App Kit singleton.
 * Requires a connected wallet provider (window.ethereum).
 */
export async function getAppKit(): Promise<AppKit> {
  if (kitInstance) return kitInstance

  kitInstance = new AppKit()
  return kitInstance
}

/**
 * Create a viem adapter from the browser wallet for App Kit operations.
 */
export async function createAdapter() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet provider found')
  }
  const adapter = await createViemAdapterFromProvider(window.ethereum as any)
  return adapter
}

/**
 * Execute a same-chain USDC send via App Kit.
 */
export async function appKitSend(params: {
  recipientAddress: string
  amount: string
}) {
  const kit = await getAppKit()
  const adapter = await createAdapter()

  const result = await kit.send({
    from: { adapter, chain: 'Arc_Testnet' as any },
    to: params.recipientAddress,
    amount: params.amount,
    token: 'USDC',
  })

  return result
}

/**
 * Bridge USDC from a source chain to Arc Testnet via CCTP.
 */
export async function appKitBridge(params: {
  sourceChain: string
  amount: string
}) {
  const kit = await getAppKit()
  const adapter = await createAdapter()

  const result = await kit.bridge({
    from: { adapter, chain: params.sourceChain as any },
    to: { adapter, chain: 'Arc_Testnet' as any },
    amount: params.amount,
  })

  return result
}

/**
 * Swap USDC to EURC (or vice versa) on Arc via App Kit Swap.
 */
export async function appKitSwap(params: {
  tokenIn: string
  tokenOut: string
  amountIn: string
}) {
  const kit = await getAppKit()
  const adapter = await createAdapter()

  const kitKey = process.env.NEXT_PUBLIC_CIRCLE_APP_KIT_KEY
  if (!kitKey) {
    throw new Error('NEXT_PUBLIC_CIRCLE_APP_KIT_KEY not set — get one from console.circle.com')
  }

  const result = await kit.swap({
    from: { adapter, chain: 'Arc_Testnet' as any },
    tokenIn: params.tokenIn as any,
    tokenOut: params.tokenOut as any,
    amountIn: params.amountIn,
    config: { kitKey },
  })

  return result
}
