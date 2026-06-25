import { useAccount as useWagmiAccount } from 'wagmi'
import { useState, useEffect } from 'react'

export function useAccount() {
  const account = useWagmiAccount()
  const [sandbox, setSandbox] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const checkSandbox = () => {
      setSandbox(localStorage.getItem('crosswire_sandbox') === 'true')
    }
    checkSandbox()
    window.addEventListener('crosswire_sandbox_changed', checkSandbox)
    return () => window.removeEventListener('crosswire_sandbox_changed', checkSandbox)
  }, [])

  if (sandbox) {
    return {
      ...account,
      address: '0x3a92dB489437EaDbfdeF0764D50965dF3aDe40B2' as `0x${string}`,
      isConnected: true,
      connector: { id: 'sandbox', name: 'Sandbox Wallet' } as any,
      chainId: 5042002, // Arc Testnet
    }
  }

  return account
}
