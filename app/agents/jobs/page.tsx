'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import toast from 'react-hot-toast'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'
import { erc20Abi, crossWireAgentAbi } from '@/lib/contracts'
import { USDC_ADDRESS, CROSSWIRE_CONTRACT_ADDRESS, CROSSWIRE_AGENT_CONTRACT_ADDRESS, getExplorerTxUrl } from '@/lib/arc-config'
import { parseUnits, keccak256, encodePacked, encodeFunctionData } from 'viem'
import { 
  Briefcase, 
  Plus, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  Play, 
  Send,
  FileCode,
  Shield,
  Coins,
  Cpu,
  Clock
} from 'lucide-react'

export default function JobsBoardPage() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  // State
  const [agents, setAgents] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Job Creation Form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [amount, setAmount] = useState('250.00')
  const [creating, setCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<'board' | 'create'>('board')

  // Execution modal/state
  const [proofUri, setProofUri] = useState('')
  const [submittingProofFor, setSubmittingProofFor] = useState<number | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const agentsRes = await fetch('/api/agents')
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        setAgents(agentsData)
        if (agentsData.length > 0) {
          setSelectedAgent(agentsData[0].address)
        }
      }

      const jobsRes = await fetch('/api/agents/jobs')
      if (jobsRes.ok) {
        setJobs(await jobsRes.json())
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load escrow jobs board data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Create Escrow Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !address) {
      toast.error('Please connect your corporate wallet')
      return
    }
    if (!selectedAgent || !title || !amount) {
      toast.error('Please complete all form fields')
      return
    }

    setCreating(true)
    const amountParsed = parseUnits(amount, 6)

    try {
      let txHash = ''

      if (walletClient && publicClient) {
        // Check allowance first for CrossWireAgent contract
        const currentAllowance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, CROSSWIRE_AGENT_CONTRACT_ADDRESS],
        }) as bigint

        if (currentAllowance < amountParsed) {
          toast.loading('Approving USDC Escrow Deposit...', { id: 'escrow-toast' })
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [CROSSWIRE_AGENT_CONTRACT_ADDRESS, amountParsed],
          })
          const approveHash = await walletClient.request({
            method: 'eth_sendTransaction',
            params: [{
              from: address,
              to: USDC_ADDRESS,
              data: approveData,
            }]
          })
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
        }
        
        toast.loading('Locking escrow funds on Arc...', { id: 'escrow-toast' })
        const jobHash = keccak256(
          encodePacked(
            ['string', 'uint256'],
            [title, BigInt(Date.now())]
          )
        )
        const createJobData = encodeFunctionData({
          abi: crossWireAgentAbi,
          functionName: 'createJob',
          args: [jobHash, selectedAgent as `0x${string}`, amountParsed],
        })
        const createJobTx = await walletClient.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: CROSSWIRE_AGENT_CONTRACT_ADDRESS,
            data: createJobData,
          }]
        })
        const receipt = await publicClient.waitForTransactionReceipt({ hash: createJobTx })
        txHash = receipt.transactionHash
        toast.success('Funds successfully locked in ERC-8183 escrow on-chain!', { id: 'escrow-toast' })
      } else {
        toast.error('Wallet or publicClient not ready.')
        return
      }

      const res = await fetch('/api/agents/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          clientAddr: address,
          agentAddr: selectedAgent,
          amount,
          txHash
        })
      })

      if (res.ok) {
        toast.success('Escrow job created successfully!')
        setTitle('')
        setDescription('')
        setActiveTab('board')
        fetchData()
      } else {
        const errData = await res.json()
        toast.error(errData.error || 'Failed to create job')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Error occurred during job deployment: ${err.message || err}`, { id: 'escrow-toast' })
    } finally {
      setCreating(false)
    }
  }

  // Submit deliverables proof as Agent
  const handleSubmitProof = async (jobId: number) => {
    if (!proofUri) {
      toast.error('Deliverables URI proof is required')
      return
    }

    try {
      let txHash = ''
      const targetJob = jobs.find(j => j.id === jobId)

      if (walletClient && publicClient && targetJob) {
        const jobHash = keccak256(
          encodePacked(
            ['string', 'uint256'],
            [targetJob.title, BigInt(new Date(targetJob.createdAt).getTime())]
          )
        )
        toast.loading('Submitting proof on-chain...', { id: 'proof-toast' })
        const submitProofData = encodeFunctionData({
          abi: crossWireAgentAbi,
          functionName: 'submitProof',
          args: [jobHash, proofUri],
        })
        const proofTx = await walletClient.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: CROSSWIRE_AGENT_CONTRACT_ADDRESS,
            data: submitProofData,
          }]
        })
        const receipt = await publicClient.waitForTransactionReceipt({ hash: proofTx })
        txHash = receipt.transactionHash
        toast.success('Proof successfully recorded on Arc!', { id: 'proof-toast' })
      } else {
        toast.error('Wallet connected is required to sign deliverables proof on-chain', { id: 'proof-toast' })
        return
      }

      const res = await fetch('/api/agents/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: jobId,
          status: 'SUBMITTED',
          proofOfWork: proofUri,
          txHash: txHash || undefined
        })
      })

      if (res.ok) {
        toast.success('Deliverables submitted successfully')
        setSubmittingProofFor(null)
        setProofUri('')
        fetchData()
      } else {
        toast.error('Failed to submit proof')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Error submitting proof: ${err.message || err}`, { id: 'proof-toast' })
    }
  }

  // Settle & Release Escrow
  const handleRelease = async (job: any) => {
    try {
      toast.loading('Initiating wire transfer to Agent...', { id: 'release-toast' })
      let txHash = ''

      if (walletClient && publicClient) {
        const jobHash = keccak256(
          encodePacked(
            ['string', 'uint256'],
            [job.title, BigInt(new Date(job.createdAt).getTime())]
          )
        )
        const releaseEscrowData = encodeFunctionData({
          abi: crossWireAgentAbi,
          functionName: 'releaseEscrow',
          args: [jobHash],
        })
        const releaseTx = await walletClient.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: CROSSWIRE_AGENT_CONTRACT_ADDRESS,
            data: releaseEscrowData,
          }]
        })
        const receipt = await publicClient.waitForTransactionReceipt({ hash: releaseTx })
        txHash = receipt.transactionHash
      } else {
        toast.error('Wallet connected is required to release escrow on-chain', { id: 'release-toast' })
        return
      }

      // Call API to execute settlement
      const res = await fetch('/api/agents/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          status: 'APPROVED',
          txHash
        })
      })

      if (res.ok) {
        toast.success('Escrow released! USDC transfer completed.', { id: 'release-toast' })
        fetchData()
      } else {
        toast.error('Failed to release escrow', { id: 'release-toast' })
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Error executing escrow release: ${err.message || err}`, { id: 'release-toast' })
    }
  }

  // Dispute Escrow Job
  const handleDispute = async (jobId: number) => {
    try {
      let txHash = ''
      const targetJob = jobs.find(j => j.id === jobId)

      if (walletClient && publicClient && targetJob) {
        const jobHash = keccak256(
          encodePacked(
            ['string', 'uint256'],
            [targetJob.title, BigInt(new Date(targetJob.createdAt).getTime())]
          )
        )
        toast.loading('Filing dispute on-chain...', { id: 'dispute-toast' })
        const disputeJobData = encodeFunctionData({
          abi: crossWireAgentAbi,
          functionName: 'disputeJob',
          args: [jobHash],
        })
        const disputeTx = await walletClient.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: CROSSWIRE_AGENT_CONTRACT_ADDRESS,
            data: disputeJobData,
          }]
        })
        const receipt = await publicClient.waitForTransactionReceipt({ hash: disputeTx })
        txHash = receipt.transactionHash
        toast.success('Dispute registered on-chain!', { id: 'dispute-toast' })
      } else {
        toast.error('Wallet connected is required to dispute on-chain', { id: 'dispute-toast' })
        return
      }

      const res = await fetch('/api/agents/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: jobId,
          status: 'DISPUTED',
          txHash: txHash || undefined
        })
      })

      if (res.ok) {
        toast.success('Dispute filed. Reputation score penalized.')
        fetchData()
      } else {
        toast.error('Failed to dispute job')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Error occurred filing dispute: ${err.message || err}`, { id: 'dispute-toast' })
    }
  }

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">

          <div className="flex justify-between items-start" style={{ marginBottom: '24px' }}>
            <div>
              <h1 className="flex items-center gap-3">
                <Briefcase size={32} strokeWidth={1.5} className="text-primary" />
                Escrow Job Settlement Board (ERC-8183)
              </h1>
              <p className="text-muted text-sm mt-1">
                Post automated task jobs with locked USDC deposits. Settle payouts gaslessly when AI agents submit proof of work.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('board')} 
                className={`btn ${activeTab === 'board' ? 'primary' : 'secondary'}`}
              >
                Jobs Directory
              </button>
              {isConnected && (
                <button 
                  onClick={() => setActiveTab('create')} 
                  className={`btn ${activeTab === 'create' ? 'primary' : 'secondary'}`}
                >
                  <Plus size={14} /> Post Job Escrow
                </button>
              )}
            </div>
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreateJob} className="card max-w-2xl mx-auto">
              <div className="card-header">
                <h2>Deploy New Job Escrow (ERC-8183)</h2>
              </div>
              <div className="card-body flex flex-col gap-4">
                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input
                    type="text"
                    className="input-notion"
                    placeholder="e.g. Process Weekly Payroll Audit"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Job Task Description</label>
                  <textarea
                    rows={4}
                    className="input-notion"
                    placeholder="Describe tasks, constraints, deliverables, and expected proof..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Assign AI Agent Address</label>
                    <select
                      className="input-notion"
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      required
                    >
                      {agents.length === 0 ? (
                        <option value="">No agents registered</option>
                      ) : (
                        agents.map(agent => (
                          <option key={agent.id} value={agent.address}>
                            {agent.name} ({agent.address.slice(0, 6)}...)
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Escrow Funding Amount (USDC)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-notion"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-4">
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('board')} 
                    className="btn secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={creating || agents.length === 0} 
                    className="btn primary"
                  >
                    {creating ? 'Locking Escrow Deposit...' : 'Lock Funds & Post'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="card">
              <div className="card-header">
                <h2>Job Execution Directory</h2>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <Clock className="animate-spin text-primary mx-auto mb-2" />
                    <p className="text-xs text-secondary">Loading directory index...</p>
                  </div>
                ) : jobs.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <p>No escrow jobs are posted on the board yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {jobs.map((job) => {
                      const isAssignedAgent = address && job.agentAddr.toLowerCase() === address.toLowerCase()
                      const isClient = address && job.clientAddr.toLowerCase() === address.toLowerCase()
                      
                      return (
                        <div 
                          key={job.id} 
                          style={{ 
                            padding: '24px', 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'grid',
                            gridTemplateColumns: '3fr 1.5fr',
                            gap: '24px',
                            alignItems: 'start'
                          }}
                        >
                          <div>
                            <div className="flex items-center gap-3">
                              <span className={`badge ${
                                job.status === 'APPROVED' ? 'success' :
                                job.status === 'SUBMITTED' ? 'info' :
                                job.status === 'DISPUTED' ? 'danger' :
                                'warning'
                              }`}>
                                {job.status}
                              </span>
                              <strong className="text-lg text-slate-100">{job.title}</strong>
                            </div>

                            <p className="text-sm text-secondary mt-2">{job.description}</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                              <div>
                                <span className="text-xs text-secondary block">Client:</span>
                                <span className="text-xs font-mono text-slate-100">{job.clientAddr.slice(0, 10)}...{job.clientAddr.slice(-8)}</span>
                              </div>
                              <div>
                                <span className="text-xs text-secondary block">Assigned Agent:</span>
                                <span className="text-xs font-mono text-slate-100">{job.agent.name} ({job.agentAddr.slice(0, 8)}...)</span>
                              </div>
                            </div>

                            {job.proofOfWork && (
                              <div className="mt-4 p-3 bg-slate-950 rounded-lg" style={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <span className="text-xs text-success font-semibold flex items-center gap-1">
                                  <FileCode size={12} /> Deliverable Proof of Work
                                </span>
                                <p className="text-xs font-mono text-secondary mt-1 block break-all">{job.proofOfWork}</p>
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'between', height: '100%' }}>
                            <div>
                              <span className="text-xs text-secondary block">Escrow Amount</span>
                              <strong className="text-xl font-bold text-primary">{job.amount} USDC</strong>
                            </div>

                            {/* Action Operations */}
                            <div className="flex justify-end gap-2 mt-4">
                              {/* Agent Action: Submit Proof */}
                              {isAssignedAgent && job.status === 'CREATED' && (
                                <div style={{ width: '100%' }}>
                                  {submittingProofFor === job.id ? (
                                    <div className="flex flex-col gap-2 align-end">
                                      <input
                                        type="text"
                                        className="input-notion text-xs"
                                        placeholder="Deliverable Proof URL"
                                        value={proofUri}
                                        onChange={(e) => setProofUri(e.target.value)}
                                        style={{ width: '200px' }}
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <button 
                                          className="btn secondary btn-sm"
                                          onClick={() => setSubmittingProofFor(null)}
                                        >
                                          Cancel
                                        </button>
                                        <button 
                                          className="btn primary btn-sm"
                                          onClick={() => handleSubmitProof(job.id)}
                                        >
                                          Submit
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button 
                                      className="btn primary btn-sm flex items-center gap-1"
                                      onClick={() => setSubmittingProofFor(job.id)}
                                    >
                                      <Send size={12} /> Submit Deliverables
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Client Action: Settle / Dispute */}
                              {isClient && job.status === 'SUBMITTED' && (
                                <div className="flex gap-2">
                                  <button 
                                    className="btn danger btn-sm"
                                    onClick={() => handleDispute(job.id)}
                                  >
                                    <AlertTriangle size={12} /> Dispute
                                  </button>
                                  <button 
                                    className="btn success btn-sm flex items-center gap-1"
                                    onClick={() => handleRelease(job)}
                                  >
                                    <CheckCircle size={12} /> Release Escrow
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
