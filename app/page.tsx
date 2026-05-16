'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import { USDC_ADDRESS, CROSSWIRE_CONTRACT_ADDRESS, getExplorerAddressUrl } from '@/lib/arc-config'
import { erc20Abi, crossWireRouterAbi } from '@/lib/contracts'

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
          <h1><span className="page-icon">📊</span>Dashboard</h1>
          <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
            Real-time overview of CrossWire operations on Arc Testnet
          </p>

          {/* Stats Grid */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">USDC Balance</div>
              <div className="stat-value">${Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stat-sub">Arc Testnet</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Wires</div>
              <div className="stat-value">{wireCount}</div>
              <div className="stat-sub">On-chain verified</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Volume Settled</div>
              <div className="stat-value">${Number(totalVolume).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stat-sub">USDC on Arc</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Finality</div>
              <div className="stat-value">&lt;1s</div>
              <div className="stat-sub">Deterministic</div>
            </div>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="callout yellow" style={{ marginTop: '24px' }}>
              <span className="callout-icon">⚠️</span>
              <div>
                <strong>Wallet Not Connected</strong>
                <p className="text-muted text-sm">Connect your wallet using the sidebar to view live on-chain data.</p>
              </div>
            </div>
          )}

          {/* Circle Products Info */}
          <h2>Circle Products Integrated</h2>
          <div className="integration-grid">
            <div className="integration-card">
              <span className="integration-icon">💵</span>
              <div>
                <div className="integration-name">USDC on Arc</div>
                <div className="integration-desc">Native gas token + ERC-20 settlement. 6-decimal precision.</div>
                <span className="badge green" style={{ marginTop: '6px' }}>Active</span>
              </div>
            </div>
            <div className="integration-card">
              <span className="integration-icon">📡</span>
              <div>
                <div className="integration-name">App Kit — Send</div>
                <div className="integration-desc">Same-chain USDC transfers via Circle SDK.</div>
                <span className="badge green" style={{ marginTop: '6px' }}>Active</span>
              </div>
            </div>
            <div className="integration-card">
              <span className="integration-icon">🌉</span>
              <div>
                <div className="integration-name">App Kit — Bridge (CCTP)</div>
                <div className="integration-desc">Cross-chain USDC via Circle Transfer Protocol.</div>
                <span className="badge green" style={{ marginTop: '6px' }}>Active</span>
              </div>
            </div>
            <div className="integration-card">
              <span className="integration-icon">🔄</span>
              <div>
                <div className="integration-name">App Kit — Swap</div>
                <div className="integration-desc">USDC↔EURC conversion via StableFX.</div>
                <span className="badge blue" style={{ marginTop: '6px' }}>Available</span>
              </div>
            </div>
            <div className="integration-card">
              <span className="integration-icon">⚖️</span>
              <div>
                <div className="integration-name">Smart Contract Platform</div>
                <div className="integration-desc">CrossWireRouter deployed on Arc Testnet.</div>
                <span className="badge green" style={{ marginTop: '6px' }}>Deployed</span>
              </div>
            </div>
            <div className="integration-card">
              <span className="integration-icon">🔐</span>
              <div>
                <div className="integration-name">RainbowKit Wallet</div>
                <div className="integration-desc">Multi-wallet connection with WalletConnect.</div>
                <span className="badge green" style={{ marginTop: '6px' }}>Active</span>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <h2>Recent Transactions</h2>
          {recentWires.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗃️</div>
              <div className="empty-state-text">No transactions yet. Send your first wire transfer to see live on-chain data.</div>
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
                      <span className="text-muted text-xs"> USDC</span>
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
              <span className="callout-icon">📜</span>
              <div>
                <strong>CrossWireRouter Contract</strong>
                <p className="text-sm">
                  <a
                    href={getExplorerAddressUrl(CROSSWIRE_CONTRACT_ADDRESS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
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
