'use client'

import React from 'react'
import { ArrowUpRight, ShieldCheck, Zap } from 'lucide-react'

interface ModalStatusProps {
  txHash?: string
  explorerUrl?: string
  gasStatus?: {
    sponsored: boolean
    fee?: string
  }
}

export default function ModalStatus({ txHash, explorerUrl, gasStatus }: ModalStatusProps) {
  if (!txHash && !gasStatus) return null

  // Default explorer fallback
  const resolvedExplorerUrl = explorerUrl || `https://testnet.arcscan.app/tx/${txHash}`

  return (
    <div className="status-container">
      {/* Gas Status Banner */}
      {gasStatus && (
        <div className={`gas-banner ${gasStatus.sponsored ? 'sponsored' : 'paid'}`}>
          <div className="gas-header">
            {gasStatus.sponsored ? (
              <>
                <Zap size={14} className="gas-icon text-success" />
                <span className="text-xs font-semibold text-success uppercase tracking-wider">Gas sponsored</span>
              </>
            ) : (
              <>
                <ShieldCheck size={14} className="gas-icon text-secondary" />
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Gas details</span>
              </>
            )}
          </div>
          {gasStatus.fee && (
            <div className="gas-fee-info text-mono text-xs mt-1">
              Estimated Transaction Fee: <strong>{gasStatus.fee} USDC</strong>
            </div>
          )}
        </div>
      )}

      {/* Transaction Link */}
      {txHash && (
        <div className="tx-details">
          <span className="tx-label text-xs uppercase tracking-wider text-secondary">Transaction Ledger Signature</span>
          <a 
            href={resolvedExplorerUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="tx-link text-mono inline-flex items-center gap-1 mt-1 font-medium"
          >
            {txHash.slice(0, 12)}...{txHash.slice(-8)}
            <ArrowUpRight size={14} />
          </a>
        </div>
      )}

      <style jsx>{`
        .status-container {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        /* Gas Banner */
        .gas-banner {
          border: 1px solid var(--border);
          border-radius: 2px;
          padding: 10px 12px;
          text-align: left;
          font-size: 13px;
        }

        .gas-banner.sponsored {
          border-color: var(--success);
          background: var(--success-bg);
        }

        .gas-banner.paid {
          background: var(--bg-secondary);
        }

        .gas-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .gas-icon {
          flex-shrink: 0;
        }

        .gas-fee-info {
          color: var(--text-secondary);
        }

        /* Tx Details */
        .tx-details {
          border: 1px solid var(--border);
          background: var(--bg-secondary);
          border-radius: 2px;
          padding: 12px;
          text-align: left;
        }

        .tx-label {
          display: block;
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 500;
        }

        .tx-link {
          color: var(--text-primary);
          text-decoration: underline;
          text-decoration-color: var(--border);
          text-underline-offset: 4px;
        }

        .tx-link:hover {
          text-decoration-color: var(--text-primary);
        }
      `}</style>
    </div>
  )
}
