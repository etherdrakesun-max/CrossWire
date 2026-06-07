'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { USDC_ADDRESS } from '@/lib/arc-config'
import { erc20Abi } from '@/lib/contracts'
import { 
  Coins, 
  TrendingUp, 
  RefreshCw, 
  Wallet, 
  ArrowRight, 
  ArrowLeftRight, 
  Info, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  Lock 
} from 'lucide-react'
import { useModal } from '@/lib/modal-context'

interface ChainBalance {
  id: string
  name: string
  balance: string
  status: 'active' | 'syncing' | 'offline'
  symbol: string
}

export default function TreasuryPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { showModal, updateModal } = useModal()

  // Real-time USDC Balance on Arc Testnet
  const [arcBalance, setArcBalance] = useState<string>('0.00')
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true)

  // Swap State
  const [tokenIn, setTokenIn] = useState<'USDC' | 'EURC'>('USDC')
  const [tokenOut, setTokenOut] = useState<'USDC' | 'EURC'>('EURC')
  const [amountIn, setAmountIn] = useState<string>('')
  const [amountOut, setAmountOut] = useState<string>('0.00')
  const [isSwapping, setIsSwapping] = useState<boolean>(false)

  // Mock balances for other chains to demonstrate Circle Unified Balance SDK
  const [ethereumSepoliaBal, setEthereumSepoliaBal] = useState<string>('2,500.00')
  const [baseSepoliaBal, setBaseSepoliaBal] = useState<string>('1,850.50')
  const [arbitrumSepoliaBal, setArbitrumSepoliaBal] = useState<string>('3,200.15')

  // Arc Gas Sponsorship Policy & Analytics
  const [sponsorPayroll, setSponsorPayroll] = useState<boolean>(true)
  const [sponsorFX, setSponsorFX] = useState<boolean>(true)
  const [sponsorBridge, setSponsorBridge] = useState<boolean>(false)
  const [gasSavings, setGasSavings] = useState<number>(0)
  const [dailySpent, setDailySpent] = useState<number>(0)
  const [gatewayBalance, setGatewayBalance] = useState<number>(0)
  const [isSettling, setIsSettling] = useState<boolean>(false)

  // StableFX Live Quotes and Trade States
  const [liveQuote, setLiveQuote] = useState<any>(null)
  const [activeQuote, setActiveQuote] = useState<any>(null)
  const [quoteExpiryRemaining, setQuoteExpiryRemaining] = useState<number>(0)
  const [tradeHistory, setTradeHistory] = useState<any[]>([])
  const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false)

  // Fetch real USDC balance on Arc Testnet
  useEffect(() => {
    if (!address || !publicClient) {
      setLoadingBalance(false)
      return
    }

    const fetchBalance = async () => {
      try {
        const bal = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        setArcBalance(formatUnits(bal as bigint, 6))
      } catch (err) {
        console.error('Error fetching balance:', err)
      } finally {
        setLoadingBalance(false)
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [address, publicClient])

  // Fetch real gas savings from sponsorship API
  useEffect(() => {
    if (!address) {
      setGasSavings(0)
      setDailySpent(0)
      return
    }

    const fetchGasSavings = async () => {
      try {
        const res = await fetch(`/api/sponsor?userAddress=${address}`)
        if (res.ok) {
          const data = await res.json()
          setGasSavings(data.userTotal || 0)
          setDailySpent(data.userDailySpent || 0)
        }
      } catch (err) {
        console.error('Error fetching gas savings:', err)
      }
    }

    fetchGasSavings()
    const interval = setInterval(fetchGasSavings, 8000)
    return () => clearInterval(interval)
  }, [address])

  const fetchGatewayBalance = async () => {
    if (!address) {
      setGatewayBalance(0)
      return
    }
    try {
      const res = await fetch(`/api/gateway/balance?userAddress=${address}`)
      if (res.ok) {
        const data = await res.json()
        setGatewayBalance(data.balance || 0)
      }
    } catch (err) {
      console.error('Error fetching gateway balance:', err)
    }
  }

  useEffect(() => {
    fetchGatewayBalance()
    const interval = setInterval(fetchGatewayBalance, 7000)
    return () => clearInterval(interval)
  }, [address])

  // StableFX Live Polling & Active Quote hooks
  const fetchLiveRate = async () => {
    try {
      const res = await fetch(`/api/fx/quote?from=${tokenIn}&to=${tokenOut}&amount=1.0`)
      if (res.ok) {
        const data = await res.json()
        setLiveQuote(data)
      }
    } catch (err) {
      console.error('Error fetching live FX rate:', err)
    }
  }

  useEffect(() => {
    fetchLiveRate()
    const interval = setInterval(fetchLiveRate, 5000)
    return () => clearInterval(interval)
  }, [tokenIn, tokenOut])

  const fetchTradeHistory = async () => {
    if (!address) return
    try {
      const res = await fetch(`/api/fx/execute?userAddress=${address}`)
      if (res.ok) {
        const data = await res.json()
        setTradeHistory(data)
      }
    } catch (err) {
      console.error('Error fetching trade history:', err)
    }
  }

  useEffect(() => {
    fetchTradeHistory()
    const interval = setInterval(fetchTradeHistory, 10000)
    return () => clearInterval(interval)
  }, [address])

  const fetchActiveQuote = async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setActiveQuote(null)
      setAmountOut('0.00')
      return
    }
    setIsQuoteLoading(true)
    try {
      const res = await fetch(`/api/fx/quote?from=${tokenIn}&to=${tokenOut}&amount=${amount}`)
      if (res.ok) {
        const data = await res.json()
        setActiveQuote(data)
        setAmountOut(data.toAmount.toFixed(2))
      }
    } catch (err) {
      console.error('Error fetching active quote:', err)
    } finally {
      setIsQuoteLoading(false)
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchActiveQuote(amountIn)
    }, 450)
    return () => clearTimeout(handler)
  }, [amountIn, tokenIn])

  useEffect(() => {
    if (!activeQuote) {
      setQuoteExpiryRemaining(0)
      return
    }

    const calculateRemaining = () => {
      const diff = new Date(activeQuote.expiresAt).getTime() - Date.now()
      return Math.max(0, Math.ceil(diff / 1000))
    }

    setQuoteExpiryRemaining(calculateRemaining())

    const interval = setInterval(() => {
      const rem = calculateRemaining()
      setQuoteExpiryRemaining(rem)
      if (rem <= 0) {
        fetchActiveQuote(amountIn)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeQuote])

  const handleBatchSettle = async () => {
    setIsSettling(true)
    showModal({
      type: 'loading',
      title: 'Batch Settling Nanopayments',
      description: 'Aggregating accumulated micro-fees off-chain and broadcasting batch settlement to Arc L1...'
    })

    try {
      const res = await fetch('/api/gateway/balance', {
        method: 'POST'
      })

      if (!res.ok) {
        throw new Error('Batch settlement API call failed')
      }

      const data = await res.json()

      if (data.settledCount === 0) {
        updateModal({
          type: 'success',
          title: 'Batch Settlement Complete',
          description: 'No pending micropayment fees require settlement at this time.',
          confirmText: 'Done'
        })
        return
      }

      updateModal({
        type: 'success',
        title: 'Nanopayments Settled On-Chain!',
        description: (
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.6' }}>
            <p>Successfully aggregated and settled <strong>{data.settledCount} pending nanopayments</strong> totaling <strong>${data.totalSettledAmount.toFixed(6)} USDC</strong>.</p>
            <div className="callout" style={{ borderColor: 'var(--success)', background: 'var(--success-bg)', margin: 0 }}>
              <strong className="text-success font-semibold">Settlement Tx Hash</strong>
              <p className="text-mono text-xs mt-1" style={{ wordBreak: 'break-all' }}>{data.settlementTxHash}</p>
            </div>
          </div>
        ),
        confirmText: 'Done'
      })

      fetchGatewayBalance()
    } catch (err: any) {
      console.error('Settle batch error:', err)
      updateModal({
        type: 'error',
        title: 'Batch Settlement Failed',
        description: err?.message || 'Error executing settlement transaction.',
        errorDetails: err?.stack || ''
      })
    } finally {
      setIsSettling(false)
    }
  }

  const handleSwapTokens = () => {
    setTokenIn(prev => prev === 'USDC' ? 'EURC' : 'USDC')
    setTokenOut(prev => prev === 'USDC' ? 'EURC' : 'USDC')
    setAmountIn('')
    setAmountOut('0.00')
    setActiveQuote(null)
  }

  // Calculate Aggregated Unified Balance
  const getAggregatedBalance = () => {
    const arc = parseFloat(arcBalance.replace(/,/g, '')) || 0
    const eth = parseFloat(ethereumSepoliaBal.replace(/,/g, '')) || 0
    const base = parseFloat(baseSepoliaBal.replace(/,/g, '')) || 0
    const arb = parseFloat(arbitrumSepoliaBal.replace(/,/g, '')) || 0
    return (arc + eth + base + arb).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Trigger real StableFX Swap Taker Flow
  const handleExecuteSwap = async () => {
    if (!isConnected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!activeQuote) {
      toast.error('Please request or wait for a valid quote')
      return
    }
    if (quoteExpiryRemaining <= 0) {
      toast.error('Quote has expired. Fetching a new one...')
      fetchActiveQuote(amountIn)
      return
    }

    setIsSwapping(true)
    showModal({
      type: 'loading',
      title: 'Executing StableFX Swap',
      description: `Finalizing swap of ${activeQuote.fromAmount} ${activeQuote.fromCurrency} to ${activeQuote.toAmount} ${activeQuote.toCurrency}...`
    })

    try {
      const res = await fetch('/api/fx/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote: activeQuote,
          userAddress: address,
        }),
      })

      if (!res.ok) {
        throw new Error('StableFX execution API failed')
      }

      const trade = await res.json()

      // Track gas savings equivalent on Arc L1
      setGasSavings(prev => prev + 1.50)

      updateModal({
        type: 'success',
        title: 'StableFX Swap Complete!',
        description: (
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.6' }}>
            <p>Successfully swapped <strong>{trade.sellAmount} {trade.sellCurrency}</strong> to <strong>{trade.buyAmount} {trade.buyCurrency}</strong> on Arc Testnet via StableFX.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--border)', padding: '10px', borderRadius: '4px' }}>
              <div>
                <span className="text-muted block text-xs">Quoted Rate</span>
                <strong>{trade.quotedRate.toFixed(4)}</strong>
              </div>
              <div>
                <span className="text-muted block text-xs">Executed Rate</span>
                <strong>{trade.executedRate.toFixed(4)}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span className="text-muted block text-xs">Slippage</span>
                <strong style={{ color: trade.slippage < 0 ? 'var(--success)' : 'var(--error)' }}>
                  {trade.slippage > 0 ? `+${trade.slippage.toFixed(4)}%` : `${trade.slippage.toFixed(4)}%`}
                </strong>
              </div>
            </div>
            {trade.txHash && (
              <div className="callout" style={{ borderColor: 'var(--success)', background: 'rgba(76, 175, 80, 0.05)', margin: 0 }}>
                <strong className="text-success font-semibold text-xs">Arc Tx Hash</strong>
                <p className="text-mono text-xs mt-1" style={{ wordBreak: 'break-all' }}>{trade.txHash}</p>
              </div>
            )}
          </div>
        ),
        confirmText: 'Done',
      })

      toast.success('FX Swap executed successfully!')
      setAmountIn('')
      setActiveQuote(null)
      fetchTradeHistory()
    } catch (err: any) {
      console.error('Swap execution error:', err)
      updateModal({
        type: 'error',
        title: 'StableFX Swap Failed',
        description: err?.message || 'Transaction was reverted by the EVM.',
        errorDetails: err?.stack || 'Error Code: StableFX_REVERTED_INSUFFICIENT_LIQUIDITY',
      })
    } finally {
      setIsSwapping(false)
    }
  }

  // Consolidated liquidity trigger
  const handleConsolidate = () => {
    showModal({
      type: 'confirm',
      title: 'Consolidate Cross-Chain Balances',
      description: 'This will trigger Circle CCTP to sweep all available testnet USDC across Base, Arbitrum, and Ethereum into your Arc Unified Treasury. Settle in under 20 seconds.',
      confirmText: 'Begin Sweep',
      cancelText: 'Cancel',
      onConfirm: () => {
        showModal({
          type: 'loading',
          title: 'Sweeping Treasury Liquidity',
          description: 'Initiating atomic CCTP burn transactions on Base and Arbitrum Sepolia. Fetching attestation logs...'
        })
        setTimeout(() => {
          updateModal({
            title: 'Validating signatures',
            description: 'Acquiring Circle attestation signatures for Base Sepolia (0x81da...) and Arbitrum (0x29ef...)'
          })
        }, 2000)
        setTimeout(() => {
          updateModal({
            type: 'success',
            title: 'Treasury Restructured!',
            description: 'All assets have been successfully consolidated into Arc Testnet! Aggregated balance is now fully liquid.',
            confirmText: 'Acknowledge'
          })
          setEthereumSepoliaBal('0.00')
          setBaseSepoliaBal('0.00')
          setArbitrumSepoliaBal('0.00')
          // Add to Arc balance
          const totalUSDC = parseFloat(arcBalance) + 2500 + 1850.5 + 3200.15
          setArcBalance(totalUSDC.toFixed(2))
        }, 4500)
      }
    })
  }

  const chains: ChainBalance[] = [
    { id: 'arc', name: 'Arc Testnet (Native)', balance: parseFloat(arcBalance).toLocaleString('en-US', { minimumFractionDigits: 2 }), status: 'active', symbol: 'USDC' },
    { id: 'arb', name: 'Arbitrum Sepolia', balance: arbitrumSepoliaBal, status: 'active', symbol: 'USDC' },
    { id: 'base', name: 'Base Sepolia', balance: baseSepoliaBal, status: 'active', symbol: 'USDC' },
    { id: 'eth', name: 'Ethereum Sepolia', balance: ethereumSepoliaBal, status: 'syncing', symbol: 'USDC' },
  ]

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in">
          <h1 className="flex items-center gap-3">
            <Coins size={32} strokeWidth={1.5} className="text-primary" />
            Treasury & FX Swap
          </h1>
          <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
            Unified balance aggregation across multiple blockchains and low-latency stablecoin FX trading (USDC ↔ EURC)
          </p>          {/* Unified Treasury Stats */}
          <div className="stat-grid" style={{ marginBottom: '32px' }}>
            <div className="stat-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="flex justify-between items-start" style={{ width: '100%' }}>
                  <div className="stat-label">Aggregated Unified Balance (USDC)</div>
                  <button
                    className="btn ghost text-muted"
                    style={{ padding: '2px', minHeight: 'auto', borderRadius: '50%' }}
                    onClick={() => showModal({
                      type: 'confirm',
                      title: 'Concept: Circle Unified Balance',
                      description: (
                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.6' }}>
                          <p><strong>What it is:</strong> A single, logical pool aggregating your corporate USDC balances across multiple partner chains (e.g. Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, and Arc Testnet).</p>
                          <p><strong>Why it matters:</strong> Prevents corporate liquidity fragmentation. Instead of maintaining discrete float accounts on 4 different networks, the treasury team can view, manage, and spend their aggregate cash position from one interface.</p>
                          <p><strong>Under the Hood:</strong> The Circle App Kit SDK detects multichain balances automatically and coordinates atomic CCTP transfers to bridge liquidity when a payment is executed.</p>
                        </div>
                      ),
                      confirmText: 'Got it',
                      cancelText: 'Close'
                    })}
                    title="View Explanation"
                  >
                    <Info size={14} />
                  </button>
                </div>
                <div className="stat-value" style={{ fontSize: '36px', color: 'var(--success)' }}>
                  ${getAggregatedBalance()}
                </div>
                <div className="stat-label mt-2 text-muted">
                  Powered by <code>@circle-fin/app-kit</code> Unified Balance SDK
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <button className="btn primary sm" onClick={handleConsolidate}>
                  Sweep All to Arc Testnet
                </button>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start" style={{ width: '100%' }}>
                <div className="stat-label">USDC Exchange Rate</div>
                <button
                  className="btn ghost text-muted"
                  style={{ padding: '2px', minHeight: 'auto', borderRadius: '50%' }}
                  onClick={() => showModal({
                    type: 'confirm',
                    title: 'Concept: StableFX Conversion',
                    description: (
                      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.6' }}>
                        <p><strong>What it is:</strong> The institutional-grade spot rate for exchange between Circle\'s USD Coin (USDC) and Euro Coin (EURC) on Arc Testnet.</p>
                        <p><strong>Why it matters:</strong> Essential for B2B contractor payouts or supplier invoices settling in Euros while maintaining the main treasury float in US Dollars.</p>
                        <p><strong>Slippage & Fees:</strong> Because trades route through high-liquidity precompiled swap routes on Arc, slippage is nearly zero and transaction costs are completely sponsored.</p>
                      </div>
                    ),
                    confirmText: 'Got it',
                    cancelText: 'Close'
                  })}
                  title="View Explanation"
                >
                  <Info size={14} />
                </button>
              </div>
              <div className="stat-value" style={{ fontSize: '20px' }}>
                {liveQuote ? `1 ${tokenIn} = ${liveQuote.rate.toFixed(4)} ${tokenOut}` : 'Fetching rate...'}
              </div>
              <div className="stat-label mt-2 text-muted">USDC ↔ EURC StableFX</div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start" style={{ width: '100%' }}>
                <div className="stat-label">Arc Network Gas</div>
                <button
                  className="btn ghost text-muted"
                  style={{ padding: '2px', minHeight: 'auto', borderRadius: '50%' }}
                  onClick={() => showModal({
                    type: 'confirm',
                    title: 'Concept: Native USDC Gas',
                    description: (
                      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.6' }}>
                        <p><strong>What it is:</strong> The transaction gas pricing system on the Arc blockchain network.</p>
                        <p><strong>Why it matters:</strong> Unlike Ethereum (requiring ETH) or Polygon (requiring POL/MATIC), Arc uses USDC natively for transaction execution gas. The need to source and hold speculative third-party tokens is entirely eliminated.</p>
                        <p><strong>Corporate Sponsorship:</strong> Using sponsorship gas policy configurations, corporate administrators can completely sponsor contractor or employee gas fees, enabling gas-free onboarding.</p>
                      </div>
                    ),
                    confirmText: 'Got it',
                    cancelText: 'Close'
                  })}
                  title="View Explanation"
                >
                  <Info size={14} />
                </button>
              </div>
              <div className="stat-value" style={{ fontSize: '24px', color: 'var(--success)' }}>
                0.00
              </div>
              <div className="stat-label mt-2 text-muted">Paid in USDC precompiles</div>
            </div>
          </div>

          <div className="page-grid-two-col">
            {/* Left Column: Chain Allocation */}
            <div>
              <h2>Unified Assets Breakdown</h2>
              <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
                Your unified balance is aggregated across all supported Circle partner chains.
              </p>

              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 600 }}>Connected Assets Ledger</span>
                  <span className="badge green">Live Sync</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <table className="database-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Blockchain</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chains.map((chain) => (
                        <tr key={chain.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <span style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: chain.id === 'arc' ? '#00C853' : '#2383e2' 
                              }}></span>
                              <strong>{chain.name}</strong>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${chain.status === 'active' ? 'green' : 'yellow'}`}>
                              {chain.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            {chain.balance} {chain.symbol}
                          </td>
                        </tr>
                      ))}
                      {/* Circle Gateway off-chain balance */}
                      <tr>
                        <td>
                          <div className="flex items-center gap-2">
                            <span style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              background: 'var(--accent)' 
                            }}></span>
                            <strong>Circle Gateway</strong>
                          </div>
                        </td>
                        <td>
                          <span className="badge purple">Off-chain</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--accent)' }}>
                          {gatewayBalance.toFixed(6)} USDC
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                  <span style={{ fontWeight: 600 }}>Circle Gateway Operations</span>
                  <span className="badge purple">Nanopayments</span>
                </div>
                <div className="card-body">
                  <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
                    Micropayments are settled off-chain to circumvent transaction costs. Execute batch settlement to consolidate off-chain fees back onto the Arc L1 blockchain.
                  </p>
                  
                  <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                    <span className="text-xs text-secondary">Gateway Float:</span>
                    <strong className="text-mono font-semibold" style={{ color: 'var(--accent)' }}>
                      ${gatewayBalance.toFixed(6)} USDC
                    </strong>
                  </div>

                  <button
                    className="btn primary lg flex items-center justify-center gap-2"
                    style={{ width: '100%', background: 'var(--accent)', border: 'none' }}
                    onClick={handleBatchSettle}
                    disabled={isSettling}
                  >
                    {isSettling ? 'Broadcasting Settle...' : 'Settle Accumulated Wires'}
                  </button>
                </div>
              </div>

              <div className="callout" style={{ marginTop: '24px' }}>
                <span className="callout-icon text-primary"><Info size={20} strokeWidth={1.5} /></span>
                <div>
                  <strong>Unified Balance Aggregation</strong>
                  <p className="text-muted text-sm mt-1">
                    Circle App Kit aggregates these balances in the frontend client. Users can spend their total unified balance from any chain, and the SDK coordinates CCTP transfers instantly behind the scenes.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: FX Swap Card */}
            <div>
              <h2>StableFX Currency Swap</h2>
              <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
                Swap between USD and Euro stablecoins at institutional spot rates on Arc Testnet.
              </p>

              <div className="card">
                <div className="card-body">
                  {/* From Input */}
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                      <span className="form-label" style={{ margin: 0 }}>Pay</span>
                      <span className="text-xs text-muted">
                        Balance: {tokenIn === 'USDC' ? arcBalance : '0.00'} {tokenIn}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="0.00"
                        className="input-notion"
                        value={amountIn}
                        onChange={(e) => setAmountIn(e.target.value)}
                        style={{ fontSize: '18px', fontWeight: 600 }}
                      />
                      <select 
                        className="input-notion" 
                        value={tokenIn} 
                        onChange={(e) => {
                          const val = e.target.value as 'USDC' | 'EURC'
                          setTokenIn(val)
                          setTokenOut(val === 'USDC' ? 'EURC' : 'USDC')
                        }}
                        style={{ width: '100px', fontSize: '14px', fontWeight: 600 }}
                      >
                        <option value="USDC">USDC</option>
                        <option value="EURC">EURC</option>
                      </select>
                    </div>
                  </div>

                  {/* Switch Button */}
                  <div className="flex justify-center" style={{ margin: '-8px 0 8px' }}>
                    <button 
                      className="btn ghost sm" 
                      onClick={handleSwapTokens}
                      style={{ padding: '6px', borderRadius: '50%' }}
                    >
                      <ArrowLeftRight size={16} strokeWidth={1.5} />
                    </button>
                  </div>

                  {/* To Input */}
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                      <span className="form-label" style={{ margin: 0 }}>Receive (Estimated)</span>
                      <span className="text-xs text-muted">
                        Balance: {tokenOut === 'USDC' ? arcBalance : '0.00'} {tokenOut}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="0.00"
                        className="input-notion"
                        value={amountOut}
                        disabled
                        style={{ fontSize: '18px', fontWeight: 600, opacity: 0.8 }}
                      />
                      <select 
                        className="input-notion" 
                        value={tokenOut} 
                        disabled
                        style={{ width: '100px', fontSize: '14px', fontWeight: 600, opacity: 0.8 }}
                      >
                        <option value="USDC">USDC</option>
                        <option value="EURC">EURC</option>
                      </select>
                    </div>
                  </div>

                  {/* Rate breakdown */}
                  <div className="callout" style={{ margin: '0 0 20px', padding: '12px' }}>
                    <div className="flex justify-between text-xs text-muted" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Live FX Rate:</span>
                      <span className="text-mono font-semibold" style={{ color: 'var(--accent)' }}>
                        {liveQuote ? `1 ${tokenIn} = ${liveQuote.rate.toFixed(4)} ${tokenOut}` : 'Loading...'}
                      </span>
                    </div>
                    {liveQuote && (
                      <div className="flex justify-between text-xs text-muted mt-2" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span>Bid/Ask Spread:</span>
                        <span className="text-mono">
                          Bid: {liveQuote.bidRate.toFixed(4)} | Ask: {liveQuote.askRate.toFixed(4)}
                        </span>
                      </div>
                    )}
                    {activeQuote && (
                      <div className="flex justify-between text-xs text-muted mt-2" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                        <span>Quote Status:</span>
                        <span className={`text-mono ${quoteExpiryRemaining <= 5 ? 'text-warning' : 'text-success'}`}>
                          {quoteExpiryRemaining > 0 ? `Valid for ${quoteExpiryRemaining}s` : 'Refreshing quote...'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Execute Button */}
                  <button 
                    className="btn primary lg flex items-center justify-center gap-2"
                    style={{ width: '100%' }}
                    onClick={handleExecuteSwap}
                    disabled={isSwapping || isQuoteLoading || !activeQuote || quoteExpiryRemaining <= 0}
                  >
                    {isSwapping ? (
                      <><Clock size={16} strokeWidth={1.5} /> Swapping...</>
                    ) : isQuoteLoading ? (
                      <><RefreshCw size={16} className="animate-spin" /> Fetching Quote...</>
                    ) : (
                      <><ArrowRight size={16} strokeWidth={1.5} /> Execute Spot Exchange</>
                    )}
                  </button>
                </div>
              </div>

              {/* Arc Gas Sponsorship Card */}
              <div className="card" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp className="text-success" size={20} strokeWidth={1.5} />
                    Arc Gas Sponsorship
                  </h3>
                  <span className="badge success">Active</span>
                </div>
                
                <p className="text-muted text-xs" style={{ marginBottom: '20px' }}>
                  CrossWire sponsors payroll and treasury gas precompiles directly via the Arc network gas station. Adjust corporate sponsorship settings below.
                </p>

                {/* Sponsorship checkboxes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  <label className="flex items-center gap-3 text-sm cursor-pointer" style={{ userSelect: 'none' }}>
                    <input 
                      type="checkbox" 
                      checked={sponsorPayroll} 
                      onChange={(e) => {
                        setSponsorPayroll(e.target.checked)
                        toast.success(`Gas Sponsorship for Payroll ${e.target.checked ? 'Enabled' : 'Disabled'}`)
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--success)' }}
                    />
                    <div>
                      <strong className="block text-xs" style={{ display: 'block', fontSize: '13px' }}>Sponsor Payroll Wires</strong>
                      <p className="text-xs text-muted" style={{ margin: 0, fontSize: '11px', lineHeight: '1.4' }}>Sponsors employee & contractor salary distributions [Purpose Code: 1]</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 text-sm cursor-pointer" style={{ userSelect: 'none' }}>
                    <input 
                      type="checkbox" 
                      checked={sponsorFX} 
                      onChange={(e) => {
                        setSponsorFX(e.target.checked)
                        toast.success(`Gas Sponsorship for StableFX swaps ${e.target.checked ? 'Enabled' : 'Disabled'}`)
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--success)' }}
                    />
                    <div>
                      <strong className="block text-xs" style={{ display: 'block', fontSize: '13px' }}>Sponsor Currency Swaps</strong>
                      <p className="text-xs text-muted" style={{ margin: 0, fontSize: '11px', lineHeight: '1.4' }}>Sponsors EURC/USDC FX spot exchange conversions</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 text-sm cursor-pointer" style={{ userSelect: 'none' }}>
                    <input 
                      type="checkbox" 
                      checked={sponsorBridge} 
                      onChange={(e) => {
                        setSponsorBridge(e.target.checked)
                        toast.success(`Gas Sponsorship for CCTP bridge ${e.target.checked ? 'Enabled' : 'Disabled'}`)
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--success)' }}
                    />
                    <div>
                      <strong className="block text-xs" style={{ display: 'block', fontSize: '13px' }}>Sponsor CCTP Inbound Bridge</strong>
                      <p className="text-xs text-muted" style={{ margin: 0, fontSize: '11px', lineHeight: '1.4' }}>Sponsors inbound USDC bridge triggers from external L1/L2 networks</p>
                    </div>
                  </label>
                </div>

                <div className="sidebar-divider" style={{ margin: '16px 0', borderTop: '1px solid var(--border)' }} />

                {/* Savings Analytics */}
                <h4 style={{ margin: '0 0 12px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }} className="text-muted">
                  Gas Savings Ledger
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <div className="flex justify-between text-xs" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span className="text-muted">SWIFT Wire Processing Equivalent:</span>
                    <span className="text-mono font-semibold">${(gasSavings * 12.0).toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span className="text-muted">Alternative L1 Gas Estimate:</span>
                    <span className="text-mono font-semibold">${(gasSavings * 4.5).toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span className="text-muted">Arc Gas Sponsorship Savings:</span>
                    <span className="text-success text-mono font-semibold">${gasSavings.toFixed(2)} USDC</span>
                  </div>
                </div>

                {/* Real-time daily limit indicator */}
                <div style={{ width: '100%', background: 'var(--border)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, (dailySpent / 100) * 100)}%`, 
                    background: dailySpent >= 100 ? 'var(--error)' : dailySpent >= 80 ? 'var(--warning)' : 'var(--success)', 
                    height: '100%' 
                  }}></div>
                </div>
                <div className="flex justify-between text-muted mt-2" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                  <span>Daily Sponsored Used: ${dailySpent.toFixed(2)}</span>
                  <span>Limit: $100.00 / day</span>
                </div>
              </div>
            </div>
          </div>

          {/* StableFX Swap History */}
          <div className="card animate-slide-up" style={{ marginTop: '32px' }}>
            <div className="card-header flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>StableFX Transaction History</span>
              <span className="badge purple">On-chain Settlement</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {tradeHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px' }} className="text-muted text-sm">
                  No currency swaps recorded for this wallet.
                </div>
              ) : (
                <table className="database-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Sold</th>
                      <th>Bought</th>
                      <th>Quoted Rate</th>
                      <th>Executed Rate</th>
                      <th>Slippage</th>
                      <th>Transaction Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeHistory.map((trade) => (
                      <tr key={trade.id}>
                        <td className="text-xs text-muted">
                          {new Date(trade.timestamp).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {trade.sellAmount.toFixed(2)} {trade.sellCurrency}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                          +{trade.buyAmount.toFixed(2)} {trade.buyCurrency}
                        </td>
                        <td className="text-mono text-xs">
                          {trade.quotedRate.toFixed(4)}
                        </td>
                        <td className="text-mono text-xs" style={{ fontWeight: 600 }}>
                          {trade.executedRate.toFixed(4)}
                        </td>
                        <td className="text-mono text-xs" style={{ color: trade.slippage < 0 ? 'var(--success)' : 'var(--error)' }}>
                          {trade.slippage > 0 ? `+${trade.slippage.toFixed(4)}%` : `${trade.slippage.toFixed(4)}%`}
                        </td>
                        <td>
                          {trade.txHash ? (
                            <a 
                              href={`https://explorer.testnet.arc.network/tx/${trade.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="explorer-link text-mono text-xs"
                              style={{ color: 'var(--accent)' }}
                            >
                              {trade.txHash.slice(0, 10)}...{trade.txHash.slice(-8)}
                            </a>
                          ) : (
                            <span className="text-muted text-xs">N/A</span>
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
