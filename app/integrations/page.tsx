'use client'

import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

const INTEGRATIONS = [
  {
    category: 'Core Settlement',
    items: [
      {
        icon: '💵',
        name: 'USDC on Arc',
        status: 'active',
        desc: 'Native gas token + ERC-20 interface. 6-decimal precision. Zero-cost gas abstraction.',
        docs: 'https://docs.arc.network/building-on-arc/usdc',
        usage: 'Used in: Send Payment, Batch Wire, Bridge, Smart Contract',
      },
      {
        icon: '⚖️',
        name: 'CrossWireRouter Smart Contract',
        status: 'active',
        desc: 'Custom Solidity contract deployed on Arc Testnet. Supports wire initiation, multi-sig approval, batch execution, and SWIFT-style reference encoding.',
        docs: 'https://testnet.arcscan.app',
        usage: 'Used in: Send Payment, Batch Wire, Compliance Audit',
      },
    ],
  },
  {
    category: 'Circle App Kit',
    items: [
      {
        icon: '📡',
        name: 'App Kit — Send',
        status: 'active',
        desc: 'Same-chain USDC transfers via kit.send(). Abstracted wallet-to-wallet payments with automatic gas handling.',
        docs: 'https://docs.arc.network/app-kit/send',
        usage: 'Used in: Send Payment (direct transfer mode)',
      },
      {
        icon: '🌉',
        name: 'App Kit — Bridge (CCTP)',
        status: 'active',
        desc: 'Cross-chain USDC transfer via Circle Cross-Chain Transfer Protocol. Burn → Attestation → Mint pipeline with real-time visualization.',
        docs: 'https://docs.arc.network/app-kit/bridge',
        usage: 'Used in: CCTP Bridge page',
      },
      {
        icon: '🔄',
        name: 'App Kit — Swap (StableFX)',
        status: 'available',
        desc: 'Token swap between USDC and EURC on Arc. Requires KIT_KEY from Circle Console.',
        docs: 'https://docs.arc.network/app-kit/swap',
        usage: 'Available for: FX conversion workflows',
      },
      {
        icon: '🏦',
        name: 'App Kit — Unified Balance',
        status: 'available',
        desc: 'Aggregate USDC from multiple chains into a single spendable balance. Deposit from Base, Arbitrum, Ethereum — spend on Arc.',
        docs: 'https://docs.arc.network/app-kit/unified-balance',
        usage: 'Available for: Treasury management, multi-chain spending',
      },
      {
        icon: '🔗',
        name: 'App Kit — Combine',
        status: 'available',
        desc: 'Compose multiple App Kit operations in a single workflow. Bridge + Swap in one call.',
        docs: 'https://docs.arc.network/app-kit/references/sdk-reference',
        usage: 'Available for: Complex multi-step transfers',
      },
    ],
  },
  {
    category: 'Infrastructure',
    items: [
      {
        icon: '🔐',
        name: 'RainbowKit + WalletConnect',
        status: 'active',
        desc: 'Multi-wallet connection supporting MetaMask, WalletConnect, Coinbase Wallet, and 150+ wallets.',
        docs: 'https://www.rainbowkit.com',
        usage: 'Used in: All pages (sidebar wallet connection)',
      },
      {
        icon: '⛓️',
        name: 'Arc Testnet Chain Config',
        status: 'active',
        desc: 'Chain ID: 5042002. RPC: rpc.testnet.arc.network. Explorer: testnet.arcscan.app. Deterministic finality <1s.',
        docs: 'https://docs.arc.network/building-on-arc/network-configuration',
        usage: 'Used in: All on-chain operations',
      },
    ],
  },
]

export default function IntegrationsPage() {
  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          <h1><span className="page-icon">🔗</span>Circle Integrations</h1>
          <p className="text-muted text-sm" style={{ marginBottom: '8px' }}>
            Complete inventory of Circle developer tools and third-party integrations used in CrossWire
          </p>

          <div className="stat-grid" style={{ marginBottom: '32px' }}>
            <div className="stat-card">
              <div className="stat-label">Active Integrations</div>
              <div className="stat-value">
                {INTEGRATIONS.reduce((sum, cat) => sum + cat.items.filter((i) => i.status === 'active').length, 0)}
              </div>
              <div className="stat-sub">In production</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Available</div>
              <div className="stat-value">
                {INTEGRATIONS.reduce((sum, cat) => sum + cat.items.filter((i) => i.status === 'available').length, 0)}
              </div>
              <div className="stat-sub">Ready to activate</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Circle Products</div>
              <div className="stat-value">7</div>
              <div className="stat-sub">USDC, App Kit ×5, Smart Contracts</div>
            </div>
          </div>

          {INTEGRATIONS.map((category) => (
            <div key={category.category}>
              <h2>{category.category}</h2>
              <div className="integration-grid">
                {category.items.map((item) => (
                  <div key={item.name} className="integration-card">
                    <span className="integration-icon">{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div className="integration-name">{item.name}</div>
                        <span className={`badge ${item.status === 'active' ? 'green' : 'blue'}`}>
                          {item.status === 'active' ? 'Active' : 'Available'}
                        </span>
                      </div>
                      <div className="integration-desc">{item.desc}</div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <a
                          href={item.docs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn ghost sm"
                          style={{ fontSize: '11px' }}
                        >
                          📖 Docs
                        </a>
                      </div>
                      <div className="text-xs text-light" style={{ marginTop: '6px' }}>
                        {item.usage}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Architecture Summary */}
          <h2>Architecture Overview</h2>
          <div className="callout" style={{ marginBottom: '24px' }}>
            <span className="callout-icon">🏗️</span>
            <div>
              <pre style={{ fontSize: '12px', lineHeight: 1.6, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{`┌──────────────────────────────────────────────────────────────┐
│                     CrossWire Frontend                       │
│  Next.js 14 App Router  │  RainbowKit  │  Notion Design     │
├──────────────┬───────────┴──────────────┴──────────────┬──────┤
│  App Kit SDK │  Send │ Bridge │ Swap │ Unified Balance │      │
├──────────────┴────────────────────────────────────────┤      │
│              CrossWireRouter.sol (Arc Testnet)         │ viem │
│  initiateWire │ batchWires │ multiSig │ compliance     │      │
├───────────────────────────────────────────────────────┤      │
│           USDC (ERC-20, 6 dec) + CCTP v2              │      │
├───────────────────────────────────────────────────────┤      │
│              Arc Testnet (Chain ID: 5042002)           │      │
└───────────────────────────────────────────────────────┴──────┘`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
