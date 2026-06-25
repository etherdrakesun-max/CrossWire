'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect } from 'wagmi'
import AuthModal from './AuthModal'
import { Activity } from 'lucide-react'
import { useModal } from '@/lib/modal-context'
import WalletProfileModalContent from './WalletProfileModalContent'

export default function Header() {
  const pathname = usePathname()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { connector } = useAccount()
  const { disconnect } = useDisconnect()
  const [sandbox, setSandbox] = useState(false)
  const { showModal, hideModal } = useModal()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const checkSandbox = () => {
      setSandbox(localStorage.getItem('crosswire_sandbox') === 'true')
    }
    checkSandbox()
    window.addEventListener('crosswire_sandbox_changed', checkSandbox)
    return () => window.removeEventListener('crosswire_sandbox_changed', checkSandbox)
  }, [])

  return (
    <header className="marketing-header">
      <div className="marketing-header-container">
        <Link href="/" className="logo-link">
          <div className="logo-icon"></div>
          <span className="logo-text">CrossWire</span>
        </Link>

        <nav className="marketing-nav">
          <Link href="/docs" className={`nav-link ${pathname === '/docs' ? 'active' : ''}`}>
            Docs
          </Link>
          <Link href="/faq" className={`nav-link ${pathname === '/faq' ? 'active' : ''}`}>
            FAQ
          </Link>
          <Link href="/about" className={`nav-link ${pathname === '/about' ? 'active' : ''}`}>
            About
          </Link>
          <Link href="/support" className={`nav-link ${pathname === '/support' ? 'active' : ''}`}>
            Support
          </Link>
        </nav>

        <div className="marketing-header-actions">
          {sandbox ? (
            <button 
              onClick={() => {
                showModal({
                  type: 'custom',
                  title: 'Sandbox Corporate Account',
                  description: (
                    <WalletProfileModalContent
                      address="0x3a92dB489437EAdbfdeF0764D50965dF3aDe40B2"
                      connectorName="Sandbox Wallet"
                      isPasskey={false}
                      isSandbox={true}
                      onClose={hideModal}
                      disconnect={disconnect}
                    />
                  )
                })
              }}
              className="text-mono text-xs text-muted flex items-center gap-2 btn ghost" 
              style={{ border: '1px solid var(--warning)', padding: '6px 12px', background: 'rgba(245, 158, 11, 0.05)', cursor: 'pointer' }}
              title="View sandbox profile and balances"
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)' }}></span>
              Sandbox: 0x3a92...40B2
            </button>
          ) : (
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                const ready = mounted
                const connected = ready && account && chain

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                    })}
                  >
                    {!connected ? (
                      <button onClick={() => setIsAuthModalOpen(true)} className="btn ghost text-mono text-sm" style={{ padding: '6px 12px' }}>
                        Connect Wallet
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          showModal({
                            type: 'custom',
                            title: 'Corporate Wallet Profile',
                            description: (
                              <WalletProfileModalContent
                                address={account.address as `0x${string}`}
                                connectorName={connector?.name || 'Connected Wallet'}
                                isPasskey={connector?.id === 'circleModularWallet'}
                                isSandbox={false}
                                onClose={hideModal}
                                disconnect={disconnect}
                              />
                            )
                          })
                        }}
                        className="text-mono text-xs text-muted flex items-center gap-2 btn ghost" 
                        style={{ border: '1px solid var(--border)', padding: '6px 12px', background: 'var(--surface)', cursor: 'pointer' }}
                        title="View account profile and balances"
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></span>
                        {connector?.id === 'circleModularWallet' ? `Passkey: ${account.displayName}` : account.displayName}
                      </button>
                    )}

                    <AuthModal 
                      isOpen={isAuthModalOpen} 
                      onClose={() => setIsAuthModalOpen(false)} 
                      openRainbowKit={openConnectModal}
                    />
                  </div>
                )
              }}
            </ConnectButton.Custom>
          )}
          
          <Link href="/dashboard" className="btn primary text-sm" style={{ padding: '6px 16px', fontWeight: 600 }}>
            Launch App
          </Link>
        </div>
      </div>
    </header>
  )
}
