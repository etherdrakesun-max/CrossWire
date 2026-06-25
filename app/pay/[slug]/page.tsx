'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWalletClient, usePublicClient, useDisconnect } from 'wagmi'
import { useAccount } from '@/lib/use-crosswire-account'
import { getSandboxInvoices, updateSandboxInvoiceStatus, addSandboxWire } from '@/lib/sandbox-store'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import toast from 'react-hot-toast'
import { generateQRCodeUrl } from '@/lib/qrcode'
import { erc20Abi, crossWireRouterAbi } from '@/lib/contracts'
import { USDC_ADDRESS, CROSSWIRE_CONTRACT_ADDRESS, getExplorerTxUrl } from '@/lib/arc-config'
import { parseUnits, keccak256, encodePacked, encodeFunctionData } from 'viem'
import { 
  FileText, 
  Wallet, 
  QrCode, 
  Printer, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Coins,
  ShieldAlert,
  ArrowLeft,
  Fingerprint
} from 'lucide-react'
import AuthModal from '@/app/components/AuthModal'

export default function PublicInvoicePaymentPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const { address, isConnected, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  // State
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // Fetch invoice details
  const fetchInvoice = async () => {
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'
    if (isSandbox) {
      const sInvoices = getSandboxInvoices()
      const found = sInvoices.find(i => i.slug === slug)
      if (found) {
        setInvoice(found)
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch(`/api/invoices/${slug}`)
      if (res.ok) {
        const data = await res.json()
        setInvoice(data)
      } else {
        toast.error('Invoice details not found')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load invoice details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (slug) {
      fetchInvoice()
    }
  }, [slug])

  useEffect(() => {
    const handleSandboxChange = () => {
      fetchInvoice()
    }
    window.addEventListener('crosswire_sandbox_changed', handleSandboxChange)
    return () => window.removeEventListener('crosswire_sandbox_changed', handleSandboxChange)
  }, [slug])

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Handle Payment Execution
  const handlePay = async () => {
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'

    if (!isSandbox && (!isConnected || !address || !walletClient || !publicClient)) {
      toast.error('Please connect your wallet first')
      return
    }

    if (invoice.status === 'PAID') {
      toast.error('This invoice has already been settled')
      return
    }

    const currentPayerAddr = address || '0x3a92dB4F4B84F01A18d96b04C63E63e800000000'
    if (invoice.payerAddr && invoice.payerAddr.toLowerCase() !== currentPayerAddr.toLowerCase()) {
      toast.error(`Access Denied: This invoice is restricted to payer address ${invoice.payerAddr}`)
      return
    }

    setPaying(true)

    if (isSandbox) {
      toast.loading('Processing Sandbox USDC payment wires...', { id: 'pay-toast' })
      setTimeout(() => {
        const mWireId = Math.floor(Math.random() * 89999) + 10000
        const mockTx = '0xmock_settle_invoice_' + Math.random().toString(16).slice(2, 10)

        // 1. Update sandbox invoice status
        updateSandboxInvoiceStatus(invoice.id, 'PAID', currentPayerAddr)

        addSandboxWire({
          sender: currentPayerAddr,
          recipient: invoice.payeeAddr,
          amount: parseUnits(invoice.amount, 6).toString(),
          refHash: mockTx,
          txHash: mockTx,
          status: 'EXECUTED',
          timestamp: new Date().toISOString(),
          memo: `Invoice settlement: ${invoice.memo || 'Untitled invoice'}`,
          purposeCode: 2,
          events: [{
            eventType: 'Executed',
            actor: currentPayerAddr,
            txHash: mockTx,
            timestamp: new Date().toISOString()
          }]
        })

        toast.success('Invoice settled via sponsored Sandbox USDC wire successfully!', { id: 'pay-toast' })
        setPaying(false)
        fetchInvoice()
      }, 1500)
      return
    }

    const amountParsed = parseUnits(invoice.amount, 6) // USDC uses 6 decimals

    try {
      // 1. Check current allowance
      const currentAllowance = await publicClient!.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address!, CROSSWIRE_CONTRACT_ADDRESS],
      }) as bigint

      const reference = keccak256(
        encodePacked(
          ['address', 'address', 'uint256', 'string'],
          [address!, invoice.payeeAddr as `0x${string}`, amountParsed, slug]
        )
      )

      const initiateWireData = encodeFunctionData({
        abi: crossWireRouterAbi,
        functionName: 'initiateWire',
        args: [
          invoice.payeeAddr as `0x${string}`,
          amountParsed,
          reference,
          2, // purposeCode 2: Vendor invoice settlement
          `Invoice: ${invoice.memo || slug}`
        ],
      })

      let txHash: `0x${string}`

      if (connector?.id === 'circleModularWallet') {
        // For Circle Passkey (Smart Account), execute both approve & initiateWire in a single batched UserOperation if allowance is insufficient
        if (currentAllowance < amountParsed) {
          toast.loading('Preparing batched payment (Approve & Settle) via Passkey...', { id: 'pay-toast' })
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [CROSSWIRE_CONTRACT_ADDRESS, amountParsed],
          })
          txHash = await walletClient!.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: address,
                to: USDC_ADDRESS,
                data: approveData,
              },
              {
                from: address,
                to: CROSSWIRE_CONTRACT_ADDRESS,
                data: initiateWireData,
              }
            ] as any
          })
        } else {
          toast.loading('Broadcasting payment wire via Passkey...', { id: 'pay-toast' })
          txHash = await walletClient!.request({
            method: 'eth_sendTransaction',
            params: [{
              from: address,
              to: CROSSWIRE_CONTRACT_ADDRESS,
              data: initiateWireData,
            }]
          })
        }
      } else {
        // EOA Wallet flow: execute sequentially
        if (currentAllowance < amountParsed) {
          toast.loading('Approving USDC allowance...', { id: 'pay-toast' })
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [CROSSWIRE_CONTRACT_ADDRESS, amountParsed],
          })
          const approveHash = await walletClient!.request({
            method: 'eth_sendTransaction',
            params: [{
              from: address,
              to: USDC_ADDRESS,
              data: approveData,
            }]
          })
          await publicClient!.waitForTransactionReceipt({ hash: approveHash })
        }

        toast.loading('Broadcasting payment wire to Arc...', { id: 'pay-toast' })
        txHash = await walletClient!.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: CROSSWIRE_CONTRACT_ADDRESS,
            data: initiateWireData,
          }]
        })
      }

      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash })
      let wireId = 0

      // Read wireId from logs if possible
      if (receipt.logs.length > 0) {
        try {
          const wireLog = receipt.logs.find((l: any) => l.topics[0])
          if (wireLog && wireLog.topics[1]) {
            wireId = Number(BigInt(wireLog.topics[1]))
          }
        } catch { /* OK */ }
      }

      // 3. Call API to mark as PAID
      toast.loading('Finalizing settlement receipt...', { id: 'pay-toast' })
      const updateRes = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: invoice.id,
          status: 'PAID',
          txHash,
          wireId,
          payerAddr: address
        })
      })

      if (updateRes.ok) {
        toast.success('Invoice settled on-chain successfully!', { id: 'pay-toast' })
        fetchInvoice()
      } else {
        toast.error('Failed to log payment status', { id: 'pay-toast' })
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Payment failed: ${err.message || 'Transaction execution failed'}`, { id: 'pay-toast' })
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-950 text-white">
        <div className="text-center">
          <FileText size={48} className="animate-pulse text-primary mx-auto mb-4" />
          <p className="text-sm text-secondary">Retrieving secure invoice details...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-950 text-white">
        <div className="text-center card p-8 max-w-md">
          <ShieldAlert size={48} className="text-danger mx-auto mb-4" />
          <h2>Invoice Not Found</h2>
          <p className="text-sm text-muted mt-2">The request URL you followed does not correspond to an active CrossWire invoice.</p>
          <button onClick={() => router.push('/')} className="btn primary mt-4">Return Home</button>
        </div>
      </div>
    )
  }

  // Generate public pay link
  const payLink = typeof window !== 'undefined' ? `${window.location.origin}/pay/${slug}` : ''
  const qrCodeUrl = generateQRCodeUrl(payLink, 250)

  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <div className="min-h-screen p-8 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          
          {/* Hide header and buttons in print mode */}
          <style jsx global>{`
            @media print {
              body {
                background: #ffffff !important;
                color: #000000 !important;
              }
              .no-print {
                display: none !important;
              }
              .print-paper {
                border: none !important;
                background: #ffffff !important;
                color: #000000 !important;
                box-shadow: none !important;
                max-width: 100% !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .text-muted, .text-secondary {
                color: #4b5563 !important;
              }
              .font-semibold, .text-primary {
                color: #000000 !important;
              }
            }
          `}</style>

          <div className="w-full max-w-3xl no-print flex justify-between items-center mb-6">
            <button 
              onClick={() => router.push('/invoices')}
              className="btn secondary btn-sm flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <div className="flex gap-2">
              <button onClick={() => setQrOpen(!qrOpen)} className="btn secondary btn-sm flex items-center gap-1">
                <QrCode size={14} /> {qrOpen ? 'Hide QR' : 'Show QR'}
              </button>
              <button onClick={handlePrint} className="btn secondary btn-sm flex items-center gap-1">
                <Printer size={14} /> Print / Export PDF
              </button>
              <ConnectButton chainStatus="none" showBalance={false} />
            </div>
          </div>

          {/* QR Code Card if toggled */}
          {qrOpen && (
            <div className="w-full max-w-md card p-6 mb-6 text-center no-print animate-fade-in" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="font-semibold mb-3">Scan to Settle Invoice</h3>
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="Payment QR Code" 
                  className="mx-auto mb-3"
                  style={{ padding: '8px', background: '#ffffff', borderRadius: '8px', border: '1px solid var(--border)', width: '200px', height: '200px' }}
                />
              )}
              <p className="text-xs text-muted">Scan with a mobile wallet or camera to open this payment portal instantly.</p>
            </div>
          )}

          {/* Invoice Sheet */}
          <div className="w-full max-w-3xl card p-8 print-paper relative overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)', borderRadius: '12px' }}>
            
            {/* Status banner */}
            <div className="flex justify-between items-start mb-8 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <FileText className="text-primary" /> Invoice Receipt
                </h1>
                <p className="text-xs text-secondary mt-1">CrossWire Secure Pull-Payment Protocol</p>
              </div>
              <div className="text-right">
                <span className={`badge text-sm uppercase px-3 py-1 ${
                  invoice.status === 'PAID' ? 'success' :
                  invoice.status === 'SENT' ? 'info' :
                  invoice.status === 'CANCELLED' ? 'danger' :
                  'gray'
                }`}>
                  {invoice.status}
                </span>
                <div className="text-xs text-muted mt-2">Reference ID: {invoice.slug.slice(0, 16)}</div>
              </div>
            </div>

            {/* Addresses detail */}
            <div className="address-grid">
              <div>
                <span className="text-xs text-secondary font-semibold uppercase tracking-wider block mb-2">Billed By (Merchant)</span>
                <strong className="text-sm font-mono block break-all" style={{ color: 'var(--text-primary)' }}>{invoice.payeeAddr}</strong>
              </div>
              <div>
                <span className="text-xs text-secondary font-semibold uppercase tracking-wider block mb-2">Billed To (Client)</span>
                {invoice.payerAddr ? (
                  <strong className="text-sm font-mono block break-all" style={{ color: 'var(--text-primary)' }}>{invoice.payerAddr}</strong>
                ) : (
                  <span className="text-sm text-secondary italic">Open link (Payable by any corporate account)</span>
                )}
              </div>
            </div>

            {/* Invoice Items Table */}
            <div style={{ marginBottom: '32px' }}>
              <h3 className="text-xs text-secondary font-semibold uppercase tracking-wider mb-3">Itemized Details</h3>
              <table className="w-full text-left" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, width: '100px' }}>Quantity</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, width: '140px' }}>Price</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600, width: '140px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item: any) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                        <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{item.description}</td>
                        <td style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>{item.quantity}</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{Number(item.unitPrice).toFixed(2)}</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {(item.quantity * parseFloat(item.unitPrice)).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                      <td style={{ padding: '16px', color: 'var(--text-primary)' }}>General wire settlement</td>
                      <td style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>1</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{Number(invoice.amount).toFixed(2)}</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{Number(invoice.amount).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
              <div>
                <div className="mb-4">
                  <span className="text-xs text-secondary font-semibold uppercase tracking-wider block mb-1">Invoice Memo / Reference</span>
                  <p className="text-sm italic" style={{ color: 'var(--text-primary)' }}>"{invoice.memo || 'No description provided'}"</p>
                </div>
                {invoice.dueDate && (
                  <div>
                    <span className="text-xs text-secondary font-semibold uppercase tracking-wider block mb-1">Due Date</span>
                    <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                      <Clock size={14} className="text-warning" />
                      {new Date(invoice.dueDate).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-secondary">Currency:</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>USDC (Arc Testnet)</span>
                </div>
                <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-sm text-secondary">Protocol Fee (0.25%):</span>
                  <span className="text-sm text-muted">Paid by payer</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Total Due:</span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{invoice.amount} USDC</span>
                </div>
              </div>
            </div>

            {/* PAID status or Settle form */}
            {invoice.status === 'PAID' ? (
              <div className="mt-8 p-5 rounded-xl flex items-center gap-3" style={{ background: 'rgba(46, 204, 113, 0.08)', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
                <CheckCircle2 size={24} className="text-success" />
                <div>
                  <strong className="text-sm block" style={{ color: '#2ecc71' }}>Invoice Settled Gaslessly</strong>
                  <span className="text-xs text-secondary">
                    Paid at {new Date(invoice.paidAt).toLocaleDateString()} via transaction{' '}
                    <a 
                      href={getExplorerTxUrl(invoice.txHash)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="underline"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {invoice.txHash.slice(0, 10)}...{invoice.txHash.slice(-8)}
                    </a>
                  </span>
                </div>
              </div>
            ) : invoice.status === 'CANCELLED' ? (
              <div className="mt-8 p-5 rounded-xl flex items-center gap-3" style={{ background: 'rgba(231, 76, 60, 0.08)', border: '1px solid rgba(231, 76, 60, 0.2)' }}>
                <XCircle size={24} className="text-danger" />
                <div>
                  <strong className="text-sm block" style={{ color: '#e74c3c' }}>Invoice Cancelled</strong>
                  <span className="text-xs text-secondary">This billing request has been revoked by the issuer.</span>
                </div>
              </div>
            ) : (
              <div className="mt-8 no-print">
                {isConnected ? (
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handlePay}
                      disabled={paying}
                      className="btn primary w-full text-center py-3 text-base font-semibold flex justify-center items-center gap-2"
                    >
                      <Coins size={18} />
                      {paying ? 'Authorizing & Settle Wire...' : `Pay Invoice (${invoice.amount} USDC)`}
                    </button>
                    <div style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => disconnect()}
                        className="btn ghost text-xs text-muted hover:underline"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Disconnect Wallet ({connector?.id === 'circleModularWallet' ? 'Passkey Smart Account' : 'EOA Wallet'})
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border rounded-xl text-center" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                    <Wallet size={24} className="mx-auto mb-2 text-secondary" />
                    <p className="text-sm text-secondary mb-4">Connect a wallet to authorize USDC transfer on Arc Testnet.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      <button 
                        onClick={() => setIsAuthModalOpen(true)}
                        className="btn primary text-sm flex items-center justify-center gap-1.5"
                        style={{ padding: '10px 20px', borderRadius: '8px' }}
                      >
                        <Fingerprint size={16} /> Connect Passkey Wallet
                      </button>
                      <button 
                        onClick={openConnectModal}
                        className="btn secondary text-sm flex items-center justify-center gap-1.5"
                        style={{ padding: '10px 20px', borderRadius: '8px' }}
                      >
                        <Wallet size={16} /> Connect EOA Wallet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
          
          <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)} 
            openRainbowKit={openConnectModal}
          />
        </div>
      )}
    </ConnectButton.Custom>
  )
}
