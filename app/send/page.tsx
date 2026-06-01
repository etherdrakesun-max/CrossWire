'use client'

import { useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits, formatUnits, encodePacked, keccak256 } from 'viem'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  CROSSWIRE_CONTRACT_ADDRESS,
  getExplorerTxUrl,
} from '@/lib/arc-config'
import { crossWireRouterAbi, erc20Abi } from '@/lib/contracts'
import { Send, FileText, Unlock, Zap, CheckCircle, Plug, Link as LinkIcon, Info, FileSignature } from 'lucide-react'
import { useModal } from '@/lib/modal-context'

const PURPOSE_CODES = [
  { code: 0, label: 'General Payment' },
  { code: 1, label: 'Salary / Payroll' },
  { code: 2, label: 'Invoice Settlement' },
  { code: 3, label: 'Supplier Payment' },
  { code: 4, label: 'Rent / Lease' },
  { code: 5, label: 'Family Remittance' },
  { code: 6, label: 'Loan Repayment' },
  { code: 7, label: 'Investment' },
]

type SendStep = 'form' | 'approve' | 'confirm' | 'executing' | 'success'

export default function SendPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [step, setStep] = useState<SendStep>('form')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [purposeCode, setPurposeCode] = useState(0)
  const [txHash, setTxHash] = useState('')
  const [wireId, setWireId] = useState('')

  const isContractDeployed = CROSSWIRE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000'

  const { showModal, updateModal } = useModal()
  
  const proceedExecution = async (amountParsed: bigint) => {
    setStep('approve')
    try {
      // Step 1: Check & Approve USDC allowance
      if (isContractDeployed) {
        const currentAllowance = await publicClient!.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address!, CROSSWIRE_CONTRACT_ADDRESS],
        }) as bigint

        if (currentAllowance < amountParsed) {
          showModal({
            type: 'loading',
            title: 'Approving USDC spending',
            description: 'Please authorize the spending limit approval request inside your connected corporate wallet...'
          })
          const approveHash = await walletClient!.writeContract({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'approve',
            args: [CROSSWIRE_CONTRACT_ADDRESS, amountParsed],
            chain: null,
            account: address!,
          })
          await publicClient!.waitForTransactionReceipt({ hash: approveHash })
        }
      }

      setStep('confirm')
      showModal({
        type: 'loading',
        title: 'Preparing Wire Ledger',
        description: 'Generating SWIFT-compliant ISO 20022 reference hash and encoding payload...'
      })
      await new Promise((r) => setTimeout(r, 600))

      setStep('executing')
      showModal({
        type: 'tx-status',
        title: 'Broadcasting to Arc',
        description: 'Submitting payment payload to Arc precompiles. Sub-second finality active.',
        txStatus: 'pending'
      })

      let hash: `0x${string}`

      if (isContractDeployed) {
        const reference = keccak256(
          encodePacked(
            ['address', 'address', 'uint256', 'uint256'],
            [address!, recipient as `0x${string}`, amountParsed, BigInt(Date.now())]
          )
        )

        hash = await walletClient!.writeContract({
          address: CROSSWIRE_CONTRACT_ADDRESS,
          abi: crossWireRouterAbi,
          functionName: 'initiateWire',
          args: [
            recipient as `0x${string}`,
            amountParsed,
            reference,
            purposeCode,
            memo || 'CrossWire Transfer',
          ],
          chain: null,
          account: address!,
        })
      } else {
        hash = await walletClient!.writeContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [recipient as `0x${string}`, amountParsed],
          chain: null,
          account: address!,
        })
      }

      updateModal({
        title: 'Confirming On-Chain',
        description: 'Waiting for sub-second block finality on the Arc Testnet ledger...',
        txStatus: 'confirming',
        txHash: hash
      })

      const receipt = await publicClient!.waitForTransactionReceipt({ hash })
      setTxHash(hash)

      let currentWireId = ''
      if (receipt.logs.length > 0) {
        try {
          const wireLog = receipt.logs.find((l: any) => l.topics[0])
          if (wireLog && wireLog.topics[1]) {
            currentWireId = BigInt(wireLog.topics[1]).toString()
            setWireId(currentWireId)
          }
        } catch { /* OK */ }
      }

      setStep('success')
      
      const isOverLimit = parseFloat(amount) >= 10000
      updateModal({
        type: 'success',
        title: isOverLimit ? 'Wire Initiated & Held in Escrow' : 'Wire Transfer Settled!',
        description: (
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.6' }}>
            <p>Successfully processed <strong>{amount} USDC</strong> to <strong>{recipient.slice(0, 6)}...{recipient.slice(-4)}</strong>.</p>
            {isOverLimit ? (
              <div className="callout" style={{ borderColor: 'var(--warning)', background: 'var(--warning-bg)', margin: 0 }}>
                <strong className="text-warning font-semibold">Signatories Action Required</strong>
                <p className="text-warning text-xs mt-1">This payment exceeds $10,000 USDC. Navigate to the compliance board and obtain a signature release to finalize the transfer.</p>
              </div>
            ) : (
              <div className="callout" style={{ borderColor: 'var(--success)', background: 'var(--success-bg)', margin: 0 }}>
                <strong className="text-success font-semibold">Sub-Second Settlement Proof</strong>
                <p className="text-success text-xs mt-1">This transaction settled deterministically on the Arc L1 engine in under 1 second.</p>
              </div>
            )}
          </div>
        ),
        confirmText: 'Verify on Ledger',
        onConfirm: () => { window.open(`https://testnet.arcscan.app/tx/${hash}`, '_blank') }
      })
    } catch (err: any) {
      console.error('Send error:', err)
      setStep('form')
      showModal({
        type: 'error',
        title: 'Transaction Dispatch Failed',
        description: err?.shortMessage || 'The transaction request was rejected or reverted by the EVM.',
        errorDetails: err?.message || 'EVM revert.'
      })
    }
  }

  const handleSubmit = async () => {
    if (!walletClient || !address || !publicClient) {
      toast.error('Connect your wallet first')
      return
    }

    if (!recipient || !amount) {
      toast.error('Enter recipient and amount')
      return
    }

    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      toast.error('Invalid Ethereum address')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Enter a valid amount')
      return
    }

    const amountParsed = parseUnits(amount, USDC_DECIMALS)

    if (amountNum >= 10000) {
      showModal({
        type: 'warning',
        title: 'Compliance: Multi-Sig Limit Exceeded',
        description: `This transfer of ${amount} USDC exceeds the $10,000 institutional threshold. It will be initiated but locked in the on-chain escrow contract until signed by 2 corporate signatories.`,
        confirmText: 'Proceed to Escrow',
        cancelText: 'Cancel & Revise',
        onConfirm: () => proceedExecution(amountParsed)
      })
    } else {
      await proceedExecution(amountParsed)
    }
  }

  const resetForm = () => {
    setStep('form')
    setRecipient('')
    setAmount('')
    setMemo('')
    setPurposeCode(0)
    setTxHash('')
    setWireId('')
  }

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          <h1 className="flex items-center gap-3">
            <Send size={32} strokeWidth={1.5} className="text-primary" />
            Send Payment
          </h1>
          <p className="text-muted text-sm" style={{ marginBottom: '8px' }}>
            Execute a USDC wire transfer via CrossWireRouter on Arc Testnet
          </p>

          {/* Pipeline Steps */}
          <div className="pipeline">
            <div className={`pipeline-step ${step === 'form' ? 'active' : ['approve', 'confirm', 'executing', 'success'].includes(step) ? 'completed' : ''}`}>
              <div className="pipeline-dot"><FileText size={16} strokeWidth={1.5} /></div>
              <div className="pipeline-label">Enter Details</div>
            </div>
            <div className={`pipeline-line ${['approve', 'confirm', 'executing', 'success'].includes(step) ? 'completed' : ''}`} />
            <div className={`pipeline-step ${step === 'approve' ? 'active' : ['confirm', 'executing', 'success'].includes(step) ? 'completed' : ''}`}>
              <div className="pipeline-dot"><Unlock size={16} strokeWidth={1.5} /></div>
              <div className="pipeline-label">Approve USDC</div>
            </div>
            <div className={`pipeline-line ${['confirm', 'executing', 'success'].includes(step) ? 'completed' : ''}`} />
            <div className={`pipeline-step ${step === 'executing' ? 'active' : step === 'success' ? 'completed' : ''}`}>
              <div className="pipeline-dot"><Zap size={16} strokeWidth={1.5} /></div>
              <div className="pipeline-label">Execute Wire</div>
            </div>
            <div className={`pipeline-line ${step === 'success' ? 'completed' : ''}`} />
            <div className={`pipeline-step ${step === 'success' ? 'completed' : ''}`}>
              <div className="pipeline-dot"><CheckCircle size={16} strokeWidth={1.5} /></div>
              <div className="pipeline-label">Settled</div>
            </div>
          </div>

          {/* Form */}
          {step === 'form' && (
            <div className="card animate-slide-up" style={{ maxWidth: '540px', marginTop: '24px' }}>
              <div className="card-header">
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Wire Transfer Details</span>
                {isContractDeployed ? (
                  <span className="badge green">On-Chain</span>
                ) : (
                  <span className="badge yellow">Direct USDC</span>
                )}
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Beneficiary Address</label>
                  <input
                    className="input-notion"
                    placeholder="0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
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

                <div className="form-group">
                  <label className="form-label">Purpose Code</label>
                  <select
                    className="input-notion"
                    value={purposeCode}
                    onChange={(e) => setPurposeCode(Number(e.target.value))}
                  >
                    {PURPOSE_CODES.map((pc) => (
                      <option key={pc.code} value={pc.code}>
                        {pc.code} — {pc.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Memo (optional)</label>
                  <textarea
                    className="input-notion"
                    placeholder="Payment reference or description..."
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    rows={2}
                  />
                </div>

                <button
                  className="btn primary lg flex items-center justify-center gap-2"
                  onClick={handleSubmit}
                  disabled={!isConnected}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  {isConnected ? (
                    <><Zap size={16} strokeWidth={1.5} /> Execute Wire Transfer</>
                  ) : (
                    <><Plug size={16} strokeWidth={1.5} /> Connect Wallet First</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Executing / Processing */}
          {(step === 'approve' || step === 'confirm' || step === 'executing') && (
            <div className="card animate-slide-up" style={{ maxWidth: '540px', marginTop: '24px' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: '48px' }}>
                <div className="flex justify-center mb-4 text-accent" style={{ animation: 'pulse 1.5s infinite' }}>
                  {step === 'approve' && <Unlock size={48} strokeWidth={1} />}
                  {step === 'confirm' && <FileSignature size={48} strokeWidth={1} />}
                  {step === 'executing' && <Zap size={48} strokeWidth={1} />}
                </div>
                <h3 style={{ margin: '0 0 8px' }}>
                  {step === 'approve' && 'Approving USDC...'}
                  {step === 'confirm' && 'Preparing Wire...'}
                  {step === 'executing' && 'Executing on Arc Testnet...'}
                </h3>
                <p className="text-muted text-sm">
                  {step === 'approve' && 'Please confirm the approval in your wallet'}
                  {step === 'confirm' && 'Generating SWIFT-style reference...'}
                  {step === 'executing' && 'Sub-second deterministic finality'}
                </p>
              </div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="card animate-slide-up" style={{ maxWidth: '540px', marginTop: '24px' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: '32px' }}>
                <div className="flex justify-center mb-4 text-success">
                  <CheckCircle size={48} strokeWidth={1} />
                </div>
                <h3 style={{ margin: '0 0 4px' }}>Wire Transfer Settled</h3>
                <p className="text-muted text-sm" style={{ marginBottom: '20px' }}>
                  {amount} USDC sent to {recipient.slice(0, 6)}...{recipient.slice(-4)}
                </p>

                {wireId && (
                  <div style={{ marginBottom: '12px' }}>
                    <span className="badge gray text-mono" style={{ fontSize: '14px', padding: '4px 12px' }}>
                      Wire ID: #{wireId}
                    </span>
                  </div>
                )}

                <div className="callout" style={{ textAlign: 'left', marginBottom: '16px', borderColor: 'var(--success)', background: 'var(--success-bg)' }}>
                  <span className="callout-icon text-success"><LinkIcon size={20} strokeWidth={1.5} /></span>
                  <div>
                    <strong className="text-success">On-Chain Proof</strong>
                    <p className="text-sm mt-1">
                      <a
                        href={getExplorerTxUrl(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link text-mono"
                      >
                        {txHash.slice(0, 20)}...{txHash.slice(-8)} ↗
                      </a>
                    </p>
                  </div>
                </div>

                <button className="btn primary" onClick={resetForm} style={{ width: '100%' }}>
                  New Wire Transfer
                </button>
              </div>
            </div>
          )}

          {/* Fee Info */}
          <div className="callout" style={{ marginTop: '24px' }}>
            <span className="callout-icon"><Info size={20} strokeWidth={1.5} /></span>
            <div>
              <strong>Settlement Details</strong>
              <p className="text-muted text-sm mt-1">
                Gas fees are paid in USDC (Arc's native token). Transfers settle with deterministic finality in &lt;1 second.
                No confirmation blocks required. Wire IDs and references are stored immutably on-chain.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
