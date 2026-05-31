'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { USDC_ADDRESS, CROSSWIRE_CONTRACT_ADDRESS, getExplorerAddressUrl } from '@/lib/arc-config'
import { erc20Abi, crossWireRouterAbi } from '@/lib/contracts'
import { LayoutGrid, AlertTriangle, Code, History } from 'lucide-react'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()

  const [balance, setBalance] = useState<string>('0.00')
  const [wireCount, setWireCount] = useState<string>('0')
  const [totalVolume, setTotalVolume] = useState<string>('0.00')
  const [recentWires, setRecentWires] = useState<any[]>([])

  // Fetch USDC balance
  useEffect(() => {
    if (!address || !publicClient) return

    const fetchData = async () => {
      try {
        // Get USDC balance
        const bal = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        setBalance(formatUnits(bal as bigint, 6))

        // Get contract stats (if deployed)
        if (CROSSWIRE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
          try {
            const stats = await publicClient.readContract({
              address: CROSSWIRE_CONTRACT_ADDRESS,
              abi: crossWireRouterAbi,
              functionName: 'getStats',
            }) as [bigint, bigint]
            setWireCount(stats[0].toString())
            setTotalVolume(formatUnits(stats[1], 6))
          } catch { /* Contract may not be deployed yet */ }

          // Fetch recent WireExecuted events
          try {
            const logs = await publicClient.getLogs({
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
            setRecentWires(logs.slice(-10).reverse())
          } catch { /* Events may not exist yet */ }
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 15000) // Refresh every 15s
    return () => clearInterval(interval)
  }, [address, publicClient])

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          <h1 className="flex items-center gap-3">
            <LayoutGrid size={32} strokeWidth={1.5} className="text-primary" />
            Dashboard
          </h1>
          <p className="text-muted text-sm" style={{ marginBottom: '32px' }}>
            Real-time overview of CrossWire operations on Arc Testnet
          </p>

          {/* Stats Grid */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">USDC Balance</div>
              <div className="stat-value">${Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stat-label mt-2 text-muted">Arc Testnet</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Wires</div>
              <div className="stat-value">{wireCount}</div>
              <div className="stat-label mt-2 text-muted">On-chain verified</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Volume Settled</div>
              <div className="stat-value">${Number(totalVolume).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stat-label mt-2 text-muted">USDC on Arc</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Finality</div>
              <div className="stat-value">&lt;1s</div>
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
                {recentWires.map((log: any, i: number) => (
                  <tr key={i} className="animate-fade-in">
                    <td>
                      <span className="badge gray">#{log.args?.wireId?.toString() || '?'}</span>
                    </td>
                    <td className="text-mono">
                      {log.args?.recipient
                        ? `${log.args.recipient.slice(0, 6)}...${log.args.recipient.slice(-4)}`
                        : '—'}
                    </td>
                    <td>
                      <strong>
                        {log.args?.amount
                          ? `$${Number(formatUnits(log.args.amount, 6)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </strong>
                      <span className="text-muted text-xs ml-1">USDC</span>
                    </td>
                    <td>
                      <a
                        href={`https://testnet.arcscan.app/tx/${log.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
                      >
                        {log.transactionHash?.slice(0, 10)}… ↗
                      </a>
                    </td>
                  </tr>
                ))}
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
