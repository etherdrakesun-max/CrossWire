'use client'

import { usePathname } from 'next/navigation'
import { Search, Droplets, Menu, Landmark } from 'lucide-react'
import { useState, useEffect } from 'react'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/workspace': 'AI Workspace',
  '/dashboard': 'Dashboard',
  '/send': 'Send Payment',
  '/bridge': 'Treasury Funding Bridge',
  '/batch': 'Bulk Settlements',
  '/history': 'Transaction Log',
  '/compliance': 'Compliance Center',
  '/integrations': 'System Integrations',
  '/analytics': 'Volume Analytics',
  '/contacts': 'Address Book',
  '/invoices': 'Invoices',
  '/schedules': 'Payment Schedules',
  '/agents': 'AI Agent Planner',
  '/agents/jobs': 'Escrow Agent Jobs'
}

export default function Topbar() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] || 'Page'
  const [sandbox, setSandbox] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const current = localStorage.getItem('crosswire_sandbox') === 'true'
    setSandbox(current)
  }, [])

  const toggleSandbox = () => {
    const next = !sandbox
    localStorage.setItem('crosswire_sandbox', next ? 'true' : 'false')
    setSandbox(next)
    window.dispatchEvent(new Event('crosswire_sandbox_changed'))
  }

  return (
    <div className="topbar">
      <div className="flex items-center gap-3">
        <button 
          className="btn ghost mobile-hamburger" 
          style={{ padding: '4px', minHeight: 'auto' }}
          onClick={() => window.dispatchEvent(new CustomEvent('crosswire-toggle-sidebar'))}
          title="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>
        <div className="topbar-breadcrumb">
          <span className="text-muted">CrossWire</span> / {title}
          {sandbox && (
            <span className="badge warning" style={{ marginLeft: '10px', verticalAlign: 'middle', fontSize: '10px' }}>
              SANDBOX SIMULATION
            </span>
          )}
        </div>
      </div>

      <div className="topbar-actions">
        <button
          onClick={toggleSandbox}
          className={`btn text-xs flex items-center gap-1.5 ${sandbox ? 'primary' : 'ghost'}`}
          style={{ 
            borderColor: sandbox ? 'var(--warning)' : 'var(--border)',
            background: sandbox ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: sandbox ? 'var(--warning)' : 'var(--text-secondary)'
          }}
          title={sandbox ? "Disable Sandbox Mode" : "Enable Sandbox Mode"}
        >
          <Landmark size={14} />
          {sandbox ? 'Exit Sandbox' : 'Sandbox Demo'}
        </button>

        <a
          href="https://testnet.arcscan.app"
          target="_blank"
          rel="noopener noreferrer"
          className="btn ghost text-xs"
        >
          <Search size={14} strokeWidth={1.5} /> Audit Explorer
        </a>
        <a
          href="https://faucet.circle.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn ghost text-xs"
        >
          <Droplets size={14} strokeWidth={1.5} /> Request Sandbox Funds
        </a>
      </div>
    </div>
  )
}

