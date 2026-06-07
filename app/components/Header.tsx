'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect } from 'wagmi'
import AuthModal from './AuthModal'
import { Activity } from 'lucide-react'

export default function Header() {
  const pathname = usePathname()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { connector } = useAccount()
  const { disconnect } = useDisconnect()

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
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, mounted }) => {
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
                        if (connector?.id === 'circleModularWallet') {
                          disconnect()
                        } else {
                          openAccountModal()
                        }
                      }}
                      className="text-mono text-xs text-muted flex items-center gap-2 btn ghost" 
                      style={{ border: '1px solid var(--border)', padding: '6px 12px', background: 'var(--surface)', cursor: 'pointer' }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></span>
                      {connector?.id === 'circleModularWallet' ? `Passkey: ${account.displayName}` : account.displayName}
                    </button>
                  )}
                </div>
              )
            }}
          </ConnectButton.Custom>
          
          <Link href="/dashboard" className="btn primary text-sm" style={{ padding: '6px 16px', fontWeight: 600 }}>
            Launch App
          </Link>
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        openRainbowKit={() => {
          const btn = document.querySelector('[aria-label="Connect Wallet"]') as HTMLButtonElement
          if (btn) btn.click()
        }}
      />
    </header>
  )
}
