'use client'

import { useState, useEffect } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'
import { useAccount } from '@/lib/use-crosswire-account'
import { getSandboxWires, updateSandboxWireStatus } from '@/lib/sandbox-store'
import { formatUnits, encodeFunctionData } from 'viem'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { CROSSWIRE_CONTRACT_ADDRESS, getExplorerTxUrl, getExplorerAddressUrl } from '@/lib/arc-config'
import { crossWireRouterAbi } from '@/lib/contracts'
import { 
  ShieldCheck, 
  BarChart2, 
  Clock, 
  AlertTriangle, 
  FileSignature, 
  X, 
  ShieldAlert, 
  FileDown, 
  UserCheck, 
  Activity, 
  UserX 
} from 'lucide-react'

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

interface ComplianceLog {
  id: number
  walletAddr: string
  checkType: string
  result: string
  details: string
  checkedAt: string
}

export default function CompliancePage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [complianceLogs, setComplianceLogs] = useState<ComplianceLog[]>([])
  const [selectedWire, setSelectedWire] = useState<AuditEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [isApproving, setIsApproving] = useState(false)
  const [kycProfile, setKycProfile] = useState<any>(null)

  const fetchData = async () => {
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'
    try {
      // 1. Fetch wires/events
      const wiresRes = await fetch('/api/wires?limit=100')
      const wiresData = await wiresRes.json()

      let wires = wiresData.wires || []
      if (isSandbox) {
        const sWires = getSandboxWires()
        wires = [...sWires, ...wires]
      }

      const allLogs: AuditEntry[] = []
      for (const wire of wires) {
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

      // 2. Fetch compliance logs (AML screening checks)
      const complianceRes = await fetch('/api/compliance/screen')
      if (complianceRes.ok) {
        setComplianceLogs(await complianceRes.json())
      }

      // 3. Fetch current user KYC details
      if (isSandbox) {
        setKycProfile({
          businessName: 'Acme Corp (Sandbox)',
          ein: 'XX-XXXXXXX',
          country: 'United States',
          status: 'APPROVED',
          complianceOfficer: 'Sandbox Compliance Automator'
        })
      } else if (address) {
        const kycRes = await fetch(`/api/compliance/kyc?wallet=${address}`)
        if (kycRes.ok) {
          setKycProfile(await kycRes.json())
        }
      }
    } catch (err) {
      console.error('Compliance page fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [address])

  useEffect(() => {
    const handleSandboxChange = () => {
      fetchData()
    }
    window.addEventListener('crosswire_sandbox_changed', handleSandboxChange)
    return () => window.removeEventListener('crosswire_sandbox_changed', handleSandboxChange)
  }, [])

  const truncAddr = (a: string) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '—'

  const isWirePending = (wireId: string) => {
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'
    if (isSandbox) {
      const sWires = getSandboxWires()
      const found = sWires.find(w => w.id.toString() === wireId)
      return found ? found.status !== 'EXECUTED' : true
    }
    const executed = auditLog.find(e => e.wireId === wireId && e.type === 'EXECUTED')
    return !executed
  }

  const handleApproveWire = async () => {
    if (!selectedWire) return
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'

    setIsApproving(true)
    toast.loading('Approving wire (Secondary Authorization)...', { id: 'approve' })
    
    if (isSandbox) {
      setTimeout(async () => {
        updateSandboxWireStatus(Number(selectedWire.wireId), 'EXECUTED', address || '0x3a92d...')
        toast.success('Wire approved and settled successfully (Simulated)!', { id: 'approve' })
        setSelectedWire(null)
        setIsApproving(false)
        await fetchData()
      }, 1200)
      return
    }

    if (!walletClient || !address) {
      toast.error('Connect wallet first', { id: 'approve' })
      setIsApproving(false)
      return
    }

    try {
      const approveWireData = encodeFunctionData({
        abi: crossWireRouterAbi,
        functionName: 'approveWire',
        args: [BigInt(selectedWire.wireId)],
      })
      const hash = await walletClient.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: CROSSWIRE_CONTRACT_ADDRESS,
          data: approveWireData,
        }]
      })
      await publicClient!.waitForTransactionReceipt({ hash })
      toast.success('Wire approved successfully!', { id: 'approve' })
      setSelectedWire(null)
      await fetchData()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.shortMessage || 'Failed to approve', { id: 'approve' })
    } finally {
      setIsApproving(false)
    }
  }

  // Export Auditor Compliance Reports (CSV format)
  const handleExportCSV = () => {
    const headers = 'Check ID,Wallet Address,Check Type,Result,Details,Date\n'
    const rows = complianceLogs.map(log => {
      const cleanDetails = log.details.replace(/"/g, '""')
      return `"${log.id}","${log.walletAddr}","${log.checkType}","${log.result}","${cleanDetails}","${log.checkedAt}"`
    }).join('\n')

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `compliance_audit_report_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Auditor compliance report exported!')
  }

  // Metrics
  const totalSanctionsFail = complianceLogs.filter(l => l.result === 'FAIL').length
  const activeKycCount = kycProfile && kycProfile.status === 'APPROVED' ? 1 : 0

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          
          <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
            <div>
              <h1 className="flex items-center gap-3">
                <ShieldCheck size={32} strokeWidth={1.5} className="text-primary" />
                Compliance Center
              </h1>
              <p className="text-muted text-sm mt-1">
                Real-time AML screening, OFAC/EU sanctions checker, and auditor-ready compliance logging.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Link href="/compliance/kyc" className="btn primary flex items-center gap-2">
                <UserCheck size={16} /> Complete KYC
              </Link>
              <button onClick={handleExportCSV} className="btn secondary flex items-center gap-2">
                <FileDown size={16} /> Export Audit Report
              </button>
            </div>
          </div>

          {/* Verification Status Card */}
          {isConnected && kycProfile && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-body flex justify-between items-center py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">KYC Profile: {kycProfile.fullName || 'Unregistered'}</h3>
                    <p className="text-xs text-secondary mt-0.5">
                      Risk Tier: <strong>{kycProfile.tier}</strong> | Country: <strong>{kycProfile.country || 'N/A'}</strong>
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${kycProfile.status === 'APPROVED' ? 'success' : 'warning'}`}>
                    Status: {kycProfile.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Stats */}
          <div className="stat-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Screened Wires</div>
              <div className="stat-value">{complianceLogs.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Sanction Block Flags</div>
              <div className="stat-value text-red-500">{totalSanctionsFail}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">KYC Verified Profiles</div>
              <div className="stat-value">{activeKycCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Audit Registry</div>
              <div className="stat-value" style={{ fontSize: '16px' }}>
                <a href={getExplorerAddressUrl(CROSSWIRE_CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer" className="explorer-link" style={{ fontSize: '14px' }}>
                  Audit Explorer ↗
                </a>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Left: Audit event log */}
            <div className="card">
              <div className="card-header">
                <h2>Immutable Transfer Logs</h2>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {loading ? (
                  <p className="text-center py-8 text-secondary text-xs">Loading transfer logs...</p>
                ) : auditLog.length === 0 ? (
                  <p className="text-center py-8 text-secondary text-xs">No transfer events recorded.</p>
                ) : (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {auditLog.map((entry, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedWire(entry)}
                        style={{ 
                          padding: '12px 16px', 
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'between',
                          alignItems: 'center'
                        }}
                        className="hover:bg-[var(--bg-secondary)]"
                      >
                        <div style={{ flex: 1 }}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-300">#{entry.wireId}</span>
                            <span className={`badge ${
                              entry.type === 'EXECUTED' ? 'green' :
                              entry.type === 'APPROVED' ? 'gray' :
                              entry.type === 'INITIATED' ? 'blue' : 'red'
                            } text-xxs`}>
                              {entry.type}
                            </span>
                          </div>
                          <p className="text-xxs text-secondary font-mono mt-1">
                            {truncAddr(entry.sender)} → {truncAddr(entry.recipient)}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="text-xs font-bold text-slate-100">
                            {entry.amount ? `$${Number(entry.amount).toLocaleString()}` : '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: AML Screening Logs */}
            <div className="card">
              <div className="card-header">
                <h2>AML & Sanctions Screening Records</h2>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {loading ? (
                  <p className="text-center py-8 text-secondary text-xs">Loading AML screen logs...</p>
                ) : complianceLogs.length === 0 ? (
                  <p className="text-center py-8 text-secondary text-xs">No transactions screened yet.</p>
                ) : (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {complianceLogs.map((log) => {
                      const details = JSON.parse(log.details)
                      return (
                        <div 
                          key={log.id} 
                          style={{ 
                            padding: '12px 16px', 
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'between',
                            alignItems: 'center'
                          }}
                          className="hover:bg-[var(--bg-secondary)]"
                        >
                          <div style={{ flex: 1 }}>
                            <div className="flex items-center gap-2">
                              <span className={`badge ${log.result === 'PASS' ? 'success' : 'danger'} text-xxs`}>
                                {log.result}
                              </span>
                              <strong className="text-xs text-slate-200">{log.checkType}</strong>
                            </div>
                            <p className="text-xxs text-secondary mt-1 font-mono">
                              Wallet: {truncAddr(log.walletAddr)} | Risk Score: <strong className="text-primary">{details.riskScore || 10}</strong>
                            </p>
                            {details.reason && (
                              <p className="text-xxs text-red-400 mt-0.5">{details.reason}</p>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className="text-xxs text-secondary block">
                              {new Date(log.checkedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Selected Wire Drawer Detail */}
          {selectedWire && (
            <div className="card animate-slide-up" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <span style={{ fontWeight: 600 }}>Wire #{selectedWire.wireId} Details</span>
                <button className="btn ghost sm" onClick={() => setSelectedWire(null)}>
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
              <div className="card-body grid-two-equal" style={{ gap: '16px' }}>
                <div>
                  <div className="text-xs text-muted mb-1">Sender</div>
                  <div className="text-mono text-xs">{selectedWire.sender || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Counterparty</div>
                  <div className="text-mono text-xs">{selectedWire.recipient || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Amount</div>
                  <div><strong>{selectedWire.amount ? `$${Number(selectedWire.amount).toLocaleString()} USDC` : '—'}</strong></div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-1">Transaction Audit Proof</div>
                  <a href={getExplorerTxUrl(selectedWire.txHash)} target="_blank" rel="noopener noreferrer" className="explorer-link text-mono text-xs break-all">
                    {selectedWire.txHash} ↗
                  </a>
                </div>
                
                {selectedWire.type === 'INITIATED' && isWirePending(selectedWire.wireId) && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                    <div className="callout" style={{ marginBottom: '16px', borderColor: 'var(--warning)', background: 'var(--warning-bg)' }}>
                      <span className="callout-icon text-warning"><AlertTriangle size={20} strokeWidth={1.5} /></span>
                      <div>
                        <strong className="text-warning">Pending secondary corporate authorization</strong>
                      </div>
                    </div>
                    <button 
                      className="btn primary flex items-center justify-center gap-2" 
                      style={{ width: '100%' }}
                      onClick={handleApproveWire}
                      disabled={isApproving}
                    >
                      {isApproving ? 'Approving...' : `Authorize Wire #${selectedWire.wireId}`}
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
