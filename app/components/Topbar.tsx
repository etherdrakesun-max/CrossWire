'use client'

import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, { icon: string; title: string }> = {
  '/': { icon: '📊', title: 'Dashboard' },
  '/send': { icon: '💸', title: 'Send Payment' },
  '/bridge': { icon: '🌉', title: 'CCTP Bridge' },
  '/batch': { icon: '📋', title: 'Batch Wire' },
  '/history': { icon: '🗃️', title: 'Transaction Log' },
  '/compliance': { icon: '🛡️', title: 'Compliance' },
  '/integrations': { icon: '🔗', title: 'Circle Integrations' },
}

export default function Topbar() {
  const pathname = usePathname()
  const page = PAGE_TITLES[pathname] || { icon: '📄', title: 'Page' }

  return (
    <div className="topbar">
      <div className="topbar-breadcrumb">
        <span>CrossWire</span> / {page.title}
      </div>
      <div className="topbar-actions">
        <a
          href="https://testnet.arcscan.app"
          target="_blank"
          rel="noopener noreferrer"
          className="btn ghost sm"
          style={{ fontSize: '12px' }}
        >
          🔍 Arcscan
        </a>
        <a
          href="https://faucet.circle.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn ghost sm"
          style={{ fontSize: '12px' }}
        >
          🚰 Faucet
        </a>
      </div>
    </div>
  )
}
