'use client'

import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { useAccount } from '@/lib/use-crosswire-account'
import { getSandboxWires } from '@/lib/sandbox-store'
import { formatUnits } from 'viem'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { CROSSWIRE_CONTRACT_ADDRESS, getExplorerTxUrl } from '@/lib/arc-config'
import { History, Clock, ListTree } from 'lucide-react'

interface WireEvent {
  wireId: string
  sender: string
  recipient: string
  amount: string
  reference: string
  txHash: string
  blockNumber: string
  type: 'initiated' | 'executed' | 'approved' | 'cancelled'
}

export default function HistoryPage() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [events, setEvents] = useState<WireEvent[]>([])
  const [filter, setFilter] = useState<'all' | 'executed' | 'initiated'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'
      try {
        const res = await fetch('/api/wires?limit=100')
        const data = await res.json()
        
        let wires = data.wires || []
        if (isSandbox) {
          const sWires = getSandboxWires()
          wires = [...sWires, ...wires]
        }

        const allEvents: WireEvent[] = wires.map((wire: any) => ({
          wireId: wire.id.toString(),
          sender: wire.sender,
          recipient: wire.recipient,
          amount: formatUnits(
            (wire.amount || '0').toString().includes('.')
              ? BigInt(Math.round(parseFloat(wire.amount) * 1_000_000))
              : BigInt(wire.amount || '0'),
            6
          ),
          reference: wire.refHash,
          txHash: wire.txHash,
          blockNumber: (wire.blockNumber || 0).toString(),
          type: wire.status === 'EXECUTED' ? 'executed' : 'initiated',
        }))

        setEvents(allEvents)
      } catch (err) {
        console.error('Failed to fetch events from API:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
    const interval = setInterval(fetchEvents, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleSandboxChange = () => {
      window.location.reload()
    }
    window.addEventListener('crosswire_sandbox_changed', handleSandboxChange)
    return () => window.removeEventListener('crosswire_sandbox_changed', handleSandboxChange)
  }, [])

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true
    return e.type === filter
  })

  const truncAddr = (a: string) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '—'

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          <h1 className="flex items-center gap-3">
            <History size={32} strokeWidth={1.5} className="text-primary" />
            Transaction Log
          </h1>
          <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
            On-chain event history from CrossWireRouter — verified on Arcscan
          </p>

          {/* Filter Tabs */}
          <div className="tabs">
            <div className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All ({events.length})
            </div>
            <div className={`tab ${filter === 'executed' ? 'active' : ''}`} onClick={() => setFilter('executed')}>
              Executed ({events.filter((e) => e.type === 'executed').length})
            </div>
            <div className={`tab ${filter === 'initiated' ? 'active' : ''}`} onClick={() => setFilter('initiated')}>
              Pending ({events.filter((e) => e.type === 'initiated').length})
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon flex justify-center mb-4" style={{ animation: 'pulse 1.5s infinite' }}>
                <Clock size={32} strokeWidth={1.25} />
              </div>
              <div className="empty-state-text">Loading on-chain events...</div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon flex justify-center mb-4">
                <ListTree size={32} strokeWidth={1.25} />
              </div>
              <div className="empty-state-text">
                {CROSSWIRE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000'
                  ? 'Contract not deployed yet. Deploy CrossWireRouter to Arc Testnet first.'
                  : 'No transactions found. Send your first wire to populate this log.'}
              </div>
            </div>
          ) : (
            <table className="database-table">
              <thead>
                <tr>
                  <th>Wire ID</th>
                  <th>Sender</th>
                  <th>Recipient</th>
                  <th>Amount (USDC)</th>
                  <th>Status</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((evt, i) => (
                  <tr key={`${evt.wireId}-${evt.type}-${i}`} className="animate-fade-in">
                    <td>
                      <span className="badge gray text-mono">#{evt.wireId}</span>
                    </td>
                    <td className="text-mono">{truncAddr(evt.sender)}</td>
                    <td className="text-mono">{truncAddr(evt.recipient)}</td>
                    <td>
                      <strong>${Number(evt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </td>
                    <td>
                      <span className={`badge ${evt.type === 'executed' ? 'green' : 'yellow'}`}>
                        {evt.type === 'executed' ? 'Settled' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <a
                        href={evt.txHash.startsWith('0xmock') ? '#' : getExplorerTxUrl(evt.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link text-mono"
                        onClick={(e) => {
                          if (evt.txHash.startsWith('0xmock')) {
                            e.preventDefault()
                          }
                        }}
                      >
                        {evt.txHash.slice(0, 10)}… ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
