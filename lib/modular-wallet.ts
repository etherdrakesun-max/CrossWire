import { createConnector } from 'wagmi'
import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  http, 
  Address,
  Hex
} from 'viem'
import { arcTestnet } from './arc-config'
import { 
  toCircleSmartAccount, 
  toModularTransport, 
  toPasskeyTransport, 
  toWebAuthnCredential, 
  WebAuthnMode 
} from '@circle-fin/modular-wallets-core'
import { toWebAuthnAccount } from 'viem/account-abstraction'

const CLIENT_KEY = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY || 'demo_client_key'
const CLIENT_URL = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL || 'https://modular-sdk.circle.com/v1/rpc/w3s'

// Initialize the transports
export const passkeyTransport = toPasskeyTransport(CLIENT_URL, CLIENT_KEY)
export const modularTransport = toModularTransport(`${CLIENT_URL}/${arcTestnet.id}`, CLIENT_KEY)

export const publicModularClient = createPublicClient({
  chain: arcTestnet,
  transport: modularTransport
})

export interface PasskeySession {
  credential: any
  walletAddress: Address
  username: string
}

// Session store helpers
export function getStoredSession(): PasskeySession | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('crosswire_passkey_session')
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch (err) {
    return null
  }
}

export function setStoredSession(session: PasskeySession | null) {
  if (typeof window === 'undefined') return
  if (session) {
    localStorage.setItem('crosswire_passkey_session', JSON.stringify(session))
  } else {
    localStorage.removeItem('crosswire_passkey_session')
  }
}

// Passkey Actions
export async function registerPasskey(username: string): Promise<PasskeySession> {
  // 1. Generate WebAuthn credential on device
  const credential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Register,
    username
  })

  // 2. Instantiate the Smart Contract Account to compute the address
  const owner = toWebAuthnAccount({ credential })
  const smartAccount = await toCircleSmartAccount({
    client: publicModularClient,
    owner,
    name: username
  })

  const session: PasskeySession = {
    credential,
    walletAddress: smartAccount.address,
    username
  }

  // 3. Register session on the backend
  const res = await fetch('/api/auth/passkey/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session)
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to register passkey session on backend')
  }

  setStoredSession(session)
  return session
}

export async function loginPasskey(): Promise<PasskeySession> {
  // 1. Authenticate returning WebAuthn credential on device
  const credential = await toWebAuthnCredential({
    transport: passkeyTransport,
    mode: WebAuthnMode.Login
  })

  // 2. Resolve wallet session from backend by credentialId
  const res = await fetch('/api/auth/passkey/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentialId: credential.id })
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Passkey not registered on this service')
  }

  const { walletAddress, username } = await res.json()

  const session: PasskeySession = {
    credential,
    walletAddress: walletAddress as Address,
    username
  }

  setStoredSession(session)
  return session
}

// Custom Wagmi Connector
export function circleModularWalletConnector() {
  return createConnector((config) => {
    let activeSession = getStoredSession()
    let smartAccountInstance: any = null

    async function ensureSmartAccount() {
      if (smartAccountInstance) return smartAccountInstance
      if (!activeSession) throw new Error('No active passkey session found')
      const owner = toWebAuthnAccount({ credential: activeSession.credential })
      smartAccountInstance = await toCircleSmartAccount({
        client: publicModularClient,
        owner,
        name: activeSession.username
      })
      return smartAccountInstance
    }

    const provider = {
      async request({ method, params }: { method: string; params?: any[] }) {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          if (!activeSession) return []
          return [activeSession.walletAddress]
        }
        if (method === 'eth_chainId') {
          return arcTestnet.id
        }
        if (method === 'personal_sign') {
          const [message, address] = params || []
          const account = await ensureSmartAccount()
          return await account.signMessage({ message })
        }
        if (method === 'eth_sendTransaction') {
          const [tx] = params || []
          const account = await ensureSmartAccount()
          const walletClient = createWalletClient({
            account,
            chain: arcTestnet,
            transport: custom({
              request: async ({ method, params }: any) => {
                return publicModularClient.request({ method, params } as any)
              }
            })
          })
          const hash = await walletClient.sendTransaction({
            account,
            to: tx.to as Address,
            data: tx.data as Hex,
            value: tx.value ? BigInt(tx.value) : undefined,
            gas: tx.gas ? BigInt(tx.gas) : undefined,
          } as any)
          return hash
        }

        // Forward all other read/write queries to the public modular client
        return publicModularClient.request({ method, params } as any)
      }
    }

    return {
      id: 'circleModularWallet',
      name: 'Circle Passkey',
      type: 'circleModularWallet' as const,

      async connect(options: any = {}) {
        const chainId = options?.chainId
        // If not already logged in, prompt login
        if (!activeSession) {
          activeSession = getStoredSession()
          if (!activeSession) {
            throw new Error('Please sign in via the Auth Modal first')
          }
        }

        config.emitter.emit('change', {
          accounts: [activeSession.walletAddress],
          chainId: arcTestnet.id
        })

        return {
          accounts: [activeSession.walletAddress],
          chainId: arcTestnet.id
        }
      },

      async disconnect() {
        activeSession = null
        smartAccountInstance = null
        setStoredSession(null)
        config.emitter.emit('disconnect')
      },

      async getAccounts() {
        if (!activeSession) return []
        return [activeSession.walletAddress]
      },

      async getChainId() {
        return arcTestnet.id
      },

      async isAuthorized() {
        const session = getStoredSession()
        if (session) {
          activeSession = session
          return true
        }
        return false
      },

      async getProvider() {
        return provider
      },

      onConnect(connectInfo: any) {
        config.emitter.emit('connect', connectInfo)
      },

      onAccountsChanged(accounts: any) {
        if (accounts.length === 0) {
          this.disconnect()
        } else {
          config.emitter.emit('change', { accounts: accounts as Address[] })
        }
      },

      onChainChanged(chainId: any) {
        config.emitter.emit('change', { chainId: Number(chainId) })
      },

      onDisconnect() {
        config.emitter.emit('disconnect')
      }
    } as any
  })
}
