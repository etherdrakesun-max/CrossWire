'use client'

import React, { useState } from 'react'
import { useConnect } from 'wagmi'
import { registerPasskey, loginPasskey } from '@/lib/modular-wallet'
import { Fingerprint, Wallet, ShieldAlert, KeyRound, ArrowRight, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  openRainbowKit: () => void
}

export default function AuthModal({ isOpen, onClose, openRainbowKit }: AuthModalProps) {
  const [mode, setMode] = useState<'SELECT' | 'REGISTER'>('SELECT')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const { connect, connectors } = useConnect()

  if (!isOpen) return null

  const passkeyConnector = connectors.find(c => c.id === 'circleModularWallet')

  const handleMetaMaskConnect = () => {
    onClose()
    openRainbowKit()
  }

  const handlePasskeyLogin = async () => {
    setLoading(true)
    toast.loading('Authenticating via Passkey...', { id: 'passkey' })
    try {
      if (!passkeyConnector) {
        throw new Error('Circle Passkey connector not configured in wagmi provider')
      }
      await loginPasskey()
      connect({ connector: passkeyConnector })
      toast.success('Successfully authenticated with Passkey!', { id: 'passkey' })
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Passkey authentication failed', { id: 'passkey' })
    } finally {
      setLoading(false)
    }
  }

  const handlePasskeyRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      toast.error('Please enter a username')
      return
    }

    setLoading(true)
    toast.loading('Creating Passkey on device...', { id: 'passkey' })
    try {
      if (!passkeyConnector) {
        throw new Error('Circle Passkey connector not configured in wagmi provider')
      }
      await registerPasskey(username.trim())
      connect({ connector: passkeyConnector })
      toast.success(`Account ${username} registered successfully!`, { id: 'passkey' })
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Failed to create passkey account', { id: 'passkey' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay open" style={{ display: 'flex', zIndex: 10000 }}>
      <div className="modal-content open" style={{ maxWidth: '420px', position: 'relative', textAlign: 'left' }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>

        {mode === 'SELECT' ? (
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              Connect to CrossWire
            </h2>
            <p className="modal-description" style={{ marginBottom: '24px' }}>
              Choose how you want to secure and access your business wire account.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Option 1: Passkey Sign In */}
              <button 
                onClick={handlePasskeyLogin} 
                disabled={loading}
                className="btn primary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '16px 20px', 
                  height: 'auto',
                  background: 'linear-gradient(135deg, #2383e2 0%, #1a5bb8 100%)',
                  borderRadius: '12px',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Fingerprint size={24} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>Sign in with Passkey</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>Touch ID, Face ID, or Windows Hello</div>
                  </div>
                </div>
                <ArrowRight size={16} />
              </button>

              {/* Option 2: Passkey Register */}
              <button 
                onClick={() => setMode('REGISTER')} 
                disabled={loading}
                className="btn secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '16px 20px', 
                  height: 'auto',
                  borderRadius: '12px',
                  textAlign: 'left',
                  border: '1px dashed var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <KeyRound size={24} style={{ color: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>Create Passkey Account</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Instantiate a new smart wallet on Arc</div>
                  </div>
                </div>
                <ArrowRight size={16} />
              </button>

              <div style={{ margin: '8px 0', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                — OR —
              </div>

              {/* Option 3: Browser Wallet */}
              <button 
                onClick={handleMetaMaskConnect} 
                disabled={loading}
                className="btn secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '16px 20px', 
                  height: 'auto',
                  borderRadius: '12px',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Wallet size={24} style={{ color: '#f5841f' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>Browser Extension</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>MetaMask, WalletConnect, etc.</div>
                  </div>
                </div>
                <ArrowRight size={16} />
              </button>
            </div>
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', padding: '12px', background: 'var(--card-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <ShieldAlert size={28} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Passkey accounts use Circle Modular Wallet architecture. Gas sponsorship is active, meaning you won't need native gas tokens for USDC operations.
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              Create Passkey Wallet
            </h2>
            <p className="modal-description" style={{ marginBottom: '20px' }}>
              Register a username to associate with your new secure smart contract account.
            </p>

            <form onSubmit={handlePasskeyRegister}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Choose Username
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g., vitalik"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%' }}
                  disabled={loading}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setMode('SELECT')} 
                  className="btn secondary"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  className="btn primary"
                  style={{ flex: 2 }}
                  disabled={loading}
                >
                  Create Key
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
