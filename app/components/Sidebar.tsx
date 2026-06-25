'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import AuthModal from './AuthModal'
import { LayoutGrid, Send, ArrowRightLeft, Rows, History, ShieldCheck, Blocks, Coins, BookOpen, Calendar, FileText, Bot, Briefcase, TrendingUp, X, Sparkles, MessageSquare, Workflow, BrainCircuit } from 'lucide-react'
import { useModal } from '@/lib/modal-context'
import WalletProfileModalContent from './WalletProfileModalContent'


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
  { group: 'AI Workspace', items: [
    { href: '/workspace', icon: Sparkles, label: 'New Chat' },
    { href: '/agents', icon: BrainCircuit, label: 'AI Agents' },
  ]},

  { group: 'Operations', items: [
    { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { href: '/send', icon: Send, label: 'Send Payment' },
    { href: '/contacts', icon: BookOpen, label: 'Address Book' },
    { href: '/invoices', icon: FileText, label: 'Invoices' },
    { href: '/schedules', icon: Calendar, label: 'Payment Schedules' },
    { href: '/bridge', icon: ArrowRightLeft, label: 'Treasury Funding' },
    { href: '/batch', icon: Rows, label: 'Bulk Settlements' },
    { href: '/treasury', icon: Coins, label: 'Treasury & FX' },
  ]},

  { group: 'Autonomous Network', items: [
    { href: '/agents/jobs', icon: Briefcase, label: 'Escrow Agent Jobs' },
  ]},

  { group: 'Analytics', items: [
    { href: '/analytics', icon: TrendingUp, label: 'Volume Analytics' },
    { href: '/history', icon: History, label: 'Transaction Log' },
    { href: '/compliance', icon: ShieldCheck, label: 'Compliance Center' },
  ]},
  { group: 'Platform Stack', items: [
    { href: '/integrations', icon: Blocks, label: 'System Integrations', badge: '7' },
  ]},
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { connector } = useAccount()
  const { disconnect } = useDisconnect()
  const [isOpen, setIsOpen] = useState(false)
  const [sandbox, setSandbox] = useState(false)
  const { showModal, hideModal } = useModal()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const checkSandbox = () => {
      setSandbox(localStorage.getItem('crosswire_sandbox') === 'true')
    }
    checkSandbox()
    window.addEventListener('crosswire_sandbox_changed', checkSandbox)

    const handleToggle = () => setIsOpen(prev => !prev)
    const handleClose = () => setIsOpen(false)
    window.addEventListener('crosswire-toggle-sidebar', handleToggle)
    window.addEventListener('crosswire-close-sidebar', handleClose)

    return () => {
      window.removeEventListener('crosswire_sandbox_changed', checkSandbox)
      window.removeEventListener('crosswire-toggle-sidebar', handleToggle)
      window.removeEventListener('crosswire-close-sidebar', handleClose)
    }
  }, [])

  // Auto-close sidebar on page change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <>
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => window.dispatchEvent(new CustomEvent('crosswire-close-sidebar'))} 
        />
      )}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo flex items-center justify-between" style={{ width: '100%' }}>
          <Link href="/" className="flex items-center" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="sidebar-logo-icon"></div>
            <span className="sidebar-logo-text">CrossWire</span>
          </Link>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('crosswire-close-sidebar'))} 
            className="btn ghost desktop-close-btn"
            style={{ padding: '4px', minHeight: 'auto' }}
          >
            <X size={16} />
          </button>
        </div>


      <div className="sidebar-divider" />

      {/* Scrollable Navigation Area */}
      <div className="sidebar-nav-scrollable" style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
      </div>

      {/* Wallet at bottom */}
      <div style={{ marginTop: 'auto', padding: '16px 24px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {sandbox ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="btn ghost"
              style={{ width: '100%', justifyContent: 'flex-start', border: '1px solid var(--border)', cursor: 'default' }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }}></div>
              Arc Testnet (Sandbox)
            </button>
            <button
              onClick={() => {
                showModal({
                  type: 'custom',
                  title: 'Sandbox Corporate Account',
                  description: (
                    <WalletProfileModalContent
                      address="0x3a92dB489437EaDbfdeF0764D50965dF3aDe40B2"
                      connectorName="Sandbox Wallet"
                      isPasskey={false}
                      isSandbox={true}
                      onClose={hideModal}
                      disconnect={disconnect}
                    />
                  )
                })
              }}
              className="btn ghost text-mono text-xs"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              title="View sandbox profile and balances"
            >
              Sandbox: 0x3a92...40B2
            </button>
          </div>
        ) : (
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
                        <button onClick={() => setIsAuthModalOpen(true)} className="btn primary" style={{ width: '100%' }}>
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
                          className="btn ghost text-mono text-xs"
                          style={{ width: '100%', justifyContent: 'flex-start' }}
                          title="View account profile and balances"
                        >
                          {connector?.id === 'circleModularWallet' ? `Passkey: ${account.displayName}` : account.displayName}
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )
            }}
          </ConnectButton.Custom>
        )}
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        openRainbowKit={() => {
          // Temporarily trigger RainbowKit by getting element or clicking
          const btn = document.querySelector('[aria-label="Connect Wallet"]') as HTMLButtonElement
          if (btn) btn.click()
        }}
      />
      </div>
    </>
  )
}
