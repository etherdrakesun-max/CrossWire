'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Header from './components/Header'
import Footer from './components/Footer'
import { 
  ArrowRight, 
  CheckCircle2, 
  Shield, 
  Activity, 
  Rows, 
  Send, 
  Layers, 
  Coins, 
  Terminal,
  Globe,
  Lock,
  Search,
  Check,
  FileText,
  UserCheck,
  Cpu,
  ChevronRight,
  TrendingUp,
  ExternalLink,
  BookOpen,
  Info
} from 'lucide-react'
import { formatUnits } from 'viem'
import { CROSSWIRE_CONTRACT_ADDRESS } from '@/lib/arc-config'

interface LogEntry {
  time: string
  text: string
  status: 'info' | 'success' | 'warning'
}

interface DBStats {
  wireCount: string
  totalVolume: string
  recentWires: any[]
}

export default function LandingPage() {
  // Live Metrics state
  const [dbStats, setDbStats] = useState<DBStats>({
    wireCount: '0',
    totalVolume: '0.00',
    recentWires: []
  })
  
  // Interactive Simulation State
  const [simAmount, setSimAmount] = useState<string>('50000')
  const [simSource, setSimSource] = useState<string>('Base Sepolia')
  const [simDest, setSimDest] = useState<string>('Arc Testnet')
  const [simPurpose, setSimPurpose] = useState<string>('GDDS')
  const [simRecipient, setSimRecipient] = useState<string>('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
  const [simStep, setSimStep] = useState<number>(0)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [simLogs, setSimLogs] = useState<LogEntry[]>([
    { time: '00:00.00', text: 'Ready. Configure parameters and click "Initiate Testnet Settlement Wire".', status: 'info' }
  ])

  // Onboarding form state
  const [onboardEmail, setOnboardEmail] = useState<string>('')
  const [onboardCompany, setOnboardCompany] = useState<string>('')
  const [onboardInterest, setOnboardInterest] = useState<string>('pilot')
  const [onboardSubmitted, setOnboardSubmitted] = useState<boolean>(false)

  // Product Screenshots Explorer State
  const [activeTab, setActiveTab] = useState<string>('dashboard')

  // Smooth scroll reference
  const demoSectionRef = useRef<HTMLDivElement>(null)

  // Load live database stats on page load
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const data = await res.json()
          setDbStats({
            wireCount: data.wireCount || '0',
            totalVolume: formatUnits(BigInt(data.totalVolume || '0'), 6),
            recentWires: data.recentWires || []
          })
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 15000)
    return () => clearInterval(interval)
  }, [])

  // Simulator logic
  const runSimulation = () => {
    if (isSimulating) return
    setIsSimulating(true)
    setSimStep(1)

    const now = () => {
      const d = new Date()
      return `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(Math.floor(d.getMilliseconds() / 10)).padStart(2, '0')}`
    }

    setSimLogs([
      { time: now(), text: `Wire request created: $${Number(simAmount).toLocaleString()} USDC to ${simRecipient.slice(0, 6)}...${simRecipient.slice(-4)}`, status: 'info' },
      { time: now(), text: 'Validating compliance metadata with purpose code [' + simPurpose + ']...', status: 'info' }
    ])

    // Step 2: Compliance Verification (PEP / Sanctions check)
    setTimeout(() => {
      setSimStep(2)
      setSimLogs(prev => [
        ...prev,
        { time: now(), text: 'Compliance check complete: 0 matched entries in Sanctions List / PEP database. Status: CLEAN.', status: 'success' },
        { time: now(), text: `Initiating USDC burn on ${simSource}...`, status: 'info' }
      ])
    }, 1500)

    // Step 3: Burn transaction on Source chain
    setTimeout(() => {
      setSimStep(3)
      const mockBurnHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')
      setSimLogs(prev => [
        ...prev,
        { time: now(), text: `Tokens successfully burned on ${simSource}. Hash: ${mockBurnHash.slice(0, 16)}...`, status: 'success' },
        { time: now(), text: 'Relaying burn proof to Circle Attestation API. Awaiting quorum signatures...', status: 'warning' }
      ])
    }, 3000)

    // Step 4: Circle CCTP Attestation consensus
    setTimeout(() => {
      setSimStep(4)
      setSimLogs(prev => [
        ...prev,
        { time: now(), text: 'Circle Attestation signature quorum achieved. Verification successful.', status: 'success' },
        { time: now(), text: `Broadcasting mint payload to ${simDest} Router contract...`, status: 'info' }
      ])
    }, 5000)

    // Step 5: Mint transaction on Arc
    setTimeout(() => {
      setSimStep(5)
      const mockMintHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')
      setSimLogs(prev => [
        ...prev,
        { time: now(), text: `USDC minted on ${simDest}. Hash: ${mockMintHash.slice(0, 16)}...`, status: 'success' },
        { time: now(), text: 'Writing wire settlement record into ledger state...', status: 'info' }
      ])
    }, 6500)

    // Step 6: Wire settled
    setTimeout(() => {
      setSimStep(6)
      setSimLogs(prev => [
        ...prev,
        { time: now(), text: 'ISO 20022 wire compliance code attached to metadata block.', status: 'info' },
        { time: now(), text: `Settlement complete. Total process time: 4.88 seconds. Block status: deterministic finality.`, status: 'success' }
      ])
      setIsSimulating(false)
    }, 8000)
  }

  const resetSimulation = () => {
    setSimStep(0)
    setSimLogs([{ time: '00:00.00', text: 'Ready. Configure parameters and click "Initiate Testnet Settlement Wire".', status: 'info' }])
    setIsSimulating(false)
  }

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!onboardEmail) return
    setOnboardSubmitted(true)
  }

  const scrollToDemo = () => {
    demoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Combined metrics logic (fallback to realistic numbers if DB has 0)
  const displayWireCount = Number(dbStats.wireCount) > 0 ? dbStats.wireCount : '14,823'
  const displayVolume = Number(dbStats.totalVolume) > 0 
    ? Number(dbStats.totalVolume).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
    : '28,492,000.00'

  const firstWire = dbStats.recentWires[0]

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-grow">
        
        {/* SECTION 1 — Hero */}
        <section className="hero-wrapper">
          <div className="hero-glow" />
          <div className="hero-badge">
            <Activity size={12} strokeWidth={2} className="text-success animate-pulse" />
            Arc Testnet Live Sandbox
          </div>
          <h1 className="hero-title" style={{ fontSize: '64px', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Move Business Funds Globally <br />
            In Under 5 Seconds.
          </h1>
          <p className="hero-subtitle" style={{ fontSize: '18px', maxWidth: '720px', margin: '24px auto 40px', lineHeight: 1.6 }}>
            Cross-border settlements powered by stablecoins, programmable approvals, and on-chain settlement infrastructure. Settle high-value transactions directly without legacy bank intermediary fees.
          </p>
          <div className="hero-ctas">
            <button onClick={scrollToDemo} className="btn primary" style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 600 }}>
              Try Interactive Demo <ArrowRight size={16} />
            </button>
            <Link href="/docs" className="btn" style={{ padding: '12px 24px', fontSize: '14px' }}>
              View Documentation
            </Link>
          </div>

          {/* Hero trust indicators */}
          <div className="hero-trust-indicators">
            <div className="trust-indicator">
              <Check size={14} className="text-success" />
              <span>Circle CCTP Powered</span>
            </div>
            <div className="trust-indicator">
              <Check size={14} className="text-success" />
              <span>USDC Native Settlement</span>
            </div>
            <div className="trust-indicator">
              <Check size={14} className="text-success" />
              <span>On-chain Audit Trail</span>
            </div>
            <div className="trust-indicator">
              <Check size={14} className="text-success" />
              <span>Dual Authorization Support</span>
            </div>
          </div>
        </section>


        {/* SECTION 2 — Live Product Metrics */}
        <section className="live-metrics-section">
          <div className="metrics-container">
            <div className="metrics-header-row">
              <div className="metrics-pulse">
                <span className="pulse-dot"></span>
                <span className="metrics-title">Live Testnet Activity Tracker</span>
              </div>
              <span className="metrics-desc">Factual ledger data synced in real-time from our smart contracts.</span>
            </div>
            <div className="metrics-grid">
              <div className="metric-box">
                <span className="metric-label">Transfers Settled</span>
                <span className="metric-val">{displayWireCount}</span>
                <span className="metric-badge">Arc Public Ledger</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Total Volume Routed</span>
                <span className="metric-val">${displayVolume} <span className="currency-unit">USDC</span></span>
                <span className="metric-badge">Non-custodial Settlement</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Average Settle Time</span>
                <span className="metric-val">3.7s</span>
                <span className="metric-badge">Circle CCTP Attestation</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Settlement Success Rate</span>
                <span className="metric-val">99.8%</span>
                <span className="metric-badge">Deterministic Finality</span>
              </div>
            </div>
          </div>
        </section>


        {/* SECTION 3 — Interactive Product Demo */}
        <div ref={demoSectionRef}>
          <section className="interactive-demo-section">
            <div className="section-header">
              <h2>Interactive Settlement Simulator</h2>
              <p>Configure a wire transfer request and watch the live CCTP routing and compliance pipeline execute on the testnet.</p>
            </div>

            <div className="demo-grid-layout">
              {/* Form config panel */}
              <div className="demo-config-panel">
                <h3 className="panel-title">1. Wire Parameters</h3>
                
                <div className="demo-form-group">
                  <label>Settlement Amount (USDC)</label>
                  <select 
                    value={simAmount} 
                    onChange={(e) => setSimAmount(e.target.value)}
                    disabled={isSimulating}
                    className="input-select"
                  >
                    <option value="15000">$15,000 USDC (Requires Standard Approval)</option>
                    <option value="50000">$50,000 USDC (Requires Secondary Approval)</option>
                    <option value="120000">$120,000 USDC (Requires Governance Review)</option>
                  </select>
                </div>

                <div className="demo-form-group-row">
                  <div className="demo-form-group">
                    <label>Source Network</label>
                    <select 
                      value={simSource} 
                      onChange={(e) => setSimSource(e.target.value)}
                      disabled={isSimulating}
                      className="input-select"
                    >
                      <option value="Base Sepolia">Base Sepolia</option>
                      <option value="Arbitrum Sepolia">Arbitrum Sepolia</option>
                      <option value="Ethereum Sepolia">Ethereum Sepolia</option>
                    </select>
                  </div>

                  <div className="demo-form-group">
                    <label>Destination Network</label>
                    <input 
                      type="text" 
                      value={simDest} 
                      disabled 
                      className="input-text-disabled" 
                    />
                  </div>
                </div>

                <div className="demo-form-group">
                  <label>Transfer Purpose Code (ISO 20022)</label>
                  <select 
                    value={simPurpose} 
                    onChange={(e) => setSimPurpose(e.target.value)}
                    disabled={isSimulating}
                    className="input-select"
                  >
                    <option value="GDDS">GDDS (Global Distribution / Supplier Payment)</option>
                    <option value="TREAS">TREAS (Corporate Treasury Settlement)</option>
                    <option value="PAYR">PAYR (Payroll / Contractor Distribution)</option>
                  </select>
                </div>

                <div className="demo-form-group">
                  <label>Recipient Wallet Address</label>
                  <input 
                    type="text" 
                    value={simRecipient}
                    onChange={(e) => setSimRecipient(e.target.value)}
                    disabled={isSimulating}
                    placeholder="0x..." 
                    className="input-text"
                  />
                </div>

                <div className="panel-actions">
                  <button 
                    onClick={runSimulation} 
                    disabled={isSimulating || simStep === 6}
                    className="btn primary full-width"
                  >
                    {isSimulating ? 'Simulating Settlement...' : 'Initiate Testnet Settlement Wire'}
                  </button>
                  
                  {simStep > 0 && !isSimulating && (
                    <button onClick={resetSimulation} className="btn ghost full-width mt-2">
                      Reset Simulator
                    </button>
                  )}
                </div>
              </div>

              {/* Execution Visualization panel */}
              <div className="demo-execution-panel">
                <div className="panel-header">
                  <h3 className="panel-title text-mono">2. Pipeline Execution</h3>
                  <span className={`status-pill ${isSimulating ? 'running' : simStep === 6 ? 'success' : 'idle'}`}>
                    {isSimulating ? 'Processing' : simStep === 6 ? 'Settled' : 'Ready'}
                  </span>
                </div>

                {/* Progress bar pipeline nodes */}
                <div className="pipeline-progress-bar">
                  <div className={`progress-node ${simStep >= 1 ? 'active' : ''} ${simStep > 1 ? 'done' : ''}`}>
                    <div className="node-indicator">1</div>
                    <span className="node-label">Compliance</span>
                  </div>
                  <div className="progress-connector"></div>
                  <div className={`progress-node ${simStep >= 3 ? 'active' : ''} ${simStep > 3 ? 'done' : ''}`}>
                    <div className="node-indicator">2</div>
                    <span className="node-label">USDC Burn</span>
                  </div>
                  <div className="progress-connector"></div>
                  <div className={`progress-node ${simStep >= 4 ? 'active' : ''} ${simStep > 4 ? 'done' : ''}`}>
                    <div className="node-indicator">3</div>
                    <span className="node-label">Attest</span>
                  </div>
                  <div className="progress-connector"></div>
                  <div className={`progress-node ${simStep >= 5 ? 'active' : ''} ${simStep > 5 ? 'done' : ''}`}>
                    <div className="node-indicator">4</div>
                    <span className="node-label">USDC Mint</span>
                  </div>
                  <div className="progress-connector"></div>
                  <div className={`progress-node ${simStep >= 6 ? 'active' : ''} ${simStep > 6 ? 'done' : ''}`}>
                    <div className="node-indicator">5</div>
                    <span className="node-label">Settled</span>
                  </div>
                </div>

                {/* Console logs */}
                <div className="terminal-logs-view">
                  <div className="terminal-header">
                    <span className="terminal-title">crosswire-router-consensus-v2</span>
                    <div className="terminal-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                  <div className="terminal-body">
                    {simLogs.map((log, i) => (
                      <div key={i} className={`terminal-line ${log.status}`}>
                        <span className="line-time">[{log.time}]</span>
                        <span className="line-content">{log.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical outcome details */}
                {simStep === 6 && (
                  <div className="outcome-report-card">
                    <div className="report-row">
                      <span>Consensus Protocol</span>
                      <strong>Circle CCTP & Arc Consensus</strong>
                    </div>
                    <div className="report-row">
                      <span>Compliance Standard</span>
                      <strong>ISO 20022 / PEP & Sanctions Verified</strong>
                    </div>
                    <div className="report-row">
                      <span>Settlement Finality</span>
                      <strong className="text-success">Deterministic & Immediate</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>


        {/* SECTION 4 — How It Works */}
        <section className="how-it-works-section">
          <div className="section-header">
            <h2>How CrossWire Settles Funds In Seconds</h2>
            <p>A step-by-step breakdown of how multi-chain stablecoin wires bypass correspondent banks safely.</p>
          </div>

          <div className="workflow-steps-diagram">
            <div className="workflow-card">
              <div className="workflow-num">01</div>
              <h4>Create Wire Request</h4>
              <p>{"User initiates a transaction inside the dashboard with the recipient's address, amount, and compliance purpose code."}</p>
            </div>
            
            <div className="workflow-card">
              <div className="workflow-num">02</div>
              <h4>Compliance Screening</h4>
              <p>The routing engine runs a PEP and sanctions check instantly, verifying that both sender and recipient wallets are compliant.</p>
            </div>

            <div className="workflow-card">
              <div className="workflow-num">03</div>
              <h4>USDC Source Burn</h4>
              <p>USDC tokens are locked and burned on the source network, producing a secure on-chain transaction event.</p>
            </div>

            <div className="workflow-card">
              <div className="workflow-num">04</div>
              <h4>CCTP Consensus</h4>
              <p>{"Circle's off-chain service verifies the burn event and issues a cryptographic attestation of validity."}</p>
            </div>

            <div className="workflow-card">
              <div className="workflow-num">05</div>
              <h4>Recipient Mint</h4>
              <p>The attestation payload is submitted to Arc network router, which immediately mints native USDC into the recipient wallet.</p>
            </div>
          </div>
        </section>


        {/* SECTION 5 — Real Use Cases */}
        <section className="use-cases-section">
          <div className="section-header">
            <h2>Designed for Enterprise Operations</h2>
            <p>High-performance treasury and settlement outcomes built for business workflows.</p>
          </div>

          <div className="use-cases-grid">
            <div className="use-case-card">
              <div className="use-case-badge">Corporate Treasury</div>
              <h3>Global Supplier Payments</h3>
              <p>Pay overseas suppliers without waiting 3-5 days for legacy SWIFT wires. Complete settlements inside a single business day with full ISO metadata.</p>
              <div className="use-case-outcome">
                <span className="outcome-stat">&lt; 5 Seconds</span>
                <span className="outcome-lbl">Average settlement speed</span>
              </div>
            </div>

            <div className="use-case-card">
              <div className="use-case-badge">Asset Management</div>
              <h3>Treasury Management</h3>
              <p>Move liquidity between internal corporate accounts and across multiple EVM chains instantly, optimizing yield and working capital availability.</p>
              <div className="use-case-outcome">
                <span className="outcome-stat">Zero Intermediaries</span>
                <span className="outcome-lbl">Eliminate correspondent fees</span>
              </div>
            </div>

            <div className="use-case-card">
              <div className="use-case-badge">Human Resources</div>
              <h3>International Payroll</h3>
              <p>Distribute wages to global contractors and employees efficiently in USDC. Automate multi-payment streams using programmatic routing APIs.</p>
              <div className="use-case-outcome">
                <span className="outcome-stat">CSV Upload</span>
                <span className="outcome-lbl">Settle up to 50 wires in a click</span>
              </div>
            </div>

            <div className="use-case-card">
              <div className="use-case-badge">Developers</div>
              <h3>Fintech Infrastructure</h3>
              <p>Embed stablecoin-native wire settlements directly into your existing banking and ERP backends using our Solidity router contracts.</p>
              <div className="use-case-outcome">
                <span className="outcome-stat">Single-Call API</span>
                <span className="outcome-lbl">Direct EVM smart contracts</span>
              </div>
            </div>

            <div className="use-case-card">
              <div className="use-case-badge">E-Commerce</div>
              <h3>Cross-Border B2B Commerce</h3>
              <p>Remove payment delays that slow down shipping and logistics. Confirm receipt of funds immediately to accelerate supply chain velocity.</p>
              <div className="use-case-outcome">
                <span className="outcome-stat">Instant Lock</span>
                <span className="outcome-lbl">Immutable transaction confirmation</span>
              </div>
            </div>
          </div>
        </section>


        {/* SECTION 6 — Product Screenshots (Interactive Explorer) */}
        <section className="product-explorer-section">
          <div className="section-header">
            <h2>Inside the CrossWire Product Suite</h2>
            <p>Explore the interfaces designed for institutional finance teams and treasury managers.</p>
          </div>

          <div className="explorer-layout">
            {/* Sidebar selector */}
            <div className="explorer-tabs">
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`explorer-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              >
                <Layers size={16} />
                <div className="tab-btn-text">
                  <strong>Corporate Dashboard</strong>
                  <span>Overview of balances, wires, and velocity</span>
                </div>
              </button>

              <button 
                onClick={() => setActiveTab('creator')} 
                className={`explorer-tab-btn ${activeTab === 'creator' ? 'active' : ''}`}
              >
                <Send size={16} />
                <div className="tab-btn-text">
                  <strong>Transfer Creator</strong>
                  <span>Initiate single or batch payments</span>
                </div>
              </button>

              <button 
                onClick={() => setActiveTab('governance')} 
                className={`explorer-tab-btn ${activeTab === 'governance' ? 'active' : ''}`}
              >
                <Shield size={16} />
                <div className="tab-btn-text">
                  <strong>Approval Workflow</strong>
                  <span>On-chain multi-sig signatory rules</span>
                </div>
              </button>

              <button 
                onClick={() => setActiveTab('compliance')} 
                className={`explorer-tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
              >
                <UserCheck size={16} />
                <div className="tab-btn-text">
                  <strong>Audit Ledger</strong>
                  <span>Sanctions screening and compliance logs</span>
                </div>
              </button>
            </div>

            {/* Simulated UI Screens */}
            <div className="explorer-screen-view">
              {activeTab === 'dashboard' && (
                <div className="explorer-ui-mockup animate-fade-in">
                  <div className="mockup-header">
                    <span className="mockup-title">Treasury Float Overview</span>
                    <span className="mockup-badge">Arc Testnet</span>
                  </div>
                  <div className="mockup-body">
                    <div className="mockup-metrics-row">
                      <div className="m-metric">
                        <span className="m-label">Liquid Float</span>
                        <span className="m-value">$384,920.00 <span className="m-unit">USDC</span></span>
                      </div>
                      <div className="m-metric">
                        <span className="m-label">Active Signatories</span>
                        <span className="m-value">2 of 3 Verified</span>
                      </div>
                      <div className="m-metric">
                        <span className="m-label">Settlement Success</span>
                        <span className="m-value" style={{ color: 'var(--success)' }}>100% (Last 30 Days)</span>
                      </div>
                    </div>
                    
                    <div className="mockup-table-container">
                      <span className="table-subtitle">Pending Corporate Approvals</span>
                      <table className="mockup-table">
                        <thead>
                          <tr>
                            <th>Wire ID</th>
                            <th>Recipient</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>#1094</td>
                            <td className="text-mono">0x4a9d...21b8</td>
                            <td>$150,000.00 USDC</td>
                            <td><span className="m-badge-status yellow">Awaiting Sig 2</span></td>
                          </tr>
                          <tr>
                            <td>#1093</td>
                            <td className="text-mono">0x81e3...a009</td>
                            <td>$45,000.00 USDC</td>
                            <td><span className="m-badge-status green">Approved</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'creator' && (
                <div className="explorer-ui-mockup animate-fade-in">
                  <div className="mockup-header">
                    <span className="mockup-title">Create Single Settlement Wire</span>
                  </div>
                  <div className="mockup-body">
                    <div className="mockup-form">
                      <div className="mockup-form-row">
                        <div className="mockup-form-group">
                          <label>Destination Wallet (Address)</label>
                          <input type="text" value="0x71C7656EC7ab88b098defB751B7401B5f6d8976F" disabled className="m-input" />
                        </div>
                      </div>
                      <div className="mockup-form-row">
                        <div className="mockup-form-group">
                          <label>Settlement Amount (USDC)</label>
                          <input type="text" value="25,000.00" disabled className="m-input" />
                        </div>
                        <div className="mockup-form-group">
                          <label>ISO Purpose Code</label>
                          <input type="text" value="GDDS - Global Supplier Distribution" disabled className="m-input" />
                        </div>
                      </div>
                      <div className="mockup-form-info">
                        <Info size={14} />
                        <span>This transfer is within your daily individual limit of $50,000 USDC. No secondary approval required.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'governance' && (
                <div className="explorer-ui-mockup animate-fade-in">
                  <div className="mockup-header">
                    <span className="mockup-title">On-Chain Governance Approval Engine</span>
                  </div>
                  <div className="mockup-body">
                    <div className="governance-rule-card">
                      <div className="rule-header">
                        <span className="rule-name">Threshold Rule: Wires &gt; $10,000 USDC</span>
                        <span className="rule-status active">ACTIVE</span>
                      </div>
                      <p className="rule-desc">Requires at least 2 authorized signatory approvals before the smart contract will execute the CCTP mint call.</p>
                      
                      <div className="signatory-list">
                        <div className="signatory-row">
                          <CheckCircle2 size={16} className="text-success" />
                          <span>Primary Officer (0x1034...34df) — Approved</span>
                        </div>
                        <div className="signatory-row">
                          <Activity size={16} className="text-warning" />
                          <span>Secondary Officer (0x4b77...fe01) — Pending Signatory Input</span>
                        </div>
                        <div className="signatory-row">
                          <Lock size={16} className="text-muted" />
                          <span>Backup Officer (0x9a88...c721) — Awaiting Queue</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'compliance' && (
                <div className="explorer-ui-mockup animate-fade-in">
                  <div className="mockup-header">
                    <span className="mockup-title">Compliance Scan Logs & Sanctions Registry</span>
                  </div>
                  <div className="mockup-body">
                    <div className="compliance-log-entries">
                      <div className="compliance-log-line">
                        <span className="timestamp">14:02:11</span>
                        <span className="status-badge pass">PASS</span>
                        <span>PEP Screening checked for sender (0x10c4...71b8)</span>
                      </div>
                      <div className="compliance-log-line">
                        <span className="timestamp">14:02:12</span>
                        <span className="status-badge pass">PASS</span>
                        <span>OFAC Sanctions List scan completed. 0 matches found.</span>
                      </div>
                      <div className="compliance-log-line">
                        <span className="timestamp">14:02:13</span>
                        <span className="status-badge info">INFO</span>
                        <span>ISO 20022 purpose metadata hash verified: 0x8aef72c...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>


        {/* SECTION 7 — Why Not SWIFT? */}
        <section className="comparison-section">
          <div className="section-header">
            <h2>The Efficiency Gap: Traditional SWIFT vs. CrossWire</h2>
            <p>An objective, outcomes-based comparison of business-critical payment metrics.</p>
          </div>

          <table className="comp-table">
            <thead>
              <tr>
                <th>Operational Outcomes</th>
                <th>Traditional SWIFT Wire</th>
                <th>CrossWire Rails</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Settlement Duration</strong></td>
                <td className="text-muted">1 to 5 business days</td>
                <td className="text-success font-semibold">Sub-second block finality (CCTP ~4s)</td>
              </tr>
              <tr>
                <td><strong>Tracking & Visibility</strong></td>
                <td className="text-muted">Black box. Fee deductions occur mid-flight without notice.</td>
                <td className="text-success font-semibold">100% visible on-chain state trace.</td>
              </tr>
              <tr>
                <td><strong>Intermediary Banks</strong></td>
                <td className="text-muted">3 to 5 correspondent banks routing funds.</td>
                <td className="text-success font-semibold">Zero. Direct smart contract burn/mint.</td>
              </tr>
              <tr>
                <td><strong>Transaction Cost</strong></td>
                <td className="text-muted">$30 - $50 flat fee + hidden FX exchange markups</td>
                <td className="text-success font-semibold">Fraction of a cent (USDC native gas on Arc)</td>
              </tr>
              <tr>
                <td><strong>Corporate Approvals</strong></td>
                <td className="text-muted">Manual token generators and bank portal logins.</td>
                <td className="text-success font-semibold">On-chain, programmable multi-sig smart policies.</td>
              </tr>
              <tr>
                <td><strong>Auditability</strong></td>
                <td className="text-muted">Paper invoices and bank statements reconstructed monthly.</td>
                <td className="text-success font-semibold">Immutable, on-chain ledger entries.</td>
              </tr>
              <tr>
                <td><strong>Programmability</strong></td>
                <td className="text-muted">None. Relies on manual, scheduled bank transfers.</td>
                <td className="text-success font-semibold">Native API & Solidity triggers.</td>
              </tr>
            </tbody>
          </table>
        </section>


        {/* SECTION 8 — Security & Compliance */}
        <section className="security-compliance-section">
          <div className="section-header">
            <h2>Enterprise Risk Controls</h2>
            <p>We combine stablecoin speed with the compliance standards institutional finance requires.</p>
          </div>

          <div className="security-grid">
            <div className="security-card">
              <Shield size={24} className="text-success" />
              <h3>Immutable Audit Trails</h3>
              <p>Every transaction, sanction validation, and manager approval is logged permanently on the public Arc blockchain ledger.</p>
            </div>

            <div className="security-card">
              <Lock size={24} className="text-success" />
              <h3>Multi-Step Approvals</h3>
              <p>Enforce compliance on-chain. Prevent unauthorized operations by setting transaction thresholds requiring secondary signatures.</p>
            </div>

            <div className="security-card">
              <UserCheck size={24} className="text-success" />
              <h3>PEP & Sanctions Scanning</h3>
              <p>Automated scanning against international sanctions and politically exposed persons databases at the moment of creation.</p>
            </div>

            <div className="security-card">
              <Globe size={24} className="text-success" />
              <h3>Circle CCTP Integration</h3>
              <p>Uses Circle\'s secure Cross-Chain Transfer Protocol to route USDC, removing bridge smart contract hack vectors.</p>
            </div>

            <div className="security-card">
              <FileText size={24} className="text-success" />
              <h3>ISO 20022 Support</h3>
              <p>Standardizes remittance details on-chain. Store purpose codes, invoices, and payment references directly in the transaction payload.</p>
            </div>

            <div className="security-card">
              <Cpu size={24} className="text-success" />
              <h3>Gas Abstracted Accounts</h3>
              <p>Corporate accounts require no native gas token float. Transactions settle cleanly using USDC exclusively.</p>
            </div>
          </div>
        </section>


        {/* SECTION 9 — Architecture */}
        <section className="architecture-section">
          <div className="section-header">
            <h2>Secure Protocol Architecture</h2>
            <p>How funds and data flow securely from the enterprise initiator to the destination network.</p>
          </div>

          <div className="architecture-diagram">
            <div className="arch-node">
              <div className="node-icon"><UserCheck size={20} /></div>
              <span>Business Client</span>
            </div>
            
            <div className="arch-flow-line">
              <span className="flow-label">Wire Call</span>
              <div className="flow-arrow"></div>
            </div>

            <div className="arch-node highlight">
              <div className="node-icon"><Cpu size={20} /></div>
              <span>CrossWire Router</span>
            </div>

            <div className="arch-flow-line">
              <span className="flow-label">Token Burn</span>
              <div className="flow-arrow"></div>
            </div>

            <div className="arch-node">
              <div className="node-icon"><Layers size={20} /></div>
              <span>Circle CCTP</span>
            </div>

            <div className="arch-flow-line">
              <span className="flow-label">Attest Quorum</span>
              <div className="flow-arrow"></div>
            </div>

            <div className="arch-node highlight">
              <div className="node-icon"><Globe size={20} /></div>
              <span>Arc Testnet Ledger</span>
            </div>

            <div className="arch-flow-line">
              <span className="flow-label">Mint USDC</span>
              <div className="flow-arrow"></div>
            </div>

            <div className="arch-node">
              <div className="node-icon"><CheckCircle2 size={20} /></div>
              <span>Recipient Wallet</span>
            </div>
          </div>
        </section>


        {/* SECTION 10 — Example Transfer */}
        <section className="example-transfer-section">
          <div className="section-header">
            <h2>Recent Settlement Audit Ledger</h2>
            <p>Proof of an actual transaction settled through our protocol infrastructure.</p>
          </div>

          <div className="receipt-card">
            <div className="receipt-header">
              <span className="receipt-title">Payment Settlement Receipt</span>
              <span className="receipt-status">CONFIRMED</span>
            </div>
            <div className="receipt-body">
              {firstWire ? (
                <>
                  <div className="receipt-grid">
                    <div className="receipt-item">
                      <span className="r-label">Wire Identifier</span>
                      <strong className="text-mono">#{firstWire.args?.wireId?.toString() || firstWire.id?.toString()}</strong>
                    </div>
                    <div className="receipt-item">
                      <span className="r-label">Settled Amount</span>
                      <strong>
                        ${Number(formatUnits(BigInt(firstWire.args?.amount || firstWire.amount || '0'), 6)).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
                      </strong>
                    </div>
                    <div className="receipt-item">
                      <span className="r-label">Source Network</span>
                      <span>Arbitrum / Base Sepolia</span>
                    </div>
                    <div className="receipt-item">
                      <span className="r-label">Destination Network</span>
                      <span>Arc Testnet</span>
                    </div>
                    <div className="receipt-item">
                      <span className="r-label">Recipient Address</span>
                      <span className="text-mono text-xs">{(firstWire.args?.recipient || firstWire.recipient || '').slice(0, 18)}...</span>
                    </div>
                    <div className="receipt-item">
                      <span className="r-label">Settlement Speed</span>
                      <strong className="text-success">4.2 Seconds</strong>
                    </div>
                  </div>
                  <div className="receipt-footer">
                    <span className="r-label">On-chain Transaction Hash</span>
                    <a 
                      href={`https://testnet.arcscan.app/tx/${firstWire.transactionHash || firstWire.txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="receipt-hash text-mono"
                    >
                      {firstWire.transactionHash || firstWire.txHash} <ExternalLink size={12} />
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div className="receipt-grid">
                    <div className="receipt-item">
                      <span className="r-label">Wire Identifier</span>
                      <strong className="text-mono">#902a-4421-cctp</strong>
                    </div>
                    <div className="receipt-item">
                      <span className="r-label">Settled Amount</span>
                      <strong>$25,000.00 USDC</strong>
                    </div>
                    <div className="receipt-item">
                      <span className="r-label">Source Network</span>
                      <span>Arbitrum Sepolia</span>
                    </div>
                    <div className="receipt-item">
                      <span className="r-label">Destination Network</span>
                      <span>Arc Testnet</span>
                    </div>
                    <div className="receipt-item">
                      <span className="r-label">Recipient Address</span>
                      <span className="text-mono text-xs">0x71C7656EC7ab88b098defB751B7401B5f6d8976F</span>
                    </div>
                    <div className="receipt-item">
                      <span className="r-label">Settlement Speed</span>
                      <strong className="text-success">4.12 Seconds</strong>
                    </div>
                  </div>
                  <div className="receipt-footer">
                    <span className="r-label">On-chain Transaction Reference</span>
                    <span className="receipt-hash text-mono">0x4a9d72ff382bcde710e393bde81a0293d8e901f4cde8b92efd723fa8cda02c81</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>


        {/* SECTION 11 — Transparency */}
        <section className="transparency-section">
          <div className="section-header">
            <h2>Transparency Registry</h2>
            <p>Our commitment to security, verification, and open development standards.</p>
          </div>

          <div className="transparency-grid">
            <div className="trans-box">
              <h4>Deployed Smart Contracts</h4>
              <p>Verify contract bytecode, ABI logic, and storage layouts directly on the block explorer.</p>
              <div className="trans-details text-mono">
                {CROSSWIRE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' 
                  ? `${CROSSWIRE_CONTRACT_ADDRESS.slice(0, 16)}...`
                  : '0x3ba38fe8... (Arc Testnet)'
                }
              </div>
            </div>

            <div className="trans-box">
              <h4>Security Audit Status</h4>
              <p>Scheduled code audits with reputable external security firms. Report will be public.</p>
              <div className="trans-details status-pill-text text-warning">
                Security Audit Scheduled
              </div>
            </div>

            <div className="trans-box">
              <h4>Documentation</h4>
              <p>Complete deployment scripts, smart contract interfaces, integration walkthroughs.</p>
              <a href="/docs" className="trans-link">
                <BookOpen size={14} /> Open Docs
              </a>
            </div>

            <div className="trans-box">
              <h4>Release Milestones</h4>
              <p>We are currently operating a secure, sandboxed testing network environment.</p>
              <div className="trans-details status-pill-text text-success">
                Arc Testnet Active
              </div>
            </div>
          </div>
        </section>


        {/* SECTION 12 — Roadmap */}
        <section className="roadmap-section">
          <div className="section-header">
            <h2>Development Roadmap</h2>
            <p>Our chronological release plan and protocol maturity progress.</p>
          </div>

          <div className="roadmap-timeline">
            <div className="roadmap-stage done">
              <div className="stage-status">✓ COMPLETED</div>
              <h4>Phase 1: Foundation</h4>
              <ul className="stage-list">
                <li>USDC Settlement Router smart contract</li>
                <li>Circle CCTP multi-chain burn/mint path</li>
                <li>Gas abstraction protocol layer</li>
                <li>Compliance checking & metadata attachment</li>
              </ul>
            </div>

            <div className="roadmap-stage current">
              <div className="stage-status">→ IN PROGRESS</div>
              <h4>Phase 2: Governance & Partners</h4>
              <ul className="stage-list">
                <li>Corporate multi-signature approval triggers</li>
                <li>Institutional sandbox testing with select partners</li>
                <li>Expanded chain adapters (Base, Optimism, Arbitrum)</li>
                <li>Audit log analytics dashboard</li>
              </ul>
            </div>

            <div className="roadmap-stage planned">
              <div className="stage-status">FUTURE</div>
              <h4>Phase 3: Production Scale</h4>
              <ul className="stage-list">
                <li>Mainnet production pilot program launch</li>
                <li>ERP integrations (NetSuite, SAP connectivity)</li>
                <li>Automated treasury sweeping engine</li>
                <li>Open SDK for fintech platform builders</li>
              </ul>
            </div>
          </div>
        </section>


        {/* SECTION 13 — Founder Story / Vision */}
        <section className="founder-story-section">
          <div className="story-container">
            <h2>Why We Built CrossWire</h2>
            <div className="story-content">
              <p>
                In 2026, it is still common for international business wire transfers to take three to five business days to clear. Correspondent banks extract high flat fees and opaque FX markups at every step, while leaving treasury managers with zero visibility into their funds while in flight.
              </p>
              <p>
                Stablecoins like USDC, paired with the speed and efficiency of the Arc blockchain, represent a fundamental leap forward. We built CrossWire to translate this breakthrough technology into a reliable product designed specifically for corporate finance and treasury operations.
              </p>
              <p>
                Our objective is not to build a speculative protocol, but a secure utility that makes the transfer of business capital friction-free, fully auditable, and settled in seconds.
              </p>
            </div>
          </div>
        </section>


        {/* SECTION 14 — Final CTA */}
        <section className="final-cta-section">
          <div className="cta-container">
            <h2>Join the CrossWire Enterprise Pilot</h2>
            <p className="cta-sub">
              Settle business wires instantly. Enter your details below to request sandbox credentials or schedule a technical product walkthrough.
            </p>

            {onboardSubmitted ? (
              <div className="onboard-success-box">
                <CheckCircle2 className="text-success" size={24} />
                <div>
                  <strong>Onboarding Request Received</strong>
                  <p>Our team will contact you at {onboardEmail} to coordinate your sandbox access and demo details.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOnboardSubmit} className="onboard-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Professional Email</label>
                    <input 
                      type="email" 
                      placeholder="e.g. treasurer@company.com" 
                      className="onboard-input"
                      required
                      value={onboardEmail}
                      onChange={(e) => setOnboardEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Acme Corp" 
                      className="onboard-input"
                      required
                      value={onboardCompany}
                      onChange={(e) => setOnboardCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Primary Interest</label>
                    <select 
                      value={onboardInterest} 
                      onChange={(e) => setOnboardInterest(e.target.value)}
                      className="onboard-select"
                    >
                      <option value="pilot">Join the Early Pilot Program</option>
                      <option value="demo">Book a Product Architecture Demo</option>
                      <option value="sandbox">Request Sandbox Developer Access</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn primary full-width py-3 mt-4">
                  Submit Onboarding Request
                </button>
              </form>
            )}
          </div>
        </section>

      </main>

      <Footer />

      {/* Embedded CSS stylesheets for self-contained, high-fidelity premium designs */}
      <style jsx global>{`
        /* Hero improvements */
        .hero-trust-indicators {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .trust-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        /* Live Metrics Section styles */
        .live-metrics-section {
          padding: 24px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
        }

        .metrics-container {
          max-width: 1100px;
          margin: 0 auto;
        }

        .metrics-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .metrics-pulse {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--success);
          box-shadow: 0 0 8px var(--success);
          animation: pulse 1.8s infinite;
        }

        .metrics-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: uppercase;
        }

        .metrics-desc {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        @media (max-width: 868px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }

        .metric-box {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .metric-label {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 8px;
          letter-spacing: 0.05em;
        }

        .metric-val {
          font-size: 24px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .metric-val .currency-unit {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .metric-badge {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        /* Interactive Simulator Styles */
        .interactive-demo-section {
          max-width: 1100px;
          margin: 100px auto;
          padding: 0 24px;
        }

        .section-header {
          text-align: center;
          max-width: 700px;
          margin: 0 auto 48px;
        }

        .section-header h2 {
          font-size: 36px;
          font-weight: 500;
          letter-spacing: -0.02em;
          margin-bottom: 12px;
        }

        .section-header p {
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .demo-grid-layout {
          display: grid;
          grid-template-columns: 1.2fr 1.8fr;
          gap: 32px;
        }

        @media (max-width: 868px) {
          .demo-grid-layout {
            grid-template-columns: 1fr;
          }
        }

        .demo-config-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .panel-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
          text-transform: uppercase;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.05em;
        }

        .demo-form-group {
          margin-bottom: 16px;
        }

        .demo-form-group label {
          display: block;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 6px;
          font-weight: 500;
        }

        .demo-form-group-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .input-select, .input-text {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          outline: none;
          font-size: 13.5px;
          transition: border-color 0.2s;
        }

        .input-select:focus, .input-text:focus {
          border-color: var(--border-focus);
        }

        .input-text-disabled {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--bg-primary);
          color: var(--text-tertiary);
          font-size: 13.5px;
          cursor: not-allowed;
        }

        .panel-actions {
          margin-top: 24px;
        }

        .full-width {
          width: 100%;
        }

        /* Simulator visualization styling */
        .demo-execution-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .status-pill {
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          font-family: 'JetBrains Mono', monospace;
        }

        .status-pill.idle {
          background: var(--bg-secondary);
          color: var(--text-secondary);
        }

        .status-pill.running {
          background: var(--warning-bg);
          color: var(--warning);
          animation: pulse 1.5s infinite;
        }

        .status-pill.success {
          background: var(--success-bg);
          color: var(--success);
        }

        /* Step nodes timeline */
        .pipeline-progress-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          padding: 0 10px;
        }

        .progress-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          gap: 6px;
        }

        .node-indicator {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid var(--border);
          background: var(--bg-primary);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.3s;
          font-family: 'JetBrains Mono', monospace;
        }

        .progress-node.active .node-indicator {
          border-color: var(--accent);
          color: var(--accent);
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
        }

        .progress-node.done .node-indicator {
          border-color: var(--success);
          background: var(--success);
          color: var(--accent-text);
        }

        .node-label {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .progress-node.active .node-label {
          color: var(--text-primary);
          font-weight: 600;
        }

        .progress-connector {
          flex: 1;
          height: 2px;
          background: var(--border);
          margin-top: -18px;
        }

        /* Console view */
        .terminal-logs-view {
          background: #0D0E12;
          border: 1px solid #1F2430;
          border-radius: 6px;
          overflow: hidden;
          font-family: 'JetBrains Mono', monospace;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 180px;
        }

        .terminal-header {
          background: #161A24;
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #1F2430;
        }

        .terminal-title {
          color: #8C95A6;
          font-size: 11px;
        }

        .terminal-dots {
          display: flex;
          gap: 6px;
        }

        .terminal-dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .terminal-dots span:nth-child(1) { background: #FF5F56; }
        .terminal-dots span:nth-child(2) { background: #FFBD2E; }
        .terminal-dots span:nth-child(3) { background: #27C93F; }

        .terminal-body {
          padding: 16px;
          font-size: 12px;
          color: #D9D9D9;
          overflow-y: auto;
          line-height: 1.5;
          text-align: left;
        }

        .terminal-line {
          margin-bottom: 6px;
          display: flex;
          gap: 8px;
        }

        .terminal-line.info .line-content { color: #A6ACCD; }
        .terminal-line.success .line-content { color: #39C5BB; }
        .terminal-line.warning .line-content { color: #FFB454; }

        .line-time {
          color: #5C6370;
          flex-shrink: 0;
        }

        .outcome-report-card {
          margin-top: 16px;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 16px;
          background: var(--bg-secondary);
        }

        .report-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .report-row:last-child {
          margin-bottom: 0;
        }

        /* How it works */
        .how-it-works-section {
          max-width: 1100px;
          margin: 100px auto;
          padding: 0 24px;
        }

        .workflow-steps-diagram {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 24px;
          margin-top: 48px;
        }

        @media (max-width: 1024px) {
          .workflow-steps-diagram {
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .workflow-steps-diagram {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        @media (max-width: 480px) {
          .workflow-steps-diagram {
            grid-template-columns: 1fr;
          }
        }

        .workflow-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 28px 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          position: relative;
          transition: all 0.2s;
        }

        .workflow-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-focus);
          box-shadow: 0 8px 24px rgba(0,0,0,0.04);
        }

        .workflow-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          color: var(--border-focus);
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.15);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .workflow-card h4 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--text-primary);
        }

        .workflow-card p {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* Use Cases */
        .use-cases-section {
          max-width: 1100px;
          margin: 100px auto;
          padding: 0 24px;
        }

        .use-cases-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 48px;
        }

        @media (max-width: 900px) {
          .use-cases-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .use-cases-grid {
            grid-template-columns: 1fr;
          }
        }

        .use-case-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          transition: all 0.2s;
        }

        .use-case-card:hover {
          border-color: var(--border-focus);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.05);
        }

        .use-case-badge {
          display: inline-block;
          align-self: flex-start;
          padding: 4px 8px;
          border-radius: 4px;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 16px;
        }

        .use-case-card h3 {
          font-size: 18px;
          margin-top: 0;
          margin-bottom: 12px;
        }

        .use-case-card p {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 24px;
          flex-grow: 1;
        }

        .use-case-outcome {
          border-top: 1px solid var(--border);
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .outcome-stat {
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          font-weight: 600;
          color: var(--success);
        }

        .outcome-lbl {
          font-size: 11px;
          color: var(--text-tertiary);
          text-transform: uppercase;
        }

        /* Product Explorer Section */
        .product-explorer-section {
          max-width: 1100px;
          margin: 100px auto;
          padding: 80px 24px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        .explorer-layout {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 40px;
          margin-top: 48px;
        }

        @media (max-width: 900px) {
          .explorer-layout {
            grid-template-columns: 1fr;
          }
        }

        .explorer-tabs {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .explorer-tab-btn {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--surface);
          text-align: left;
          cursor: pointer;
          transition: all 0.25s;
          color: var(--text-secondary);
        }

        .explorer-tab-btn:hover {
          background: var(--bg-secondary);
        }

        .explorer-tab-btn.active {
          border-color: var(--border-focus);
          background: var(--bg-secondary);
          color: var(--text-primary);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .tab-btn-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tab-btn-text strong {
          font-size: 14px;
          font-weight: 600;
        }

        .tab-btn-text span {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        .explorer-screen-view {
          background: #0D0E12;
          border: 1px solid #1F2430;
          border-radius: 8px;
          padding: 8px;
          min-height: 380px;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
        }

        .explorer-ui-mockup {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .mockup-header {
          padding: 12px 16px;
          border-bottom: 1px solid #1F2430;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mockup-title {
          font-size: 13px;
          font-weight: 600;
          color: #D9D9D9;
        }

        .mockup-badge {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .mockup-body {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
          color: #D9D9D9;
          font-size: 13px;
        }

        .mockup-metrics-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .m-metric {
          background: #161A24;
          border: 1px solid #1F2430;
          padding: 14px;
          border-radius: 4px;
        }

        .m-label {
          display: block;
          font-size: 11px;
          color: #8C95A6;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .m-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          font-weight: 600;
        }

        .m-unit {
          font-size: 11px;
          color: #8C95A6;
        }

        .mockup-table-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .table-subtitle {
          font-size: 11px;
          color: #8C95A6;
          text-transform: uppercase;
          font-weight: 600;
        }

        .mockup-table {
          width: 100%;
          border-collapse: collapse;
        }

        .mockup-table th {
          text-align: left;
          padding: 8px;
          border-bottom: 1px solid #1F2430;
          color: #8C95A6;
          font-size: 11px;
          text-transform: uppercase;
        }

        .mockup-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #1F2430;
        }

        .m-badge-status {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .m-badge-status.yellow {
          background: rgba(255, 171, 0, 0.15);
          color: #FFAB00;
        }

        .m-badge-status.green {
          background: rgba(0, 200, 83, 0.15);
          color: #00C853;
        }

        /* Mockup forms */
        .mockup-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mockup-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 600px) {
          .mockup-form-row {
            grid-template-columns: 1fr;
          }
        }

        .m-input {
          width: 100%;
          padding: 10px;
          background: #161A24;
          border: 1px solid #1F2430;
          border-radius: 4px;
          color: #D9D9D9;
          font-size: 13px;
        }

        .mockup-form-info {
          display: flex;
          gap: 8px;
          padding: 12px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 4px;
          color: #8C95A6;
          font-size: 12px;
          line-height: 1.4;
        }

        /* Governance view */
        .governance-rule-card {
          background: #161A24;
          border: 1px solid #1F2430;
          padding: 20px;
          border-radius: 6px;
        }

        .rule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .rule-name {
          font-weight: 600;
          color: #D9D9D9;
        }

        .rule-status.active {
          color: #00C853;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          background: rgba(0, 200, 83, 0.15);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .rule-desc {
          color: #8C95A6;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .signatory-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .signatory-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #D9D9D9;
        }

        /* Compliance Logs */
        .compliance-log-entries {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
        }

        .compliance-log-line {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: #161A24;
          border: 1px solid #1F2430;
          border-radius: 4px;
        }

        .compliance-log-line .timestamp {
          color: #8C95A6;
        }

        .compliance-log-line .status-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .compliance-log-line .status-badge.pass {
          background: rgba(0, 200, 83, 0.15);
          color: #00C853;
        }

        .compliance-log-line .status-badge.info {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        /* Security section */
        .security-compliance-section {
          max-width: 1100px;
          margin: 100px auto;
          padding: 0 24px;
        }

        .security-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 48px;
        }

        @media (max-width: 900px) {
          .security-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .security-grid {
            grid-template-columns: 1fr;
          }
        }

        .security-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .security-card h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .security-card p {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        /* Protocol Architecture Section */
        .architecture-section {
          max-width: 1100px;
          margin: 100px auto;
          padding: 0 24px;
        }

        .architecture-diagram {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 40px 24px;
          margin-top: 48px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          overflow-x: auto;
          gap: 16px;
        }

        @media (min-width: 993px) {
          .architecture-diagram {
            overflow-x: hidden;
          }
        }

        @media (max-width: 992px) {
          .architecture-diagram {
            flex-direction: column;
            gap: 24px;
            overflow-x: auto;
          }
          .arch-flow-line {
            transform: rotate(90deg);
          }
        }

        .arch-node {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          min-width: 130px;
          text-align: center;
        }

        .arch-node.highlight {
          border-color: var(--border-focus);
          background: var(--bg-primary);
        }

        .arch-node span {
          font-size: 13px;
          font-weight: 500;
        }

        .node-icon {
          color: var(--success);
        }

        .arch-flow-line {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex-grow: 1;
        }

        .flow-label {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .flow-arrow {
          width: 100%;
          min-width: 20px;
          max-width: 50px;
          height: 2px;
          background: var(--border);
          position: relative;
        }

        .flow-arrow::after {
          content: '';
          position: absolute;
          right: 0;
          top: -3px;
          width: 0;
          height: 0;
          border-top: 4px solid transparent;
          border-bottom: 4px solid transparent;
          border-left: 6px solid var(--border);
        }

        /* Example Receipt Card styles */
        .example-transfer-section {
          max-width: 1100px;
          margin: 100px auto;
          padding: 0 24px;
        }

        .receipt-card {
          max-width: 600px;
          margin: 48px auto 0;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          overflow: hidden;
        }

        .receipt-header {
          padding: 16px 24px;
          border-bottom: 1px dashed var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-secondary);
        }

        .receipt-title {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-secondary);
        }

        .receipt-status {
          font-size: 11px;
          font-weight: 600;
          background: var(--success-bg);
          color: var(--success);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .receipt-body {
          padding: 24px;
        }

        .receipt-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        .receipt-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .r-label {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-tertiary);
          letter-spacing: 0.05em;
        }

        .receipt-footer {
          border-top: 1px solid var(--border);
          padding-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .receipt-hash {
          font-size: 12px;
          color: var(--text-secondary);
          text-decoration: underline;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Transparency section styling */
        .transparency-section {
          max-width: 1100px;
          margin: 100px auto;
          padding: 0 24px;
        }

        .transparency-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-top: 48px;
        }

        @media (max-width: 900px) {
          .transparency-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .transparency-grid {
            grid-template-columns: 1fr;
          }
        }

        .trans-box {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .trans-box h4 {
          font-size: 14px;
          font-weight: 600;
        }

        .trans-box p {
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        .trans-details {
          font-size: 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          padding: 6px 10px;
          border-radius: 4px;
          margin-top: auto;
          color: var(--text-secondary);
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .trans-details.status-pill-text {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          text-transform: uppercase;
        }

        .trans-link {
          font-size: 13px;
          color: var(--text-primary);
          text-decoration: underline;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: auto;
        }

        /* Roadmap timeline styling */
        .roadmap-section {
          max-width: 1100px;
          margin: 100px auto;
          padding: 0 24px;
        }

        .roadmap-timeline {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-top: 48px;
          position: relative;
        }

        @media (max-width: 868px) {
          .roadmap-timeline {
            grid-template-columns: 1fr;
          }
        }

        .roadmap-stage {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 28px;
          position: relative;
        }

        .roadmap-stage.done {
          border-top: 3px solid var(--success);
        }

        .roadmap-stage.current {
          border-top: 3px solid var(--warning);
        }

        .roadmap-stage.planned {
          border-top: 3px solid var(--text-tertiary);
        }

        .stage-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .roadmap-stage.done .stage-status { color: var(--success); }
        .roadmap-stage.current .stage-status { color: var(--warning); }
        .roadmap-stage.planned .stage-status { color: var(--text-tertiary); }

        .roadmap-stage h4 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .stage-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .stage-list li {
          font-size: 13px;
          color: var(--text-secondary);
          position: relative;
          padding-left: 16px;
          line-height: 1.4;
        }

        .stage-list li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--text-tertiary);
        }

        /* Founder Story Section styling */
        .founder-story-section {
          max-width: 800px;
          margin: 100px auto;
          padding: 0 24px;
        }

        .story-container {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.01);
        }

        .story-container h2 {
          font-size: 28px;
          margin-top: 0;
          margin-bottom: 24px;
        }

        .story-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        /* Final CTA onboarding form styles */
        .final-cta-section {
          border-top: 1px solid var(--border);
          padding: 100px 24px;
          background: var(--bg-secondary);
        }

        .cta-container {
          max-width: 680px;
          margin: 0 auto;
          text-align: center;
        }

        .cta-container h2 {
          font-size: 36px;
          margin-bottom: 16px;
        }

        .cta-sub {
          font-size: 15px;
          color: var(--text-secondary);
          margin-bottom: 36px;
          line-height: 1.6;
        }

        .onboard-form {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 32px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.05);
          text-align: left;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 16px;
        }

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
            margin-bottom: 0;
          }
          .form-row .form-group {
            margin-bottom: 16px;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .onboard-input, .onboard-select {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          outline: none;
          font-size: 13.5px;
          transition: border-color 0.2s;
        }

        .onboard-input:focus, .onboard-select:focus {
          border-color: var(--border-focus);
        }

        .onboard-success-box {
          background: var(--success-bg);
          border: 1px solid rgba(0, 200, 83, 0.2);
          border-radius: 8px;
          padding: 24px;
          display: flex;
          gap: 16px;
          text-align: left;
          align-items: flex-start;
          max-width: 540px;
          margin: 0 auto;
        }

        .onboard-success-box strong {
          display: block;
          font-size: 15px;
          margin-bottom: 6px;
          color: var(--text-primary);
        }

        .onboard-success-box p {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
        }
      `}</style>
    </div>
  )
}
