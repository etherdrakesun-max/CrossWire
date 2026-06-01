'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { USDC_ADDRESS, CROSSWIRE_CONTRACT_ADDRESS, getExplorerAddressUrl } from '@/lib/arc-config'
import { erc20Abi, crossWireRouterAbi } from '@/lib/contracts'
import { LayoutGrid, AlertTriangle, Code, History, Info } from 'lucide-react'
import { useModal } from '@/lib/modal-context'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { showModal } = useModal()

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
                        <p><strong>Why it matters:</strong> Legacy SWIFT takes 3 to 5 days. Arc network precompiles enable deterministic transaction settlement in under 1 second. No block confirmation depth is required by finance teams.</p>
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
