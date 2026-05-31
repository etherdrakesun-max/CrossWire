'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type ModalType = 'confirm' | 'loading' | 'success' | 'error' | 'warning' | 'tx-status'

export interface ModalConfig {
  type: ModalType
  title: string
  description: React.ReactNode | string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  txHash?: string
  txStatus?: 'pending' | 'confirming' | 'success' | 'failed' | 'timeout' | 'rejected'
  errorDetails?: string
  showRetry?: boolean
  onRetry?: () => void
  autoCloseMs?: number
  destructive?: boolean
}

interface ModalContextType {
  isOpen: boolean
  config: ModalConfig | null
  showModal: (config: ModalConfig) => void
  hideModal: () => void
  updateModal: (config: Partial<ModalConfig>) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<ModalConfig | null>(null)
  const [queue, setQueue] = useState<ModalConfig[]>([])

  const showModal = (newConfig: ModalConfig) => {
    if (isOpen) {
      // Add to queue if another modal is currently active
      setQueue(prev => [...prev, newConfig])
    } else {
      setConfig(newConfig)
      setIsOpen(true)
    }
  }

  const hideModal = () => {
    setIsOpen(false)
    if (config?.onCancel) {
      config.onCancel()
    }
    // Set config to null after animation finishes (300ms)
    setTimeout(() => {
      setConfig(null)
      // If there are modals in the queue, open the next one
      if (queue.length > 0) {
        const next = queue[0]
        setQueue(prev => prev.slice(1))
        setConfig(next)
        setIsOpen(true)
      }
    }, 300)
  }

  const updateModal = (updatedFields: Partial<ModalConfig>) => {
    setConfig(prev => {
      if (!prev) return null
      return { ...prev, ...updatedFields }
    })
  }

  // Handle auto close timer
  useEffect(() => {
    if (isOpen && config?.autoCloseMs) {
      const timer = setTimeout(() => {
        hideModal()
      }, config.autoCloseMs)
      return () => clearTimeout(timer)
    }
  }, [isOpen, config])

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && config?.type !== 'loading' && config?.type !== 'tx-status') {
        hideModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, config])

  return (
    <ModalContext.Provider value={{ isOpen, config, showModal, hideModal, updateModal }}>
      {children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
