import { keccak256 } from 'viem'

// TokenMessengerV2 ABI
export const tokenMessengerAbi = [
  {
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
    ],
    name: 'depositForBurn',
    outputs: [{ name: '_nonce', type: 'uint64' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

// MessageTransmitterV2 ABI
export const messageTransmitterAbi = [
  {
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' },
    ],
    name: 'receiveMessage',
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'message', type: 'bytes' }
    ],
    name: 'MessageSent',
    type: 'event',
  },
] as const

/**
 * Padded hex format (32 bytes) for CCTP inputs.
 */
export function addressToBytes32(address: string): `0x${string}` {
  const clean = address.startsWith('0x') ? address.slice(2) : address
  return `0x${clean.padStart(64, '0')}` as `0x${string}`
}

/**
 * Poll the Iris Sandbox API for Circle validator attestations.
 * Implements exponential backoff to respect API rate limits.
 */
export async function pollAttestation(
  messageHash: string,
  onStatusChange?: (status: string) => void
): Promise<string> {
  const maxAttempts = 30
  let attempt = 0
  let delay = 2000 // Start with 2s

  while (attempt < maxAttempts) {
    attempt++
    onStatusChange?.(`Polling Iris API... (Attempt ${attempt}/${maxAttempts})`)

    try {
      const response = await fetch(`https://iris-api-sandbox.circle.com/v1/attestations/${messageHash}`)
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'complete' && data.attestation) {
          return data.attestation
        } else if (data.status === 'failed') {
          throw new Error('Circle Attestation marked as failed')
        }
      }
    } catch (e: any) {
      if (e.message === 'Circle Attestation marked as failed') {
        throw e
      }
      // Fail silently on network errors to retry
    }

    await new Promise((r) => setTimeout(r, delay))
    // Increase delay exponentially, maxing out at 10 seconds per request
    delay = Math.min(delay * 1.5, 10000)
  }

  throw new Error('Circle Attestation timeout after 30 attempts')
}
