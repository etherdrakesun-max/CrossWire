'use client'

import React, { useRef } from 'react'

interface ModalOverlayProps {
  isOpen: boolean
  onClose: () => void
  preventClickClose?: boolean
  children: React.ReactNode
}

export default function ModalOverlay({
  isOpen,
  onClose,
  preventClickClose = false,
  children
}: ModalOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (preventClickClose) return
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  return (
    <div 
      ref={overlayRef}
      className={`modal-overlay-custom ${isOpen ? 'open' : ''}`}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div className="modal-container-inner">
        {children}
      </div>

      <style jsx>{`
        .modal-overlay-custom {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          padding: 24px;
        }

        .modal-overlay-custom.open {
          opacity: 1;
          pointer-events: auto;
        }

        .modal-container-inner {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      `}</style>
    </div>
  )
}
