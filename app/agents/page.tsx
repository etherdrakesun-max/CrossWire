'use client'

import { useState, useEffect, useRef } from 'react'
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
  FileText,
  Activity,
  Send,
  Zap,
  Lock,
  Layers,
  ChevronRight,
  Play,
  Brain,
  Database,
  RefreshCw,
  Trash2,
  Shield,
  AlertCircle,
  History,
  User
} from 'lucide-react'

export default function AgentsDashboardPage() {
  const { address, isConnected } = useAccount()
  const [agents, setAgents] = useState<any[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  
  // Tabs: 'workspace' | 'registry'
  const [activeTab, setActiveTab] = useState<'workspace' | 'registry'>('workspace')

  // LLM Provider Settings
  const [provider, setProvider] = useState<'openai' | 'deepseek'>('openai')
  
  // Goal execution state
  const [goal, setGoal] = useState('')
  const [executing, setExecuting] = useState(false)
  const [goalStatus, setGoalStatus] = useState<'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED'>('IDLE')
  const [steps, setSteps] = useState<any[]>([])
  const [summary, setSummary] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  
  // Long-term Memory state
  const [memories, setMemories] = useState<any[]>([])
  
  // Execution History state
  const [historyList, setHistoryList] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedHistoryGoal, setSelectedHistoryGoal] = useState<any>(null)

  // Registration Form
  const [name, setName] = useState('')
  const [capabilities, setCapabilities] = useState('Metadata Tagging, FOSS Royalty Auditing, Citational Verification')
  const [endpoint, setEndpoint] = useState('https://mcp.crosswire.finance/api/v1')
  const [registering, setRegistering] = useState(false)

  const consoleEndRef = useRef<HTMLDivElement>(null)

  // Suggestion presets
  const suggestions = [
    { label: 'Check My Balance', text: 'Fetch my current on-chain and off-chain stablecoin balances' },
    { label: 'Screen Payee Safety', text: 'Perform compliance sanctions screen check on address 0xd90e2fe9c7306089000a7a04b1e42dd7483ef333' },
    { label: 'Invoice Contributor Split', text: 'Audit GitHub Contributor splits for repo-crosswire-app and trigger royalty payout of 1.5 USDC to contributors using EURC' },
    { label: 'StableFX Swap USDC/EURC', text: 'Swap 5 USDC to EURC using Circle StableFX API' },
    { label: 'Add Supplier Contact', text: 'Add a new supplier contact named "Circle Node Operator" with address 0x70997970C51812dc3A010C7d01b50e0d17dc79C8' }
  ]

  // Fetch all agents
  const fetchAgents = async () => {
    setLoadingAgents(true)
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
      setLoadingAgents(false)
    }
  }

  // Fetch agent execution memory slots
  const fetchMemories = async () => {
    if (!address) return
    try {
      // Mock retrieve standard details from memory slots since they correspond to keys
      const keys = ['user_preference', 'last_action', 'tax_residency']
      const fetched = await Promise.all(keys.map(async (key) => {
        const res = await fetch(`/api/agents/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: `Retrieve key-value note for key "${key}"`,
            provider: 'openai',
            userAddress: address
          })
        })
        return { key, value: `Active user metadata retrieved` }
      }))
      setMemories(fetched)
    } catch (e) {
      console.error('Error loading memory:', e)
    }
  }

  // Fetch past execution history
  const fetchHistory = async () => {
    if (!address) return
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/agents/history?userAddress=${address}`)
      if (res.ok) {
        const data = await res.json()
        setHistoryList(data)
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    if (address && isConnected) {
      fetchHistory()
    } else {
      setHistoryList([])
      setMemories([])
    }
  }, [address, isConnected])

  // Scroll console logs to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  // Execute goal
  const handleExecuteGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !address) {
      toast.error('Please connect your corporate wallet')
      return
    }
    if (!goal.trim()) {
      toast.error('Please input a goal for the agent')
      return
    }

    setExecuting(true)
    setGoalStatus('RUNNING')
    setSteps([])
    setSummary('')
    setLogs([`[System] Initializing planner with provider: ${provider}...`])

    try {
      const res = await fetch('/api/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          provider,
          userAddress: address
        })
      })

      if (!res.ok) {
        throw new Error(`API returned status ${res.status}`)
      }

      if (!res.body) {
        throw new Error('Readable stream not supported by server.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.slice(6)
            try {
              const data = JSON.parse(dataStr)
              
              if (data.type === 'start') {
                setLogs(prev => [...prev, `[System] ${data.message}`])
              } else if (data.type === 'step') {
                const { stepNumber, toolName, description, reasoning, result, status } = data
                
                // Add step to list or update if exists
                setSteps(prev => {
                  const existingIdx = prev.findIndex(s => s.stepNumber === stepNumber)
                  const stepObj = { stepNumber, toolName, description, reasoning, result, status }
                  if (existingIdx >= 0) {
                    const next = [...prev]
                    next[existingIdx] = stepObj
                    return next
                  } else {
                    return [...prev, stepObj]
                  }
                })

                setLogs(prev => [
                  ...prev,
                  `[Step ${stepNumber}] Tool: ${toolName} -> Status: ${status}`,
                  `  Reasoning: "${reasoning}"`,
                  result ? `  Result: ${result.slice(0, 300)}` : `  Executing...`
                ])
              } else if (data.type === 'done') {
                setGoalStatus(data.success ? 'COMPLETED' : 'FAILED')
                setSummary(data.summary)
                setLogs(prev => [...prev, `[System] Planning complete. Success: ${data.success}`])
                toast.success('Agent planning completed successfully!')
                fetchHistory()
              } else if (data.type === 'error') {
                setGoalStatus('FAILED')
                setSummary(data.message)
                setLogs(prev => [...prev, `[Error] ${data.message}`])
                toast.error(`Agent execution failed: ${data.message}`)
              }
            } catch (err) {
              console.error('Error parsing streaming segment:', err, dataStr)
            }
          }
        }
      }

    } catch (err: any) {
      console.error(err)
      setGoalStatus('FAILED')
      toast.error(err?.message || 'Agent executor failed')
      setLogs(prev => [...prev, `[Fatal Crash] ${err?.message || err}`])
    } finally {
      setExecuting(false)
    }
  }

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
      model: 'gpt-4o-mini',
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
        <div className="page-container animate-fade-in" style={{ maxWidth: '1200px' }}>

          <div style={{ marginBottom: '24px' }} className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="flex items-center gap-3" style={{ margin: 0 }}>
                <Bot size={32} strokeWidth={1.5} className="text-primary animate-pulse" />
                CrossWire Agent Mesh Network
              </h1>
              <p className="text-muted text-sm mt-1">
                Autonomous planner system using OpenAI and DeepSeek models. Executes multi-step actions across corporate invoicing, FX, and schedules.
              </p>
            </div>
            
            {/* Tab Swapping */}
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
              <button 
                className={`btn text-xs py-1.5 px-4 ${activeTab === 'workspace' ? 'primary' : 'text-secondary'}`}
                onClick={() => setActiveTab('workspace')}
              >
                <Activity size={12} className="mr-1.5 inline-block" /> Planner Workspace
              </button>
              <button 
                className={`btn text-xs py-1.5 px-4 ${activeTab === 'registry' ? 'primary' : 'text-secondary'}`}
                onClick={() => setActiveTab('registry')}
              >
                <Cpu size={12} className="mr-1.5 inline-block" /> ERC-8004 Directory
              </button>
            </div>
          </div>

          {activeTab === 'workspace' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1.1fr', gap: '24px', alignItems: 'start' }}>
              
              {/* Left Side: Active Workspace */}
              <div className="flex flex-col gap-6">
                
                {/* SUGGESTIONS Presets */}
                <div className="card">
                  <div className="card-body" style={{ padding: '16px' }}>
                    <span className="text-xs font-semibold text-secondary flex items-center gap-1.5 mb-2.5">
                      <Brain size={12} className="text-primary" /> SUGGESTED AGENT WORKFLOW GOALS
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => setGoal(s.text)}
                          className="btn text-xs bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left py-1.5 px-3 rounded-lg flex items-center justify-between"
                          style={{ textTransform: 'none', transition: 'all 0.2s ease', fontWeight: 'normal' }}
                        >
                          <span>{s.label}</span>
                          <ChevronRight size={12} className="text-secondary ml-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* GOAL INPUT PANEL */}
                <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, var(--primary) 0%, var(--success) 100%)' }} />
                  
                  <div className="card-body">
                    <form onSubmit={handleExecuteGoal} className="flex flex-col gap-4">
                      
                      <div className="flex justify-between items-center flex-wrap gap-3">
                        <label className="form-label font-bold flex items-center gap-1.5" style={{ margin: 0 }}>
                          <Zap size={14} className="text-primary" /> Define AI Agent Goal
                        </label>
                        
                        {/* LLM Model Provider Controller */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-secondary font-medium">Provider:</span>
                          <div className="capsule-select-container">
                            <button
                              type="button"
                              onClick={() => setProvider('openai')}
                              className={`capsule-select-btn font-mono font-bold ${provider === 'openai' ? 'active' : ''}`}
                              style={{ fontSize: '10px', padding: '4px 10px' }}
                            >
                              OpenAI gpt-4o-mini
                            </button>
                            <button
                              type="button"
                              onClick={() => setProvider('deepseek')}
                              className={`capsule-select-btn font-mono font-bold ${provider === 'deepseek' ? 'active' : ''}`}
                              style={{ fontSize: '10px', padding: '4px 10px' }}
                            >
                              DeepSeek v4-flash
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <textarea
                          className="input-notion w-full"
                          rows={3}
                          placeholder="Describe corporate action to execute (e.g. 'Query quote and swap 10 USDC to EURC using FX swap, then screen 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 for OFAC safety')"
                          value={goal}
                          onChange={(e) => setGoal(e.target.value)}
                          disabled={executing}
                          style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '12px' }}
                        />
                      </div>

                      <div className="flex justify-between items-center flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-xs text-secondary">
                            <Shield size={12} className="text-success" /> Sanctions Screening: <strong>AUTO</strong>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-secondary">
                            <Lock size={12} className="text-primary" /> Verification Gate: <strong>ACTIVE</strong>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={executing || !isConnected}
                          className="btn primary flex items-center justify-center gap-2 px-6"
                        >
                          {executing ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" /> Thinking & Running...
                            </>
                          ) : (
                            <>
                              <Send size={14} /> Start Agent Planner
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* TIMELINE & EXECUTION WORKSPACE */}
                {goalStatus !== 'IDLE' && (
                  <div className="card">
                    <div className="card-header flex justify-between items-center">
                      <h2 className="flex items-center gap-2">
                        <Activity size={18} className="text-primary" /> Active Planner Execution Workspace
                      </h2>
                      <span className={`badge ${goalStatus === 'COMPLETED' ? 'success' : goalStatus === 'FAILED' ? 'danger' : 'primary animate-pulse'}`}>
                        {goalStatus}
                      </span>
                    </div>
                    <div className="card-body flex flex-col gap-4">
                      
                      {/* Timeline Steps */}
                      <div className="flex flex-col gap-3">
                        {steps.length === 0 ? (
                          <div className="text-center py-6 text-secondary flex flex-col items-center gap-2">
                            <Brain className="animate-pulse text-primary" size={24} />
                            <span className="text-xs">Generating plan breakdown...</span>
                          </div>
                        ) : (
                          steps.map((s, idx) => (
                            <div 
                              key={idx} 
                              style={{ 
                                border: '1px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                padding: '14px',
                                borderRadius: '8px'
                              }}
                            >
                              <div className="flex justify-between items-start flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    s.status === 'SUCCESS' ? 'bg-success text-black' : s.status === 'FAILED' ? 'bg-danger text-white' : 'bg-primary text-black animate-pulse'
                                  }`}>
                                    {s.stepNumber}
                                  </div>
                                  <strong className="text-slate-100 text-sm font-mono">{s.toolName}</strong>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  s.status === 'SUCCESS' ? 'bg-success/20 text-success' : s.status === 'FAILED' ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary'
                                }`}>
                                  {s.status}
                                </span>
                              </div>

                              <div className="mt-2 text-xs text-secondary pl-8">
                                <strong className="text-primary">Reasoning thought:</strong> "{s.reasoning}"
                              </div>

                              <div className="mt-1 text-xs text-secondary pl-8">
                                <strong className="text-primary">Execution detail:</strong> {s.description}
                              </div>

                              {s.result && (
                                <div className="mt-2 pl-8">
                                  <pre className="text-[11px] font-mono text-success p-2.5 rounded border overflow-x-auto max-h-40" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                                    {JSON.stringify(JSON.parse(s.result), null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Final Summary Card */}
                      {summary && (
                        <div className={`p-4 rounded-lg border ${goalStatus === 'COMPLETED' ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
                          <strong className={`text-xs font-semibold flex items-center gap-1.5 mb-1.5 ${goalStatus === 'COMPLETED' ? 'text-success' : 'text-danger'}`}>
                            {goalStatus === 'COMPLETED' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} 
                            Execution Outcome Summary
                          </strong>
                          <p className="text-sm text-slate-200 leading-relaxed font-mono whitespace-pre-line" style={{ margin: 0 }}>
                            {summary}
                          </p>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* LIVE COGNITIVE FEED LOGS */}
                <div className="card">
                  <div className="card-header flex justify-between items-center">
                    <h2 className="flex items-center gap-2">
                      <Terminal size={18} className="text-primary" /> Live Tool Activity & Output Log Feed
                    </h2>
                    <button 
                      onClick={() => setLogs([])}
                      className="btn sm flex items-center gap-1"
                    >
                      <Trash2 size={10} /> Clear Logs
                    </button>
                  </div>
                  <div className="card-body">
                    <div 
                      className="text-mono text-xs p-4 rounded border" 
                      style={{ height: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                    >
                      {logs.length === 0 ? (
                        <p className="text-secondary text-center my-auto">Log console standby. Awaiting execution trigger...</p>
                      ) : (
                        logs.map((log, index) => (
                          <div 
                            key={index} 
                            style={{ 
                              borderLeft: log.startsWith('[Step') ? '2px solid var(--primary)' : log.startsWith('[Error') || log.startsWith('[Fatal') ? '2px solid var(--danger)' : log.startsWith('[System') ? '2px solid var(--success)' : '2px solid var(--border)',
                              paddingLeft: '8px' 
                            }}
                          >
                            <span className="text-slate-300">{log}</span>
                          </div>
                        ))
                      )}
                      <div ref={consoleEndRef} />
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Side: Memory Panel & History */}
              <div className="flex flex-col gap-6">
                
                {/* AGENT MEMORY PANEL */}
                <div className="card">
                  <div className="card-header">
                    <h2 className="flex items-center gap-2">
                      <Database size={18} className="text-primary" /> Long-term Agent Memory
                    </h2>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    {memories.length === 0 ? (
                      <div className="p-4 text-center text-xs text-secondary">
                        Memory database slot is currently empty.
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {memories.map((m, idx) => (
                          <div 
                            key={idx} 
                            style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}
                            className="flex justify-between items-center"
                          >
                            <div>
                              <span className="text-xs font-mono font-bold text-primary block">{m.key}</span>
                              <span className="text-xs text-slate-300 mt-1 block">{m.value}</span>
                            </div>
                            <Database size={14} className="text-secondary" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* PAST EXECUTION HISTORY */}
                <div className="card">
                  <div className="card-header flex justify-between items-center">
                    <h2 className="flex items-center gap-2">
                      <History size={18} className="text-primary" /> Task Execution History
                    </h2>
                    <button 
                      onClick={fetchHistory}
                      className="btn sm flex items-center gap-1"
                    >
                      <RefreshCw size={10} /> Reload
                    </button>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    {loadingHistory ? (
                      <div className="p-6 text-center text-xs text-secondary">
                        <RefreshCw className="animate-spin text-primary mx-auto mb-1.5" size={16} />
                        Retrieving records...
                      </div>
                    ) : historyList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-secondary">
                        No previous goal execution records found.
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {historyList.map((h) => (
                          <div 
                            key={h.id} 
                            onClick={() => {
                              setSelectedHistoryGoal(selectedHistoryGoal?.id === h.id ? null : h)
                            }}
                            className={`p-3 border-bottom hover:bg-[var(--bg-secondary)] cursor-pointer transition-all ${
                              selectedHistoryGoal?.id === h.id ? 'bg-[var(--bg-secondary)]' : ''
                            }`}
                            style={{ borderBottom: '1px solid var(--border)' }}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs text-slate-100 font-mono block font-bold leading-normal break-all">
                                {h.goal}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                h.status === 'COMPLETED' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                              }`}>
                                {h.status}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center mt-2.5">
                              <span className="text-[10px] text-tertiary font-mono">
                                {new Date(h.createdAt).toLocaleTimeString()}
                              </span>
                              <span className="text-[10px] text-secondary font-mono flex items-center gap-1">
                                {h.steps.length} steps <ChevronRight size={10} />
                              </span>
                            </div>

                            {selectedHistoryGoal?.id === h.id && (
                              <div className="mt-3 p-2 rounded border flex flex-col gap-2" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                                {h.steps.map((st: any) => (
                                  <div key={st.id} className="text-[11px] font-mono border-l-2 border-primary pl-2 py-0.5">
                                    <strong className="text-primary">{st.toolName}:</strong> {st.description}
                                    <div className="text-secondary italic mt-0.5">Thought: {st.reasoning}</div>
                                  </div>
                                ))}
                                {h.summary && (
                                  <div className="text-[11px] text-success font-mono mt-1 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                                    Summary: {h.summary}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* ERC-8004 Agent Registry Tab */
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
                        
                        <div className="mt-4 p-3 rounded-lg text-left" style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
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
                  {loadingAgents ? (
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
          )}

        </div>
      </div>
    </div>
  )
}
