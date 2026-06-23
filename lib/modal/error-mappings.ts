export interface DomainError {
  code: string
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestedAction?: string
  showRetry?: boolean
  showSupport?: boolean
}

export function parseRawError(error: any): DomainError {
  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      title: 'Unexpected System Failure',
      message: 'An unknown error occurred. Our engineers have been notified.',
      severity: 'medium',
      showSupport: true,
    }
  }

  const errorMessage = typeof error === 'string' 
    ? error 
    : (error.message || error.shortMessage || JSON.stringify(error))
  
  // 1. Wallet Connection & User Rejection
  if (
    errorMessage.includes('User rejected') || 
    errorMessage.includes('user rejected') || 
    errorMessage.includes('User denied') || 
    error?.code === 4001
  ) {
    return {
      code: 'WALLET_REJECTED',
      title: 'Signature Request Cancelled',
      message: 'You declined to authorize the transaction in your corporate wallet. No funds were moved.',
      severity: 'low',
      suggestedAction: 'Please retry the action and approve the wallet prompt to proceed.',
      showRetry: true
    }
  }

  // 2. Insufficient Balance
  if (
    errorMessage.includes('insufficient funds') || 
    errorMessage.includes('transfer amount exceeds balance') || 
    errorMessage.includes('INSUFFICIENT_BALANCE') ||
    errorMessage.includes('exceeds balance')
  ) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      title: 'Insufficient Corporate Treasury Float',
      message: 'Your current USDC treasury balance is lower than the transfer amount plus the estimated transaction execution fee.',
      severity: 'medium',
      suggestedAction: 'Deposit additional USDC to this account or consolidate funds from external chains using the Treasury sweeping pipeline.',
      showSupport: false
    }
  }

  // 3. API / Rate Limits (e.g. HTTP 429)
  if (
    errorMessage.includes('429') || 
    errorMessage.includes('Too many requests') || 
    errorMessage.includes('Rate limit')
  ) {
    return {
      code: 'RATE_LIMIT_ERROR',
      title: 'Rate Limit Threshold Exceeded',
      message: 'Our node gateways are experiencing exceptionally high transaction throughput. Your request was throttled.',
      severity: 'medium',
      suggestedAction: 'Please wait a moment and click Retry. We apologize for the delay.',
      showRetry: true
    }
  }

  // 4. Network Offline or RPC Gateway Issues
  if (
    errorMessage.includes('failed to fetch') || 
    errorMessage.includes('NetworkError') || 
    errorMessage.includes('JSON-RPC error') || 
    errorMessage.includes('RPC')
  ) {
    return {
      code: 'RPC_NETWORK_ERROR',
      title: 'Arc RPC Connection Terminated',
      message: 'The communication channel to the Arc blockchain precompile node was lost or timed out.',
      severity: 'high',
      suggestedAction: 'Verify your internet connection and ensure the Arc Testnet RPC gateway is responsive.',
      showRetry: true
    }
  }

  // 5. Compliance Screening Block
  if (
    errorMessage.includes('compliance') || 
    errorMessage.includes('Screening Blocked') || 
    errorMessage.includes('sanction') || 
    errorMessage.includes('regulatory')
  ) {
    return {
      code: 'COMPLIANCE_BLOCKED',
      title: 'Regulatory Compliance Flag',
      message: 'This wire transfer was blocked by the automated AML/OFAC compliance pre-flight checks due to destination risk exposure.',
      severity: 'critical',
      suggestedAction: 'For verification details, please review your compliance ledger or contact institutional operations.',
      showSupport: true
    }
  }

  // 6. Contract Reverts & Transaction Gas Issues
  if (
    errorMessage.includes('revert') || 
    errorMessage.includes('execution reverted')
  ) {
    return {
      code: 'CONTRACT_REVERT',
      title: 'Smart Contract Execution Aborted',
      message: 'The on-chain transaction was simulated and failed to execute. The smart contract state reverted.',
      severity: 'high',
      suggestedAction: 'Review the transfer parameters, and verify the multi-sig signatory limits on the Router.',
      showSupport: true
    }
  }

  // Default Fallback
  return {
    code: 'SYSTEM_ERROR',
    title: 'Transaction Dispatch Interrupted',
    message: errorMessage.slice(0, 200) || 'An unexpected exception occurred during execution.',
    severity: 'medium',
    suggestedAction: 'If this issue persists, please export your system debug logs and contact support.',
    showSupport: true,
    showRetry: true
  }
}
