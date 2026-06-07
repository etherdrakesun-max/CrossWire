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
  ShieldAlert, 
  Plus, 
  Terminal, 
  Globe, 
  Layers, 
  Award,
  BookOpen,
  ArrowRight
} from 'lucide-react'

export default function AgentsDashboardPage() {
  const { address, isConnected } = useAccount()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Registration Form
  const [name, setName] = useState('')
  const [capabilities, setCapabilities] = useState('Payment Execution, Scheduled Payroll, Multi-chain Liquidity Bridge')
  const [endpoint, setEndpoint] = useState('https://mcp.crosswire.finance/api/v1')
  const [registering, setRegistering] = useState(false)

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
      description: `Autonomous financial agent registered under ERC-8004`,
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

  // Check if current user is registered
  const myAgent = agents.find(a => a.address.toLowerCase() === address?.toLowerCase())

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">

          <div style={{ marginBottom: '24px' }}>
            <h1 className="flex items-center gap-3">
              <Bot size={32} strokeWidth={1.5} className="text-primary" />
              AI Agent Identity & Registry (ERC-8004)
            </h1>
            <p className="text-muted text-sm mt-1">
              On-chain autonomous agent identity cards, performance reputations, and capability discovery for B2B routing
            </p>
          </div>

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
