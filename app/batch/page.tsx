'use client'

import { useState, useRef } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits, keccak256, encodePacked } from 'viem'
import toast from 'react-hot-toast'
import Papa from 'papaparse'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  CROSSWIRE_CONTRACT_ADDRESS,
  getExplorerTxUrl,
} from '@/lib/arc-config'
import { crossWireRouterAbi, erc20Abi } from '@/lib/contracts'
import { Rows, Upload, Plus, Zap, FileText, CheckCircle, Clock, X } from 'lucide-react'

interface BatchRow {
  recipient: string
  amount: string
  purposeCode: number
  reference: string
  status: 'pending' | 'executing' | 'success' | 'error'
  error?: string
}

export default function BatchPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<BatchRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [batchTxHash, setBatchTxHash] = useState('')

  const isContractDeployed = CROSSWIRE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000'

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: BatchRow[] = results.data.map((row: any) => ({
          recipient: row.recipient || row.address || '',
          amount: row.amount || '0',
          purposeCode: parseInt(row.purposeCode || row.purpose_code || '0') || 0,
          reference: row.reference || row.memo || '',
          status: 'pending' as const,
        }))

        // Validate
        const valid = parsed.filter((r) => r.recipient.startsWith('0x') && r.recipient.length === 42 && parseFloat(r.amount) > 0)
        setRows(valid)
        toast.success(`Loaded ${valid.length} valid wire transfers`)
      },
      error: () => {
        toast.error('Failed to parse CSV file')
      },
    })
  }

  const handleBatchExecute = async () => {
    if (!walletClient || !address || !publicClient || !isContractDeployed) {
      toast.error('Connect wallet and ensure contract is deployed')
      return
    }

    if (rows.length === 0) {
      toast.error('Upload a CSV file first')
      return
    }

    setIsProcessing(true)

    try {
      // Calculate total amount for approval
      let totalAmount = 0n
      const recipients: `0x${string}`[] = []
      const amounts: bigint[] = []
      const references: `0x${string}`[] = []
      const purposeCodes: number[] = []

      for (const row of rows) {
        const amt = parseUnits(row.amount, USDC_DECIMALS)
        totalAmount += amt
        recipients.push(row.recipient as `0x${string}`)
        amounts.push(amt)
        references.push(
          keccak256(
            encodePacked(
              ['address', 'string'],
              [row.recipient as `0x${string}`, row.reference || `batch-${Date.now()}`]
            )
          ) as `0x${string}`
        )
        purposeCodes.push(row.purposeCode)
      }

      // Approve total
      toast.loading('Approving total USDC...', { id: 'batch' })
      const approveHash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CROSSWIRE_CONTRACT_ADDRESS, totalAmount],
        chain: null,
        account: address,
      })
      await publicClient.waitForTransactionReceipt({ hash: approveHash })

      // Execute batch
      toast.loading(`Executing ${rows.length} wire transfers...`, { id: 'batch' })
      setRows((prev) => prev.map((r) => ({ ...r, status: 'executing' as const })))

      const batchHash = await walletClient.writeContract({
        address: CROSSWIRE_CONTRACT_ADDRESS,
        abi: crossWireRouterAbi,
        functionName: 'batchInitiateWires',
        args: [recipients, amounts, references, purposeCodes],
        chain: null,
        account: address,
      })

      await publicClient.waitForTransactionReceipt({ hash: batchHash })
      setBatchTxHash(batchHash)

      setRows((prev) => prev.map((r) => ({ ...r, status: 'success' as const })))
      toast.success(`${rows.length} wires executed in 1 transaction!`, { id: 'batch' })
    } catch (err: any) {
      console.error('Batch error:', err)
      setRows((prev) => prev.map((r) => ({ ...r, status: 'error' as const, error: err?.shortMessage || 'Failed' })))
      toast.error(err?.shortMessage || 'Batch execution failed', { id: 'batch' })
    } finally {
      setIsProcessing(false)
    }
  }

  const addManualRow = () => {
    setRows([...rows, { recipient: '', amount: '', purposeCode: 0, reference: '', status: 'pending' }])
  }

  const updateRow = (index: number, field: keyof BatchRow, value: string | number) => {
    const updated = [...rows]
    ;(updated[index] as any)[field] = value
    setRows(updated)
  }

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          <h1 className="flex items-center gap-3">
            <Rows size={32} strokeWidth={1.5} className="text-primary" />
            Batch Wire Transfer
          </h1>
          <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
            Upload CSV or manually add multiple wire transfers — executed in a single on-chain transaction
          </p>

          {/* Upload Section */}
          <div className="flex gap-3" style={{ marginBottom: '20px' }}>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button className="btn" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} strokeWidth={1.5} /> Upload CSV
            </button>
            <button className="btn" onClick={addManualRow}>
              <Plus size={16} strokeWidth={1.5} /> Add Row
            </button>
            {rows.length > 0 && (
              <button
                className="btn primary"
                onClick={handleBatchExecute}
                disabled={isProcessing || !isConnected || !isContractDeployed}
              >
                {isProcessing ? (
                  <><Clock size={16} strokeWidth={1.5} /> Processing...</>
                ) : (
                  <><Zap size={16} strokeWidth={1.5} /> Execute {rows.length} Wires</>
                )}
              </button>
            )}
          </div>

          {/* CSV Format Help */}
          <div className="callout" style={{ marginBottom: '20px' }}>
            <span className="callout-icon"><FileText size={20} strokeWidth={1.5} /></span>
            <div>
              <strong>CSV Format</strong>
              <p className="text-muted text-sm mt-1">
                Columns: <code className="text-mono">recipient, amount, purposeCode, reference</code>
              </p>
              <p className="text-muted text-sm mt-1">
                Example: <code className="text-mono">0xabc...def, 100.00, 2, INV-2024-001</code>
              </p>
            </div>
          </div>

          {/* Batch Table */}
          {rows.length > 0 ? (
            <>
              <table className="database-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Recipient</th>
                    <th>Amount (USDC)</th>
                    <th>Purpose</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="text-muted">{i + 1}</td>
                      <td>
                        <input
                          className="input-notion"
                          value={row.recipient}
                          onChange={(e) => updateRow(i, 'recipient', e.target.value)}
                          placeholder="0x..."
                          disabled={row.status !== 'pending'}
                          style={{ fontFamily: 'monospace' }}
                        />
                      </td>
                      <td>
                        <input
                          className="input-notion"
                          value={row.amount}
                          onChange={(e) => updateRow(i, 'amount', e.target.value)}
                          placeholder="0.00"
                          type="number"
                          disabled={row.status !== 'pending'}
                          style={{ width: '100px' }}
                        />
                      </td>
                      <td>
                        <select
                          className="input-notion"
                          value={row.purposeCode}
                          onChange={(e) => updateRow(i, 'purposeCode', Number(e.target.value))}
                          disabled={row.status !== 'pending'}
                          style={{ width: '80px' }}
                        >
                          {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="input-notion"
                          value={row.reference}
                          onChange={(e) => updateRow(i, 'reference', e.target.value)}
                          placeholder="REF..."
                          disabled={row.status !== 'pending'}
                          style={{ width: '120px' }}
                        />
                      </td>
                      <td>
                        <span className={`badge ${
                          row.status === 'success' ? 'green' :
                          row.status === 'executing' ? 'blue' :
                          row.status === 'error' ? 'red' : 'gray'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        {row.status === 'pending' && (
                          <button className="btn ghost" style={{ padding: '4px' }} onClick={() => removeRow(i)}>
                            <X size={16} strokeWidth={1.5} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="stat-grid" style={{ marginTop: '24px' }}>
                <div className="stat-card">
                  <div className="stat-label">Total Wires</div>
                  <div className="stat-value">{rows.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Amount</div>
                  <div className="stat-value">
                    ${rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {batchTxHash && (
                <div className="callout" style={{ marginTop: '24px', borderColor: 'var(--success)', background: 'var(--success-bg)' }}>
                  <span className="callout-icon text-success"><CheckCircle size={20} strokeWidth={1.5} /></span>
                  <div>
                    <strong className="text-success">Batch Executed</strong>
                    <p className="mt-1">
                      <a href={getExplorerTxUrl(batchTxHash)} target="_blank" rel="noopener noreferrer" className="explorer-link text-mono">
                        {batchTxHash.slice(0, 20)}...{batchTxHash.slice(-8)} ↗
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon flex justify-center mb-4">
                <Rows size={32} strokeWidth={1.25} />
              </div>
              <div className="empty-state-text">Upload a CSV file or add rows manually to start a batch wire transfer.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
