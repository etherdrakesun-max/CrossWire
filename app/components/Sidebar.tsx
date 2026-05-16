'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const NAV_ITEMS: { group: string; items: { href: string; icon: string; label: string; badge?: string }[] }[] = [
  { group: 'Operations', items: [
    { href: '/', icon: '📊', label: 'Dashboard' },
    { href: '/send', icon: '💸', label: 'Send Payment' },
    { href: '/bridge', icon: '🌉', label: 'CCTP Bridge' },
    { href: '/batch', icon: '📋', label: 'Batch Wire' },
  ]},
  { group: 'Analytics', items: [
    { href: '/history', icon: '🗃️', label: 'Transaction Log' },
    { href: '/compliance', icon: '🛡️', label: 'Compliance' },
  ]},
  { group: 'Circle Stack', items: [
    { href: '/integrations', icon: '🔗', label: 'Integrations', badge: '7' },
  ]},
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">CW</div>
        <span className="sidebar-logo-text">CrossWire</span>
      </div>

      <div className="sidebar-divider" />

      {/* Navigation */}
      {NAV_ITEMS.map((group) => (
        <div className="sidebar-group" key={group.group}>
          <div className="sidebar-header">{group.group}</div>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              {item.label}
              {item.badge && <span className="sidebar-badge">{item.badge}</span>}
            </Link>
          ))}
        </div>
      ))}

      {/* Wallet at bottom */}
      <div style={{ marginTop: 'auto', padding: '12px 14px', borderTop: '1px solid var(--notion-border-light)' }}>
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const ready = mounted
            const connected = ready && account && chain

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button onClick={openConnectModal} className="btn primary" style={{ width: '100%', fontSize: '13px' }}>
                        Connect Wallet
                      </button>
                    )
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        onClick={openChainModal}
                        className="btn ghost sm"
                        style={{ width: '100%', justifyContent: 'flex-start', fontSize: '12px' }}
                      >
                        🟢 {chain.name}
                      </button>
                      <button
                        onClick={openAccountModal}
                        className="btn ghost sm"
                        style={{ width: '100%', justifyContent: 'flex-start', fontFamily: 'monospace', fontSize: '12px' }}
                      >
                        {account.displayName}
                      </button>
                    </div>
                  )
                })()}
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
    </div>
  )
}
