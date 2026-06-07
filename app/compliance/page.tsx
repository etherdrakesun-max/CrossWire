'use client'

import { useState, useEffect } from 'react'
import { usePublicClient, useWalletClient, useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { CROSSWIRE_CONTRACT_ADDRESS, getExplorerTxUrl, getExplorerAddressUrl } from '@/lib/arc-config'
import { crossWireRouterAbi } from '@/lib/contracts'
import { ShieldCheck, BarChart2, Clock, AlertTriangle, FileSignature, X, ShieldAlert } from 'lucide-react'

interface AuditEntry {
  wireId: string
  sender: string
  recipient: string
  amount: string
  reference: string
  txHash: string
  type: string
  timestamp: number
}

export default function CompliancePage() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [selectedWire, setSelectedWire] = useState<AuditEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [isApproving, setIsApproving] = useState(false)

  const fetchAuditLog = async () => {
    try {
      const res = await fetch('/api/wires?limit=100')
      const data = await res.json()

      const allLogs: AuditEntry[] = []

      for (const wire of (data.wires || [])) {
        // Every wire has an INITIATED event
        allLogs.push({
          wireId: wire.id.toString(),
          sender: wire.sender,
          recipient: wire.recipient,
          amount: formatUnits(BigInt(wire.amount), 6),
          reference: wire.refHash,
          txHash: wire.txHash,
          type: 'INITIATED',
          timestamp: new Date(wire.timestamp).getTime(),
        })

        // Process associated events
        for (const ev of (wire.events || [])) {
          if (ev.eventType === 'Executed') {
            allLogs.push({
              wireId: wire.id.toString(),
              sender: wire.sender,
              recipient: wire.recipient,
              amount: formatUnits(BigInt(wire.amount), 6),
              reference: wire.refHash,
              txHash: ev.txHash,
              type: 'EXECUTED',
              timestamp: new Date(ev.timestamp).getTime(),
            })
          } else if (ev.eventType === 'Approved') {
            allLogs.push({
              wireId: wire.id.toString(),
              sender: ev.actor,
              recipient: '',
              amount: '',
              reference: '',
              txHash: ev.txHash,
              type: 'APPROVED',
              timestamp: new Date(ev.timestamp).getTime(),
            })
          } else if (ev.eventType === 'Cancelled') {
            allLogs.push({
              wireId: wire.id.toString(),
              sender: ev.actor,
              recipient: '',
              amount: '',
              reference: '',
              txHash: ev.txHash,
              type: 'CANCELLED',
              timestamp: new Date(ev.timestamp).getTime(),
            })
          }
        }
      }

      allLogs.sort((a, b) => Number(b.wireId) - Number(a.wireId) || a.type.localeCompare(b.type))
      setAuditLog(allLogs)
    } catch (err) {
      console.error('Audit fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLog()
  }, [])

  const truncAddr = (a: string) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '—'

  // Helper to check if a wire is still pending (Initiated but not Executed)
  const isWirePending = (wireId: string) => {
    const executed = auditLog.find(e => e.wireId === wireId && e.type === 'EXECUTED')
    return !executed
  }

  const handleApproveWire = async () => {
    if (!walletClient || !address || !selectedWire) return
    setIsApproving(true)
    toast.loading('Approving wire (Multi-sig)...', { id: 'approve' })
    try {
      const hash = await walletClient.writeContract({
        address: CROSSWIRE_CONTRACT_ADDRESS,
        abi: crossWireRouterAbi,
        functionName: 'approveWire',
        args: [BigInt(selectedWire.wireId)],
        account: address,
        chain: null,
      })
      await publicClient!.waitForTransactionReceipt({ hash })
      toast.success('Wire approved successfully!', { id: 'approve' })
      setSelectedWire(null)
      // Force reload data
      await fetchAuditLog()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.shortMessage || 'Failed to approve', { id: 'approve' })
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          <h1 className="flex items-center gap-3">
            <ShieldCheck size={32} strokeWidth={1.5} className="text-primary" />
            Compliance Dashboard
          </h1>
          <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
            Immutable on-chain audit trail — every wire event is permanently recorded on Arc Testnet
          </p>

          {/* Compliance Graph Legend */}
          <div className="callout" style={{ marginBottom: '24px', borderColor: 'var(--primary)', background: 'var(--bg-secondary)' }}>
            <span className="callout-icon text-primary"><BarChart2 size={20} strokeWidth={1.5} /></span>
            <div>
              <strong className="text-primary">Compliance Graph — Wire Lifecycle</strong>
              <p className="text-muted text-sm mt-1">
                Each wire transfer follows: <span className="badge blue">INITIATED</span>
                {' → '}<span className="badge gray">APPROVED</span>
                {' → '}<span className="badge green">EXECUTED</span>
                {' (or '}<span className="badge red">CANCELLED</span>{')'}
              </p>
              <p className="text-muted text-sm mt-1">
                Wires below the approval threshold ($10,000) auto-execute. Above threshold requires 2-of-3 signatory approval.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total Events</div>
              <div className="stat-value">{auditLog.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Executed</div>
              <div className="stat-value">{auditLog.filter((e) => e.type === 'EXECUTED').length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Approvals</div>
              <div className="stat-value">{auditLog.filter((e) => e.type === 'APPROVED').length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Audit Source</div>
              <div className="stat-value" style={{ fontSize: '16px' }}>
                <a href={getExplorerAddressUrl(CROSSWIRE_CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer" className="explorer-link" style={{ fontSize: '14px' }}>
                  Arcscan ↗
                </a>
              </div>
            </div>
          </div>

          {/* Audit Log Table */}
          <h2 className="mt-6 mb-4">Audit Log</h2>

          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon flex justify-center mb-4" style={{ animation: 'pulse 1.5s infinite' }}>
                <Clock size={32} strokeWidth={1.25} />
              </div>
              <div className="empty-state-text">Loading compliance data from on-chain events...</div>
            </div>
          ) : auditLog.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon flex justify-center mb-4">
                <ShieldAlert size={32} strokeWidth={1.25} />
              </div>
              <div className="empty-state-text">No audit events recorded yet.</div>
            </div>
          ) : (
            <table className="database-table">
              <thead>
                <tr>
                  <th>Wire ID</th>
                  <th>Event Type</th>
                  <th>Actor</th>
                  <th>Counterparty</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry, i) => (
                  <tr key={i} onClick={() => setSelectedWire(entry)} style={{ cursor: 'pointer' }} className="animate-fade-in hover:bg-[var(--bg-secondary)]">
                    <td><span className="badge gray text-mono">#{entry.wireId}</span></td>
                    <td>
                      <span className={`badge ${
                        entry.type === 'EXECUTED' ? 'green' :
                        entry.type === 'APPROVED' ? 'gray' :
                        entry.type === 'INITIATED' ? 'blue' : 'red'
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="text-mono">{truncAddr(entry.sender)}</td>
                    <td className="text-mono">{truncAddr(entry.recipient)}</td>
                    <td><strong>{entry.amount ? `$${Number(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</strong></td>
                    <td className="text-mono text-xs">{entry.reference ? `${entry.reference.slice(0, 10)}…` : '—'}</td>
                    <td>
                      <a href={getExplorerTxUrl(entry.txHash)} target="_blank" rel="noopener noreferrer" className="explorer-link">
                        Verify ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Selected Wire Detail */}
          {selectedWire && (
            <div className="card animate-slide-up" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>Wire #{selectedWire.wireId} — {selectedWire.type}</span>
                <button className="btn ghost sm" onClick={() => setSelectedWire(null)}>
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
              <div className="card-body grid-two-equal" style={{ gap: '16px' }}>
                <div>
                  <div className="text-xs text-muted mb-1">Actor</div>
                  <div className="text-mono">{selectedWire.sender || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Counterparty</div>
                  <div className="text-mono">{selectedWire.recipient || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Amount</div>
                  <div>{selectedWire.amount ? `$${Number(selectedWire.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC` : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Reference Hash</div>
                  <div className="text-mono text-xs break-all">{selectedWire.reference || '—'}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="text-xs text-muted mb-1">On-Chain Proof</div>
                  <a href={getExplorerTxUrl(selectedWire.txHash)} target="_blank" rel="noopener noreferrer" className="explorer-link text-mono text-sm break-all">
                    {selectedWire.txHash} ↗
                  </a>
                </div>
                
                {selectedWire.type === 'INITIATED' && isWirePending(selectedWire.wireId) && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                    <div className="callout" style={{ marginBottom: '16px', borderColor: 'var(--warning)', background: 'var(--warning-bg)' }}>
                      <span className="callout-icon text-warning"><AlertTriangle size={20} strokeWidth={1.5} /></span>
                      <div>
                        <strong className="text-warning">Pending Multi-Sig Approval</strong>
                        <p className="text-warning text-sm mt-1 opacity-80">This wire transfer is waiting for signatory approval.</p>
                      </div>
                    </div>
                    <button 
                      className="btn primary flex items-center justify-center gap-2" 
                      style={{ width: '100%' }}
                      onClick={handleApproveWire}
                      disabled={isApproving}
                    >
                      {isApproving ? (
                        <><Clock size={16} strokeWidth={1.5} /> Approving...</>
                      ) : (
                        <><FileSignature size={16} strokeWidth={1.5} /> Approve Wire #{selectedWire.wireId}</>
                      )}
                    </button>
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
