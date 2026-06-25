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
import { toWebAuthnAccount, createBundlerClient } from 'viem/account-abstraction'
import { estimateGasSavings, getPaymasterUrl } from './paymaster'

let rawKey = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY || 'demo_client_key'
// Remove quotes, whitespaces, or other formatting artifacts
rawKey = rawKey.trim().replace(/^["']|["']$/g, '')

let rawUrl = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL || 'https://modular-sdk.circle.com/v1/rpc/w3s'
rawUrl = rawUrl.trim().replace(/^["']|["']$/g, '')
rawUrl = rawUrl.replace(/\/buidl\/?$/, '')
rawUrl = rawUrl.replace(/\/$/, '')

const CLIENT_KEY = rawKey
const CLIENT_URL = rawUrl

// Safely initialize the transports to prevent build-time crashes (e.g. on Vercel)
const dummyTransport = (reason: string) => custom({
  request: async () => {
    throw new Error(`Circle transport is uninitialized or invalid. Reason: ${reason}`)
  }
})

let passkeyTransportTmp: any
let modularTransportTmp: any

try {
  if (CLIENT_KEY === 'demo_client_key') {
    throw new Error('Placeholder NEXT_PUBLIC_CIRCLE_CLIENT_KEY is active. Please add your actual key to Vercel env settings.')
  }
  passkeyTransportTmp = toPasskeyTransport(CLIENT_URL, CLIENT_KEY)
} catch (err: any) {
  console.warn('⚠️ toPasskeyTransport failed to initialize, using fallback:', err)
  passkeyTransportTmp = dummyTransport(err?.message || 'toPasskeyTransport failed')
}

try {
  if (CLIENT_KEY === 'demo_client_key') {
    throw new Error('Placeholder NEXT_PUBLIC_CIRCLE_CLIENT_KEY is active. Please add your actual key to Vercel env settings.')
  }
  const modularUrl = `${CLIENT_URL}/arcTestnet`
  modularTransportTmp = toModularTransport(modularUrl, CLIENT_KEY)
} catch (err: any) {
  console.warn('⚠️ toModularTransport failed to initialize, using fallback:', err)
  modularTransportTmp = dummyTransport(err?.message || 'toModularTransport failed')
}

export const passkeyTransport = passkeyTransportTmp
export const modularTransport = modularTransportTmp

export const publicModularClient = createPublicClient({
  chain: arcTestnet,
  transport: modularTransport
})

export const publicStandardClient = createPublicClient({
  chain: arcTestnet,
  transport: http(process.env.NEXT_PUBLIC_ARC_RPC || 'https://rpc.testnet.arc.network')
})

export interface PasskeySession {
  credential: any
  walletAddress: Address
  username: string
}

function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function serializeValue(val: any): any {
  if (typeof window === 'undefined') return val;
  if (val instanceof ArrayBuffer) {
    return { __type: 'ArrayBuffer', data: arrayBufferToBase64(val) }
  }
  if (val instanceof Uint8Array) {
    return { __type: 'Uint8Array', data: arrayBufferToBase64(val.buffer) }
  }
  if (Array.isArray(val)) {
    return val.map(serializeValue)
  }
  if (val && typeof val === 'object') {
    const res: any = {}
    for (const k in val) {
      res[k] = serializeValue(val[k])
    }
    return res
  }
  return val
}

function deserializeValue(val: any): any {
  if (typeof window === 'undefined') return val;
  if (val && typeof val === 'object') {
    if (val.__type === 'ArrayBuffer') {
      return base64ToArrayBuffer(val.data)
    }
    if (val.__type === 'Uint8Array') {
      return new Uint8Array(base64ToArrayBuffer(val.data))
    }
    if (Array.isArray(val)) {
      return val.map(deserializeValue)
    }
    const res: any = {}
    for (const k in val) {
      res[k] = deserializeValue(val[k])
    }
    return res
  }
  return val
}

// Session store helpers
export function getStoredSession(): PasskeySession | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('crosswire_passkey_session')
  if (!stored) return null
  try {
    const parsed = JSON.parse(stored)
    const deserialized = deserializeValue(parsed)
    
    // Ensure getPublicKey() and other methods are restored if they exist in the deserialized object
    if (deserialized && deserialized.credential && deserialized.credential.response) {
      const resp = deserialized.credential.response;
      
      // If we have publicKey as Uint8Array but getPublicKey() helper is missing, attach it
      if (resp.publicKey && !resp.getPublicKey) {
        resp.getPublicKey = () => resp.publicKey;
      }
      if (resp.authenticatorData && !resp.getAuthenticatorData) {
        resp.getAuthenticatorData = () => resp.authenticatorData;
      }
      if (resp.clientDataJSON && !resp.getClientDataJSON) {
        resp.getClientDataJSON = () => resp.clientDataJSON;
      }
      if (resp.attestationObject && !resp.getAttestationObject) {
        resp.getAttestationObject = () => resp.attestationObject;
      }
    }
    
    return deserialized
  } catch (err) {
    console.error('Failed to deserialize stored session:', err)
    return null
  }
}

export function setStoredSession(session: PasskeySession | null) {
  if (typeof window === 'undefined') return
  if (session) {
    const serialized = serializeValue(session)
    localStorage.setItem('crosswire_passkey_session', JSON.stringify(serialized))
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
          let txs: any[] = []
          if (params && Array.isArray(params)) {
            if (Array.isArray(params[0])) {
              txs = params[0]
            } else {
              txs = params
            }
          }
          if (txs.length === 0) {
            throw new Error('[ModularWallet] No transaction parameters provided')
          }
          const firstTx = txs[0]
          const account = await ensureSmartAccount()

          // 1. Call our server route to validate sponsorship eligibility
          let isSponsored = false
          let estimatedSavedUsd = 0.15

          try {
            const res = await fetch('/api/sponsor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'validate',
                userAddress: activeSession?.walletAddress,
                target: firstTx.to,
                data: firstTx.data
              })
            })
            if (res.ok) {
              const data = await res.json()
              if (data.sponsored) {
                isSponsored = true
                estimatedSavedUsd = await estimateGasSavings(
                  publicStandardClient,
                  firstTx.to,
                  firstTx.data,
                  activeSession!.walletAddress
                )
              }
            }
          } catch (sponsorErr) {
            console.error('Sponsorship validation failed, defaulting to user-paid execution:', sponsorErr)
          }

          // 1b. Check if the sender has enough native balance to self-fund gas.
          let canSelfFundGas = false
          try {
            const senderBalance = await publicStandardClient.getBalance({
              address: activeSession!.walletAddress as Address
            })
            canSelfFundGas = senderBalance >= 1000000000000000000n // >= 1 USDC
          } catch (balErr) {
            console.warn('[ModularWallet] Failed to check sender balance:', balErr)
          }

          const usePaymaster = isSponsored && !canSelfFundGas

          // We wrap the transport to intercept the signed PackedUserOperation
          const interceptingTransport = (opts: any) => {
            const baseTransport = modularTransport(opts)
            return {
              ...baseTransport,
              async request(args: any): Promise<any> {
                if (args && args.method === 'eth_sendUserOperation') {
                  const [userOp] = args.params || []
                  console.log('[ModularWallet] Intercepted signed PackedUserOperation:', userOp)
                }
                return await baseTransport.request(args)
              }
            }
          }

          const bundlerClient = createBundlerClient({
            chain: arcTestnet,
            transport: interceptingTransport
          })

          let maxPriorityFeePerGas: bigint | undefined = undefined
          let maxFeePerGas: bigint | undefined = undefined

          try {
            const fees = await publicStandardClient.estimateFeesPerGas()
            const baseFee = fees.maxFeePerGas && fees.maxPriorityFeePerGas
              ? fees.maxFeePerGas - fees.maxPriorityFeePerGas
              : 20000000000n

            maxPriorityFeePerGas = fees.maxPriorityFeePerGas !== undefined && fees.maxPriorityFeePerGas > 1000000000n
              ? fees.maxPriorityFeePerGas
              : 1000000000n

            maxFeePerGas = baseFee + maxPriorityFeePerGas
          } catch (err) {
            console.error('Failed to estimate fees per gas, using default floors:', err)
            maxPriorityFeePerGas = 1000000000n
            maxFeePerGas = 50000000000n
          }

          // Construct the calls array for batch support
          const calls = txs.map((txItem: any) => ({
            to: txItem.to as Address,
            data: txItem.data as Hex,
            value: txItem.value ? BigInt(txItem.value) : undefined,
          }))

          // 3. Send the UserOperation transaction with retry logic
          console.log(`[ModularWallet] Sending UserOperation (paymaster: ${usePaymaster}, calls count: ${calls.length})...`)
          let userOpHash: Hex | undefined
          let directSubmitHash: string | undefined
          try {
            userOpHash = await bundlerClient.sendUserOperation({
              account,
              calls,
              paymaster: usePaymaster ? true : undefined,
              maxPriorityFeePerGas,
              maxFeePerGas
            })
          } catch (sendErr: any) {
            const errMsg = sendErr?.message || sendErr?.shortMessage || ''
            const isMaxOpsError = errMsg.includes('Max operations') || errMsg.includes('unstaked')
            const isPaymasterStakeError = errMsg.includes('stake') || errMsg.includes('unstake')
            
            if (isPaymasterStakeError && usePaymaster && !isMaxOpsError) {
              console.warn('[ModularWallet] Paymaster unstaked. Retrying without paymaster...')
              try {
                userOpHash = await bundlerClient.sendUserOperation({
                  account,
                  calls,
                  maxPriorityFeePerGas,
                  maxFeePerGas
                })
                isSponsored = false
              } catch (retryErr: any) {
                const retryMsg = retryErr?.message || ''
                if (retryMsg.includes('Max operations') || retryMsg.includes('unstaked')) {
                  console.warn('[ModularWallet] Bundler mempool full. Falling back to direct submit...')
                } else {
                  throw retryErr
                }
              }
            }
            
            if (!userOpHash && (isMaxOpsError || isPaymasterStakeError)) {
              console.warn('[ModularWallet] Bundler blocked execution. Preparing manual signed UserOperation...')
              
              try {
                const nonce = await account.getNonce()
                const isDeployed = await account.isDeployed()
                let initCode: Hex = '0x'
                if (!isDeployed) {
                  const factoryArgs = await account.getFactoryArgs()
                  initCode = `${factoryArgs.factory}${factoryArgs.factoryData.slice(2)}` as Hex
                }
                const callData = await account.encodeCalls(calls)

                const manualUserOp = {
                  sender: account.address,
                  nonce,
                  initCode,
                  callData,
                  callGasLimit: 150000n * BigInt(calls.length),
                  verificationGasLimit: 2000000n,
                  preVerificationGas: 100000n * BigInt(calls.length),
                  maxFeePerGas: maxFeePerGas || 25000000000n,
                  maxPriorityFeePerGas: maxPriorityFeePerGas || 1000000000n,
                  paymasterAndData: '0x' as Hex
                }

                const signature = await account.signUserOperation(manualUserOp)
                
                const signedUserOp = {
                  ...manualUserOp,
                  signature
                }

                const serializedUserOp = {
                  ...signedUserOp,
                  nonce: signedUserOp.nonce.toString(),
                  preVerificationGas: signedUserOp.preVerificationGas.toString(),
                  callGasLimit: signedUserOp.callGasLimit.toString(),
                  verificationGasLimit: signedUserOp.verificationGasLimit.toString(),
                  maxFeePerGas: signedUserOp.maxFeePerGas.toString(),
                  maxPriorityFeePerGas: signedUserOp.maxPriorityFeePerGas.toString(),
                }
                const res = await fetch('/api/submit-userop-direct', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userOp: serializedUserOp })
                })
                const result = await res.json()
                if (res.ok && result.success) {
                  directSubmitHash = result.txHash
                  console.log('[ModularWallet] Direct EntryPoint submit succeeded! Tx:', directSubmitHash)
                } else {
                  throw new Error(result.error || 'Direct EntryPoint submit failed')
                }
              } catch (directErr: any) {
                console.error('[ModularWallet] Direct EntryPoint submit failed, trying EOA fallback next:', directErr)
              }

              if (!directSubmitHash) {
                console.warn('[ModularWallet] Using EOA proxy fallback...')
                try {
                  for (const tx of txs) {
                    const res = await fetch('/api/direct-submit', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        to: tx.to,
                        data: tx.data,
                        userAddress: activeSession?.walletAddress
                      })
                    })
                    const result = await res.json()
                    if (res.ok && result.success) {
                      directSubmitHash = result.txHash
                      console.log('[ModularWallet] EOA proxy fallback item succeeded! Tx:', directSubmitHash)
                    } else {
                      throw new Error(result.error || 'EOA proxy fallback failed')
                    }
                  }
                  console.log('[ModularWallet] EOA proxy fallback batch succeeded!')
                } catch (directErr: any) {
                  console.error('[ModularWallet] EOA proxy fallback also failed:', directErr)
                  throw sendErr
                }
              }
            } else if (!userOpHash) {
              throw sendErr
            }
          }

          // If we used direct submit, return the hash immediately
          if (directSubmitHash) {
            return directSubmitHash
          }
          const confirmedUserOpHash = userOpHash!
          console.log('[ModularWallet] UserOperation sent! Hash:', confirmedUserOpHash)

          // 4. Wait for the transaction receipt to get the standard transaction hash
          console.log('[ModularWallet] Waiting for UserOperation receipt (dual-path poll)...')
          let hash: string
          try {
            hash = await new Promise<string>((resolve, reject) => {
              const start = Date.now()
              const timeoutMs = 90000 // 90 seconds timeout
              const intervalMs = 2000 // poll every 2 seconds
              
              const interval = setInterval(async () => {
                const elapsed = Date.now() - start
                if (elapsed > timeoutMs) {
                  clearInterval(interval)
                  reject(new Error(`Timed out waiting for User Operation ${confirmedUserOpHash} after ${timeoutMs / 1000}s`))
                  return
                }

                // Path A: Check bundler getUserOperationReceipt
                try {
                  const result = await bundlerClient.getUserOperationReceipt({
                    hash: confirmedUserOpHash
                  })
                  if (result && result.receipt?.transactionHash) {
                    console.log('[ModularWallet] [Path A] Got receipt from bundler:', result.receipt.transactionHash)
                    clearInterval(interval)
                    resolve(result.receipt.transactionHash)
                    return
                  }
                } catch (err) {
                  // Ignore and retry next tick
                }

                // Path B: Check EntryPoint UserOperationEvent logs on-chain
                try {
                  const entryPointAddress = account.entryPoint?.address || '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
                  const currentBlock = await publicStandardClient.getBlockNumber()
                  const fromBlock = currentBlock > 50n ? currentBlock - 50n : 0n
                  
                  const logs = await publicStandardClient.getLogs({
                    address: entryPointAddress,
                    event: {
                      type: 'event',
                      name: 'UserOperationEvent',
                      inputs: [
                        { type: 'bytes32', name: 'userOpHash', indexed: true },
                        { type: 'address', name: 'sender', indexed: true },
                        { type: 'address', name: 'paymaster', indexed: true },
                        { type: 'uint256', name: 'nonce' },
                        { type: 'bool', name: 'success' },
                        { type: 'uint256', name: 'actualGasCost' },
                        { type: 'uint256', name: 'actualGasUsed' }
                      ]
                    },
                    args: {
                      userOpHash: confirmedUserOpHash
                    },
                    fromBlock,
                    toBlock: currentBlock
                  })

                  if (logs.length > 0 && logs[0].transactionHash) {
                    console.log('[ModularWallet] [Path B] Got transaction hash from EntryPoint logs:', logs[0].transactionHash)
                    clearInterval(interval)
                    resolve(logs[0].transactionHash)
                    return
                  }
                } catch (err) {
                  // Ignore and retry next tick
                }
              }, intervalMs)
            })
            console.log('[ModularWallet] UserOperation confirmed! Tx Hash:', hash)
          } catch (err) {
            console.error('[ModularWallet] Error waiting for UserOperation receipt:', err)
            throw err
          }

          // 5. If sponsored, record the gas savings database entry on the server
          if (isSponsored) {
            try {
              await fetch('/api/sponsor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'record',
                  userAddress: activeSession?.walletAddress,
                  txHash: hash,
                  gasSavedUsd: estimatedSavedUsd
                })
              })
            } catch (recordErr) {
              console.error('Failed to record gas savings in database:', recordErr)
            }
          }

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

        try {
          config.emitter.emit('change', {
            accounts: [activeSession.walletAddress],
            chainId: arcTestnet.id
          })
        } catch (err) {
          console.warn('Emitter emit change failed:', err)
        }

        return {
          accounts: [activeSession.walletAddress],
          chainId: arcTestnet.id
        }
      },

      async disconnect() {
        activeSession = null
        smartAccountInstance = null
        setStoredSession(null)
        try {
          config.emitter.emit('disconnect')
        } catch (err) {
          console.warn('Emitter emit disconnect failed:', err)
        }
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
        try {
          config.emitter.emit('connect', connectInfo)
        } catch (err) {
          console.warn('Emitter emit connect failed:', err)
        }
      },

      onAccountsChanged(accounts: any) {
        if (accounts.length === 0) {
          this.disconnect()
        } else {
          try {
            config.emitter.emit('change', { accounts: accounts as Address[] })
          } catch (err) {
            console.warn('Emitter emit change failed:', err)
          }
        }
      },

      onChainChanged(chainId: any) {
        try {
          config.emitter.emit('change', { chainId: Number(chainId) })
        } catch (err) {
          console.warn('Emitter emit change failed:', err)
        }
      },

      onDisconnect() {
        try {
          config.emitter.emit('disconnect')
        } catch (err) {
          console.warn('Emitter emit disconnect failed:', err)
        }
      }
    } as any
  })
}
