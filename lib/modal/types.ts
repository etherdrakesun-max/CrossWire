import React from 'react'

export type LegacyModalType = 'confirm' | 'loading' | 'success' | 'error' | 'warning' | 'tx-status'
export type NewModalType = 'confirmation' | 'processing' | 'success' | 'error' | 'warning' | 'transaction' | 'system'
export type ModalType = LegacyModalType | NewModalType | 'custom'

export type ModalPriority = 'P0' | 'P1' | 'P2' | 'P3'
// P0: Critical (Security alerts, maintenance, downtime)
// P1: Blocking (Awaiting signature, compliance blocks, required actions)
// P2: Important (Workflow actions, forms confirmation)
// P3: Informational (General details, notifications, educational concepts)

export interface TransactionStep {
  name: string
  status: 'idle' | 'pending' | 'success' | 'failed'
  description?: string
}

export interface ModalConfig {
  id?: string // Unique identifier for deduplication
  type: ModalType
  priority?: ModalPriority
  title: string
  description: React.ReactNode | string
  
  // Custom metadata/actions
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  destructive?: boolean
  
  // Transaction specifics (Web3)
  txHash?: string
  txStatus?: 'preparing' | 'signing' | 'pending' | 'confirming' | 'finalizing' | 'success' | 'failed' | 'rejected' | 'expired' | 'timeout'
  explorerUrl?: string
  gasStatus?: {
    sponsored: boolean
    fee?: string
  }
  steps?: TransactionStep[]
  activeStepIndex?: number
  retryCount?: number
  
  // Error specifics
  errorDetails?: string
  rawError?: any
  showRetry?: boolean
  onRetry?: () => void
  supportContactUrl?: string
  
  // Control configs
  autoCloseMs?: number
  preventBackdropClose?: boolean
  preventEscClose?: boolean
  
  // System / Banner specifics
  systemAlertType?: 'info' | 'warning' | 'error' | 'critical'
  metaDescription?: string
}

export interface ModalState {
  modals: ModalConfig[]
  queue: ModalConfig[]
}
