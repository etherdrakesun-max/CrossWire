'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertOctagon } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ModalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ModalErrorBoundary] Caught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{
          padding: '24px',
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger)',
          borderRadius: '4px',
          textAlign: 'center',
          color: 'var(--text-primary)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--danger)' }}>
            <AlertOctagon size={40} />
          </div>
          <h4 style={{ margin: '0 0 8px', fontFamily: 'var(--font-mono)' }}>Modal Rendering Aborted</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 16px' }}>
            A runtime exception occurred while drawing this modal dialog.
          </p>
          {this.state.error && (
            <pre style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '10px',
              fontSize: '11px',
              textAlign: 'left',
              fontFamily: 'var(--font-mono)',
              overflowX: 'auto',
              borderRadius: '2px',
              color: 'var(--danger)'
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button 
            className="btn secondary sm mt-4" 
            style={{ width: '100%' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Attempt Recover
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
