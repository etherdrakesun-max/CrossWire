'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from '@/lib/use-crosswire-account'
import { Lock, Fingerprint, ShieldAlert, Server } from 'lucide-react'
import AuthModal from './AuthModal'

interface AuthGateProps {
  children: React.ReactNode
}

export default function AuthGate({ children }: AuthGateProps) {
  const { isConnected, address } = useAccount()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Ensure client-side only rendering check to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div 
        style={{ 
          minHeight: '100vh', 
          background: '#0a0a0a', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
          Loading secure gateway...
        </div>
      </div>
    )
  }

  const handleSandboxConnect = () => {
    localStorage.setItem('crosswire_sandbox', 'true')
    window.dispatchEvent(new Event('crosswire_sandbox_changed'))
  }

  // If authenticated, render children normally
  if (isConnected && address) {
    return <>{children}</>
  }

  // Otherwise, render the secure authentication gate
  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        background: 'radial-gradient(circle at 50% 120%, #111827, #030712)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div 
        style={{ 
          maxWidth: '480px', 
          width: '100%',
          background: 'rgba(10, 10, 10, 0.75)', 
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 40px rgba(59, 130, 246, 0.05)',
          borderRadius: '16px',
          padding: '40px 32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle decorative glow */}
        <div 
          style={{ 
            position: 'absolute', 
            top: '-50px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: '200px', 
            height: '100px', 
            background: 'rgba(59, 130, 246, 0.15)', 
            filter: 'blur(40px)', 
            pointerEvents: 'none',
            borderRadius: '50%'
          }} 
        />

        {/* Lock Icon */}
        <div 
          style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '16px', 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            color: '#3b82f6',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.15)'
          }}
        >
          <Lock size={28} className="animate-pulse" />
        </div>

        <h1 
          style={{ 
            fontSize: '24px', 
            fontWeight: 600, 
            color: '#f3f4f6', 
            marginBottom: '12px',
            letterSpacing: '-0.02em'
          }}
        >
          Secure Gate Required
        </h1>
        
        <p 
          style={{ 
            fontSize: '14px', 
            color: '#9ca3af', 
            lineHeight: '1.6', 
            marginBottom: '32px'
          }}
        >
          To access the CrossWire treasury platform, invoices ledger, compliance audit logs, and AI agents, please authenticate your session below.
        </p>

        {/* Buttons Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'transform 0.2s, opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Fingerprint size={18} />
            Authenticate Corporate Wallet
          </button>

          <button 
            onClick={handleSandboxConnect}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              padding: '14px 20px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              color: '#f59e0b',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.08)'}
          >
            <Server size={18} />
            Quick Access Sandbox Wallet
          </button>
        </div>

        {/* Security Trust Badges */}
        <div 
          style={{ 
            marginTop: '32px', 
            padding: '16px', 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid rgba(255, 255, 255, 0.04)', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px',
            textAlign: 'left'
          }}
        >
          <ShieldAlert size={20} style={{ color: '#9ca3af', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>
            CrossWire operates fully non-custodial, permissionless settlement rails using Circle smart accounts. All on-chain transfers are secured using dual cryptographic signatures.
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        openRainbowKit={() => {
          const btn = document.querySelector('[aria-label="Connect Wallet"]') as HTMLButtonElement
          if (btn) btn.click()
        }}
      />
    </div>
  )
}
