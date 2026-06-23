'use client'

import React, { useRef, useEffect } from 'react'
import { useModal } from '@/lib/modal-context'
import ModalPortal from './ModalPortal'
import ModalOverlay from './ModalOverlay'
import ModalErrorBoundary from './ModalErrorBoundary'

// Variants
import ConfirmationModal from './variants/ConfirmationModal'
import ProcessingModal from './variants/ProcessingModal'
import SuccessModal from './variants/SuccessModal'
import ErrorModal from './variants/ErrorModal'
import WarningModal from './variants/WarningModal'
import TransactionModal from './variants/TransactionModal'
import SystemModal from './variants/SystemModal'

export default function ModalContainer() {
  const { isOpen, activeModals, hideModal } = useModal()
  const activeModal = activeModals[activeModals.length - 1] || null
  
  const cardRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Focus Return logic
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
    } else {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
        previousFocusRef.current = null
      }
    }
  }, [isOpen])

  // Focus Trap logic
  useEffect(() => {
    if (!isOpen || !cardRef.current) return

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex="0"]'
    const focusableElements = cardRef.current.querySelectorAll(focusableSelector)
    
    if (focusableElements.length === 0) return
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Focus first element on open
    firstElement.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab: trap backwards
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        // Tab: trap forwards
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeModal])

  if (!isOpen || !activeModal) return null

  // Resolve legacy mappings
  const resolvedType = 
    activeModal.type === 'confirm' ? 'confirmation' : 
    activeModal.type === 'loading' ? 'processing' : 
    activeModal.type === 'tx-status' ? 'transaction' : 
    activeModal.type

  const renderActiveVariant = () => {
    switch (resolvedType) {
      case 'confirmation':
        return <ConfirmationModal config={activeModal} onClose={hideModal} />
      case 'processing':
        return <ProcessingModal config={activeModal} />
      case 'success':
        return <SuccessModal config={activeModal} onClose={hideModal} />
      case 'error':
        return <ErrorModal config={activeModal} onClose={hideModal} />
      case 'warning':
        return <WarningModal config={activeModal} onClose={hideModal} />
      case 'transaction':
        return <TransactionModal config={activeModal} onClose={hideModal} />
      case 'system':
        return <SystemModal config={activeModal} onClose={hideModal} />
      default:
        // Default / Custom components rendering
        return (
          <div className="modal-inner-card animate-modal-enter">
            {typeof activeModal.description === 'string' ? (
              <p>{activeModal.description}</p>
            ) : (
              activeModal.description
            )}
          </div>
        )
    }
  }

  // Prevent background click close for blocking types
  const preventClickClose = 
    activeModal.preventBackdropClose ||
    resolvedType === 'processing' ||
    (resolvedType === 'transaction' && activeModal.txStatus !== 'success' && activeModal.txStatus !== 'failed' && activeModal.txStatus !== 'rejected' && activeModal.txStatus !== 'timeout')

  return (
    <ModalPortal>
      <ModalOverlay 
        isOpen={isOpen} 
        onClose={hideModal} 
        preventClickClose={preventClickClose}
      >
        <div ref={cardRef} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <ModalErrorBoundary>
            {renderActiveVariant()}
          </ModalErrorBoundary>
        </div>
      </ModalOverlay>

      <style jsx global>{`
        .modal-inner-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          width: 100%;
          max-width: 460px;
          padding: 32px;
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          text-align: center;
          position: relative;
        }

        .animate-modal-enter {
          animation: modalEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes modalEnter {
          from {
            transform: scale(0.95) translateY(10px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 480px) {
          .modal-inner-card {
            padding: 24px;
            max-width: 100%;
          }
        }
      `}</style>
    </ModalPortal>
  )
}
