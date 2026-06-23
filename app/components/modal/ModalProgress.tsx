'use client'

import React, { useEffect, useState } from 'react'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { TransactionStep } from '@/lib/modal/types'

interface ModalProgressProps {
  steps?: TransactionStep[]
  activeStepIndex?: number
  percentComplete?: number // 0 to 100
  estimatedSecondsLeft?: number
}

export default function ModalProgress({
  steps,
  activeStepIndex = 0,
  percentComplete,
  estimatedSecondsLeft
}: ModalProgressProps) {
  const [timeLeft, setTimeLeft] = useState(estimatedSecondsLeft)

  useEffect(() => {
    setTimeLeft(estimatedSecondsLeft)
  }, [estimatedSecondsLeft])

  // Count down estimated timer
  useEffect(() => {
    if (timeLeft === undefined || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev && prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  return (
    <div className="progress-container">
      {/* 1. Bar Progress if provided */}
      {percentComplete !== undefined && (
        <div className="bar-wrapper">
          <div className="bar-outer">
            <div className="bar-inner" style={{ width: `${percentComplete}%` }}></div>
          </div>
          <div className="bar-labels">
            <span className="text-xs text-secondary">Progress</span>
            <span className="text-xs text-mono font-semibold">{percentComplete}%</span>
          </div>
        </div>
      )}

      {/* 2. Step Checklist if provided */}
      {steps && steps.length > 0 && (
        <div className="steps-list">
          {steps.map((step, idx) => {
            const isCompleted = step.status === 'success' || idx < activeStepIndex
            const isPending = step.status === 'pending' || idx === activeStepIndex
            const isFailed = step.status === 'failed'
            const isIdle = !isCompleted && !isPending && !isFailed

            return (
              <div key={idx} className={`step-item ${isCompleted ? 'completed' : isPending ? 'pending' : isFailed ? 'failed' : 'idle'}`}>
                <div className="step-badge">
                  {isCompleted ? (
                    <Check size={12} strokeWidth={3} />
                  ) : isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isFailed ? (
                    <AlertCircle size={12} />
                  ) : (
                    <span className="step-number text-mono">{idx + 1}</span>
                  )}
                </div>
                <div className="step-content">
                  <div className="step-name text-sm font-semibold">{step.name}</div>
                  {step.description && <div className="step-desc text-xs text-secondary">{step.description}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 3. Timer Estimate */}
      {timeLeft !== undefined && timeLeft > 0 && (
        <div className="timer-wrapper text-xs text-secondary">
          Estimated settlement time: <strong className="text-mono text-light">{timeLeft}s</strong> remaining
        </div>
      )}

      <style jsx>{`
        .progress-container {
          width: 100%;
          margin: 16px 0;
        }

        /* Progress Bar */
        .bar-wrapper {
          margin-bottom: 20px;
        }

        .bar-outer {
          width: 100%;
          height: 6px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 2px;
          overflow: hidden;
        }

        .bar-inner {
          height: 100%;
          background: var(--accent);
          transition: width 0.4s cubic-bezier(0.1, 0.8, 0.25, 1);
        }

        .bar-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
        }

        /* Step Checklist */
        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 2px;
          padding: 16px;
          text-align: left;
        }

        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .step-badge {
          width: 20px;
          height: 20px;
          border-radius: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-secondary);
          flex-shrink: 0;
          margin-top: 1px;
        }

        .step-number {
          font-size: 10px;
          font-weight: 500;
        }

        /* Step States */
        .step-item.completed .step-badge {
          background: var(--success-bg);
          border-color: var(--success);
          color: var(--success);
        }

        .step-item.completed .step-name {
          color: var(--text-primary);
          text-decoration: line-through;
          text-decoration-color: rgba(255, 255, 255, 0.2);
        }

        .step-item.pending .step-badge {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--accent);
          color: var(--accent);
        }

        .step-item.pending .step-name {
          color: var(--text-primary);
        }

        .step-item.failed .step-badge {
          background: var(--danger-bg);
          border-color: var(--danger);
          color: var(--danger);
        }

        .step-item.failed .step-name {
          color: var(--danger);
        }

        .step-item.idle .step-name {
          color: var(--text-secondary);
        }

        .step-content {
          flex: 1;
        }

        .step-name {
          line-height: 1.4;
          transition: color 0.1s ease;
        }

        .step-desc {
          margin-top: 2px;
        }

        /* Timer estimate */
        .timer-wrapper {
          text-align: center;
          margin-top: 12px;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}
