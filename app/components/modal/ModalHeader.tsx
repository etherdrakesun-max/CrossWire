'use client'

import React from 'react'
import { X } from 'lucide-react'
import { ModalPriority } from '@/lib/modal/types'

interface ModalHeaderProps {
  title: string
  priority?: ModalPriority
  showCloseButton?: boolean
  onClose?: () => void
  tag?: string
}

export default function ModalHeader({ title, priority, showCloseButton = true, onClose, tag }: ModalHeaderProps) {
  const getPriorityLabel = () => {
    switch (priority) {
      case 'P0': return 'Critical Security'
      case 'P1': return 'Required Action'
      case 'P2': return 'Workflow'
      case 'P3': return 'Info'
      default: return null
    }
  }

  const getPriorityClass = () => {
    switch (priority) {
      case 'P0': return 'p0-badge'
      case 'P1': return 'p1-badge'
      case 'P2': return 'p2-badge'
      case 'P3': return 'p3-badge'
      default: return ''
    }
  }

  return (
    <div className="modal-header-container">
      <div className="modal-header-meta">
        {tag && <span className="modal-header-tag text-xs">{tag}</span>}
        {priority && (
          <span className={`priority-badge text-mono text-xs ${getPriorityClass()}`}>
            {getPriorityLabel()}
          </span>
        )}
      </div>
      <h3 id="modal-title" className="modal-header-title">
        {title}
      </h3>
      {showCloseButton && onClose && (
        <button 
          onClick={onClose} 
          className="modal-close-button"
          aria-label="Close dialog"
          tabIndex={0}
        >
          <X size={16} />
        </button>
      )}

      <style jsx>{`
        .modal-header-container {
          position: relative;
          text-align: center;
          margin-bottom: 12px;
          padding-top: 8px;
        }

        .modal-header-meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .modal-header-tag {
          color: var(--text-secondary);
          background: var(--bg-secondary);
          padding: 2px 6px;
          border-radius: 2px;
          border: 1px solid var(--border);
        }

        .priority-badge {
          padding: 2px 6px;
          border-radius: 2px;
          font-weight: 500;
        }

        .p0-badge {
          background: var(--danger-bg);
          color: var(--danger);
          border: 1px solid var(--danger);
        }

        .p1-badge {
          background: var(--warning-bg);
          color: var(--warning);
          border: 1px solid var(--warning);
        }

        .p2-badge {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .p3-badge {
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border);
        }

        .modal-header-title {
          font-size: 18px;
          font-weight: 500;
          color: var(--text-primary);
          font-family: 'Inter Tight', sans-serif;
          letter-spacing: -0.015em;
          margin: 0;
          padding: 0 24px;
        }

        .modal-close-button {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 28px;
          height: 28px;
          border-radius: 2px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.1s ease;
          outline: none;
        }

        .modal-close-button:hover {
          background: var(--bg-secondary);
          border-color: var(--border);
          color: var(--text-primary);
        }

        .modal-close-button:focus-visible {
          border-color: var(--border-focus);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  )
}
