'use client'

import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import {
  Blocks, Database, Scale, Send, ArrowRightLeft, Repeat, Building,
  ShieldCheck, Server, BookOpen, Box
} from 'lucide-react'
import { useModal } from '@/lib/modal-context'


const INTEGRATIONS = [
  {
    category: 'Autonomous Settlement Pipelines',
    items: [
      {
        icon: <Scale size={24} strokeWidth={1.25} />,
        name: 'AI Trust Registry (Smart Contract)',
        status: 'active',
        desc: 'Identity trust registry and secure job escrow routing system enabling secure agent authentication.',
        docs: 'https://testnet.arcscan.app',
        usage: 'Used in: AI Identity Registry, Escrow Deposit & Job Settle',
      },
      {
        icon: <ShieldCheck size={24} strokeWidth={1.25} />,
        name: 'Pay-Per-Use API Gateways',
        status: 'active',
        desc: 'Secure, pay-per-call API endpoints enabling automated settlements for premium market data and citations.',
        docs: 'https://github.com/etherdrakesun/track-1-CrossWire',
        usage: 'Endpoints: /api/premium/quote, /api/premium/citation',
      },
    ],
  },
  {
    category: 'Core Settlement',
    items: [
      {
        icon: <Database size={24} strokeWidth={1.25} />,
        name: 'Settlement Currency (USDC)',
        status: 'active',
        desc: 'Institutional USD-backed stablecoin used for instant settling with zero-fee transaction abstraction.',
        docs: 'https://docs.arc.network/building-on-arc/usdc',
        usage: 'Used in: Send Payment, Bulk Settlement, Treasury Bridge, Smart Contracts',
      },
      {
        icon: <Scale size={24} strokeWidth={1.25} />,
        name: 'Settlement Router (Smart Contract)',
        status: 'active',
        desc: 'Corporate routing contract supporting instant settlements, secondary approvals, bulk payouts, and regulatory reference mapping.',
        docs: 'https://testnet.arcscan.app',
        usage: 'Used in: Send Payment, Bulk Settlement, Compliance Center',
      },
    ],
  },
  {
    category: 'Circle App Kit',
    items: [
      {
        icon: <Send size={24} strokeWidth={1.25} />,
        name: 'Circle Transfer Protocol',
        status: 'active',
        desc: 'High-performance transfer interface providing instant payment settlement and fee-abstracted corporate payouts.',
        docs: 'https://docs.arc.network/app-kit/send',
        usage: 'Used in: Send Payment (direct transfer mode)',
      },
      {
        icon: <ArrowRightLeft size={24} strokeWidth={1.25} />,
        name: 'Circle Cross-Chain Protocol (CCTP)',
        status: 'active',
        desc: "Circle's official secure bridging pipeline allowing institutional asset movement across multiple networks.",
        docs: 'https://docs.arc.network/app-kit/bridge',
        usage: 'Used in: CCTP Bridge page',
      },
      {
        icon: <Repeat size={24} strokeWidth={1.25} />,
        name: 'Corporate FX Conversions',
        status: 'available',
        desc: 'Automated institutional-grade FX swapping protocol for multi-currency treasury operations.',
        docs: 'https://docs.arc.network/app-kit/swap',
        usage: 'Available for: FX conversion workflows',
      },
      {
        icon: <Building size={24} strokeWidth={1.25} />,
        name: 'Unified Treasury Balance',
        status: 'available',
        desc: 'Unified corporate balance aggregator consolidated across multiple blockchain networks.',
        docs: 'https://docs.arc.network/app-kit/unified-balance',
        usage: 'Available for: Treasury management, multi-chain spending',
      },
      {
        icon: <Blocks size={24} strokeWidth={1.25} />,
        name: 'Composite Workflows',
        status: 'available',
        desc: 'Streamlined multi-step operations combining bridging and FX conversion in a single transaction.',
        docs: 'https://docs.arc.network/app-kit/references/sdk-reference',
        usage: 'Available for: Complex multi-step transfers',
      },
    ],
  },
  {
    category: 'Infrastructure',
    items: [
      {
        icon: <ShieldCheck size={24} strokeWidth={1.25} />,
        name: 'RainbowKit + WalletConnect',
        status: 'active',
        desc: 'Multi-wallet connection supporting MetaMask, WalletConnect, Coinbase Wallet, and 150+ wallets.',
        docs: 'https://www.rainbowkit.com',
        usage: 'Used in: All pages (sidebar wallet connection)',
      },
      {
        icon: <Server size={24} strokeWidth={1.25} />,
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
  const { showModal, updateModal } = useModal()

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          <h1 className="flex items-center gap-3">
            <Blocks size={32} strokeWidth={1.5} className="text-primary" />
            Circle Integrations
          </h1>
          <p className="text-muted text-sm" style={{ marginBottom: '8px' }}>
            Complete inventory of Circle developer tools and third-party integrations used in CrossWire
          </p>

          <div className="stat-grid" style={{ marginBottom: '32px' }}>
            <div className="stat-card">
              <div className="stat-label">Active Integrations</div>
              <div className="stat-value">
                {INTEGRATIONS.reduce((sum, cat) => sum + cat.items.filter((i) => i.status === 'active').length, 0)}
              </div>
              <div className="stat-label mt-2 text-muted">In production</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Available</div>
              <div className="stat-value">
                {INTEGRATIONS.reduce((sum, cat) => sum + cat.items.filter((i) => i.status === 'available').length, 0)}
              </div>
              <div className="stat-label mt-2 text-muted">Ready to activate</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Circle Products</div>
              <div className="stat-value">7</div>
              <div className="stat-label mt-2 text-muted">USDC, App Kit ×5, Smart Contracts</div>
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
                        <span className={`badge ${item.status === 'active' ? 'green' : 'gray'}`}>
                          {item.status === 'active' ? 'Active' : 'Available'}
                        </span>
                      </div>
                      <div className="integration-desc">{item.desc}</div>
                      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <a
                          href={item.docs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn ghost text-xs flex items-center gap-1"
                          style={{ padding: '4px 8px' }}
                        >
                          <BookOpen size={14} strokeWidth={1.5} /> Docs
                        </a>
                      </div>
                      <div className="text-xs text-light" style={{ marginTop: '12px' }}>
                        {item.usage}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Interactive UI States Playground */}
          <h2>Interactive Modal & State Playground</h2>
          <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
            Test the unified visual modal system. These triggers showcase custom animations, transitions, and UX behaviors:
          </p>

          <div className="integration-grid" style={{ marginBottom: '32px' }}>
            <div className="integration-card" style={{ display: 'block' }}>
              <div className="integration-name" style={{ marginBottom: '12px' }}>Action & Confirmation Modals</div>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => showModal({
                    type: 'confirm',
                    title: 'Confirm Disconnection',
                    description: 'Are you sure you want to disconnect your corporate wallet from the CrossWire payment gateway?',
                    confirmText: 'Disconnect Wallet',
                    cancelText: 'Cancel',
                    destructive: true,
                    onConfirm: () => console.log('Wallet disconnected')
                  })}
                  className="btn text-xs"
                >
                  Confirmation
                </button>
                <button 
                  onClick={() => showModal({
                    type: 'warning',
                    title: 'High-Value Transfer Warning',
                    description: 'This transaction exceeds $10,000 USDC and will require 2 signatory approvals from the Compliance Board before release.',
                    confirmText: 'Acknowledge & Submit',
                    cancelText: 'Cancel'
                  })}
                  className="btn text-xs"
                >
                  Warning State
                </button>
              </div>
            </div>

            <div className="integration-card" style={{ display: 'block' }}>
              <div className="integration-name" style={{ marginBottom: '12px' }}>Async & Transition Flows</div>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => {
                    showModal({
                      type: 'loading',
                      title: 'Processing CSV Ledger',
                      description: 'Parsing CSV entries and validating recipient addresses. Please do not close this window.'
                    })
                    setTimeout(() => {
                      updateModal({
                        type: 'success',
                        title: 'Ledger Parsed Successfully',
                        description: '14 settlement entries have been parsed and batched into the queue.'
                      })
                    }, 3000)
                  }}
                  className="btn text-xs"
                >
                  Loading ➔ Success (3s)
                </button>

                <button 
                  onClick={() => {
                    showModal({
                      type: 'tx-status',
                      title: 'Broadcasting to Settlement Network',
                      description: 'Submitting transaction payload to the network validators...',
                      txStatus: 'pending',
                      txHash: '0x28972Ea3B462bCc711BCE1a1D13426e64906a46C7892a019b8cf92b8d00123'
                    })
                    setTimeout(() => {
                      updateModal({
                        title: 'Confirming Settlement',
                        description: 'Waiting for validation response...',
                        txStatus: 'confirming'
                      })
                    }, 2000)
                    setTimeout(() => {
                      updateModal({
                        title: 'Settlement Completed',
                        description: 'Your transfer has been confirmed and settled successfully.',
                        txStatus: 'success'
                      })
                    }, 4000)
                  }}
                  className="btn text-xs"
                >
                  Settlement Flow
                </button>
              </div>
            </div>

            <div className="integration-card" style={{ display: 'block' }}>
              <div className="integration-name" style={{ marginBottom: '12px' }}>Error Handling & Mapping</div>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => showModal({
                    type: 'error',
                    title: 'Execution Interrupted',
                    description: 'The Router encountered an processing execution error during validation.',
                    errorDetails: 'Error Code: 403-1002 (Insufficient Balance: Required 50.00 USDC, Available 25.00 USDC)',
                    showRetry: true,
                    onRetry: () => console.log('Retrying...')
                  })}
                  className="btn text-xs"
                >
                  Execution Error
                </button>

                <button 
                  onClick={() => showModal({
                    type: 'error',
                    title: 'Signature Request Rejected',
                    description: 'You rejected the signature request. Please approve the request to dispatch the settlement.',
                  })}
                  className="btn text-xs"
                >
                  Wallet Rejected
                </button>

                <button 
                  onClick={() => showModal({
                    type: 'error',
                    title: 'Network Fee Limit Exceeded',
                    description: 'Your wallet has insufficient USDC balance to cover transaction fees. Please top up your balance.',
                    errorDetails: 'Error Code: INSUFFICIENT_FEE_BALANCE'
                  })}
                  className="btn text-xs"
                >
                  Transaction Fee Fail
                </button>
              </div>
            </div>
          </div>

          {/* Architecture Summary */}
          <h2>Architecture Overview</h2>
          <div className="callout" style={{ marginBottom: '24px' }}>
            <span className="callout-icon"><Box size={20} strokeWidth={1.5} /></span>
            <div>

              <pre style={{ fontSize: '12px', lineHeight: 1.6, fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
{`┌──────────────────────────────────────────────────────────────┐
│                    CrossWire Agent Mesh                      │
│ Next.js 16 App Router  │  RainbowKit  │  FOSS Creator Webhooks│
├──────────────┬───────────┴──────────────┴──────────────┬──────┤
│ App Kit / FX │ EIP-712 Signatures  │  x402 Micropayments │      │
├──────────────┴────────────────────────────────────────┤      │
│  CrossWireAgent (ERC-8004 Registry + ERC-8183 Escrow)  │ viem │
│  CrossWireRouterV2.sol (Gasless Payouts Relayer)      │      │
├───────────────────────────────────────────────────────┤      │
│     USDC (ERC-20, 6 decimals) & EURC Gasless Rails    │      │
├───────────────────────────────────────────────────────┤      │
│            Arc Testnet (Chain ID: 5042002)            │      │
└───────────────────────────────────────────────────────┴──────┘`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
