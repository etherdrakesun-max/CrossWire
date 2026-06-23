'use client'

import React, { useEffect } from 'react'
import { ModalConfig } from '@/lib/modal/types'
import ModalHeader from '../ModalHeader'
import ModalBody from '../ModalBody'
import ModalFooter from '../ModalFooter'
import ModalIcon from '../ModalIcon'
import ModalStatus from '../ModalStatus'

interface VariantProps {
  config: ModalConfig
  onClose: () => void
}

export default function SuccessModal({ config, onClose }: VariantProps) {
  // Handle auto-close if set
  useEffect(() => {
    if (config.autoCloseMs) {
      const timer = setTimeout(() => {
        onClose()
      }, config.autoCloseMs)
      return () => clearTimeout(timer)
    }
  }, [config.autoCloseMs, onClose])

  return (
    <div className="modal-inner-card animate-modal-enter">
      <ModalIcon type={config.type} />
      
      <ModalHeader 
        title={config.title} 
        priority={config.priority || 'P2'} 
        showCloseButton={true} 
        onClose={onClose} 
      />

      <ModalBody description={config.description}>
        {config.txHash && (
          <ModalStatus 
            txHash={config.txHash} 
            explorerUrl={config.explorerUrl} 
            gasStatus={config.gasStatus} 
          />
        )}
      </ModalBody>

      <ModalFooter 
        confirmText={config.confirmText || 'Done'}
        onConfirm={config.onConfirm ? async () => {
          if (config.onConfirm) await config.onConfirm()
          onClose()
        } : onClose}
        showCancel={false}
      />
    </div>
  )
}
