'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { CROSSWIRE_CONTRACT_ADDRESS, getExplorerTxUrl } from '@/lib/arc-config'

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
    if (!publicClient) return
    if (CROSSWIRE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setLoading(false)
      return
    }

    const fetchEvents = async () => {
      setLoading(true)
      try {
        // Fetch WireExecuted events
        const executedLogs = await publicClient.getLogs({
          address: CROSSWIRE_CONTRACT_ADDRESS,
          event: {
            type: 'event',
            name: 'WireExecuted',
            inputs: [
              { indexed: true, name: 'wireId', type: 'uint256' },
              { indexed: true, name: 'sender', type: 'address' },
              { indexed: true, name: 'recipient', type: 'address' },
              { indexed: false, name: 'amount', type: 'uint256' },
              { indexed: false, name: 'refHash', type: 'bytes32' },
            ],
          },
          fromBlock: 0n,
          toBlock: 'latest',
        })

        // Fetch WireInitiated events
        const initiatedLogs = await publicClient.getLogs({
          address: CROSSWIRE_CONTRACT_ADDRESS,
          event: {
            type: 'event',
            name: 'WireInitiated',
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
          fromBlock: 0n,
          toBlock: 'latest',
        })

        const allEvents: WireEvent[] = []

        for (const log of executedLogs) {
          allEvents.push({
            wireId: log.args?.wireId?.toString() || '?',
            sender: (log.args?.sender as string) || '',
            recipient: (log.args?.recipient as string) || '',
            amount: log.args?.amount ? formatUnits(log.args.amount as bigint, 6) : '0',
            reference: (log.args?.refHash as string) || '',
            txHash: log.transactionHash || '',
            blockNumber: log.blockNumber?.toString() || '',
            type: 'executed',
          })
        }

        for (const log of initiatedLogs) {
          const alreadyExecuted = allEvents.find(
            (e) => e.wireId === log.args?.wireId?.toString() && e.type === 'executed'
          )
          if (!alreadyExecuted) {
            allEvents.push({
              wireId: log.args?.wireId?.toString() || '?',
              sender: (log.args?.sender as string) || '',
              recipient: (log.args?.recipient as string) || '',
              amount: log.args?.amount ? formatUnits(log.args.amount as bigint, 6) : '0',
              reference: (log.args?.refHash as string) || '',
              txHash: log.transactionHash || '',
              blockNumber: log.blockNumber?.toString() || '',
              type: 'initiated',
            })
          }
        }

        // Sort by wire ID descending
        allEvents.sort((a, b) => Number(b.wireId) - Number(a.wireId))
        setEvents(allEvents)
      } catch (err) {
        console.error('Failed to fetch events:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
    const interval = setInterval(fetchEvents, 20000)
    return () => clearInterval(interval)
  }, [publicClient])

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
          <h1><span className="page-icon">🗃️</span>Transaction Log</h1>
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
              <div className="empty-state-icon" style={{ animation: 'pulse 1.5s infinite' }}>⏳</div>
              <div className="empty-state-text">Loading on-chain events...</div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗃️</div>
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
                      <span className="badge gray">#{evt.wireId}</span>
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
                        href={getExplorerTxUrl(evt.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
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
