'use client'

import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { CROSSWIRE_CONTRACT_ADDRESS, getExplorerTxUrl, getExplorerAddressUrl } from '@/lib/arc-config'

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
  const publicClient = usePublicClient()
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [selectedWire, setSelectedWire] = useState<AuditEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!publicClient) return
    if (CROSSWIRE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setLoading(false)
      return
    }

    const fetchAuditLog = async () => {
      setLoading(true)
      try {
        const allLogs: AuditEntry[] = []

        // WireInitiated
        const initiated = await publicClient.getLogs({
          address: CROSSWIRE_CONTRACT_ADDRESS,
          event: {
            type: 'event', name: 'WireInitiated',
            inputs: [
              { indexed: true, name: 'wireId', type: 'uint256' },
              { indexed: true, name: 'sender', type: 'address' },
              { indexed: true, name: 'recipient', type: 'address' },
              { indexed: false, name: 'amount', type: 'uint256' },
              { indexed: false, name: 'refHash', type: 'bytes32' },
              { indexed: false, name: 'purposeCode', type: 'uint8' },
              { indexed: false, name: 'memo', type: 'string' },
            ],
          },
          fromBlock: 0n, toBlock: 'latest',
        })

        for (const log of initiated) {
          allLogs.push({
            wireId: log.args?.wireId?.toString() || '?',
            sender: (log.args?.sender as string) || '',
            recipient: (log.args?.recipient as string) || '',
            amount: log.args?.amount ? formatUnits(log.args.amount as bigint, 6) : '0',
            reference: (log.args?.refHash as string) || '',
            txHash: log.transactionHash || '',
            type: 'INITIATED',
            timestamp: 0,
          })
        }

        // WireExecuted
        const executed = await publicClient.getLogs({
          address: CROSSWIRE_CONTRACT_ADDRESS,
          event: {
            type: 'event', name: 'WireExecuted',
            inputs: [
              { indexed: true, name: 'wireId', type: 'uint256' },
              { indexed: true, name: 'sender', type: 'address' },
              { indexed: true, name: 'recipient', type: 'address' },
              { indexed: false, name: 'amount', type: 'uint256' },
              { indexed: false, name: 'refHash', type: 'bytes32' },
            ],
          },
          fromBlock: 0n, toBlock: 'latest',
        })

        for (const log of executed) {
          allLogs.push({
            wireId: log.args?.wireId?.toString() || '?',
            sender: (log.args?.sender as string) || '',
            recipient: (log.args?.recipient as string) || '',
            amount: log.args?.amount ? formatUnits(log.args.amount as bigint, 6) : '0',
            reference: (log.args?.refHash as string) || '',
            txHash: log.transactionHash || '',
            type: 'EXECUTED',
            timestamp: 0,
          })
        }

        // WireApproved
        const approved = await publicClient.getLogs({
          address: CROSSWIRE_CONTRACT_ADDRESS,
          event: {
            type: 'event', name: 'WireApproved',
            inputs: [
              { indexed: true, name: 'wireId', type: 'uint256' },
              { indexed: true, name: 'approver', type: 'address' },
              { indexed: false, name: 'approvalCount', type: 'uint256' },
            ],
          },
          fromBlock: 0n, toBlock: 'latest',
        })

        for (const log of approved) {
          allLogs.push({
            wireId: log.args?.wireId?.toString() || '?',
            sender: (log.args?.approver as string) || '',
            recipient: '',
            amount: '',
            reference: '',
            txHash: log.transactionHash || '',
            type: 'APPROVED',
            timestamp: 0,
          })
        }

        allLogs.sort((a, b) => Number(b.wireId) - Number(a.wireId) || a.type.localeCompare(b.type))
        setAuditLog(allLogs)
      } catch (err) {
        console.error('Audit fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAuditLog()
  }, [publicClient])

  const truncAddr = (a: string) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '—'

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          <h1><span className="page-icon">🛡️</span>Compliance Dashboard</h1>
          <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
            Immutable on-chain audit trail — every wire event is permanently recorded on Arc Testnet
          </p>

          {/* Compliance Graph Legend */}
          <div className="callout blue" style={{ marginBottom: '24px' }}>
            <span className="callout-icon">📊</span>
            <div>
              <strong>Compliance Graph — Wire Lifecycle</strong>
              <p className="text-muted text-sm" style={{ marginTop: '4px' }}>
                Each wire transfer follows: <span className="badge blue" style={{ marginLeft: '4px' }}>INITIATED</span>
                {' → '}<span className="badge purple" style={{ marginLeft: '2px' }}>APPROVED</span>
                {' → '}<span className="badge green" style={{ marginLeft: '2px' }}>EXECUTED</span>
                {' (or '}<span className="badge red" style={{ marginLeft: '2px' }}>CANCELLED</span>{')'}
              </p>
              <p className="text-muted text-sm" style={{ marginTop: '4px' }}>
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
          <h2>Audit Log</h2>

          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ animation: 'pulse 1.5s infinite' }}>⏳</div>
              <div className="empty-state-text">Loading compliance data from on-chain events...</div>
            </div>
          ) : auditLog.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛡️</div>
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
                  <tr key={i} onClick={() => setSelectedWire(entry)} style={{ cursor: 'pointer' }}>
                    <td><span className="badge gray">#{entry.wireId}</span></td>
                    <td>
                      <span className={`badge ${
                        entry.type === 'EXECUTED' ? 'green' :
                        entry.type === 'APPROVED' ? 'purple' :
                        entry.type === 'INITIATED' ? 'blue' : 'red'
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="text-mono">{truncAddr(entry.sender)}</td>
                    <td className="text-mono">{truncAddr(entry.recipient)}</td>
                    <td>{entry.amount ? `$${Number(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
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
                <button className="btn ghost sm" onClick={() => setSelectedWire(null)}>✕</button>
              </div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <div className="text-xs text-muted">Actor</div>
                  <div className="text-mono">{selectedWire.sender || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Counterparty</div>
                  <div className="text-mono">{selectedWire.recipient || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Amount</div>
                  <div>{selectedWire.amount ? `$${Number(selectedWire.amount).toFixed(2)} USDC` : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Reference Hash</div>
                  <div className="text-mono text-xs">{selectedWire.reference || '—'}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="text-xs text-muted">On-Chain Proof</div>
                  <a href={getExplorerTxUrl(selectedWire.txHash)} target="_blank" rel="noopener noreferrer" className="explorer-link">
                    {selectedWire.txHash} ↗
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
