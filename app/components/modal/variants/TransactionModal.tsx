'use client'

import React from 'react'
import { ModalConfig } from '@/lib/modal/types'
import ModalHeader from '../ModalHeader'
import ModalBody from '../ModalBody'
import ModalFooter from '../ModalFooter'
import ModalIcon from '../ModalIcon'
import ModalProgress from '../ModalProgress'
import ModalStatus from '../ModalStatus'

interface VariantProps {
  config: ModalConfig
  onClose: () => void
}

export default function TransactionModal({ config, onClose }: VariantProps) {
  const getStatusMessage = () => {
    switch (config.txStatus) {
      case 'preparing':
        return 'Preparing transaction payload and encoding smart contract arguments...'
      case 'signing':
        return 'Signature requested. Please review and authorize the transaction call inside your wallet extension...'
      case 'pending':
        return 'Broadcasting raw transaction payload to the Arc blockchain network precompiled gateways...'
      case 'confirming':
        return 'Transaction dispatched. Waiting for block confirmation and sub-second deterministic settlement...'
      case 'finalizing':
        return 'On-chain proof confirmed. Fetching updated ledger events and indices...'
      case 'success':
        return 'Transfer settled! The funds have been transferred successfully on the Arc Testnet ledger.'
      case 'failed':
        return 'EVM transaction execution failed. The on-chain transaction reverted.'
      case 'rejected':
        return 'Transaction signing rejected. The authorization request was denied in your wallet.'
      case 'expired':
        return 'Ledger signature request expired. Please re-initiate the transaction sequence.'
      case 'timeout':
        return 'Attestation node poll timeout. The attestation signatures are taking longer than usual to resolve.'
      default:
        return 'Awaiting blockchain response...'
    }
  }

  const isClosable = 
    config.txStatus === 'success' || 
    config.txStatus === 'failed' || 
    config.txStatus === 'rejected' ||
    config.txStatus === 'timeout'

  return (
    <div className="modal-inner-card animate-modal-enter">
      <ModalIcon type={config.type} txStatus={config.txStatus} />

      <ModalHeader 
        title={config.title || 'Execute Transaction'} 
        priority={config.priority || 'P1'} 
        showCloseButton={isClosable} 
        onClose={onClose} 
      />

      <ModalBody description={config.description || getStatusMessage()}>
        {/* Step-by-step checklist pipeline */}
        {config.steps && config.steps.length > 0 && (
          <ModalProgress 
            steps={config.steps} 
            activeStepIndex={config.activeStepIndex}
          />
        )}

        {/* Blockchain signatures, status badges & links */}
        {(config.txHash || config.gasStatus) && (
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
        confirmDisabled={!isClosable}
        showRetry={config.txStatus === 'failed' || config.txStatus === 'rejected' || config.txStatus === 'timeout'}
        onRetry={config.onRetry ? () => {
          if (config.onRetry) config.onRetry()
          onClose()
        } : undefined}
      />
    </div>
  )
}
