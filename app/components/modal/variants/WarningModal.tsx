'use client'

import React from 'react'
import { ModalConfig } from '@/lib/modal/types'
import ModalHeader from '../ModalHeader'
import ModalBody from '../ModalBody'
import ModalFooter from '../ModalFooter'
import ModalIcon from '../ModalIcon'
import { AlertCircle } from 'lucide-react'

interface VariantProps {
  config: ModalConfig
  onClose: () => void
}

export default function WarningModal({ config, onClose }: VariantProps) {
  return (
    <div className="modal-inner-card border-warning animate-modal-enter">
      <ModalIcon type={config.type} />
      
      <ModalHeader 
        title={config.title || 'Risk Warning'} 
        priority={config.priority || 'P2'} 
        showCloseButton={true} 
        onClose={onClose} 
      />

      <ModalBody description={config.description}>
        {config.metaDescription && (
          <div className="warning-impact-box">
            <AlertCircle size={16} className="impact-icon text-warning" />
            <div className="impact-text text-sm">
              {config.metaDescription}
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter 
        confirmText={config.confirmText || 'I Understand'}
        cancelText={config.cancelText || 'Cancel'}
        onConfirm={config.onConfirm ? async () => {
          if (config.onConfirm) await config.onConfirm()
          onClose()
        } : onClose}
        onCancel={onClose}
        destructive={config.destructive}
      />

      <style jsx>{`
        .modal-inner-card.border-warning {
          border-color: var(--warning);
        }

        .warning-impact-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: var(--warning-bg);
          border: 1px solid rgba(255, 171, 0, 0.2);
          border-radius: 2px;
          padding: 12px;
          margin-top: 16px;
          text-align: left;
        }

        .impact-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .impact-text {
          color: var(--text-primary);
          line-height: 1.4;
        }
      `}</style>
    </div>
  )
}
