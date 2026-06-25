'use client'

import { useState, useEffect } from 'react'
import { useAccount } from '@/lib/use-crosswire-account'
import { getSandboxInvoices, updateSandboxInvoiceStatus } from '@/lib/sandbox-store'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { 
  FileText, 
  Plus, 
  Share2, 
  ExternalLink, 
  Copy, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FilePlus,
  Send,
  AlertTriangle,
  Receipt
} from 'lucide-react'

export default function InvoicesListPage() {
  const { address, isConnected } = useAccount()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchInvoices = async () => {
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'
    
    setLoading(true)
    try {
      let data: any[] = []
      if (address) {
        const res = await fetch(`/api/invoices?address=${address}`)
        if (res.ok) {
          data = await res.json()
        } else {
          toast.error('Failed to retrieve invoices')
        }
      }

      if (isSandbox) {
        const sInvoices = getSandboxInvoices()
        data = [...sInvoices, ...data]
      }

      setInvoices(data)
    } catch (err) {
      console.error(err)
      toast.error('Error loading invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [address])

  useEffect(() => {
    const handleSandboxChange = () => {
      fetchInvoices()
    }
    window.addEventListener('crosswire_sandbox_changed', handleSandboxChange)
    return () => window.removeEventListener('crosswire_sandbox_changed', handleSandboxChange)
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Payment link copied to clipboard')
  }

  // Calculate metrics
  const displayAddress = address || '0x3a92dB4F4B84F01A18d96b04C63E63e800000000'
  const sentInvoices = invoices.filter(i => i.payeeAddr.toLowerCase() === displayAddress.toLowerCase())
  const receivedInvoices = invoices.filter(i => i.payerAddr?.toLowerCase() === displayAddress.toLowerCase())

  const totalRequested = sentInvoices.reduce((acc, curr) => acc + parseFloat(curr.amount), 0)
  const totalReceived = sentInvoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + parseFloat(curr.amount), 0)
  const pendingCollection = sentInvoices.filter(i => i.status === 'SENT').reduce((acc, curr) => acc + parseFloat(curr.amount), 0)

  const handleUpdateStatus = async (id: number, nextStatus: string) => {
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'
    
    if (isSandbox) {
      updateSandboxInvoiceStatus(id, nextStatus as any)
      toast.success(`Invoice status updated to ${nextStatus} (Simulated)`)
      fetchInvoices()
      return
    }

    try {
      const res = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus })
      })

      if (res.ok) {
        toast.success(`Invoice updated to ${nextStatus}`)
        fetchInvoices()
      } else {
        toast.error('Failed to update invoice status')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error updating invoice status')
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
                <FileText size={32} strokeWidth={1.5} className="text-primary" />
                Invoice Ledger & Requests
              </h1>
              <p className="text-muted text-sm mt-1">
                Create structured payment requests, compile itemized bills, and track settle-on-chain status
              </p>
            </div>
            {isConnected && (
              <Link href="/invoices/create" className="btn primary">
                <Plus size={14} /> New Invoice
              </Link>
            )}
          </div>

          {!isConnected ? (
            <div className="callout warning">
              <AlertTriangle size={20} />
              <div>
                <strong>Wallet Disconnected</strong>
                <p className="text-sm text-muted mt-0.5">Please connect your corporate web3 account to create invoices, track incoming settlements, or verify invoice requests.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="card">
                  <div className="card-body">
                    <span className="text-secondary text-xs font-semibold uppercase tracking-wider">Total Requested</span>
                    <h2 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                      {totalRequested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                    </h2>
                    <p className="text-xs text-muted mt-1">Across all outgoing billing requests</p>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <span className="text-secondary text-xs font-semibold uppercase tracking-wider text-success">Total Settled</span>
                    <h2 className="text-2xl font-bold mt-1" style={{ color: 'var(--success)' }}>
                      {totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                    </h2>
                    <p className="text-xs text-muted mt-1">Successfully paid on-chain</p>
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    <span className="text-secondary text-xs font-semibold uppercase tracking-wider text-warning">Pending Collection</span>
                    <h2 className="text-2xl font-bold mt-1" style={{ color: 'var(--warning)' }}>
                      {pendingCollection.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                    </h2>
                    <p className="text-xs text-muted mt-1">Open invoice requests awaiting payment</p>
                  </div>
                </div>
              </div>

              {/* Outgoing Billing List */}
              <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header flex justify-between items-center">
                  <h2>Invoices Created (Outgoing Requests)</h2>
                  <span className="badge primary">{sentInvoices.length} total</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {sentInvoices.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <FilePlus size={40} strokeWidth={1} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <p>You have not created any billing requests yet.</p>
                      <Link href="/invoices/create" className="btn secondary mt-3" style={{ display: 'inline-flex' }}>
                        Create your first invoice
                      </Link>
                    </div>
                  ) : (
                    <table className="database-table">
                      <thead>
                        <tr>
                          <th>Invoice Reference</th>
                          <th>Recipient Payer</th>
                          <th>Due Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sentInvoices.map((inv) => {
                          const payLink = `${window.location.origin}/pay/${inv.slug}`
                          return (
                            <tr key={inv.id}>
                              <td>
                                <strong>{inv.memo || 'No description'}</strong>
                                <div className="text-xs text-secondary mt-0.5">ID: {inv.slug.slice(0, 8)}...</div>
                              </td>
                              <td>
                                {inv.payerAddr ? (
                                  <span className="text-sm font-semibold">{inv.payerAddr.slice(0, 6)}...{inv.payerAddr.slice(-4)}</span>
                                ) : (
                                  <span className="text-xs text-secondary italic">Open link (Anyone)</span>
                                )}
                              </td>
                              <td>
                                <span className="text-sm">
                                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'No limit'}
                                </span>
                              </td>
                              <td>
                                <span className="font-semibold text-primary">{inv.amount} USDC</span>
                              </td>
                              <td>
                                <span className={`badge ${
                                  inv.status === 'PAID' ? 'success' :
                                  inv.status === 'SENT' ? 'info' :
                                  inv.status === 'CANCELLED' ? 'danger' :
                                  'gray'
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '8px' }}>
                                  <button
                                    className="btn btn-icon secondary"
                                    onClick={() => copyToClipboard(payLink)}
                                    title="Copy Payment Link"
                                  >
                                    <Copy size={12} />
                                  </button>
                                  <Link
                                    href={`/pay/${inv.slug}`}
                                    className="btn btn-icon secondary"
                                    title="Open Public Invoice Page"
                                  >
                                    <ExternalLink size={12} />
                                  </Link>
                                  {inv.status === 'DRAFT' && (
                                    <button
                                      className="btn secondary btn-sm"
                                      onClick={() => handleUpdateStatus(inv.id, 'SENT')}
                                    >
                                      Send Request
                                    </button>
                                  )}
                                  {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                                    <button
                                      className="btn danger btn-sm"
                                      onClick={() => handleUpdateStatus(inv.id, 'CANCELLED')}
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Incoming Invoices (Received Billing Requests) */}
              <div className="card">
                <div className="card-header flex justify-between items-center">
                  <h2>Invoices Received (Incoming Bills)</h2>
                  <span className="badge warning">{receivedInvoices.length} total</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {receivedInvoices.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <Receipt size={40} strokeWidth={1} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <p>No billing requests have been sent to your address.</p>
                    </div>
                  ) : (
                    <table className="database-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Payee Merchant</th>
                          <th>Due Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivedInvoices.map((inv) => (
                          <tr key={inv.id}>
                            <td>
                              <strong>{inv.memo || 'Invoice payment'}</strong>
                              <div className="text-xs text-secondary mt-0.5">ID: {inv.slug.slice(0, 8)}...</div>
                            </td>
                            <td>
                              <span className="text-sm font-semibold">{inv.payeeAddr.slice(0, 6)}...{inv.payeeAddr.slice(-4)}</span>
                            </td>
                            <td>
                              <span className="text-sm">
                                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'No limit'}
                              </span>
                            </td>
                            <td>
                              <span className="font-semibold text-primary">{inv.amount} USDC</span>
                            </td>
                            <td>
                              <span className={`badge ${
                                inv.status === 'PAID' ? 'success' :
                                inv.status === 'SENT' ? 'info' :
                                inv.status === 'CANCELLED' ? 'danger' :
                                'gray'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Link
                                href={`/pay/${inv.slug}`}
                                className="btn primary btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                {inv.status === 'PAID' ? 'View Details' : 'Pay Invoice'}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
