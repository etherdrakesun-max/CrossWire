'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from './components/Header'
import Footer from './components/Footer'
import { ArrowRight, CheckCircle2, Shield, Activity, Rows, Send, Layers, Coins, Terminal } from 'lucide-react'

interface LogEntry {
  time: string
  text: string
  status: 'info' | 'success' | 'warning'
}

export default function LandingPage() {
  // CCTP Simulation State
  const [simStep, setSimStep] = useState<number>(0)
  const [simLogs, setSimLogs] = useState<LogEntry[]>([
    { time: '00:00.00', text: 'Simulator ready. Click "Run CCTP Simulation" to begin.', status: 'info' }
  ])
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [waitlistEmail, setWaitlistEmail] = useState<string>('')
  const [waitlistSubmitted, setWaitlistSubmitted] = useState<boolean>(false)

  // Simulation Logic
  const runSimulation = () => {
    if (isSimulating) return
    setIsSimulating(true)
    setSimStep(1)
    
    const now = () => {
      const d = new Date()
      return `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(Math.floor(d.getMilliseconds() / 10)).padStart(2, '0')}`
    }

    setSimLogs([
      { time: now(), text: 'Starting cross-chain wire simulation...', status: 'info' },
      { time: now(), text: 'Parameters: $10,000 USDC | Source: Arbitrum Sepolia | Destination: Arc Testnet', status: 'info' },
      { time: now(), text: 'Initiating Circle CCTP transfer. Approving router...', status: 'info' },
    ])

    // Step 1: Burn
    setTimeout(() => {
      setSimStep(2)
      setSimLogs(prev => [
        ...prev,
        { time: now(), text: 'Burn transaction confirmed on Arbitrum Sepolia (Tx: 0x3a9f...b271)', status: 'success' },
        { time: now(), text: 'Waiting for Circle Attestation signatures...', status: 'warning' },
      ])
    }, 2000)

    // Step 2: Attestation
    setTimeout(() => {
      setSimStep(3)
      setSimLogs(prev => [
        ...prev,
        { time: now(), text: 'Circle Attestation received successfully!', status: 'success' },
        { time: now(), text: 'Submitting mint transaction on Arc Testnet...', status: 'info' },
      ])
    }, 4000)

    // Step 3: Mint & Settle
    setTimeout(() => {
      setSimStep(4)
      setSimLogs(prev => [
        ...prev,
        { time: now(), text: 'USDC Minted on Arc Testnet (Tx: 0x82d1...c99a)', status: 'success' },
        { time: now(), text: 'ISO 20022 wire metadata attached: Purpose Code [GDDS]', status: 'info' },
        { time: now(), text: 'Cross-border Wire Transfer Settled in 0.86 seconds! (Finality: Deterministic)', status: 'success' },
      ])
      setIsSimulating(false)
    }, 6000)
  }

  // Reset simulator
  const resetSimulation = () => {
    setSimStep(0)
    setSimLogs([{ time: '00:00.00', text: 'Simulator reset. Ready.', status: 'info' }])
    setIsSimulating(false)
  }

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault()
    if (!waitlistEmail) return
    setWaitlistSubmitted(true)
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="hero-wrapper">
          <div className="hero-glow" />
          <div className="hero-badge">
            <Activity size={12} strokeWidth={2} className="text-success animate-pulse" />
            Arc Testnet Active
          </div>
          <h1 className="hero-title">
            Professional Wire Transfers <br />
            Settled in Seconds.
          </h1>
          <p className="hero-subtitle">
            Replace SWIFT delays with stablecoin rails. High-value USDC cross-border settlement with sub-second deterministic finality, multi-sig compliance, and full on-chain audit trail on Arc.
          </p>
          <div className="hero-ctas">
            <Link href="/dashboard" className="btn primary">
              Try Live Demo <ArrowRight size={16} />
            </Link>
            <Link href="/docs" className="btn">
              Explore Docs
            </Link>
          </div>

          <div className="hero-preview">
            <div className="hero-preview-header">
              <div className="dot-red"></div>
              <div className="dot-yellow"></div>
              <div className="dot-green"></div>
              <span className="text-xs text-muted text-mono" style={{ marginLeft: '12px' }}>crosswire.router - CCTP Engine</span>
            </div>
            
            {/* Embedded Live Simulation visual */}
            <div className="simulator-container" style={{ border: 'none', background: 'transparent', margin: 0, padding: '24px 16px' }}>
              <div className="simulator-pipeline">
                <div 
                  className={`simulator-step ${simStep >= 1 ? 'active' : ''} ${simStep > 1 ? 'completed' : ''}`}
                  title="BURN: The smart contract on the source chain burns the specified USDC, locking the assets permanently and producing an on-chain event which Circle's network monitors."
                  style={{ cursor: 'help' }}
                >
                  <div className="simulator-dot"></div>
                  <span className="simulator-label">1. Burn</span>
                </div>
                <div className={`simulator-line ${simStep > 1 ? 'completed' : ''}`}></div>
                <div 
                  className={`simulator-step ${simStep >= 2 ? 'active' : ''} ${simStep > 2 ? 'completed' : ''}`}
                  title="ATTEST: Circle's off-chain attestation service monitors the source chain for Burn events, validates the transaction signature, and generates a cryptographic proof of the burn."
                  style={{ cursor: 'help' }}
                >
                  <div className="simulator-dot"></div>
                  <span className="simulator-label">2. Attest</span>
                </div>
                <div className={`simulator-line ${simStep > 2 ? 'completed' : ''}`}></div>
                <div 
                  className={`simulator-step ${simStep >= 3 ? 'active' : ''} ${simStep > 3 ? 'completed' : ''}`}
                  title="MINT: The cryptographic attestation is sent to the Arc blockchain router contract, which validates the signatures and mints fresh native USDC directly to the recipient address."
                  style={{ cursor: 'help' }}
                >
                  <div className="simulator-dot"></div>
                  <span className="simulator-label">3. Mint</span>
                </div>
                <div className={`simulator-line ${simStep > 3 ? 'completed' : ''}`}></div>
                <div 
                  className={`simulator-step ${simStep >= 4 ? 'active' : ''} ${simStep > 4 ? 'completed' : ''}`}
                  title="SETTLED: The wire is complete. Deterministic sub-second block finality on Arc seals the ledger entry permanently, carrying ISO 20022 compliance purpose codes on-chain."
                  style={{ cursor: 'help' }}
                >
                  <div className="simulator-dot"></div>
                  <span className="simulator-label">4. Settled</span>
                </div>
              </div>

              <div className="simulator-logs">
                {simLogs.map((log, index) => (
                  <div key={index} className="simulator-log-line">
                    <span className="log-time">[{log.time}]</span>
                    <span className={log.status === 'success' ? 'log-success' : log.status === 'warning' ? 'text-warning' : ''}>
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-between">
                <button 
                  onClick={runSimulation} 
                  disabled={isSimulating || simStep === 4}
                  className="btn primary text-sm"
                >
                  Run CCTP Simulation
                </button>
                {(simStep > 0 && !isSimulating) && (
                  <button onClick={resetSimulation} className="btn ghost text-sm">
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Partners */}
        <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '32px 24px', background: 'var(--surface)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
            <p className="text-xs text-muted" style={{ marginBottom: '20px', letterSpacing: '0.05em' }}>INTEGRATED PROTOCOLS & NETWORKS</p>
            <div className="flex justify-between items-center gap-4 flex-wrap" style={{ opacity: 0.7, padding: '0 20px' }}>
              <span className="text-mono font-semibold text-lg text-muted">Circle CCTP</span>
              <span className="text-mono font-semibold text-lg text-muted">Arc Chain</span>
              <span className="text-mono font-semibold text-lg text-muted">USDC</span>
              <span className="text-mono font-semibold text-lg text-muted">Arbitrum</span>
              <span className="text-mono font-semibold text-lg text-muted">Base</span>
              <span className="text-mono font-semibold text-lg text-muted">Wagmi</span>
            </div>
          </div>
        </section>

        {/* Problem vs Solution Comparison */}
        <section className="comparison-section">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '32px' }}>SWIFT Network vs. CrossWire Rails</h2>
            <p className="text-muted">Legacy cross-border systems cost too much and take days. We settle instantly.</p>
          </div>

          <table className="comp-table">
            <thead>
              <tr>
                <th>Parameters</th>
                <th>Traditional SWIFT</th>
                <th>CrossWire Protocol</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Settlement Speed</strong></td>
                <td className="text-muted">1 to 5 business days</td>
                <td className="text-success font-semibold">Sub-second deterministic finality (&lt;1s)</td>
              </tr>
              <tr>
                <td><strong>Intermediaries</strong></td>
                <td className="text-muted">3-5 correspondent banks</td>
                <td className="text-success font-semibold">Zero (Direct P2P smart contracts)</td>
              </tr>
              <tr>
                <td><strong>Transaction Fees</strong></td>
                <td className="text-muted">$30 - $50 flat fee + hidden FX markups</td>
                <td className="text-success font-semibold">Fraction of a cent (USDC native gas on Arc)</td>
              </tr>
              <tr>
                <td><strong>Compliance & Security</strong></td>
                <td className="text-muted">Manual, paperwork, delayed alerts</td>
                <td className="text-success font-semibold">On-chain Multi-sig (2-of-3) & Immutable Audit logs</td>
              </tr>
              <tr>
                <td><strong>Data Standard</strong></td>
                <td className="text-muted">SWIFT MT/MX messages</td>
                <td className="text-success font-semibold">ISO 20022 compliant purpose metadata</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Bento Grid: Core Features */}
        <section className="bento-wrapper" style={{ borderTop: '1px solid var(--border)', paddingTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '32px' }}>Designed for Enterprise Operations</h2>
            <p className="text-muted">The speed of stablecoins combined with professional wire transfer standards.</p>
          </div>

          <div className="bento-grid">
            <div className="bento-card col-span-2">
              <div className="bento-card-icon">
                <Rows size={32} strokeWidth={1.5} />
              </div>
              <h3>Batch Wire Transfers</h3>
              <p>Upload a standard CSV ledger containing up to 50 wires. CrossWire automatically checks addresses, parses SWIFT reference metadata, and completes all settlements in a single gas-efficient transaction block.</p>
            </div>

            <div className="bento-card">
              <div className="bento-card-icon">
                <Coins size={32} strokeWidth={1.5} />
              </div>
              <h3>Gasless with USDC</h3>
              <p>No need to hold volatile native tokens to pay network fees. The Arc blockchain leverages USDC gas precompiles, letting you settle wires using only your USDC balance.</p>
            </div>

            <div className="bento-card">
              <div className="bento-card-icon">
                <Shield size={32} strokeWidth={1.5} />
              </div>
              <h3>2-of-3 Multi-Sig Compliance</h3>
              <p>For transfers exceeding $10,000 USDC, on-chain compliance rules trigger automatically. Wires remain in pending approval until signatories execute the release.</p>
            </div>

            <div className="bento-card col-span-2">
              <div className="bento-card-icon">
                <Terminal size={32} strokeWidth={1.5} />
              </div>
              <h3>Developer-First Integration</h3>
              <p>Embed professional wire transfers into your backend systems. Our Router contract handles token burns, attestations, and mints using straightforward, single-function Solidity APIs.</p>
            </div>
          </div>
        </section>

        {/* Final CTA / Waitlist Section */}
        <section style={{ borderTop: '1px solid var(--border)', padding: '100px 24px', background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '36px', marginBottom: '16px' }}>Secure Your Waitlist Slot</h2>
            <p className="text-muted" style={{ marginBottom: '32px' }}>
              We are currently onboarding institutional partners and select fintech developers for our production release. Sign up to receive developer toolkits and early access codes.
            </p>

            {waitlistSubmitted ? (
              <div className="callout" style={{ borderColor: 'var(--success)', background: 'var(--success-bg)', justifyContent: 'center' }}>
                <CheckCircle2 className="text-success" size={20} />
                <strong className="text-success">Thank you! You have been added to the waitlist.</strong>
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="flex gap-2" style={{ maxWidth: '480px', margin: '0 auto' }}>
                <input 
                  type="email" 
                  placeholder="Enter your professional email address" 
                  className="input-notion" 
                  required
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                />
                <button type="submit" className="btn primary">Join Waitlist</button>
              </form>
            )}
            <p className="text-xs text-muted mt-4">No credit cards. Fully operated on Arc Testnet.</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
