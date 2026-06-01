'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { LayoutGrid, Send, ArrowRightLeft, Rows, History, ShieldCheck, Blocks, Coins } from 'lucide-react'

interface NavItem {
  href: string
  icon: any
  label: string
  badge?: string
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const NAV_ITEMS: NavGroup[] = [
  { group: 'Operations', items: [
    { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { href: '/send', icon: Send, label: 'Send Payment' },
    { href: '/bridge', icon: ArrowRightLeft, label: 'CCTP Bridge' },
    { href: '/batch', icon: Rows, label: 'Batch Wire' },
    { href: '/treasury', icon: Coins, label: 'Treasury & FX' },
  ]},
  { group: 'Analytics', items: [
    { href: '/history', icon: History, label: 'Transaction Log' },
    { href: '/compliance', icon: ShieldCheck, label: 'Compliance' },
  ]},
  { group: 'Circle Stack', items: [
    { href: '/integrations', icon: Blocks, label: 'Integrations', badge: '7' },
  ]},
]


export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"></div>
        <span className="sidebar-logo-text">CrossWire</span>
      </div>

      <div className="sidebar-divider" />

      {/* Navigation */}
      {NAV_ITEMS.map((group) => (
        <div className="sidebar-group" key={group.group}>
          <div className="sidebar-header">{group.group}</div>
          {group.items.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon">
                  <Icon size={16} strokeWidth={1.25} />
                </span>
                {item.label}
                {item.badge && <span className="badge gray" style={{ marginLeft: 'auto' }}>{item.badge}</span>}
              </Link>
            )
          })}
        </div>
      ))}

      {/* Wallet at bottom */}
      <div style={{ marginTop: 'auto', padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
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
                      <button onClick={openConnectModal} className="btn primary" style={{ width: '100%' }}>
                        Connect Wallet
                      </button>
                    )
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        onClick={openChainModal}
                        className="btn ghost"
                        style={{ width: '100%', justifyContent: 'flex-start', border: '1px solid var(--border)' }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                        {chain.name}
                      </button>
                      <button
                        onClick={openAccountModal}
                        className="btn ghost text-mono"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
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
