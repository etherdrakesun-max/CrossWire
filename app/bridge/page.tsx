'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { createPublicClient, http, parseUnits, parseEventLogs, keccak256 } from 'viem'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { 
  ArrowRightLeft, 
  RefreshCcw, 
  Flame, 
  Shield, 
  Coins, 
  CheckCircle, 
  XCircle, 
  PartyPopper, 
  Plug, 
  Clock, 
  AlertTriangle, 
  Database,
  ArrowRight,
  ExternalLink
} from 'lucide-react'

import { erc20Abi } from '@/lib/contracts'
import { 
  tokenMessengerAbi, 
  messageTransmitterAbi, 
  addressToBytes32, 
  pollAttestation 
} from '@/lib/cctp-v2'
import { CCTP_CHAINS } from '@/lib/chains'

type BridgeStep = 'idle' | 'approve' | 'burn' | 'attest' | 'mint' | 'complete' | 'error'

export default function BridgePage() {
  const { address, isConnected, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()

  // Tab State: 'new' | 'resume'
  const [activeTab, setActiveTab] = useState<'new' | 'resume'>('new')

  // Bridge States
  const [sourceChain, setSourceChain] = useState<string>('Ethereum_Sepolia')
  const [amount, setAmount] = useState<string>('')
  const [step, setStep] = useState<BridgeStep>('idle')
  const [approveHash, setApproveHash] = useState<string>('')
  const [burnHash, setBurnHash] = useState<string>('')
  const [mintHash, setMintHash] = useState<string>('')
  const [attestationStatus, setAttestationStatus] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [sourceUsdcBalance, setSourceUsdcBalance] = useState<number | null>(null)

  // Resume States
  const [resumeBurnHash, setResumeBurnHash] = useState<string>('')
  const [resumeSourceChain, setResumeSourceChain] = useState<string>('Ethereum_Sepolia')

  // Debug payload viewer
  const [debugMessageBytes, setDebugMessageBytes] = useState<string>('')
  const [debugAttestation, setDebugAttestation] = useState<string>('')

  // Sync USDC balance on source chain
  useEffect(() => {
    async function updateBalance() {
      if (!address || !sourceChain) return
      try {
        const config = CCTP_CHAINS[sourceChain]
        const publicClient = createPublicClient({
          transport: http(config.rpcUrl)
        })
        const bal = await publicClient.readContract({
          address: config.usdcAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        setSourceUsdcBalance(Number(bal) / 1_000_000)
      } catch (err) {
        console.error('Error fetching source USDC balance:', err)
        setSourceUsdcBalance(null)
      }
    }
    updateBalance()
    const interval = setInterval(updateBalance, 10000)
    return () => clearInterval(interval)
  }, [address, sourceChain, step])

  // Execute clean CCTP Mint on Arc Testnet
  const executeMint = async (messageBytes: `0x${string}`, attestationSig: string) => {
    setStep('mint')
    toast.loading('Minting USDC on Arc Testnet...', { id: 'bridge' })

    const arcConfig = CCTP_CHAINS.Arc_Testnet
    
    // Switch chain if active wallet is on wrong network
    if (chainId !== arcConfig.id) {
      toast.loading('Switching wallet to Arc Testnet...', { id: 'bridge' })
      await switchChainAsync({ chainId: arcConfig.id })
    }

    // Retrieve refreshed walletClient targeting Arc
    if (!walletClient) {
      throw new Error('Wallet not connected. Connect and verify account.')
    }

    const claimHash = await walletClient.writeContract({
      address: arcConfig.messageTransmitter,
      abi: messageTransmitterAbi,
      functionName: 'receiveMessage',
      args: [messageBytes, attestationSig as `0x${string}`],
      account: address!,
    })

    setMintHash(claimHash)

    const arcPublicClient = createPublicClient({
      transport: http(arcConfig.rpcUrl)
    })

    await arcPublicClient.waitForTransactionReceipt({ hash: claimHash })
    setStep('complete')
    toast.success('USDC Successfully Minted on Arc!', { id: 'bridge' })
  }

  // Handle new bridge initiation
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
      const chainConfig = CCTP_CHAINS[sourceChain]
      const amountParsed = parseUnits(amount, 6)

      // Ensure wallet is on correct source chain first
      if (chainId !== chainConfig.id) {
        toast.loading(`Switching wallet to ${chainConfig.name}...`, { id: 'bridge' })
        await switchChainAsync({ chainId: chainConfig.id })
      }

      setStep('approve')
      toast.loading('Approving TokenMessenger to burn USDC...', { id: 'bridge' })

      // Write Approval
      const appHash = await walletClient!.writeContract({
        address: chainConfig.usdcAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [chainConfig.tokenMessenger, amountParsed],
        account: address!,
      })
      setApproveHash(appHash)

      const sourcePublicClient = createPublicClient({
        transport: http(chainConfig.rpcUrl)
      })

      await sourcePublicClient.waitForTransactionReceipt({ hash: appHash })
      toast.success('USDC approved for burn')

      // Burn USDC
      setStep('burn')
      toast.loading('Burning USDC on source chain...', { id: 'bridge' })

      const mintRecipient = addressToBytes32(address)
      const destinationCaller = addressToBytes32('0x0000000000000000000000000000000000000000')
      const maxFee = 0n
      const minFinalityThreshold = 2000 // Standard hard finality CCTP transfer

      const bHash = await walletClient!.writeContract({
        address: chainConfig.tokenMessenger,
        abi: tokenMessengerAbi,
        functionName: 'depositForBurn',
        args: [
          amountParsed,
          CCTP_CHAINS.Arc_Testnet.cctpDomain, // 26
          mintRecipient,
          chainConfig.usdcAddress,
          destinationCaller,
          maxFee,
          minFinalityThreshold
        ],
        account: address!,
      })
      setBurnHash(bHash)

      const burnReceipt = await sourcePublicClient.waitForTransactionReceipt({ hash: bHash })
      toast.success('USDC burn receipt confirmed')

      // Parse Burn Receipt Logs
      setStep('attest')
      toast.loading('Parsing transaction logs for message...', { id: 'bridge' })

      const logs = parseEventLogs({
        abi: messageTransmitterAbi,
        logs: burnReceipt.logs,
        eventName: 'MessageSent'
      })

      if (!logs || logs.length === 0) {
        throw new Error('MessageSent event log not found in burn transaction receipt.')
      }

      const messageBytes = logs[0].args.message
      setDebugMessageBytes(messageBytes)

      const messageHash = keccak256(messageBytes)

      // Poll Iris sandbox attestation
      setAttestationStatus('Querying Circle validators...')
      const attestationSig = await pollAttestation(messageHash, (status) => {
        setAttestationStatus(status)
      })

      setDebugAttestation(attestationSig)
      toast.success('Circle validator attestation retrieved!')

      // Mint USDC
      await executeMint(messageBytes, attestationSig)
    } catch (err: any) {
      console.error('Bridge error:', err)
      setStep('error')
      setErrorMessage(err.message || 'CCTP Bridge transaction failed')
      toast.error(err.message || 'Bridge transaction failed', { id: 'bridge' })
    }
  }

  // Handle Resume for Error Recovery
  const handleResume = async () => {
    if (!resumeBurnHash.startsWith('0x') || resumeBurnHash.length !== 66) {
      toast.error('Enter a valid 66-character transaction hash')
      return
    }

    setStep('attest')
    setBurnHash(resumeBurnHash)
    setApproveHash('')
    setMintHash('')
    toast.loading('Retrieving source burn transaction receipt...', { id: 'bridge' })

    try {
      const chainConfig = CCTP_CHAINS[resumeSourceChain]
      const sourcePublicClient = createPublicClient({
        transport: http(chainConfig.rpcUrl)
      })

      const receipt = await sourcePublicClient.getTransactionReceipt({ hash: resumeBurnHash as `0x${string}` })
      
      const logs = parseEventLogs({
        abi: messageTransmitterAbi,
        logs: receipt.logs,
        eventName: 'MessageSent'
      })

      if (!logs || logs.length === 0) {
        throw new Error('MessageSent event not found in receipt. Verify this transaction is a valid CCTP burn.')
      }

      const messageBytes = logs[0].args.message
      setDebugMessageBytes(messageBytes)

      const messageHash = keccak256(messageBytes)

      setAttestationStatus('Polling Iris API for attestation...')
      const attestationSig = await pollAttestation(messageHash, (status) => {
        setAttestationStatus(status)
      })

      setDebugAttestation(attestationSig)
      toast.success('Circle validator attestation retrieved!')

      // Mint USDC on Arc
      await executeMint(messageBytes, attestationSig)
    } catch (err: any) {
      console.error('Resume error:', err)
      setStep('error')
      setErrorMessage(err.message || 'Verification or attestation retrieval failed')
      toast.error(err.message || 'Verification or attestation retrieval failed', { id: 'bridge' })
    }
  }

  const resetBridge = () => {
    setStep('idle')
    setAmount('')
    setApproveHash('')
    setBurnHash('')
    setMintHash('')
    setAttestationStatus('')
    setErrorMessage('')
    setDebugMessageBytes('')
    setDebugAttestation('')
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
          <h1 className="flex items-center gap-3">
            <ArrowRightLeft size={32} strokeWidth={1.5} className="text-primary" />
            CCTP V2 Bridge
          </h1>
          <p className="text-muted text-sm" style={{ marginBottom: '20px' }}>
            Bridge native USDC directly using Circle's V2 Cross-Chain Transfer Protocol burn-and-mint mechanism.
          </p>

          <div className="tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <button 
              className={`btn ${activeTab === 'new' ? 'primary' : 'secondary'}`} 
              onClick={() => { setActiveTab('new'); resetBridge(); }}
            >
              Bridge Assets
            </button>
            <button 
              className={`btn ${activeTab === 'resume' ? 'primary' : 'secondary'}`} 
              onClick={() => { setActiveTab('resume'); resetBridge(); }}
            >
              Resume Existing Transfer
            </button>
          </div>

          {/* Bridge Pipeline Visualization */}
          {step !== 'idle' && (
            <div className="pipeline card" style={{ marginBottom: '32px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className={`pipeline-step ${getStepClass(step, 'approve', ['burn', 'attest', 'mint', 'complete'])}`}>
                  <div className="pipeline-dot"><Shield size={16} strokeWidth={1.5} /></div>
                  <div className="pipeline-label">Approve Spend</div>
                </div>
                <div className={`pipeline-line ${['burn', 'attest', 'mint', 'complete'].includes(step) ? 'completed' : step === 'approve' ? 'active' : ''}`} />
                
                <div className={`pipeline-step ${getStepClass(step, 'burn', ['attest', 'mint', 'complete'])}`}>
                  <div className="pipeline-dot"><Flame size={16} strokeWidth={1.5} /></div>
                  <div className="pipeline-label">Burn USDC</div>
                </div>
                <div className={`pipeline-line ${['attest', 'mint', 'complete'].includes(step) ? 'completed' : step === 'burn' ? 'active' : ''}`} />
                
                <div className={`pipeline-step ${getStepClass(step, 'attest', ['mint', 'complete'])}`}>
                  <div className="pipeline-dot"><RefreshCcw size={16} strokeWidth={1.5} /></div>
                  <div className="pipeline-label">Attestation</div>
                </div>
                <div className={`pipeline-line ${['mint', 'complete'].includes(step) ? 'completed' : step === 'attest' ? 'active' : ''}`} />
                
                <div className={`pipeline-step ${getStepClass(step, 'mint', ['complete'])}`}>
                  <div className="pipeline-dot"><Coins size={16} strokeWidth={1.5} /></div>
                  <div className="pipeline-label">Mint on Arc</div>
                </div>
                <div className={`pipeline-line ${step === 'complete' ? 'completed' : ''}`} />
                
                <div className={`pipeline-step ${step === 'complete' ? 'completed' : ''}`}>
                  <div className="pipeline-dot"><CheckCircle size={16} strokeWidth={1.5} /></div>
                  <div className="pipeline-label">Complete</div>
                </div>
              </div>
            </div>
          )}

          {/* Live Pipeline Transaction & Payload Logs */}
          {step !== 'idle' && step !== 'error' && step !== 'complete' && (
            <div className="card animate-slide-up" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>CCTP Bridge Pipeline Console</span>
                <span className="badge purple">Running</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  {approveHash && (
                    <div>
                      <div className="text-xs text-muted">Approval Hash</div>
                      <a href={`${CCTP_CHAINS[activeTab === 'new' ? sourceChain : resumeSourceChain].explorerUrl}/tx/${approveHash}`} target="_blank" rel="noopener noreferrer" className="explorer-link flex items-center gap-1 text-mono text-xs">
                        {approveHash.slice(0, 10)}...{approveHash.slice(-8)} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {burnHash && (
                    <div>
                      <div className="text-xs text-muted">Burn Tx Hash</div>
                      <a href={`${CCTP_CHAINS[activeTab === 'new' ? sourceChain : resumeSourceChain].explorerUrl}/tx/${burnHash}`} target="_blank" rel="noopener noreferrer" className="explorer-link flex items-center gap-1 text-mono text-xs">
                        {burnHash.slice(0, 10)}...{burnHash.slice(-8)} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {mintHash && (
                    <div>
                      <div className="text-xs text-muted">Mint Tx Hash</div>
                      <a href={`${CCTP_CHAINS.Arc_Testnet.explorerUrl}/tx/${mintHash}`} target="_blank" rel="noopener noreferrer" className="explorer-link flex items-center gap-1 text-mono text-xs">
                        {mintHash.slice(0, 10)}...{mintHash.slice(-8)} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>

                {attestationStatus && (
                  <div className="callout" style={{ background: 'rgba(35, 131, 226, 0.05)', borderColor: 'var(--primary)' }}>
                    <span className="callout-icon text-primary"><RefreshCcw size={20} className="animate-spin" /></span>
                    <div>
                      <strong>CCTP Attestation Pipeline</strong>
                      <p className="text-muted text-xs mt-1">{attestationStatus}</p>
                    </div>
                  </div>
                )}

                {/* Collapsible Payload Debugger */}
                {(debugMessageBytes || debugAttestation) && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <h5 style={{ margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }} className="text-muted">
                      Advanced Debug payloads
                    </h5>
                    {debugMessageBytes && (
                      <div style={{ marginBottom: '8px' }}>
                        <div className="text-xs text-muted">Message Hex Bytes</div>
                        <pre style={{ margin: 0, padding: '8px', fontSize: '10px', background: 'var(--border)', borderRadius: '4px', overflowX: 'auto', maxBlockSize: '100px' }} className="text-mono">
                          {debugMessageBytes}
                        </pre>
                      </div>
                    )}
                    {debugAttestation && (
                      <div>
                        <div className="text-xs text-muted">Attestation Signature</div>
                        <pre style={{ margin: 0, padding: '8px', fontSize: '10px', background: 'var(--border)', borderRadius: '4px', overflowX: 'auto', maxBlockSize: '100px' }} className="text-mono">
                          {debugAttestation}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: New Bridge Flow */}
          {activeTab === 'new' && step === 'idle' && (
            <div className="card animate-slide-up" style={{ maxWidth: '540px' }}>
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>CCTP Bridge configuration</span>
                <span className="badge green">V2 Production Flow</span>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Source Network</label>
                  <select
                    className="input-notion"
                    value={sourceChain}
                    onChange={(e) => setSourceChain(e.target.value)}
                  >
                    {Object.keys(CCTP_CHAINS).filter(k => k !== 'Arc_Testnet').map((key) => (
                      <option key={key} value={key}>
                        {CCTP_CHAINS[key].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Destination Network</label>
                  <input
                    className="input-notion"
                    value="Arc Testnet (Domain ID: 26)"
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>

                <div className="form-group">
                  <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>USDC Amount</label>
                    {isConnected && sourceUsdcBalance !== null && (
                      <span className="text-xs text-secondary">
                        Balance: <strong style={{ color: 'var(--accent)' }}>{sourceUsdcBalance.toFixed(2)} USDC</strong>
                      </span>
                    )}
                  </div>
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

                <div className="callout" style={{ marginBottom: '20px' }}>
                  <span className="callout-icon"><Clock size={20} strokeWidth={1.5} /></span>
                  <div>
                    <strong>CCTP V2 Standard Finality Time</strong>
                    <p className="text-muted text-xs mt-1">
                      Ethereum Sepolia requires hard block finality (~12-15 minutes) before Iris signs the attestation. Base & Arbitrum Sepolia settle in ~2-3 minutes.
                    </p>
                  </div>
                </div>

                <button
                  className="btn primary lg flex items-center justify-center gap-2"
                  onClick={handleBridge}
                  disabled={!isConnected}
                  style={{ width: '100%', background: 'var(--accent)', border: 'none' }}
                >
                  {isConnected ? (
                    <><ArrowRightLeft size={16} strokeWidth={1.5} /> Initiate CCTP Burn & Mint</>
                  ) : (
                    <><Plug size={16} strokeWidth={1.5} /> Connect Wallet First</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Resume / Error Recovery Flow */}
          {activeTab === 'resume' && step === 'idle' && (
            <div className="card animate-slide-up" style={{ maxWidth: '540px' }}>
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>Resume Existing Bridge Transfer</span>
                <span className="badge purple">Error Recovery</span>
              </div>
              <div className="card-body">
                <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
                  If your internet disconnected or the browser closed mid-bridge, insert your source burn transaction hash below. The protocol will re-verify the transaction details, query Circle's attestation, and prompt you to mint on Arc.
                </p>

                <div className="form-group">
                  <label className="form-label">Source Network of Burn Tx</label>
                  <select
                    className="input-notion"
                    value={resumeSourceChain}
                    onChange={(e) => setResumeSourceChain(e.target.value)}
                  >
                    {Object.keys(CCTP_CHAINS).filter(k => k !== 'Arc_Testnet').map((key) => (
                      <option key={key} value={key}>
                        {CCTP_CHAINS[key].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Burn Transaction Hash</label>
                  <input
                    className="input-notion"
                    placeholder="0x..."
                    value={resumeBurnHash}
                    onChange={(e) => setResumeBurnHash(e.target.value)}
                  />
                </div>

                <button
                  className="btn primary lg flex items-center justify-center gap-2"
                  onClick={handleResume}
                  disabled={!isConnected}
                  style={{ width: '100%', background: 'var(--accent)', border: 'none' }}
                >
                  {isConnected ? (
                    <><Database size={16} strokeWidth={1.5} /> Verify & Complete Mint</>
                  ) : (
                    <><Plug size={16} strokeWidth={1.5} /> Connect Wallet First</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <div className="card animate-slide-up" style={{ maxWidth: '540px' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: '32px' }}>
                <div className="flex justify-center mb-4 text-danger" style={{ color: 'var(--error)' }}>
                  <XCircle size={48} strokeWidth={1} />
                </div>
                <h3>Bridge Operation Interrupted</h3>
                <p className="text-muted text-xs" style={{ marginBottom: '20px', lineHeight: 1.5 }}>
                  {errorMessage || 'An error occurred during CCTP validation or client writes.'}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn secondary" onClick={() => setActiveTab('resume')}>Go to Resume Tab</button>
                  <button className="btn primary" onClick={resetBridge}>Try Again</button>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {step === 'complete' && (
            <div className="card animate-slide-up" style={{ maxWidth: '540px' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: '32px' }}>
                <div className="flex justify-center mb-4 text-success" style={{ color: 'var(--success)' }}>
                  <PartyPopper size={48} strokeWidth={1} />
                </div>
                <h3>Bridge Complete!</h3>
                <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
                  Your USDC has been successfully burned on the source chain and minted natively on Arc Testnet via CCTP.
                </p>
                
                {mintHash && (
                  <div style={{ background: 'var(--border)', borderRadius: '6px', padding: '12px', marginBottom: '24px', textAlign: 'left' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>Arc Settlement Transaction</div>
                    <a href={`${CCTP_CHAINS.Arc_Testnet.explorerUrl}/tx/${mintHash}`} target="_blank" rel="noopener noreferrer" className="explorer-link flex items-center gap-1 text-mono text-xs" style={{ color: 'var(--accent)' }}>
                      {mintHash} <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                <button className="btn primary" onClick={resetBridge}>Bridge More Assets</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
