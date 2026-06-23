'use client'

import React from 'react'
import { ModalConfig } from '@/lib/modal/types'
import ModalHeader from '../ModalHeader'
import ModalBody from '../ModalBody'
import ModalFooter from '../ModalFooter'
import ModalIcon from '../ModalIcon'

interface VariantProps {
  config: ModalConfig
  onClose: () => void
}

export default function ConfirmationModal({ config, onClose }: VariantProps) {
  const isDestructive = config.destructive || config.type === 'confirm' && config.destructive

  return (
    <div className="modal-inner-card animate-modal-enter">
      <ModalIcon type={config.type} destructive={isDestructive} />
      <ModalHeader 
        title={config.title} 
        priority={config.priority || 'P2'} 
        showCloseButton={!config.preventBackdropClose} 
        onClose={onClose} 
      />
      <ModalBody description={config.description} />
      <ModalFooter 
        confirmText={config.confirmText || 'Confirm'}
        cancelText={config.cancelText || 'Cancel'}
        onConfirm={config.onConfirm ? async () => {
          if (config.onConfirm) await config.onConfirm()
          onClose()
        } : undefined}
        onCancel={onClose}
        destructive={isDestructive}
      />
    </div>
  )
}
