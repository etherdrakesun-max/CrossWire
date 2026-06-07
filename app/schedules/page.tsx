'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import RecipientAutocomplete from '../components/RecipientAutocomplete'
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  RefreshCw, 
  History, 
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react'

const PURPOSE_CODES = [
  { code: 1, label: 'Payroll / Salary payout' },
  { code: 2, label: 'Vendor Invoice Settlement' },
  { code: 3, label: 'Intercompany liquidity transfer' },
  { code: 0, label: 'General / Other payment' }
]

export default function SchedulesPage() {
  const { address, isConnected } = useAccount()

  // State
  const [schedules, setSchedules] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Form Fields
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('weekly')
  const [dayOfWeek, setDayOfWeek] = useState('1') // default to Monday
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [memo, setMemo] = useState('')
  const [purposeCode, setPurposeCode] = useState(1)

  // Fetch Schedules & Contacts
  const fetchData = async () => {
    if (!address) return
    setLoading(true)
    try {
      // Fetch schedules
      const schedRes = await fetch(`/api/schedules?ownerAddr=${address}`)
      if (schedRes.ok) {
        const schedData = await schedRes.json()
        setSchedules(schedData)
      }

      // Fetch contacts to display names
      const contactRes = await fetch(`/api/contacts?ownerAddr=${address}`)
      if (contactRes.ok) {
        const contactData = await contactRes.json()
        setContacts(contactData)
      }
    } catch (err) {
      console.error('Error loading schedule page data:', err)
      toast.error('Failed to load recurring schedules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (address) {
      fetchData()
    } else {
      setSchedules([])
    }
  }, [address])

  // Get contact name by address helper
  const getContactName = (addr: string) => {
    const found = contacts.find(c => c.address.toLowerCase() === addr.toLowerCase())
    return found ? found.name : `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Handle Create Schedule
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) {
      toast.error('Connect your wallet first')
      return
    }

    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      toast.error('Enter a valid 42-character recipient address')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Enter a valid amount greater than 0')
      return
    }

    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerAddr: address,
          recipient,
          amount,
          frequency,
          dayOfWeek: frequency === 'weekly' ? Number(dayOfWeek) : undefined,
          dayOfMonth: frequency === 'monthly' ? Number(dayOfMonth) : undefined,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : null,
          memo,
          purposeCode
        })
      })

      if (res.ok) {
        toast.success('Recurring payment scheduled successfully')
        setIsCreating(false)
        // Reset form
        setRecipient('')
        setAmount('')
        setMemo('')
        setFrequency('weekly')
        fetchData()
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || 'Failed to schedule recurring payment')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error scheduling recurring payment')
    }
  }

  // Handle Toggle Status (Pause/Resume)
  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      const res = await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      })

      if (res.ok) {
        toast.success(newStatus === 'ACTIVE' ? 'Schedule resumed' : 'Schedule paused')
        fetchData()
      } else {
        toast.error('Failed to update schedule status')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error updating status')
    }
  }

  // Handle Cancel / Delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this recurring payment schedule?')) return

    try {
      const res = await fetch(`/api/schedules?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Schedule cancelled and removed')
        fetchData()
      } else {
        toast.error('Failed to cancel schedule')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error removing schedule')
    }
  }

  // Trigger Immediate Mock Cron Run for UI demonstration/testing
  const triggerCronRun = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/schedules/execute', {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Execution run finished. Processed ${data.processed} schedules.`)
        fetchData()
      } else {
        toast.error('Cron trigger returned an error')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to trigger execution run')
    } finally {
      setLoading(false)
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
                <Calendar size={32} strokeWidth={1.5} className="text-primary" />
                Recurring & Scheduled Wires
              </h1>
              <p className="text-muted text-sm mt-1">
                Establish corporate payroll, subscription invoices, and programmatic liquidity schedules
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                className="btn secondary" 
                onClick={triggerCronRun} 
                disabled={loading || !isConnected}
                title="Trigger execution runner for active schedules currently due"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Trigger Scheduler Run
              </button>
              <button 
                className="btn primary" 
                onClick={() => setIsCreating(!isCreating)}
                disabled={!isConnected}
              >
                <Plus size={14} /> {isCreating ? 'Cancel Schedule' : 'New Schedule'}
              </button>
            </div>
          </div>

          {!isConnected && (
            <div className="callout warning" style={{ marginBottom: '24px' }}>
              <AlertTriangle size={20} />
              <div>
                <strong>Wallet Disconnected</strong>
                <p className="text-sm text-muted mt-0.5">Connect your corporate wallet to schedule payments, view history, or trigger automatic payroll runs.</p>
              </div>
            </div>
          )}

          {/* Create Form */}
          {isCreating && isConnected && (
            <form onSubmit={handleCreate} className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <h2>Configure Scheduled Payment Flow</h2>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Beneficiary / Contact</label>
                    <RecipientAutocomplete
                      ownerAddr={address || ''}
                      value={recipient}
                      onChange={(val) => setRecipient(val)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Amount (USDC)</label>
                    <input
                      className="input-notion"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 2000.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Frequency</label>
                    <select
                      className="input-notion"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly (Every 14 days)</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {frequency === 'weekly' && (
                    <div className="form-group">
                      <label className="form-label">Day of Week</label>
                      <select
                        className="input-notion"
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(e.target.value)}
                      >
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                        <option value="0">Sunday</option>
                      </select>
                    </div>
                  )}

                  {frequency === 'monthly' && (
                    <div className="form-group">
                      <label className="form-label">Day of Month</label>
                      <input
                        className="input-notion"
                        type="number"
                        min="1"
                        max="31"
                        placeholder="1"
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      className="input-notion"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Date (Optional)</label>
                    <input
                      className="input-notion"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">Memo / Description</label>
                    <input
                      className="input-notion"
                      placeholder="e.g. Weekly retainer fee"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Purpose Classification</label>
                    <select
                      className="input-notion"
                      value={purposeCode}
                      onChange={(e) => setPurposeCode(Number(e.target.value))}
                    >
                      {PURPOSE_CODES.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="btn primary">Schedule Setup</button>
                  <button type="button" className="btn secondary" onClick={() => setIsCreating(false)}>Cancel</button>
                </div>
              </div>
            </form>
          )}

          {/* Active Schedules Table */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header flex justify-between items-center">
              <h2>Active & Paused Schedules</h2>
              <span className="badge gray">{schedules.length} Active</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {schedules.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Clock size={40} strokeWidth={1} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p>No recurring wire schedules configured.</p>
                </div>
              ) : (
                <table className="database-table">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Amount</th>
                      <th>Frequency</th>
                      <th>Status</th>
                      <th>Next Run Date</th>
                      <th>Purpose</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{getContactName(s.recipient)}</strong>
                          <div className="text-secondary text-xs">{s.recipient.slice(0, 6)}...{s.recipient.slice(-4)}</div>
                        </td>
                        <td>
                          <span className="font-semibold text-primary">{s.amount} USDC</span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)' }}>
                            {s.frequency}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${s.status === 'ACTIVE' ? 'success' : s.status === 'PAUSED' ? 'warning' : 'gray'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm">
                            {new Date(s.nextRunAt).toLocaleDateString(undefined, { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs text-secondary">
                            {PURPOSE_CODES.find(p => p.code === s.purposeCode)?.label || 'General'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              className="btn btn-icon secondary"
                              onClick={() => handleToggleStatus(s.id, s.status)}
                              title={s.status === 'ACTIVE' ? 'Pause Schedule' : 'Resume Schedule'}
                            >
                              {s.status === 'ACTIVE' ? <Pause size={12} /> : <Play size={12} />}
                            </button>
                            <button
                              className="btn btn-icon danger"
                              onClick={() => handleDelete(s.id)}
                              title="Delete Schedule"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Execution Logs */}
          <div className="card">
            <div className="card-header flex justify-between items-center">
              <h2><History size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> Execution History</h2>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {schedules.every(s => !s.executions || s.executions.length === 0) ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p>No transactions have been processed by the scheduled wire daemon yet.</p>
                </div>
              ) : (
                <table className="database-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Recipient</th>
                      <th>Amount</th>
                      <th>Transaction Hash</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.flatMap(s => s.executions.map((e: any) => ({ ...e, schedule: s }))).sort((a: any, b: any) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()).slice(0, 15).map((exec: any) => (
                      <tr key={exec.id}>
                        <td>
                          {new Date(exec.executedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td>
                          <strong>{getContactName(exec.schedule.recipient)}</strong>
                        </td>
                        <td>
                          <span className="font-semibold">{exec.schedule.amount} USDC</span>
                        </td>
                        <td>
                          {exec.txHash ? (
                            <a
                              href={`https://testnet.arcscan.app/tx/${exec.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-link flex items-center gap-1 text-xs"
                            >
                              {exec.txHash.slice(0, 8)}...{exec.txHash.slice(-6)}
                              <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-secondary text-xs">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${exec.status === 'SUCCESS' ? 'success' : 'danger'}`}>
                            {exec.status === 'SUCCESS' ? <CheckCircle size={10} style={{ display: 'inline', marginRight: '4px' }} /> : <XCircle size={10} style={{ display: 'inline', marginRight: '4px' }} />}
                            {exec.status}
                          </span>
                          {exec.error && (
                            <div className="text-xs text-secondary" style={{ marginTop: '2px', maxWidth: '250px', whiteSpace: 'normal' }}>
                              Error: {exec.error}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
