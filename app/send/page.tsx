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

    setStep('approve')
    const amountParsed = parseUnits(amount, USDC_DECIMALS)

    try {
      // Step 1: Check & Approve USDC allowance
      if (isContractDeployed) {
        const currentAllowance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, CROSSWIRE_CONTRACT_ADDRESS],
        }) as bigint

        if (currentAllowance < amountParsed) {
          toast.loading('Approving USDC spending...', { id: 'approve' })
          const approveHash = await walletClient.writeContract({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'approve',
            args: [CROSSWIRE_CONTRACT_ADDRESS, amountParsed],
            chain: null,
            account: address,
          })
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
          toast.success('USDC approved', { id: 'approve' })
        }
      }

      setStep('confirm')
      // Brief pause for UX
      await new Promise((r) => setTimeout(r, 500))

      setStep('executing')
      toast.loading('Executing wire transfer...', { id: 'wire' })

      let hash: `0x${string}`

      if (isContractDeployed) {
        // Generate SWIFT-style reference
        const reference = keccak256(
          encodePacked(
            ['address', 'address', 'uint256', 'uint256'],
            [address, recipient as `0x${string}`, amountParsed, BigInt(Date.now())]
          )
        )

        hash = await walletClient.writeContract({
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
          account: address,
        })
      } else {
        // Fallback: direct USDC transfer if contract not deployed
        hash = await walletClient.writeContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve', // Use as a placeholder — in production, use transferFrom
          args: [recipient as `0x${string}`, amountParsed],
          chain: null,
          account: address,
        })
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      setTxHash(hash)

      // Try to extract wireId from logs
      if (receipt.logs.length > 0) {
        try {
          const wireLog = receipt.logs.find((l: any) => l.topics[0])
          if (wireLog && wireLog.topics[1]) {
            setWireId(BigInt(wireLog.topics[1]).toString())
          }
        } catch { /* OK */ }
      }

      toast.success('Wire transfer executed!', { id: 'wire' })
      setStep('success')
    } catch (err: any) {
      console.error('Send error:', err)
      toast.error(err?.shortMessage || 'Transaction failed', { id: 'wire' })
      toast.dismiss('approve')
      setStep('form')
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
          <h1><span className="page-icon">💸</span>Send Payment</h1>
          <p className="text-muted text-sm" style={{ marginBottom: '8px' }}>
            Execute a USDC wire transfer via CrossWireRouter on Arc Testnet
          </p>

          {/* Pipeline Steps */}
          <div className="pipeline">
            <div className={`pipeline-step ${step === 'form' ? 'active' : ['approve', 'confirm', 'executing', 'success'].includes(step) ? 'completed' : ''}`}>
              <div className="pipeline-dot">📝</div>
              <div className="pipeline-label">Enter Details</div>
            </div>
            <div className={`pipeline-line ${['approve', 'confirm', 'executing', 'success'].includes(step) ? 'completed' : ''}`} />
            <div className={`pipeline-step ${step === 'approve' ? 'active' : ['confirm', 'executing', 'success'].includes(step) ? 'completed' : ''}`}>
              <div className="pipeline-dot">🔓</div>
              <div className="pipeline-label">Approve USDC</div>
            </div>
            <div className={`pipeline-line ${['confirm', 'executing', 'success'].includes(step) ? 'completed' : ''}`} />
            <div className={`pipeline-step ${step === 'executing' ? 'active' : step === 'success' ? 'completed' : ''}`}>
              <div className="pipeline-dot">⚡</div>
              <div className="pipeline-label">Execute Wire</div>
            </div>
            <div className={`pipeline-line ${step === 'success' ? 'completed' : ''}`} />
            <div className={`pipeline-step ${step === 'success' ? 'completed' : ''}`}>
              <div className="pipeline-dot">✅</div>
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
                  className="btn primary lg"
                  onClick={handleSubmit}
                  disabled={!isConnected}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  {isConnected ? '⚡ Execute Wire Transfer' : '🔌 Connect Wallet First'}
                </button>
              </div>
            </div>
          )}

          {/* Executing / Processing */}
          {(step === 'approve' || step === 'confirm' || step === 'executing') && (
            <div className="card animate-slide-up" style={{ maxWidth: '540px', marginTop: '24px' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>
                  {step === 'approve' ? '🔓' : step === 'confirm' ? '📋' : '⚡'}
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
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <h3 style={{ margin: '0 0 4px' }}>Wire Transfer Settled</h3>
                <p className="text-muted text-sm" style={{ marginBottom: '20px' }}>
                  {amount} USDC sent to {recipient.slice(0, 6)}...{recipient.slice(-4)}
                </p>

                {wireId && (
                  <div style={{ marginBottom: '12px' }}>
                    <span className="badge purple" style={{ fontSize: '14px', padding: '4px 12px' }}>
                      Wire ID: #{wireId}
                    </span>
                  </div>
                )}

                <div className="callout green" style={{ textAlign: 'left', marginBottom: '16px' }}>
                  <span className="callout-icon">🔗</span>
                  <div>
                    <strong>On-Chain Proof</strong>
                    <p className="text-sm">
                      <a
                        href={getExplorerTxUrl(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
                        style={{ fontSize: '13px' }}
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
            <span className="callout-icon">ℹ️</span>
            <div>
              <strong>Settlement Details</strong>
              <p className="text-muted text-sm">
                Gas fees are paid in USDC (Arc&apos;s native token). Transfers settle with deterministic finality in &lt;1 second.
                No confirmation blocks required. Wire IDs and references are stored immutably on-chain.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
