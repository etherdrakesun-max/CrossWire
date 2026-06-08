'use client'

import { usePathname } from 'next/navigation'
import { Search, Droplets, Menu } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/send': 'Send Payment',
  '/bridge': 'CCTP Bridge',
  '/batch': 'Batch Wire',
  '/history': 'Transaction Log',
  '/compliance': 'Compliance',
  '/integrations': 'Circle Integrations',
  '/analytics': 'Volume Analytics',
  '/contacts': 'Address Book',
  '/invoices': 'Invoices',
  '/schedules': 'Recurring Schedules'
}

export default function Topbar() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] || 'Page'

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
        </div>
      </div>

      <div className="topbar-actions">
        <a
          href="https://testnet.arcscan.app"
          target="_blank"
          rel="noopener noreferrer"
          className="btn ghost text-xs"
        >
          <Search size={14} strokeWidth={1.5} /> Arcscan
        </a>
        <a
          href="https://faucet.circle.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn ghost text-xs"
        >
          <Droplets size={14} strokeWidth={1.5} /> Faucet
        </a>
      </div>
    </div>
  )
}
