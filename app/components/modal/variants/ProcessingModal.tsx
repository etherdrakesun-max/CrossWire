'use client'

import React from 'react'
import { ModalConfig } from '@/lib/modal/types'
import ModalHeader from '../ModalHeader'
import ModalBody from '../ModalBody'
import ModalIcon from '../ModalIcon'
import ModalProgress from '../ModalProgress'

interface VariantProps {
  config: ModalConfig
}

export default function ProcessingModal({ config }: VariantProps) {
  return (
    <div className="modal-inner-card animate-modal-enter">
      <ModalIcon type={config.type} />
      <ModalHeader 
        title={config.title} 
        priority={config.priority || 'P1'} 
        showCloseButton={false} 
      />
      <ModalBody description={config.description}>
        {/* Support step progression and progress tracking */}
        {((config.steps && config.steps.length > 0) || config.autoCloseMs) && (
          <ModalProgress 
            steps={config.steps} 
            activeStepIndex={config.activeStepIndex}
            estimatedSecondsLeft={config.autoCloseMs ? Math.round(config.autoCloseMs / 1000) : undefined}
          />
        )}
      </ModalBody>
    </div>
  )
}
