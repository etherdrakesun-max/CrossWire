'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { formatAgentCard } from '@/lib/agent-identity'
import { 
  Bot, 
  Cpu, 
  CheckCircle2, 
  Plus, 
  Terminal, 
  Award,
  ArrowRight,
  Music,
  Tv,
  FileText,
  Activity,
  Send,
  Zap,
  Lock,
  Layers,
  ChevronRight,
  Play
} from 'lucide-react'

export default function AgentsDashboardPage() {
  const { address, isConnected } = useAccount()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Registration Form
  const [name, setName] = useState('')
  const [capabilities, setCapabilities] = useState('Metadata Tagging, FOSS Royalty Auditing, Citational Verification')
  const [endpoint, setEndpoint] = useState('https://mcp.crosswire.finance/api/v1')
  const [registering, setRegistering] = useState(false)

  // Swarm Simulator State
  const [eventType, setEventType] = useState<'scrobble' | 'stream_webhook' | 'citation'>('scrobble')
  const [creatorName, setCreatorName] = useState('Taylor Swift')
  const [sourceId, setSourceId] = useState('mbid-taylor-swift')
  const [metadataField, setMetadataField] = useState('track: Cardigan')
  const [payoutCurrency, setPayoutCurrency] = useState<'USDC' | 'EURC'>('USDC')
  const [durationSeconds, setDurationSeconds] = useState(60)

  const [swarmLogs, setSwarmLogs] = useState<any[]>([])
  const [swarmResult, setSwarmResult] = useState<any>(null)
  const [isSwarming, setIsSwarming] = useState(false)
  const [currentSwarmStep, setCurrentSwarmStep] = useState<number>(0)
  
  // Trace UI active step (1-6)
  const [traceStep, setTraceStep] = useState<number>(0)

  // Streaming Player State
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamSecs, setStreamSecs] = useState(0)
  const [streamRoyaltiesPaid, setStreamRoyaltiesPaid] = useState(0)

  // Dynamic continuous video royalty billing loop
  useEffect(() => {
    let interval: any
    if (isStreaming) {
      interval = setInterval(async () => {
        setStreamSecs(s => s + 1)
        const ratePerSec = 0.00001 // $0.00001 USDC per second
        
        // Settle micro royalties every 3 seconds
        if ((streamSecs + 1) % 3 === 0) {
          const cost = ratePerSec * 3
          try {
            const res = await fetch('/api/agents/swarm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'stream_webhook',
                sourceId: 'streaming-session-player',
                creatorName: 'Live Creator Streamer',
                consumerAddress: address || '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
                metadata: {
                  durationSeconds: 3,
                  payoutCurrency: 'USDC'
                }
              })
            })
            if (res.ok) {
              setStreamRoyaltiesPaid(prev => prev + cost)
            }
          } catch (err) {
            console.error('Failed to settle stream royalties:', err)
          }
        }
      }, 1000)
    } else {
      setStreamSecs(0)
    }
    return () => clearInterval(interval)
  }, [isStreaming, streamSecs, address])

  // Fetch all agents
  const fetchAgents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents')
      if (res.ok) {
        const data = await res.json()
        setAgents(data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load registered agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  // Auto-populate sourceId based on creator / event type
  useEffect(() => {
    if (eventType === 'scrobble') {
      setCreatorName('Taylor Swift')
      setSourceId('mbid-taylor-swift')
      setMetadataField('track: Cardigan')
    } else if (eventType === 'stream_webhook') {
      setCreatorName('Owncast Streamer')
      setSourceId('owncast-stream-channel')
      setMetadataField('viewers: 142')
    } else if (eventType === 'citation') {
      setCreatorName('Antigravity Research')
      setSourceId('paper-01')
      setMetadataField('paperIndex: paper-01')
    }
  }, [eventType])

  // Handle register agent
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !address) {
      toast.error('Please connect your corporate wallet')
      return
    }
    if (!name) {
      toast.error('Agent name is required')
      return
    }

    setRegistering(true)
    const capabilitiesArray = capabilities.split(',').map(s => s.trim())
    const cardUri = formatAgentCard({
      name,
      description: `Autonomous creator settlement agent registered under ERC-8004`,
      capabilities: capabilitiesArray,
      developerAddress: address,
      endpointUri: endpoint,
      model: 'Claude 3.5 Sonnet',
      version: 'v1.0.0'
    })

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          name,
          capabilities: capabilitiesArray,
          agentCardUri: cardUri
        })
      })

      if (res.ok) {
        toast.success('AI Agent registered on Arc!')
        setName('')
        fetchAgents()
      } else {
        const errData = await res.json()
        toast.error(errData.error || 'Registration failed')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error registering agent')
    } finally {
      setRegistering(false)
    }
  }

  // Trigger Swarm Audit & Settle Trace
  const triggerSwarmAudit = async () => {
    setIsSwarming(true)
    setSwarmLogs([])
    setSwarmResult(null)
    setTraceStep(1) // Stage 1: Request 402

    const mockConsumerAddress = address || '0x90f79bf6eb2c4f870365e785982e1f101e93b906'
    
    // Parse metadata
    const metaParts = metadataField.split(':')
    const key = metaParts[0]?.trim() || 'info'
    const value = metaParts[1]?.trim() || 'verified'
    const metadata: any = { [key]: value, payoutCurrency }
    if (eventType === 'stream_webhook') {
      metadata.durationSeconds = durationSeconds
    }

    // Step-by-step UI animation helper
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

    try {
      // Step 1 -> Step 2: Gated call -> Client Signs EIP-712 auth
      await delay(1200)
      setTraceStep(2)

      // Step 2 -> Step 3: Posting typed signatures to proxy facilitator
      await delay(1200)
      setTraceStep(3)

      // Post to swarm API
      const res = await fetch('/api/agents/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          sourceId,
          creatorName,
          consumerAddress: mockConsumerAddress,
          metadata
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Swarm audit execution failed')
      }

      const data = await res.json()
      
      // Print logs sequentially to simulate reasoning thinking
      for (const log of data.logs) {
        setSwarmLogs(prev => [...prev, log])
        await delay(350)
      }

      if (data.success) {
        // Step 4: Aggregate Queue
        setTraceStep(4)
        await delay(1000)

        // Step 5: submitBatch
        setTraceStep(5)
        await delay(1200)

        // Step 6: Settle completed
        setTraceStep(6)
        setSwarmResult(data)
        toast.success('Swarm royalty audit settled gaslessly!')
      } else {
        setTraceStep(0)
        toast.error('Swarm audit flagged high risk or insufficient budget.')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Swarm runner crashed')
      setTraceStep(0)
    } finally {
      setIsSwarming(false)
    }
  }

  // Check if current user is registered
  const myAgent = agents.find(a => a.address.toLowerCase() === address?.toLowerCase())

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in" style={{ maxWidth: '1200px' }}>

          <div style={{ marginBottom: '32px' }}>
            <h1 className="flex items-center gap-3">
              <Bot size={32} strokeWidth={1.5} className="text-primary" />
              CrossWire Agent Mesh Network (ERC-8004)
            </h1>
            <p className="text-muted text-sm mt-1">
              Autonomous multi-agent verification stack executing gas-free USDC/EURC nanopayments on Arc Testnet via Circle Gateway x402.
            </p>
          </div>

          {/* Core Agent Mesh Swarm Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px', marginBottom: '32px', alignItems: 'start' }}>
            
            {/* Swarm Panel */}
            <div className="card">
              <div className="card-header">
                <h2>Autonomous Swarm Royalty Audit</h2>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px' }}>
                  
                  {/* Form Controls */}
                  <div className="flex flex-col gap-4">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Creator Event Source</label>
                      <div className="flex gap-2" style={{ flexDirection: 'column' }}>
                        <button 
                          className={`btn text-left justify-start flex gap-2 ${eventType === 'scrobble' ? 'primary' : ''}`}
                          onClick={() => setEventType('scrobble')}
                        >
                          <Music size={16} /> Navidrome Scrobble
                        </button>
                        <button 
                          className={`btn text-left justify-start flex gap-2 ${eventType === 'stream_webhook' ? 'primary' : ''}`}
                          onClick={() => setEventType('stream_webhook')}
                        >
                          <Tv size={16} /> Owncast Stream Webhook
                        </button>
                        <button 
                          className={`btn text-left justify-start flex gap-2 ${eventType === 'citation' ? 'primary' : ''}`}
                          onClick={() => setEventType('citation')}
                        >
                          <FileText size={16} /> RSSHub Paper Citation
                        </button>
                      </div>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Creator / Artist Name</label>
                      <input 
                        type="text" 
                        className="input-notion" 
                        value={creatorName}
                        onChange={(e) => setCreatorName(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Payout Currency</label>
                      <select 
                        className="input-notion" 
                        value={payoutCurrency} 
                        onChange={(e) => setPayoutCurrency(e.target.value as any)}
                      >
                        <option value="USDC">USDC (Direct)</option>
                        <option value="EURC">EURC (StableFX Swap)</option>
                      </select>
                    </div>

                    {eventType === 'stream_webhook' && (
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Viewer Duration (Sec)</label>
                        <input 
                          type="number" 
                          className="input-notion" 
                          value={durationSeconds}
                          onChange={(e) => setDurationSeconds(Number(e.target.value))}
                        />
                      </div>
                    )}

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Verification Payload</label>
                      <input 
                        type="text" 
                        className="input-notion" 
                        value={metadataField}
                        onChange={(e) => setMetadataField(e.target.value)}
                      />
                    </div>

                    <button 
                      className="btn primary flex items-center justify-center gap-2 mt-2" 
                      onClick={triggerSwarmAudit} 
                      disabled={isSwarming}
                    >
                      <Play size={14} /> {isSwarming ? 'Swarming Audit...' : 'Trigger Swarm Audit'}
                    </button>
                  </div>

                  {/* Swarm Logs Console */}
                  <div className="flex flex-col gap-2">
                    <label className="form-label flex items-center gap-1">
                      <Terminal size={14} /> Swarm Reasoning Logs
                    </label>
                    <div className="text-mono text-xs bg-slate-950 p-4 rounded border border-slate-800" style={{ height: '310px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {swarmLogs.length === 0 && (
                        <p className="text-secondary text-center my-auto">Await trigger. Coordinator agent standby.</p>
                      )}
                      {swarmLogs.map((log, index) => (
                        <div key={index} style={{ borderLeft: `2px solid var(--${log.status === 'success' ? 'success' : log.status === 'error' ? 'danger' : log.status === 'warning' ? 'warning' : 'border'})`, paddingLeft: '8px' }}>
                          <span className="text-tertiary">[{log.timestamp}] </span>
                          <strong className={log.status === 'success' ? 'text-success' : log.status === 'error' ? 'text-danger' : log.status === 'warning' ? 'text-warning' : 'text-primary'}>
                            {log.agent}:
                          </strong>{' '}
                          <span className="text-slate-100">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Swarm Result Block */}
                {swarmResult && (
                  <div className="mt-4 p-4 bg-slate-900 border border-success/20 rounded-lg flex items-center justify-between animate-fade-in">
                    <div>
                      <span className="text-xs text-success font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Settle Successful
                      </span>
                      <p className="text-sm text-slate-100 mt-1">
                        Payout Settle: <strong>{swarmResult.settlementDetails.settledAmount.toFixed(6)} {swarmResult.settlementDetails.currency}</strong>
                      </p>
                      <span className="text-xs text-secondary block font-mono mt-1 break-all">
                        Payee: {swarmResult.settlementDetails.recipient}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="text-xs text-secondary block">Settlement Tx</span>
                      <a 
                        href={`https://testnet.arcscan.app/tx/${swarmResult.settlementDetails.txHash}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="explorer-link text-xs flex items-center gap-1 justify-end mt-1"
                      >
                        Arcscan <ArrowRight size={12} />
                      </a>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Autonomous Creator Streaming Player */}
            <div className="card">
              <div className="card-header flex justify-between items-center">
                <h2>Autonomous Creator Streaming Player</h2>
                {isStreaming && (
                  <span className="badge success text-xs animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <div className="card-body">
                <div className="flex flex-col md:flex-row gap-6 items-stretch">
                  <div className="flex-1 flex flex-col justify-between gap-4">
                    <p className="text-xs text-secondary leading-relaxed">
                      Simulate a live content feed with dynamic nanopayment settlement. Starting this stream initiates continuous per-second micro-payouts (<strong>$0.00001 USDC/sec</strong>) routed gaslessly via Circle Gateway off-chain relayer.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 bg-slate-900/50 p-3 rounded border border-slate-800/60">
                      <div className="flex flex-col gap-1">
                        <span className="text-tertiary text-xs">Elapsed Time:</span>
                        <span className="text-base text-slate-100 font-mono font-bold">{streamSecs}s</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-tertiary text-xs">Royalties Paid:</span>
                        <span className="text-base text-success font-mono font-bold">${streamRoyaltiesPaid.toFixed(5)}</span>
                      </div>
                    </div>

                    <button 
                      className={`btn w-full flex items-center justify-center gap-2 ${isStreaming ? 'danger' : 'primary'}`}
                      onClick={() => setIsStreaming(!isStreaming)}
                    >
                      <Tv size={14} /> {isStreaming ? 'Stop Broadcast' : 'Start Broadcast Payouts'}
                    </button>
                  </div>
                  
                  <div 
                    className="flex-1 rounded-lg border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden bg-slate-950 min-h-[160px]"
                    style={{
                      background: 'radial-gradient(circle at center, #1e1b4b 0%, #030712 100%)'
                    }}
                  >
                    {isStreaming ? (
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="relative flex items-center justify-center">
                          <span className="absolute inline-flex h-12 w-12 rounded-full bg-success/20 animate-ping" />
                          <span className="relative inline-flex rounded-full h-8 w-8 bg-success/10 border-2 border-success flex items-center justify-center">
                            <Tv className="text-success" size={14} />
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-mono text-slate-300">Broadcasting...</span>
                          <span className="text-[10px] text-tertiary font-mono mt-1">Accumulated: {((streamSecs * 0.00001)).toFixed(5)} USDC</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-tertiary text-xs font-mono">
                        <Tv size={20} className="opacity-40" />
                        <span>Stream Offline</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Visual 6-Stage Gateway Payment Trace UI */}
            <div className="card">
              <div className="card-header">
                <h2>6-Stage Gateway Payment Trace</h2>
              </div>
              <div className="card-body flex flex-col gap-3">
                
                {[
                  { step: 1, label: '1. Gated Request', desc: 'FOSS events trigger premium HTTP 402 Payment Required.' },
                  { step: 2, label: '2. EIP-712 Signing', desc: 'Buyer signs off-chain transfer authorizations gaslessly.' },
                  { step: 3, label: '3. Gateway API Post', desc: 'Typed signatures submitted to Circle Gateway proxy.' },
                  { step: 4, label: '4. Batch Relayer Queue', desc: 'Facilitator aggregates signatures into pending queue.' },
                  { step: 5, label: '5. submitBatch on Arc', desc: 'Aggregate block transaction executed on Arc Chain.' },
                  { step: 6, label: '6. Settle Verified', desc: 'USDC splits completed on-chain in under 1 second.' },
                ].map((s) => {
                  const isActive = traceStep === s.step
                  const isCompleted = traceStep > s.step
                  return (
                    <div 
                      key={s.step} 
                      style={{ 
                        padding: '12px', 
                        border: '1px solid',
                        borderColor: isActive ? 'var(--success)' : isCompleted ? 'rgba(0, 200, 83, 0.2)' : 'var(--border)',
                        background: isActive ? 'var(--success-bg)' : isCompleted ? 'rgba(0,200,83,0.02)' : 'transparent',
                        borderRadius: '2px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'start',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div 
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: '1px solid',
                            borderColor: isActive || isCompleted ? 'var(--success)' : 'var(--text-tertiary)',
                            background: isActive || isCompleted ? 'var(--success)' : 'transparent',
                            color: isActive || isCompleted ? '#000' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}
                        >
                          {isCompleted ? '✓' : s.step}
                        </div>
                      </div>
                      <div>
                        <strong className={`text-sm ${isActive ? 'text-success' : 'text-slate-100'}`}>{s.label}</strong>
                        <p className="text-xs text-secondary mt-1" style={{ margin: 0 }}>{s.desc}</p>
                      </div>
                    </div>
                  )
                })}

              </div>
            </div>

          </div>

          {/* Form and List Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Column: Register current address as agent */}
            <div className="flex flex-col gap-6">
              <div className="card">
                <div className="card-header">
                  <h2>Register AI Agent (ERC-8004)</h2>
                </div>
                <div className="card-body">
                  {!isConnected ? (
                    <p className="text-sm text-secondary">Connect your wallet to register an AI Agent card for this account.</p>
                  ) : myAgent ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <CheckCircle2 size={40} className="text-success mx-auto mb-3" />
                      <h3 className="font-semibold text-slate-100">{myAgent.name}</h3>
                      <p className="text-xs text-success font-semibold mt-1">Registered & Active</p>
                      
                      <div className="mt-4 p-3 bg-slate-950 rounded-lg text-left" style={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span className="text-xs text-secondary block">Reputation Score</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Award size={16} className="text-primary" />
                          <strong className="text-lg text-primary">{myAgent.reputationScore}/100</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleRegister} className="flex flex-col gap-4">
                      <div className="form-group">
                        <label className="form-label">Agent Name</label>
                        <input
                          type="text"
                          className="input-notion"
                          placeholder="e.g. CrossWire Auto-Payout Agent"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Capabilities (Comma-separated)</label>
                        <input
                          type="text"
                          className="input-notion"
                          value={capabilities}
                          onChange={(e) => setCapabilities(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">MCP Server Endpoint URI</label>
                        <input
                          type="text"
                          className="input-notion"
                          value={endpoint}
                          onChange={(e) => setEndpoint(e.target.value)}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={registering}
                        className="btn primary w-full mt-2"
                      >
                        {registering ? 'Publishing Registry Card...' : 'Register Identity Card'}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {myAgent && (
                <div className="card">
                  <div className="card-header">
                    <h2>On-chain Identity Metadata</h2>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <pre className="text-xs font-mono text-success bg-slate-950 p-4 rounded-b-xl overflow-x-auto" style={{ margin: 0, maxHeight: '250px' }}>
                      {myAgent.agentCardUri}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Registry List */}
            <div className="card">
              <div className="card-header flex justify-between items-center">
                <h2>Active Agent Registry Directory</h2>
                <span className="badge primary">{agents.length} Agents</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <Cpu className="animate-spin text-primary mx-auto mb-2" />
                    <p className="text-xs text-secondary">Loading directory index...</p>
                  </div>
                ) : agents.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <p>No agents have registered on-chain yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {agents.map((agent) => (
                      <div 
                        key={agent.id} 
                        style={{ 
                          padding: '20px', 
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          justifyContent: 'between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div className="flex items-center gap-2">
                            <Cpu size={16} className="text-primary" />
                            <strong className="text-slate-100">{agent.name}</strong>
                            <span className="badge success text-xs">Active</span>
                          </div>
                          
                          <p className="text-xs font-mono text-secondary mt-1 block break-all">
                            Address: {agent.address}
                          </p>

                          <div className="flex flex-wrap gap-1 mt-2">
                            {agent.capabilities.split(',').map((cap: string, i: number) => (
                              <span key={i} className="badge gray text-xs">{cap.trim()}</span>
                            ))}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                          <span className="text-xs text-secondary block">Reputation</span>
                          <div className="flex items-center justify-end gap-1 mt-1 text-primary">
                            <Award size={14} />
                            <strong className="text-sm">{agent.reputationScore}/100</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
