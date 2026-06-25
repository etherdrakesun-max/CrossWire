'use client'

import React, { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import { USDC_ADDRESS, getExplorerAddressUrl } from '@/lib/arc-config'
import { erc20Abi } from '@/lib/contracts'
import { getStoredSession } from '@/lib/modular-wallet'
import { Shield, Copy, Check, LogOut, ExternalLink, RefreshCw, Landmark, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface WalletProfileModalContentProps {
  address: `0x${string}`
  connectorName: string
  isPasskey: boolean
  isSandbox: boolean
  onClose: () => void
  disconnect: () => void
}

export default function WalletProfileModalContent({
  address,
  connectorName,
  isPasskey,
  isSandbox,
  onClose,
  disconnect
}: WalletProfileModalContentProps) {
  const publicClient = usePublicClient()
  const [balance, setBalance] = useState<string>('Loading...')
  const [copied, setCopied] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (isPasskey) {
      const session = getStoredSession()
      if (session) {
        setUsername(session.username)
      }
    }
  }, [isPasskey])

  const fetchBalance = async () => {
    if (isSandbox) {
      setBalance('150,000.00')
      return
    }
    if (!address || !publicClient) return
    setIsRefreshing(true)
    try {
      const bal = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })
      setBalance(Number(formatUnits(bal as bigint, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    } catch (err) {
      console.error('Error fetching balance in modal:', err)
      setBalance('0.00')
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBalance()
    // Poll every 5 seconds for real-time balance
    const interval = setInterval(fetchBalance, 5000)
    return () => clearInterval(interval)
  }, [address, publicClient, isSandbox])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    toast.success('Address copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDisconnect = () => {
    try {
      if (isSandbox) {
        localStorage.setItem('crosswire_sandbox', 'false')
        window.dispatchEvent(new Event('crosswire_sandbox_changed'))
      } else {
        // Manually clear local session representation as a fallback
        if (typeof window !== 'undefined') {
          localStorage.removeItem('crosswire_passkey_session')
        }
        disconnect()
      }
      toast.success('Wallet disconnected successfully')
    } catch (err) {
      console.error('Error during disconnect:', err)
      toast.error('An error occurred while disconnecting the session.')
    } finally {
      onClose()
    }
  }

  return (
    <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      {/* Close button */}
      <button 
        onClick={onClose} 
        style={{ 
          position: 'absolute', 
          top: '-16px', 
          right: '-16px', 
          background: 'none', 
          border: 'none', 
          color: 'var(--text-secondary)', 
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        title="Close profile details"
      >
        <X size={18} />
      </button>
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: isSandbox ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          border: isSandbox ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isSandbox ? 'var(--warning)' : 'var(--primary)'
        }}>
          {isSandbox ? <Landmark size={24} /> : <Shield size={24} />}
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            {isSandbox ? 'Sandbox Corporate Account' : username ? `Passkey: ${username}` : connectorName}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            {isSandbox ? 'Simulated Local Environment' : isPasskey ? 'Circle Smart Contract Account' : 'External Web3 Account'}
          </p>
        </div>
      </div>

      {/* Balance Block */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Real-Time Balance
          </span>
          <button 
            onClick={fetchBalance}
            disabled={isRefreshing}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
            title="Refresh balance"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-primary)' }}>
          ${balance} <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-secondary)' }}>USDC</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Asset: USD Coin • Network: Arc Testnet
        </div>
      </div>

      {/* Address details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Wallet Address
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{
            flex: 1,
            padding: '10px 12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '12px',
            color: 'var(--text-primary)',
            wordBreak: 'break-all',
            userSelect: 'all'
          }}>
            {address}
          </div>
          <button 
            onClick={copyToClipboard}
            className="btn"
            style={{ padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Copy address"
          >
            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <a 
          href={getExplorerAddressUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
        >
          <ExternalLink size={14} /> Arc Explorer
        </a>
        <button 
          onClick={handleDisconnect}
          className="btn danger"
          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
        >
          <LogOut size={14} /> Disconnect
        </button>
      </div>
    </div>
  )
}
