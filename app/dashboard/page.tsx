'use client'

import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { useAccount } from '@/lib/use-crosswire-account'
import { getSandboxWires } from '@/lib/sandbox-store'
import { formatUnits } from 'viem'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { USDC_ADDRESS, CROSSWIRE_CONTRACT_ADDRESS, getExplorerAddressUrl } from '@/lib/arc-config'
import { erc20Abi, crossWireRouterAbi } from '@/lib/contracts'
import { LayoutGrid, AlertTriangle, Code, History, Info, Bell, Sparkles, ArrowRight } from 'lucide-react'
import { useModal } from '@/lib/modal-context'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import { registerPushSubscription } from '@/lib/push-notifications'
import toast from 'react-hot-toast'


export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { showModal } = useModal()

  const [balance, setBalance] = useState<string>('0.00')
  const [wireCount, setWireCount] = useState<string>('0')
  const [totalVolume, setTotalVolume] = useState<string>('0.00')
  const [recentWires, setRecentWires] = useState<any[]>([])
  const [miniChartData, setMiniChartData] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/analytics/volume?range=7')
      .then(res => res.json())
      .then(res => {
        if (res.data) setMiniChartData(res.data)
      })
      .catch(err => console.error('Error loading mini dashboard chart data:', err))
  }, [address])

  useEffect(() => {
    const handleSandboxChange = () => {
      window.location.reload()
    }
    window.addEventListener('crosswire_sandbox_changed', handleSandboxChange)
    return () => window.removeEventListener('crosswire_sandbox_changed', handleSandboxChange)
  }, [])


  // Fetch USDC balance & stats
  useEffect(() => {
    const fetchData = async () => {
      const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'
      
      if (!isSandbox && (!address || !publicClient)) return

      try {
        if (isSandbox) {
          setBalance('150000.00')
        } else {
          // Get USDC balance
          const bal = await publicClient!.readContract({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address!],
          })
          setBalance(formatUnits(bal as bigint, 6))
        }

        // Get stats & recent wires from API
        try {
          const statsRes = await fetch('/api/stats')
          const statsData = await statsRes.json()
          if (statsData) {
            let wires = statsData.recentWires || []
            let count = BigInt(statsData.wireCount || '0')
            let volume = BigInt(statsData.totalVolume || '0')

            if (isSandbox) {
              const sWires = getSandboxWires()
              // Merge and format
              wires = [...sWires, ...wires]
              count += BigInt(sWires.length)
              const sVol = sWires.reduce((acc, w) => acc + BigInt(w.amount), 0n)
              volume += sVol
            }

            setWireCount(count.toString())
            setTotalVolume(formatUnits(volume, 6))
            setRecentWires(wires)
          }
        } catch (err) {
          console.error('Dashboard API fetch error:', err)
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [address, publicClient])

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          {/* AI Workspace Promotion */}
          <a
            href="/workspace"
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 20px',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(168, 85, 247, 0.08))',
              borderColor: 'rgba(59, 130, 246, 0.2)',
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={24} style={{ color: '#3b82f6', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '14px' }}>Try the new AI Workspace</strong>
              <p className="text-muted text-sm" style={{ margin: '2px 0 0' }}>
                Chat with CrossWire AI to manage payments, invoices, compliance, and treasury — all from one place.
              </p>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          </a>

          <h1 className="flex items-center gap-3">
            <LayoutGrid size={32} strokeWidth={1.5} className="text-primary" />
            Dashboard
          </h1>
          <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
            Real-time overview of CrossWire operations on Arc Testnet
          </p>

          {isConnected && (
            <div className="flex items-center gap-3" style={{ marginBottom: '32px' }}>
              <button
                onClick={async () => {
                  if (address) {
                    const ok = await registerPushSubscription(address)
                    if (ok) {
                      toast.success('Push notifications successfully enabled!')
                    } else {
                      toast.error('Failed to enable push notifications. Check settings.')
                    }
                  }
                }}
                className="btn primary flex items-center gap-2"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <Bell size={14} /> Enable Push Notifications
              </button>
              <span className="text-xs text-muted">Stay updated on settlements, secondary approvals, and invoices on your mobile device.</span>
            </div>
          )}


          {/* Stats Grid */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="flex justify-between items-start" style={{ width: '100%' }}>
                <div className="stat-label">USDC Balance</div>
                <button
                  className="btn ghost text-muted"
                  style={{ padding: '2px', minHeight: 'auto', borderRadius: '50%' }}
                  onClick={() => showModal({
                    type: 'confirm',
                    title: 'Metric: USDC Balance',
                    description: (
                      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.6' }}>
                        <p><strong>What it is:</strong> The current liquid balance of USD Coin (USDC) held in your connected wallet address on the Arc network.</p>
                        <p><strong>Why it matters:</strong> Corporate wire routing, remittances, and automated payroll payouts require active USDC float. Since Arc uses USDC natively, this balance is also used to pay execution gas fees.</p>
                        <p><strong>Verification:</strong> Live on-chain balance fetched via RPC from the official ERC-20 contract address on Arc Testnet.</p>
                      </div>
                    ),
                    confirmText: 'Got it',
                    cancelText: 'Close'
                  })}
                  title="View Metric Explanation"
                >
                  <Info size={14} />
                </button>
              </div>
              <div className="stat-value">${Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              
              {/* Mini Trend Line */}
              {miniChartData.length > 0 && (
                <div style={{ height: '32px', width: '100%', marginTop: '8px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={miniChartData}>
                      <Area 
                        type="monotone" 
                        dataKey="volume" 
                        stroke="#3b82f6" 
                        fill="rgba(59, 130, 246, 0.05)" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="stat-label mt-2 text-muted">Arc Testnet</div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start" style={{ width: '100%' }}>
                <div className="stat-label">Total Wires</div>
                <button
                  className="btn ghost text-muted"
                  style={{ padding: '2px', minHeight: 'auto', borderRadius: '50%' }}
                  onClick={() => showModal({
                    type: 'confirm',
                    title: 'Metric: Total Wires',
                    description: (
                      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.6' }}>
                        <p><strong>What it is:</strong> The absolute number of wire transfers initiated and recorded globally through the CrossWireRouter smart contract.</p>
                        <p><strong>Why it matters:</strong> Indicates pipeline utility, transaction throughput, and accounting reliability. Every wire generates an immutable, unique on-chain Wire ID.</p>
                        <p><strong>Verification:</strong> Queried directly from the smart contract state counter, incrementing automatically with every successful <code>WireExecuted</code> event.</p>
                      </div>
                    ),
                    confirmText: 'Got it',
                    cancelText: 'Close'
                  })}
                  title="View Metric Explanation"
                >
                  <Info size={14} />
                </button>
              </div>
              <div className="stat-value">{wireCount}</div>

              {/* Mini Trend Line */}
              {miniChartData.length > 0 && (
                <div style={{ height: '32px', width: '100%', marginTop: '8px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={miniChartData}>
                      <Area 
                        type="monotone" 
                        dataKey="wires" 
                        stroke="#a855f7" 
                        fill="rgba(168, 85, 247, 0.05)" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="stat-label mt-2 text-muted">On-chain verified</div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start" style={{ width: '100%' }}>
                <div className="stat-label">Volume Settled</div>
                <button
                  className="btn ghost text-muted"
                  style={{ padding: '2px', minHeight: 'auto', borderRadius: '50%' }}
                  onClick={() => showModal({
                    type: 'confirm',
                    title: 'Metric: Volume Settled',
                    description: (
                      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.6' }}>
                        <p><strong>What it is:</strong> The total aggregate volume in US Dollars (represented by USDC) successfully settled through CrossWire.</p>
                        <p><strong>Why it matters:</strong> Reflects the total financial scale processed securely. It represents funds that bypassed costly legacy banking networks.</p>
                        <p><strong>Verification:</strong> Running aggregate stored immutably inside the contract and updated atomically on-chain with every wire completion.</p>
                      </div>
                    ),
                    confirmText: 'Got it',
                    cancelText: 'Close'
                  })}
                  title="View Metric Explanation"
                >
                  <Info size={14} />
                </button>
              </div>
              <div className="stat-value">${Number(totalVolume).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>

              {/* Mini Trend Line */}
              {miniChartData.length > 0 && (
                <div style={{ height: '32px', width: '100%', marginTop: '8px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={miniChartData}>
                      <Area 
                        type="monotone" 
                        dataKey="volume" 
                        stroke="#10b981" 
                        fill="rgba(16, 185, 129, 0.05)" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="stat-label mt-2 text-muted">USDC on Arc</div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start" style={{ width: '100%' }}>
                <div className="stat-label">Finality</div>
                <button
                  className="btn ghost text-muted"
                  style={{ padding: '2px', minHeight: 'auto', borderRadius: '50%' }}
                  onClick={() => showModal({
                    type: 'confirm',
                    title: 'Metric: Sub-Second Finality',
                    description: (
                      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.6' }}>
                        <p><strong>What it is:</strong> The duration required for an initiated payment to reach permanent, irrevocable settlement on-chain.</p>
                        <p><strong>Why it matters:</strong> Legacy SWIFT takes 3 to 5 days. Arc network protocols enable deterministic transaction settlement in under 1 second. No block confirmation depth is required by finance teams.</p>
                        <p><strong>Verification:</strong> Governed by Arc\'s high-speed consensus, which confirms and seals blocks sequentially in sub-second intervals.</p>
                      </div>
                    ),
                    confirmText: 'Got it',
                    cancelText: 'Close'
                  })}
                  title="View Metric Explanation"
                >
                  <Info size={14} />
                </button>
              </div>
              <div className="stat-value">&lt;1s</div>

              {/* Micro visual simulation line for finality */}
              {miniChartData.length > 0 && (
                <div style={{ height: '32px', width: '100%', marginTop: '8px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={miniChartData}>
                      <Area 
                        type="monotone" 
                        dataKey="wires" 
                        stroke="#f59e0b" 
                        fill="rgba(245, 158, 11, 0.05)" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="stat-label mt-2 text-muted">Deterministic</div>
            </div>
          </div>


          {/* Connection Status */}
          {!isConnected && (
            <div className="callout" style={{ borderColor: 'var(--warning)', background: 'var(--warning-bg)' }}>
              <span className="callout-icon text-warning">
                <AlertTriangle size={20} strokeWidth={1.5} />
              </span>
              <div>
                <strong className="text-warning">Wallet Not Connected</strong>
                <p className="text-warning text-sm opacity-80 mt-1">Connect your wallet using the sidebar to view live on-chain data.</p>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <h2>Recent Transactions</h2>
          {recentWires.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon flex justify-center mb-4">
                <History size={32} strokeWidth={1.25} />
              </div>
              <div>No transactions yet. Send your first wire transfer to see live on-chain data.</div>
            </div>
          ) : (
            <table className="database-table">
              <thead>
                <tr>
                  <th>Wire ID</th>
                  <th>Recipient</th>
                  <th>Amount</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {recentWires.map((log: any, i: number) => {
                  const wireIdStr = log.args?.wireId?.toString() || log.id?.toString() || '?'
                  const recipientAddr = log.args?.recipient || log.recipient
                  const rawAmount = log.args?.amount || log.amount
                  const transactionHash = log.transactionHash || log.txHash

                  return (
                    <tr key={i} className="animate-fade-in">
                      <td>
                        <span className="badge gray">#{wireIdStr}</span>
                      </td>
                      <td className="text-mono">
                        {recipientAddr
                          ? `${recipientAddr.slice(0, 6)}...${recipientAddr.slice(-4)}`
                          : '—'}
                      </td>
                      <td>
                        <strong>
                          {rawAmount
                            ? `$${Number(formatUnits(BigInt(rawAmount), 6)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </strong>
                        <span className="text-muted text-xs ml-1">USDC</span>
                      </td>
                      <td>
                        {transactionHash ? (
                          <a
                            href={transactionHash.startsWith('0xmock') ? '#' : `https://testnet.arcscan.app/tx/${transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="explorer-link"
                            onClick={(e) => {
                              if (transactionHash.startsWith('0xmock')) {
                                e.preventDefault()
                                toast('This is a simulated Sandbox Transaction.')
                              }
                            }}
                          >
                            {transactionHash.slice(0, 10)}… ↗
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Contract Info */}
          {CROSSWIRE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' && (
            <div className="callout" style={{ marginTop: '24px' }}>
              <span className="callout-icon"><Code size={20} strokeWidth={1.5} /></span>
              <div>
                <strong>CrossWireRouter Contract</strong>
                <p className="text-sm mt-1">
                  <a
                    href={getExplorerAddressUrl(CROSSWIRE_CONTRACT_ADDRESS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link text-mono"
                  >
                    {CROSSWIRE_CONTRACT_ADDRESS} ↗
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
