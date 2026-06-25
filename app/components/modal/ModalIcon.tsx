'use client'

import React from 'react'
import { 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Lock, 
  Key, 
  ShieldAlert, 
  RefreshCw,
  Info
} from 'lucide-react'
import { ModalType } from '@/lib/modal/types'

interface ModalIconProps {
  type: ModalType
  destructive?: boolean
  txStatus?: string
  systemAlertType?: 'info' | 'warning' | 'error' | 'critical'
}

export default function ModalIcon({ type, destructive, txStatus, systemAlertType }: ModalIconProps) {
  // Legacy mappings
  const resolvedType = type === 'confirm' ? 'confirmation' : type === 'loading' ? 'processing' : type === 'tx-status' ? 'transaction' : type

  const renderIcon = () => {
    switch (resolvedType) {
      case 'confirmation':
        return (
          <div className="modal-icon-wrapper confirmation animate-scale-up" style={{ color: destructive ? 'var(--danger)' : 'var(--text-primary)', background: destructive ? 'var(--danger-bg)' : 'var(--bg-secondary)' }}>
            <HelpCircle size={28} strokeWidth={1.5} />
          </div>
        )

      case 'processing':
        return (
          <div className="modal-icon-wrapper processing" style={{ color: 'var(--accent)' }}>
            <div className="premium-spinner">
              <span className="sr-only">Processing...</span>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="modal-icon-wrapper success animate-scale-up" style={{ color: 'var(--success)', background: 'var(--success-bg)' }}>
            <CheckCircle2 size={28} strokeWidth={1.5} className="animate-checkmark" />
          </div>
        )

      case 'error':
        return (
          <div className="modal-icon-wrapper error animate-shake" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
            <XCircle size={28} strokeWidth={1.5} />
          </div>
        )

      case 'warning':
        return (
          <div className="modal-icon-wrapper warning animate-scale-up" style={{ color: 'var(--warning)', background: 'var(--warning-bg)' }}>
            <AlertTriangle size={28} strokeWidth={1.5} />
          </div>
        )

      case 'transaction':
        if (txStatus === 'success') {
          return (
            <div className="modal-icon-wrapper success animate-scale-up" style={{ color: 'var(--success)', background: 'var(--success-bg)' }}>
              <CheckCircle2 size={28} strokeWidth={1.5} />
            </div>
          )
        }
        if (txStatus === 'failed' || txStatus === 'rejected') {
          return (
            <div className="modal-icon-wrapper error animate-shake" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
              <XCircle size={28} strokeWidth={1.5} />
            </div>
          )
        }
        if (txStatus === 'signing') {
          return (
            <div className="modal-icon-wrapper signing animate-pulse" style={{ color: 'var(--warning)', background: 'var(--warning-bg)' }}>
              <Key size={28} strokeWidth={1.5} />
            </div>
          )
        }
        if (txStatus === 'preparing') {
          return (
            <div className="modal-icon-wrapper preparing animate-pulse" style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
              <Lock size={28} strokeWidth={1.5} />
            </div>
          )
        }
        
        // default / pending / confirming
        return (
          <div className="modal-icon-wrapper transaction" style={{ color: 'var(--accent)' }}>
            <div className="premium-spinner border-success">
              <span className="sr-only">Confirming...</span>
            </div>
          </div>
        )

      case 'system':
        let color = 'var(--text-primary)'
        let bg = 'var(--bg-secondary)'
        if (systemAlertType === 'warning') { color = 'var(--warning)'; bg = 'var(--warning-bg)' }
        if (systemAlertType === 'error' || systemAlertType === 'critical') { color = 'var(--danger)'; bg = 'var(--danger-bg)' }

        return (
          <div className="modal-icon-wrapper system animate-pulse" style={{ color, background: bg }}>
            <ShieldAlert size={28} strokeWidth={1.5} />
          </div>
        )

      default:
        return (
          <div className="modal-icon-wrapper info" style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
            <Info size={28} strokeWidth={1.5} />
          </div>
        )
    }
  }

  return (
    <div className="modal-icon-container">
      {renderIcon()}
      <style jsx global>{`
        .modal-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.03);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
        
        .premium-spinner {
          width: 48px;
          height: 48px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .premium-spinner.border-success {
          border-top-color: var(--success);
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Animations */
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        
        @keyframes scaleUp {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        
        .animate-checkmark {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawCheck 0.4s ease-out 0.15s forwards;
        }
        
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
