import React from 'react'
import { Zap, HelpCircle } from 'lucide-react'

interface MicroPaymentToggleProps {
  isMicroMode: boolean
  onToggle: (val: boolean) => void
  disabled?: boolean
}

export default function MicroPaymentToggle({
  isMicroMode,
  onToggle,
  disabled = false
}: MicroPaymentToggleProps) {
  return (
    <div 
      className="card animate-fade-in" 
      style={{
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          background: isMicroMode ? 'var(--accent)' : 'var(--border)',
          transition: 'background 0.3s ease'
        }}
      />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: isMicroMode ? 'rgba(var(--accent-rgb, 124, 58, 237), 0.15)' : 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isMicroMode ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'all 0.3s ease'
            }}
          >
            <Zap size={18} fill={isMicroMode ? 'currentColor' : 'none'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                Gateway Nanopayment Mode
              </strong>
              <div className="tooltip-trigger" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <HelpCircle size={14} />
              </div>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {isMicroMode 
                ? 'Under $10.00 USDC automatically routed off-chain gaslessly via Circle Gateway.' 
                : 'Standard on-chain wire transfer routing.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => !disabled && onToggle(!isMicroMode)}
          disabled={disabled}
          style={{
            position: 'relative',
            width: '48px',
            height: '24px',
            borderRadius: '12px',
            background: isMicroMode ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '2px',
            transition: 'background 0.3s ease',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div 
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'white',
              transform: isMicroMode ? 'translateX(24px)' : 'translateX(0px)',
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          />
        </button>
      </div>
    </div>
  )
}
