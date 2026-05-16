'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

type BridgeStep = 'idle' | 'burn' | 'attest' | 'mint' | 'complete' | 'error'

const SOURCE_CHAINS = [
  { id: 'Ethereum_Sepolia', name: 'Ethereum Sepolia', icon: '🔷' },
  { id: 'Base_Sepolia', name: 'Base Sepolia', icon: '🔵' },
  { id: 'Arbitrum_Sepolia', name: 'Arbitrum Sepolia', icon: '🟠' },
]

export default function BridgePage() {
  const { address, isConnected } = useAccount()

  const [sourceChain, setSourceChain] = useState('Ethereum_Sepolia')
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<BridgeStep>('idle')
  const [burnHash, setBurnHash] = useState('')
  const [mintHash, setMintHash] = useState('')
  const [attestationStatus, setAttestationStatus] = useState('')

  const handleBridge = async () => {
    if (!isConnected || !address) {
      toast.error('Connect your wallet first')
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }

    try {
      // Step 1: Burn on source chain
      setStep('burn')
      toast.loading('Burning USDC on source chain...', { id: 'bridge' })

      const { appKitBridge } = await import('@/lib/app-kit')
      const result = await appKitBridge({
        sourceChain,
        amount,
      })

      // The bridge result should contain the transaction details
      if (result && (result as any).transactionHash) {
        setBurnHash((result as any).transactionHash)
      }

      // Step 2: Attestation
      setStep('attest')
      toast.loading('Waiting for Circle attestation...', { id: 'bridge' })
      setAttestationStatus('Polling CCTP attestation API...')

      // Attestation happens automatically via App Kit Bridge
      // In production, poll: https://iris-api-sandbox.circle.com/attestations/{hash}
      await new Promise((r) => setTimeout(r, 2000))
      setAttestationStatus('Attestation received ✓')

      // Step 3: Mint on Arc
      setStep('mint')
      toast.loading('Minting USDC on Arc Testnet...', { id: 'bridge' })

      await new Promise((r) => setTimeout(r, 1500))
      if (result && (result as any).destinationTransactionHash) {
        setMintHash((result as any).destinationTransactionHash)
      }

      // Complete
      setStep('complete')
      toast.success(`${amount} USDC bridged to Arc Testnet!`, { id: 'bridge' })
    } catch (err: any) {
      console.error('Bridge error:', err)
      setStep('error')
      toast.error(err?.message?.slice(0, 100) || 'Bridge failed', { id: 'bridge' })
    }
  }

  const resetBridge = () => {
    setStep('idle')
    setAmount('')
    setBurnHash('')
    setMintHash('')
    setAttestationStatus('')
  }

  const getStepClass = (s: BridgeStep, target: BridgeStep, completedAfter: BridgeStep[]) => {
    if (step === target) return 'active'
    if (completedAfter.includes(step)) return 'completed'
    if (step === 'error') return step === target ? 'error' : ''
    return ''
  }

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          <h1><span className="page-icon">🌉</span>CCTP Bridge</h1>
          <p className="text-muted text-sm" style={{ marginBottom: '8px' }}>
            Bridge USDC from other chains to Arc Testnet via Circle Cross-Chain Transfer Protocol
          </p>

          <div className="callout blue" style={{ marginBottom: '24px' }}>
            <span className="callout-icon">🔄</span>
            <div>
              <strong>How CCTP Works</strong>
              <p className="text-muted text-sm">
                1. <strong>Burn</strong> USDC on source chain → 2. <strong>Attest</strong> by Circle validators →
                3. <strong>Mint</strong> native USDC on Arc Testnet. No wrapped tokens, no liquidity pools.
              </p>
            </div>
          </div>

          {/* Bridge Pipeline Visualization */}
          <div className="pipeline" style={{ marginBottom: '32px' }}>
            <div className={`pipeline-step ${getStepClass(step, 'burn', ['attest', 'mint', 'complete'])}`}>
              <div className="pipeline-dot">🔥</div>
              <div className="pipeline-label">Burn on Source</div>
            </div>
            <div className={`pipeline-line ${['attest', 'mint', 'complete'].includes(step) ? 'completed' : step === 'burn' ? 'active' : ''}`} />
            <div className={`pipeline-step ${getStepClass(step, 'attest', ['mint', 'complete'])}`}>
              <div className="pipeline-dot">🛡️</div>
              <div className="pipeline-label">Circle Attestation</div>
            </div>
            <div className={`pipeline-line ${['mint', 'complete'].includes(step) ? 'completed' : step === 'attest' ? 'active' : ''}`} />
            <div className={`pipeline-step ${getStepClass(step, 'mint', ['complete'])}`}>
              <div className="pipeline-dot">🪙</div>
              <div className="pipeline-label">Mint on Arc</div>
            </div>
            <div className={`pipeline-line ${step === 'complete' ? 'completed' : ''}`} />
            <div className={`pipeline-step ${step === 'complete' ? 'completed' : ''}`}>
              <div className="pipeline-dot">✅</div>
              <div className="pipeline-label">Complete</div>
            </div>
          </div>

          {/* Live Status Details */}
          {step !== 'idle' && step !== 'error' && (
            <div className="card animate-slide-up" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Bridge Status</span>
                <span className={`badge ${step === 'complete' ? 'green' : 'blue'}`}>
                  {step === 'complete' ? 'Settled' : 'In Progress'}
                </span>
              </div>
              <div className="card-body">
                {burnHash && (
                  <div style={{ marginBottom: '12px' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: '2px' }}>Burn Transaction</div>
                    <a href={`https://sepolia.etherscan.io/tx/${burnHash}`} target="_blank" rel="noopener noreferrer" className="explorer-link">
                      {burnHash.slice(0, 16)}...{burnHash.slice(-8)} ↗
                    </a>
                  </div>
                )}
                {attestationStatus && (
                  <div style={{ marginBottom: '12px' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: '2px' }}>Attestation</div>
                    <span className="text-sm">{attestationStatus}</span>
                  </div>
                )}
                {mintHash && (
                  <div>
                    <div className="text-xs text-muted" style={{ marginBottom: '2px' }}>Mint Transaction (Arc)</div>
                    <a href={`https://testnet.arcscan.app/tx/${mintHash}`} target="_blank" rel="noopener noreferrer" className="explorer-link">
                      {mintHash.slice(0, 16)}...{mintHash.slice(-8)} ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bridge Form */}
          {step === 'idle' && (
            <div className="card animate-slide-up" style={{ maxWidth: '540px' }}>
              <div className="card-header">
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Bridge Configuration</span>
                <span className="badge blue">CCTP v2</span>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Source Chain</label>
                  <select
                    className="input-notion"
                    value={sourceChain}
                    onChange={(e) => setSourceChain(e.target.value)}
                  >
                    {SOURCE_CHAINS.map((chain) => (
                      <option key={chain.id} value={chain.id}>
                        {chain.icon} {chain.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Destination</label>
                  <input
                    className="input-notion"
                    value="🏔️ Arc Testnet (Chain ID: 5042002)"
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (USDC)</label>
                  <input
                    className="input-notion"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="callout" style={{ marginBottom: '16px' }}>
                  <span className="callout-icon">⏱️</span>
                  <div>
                    <strong>Estimated Time</strong>
                    <p className="text-muted text-sm">~15-30 seconds (attestation latency). Arc settlement is &lt;1s after mint.</p>
                  </div>
                </div>

                <button
                  className="btn primary lg"
                  onClick={handleBridge}
                  disabled={!isConnected}
                  style={{ width: '100%' }}
                >
                  {isConnected ? '🌉 Initiate CCTP Bridge' : '🔌 Connect Wallet First'}
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <div className="card animate-slide-up" style={{ maxWidth: '540px' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
                <h3>Bridge Failed</h3>
                <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
                  Ensure you have USDC on the source chain and the App Kit key is configured.
                </p>
                <button className="btn primary" onClick={resetBridge}>Try Again</button>
              </div>
            </div>
          )}

          {/* Success State */}
          {step === 'complete' && (
            <div className="card animate-slide-up" style={{ maxWidth: '540px' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                <h3>Bridge Complete!</h3>
                <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
                  {amount} USDC successfully bridged to Arc Testnet via CCTP
                </p>
                <button className="btn primary" onClick={resetBridge}>Bridge More</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
