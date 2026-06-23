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

export default function SystemModal({ config, onClose }: VariantProps) {
  const isBlocking = config.priority === 'P0' || config.priority === 'P1'
  const accentBorderColor = 
    config.systemAlertType === 'critical' ? 'var(--danger)' :
    config.systemAlertType === 'warning' ? 'var(--warning)' :
    'var(--border)'

  return (
    <div className="modal-inner-card animate-modal-enter system-card" style={{ borderColor: accentBorderColor }}>
      <ModalIcon 
        type={config.type} 
        systemAlertType={config.systemAlertType} 
      />

      <ModalHeader 
        title={config.title || 'System Announcement'} 
        priority={config.priority || 'P0'} 
        showCloseButton={!isBlocking} 
        onClose={onClose} 
      />

      <ModalBody description={config.description} />

      <ModalFooter 
        confirmText={config.confirmText || 'Acknowledge'}
        onConfirm={config.onConfirm ? async () => {
          if (config.onConfirm) await config.onConfirm()
          onClose()
        } : onClose}
        showCancel={false}
      />

      <style jsx>{`
        .system-card {
          border-top-width: 4px;
          border-top-style: solid;
        }
      `}</style>
    </div>
  )
}
