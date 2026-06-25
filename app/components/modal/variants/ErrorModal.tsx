'use client'

import React, { useState } from 'react'
import { ModalConfig } from '@/lib/modal/types'
import ModalHeader from '../ModalHeader'
import ModalBody from '../ModalBody'
import ModalFooter from '../ModalFooter'
import ModalIcon from '../ModalIcon'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface VariantProps {
  config: ModalConfig
  onClose: () => void
}

export default function ErrorModal({ config, onClose }: VariantProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  return (
    <div className="modal-inner-card animate-modal-enter">
      <ModalIcon type={config.type} />
      
      <ModalHeader 
        title={config.title || 'Action Failed'} 
        priority={config.priority || 'P1'} 
        showCloseButton={true} 
        onClose={onClose} 
      />

      <ModalBody description={config.description}>
        {config.errorDetails && (
          <div className="technical-details-toggle mt-4">
            <button 
              type="button" 
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="details-toggle-btn text-xs font-semibold text-mono"
            >
              {showTechnicalDetails ? (
                <span className="flex items-center gap-1">Technical Stack logs <ChevronUp size={12} /></span>
              ) : (
                <span className="flex items-center gap-1">Technical Stack logs <ChevronDown size={12} /></span>
              )}
            </button>
            
            {showTechnicalDetails && (
              <pre className="error-log-box text-mono">
                {config.errorDetails}
              </pre>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter 
        confirmText={config.confirmText || 'Dismiss'}
        onConfirm={onClose}
        showCancel={false}
        showRetry={config.showRetry}
        onRetry={config.onRetry ? () => {
          if (config.onRetry) config.onRetry()
          onClose()
        } : undefined}
      />

      <style jsx>{`
        .technical-details-toggle {
          text-align: left;
        }

        .details-toggle-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px 0;
          outline: none;
          display: inline-flex;
          align-items: center;
        }

        .details-toggle-btn:hover {
          color: var(--text-primary);
        }

        .error-log-box {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border);
          color: var(--danger);
          padding: 12px;
          border-radius: 6px;
          font-size: 11px;
          margin-top: 8px;
          max-height: 140px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }
      `}</style>
    </div>
  )
}
