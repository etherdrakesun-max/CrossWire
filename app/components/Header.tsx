'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Activity } from 'lucide-react'

export default function Header() {
  const pathname = usePathname()

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
            {({ account, chain, openConnectModal, mounted }) => {
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
                    <button onClick={openConnectModal} className="btn ghost text-mono text-sm" style={{ padding: '6px 12px' }}>
                      Connect Wallet
                    </button>
                  ) : (
                    <span className="text-mono text-xs text-muted flex items-center gap-2" style={{ border: '1px solid var(--border)', padding: '6px 12px', background: 'var(--surface)' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></span>
                      {account.displayName}
                    </span>
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
    </header>
  )
}
