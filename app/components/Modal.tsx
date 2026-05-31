'use client'

import React, { useRef, useEffect } from 'react'
import { useModal } from '@/lib/modal-context'
import { HelpCircle, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight, RotateCcw } from 'lucide-react'

export default function Modal() {
  const { isOpen, config, hideModal } = useModal()
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus trap on open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex="0"]'
      )
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus()
      }
    }
  }, [isOpen])

  if (!config) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if click is on the overlay wrapper and NOT in a loading or tx-status state
    if (
      e.target === e.currentTarget && 
      config.type !== 'loading' && 
      config.type !== 'tx-status'
    ) {
      hideModal()
    }
  }

  // Icons based on modal type
  const renderIcon = () => {
    switch (config.type) {
      case 'confirm':
        return <HelpCircle size={36} className="text-primary" />
      case 'success':
        return <CheckCircle2 size={36} className="text-success" />
      case 'warning':
        return <AlertTriangle size={36} className="text-warning" />
      case 'error':
        return <XCircle size={36} className="text-danger" />
      case 'loading':
        return (
          <div className="spinner-ring" style={{ width: '40px', height: '40px' }}>
            <div className="spinner-ring-inner"></div>
          </div>
        )
      case 'tx-status':
        if (config.txStatus === 'success') {
          return <CheckCircle2 size={36} className="text-success" />
        } else if (config.txStatus === 'failed' || config.txStatus === 'rejected') {
          return <XCircle size={36} className="text-danger" />
        } else if (config.txStatus === 'timeout') {
          return <AlertTriangle size={36} className="text-warning" />
        }
        return (
          <div className="spinner-ring" style={{ width: '40px', height: '40px' }}>
            <div className="spinner-ring-inner" style={{ borderColor: 'var(--success) transparent transparent transparent' }}></div>
          </div>
        )
      default:
        return null
    }
  }

  const isDestructive = config.destructive
  const isConfirmDisabled = config.type === 'loading' || (config.type === 'tx-status' && config.txStatus !== 'success' && config.txStatus !== 'failed' && config.txStatus !== 'rejected')

  return (
    <div 
      className={`modal-overlay ${isOpen ? 'open' : ''}`} 
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className={`modal-content ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Main Icon */}
        <div className="modal-icon-container">
          {renderIcon()}
        </div>

        {/* Title */}
        <h3 id="modal-title" className="modal-title">
          {config.title}
        </h3>

        {/* Description / Content */}
        <div className="modal-description">
          {typeof config.description === 'string' ? (
            <p>{config.description}</p>
          ) : (
            config.description
          )}
        </div>

        {/* Error Details (if applicable) */}
        {config.errorDetails && (
          <div className="modal-error-details text-mono">
            {config.errorDetails}
          </div>
        )}

        {/* Transaction Status Details */}
        {config.type === 'tx-status' && config.txHash && (
          <div className="modal-tx-details">
            <span className="text-xs text-muted text-mono block mb-1">Transaction Hash:</span>
            <a 
              href={`https://testnet.arcscan.app/tx/${config.txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="explorer-link text-mono text-sm inline-flex items-center gap-1"
            >
              {config.txHash.slice(0, 14)}...{config.txHash.slice(-10)} <ArrowUpRight size={14} />
            </a>
          </div>
        )}

        {/* Actions Button Row */}
        <div className="modal-actions-row">
          {/* Cancel/Dismiss Button */}
          {config.type !== 'loading' && config.type !== 'tx-status' && (
            <button 
              onClick={hideModal} 
              className="btn ghost text-sm"
              style={{ flex: 1 }}
            >
              {config.cancelText || 'Dismiss'}
            </button>
          )}

          {/* Retry Button (if requested on error) */}
          {config.type === 'error' && config.showRetry && config.onRetry && (
            <button 
              onClick={() => {
                hideModal()
                if (config.onRetry) config.onRetry()
              }}
              className="btn text-sm flex items-center justify-center gap-2"
              style={{ flex: 1 }}
            >
              <RotateCcw size={14} /> Retry
            </button>
          )}

          {/* Confirm Button */}
          {(config.type === 'confirm' || config.type === 'warning') && (
            <button 
              onClick={async () => {
                if (config.onConfirm) {
                  await config.onConfirm()
                }
                hideModal()
              }} 
              disabled={isConfirmDisabled}
              className={`btn text-sm ${isDestructive ? 'danger' : 'primary'}`}
              style={{ flex: 1 }}
            >
              {config.confirmText || 'Confirm'}
            </button>
          )}

          {/* Close for Finished TX */}
          {config.type === 'tx-status' && (config.txStatus === 'success' || config.txStatus === 'failed' || config.txStatus === 'rejected') && (
            <button 
              onClick={hideModal} 
              className="btn primary text-sm"
              style={{ width: '100%' }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
