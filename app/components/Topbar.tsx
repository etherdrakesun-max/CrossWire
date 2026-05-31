'use client'

import { usePathname } from 'next/navigation'
import { Search, Droplets } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/send': 'Send Payment',
  '/bridge': 'CCTP Bridge',
  '/batch': 'Batch Wire',
  '/history': 'Transaction Log',
  '/compliance': 'Compliance',
  '/integrations': 'Circle Integrations',
}

export default function Topbar() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] || 'Page'

  return (
    <div className="topbar">
      <div className="topbar-breadcrumb">
        <span className="text-muted">CrossWire</span> / {title}
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
