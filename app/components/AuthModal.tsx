'use client'

import React, { useState } from 'react'
import { useConnect } from 'wagmi'
import { registerPasskey, loginPasskey } from '@/lib/modular-wallet'
import { Fingerprint, Wallet, ShieldAlert, KeyRound, ArrowRight, X, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import ModalPortal from './modal/ModalPortal'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  openRainbowKit: () => void
}

export default function AuthModal({ isOpen, onClose, openRainbowKit }: AuthModalProps) {
  const [mode, setMode] = useState<'SELECT' | 'REGISTER'>('SELECT')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [regStep, setRegStep] = useState<'IDLE' | 'DEVICE' | 'DEPLOY' | 'GAS'>('IDLE')
  const { connectAsync, connectors } = useConnect()

  if (!isOpen) return null

  const passkeyConnector = connectors.find(c => c.id === 'circleModularWallet')

  const handleClose = () => {
    setMode('SELECT')
    setUsername('')
    setRegStep('IDLE')
    onClose()
  }

  const handleMetaMaskConnect = () => {
    handleClose()
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
      await connectAsync({ connector: passkeyConnector })
      toast.success('Successfully authenticated with Passkey!', { id: 'passkey' })
      handleClose()
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
    setRegStep('DEVICE')
    toast.loading('Initializing Passkey setup...', { id: 'passkey' })
    try {
      if (!passkeyConnector) {
        throw new Error('Circle Passkey connector not configured in wagmi provider')
      }
      await registerPasskey(username.trim())
      
      setRegStep('DEPLOY')
      toast.loading('Deploying smart contract wallet...', { id: 'passkey' })
      await new Promise(r => setTimeout(r, 1500))

      setRegStep('GAS')
      toast.loading('Activating sponsored gas relayer...', { id: 'passkey' })
      await new Promise(r => setTimeout(r, 1200))

      await connectAsync({ connector: passkeyConnector })
      toast.success(`Account ${username} registered successfully!`, { id: 'passkey' })
      handleClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Failed to create passkey account', { id: 'passkey' })
    } finally {
      setLoading(false)
      setRegStep('IDLE')
    }
  }

  return (
    <ModalPortal>
      <div className="modal-overlay open" style={{ display: 'flex', zIndex: 10000 }}>
        <div className="modal-content open" style={{ maxWidth: '420px', position: 'relative', textAlign: 'left' }}>
          <button 
            onClick={handleClose} 
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

              {loading ? (
                <div style={{ padding: '8px 0' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 className="animate-spin text-primary" size={18} />
                    Deploying Smart Wallet...
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Step 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%', 
                        background: regStep === 'DEVICE' ? 'rgba(35, 131, 226, 0.15)' : ['DEPLOY', 'GAS'].includes(regStep) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                        border: regStep === 'DEVICE' ? '1px solid var(--primary)' : ['DEPLOY', 'GAS'].includes(regStep) ? '1px solid #10b981' : '1px solid var(--border)',
                        color: ['DEPLOY', 'GAS'].includes(regStep) ? '#10b981' : 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 600
                      }}>
                        {['DEPLOY', 'GAS'].includes(regStep) ? '✓' : '1'}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: regStep === 'DEVICE' ? 600 : 400, color: 'var(--text-primary)' }}>Generating device security keys</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Confirm the biometric scan or PIN on your device</div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: regStep === 'DEPLOY' ? 'rgba(35, 131, 226, 0.15)' : regStep === 'GAS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                        border: regStep === 'DEPLOY' ? '1px solid var(--primary)' : regStep === 'GAS' ? '1px solid #10b981' : '1px solid var(--border)',
                        color: regStep === 'GAS' ? '#10b981' : 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 600
                      }}>
                        {regStep === 'GAS' ? '✓' : '2'}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: regStep === 'DEPLOY' ? 600 : 400, color: 'var(--text-primary)' }}>Deploying contract on Arc</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Instantiating Circle Modular smart account</div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: regStep === 'GAS' ? 'rgba(35, 131, 226, 0.15)' : 'rgba(255,255,255,0.05)',
                        border: regStep === 'GAS' ? '1px solid var(--primary)' : '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 600
                      }}>
                        3
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: regStep === 'GAS' ? 600 : 400, color: 'var(--text-primary)' }}>Activating gas fee sponsorship</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Registering account with paymaster policy</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasskeyRegister}>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label">
                      Choose Username
                    </label>
                    <input 
                      type="text" 
                      className="input-notion" 
                      placeholder="e.g., vitalik"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      type="button" 
                      onClick={() => setMode('SELECT')} 
                      className="btn"
                      style={{ flex: 1, padding: '10px 16px' }}
                      disabled={loading}
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className="btn primary"
                      style={{ flex: 2, padding: '10px 16px' }}
                      disabled={loading}
                    >
                      Create Key
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}
