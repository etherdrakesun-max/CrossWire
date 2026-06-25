'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ModalConfig, ModalPriority } from './modal/types'
import { parseRawError } from './modal/error-mappings'

interface ModalContextType {
  // Legacy / Backwards Compatibility API
  isOpen: boolean
  config: ModalConfig | null
  showModal: (config: ModalConfig) => void
  hideModal: () => void
  updateModal: (config: Partial<ModalConfig>) => void

  // New Enterprise Stack & Queue API
  activeModals: ModalConfig[]
  pendingQueue: ModalConfig[]
  closeAllModals: () => void
  replaceActiveModal: (config: ModalConfig) => void
  
  // Specific Typed Helpers
  showConfirmation: (config: Omit<ModalConfig, 'type'>) => void
  showProcessing: (config: Omit<ModalConfig, 'type'>) => void
  showSuccess: (config: Omit<ModalConfig, 'type'>) => void
  showError: (config: Omit<ModalConfig, 'type'> & { rawError?: any }) => void
  showWarning: (config: Omit<ModalConfig, 'type'>) => void
  showTransaction: (config: Omit<ModalConfig, 'type'>) => void
  showSystem: (config: Omit<ModalConfig, 'type'>) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

const PRIORITY_VALUES: Record<ModalPriority, number> = {
  P0: 4, // Critical Security / Announcement
  P1: 3, // Blocking workflow
  P2: 2, // Important workflow
  P3: 1, // Informational
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModals, setActiveModals] = useState<ModalConfig[]>([])
  const [pendingQueue, setPendingQueue] = useState<ModalConfig[]>([])

  // Derived state for legacy compatibility
  const isOpen = activeModals.length > 0
  const config = activeModals[activeModals.length - 1] || null

  // Deduplicate helper: Checks if modal with same ID or Title/Type combination is already active or queued
  const isDuplicate = useCallback((newModal: ModalConfig) => {
    const matches = (m: ModalConfig) => {
      if (newModal.id && m.id) return newModal.id === m.id
      return m.title === newModal.title && m.type === newModal.type
    }
    return activeModals.some(matches) || pendingQueue.some(matches)
  }, [activeModals, pendingQueue])

  // Centralized Modal Dispatcher
  const showModal = useCallback((newConfig: ModalConfig) => {
    // 1. Assign default fields
    const finalModal: ModalConfig = {
      id: newConfig.id || `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority: newConfig.priority || 'P2',
      ...newConfig,
    }

    // 2. Prevent duplication
    if (isDuplicate(finalModal)) {
      console.warn(`[ModalManager] Prevented duplicate modal: ${finalModal.title}`)
      return
    }

    const priorityVal = PRIORITY_VALUES[finalModal.priority || 'P2']

    // 3. Logic for insertion (P0 pre-empts everything; other levels queue or stack)
    if (finalModal.priority === 'P0') {
      // P0 immediately interrupts and gets pushed to active stack
      setActiveModals(prev => [...prev, finalModal])
    } else if (activeModals.length > 0) {
      // Compare priority with top active modal
      const activeTop = activeModals[activeModals.length - 1]
      const activeTopPriorityVal = PRIORITY_VALUES[activeTop.priority || 'P2']

      if (priorityVal > activeTopPriorityVal) {
        // High priority modal gets pushed onto active stack immediately
        setActiveModals(prev => [...prev, finalModal])
      } else {
        // Lower or equal priority goes into priority queue
        setPendingQueue(prev => {
          const updated = [...prev, finalModal]
          // Sort queue descending by priority, then ascending by time (FIFO within priority)
          return updated.sort((a, b) => {
            const pA = PRIORITY_VALUES[a.priority || 'P2']
            const pB = PRIORITY_VALUES[b.priority || 'P2']
            if (pB !== pA) return pB - pA
            return 0 // Keep order
          })
        })
      }
    } else {
      // Empty stack: show immediately
      setActiveModals([finalModal])
    }
  }, [activeModals, isDuplicate])

  const hideModal = useCallback(() => {
    setActiveModals(prev => {
      if (prev.length === 0) return prev

      const closingModal = prev[prev.length - 1]
      
      // Call cancel callbacks if set
      if (closingModal.onCancel) {
        try {
          closingModal.onCancel()
        } catch (err) {
          console.error('Error calling onCancel:', err)
        }
      }

      // Pop the active modal from the stack after closing transition
      return prev.slice(0, -1)
    })

    // Pull from queue if stack becomes empty or to fill next slot
    setTimeout(() => {
      setPendingQueue(prev => {
        if (prev.length === 0) return prev
        const [nextModal, ...rest] = prev
        setActiveModals(curr => {
          // Verify it's not already in stack
          if (curr.some(m => m.id === nextModal.id)) return curr
          return [...curr, nextModal]
        })
        return rest
      })
    }, 200)
  }, [])

  const updateModal = useCallback((updatedFields: Partial<ModalConfig>) => {
    setActiveModals(prev => {
      if (prev.length === 0) return prev
      const copy = [...prev]
      const index = copy.length - 1
      copy[index] = { ...copy[index], ...updatedFields }
      return copy
    })
  }, [])

  const replaceActiveModal = useCallback((newConfig: ModalConfig) => {
    const finalModal: ModalConfig = {
      id: newConfig.id || `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority: newConfig.priority || 'P2',
      ...newConfig,
    }
    
    setActiveModals(prev => {
      if (prev.length === 0) return [finalModal]
      return [...prev.slice(0, -1), finalModal]
    })
  }, [])

  const closeAllModals = useCallback(() => {
    setActiveModals([])
    setPendingQueue([])
  }, [])

  // Action helpers for clean code structure
  const showConfirmation = useCallback((fields: Omit<ModalConfig, 'type'>) => {
    showModal({ ...fields, type: 'confirmation' })
  }, [showModal])

  const showProcessing = useCallback((fields: Omit<ModalConfig, 'type'>) => {
    showModal({ ...fields, type: 'processing', priority: 'P1' })
  }, [showModal])

  const showSuccess = useCallback((fields: Omit<ModalConfig, 'type'>) => {
    showModal({ ...fields, type: 'success', priority: 'P2' })
  }, [showModal])

  const showError = useCallback((fields: Omit<ModalConfig, 'type'> & { rawError?: any }) => {
    const parsed = parseRawError(fields.rawError)
    
    showModal({
      priority: 'P1',
      confirmText: parsed.showRetry ? 'Retry' : 'Dismiss',
      ...fields,
      type: 'error',
      title: fields.title || parsed.title,
      description: fields.description || parsed.message,
      errorDetails: fields.errorDetails || parsed.suggestedAction || fields.rawError?.message,
      showRetry: fields.showRetry ?? parsed.showRetry,
      onRetry: fields.onRetry
    })
  }, [showModal])

  const showWarning = useCallback((fields: Omit<ModalConfig, 'type'>) => {
    showModal({ ...fields, type: 'warning', priority: 'P2' })
  }, [showModal])

  const showTransaction = useCallback((fields: Omit<ModalConfig, 'type'>) => {
    showModal({ ...fields, type: 'transaction', priority: 'P1' })
  }, [showModal])

  const showSystem = useCallback((fields: Omit<ModalConfig, 'type'>) => {
    showModal({ ...fields, type: 'system', priority: 'P0' })
  }, [showModal])

  // ESC Listener for active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModals.length > 0) {
        const topModal = activeModals[activeModals.length - 1]
        // If modal explicitly forbids ESC dismiss (e.g. processing or signing), ignore
        if (topModal.preventEscClose || topModal.type === 'processing' || topModal.type === 'loading' || (topModal.type === 'transaction' && topModal.txStatus !== 'success' && topModal.txStatus !== 'failed')) {
          return
        }
        hideModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeModals, hideModal])

  return (
    <ModalContext.Provider
      value={{
        isOpen,
        config,
        showModal,
        hideModal,
        updateModal,
        activeModals,
        pendingQueue,
        closeAllModals,
        replaceActiveModal,
        showConfirmation,
        showProcessing,
        showSuccess,
        showError,
        showWarning,
        showTransaction,
        showSystem
      }}
    >
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
