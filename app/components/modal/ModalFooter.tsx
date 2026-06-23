'use client'

import React from 'react'
import { RotateCcw } from 'lucide-react'

interface ModalFooterProps {
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  destructive?: boolean
  confirmDisabled?: boolean
  showCancel?: boolean
  
  // Retry options
  showRetry?: boolean
  onRetry?: () => void
  
  // Custom button nodes
  customActions?: React.ReactNode
}

export default function ModalFooter({
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
  confirmDisabled = false,
  showCancel = true,
  showRetry = false,
  onRetry,
  customActions
}: ModalFooterProps) {
  const [loading, setLoading] = React.useState(false)

  const handleConfirmClick = async () => {
    if (!onConfirm) return
    setLoading(true)
    try {
      await onConfirm()
    } catch (e) {
      console.error('[ModalFooter] Confirm handler crashed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-footer-container">
      {customActions ? (
        customActions
      ) : (
        <div className="modal-actions-row">
          {showCancel && onCancel && (
            <button 
              onClick={onCancel} 
              className="btn ghost text-sm modal-button"
              disabled={loading}
            >
              {cancelText}
            </button>
          )}

          {showRetry && onRetry && (
            <button 
              onClick={onRetry}
              className="btn text-sm modal-button flex items-center justify-center gap-2"
              disabled={loading}
            >
              <RotateCcw size={14} /> Retry
            </button>
          )}

          {onConfirm && (
            <button 
              onClick={handleConfirmClick} 
              disabled={confirmDisabled || loading}
              className={`btn text-sm modal-button ${destructive ? 'danger' : 'primary'} ${loading ? 'loading' : ''}`}
            >
              {loading ? 'Processing...' : confirmText}
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .modal-footer-container {
          margin-top: 24px;
        }

        .modal-actions-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          width: 100%;
        }

        :global(.modal-button) {
          flex: 1;
          height: 38px;
          font-weight: 500;
          font-size: 13px;
        }
      `}</style>
    </div>
  )
}
