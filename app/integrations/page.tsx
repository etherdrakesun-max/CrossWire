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
    category: 'Core Settlement',
    items: [
      {
        icon: <Database size={24} strokeWidth={1.25} />,
        name: 'USDC on Arc',
        status: 'active',
        desc: 'Native gas token + ERC-20 interface. 6-decimal precision. Zero-cost gas abstraction.',
        docs: 'https://docs.arc.network/building-on-arc/usdc',
        usage: 'Used in: Send Payment, Batch Wire, Bridge, Smart Contract',
      },
      {
        icon: <Scale size={24} strokeWidth={1.25} />,
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
        icon: <Send size={24} strokeWidth={1.25} />,
        name: 'App Kit — Send',
        status: 'active',
        desc: 'Same-chain USDC transfers via kit.send(). Abstracted wallet-to-wallet payments with automatic gas handling.',
        docs: 'https://docs.arc.network/app-kit/send',
        usage: 'Used in: Send Payment (direct transfer mode)',
      },
      {
        icon: <ArrowRightLeft size={24} strokeWidth={1.25} />,
        name: 'App Kit — Bridge (CCTP)',
        status: 'active',
        desc: 'Cross-chain USDC transfer via Circle Cross-Chain Transfer Protocol. Burn → Attestation → Mint pipeline with real-time visualization.',
        docs: 'https://docs.arc.network/app-kit/bridge',
        usage: 'Used in: CCTP Bridge page',
      },
      {
        icon: <Repeat size={24} strokeWidth={1.25} />,
        name: 'App Kit — Swap (StableFX)',
        status: 'available',
        desc: 'Token swap between USDC and EURC on Arc. Requires KIT_KEY from Circle Console.',
        docs: 'https://docs.arc.network/app-kit/swap',
        usage: 'Available for: FX conversion workflows',
      },
      {
        icon: <Building size={24} strokeWidth={1.25} />,
        name: 'App Kit — Unified Balance',
        status: 'available',
        desc: 'Aggregate USDC from multiple chains into a single spendable balance. Deposit from Base, Arbitrum, Ethereum — spend on Arc.',
        docs: 'https://docs.arc.network/app-kit/unified-balance',
        usage: 'Available for: Treasury management, multi-chain spending',
      },
      {
        icon: <Blocks size={24} strokeWidth={1.25} />,
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
                        title: 'Ledger Parsed successfully',
                        description: '14 wire entries have been parsed and batched into the queue.'
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
                      title: 'Broadcasting to Arc',
                      description: 'Submitting transaction payload to the Arc precompiles...',
                      txStatus: 'pending',
                      txHash: '0x28972Ea3B462bCc711BCE1a1D13426e64906a46C7892a019b8cf92b8d00123'
                    })
                    setTimeout(() => {
                      updateModal({
                        title: 'Confirming On-chain',
                        description: 'Waiting for block finality on the Arc Testnet ledger...',
                        txStatus: 'confirming'
                      })
                    }, 2000)
                    setTimeout(() => {
                      updateModal({
                        title: 'Wire Transfer Settled',
                        description: 'Your wire has been confirmed and settled successfully.',
                        txStatus: 'success'
                      })
                    }, 4000)
                  }}
                  className="btn text-xs"
                >
                  Blockchain Tx Flow
                </button>
              </div>
            </div>

            <div className="integration-card" style={{ display: 'block' }}>
              <div className="integration-name" style={{ marginBottom: '12px' }}>Error Handling & Mapping</div>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => showModal({
                    type: 'error',
                    title: 'On-chain Execution Reverted',
                    description: 'The CrossWire router encountered an EVM execution error during validation.',
                    errorDetails: 'Error: VM Exception while processing transaction: revert InsufficientBalance (required: 50000000, balance: 25000000)',
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
                    description: 'You rejected the transaction signature request in your wallet client. Please approve the request to dispatch the wire.',
                  })}
                  className="btn text-xs"
                >
                  Wallet Rejected
                </button>

                <button 
                  onClick={() => showModal({
                    type: 'error',
                    title: 'Gas Precompile Failure',
                    description: 'Your wallet has insufficient USDC balance to pay the network transaction gas fees on Arc. Please deposit USDC.',
                    errorDetails: 'Error Code: ARC_INSUFFICIENT_GAS_BALANCE'
                  })}
                  className="btn text-xs"
                >
                  Gas Precompile Fail
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
│                     CrossWire Frontend                       │
│  Next.js 14 App Router  │  RainbowKit  │  Institutional UI  │
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
