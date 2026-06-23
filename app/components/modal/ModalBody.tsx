'use client'

import React from 'react'

interface ModalBodyProps {
  description: React.ReactNode | string
  children?: React.ReactNode
}

export default function ModalBody({ description, children }: ModalBodyProps) {
  return (
    <div className="modal-body-container">
      <div className="modal-description">
        {typeof description === 'string' ? (
          <p>{description}</p>
        ) : (
          description
        )}
      </div>
      {children && <div className="modal-body-custom-content">{children}</div>}

      <style jsx>{`
        .modal-body-container {
          margin-bottom: 24px;
        }

        .modal-description {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 0;
        }

        .modal-description p {
          margin: 0;
        }

        .modal-body-custom-content {
          margin-top: 16px;
          text-align: left;
          border-radius: 2px;
          max-height: 240px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  )
}
